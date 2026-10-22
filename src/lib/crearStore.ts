import { useEffect, useState } from 'react';
import { apiRequest } from './session';
import { conflictOnDate, type Slot } from './scheduling';

export type InquiryStatus = 'Nueva consulta' | 'Pendiente de disponibilidad' | 'Pendiente de respuesta profesional' | 'Entrevista propuesta' | 'Entrevista confirmada' | 'Entrevista realizada' | 'En seguimiento' | 'Lista de espera' | 'Cerrada o cancelada';
export const inquiryStatuses: InquiryStatus[] = ['Nueva consulta', 'Pendiente de disponibilidad', 'Pendiente de respuesta profesional', 'Entrevista propuesta', 'Entrevista confirmada', 'Entrevista realizada', 'En seguimiento', 'Lista de espera', 'Cerrada o cancelada'];
export type Inquiry = { id: string; createdAt: string; updatedAt: string; contact: string; phone: string; discipline: string; professionalId: string; origin: string; responsible: string; status: InquiryStatus; nextAction: string; notes: string; archived: boolean };
export type Interview = { id: string; inquiryId: string; professionalId: string; roomId: string; date: string; start: string; end: string; status: 'propuesta' | 'confirmada' | 'realizada' | 'cancelada' | 'no asistió'; reminderAt: string; reminderStatus: 'pendiente' | 'enviado' | 'confirmación recibida' | 'reprogramación solicitada'; paymentStatus: 'pendiente' | 'cobrado'; amount: number; paymentMethod: string; receivedBy: string; receipt: string; updatedAt: string };
export type Money = { id: string; date: string; kind: 'ingreso' | 'gasto' | 'aporte' | 'devolución'; category: string; description: string; amount: number; method: string; person: string; sourceId: string; status: 'previsto' | 'pagado'; nature: string };
export type Room = { id: string; name: string; description: string; disciplines: string; thirdPartyEnabled: boolean };
export type Agreement = { id: string; professionalId: string; roomId: string; days: string; start: string; end: string; amount: number; dueDay: number; status: 'activo' | 'pausado'; notes: string; startDate?: string; endDate?: string };
export type Rental = { id: string; roomId: string; professionalId: string; audience: 'habitual' | 'tercero'; occupant: string; period: 'hora' | 'jornada'; date: string; start: string; end: string; recurrence: 'none' | 'weekly'; selectedDays: number[]; untilDate: string; excludedDates: string[]; status: 'provisional' | 'confirmado' | 'cancelled'; amount: number; paymentStatus: 'pendiente' | 'parcial' | 'cobrado'; dueDate: string; method: string; notes: string; updatedAt: string };
export type Profile = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  specialty: string;
  subSpecialty?: string;
  licenseNumber?: string;
  phone: string;
  email: string;
  joinedDate?: string;
  active: boolean;
  responsible: string;
  roomId: string;
  availability: string;
  acceptingPatients?: boolean;
  serviceIds?: string[];
  rent: number;
  dueDay: number;
  notes: string;
  color?: string;
  legacyIds?: string[];
  updatedAt?: string;
};
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

export const DEFAULT_PROFILES_SEED: Profile[] = [
  {
    id: 'ariadna',
    name: 'Ariadna Gareca',
    firstName: 'Ariadna',
    lastName: 'Gareca',
    specialty: 'Psicología',
    subSpecialty: 'Clínica Infanto-Juvenil',
    licenseNumber: '',
    phone: '',
    email: 'ariadna@crear.com',
    active: true,
    responsible: 'Janina',
    roomId: 'c3',
    availability: 'Viernes de 14:00 a 20:00',
    acceptingPatients: true,
    serviceIds: ['srv-psicologia', 'srv-evaluacion'],
    rent: 65000,
    dueDay: 10,
    notes: '',
    color: 'bg-purple-500',
  },
  {
    id: 'ivana',
    name: 'Ivana Gúzman',
    firstName: 'Ivana',
    lastName: 'Gúzman',
    specialty: 'Educación especial',
    subSpecialty: 'Inclusión escolar',
    licenseNumber: '',
    phone: '3884870363',
    email: 'ivana@crear.com',
    active: true,
    responsible: 'Janina',
    roomId: 'c1',
    availability: 'Mar (17 a 21:00) - Vier (16:30 a 21:00)',
    acceptingPatients: true,
    serviceIds: ['srv-educacion-especial'],
    rent: 65000,
    dueDay: 10,
    notes: 'Alquiler 2 días',
    color: 'bg-amber-500',
  },
  {
    id: 'dana',
    name: 'Dana Lopéz',
    firstName: 'Dana',
    lastName: 'Lopéz',
    specialty: 'Psicopedagogía',
    subSpecialty: 'Diagnóstico y tratamiento',
    licenseNumber: '',
    phone: '3884322746',
    email: 'dana@crear.com',
    active: true,
    responsible: 'Florencia',
    roomId: 'c1',
    availability: 'Jue (16:00 a 20:00)',
    acceptingPatients: true,
    serviceIds: ['srv-psicopedagogia', 'srv-evaluacion'],
    rent: 65000,
    dueDay: 10,
    notes: 'Alquiler 1 día',
    color: 'bg-cyan-500',
  },
  {
    id: 'romy',
    name: 'Romina Goméz',
    firstName: 'Romina',
    lastName: 'Goméz',
    specialty: 'Psicomotricidad',
    subSpecialty: '',
    licenseNumber: '',
    phone: '3517016812',
    email: 'romy@crear.com',
    active: true,
    responsible: 'Florencia',
    roomId: 'c2',
    availability: 'Lun (14:00 a 20:00)',
    acceptingPatients: true,
    serviceIds: ['srv-psicomotricidad'],
    rent: 65000,
    dueDay: 10,
    notes: 'Alquiler 1 día',
    color: 'bg-slate-500',
  },
  {
    id: 'barbie',
    name: 'Barbie Benicio',
    firstName: 'Barbie',
    lastName: 'Benicio',
    specialty: 'Terapia ocupacional',
    subSpecialty: 'Integración sensorial',
    licenseNumber: '',
    phone: '3885817010',
    email: 'barbie@crear.com',
    active: true,
    responsible: 'Janina',
    roomId: 'c2',
    availability: 'Martes y Jueves (14:00 - 19:00)',
    acceptingPatients: true,
    serviceIds: ['srv-terapia-ocupacional'],
    rent: 65000,
    dueDay: 10,
    notes: 'Alquiler 2 días',
    color: 'bg-rose-500',
  },
  {
    id: 'vero',
    name: 'Vero Rodulfo',
    firstName: 'Vero',
    lastName: 'Rodulfo',
    specialty: 'Fonoaudiología',
    subSpecialty: 'Lenguaje y habla',
    licenseNumber: '',
    phone: '3883133794',
    email: 'vero@crear.com',
    active: true,
    responsible: 'Florencia',
    roomId: 'c3',
    availability: 'Mar y Jue (18:00 - 21:00)',
    acceptingPatients: true,
    serviceIds: ['srv-fonoaudiologia'],
    rent: 65000,
    dueDay: 10,
    notes: 'Alquiler 2 días',
    color: 'bg-emerald-500',
  },
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
  if (entity === 'profiles') return DEFAULT_PROFILES_SEED as unknown as EntityMap[K][];
  return [];
}

function localWrite<K extends Entity>(entity: K, rows: EntityMap[K][]) {
  try {
    localStorage.setItem(`crear.sheets.${entity}`, JSON.stringify(rows));
  } catch {}
}

export function seedDemoData() {
  // Inicializa consultorios y profesionales base si aún no están en caché
  if (!localStorage.getItem('crear.sheets.rooms')) {
    localWrite('rooms', DEFAULT_ROOMS_SEED);
  }
  if (!localStorage.getItem('crear.sheets.profiles')) {
    localWrite('profiles', DEFAULT_PROFILES_SEED);
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
    let finalRows = rows;
    if (entity === 'rooms' && rows.length === 0) {
      finalRows = DEFAULT_ROOMS_SEED as unknown as EntityMap[K][];
    } else if (entity === 'profiles') {
      const incoming = rows as unknown as Profile[];
      const mergedMap = new Map<string, Profile>();
      DEFAULT_PROFILES_SEED.forEach((p) => mergedMap.set(p.id, p));
      incoming.forEach((p) => {
        const prev = mergedMap.get(p.id);
        mergedMap.set(p.id, prev ? { ...prev, ...p } : p);
      });
      finalRows = Array.from(mergedMap.values()) as unknown as EntityMap[K][];
    }
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

  // 2. Sincronización real hacia Google Sheets (con reversión si falla)
  try {
    await apiRequest({ entity, action: 'upsert', record });
    void list(entity);
  } catch (err) {
    console.warn(`Error guardando ${entity} en Google Sheets:`, err);
    cache[entity] = previousRows as never;
    localWrite(entity, previousRows);
    emit();
    throw err;
  }
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
  const agreements = localRead('agreements').map(item => {
    const weekday = Number(item.days);
    const safeDay = Number.isNaN(weekday) ? 1 : ((weekday % 7) + 7) % 7;
    return {
      ...item,
      date: `2026-01-${String(4 + safeDay).padStart(2, '0')}`,
      kind: 'block',
      recurrence: 'weekly',
      selectedDays: [safeDay],
      status: item.status === 'activo' ? 'confirmed' : 'cancelled',
    };
  });
  const candidate: Slot =
    entity === 'agreements'
      ? (() => {
          const weekday = Number((value as Agreement).days);
          const safeDay = Number.isNaN(weekday) ? 1 : ((weekday % 7) + 7) % 7;
          return {
            ...(value as Agreement),
            date: `2026-01-${String(4 + safeDay).padStart(2, '0')}`,
            kind: 'block',
            recurrence: 'weekly',
            selectedDays: [safeDay],
            status: (value as Agreement).status === 'activo' ? 'confirmed' : 'cancelled',
          };
        })()
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
