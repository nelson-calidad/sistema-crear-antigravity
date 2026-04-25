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
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, isAppointmentActiveOnDate, parseDay } from '../lib/utils';
import { AppointmentRecord } from '../types';
import { ROOMS } from '../constants';
import { buildDailyPdfHtml, buildMonthlyPdfHtml, buildWeeklyAvailabilityPdfHtml, openPrintableReport } from '../lib/appointmentPdf';
import { useProfessionals } from '../lib/professionalsStore';
import { forceRefreshAppointments } from '../lib/appointmentsStore';

const HOURS = Array.from({ length: 14 }, (_, i) => 8 + i);
const HOUR_HEIGHT = 160;
const DEFAULT_SESSION_DURATION = 45;
const UNASSIGNED_COLUMN = { id: 'unassigned', name: 'Sin asignar', color: 'bg-slate-400 dark:bg-slate-600' };

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
  date?: Date;
};

// Removed local parseDay as it's now in utils

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
  if (kind === 'block') return 'Otros';
  return 'Sesión';
};

const getTypeStyles = (kind?: string) => {
  if (kind === 'interview') return 'bg-amber-100 text-amber-950 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800';
  if (kind === 'block') return 'bg-violet-100 text-violet-950 border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800';
  return 'bg-sky-100 text-sky-950 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800';
};

const getKindBadgeStyles = (kind?: string) => {
  if (kind === 'interview') return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50';
  if (kind === 'block') return 'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/50';
  return 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/50';
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

  // Two intervals [A, B) and [C, D) overlap if max(A, C) < min(B, D)
  return Math.max(startAMinutes, startBMinutes) < Math.min(endAMinutes, endBMinutes);
};

const sortByStart = (items: AppointmentRecord[]) => [...items].sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'confirmed': return 'bg-blue-400';
    case 'waiting': return 'bg-amber-400';
    case 'in-session': return 'bg-emerald-400';
    case 'completed': return 'bg-slate-400';
    case 'cancelled': return 'bg-rose-400';
    default: return 'bg-slate-200 dark:bg-slate-700';
  }
};

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'confirmed': return 'Confirmado';
    case 'waiting': return 'En espera';
    case 'in-session': return 'En sesión';
    case 'completed': return 'Finalizado';
    case 'cancelled': return 'Ausente';
    default: return 'Agendado';
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
  const sorted = [...appointments].sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));
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

const hasAssignment = (appointment: AppointmentRecord) => Boolean(appointment.professionalId || appointment.proId || appointment.roomId);

const formatDateEs = (date: Date, pattern: string) =>
  format(date, pattern, { locale: es });

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const Agenda = ({ onOpenModal, appointments, focusDate }: AgendaProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'professionals' | 'rooms'>('professionals');
  const [timeMode, setTimeMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  const weeklyAppointmentsByDay = useMemo(() => {
    if (timeMode !== 'weekly') return new Map<string, AppointmentRecord[]>();
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const map = new Map<string, AppointmentRecord[]>();
    days.forEach(day => {
       const apps = sortByStart(appointments.filter(app => isAppointmentActiveOnDate(app, day)));
       map.set(format(day, 'yyyy-MM-dd'), apps);
    });
    return map;
  }, [appointments, selectedDate, timeMode]);
  const hasSyncedInitialDateRef = useRef(false);
  const dailyTimelineRef = useRef<HTMLDivElement | null>(null);
  const [professionals] = useProfessionals();

  const getCorrespondsToLabel = (appointment: AppointmentRecord) => {
    const pro = professionals.find((p) => p.id === (appointment.professionalId || appointment.proId));
    const room = ROOMS.find((r) => r.id === appointment.roomId);

    if (pro && room) return `${pro.name} · ${room.name}`;
    if (pro) return pro.name;
    if (room) return room.name;
    return 'Sin asignar';
  };

  const getProfessionalName = (appointment: AppointmentRecord) => {
    const pro = professionals.find((p) => p.id === (appointment.professionalId || appointment.proId));
    return pro?.name || 'Sin profesional';
  };

  const getRoomName = (appointment: AppointmentRecord) => {
    const room = ROOMS.find((r) => r.id === appointment.roomId);
    return room?.name || 'Sin consultorio';
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
      appointments.filter((appointment) => isAppointmentActiveOnDate(appointment, selectedDate)),
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
      // Para el mes, expandimos todos los días del mes y vemos si el turno cae en alguno
      const daysInMonth = eachDayOfInterval({
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate),
      });
      return daysInMonth.some((day) => isAppointmentActiveOnDate(appointment, day));
    });
  }, [appointments, selectedDate]);

  const columns: CalendarColumn[] = useMemo(() => {
    if (timeMode === 'weekly') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      return days.map(day => ({
        id: format(day, 'yyyy-MM-dd'),
        name: format(day, 'EEEE', { locale: es }).substring(0, 3),
        date: day
      }));
    }

    const base = viewMode === 'professionals'
      ? professionals.map((pro) => ({ id: pro.id, name: pro.name, color: pro.color }))
      : ROOMS.map((room) => ({ id: room.id, name: room.name }));

    const hasUnassigned = selectedDateAppointments.some((app) => !hasAssignment(app));
    return hasUnassigned ? [...base, UNASSIGNED_COLUMN] : base;
  }, [selectedDateAppointments, viewMode, timeMode, selectedDate]);

  const mobileRoomColumns = useMemo(() => {
    const roomPalette = ['bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-sky-500'];
    const previewLimit = 2;

    return ROOMS.map((room, index) => ({
      ...room,
      colorClass: roomPalette[index % roomPalette.length],
      ...(() => {
        const roomAppointments = sortByStart(selectedDateAppointments.filter((appointment) => appointment.roomId === room.id));
        return {
          totalAppointments: roomAppointments.length,
          appointments: roomAppointments.slice(0, previewLimit),
          overflowCount: Math.max(roomAppointments.length - previewLimit, 0),
        };
      })(),
    }));
  }, [selectedDateAppointments]);

  const visibleAppointments = sortByStart(selectedDateAppointments);
  const getAppointmentsForColumn = (columnId: string) => {
    if (timeMode === 'weekly') {
      return weeklyAppointmentsByDay.get(columnId) || [];
    }
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

  const handleWeeklyPdf = () => {
    const html = buildWeeklyAvailabilityPdfHtml(selectedDate, appointments);
    openPrintableReport(`Disponibilidad semanal - ${formatDateEs(selectedDate, 'dd-MM-yyyy')}`, html);
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
    const appointmentDate = timeMode === 'weekly' ? col.id : format(selectedDate, 'yyyy-MM-dd');

    onOpenModal(
      timeMode === 'weekly' ? undefined : (viewMode === 'rooms' ? (col.id === 'unassigned' ? undefined : col.name) : undefined),
      timeMode === 'weekly' ? undefined : (viewMode === 'professionals' ? (col.id === 'unassigned' ? undefined : col.name) : undefined),
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
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          {/* Título y Filtros Principales */}
          <div className="flex flex-wrap items-center gap-2 lg:gap-3">
            <div className="hidden md:flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-lg font-black tracking-tight shrink-0">Agenda</h1>
            </div>

            <div className="flex bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-lg gap-0.5 border border-slate-200/70 dark:border-slate-700/50 shrink-0">
              <button
                onClick={() => setTimeMode('daily')}
                className={cn(
                  'px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all',
                  timeMode === 'daily' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                )}
              >
                Día
              </button>
              <button
                onClick={() => setTimeMode('weekly')}
                className={cn(
                  'px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all',
                  timeMode === 'weekly' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                )}
              >
                Semana
              </button>
              <button
                onClick={() => setTimeMode('monthly')}
                className={cn(
                  'px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all',
                  timeMode === 'monthly' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                )}
              >
                Mes
              </button>
            </div>

            {(timeMode === 'daily' || timeMode === 'weekly') && (
              <>
                <div className="hidden md:flex bg-white/80 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 shadow-sm shrink-0">
                  <button onClick={() => setSelectedDate(subDays(selectedDate, timeMode === 'weekly' ? 7 : 1))} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md">
                    <ChevronLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>
                  <div className="px-2 py-1 font-bold text-slate-700 dark:text-slate-200 text-center min-w-[120px] text-[10px]">
                    {timeMode === 'weekly'
                      ? `${formatDateEs(startOfWeek(selectedDate, {weekStartsOn: 1}), 'd MMM')} - ${formatDateEs(endOfWeek(selectedDate, {weekStartsOn: 1}), 'd MMM yyyy')}`
                      : titleCase(formatDateEs(selectedDate, 'EEEE, d MMMM'))
                    }
                  </div>
                  <button onClick={() => setSelectedDate(addDays(selectedDate, timeMode === 'weekly' ? 7 : 1))} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md">
                    <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>

                <div className="md:hidden flex-1 overflow-x-auto custom-scrollbar-hide flex gap-2 pb-1">
                  {Array.from({ length: 11 }).map((_, i) => {
                    const d = addDays(subDays(selectedDate, 5), i);
                    const isSelected = isSameDay(d, selectedDate);
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(d)}
                        className={cn(
                          "flex flex-col items-center justify-center min-w-[44px] h-[56px] rounded-2xl transition-all border",
                          isSelected 
                            ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-200 dark:shadow-none" 
                            : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        )}
                      >
                        <span className={cn("text-[9px] font-black uppercase tracking-widest", isSelected ? "text-blue-100" : "text-slate-400")}>
                          {formatDateEs(d, 'EEE')}
                        </span>
                        <span className="text-[15px] font-black leading-none mt-1">
                          {formatDateEs(d, 'd')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-lg flex gap-0.5 border border-slate-200/70 dark:border-slate-700/50 shrink-0">
                  <button
                    onClick={() => setViewMode('professionals')}
                    className={cn(
                      'px-2 py-1 rounded-md text-[9px] font-bold transition-all flex items-center gap-1',
                      viewMode === 'professionals' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400',
                    )}
                  >
                    <Users className="w-3 h-3" /> Prof.
                  </button>
                  <button
                    onClick={() => setViewMode('rooms')}
                    className={cn(
                      'px-2 py-1 rounded-md text-[9px] font-bold transition-all flex items-center gap-1',
                      viewMode === 'rooms' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400',
                    )}
                  >
                    <MapPin className="w-3 h-3" /> Cons.
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            <button
              onClick={() => onOpenModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-bold text-[10px] hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Nuevo
            </button>
            <div className="flex bg-white/80 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 shadow-sm">
              <button onClick={handleDailyPdf} title="PDF Diario" className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-400">
                <Printer className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleWeeklyPdf} title="PDF Semanal" className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-400">
                <CalendarIcon className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleMonthlyPdf} title="PDF Mensual" className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-400">
                <CalendarIcon className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>
            <button
              onClick={() => forceRefreshAppointments().catch(() => {})}
              title="Refrescar"
              className="p-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Barra de Estadísticas Ultraslim */}
        <div className="hidden md:flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
            <span className="text-slate-400 dark:text-slate-500">Turnos</span>
            <span className="text-slate-900 dark:text-slate-100">{appointmentKindSummary.total}</span>
          </div>
          <div className={cn('flex items-center gap-1.5 px-2 py-1 border rounded-lg shadow-sm', getKindBadgeStyles('session'))}>
            <span className="opacity-80">Sesiones</span>
            <span>{appointmentKindSummary.session}</span>
          </div>
          <div className={cn('flex items-center gap-1.5 px-2 py-1 border rounded-lg shadow-sm', getKindBadgeStyles('interview'))}>
            <span className="opacity-80">Entrevistas</span>
            <span>{appointmentKindSummary.interview}</span>
          </div>
          <div className={cn('flex items-center gap-1.5 px-2 py-1 border rounded-lg shadow-sm', getKindBadgeStyles('block'))}>
            <span className="opacity-80">Otros</span>
            <span>{appointmentKindSummary.block}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm ml-auto">
            <span className="text-slate-400 dark:text-slate-500">{resourceAvailability.label}</span>
            <span className="text-slate-900 dark:text-slate-100">{resourceAvailability.free}/{resourceAvailability.total}</span>
            <span className="text-[7px] text-slate-400">({resourceAvailability.busy} ocp)</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white/80 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col min-h-0 backdrop-blur-sm">
        {(timeMode === 'daily' || timeMode === 'weekly') ? (
          <>
            <div className="md:hidden p-2 pb-2 space-y-2 overflow-y-auto custom-scrollbar">
              {viewMode === 'professionals' ? (
                <>
                  {visibleAppointments.length === 0 ? (
                    <div className="p-4 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-center">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No hay turnos para este día</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Creá un bloque nuevo para empezar.</p>
                    </div>
                  ) : (
                    visibleAppointments.map((app) => {
                      const pro = professionals.find((p) => p.id === (app.professionalId || app.proId));
                      const room = ROOMS.find((r) => r.id === app.roomId);

                      return (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => onOpenModal(room?.name, pro?.name, app)}
                          className={cn('w-full text-left rounded-[1.9rem] p-4.5 md:p-4 border shadow-md dark:shadow-none backdrop-blur-sm min-h-[118px]', getTypeStyles(app.kind || app.type))}
                        >
                          <div className="flex items-start justify-between gap-3.5">
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-black uppercase tracking-[0.18em] mb-1.5">
                                {app.start} - {app.end}
                              </p>
                              <p className="font-black text-[17px] truncate leading-tight">{getAppointmentName(app)}</p>
                              <div className="mt-2 grid gap-0.5 text-[11px] font-semibold opacity-85">
                                <p className="truncate">{getTypeLabel(app.kind || app.type)} · Prof. {pro?.name || 'Sin profesional'}</p>
                                <p className="truncate">Consultorio {room?.name || 'Sin asignar'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full shrink-0", getStatusColor(app.status))} />
                              <span className="text-[10px] font-black uppercase opacity-75 shrink-0 flex items-center gap-1">
                                {app.recurrence && app.recurrence !== 'none' && <Repeat className="w-2.5 h-2.5" />}
                                {getCoverageLabel(app)}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                   {mobileRoomColumns.map((room) => (
                     <div
                       key={room.id}
                       className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-sm p-1 min-h-[172px] flex flex-col"
                     >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <div className={cn('w-5 h-5 rounded-lg flex items-center justify-center text-white font-black text-[8px]', room.colorClass)}>
                            {room.name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[8px] font-black text-slate-900 dark:text-slate-100 truncate leading-tight">{room.name}</p>
                          </div>
                        </div>
                        <span className="text-[7px] font-black uppercase tracking-[0.08em] text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900/50 px-1 py-0.5 rounded-full shrink-0">
                          {room.totalAppointments}
                        </span>
                      </div>

                      <div className="flex-1 space-y-[3px]">
                        {room.appointments.length === 0 ? (
                          <div className="h-full min-h-[128px] rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 px-1 py-1 text-center flex items-center justify-center">
                            <div>
                              <div className="mx-auto mb-1 h-6 w-6 rounded-full bg-slate-200/80 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[10px] font-black">
                                0
                              </div>
                              <p className="text-[8px] font-bold text-slate-700 dark:text-slate-400">Libre</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {room.appointments.map((app) => {
                              const pro = professionals.find((p) => p.id === app.professionalId || p.id === app.proId);
                              const appointmentRoom = ROOMS.find((r) => r.id === app.roomId);
                              const kind = app.kind || app.type;
                              return (
                                <button
                                  key={app.id}
                                  type="button"
                                  onClick={() => onOpenModal(room.name, pro?.name, app)}
                                  className={cn(
                                    'w-full text-left rounded-xl px-1 py-1 border shadow-sm backdrop-blur-sm min-h-[40px] flex items-center',
                                    getTypeStyles(kind),
                                  )}
                                >
                                  <div className="flex items-center gap-1.5 w-full min-w-0">
                                    <div className="shrink-0 w-7 text-[8px] font-black leading-none text-center">
                                      <div>{app.start}</div>
                                      <div className="text-[7px] opacity-70">-</div>
                                      <div>{app.end}</div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1 min-w-0">
                                        <span className="h-1.5 w-1.5 rounded-full bg-current/70 shrink-0" />
                                        <p className="font-black text-[9px] truncate leading-tight">{getAppointmentName(app)}</p>
                                      </div>
                                      <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-wide opacity-80 truncate">
                                        {getTypeLabel(kind)} · {pro?.name || 'Sin profesional'}
                                      </p>
                                      <p className="text-[7px] font-bold opacity-75 truncate">{appointmentRoom?.name || room.name}</p>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                            {room.overflowCount > 0 ? (
                              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-1 py-1 text-center">
                                <p className="text-[7px] font-bold text-slate-500">+{room.overflowCount} más</p>
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden md:flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
              <div className="w-16 border-r border-slate-100 dark:border-slate-800 flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/50">
                <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </div>
              <div
                className={cn('flex-1 grid divide-x divide-slate-100 dark:divide-slate-800', (viewMode === 'professionals' && timeMode === 'daily') || timeMode === 'weekly' ? 'grid-cols-7' : 'grid-cols-4')}
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
                        <div className={cn("w-9 h-9 rounded-xl mx-auto mb-1.5 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-bold shadow-sm", timeMode === 'weekly' ? 'text-lg' : 'text-xs')}>
                          {timeMode === 'weekly' ? (col.date ? format(col.date, 'd') : '—') : (col.name === 'Sin asignar' ? '—' : col.name)}
                        </div>
                      )}
                    <p className="text-[10px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider leading-tight">{col.name}</p>
                    {viewMode === 'rooms' && col.id !== 'unassigned' && (
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-medium mt-0.5">Capacidad 1</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div ref={dailyTimelineRef} className="flex-1 overflow-y-auto relative custom-scrollbar">
              <div className="hidden md:flex" style={{ minHeight: `${HOURS.length * HOUR_HEIGHT}px` }}>
                <div className="w-16 border-r border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/20 sticky left-0 z-20 backdrop-blur-sm">
                  {HOURS.map((hour) => (
                    <div key={hour} className="relative border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col items-center justify-between py-2" style={{ height: `${HOUR_HEIGHT}px` }}>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 absolute top-2">{hour.toString().padStart(2, '0')}:00</span>
                      <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 absolute top-[50%] -translate-y-1/2 bg-slate-50/80 dark:bg-slate-900/80 px-1 rounded">{hour.toString().padStart(2, '0')}:30</span>
                      <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200/80 dark:border-slate-800/50 -z-10" />
                    </div>
                  ))}
                </div>

                <div
                  className={cn('flex-1 grid divide-x divide-slate-100 dark:divide-slate-800 relative', (viewMode === 'professionals' && timeMode === 'daily') || timeMode === 'weekly' ? 'grid-cols-7' : 'grid-cols-4')}
                >
                  {columns.map((col) => {
                    const columnAppointments = getAppointmentsForColumn(col.id);

                    return (
                      <div
                        key={col.id}
                        className="relative h-full cursor-cell transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                      >
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            className="relative border-b border-slate-200/60 dark:border-slate-800/60 w-full cursor-cell"
                            style={{ height: `${HOUR_HEIGHT}px` }}
                            onClick={(event) => handleEmptySlotClick(event, hour, col)}
                          >
                            <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200/70 dark:border-slate-800/50" />
                          </div>
                        ))}

                        {columnAppointments.length === 0 ? (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="px-3 py-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                              Sin turnos
                            </div>
                          </div>
                        ) : null}

                        {(() => {
                          const layoutInfo = resolveOverlaps(columnAppointments);
                          return columnAppointments.map((app) => {
                            const pro = professionals.find((p) => p.id === (app.professionalId || app.proId));
                            const room = ROOMS.find((r) => r.id === app.roomId);
                            const appointmentHeight = Math.max(getHeightFromInterval(app.start, app.end || app.start), 32);
                            const appLayout = layoutInfo.get(app.id) || { colIndex: 0, maxCols: 1 };
                            
                            const widthPercent = 100 / appLayout.maxCols;
                            const leftPercent = appLayout.colIndex * widthPercent;

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
                                  height: `${appointmentHeight}px`,
                                  width: `calc(${widthPercent}% - 4px)`,
                                  left: `calc(${leftPercent}% + 2px)`,
                                  zIndex: 10 + appLayout.colIndex,
                                }}
                                className={cn(
                                  'absolute rounded-xl border border-slate-900 dark:border-slate-700 shadow-sm group cursor-pointer overflow-hidden transition-all hover:ring-2 ring-blue-300 dark:ring-blue-500 flex flex-col',
                                  appointmentHeight < 60 ? 'py-1 pr-1 pl-2' : appointmentHeight < 90 ? 'py-1.5 pr-1.5 pl-3' : 'py-2 pr-2.5 pl-4',
                                  getTypeStyles(app.kind || app.type),
                                )}
                              >
                              <div className={cn('absolute left-0 top-0 bottom-0 w-2 border-r border-slate-900/10 dark:border-white/10', pro?.color || 'bg-slate-400')} />

                              <div className="flex items-start justify-between gap-1.5 relative z-10">
                                <span className="shrink-0 text-[8px] font-black leading-tight px-1.5 py-1 rounded-lg bg-white/85 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center gap-1">
                                   <div className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(app.status), app.status === 'waiting' && 'animate-pulse')} />
                                   <div className="text-center">
                                     {formatTimeOnly(app.start)}
                                     <span className="block text-[7px] opacity-70">{formatTimeOnly(app.end)}</span>
                                   </div>
                                 </span>
                                <span className="min-w-0 text-right text-[7px] font-black tracking-[0.08em] uppercase opacity-80 leading-tight bg-white/40 dark:bg-black/20 px-1.5 py-0.5 rounded shadow-sm border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-1">
                                  {app.recurrence && app.recurrence !== 'none' && <Repeat className="w-2 h-2" />}
                                  <span>{getTypeLabel(app.kind || app.type)}</span>
                                  <span className="block truncate opacity-70 ml-auto">{getCoverageLabel(app)}</span>
                                </span>
                              </div>

                              <div className="flex-1 min-h-0 flex flex-col justify-between mt-1 relative z-10">
                                <div className="flex-1 flex items-center justify-end w-full px-1">
                                  <p className={cn(
                                    "font-black leading-tight text-right line-clamp-2 overflow-hidden",
                                    appointmentHeight >= 120 ? "text-[16px] xl:text-[18px]" : 
                                    appointmentHeight < 90 ? "text-[10px]" : "text-[12px]"
                                  )}>
                                    {getAppointmentName(app)}
                                  </p>
                                </div>

                                {appointmentHeight >= 60 && (
                                  <div className={cn(
                                    "shrink-0 flex items-center justify-between w-full mt-1 bg-white/40 dark:bg-black/20 px-1.5 py-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50",
                                    appointmentHeight < 90 ? "mt-0.5" : "mt-1 py-1"
                                  )}>
                                    {appointmentHeight < 90 ? (
                                      <div className="flex items-center gap-2 text-[7px] font-bold opacity-90 truncate">
                                        <span className="truncate">Prof. {getProfessionalName(app)}</span>
                                        <span className="shrink-0 text-slate-400 dark:text-slate-500">•</span>
                                        <span className="truncate">C.{getRoomName(app)}</span>
                                      </div>
                                    ) : (
                                      <div className="grid gap-0.5 text-[8px] font-bold leading-tight opacity-90">
                                        <p className="truncate" title={getProfessionalName(app)}>Prof. {getProfessionalName(app)}</p>
                                        <p className="truncate" title={getRoomName(app)}>Cons. {getRoomName(app)}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })})()}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 p-2 md:p-6 overflow-y-auto custom-scrollbar">
           <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl md:rounded-3xl overflow-hidden">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                <div
                  key={day}
                  className="bg-slate-50 dark:bg-slate-900/50 py-1 px-1 text-center text-[7px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em]"
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
                      'min-h-[76px] md:min-h-[140px] bg-white/85 dark:bg-[#0f172a]/95 p-1 md:p-2 border-slate-50 dark:border-slate-800 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer backdrop-blur-sm',
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
                            ? 'w-5 h-5 md:w-6 md:h-6 flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white rounded-full'
                            : 'text-slate-400 dark:text-slate-500',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayAppointments.length > 0 && (
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
                          {dayAppointments.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayAppointments.slice(0, 2).map((app) => {
                        const pro = professionals.find((p) => p.id === (app.professionalId || app.proId));
                        const room = ROOMS.find((r) => r.id === app.roomId);
                        return (
                          <div
                            key={app.id}
                            className={cn(
                              'text-[7px] md:text-[9px] px-1 py-1 rounded-lg font-bold truncate border leading-tight',
                              getTypeStyles(app.kind || app.type),
                            )}
                          >
                            <div className="flex items-center justify-between gap-1 overflow-hidden">
                              <div className="flex items-center gap-1 min-w-0">
                                <div className={cn("w-1 h-1 rounded-full shrink-0", getStatusColor(app.status))} />
                                {app.recurrence && app.recurrence !== 'none' && <Repeat className="w-1.5 h-1.5 shrink-0" />}
                                <span className="truncate">{formatTimeOnly(app.start)} {getAppointmentName(app)}</span>
                              </div>
                              <span className="shrink-0 opacity-70 text-[6px]">{getCoverageLabel(app)}</span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-2 text-[7px] font-bold uppercase opacity-70">
                              <span className="truncate">{getTypeLabel(app.kind || app.type)}</span>
                              <span className="truncate">{room?.name || pro?.name || 'Sin asignar'}</span>
                            </div>
                          </div>
                        );
                      })}

                       {dayAppointments.length > 2 && (
                        <div className="text-[8px] text-slate-400 dark:text-slate-500 font-bold pl-1">+ {dayAppointments.length - 2} más</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) Mobile */}
      <button
        onClick={() => onOpenModal()}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-300 dark:shadow-none z-40 active:scale-90 transition-transform"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
};
