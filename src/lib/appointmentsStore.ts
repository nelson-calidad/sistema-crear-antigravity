import { AppointmentRecord } from '../types';

type BackendMode = 'sheet' | 'supabase' | 'local';

const STORAGE_KEY = 'creare.appointments';
const BACKEND_MODE = (import.meta.env.VITE_BACKEND_MODE ?? 'sheet') as BackendMode;
const SHEET_ENDPOINT = import.meta.env.VITE_SHEETS_ENDPOINT_URL as string | undefined;

const listeners = new Set<(appointments: AppointmentRecord[]) => void>();
let remotePollHandle: number | undefined;

const hasRemoteSheet = BACKEND_MODE === 'sheet' && Boolean(SHEET_ENDPOINT);

const today = () => new Date().toISOString().slice(0, 10);

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const demoAppointments: AppointmentRecord[] = [
  {
    id: 'demo-1',
    title: 'Sesión Juan P.',
    type: 'session',
    proId: '1',
    roomId: 'c1',
    date: today(),
    start: '09:00',
    end: '09:45',
    createdBy: 'sheet-admin',
  },
  {
    id: 'demo-2',
    title: 'Entrevista Maria G.',
    type: 'interview',
    proId: '2',
    roomId: 'c3',
    date: today(),
    start: '10:30',
    end: '11:00',
    createdBy: 'sheet-admin',
  },
  {
    id: 'demo-3',
    title: 'Encuesta de ingreso',
    type: 'survey',
    roomId: 'c2',
    date: today(),
    start: '11:15',
    end: '11:35',
    createdBy: 'sheet-admin',
  },
];

const normalizeAppointment = (appointment: Partial<AppointmentRecord> & Record<string, unknown>): AppointmentRecord => ({
  id: String(appointment.id || createId()),
  title: String(appointment.title || 'Nueva Reserva'),
  type: (appointment.type as AppointmentRecord['type']) || 'session',
  proId: appointment.proId ? String(appointment.proId) : undefined,
  roomId: appointment.roomId ? String(appointment.roomId) : undefined,
  patient: appointment.patient ? String(appointment.patient) : undefined,
  notes: appointment.notes ? String(appointment.notes) : undefined,
  date: String(appointment.date || today()),
  start: String(appointment.start || '08:00'),
  end: String(appointment.end || '08:45'),
  recurrence: (appointment.recurrence as AppointmentRecord['recurrence']) || 'none',
  selectedDays: Array.isArray(appointment.selectedDays) ? appointment.selectedDays.map(Number) : [],
  createdBy: appointment.createdBy ? String(appointment.createdBy) : undefined,
  createdAt: appointment.createdAt ? String(appointment.createdAt) : undefined,
  updatedAt: appointment.updatedAt ? String(appointment.updatedAt) : undefined,
});

const readLocalAppointments = (): AppointmentRecord[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoAppointments));
    return demoAppointments;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return demoAppointments;
    }

    return parsed.map((item) => normalizeAppointment(item));
  } catch {
    return demoAppointments;
  }
};

const writeLocalAppointments = (appointments: AppointmentRecord[]) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
};

const readRemoteAppointments = async (): Promise<AppointmentRecord[]> => {
  if (!SHEET_ENDPOINT) {
    return readLocalAppointments();
  }

  const response = await fetch(SHEET_ENDPOINT, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`No se pudieron leer los datos del sheet (${response.status})`);
  }

  const payload = await response.json();
  const rawAppointments = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.appointments)
      ? payload.appointments
      : [];

  return rawAppointments.map((item) => normalizeAppointment(item));
};

const broadcast = async () => {
  const appointments = hasRemoteSheet ? await readRemoteAppointments() : readLocalAppointments();
  listeners.forEach((listener) => listener(appointments));
};

const ensureRemotePolling = () => {
  if (!hasRemoteSheet || remotePollHandle || typeof window === 'undefined') {
    return;
  }

  remotePollHandle = window.setInterval(() => {
    void broadcast();
  }, 10000);
};

const stopRemotePolling = () => {
  if (remotePollHandle) {
    window.clearInterval(remotePollHandle);
    remotePollHandle = undefined;
  }
};

export const getBackendLabel = () => {
  if (BACKEND_MODE === 'supabase') {
    return 'Supabase';
  }

  if (hasRemoteSheet) {
    return 'Sheet';
  }

  return 'Local';
};

export const getSessionUser = () => ({
  uid: `session-${BACKEND_MODE}`,
  displayName: 'Admin LAB',
  photoURL: '',
});

export const signInWithGoogle = async () => getSessionUser();

export const logout = async () => undefined;

export const subscribeToAppointments = (callback: (appointments: AppointmentRecord[]) => void) => {
  listeners.add(callback);
  ensureRemotePolling();

  void broadcast();

  return () => {
    listeners.delete(callback);

    if (!listeners.size) {
      stopRemotePolling();
    }
  };
};

const persistLocalAppointment = async (appointment: AppointmentRecord, id?: string) => {
  const current = readLocalAppointments();
  const now = new Date().toISOString();
  const normalized = normalizeAppointment({
    ...appointment,
    id: id || appointment.id,
    updatedAt: now,
    createdAt: appointment.createdAt || now,
  });

  const next = id
    ? current.map((item) => (item.id === id ? { ...item, ...normalized } : item))
    : [...current, normalized];

  writeLocalAppointments(next);
  await broadcast();
};

const deleteLocalAppointment = async (id: string) => {
  const next = readLocalAppointments().filter((appointment) => appointment.id !== id);
  writeLocalAppointments(next);
  await broadcast();
};

const persistRemoteAppointment = async (appointment: AppointmentRecord, id?: string) => {
  if (!SHEET_ENDPOINT) {
    await persistLocalAppointment(appointment, id);
    return;
  }

  const response = await fetch(SHEET_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      action: id ? 'update' : 'create',
      id,
      appointment,
    }),
  });

  if (!response.ok) {
    throw new Error(`No se pudo guardar el turno (${response.status})`);
  }

  await broadcast();
};

const deleteRemoteAppointment = async (id: string) => {
  if (!SHEET_ENDPOINT) {
    await deleteLocalAppointment(id);
    return;
  }

  const response = await fetch(SHEET_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      action: 'delete',
      id,
    }),
  });

  if (!response.ok) {
    throw new Error(`No se pudo eliminar el turno (${response.status})`);
  }

  await broadcast();
};

export const saveAppointment = async (data: Partial<AppointmentRecord>, id?: string) => {
  const appointment = normalizeAppointment({
    ...data,
    id: id || data.id,
    updatedAt: new Date().toISOString(),
    createdAt: data.createdAt || new Date().toISOString(),
  });

  if (BACKEND_MODE === 'sheet' && SHEET_ENDPOINT) {
    await persistRemoteAppointment(appointment, id);
    return;
  }

  if (BACKEND_MODE === 'supabase') {
    await persistLocalAppointment(appointment, id);
    return;
  }

  await persistLocalAppointment(appointment, id);
};

export const deleteAppointment = async (id: string) => {
  if (BACKEND_MODE === 'sheet' && SHEET_ENDPOINT) {
    await deleteRemoteAppointment(id);
    return;
  }

  await deleteLocalAppointment(id);
};
