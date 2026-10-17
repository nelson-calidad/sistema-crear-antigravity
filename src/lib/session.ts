import { useSyncExternalStore } from 'react';

export type Actor = { email: string; role: 'admin' | 'professional'; professionalId: string };
type Session = { token: string; actor: Actor } | null;
let session: Session = null;
const listeners = new Set<() => void>();
const publish = () => listeners.forEach(listener => listener());

export function getSession() { return session; }
export function useSession() { return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getSession, getSession); }
export function signOut() { session = null; publish(); window.google?.accounts.id.disableAutoSelect(); }

export async function apiRequest<T>(body: Record<string, unknown>, token = session?.token): Promise<T> {
  if (!token) throw new Error('Iniciá sesión para consultar datos compartidos.');
  const response = await fetch('/api/crear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    cache: 'no-store',
    credentials: 'same-origin',
  });
  const result = await response.json().catch(() => ({ ok: false, error: 'El servidor no devolvió una respuesta válida.' }));
  if (!response.ok || !result.ok) throw new Error(result.error || `Error del servidor (${response.status}).`);
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
    google?: { accounts: { id: { initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void; renderButton: (parent: HTMLElement, options: Record<string, string>) => void; disableAutoSelect: () => void } } };
  }
}
