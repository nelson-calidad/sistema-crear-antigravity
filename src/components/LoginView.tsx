import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, ArrowRight, Eye, EyeOff, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import logo from '../assets/logo-crear.png';
import { signInWithCredentials, signInWithGoogle } from '../lib/crearAuth';
import { clearSessionExpiredNotice, getSessionExpiredNotice } from '../lib/session';

const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function LoginView() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showInstitutionalForm, setShowInstitutionalForm] = useState(() => !envClientId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expiredNotice, setExpiredNotice] = useState(() => getSessionExpiredNotice());
  const [googleReady, setGoogleReady] = useState(false);

  const googleButtonRef = useRef<HTMLDivElement>(null);

  const resolvedClientId =
    envClientId ||
    (typeof window !== 'undefined' ? localStorage.getItem('crear.google.clientId') || '' : '');

  useEffect(() => {
    if (!resolvedClientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: resolvedClientId,
        callback: ({ credential }) => {
          setError('');
          clearSessionExpiredNotice();
          setExpiredNotice('');
          setLoading(true);
          void signInWithGoogle(credential).catch((err) => {
            setError(
              err instanceof Error
                ? err.message
                : 'Tu cuenta de Google no está autorizada. Solicitá acceso a las responsables de CREAR.'
            );
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
      setGoogleReady(true);
    };

    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [resolvedClientId]);

  const handleGooglePrimaryClick = () => {
    setError('');
    if (resolvedClientId && googleReady) {
      const btn = googleButtonRef.current?.querySelector('div[role="button"]') as HTMLElement | null;
      if (btn) {
        btn.click();
        return;
      }
    }
    setShowInstitutionalForm(true);
    setError(
      'Ingresá tu correo de Google o cuenta institucional autorizada por CREAR para validar tu acceso.'
    );
  };

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Completá tu correo autorizado y tu contraseña individual.');
      return;
    }

    setLoading(true);
    setError('');
    clearSessionExpiredNotice();
    setExpiredNotice('');
    try {
      await signInWithCredentials(identifier, password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Esta cuenta no está autorizada en CREAR. Solicitá habilitación a las responsables.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-[#F9F8F5] px-4 py-6 text-[#34433F]">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-[#E5EAE5] bg-white p-6 shadow-sm sm:p-9">
          {/* Header Institucional con el logo original de CREAR */}
          <div className="flex flex-col items-center text-center">
            <img
              src={logo}
              alt="CREAR — Espacio Terapéutico Interdisciplinario"
              className="h-20 w-auto object-contain mb-4"
            />
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#34433F]">
              CREAR — Espacio Terapéutico Interdisciplinario
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[#6D7C76]">
              Ingresá con tu cuenta autorizada. El sistema abrirá automáticamente tu espacio de trabajo.
            </p>
          </div>

          {expiredNotice && (
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>{expiredNotice}</span>
            </div>
          )}

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Botón Principal: Ingresar con Google */}
          <div className="mt-6 space-y-3">
            {resolvedClientId ? (
              <div className="flex flex-col items-center gap-2">
                <div ref={googleButtonRef} className="min-h-11 flex justify-center w-full" />
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGooglePrimaryClick}
                disabled={loading}
                className="flex w-full min-h-12 items-center justify-center gap-3 rounded-2xl border border-[#D5DDD7] bg-white px-5 py-3 text-sm font-bold text-[#34433F] shadow-xs transition hover:bg-[#F4F7F5] active:scale-[0.99]"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Ingresar con Google</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowInstitutionalForm((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-[#5D6D67] hover:text-[#34433F]"
            >
              <span>
                {showInstitutionalForm
                  ? 'Ocultar acceso con correo y clave individual'
                  : 'Ingresar con correo autorizado y contraseña individual'}
              </span>
              {showInstitutionalForm ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Acceso con correo autorizado (@gmail.com o @crear.com) y contraseña individual */}
          {showInstitutionalForm && (
            <form onSubmit={handleLoginSubmit} className="mt-4 space-y-4 border-t border-[#EAEFEA] pt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D]">
                  Correo autorizado
                </label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-[#889892]" />
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="tu-correo@gmail.com o @crear.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] py-3 pl-10 pr-4 text-sm text-[#34433F] transition focus:border-[#46766B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#46766B]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D]">
                  Contraseña individual
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
                  <span>Verificando identidad...</span>
                ) : (
                  <>
                    <span>Ingresar</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-[11px] leading-relaxed text-[#7A8882]">
            Acceso exclusivo para profesionales y responsables autorizadas por CREAR. Si tu cuenta aún no está habilitada, solicitalo a la coordinación.
          </p>
        </div>
      </div>
    </main>
  );
}
