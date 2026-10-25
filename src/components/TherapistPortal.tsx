import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  DoorOpen,
  User,
  Plus,
  Trash2,
  Edit2,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  LayoutDashboard,
  Users,
  Sun,
  Moon,
} from 'lucide-react';
import logo from '../assets/logo-crear.png';
import type {
  AppointmentRecord,
  ConfiguredRoom,
  PatientRecord,
  TherapistAvailability,
} from '../types';
import {
  subscribeToSheetsAppointments,
  bookAppointmentInSheets,
  cancelAppointmentInSheets,
  fetchRoomsFromSheets,
  fetchPatientsFromSheets,
  savePatientMinimalInSheets,
  fetchTherapistAvailabilitiesFromSheets,
  saveAvailabilityInSheets,
} from '../lib/googleSheetsService';
import { AuthUser, CREAR_TEAM, logoutUser } from '../lib/crearAuth';
import { useProfessionals } from '../lib/professionalsStore';
import { useRecords } from '../lib/crearStore';
import { readStoredValue, writeStoredValue } from '../lib/browserStorage';
import { buildUnifiedOccupancyAppointments } from '../lib/occupancy';
import { QuickReservationModal } from './QuickReservationModal';
import { occursOn, type Slot } from '../lib/scheduling';

interface TherapistPortalProps {
  currentUser: AuthUser;
  onOpenAdminSuite?: (tab?: string) => void;
}

const THERAPIST_PASTEL_COLORS: Record<string, string> = {
  ariadna: 'bg-[#E5F4EC] text-[#1D4E38] border-[#B9E2CD]',
  ivana: 'bg-[#E6F1FA] text-[#1E476B] border-[#BDD9F2]',
  dana: 'bg-[#F0EBF8] text-[#422B6B] border-[#D8C9F0]',
  romy: 'bg-[#FDF0E6] text-[#6B3A1E] border-[#F5D3B8]',
  barbie: 'bg-[#FCEBF1] text-[#6B213C] border-[#F5C6D7]',
  vero: 'bg-[#E6F6F4] text-[#1B524C] border-[#B6E3DE]',
};

function getTherapistPastel(proId?: string) {
  if (!proId) return 'bg-[#EEF2EE] text-[#34433F] border-[#D5DDD7]';
  return THERAPIST_PASTEL_COLORS[proId] || 'bg-[#EEF2EE] text-[#34433F] border-[#D5DDD7]';
}

export function formatArDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function formatWeekdayLabel(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Jujuy',
      weekday: 'long',
    }).format(new Date(`${isoDate}T12:00:00`));
  } catch {
    return '';
  }
}

const HOURS_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];

export function TherapistPortal({ currentUser, onOpenAdminSuite }: TherapistPortalProps) {
  const [activeTab, setActiveTab] = useState<'agenda' | 'my-bookings' | 'availability' | 'profile'>('agenda');
  const [allProfessionals] = useProfessionals();

  const resolveProName = (proId?: string) => {
    if (!proId) return 'Profesional';
    const fromStore = allProfessionals.find((p) => p.id === proId);
    if (fromStore) return fromStore.name;
    const fromTeam = CREAR_TEAM.find((t) => t.id === proId);
    if (fromTeam) return fromTeam.name;
    if (proId === currentUser.professionalId || proId === currentUser.id) return currentUser.name;
    return proId;
  };

  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const agreementRecords = useRecords('agreements');
  const rentalRecords = useRecords('rentals');
  const interviewRecords = useRecords('interviews');
  const [rooms, setRooms] = useState<ConfiguredRoom[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [availabilities, setAvailabilities] = useState<TherapistAvailability[]>([]);

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [currentDateStr, setCurrentDateStr] = useState<string>(() =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Jujuy',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  );
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentRecord | null>(null);
  const [modalPreselect, setModalPreselect] = useState<{
    roomId?: string;
    date?: string;
    startTime?: string;
    kind?: 'block' | 'session';
  }>({});

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (readStoredValue('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    const root = window.document.documentElement;
    if (nextTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    writeStoredValue('theme', nextTheme);
  };

  const [notice, setNotice] = useState<{
    tone: 'saving' | 'success' | 'error';
    message: string;
  } | null>(null);

  const pushNotice = (tone: 'saving' | 'success' | 'error', message: string, duration = 3500) => {
    setNotice({ tone, message });
    if (tone !== 'saving') {
      setTimeout(() => setNotice(null), duration);
    }
  };

  useEffect(() => {
    void fetchRoomsFromSheets().then(setRooms);
    void fetchPatientsFromSheets().then(setPatients);
    void fetchTherapistAvailabilitiesFromSheets().then(setAvailabilities);

    const unsubscribe = subscribeToSheetsAppointments(
      (apps) => setAppointments(apps),
      () => {}
    );

    return () => unsubscribe();
  }, []);

  const myProId = currentUser.professionalId || currentUser.id;

  const navigateDate = (direction: 'prev' | 'next' | 'today' | 'nextWeek' | 'prevWeek') => {
    if (direction === 'today') {
      setCurrentDateStr(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Argentina/Jujuy',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date())
      );
      return;
    }
    if (direction === 'nextWeek') {
      const curr = new Date(`${currentDateStr}T12:00:00`);
      curr.setDate(curr.getDate() + 7);
      setCurrentDateStr(curr.toISOString().split('T')[0]);
      return;
    }
    if (direction === 'prevWeek') {
      const curr = new Date(`${currentDateStr}T12:00:00`);
      curr.setDate(curr.getDate() - 7);
      setCurrentDateStr(curr.toISOString().split('T')[0]);
      return;
    }
    const curr = new Date(`${currentDateStr}T12:00:00`);
    const delta = viewMode === 'day' ? 1 : 7;
    curr.setDate(curr.getDate() + (direction === 'next' ? delta : -delta));
    setCurrentDateStr(curr.toISOString().split('T')[0]);
  };

  const weekDates = useMemo(() => {
    const selected = new Date(`${currentDateStr}T12:00:00`);
    const dayOfWeek = selected.getDay();
    const monday = new Date(selected);
    monday.setDate(selected.getDate() - ((dayOfWeek + 6) % 7));

    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [currentDateStr]);

  const unifiedAppointments = useMemo(
    () =>
      buildUnifiedOccupancyAppointments({
        appointments,
        agreements: agreementRecords.rows,
        rentals: rentalRecords.rows,
        interviews: interviewRecords.rows,
        profiles: allProfessionals,
      }),
    [appointments, agreementRecords.rows, rentalRecords.rows, interviewRecords.rows, allProfessionals]
  );

  const activeAppointmentsOnDate = (date: string) => {
    return unifiedAppointments.filter((app) => {
      if (app.status === 'cancelled') return false;
      return occursOn(app as Slot, date);
    });
  };

  const myAppointments = useMemo(() => {
    return unifiedAppointments
      .filter((app) => app.professionalId === myProId && app.status !== 'cancelled')
      .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  }, [unifiedAppointments, myProId]);

  const handleSaveAppointment = async (record: Partial<AppointmentRecord>) => {
    try {
      await bookAppointmentInSheets(record, {
        waitForConfirmation: true,
        onSaving: () => {
          pushNotice('saving', 'Guardando...');
        },
        onConfirmed: () => {
          pushNotice('success', 'Reserva confirmada');
        },
        onError: (bgErr) => {
          pushNotice('error', `Error al guardar: ${bgErr.message || 'Conflicto en servidor.'}`, 5500);
        },
      });
    } catch (err) {
      pushNotice(
        'error',
        `Error al guardar: ${err instanceof Error ? err.message : 'No se pudo guardar.'}`,
        5000
      );
      throw err;
    }
  };

  const handleCancelAppointment = async (id: string) => {
    await cancelAppointmentInSheets(id, (bgErr) => {
      pushNotice('error', bgErr.message || 'No se pudo cancelar en el servidor.');
    });
    pushNotice('success', 'Reserva cancelada');
  };

  const handleCreatePatient = async (name: string, professionalId: string): Promise<PatientRecord> => {
    const created = await savePatientMinimalInSheets({ name, professionalId, status: 'active' });
    setPatients((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
    return created;
  };

  const handleOpenBooking = (roomId?: string, date?: string, startTime?: string, initialKind?: 'block' | 'session') => {
    setEditingAppointment(null);
    setModalPreselect({
      roomId: roomId || (selectedRoomFilter !== 'all' ? selectedRoomFilter : rooms[0]?.id || 'c1'),
      date: date || currentDateStr,
      startTime: startTime || '15:00',
      kind: initialKind,
    });
    setIsModalOpen(true);
  };

  const handleEditBooking = (app: AppointmentRecord) => {
    if ((app as any).source && (app as any).source !== 'appointments') {
      if (currentUser.role === 'admin' && onOpenAdminSuite) {
        onOpenAdminSuite((app as any).source === 'interviews' ? 'admissions' : 'rooms');
      }
      return;
    }
    const isMine = app.professionalId === myProId;
    if (!isMine && currentUser.role !== 'admin') return;
    setEditingAppointment(app);
    setIsModalOpen(true);
  };

  const formattedCurrentDate = useMemo(() => {
    try {
      if (viewMode === 'week' && weekDates.length > 0) {
        return `Semana: ${formatArDate(weekDates[0])} al ${formatArDate(weekDates[weekDates.length - 1])}`;
      }
      const weekday = formatWeekdayLabel(currentDateStr);
      return `${weekday} ${formatArDate(currentDateStr)}`;
    } catch {
      return formatArDate(currentDateStr);
    }
  }, [currentDateStr, viewMode, weekDates]);

  const visibleRooms = useMemo(() => {
    if (selectedRoomFilter === 'all') return rooms;
    return rooms.filter((r) => r.id === selectedRoomFilter);
  }, [rooms, selectedRoomFilter]);

  return (
    <div className="min-h-dvh flex flex-col bg-[#F9F8F5] text-[#34433F] pb-16 sm:pb-0 antialiased">
      {/* Header Minimalista */}
      <header className="sticky top-0 z-30 border-b border-[#E5EAE5] bg-white/95 px-4 py-2.5 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="CREAR" className="h-9 w-auto object-contain sm:h-10" />
            <div>
              <span className="text-sm font-black tracking-tight text-[#34433F]">CREAR</span>
              <p className="text-[11px] text-[#6D7C76] leading-none">Portal de Terapeutas</p>
            </div>
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('agenda')}
              className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition ${
                activeTab === 'agenda'
                  ? 'bg-[#46766B] text-white'
                  : 'text-[#6D7C76] hover:bg-[#EEF2EE] hover:text-[#34433F]'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Mi agenda</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenBooking()}
              className="flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold text-[#46766B] hover:bg-[#E8F3EE] transition"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva reserva</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my-bookings')}
              className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition ${
                activeTab === 'my-bookings'
                  ? 'bg-[#46766B] text-white'
                  : 'text-[#6D7C76] hover:bg-[#EEF2EE] hover:text-[#34433F]'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Mis reservas</span>
              {myAppointments.length > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    activeTab === 'my-bookings' ? 'bg-white/25 text-white' : 'bg-[#E5EAE5] text-[#34433F]'
                  }`}
                >
                  {myAppointments.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('availability')}
              className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition ${
                activeTab === 'availability'
                  ? 'bg-[#46766B] text-white'
                  : 'text-[#6D7C76] hover:bg-[#EEF2EE] hover:text-[#34433F]'
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              <span>Mi disponibilidad</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition ${
                activeTab === 'profile'
                  ? 'bg-[#46766B] text-white'
                  : 'text-[#6D7C76] hover:bg-[#EEF2EE] hover:text-[#34433F]'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Mi perfil</span>
            </button>
          </nav>

          {/* Acciones Derecha */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#D5DDD7] bg-[#FAF8F5] text-[#52635D] hover:bg-[#EEF2EE] hover:text-[#34433F] transition shrink-0"
              aria-label="Cambiar modo oscuro / claro"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-600" />}
            </button>

            {currentUser.role === 'admin' && onOpenAdminSuite && (
              <button
                type="button"
                onClick={() => onOpenAdminSuite('dashboard')}
                className="flex items-center gap-1.5 rounded-2xl bg-[#A36224] px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#8A521D]"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Panel Administrativo</span>
                <span className="md:hidden">Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenBooking()}
              className="flex items-center gap-1 rounded-2xl bg-[#46766B] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#3B645B] active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Reservar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notificación flotante con 3 estados: Guardando / Reserva confirmada / Error al guardar */}
      {notice && (
        <div className="fixed bottom-16 sm:bottom-5 right-3 left-3 sm:left-auto z-50 animate-[fadeIn_.15s_ease-out]">
          <div
            className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold shadow-lg ${
              notice.tone === 'saving'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : notice.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
          >
            {notice.tone === 'saving' ? (
              <Clock className="h-4 w-4 shrink-0 animate-spin text-amber-600" />
            ) : notice.tone === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span className="truncate">{notice.message}</span>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="mx-auto w-full max-w-7xl flex-1 p-3 pb-24 sm:p-5">
        {/* ========================================================================= */}
        {/* TAB 1: MI AGENDA (AGENDA COMPARTIDA DE CONSULTORIOS) */}
        {/* ========================================================================= */}
        {activeTab === 'agenda' && (
          <div className="space-y-3">
            {/* Barra de Controles Compacta */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-[#E5EAE5] bg-white p-3 shadow-xs">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 rounded-2xl border border-[#DDE3DF] bg-[#F9FBF9] p-0.5">
                  <button
                    type="button"
                    onClick={() => navigateDate('today')}
                    className="px-2.5 py-1 text-xs font-bold text-[#46766B] hover:bg-[#EAEFEA] rounded-xl transition shrink-0"
                    title="Ir al día de hoy"
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateDate('nextWeek')}
                    className="px-2.5 py-1 text-xs font-semibold text-[#52635D] hover:bg-[#EAEFEA] hover:text-[#264A40] rounded-xl transition shrink-0 hidden min-[380px]:inline-block"
                    title="Avanzar 1 semana"
                  >
                    +1 sem
                  </button>
                  <div className="h-4 w-px bg-[#DDE3DF] my-auto mx-0.5 shrink-0" />
                  <button
                    type="button"
                    onClick={() => navigateDate('prev')}
                    className="rounded-xl p-1.5 text-[#52635D] hover:bg-[#EAEFEA] transition shrink-0"
                    title={viewMode === 'week' ? 'Semana anterior' : 'Día anterior'}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateDate('next')}
                    className="rounded-xl p-1.5 text-[#52635D] hover:bg-[#EAEFEA] transition shrink-0"
                    title={viewMode === 'week' ? 'Semana siguiente' : 'Día siguiente'}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <input
                  type="date"
                  value={currentDateStr}
                  onChange={(e) => setCurrentDateStr(e.target.value)}
                  className="rounded-2xl border border-[#DDE3DF] bg-[#F9FBF9] px-2.5 py-1.5 text-xs font-bold text-[#34433F] focus:border-[#46766B] focus:outline-none"
                />

                <span className="hidden md:inline-block text-xs font-bold capitalize text-[#34433F] ml-1">
                  {formattedCurrentDate}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Filtro rápido de consultorio */}
                <select
                  value={selectedRoomFilter}
                  onChange={(e) => setSelectedRoomFilter(e.target.value)}
                  className="rounded-2xl border border-[#DDE3DF] bg-[#F9FBF9] px-3 py-1.5 text-xs font-bold text-[#34433F] focus:border-[#46766B] focus:outline-none"
                >
                  <option value="all">Todos los consultorios</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name.split('—')[0].trim()}
                    </option>
                  ))}
                </select>

                {/* Día / Semana */}
                <div className="flex rounded-2xl border border-[#DDE3DF] bg-[#F9FBF9] p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('day')}
                    className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                      viewMode === 'day' ? 'bg-[#46766B] text-white' : 'text-[#6D7C76]'
                    }`}
                  >
                    Día
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('week')}
                    className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                      viewMode === 'week' ? 'bg-[#46766B] text-white' : 'text-[#6D7C76]'
                    }`}
                  >
                    Semana
                  </button>
                </div>
              </div>
            </div>

            {/* Pestañas táctiles de Consultorio para Celulares (sin compresión ni scroll horizontal) */}
            <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedRoomFilter('all')}
                className={`min-h-10 shrink-0 rounded-2xl px-3.5 py-2 text-xs font-bold transition ${
                  selectedRoomFilter === 'all'
                    ? 'bg-[#46766B] text-white shadow-xs'
                    : 'border border-[#DDE3DF] bg-white text-[#52635D]'
                }`}
              >
                Todos ({rooms.length})
              </button>
              {rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRoomFilter(r.id)}
                  className={`min-h-10 shrink-0 rounded-2xl px-3.5 py-2 text-xs font-bold transition ${
                    selectedRoomFilter === r.id
                      ? 'bg-[#46766B] text-white shadow-xs'
                      : 'border border-[#DDE3DF] bg-white text-[#52635D]'
                  }`}
                >
                  {r.name.split('—')[0].trim()}
                </button>
              ))}
            </div>

            {/* VISTA DIARIA POR CONSULTORIO */}
            {viewMode === 'day' && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {visibleRooms.map((room) => {
                  const roomApps = activeAppointmentsOnDate(currentDateStr)
                    .filter((a) => a.roomId === room.id)
                    .sort((a, b) => a.start.localeCompare(b.start));

                  return (
                    <div
                      key={room.id}
                      className="flex flex-col rounded-3xl border border-[#E5EAE5] bg-white p-4 shadow-xs"
                    >
                      {/* Cabecera Consultorio */}
                      <div className="flex items-center justify-between border-b border-[#F0F4F1] pb-3 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E8F3EE] text-[#46766B]">
                            <DoorOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-[#34433F]">
                              {room.name.split('—')[0].trim()}
                            </h3>
                            <p className="text-[11px] text-[#6D7C76]">
                              {room.name.split('—')[1]?.trim() || room.description}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenBooking(room.id, currentDateStr)}
                          className="flex items-center gap-1 rounded-xl bg-[#F2F7F4] px-2.5 py-1.5 text-xs font-bold text-[#46766B] hover:bg-[#DDEAE2]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Reservar</span>
                        </button>
                      </div>

                      {/* Grilla de Horarios */}
                      <div className="space-y-1.5">
                        {HOURS_SLOTS.map((slotHour) => {
                          const slotPrefix = slotHour.slice(0, 2);
                          const matchingBookings = roomApps.filter((a) => {
                            const startH = Number(a.start.slice(0, 2));
                            const endH = Number(a.end.slice(0, 2));
                            const endM = Number(a.end.slice(3, 5));
                            const slotH = Number(slotPrefix);
                            return slotH >= startH && (slotH < endH || (slotH === endH && endM > 0));
                          });

                          if (matchingBookings.length === 0) {
                            return (
                              <button
                                key={slotHour}
                                type="button"
                                onClick={() => handleOpenBooking(room.id, currentDateStr, slotHour)}
                                className="group flex w-full items-center justify-between rounded-2xl border border-dashed border-[#E2EAE4] bg-[#FBFDFB] px-3 py-2 text-left transition hover:border-[#46766B] hover:bg-[#F1F8F4]"
                              >
                                <span className="font-mono text-xs font-semibold text-[#7C8D86]">
                                  {slotHour}
                                </span>
                                <span className="text-[11px] font-semibold text-[#889892] group-hover:text-[#46766B]">
                                  Disponible · + Reservar
                                </span>
                              </button>
                            );
                          }

                          return matchingBookings.map((booking) => {
                            const therapistName = resolveProName(booking.professionalId);
                            const isMine = booking.professionalId === myProId;
                            const isAdmin = currentUser.role === 'admin';
                            const canSeeDetails = isMine || isAdmin;
                            const pastelClass = getTherapistPastel(booking.professionalId);
                            const isBlock = booking.kind === 'block' || booking.type === 'block';

                            return (
                              <div
                                key={`${slotHour}-${booking.id}`}
                                className={`rounded-2xl border p-3 transition ${pastelClass}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-xs font-black">
                                        {booking.start} a {booking.end}
                                      </span>
                                      {booking.recurrence === 'weekly' && (
                                        <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] font-bold">
                                          Semanal
                                        </span>
                                      )}
                                      {booking.syncState === 'saving' || booking.syncPending ? (
                                        <span className="rounded-md bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                                          Guardando...
                                        </span>
                                      ) : booking.syncState === 'error' ? (
                                        <span className="rounded-md bg-rose-100 text-rose-900 border border-rose-300 px-1.5 py-0.5 text-[10px] font-bold">
                                          Error al guardar
                                        </span>
                                      ) : (
                                        <span className="rounded-md bg-emerald-100/90 text-emerald-900 px-1.5 py-0.5 text-[10px] font-bold">
                                          Reserva confirmada
                                        </span>
                                      )}
                                    </div>

                                    {booking.syncState === 'error' && booking.syncError && (
                                      <div className="mt-1.5 rounded-xl bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-800 flex items-center justify-between gap-2">
                                        <span>{booking.syncError}</span>
                                        <button
                                          type="button"
                                          onClick={() => void handleSaveAppointment(booking)}
                                          className="rounded-lg bg-rose-700 px-2 py-0.5 text-[10px] text-white"
                                        >
                                          Reintentar
                                        </button>
                                      </div>
                                    )}

                                    {/* REGLA DE PRIVACIDAD ESTRICTA SEGÚN QUIÉN MIRA */}
                                    {!canSeeDetails ? (
                                      <p className="mt-1 text-xs font-bold">
                                        {(booking as any).source === 'rentals' && !booking.professionalId
                                          ? 'Ocupado — Subalquiler externo'
                                          : `Ocupado — ${therapistName}`}
                                      </p>
                                    ) : isBlock ? (
                                      <div className="mt-1 space-y-0.5">
                                        <p className="text-xs font-bold">
                                          {(booking as any).source === 'agreements'
                                            ? `Acuerdo mensual — ${therapistName}`
                                            : (booking as any).source === 'rentals'
                                              ? booking.title || `Alquiler — ${therapistName}`
                                              : booking.title || `Reserva de consultorio — ${therapistName}`}
                                        </p>
                                        {booking.professionalId === myProId || isAdmin ? (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenBooking(room.id, currentDateStr, booking.start, 'session')}
                                            className="mt-1 inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#1D3E35] hover:bg-white"
                                          >
                                            <Plus className="h-3 w-3" />
                                            <span>Asignar paciente en este bloque</span>
                                          </button>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <div className="mt-1 space-y-0.5 text-xs">
                                        <p className="font-bold">
                                          {booking.title || booking.patient || 'Reserva'}
                                        </p>
                                        {booking.serviceName && (
                                          <p className="text-[11px] opacity-90">
                                            Prestación: {booking.serviceName}
                                          </p>
                                        )}
                                        <p className="text-[10px] opacity-80">
                                          {isAdmin ? `Titular: ${therapistName} · ` : ''}
                                          {booking.syncState === 'saving' || booking.syncPending
                                            ? 'Estado: Guardando en Google Sheets...'
                                            : booking.syncState === 'error'
                                              ? 'Estado: Error al guardar'
                                              : 'Estado: Reserva confirmada'}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                    {canSeeDetails && (!(booking as any).source || (booking as any).source === 'appointments') && (
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleEditBooking(booking)}
                                          className="rounded-xl bg-white/80 p-1.5 text-[#34433F] hover:bg-white"
                                          title="Editar"
                                        >
                                          <Edit2 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void handleCancelAppointment(booking.id)}
                                          className="rounded-xl bg-white/80 p-1.5 text-rose-700 hover:bg-rose-50"
                                          title="Cancelar"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    )}
                                </div>
                              </div>
                            );
                          });
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VISTA SEMANAL ADAPTATIVA (Vertical en celular sin scroll horizontal / 6 columnas en escritorio) */}
            {viewMode === 'week' && (
              <div className="rounded-3xl border border-[#E5EAE5] bg-white p-3 sm:p-4 shadow-xs">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-6 md:gap-2.5">
                  {weekDates.map((dateStr) => {
                    const dayBookings = activeAppointmentsOnDate(dateStr)
                      .filter((app) => selectedRoomFilter === 'all' || app.roomId === selectedRoomFilter)
                      .sort((a, b) => a.start.localeCompare(b.start));

                    const dayTitle = `${formatWeekdayLabel(dateStr)} ${formatArDate(dateStr).slice(0, 5)}`;

                    return (
                      <div
                        key={dateStr}
                        className="flex flex-col rounded-2xl border border-[#EAEFEA] bg-[#FDFFFD] p-3"
                      >
                        <div className="flex items-center justify-between border-b border-[#EAEFEA] pb-2 mb-2">
                          <span className="text-xs font-bold capitalize text-[#34433F]">{dayTitle}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenBooking(undefined, dateStr)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E8F3EE] text-[#46766B] hover:bg-[#DDEAE2]"
                            title="Reservar en este día"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="space-y-2 flex-1">
                          {dayBookings.length === 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenBooking(undefined, dateStr)}
                              className="w-full rounded-xl border border-dashed border-[#E2EAE4] py-4 text-center text-[11px] font-semibold text-[#889892] hover:border-[#46766B] hover:text-[#46766B]"
                            >
                              Sin reservas · + Agregar
                            </button>
                          ) : (
                            dayBookings.map((app) => {
                              const therapistName = resolveProName(app.professionalId);
                              const roomObj = rooms.find((r) => r.id === app.roomId);
                              const isMine = app.professionalId === myProId;
                              const canSee = isMine || currentUser.role === 'admin';
                              const pastel = getTherapistPastel(app.professionalId);

                              return (
                                <div
                                  key={app.id}
                                  onClick={() => canSee && handleEditBooking(app)}
                                  className={`rounded-xl border p-2.5 text-xs ${pastel} ${
                                    canSee ? 'cursor-pointer hover:opacity-90' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-mono text-[11px] font-bold">
                                    <span>
                                      {app.start}–{app.end}
                                    </span>
                                    <span className="rounded-md bg-white/75 px-1.5 py-0.5 text-[10px]">
                                      {roomObj?.name.split('—')[0].replace('Consultorio ', 'Cons. ') || app.roomId}
                                    </span>
                                  </div>
                                  <p className="mt-1 font-bold truncate">
                                    {canSee
                                      ? app.kind === 'block'
                                        ? `Reserva — ${therapistName}`
                                        : app.patient || app.title
                                      : `Ocupado — ${therapistName}`}
                                  </p>
                                  {canSee && app.serviceName && (
                                    <p className="text-[11px] opacity-85 truncate">{app.serviceName}</p>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MIS TURNOS Y MIS PACIENTES */}
        {/* ========================================================================= */}
        {activeTab === 'my-bookings' && (
          <MyTurnsAndPatientsSection
            myAppointments={myAppointments}
            patients={patients.filter((p) => !p.professionalId || p.professionalId === myProId)}
            rooms={rooms}
            onNewBooking={() => handleOpenBooking()}
            onEditBooking={handleEditBooking}
            onCancelBooking={handleCancelAppointment}
            onCreatePatient={(name) => handleCreatePatient(name, myProId)}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MI DISPONIBILIDAD */}
        {/* ========================================================================= */}
        {activeTab === 'availability' && (
          <MyAvailabilitySection
            currentUser={currentUser}
            existingAvailability={availabilities.find((a) => a.therapistId === myProId)}
            onSave={async (summary) => {
              await saveAvailabilityInSheets(myProId, summary);
              pushNotice('success', 'Disponibilidad actualizada');
              const updated = await fetchTherapistAvailabilitiesFromSheets();
              setAvailabilities(updated);
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MI PERFIL */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="mx-auto max-w-md rounded-3xl border border-[#E5EAE5] bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#46766B] text-lg font-bold text-white">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#34433F]">{currentUser.name}</h2>
                <p className="text-xs text-[#6D7C76]">
                  {currentUser.specialty || (currentUser.role === 'admin' ? 'Responsable CREAR' : 'Terapeuta')}
                </p>
                <p className="text-xs font-mono text-[#6D7C76] mt-0.5">{currentUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-2xl border border-[#E5EAE5] bg-[#F9FBF9] p-3.5">
                <p className="text-[11px] text-[#6D7C76]">Turnos activos</p>
                <p className="text-xl font-black text-[#34433F]">{myAppointments.length}</p>
              </div>
              <div className="rounded-2xl border border-[#E5EAE5] bg-[#F9FBF9] p-3.5">
                <p className="text-[11px] text-[#6D7C76]">Pacientes propios</p>
                <p className="text-xl font-black text-[#34433F]">
                  {patients.filter((p) => p.status !== 'inactive' && (!p.professionalId || p.professionalId === myProId)).length}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex w-full items-center justify-between rounded-2xl border border-[#D5DDD7] bg-[#F9FBF9] p-3.5 text-xs font-bold text-[#34433F] hover:bg-[#EEF2EE] transition"
            >
              <div className="flex items-center gap-2">
                {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
                <span>Modo {theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#46766B]">
                {theme === 'dark' ? 'Oscuro' : 'Claro'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void logoutUser()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 py-3 px-4 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}
      </main>

      {/* Barra de Navegación Inferior para Celulares (1 mano): 5 columnas iguales para que siempre entren todas */}
      <nav className="fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 sm:hidden border-t border-[#E5EAE5] bg-white/95 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        {([
          { key: 'agenda', label: 'Agenda', Icon: Calendar, onClick: () => setActiveTab('agenda') },
          { key: 'new', label: 'Reservar', Icon: Plus, onClick: () => handleOpenBooking() },
          { key: 'my-bookings', label: 'Reservas', Icon: Clock, onClick: () => setActiveTab('my-bookings') },
          { key: 'availability', label: 'Horarios', Icon: CalendarDays, onClick: () => setActiveTab('availability') },
          { key: 'profile', label: 'Perfil', Icon: User, onClick: () => setActiveTab('profile') },
        ] as const).map(({ key, label, Icon, onClick }) => {
          const isNew = key === 'new';
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={onClick}
              aria-label={label}
              className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-bold leading-tight ${
                isNew || isActive ? 'text-[#46766B]' : 'text-[#889892]'
              }`}
            >
              {isNew ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#46766B] text-white">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              ) : (
                <Icon className="h-[18px] w-[18px]" />
              )}
              <span className="w-full truncate text-center">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modal Rápido de Turno / Reserva */}
      <QuickReservationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUser={currentUser}
        rooms={rooms}
        appointments={unifiedAppointments}
        patients={patients}
        initialData={editingAppointment}
        initialRoomId={modalPreselect.roomId}
        initialDate={modalPreselect.date}
        initialStartTime={modalPreselect.startTime}
        initialKind={modalPreselect.kind}
        onSave={handleSaveAppointment}
        onDelete={handleCancelAppointment}
      />
    </div>
  );
}

// =========================================================================
// SUB-COMPONENTE: MIS TURNOS Y PACIENTES (MINIMALISTA)
// =========================================================================
function MyTurnsAndPatientsSection({
  myAppointments,
  patients,
  rooms,
  onNewBooking,
  onEditBooking,
  onCancelBooking,
  onCreatePatient,
}: {
  myAppointments: AppointmentRecord[];
  patients: PatientRecord[];
  rooms: ConfiguredRoom[];
  onNewBooking: () => void;
  onEditBooking: (app: AppointmentRecord) => void;
  onCancelBooking: (id: string) => Promise<void>;
  onCreatePatient: (name: string) => Promise<PatientRecord>;
}) {
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [newPatientName, setNewPatientName] = useState('');

  const filteredAppointments = useMemo(() => {
    return myAppointments.filter((app) => {
      if (filterDate && app.date !== filterDate) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchPatient = (app.patient || '').toLowerCase().includes(q);
        const matchTitle = (app.title || '').toLowerCase().includes(q);
        const matchService = (app.serviceName || '').toLowerCase().includes(q);
        return matchPatient || matchTitle || matchService;
      }
      return true;
    });
  }, [myAppointments, filterDate, search]);

  async function handleAddPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!newPatientName.trim()) return;
    await onCreatePatient(newPatientName.trim());
    setNewPatientName('');
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Columna 1 y 2: Mis Turnos y Reservas */}
      <div className="lg:col-span-2 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-[#E5EAE5] bg-white p-4 shadow-xs">
          <h2 className="text-base font-bold text-[#34433F]">Mis próximos turnos y reservas</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#889892]" />
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-[#D5DDD7] bg-[#FAFCFA] pl-8 pr-3 py-1.5 text-xs text-[#34433F] focus:border-[#46766B] focus:outline-none"
              />
            </div>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-xl border border-[#D5DDD7] bg-[#FAFCFA] px-2.5 py-1.5 text-xs text-[#34433F]"
            />
            {filterDate && (
              <button
                type="button"
                onClick={() => setFilterDate('')}
                className="text-xs font-bold text-[#46766B] hover:underline"
              >
                Todos
              </button>
            )}
          </div>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="rounded-3xl border border-[#E5EAE5] bg-white p-8 text-center">
            <p className="text-sm font-semibold text-[#6D7C76]">No hay turnos registrados con ese filtro.</p>
            <button
              type="button"
              onClick={onNewBooking}
              className="mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-[#46766B] px-4 py-2.5 text-xs font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar nuevo turno</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {filteredAppointments.map((app) => {
              const room = rooms.find((r) => r.id === app.roomId);
              const isBlock = app.kind === 'block' || app.type === 'block';
              return (
                <div
                  key={app.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#E5EAE5] bg-white p-4 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-[#E8F3EE] px-2 py-0.5 text-[10px] font-bold text-[#46766B]">
                        {room?.name.split('—')[0].trim() || app.roomId}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#34433F]">
                        {formatArDate(app.date)} · {app.start} a {app.end}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-bold text-[#34433F]">
                      {app.title || app.patient || 'Reserva de consultorio'}
                    </p>
                    {!isBlock && app.serviceName && (
                      <p className="text-xs text-[#6D7C76]">Prestación: {app.serviceName}</p>
                    )}
                    {app.recurrence === 'weekly' && (
                      <span className="mt-1 inline-block rounded-md bg-[#F2F5F3] px-2 py-0.5 text-[10px] font-semibold text-[#52635D]">
                        Repetición semanal
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-[#F0F4F1] pt-2.5">
                    <button
                      type="button"
                      onClick={() => onEditBooking(app)}
                      className="flex items-center gap-1 rounded-xl border border-[#D5DDD7] px-3 py-1.5 text-xs font-semibold text-[#34433F] hover:bg-[#F9FBF9]"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void onCancelBooking(app.id)}
                      className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Cancelar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Columna 3: Mis Pacientes Vinculados */}
      <div className="rounded-3xl border border-[#E5EAE5] bg-white p-4 shadow-xs space-y-3 h-fit">
        <div className="flex items-center gap-2 border-b border-[#F0F4F1] pb-2.5">
          <Users className="h-4 w-4 text-[#46766B]" />
          <h3 className="text-sm font-bold text-[#34433F]">Mis Pacientes</h3>
        </div>

        <form onSubmit={handleAddPatient} className="flex gap-1.5">
          <input
            type="text"
            placeholder="Nombre y apellido..."
            value={newPatientName}
            onChange={(e) => setNewPatientName(e.target.value)}
            className="flex-1 rounded-xl border border-[#D5DDD7] bg-[#FAFCFA] px-3 py-2 text-xs text-[#34433F] focus:border-[#46766B] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#46766B] px-3 py-2 text-xs font-bold text-white hover:bg-[#3B645B]"
          >
            Agregar
          </button>
        </form>

        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {patients.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#889892]">Sin pacientes cargados.</p>
          ) : (
            patients.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-[#EAEFEA] bg-[#FDFEFC] px-3 py-2 text-xs"
              >
                <span className="font-semibold text-[#34433F]">{p.name}</span>
                <span className="rounded-full bg-[#E8F3EE] px-2 py-0.5 text-[10px] font-bold text-[#46766B]">
                  Activo
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENTE: MI DISPONIBILIDAD (DETECCIÓN DE BLOQUES DE 4 HORAS)
// =========================================================================
function MyAvailabilitySection({
  currentUser,
  existingAvailability,
  onSave,
}: {
  currentUser: AuthUser;
  existingAvailability?: TherapistAvailability;
  onSave: (summary: string) => Promise<void>;
}) {
  const [selectedDays, setSelectedDays] = useState<number[]>(
    existingAvailability?.activeDays || [1, 2, 3, 4, 5]
  );
  const [startTime, setStartTime] = useState(existingAvailability?.startTime || '14:00');
  const [endTime, setEndTime] = useState(existingAvailability?.endTime || '18:00');
  const [acceptingPatients, setAcceptingPatients] = useState(
    existingAvailability?.acceptingPatients ?? true
  );
  const [needsRecurringBlock, setNeedsRecurringBlock] = useState(
    existingAvailability?.needsRecurringBlock ?? false
  );
  const [preferredRoom, setPreferredRoom] = useState('Consultorio 1');

  const dayOptions = [
    { day: 1, label: 'Lun' },
    { day: 2, label: 'Mar' },
    { day: 3, label: 'Mié' },
    { day: 4, label: 'Jue' },
    { day: 5, label: 'Vie' },
    { day: 6, label: 'Sáb' },
  ];

  const toggleDay = (d: number) => {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  };

  const blockHours = useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (isNaN(sh) || isNaN(eh)) return 0;
    return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
  }, [startTime, endTime]);

  const hasFourHourBlock = blockHours >= 4;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dayNames = selectedDays
      .map((d) => dayOptions.find((o) => o.day === d)?.label)
      .filter(Boolean)
      .join(', ');
    const summary = `${dayNames} de ${startTime} a ${endTime} (${blockHours.toFixed(1)}h)${
      acceptingPatients ? ' · Recibe pacientes' : ''
    }${needsRecurringBlock ? ` · Bloque fijo (${preferredRoom})` : ''}`;
    void onSave(summary);
  }

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-[#E5EAE5] bg-white p-5 shadow-xs sm:p-6">
      <div className="flex items-center justify-between border-b border-[#F0F4F1] pb-3">
        <div>
          <h2 className="text-base font-bold text-[#34433F]">Mi Disponibilidad</h2>
          <p className="text-xs text-[#6D7C76]">
            Declarar disponibilidad orienta las derivaciones y no bloquea automáticamente un consultorio.
          </p>
        </div>
        {hasFourHourBlock && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
            <Sparkles className="h-3 w-3" />
            Bloque 4+ hs
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D] mb-2">
            Días de atención
          </label>
          <div className="grid grid-cols-6 gap-1.5">
            {dayOptions.map((item) => {
              const active = selectedDays.includes(item.day);
              return (
                <button
                  key={item.day}
                  type="button"
                  onClick={() => toggleDay(item.day)}
                  className={`rounded-xl py-2.5 text-xs font-bold border transition ${
                    active
                      ? 'border-[#46766B] bg-[#46766B] text-white'
                      : 'border-[#E5EAE5] bg-[#F9FBF9] text-[#6D7C76]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D] mb-1">
              Desde (24 hs)
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] px-3 py-2.5 text-sm font-bold text-[#34433F]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D] mb-1">
              Hasta (24 hs)
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] px-3 py-2.5 text-sm font-bold text-[#34433F]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <label className="flex items-center gap-2.5 rounded-2xl border border-[#E5EAE5] bg-[#FDFEFC] p-3 cursor-pointer text-xs font-semibold text-[#34433F]">
            <input
              type="checkbox"
              checked={acceptingPatients}
              onChange={(e) => setAcceptingPatients(e.target.checked)}
              className="h-4 w-4 accent-[#46766B]"
            />
            <span>Disponible para nuevos pacientes</span>
          </label>

          <label className="flex items-center gap-2.5 rounded-2xl border border-[#E5EAE5] bg-[#FDFEFC] p-3 cursor-pointer text-xs font-semibold text-[#34433F]">
            <input
              type="checkbox"
              checked={needsRecurringBlock}
              onChange={(e) => setNeedsRecurringBlock(e.target.checked)}
              className="h-4 w-4 accent-[#46766B]"
            />
            <span>Solicito bloque fijo semanal</span>
          </label>
        </div>

        {needsRecurringBlock && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D] mb-1">
              Consultorio de preferencia
            </label>
            <select
              value={preferredRoom}
              onChange={(e) => setPreferredRoom(e.target.value)}
              className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] px-3 py-2 text-xs font-bold text-[#34433F]"
            >
              <option value="Consultorio 1">Consultorio 1</option>
              <option value="Consultorio 2">Consultorio 2</option>
              <option value="Consultorio 3">Consultorio 3</option>
            </select>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-2xl bg-[#46766B] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#3B645B] active:scale-95"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Guardar disponibilidad</span>
          </button>
        </div>
      </form>
    </div>
  );
}
