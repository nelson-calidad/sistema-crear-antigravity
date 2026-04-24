import * as React from 'react';
import { type ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

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

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">CREAR</p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">La app no pudo iniciar</h1>
            <p className="mt-3 text-sm text-slate-600">
              Hubo un error al cargar la interfaz. Probá recargar la página y, si sigue igual, avisame y lo vemos con consola.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function escapeHtml_(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderFatalScreen(title: string, message: string, details?: string) {
  const root = document.getElementById('root');
  if (!root) {
    return;
  }

  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;padding:24px;font-family:Inter,system-ui,sans-serif;color:#0f172a;">
      <div style="max-width:640px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:24px;box-shadow:0 18px 40px rgba(15,23,42,.10),0 2px 8px rgba(15,23,42,.06);">
        <div style="font-size:11px;font-weight:900;letter-spacing:.24em;text-transform:uppercase;color:#94a3b8;">CREAR</div>
        <h1 style="margin:8px 0 0;font-size:28px;line-height:1.1;font-weight:900;">${escapeHtml_(title)}</h1>
        <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#475569;">${escapeHtml_(message)}</p>
        ${
          details
            ? `<pre style="margin:16px 0 0;white-space:pre-wrap;word-break:break-word;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px;font-size:12px;line-height:1.5;color:#334155;">${escapeHtml_(details)}</pre>`
            : ''
        }
      </div>
    </div>
  `;
}

const root = document.getElementById('root');

if (!root) {
  throw new Error('No se encontró el elemento root.');
}

const appRoot = createRoot(root);

window.addEventListener('error', (event) => {
  renderFatalScreen(
    'La app se detuvo',
    'Se produjo un error inesperado al ejecutar la interfaz.',
    String(event.error || event.message || 'Error desconocido'),
  );
});

window.addEventListener('unhandledrejection', (event) => {
  renderFatalScreen(
    'La app se detuvo',
    'Se produjo una promesa rechazada sin manejar.',
    String(event.reason || 'Error desconocido'),
  );
});

async function bootstrap() {
  try {
    const [{ default: App }] = await Promise.all([import('./App.tsx')]);

    appRoot.render(
      <StrictMode>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </StrictMode>,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    const stack = error instanceof Error ? error.stack : undefined;
    renderFatalScreen('La app no pudo iniciar', 'Hubo un problema al cargar la aplicación.', stack || message);
  }
}

void bootstrap();
