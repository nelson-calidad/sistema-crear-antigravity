import type {
  AppointmentRecord,
  AuditLogRecord,
  AuthorizedUserRecord,
  ConfiguredRoom,
  PatientRecord,
  ServiceCatalogItem,
  TherapistAvailability,
} from '../types';
import { DEFAULT_INITIAL_USERS, getCurrentUser } from './crearAuth';
import { conflictOnDate, type Slot } from './scheduling';

// Google Apps Script Web App URL
const DEFAULT_SHEETS_URL =
  'https://script.google.com/macros/s/AKfycbx5kIMawhlVzjOKGh_s2vNAyogd5x8QwtqoTE9fjBUFN_pin5r23mVQq993Xt4y01ZU/exec';

const SHEETS_ENDPOINT = (import.meta.env.VITE_SHEETS_ENDPOINT_URL as string) || DEFAULT_SHEETS_URL;

export const isGoogleSheetsLive = (): boolean => {
  return Boolean(SHEETS_ENDPOINT && SHEETS_ENDPOINT.includes('script.google.com'));
};

export const DEFAULT_ROOMS: ConfiguredRoom[] = [
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

export const DEFAULT_SERVICES: ServiceCatalogItem[] = [
  { id: 'srv-psicologia', name: 'Psicología', durationMinutes: 45, active: true },
  { id: 'srv-psicopedagogia', name: 'Psicopedagogía', durationMinutes: 45, active: true },
  { id: 'srv-fonoaudiologia', name: 'Fonoaudiología', durationMinutes: 45, active: true },
  { id: 'srv-terapia-ocupacional', name: 'Terapia Ocupacional', durationMinutes: 45, active: true },
  { id: 'srv-psicomotricidad', name: 'Psicomotricidad', durationMinutes: 45, active: true },
  { id: 'srv-educacion-especial', name: 'Educación Especial', durationMinutes: 60, active: true },
  { id: 'srv-evaluacion', name: 'Evaluación / Diagnóstico', durationMinutes: 60, active: true },
];

const APPOINTMENTS_CACHE_KEY = 'crear.sheets.appointments.v2';
const PATIENTS_CACHE_KEY = 'crear.sheets.patients.v2';
const SERVICES_CACHE_KEY = 'crear.sheets.services.v2';
const USERS_CACHE_KEY = 'crear.users.cache';

let cachedAppointments: AppointmentRecord[] = (() => {
  try {
    const raw = localStorage.getItem(APPOINTMENTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})();

const appointmentListeners = new Set<(apps: AppointmentRecord[]) => void>();
let pollTimer: number | undefined;

function emitAppointments(rows: AppointmentRecord[]) {
  cachedAppointments = rows;
  try {
    localStorage.setItem(APPOINTMENTS_CACHE_KEY, JSON.stringify(rows));
  } catch {}
  appointmentListeners.forEach((fn) => fn(rows));
}

function getActorPayload() {
  const user = getCurrentUser();
  if (!user) {
    return { email: 'karina@crear.com', role: 'admin', professionalId: '' };
  }
  return {
    email: user.email,
    name: user.name,
    role: user.role === 'admin' ? 'admin' : 'professional',
    professionalId: user.role === 'admin' ? '' : user.professionalId || user.id,
  };
}

/**
 * Realiza una llamada segura a Google Apps Script incluyendo sesión y evitando bloqueos CORS
 */
export async function callSheetsApi<T>(body: Record<string, unknown>): Promise<T> {
  const user = getCurrentUser();
  const actor = getActorPayload();
  const payload: Record<string, unknown> = {
    ...body,
    actor,
  };

  if (user?.sessionToken) {
    payload.sessionToken = user.sessionToken;
  }
  if (user?.token) {
    payload.credential = user.token;
  }

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

    const rows: AppointmentRecord[] = (res.appointments || []).map((row) => ({
      id: String(row.id || crypto.randomUUID()),
      title: String(row.title || 'Reserva'),
      kind: row.kind || row.type || 'session',
      type: row.type || row.kind || 'session',
      status: row.status || 'confirmed',
      professionalId: row.professionalId || row.proId || '',
      proId: row.proId || row.professionalId || '',
      roomId: row.roomId || 'c1',
      patientId: row.patientId || '',
      patient: row.patient || '',
      serviceId: row.serviceId || '',
      serviceName: row.serviceName || '',
      roomBlockId: row.roomBlockId || '',
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
      syncPending: false,
    }));

    emitAppointments(rows);
    return rows;
  } catch (error) {
    console.warn('Error leyendo reservas de Google Sheets:', error);
    return cachedAppointments;
  }
}

/**
 * Suscribe a las reservas con entrega inmediata de caché y actualización cada 15 segundos
 */
export function subscribeToSheetsAppointments(
  onData: (apps: AppointmentRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  appointmentListeners.add(onData);

  if (cachedAppointments.length > 0) {
    onData(cachedAppointments);
  }

  void fetchAppointmentsFromSheets()
    .then(onData)
    .catch((err) => onError?.(err instanceof Error ? err : new Error(String(err))));

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
 * Registra o modifica una reserva con ACTUALIZACIÓN INSTANTÁNEA (Optimistic UI)
 * y guardado en segundo plano en Google Sheets con LockService.
 */
export async function bookAppointmentInSheets(
  appointment: Partial<AppointmentRecord>,
  onBackgroundError?: (err: Error) => void
): Promise<AppointmentRecord> {
  const actor = getActorPayload();
  const id = appointment.id || crypto.randomUUID();
  const isUpdate = Boolean(appointment.id);
  const resolvedProId =
    actor.role === 'professional'
      ? actor.professionalId
      : appointment.professionalId || appointment.proId || actor.professionalId;

  const resolvedKind = appointment.kind || appointment.type || 'session';

  // Validación rápida local (0ms) respetando bloques propios (nestedSamePro)
  const candidate: Slot = {
    id,
    kind: resolvedKind,
    date: appointment.date || '',
    start: appointment.start || '',
    end: appointment.end || '',
    roomId: appointment.roomId || 'c1',
    professionalId: resolvedProId,
    status: 'confirmed',
    recurrence: appointment.recurrence || 'none',
    selectedDays: appointment.selectedDays,
    untilDate: appointment.untilDate,
  };

  const existingSlots: Slot[] = cachedAppointments
    .filter((a) => a.id !== id && a.status !== 'cancelled')
    .map((a) => ({
      id: a.id,
      kind: a.kind || a.type || 'session',
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
      `Conflicto de horario: el consultorio o profesional ya tiene una reserva (${localConflict.start} a ${localConflict.end}).`
    );
  }

  const nowIso = new Date().toISOString();
  const payloadRecord: AppointmentRecord = {
    id,
    title:
      appointment.title ||
      (resolvedKind === 'block'
        ? 'Reserva de consultorio'
        : appointment.patient || 'Turno confirmado'),
    status: appointment.status || 'confirmed',
    kind: resolvedKind,
    type: resolvedKind,
    professionalId: resolvedProId,
    proId: resolvedProId,
    roomId: appointment.roomId || 'c1',
    patientId: resolvedKind === 'block' ? '' : appointment.patientId || '',
    patient: resolvedKind === 'block' ? '' : appointment.patient || '',
    serviceId: resolvedKind === 'block' ? '' : appointment.serviceId || '',
    serviceName: resolvedKind === 'block' ? '' : appointment.serviceName || '',
    roomBlockId: appointment.roomBlockId || '',
    notes: appointment.notes || '',
    date: appointment.date || '',
    start: appointment.start || '08:00',
    end: appointment.end || '08:45',
    recurrence: appointment.recurrence || 'none',
    selectedDays: appointment.selectedDays || [],
    untilDate: appointment.untilDate || '',
    excludedDates: appointment.excludedDates || [],
    updatedAt: nowIso,
    createdAt: appointment.createdAt || nowIso,
    createdBy: actor.email,
    syncPending: true,
  };

  // 1. Actualización instantánea en interfaz (0ms)
  const snapshotBefore = [...cachedAppointments];
  const optimisticNext = isUpdate
    ? cachedAppointments.map((item) => (item.id === id ? payloadRecord : item))
    : [payloadRecord, ...cachedAppointments];
  emitAppointments(optimisticNext);

  // 2. Sincronización en segundo plano hacia Google Sheets
  void callSheetsApi<{ ok: true; id: string }>({
    action: isUpdate ? 'update' : 'create',
    entity: 'appointments',
    id: isUpdate ? id : undefined,
    appointment: payloadRecord,
  })
    .then(() => {
      // Marcar como sincronizado y refrescar desde Sheets
      const confirmedList = cachedAppointments.map((item) =>
        item.id === id ? { ...item, syncPending: false } : item
      );
      emitAppointments(confirmedList);
      void fetchAppointmentsFromSheets();
    })
    .catch((err) => {
      // Revertir si hubo conflicto concurrente en el servidor
      emitAppointments(snapshotBefore);
      onBackgroundError?.(err instanceof Error ? err : new Error(String(err)));
    });

  return payloadRecord;
}

/**
 * Cancela una reserva con actualización instantánea en UI y sincronización en segundo plano
 */
export async function cancelAppointmentInSheets(
  id: string,
  onBackgroundError?: (err: Error) => void
): Promise<void> {
  const snapshotBefore = [...cachedAppointments];
  const optimisticNext = cachedAppointments.map((item) =>
    item.id === id ? { ...item, status: 'cancelled' as const, syncPending: true } : item
  );
  emitAppointments(optimisticNext);

  void callSheetsApi({
    action: 'delete',
    entity: 'appointments',
    id,
  })
    .then(() => {
      void fetchAppointmentsFromSheets();
    })
    .catch((err) => {
      emitAppointments(snapshotBefore);
      onBackgroundError?.(err instanceof Error ? err : new Error(String(err)));
    });
}

/**
 * Consulta consultorios configurados desde Google Sheets (hoja crear_rooms)
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
 * Catálogo de prestaciones (Psicología, Psicopedagogía, Fonoaudiología, TO, etc.)
 */
export async function fetchServicesFromSheets(): Promise<ServiceCatalogItem[]> {
  try {
    const res = await callSheetsApi<{ ok: true; records: ServiceCatalogItem[] }>({
      action: 'list',
      entity: 'services',
    });
    if (res.records && res.records.length > 0) {
      localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(res.records));
      return res.records;
    }
  } catch {
    try {
      const cached = localStorage.getItem(SERVICES_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
  }
  return DEFAULT_SERVICES;
}

export async function saveServiceInSheets(service: ServiceCatalogItem): Promise<void> {
  const current = await fetchServicesFromSheets();
  const next = current.some((s) => s.id === service.id)
    ? current.map((s) => (s.id === service.id ? service : s))
    : [...current, service];
  localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(next));

  void callSheetsApi({
    action: 'upsert',
    entity: 'services',
    record: service,
  }).catch(() => {});
}

/**
 * Pacientes vinculados (datos mínimos indispensables: ID, Nombre y apellido, Profesional responsable, Estado)
 */
export async function fetchPatientsFromSheets(): Promise<PatientRecord[]> {
  const actor = getActorPayload();
  const readCache = (): PatientRecord[] => {
    try {
      const raw = localStorage.getItem(PATIENTS_CACHE_KEY);
      const all: PatientRecord[] = raw ? JSON.parse(raw) : [];
      return actor.role === 'admin'
        ? all
        : all.filter((p) => p.professionalId === actor.professionalId);
    } catch {
      return [];
    }
  };

  try {
    const res = await callSheetsApi<{ ok: true; records: PatientRecord[] }>({
      action: 'list',
      entity: 'patients',
    });
    if (Array.isArray(res.records)) {
      if (actor.role === 'admin') {
        localStorage.setItem(PATIENTS_CACHE_KEY, JSON.stringify(res.records));
      }
      return res.records;
    }
  } catch {}

  return readCache();
}

export async function savePatientMinimalInSheets(
  patient: Partial<PatientRecord>
): Promise<PatientRecord> {
  const actor = getActorPayload();
  const nowIso = new Date().toISOString();
  const cleanRecord: PatientRecord = {
    id: patient.id || `pac-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: String(patient.name || '').trim(),
    professionalId:
      actor.role === 'professional'
        ? actor.professionalId
        : patient.professionalId || actor.professionalId,
    status: patient.status === 'inactive' ? 'inactive' : 'active',
    createdAt: patient.createdAt || nowIso,
    updatedAt: nowIso,
  };

  // Guardar en caché local de inmediato (0ms)
  try {
    const raw = localStorage.getItem(PATIENTS_CACHE_KEY);
    const list: PatientRecord[] = raw ? JSON.parse(raw) : [];
    const next = list.some((p) => p.id === cleanRecord.id)
      ? list.map((p) => (p.id === cleanRecord.id ? cleanRecord : p))
      : [cleanRecord, ...list];
    localStorage.setItem(PATIENTS_CACHE_KEY, JSON.stringify(next));
  } catch {}

  // Sincronizar con Google Sheets en segundo plano
  void callSheetsApi({
    action: 'upsert',
    entity: 'patients',
    record: cleanRecord,
  }).catch(() => {});

  return cleanRecord;
}

/**
 * Usuarios autorizados y cuentas (@crear.com / Gmail + rol + estado)
 */
export async function fetchAuthorizedUsersFromSheets(): Promise<AuthorizedUserRecord[]> {
  try {
    const res = await callSheetsApi<{ ok: true; records: AuthorizedUserRecord[] }>({
      action: 'list',
      entity: 'users',
    });
    if (res.records && res.records.length > 0) {
      localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(res.records));
      return res.records;
    }
  } catch {}

  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  return DEFAULT_INITIAL_USERS;
}

export async function saveAuthorizedUserInSheets(user: AuthorizedUserRecord): Promise<void> {
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY);
    const current: AuthorizedUserRecord[] = raw ? JSON.parse(raw) : [...DEFAULT_INITIAL_USERS];
    const next = current.some((u) => u.id === user.id)
      ? current.map((u) => (u.id === user.id ? { ...u, ...user, password: user.password || u.password } : u))
      : [...current, user];
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(next));
  } catch {}

  void callSheetsApi({
    action: 'upsert',
    entity: 'users',
    record: user,
  }).catch(() => {});
}

/**
 * Historial de auditoría de reservas y modificaciones
 */
export async function fetchAuditLogsFromSheets(): Promise<AuditLogRecord[]> {
  try {
    const res = await callSheetsApi<{ ok: true; records: AuditLogRecord[] }>({
      action: 'list',
      entity: 'audit',
    });
    if (Array.isArray(res.records)) {
      return res.records;
    }
  } catch {}
  return [];
}

/**
 * Guarda o actualiza la disponibilidad de una terapeuta en Google Sheets (hoja crear_profiles)
 */
export async function saveAvailabilityInSheets(
  therapistId: string,
  availabilitySummary: string
): Promise<void> {
  void callSheetsApi({
    action: 'updateAvailability',
    entity: 'profiles',
    record: {
      id: therapistId,
      availability: availabilitySummary,
    },
  }).catch(() => {});
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
