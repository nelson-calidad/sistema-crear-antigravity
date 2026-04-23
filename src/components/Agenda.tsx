/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Calendar as CalendarIcon,
  Users,
  MapPin,
  BadgeInfo,
  Printer,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { AppointmentRecord } from '../types';
import { ROOMS } from '../constants';
import { buildDailyPdfHtml, buildMonthlyPdfHtml, openPrintableReport } from '../lib/appointmentPdf';
import { useProfessionals } from '../lib/professionalsStore';

const HOURS = Array.from({ length: 14 }, (_, i) => 8 + i);
const UNASSIGNED_COLUMN = { id: 'unassigned', name: 'Sin asignar', color: 'bg-slate-400' };

type AgendaProps = {
  onOpenModal: (room?: string, pro?: string, app?: AppointmentRecord) => void;
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

  if (!raw) {
    return 'Sin nombre';
  }

  return raw;
};

const getTypeLabel = (type?: string) => {
  if (type === 'interview') return 'Entrevista';
  if (type === 'survey') return 'Encuesta';
  return 'Sesión';
};

const getTypeStyles = (type?: string) => {
  if (type === 'interview') return 'bg-amber-50 text-amber-900 border-amber-200';
  if (type === 'survey') return 'bg-slate-900 text-white border-slate-800';
  return 'bg-blue-50 text-blue-900 border-blue-200';
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

const hasAssignment = (appointment: AppointmentRecord) => Boolean(appointment.proId || appointment.roomId);

export const Agenda = ({ onOpenModal, appointments, focusDate }: AgendaProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'professionals' | 'rooms'>('professionals');
  const [timeMode, setTimeMode] = useState<'daily' | 'monthly'>('daily');
  const hasSyncedInitialDateRef = useRef(false);
  const dailyTimelineRef = useRef<HTMLDivElement | null>(null);
  const [professionals] = useProfessionals();

  const getCorrespondsToLabel = (appointment: AppointmentRecord) => {
    const pro = professionals.find((p) => p.id === appointment.proId);
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

  const visibleAppointments = sortByStart(selectedDateAppointments);
  const getPositionFromTime = (timeStr: string) => {
    const minutesSinceStart = parseTimeToMinutes(timeStr) - (8 * 60);
    return (minutesSinceStart / 60) * 100;
  };

  const getHeightFromInterval = (start: string, end: string) => {
    const duration = parseTimeToMinutes(end) - parseTimeToMinutes(start);
    return Math.max((duration / 60) * 100, 70);
  };

  const isUnassigned = (appointment: AppointmentRecord) => !appointment.proId && !appointment.roomId;

  const matchesColumn = (appointment: AppointmentRecord, columnId: string) => {
    if (columnId === 'unassigned') return isUnassigned(appointment);
    return viewMode === 'professionals'
      ? appointment.proId === columnId
      : appointment.roomId === columnId;
  };

  const handleDailyPdf = () => {
    const html = buildDailyPdfHtml(selectedDate, appointments);
    openPrintableReport(`Agenda diaria - ${format(selectedDate, 'dd-MM-yyyy')}`, html);
  };

  const handleMonthlyPdf = () => {
    const html = buildMonthlyPdfHtml(selectedDate, appointments);
    openPrintableReport(`Agenda mensual - ${format(selectedDate, 'MMMM yyyy')}`, html);
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
    <div className="h-full flex flex-col gap-2 md:gap-4 min-h-0">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
              <CalendarIcon className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-[2rem] font-black text-slate-900 tracking-tight leading-tight">
                Agenda Operativa
              </h1>
              <p className="text-xs md:text-sm text-slate-500 max-w-xl">
                {timeMode === 'daily'
                  ? 'Controla turnos por profesional o consultorio con lectura rápida.'
                  : 'Visualiza la carga del mes y entra al día con un clic.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] md:text-[10px] font-bold">
              <BadgeInfo className="w-3 h-3" />
              {format(selectedDate, 'EEEE, d MMMM')}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[9px] md:text-[10px] font-bold">
              {selectedDateAppointments.length} turno{selectedDateAppointments.length === 1 ? '' : 's'} en el día
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] md:text-[10px] font-bold">
              {currentMonthAppointments.length} turno{currentMonthAppointments.length === 1 ? '' : 's'} en el mes
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-2">
          <div className="flex bg-slate-100 p-0.5 rounded-xl gap-1 w-full md:w-auto">
            <button
              onClick={() => setTimeMode('daily')}
              className={cn(
                'flex-1 md:flex-none px-3 py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-[0.22em] transition-all',
                timeMode === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500',
              )}
            >
              Día
            </button>
            <button
              onClick={() => setTimeMode('monthly')}
              className={cn(
                'flex-1 md:flex-none px-3 py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-[0.22em] transition-all',
                timeMode === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500',
              )}
            >
              Mes
            </button>
          </div>

          {timeMode === 'daily' && (
            <div className="flex bg-white rounded-xl border border-slate-100 p-1 shadow-sm w-full md:w-auto">
              <button
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                className="p-2 hover:bg-slate-50 rounded-lg transition-colors shrink-0"
              >
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
              <div className="px-2.5 py-1.5 font-bold text-slate-700 text-center flex-1 md:min-w-[170px] text-[11px] md:text-sm leading-tight">
                {format(selectedDate, 'EEEE, d MMMM')}
              </div>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="p-2 hover:bg-slate-50 rounded-lg transition-colors shrink-0"
              >
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}

          {timeMode === 'daily' && (
            <div className="bg-slate-100 p-0.5 rounded-xl flex gap-1 w-full md:w-auto">
              <button
                onClick={() => setViewMode('professionals')}
                className={cn(
                  'flex-1 md:flex-none px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-bold transition-all inline-flex items-center justify-center gap-1.5',
                  viewMode === 'professionals' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <Users className="w-3 h-3" />
                Profesionales
              </button>
              <button
                onClick={() => setViewMode('rooms')}
                className={cn(
                  'flex-1 md:flex-none px-3 py-1.5 rounded-lg text-[10px] md:text-[11px] font-bold transition-all inline-flex items-center justify-center gap-1.5',
                  viewMode === 'rooms' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <MapPin className="w-3 h-3" />
                Consultorios
              </button>
            </div>
          )}

          <button
            onClick={() => onOpenModal()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 w-full md:w-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Bloque
          </button>

          <button
            onClick={handleDailyPdf}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors shadow-sm w-full md:w-auto"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF Día
          </button>

          <button
            onClick={handleMonthlyPdf}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors shadow-sm w-full md:w-auto"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF Mes
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-0">
        {timeMode === 'daily' ? (
          <>
            <div className="md:hidden p-3 pb-4 space-y-3 overflow-y-auto custom-scrollbar">
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {professionals.map((professional) => {
                  const count = selectedDateAppointments.filter((appointment) => appointment.proId === professional.id).length;
                  const isActive = count > 0;

                  return (
                    <button
                      key={professional.id}
                      type="button"
                      onClick={() => {
                        if (count === 0) return;
                        const first = selectedDateAppointments.find((appointment) => appointment.proId === professional.id);
                        if (first) {
                          onOpenModal(
                            ROOMS.find((room) => room.id === first.roomId)?.name,
                            professional.name,
                            first,
                          );
                        }
                      }}
                      className={cn(
                        'min-w-[118px] px-3 py-2 rounded-2xl border text-left transition-all shrink-0',
                        isActive ? 'bg-white border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-70',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-[10px]', professional.color)}>
                          {professional.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-900 truncate">{professional.name}</p>
                          <p className="text-[9px] uppercase font-bold text-slate-400 truncate">{professional.specialty}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.14em]">
                        <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{count} turnos</span>
                        <span className="text-slate-400">{professional.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {visibleAppointments.length === 0 ? (
                <div className="p-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <p className="text-sm font-bold text-slate-700">No hay turnos para este día</p>
                  <p className="text-xs text-slate-500 mt-1">Creá un bloque nuevo para empezar.</p>
                </div>
              ) : (
                visibleAppointments.map((app) => {
                  const pro = professionals.find((p) => p.id === app.proId);
                  const room = ROOMS.find((r) => r.id === app.roomId);

                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => onOpenModal(room?.name, pro?.name, app)}
                      className={cn('w-full text-left rounded-2xl p-3 border shadow-sm', getTypeStyles(app.type))}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-1.5">
                            {app.start} - {app.end}
                          </p>
                          <p className="font-bold text-[13px] truncate leading-tight">{getAppointmentName(app)}</p>
                          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-80 truncate">
                            {getTypeLabel(app.type)}
                          </p>
                          <p className="mt-1.5 text-[11px] opacity-80 truncate">
                            {getCorrespondsToLabel(app)}
                          </p>
                        </div>
                        <span className="text-[10px] font-black uppercase opacity-75 shrink-0">
                          {getCoverageLabel(app)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[9px] font-bold uppercase opacity-70">
                        <span>{getCoverageLabel(app)}</span>
                        <span>{getCorrespondsToLabel(app)}</span>
                      </div>
                    </button>
                  );
                })
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
              <div className="hidden md:flex min-h-[1300px]">
                <div className="w-16 border-r border-slate-100 bg-slate-50/20 sticky left-0 z-20 backdrop-blur-sm">
                  {HOURS.map((hour) => (
                    <div key={hour} className="h-[96px] border-b border-slate-100/50 flex items-start justify-center pt-2">
                      <span className="text-[10px] font-black text-slate-400">{hour.toString().padStart(2, '0')}:00</span>
                    </div>
                  ))}
                </div>

                <div
                  className={cn('flex-1 grid divide-x divide-slate-100 relative', viewMode === 'professionals' ? 'grid-cols-7' : 'grid-cols-4')}
                >
                  {columns.map((col) => {
                    const columnAppointments = visibleAppointments.filter((appointment) => matchesColumn(appointment, col.id));

                    return (
                      <div
                        key={col.id}
                        className="relative h-full cursor-cell transition-colors hover:bg-slate-50/50"
                        onClick={() =>
                          onOpenModal(
                            viewMode === 'rooms' ? (col.id === 'unassigned' ? undefined : col.name) : undefined,
                            viewMode === 'professionals' ? (col.id === 'unassigned' ? undefined : col.name) : undefined,
                          )
                        }
                      >
                        {HOURS.map((hour) => (
                          <div key={hour} className="h-[96px] border-b border-slate-50 w-full" />
                        ))}

                        {columnAppointments.length === 0 ? (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="px-3 py-2 rounded-xl border border-dashed border-slate-200 bg-white/80 text-[10px] font-bold text-slate-400">
                              Sin turnos
                            </div>
                          </div>
                        ) : null}

                        {columnAppointments.map((app) => {
                  const pro = professionals.find((p) => p.id === app.proId);
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
                                getTypeStyles(app.type),
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[8px] font-black tracking-[0.18em] uppercase px-1.5 py-0.5 rounded-full bg-white/75 border border-white/60">
                                  {formatTimeOnly(app.start)}
                                </span>
                                <span className="text-[8px] font-black tracking-widest uppercase opacity-75">
                                  {getCoverageLabel(app)}
                                </span>
                              </div>

                              <p className="text-[12px] font-bold truncate leading-tight mt-1">{getAppointmentName(app)}</p>
                              <p className="text-[10px] font-medium truncate opacity-80 mt-0.5">
                                {getTypeLabel(app.type)} - {getCorrespondsToLabel(app)}
                              </p>

                              <div className="mt-1.5 flex items-center justify-between gap-1 text-[8px] font-bold uppercase tracking-wide opacity-75">
                                <span className="truncate">{getCoverageLabel(app)}</span>
                                <span className="shrink-0">{formatTimeOnly(app.end)}</span>
                              </div>
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
                      'min-h-[76px] md:min-h-[140px] bg-white p-1 md:p-2 border-slate-50 transition-colors hover:bg-slate-50/50 cursor-pointer',
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
                        const pro = professionals.find((p) => p.id === app.proId);
                        const room = ROOMS.find((r) => r.id === app.roomId);
                        return (
                          <div
                            key={app.id}
                            className={cn(
                              'text-[7px] md:text-[9px] px-1 py-1 rounded-lg font-bold truncate border leading-tight',
                              getTypeStyles(app.type),
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                            <span className="truncate">
                                {formatTimeOnly(app.start)} {getAppointmentName(app)}
                              </span>
                              <span className="shrink-0 opacity-70">{getCoverageLabel(app)}</span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-2 text-[7px] font-bold uppercase opacity-70">
                              <span className="truncate">{getTypeLabel(app.type)}</span>
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
