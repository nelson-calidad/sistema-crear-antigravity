import * as React from 'react';
import { type ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const PRELOAD_RETRY_KEY = 'crear-preload-retry';

class AppErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean }> {
  declare props: { children: ReactNode };
  state: { hasError: boolean };

  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('No se pudo renderizar CREAR.', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">CREAR</p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">La app no pudo iniciar</h1>
            <p className="mt-3 text-sm text-slate-600">
              Hubo un error al cargar la interfaz. Actualizá para volver a intentar con la versión más reciente.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
            >
              Actualizar aplicación
            </button>
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