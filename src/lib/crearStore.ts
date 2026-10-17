import { useEffect, useState } from 'react';
import { apiRequest } from './session';
import { conflictOnDate, type Slot } from './scheduling';

export type InquiryStatus = 'Nueva consulta' | 'Pendiente de disponibilidad' | 'Pendiente de respuesta profesional' | 'Entrevista propuesta' | 'Entrevista confirmada' | 'Entrevista realizada' | 'En seguimiento' | 'Lista de espera' | 'Cerrada o cancelada';
export const inquiryStatuses: InquiryStatus[] = ['Nueva consulta', 'Pendiente de disponibilidad', 'Pendiente de respuesta profesional', 'Entrevista propuesta', 'Entrevista confirmada', 'Entrevista realizada', 'En seguimiento', 'Lista de espera', 'Cerrada o cancelada'];
export type Inquiry = { id: string; createdAt: string; updatedAt: string; contact: string; phone: string; discipline: string; professionalId: string; origin: string; responsible: string; status: InquiryStatus; nextAction: string; notes: string; archived: boolean };
export type Interview = { id: string; inquiryId: string; professionalId: string; roomId: string; date: string; start: string; end: string; status: 'propuesta' | 'confirmada' | 'realizada' | 'cancelada' | 'no asistió'; reminderAt: string; reminderStatus: 'pendiente' | 'enviado' | 'confirmación recibida' | 'reprogramación solicitada'; paymentStatus: 'pendiente' | 'cobrado'; amount: number; paymentMethod: string; receivedBy: string; receipt: string; updatedAt: string };
export type Money = { id: string; date: string; kind: 'ingreso' | 'gasto' | 'aporte' | 'devolución'; category: string; description: string; amount: number; method: string; person: string; sourceId: string; status: 'previsto' | 'pagado'; nature: string };
export type Room = { id: string; name: string; description: string; disciplines: string; thirdPartyEnabled: boolean };
export type Agreement = { id: string; professionalId: string; roomId: string; days: string; start: string; end: string; amount: number; dueDay: number; status: 'activo' | 'pausado'; notes: string };
export type Rental = { id: string; roomId: string; professionalId: string; audience: 'habitual' | 'tercero'; occupant: string; period: 'hora' | 'jornada'; date: string; start: string; end: string; recurrence: 'none' | 'weekly'; selectedDays: number[]; untilDate: string; excludedDates: string[]; status: 'provisional' | 'confirmado' | 'cancelled'; amount: number; paymentStatus: 'pendiente' | 'cobrado'; dueDate: string; method: string; notes: string; updatedAt: string };
export type Profile = { id: string; name: string; specialty: string; phone: string; email: string; active: boolean; responsible: string; roomId: string; availability: string; rent: number; dueDay: number; notes: string };
export type Setting = { id: string; value: string };
export type EntityMap = { inquiries: Inquiry; interviews: Interview; money: Money; rooms: Room; agreements: Agreement; rentals: Rental; profiles: Profile; settings: Setting };
export type Entity = keyof EntityMap;
export const uid = () => crypto.randomUUID();
export const localDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Jujuy', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const demo = (import.meta.env.VITE_BACKEND_MODE ?? 'local') === 'local';
export const isDemo = demo;
const listeners = new Set<() => void>();
const cache: Partial<{ [K in Entity]: EntityMap[K][] }> = {};
function emit() { listeners.forEach(listener => listener()); }
function localRead<K extends Entity>(entity: K): EntityMap[K][] { try { return JSON.parse(localStorage.getItem(`crear.demo.${entity}`) || '[]'); } catch { return []; } }
const dateOffset = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Jujuy', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); };
export function seedDemoData(force = false) {
  if (!demo || (!force && localStorage.getItem('crear.demo.seeded') === '1')) return;
  if (force) Object.keys(localStorage).filter(key => key.startsWith('crear.demo.')).forEach(key => localStorage.removeItem(key));
  const today = dateOffset(0), tomorrow = dateOffset(1), nextWeek = dateOffset(7);
  const data: Partial<{ [K in Entity]: EntityMap[K][] }> = {
    inquiries: [
      { id: 'demo-consulta-1', createdAt: `${today}T09:10:00`, updatedAt: `${today}T09:10:00`, contact: 'Familia Demo A', phone: '3880000001', discipline: 'Psicología', professionalId: 'ariadna', origin: 'WhatsApp', responsible: 'Karina', status: 'Entrevista confirmada', nextAction: today, notes: 'Registro ficticio para probar el recorrido.', archived: false },
      { id: 'demo-consulta-2', createdAt: `${today}T10:20:00`, updatedAt: `${today}T10:20:00`, contact: 'Familia Demo B', phone: '3880000002', discipline: 'Fonoaudiología', professionalId: 'vero', origin: 'WhatsApp', responsible: 'Janina', status: 'Pendiente de disponibilidad', nextAction: tomorrow, notes: 'Datos exclusivamente demostrativos.', archived: false },
    ],
    interviews: [{ id: 'demo-entrevista-1', inquiryId: 'demo-consulta-1', professionalId: 'ariadna', roomId: 'c1', date: today, start: '15:00', end: '15:30', status: 'confirmada', reminderAt: today, reminderStatus: 'pendiente', paymentStatus: 'pendiente', amount: 12000, paymentMethod: '', receivedBy: '', receipt: '', updatedAt: new Date().toISOString() }],
    money: [
      { id: 'demo-gasto-1', date: today, kind: 'gasto', category: 'Servicios', description: 'Servicio demostrativo', amount: 42000, method: 'Transferencia', person: '', sourceId: '', status: 'pagado', nature: '' },
      { id: 'demo-aporte-1', date: today, kind: 'aporte', category: 'Aporte personal', description: 'Aporte demostrativo de administradora', amount: 25000, method: 'Transferencia', person: 'Administradora demo', sourceId: '', status: 'pagado', nature: 'Aporte' },
    ],
    agreements: [{ id: 'demo-acuerdo-1', professionalId: 'ariadna', roomId: 'c1', days: String(new Date(`${today}T12:00:00`).getDay()), start: '14:00', end: '20:00', amount: 65000, dueDay: 10, status: 'activo', notes: 'Acuerdo ficticio de demostración.' }],
    rentals: [{ id: 'demo-alquiler-1', roomId: 'c2', professionalId: 'ivana', audience: 'habitual', occupant: 'Profesional Demo', period: 'hora', date: nextWeek, start: '10:00', end: '12:00', recurrence: 'none', selectedDays: [], untilDate: '', excludedDates: [], status: 'confirmado', amount: 18000, paymentStatus: 'pendiente', dueDate: tomorrow, method: '', notes: 'Alquiler ficticio.', updatedAt: new Date().toISOString() }],
    rooms: [
      { id: 'c1', name: 'Consultorio 1 — Pedagogía', description: 'Espacio flexible para entrevistas y acompañamiento.', disciplines: 'Psicología, Psicopedagogía, Educación especial', thirdPartyEnabled: false },
      { id: 'c2', name: 'Consultorio 2 — Rehabilitación', description: 'Preparado para propuestas de movimiento y autonomía.', disciplines: 'Psicomotricidad, Terapia ocupacional', thirdPartyEnabled: false },
      { id: 'c3', name: 'Consultorio 3 — Atención tranquila', description: 'Ambiente calmo para atención individual.', disciplines: 'Fonoaudiología, Psicología', thirdPartyEnabled: false },
    ],
    settings: [{ id: 'thirdAdmin', value: 'Tercera administradora' }, { id: 'buildingRent', value: '770000' }],
  };
  Object.entries(data).forEach(([entity, rows]) => localStorage.setItem(`crear.demo.${entity}`, JSON.stringify(rows)));
  localStorage.setItem('creare.appointments', JSON.stringify([{ id: 'demo-sesion-1', title: 'Paciente Demo', patient: 'Paciente Demo', kind: 'session', type: 'session', status: 'confirmed', professionalId: 'ariadna', proId: 'ariadna', roomId: 'c1', date: today, start: '16:00', end: '16:45', recurrence: 'none', selectedDays: [], excludedDates: [], notes: 'Sesión ficticia dentro del horario reservado.' }]));
  localStorage.setItem('crear.demo.seeded', '1'); Object.keys(cache).forEach(key => delete cache[key as Entity]); emit();
}
export function resetDemoData() { seedDemoData(true); window.location.reload(); }
export async function list<K extends Entity>(entity: K): Promise<EntityMap[K][]> {
  if (demo) { const rows = localRead(entity); cache[entity] = rows as never; emit(); return rows; }
  const data = await apiRequest<{ ok: true; records: EntityMap[K][] }>({ action: 'list', entity });
  const rows = data.records as EntityMap[K][];
  cache[entity] = rows as never; emit(); return rows;
}
export async function save<K extends Entity>(entity: K, record: EntityMap[K]): Promise<void> {
  if (demo) {
    if (entity === 'interviews' || entity === 'rentals' || entity === 'agreements') validateDemoSchedule(entity, record as Interview | Rental | Agreement);
    const rows = localRead(entity); const index = rows.findIndex(row => row.id === record.id);
    if (index < 0) rows.push(record); else rows[index] = record;
    localStorage.setItem(`crear.demo.${entity}`, JSON.stringify(rows)); cache[entity] = rows as never; emit(); return;
  }
  await apiRequest({ entity, action: 'upsert', record });
  await list(entity);
}
function validateDemoSchedule(entity: 'interviews' | 'rentals' | 'agreements', value: Interview | Rental | Agreement) {
  const appointments = (() => { try { return JSON.parse(localStorage.getItem('creare.appointments') || '[]'); } catch { return []; } })();
  const interviews = localRead('interviews').map(item => ({ ...item, kind: 'interview', recurrence: 'none' }));
  const rentals = localRead('rentals').map(item => ({ ...item, kind: 'block' }));
  const agreements = localRead('agreements').map(item => ({ ...item, date: localDate(), kind: 'block', recurrence: 'weekly', selectedDays: [Number(item.days)], status: item.status === 'activo' ? 'confirmed' : 'cancelled' }));
  const candidate: Slot = entity === 'agreements'
    ? { ...(value as Agreement), date: localDate(), kind: 'block', recurrence: 'weekly', selectedDays: [Number((value as Agreement).days)], status: (value as Agreement).status === 'activo' ? 'confirmed' : 'cancelled' }
    : { ...(value as Interview | Rental), kind: entity === 'interviews' ? 'interview' : 'block', recurrence: entity === 'interviews' ? 'none' : (value as Rental).recurrence } as Slot;
  const existing = [...appointments, ...interviews, ...rentals, ...agreements].filter(item => item.id !== candidate.id) as Slot[];
  const start = new Date(`${candidate.date}T12:00:00`); const days = candidate.recurrence && candidate.recurrence !== 'none' ? 365 : 1;
  for (let index = 0; index < days; index++) { const day = new Date(start); day.setDate(day.getDate() + index); const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`; if (conflictOnDate(candidate, existing, date)) throw new Error(`El horario se superpone con otro compromiso el ${date.split('-').reverse().join('/')}.`); }
}
export function useRecords<K extends Entity>(entity: K) {
  const [rows, setRows] = useState<EntityMap[K][]>(() => (cache[entity] || []) as EntityMap[K][]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const update = () => setRows((cache[entity] || []) as EntityMap[K][]);
    listeners.add(update);
    const refresh = () => void list(entity).then(() => setError('')).catch(e => setError(String(e.message || e))).finally(() => setLoading(false));
    refresh();
    const timer = demo ? undefined : window.setInterval(() => { if (!document.hidden) refresh(); }, 20000);
    const visible = () => { if (!document.hidden && !demo) refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { listeners.delete(update); if (timer) window.clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [entity]);
  return { rows, loading, error, refresh: () => list(entity) };
}
export const moneyFormat = (amount: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
