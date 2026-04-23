/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ProfessionalsGrid } from './components/ProfessionalsGrid';
import { Agenda } from './components/Agenda';
import { Finance } from './components/Finance';
import { Settings } from './components/Settings';
import { Bell, Search, User, X, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useRef } from 'react';
import { ReservationModal } from './components/ReservationModal';
import { deleteAppointment, getBackendLabel, getSessionUser, saveAppointment, subscribeToAppointments } from './lib/appointmentsStore';
import logoCrear from './assets/logo-crear.png';

type ToastTone = 'success' | 'error' | 'info';

type ToastItem = {
  id: string;
  tone: ToastTone;
  title: string;
  message: string;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [user] = useState(() => getSessionUser());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [agendaFocusDate, setAgendaFocusDate] = useState<string | null>(null);
  const [modalAction, setModalAction] = useState<'save' | 'delete' | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastTimers = useRef<number[]>([]);
  const syncErrorShown = useRef(false);
  const mobileTabLabel = (() => {
    switch (activeTab) {
      case 'dashboard':
        return 'Inicio';
      case 'professionals':
        return 'Profesionales';
      case 'agenda':
        return 'Agenda';
      case 'finance':
        return 'Finanzas';
      case 'settings':
        return 'Configuración';
      default:
        return activeTab;
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
    const unsubscribeApps = subscribeToAppointments(
      (apps) => {
        syncErrorShown.current = false;
        setAppointments(apps);
      },
      (error) => {
        console.error('Sync error with Sheets', error);
        if (syncErrorShown.current) {
          return;
        }

        syncErrorShown.current = true;
        pushToast(
          'error',
          'No se pudo sincronizar',
          'Este navegador no pudo leer Sheets. ProbÃ¡ recargar o usar otro navegador.',
        );
      },
    );

    return () => {
      unsubscribeApps();
      toastTimers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  // Global Reservation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState<{room?: string, pro?: string, appointment?: any}>({});

  const handleOpenModal = (room?: string, pro?: string, app?: any) => {
    setModalContext({ room, pro, appointment: app });
    setIsModalOpen(true);
  };

  const handleQuickReserve = () => {
    setActiveTab('agenda');
    setMobileSidebarOpen(false);
    window.requestAnimationFrame(() => {
      handleOpenModal();
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onQuickReserve={handleQuickReserve} />;
      case 'professionals':
        return <ProfessionalsGrid />;
      case 'agenda':
        return <Agenda onOpenModal={handleOpenModal} appointments={appointments} focusDate={agendaFocusDate} />;
      case 'finance':
        return <Finance />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onQuickReserve={handleQuickReserve} />;
    }
  };

  return (
    <div className="premium-theme flex h-[100dvh] bg-slate-50 font-sans text-slate-900 antialiased overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setMobileSidebarOpen(false);
        }}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-100 px-4 md:px-8 py-3 md:py-0 flex flex-col gap-2 md:h-20 md:flex-row md:items-center md:justify-between flex-shrink-0 shadow-[0_8px_28px_rgba(148,117,96,0.04)]">
          <div className="flex items-center justify-between gap-2 md:hidden w-full">
            <button
              onClick={() => setMobileSidebarOpen((open) => !open)}
              className="w-9 h-9 rounded-lg bg-white border border-slate-100 overflow-hidden shadow-sm flex items-center justify-center shrink-0"
              aria-label="Abrir menú"
            >
              {mobileSidebarOpen ? <X className="w-4 h-4 text-slate-900" /> : <img src={logoCrear} alt="CREAR" className="w-full h-full object-contain p-0.5" />}
            </button>
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 truncate leading-none">{mobileTabLabel}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 leading-none mt-0.5">
                  {getBackendLabel()} conectado
                </p>
              </div>
            </div>
            <button className="relative p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200/70 shrink-0">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>
          </div>

          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Buscar pacientes, turnos o profesionales..."
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 focus:bg-white focus:border-cyan-200 focus:ring-0 rounded-xl text-sm transition-all"
              />
            </div>
          </div>

          <div className="hidden md:flex items-center justify-between md:justify-end gap-3 md:gap-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200/70">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>
            <div className="hidden md:block h-8 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">{user?.displayName || 'Admin CREAR'}</p>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{getBackendLabel()} conectado</p>
              </div>
              <button className="w-10 h-10 rounded-xl bg-[#243042] border border-slate-200 flex items-center justify-center text-white font-bold text-xs overflow-hidden shadow-lg shadow-slate-200/40">
                {user?.photoURL ? <img src={user.photoURL} alt="avatar" /> : 'AD'}
              </button>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
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
        </section>
      </main>

      <ReservationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        room={modalContext.room}
        professional={modalContext.pro}
        appointments={appointments}
        initialData={modalContext.appointment}
        onSave={async (data) => {
          if (!user) {
            pushToast('error', 'SesiÃ³n requerida', 'Inicia sesiÃ³n para guardar cambios en la agenda.');
            return;
          }
          setModalAction('save');
          try {
            const patientName = data.patient?.trim();
            const appointmentData = {
              ...data,
              start: data.startTime,
              end: data.endTime,
              patient: patientName || undefined,
              title: patientName || data.title || (data.type === 'survey' ? 'Otros' : 'Nueva Reserva'),
              createdBy: user.uid
            };
            const wasEditing = Boolean(modalContext.appointment);
            await saveAppointment(appointmentData, modalContext.appointment?.id);
            setAgendaFocusDate(appointmentData.date);
            setActiveTab('agenda');
            setIsModalOpen(false);
            pushToast(
              'success',
              wasEditing ? 'Turno actualizado' : 'Turno creado',
              wasEditing
                ? 'La reserva se guardÃ³ correctamente en CREAR.'
                : 'La nueva reserva se guardÃ³ correctamente en CREAR.',
            );
          } catch (error) {
            console.error("Error saving appointment", error);
            pushToast('error', 'No se pudo guardar', 'VerificÃ¡ tu conexiÃ³n o permisos e intentÃ¡ de nuevo.');
          } finally {
            setModalAction(null);
          }
        }}
        onDelete={async (id) => {
          setModalAction('delete');
          try {
            await deleteAppointment(id);
            setIsModalOpen(false);
            pushToast('success', 'Turno eliminado', 'La reserva se borrÃ³ correctamente.');
          } catch (error) {
            console.error("Error deleting appointment", error);
            pushToast('error', 'No se pudo borrar', 'IntentÃ¡ de nuevo en unos segundos.');
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
              success: {
                icon: CheckCircle2,
                shell: 'bg-emerald-50 border-emerald-200 text-emerald-900',
                accent: 'bg-emerald-500',
              },
              error: {
                icon: XCircle,
                shell: 'bg-rose-50 border-rose-200 text-rose-900',
                accent: 'bg-rose-500',
              },
              info: {
                icon: AlertCircle,
                shell: 'bg-blue-50 border-blue-200 text-blue-900',
                accent: 'bg-blue-500',
              },
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
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black">{toast.title}</p>
                    <p className="mt-0.5 text-xs font-medium opacity-80">{toast.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeToast(toast.id)}
                    className="rounded-lg p-1 text-current/60 transition-colors hover:bg-white/60 hover:text-current"
                    aria-label="Cerrar notificaciÃ³n"
                  >
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
