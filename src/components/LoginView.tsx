import React, { useState, useEffect, useRef } from 'react';
import { Mail, KeyRound, ArrowRight, ArrowLeft, Sparkles, CheckCircle2, ShieldCheck, UserCheck } from 'lucide-react';
import logo from '../assets/logo-crear.png';
import {
  requestAccessOtp,
  verifyAccessOtp,
  quickLoginAs,
  signInWithGoogle,
  CREAR_TEAM,
  RequestOtpResult,
} from '../lib/crearAuth';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function LoginView() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpInfo, setOtpInfo] = useState<RequestOtpResult | null>(null);

  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Initialize Google Sign-In script when clientId is provided
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

    script.onerror = () => {
      console.warn('No se pudo cargar el SDK de Google Sign-In.');
    };

    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  async function handleSendCode(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError('Por favor, ingresá tu correo electrónico.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await requestAccessOtp(email);
      setOtpInfo(res);
      setStep('code');
      if (res.devCode) {
        setCode(res.devCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el código.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!code.trim()) {
      setError('Ingresá el código de 6 dígitos.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await verifyAccessOtp(email, code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código incorrecto.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#F9F8F5] p-4 text-[#34433F] antialiased">
      <div className="w-full max-w-md">
        {/* Card Header & Brand */}
        <div className="overflow-hidden rounded-3xl border border-[#E5EAE5] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center text-center">
            <img src={logo} alt="CREAR" className="h-16 w-auto object-contain sm:h-20" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#34433F]">
              CREAR
            </h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#46766B]">
              Espacio Terapéutico Interdisciplinario
            </p>
            <p className="mt-1 text-sm text-[#6D7C76]">
              Gestión de Turnos y Consultorios
            </p>
          </div>

          {/* Connection Status Badge */}
          <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#F1F3EF] px-3 py-1.5 text-xs text-[#52635D]">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>
              Almacenamiento exclusivo en Google Sheets activo
            </span>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
              {error}
            </div>
          )}

          {/* Google Sign-In Option (When Client ID is present) */}
          {clientId && (
            <div className="mt-6 flex flex-col items-center justify-center border-b border-[#EAEFEA] pb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[#52635D] mb-3">
                Acceso con cuenta de Google
              </p>
              <div ref={googleButtonRef} className="flex min-h-11 justify-center" />
              <div className="relative mt-5 w-full text-center">
                <span className="bg-white px-3 text-xs text-[#889892]">O mediante código de acceso</span>
                <div className="absolute inset-0 top-1/2 -z-10 border-t border-[#EAEFEA]" />
              </div>
            </div>
          )}

          {/* Step 1: Request OTP by Email */}
          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D]">
                  Correo electrónico
                </label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-[#889892]" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="ejemplo@crear.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] py-3 pl-11 pr-4 text-sm font-medium text-[#34433F] placeholder-[#99A8A2] transition focus:border-[#46766B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#46766B]/20"
                  />
                </div>
                <p className="mt-1.5 text-xs text-[#7C8D86]">
                  Ingresá tu correo para recibir un código temporal de acceso.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#46766B] py-3 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3B645B] active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <span>Verificando...</span>
                ) : (
                  <>
                    <span>Continuar con mi correo</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Step 2: Enter 6-digit OTP */
            <form onSubmit={handleVerifyCode} className="mt-6 space-y-4">
              {otpInfo?.devCode && (
                <div className="rounded-2xl border border-[#CCE3D8] bg-[#EEF7F2] p-3.5 text-sm text-[#275347]">
                  <div className="flex items-center gap-2 font-bold">
                    <Sparkles className="h-4 w-4 text-[#46766B]" />
                    <span>Código temporal:</span>
                  </div>
                  <div className="mt-1 text-2xl font-mono font-black tracking-widest text-[#1D3E35]">
                    {otpInfo.devCode}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D]">
                  Código de acceso de 6 dígitos
                </label>
                <div className="relative mt-1.5">
                  <KeyRound className="absolute left-3.5 top-3.5 h-5 w-5 text-[#889892]" />
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] py-3 pl-11 pr-4 font-mono text-center text-lg font-bold tracking-widest text-[#34433F] transition focus:border-[#46766B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#46766B]/20"
                  />
                </div>
                <p className="mt-1.5 text-xs text-[#7C8D86]">
                  Enviado a <strong className="text-[#34433F]">{email}</strong>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setError('');
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#D5DDD7] bg-white px-4 py-3 text-sm font-semibold text-[#52635D] hover:bg-[#F9F8F5]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Volver</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex flex-1 min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#46766B] py-3 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3B645B] active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? <span>Verificando...</span> : <span>Ingresar a CREAR</span>}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Quick Testing Profiles (Convenience for testing) */}
        <div className="mt-6 rounded-3xl border border-[#E5EAE5] bg-white/70 p-5 backdrop-blur-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-[#6D7C76]">
            Acceso rápido para evaluación inmediata:
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => quickLoginAs(CREAR_TEAM.find((u) => u.id === 'ariadna')!)}
              className="flex items-center gap-2.5 rounded-2xl border border-[#DDEAE2] bg-[#F4F9F6] p-3 text-left transition hover:border-[#46766B] hover:bg-[#E8F3EE]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 font-bold text-xs text-white">
                AR
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#34433F]">Ariadna</p>
                <p className="truncate text-[10px] text-[#6D7C76]">Terapeuta (Psicología)</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => quickLoginAs(CREAR_TEAM.find((u) => u.id === 'karina')!)}
              className="flex items-center gap-2.5 rounded-2xl border border-[#F6E9DB] bg-[#FDF9F5] p-3 text-left transition hover:border-amber-400 hover:bg-[#F9EFE4]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 font-bold text-xs text-white">
                KA
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#34433F]">Karina</p>
                <p className="truncate text-[10px] text-[#6D7C76]">Responsable CREAR</p>
              </div>
            </button>
          </div>
          <p className="mt-2.5 text-center text-[11px] text-[#889892]">
            Ingreso con 1 clic para probar los roles de terapeuta y responsable.
          </p>
        </div>
      </div>
    </main>
  );
}
