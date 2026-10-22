import { useSyncExternalStore } from 'react';
import { SHEETS_ENDPOINT, signOut as sessionSignOut, syncSessionFromAuth } from './session';
import type { AuthorizedUserRecord } from '../types';

export type UserRole = 'admin' | 'therapist';

export interface AuthUser {
  id: string;
  userId?: string;
  email: string;
  name: string;
  role: UserRole;
  professionalId?: string;
  specialty?: string;
  token?: string;
  sessionToken?: string;
}

// Equipo inicial de CREAR (sincronizado con crear_users en Google Sheets)
export const CREAR_TEAM: AuthUser[] = [
  // 4 Responsables / Administradoras
  { id: 'florencia', userId: 'user-florencia', email: 'florencia@crear.com', name: 'Florencia', role: 'admin', specialty: 'Coordinación General' },
  { id: 'janina', userId: 'user-janina', email: 'janina@crear.com', name: 'Janina', role: 'admin', specialty: 'Coordinación Terapéutica' },
  { id: 'responsable3', userId: 'user-admin3', email: 'admin3@crear.com', name: 'Responsable 3', role: 'admin', specialty: 'Administración' },
  { id: 'responsable4', userId: 'user-admin4', email: 'admin4@crear.com', name: 'Responsable 4', role: 'admin', specialty: 'Supervisión' },

  // Terapeutas del equipo interdisciplinario
  { id: 'ariadna', userId: 'user-ariadna', professionalId: 'ariadna', email: 'ariadna@crear.com', name: 'Ariadna', role: 'therapist', specialty: 'Psicología' },
  { id: 'ivana', userId: 'user-ivana', professionalId: 'ivana', email: 'ivana@crear.com', name: 'Ivana', role: 'therapist', specialty: 'Educación especial' },
  { id: 'dana', userId: 'user-dana', professionalId: 'dana', email: 'dana@crear.com', name: 'Dana', role: 'therapist', specialty: 'Psicopedagogía' },
  { id: 'romy', userId: 'user-romy', professionalId: 'romy', email: 'romy@crear.com', name: 'Romy', role: 'therapist', specialty: 'Psicomotricidad' },
  { id: 'barbie', userId: 'user-barbie', professionalId: 'barbie', email: 'barbie@crear.com', name: 'Barbie', role: 'therapist', specialty: 'Terapia ocupacional' },
  { id: 'vero', userId: 'user-vero', professionalId: 'vero', email: 'vero@crear.com', name: 'Vero', role: 'therapist', specialty: 'Fonoaudiología' },
];

export const DEFAULT_INITIAL_USERS: AuthorizedUserRecord[] = [
  { id: 'user-florencia', name: 'Florencia', email: 'florencia@crear.com', googleEmail: '', role: 'admin', professionalId: '', specialty: 'Coordinación General', active: true, createdAt: '2026-01-01' },
  { id: 'user-janina', name: 'Janina', email: 'janina@crear.com', googleEmail: '', role: 'admin', professionalId: '', specialty: 'Coordinación Terapéutica', active: true, createdAt: '2026-01-01' },
  { id: 'user-admin3', name: 'Responsable 3', email: 'admin3@crear.com', googleEmail: '', role: 'admin', professionalId: '', specialty: 'Administración', active: true, createdAt: '2026-01-01' },
  { id: 'user-admin4', name: 'Responsable 4', email: 'admin4@crear.com', googleEmail: '', role: 'admin', professionalId: '', specialty: 'Supervisión', active: true, createdAt: '2026-01-01' },
  { id: 'user-ariadna', name: 'Ariadna', email: 'ariadna@crear.com', googleEmail: '', role: 'professional', professionalId: 'ariadna', specialty: 'Psicología', active: true, createdAt: '2026-01-01' },
  { id: 'user-ivana', name: 'Ivana', email: 'ivana@crear.com', googleEmail: '', role: 'professional', professionalId: 'ivana', specialty: 'Educación especial', active: true, createdAt: '2026-01-01' },
  { id: 'user-dana', name: 'Dana', email: 'dana@crear.com', googleEmail: '', role: 'professional', professionalId: 'dana', specialty: 'Psicopedagogía', active: true, createdAt: '2026-01-01' },
  { id: 'user-romy', name: 'Romy', email: 'romy@crear.com', googleEmail: '', role: 'professional', professionalId: 'romy', specialty: 'Psicomotricidad', active: true, createdAt: '2026-01-01' },
  { id: 'user-barbie', name: 'Barbie', email: 'barbie@crear.com', googleEmail: '', role: 'professional', professionalId: 'barbie', specialty: 'Terapia ocupacional', active: true, createdAt: '2026-01-01' },
  { id: 'user-vero', name: 'Vero', email: 'vero@crear.com', googleEmail: '', role: 'professional', professionalId: 'vero', specialty: 'Fonoaudiología', active: true, createdAt: '2026-01-01' },
];

const AUTH_STORAGE_KEY = 'crear.session.user';
const LOCAL_USERS_CACHE_KEY = 'crear.users.cache';

let currentUser: AuthUser | null = (() => {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
})();

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export function useAuth(): AuthUser | null {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    () => currentUser,
    () => currentUser
  );
}

export function getCurrentUser(): AuthUser | null {
  return currentUser;
}

function setSessionUser(user: AuthUser) {
  currentUser = user;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  syncSessionFromAuth();
  notify();
}

/**
 * Opción 1: Ingreso con Usuario/Correo (@crear.com o Gmail) y Contraseña validada en Google Sheets
 */
export async function signInWithCredentials(identifierInput: string, passwordInput: string): Promise<AuthUser> {
  const rawId = identifierInput.trim().toLowerCase();
  const password = passwordInput.trim();

  if (!rawId || !password) {
    throw new Error('Ingresá tu usuario/correo y tu contraseña.');
  }

  const normalizedEmail = rawId.includes('@') ? rawId : `${rawId}@crear.com`;

  const response = await fetch(SHEETS_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'loginPassword',
      email: normalizedEmail,
      password,
    }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => null);

  if (data && data.ok && data.user) {
    const user: AuthUser = {
      id: data.user.professionalId || data.user.id,
      userId: data.user.userId || data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role === 'admin' ? 'admin' : 'therapist',
      professionalId: data.user.professionalId || '',
      specialty: data.user.specialty || (data.user.role === 'admin' ? 'Responsable CREAR' : 'Terapeuta'),
      sessionToken: data.sessionToken,
    };
    setSessionUser(user);
    return user;
  }

  throw new Error(
    data?.error ||
      'No se pudo verificar la cuenta en el servidor. Ingresá con tu cuenta de Google o solicitá tu clave individual a las responsables.'
  );
}

/**
 * Opción 2: Ingreso con Google Identity Services (validación de token en el servidor)
 */
export async function signInWithGoogle(credential: string): Promise<AuthUser> {
  const response = await fetch(SHEETS_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'loginGoogle',
      credential,
    }),
    cache: 'no-store',
  });

  const data = await response.json();

  if (data && data.ok && data.user) {
    const user: AuthUser = {
      id: data.user.professionalId || data.user.id,
      userId: data.user.userId || data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role === 'admin' ? 'admin' : 'therapist',
      professionalId: data.user.professionalId || '',
      specialty: data.user.specialty || (data.user.role === 'admin' ? 'Responsable CREAR' : 'Terapeuta'),
      token: credential,
      sessionToken: data.sessionToken,
    };
    setSessionUser(user);
    return user;
  }

  // Fallback a whoami si el script en la nube tiene la versión anterior
  const whoamiRes = await fetch(SHEETS_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'whoami',
      credential,
    }),
    cache: 'no-store',
  });

  const whoamiData = await whoamiRes.json();
  if (!whoamiData || !whoamiData.ok || !whoamiData.actor) {
    throw new Error(data?.error || whoamiData?.error || 'Tu cuenta de Google no está autorizada en CREAR.');
  }

  const actor = whoamiData.actor;
  const matchedTeam = CREAR_TEAM.find((m) => m.email.toLowerCase() === String(actor.email).toLowerCase());

  const user: AuthUser = {
    id: actor.professionalId || matchedTeam?.id || String(actor.email).split('@')[0],
    email: actor.email,
    name: actor.name || matchedTeam?.name || String(actor.email).split('@')[0],
    role: actor.role === 'admin' ? 'admin' : 'therapist',
    professionalId: actor.professionalId || matchedTeam?.professionalId || '',
    specialty: matchedTeam?.specialty || (actor.role === 'admin' ? 'Responsable CREAR' : 'Terapeuta'),
    token: credential,
  };

  setSessionUser(user);
  return user;
}

/**
 * Cierre de sesión seguro
 */
export async function logoutUser(): Promise<void> {
  sessionSignOut();
  currentUser = null;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  notify();
}
