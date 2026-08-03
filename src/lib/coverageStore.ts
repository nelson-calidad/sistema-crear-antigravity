import type { CoverageShift, FounderRecord } from '../types';

const DEFAULT_SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx5kIMawhlVzjOKGh_s2vNAyogd5x8QwtqoTE9fjBUFN_pin5r23mVQq993Xt4y01ZU/exec';
const SHEET_ENDPOINT = (import.meta.env.VITE_SHEETS_ENDPOINT_URL as string | undefined) || DEFAULT_SHEET_ENDPOINT;

export type CoveragePayload = { founders: FounderRecord[]; shifts: CoverageShift[] };

const text = (value: unknown) => value === null || value === undefined ? '' : String(value);
const number = (value: unknown, fallback = 999) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const yes = (value: unknown) => { const normalized = text(value).toLowerCase(); return value === true || normalized === 'si' || normalized === 'true' || normalized.charAt(0) === 's'; };
const dateValue = (value: unknown) => {
  const raw = text(value);
  const direct = raw.match(/\d{4}-\d{2}-\d{2}/);
  if (direct) return direct[0];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return [parsed.getFullYear(), String(parsed.getMonth() + 1).padStart(2, '0'), String(parsed.getDate()).padStart(2, '0')].join('-');
};
const timeValue = (value: unknown) => {
  const raw = text(value);
  const match = raw.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::\d{2})?/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : raw;
};

const normalizeFounder = (raw: Record<string, unknown>): FounderRecord => ({
  id: text(raw.id ?? raw.ID_FUNDADORA),
  firstName: text(raw.firstName ?? raw.NOMBRE),
  lastName: text(raw.lastName ?? raw.APELLIDO),
  displayName: text(raw.displayName ?? raw.NOMBRE_MOSTRAR ?? raw.NOMBRE),
  email: text(raw.email ?? raw.EMAIL),
  role: text(raw.role ?? raw.ROL ?? 'FUNDADORA'),
  order: number(raw.order ?? raw.ORDEN),
  active: yes(raw.active ?? raw.ACTIVA),
});

const normalizeShift = (raw: Record<string, unknown>): CoverageShift => {
  const type = text(raw.type ?? raw.TIPO) === 'control' ? 'control' : 'guard';
  const status = text(raw.status ?? raw.ESTADO);
  return {
    id: text(raw.id ?? raw.ID_COBERTURA),
    date: dateValue(raw.date ?? raw.FECHA),
    startTime: timeValue(raw.startTime ?? raw.HORA_INICIO),
    endTime: timeValue(raw.endTime ?? raw.HORA_FIN),
    actualStartTime: timeValue(raw.actualStartTime ?? raw.HORA_REAL_INICIO) || undefined,
    actualEndTime: timeValue(raw.actualEndTime ?? raw.HORA_REAL_FIN) || undefined,
    type,
    place: text(raw.place ?? raw.LUGAR) || (type === 'control' ? 'Control externo' : 'CREAR'),
    primaryId: text(raw.primaryId ?? raw.ID_RESPONSABLE),
    secondaryId: text(raw.secondaryId ?? raw.ID_ACOMPANANTE) || undefined,
    professional: text(raw.professional ?? raw.PROFESIONAL) || undefined,
    status: (['Completed', 'Rescheduled', 'Cancelled'].includes(status) ? status : 'Planned') as CoverageShift['status'],
    notes: text(raw.notes ?? raw.NOTAS) || undefined,
    completedAt: dateValue(raw.completedAt ?? raw.FECHA_REALIZADO) || undefined,
    createdAt: text(raw.createdAt ?? raw.FECHA_CREACION) || undefined,
    createdBy: text(raw.createdBy ?? raw.CREADO_POR) || undefined,
  };
};

const endpoint = (params?: Record<string, string>) => {
  const url = new URL(SHEET_ENDPOINT);
  url.searchParams.set('entity', 'coverage');
  url.searchParams.set('_ts', String(Date.now()));
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
};

const request = async <T>(action: string, body: Record<string, unknown>) => {
  const response = await fetch(SHEET_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ entity: 'coverage', action, ...body }),
  });
  const result = await response.json();
  if (!response.ok || !result?.ok) throw new Error(result?.message || 'No se pudo guardar la cobertura.');
  return result.data as T;
};

export const loadCoverageData = async (): Promise<CoveragePayload> => {
  const response = await fetch(endpoint(), { headers: { Accept: 'application/json' }, cache: 'no-store' });
  const result = await response.json();
  if (!response.ok || !result?.ok) throw new Error(result?.message || 'No se pudo cargar Guardias y controles.');
  const data = result.data || {};
  return {
    founders: Array.isArray(data.founders) ? data.founders.map(normalizeFounder).filter((founder) => founder.active).sort((a, b) => a.order - b.order) : [],
    shifts: Array.isArray(data.shifts) ? data.shifts.map(normalizeShift).filter((shift) => shift.status !== 'Cancelled') : [],
  };
};

export const saveCoverageShift = async (shift: Partial<CoverageShift>, user: string) => {
  const result = await request<Record<string, unknown>>(shift.id ? 'updateShift' : 'createShift', { shift, user });
  return normalizeShift(result);
};
