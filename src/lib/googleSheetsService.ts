import type { AppointmentRecord, ConfiguredRoom, TherapistAvailability } from '../types';
import { getCurrentUser } from './crearAuth';
import { conflictOnDate, type Slot } from './scheduling';

// Google Apps Script Web App URL
const DEFAULT_SHEETS_URL =
  'https://script.google.com/macros/s/AKfycbx5kIMawhlVzjOKGh_s2vNAyogd5x8QwtqoTE9fjBUFN_pin5r23mVQq993Xt4y01ZU/exec';

const SHEETS_ENDPOINT = (import.meta.env.VITE_SHEETS_ENDPOINT_URL as string) || DEFAULT_SHEETS_URL;

export const isGoogleSheetsLive = (): boolean => {
  return Boolean(SHEETS_ENDPOINT && SHEETS_ENDPOINT.includes('script.google.com'));
};

const DEFAULT_ROOMS: ConfiguredRoom[] = [
  {
    id: 'c1',
    name: 'Consultorio 1 — Pedagogía',
    description: 'Espacio flexible para psicopedagogía y apoyo escolar',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    active: true,
  },
  {
    id: 'c2',
    name: 'Consultorio 2 — Rehabilitación',
    description: 'Equipado para psicomotricidad y terapia ocupacional',
    color: 'bg-teal-100 text-teal-800 border-teal-300',
    active: true,
  },
  {
    id: 'c3',
    name: 'Consultorio 3 — Atención tranquila',
    description: 'Ambiente calmo para psicología y fonoaudiología',
    color: 'bg-sky-100 text-sky-800 border-sky-300',
    active: true,
  },
];

let cachedAppointments: AppointmentRecord[] = [];
const appointmentListeners = new Set<(apps: AppointmentRecord[]) => void>();
let pollTimer: number | undefined;

function getActorPayload() {
  const user = getCurrentUser();
  if (!user) {
    return { email: 'admin@crear.com', role: 'admin', professionalId: '' };
  }
  return {
    email: user.email,
    role: user.role === 'admin' ? 'admin' : 'professional',
    professionalId: user.role === 'admin' ? '' : user.id,
  };
}

/**
 * Realiza una llamada segura a Google Apps Script evitando bloqueos CORS
 */
async function callSheetsApi<T>(body: Record<string, unknown>): Promise<T> {
  const actor = getActorPayload();
  const payload = {
    ...body,
    actor,
  };

  const response = await fetch(SHEETS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Google Sheets respondió con código ${response.status}`);
  }

  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.error || 'Error al comunicarse con Google Sheets.');
  }

  return result as T;
}

/**
 * Consulta todas las reservas desde la hoja "appointments" de Google Sheets
 */
export async function fetchAppointmentsFromSheets(): Promise<AppointmentRecord[]> {
  try {
    const res = await callSheetsApi<{ ok: true; appointments: any[] }>({
      action: 'list',
      entity: 'appointments',
    });

    const rows = (res.appointments || []).map((row) => ({
      id: String(row.id || crypto.randomUUID()),
      title: String(row.title || 'Reserva'),
      kind: row.kind || row.type || 'session',
      type: row.type || row.kind || 'session',
      status: row.status || 'confirmed',
      professionalId: row.professionalId || row.proId || '',
      proId: row.proId || row.professionalId || '',
      roomId: row.roomId || 'c1',
      patient: row.patient || '',
      notes: row.notes || '',
      date: row.date || '',
      start: row.start || '',
      end: row.end || '',
      recurrence: row.recurrence || 'none',
      selectedDays: Array.isArray(row.selectedDays) ? row.selectedDays : [],
      untilDate: row.untilDate || '',
      excludedDates: Array.isArray(row.excludedDates) ? row.excludedDates : [],
      createdBy: row.createdBy || '',
      createdAt: row.createdAt || '',
      updatedAt: row.updatedAt || '',
    }));

    cachedAppointments = rows;
    appointmentListeners.forEach((fn) => fn(rows));
    return rows;
  } catch (error) {
    console.warn('Error leyendo reservas de Google Sheets:', error);
    // Return cached if failed
    return cachedAppointments;
  }
}

/**
 * Suscribe a las reservas con actualización periódica para reflejar cambios entre terapeutas
 */
export function subscribeToSheetsAppointments(
  onData: (apps: AppointmentRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  appointmentListeners.add(onData);

  // Initial load
  void fetchAppointmentsFromSheets()
    .then(onData)
    .catch((err) => onError?.(err instanceof Error ? err : new Error(String(err))));

  // Auto-polling cada 15 segundos para que los turnos registrados por otra terapeuta
  // se sincronicen automáticamente en pantalla sin necesidad de recargar la página.
  if (!pollTimer) {
    pollTimer = window.setInterval(() => {
      if (!document.hidden) {
        void fetchAppointmentsFromSheets().catch(() => {});
      }
    }, 15000);
  }

  return () => {
    appointmentListeners.delete(onData);
    if (appointmentListeners.size === 0 && pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = undefined;
    }
  };
}

/**
 * Registra o modifica una reserva directamente en la hoja "appointments" de Google Sheets
 * con validación segura de solapamiento en el servidor.
 */
export async function bookAppointmentInSheets(
  appointment: Partial<AppointmentRecord>
): Promise<AppointmentRecord> {
  const actor = getActorPayload();
  const id = appointment.id || crypto.randomUUID();
  const isUpdate = Boolean(appointment.id);

  // Validación rápida local para feedback inmediato
  const candidate: Slot = {
    id,
    date: appointment.date || '',
    start: appointment.start || '',
    end: appointment.end || '',
    roomId: appointment.roomId || 'c1',
    professionalId: appointment.professionalId || appointment.proId || actor.professionalId,
    status: 'confirmed',
    recurrence: appointment.recurrence || 'none',
    selectedDays: appointment.selectedDays,
    untilDate: appointment.untilDate,
  };

  const existingSlots: Slot[] = cachedAppointments
    .filter((a) => a.id !== id && a.status !== 'cancelled')
    .map((a) => ({
      id: a.id,
      date: a.date,
      start: a.start,
      end: a.end,
      roomId: a.roomId || '',
      professionalId: a.professionalId || '',
      status: a.status,
      recurrence: a.recurrence,
      selectedDays: a.selectedDays,
      untilDate: a.untilDate,
    }));

  const localConflict = conflictOnDate(candidate, existingSlots, appointment.date || '');
  if (localConflict) {
    throw new Error(
      `El consultorio ya está ocupado en ese horario (${localConflict.start} a ${localConflict.end}).`
    );
  }

  const payloadRecord: Partial<AppointmentRecord> = {
    ...appointment,
    id,
    status: appointment.status || 'confirmed',
    kind: appointment.kind || 'session',
    type: appointment.kind || 'session',
    professionalId: appointment.professionalId || appointment.proId || actor.professionalId,
    proId: appointment.professionalId || appointment.proId || actor.professionalId,
    updatedAt: new Date().toISOString(),
    createdAt: appointment.createdAt || new Date().toISOString(),
    createdBy: actor.email,
  };

  // Enviar a Google Apps Script
  const result = await callSheetsApi<{ ok: true; id: string }>({
    action: isUpdate ? 'update' : 'create',
    entity: 'appointments',
    id: isUpdate ? id : undefined,
    appointment: payloadRecord,
  });

  // Refrescar caché de Google Sheets
  await fetchAppointmentsFromSheets();
  return payloadRecord as AppointmentRecord;
}

/**
 * Cancela una reserva en Google Sheets (establece status: 'cancelled' en la fila correspondiente)
 */
export async function cancelAppointmentInSheets(id: string): Promise<void> {
  await callSheetsApi({
    action: 'delete',
    entity: 'appointments',
    id,
  });

  await fetchAppointmentsFromSheets();
}

/**
 * Consulta consultorios configurados desde Google Sheets (hoja crear_rooms) o lista base
 */
export async function fetchRoomsFromSheets(): Promise<ConfiguredRoom[]> {
  try {
    const res = await callSheetsApi<{ ok: true; records: any[] }>({
      action: 'list',
      entity: 'rooms',
    });

    if (res.records && res.records.length > 0) {
      return res.records.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        active: r.active !== false,
      }));
    }
  } catch (err) {
    console.warn('Error leyendo rooms de Google Sheets, usando base:', err);
  }

  return DEFAULT_ROOMS;
}

/**
 * Guarda o actualiza la disponibilidad de una terapeuta en Google Sheets (hoja crear_profiles)
 */
export async function saveAvailabilityInSheets(
  therapistId: string,
  availabilitySummary: string
): Promise<void> {
  await callSheetsApi({
    action: 'updateAvailability',
    entity: 'profiles',
    record: {
      id: therapistId,
      availability: availabilitySummary,
    },
  });
}

/**
 * Consulta la disponibilidad declarada de las terapeutas desde Google Sheets (hoja crear_profiles)
 */
export async function fetchTherapistAvailabilitiesFromSheets(): Promise<TherapistAvailability[]> {
  try {
    const res = await callSheetsApi<{ ok: true; records: any[] }>({
      action: 'list',
      entity: 'profiles',
    });

    if (res.records && res.records.length > 0) {
      return res.records.map((p) => ({
        id: `avail-${p.id}`,
        therapistId: p.id,
        therapistName: p.name,
        activeDays: [1, 2, 3, 4, 5],
        startTime: '14:00',
        endTime: '20:00',
        acceptingPatients: true,
        needsRecurringBlock: false,
        notes: p.availability || '',
        updatedAt: p.updatedAt || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn('Error leyendo disponibilidades de Google Sheets:', err);
  }
  return [];
}

