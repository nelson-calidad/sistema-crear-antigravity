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
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { AppointmentRecord } from '../types';
import { ROOMS } from '../constants';
import { buildDailyPdfHtml, buildMonthlyPdfHtml, openPrintableReport } from '../lib/appointmentPdf';
import { useProfessionals } from '../lib/professionalsStore';
import { forceRefreshAppointments } from '../lib/appointmentsStore';

const HOURS = Array.from({ length: 14 }, (_, i) => 8 + i);
const HOUR_HEIGHT = 88;
const DEFAULT_SESSION_DURATION = 45;
const UNASSIGNED_COLUMN = { id: 'unassigned', name: 'Sin asignar', color: 'bg-slate-400' };

type AgendaProps = {
  onOpenModal: (
    room?: string,
    pro?: string,
    app?: AppointmentRecord,
    options?: { date?: string; startTime?: string },
  ) => void;
  appointments: AppointmentRecord[];
  focusDate?: string | null;
};

type CalendarColumn = {
  id: string;
  name: string;
  color?: string;
};

const parseDay = (value?: string | Date | null) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split('/').map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
};

const getAppointmentName = (appointment: AppointmentRecord) => {
  const raw = appointment.patient?.trim() || appointment.title?.trim() || '';

  if (!raw || raw === 'Nueva Reserva') {
    return 'Sin nombre';
  }

  return raw;
};

const getAppointmentKind = (appointment: AppointmentRecord) => appointment.kind || appointment.type || 'session';

const getTypeLabel = (kind?: string) => {
  if (kind === 'interview') return 'Entrevista';
  if (kind === 'block') return 'Bloqueo';
  return 'Sesión';
};

const getTypeStyles = (kind?: string) => {
  if (kind === 'interview') return 'bg-amber-100 text-amber-950 border-amber-200';
  if (kind === 'block') return 'bg-violet-100 text-violet-950 border-violet-200';
  return 'bg-sky-100 text-sky-950 border-sky-200';
};

const getKindBadgeStyles = (kind?: string) => {
  if (kind === 'interview') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (kind === 'block') return 'bg-violet-50 text-violet-800 border-violet-200';
  return 'bg-sky-50 text-sky-800 border-sky-200';
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

const sortByStart = (items: AppointmentRecord[]) => [...items].sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));

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

const getCoverageLabel = (appointment: AppointmentRecord) => appointment.coverageType || 'particular';

const hasAssignment = (appointment: AppointmentRecord) => Boolean(appointment.professionalId || appointment.proId || appointment.roomId);

const formatDateEs = (date: Date, pattern: string) =>
  format(date, pattern, { locale: es });

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const Agenda = ({ onOpenModal, appointments, focusDate }: AgendaProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'professionals' | 'rooms'>('professionals');
  const [timeMode, setTimeMode] = useState<'daily' | 'monthly'>('daily');
  const hasSyncedInitialDateRef = useRef(false);
  const dailyTimelineRef = useRef<HTMLDivElement | null>(null);
  const [professionals] = useProfessionals();

  const getCorrespondsToLabel = (appointment: AppointmentRecord) => {
    const pro = professionals.find((p) => p.id === appointment.professionalId || appointment.proId);
    const room = ROOMS.find((r) => r.id === appointment.roomId);

    if (pro && room) return `${pro.name} · ${room.name}`;
    if (pro) return pro.name;
    if (room) return room.name;
    return 'Sin asignar';
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
    if (hasSyncedInitialDateRef.current) {
      return;
    }

    const firstAppointment = [...appointments]
      .map((appointment) => ({ appointment, date: parseDay(appointment.date) }))
      .filter((entry): entry is { appointment: AppointmentRecord; date: Date } => Boolean(entry.date))
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

    if (!firstAppointment) {
      return;
    }

    setSelectedDate(firstAppointment.date);
    setTimeMode('daily');
    hasSyncedInitialDateRef.current = true;
  }, [appointments]);

  const selectedDateAppointments = useMemo(() => {
    return sortByStart(
      appointments.filter((appointment) => {
        const appointmentDate = parseDay(appointment.date);
        return appointmentDate ? isSameDay(appointmentDate, selectedDate) : false;
      }),
    );
  }, [appointments, selectedDate]);

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
      { total: 0, session: 0, interview: 0, block: 0 },
    );

    return summary;
  }, [selectedDateAppointments]);

  const resourceAvailability = useMemo(() => {
    if (viewMode === 'professionals') {
      const busyIds = new Set(
        selectedDateAppointments
          .filter((appointment) => appointment.professionalId || appointment.proId)
          .map((appointment) => appointment.professionalId || appointment.proId),
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
        .map((appointment) => appointment.roomId),
    );

    return {
      label: 'Consultorios libres',
      total: ROOMS.length,
      busy: busyIds.size,
      free: Math.max(ROOMS.length - busyIds.size, 0),
    };
  }, [professionals.length, selectedDateAppointments, viewMode]);

  const currentMonthAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const appointmentDate = parseDay(appointment.date);
      return appointmentDate ? isSameMonth(appointmentDate, selectedDate) : false;
    });
  }, [appointments, selectedDate]);

  const columns: CalendarColumn[] = useMemo(() => {
    const base = viewMode === 'professionals'
      ? professionals.map((pro) => ({ id: pro.id, name: pro.name, color: pro.color }))
      : ROOMS.map((room) => ({ id: room.id, name: room.name }));

    const hasUnassigned = selectedDateAppointments.some((app) => !hasAssignment(app));
    return hasUnassigned ? [...base, UNASSIGNED_COLUMN] : base;
  }, [selectedDateAppointments, viewMode]);

  const mobileResources = useMemo(() => {
    if (viewMode === 'professionals') {
      return professionals.map((professional) => ({
        id: professional.id,
        name: professional.name,
        subtitle: professional.specialty,
        colorClass: professional.color,
        count: selectedDateAppointments.filter((appointment) => (appointment.professionalId || appointment.proId) === professional.id).length,
        kind: 'professional' as const,
      }));
    }

    const roomPalette = ['bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-sky-500'];

    return ROOMS.map((room, index) => ({
      id: room.id,
      name: room.name,
      subtitle: 'Consultorio',
      colorClass: roomPalette[index % roomPalette.length],
      count: selectedDateAppointments.filter((appointment) => appointment.roomId === room.id).length,
      kind: 'room' as const,
    }));
  }, [professionals, selectedDateAppointments, viewMode]);

  const mobileRoomColumns = useMemo(() => {
    const roomPalette = ['bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-sky-500'];

    return ROOMS.map((room, index) => ({
      ...room,
      colorClass: roomPalette[index % roomPalette.length],
      appointments: sortByStart(
        selectedDateAppointments.filter((appointment) => appointment.roomId === room.id),
      ),
    }));
  }, [selectedDateAppointments]);

  const visibleAppointments = sortByStart(selectedDateAppointments);
  const getAppointmentsForColumn = (columnId: string) => {
    return visibleAppointments.filter((appointment) => matchesColumn(appointment, columnId));
  };

  const getPositionFromTime = (timeStr: string) => {
    const minutesSinceStart = parseTimeToMinutes(timeStr) - (8 * 60);
    return (minutesSinceStart / 60) * HOUR_HEIGHT;
  };

  const getHeightFromInterval = (start: string, end: string) => {
    const duration = parseTimeToMinutes(end) - parseTimeToMinutes(start);
    return Math.max((duration / 60) * HOUR_HEIGHT, 68);
  };

  const isUnassigned = (appointment: AppointmentRecord) => !appointment.professionalId && !appointment.proId && !appointment.roomId;

  const matchesColumn = (appointment: AppointmentRecord, columnId: string) => {
    if (columnId === 'unassigned') return isUnassigned(appointment);
    return viewMode === 'professionals'
      ? (appointment.professionalId || appointment.proId) === columnId
      : appointment.roomId === columnId;
  };

  const handleDailyPdf = () => {
    const html = buildDailyPdfHtml(selectedDate, appointments);
    openPrintableReport(`Agenda diaria - ${formatDateEs(selectedDate, 'dd-MM-yyyy')}`, html);
  };

  const handleMonthlyPdf = () => {
    const html = buildMonthlyPdfHtml(selectedDate, appointments);
    openPrintableReport(`Agenda mensual - ${formatDateEs(selectedDate, 'MMMM yyyy')}`, html);
  };

  const resolveNextAvailableStart = (columnAppointments: AppointmentRecord[], requestedStart: number) => {
    const baseStart = Math.max(requestedStart, 8 * 60);
    let candidateStart = baseStart;
    let guard = 0;

    while (guard < 24) {
      guard += 1;
      const candidateEnd = candidateStart + DEFAULT_SESSION_DURATION;

      const overlapping = columnAppointments
        .filter((appointment) => overlaps(formatMinutesToTime(candidateStart), formatMinutesToTime(candidateEnd), appointment.start, appointment.end))
        .sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));

      if (overlapping.length === 0) {
        return candidateStart;
      }

      const latestEnd = Math.max(...overlapping.map((appointment) => parseTimeToMinutes(appointment.end || appointment.start)));
      candidateStart = Math.max(latestEnd, candidateStart + 1);
    }

    return candidateStart;
  };

  const handleEmptySlotClick = (
    event: MouseEvent<HTMLDivElement>,
    hour: number,
    col: CalendarColumn,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickOffset = event.clientY - rect.top;
    const requestedStart = hour * 60 + (clickOffset >= rect.height / 2 ? 30 : 0);
    const columnAppointments = getAppointmentsForColumn(col.id);
    const resolvedStart = resolveNextAvailableStart(columnAppointments, requestedStart);
    const appointmentDate = format(selectedDate, 'yyyy-MM-dd');

    onOpenModal(
      viewMode === 'rooms' ? (col.id === 'unassigned' ? undefined : col.name) : undefined,
      viewMode === 'professionals' ? (col.id === 'unassigned' ? undefined : col.name) : undefined,
      undefined,
      {
        date: appointmentDate,
        startTime: formatMinutesToTime(resolvedStart),
      },
    );
  };

  useEffect(() => {
    if (timeMode !== 'daily') {
      return;
    }

    const container = dailyTimelineRef.current;
    if (!container) {
      return;
    }

    const firstAppointment = selectedDateAppointments[0];
    const targetTop = firstAppointment ? Math.max(getPositionFromTime(firstAppointment.start) - 120, 0) : 0;

    const frame = window.requestAnimationFrame(() => {
      container.scrollTop = targetTop;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedDateAppointments, timeMode]);

  return (
    <div className="h-full flex flex-col gap-1.5 md:gap-2 min-h-0">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 max-w-2xl min-w-0">
          <div className="flex items-start gap-2 md:gap-2.5">
            <div className="p-1.5 rounded-2xl bg-gradient-to-br from-cyan-100 via-blue-50 to-lavender-100 text-blue-600 border border-blue-100 shrink-0 shadow-sm">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[1.05rem] md:text-[1.45rem] lg:text-[1.55rem] font-black text-slate-900 tracking-tight leading-tight">
                <span className="md:hidden">Agenda</span>
                <span className="hidden md:inline">Agenda Operativa</span>
              </h1>
            </div>
          </div>

        </div>

        <div className="flex w-full flex-col gap-2 lg:w-auto lg:items-end">
          <div className="flex flex-wrap items-center justify-end gap-1.5 w-full">
            <div className="flex bg-slate-100/80 p-0.5 rounded-xl gap-1 w-full sm:w-auto border border-slate-200/70 shrink-0 min-w-0">
            <button
              onClick={() => setTimeMode('daily')}
              className={cn(
                'flex-1 md:flex-none px-2 md:px-2.5 py-1 md:py-1.25 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-[0.22em] transition-all',
                timeMode === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500',
              )}
            >
              Día
            </button>
            <button
              onClick={() => setTimeMode('monthly')}
              className={cn(
                'flex-1 md:flex-none px-2 md:px-2.5 py-1 md:py-1.25 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-[0.22em] transition-all',
                timeMode === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500',
              )}
            >
              Mes
            </button>
            </div>

            {timeMode === 'daily' && (
              <div className="flex bg-white/80 rounded-xl border border-slate-100 p-1 shadow-sm w-full sm:w-auto backdrop-blur-sm shrink-0 min-w-0">
              <button
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors shrink-0"
              >
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
              <div className="px-2 py-1.25 font-bold text-slate-700 text-center flex-1 md:min-w-[150px] text-[10px] md:text-[11px] leading-tight truncate">
                {titleCase(formatDateEs(selectedDate, 'EEEE, d MMMM'))}
              </div>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors shrink-0"
              >
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              </div>
            )}

            {timeMode === 'daily' && (
              <div className="bg-slate-100/80 p-0.5 rounded-xl flex gap-1 w-full sm:w-auto border border-slate-200/70 shrink-0 min-w-0">
              <button
                onClick={() => setViewMode('professionals')}
                className={cn(
                  'flex-1 md:flex-none px-2 md:px-2.5 py-1 md:py-1.25 rounded-lg text-[9px] md:text-[10px] font-bold transition-all inline-flex items-center justify-center gap-1 whitespace-nowrap',
                  viewMode === 'professionals' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <Users className="w-3 h-3 shrink-0" />
                Profesionales
              </button>
              <button
                onClick={() => setViewMode('rooms')}
                className={cn(
                  'flex-1 md:flex-none px-2 md:px-2.5 py-1 md:py-1.25 rounded-lg text-[9px] md:text-[10px] font-bold transition-all inline-flex items-center justify-center gap-1 whitespace-nowrap',
                  viewMode === 'rooms' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <MapPin className="w-3 h-3 shrink-0" />
                Consultorios
              </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5 w-full">
            <button
              onClick={() => onOpenModal()}
              className="inline-flex items-center justify-center gap-2 px-3 md:px-3.5 py-1.5 md:py-2 bg-gradient-to-r from-cyan-500 via-blue-600 to-lavender-500 text-white rounded-xl font-bold text-[10px] hover:brightness-105 transition-colors shadow-lg shadow-blue-200/40 w-full md:w-auto shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              Nuevo Bloque
            </button>

            <button
              onClick={handleDailyPdf}
              className="hidden sm:inline-flex items-center justify-center gap-2 px-3 md:px-3.5 py-1.5 md:py-2 bg-white/80 text-slate-700 border border-slate-200 rounded-xl font-bold text-[10px] hover:bg-slate-50 transition-colors shadow-sm w-full md:w-auto backdrop-blur-sm shrink-0 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              PDF Día
            </button>

            <button
              onClick={handleMonthlyPdf}
              className="hidden sm:inline-flex items-center justify-center gap-2 px-3 md:px-3.5 py-1.5 md:py-2 bg-white/80 text-slate-700 border border-slate-200 rounded-xl font-bold text-[10px] hover:bg-slate-50 transition-colors shadow-sm w-full md:w-auto backdrop-blur-sm shrink-0 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              PDF Mes
            </button>

            <button
              onClick={() => {
                void forceRefreshAppointments().catch((error) => {
                  console.warn('No se pudo refrescar la agenda manualmente.', error);
                });
              }}
              className="inline-flex items-center justify-center gap-2 px-3 md:px-3.5 py-1.5 md:py-2 bg-white/80 text-slate-700 border border-slate-200 rounded-xl font-bold text-[10px] hover:bg-slate-50 transition-colors shadow-sm w-full md:w-auto backdrop-blur-sm shrink-0 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              Refrescar
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-2 md:gap-3 lg:gap-4 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))] items-stretch">
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-3 py-2 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Turnos del día</p>
          <p className="mt-1 text-lg font-black text-slate-900">{appointmentKindSummary.total}</p>
        </div>
        <div className={cn('rounded-2xl border px-3 py-2 shadow-sm', getKindBadgeStyles('session'))}>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] opacity-80">Sesiones</p>
          <p className="mt-1 text-lg font-black">{appointmentKindSummary.session}</p>
        </div>
        <div className={cn('rounded-2xl border px-3 py-2 shadow-sm', getKindBadgeStyles('interview'))}>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] opacity-80">Entrevistas</p>
          <p className="mt-1 text-lg font-black">{appointmentKindSummary.interview}</p>
        </div>
        <div className={cn('rounded-2xl border px-3 py-2 shadow-sm', getKindBadgeStyles('block'))}>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] opacity-80">Bloqueos</p>
          <p className="mt-1 text-lg font-black">{appointmentKindSummary.block}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-3 py-2 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">{resourceAvailability.label}</p>
          <p className="mt-1 text-lg font-black text-slate-900">{resourceAvailability.free}/{resourceAvailability.total}</p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">{resourceAvailability.busy} ocupados</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white/80 rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-0 backdrop-blur-sm">
        {timeMode === 'daily' ? (
          <>
            <div className="md:hidden p-2 pb-2 space-y-2 overflow-y-auto custom-scrollbar">
              {viewMode === 'professionals' ? (
                <>
                  <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {mobileResources.map((resource) => {
                      const isActive = resource.count > 0;

                      return (
                        <button
                          key={resource.id}
                          type="button"
                          onClick={() => {
                            if (resource.count === 0) return;
                            const first = selectedDateAppointments.find((appointment) =>
                              resource.kind === 'professional'
                                ? (appointment.professionalId || appointment.proId) === resource.id
                                : appointment.roomId === resource.id,
                            );
                            if (first) {
                              onOpenModal(
                                ROOMS.find((room) => room.id === first.roomId)?.name,
                                professionals.find((professional) => professional.id === first.professionalId || first.proId)?.name,
                                first,
                              );
                            }
                          }}
                          className={cn(
                            'min-w-[96px] px-2.5 py-2 rounded-2xl border text-left transition-all shrink-0',
                            isActive ? 'bg-white border-blue-200 shadow-md shadow-blue-100/40' : 'bg-slate-50/80 border-slate-100 opacity-70',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center text-white font-black text-[10px]', resource.colorClass)}>
                              {resource.name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black text-slate-900 truncate">{resource.name}</p>
                              <p className="hidden sm:block text-[9px] uppercase font-bold text-slate-400 truncate">{resource.subtitle}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.14em]">
                            <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{resource.count} turnos</span>
                            <span className="text-slate-400">activo</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {visibleAppointments.length === 0 ? (
                    <div className="p-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                      <p className="text-sm font-bold text-slate-700">No hay turnos para este día</p>
                      <p className="text-xs text-slate-500 mt-1">Creá un bloque nuevo para empezar.</p>
                    </div>
                  ) : (
                    visibleAppointments.map((app) => {
                      const pro = professionals.find((p) => p.id === app.professionalId || app.proId);
                      const room = ROOMS.find((r) => r.id === app.roomId);

                      return (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => onOpenModal(room?.name, pro?.name, app)}
                          className={cn('w-full text-left rounded-2xl p-2.5 border shadow-sm backdrop-blur-sm', getTypeStyles(app.kind || app.type))}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-1.5">
                                {app.start} - {app.end}
                              </p>
                              <p className="font-bold text-[13px] truncate leading-tight">{getAppointmentName(app)}</p>
                              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-85 truncate">
                                {getTypeLabel(app.kind || app.type)} · {getCorrespondsToLabel(app)}
                              </p>
                            </div>
                            <span className="text-[10px] font-black uppercase opacity-75 shrink-0">
                              {getCoverageLabel(app)}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {mobileRoomColumns.map((room) => {
                      const isActive = room.appointments.length > 0;

                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => onOpenModal(room.name, undefined)}
                          className={cn(
                            'min-w-[116px] px-2.5 py-2 rounded-2xl border text-left transition-all shrink-0',
                            isActive ? 'bg-white border-cyan-200 shadow-md shadow-cyan-100/40' : 'bg-slate-50/80 border-slate-100 opacity-70',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center text-white font-black text-[10px]', room.colorClass)}>
                              {room.name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black text-slate-900 truncate">{room.name}</p>
                              <p className="text-[9px] uppercase font-bold text-slate-400 truncate">Consultorio</p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.14em]">
                            <span className={isActive ? 'text-cyan-600' : 'text-slate-400'}>{room.appointments.length} turnos</span>
                            <span className="text-slate-400">abrir</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar snap-x snap-mandatory">
                    {mobileRoomColumns.map((room) => (
                      <div
                        key={room.id}
                        className="min-w-[84%] snap-start rounded-3xl border border-slate-100 bg-white/90 shadow-sm p-3 shrink-0"
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-[11px]', room.colorClass)}>
                              {room.name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-900 truncate">{room.name}</p>
                              <p className="text-[10px] uppercase font-bold text-slate-400 truncate">Consultorio</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700 bg-cyan-50 border border-cyan-100 px-2 py-1 rounded-full">
                            {room.appointments.length} turnos
                          </span>
                        </div>

                        <div className="space-y-2 max-h-[52vh] overflow-y-auto custom-scrollbar pr-1">
                          {room.appointments.length === 0 ? (
                            <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                              <p className="text-sm font-bold text-slate-700">Sin turnos</p>
                              <p className="text-xs text-slate-500 mt-1">Tocá el encabezado para crear uno.</p>
                            </div>
                          ) : (
                            room.appointments.map((app) => {
                              const pro = professionals.find((p) => p.id === app.professionalId || app.proId);
                              return (
                                <button
                                  key={app.id}
                                  type="button"
                                  onClick={() => onOpenModal(room.name, pro?.name, app)}
                                  className={cn(
                                    'w-full text-left rounded-2xl p-2.5 border shadow-sm backdrop-blur-sm',
                                    getTypeStyles(app.kind || app.type),
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-1.5">
                                        {app.start} - {app.end}
                                      </p>
                                      <p className="font-bold text-[13px] truncate leading-tight">{getAppointmentName(app)}</p>
                                      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-85 truncate">
                                        {getTypeLabel(app.kind || app.type)} · {pro?.name || 'Sin profesional'}
                                      </p>
                                    </div>
                                    <span className="text-[10px] font-black uppercase opacity-75 shrink-0">
                                      {getCoverageLabel(app)}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:flex border-b border-slate-100 bg-slate-50/40">
              <div className="w-16 border-r border-slate-100 flex items-center justify-center bg-slate-100/50">
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div
                className={cn('flex-1 grid divide-x divide-slate-100', viewMode === 'professionals' ? 'grid-cols-7' : 'grid-cols-4')}
              >
                {columns.map((col) => (
                  <div key={col.id} className="py-3 px-2 text-center">
                    {'color' in col ? (
                      <div
                        className={cn(
                          'w-9 h-9 rounded-xl mx-auto mb-1.5 flex items-center justify-center text-white font-bold shadow-sm text-sm',
                          col.color,
                        )}
                      >
                        {col.name[0]}
                      </div>
                    ) : (
                        <div className="w-9 h-9 rounded-xl mx-auto mb-1.5 flex items-center justify-center bg-white text-slate-900 border border-slate-200 font-bold shadow-sm text-xs">
                          {col.name === 'Sin asignar' ? '—' : col.name}
                        </div>
                      )}
                    <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wider leading-tight">{col.name}</p>
                    {viewMode === 'rooms' && col.id !== 'unassigned' && (
                      <p className="text-[9px] text-slate-400 uppercase font-medium mt-0.5">Capacidad 1</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div ref={dailyTimelineRef} className="flex-1 overflow-y-auto relative custom-scrollbar">
              <div className="hidden md:flex min-h-[1232px]">
                <div className="w-16 border-r border-slate-100 bg-slate-50/20 sticky left-0 z-20 backdrop-blur-sm">
                  {HOURS.map((hour) => (
                    <div key={hour} className="relative h-[88px] border-b border-slate-200/60 flex items-start justify-center pt-2">
                      <span className="text-[10px] font-black text-slate-400">{hour.toString().padStart(2, '0')}:00</span>
                      <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200/80" />
                    </div>
                  ))}
                </div>

                <div
                  className={cn('flex-1 grid divide-x divide-slate-100 relative', viewMode === 'professionals' ? 'grid-cols-7' : 'grid-cols-4')}
                >
                  {columns.map((col) => {
                    const columnAppointments = getAppointmentsForColumn(col.id);

                    return (
                      <div
                        key={col.id}
                        className="relative h-full cursor-cell transition-colors hover:bg-slate-50/50"
                      >
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            className="relative h-[88px] border-b border-slate-200/60 w-full cursor-cell"
                            onClick={(event) => handleEmptySlotClick(event, hour, col)}
                          >
                            <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200/70" />
                          </div>
                        ))}

                        {columnAppointments.length === 0 ? (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="px-3 py-2 rounded-xl border border-dashed border-slate-200 bg-white/80 text-[10px] font-bold text-slate-400">
                              Sin turnos
                            </div>
                          </div>
                        ) : null}

                        {columnAppointments.map((app) => {
                  const pro = professionals.find((p) => p.id === app.professionalId || app.proId);
                          const room = ROOMS.find((r) => r.id === app.roomId);

                          return (
                            <motion.div
                              key={app.id}
                              initial={{ opacity: 0, scale: 0.96 }}
                              animate={{ opacity: 1, scale: 1 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenModal(room?.name, pro?.name, app);
                              }}
                              style={{
                                top: `${getPositionFromTime(app.start)}px`,
                                height: `${getHeightFromInterval(app.start, app.end || app.start)}px`,
                              }}
                              className={cn(
                                'absolute left-1 right-1 rounded-2xl p-2.5 border shadow-sm group cursor-pointer overflow-hidden transition-all hover:ring-2 ring-blue-100',
                                getTypeStyles(app.kind || app.type),
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[8px] font-black tracking-[0.18em] uppercase px-1.5 py-0.5 rounded-full bg-white/80 text-slate-900 border border-white/80">
                                  {formatTimeOnly(app.start)} - {formatTimeOnly(app.end)}
                                </span>
                                <span className="text-[8px] font-black tracking-widest uppercase opacity-75">
                                  {getCoverageLabel(app)}
                                </span>
                              </div>

                              <p className="text-[12px] font-bold truncate leading-tight mt-1">{getAppointmentName(app)}</p>
                              <p className="text-[10px] font-medium truncate opacity-85 mt-0.5">
                                {getTypeLabel(app.kind || app.type)} · {getCorrespondsToLabel(app)}
                              </p>
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 p-2 md:p-6 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-2xl md:rounded-3xl overflow-hidden">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                <div
                  key={day}
                  className="bg-slate-50 py-1 px-1 text-center text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]"
                >
                  {day}
                </div>
              ))}

              {eachDayOfInterval({
                start: startOfWeek(startOfMonth(selectedDate)),
                end: endOfWeek(endOfMonth(selectedDate)),
              }).map((day) => {
                const dayAppointments = sortByStart(
                  appointments.filter((appointment) => {
                    const appointmentDate = parseDay(appointment.date);
                    return appointmentDate ? isSameDay(appointmentDate, day) : false;
                  }),
                );

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'min-h-[76px] md:min-h-[140px] bg-white/85 p-1 md:p-2 border-slate-50 transition-colors hover:bg-slate-50/60 cursor-pointer backdrop-blur-sm',
                      !isSameMonth(day, selectedDate) && 'opacity-30',
                    )}
                    onClick={() => {
                      setSelectedDate(day);
                      setTimeMode('daily');
                    }}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={cn(
                          'text-[10px] md:text-xs font-bold',
                          isSameDay(day, new Date())
                            ? 'w-5 h-5 md:w-6 md:h-6 flex items-center justify-center bg-blue-600 text-white rounded-full'
                            : 'text-slate-400',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayAppointments.length > 0 && (
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {dayAppointments.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayAppointments.slice(0, 2).map((app) => {
                        const pro = professionals.find((p) => p.id === app.professionalId || app.proId);
                        const room = ROOMS.find((r) => r.id === app.roomId);
                        return (
                          <div
                            key={app.id}
                            className={cn(
                              'text-[7px] md:text-[9px] px-1 py-1 rounded-lg font-bold truncate border leading-tight',
                              getTypeStyles(app.kind || app.type),
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">{formatTimeOnly(app.start)} {getAppointmentName(app)}</span>
                              <span className="shrink-0 opacity-70">{getCoverageLabel(app)}</span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-2 text-[7px] font-bold uppercase opacity-70">
                              <span className="truncate">{getTypeLabel(app.kind || app.type)}</span>
                              <span className="truncate">{room?.name || pro?.name || 'Sin asignar'}</span>
                            </div>
                          </div>
                        );
                      })}

                      {dayAppointments.length > 2 && (
                        <div className="text-[8px] text-slate-400 font-bold pl-1">+ {dayAppointments.length - 2} más</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
