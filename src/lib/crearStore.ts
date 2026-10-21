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

export const isDemo = false;

const listeners = new Set<() => void>();
const cache: Partial<{ [K in Entity]: EntityMap[K][] }> = {};

function emit() {
  listeners.forEach(listener => listener());
}

const DEFAULT_ROOMS_SEED: Room[] = [
  { id: 'c1', name: 'Consultorio 1 — Pedagogía', description: 'Espacio flexible para entrevistas y acompañamiento.', disciplines: 'Psicología, Psicopedagogía, Educación especial', thirdPartyEnabled: false },
  { id: 'c2', name: 'Consultorio 2 — Rehabilitación', description: 'Preparado para propuestas de movimiento y autonomía.', disciplines: 'Psicomotricidad, Terapia ocupacional', thirdPartyEnabled: false },
  { id: 'c3', name: 'Consultorio 3 — Atención tranquila', description: 'Ambiente calmo para atención individual.', disciplines: 'Fonoaudiología, Psicología', thirdPartyEnabled: false },
];

function localRead<K extends Entity>(entity: K): EntityMap[K][] {
  try {
    const raw = localStorage.getItem(`crear.sheets.${entity}`) || localStorage.getItem(`crear.demo.${entity}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  if (entity === 'rooms') return DEFAULT_ROOMS_SEED as unknown as EntityMap[K][];
  return [];
}

function localWrite<K extends Entity>(entity: K, rows: EntityMap[K][]) {
  try {
    localStorage.setItem(`crear.sheets.${entity}`, JSON.stringify(rows));
  } catch {}
}

export function seedDemoData() {
  // Inicializa consultorios base si aún no están en caché
  if (!localStorage.getItem('crear.sheets.rooms')) {
    localWrite('rooms', DEFAULT_ROOMS_SEED);
  }
}

export function resetDemoData() {
  window.location.reload();
}

export async function list<K extends Entity>(entity: K): Promise<EntityMap[K][]> {
  if (!cache[entity]) {
    cache[entity] = localRead(entity) as never;
    emit();
  }
  try {
    const data = await apiRequest<{ ok: true; records: EntityMap[K][] }>({ action: 'list', entity });
    const rows = Array.isArray(data.records) ? data.records : [];
    const finalRows = entity === 'rooms' && rows.length === 0 ? (DEFAULT_ROOMS_SEED as unknown as EntityMap[K][]) : rows;
    cache[entity] = finalRows as never;
    localWrite(entity, finalRows);
    emit();
    return finalRows;
  } catch {
    const fallback = localRead(entity);
    cache[entity] = fallback as never;
    emit();
    return fallback;
  }
}

export async function save<K extends Entity>(entity: K, record: EntityMap[K]): Promise<void> {
  if (entity === 'interviews' || entity === 'rentals' || entity === 'agreements') {
    validateLocalSchedule(entity, record as Interview | Rental | Agreement);
  }

  // 1. Guardado instantáneo en interfaz (0ms)
  const previousRows = [...((cache[entity] as EntityMap[K][] | undefined) || localRead(entity))];
  const index = previousRows.findIndex(row => row.id === record.id);
  const nextRows = index < 0 ? [...previousRows, record] : previousRows.map((r, i) => (i === index ? record : r));
  cache[entity] = nextRows as never;
  localWrite(entity, nextRows);
  emit();

  // 2. Sincronización en segundo plano hacia Google Sheets
  void apiRequest({ entity, action: 'upsert', record })
    .then(() => {
      void list(entity);
    })
    .catch((err) => {
      console.warn(`Error guardando ${entity} en segundo plano:`, err);
      cache[entity] = previousRows as never;
      localWrite(entity, previousRows);
      emit();
    });
}

function validateLocalSchedule(entity: 'interviews' | 'rentals' | 'agreements', value: Interview | Rental | Agreement) {
  const appointments = (() => {
    try {
      return JSON.parse(localStorage.getItem('crear.sheets.appointments.v2') || localStorage.getItem('creare.appointments') || '[]');
    } catch {
      return [];
    }
  })();
  const interviews = localRead('interviews').map(item => ({ ...item, kind: 'interview', recurrence: 'none' }));
  const rentals = localRead('rentals').map(item => ({ ...item, kind: 'block' }));
  const agreements = localRead('agreements').map(item => ({
    ...item,
    date: localDate(),
    kind: 'block',
    recurrence: 'weekly',
    selectedDays: [Number(item.days)],
    status: item.status === 'activo' ? 'confirmed' : 'cancelled',
  }));
  const candidate: Slot =
    entity === 'agreements'
      ? {
          ...(value as Agreement),
          date: localDate(),
          kind: 'block',
          recurrence: 'weekly',
          selectedDays: [Number((value as Agreement).days)],
          status: (value as Agreement).status === 'activo' ? 'confirmed' : 'cancelled',
        }
      : ({
          ...(value as Interview | Rental),
          kind: entity === 'interviews' ? 'interview' : 'block',
          recurrence: entity === 'interviews' ? 'none' : (value as Rental).recurrence,
        } as Slot);
  const existing = [...appointments, ...interviews, ...rentals, ...agreements].filter(item => item.id !== candidate.id) as Slot[];
  const start = new Date(`${candidate.date}T12:00:00`);
  const days = candidate.recurrence && candidate.recurrence !== 'none' ? 180 : 1;
  for (let index = 0; index < days; index++) {
    const day = new Date(start);
    day.setDate(day.getDate() + index);
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    if (conflictOnDate(candidate, existing, date)) {
      throw new Error(`El horario se superpone con otro compromiso el ${date.split('-').reverse().join('/')}.`);
    }
  }
}

export function useRecords<K extends Entity>(entity: K) {
  const [rows, setRows] = useState<EntityMap[K][]>(() => ((cache[entity] as EntityMap[K][] | undefined) || localRead(entity)));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const update = () => setRows(((cache[entity] as EntityMap[K][] | undefined) || localRead(entity)));
    listeners.add(update);
    const refresh = () =>
      void list(entity)
        .then(() => setError(''))
        .catch(e => setError(String(e.message || e)))
        .finally(() => setLoading(false));
    refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden) refresh();
    }, 20000);
    const visible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      listeners.delete(update);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [entity]);

  return { rows, loading, error, refresh: () => list(entity) };
}

export const moneyFormat = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
