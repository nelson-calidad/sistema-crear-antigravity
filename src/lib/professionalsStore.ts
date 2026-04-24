import { useEffect, useState } from 'react';
import { PROFESSIONALS as DEFAULT_PROFESSIONALS } from '../constants';

export type ProfessionalRecord = {
  id: string;
  name: string;
  specialty: string;
  color: string;
  status: 'Activo' | 'En Pausa';
  email: string;
  phone: string;
  hours: string;
  retention: string;
  image: string;
};

type BackendMode = 'sheet' | 'supabase' | 'local';

const STORAGE_KEY = 'creare.professionals';
const BACKEND_MODE = (import.meta.env.VITE_BACKEND_MODE ?? 'sheet') as BackendMode;
const DEFAULT_SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx5kIMawhlVzjOKGh_s2vNAyogd5x8QwtqoTE9fjBUFN_pin5r23mVQq993Xt4y01ZU/exec';
const SHEET_ENDPOINT = (import.meta.env.VITE_SHEETS_ENDPOINT_URL as string | undefined) || DEFAULT_SHEET_ENDPOINT;
const hasRemoteSheet = BACKEND_MODE === 'sheet' && Boolean(SHEET_ENDPOINT);
const REMOTE_POLL_INTERVAL_MS = 15 * 60 * 1000;
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop';

const listeners = new Set<(professionals: ProfessionalRecord[]) => void>();
let remotePollHandle: number | undefined;
let visibilityListenerAttached = false;
let visibilityChangeHandler: (() => void) | undefined;
let cachedProfessionals: ProfessionalRecord[] = [];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^\.|\.$)/g, '');

const formatRetentionValue = (value: unknown, fallback = '20%') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const raw = String(value).trim();
  if (!raw) {
    return fallback;
  }

  if (raw.endsWith('%')) {
    return raw;
  }

  const numeric = Number(raw);
  if (!Number.isNaN(numeric)) {
    if (numeric > 0 && numeric < 1) {
      return `${Math.round(numeric * 100)}%`;
    }

    return `${Math.round(numeric)}%`;
  }

  return raw;
};

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `pro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const enrichProfessional = (professional: typeof DEFAULT_PROFESSIONALS[number]): ProfessionalRecord => ({
  ...professional,
  status: professional.status === 'En Pausa' ? 'En Pausa' : 'Activo',
  email: `${professional.name.toLowerCase()}@lab.com`,
  phone: '+54 11 2345-6789',
  retention: '20%',
  hours: 'Lun, Mie, Vie (08:00 - 14:00)',
  image: `https://images.unsplash.com/photo-${professional.id === '1'
    ? '1494790108377-be9c29b29330'
    : professional.id === '2'
      ? '1507003211169-0a1dd7228f2d'
      : '1438761681033-6461ffad8d80'}?w=150&h=150&fit=crop`,
});

function createDefaultProfessionals(): ProfessionalRecord[] {
  return DEFAULT_PROFESSIONALS.map(enrichProfessional);
}

cachedProfessionals = createDefaultProfessionals();

const normalizeProfessional = (
  professional: Partial<ProfessionalRecord> & { id: string },
  fallback?: ProfessionalRecord,
): ProfessionalRecord => {
  const base = fallback ?? createDefaultProfessionals()[0];
  const name = String(professional.name || base.name || 'Sin nombre');

  return {
    ...base,
    ...professional,
    id: String(professional.id),
    name,
    specialty: String(professional.specialty || base.specialty || ''),
    color: String(professional.color || base.color || 'bg-slate-500'),
    status: professional.status === 'En Pausa' ? 'En Pausa' : 'Activo',
    email: String(professional.email || (name ? `${slugify(name)}@lab.com` : '') || base.email || ''),
    phone: String(professional.phone || base.phone || ''),
    hours: String(professional.hours || base.hours || 'Lun, Mie, Vie (08:00 - 14:00)'),
    retention: formatRetentionValue(professional.retention || base.retention || '20%'),
    image: String(professional.image || base.image || DEFAULT_IMAGE),
  };
};

const buildProfessionalsUrl = () => {
  if (!SHEET_ENDPOINT) {
    return null;
  }

  const url = new URL(SHEET_ENDPOINT);
  url.searchParams.set('entity', 'professionals');
  url.searchParams.set('_ts', String(Date.now()));
  return url.toString();
};

const readLocalProfessionals = (): ProfessionalRecord[] => {
  if (typeof window === 'undefined') {
    return cachedProfessionals;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const defaults = createDefaultProfessionals();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return createDefaultProfessionals();
    }

    return parsed.map((professional) => {
      const fallback = DEFAULT_PROFESSIONALS.find((item) => item.id === String(professional.id));
      return normalizeProfessional(
        {
          ...professional,
          id: String(professional.id || createId()),
        },
        fallback ? enrichProfessional(fallback) : undefined,
      );
    });
  } catch {
    return createDefaultProfessionals();
  }
};

const writeLocalProfessionals = (professionals: ProfessionalRecord[]) => {
  cachedProfessionals = professionals;

  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(professionals));
};

const emit = (professionals: ProfessionalRecord[]) => {
  cachedProfessionals = professionals;
  listeners.forEach((listener) => listener(professionals));
};

const upsertCachedProfessional = (professional: ProfessionalRecord, id?: string) => {
  const targetId = String(id || professional.id);

  return cachedProfessionals.some((item) => item.id === targetId)
    ? cachedProfessionals.map((item) => (item.id === targetId ? { ...item, ...professional, id: targetId } : item))
    : [...cachedProfessionals, { ...professional, id: targetId }];
};

const deleteCachedProfessional = (id: string) => {
  return cachedProfessionals.filter((professional) => professional.id !== id);
};

const readRemoteProfessionals = async (): Promise<ProfessionalRecord[]> => {
  if (!SHEET_ENDPOINT) {
    return readLocalProfessionals();
  }

  try {
    const url = buildProfessionalsUrl();
    if (!url) {
      return readLocalProfessionals();
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`No se pudieron leer los colaboradores (${response.status})`);
    }

    const payload = await response.json();
    const rawProfessionals = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.professionals)
        ? payload.professionals
        : [];

    const normalized = rawProfessionals.map((item) => normalizeProfessional({
      ...item,
      id: String(item.id || createId()),
    }));

    writeLocalProfessionals(normalized);
    return normalized;
  } catch (error) {
    console.warn('Leyendo colaboradores desde cache local porque falló Sheets.', error);
    if (hasRemoteSheet) {
      return cachedProfessionals.length ? cachedProfessionals : readLocalProfessionals();
    }

    return cachedProfessionals.length ? cachedProfessionals : readLocalProfessionals();
  }
};

const fetchRemoteProfessionalsStrict = async (): Promise<ProfessionalRecord[]> => {
  const url = buildProfessionalsUrl();
  if (!url) {
    throw new Error('No hay endpoint de Sheets configurado.');
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`No se pudieron leer los colaboradores (${response.status})`);
  }

  const payload = await response.json();
  const rawProfessionals = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.professionals)
      ? payload.professionals
      : [];

  return rawProfessionals.map((item) => normalizeProfessional({
    ...item,
    id: String(item.id || createId()),
  }));
};

const normalizeProfessionalsPayload = (payload: unknown): ProfessionalRecord[] | null => {
  const rawProfessionals = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { professionals?: unknown }).professionals)
      ? (payload as { professionals: unknown[] }).professionals
      : null;

  if (!rawProfessionals) {
    return null;
  }

  return rawProfessionals.map((item) => normalizeProfessional({
    ...(item as Partial<ProfessionalRecord>),
    id: String((item as { id?: string }).id || createId()),
  }));
};

const broadcast = async () => {
  const professionals = hasRemoteSheet ? await readRemoteProfessionals() : readLocalProfessionals();
  emit(professionals);
};

const ensureRemotePolling = () => {
  if (!hasRemoteSheet || remotePollHandle || typeof window === 'undefined') {
    return;
  }

  remotePollHandle = window.setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    void broadcast().catch((error) => {
      console.warn('No se pudo refrescar el equipo remotamente.', error);
    });
  }, REMOTE_POLL_INTERVAL_MS);

  if (!visibilityListenerAttached && typeof document !== 'undefined') {
    visibilityChangeHandler = () => {
      if (!document.hidden) {
        void broadcast().catch((error) => {
          console.warn('No se pudo refrescar el equipo al volver a la pestaña.', error);
        });
      }
    };

    document.addEventListener('visibilitychange', visibilityChangeHandler);
    visibilityListenerAttached = true;
  }
};

const stopRemotePolling = () => {
  if (remotePollHandle) {
    window.clearInterval(remotePollHandle);
    remotePollHandle = undefined;
  }

  if (visibilityChangeHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', visibilityChangeHandler);
    visibilityChangeHandler = undefined;
  }

  visibilityListenerAttached = false;
};

const persistLocalProfessional = async (professional: ProfessionalRecord, id?: string) => {
  const current = readLocalProfessionals();
  const now = new Date().toISOString();
  const normalized = normalizeProfessional({
    ...professional,
    id: id || professional.id,
  });

  const next = id
    ? current.map((item) => (item.id === id ? { ...item, ...normalized } : item))
    : [...current, normalized];

  const final: ProfessionalRecord[] = next.map((item) => ({
    ...item,
    id: String(item.id),
    status: item.status === 'En Pausa' ? 'En Pausa' : 'Activo',
    email: item.email || `${slugify(item.name)}@lab.com`,
    image: item.image || DEFAULT_IMAGE,
    hours: item.hours || 'Lun, Mie, Vie (08:00 - 14:00)',
    retention: formatRetentionValue(item.retention || '20%'),
    createdAt: (item as unknown as { createdAt?: string }).createdAt || now,
    updatedAt: now,
  }));

  writeLocalProfessionals(final);
  emit(final);
  await broadcast();
};

const deleteLocalProfessional = async (id: string) => {
  const next = readLocalProfessionals().filter((professional) => professional.id !== id);
  writeLocalProfessionals(next);
  emit(next);
  await broadcast();
};

const persistRemoteProfessional = async (professional: ProfessionalRecord, id?: string) => {
  const url = buildProfessionalsUrl();
  if (!url) {
    await persistLocalProfessional(professional, id);
    return;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
      Accept: 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      entity: 'professionals',
      action: id ? 'update' : 'create',
      id,
      professional,
    }),
  });

  if (!response.ok) {
    throw new Error(`No se pudo guardar el colaborador (${response.status})`);
  }

  const payload = await response.json();
  const remoteProfessionals = normalizeProfessionalsPayload(payload);

  if (remoteProfessionals) {
    writeLocalProfessionals(remoteProfessionals);
    emit(remoteProfessionals);
    return;
  }

  const nextProfessionals = upsertCachedProfessional(professional, id);
  writeLocalProfessionals(nextProfessionals);
  emit(nextProfessionals);

  const confirmedProfessionals = await fetchRemoteProfessionalsStrict();
  writeLocalProfessionals(confirmedProfessionals);
  emit(confirmedProfessionals);
};

const deleteRemoteProfessional = async (id: string) => {
  const url = buildProfessionalsUrl();
  if (!url) {
    await deleteLocalProfessional(id);
    return;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
      Accept: 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      entity: 'professionals',
      action: 'delete',
      id,
    }),
  });

  if (!response.ok) {
    throw new Error(`No se pudo eliminar el colaborador (${response.status})`);
  }

  const payload = await response.json();
  const remoteProfessionals = normalizeProfessionalsPayload(payload);

  if (remoteProfessionals) {
    writeLocalProfessionals(remoteProfessionals);
    emit(remoteProfessionals);
    return;
  }

  const nextProfessionals = deleteCachedProfessional(id);
  writeLocalProfessionals(nextProfessionals);
  emit(nextProfessionals);

  const confirmedProfessionals = await fetchRemoteProfessionalsStrict();
  writeLocalProfessionals(confirmedProfessionals);
  emit(confirmedProfessionals);
};

const resetRemoteProfessionals = async () => {
  const url = buildProfessionalsUrl();
  if (!url) {
    const defaults = createDefaultProfessionals();
    writeLocalProfessionals(defaults);
    emit(defaults);
    return defaults;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
      Accept: 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      entity: 'professionals',
      action: 'reset',
    }),
  });

  if (!response.ok) {
    throw new Error(`No se pudo restaurar la base (${response.status})`);
  }

  const payload = await response.json();
  const remoteProfessionals = normalizeProfessionalsPayload(payload);

  if (remoteProfessionals) {
    writeLocalProfessionals(remoteProfessionals);
    emit(remoteProfessionals);
    return remoteProfessionals;
  }

  const defaults = createDefaultProfessionals();
  writeLocalProfessionals(defaults);
  emit(defaults);

  const confirmedProfessionals = await fetchRemoteProfessionalsStrict();
  writeLocalProfessionals(confirmedProfessionals);
  emit(confirmedProfessionals);

  return confirmedProfessionals;
};

export const getProfessionalsSnapshot = () => {
  if (typeof window === 'undefined') {
    return cachedProfessionals;
  }

  cachedProfessionals = readLocalProfessionals();
  return cachedProfessionals;
};

export const refreshProfessionals = async () => {
  await broadcast();
};

export const forceRefreshProfessionals = async () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  cachedProfessionals = createDefaultProfessionals();
  await broadcast();
};

export const updateProfessional = async (id: string, patch: Partial<ProfessionalRecord>) => {
  const current = getProfessionalsSnapshot();
  const updated = current.find((professional) => professional.id === id);

  if (!updated) {
    return current;
  }

  const next = normalizeProfessional(
    {
      ...updated,
      ...patch,
      id: updated.id,
    },
    updated,
  );

  if (BACKEND_MODE === 'sheet' && SHEET_ENDPOINT) {
    await persistRemoteProfessional(next, id);
    return next;
  }

  await persistLocalProfessional(next, id);
  return next;
};

export const createProfessional = async (data: Partial<ProfessionalRecord>) => {
  const nextProfessional = normalizeProfessional({
    id: createId(),
    name: String(data.name || 'Sin nombre'),
    specialty: String(data.specialty || ''),
    color: String(data.color || 'bg-blue-500'),
    status: data.status === 'En Pausa' ? 'En Pausa' : 'Activo',
    email: String(data.email || ''),
    phone: String(data.phone || ''),
    hours: String(data.hours || 'Lun, Mie, Vie (08:00 - 14:00)'),
    retention: formatRetentionValue(data.retention || '20%'),
    image: String(data.image || DEFAULT_IMAGE),
  });

  if (BACKEND_MODE === 'sheet' && SHEET_ENDPOINT) {
    await persistRemoteProfessional(nextProfessional);
    return nextProfessional;
  }

  await persistLocalProfessional(nextProfessional);
  return nextProfessional;
};

export const deleteProfessional = async (id: string) => {
  if (BACKEND_MODE === 'sheet' && SHEET_ENDPOINT) {
    await deleteRemoteProfessional(id);
    return getProfessionalsSnapshot();
  }

  await deleteLocalProfessional(id);
  return getProfessionalsSnapshot();
};

export const resetProfessionals = async () => {
  if (BACKEND_MODE === 'sheet' && SHEET_ENDPOINT) {
    return resetRemoteProfessionals();
  }

  const defaults = createDefaultProfessionals();
  writeLocalProfessionals(defaults);
  emit(defaults);
  return defaults;
};

export const useProfessionals = () => {
  const [professionals, setProfessionals] = useState<ProfessionalRecord[]>(() => getProfessionalsSnapshot());

  useEffect(() => {
    setProfessionals(getProfessionalsSnapshot());

    const listener = (next: ProfessionalRecord[]) => setProfessionals(next);
    listeners.add(listener);
    ensureRemotePolling();

    void broadcast().catch((error) => {
      console.warn('No se pudo cargar el equipo inicial.', error);
    });

    return () => {
      listeners.delete(listener);

      if (!listeners.size) {
        stopRemotePolling();
      }
    };
  }, []);

  return [professionals, updateProfessional, resetProfessionals, createProfessional, deleteProfessional] as const;
};
