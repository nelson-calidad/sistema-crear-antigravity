import type { AppointmentRecord, ConfiguredRoom } from '../types';
import { ROOMS } from '../constants';
import {
  type Agreement,
  type Interview,
  localDate,
  type Profile,
  type Rental,
} from './crearStore';
import { conflictOnDate, occursOn, type Slot } from './scheduling';

export type OccupancyOrigin =
  | 'appointments'
  | 'agreements'
  | 'rentals'
  | 'interviews';

export interface UnifiedOccupancySlot extends AppointmentRecord {
  source?: OccupancyOrigin;
  isNestedInBlock?: boolean;
  parentBlockId?: string;
}

/**
 * Calcula la próxima fecha YYYY-MM-DD para un día de la semana (0=Domingo ... 6=Sábado),
 * o una fecha ancla anterior (2026-01-04 + weekday) para que `occursOn` evalúe correctamente
 * tanto fechas pasadas como futuras del acuerdo mensual activo.
 */
export function agreementAnchorDate(weekday: number): string {
  const safeDay = Number.isNaN(weekday) ? 1 : ((weekday % 7) + 7) % 7;
  // 2026-01-04 fue Domingo (day 0). Así cualquier fecha de 2026 en adelante coincide con el día de semana.
  return `2026-01-${String(4 + safeDay).padStart(2, '0')}`;
}

/**
 * Convierte acuerdos mensuales activos, alquileres ocasionales/externos y entrevistas de admisión
 * al formato unificado de `AppointmentRecord` sin duplicar identificadores que ya existan en `appointments`.
 */
export function buildUnifiedOccupancyAppointments(params: {
  appointments: AppointmentRecord[];
  agreements?: Agreement[];
  rentals?: Rental[];
  interviews?: Interview[];
  profiles?: Array<Pick<Profile, 'id' | 'name'>>;
}): UnifiedOccupancySlot[] {
  const {
    appointments = [],
    agreements = [],
    rentals = [],
    interviews = [],
    profiles = [],
  } = params;

  const resolveProName = (proId?: string) => {
    if (!proId) return '';
    return profiles.find((p) => p.id === proId)?.name || proId;
  };

  const seenIds = new Set<string>();
  const result: UnifiedOccupancySlot[] = [];

  // 1. Reservas y turnos principales de la hoja `appointments`
  for (const app of appointments) {
    if (!app || !app.id) continue;
    seenIds.add(app.id);
    result.push({
      ...app,
      source: (app as UnifiedOccupancySlot).source || 'appointments',
    });
  }

  // 2. Entrevistas de admisión (`crear_interviews`)
  for (const item of interviews) {
    if (!item || !item.id || seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    const status =
      item.status === 'cancelada'
        ? 'cancelled'
        : item.status === 'realizada'
          ? 'completed'
          : item.status === 'confirmada'
            ? 'confirmed'
            : 'scheduled';

    result.push({
      id: item.id,
      title: 'Entrevista inicial',
      kind: 'interview',
      type: 'interview',
      status,
      professionalId: item.professionalId,
      proId: item.professionalId,
      roomId: item.roomId,
      date: item.date,
      start: item.start,
      end: item.end,
      recurrence: 'none',
      source: 'interviews',
    });
  }

  // 3. Acuerdos mensuales fijos (`crear_agreements`)
  for (const item of agreements) {
    if (!item || !item.id || item.status !== 'activo' || seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    const weekday = Number(item.days);
    const proName = resolveProName(item.professionalId);
    result.push({
      id: item.id,
      title: proName ? `Acuerdo mensual — ${proName}` : 'Acuerdo mensual fijo',
      kind: 'block',
      type: 'block',
      status: 'confirmed',
      professionalId: item.professionalId,
      proId: item.professionalId,
      roomId: item.roomId,
      date: agreementAnchorDate(weekday),
      start: item.start,
      end: item.end,
      recurrence: 'weekly',
      selectedDays: [weekday],
      notes: item.notes || '',
      source: 'agreements',
    });
  }

  // 4. Alquileres ocasionales o subalquileres externos (`crear_rentals`)
  for (const item of rentals) {
    if (!item || !item.id || seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    const status =
      item.status === 'cancelled'
        ? 'cancelled'
        : item.status === 'confirmado'
          ? 'confirmed'
          : 'scheduled';
    const audienceLabel = item.audience === 'tercero' ? 'Subalquiler externo' : 'Alquiler consultorio';
    result.push({
      id: item.id,
      title: `${audienceLabel} · ${item.occupant || resolveProName(item.professionalId) || item.period}`,
      patient: item.occupant || '',
      kind: 'block',
      type: 'block',
      status,
      professionalId: item.professionalId || '',
      proId: item.professionalId || '',
      roomId: item.roomId,
      date: item.date || localDate(),
      start: item.start,
      end: item.end,
      recurrence: item.recurrence || 'none',
      selectedDays: Array.isArray(item.selectedDays)
        ? item.selectedDays
        : item.recurrence === 'weekly' && item.date
          ? [new Date(`${item.date}T12:00:00`).getDay()]
          : [],
      untilDate: item.untilDate || '',
      excludedDates: Array.isArray(item.excludedDates) ? item.excludedDates : [],
      notes: item.notes || '',
      source: 'rentals',
    });
  }

  return result;
}

/**
 * Obtiene las ocupaciones activas para una fecha YYYY-MM-DD (y opcionalmente un consultorio),
 * marcando qué turnos de paciente caen dentro de un bloque propio (`isNestedInBlock = true`)
 * para no duplicar el bloqueo físico del consultorio ni generar falsos conflictos.
 */
export function getActiveOccupancyForDate(
  unifiedAppointments: UnifiedOccupancySlot[],
  dateStr: string,
  roomId?: string
): UnifiedOccupancySlot[] {
  const activeOnDate = unifiedAppointments
    .filter((item) => {
      if (!item || item.status === 'cancelled') return false;
      if (roomId && roomId !== 'all' && item.roomId !== roomId) return false;
      return occursOn(item as Slot, dateStr);
    })
    .sort((a, b) => a.start.localeCompare(b.start));

  const blocks = activeOnDate.filter((item) => (item.kind || item.type) === 'block');

  return activeOnDate.map((item) => {
    const itemKind = item.kind || item.type || 'session';
    if (itemKind === 'block') {
      return { ...item, isNestedInBlock: false };
    }
    const parentBlock = blocks.find(
      (b) =>
        b.id !== item.id &&
        b.roomId === item.roomId &&
        Boolean(b.professionalId && b.professionalId === item.professionalId) &&
        b.start <= item.start &&
        b.end >= item.end
    );
    return {
      ...item,
      isNestedInBlock: Boolean(parentBlock),
      parentBlockId: parentBlock?.id || item.roomBlockId || undefined,
    };
  });
}

/**
 * Convierte cualquier lista unificada de ocupaciones en `Slot[]` para validar conflictos con `conflictOnDate`.
 */
export function toValidationSlots(
  unifiedAppointments: UnifiedOccupancySlot[],
  excludeId?: string
): Slot[] {
  return unifiedAppointments
    .filter((a) => a.id !== excludeId && a.status !== 'cancelled')
    .map((a) => ({
      id: a.id,
      kind: a.kind || a.type || 'session',
      date: a.date,
      start: a.start,
      end: a.end,
      roomId: a.roomId || '',
      professionalId: a.professionalId || a.proId || '',
      status: a.status,
      recurrence: a.recurrence || 'none',
      selectedDays: a.selectedDays,
      untilDate: a.untilDate,
      excludedDates: a.excludedDates,
    }));
}

/**
 * Verifica si un candidato tiene conflicto en su fecha inicial o repetición contra toda la ocupación unificada.
 */
export function findUnifiedConflict(
  candidate: Slot,
  unifiedAppointments: UnifiedOccupancySlot[]
): { conflict: Slot; date: string } | null {
  const existingSlots = toValidationSlots(unifiedAppointments, candidate.id);
  const start = new Date(`${candidate.date}T12:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const days = candidate.recurrence && candidate.recurrence !== 'none' ? 90 : 1;

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!occursOn(candidate, dateStr)) continue;
    try {
      const conflict = conflictOnDate(candidate, existingSlots, dateStr);
      if (conflict) return { conflict, date: dateStr };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Devuelve la lista de consultorios configurados unificando `ROOMS` con los guardados en `crear_rooms`.
 */
export function getUnifiedRooms(
  storedRooms?: Array<{ id: string; name: string; description?: string; disciplines?: string; thirdPartyEnabled?: boolean; active?: boolean }>
): ConfiguredRoom[] {
  return ROOMS.map((defaultRoom) => {
    const found = storedRooms?.find((r) => r.id === defaultRoom.id);
    return {
      id: defaultRoom.id,
      name: found?.name || defaultRoom.name,
      description: found?.description || defaultRoom.type,
      active: found?.active !== false,
    };
  });
}

