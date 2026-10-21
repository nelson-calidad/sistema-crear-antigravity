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
  Layers,
  Search,
  Filter,
  Check,
  Info,
  ShieldCheck,
  ExternalLink,
  LayoutDashboard,
  Users,
  Wallet,
  Settings,
  ClipboardList,
  MessageCircle,
} from 'lucide-react';
import logo from '../assets/logo-crear.png';
import type { AppointmentRecord, ConfiguredRoom, TherapistAvailability } from '../types';
import {
  fetchAppointmentsFromSheets,
  subscribeToSheetsAppointments,
  bookAppointmentInSheets,
  cancelAppointmentInSheets,
  fetchRoomsFromSheets,
  fetchTherapistAvailabilitiesFromSheets,
  saveAvailabilityInSheets,
  isGoogleSheetsLive,
} from '../lib/googleSheetsService';
import { AuthUser, CREAR_TEAM, logoutUser } from '../lib/crearAuth';
import { QuickReservationModal } from './QuickReservationModal';
import { occursOn, type Slot } from '../lib/scheduling';

interface TherapistPortalProps {
  currentUser: AuthUser;
  onOpenAdminSuite?: (tab?: string) => void;
}

export function TherapistPortal({ currentUser, onOpenAdminSuite }: TherapistPortalProps) {
  // Navigation tabs: 'agenda' | 'my-bookings' | 'availability' | 'admin'
  const [activeTab, setActiveTab] = useState<'agenda' | 'my-bookings' | 'availability' | 'admin'>('agenda');

  // Appointments & Rooms
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [rooms, setRooms] = useState<ConfiguredRoom[]>([]);
  const [availabilities, setAvailabilities] = useState<TherapistAvailability[]>([]);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  
  // Date State for Agenda
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [currentDateStr, setCurrentDateStr] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentRecord | null>(null);
  const [modalPreselect, setModalPreselect] = useState<{ roomId?: string; date?: string; startTime?: string }>({});

  // Toast / Status Notices
  const [notice, setNotice] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Load Rooms, Appointments and Availabilities
  useEffect(() => {
    void fetchRoomsFromSheets().then(setRooms);
    void fetchTherapistAvailabilitiesFromSheets().then(setAvailabilities);

    const unsubscribe = subscribeToSheetsAppointments(
      (data) => setAppointments(data),
      (err) => pushNotice('error', `Error de sincronización con Google Sheets: ${err.message}`)
    );

    return () => unsubscribe();
  }, []);

  const pushNotice = (tone: 'success' | 'error' | 'info', message: string) => {
    setNotice({ tone, message });
    setTimeout(() => setNotice(null), 3800);
  };

  // Date Navigation Helpers
  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDateStr(new Date().toISOString().split('T')[0]);
      return;
    }
    const curr = new Date(`${currentDateStr}T12:00:00`);
    const delta = viewMode === 'day' ? 1 : 7;
    curr.setDate(curr.getDate() + (direction === 'next' ? delta : -delta));
    setCurrentDateStr(curr.toISOString().split('T')[0]);
  };

  // Week Dates for Week View
  const weekDates = useMemo(() => {
    const selected = new Date(`${currentDateStr}T12:00:00`);
    const dayOfWeek = selected.getDay(); // 0: Dom, 1: Lun
    const monday = new Date(selected);
    monday.setDate(selected.getDate() - ((dayOfWeek + 6) % 7));

    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i); // Lun a Sáb
      return d.toISOString().split('T')[0];
    });
  }, [currentDateStr]);

  // Filtered appointments for current date / range
  const activeAppointmentsOnDate = (date: string) => {
    return appointments.filter((app) => {
      if (app.status === 'cancelled') return false;
      return occursOn(app as Slot, date);
    });
  };

  // Therapist's Own Bookings
  const myAppointments = useMemo(() => {
    return appointments
      .filter((app) => app.professionalId === currentUser.id && app.status !== 'cancelled')
      .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  }, [appointments, currentUser.id]);

  // Handler for saving/cancelling appointment in Google Sheets
  const handleSaveAppointment = async (record: Partial<AppointmentRecord>) => {
    try {
      await bookAppointmentInSheets(record);
      pushNotice('success', '¡Reserva de consultorio guardada en Google Sheets!');
      void fetchRoomsFromSheets().then(setRooms);
    } catch (err) {
      pushNotice('error', err instanceof Error ? err.message : 'No se pudo guardar la reserva.');
      throw err;
    }
  };

  const handleCancelAppointment = async (id: string) => {
    try {
      await cancelAppointmentInSheets(id);
      pushNotice('success', 'La reserva fue cancelada en Google Sheets.');
    } catch (err) {
      pushNotice('error', err instanceof Error ? err.message : 'No se pudo cancelar.');
      throw err;
    }
  };

  // Fast booking shortcut
  const handleOpenBooking = (roomId?: string, date?: string, startTime?: string) => {
    setEditingAppointment(null);
    setModalPreselect({
      roomId: roomId || (selectedRoomFilter !== 'all' ? selectedRoomFilter : rooms[0]?.id),
      date: date || currentDateStr,
      startTime: startTime || '14:00',
    });
    setIsModalOpen(true);
  };

  const handleEditBooking = (app: AppointmentRecord) => {
    // Only creator, matching therapist or admin can edit
    if (currentUser.role !== 'admin' && app.professionalId !== currentUser.id) {
      pushNotice('info', 'Esta reserva pertenece a otra terapeuta. Solo podés ver los detalles.');
      return;
    }
    setEditingAppointment(app);
    setIsModalOpen(true);
  };

  // Helper color map for soft pastels
  const getTherapistColor = (therapistId?: string) => {
    const palette = [
      'bg-[#E8F3EE] text-[#245244] border-[#CCE3D8]', // mint sage
      'bg-[#FEF3E7] text-[#7A4B1A] border-[#FADBB8]', // peach
      'bg-[#EDF4FA] text-[#1D4A6E] border-[#CFE2F4]', // soft sky
      'bg-[#F5EDFA] text-[#5C2B74] border-[#E8D4F4]', // soft lavender
      'bg-[#FDF9E7] text-[#6E5B10] border-[#F5EAB7]', // soft butter
      'bg-[#FCEEF2] text-[#78233C] border-[#F7CDD8]', // soft rose
    ];
    if (!therapistId) return palette[0];
    const index = Math.abs(therapistId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % palette.length;
    return palette[index];
  };

  // Formatted date string in Spanish
  const formattedHeaderDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date(`${currentDateStr}T12:00:00`));
    } catch {
      return currentDateStr;
    }
  }, [currentDateStr]);

  return (
    <div className="min-h-dvh flex flex-col bg-[#F9F8F5] text-[#34433F] antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#E5EAE5] bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          {/* Logo & Space Name */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="CREAR" className="h-10 w-auto object-contain sm:h-11" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-[#34433F]">CREAR</span>
                <span className="hidden rounded-full bg-[#E8F3EE] px-2 py-0.5 text-[10px] font-bold text-[#46766B] sm:inline-block">
                  Espacio Terapéutico
                </span>
              </div>
              <p className="text-xs text-[#6D7C76]">Gestión de Turnos y Consultorios</p>
            </div>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2.5">
            {currentUser.role === 'admin' && onOpenAdminSuite && (
              <button
                type="button"
                onClick={() => onOpenAdminSuite('dashboard')}
                className="flex items-center gap-1.5 rounded-2xl bg-[#A36224] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#8A521D] active:scale-95"
                title="Acceder al Panel Administrativo General con las 9 pantallas"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Panel Administrativo Completo</span>
                <span className="sm:hidden">Panel Completo</span>
              </button>
            )}

            <div className="flex items-center gap-2 rounded-2xl border border-[#E5EAE5] bg-[#F9FBF9] py-1.5 px-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#46766B] font-bold text-xs text-white">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold leading-tight text-[#34433F]">{currentUser.name}</p>
                <p className="text-[10px] text-[#6D7C76]">
                  {currentUser.role === 'admin' ? 'Responsable CREAR' : currentUser.specialty || 'Terapeuta'}
                </p>
              </div>
            </div>

            <button
              onClick={() => logoutUser()}
              title="Cerrar sesión"
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#E5EAE5] bg-white text-[#6D7C76] transition hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Navigation: Agenda | Mis reservas | Mi disponibilidad | [Administración] */}
        <nav className="mx-auto mt-2 flex max-w-7xl gap-1 overflow-x-auto pb-1 custom-scrollbar">
          <button
            onClick={() => setActiveTab('agenda')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'agenda'
                ? 'bg-[#46766B] text-white shadow-xs'
                : 'text-[#6D7C76] hover:bg-[#EEF2EE] hover:text-[#34433F]'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Agenda</span>
          </button>

          <button
            onClick={() => setActiveTab('my-bookings')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'my-bookings'
                ? 'bg-[#46766B] text-white shadow-xs'
                : 'text-[#6D7C76] hover:bg-[#EEF2EE] hover:text-[#34433F]'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Mis reservas</span>
            {myAppointments.length > 0 && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                activeTab === 'my-bookings' ? 'bg-white/30 text-white' : 'bg-[#E5EAE5] text-[#34433F]'
              }`}>
                {myAppointments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('availability')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'availability'
                ? 'bg-[#46766B] text-white shadow-xs'
                : 'text-[#6D7C76] hover:bg-[#EEF2EE] hover:text-[#34433F]'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Mi disponibilidad</span>
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'admin'
                  ? 'bg-[#A36224] text-white shadow-xs'
                  : 'text-[#A36224] bg-[#FDF7F0] border border-[#FADBB8] hover:bg-[#F9EDE0]'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Administración</span>
            </button>
          )}
        </nav>
      </header>

      {/* Toast Notice */}
      {notice && (
        <div className="fixed bottom-5 right-5 z-50 animate-[slideUp_.2s_ease-out]">
          <div className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 shadow-lg text-xs font-bold ${
            notice.tone === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : notice.tone === 'error'
              ? 'border-rose-300 bg-rose-50 text-rose-900'
              : 'border-sky-300 bg-sky-50 text-sky-900'
          }`}>
            {notice.tone === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4" />}
            <span>{notice.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 p-3 sm:p-6">
        {/* ========================================================================= */}
        {/* TAB 1: AGENDA DE CONSULTORIOS */}
        {/* ========================================================================= */}
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            {/* Top Agenda Controls: Date navigation & Filters */}
            <div className="flex flex-col gap-3 rounded-3xl border border-[#E5EAE5] bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              {/* Date Selector & Prev/Next */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-2xl border border-[#DDE3DF] bg-[#F9FBF9] p-1">
                  <button
                    onClick={() => navigateDate('prev')}
                    className="rounded-xl p-1.5 text-[#52635D] hover:bg-[#EAEFEA]"
                    title="Anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigateDate('today')}
                    className="px-2.5 py-1 text-xs font-bold text-[#34433F] hover:bg-[#EAEFEA] rounded-xl"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => navigateDate('next')}
                    className="rounded-xl p-1.5 text-[#52635D] hover:bg-[#EAEFEA]"
                    title="Siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Date input picker */}
                <input
                  type="date"
                  value={currentDateStr}
                  onChange={(e) => setCurrentDateStr(e.target.value)}
                  className="rounded-2xl border border-[#DDE3DF] bg-[#F9FBF9] px-3 py-1.5 text-xs font-semibold text-[#34433F]"
                />

                <span className="text-xs font-bold capitalize text-[#46766B] px-1">
                  {formattedHeaderDate}
                </span>
              </div>

              {/* View Switch (Day / Week) & Room Filter & Fast Action */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Day / Week Toggle */}
                <div className="flex rounded-2xl border border-[#DDE3DF] bg-[#F9FBF9] p-1">
                  <button
                    onClick={() => setViewMode('day')}
                    className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                      viewMode === 'day' ? 'bg-[#46766B] text-white' : 'text-[#6D7C76]'
                    }`}
                  >
                    Día
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                      viewMode === 'week' ? 'bg-[#46766B] text-white' : 'text-[#6D7C76]'
                    }`}
                  >
                    Semana
                  </button>
                </div>

                {/* Room selector */}
                <select
                  value={selectedRoomFilter}
                  onChange={(e) => setSelectedRoomFilter(e.target.value)}
                  className="rounded-2xl border border-[#DDE3DF] bg-[#F9FBF9] px-3 py-1.5 text-xs font-semibold text-[#34433F]"
                >
                  <option value="all">Todos los consultorios</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name.split('—')[0].trim()}
                    </option>
                  ))}
                </select>

                {/* Primary Booking Button */}
                <button
                  onClick={() => handleOpenBooking()}
                  className="flex items-center gap-1.5 rounded-2xl bg-[#46766B] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#3B645B] active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  <span>Reservar</span>
                </button>
              </div>
            </div>

            {/* Room Tabs / Badges on Mobile */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedRoomFilter('all')}
                className={`rounded-2xl border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                  selectedRoomFilter === 'all'
                    ? 'border-[#46766B] bg-[#E8F3EE] text-[#245244]'
                    : 'border-[#E5EAE5] bg-white text-[#6D7C76]'
                }`}
              >
                Todos ({rooms.length})
              </button>
              {rooms.map((r) => {
                const isSelected = selectedRoomFilter === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoomFilter(r.id)}
                    className={`rounded-2xl border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                      isSelected
                        ? 'border-[#46766B] bg-[#E8F3EE] text-[#245244]'
                        : 'border-[#E5EAE5] bg-white text-[#6D7C76]'
                    }`}
                  >
                    {r.name.split('—')[0].trim()}
                  </button>
                );
              })}
            </div>

            {/* ================= DAY VIEW ================= */}
            {viewMode === 'day' && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {rooms
                  .filter((room) => selectedRoomFilter === 'all' || selectedRoomFilter === room.id)
                  .map((room) => {
                    const dayBookings = activeAppointmentsOnDate(currentDateStr)
                      .filter((app) => app.roomId === room.id)
                      .sort((a, b) => a.start.localeCompare(b.start));

                    return (
                      <div
                        key={room.id}
                        className="flex flex-col rounded-3xl border border-[#E5EAE5] bg-white p-4 shadow-xs"
                      >
                        {/* Consultorio Card Header */}
                        <div className="flex items-start justify-between border-b border-[#F0F4F1] pb-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <DoorOpen className="h-4 w-4 text-[#46766B]" />
                              <h3 className="font-bold text-sm text-[#34433F]">
                                {room.name}
                              </h3>
                            </div>
                            <p className="mt-0.5 text-xs text-[#6D7C76]">
                              {room.description || 'Consultorio CREAR'}
                            </p>
                          </div>
                          <span className={`rounded-xl px-2 py-0.5 text-[10px] font-bold ${
                            dayBookings.length > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {dayBookings.length > 0 ? `${dayBookings.length} reservas` : 'Libre'}
                          </span>
                        </div>

                        {/* List of Occupied Slots */}
                        <div className="mt-3 flex-1 space-y-2">
                          {dayBookings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D2E2D9] bg-[#F7FAF8] p-6 text-center">
                              <Sparkles className="h-6 w-6 text-[#46766B]/50" />
                              <p className="mt-2 text-xs font-bold text-[#46766B]">
                                Consultorio disponible todo el día
                              </p>
                              <p className="text-[11px] text-[#6D7C76]">
                                Podés reservar cualquier horario para tu atención.
                              </p>
                              <button
                                onClick={() => handleOpenBooking(room.id, currentDateStr, '14:00')}
                                className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#46766B] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#3B645B]"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Reservar aquí</span>
                              </button>
                            </div>
                          ) : (
                            dayBookings.map((app) => {
                              const therapist = CREAR_TEAM.find((t) => t.id === app.professionalId);
                              const isMine = app.professionalId === currentUser.id;
                              const canManage = isMine || currentUser.role === 'admin';
                              const softColor = getTherapistColor(app.professionalId);

                              return (
                                <div
                                  key={app.id}
                                  onClick={() => canManage && handleEditBooking(app)}
                                  className={`rounded-2xl border p-3.5 transition ${softColor} ${
                                    canManage ? 'cursor-pointer hover:shadow-sm' : ''
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="h-3.5 w-3.5 opacity-80" />
                                      <span className="font-mono font-bold text-xs">
                                        {app.start} – {app.end}
                                      </span>
                                    </div>
                                    {app.recurrence === 'weekly' && (
                                      <span className="rounded-lg bg-black/5 px-1.5 py-0.5 text-[9px] font-bold">
                                        Semanal
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-black/10 font-bold text-[10px]">
                                      {(therapist?.name || app.title || 'T').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-black">
                                        {therapist?.name || app.title}
                                        {isMine && <span className="ml-1 text-[10px] font-medium opacity-75">(Tu reserva)</span>}
                                      </p>
                                      <p className="truncate text-[10px] opacity-80">
                                        {app.patient || therapist?.specialty || 'Turno confirmado'}
                                      </p>
                                    </div>
                                  </div>

                                  {canManage && (
                                    <div className="mt-2 flex justify-end gap-2 border-t border-black/5 pt-1.5 text-[10px]">
                                      <span className="font-bold opacity-70 flex items-center gap-1">
                                        <Edit2 className="h-3 w-3" /> Tocar para modificar
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Quick action to add a slot to this specific room */}
                        {dayBookings.length > 0 && (
                          <button
                            onClick={() => handleOpenBooking(room.id, currentDateStr)}
                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#D2E2D9] py-2 text-xs font-semibold text-[#46766B] hover:bg-[#F4F9F6]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Sumar turno en este consultorio</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {/* ================= WEEK VIEW ================= */}
            {viewMode === 'week' && (
              <div className="overflow-x-auto rounded-3xl border border-[#E5EAE5] bg-white p-4 shadow-xs">
                <div className="grid grid-cols-6 gap-3 min-w-[760px]">
                  {weekDates.map((dateStr) => {
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    const dayBookings = activeAppointmentsOnDate(dateStr).filter(
                      (app) => selectedRoomFilter === 'all' || app.roomId === selectedRoomFilter
                    );

                    const dayTitle = new Intl.DateTimeFormat('es-AR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    }).format(new Date(`${dateStr}T12:00:00`));

                    return (
                      <div
                        key={dateStr}
                        className={`flex flex-col rounded-2xl border p-3 ${
                          isToday ? 'border-[#46766B] bg-[#F7FAF8]' : 'border-[#EAEFEA] bg-[#FDFFFD]'
                        }`}
                      >
                        {/* Day Header */}
                        <div className="border-b border-[#EAEFEA] pb-2 text-center">
                          <p className={`text-xs font-black capitalize ${isToday ? 'text-[#46766B]' : 'text-[#34433F]'}`}>
                            {dayTitle}
                          </p>
                          <p className="text-[10px] text-[#6D7C76]">
                            {dayBookings.length} {dayBookings.length === 1 ? 'turno' : 'turnos'}
                          </p>
                        </div>

                        {/* Bookings on this day */}
                        <div className="mt-2.5 flex-1 space-y-2">
                          {dayBookings.map((app) => {
                            const therapist = CREAR_TEAM.find((t) => t.id === app.professionalId);
                            const softColor = getTherapistColor(app.professionalId);
                            const isMine = app.professionalId === currentUser.id;
                            const canManage = isMine || currentUser.role === 'admin';

                            return (
                              <div
                                key={app.id}
                                onClick={() => canManage && handleEditBooking(app)}
                                className={`rounded-xl border p-2 text-left transition text-[11px] ${softColor} ${
                                  canManage ? 'cursor-pointer hover:opacity-90' : ''
                                }`}
                              >
                                <div className="font-mono font-bold text-[10px]">
                                  {app.start}–{app.end}
                                </div>
                                <div className="truncate font-black">{therapist?.name || app.title}</div>
                                <div className="truncate text-[9px] opacity-75">
                                  {rooms.find((r) => r.id === app.roomId)?.name.split('—')[0].trim() || app.roomId}
                                </div>
                              </div>
                            );
                          })}

                          {dayBookings.length === 0 && (
                            <p className="py-4 text-center text-[11px] text-[#889892]">Sin reservas</p>
                          )}
                        </div>

                        <button
                          onClick={() => handleOpenBooking(undefined, dateStr)}
                          className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[#CCDCD2] py-1 text-[11px] font-semibold text-[#46766B] hover:bg-[#EEF5F1]"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Reservar</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MIS RESERVAS */}
        {/* ========================================================================= */}
        {activeTab === 'my-bookings' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 rounded-3xl border border-[#E5EAE5] bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#34433F]">Mis reservas de consultorio</h2>
                <p className="text-xs text-[#6D7C76]">
                  Listado de tus turnos confirmados y recurrentes en CREAR.
                </p>
              </div>
              <button
                onClick={() => handleOpenBooking()}
                className="flex items-center gap-2 rounded-2xl bg-[#46766B] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#3B645B]"
              >
                <Plus className="h-4 w-4" />
                <span>Nueva reserva</span>
              </button>
            </div>

            {myAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#D2E2D9] bg-white p-12 text-center">
                <Clock className="h-10 w-10 text-[#46766B]/40" />
                <h3 className="mt-3 text-base font-bold text-[#34433F]">No tenés reservas registradas</h3>
                <p className="mt-1 text-xs text-[#6D7C76] max-w-sm">
                  Consultá la agenda para ver los consultorios disponibles y reservar tus horarios de atención.
                </p>
                <button
                  onClick={() => handleOpenBooking()}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#46766B] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#3B645B]"
                >
                  <Plus className="h-4 w-4" />
                  <span>Reservar ahora</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {myAppointments.map((app) => {
                  const room = rooms.find((r) => r.id === app.roomId);
                  const isWeekly = app.recurrence === 'weekly';

                  return (
                    <div
                      key={app.id}
                      className="flex flex-col justify-between rounded-3xl border border-[#E5EAE5] bg-white p-5 shadow-xs transition hover:border-[#46766B]"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded-xl bg-[#E8F3EE] px-2.5 py-1 text-xs font-bold text-[#245244]">
                            {room?.name.split('—')[0].trim() || 'Consultorio'}
                          </span>
                          {isWeekly && (
                            <span className="rounded-xl bg-purple-100 px-2.5 py-1 text-[10px] font-bold text-purple-800">
                              Semanal
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-1">
                          <div className="flex items-center gap-2 text-sm font-bold text-[#34433F]">
                            <Calendar className="h-4 w-4 text-[#46766B]" />
                            <span>{app.date}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-xs font-semibold text-[#52635D]">
                            <Clock className="h-4 w-4 text-[#46766B]" />
                            <span>{app.start} a {app.end}</span>
                          </div>
                          {app.patient && (
                            <p className="mt-2 text-xs text-[#6D7C76]">
                              Referencia: <strong className="text-[#34433F]">{app.patient}</strong>
                            </p>
                          )}
                          {isWeekly && app.untilDate && (
                            <p className="text-[11px] text-[#889892]">
                              Hasta el: {app.untilDate}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#F0F4F1] pt-3">
                        <button
                          onClick={() => handleCancelAppointment(app.id)}
                          className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Cancelar</span>
                        </button>
                        <button
                          onClick={() => handleEditBooking(app)}
                          className="flex items-center gap-1 rounded-xl bg-[#46766B] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#3B645B]"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Modificar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MI DISPONIBILIDAD */}
        {/* ========================================================================= */}
        {activeTab === 'availability' && (
          <TherapistAvailabilitySection
            currentUser={currentUser}
            onSaved={() => {
              void fetchTherapistAvailabilitiesFromSheets().then(setAvailabilities);
              pushNotice('success', 'Tu disponibilidad se guardó correctamente.');
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PANEL DE ADMINISTRACIÓN (SOLO RESPONSABLES) */}
        {/* ========================================================================= */}
        {activeTab === 'admin' && currentUser.role === 'admin' && (
          <AdminOverviewSection
            rooms={rooms}
            appointments={appointments}
            availabilities={availabilities}
            currentDateStr={currentDateStr}
            onEditAppointment={handleEditBooking}
            onCancelAppointment={handleCancelAppointment}
            onOpenFullAdmin={onOpenAdminSuite}
          />
        )}
      </main>

      {/* Quick Reservation Modal */}
      <QuickReservationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUser={currentUser}
        rooms={rooms}
        appointments={appointments}
        initialData={editingAppointment}
        initialRoomId={modalPreselect.roomId}
        initialDate={modalPreselect.date}
        initialStartTime={modalPreselect.startTime}
        onSave={handleSaveAppointment}
        onDelete={handleCancelAppointment}
      />
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: MI DISPONIBILIDAD
// =========================================================================
function TherapistAvailabilitySection({
  currentUser,
  onSaved,
}: {
  currentUser: AuthUser;
  onSaved: () => void;
}) {
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5]); // Lun a Vie
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('20:00');
  const [acceptingPatients, setAcceptingPatients] = useState(true);
  const [needsRecurringBlock, setNeedsRecurringBlock] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  // Load existing availability
  useEffect(() => {
    void fetchTherapistAvailabilitiesFromSheets().then((list) => {
      const existing = list.find((item) => item.therapistId === currentUser.id);
      if (existing) {
        setActiveDays(existing.activeDays || [1, 2, 3, 4, 5]);
        setStartTime(existing.startTime || '14:00');
        setEndTime(existing.endTime || '20:00');
        setAcceptingPatients(existing.acceptingPatients);
        setNeedsRecurringBlock(existing.needsRecurringBlock);
        setNotes(existing.notes || '');
      }
    });
  }, [currentUser.id]);

  const toggleDay = (day: number) => {
    setActiveDays((curr) =>
      curr.includes(day) ? curr.filter((d) => d !== day) : [...curr, day].sort()
    );
  };

  // Block duration analysis (Calculates continuous hours)
  const blockHours = useMemo(() => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    if (isNaN(startH) || isNaN(endH)) return 0;
    const diffMins = endH * 60 + endM - (startH * 60 + startM);
    return diffMins > 0 ? diffMins / 60 : 0;
  }, [startTime, endTime]);

  const hasFourHourBlock = blockHours >= 4;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const summaryText = `${activeDays.map(d => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]).join(', ')} de ${startTime} a ${endTime}${acceptingPatients ? ' (Acepta nuevos pacientes)' : ''}${notes ? ' - ' + notes : ''}`;
      
      await saveAvailabilityInSheets(currentUser.id, summaryText);
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  const dayNames = [
    { id: 1, label: 'Lunes' },
    { id: 2, label: 'Martes' },
    { id: 3, label: 'Miércoles' },
    { id: 4, label: 'Jueves' },
    { id: 5, label: 'Viernes' },
    { id: 6, label: 'Sábado' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Informative Guidance Banner */}
      <div className="rounded-3xl border border-[#D5E6DC] bg-[#EEF7F2] p-5 text-[#245244] shadow-xs">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 shrink-0 text-[#46766B] mt-0.5" />
          <div className="text-xs space-y-1">
            <strong className="block text-sm font-bold text-[#1D3E35]">
              Diferencia importante entre Disponibilidad y Reserva
            </strong>
            <p>
              Indicar tus horarios y días de trabajo en este apartado es una declaración informativa para que las responsables de CREAR conozcan tu capacidad y puedan derivarte pacientes.
            </p>
            <p className="font-semibold text-[#1D3E35]">
              ⚠️ Declarar tu disponibilidad NO reserva automáticamente un consultorio. Para asegurar el espacio físico, recordá registrar siempre tu reserva en la Agenda.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="rounded-3xl border border-[#E5EAE5] bg-white p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#34433F]">Mi disponibilidad horaria</h2>
          <p className="text-xs text-[#6D7C76]">
            Configurá los días y franjas en las que podés brindar atención en CREAR.
          </p>
        </div>

        {/* Días de la semana */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D] mb-2">
            Días en los que trabajás
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {dayNames.map((d) => {
              const isSelected = activeDays.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(d.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition ${
                    isSelected
                      ? 'border-[#46766B] bg-[#E8F3EE] text-[#245244] ring-2 ring-[#46766B]/20'
                      : 'border-[#E5EAE5] bg-[#FAFCFA] text-[#6D7C76] hover:bg-[#F4F9F6]'
                  }`}
                >
                  <span>{d.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-[#46766B] mt-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Horario de inicio y fin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D] mb-1.5">
              Horario habitual de inicio
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] px-4 py-3 text-sm font-semibold text-[#34433F] focus:border-[#46766B] focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D] mb-1.5">
              Horario habitual de finalización
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] px-4 py-3 text-sm font-semibold text-[#34433F] focus:border-[#46766B] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Visual Analysis: 4-Hour Blocks Detection */}
        <div className="rounded-2xl border border-[#E5EAE5] bg-[#F9FBF9] p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#52635D] uppercase tracking-wider">
                Análisis de Bloque Continuo
              </span>
              <p className="text-sm font-black text-[#34433F]">
                Franja diaria declarada: {blockHours.toFixed(1)} horas ({startTime} a {endTime})
              </p>
            </div>
            {hasFourHourBlock ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Bloque de 4+ horas detectado
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                Menor a 4 horas
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-[#6D7C76]">
            {hasFourHourBlock
              ? '✨ Excelente: tu franja cubre un bloque continuo ideal para agrupar sesiones o coordinar turnos fijos.'
              : 'Podés ampliar tu horario si deseás cubrir una jornada completa o un bloque continuo de 4 horas.'}
          </p>
        </div>

        {/* Toggles: Incorporar pacientes y Bloque recurrente */}
        <div className="space-y-3 border-t border-[#EAEFEA] pt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptingPatients}
              onChange={(e) => setAcceptingPatients(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#46766B] focus:ring-[#46766B]"
            />
            <div>
              <span className="text-sm font-semibold text-[#34433F]">
                Disponible para incorporar nuevos pacientes
              </span>
              <p className="text-xs text-[#6D7C76]">
                Indica a las coordinadoras que tenés cupo para recibir derivaciones o admisiones.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={needsRecurringBlock}
              onChange={(e) => setNeedsRecurringBlock(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#46766B] focus:ring-[#46766B]"
            />
            <div>
              <span className="text-sm font-semibold text-[#34433F]">
                Necesito reservar consultorio en bloque recurrente
              </span>
              <p className="text-xs text-[#6D7C76]">
                Informa a la administración que solicitás tener el consultorio reservado de forma fija semana a semana.
              </p>
            </div>
          </label>
        </div>

        {/* Observaciones o notas adicionales */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D] mb-1.5">
            Observaciones o aclaraciones de disponibilidad
          </label>
          <textarea
            rows={3}
            placeholder="Ej.: Los martes puedo atender hasta las 18:00; los viernes priorizo evaluaciones..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] p-3 text-xs text-[#34433F] focus:border-[#46766B] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 rounded-2xl bg-[#46766B] px-6 py-3 text-xs font-bold text-white shadow-xs hover:bg-[#3B645B] active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{busy ? 'Guardando...' : 'Guardar mi disponibilidad'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENT: PANEL DE ADMINISTRACIÓN (SOLO LAS 4 RESPONSABLES)
// =========================================================================
function AdminOverviewSection({
  rooms,
  appointments,
  availabilities,
  currentDateStr,
  onEditAppointment,
  onCancelAppointment,
  onOpenFullAdmin,
}: {
  rooms: ConfiguredRoom[];
  appointments: AppointmentRecord[];
  availabilities: TherapistAvailability[];
  currentDateStr: string;
  onEditAppointment: (app: AppointmentRecord) => void;
  onCancelAppointment: (id: string) => void;
  onOpenFullAdmin?: (tab?: string) => void;
}) {
  const [filterDate, setFilterDate] = useState(currentDateStr);

  // Active appointments on selected date
  const dayAppointments = useMemo(() => {
    return appointments.filter((app) => {
      if (app.status === 'cancelled') return false;
      return occursOn(app as Slot, filterDate);
    });
  }, [appointments, filterDate]);

  // Detected free gaps calculation for each room (08:00 to 20:00)
  const roomOccupancyStats = useMemo(() => {
    return rooms.map((room) => {
      const roomBookings = dayAppointments
        .filter((app) => app.roomId === room.id)
        .sort((a, b) => a.start.localeCompare(b.start));

      // Calculate simple free spaces
      const freeGaps: string[] = [];
      let cursor = '08:00';

      roomBookings.forEach((b) => {
        if (cursor < b.start) {
          freeGaps.push(`${cursor} a ${b.start}`);
        }
        if (b.end > cursor) {
          cursor = b.end;
        }
      });

      if (cursor < '20:00') {
        freeGaps.push(`${cursor} a 20:00`);
      }

      return {
        room,
        bookings: roomBookings,
        freeGaps,
      };
    });
  }, [rooms, dayAppointments]);

  return (
    <div className="space-y-6">
      {/* Admin Header with Link to Full Administrative Suite */}
      <div className="flex flex-col gap-3 rounded-3xl border border-[#FADBB8] bg-[#FDF9F5] p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#A36224] px-2.5 py-0.5 text-[10px] font-black text-white uppercase">
              Acceso Exclusivo Responsables
            </span>
            <h2 className="text-xl font-bold text-[#34433F]">Supervisión de Consultorios y Turnos</h2>
          </div>
          <p className="mt-1 text-xs text-[#6D7C76]">
            Monitoreo en tiempo real de ocupación, detección de espacios disponibles y disponibilidades de terapeutas.
          </p>
        </div>

        {onOpenFullAdmin && (
          <button
            onClick={() => onOpenFullAdmin('dashboard')}
            className="flex items-center gap-2 rounded-2xl border border-[#A36224] bg-white px-4 py-2.5 text-xs font-bold text-[#A36224] shadow-xs hover:bg-[#F9EDE0]"
          >
            <span>Ver Panel Administrativo Completo</span>
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Selector de Pantallas Administrativas de CREAR */}
      {onOpenFullAdmin && (
        <div className="rounded-3xl border border-[#E5EAE5] bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-center justify-between border-b border-[#F0F4F1] pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#A36224]">
                Módulos del Sistema CREAR
              </p>
              <h3 className="text-base font-bold text-[#34433F]">
                Acceso directo a las pantallas de gestión institucional
              </h3>
            </div>
            <button
              onClick={() => onOpenFullAdmin('dashboard')}
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#A36224] hover:underline"
            >
              <span>Abrir vista general</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => onOpenFullAdmin('dashboard')}
              className="flex flex-col items-start rounded-2xl border border-[#E5EAE5] bg-[#FDFEFC] p-3.5 text-left transition hover:border-[#46766B] hover:bg-[#F4F9F6] group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-[#46766B] group-hover:text-white transition">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <p className="mt-2 text-xs font-bold text-[#34433F]">Inicio / Métricas</p>
              <p className="text-[10px] text-[#6D7C76] line-clamp-1">Visión general y accesos</p>
            </button>

            <button
              type="button"
              onClick={() => onOpenFullAdmin('rooms')}
              className="flex flex-col items-start rounded-2xl border border-[#E5EAE5] bg-[#FDFEFC] p-3.5 text-left transition hover:border-[#46766B] hover:bg-[#F4F9F6] group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-800 group-hover:bg-[#46766B] group-hover:text-white transition">
                <DoorOpen className="h-4 w-4" />
              </div>
              <p className="mt-2 text-xs font-bold text-[#34433F]">Consultorios</p>
              <p className="text-[10px] text-[#6D7C76] line-clamp-1">Salas, acuerdos y alquileres</p>
            </button>

            <button
              type="button"
              onClick={() => onOpenFullAdmin('professionals')}
              className="flex flex-col items-start rounded-2xl border border-[#E5EAE5] bg-[#FDFEFC] p-3.5 text-left transition hover:border-[#46766B] hover:bg-[#F4F9F6] group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-800 group-hover:bg-[#46766B] group-hover:text-white transition">
                <Users className="h-4 w-4" />
              </div>
              <p className="mt-2 text-xs font-bold text-[#34433F]">Profesionales</p>
              <p className="text-[10px] text-[#6D7C76] line-clamp-1">Fichas, equipo y datos</p>
            </button>

            <button
              type="button"
              onClick={() => onOpenFullAdmin('finance')}
              className="flex flex-col items-start rounded-2xl border border-[#E5EAE5] bg-[#FDFEFC] p-3.5 text-left transition hover:border-[#46766B] hover:bg-[#F4F9F6] group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 group-hover:bg-[#46766B] group-hover:text-white transition">
                <Wallet className="h-4 w-4" />
              </div>
              <p className="mt-2 text-xs font-bold text-[#34433F]">Finanzas</p>
              <p className="text-[10px] text-[#6D7C76] line-clamp-1">Aranceles, caja y balance</p>
            </button>

            <button
              type="button"
              onClick={() => onOpenFullAdmin('admissions')}
              className="flex flex-col items-start rounded-2xl border border-[#E5EAE5] bg-[#FDFEFC] p-3.5 text-left transition hover:border-[#46766B] hover:bg-[#F4F9F6] group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 group-hover:bg-[#46766B] group-hover:text-white transition">
                <MessageCircle className="h-4 w-4" />
              </div>
              <p className="mt-2 text-xs font-bold text-[#34433F]">Admisiones</p>
              <p className="text-[10px] text-[#6D7C76] line-clamp-1">Consultas y entrevistas</p>
            </button>

            <button
              type="button"
              onClick={() => onOpenFullAdmin('responsibilities')}
              className="flex flex-col items-start rounded-2xl border border-[#E5EAE5] bg-[#FDFEFC] p-3.5 text-left transition hover:border-[#46766B] hover:bg-[#F4F9F6] group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800 group-hover:bg-[#46766B] group-hover:text-white transition">
                <ClipboardList className="h-4 w-4" />
              </div>
              <p className="mt-2 text-xs font-bold text-[#34433F]">Responsabilidades</p>
              <p className="text-[10px] text-[#6D7C76] line-clamp-1">Organización y tareas</p>
            </button>

            <button
              type="button"
              onClick={() => onOpenFullAdmin('coverage')}
              className="flex flex-col items-start rounded-2xl border border-[#E5EAE5] bg-[#FDFEFC] p-3.5 text-left transition hover:border-[#46766B] hover:bg-[#F4F9F6] group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-800 group-hover:bg-[#46766B] group-hover:text-white transition">
                <CalendarDays className="h-4 w-4" />
              </div>
              <p className="mt-2 text-xs font-bold text-[#34433F]">Guardias CREAR</p>
              <p className="text-[10px] text-[#6D7C76] line-clamp-1">Planificador de guardia</p>
            </button>

            <button
              type="button"
              onClick={() => onOpenFullAdmin('settings')}
              className="flex flex-col items-start rounded-2xl border border-[#E5EAE5] bg-[#FDFEFC] p-3.5 text-left transition hover:border-[#46766B] hover:bg-[#F4F9F6] group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700 group-hover:bg-[#46766B] group-hover:text-white transition">
                <Settings className="h-4 w-4" />
              </div>
              <p className="mt-2 text-xs font-bold text-[#34433F]">Configuración</p>
              <p className="text-[10px] text-[#6D7C76] line-clamp-1">Ajustes y sincronización</p>
            </button>
          </div>
        </div>
      )}

      {/* Date Filter for Admin view */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-bold uppercase tracking-wider text-[#52635D]">
          Consultar fecha:
        </label>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-2xl border border-[#D5DDD7] bg-white px-3.5 py-1.5 text-xs font-bold text-[#34433F]"
        />
      </div>

      {/* 1. Ocupación de cada consultorio y Detección de Espacios Disponibles */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {roomOccupancyStats.map(({ room, bookings, freeGaps }) => (
          <div key={room.id} className="rounded-3xl border border-[#E5EAE5] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between border-b border-[#F0F4F1] pb-3">
                <div>
                  <h3 className="font-bold text-sm text-[#34433F]">{room.name}</h3>
                  <p className="text-[11px] text-[#6D7C76]">{bookings.length} reservas registradas hoy</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  bookings.length > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                }`}>
                  {bookings.length > 0 ? 'Ocupado parcial' : 'Totalmente libre'}
                </span>
              </div>

              {/* Free Gaps (Detección de espacios libres) */}
              <div className="mt-3 rounded-2xl bg-[#F7FAF8] border border-[#E2ECE5] p-3 text-xs">
                <span className="font-bold text-[#245244] block mb-1">
                  ✨ Espacios libres detectados:
                </span>
                {freeGaps.length === 0 ? (
                  <p className="text-[#889892]">Sin franjas libres en jornada</p>
                ) : (
                  <ul className="space-y-0.5 text-[11px] text-[#345C51]">
                    {freeGaps.map((gap, i) => (
                      <li key={i} className="flex items-center gap-1.5 font-medium">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Bookings List */}
              <div className="mt-3 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#889892] block">
                  Reservas del consultorio:
                </span>
                {bookings.length === 0 ? (
                  <p className="text-xs text-[#889892] py-2">No hay reservas cargadas para esta fecha.</p>
                ) : (
                  bookings.map((app) => {
                    const therapist = CREAR_TEAM.find((t) => t.id === app.professionalId);
                    return (
                      <div
                        key={app.id}
                        className="flex items-center justify-between rounded-xl border border-[#E5EAE5] bg-[#FAFCFA] p-2 text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-[#34433F]">
                            {app.start}–{app.end}
                          </span>
                          <p className="font-semibold text-[#46766B]">
                            {therapist?.name || app.title}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => onEditAppointment(app)}
                            className="rounded-lg p-1 text-[#6D7C76] hover:bg-[#EEF2EE]"
                            title="Modificar reserva"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onCancelAppointment(app.id)}
                            className="rounded-lg p-1 text-rose-600 hover:bg-rose-50"
                            title="Cancelar reserva"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Horarios y Disponibilidades Declaradas por las Terapeutas */}
      <div className="rounded-3xl border border-[#E5EAE5] bg-white p-6 shadow-xs">
        <h3 className="text-base font-bold text-[#34433F]">
          Disponibilidades registradas por el equipo de terapeutas
        </h3>
        <p className="text-xs text-[#6D7C76] mb-4">
          Permite a las cuatro coordinadoras organizar derivaciones, admisiones y reservas de espacios.
        </p>

        {availabilities.length === 0 ? (
          <p className="text-xs text-[#889892] py-4">
            Todavía no hay terapeutas que hayan guardado su disponibilidad en el módulo.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availabilities.map((item) => {
              const therapist = CREAR_TEAM.find((t) => t.id === item.therapistId);
              const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
              const activeDaysStr = item.activeDays.map((d) => dayLabels[d] || d).join(', ');

              return (
                <div key={item.id} className="rounded-2xl border border-[#E5EAE5] bg-[#FDFEFC] p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-[#F0F4F1] pb-2">
                    <strong className="text-sm font-bold text-[#34433F]">
                      {therapist?.name || item.therapistName || item.therapistId}
                    </strong>
                    <span className="text-[10px] text-[#6D7C76]">{therapist?.specialty || 'Terapeuta'}</span>
                  </div>

                  <p>
                    <span className="text-[#6D7C76]">Días:</span> <strong>{activeDaysStr || 'Sin definir'}</strong>
                  </p>
                  <p>
                    <span className="text-[#6D7C76]">Horario:</span> <strong>{item.startTime} a {item.endTime}</strong>
                  </p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.acceptingPatients && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Acepta pacientes
                      </span>
                    )}
                    {item.needsRecurringBlock && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                        Bloque recurrente requerido
                      </span>
                    )}
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-[#6D7C76] italic bg-[#F7FAF8] p-2 rounded-xl">
                      "{item.notes}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

