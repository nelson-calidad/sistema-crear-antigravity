import type { ActivityHistoryRecord, ActivityPeriod, ActivityRecord, FounderRecord } from '../types';

const BACKEND_MODE = import.meta.env.VITE_BACKEND_MODE ?? 'sheet';
const DEFAULT_SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx5kIMawhlVzjOKGh_s2vNAyogd5x8QwtqoTE9fjBUFN_pin5r23mVQq993Xt4y01ZU/exec';
const SHEET_ENDPOINT = (import.meta.env.VITE_SHEETS_ENDPOINT_URL as string | undefined) || DEFAULT_SHEET_ENDPOINT;
const ACTIVITIES_CACHE_KEY = 'crear-activities-cache-v1';
const ACTIVITIES_CACHE_MAX_AGE = 2 * 60 * 1000;

export type ActivitiesPayload = {
  founders: FounderRecord[];
  periods: ActivityPeriod[];
  activities: ActivityRecord[];
  config: Record<string, string>;
};

const toBoolean = (value: unknown) => value === true || ['si', 'sí', 'true'].includes(String(value).toLowerCase());
const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const stringValue = (value: unknown) => value === null || value === undefined ? '' : String(value);

const fetchWithTimeout = async (url: string, init: RequestInit) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw new Error('La conexión con Sheets tardó demasiado. Probá nuevamente.');
    throw cause;
  } finally {
    window.clearTimeout(timeout);
  }
};

const parseIds = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
  }
};

const normalizeFounder = (raw: Record<string, unknown>): FounderRecord => ({
  id: stringValue(raw.id ?? raw.ID_FUNDADORA),
  firstName: stringValue(raw.firstName ?? raw.NOMBRE),
  lastName: stringValue(raw.lastName ?? raw.APELLIDO),
  displayName: stringValue(raw.displayName ?? raw.NOMBRE_MOSTRAR ?? raw.NOMBRE),
  email: stringValue(raw.email ?? raw.EMAIL),
  role: stringValue(raw.role ?? raw.ROL ?? 'FUNDADORA'),
  order: toNumber(raw.order ?? raw.ORDEN, 999),
  active: toBoolean(raw.active ?? raw.ACTIVA),
  createdAt: stringValue(raw.createdAt ?? raw.FECHA_ALTA) || undefined,
  notes: stringValue(raw.notes ?? raw.OBSERVACIONES) || undefined,
});

const normalizePeriod = (raw: Record<string, unknown>): ActivityPeriod => ({
  id: stringValue(raw.id ?? raw.ID_PERIODO),
  name: stringValue(raw.name ?? raw.NOMBRE),
  description: stringValue(raw.description ?? raw.DESCRIPCION) || undefined,
  startDate: stringValue(raw.startDate ?? raw.FECHA_INICIO) || undefined,
  endDate: stringValue(raw.endDate ?? raw.FECHA_FIN) || undefined,
  status: (stringValue(raw.status ?? raw.ESTADO) || 'Borrador') as ActivityPeriod['status'],
  closedAt: stringValue(raw.closedAt ?? raw.FECHA_CIERRE) || undefined,
  closedBy: stringValue(raw.closedBy ?? raw.CERRADO_POR) || undefined,
  notes: stringValue(raw.notes ?? raw.OBSERVACIONES) || undefined,
  createdAt: stringValue(raw.createdAt ?? raw.FECHA_CREACION) || undefined,
  createdBy: stringValue(raw.createdBy ?? raw.CREADO_POR) || undefined,
});

const normalizeActivity = (raw: Record<string, unknown>): ActivityRecord => ({
  id: stringValue(raw.id ?? raw.ID_ACTIVIDAD),
  periodId: stringValue(raw.periodId ?? raw.ID_PERIODO),
  category: stringValue(raw.category ?? raw.CATEGORIA ?? 'Otros'),
  title: stringValue(raw.title ?? raw.ACTIVIDAD),
  description: stringValue(raw.description ?? raw.DESCRIPCION) || undefined,
  expectedResult: stringValue(raw.expectedResult ?? raw.RESULTADO_ESPERADO) || undefined,
  responsibleId: stringValue(raw.responsibleId ?? raw.ID_RESPONSABLE) || undefined,
  collaboratorIds: parseIds(raw.collaboratorIds ?? raw.COLABORADORAS),
  startDate: stringValue(raw.startDate ?? raw.FECHA_INICIO) || undefined,
  dueDate: stringValue(raw.dueDate ?? raw.FECHA_VENCIMIENTO) || undefined,
  priority: (stringValue(raw.priority ?? raw.PRIORIDAD) || 'Media') as ActivityRecord['priority'],
  status: (stringValue(raw.status ?? raw.ESTADO) || 'Sin asignar') as ActivityRecord['status'],
  progress: toNumber(raw.progress ?? raw.PORCENTAJE_AVANCE),
  notes: stringValue(raw.notes ?? raw.OBSERVACIONES) || undefined,
  boardOrder: toNumber(raw.boardOrder ?? raw.ORDEN_TABLERO, 999999),
  createdBy: stringValue(raw.createdBy ?? raw.CREADA_POR) || undefined,
  createdAt: stringValue(raw.createdAt ?? raw.FECHA_CREACION) || undefined,
  modifiedBy: stringValue(raw.modifiedBy ?? raw.MODIFICADA_POR) || undefined,
  modifiedAt: stringValue(raw.modifiedAt ?? raw.FECHA_MODIFICACION) || undefined,
  finishedAt: stringValue(raw.finishedAt ?? raw.FECHA_FINALIZACION) || undefined,
  active: raw.active === undefined && raw.ACTIVA === undefined ? true : toBoolean(raw.active ?? raw.ACTIVA),
});

const normalizeHistory = (raw: Record<string, unknown>): ActivityHistoryRecord => ({
  id: stringValue(raw.id ?? raw.ID_HISTORIAL),
  timestamp: stringValue(raw.timestamp ?? raw.FECHA_HORA),
  user: stringValue(raw.user ?? raw.USUARIO),
  action: stringValue(raw.action ?? raw.ACCION),
  activityId: stringValue(raw.activityId ?? raw.ID_ACTIVIDAD),
  field: stringValue(raw.field ?? raw.CAMPO_MODIFICADO),
  previousValue: stringValue(raw.previousValue ?? raw.VALOR_ANTERIOR),
  newValue: stringValue(raw.newValue ?? raw.VALOR_NUEVO),
  reason: stringValue(raw.reason ?? raw.MOTIVO) || undefined,
});

const getUrl = (params: Record<string, string>) => {
  const url = new URL(SHEET_ENDPOINT);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set('_ts', String(Date.now()));
  return url.toString();
};

const request = async <T>(action: string, payload: Record<string, unknown> = {}): Promise<T> => {
  if (BACKEND_MODE !== 'sheet' || !SHEET_ENDPOINT) {
    throw new Error('El módulo de responsabilidades necesita la conexión con Google Sheets configurada.');
  }
  const response = await fetchWithTimeout(SHEET_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8', Accept: 'application/json' },
    body: JSON.stringify({ entity: 'activities', action, ...payload }),
  });
  const result = await response.json();
  if (!response.ok || !result?.ok) throw new Error(result?.message || 'No se pudo guardar la información.');
  return result.data as T;
};

const saveActivitiesCache = (data: ActivitiesPayload) => {
  try { window.sessionStorage.setItem(ACTIVITIES_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data })); } catch { /* La caché es una mejora opcional. */ }
};

export const readCachedActivitiesData = (): ActivitiesPayload | null => {
  try {
    const stored = window.sessionStorage.getItem(ACTIVITIES_CACHE_KEY);
    if (!stored) return null;
    const entry = JSON.parse(stored) as { savedAt?: number; data?: ActivitiesPayload };
    if (!entry.data || !entry.savedAt || Date.now() - entry.savedAt > ACTIVITIES_CACHE_MAX_AGE) return null;
    return entry.data;
  } catch { return null; }
};

export const loadActivitiesData = async (): Promise<ActivitiesPayload> => {
  if (BACKEND_MODE !== 'sheet' || !SHEET_ENDPOINT) {
    throw new Error('Configurá VITE_BACKEND_MODE=sheet y VITE_SHEETS_ENDPOINT_URL para usar Responsabilidades.');
  }
  const response = await fetchWithTimeout(getUrl({ entity: 'activities' }), { headers: { Accept: 'application/json' }, cache: 'no-store' });
  const result = await response.json();
  if (!response.ok || !result?.ok) throw new Error(result?.message || 'No se pudieron cargar las responsabilidades.');
  const raw = result.data || {};
  const data = {
    founders: Array.isArray(raw.founders) ? raw.founders.map(normalizeFounder) : [],
    periods: Array.isArray(raw.periods) ? raw.periods.map(normalizePeriod) : [],
    activities: Array.isArray(raw.activities) ? raw.activities.map(normalizeActivity) : [],
    config: raw.config || {},
  };
  saveActivitiesCache(data);
  return data;
};

export const createPeriod = async (period: Partial<ActivityPeriod>, user: string) => {
  const result = await request<Record<string, unknown>>('createPeriod', { period, user });
  return normalizePeriod(result);
};

export const saveActivity = async (activity: Partial<ActivityRecord>, user: string, reason?: string) => {
  const result = await request<Record<string, unknown>>(activity.id ? 'updateActivity' : 'createActivity', { activity, user, reason });
  return normalizeActivity(result);
};

export const saveActivityOrder = async (orders: Array<{ id: string; boardOrder: number }>, user: string) => {
  await request('reorderActivities', { orders, user });
};

export const loadActivityHistory = async (activityId: string): Promise<ActivityHistoryRecord[]> => {
  const response = await fetch(getUrl({ entity: 'activities', idActivity: activityId }), { headers: { Accept: 'application/json' }, cache: 'no-store' });
  const result = await response.json();
  if (!response.ok || !result?.ok) throw new Error(result?.message || 'No se pudo cargar el historial.');
  return Array.isArray(result.data?.history) ? result.data.history.map(normalizeHistory) : [];
};
