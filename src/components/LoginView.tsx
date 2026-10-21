import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/logo-crear.png';
import { signInWithCredentials, signInWithGoogle } from '../lib/crearAuth';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function LoginView() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          setError('');
          setLoading(true);
          void signInWithGoogle(credential).catch((err) => {
            setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google.');
            setLoading(false);
          });
        },
      });

      if (googleButtonRef.current) {
        window.google?.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          locale: 'es',
        });
      }
    };

    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Completá tu usuario y contraseña.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await signInWithCredentials(identifier, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo validar el acceso.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-[#F9F8F5] px-4 py-8 text-[#34433F]">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-[#E5EAE5] bg-white p-7 shadow-sm sm:p-9">
          {/* Header Institucional */}
          <div className="flex flex-col items-center text-center">
            <img
              src={logo}
              alt="CREAR — Espacio Terapéutico Interdisciplinario"
              className="h-20 w-auto object-contain mb-4"
            />
            <h1 className="text-xl font-bold tracking-tight text-[#34433F]">
              CREAR — Espacio Terapéutico Interdisciplinario
            </h1>
            <p className="mt-1.5 text-sm text-[#6D7C76]">
              Accedé a tu espacio de trabajo.
            </p>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
              {error}
            </div>
          )}

          {/* Opción 1: Google Sign-In si está configurado el Client ID */}
          {clientId && (
            <div className="mt-6 flex flex-col items-center">
              <div ref={googleButtonRef} className="min-h-11 flex justify-center" />
              <div className="my-5 flex w-full items-center gap-3">
                <div className="h-px flex-1 bg-[#E5EAE5]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#889892]">
                  o con tu cuenta institucional
                </span>
                <div className="h-px flex-1 bg-[#E5EAE5]" />
              </div>
            </div>
          )}

          {/* Opción 2: Cuenta @crear.com / Gmail + Contraseña */}
          <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D]">
                Usuario o Correo
              </label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-[#889892]" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="nombre@crear.com o tu Gmail"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] py-3 pl-10 pr-4 text-sm text-[#34433F] transition focus:border-[#46766B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#46766B]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D]">
                Contraseña
              </label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-[#889892]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] py-3 pl-10 pr-11 text-sm text-[#34433F] transition focus:border-[#46766B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#46766B]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-3 p-0.5 text-[#889892] hover:text-[#34433F]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#46766B] py-3 px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#3B645B] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <span>Ingresando...</span>
              ) : (
                <>
                  <span>Ingresar</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
