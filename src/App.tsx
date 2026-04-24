/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Bell, Search, User, X, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReservationModal } from './components/ReservationModal';
import { deleteAppointment, getBackendLabel, getSessionUser, saveAppointment, subscribeToAppointments } from './lib/appointmentsStore';
import logoCrear from './assets/logo-crear.png';

const Dashboard = lazy(() => import('./components/Dashboard').then((module) => ({ default: module.Dashboard })));
const ProfessionalsGrid = lazy(() => import('./components/ProfessionalsGrid').then((module) => ({ default: module.ProfessionalsGrid })));
const Agenda = lazy(() => import('./components/Agenda').then((module) => ({ default: module.Agenda })));
const Finance = lazy(() => import('./components/Finance').then((module) => ({ default: module.Finance })));
const Settings = lazy(() => import('./components/Settings').then((module) => ({ default: module.Settings })));

type ToastTone = 'success' | 'error' | 'info';

type ToastItem = {
  id: string;
  tone: ToastTone;
  title: string;
  message: string;
};

const VALID_TABS = new Set(['dashboard', 'professionals', 'agenda', 'finance', 'settings']);
const TAB_QUERY_KEY = 'tab';

const getTabFromLocation = () => {
  if (typeof window === 'undefined') {
    return 'dashboard';
  }

  const tab = new URL(window.location.href).searchParams.get(TAB_QUERY_KEY);
  return tab && VALID_TABS.has(tab) ? tab : 'dashboard';
};

const buildTabUrl = (tab: string) => {
  const url = new URL(window.location.href);
  if (tab === 'dashboard') {
    url.searchParams.delete(TAB_QUERY_KEY);
  } else {
    url.searchParams.set(TAB_QUERY_KEY, tab);
  }

  return `${url.pathname}${url.search}${url.hash}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState(() => getTabFromLocation());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [user] = useState(() => getSessionUser());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [agendaFocusDate, setAgendaFocusDate] = useState<string | null>(null);
  const [modalAction, setModalAction] = useState<'save' | 'delete' | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastTimers = useRef<number[]>([]);
  const syncErrorShown = useRef(false);

  // Theme logic
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (window.localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(current => current === 'light' ? 'dark' : 'light');
  };

  const navigateToTab = (tab: string, options?: { replace?: boolean }) => {
    if (!VALID_TABS.has(tab) || tab === activeTab) {
      setActiveTab(tab);
      return;
    }

    const nextUrl = buildTabUrl(tab);
    const state = { tab };
    if (options?.replace) {
      window.history.replaceState(state, '', nextUrl);
    } else {
      window.history.pushState(state, '', nextUrl);
    }

    setActiveTab(tab);
  };

  const mobileTabLabel = (() => {
    switch (activeTab) {
      case 'dashboard': return 'Inicio';
      case 'professionals': return 'Profesionales';
      case 'agenda': return 'Agenda';
      case 'finance': return 'Finanzas';
      case 'settings': return 'Configuración';
      default: return activeTab;
    }
  })();

  const pushToast = (tone: ToastTone, title: string, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, tone, title, message }]);
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3200);
    toastTimers.current.push(timer);
  };

  const removeToast = (id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  };

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getTabFromLocation());
    };

    window.addEventListener('popstate', handlePopState);

    const unsubscribeApps = subscribeToAppointments(
      (apps) => {
        syncErrorShown.current = false;
        setAppointments(apps);
      },
      (error) => {
        console.error('Sync error with Sheets', error);
        if (syncErrorShown.current) return;
        syncErrorShown.current = true;
        pushToast('error', 'No se pudo sincronizar', 'Error al leer Sheets.');
      },
    );

    return () => {
      window.removeEventListener('popstate', handlePopState);
      unsubscribeApps();
      toastTimers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState<{
    room?: string;
    pro?: string;
    appointment?: any;
    date?: string;
    startTime?: string;
  }>({});

  const handleOpenModal = (room?: string, pro?: string, app?: any, options?: { date?: string; startTime?: string }) => {
    setModalContext({ room, pro, appointment: app, date: options?.date, startTime: options?.startTime });
    setIsModalOpen(true);
  };

  const handleQuickReserve = () => {
    navigateToTab('agenda');
    setMobileSidebarOpen(false);
    window.requestAnimationFrame(() => handleOpenModal());
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onQuickReserve={handleQuickReserve} />;
      case 'professionals': return <ProfessionalsGrid />;
      case 'agenda': return <Agenda onOpenModal={handleOpenModal} appointments={appointments} focusDate={agendaFocusDate} />;
      case 'finance': return <Finance />;
      case 'settings': return <Settings />;
      default: return <Dashboard onQuickReserve={handleQuickReserve} />;
    }
  };

  const loadingFallback = (
    <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-8 text-center">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">CREAR</p>
        <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">Cargando vista...</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] font-sans antialiased overflow-hidden bg-slate-50 dark:bg-[#090b11] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          navigateToTab(tab);
          setMobileSidebarOpen(false);
        }}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-[#0f172a] border-b border-slate-100 dark:border-slate-800 px-3 md:px-8 py-2 md:py-0 flex flex-col gap-2 md:h-20 md:flex-row md:items-center md:justify-between flex-shrink-0">
          <div className="flex items-center justify-between gap-2 md:hidden w-full">
            <button
              onClick={() => setMobileSidebarOpen((open) => !open)}
              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm flex items-center justify-center shrink-0"
            >
              {mobileSidebarOpen ? <X className="w-4 h-4 text-slate-900 dark:text-slate-100" /> : <img src={logoCrear} alt="CREAR" className="w-full h-full object-contain p-0.5" />}
            </button>
            <div className="min-w-0 flex-1 px-1">
              <p className="text-[13px] font-black text-slate-900 dark:text-slate-100 truncate leading-none">{mobileTabLabel}</p>
            </div>
            <button className="relative p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 shrink-0">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white dark:border-slate-800" />
            </button>
          </div>

          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-cyan-200 dark:focus:border-cyan-900 rounded-xl text-sm transition-all text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="hidden md:flex items-center justify-end gap-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-[#0f172a]" />
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.displayName || 'Admin'}</p>
                <p className="text-[10px] font-medium text-slate-400 uppercase">{getBackendLabel()}</p>
              </div>
              <button className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xs overflow-hidden">
                {user?.photoURL ? <img src={user.photoURL} alt="avatar" /> : 'AD'}
              </button>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <Suspense fallback={loadingFallback}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </section>
      </main>

      <ReservationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        room={modalContext.room}
        professional={modalContext.pro}
        appointments={appointments}
        initialData={modalContext.appointment}
        initialDate={modalContext.date}
        initialStartTime={modalContext.startTime}
        onSave={async (data) => {
          if (!user) {
            pushToast('error', 'Sesión requerida', 'Inicia sesión para guardar cambios.');
            return;
          }
          setModalAction('save');
          try {
            const patientName = data.patient?.trim();
            const kind = data.kind || data.type || 'session';
            const professionalId = data.professionalId || data.proId;
            const appointmentData = {
              ...data,
              kind,
              type: kind,
              status: data.status || 'scheduled',
              start: data.startTime,
              end: data.endTime,
              patient: patientName || undefined,
              title: patientName || data.title || 'Reserva',
              professionalId,
              proId: professionalId,
              createdBy: user.uid
            };
            await saveAppointment(appointmentData, modalContext.appointment?.id);
            setAgendaFocusDate(appointmentData.date);
            navigateToTab('agenda', { replace: true });
            setIsModalOpen(false);
            pushToast('success', 'Turno guardado', 'Cambios realizados con éxito.');
          } catch (error) {
            pushToast('error', 'Error', 'No se pudo guardar.');
          } finally {
            setModalAction(null);
          }
        }}
        onDelete={async (id) => {
          setModalAction('delete');
          try {
            await deleteAppointment(id);
            setIsModalOpen(false);
            pushToast('success', 'Eliminado', 'Turno borrado.');
          } catch (error) {
            pushToast('error', 'Error', 'No se pudo borrar.');
          } finally {
            setModalAction(null);
          }
        }}
        isSaving={modalAction === 'save'}
        isDeleting={modalAction === 'delete'}
      />

      <div className="fixed right-4 top-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-3 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const toneStyles = {
              success: { icon: CheckCircle2, shell: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100', accent: 'bg-emerald-500' },
              error: { icon: XCircle, shell: 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100', accent: 'bg-rose-500' },
              info: { icon: AlertCircle, shell: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100', accent: 'bg-blue-500' },
            }[toast.tone];
            const Icon = toneStyles.icon;
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-xl ${toneStyles.shell}`}
              >
                <div className={`h-1 w-full ${toneStyles.accent}`} />
                <div className="flex items-start gap-3 p-4">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black">{toast.title}</p>
                    <p className="mt-0.5 text-xs font-medium opacity-80">{toast.message}</p>
                  </div>
                  <button onClick={() => removeToast(toast.id)} className="rounded-lg p-1 text-current/60 hover:bg-white/60 dark:hover:bg-slate-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
