import type { AppointmentRecord } from '../types';
import { apiRequest, getSession } from './session';
import { conflictOnDate, type Slot } from './scheduling';

const storageKey = 'creare.appointments';
const demo = (import.meta.env.VITE_BACKEND_MODE ?? 'local') === 'local';
const listeners = new Set<(rows: AppointmentRecord[]) => void>();
let cache: AppointmentRecord[] = [];
let timer: number | undefined;
const emit = () => listeners.forEach(listener => listener(cache));
const dateToday = () => `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
function normalize(value: Partial<AppointmentRecord>): AppointmentRecord {
  const kind = value.kind || value.type || 'session';
  return { id: String(value.id || crypto.randomUUID()), title: String(value.title || 'Reserva'), kind, type: kind, status: value.status || 'scheduled', professionalId: value.professionalId || value.proId, proId: value.professionalId || value.proId, roomId: value.roomId, patient: value.patient, patientPhone: value.patientPhone, notes: value.notes, date: value.date || dateToday(), start: value.start || '08:00', end: value.end || '08:45', recurrence: value.recurrence || 'none', selectedDays: value.selectedDays || [], untilDate: value.untilDate, excludedDates: value.excludedDates || [], createdBy: value.createdBy, createdAt: value.createdAt, updatedAt: value.updatedAt, coverageType: value.coverageType };
}
function localRows(): AppointmentRecord[] {
  try { const value = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(value) ? value.map(normalize) : []; } catch { return []; }
}
async function refresh() {
  if (demo) cache = localRows();
  else {
    const result = await apiRequest<{ ok: true; appointments: AppointmentRecord[] }>({ action: 'list', entity: 'appointments' });
    cache = result.appointments.map(normalize);
  }
  emit();
  return cache;
}
export const refreshAppointments = refresh;
export const forceRefreshAppointments = refresh;
export const getBackendLabel = () => demo ? 'Demostración local' : 'Compartido';
export const getSessionUser = () => ({ uid: getSession()?.actor.email || 'demo', displayName: getSession()?.actor.email || 'Admin CREAR', photoURL: '' });
export const signInWithGoogle = async () => getSessionUser();
export const logout = async () => undefined;
export function subscribeToAppointments(callback: (rows: AppointmentRecord[]) => void, onError?: (error: unknown) => void) {
  listeners.add(callback);
  callback(demo ? localRows() : cache);
  void refresh().catch(onError);
  if (!timer && !demo) timer = window.setInterval(() => { if (!document.hidden) void refresh().catch(onError); }, 20000);
  return () => { listeners.delete(callback); if (!listeners.size && timer) { window.clearInterval(timer); timer = undefined; } };
}
function validateLocal(candidate: AppointmentRecord, existing: AppointmentRecord[]) {
  const start = new Date(`${candidate.date}T12:00:00`);
  const days = candidate.recurrence && candidate.recurrence !== 'none' ? 365 : 1;
  for (let index = 0; index < days; index++) {
    const day = new Date(start); day.setDate(day.getDate() + index);
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const conflicting = conflictOnDate(candidate as Slot, existing as Slot[], date);
    if (conflicting) throw new Error(`Conflicto de horario el ${date}.`);
  }
}
export async function saveAppointment(data: Partial<AppointmentRecord>, id?: string) {
  const record = normalize({ ...data, id: id || data.id, updatedAt: new Date().toISOString(), createdAt: data.createdAt || new Date().toISOString() });
  if (demo) {
    const rows = localRows(); validateLocal(record, rows);
    const next = rows.some(row => row.id === record.id) ? rows.map(row => row.id === record.id ? record : row) : [...rows, record];
    localStorage.setItem(storageKey, JSON.stringify(next)); cache = next; emit(); return;
  }
  await apiRequest({ action: id ? 'update' : 'create', entity: 'appointments', id, appointment: record });
  await refresh();
}
export async function deleteAppointment(id: string) {
  if (demo) { const next = localRows().map(row => row.id === id ? { ...row, status: 'cancelled' as const } : row); localStorage.setItem(storageKey, JSON.stringify(next)); cache = next; emit(); return; }
  await apiRequest({ action: 'delete', entity: 'appointments', id });
  await refresh();
}
