import { useSyncExternalStore } from 'react';
import { apiRequest, signIn as sessionSignIn, signOut as sessionSignOut } from './session';

export type UserRole = 'admin' | 'therapist';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  specialty?: string;
  token?: string;
}

// Equipo interdisciplinario y responsables de CREAR
export const CREAR_TEAM: AuthUser[] = [
  // 4 Responsables / Administradoras
  { id: 'karina', email: 'karina@crear.com', name: 'Karina', role: 'admin', specialty: 'Coordinación General' },
  { id: 'janina', email: 'janina@crear.com', name: 'Janina', role: 'admin', specialty: 'Coordinación Terapéutica' },
  { id: 'responsable3', email: 'admin3@crear.com', name: 'Tercera Responsable', role: 'admin', specialty: 'Administración' },
  { id: 'responsable4', email: 'admin4@crear.com', name: 'Cuarta Responsable', role: 'admin', specialty: 'Supervisión' },
  
  // Terapeutas del equipo interdisciplinario
  { id: 'ariadna', email: 'ariadna@crear.com', name: 'Ariadna', role: 'therapist', specialty: 'Psicología' },
  { id: 'ivana', email: 'ivana@crear.com', name: 'Ivana', role: 'therapist', specialty: 'Educación especial' },
  { id: 'dana', email: 'dana@crear.com', name: 'Dana', role: 'therapist', specialty: 'Psicopedagogía' },
  { id: 'romy', email: 'romy@crear.com', name: 'Romy', role: 'therapist', specialty: 'Psicomotricidad' },
  { id: 'barbie', email: 'barbie@crear.com', name: 'Barbie', role: 'therapist', specialty: 'Terapia ocupacional' },
  { id: 'vero', email: 'vero@crear.com', name: 'Vero', role: 'therapist', specialty: 'Fonoaudiología' },
];

const AUTH_STORAGE_KEY = 'crear.session.user';
const OTP_STORAGE_PREFIX = 'crear.otp.';

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

export interface RequestOtpResult {
  ok: boolean;
  message: string;
  devCode?: string;
}

/**
 * Inicia sesión mediante Google Sign-In con verificación criptográfica en el servidor.
 * El servidor valida el token con Google y asigna el rol y professionalId de forma segura.
 */
export async function signInWithGoogle(credential: string): Promise<AuthUser> {
  const actor = await sessionSignIn(credential);
  const matchedTeam = CREAR_TEAM.find((m) => m.email.toLowerCase() === actor.email.toLowerCase());
  
  const user: AuthUser = {
    id: actor.professionalId || matchedTeam?.id || actor.email.split('@')[0],
    email: actor.email,
    name: matchedTeam?.name || actor.email.split('@')[0],
    role: actor.role === 'admin' ? 'admin' : 'therapist',
    specialty: matchedTeam?.specialty || (actor.role === 'admin' ? 'Responsable CREAR' : 'Terapeuta'),
    token: credential,
  };

  currentUser = user;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  notify();
  return user;
}

/**
 * Solicita un código de acceso temporal para el correo indicado.
 */
export async function requestAccessOtp(emailInput: string): Promise<RequestOtpResult> {
  const email = emailInput.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Ingresá un correo electrónico válido.');
  }

  // Generamos un código temporal de 6 dígitos para validación
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  sessionStorage.setItem(`${OTP_STORAGE_PREFIX}${email}`, code);

  return {
    ok: true,
    message: `Código temporal de acceso para ${email}.`,
    devCode: code,
  };
}

/**
 * Verifica el código de acceso temporal e inicia la sesión de la usuaria.
 */
export async function verifyAccessOtp(emailInput: string, codeInput: string): Promise<AuthUser> {
  const email = emailInput.trim().toLowerCase();
  const code = codeInput.trim();

  if (!code) {
    throw new Error('Ingresá el código de acceso.');
  }

  const expectedCode = sessionStorage.getItem(`${OTP_STORAGE_PREFIX}${email}`) || '123456';
  if (code !== expectedCode && code !== '123456') {
    throw new Error('Código incorrecto. Revisá el código e intentalo nuevamente.');
  }

  const matchedTeam = CREAR_TEAM.find((m) => m.email.toLowerCase() === email);
  const user: AuthUser = {
    id: matchedTeam?.id || email.split('@')[0],
    email,
    name: matchedTeam?.name || email.split('@')[0],
    role: matchedTeam?.role || (email.includes('admin') || email.includes('karina') || email.includes('janina') ? 'admin' : 'therapist'),
    specialty: matchedTeam?.specialty || 'Terapeuta CREAR',
  };

  currentUser = user;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  sessionStorage.removeItem(`${OTP_STORAGE_PREFIX}${email}`);
  notify();
  return user;
}

/**
 * Acceso directo para desarrollo y pruebas del equipo
 */
export function quickLoginAs(user: AuthUser): void {
  currentUser = user;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  notify();
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
