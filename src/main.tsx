import * as React from 'react';
import { type ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const PRELOAD_RETRY_KEY = 'crear-preload-retry';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
}

class AppErrorBoundary extends React.Component<{ children: ReactNode }, ErrorBoundaryState> {
  declare props: { children: ReactNode };
  state: ErrorBoundaryState;

  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('No se pudo renderizar CREAR.', error, errorInfo);
  }

  handleResetAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = window.location.origin + window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Error inesperado al cargar la interfaz.';
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6 text-[#34433F]">
          <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-lg space-y-4">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">CREAR</p>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">La app no pudo iniciar</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Hubo un inconveniente al cargar los datos en pantalla. Podés actualizar o restablecer los datos guardados en este navegador.
            </p>

            {this.state.error && (
              <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-xs text-rose-800">
                <p className="font-bold">Detalle del error:</p>
                <p className="mt-1 font-mono break-all opacity-90">{errorMessage}</p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full rounded-2xl bg-[#46766B] py-3 px-4 text-xs font-bold text-white hover:bg-[#3B645B] transition"
              >
                Actualizar aplicación
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="w-full rounded-2xl border border-[#D5DDD7] bg-white py-2.5 px-4 text-xs font-semibold text-[#52635D] hover:bg-[#FAF8F5] transition"
              >
                Limpiar datos locales y restablecer
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = document.getElementById('root');

if (!root) {
  throw new Error('No se encontró el elemento root.');
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();

  try {
    if (window.sessionStorage.getItem(PRELOAD_RETRY_KEY)) {
      return;
    }
    window.sessionStorage.setItem(PRELOAD_RETRY_KEY, '1');
  } catch {
    // If storage is unavailable, a regular reload is still the best recovery.
  }

  window.location.reload();
});

const appRoot = createRoot(root);

appRoot.render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

window.setTimeout(() => {
  try {
    window.sessionStorage.removeItem(PRELOAD_RETRY_KEY);
  } catch {
    // Session storage is optional.
  }
}, 10000);