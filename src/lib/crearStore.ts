import { useEffect, useState } from 'react';
import { apiRequest } from './session';

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
export async function list<K extends Entity>(entity: K): Promise<EntityMap[K][]> {
  if (demo) { const rows = localRead(entity); cache[entity] = rows as never; emit(); return rows; }
  const data = await apiRequest<{ ok: true; records: EntityMap[K][] }>({ action: 'list', entity });
  const rows = data.records as EntityMap[K][];
  cache[entity] = rows as never; emit(); return rows;
}
export async function save<K extends Entity>(entity: K, record: EntityMap[K]): Promise<void> {
  if (demo) {
    const rows = localRead(entity); const index = rows.findIndex(row => row.id === record.id);
    if (index < 0) rows.push(record); else rows[index] = record;
    localStorage.setItem(`crear.demo.${entity}`, JSON.stringify(rows)); cache[entity] = rows as never; emit(); return;
  }
  await apiRequest({ entity, action: 'upsert', record });
  await list(entity);
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
