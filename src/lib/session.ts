import { useSyncExternalStore } from 'react';

export type Actor = { email: string; role: 'admin' | 'professional'; professionalId: string; name?: string };
type Session = { token: string; actor: Actor } | null;

const DEFAULT_SHEETS_URL =
  'https://script.google.com/macros/s/AKfycbx5kIMawhlVzjOKGh_s2vNAyogd5x8QwtqoTE9fjBUFN_pin5r23mVQq993Xt4y01ZU/exec';

export const SHEETS_ENDPOINT =
  (import.meta.env.VITE_SHEETS_ENDPOINT_URL as string | undefined) || DEFAULT_SHEETS_URL;

const SESSION_STORAGE_KEY = 'crear.session.user';

function readStoredSession(): Session {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.email) return null;
    return {
      token: parsed.sessionToken || parsed.token || 'active-session',
      actor: {
        email: parsed.email,
        name: parsed.name,
        role: parsed.role === 'admin' ? 'admin' : 'professional',
        professionalId: parsed.professionalId || parsed.id || '',
      },
    };
  } catch {
    return null;
  }
}

let session: Session = readStoredSession();
const listeners = new Set<() => void>();
const publish = () => listeners.forEach((listener) => listener());

export function syncSessionFromAuth() {
  session = readStoredSession();
  publish();
}

export function getSession(): Session {
  if (!session) {
    session = readStoredSession();
  }
  return session;
}

export function useSession() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSession,
    getSession
  );
}

export function signOut() {
  session = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    window.google?.accounts.id.disableAutoSelect();
  }
  publish();
}

export async function apiRequest<T>(body: Record<string, unknown>, customToken?: string): Promise<T> {
  const current = getSession();
  const sessionToken = customToken || current?.token || '';
  const actor = current?.actor || {
    email: 'karina@crear.com',
    role: 'admin' as const,
    professionalId: '',
  };

  const payload: Record<string, unknown> = {
    ...body,
    actor,
  };

  if (sessionToken && sessionToken !== 'active-session') {
    if (sessionToken.split('.').length === 3) {
      payload.credential = sessionToken;
    } else {
      payload.sessionToken = sessionToken;
    }
  }

  const response = await fetch(SHEETS_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const result = await response.json().catch(() => ({
    ok: false,
    error: 'El servidor de Google Sheets no devolvió una respuesta válida.',
  }));

  if (!response.ok || result.ok === false) {
    throw new Error(result.error || `Error del servidor (${response.status}).`);
  }

  return result as T;
}

export async function signIn(token: string) {
  const result = await apiRequest<{ ok: true; actor: Actor }>({ action: 'whoami' }, token);
  session = { token, actor: result.actor };
  publish();
  return result.actor;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string>) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}
