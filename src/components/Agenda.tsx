/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  format,
  isSameDay,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Calendar as CalendarIcon,
  Users,
  MapPin,
  Printer,
  RefreshCw,
  Repeat,
  User,
  DoorOpen,
  Filter,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, isAppointmentActiveOnDate, parseDay } from '../lib/utils';
import { AppointmentRecord } from '../types';
import { ROOMS } from '../constants';
import {
  buildDailyPdfHtml,
  buildMonthlyPdfHtml,
  buildWeeklyAvailabilityPdfHtml,
  openPrintableReport,
} from '../lib/appointmentPdf';
import { useProfessionals } from '../lib/professionalsStore';
import { forceRefreshAppointments } from '../lib/appointmentsStore';
import { agendaColumnId } from '../lib/agendaColumns';

const HOURS = Array.from({ length: 14 }, (_, i) => 8 + i);
const HOUR_HEIGHT = 68;
const DEFAULT_SESSION_DURATION = 45;
const MOBILE_HOURS_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];
const UNASSIGNED_COLUMN = {
  id: 'unassigned',
  name: 'Sin asignar',
  color: 'bg-slate-400 dark:bg-slate-600',
};

// Paleta pastel institucional coherente con el Portal de Terapeutas
const THERAPIST_PASTEL_COLORS: Record<string, string> = {
  ariadna: 'bg-[#E5F4EC] text-[#1D4E38] border-[#B9E2CD]',
  ivana: 'bg-[#E6F1FA] text-[#1E476B] border-[#BDD9F2]',
  dana: 'bg-[#F0EBF8] text-[#422B6B] border-[#D8C9F0]',
  romy: 'bg-[#FDF0E6] text-[#6B3A1E] border-[#F5D3B8]',
  barbie: 'bg-[#FCEBF1] text-[#6B213C] border-[#F5C6D7]',
  vero: 'bg-[#E6F6F4] text-[#1B524C] border-[#B6E3DE]',
};

function getTherapistPastel(proId?: string) {
  if (!proId) return 'bg-[#F2F6F4] text-[#2C4E44] border-[#CFE2D8]';
  return THERAPIST_PASTEL_COLORS[proId] || 'bg-[#F2F6F4] text-[#2C4E44] border-[#CFE2D8]';
}

type AgendaProps = {
  onOpenModal: (
    room?: string,
    pro?: string,
    app?: AppointmentRecord,
    options?: { date?: string; startTime?: string }
  ) => void;
  appointments: AppointmentRecord[];
  focusDate?: string | null;
  onOpenTherapistView?: () => void;
  onRefresh?: () => Promise<unknown>;
};

type CalendarColumn = {
  id: string;
  name: string;
  color?: string;
  date?: Date;
};

const getAppointmentName = (appointment: AppointmentRecord) => {
  const raw = appointment.patient?.trim() || appointment.title?.trim() || '';
  if (!raw || raw === 'Nueva Reserva') {
    return 'Sin nombre';
  }
  return raw;
};

const getAppointmentKind = (appointment: AppointmentRecord) =>
  appointment.kind || appointment.type || 'session';

const getTypeLabel = (kind?: string) => {
  if (kind === 'interview') return 'Entrevista';
  if (kind === 'block') return 'Reserva sala';
  return 'Sesión clínica';
};

const getTypeStyles = (kind?: string, proId?: string) => {
  if (kind === 'interview') {
    return 'bg-[#FEF6EC] text-[#7A4515] border-[#F2D7B8] hover:border-[#E8B880]';
  }
  if (kind === 'block') {
    return 'bg-[#F5F1FA] text-[#4F3677] border-[#DFD3F2] hover:border-[#C4B2E3]';
  }
  return getTherapistPastel(proId);
};

const parseTimeToMinutes = (value?: string) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const match = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return Number.POSITIVE_INFINITY;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return Number.POSITIVE_INFINITY;
  }
  return hours * 60 + minutes;
};

const formatMinutesToTime = (minutes: number) => {
  const safeMinutes = Math.max(minutes, 0);
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
};

const overlaps = (startA?: string, endA?: string, startB?: string, endB?: string) => {
  const startAMinutes = parseTimeToMinutes(startA);
  const endAMinutes = parseTimeToMinutes(endA);
  const startBMinutes = parseTimeToMinutes(startB);
  const endBMinutes = parseTimeToMinutes(endB);

  if ([startAMinutes, endAMinutes, startBMinutes, endBMinutes].some((value) => !Number.isFinite(value))) {
    return false;
  }
  return Math.max(startAMinutes, startBMinutes) < Math.min(endAMinutes, endBMinutes);
};

const sortByStart = (items: AppointmentRecord[]) =>
  [...items].sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'confirmed':
      return 'bg-emerald-500';
    case 'waiting':
      return 'bg-amber-400';
    case 'in-session':
      return 'bg-sky-500';
    case 'completed':
      return 'bg-slate-400';
    case 'cancelled':
      return 'bg-rose-400';
    default:
      return 'bg-emerald-400';
  }
};

const formatTimeOnly = (value?: string) => {
  if (!value) return '--:--';
  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }
  return String(value).slice(0, 5);
};

const resolveOverlaps = (appointments: AppointmentRecord[]) => {
  const sorted = [...appointments].sort(
    (a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start)
  );
  const columns: AppointmentRecord[][] = [];
  const layout = new Map<string, { colIndex: number; maxCols: number }>();

  sorted.forEach((app) => {
    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const lastApp = col[col.length - 1];
      if (!overlaps(lastApp.start, lastApp.end || lastApp.start, app.start, app.end || app.start)) {
        col.push(app);
        placed = true;
        layout.set(app.id, { colIndex: i, maxCols: 1 });
        break;
      }
    }
    if (!placed) {
      columns.push([app]);
      layout.set(app.id, { colIndex: columns.length - 1, maxCols: 1 });
    }
  });

  const totalCols = columns.length;
  for (const [id, info] of layout.entries()) {
    layout.set(id, { ...info, maxCols: totalCols });
  }

  return layout;
};

const getCoverageLabel = (appointment: AppointmentRecord) => appointment.coverageType || 'particular';

const formatDateEs = (date: Date, pattern: string) => format(date, pattern, { locale: es });

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const Agenda = ({
  onOpenModal,
  appointments,
  focusDate,
  onOpenTherapistView,
  onRefresh = forceRefreshAppointments,
}: AgendaProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'professionals' | 'rooms'>('rooms');
  const [timeMode, setTimeMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [filterProId, setFilterProId] = useState<string>('all');
  const [filterRoomId, setFilterRoomId] = useState<string>('all');
  const [showCancelled, setShowCancelled] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileRoomFilter, setMobileRoomFilter] = useState<string>('all');
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  const [professionals] = useProfessionals();
  const hasSyncedInitialDateRef = useRef(false);
  const dailyTimelineRef = useRef<HTMLDivElement | null>(null);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      if (!showCancelled && app.status === 'cancelled') return false;
      if (filterProId !== 'all' && (app.professionalId || app.proId) !== filterProId) return false;
      if (filterRoomId !== 'all' && app.roomId !== filterRoomId) return false;
      return true;
    });
  }, [appointments, filterProId, filterRoomId, showCancelled]);

  const weeklyAppointmentsByDay = useMemo(() => {
    if (timeMode !== 'weekly') return new Map<string, AppointmentRecord[]>();
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const map = new Map<string, AppointmentRecord[]>();
    days.forEach((day) => {
      const apps = sortByStart(
        filteredAppointments.filter((app) => isAppointmentActiveOnDate(app, day))
      );
      map.set(format(day, 'yyyy-MM-dd'), apps);
    });
    return map;
  }, [filteredAppointments, selectedDate, timeMode]);

  const getProfessionalName = (appointment: AppointmentRecord) => {
    const pro = professionals.find((p) => p.id === (appointment.professionalId || appointment.proId));
    return pro?.name || 'Sin profesional';
  };

  const getRoomName = (appointment: AppointmentRecord) => {
    const room = ROOMS.find((r) => r.id === appointment.roomId);
    return room?.name ? room.name.split('—')[0].trim() : 'Sin consultorio';
  };

  useEffect(() => {
    if (!focusDate) return;
    const parsed = parseDay(focusDate);
    if (!parsed) return;
    setSelectedDate(parsed);
    setTimeMode('daily');
    hasSyncedInitialDateRef.current = true;
  }, [focusDate]);

  useEffect(() => {
    if (hasSyncedInitialDateRef.current) return;
    const firstAppointment = [...appointments]
      .map((appointment) => ({ appointment, date: parseDay(appointment.date) }))
      .filter((entry): entry is { appointment: AppointmentRecord; date: Date } => Boolean(entry.date))
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

    if (!firstAppointment) return;
    setSelectedDate(firstAppointment.date);
    setTimeMode('daily');
    hasSyncedInitialDateRef.current = true;
  }, [appointments]);

  const selectedDateAppointments = useMemo(() => {
    return sortByStart(
      filteredAppointments.filter((appointment) =>
        isAppointmentActiveOnDate(appointment, selectedDate)
      )
    );
  }, [filteredAppointments, selectedDate]);

  const appointmentKindSummary = useMemo(() => {
    const summary = selectedDateAppointments.reduce(
      (acc, appointment) => {
        const kind = getAppointmentKind(appointment);
        acc.total += 1;
        if (kind === 'interview') acc.interview += 1;
        else if (kind === 'block') acc.block += 1;
        else acc.session += 1;
        return acc;
      },
      { total: 0, session: 0, interview: 0, block: 0 }
    );
    return summary;
  }, [selectedDateAppointments]);

  const resourceAvailability = useMemo(() => {
    if (viewMode === 'professionals') {
      const busyIds = new Set(
        selectedDateAppointments
          .filter((appointment) => appointment.professionalId || appointment.proId)
          .map((appointment) => appointment.professionalId || appointment.proId)
      );
      return {
        label: 'Profesionales libres',
        total: professionals.length,
        busy: busyIds.size,
        free: Math.max(professionals.length - busyIds.size, 0),
      };
    }

    const busyIds = new Set(
      selectedDateAppointments
        .filter((appointment) => appointment.roomId)
        .map((appointment) => appointment.roomId)
    );
    return {
      label: 'Consultorios libres',
      total: ROOMS.length,
      busy: busyIds.size,
      free: Math.max(ROOMS.length - busyIds.size, 0),
    };
  }, [professionals.length, selectedDateAppointments, viewMode]);

  const visibleRoomsOnMobile = useMemo(() => {
    if (mobileRoomFilter === 'all') return ROOMS;
    return ROOMS.filter((r) => r.id === mobileRoomFilter);
  }, [mobileRoomFilter]);

  const columns: CalendarColumn[] = useMemo(() => {
    if (timeMode === 'weekly') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      return days.map((day) => ({
        id: format(day, 'yyyy-MM-dd'),
        name: format(day, 'EEEE', { locale: es }).substring(0, 3),
        date: day,
      }));
    }

    const base =
      viewMode === 'professionals'
        ? professionals.map((pro) => ({ id: pro.id, name: pro.name, color: pro.color }))
        : ROOMS.map((room) => ({ id: room.id, name: room.name }));

    const hasUnassigned = selectedDateAppointments.some(
      (app) => agendaColumnId(app, viewMode, base) === 'unassigned'
    );
    return hasUnassigned ? [...base, {
      ...UNASSIGNED_COLUMN,
      name: viewMode === 'professionals' ? 'Externos / Sin profesional' : 'Sin consultorio',
    }] : base;
  }, [selectedDateAppointments, viewMode, timeMode, selectedDate, professionals]);

  const visibleAppointments = sortByStart(selectedDateAppointments);

  const getAppointmentsForColumn = (columnId: string) => {
    if (timeMode === 'weekly') {
      return weeklyAppointmentsByDay.get(columnId) || [];
    }
    return visibleAppointments.filter((appointment) => matchesColumn(appointment, columnId));
  };

  const getPositionFromTime = (timeStr: string) => {
    const minutesSinceStart = parseTimeToMinutes(timeStr) - 8 * 60;
    return (minutesSinceStart / 60) * HOUR_HEIGHT;
  };

  const getHeightFromInterval = (start: string, end: string) => {
    const duration = parseTimeToMinutes(end) - parseTimeToMinutes(start);
    return Math.max((duration / 60) * HOUR_HEIGHT, 34);
  };

  const matchesColumn = (appointment: AppointmentRecord, columnId: string) => {
    return agendaColumnId(appointment, viewMode, viewMode === 'professionals' ? professionals : ROOMS) === columnId;
  };

  const handleDailyPdf = () => {
    const proName =
      filterProId !== 'all' ? professionals.find((p) => p.id === filterProId)?.name : '';
    const html = buildDailyPdfHtml(selectedDate, filteredAppointments);
    openPrintableReport(
      `Agenda diaria ${proName ? `- ${proName} ` : ''}- ${formatDateEs(selectedDate, 'dd-MM-yyyy')}`,
      html
    );
  };

  const handleMonthlyPdf = () => {
    const proName =
      filterProId !== 'all' ? professionals.find((p) => p.id === filterProId)?.name : '';
    const html = buildMonthlyPdfHtml(selectedDate, filteredAppointments);
    openPrintableReport(
      `Agenda mensual ${proName ? `- ${proName} ` : ''}- ${formatDateEs(selectedDate, 'MMMM yyyy')}`,
      html
    );
  };

  const handleWeeklyPdf = () => {
    const proName =
      filterProId !== 'all' ? professionals.find((p) => p.id === filterProId)?.name : '';
    const html = buildWeeklyAvailabilityPdfHtml(selectedDate, filteredAppointments);
    openPrintableReport(
      `Disponibilidad semanal ${proName ? `- ${proName} ` : ''}- ${formatDateEs(selectedDate, 'dd-MM-yyyy')}`,
      html
    );
  };

  const resolveNextAvailableStart = (
    columnAppointments: AppointmentRecord[],
    requestedStart: number
  ) => {
    const baseStart = Math.max(requestedStart, 8 * 60);
    let candidateStart = baseStart;
    let guard = 0;

    while (guard < 24) {
      guard += 1;
      const candidateEnd = candidateStart + DEFAULT_SESSION_DURATION;

      const overlapping = columnAppointments
        .filter((appointment) =>
          overlaps(
            formatMinutesToTime(candidateStart),
            formatMinutesToTime(candidateEnd),
            appointment.start,
            appointment.end
          )
        )
        .sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));

      if (overlapping.length === 0) {
        return candidateStart;
      }

      const latestEnd = Math.max(
        ...overlapping.map((appointment) =>
          parseTimeToMinutes(appointment.end || appointment.start)
        )
      );
      candidateStart = Math.max(latestEnd, candidateStart + 1);
    }

    return candidateStart;
  };

  const handleEmptySlotClick = (
    event: MouseEvent<HTMLDivElement>,
    hour: number,
    col: CalendarColumn
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickOffset = event.clientY - rect.top;
    const requestedStart = hour * 60 + (clickOffset >= rect.height / 2 ? 30 : 0);
    const columnAppointments = getAppointmentsForColumn(col.id);
    const resolvedStart = resolveNextAvailableStart(columnAppointments, requestedStart);
    const appointmentDate = timeMode === 'weekly' ? col.id : format(selectedDate, 'yyyy-MM-dd');

    onOpenModal(
      timeMode === 'weekly'
        ? undefined
        : viewMode === 'rooms'
        ? col.id === 'unassigned'
          ? undefined
          : col.name
        : undefined,
      timeMode === 'weekly'
        ? undefined
        : viewMode === 'professionals'
        ? col.id === 'unassigned'
          ? undefined
          : col.name
        : undefined,
      undefined,
      {
        date: appointmentDate,
        startTime: formatMinutesToTime(resolvedStart),
      }
    );
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await onRefresh();
    } catch {
      // Ignora error puntual de red
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (timeMode !== 'daily') return;
    const container = dailyTimelineRef.current;
    if (!container) return;
    const firstAppointment = selectedDateAppointments[0];
    const targetTop = firstAppointment
      ? Math.max(getPositionFromTime(firstAppointment.start) - 100, 0)
      : 0;

    const frame = window.requestAnimationFrame(() => {
      container.scrollTop = targetTop;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedDateAppointments, timeMode]);

  return (
    <div className="flex h-full flex-col gap-2 min-h-0 antialiased">
      {/* =========================================================================
          TOOLBAR MÓVIL (< md): LIMPIA, COMPACTA Y CON FILTROS EN PANEL
          ========================================================================= */}
      <div className="md:hidden rounded-2xl border border-[#E5EAE5] bg-white p-2.5 shadow-2xs shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1.5 w-full">
          {/* Navegación temporal: < Hoy > */}
          <div className="flex items-center rounded-xl border border-[#D5DDD7] bg-[#FAF8F5] p-0.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                setSelectedDate(
                  subDays(
                    selectedDate,
                    timeMode === 'weekly' ? 7 : timeMode === 'monthly' ? 30 : 1
                  )
                )
              }
              title={timeMode === 'weekly' ? 'Semana anterior' : 'Día anterior'}
              className="rounded-lg p-1.5 text-[#52635D] hover:bg-white active:scale-95 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="px-2.5 py-1 text-xs font-bold text-[#34433F] hover:bg-white rounded-lg transition"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedDate(
                  addDays(
                    selectedDate,
                    timeMode === 'weekly' ? 7 : timeMode === 'monthly' ? 30 : 1
                  )
                )
              }
              title={timeMode === 'weekly' ? 'Semana siguiente' : 'Día siguiente'}
              className="rounded-lg p-1.5 text-[#52635D] hover:bg-white active:scale-95 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Selector de fecha */}
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => {
              const parsed = parseDay(e.target.value);
              if (parsed) setSelectedDate(parsed);
            }}
            className="rounded-xl border border-[#D5DDD7] bg-[#FAF8F5] px-2 py-1 text-xs font-bold text-[#34433F] outline-none min-w-0 flex-1 max-w-[130px] focus:border-[#46766B] focus:bg-white"
          />

          {/* Acciones Derecha: Botón Filtros (con badge de activo) + Botón Reservar */}
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => setShowMobileFilters((open) => !open)}
              title="Filtros"
              className={cn(
                'flex items-center gap-1 rounded-xl border px-2 py-1.5 text-xs font-bold transition shrink-0',
                showMobileFilters || filterProId !== 'all' || showCancelled
                  ? 'border-[#46766B] bg-[#E8F3EE] text-[#2C5E50]'
                  : 'border-[#D5DDD7] bg-[#FAF8F5] text-[#52635D]'
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="text-[11px] hidden min-[360px]:inline">Filtros</span>
              {(filterProId !== 'all' || showCancelled) && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#46766B]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onOpenModal()}
              className="flex items-center gap-1 rounded-xl bg-[#46766B] px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#3B645B] transition active:scale-95 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Reservar</span>
            </button>
          </div>
        </div>

        {/* Panel Desplegable de Filtros en Celular */}
        {showMobileFilters && (
          <div className="pt-2 border-t border-[#F0F4F2] flex flex-col gap-2 animate-[fadeIn_.15s_ease-out]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#6D7C76] mb-0.5">Profesional</label>
                <select
                  value={filterProId}
                  onChange={(e) => setFilterProId(e.target.value)}
                  className="w-full rounded-xl border border-[#D5DDD7] bg-[#FAF8F5] px-2 py-1.5 text-xs font-semibold text-[#34433F] outline-none"
                >
                  <option value="all">Todas las profesionales</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#6D7C76] mb-0.5">Turnos cancelados</label>
                <button
                  type="button"
                  onClick={() => setShowCancelled((v) => !v)}
                  className={cn(
                    'w-full rounded-xl border py-1.5 text-xs font-semibold text-center transition',
                    showCancelled
                      ? 'border-rose-300 bg-rose-50 text-rose-800'
                      : 'border-[#D5DDD7] bg-[#FAF8F5] text-[#6D7C76]'
                  )}
                >
                  {showCancelled ? 'Cancelados visibles' : 'Ocultar cancelados'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F0F4F2]">
              <div className="flex items-center rounded-lg border border-[#D5DDD7] bg-[#FAF8F5] p-0.5">
                <button
                  type="button"
                  onClick={handleDailyPdf}
                  className="px-2 py-1 text-[11px] font-semibold text-[#52635D] hover:bg-white rounded"
                >
                  <Printer className="h-3 w-3 inline mr-1" />
                  PDF Día
                </button>
                <button
                  type="button"
                  onClick={handleWeeklyPdf}
                  className="px-2 py-1 text-[11px] font-semibold text-[#52635D] hover:bg-white rounded"
                >
                  PDF Sem
                </button>
                <button
                  type="button"
                  onClick={handleMonthlyPdf}
                  className="px-2 py-1 text-[11px] font-semibold text-[#52635D] hover:bg-white rounded"
                >
                  PDF Mes
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 rounded-xl border border-[#D5DDD7] bg-[#FAF8F5] px-2.5 py-1 text-xs font-semibold text-[#52635D]"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin text-[#46766B]')} />
                <span>Sincronizar</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          TOOLBAR DE ESCRITORIO (md:flex): COMPACTA Y COMPLETA
          ========================================================================= */}
      <div className="hidden md:flex rounded-2xl border border-[#E5EAE5] bg-white px-3 py-2 shadow-2xs shrink-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          {/* Bloque Izquierdo: Título compacto + Navegación temporal + Modos */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1.5 mr-1">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E8F3EE] text-[#46766B]">
                <CalendarIcon className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-bold text-[#264A40] hidden sm:inline">Agenda</span>
            </div>

            {/* Navegación temporal: < Hoy > */}
            <div className="flex items-center rounded-lg border border-[#D5DDD7] bg-[#FAF8F5] p-0.5">
              <button
                type="button"
                onClick={() =>
                  setSelectedDate(
                    subDays(
                      selectedDate,
                      timeMode === 'weekly' ? 7 : timeMode === 'monthly' ? 30 : 1
                    )
                  )
                }
                title={timeMode === 'weekly' ? 'Semana anterior' : 'Día anterior'}
                className="rounded-md p-1.5 text-[#52635D] hover:bg-white hover:text-[#264A40] transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(new Date())}
                className="rounded-md px-2.5 py-1 text-xs font-bold text-[#34433F] hover:bg-white transition"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedDate(
                    addDays(
                      selectedDate,
                      timeMode === 'weekly' ? 7 : timeMode === 'monthly' ? 30 : 1
                    )
                  )
                }
                title={timeMode === 'weekly' ? 'Semana siguiente' : 'Día siguiente'}
                className="rounded-md p-1.5 text-[#52635D] hover:bg-white hover:text-[#264A40] transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Selector de fecha */}
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                const parsed = parseDay(e.target.value);
                if (parsed) setSelectedDate(parsed);
              }}
              className="rounded-lg border border-[#D5DDD7] bg-[#FAF8F5] text-xs font-semibold text-[#34433F] outline-none px-2.5 py-1 cursor-pointer focus:border-[#46766B] focus:bg-white"
            />

            {/* Modos de tiempo: Día | Sem | Mes */}
            <div className="flex items-center rounded-lg border border-[#D5DDD7] bg-[#FAF8F5] p-0.5">
              {(['daily', 'weekly', 'monthly'] as const).map((mode) => {
                const labels = { daily: 'Día', weekly: 'Sem', monthly: 'Mes' };
                const isActive = timeMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTimeMode(mode)}
                    className={cn(
                      'rounded-md px-2 py-1 text-xs font-bold transition',
                      isActive
                        ? 'bg-[#46766B] text-white shadow-2xs'
                        : 'text-[#6D7C76] hover:text-[#34433F]'
                    )}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>

            {/* Alternar perspectiva: Consultorios | Terapeutas */}
            {(timeMode === 'daily' || timeMode === 'weekly') && (
              <div className="flex items-center rounded-lg border border-[#D5DDD7] bg-[#FAF8F5] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('rooms')}
                  title="Ver por consultorios (C1, C2, C3)"
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold transition',
                    viewMode === 'rooms'
                      ? 'bg-white text-[#264A40] shadow-2xs border border-[#E5EAE5]'
                      : 'text-[#6D7C76] hover:text-[#34433F]'
                  )}
                >
                  <DoorOpen className="h-3 w-3 text-[#46766B]" />
                  <span>Consultorios</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('professionals')}
                  title="Ver por profesionales"
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold transition',
                    viewMode === 'professionals'
                      ? 'bg-white text-[#264A40] shadow-2xs border border-[#E5EAE5]'
                      : 'text-[#6D7C76] hover:text-[#34433F]'
                  )}
                >
                  <Users className="h-3 w-3 text-[#7E6BA8]" />
                  <span>Profesionales</span>
                </button>
              </div>
            )}
          </div>

          {/* Bloque Centro-Derecha: Filtros desplegables y Acciones */}
          <div className="flex flex-wrap items-center gap-1.5 ml-auto">
            {/* Filtro Profesional */}
            <div className="flex items-center gap-1 rounded-lg border border-[#D5DDD7] bg-[#FAF8F5] px-2 py-0.5">
              <User className="h-3 w-3 text-[#7E6BA8]" />
              <select
                value={filterProId}
                onChange={(e) => setFilterProId(e.target.value)}
                className="bg-transparent border-none text-[11px] font-semibold text-[#34433F] outline-none cursor-pointer pr-1 max-w-[125px] truncate"
              >
                <option value="all">Todas las prof.</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Consultorio */}
            <div className="flex items-center gap-1 rounded-lg border border-[#D5DDD7] bg-[#FAF8F5] px-2 py-0.5">
              <MapPin className="h-3 w-3 text-[#46766B]" />
              <select
                value={filterRoomId}
                onChange={(e) => setFilterRoomId(e.target.value)}
                className="bg-transparent border-none text-[11px] font-semibold text-[#34433F] outline-none cursor-pointer pr-1 max-w-[115px] truncate"
              >
                <option value="all">Todos los cons.</option>
                {ROOMS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name.split('—')[0].trim()}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle cancelados */}
            <button
              type="button"
              onClick={() => setShowCancelled((v) => !v)}
              className={cn(
                'rounded-lg border px-2 py-1 text-[11px] font-semibold transition',
                showCancelled
                  ? 'border-rose-300 bg-rose-50 text-rose-800'
                  : 'border-[#D5DDD7] bg-[#FAF8F5] text-[#6D7C76] hover:text-[#34433F]'
              )}
              title={showCancelled ? 'Ocultar turnos cancelados' : 'Mostrar turnos cancelados'}
            >
              {showCancelled ? 'Canc. visibles' : 'Canc.'}
            </button>

            {/* Chip de resumen rápido */}
            <span className="hidden xl:inline-flex items-center gap-1 rounded-lg bg-[#E8F3EE] px-2 py-1 text-[11px] font-bold text-[#264A40]">
              <span>{appointmentKindSummary.total} turnos</span>
              <span className="opacity-50">·</span>
              <span>{resourceAvailability.free} libres</span>
            </span>

            {/* Exportar PDF */}
            <div className="flex items-center rounded-lg border border-[#D5DDD7] bg-[#FAF8F5] p-0.5">
              <button
                type="button"
                onClick={handleDailyPdf}
                title="Exportar agenda diaria a PDF"
                className="rounded px-1.5 py-1 text-[11px] font-semibold text-[#52635D] hover:bg-white hover:text-[#264A40] transition"
              >
                <Printer className="h-3 w-3 inline mr-0.5" />
                <span>PDF</span>
              </button>
              <button
                type="button"
                onClick={handleWeeklyPdf}
                title="Disponibilidad semanal PDF"
                className="rounded px-1.5 py-1 text-[10px] font-semibold text-[#52635D] hover:bg-white hover:text-[#264A40] transition hidden sm:inline"
              >
                Sem
              </button>
              <button
                type="button"
                onClick={handleMonthlyPdf}
                title="Agenda mensual PDF"
                className="rounded px-1.5 py-1 text-[10px] font-semibold text-[#52635D] hover:bg-white hover:text-[#264A40] transition hidden sm:inline"
              >
                Mes
              </button>
            </div>

            {/* Botón Refrescar */}
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              title="Sincronizar con Google Sheets"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D5DDD7] bg-[#FAF8F5] text-[#52635D] hover:bg-white hover:text-[#264A40] transition"
            >
              <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin text-[#46766B]')} />
            </button>

            {/* Botón Nueva Reserva */}
            <button
              type="button"
              onClick={() => onOpenModal()}
              className="flex items-center gap-1 rounded-lg bg-[#46766B] px-2.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-[#3B645B] transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nueva</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          GRILLA PRINCIPAL PROTAGONISTA: MÁXIMO ESPACIO ÚTIL
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-[#E5EAE5] bg-white p-2 sm:p-2.5 shadow-2xs overflow-hidden">
        {timeMode === 'daily' || timeMode === 'weekly' ? (
          <>
            {/* VISTA MÓVIL (Pestañas táctiles de consultorios deslizables y tarjetas muy espaciosas con horas disponibles) */}
            <div className="md:hidden flex flex-col gap-3 overflow-y-auto flex-1 pr-0.5">
              {/* Barra de 7 días touch para celular */}
              <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar shrink-0">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), i);
                  const isSelected = isSameDay(d, selectedDate);
                  const isToday = isSameDay(d, new Date());
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedDate(d)}
                      className={cn(
                        'flex flex-col items-center justify-center min-w-[42px] flex-1 py-1.5 rounded-xl border transition',
                        isSelected
                          ? 'border-[#46766B] bg-[#DDEAE2] text-[#1D3E35] font-bold shadow-2xs'
                          : isToday
                          ? 'border-[#BEDCEB] bg-[#EDF6FA] text-[#205272]'
                          : 'border-[#E5EAE5] bg-white text-[#52635D]'
                      )}
                    >
                      <span className="text-[9px] uppercase font-bold opacity-80">
                        {formatDateEs(d, 'EEE')}
                      </span>
                      <span className="text-xs font-black leading-tight mt-0.5">
                        {formatDateEs(d, 'd')}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Pestañas táctiles de Consultorio para Celulares (deslizables para el costado) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileRoomFilter('all')}
                  className={cn(
                    'min-h-9 shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5',
                    mobileRoomFilter === 'all'
                      ? 'bg-[#46766B] text-white shadow-2xs'
                      : 'border border-[#DDE3DF] bg-white text-[#52635D]'
                  )}
                >
                  <span>Todos ({selectedDateAppointments.length})</span>
                </button>
                {ROOMS.map((r) => {
                  const count = selectedDateAppointments.filter((a) => a.roomId === r.id).length;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setMobileRoomFilter(r.id)}
                      className={cn(
                        'min-h-9 shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5',
                        mobileRoomFilter === r.id
                          ? 'bg-[#46766B] text-white shadow-2xs'
                          : 'border border-[#DDE3DF] bg-white text-[#52635D]'
                      )}
                    >
                      <span>{r.name.split('—')[0].trim()}</span>
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                          mobileRoomFilter === r.id
                            ? 'bg-white/20 text-white'
                            : 'bg-[#EAEFEA] text-[#2C4E44]'
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Contenedor Espacioso de Consultorios para Celular */}
              <div className="space-y-3.5">
                {visibleRoomsOnMobile.map((room) => {
                  const roomApps = selectedDateAppointments
                    .filter((a) => a.roomId === room.id)
                    .sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));

                  return (
                    <div
                      key={room.id}
                      className="flex flex-col rounded-3xl border border-[#E5EAE5] bg-white p-3.5 sm:p-4 shadow-xs"
                    >
                      {/* Cabecera Consultorio */}
                      <div className="flex items-center justify-between border-b border-[#F0F4F1] pb-3 mb-3 gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E8F3EE] text-[#46766B] shrink-0">
                            <DoorOpen className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-[#34433F] truncate">
                              {room.name.split('—')[0].trim()}
                            </h3>
                            <p className="text-[11px] text-[#6D7C76] truncate">
                              {room.name.split('—')[1]?.trim() || 'Consultorio CREAR'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="rounded-full bg-[#E8F3EE] px-2 py-0.5 text-[10px] font-bold text-[#326456] shrink-0">
                            {roomApps.length} {roomApps.length === 1 ? 'turno' : 'turnos'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenModal(room.name, undefined, undefined, {
                                date: format(selectedDate, 'yyyy-MM-dd'),
                              })
                            }
                            className="flex items-center gap-1 rounded-xl bg-[#F2F7F4] px-2 py-1 text-xs font-bold text-[#46766B] hover:bg-[#DDEAE2] transition shrink-0"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Reservar</span>
                          </button>
                        </div>
                      </div>

                      {/* Grilla de Horarios y Turnos (Estilo Terapeuta muy espacioso) */}
                      <div className="space-y-1.5">
                        {MOBILE_HOURS_SLOTS.map((slotHour) => {
                          const slotH = Number(slotHour.slice(0, 2));
                          const startingBookings = roomApps.filter((a) => {
                            const startMin = parseTimeToMinutes(a.start);
                            const startHour = Math.floor(startMin / 60);
                            return startHour === slotH;
                          });
                          const isSlotCovered = roomApps.some((a) =>
                            overlaps(
                              slotHour,
                              `${(slotH + 1).toString().padStart(2, '0')}:00`,
                              a.start,
                              a.end
                            )
                          );

                          // Si hay turnos que inician en esta hora, renderizar tarjetas
                          if (startingBookings.length > 0) {
                            return startingBookings.map((booking) => {
                              const pro = professionals.find(
                                (p) => p.id === (booking.professionalId || booking.proId)
                              );
                              const kind = booking.kind || booking.type;
                              const pastelClass = getTypeStyles(kind, pro?.id);

                              return (
                                <div
                                  key={booking.id}
                                  onClick={() => onOpenModal(room.name, pro?.name, booking)}
                                  className={cn(
                                    'rounded-2xl border p-3 transition shadow-2xs cursor-pointer',
                                    pastelClass
                                  )}
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
                                        <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold">
                                          {getTypeLabel(kind)}
                                        </span>
                                      </div>
                                      <h4 className="mt-1 font-bold text-sm leading-tight text-[#264A40] truncate">
                                        {getAppointmentName(booking)}
                                      </h4>
                                      <div className="mt-1 flex items-center gap-1.5 text-xs opacity-90 truncate">
                                        <span>Prof. {pro?.name || 'Sin profesional'}</span>
                                        <span>•</span>
                                        <span>{room.name.split('—')[0].trim()}</span>
                                      </div>
                                    </div>
                                    <div
                                      className={cn(
                                        'h-2.5 w-2.5 rounded-full shrink-0 mt-1',
                                        getStatusColor(booking.status)
                                      )}
                                      title={booking.status}
                                    />
                                  </div>
                                </div>
                              );
                            });
                          }

                          // Si la hora está libre (no cubierta por un turno anterior), mostrar slot disponible
                          if (!isSlotCovered) {
                            return (
                              <button
                                key={slotHour}
                                type="button"
                                onClick={() =>
                                  onOpenModal(room.name, undefined, undefined, {
                                    date: format(selectedDate, 'yyyy-MM-dd'),
                                    startTime: slotHour,
                                  })
                                }
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

                          return null;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* VISTA DESKTOP / TABLET (Columnas optimizadas, cabecera de consultorios y slots compactos) */}
            <div className="hidden md:flex flex-col flex-1 min-h-0">
              {/* Cabeceras de columnas */}
              <div className="flex border-b border-[#E5EAE5] pb-2 shrink-0">
                <div className="w-12 shrink-0 flex items-center justify-center font-bold text-xs text-[#7B8C85]">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div
                  className={cn(
                    'flex-1 grid divide-x divide-[#F0F4F2]',
                    timeMode === 'weekly'
                      ? 'grid-cols-7'
                      : viewMode === 'rooms'
                      ? 'grid-cols-3'
                      : 'grid-cols-7'
                  )}
                >
                  {columns.map((col) => (
                    <div key={col.id} className="px-2 text-center">
                      {viewMode === 'rooms' && timeMode === 'daily' ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#E8F3EE] text-[#46766B] shrink-0">
                              <DoorOpen className="h-3.5 w-3.5" />
                            </span>
                            <div className="text-left truncate">
                              <p className="text-xs font-bold text-[#264A40] leading-tight truncate">
                                {col.name.split('—')[0].trim()}
                              </p>
                              <p className="text-[9px] text-[#657570] leading-tight truncate">
                                {col.name.split('—')[1]?.trim() || 'Consultorio CREAR'}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-[#E8F3EE] px-1.5 py-0.5 text-[9px] font-bold text-[#326456] shrink-0">
                            {getAppointmentsForColumn(col.id).length} turnos
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="w-5 h-5 rounded-md flex items-center justify-center bg-[#E8F3EE] text-[#46766B] font-bold text-[10px]">
                            {col.name[0]}
                          </span>
                          <p className="text-xs font-bold text-[#264A40] truncate">{col.name}</p>
                          <span className="text-[10px] text-[#657570]">
                            ({getAppointmentsForColumn(col.id).length})
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Grilla temporal con altura ajustada (HOUR_HEIGHT = 68) */}
              <div
                ref={dailyTimelineRef}
                className="flex-1 overflow-y-auto relative custom-scrollbar mt-0.5"
              >
                <div className="flex" style={{ minHeight: `${HOURS.length * HOUR_HEIGHT}px` }}>
                  {/* Columna de Horas */}
                  <div className="w-12 shrink-0 border-r border-[#E5EAE5] sticky left-0 z-20 bg-white/95 backdrop-blur-xs select-none">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="relative border-b border-[#F0F4F2] flex flex-col items-center justify-between py-0.5 text-right pr-1"
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      >
                        <span className="text-[11px] font-mono font-bold text-[#7B8C85]">
                          {hour.toString().padStart(2, '0')}:00
                        </span>
                        <span className="text-[9px] font-mono text-[#A3B3AC]">
                          {hour.toString().padStart(2, '0')}:30
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Columnas de contenido */}
                  <div
                    className={cn(
                      'flex-1 grid divide-x divide-[#F0F4F2] relative',
                      timeMode === 'weekly'
                        ? 'grid-cols-7'
                        : viewMode === 'rooms'
                        ? 'grid-cols-3'
                        : 'grid-cols-7'
                    )}
                  >
                    {columns.map((col) => {
                      const columnAppointments = getAppointmentsForColumn(col.id);
                      const layoutInfo = resolveOverlaps(columnAppointments);

                      return (
                        <div
                          key={col.id}
                          className="relative h-full transition-colors hover:bg-[#FAF9F6]/40"
                        >
                          {/* Líneas divisorias de horas con clic para reservar */}
                          {HOURS.map((hour) => (
                            <div
                              key={hour}
                              className="relative border-b border-[#F0F4F2] w-full cursor-cell group"
                              style={{ height: `${HOUR_HEIGHT}px` }}
                              onClick={(event) => handleEmptySlotClick(event, hour, col)}
                              title="Hacé clic para crear una reserva en este horario"
                            >
                              <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#F4F7F5]" />
                              <span className="absolute right-1.5 top-1 opacity-0 group-hover:opacity-100 text-[9px] font-bold text-[#46766B] bg-[#E8F3EE] px-1.5 py-0.5 rounded pointer-events-none transition-opacity">
                                + Reservar
                              </span>
                            </div>
                          ))}

                          {/* Renderizado de Bloques de Turnos Sintéticos y Legibles */}
                          {columnAppointments.map((app) => {
                            const pro = professionals.find(
                              (p) => p.id === (app.professionalId || app.proId)
                            );
                            const room = ROOMS.find((r) => r.id === app.roomId);
                            const appointmentHeight = Math.max(
                              getHeightFromInterval(app.start, app.end || app.start),
                              32
                            );
                            const appLayout = layoutInfo.get(app.id) || {
                              colIndex: 0,
                              maxCols: 1,
                            };
                            const widthPercent = 100 / appLayout.maxCols;
                            const leftPercent = appLayout.colIndex * widthPercent;
                            const kind = app.kind || app.type;
                            const cardStyles = getTypeStyles(kind, pro?.id);

                            return (
                              <motion.div
                                key={app.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenModal(room?.name, pro?.name, app);
                                }}
                                title={`${app.start} - ${app.end} · ${getAppointmentName(app)} (${getTypeLabel(kind)}) · Prof. ${getProfessionalName(app)} · ${getRoomName(app)} · Estado: ${app.status}`}
                                style={{
                                  top: `${getPositionFromTime(app.start)}px`,
                                  height: `${appointmentHeight}px`,
                                  width: `calc(${widthPercent}% - 4px)`,
                                  left: `calc(${leftPercent}% + 2px)`,
                                  zIndex: 10 + appLayout.colIndex,
                                }}
                                className={cn(
                                  'absolute rounded-xl border p-1.5 transition shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden',
                                  cardStyles
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center justify-between gap-1 leading-none">
                                    <span className="font-mono text-[10px] font-bold truncate">
                                      {app.start} - {app.end}
                                    </span>
                                    <div
                                      className={cn('h-1.5 w-1.5 rounded-full shrink-0', getStatusColor(app.status))}
                                      title={app.status}
                                    />
                                  </div>
                                  <h4 className="font-bold text-[11px] leading-tight text-[#264A40] mt-0.5 truncate">
                                    {getAppointmentName(app)}
                                  </h4>
                                </div>

                                {appointmentHeight >= 44 && (
                                  <div className="flex items-center justify-between text-[9px] opacity-80 pt-0.5 border-t border-current/10 leading-none truncate">
                                    <span className="truncate">
                                      {viewMode === 'rooms' ? `Prof. ${getProfessionalName(app)}` : getRoomName(app)}
                                    </span>
                                    {app.recurrence === 'weekly' && (
                                      <span className="flex items-center gap-0.5 shrink-0 ml-1">
                                        <Repeat className="h-2 w-2" />
                                      </span>
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* =========================================================================
             VISTA MENSUAL ELEGANTE Y ESPACIOSA
             ========================================================================= */
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-7 gap-px bg-[#E5EAE5] rounded-2xl overflow-hidden border border-[#E5EAE5]">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                <div
                  key={day}
                  className="bg-[#FAF8F5] py-2 text-center text-xs font-bold text-[#596963] uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}

              {eachDayOfInterval({
                start: startOfWeek(startOfMonth(selectedDate)),
                end: endOfWeek(endOfMonth(selectedDate)),
              }).map((day) => {
                const dayAppointments = sortByStart(
                  filteredAppointments.filter((appointment) =>
                    isAppointmentActiveOnDate(appointment, day)
                  )
                );
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, selectedDate);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => {
                      setSelectedDate(day);
                      setTimeMode('daily');
                    }}
                    className={cn(
                      'min-h-[90px] md:min-h-[120px] p-2 bg-white transition-colors hover:bg-[#F4FAF7] cursor-pointer flex flex-col justify-between',
                      !isCurrentMonth && 'opacity-35 bg-[#FAF9F6]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center',
                          isToday
                            ? 'bg-[#46766B] text-white shadow-xs'
                            : isSelected
                            ? 'bg-[#DDEAE2] text-[#1D3E35]'
                            : 'text-[#34433F]'
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayAppointments.length > 0 && (
                        <span className="rounded-full bg-[#E8F3EE] px-1.5 py-0.2 text-[10px] font-bold text-[#326456]">
                          {dayAppointments.length}
                        </span>
                      )}
                    </div>

                    {/* Mini tarjetas de eventos en el día */}
                    <div className="space-y-1 mt-1 flex-1">
                      {dayAppointments.slice(0, 2).map((app) => (
                        <div
                          key={app.id}
                          className="rounded-lg bg-[#F4FAF7] border border-[#CFE2D8] px-1.5 py-0.5 text-[10px] font-semibold text-[#2C5E50] truncate"
                        >
                          <span className="font-mono text-[9px] mr-1">{app.start}</span>
                          <span>{getAppointmentName(app)}</span>
                        </div>
                      ))}
                      {dayAppointments.length > 2 && (
                        <p className="text-[10px] font-bold text-[#46766B] pl-1">
                          + {dayAppointments.length - 2} más
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Botón flotante FAB para celulares */}
      <button
        type="button"
        onClick={() => onOpenModal()}
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#46766B] text-white flex items-center justify-center shadow-lg shadow-[#46766B]/30 z-40 active:scale-95 transition-transform"
        aria-label="Nueva reserva"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
};
