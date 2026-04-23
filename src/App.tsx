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
import { Bell, Menu, Search, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';
import { ReservationModal } from './components/ReservationModal';
import { deleteAppointment, getBackendLabel, getSessionUser, saveAppointment, subscribeToAppointments } from './lib/appointmentsStore';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [user] = useState(() => getSessionUser());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [agendaFocusDate, setAgendaFocusDate] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeApps = subscribeToAppointments((apps) => {
      setAppointments(apps);
    });

    return () => {
      unsubscribeApps();
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
    handleOpenModal();
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
        <header className="bg-white/70 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 py-4 md:py-0 flex flex-col gap-3 md:h-20 md:flex-row md:items-center md:justify-between flex-shrink-0">
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileSidebarOpen((open) => !open)}
              className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center"
              aria-label="Abrir menú"
            >
              {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Neurometric LAB</p>
              <p className="text-sm font-bold text-slate-900">{activeTab}</p>
            </div>
          </div>

          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Buscar pacientes, turnos o profesionales..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50/80 border border-white/10 focus:bg-white/90 focus:border-cyan-200/30 focus:ring-0 rounded-xl text-sm transition-all backdrop-blur-sm"
              />
            </div>
          </div>

          <div className="md:hidden">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50/80 border border-white/10 focus:bg-white/90 focus:border-cyan-200/30 focus:ring-0 rounded-xl text-sm transition-all backdrop-blur-sm"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-900 hover:bg-white/60 rounded-xl transition-all border border-transparent hover:border-slate-200/70">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>
            <div className="hidden md:block h-8 w-px bg-white/10 mx-2" />
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">{user?.displayName || 'Admin LAB'}</p>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">{getBackendLabel()} conectado</p>
              </div>
              <button className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 flex items-center justify-center text-white font-bold text-xs overflow-hidden shadow-lg shadow-slate-900/20">
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
            alert('Por favor, inicia sesion para guardar cambios en la agenda.');
            return;
          }
          try {
            const patientName = data.patient?.trim();
            const appointmentData = {
              ...data,
              start: data.startTime,
              end: data.endTime,
              patient: patientName || undefined,
              title: patientName || data.title || (data.type === 'survey' ? 'Encuesta' : 'Nueva Reserva'),
              createdBy: user.uid
            };
            await saveAppointment(appointmentData, modalContext.appointment?.id);
            setAgendaFocusDate(appointmentData.date);
            setActiveTab('agenda');
            setIsModalOpen(false);
          } catch (error) {
            console.error("Error saving appointment", error);
            alert('Error al guardar: verifica tu conexion o permisos.');
          }
        }}
        onDelete={async (id) => {
          try {
            await deleteAppointment(id);
            setIsModalOpen(false);
          } catch (error) {
            console.error("Error deleting appointment", error);
          }
        }}
      />
    </div>
  );
}
