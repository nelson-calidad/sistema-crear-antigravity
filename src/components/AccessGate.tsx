import { useEffect, useRef, useState, type ReactNode } from 'react';
import { isDemo } from '../lib/crearStore';
import { signIn, useSession } from '../lib/session';
import logo from '../assets/logo-crear.png';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
export function AccessGate({ admin, professional }: { admin: ReactNode; professional: ReactNode }) {
  const session = useSession();
  const button = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (isDemo || !clientId || session) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => { setError(''); void signIn(credential).catch(value => setError(value instanceof Error ? value.message : 'No se pudo iniciar sesión.')); } });
      if (button.current) window.google?.accounts.id.renderButton(button.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: 'es' });
      setReady(true);
    };
    script.onerror = () => setError('No se pudo cargar el acceso con Google.');
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [session]);
  if (isDemo) return admin;
  if (session) return session.actor.role === 'admin' ? admin : professional;
  return <main className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-[#F9F8F5] p-3 sm:p-4"><section className="w-full min-w-0 max-w-sm overflow-hidden rounded-2xl border border-[#E5EAE5] bg-white p-5 text-center shadow-sm sm:p-7"><img src={logo} alt="CREAR" className="mx-auto h-20 w-auto object-contain" /><h1 className="mt-5 text-xl font-semibold text-[#34433F]">Acceso a CREAR</h1><p className="mt-2 text-sm text-[#6D7C76]">Ingresá con una cuenta habilitada para consultar los datos compartidos.</p>{clientId ? <div ref={button} className="mt-6 flex min-h-11 justify-center" /> : <p className="mt-5 rounded-xl bg-[#F6E9DB] p-3 text-sm">Falta configurar el acceso con Google.</p>}{!ready && clientId && !error && <p className="mt-3 text-sm text-[#6D7C76]">Cargando acceso...</p>}{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}</section></main>;
}
