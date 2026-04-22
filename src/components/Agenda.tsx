/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
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
  LayoutGrid,
  Users,
  MapPin,
  BadgeInfo,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { AppointmentRecord } from '../types';
import { PROFESSIONALS, ROOMS } from '../constants';

const HOURS = Array.from({ length: 14 }, (_, i) => 8 + i);

type AgendaProps = {
  onOpenModal: (room?: string, pro?: string, app?: AppointmentRecord) => void;
  appointments: AppointmentRecord[];
};

const parseDay = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatLabel = (value?: string) => {
  if (!value) return 'Sin título';
  return value;
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

const sortByStart = (items: AppointmentRecord[]) =>
  [...items].sort((a, b) => a.start.localeCompare(b.start));

export const Agenda = ({ onOpenModal, appointments }: AgendaProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'professionals' | 'rooms'>('professionals');
  const [timeMode, setTimeMode] = useState<'daily' | 'monthly'>('daily');

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

  const columns = viewMode === 'professionals' ? PROFESSIONALS : ROOMS;

  const getPositionFromTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const minutesSinceStart = (h - 8) * 60 + m;
    return (minutesSinceStart / 60) * 100;
  };

  const getHeightFromInterval = (start: string, end: string) => {
    const [hS, mS] = start.split(':').map(Number);
    const [hE, mE] = end.split(':').map(Number);
    const duration = (hE * 60 + mE) - (hS * 60 + mS);
    return Math.max((duration / 60) * 100, 70);
  };

  const visibleAppointments = sortByStart(
    selectedDateAppointments.filter((appointment) =>
      viewMode === 'professionals' ? appointment.proId : appointment.roomId,
    ),
  );

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Agenda Operativa</h1>
              <p className="text-slate-500">
                {timeMode === 'daily'
                  ? 'Controla turnos por profesional o consultorio con lectura rápida.'
                  : 'Visualiza la carga del mes y entra al día con un clic.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
              <BadgeInfo className="w-3.5 h-3.5" />
              {format(selectedDate, 'EEEE, d MMMM')}
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
              {selectedDateAppointments.length} turno{selectedDateAppointments.length === 1 ? '' : 's'} en el día
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
              {currentMonthAppointments.length} turno{currentMonthAppointments.length === 1 ? '' : 's'} en el mes
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setTimeMode('daily')}
              className={cn(
                'px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.25em] transition-all',
                timeMode === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500',
              )}
            >
              Día
            </button>
            <button
              onClick={() => setTimeMode('monthly')}
              className={cn(
                'px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.25em] transition-all',
                timeMode === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500',
              )}
            >
              Mes
            </button>
          </div>

          {timeMode === 'daily' && (
            <div className="flex bg-white rounded-xl border border-slate-100 p-1 shadow-sm">
              <button
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div className="px-4 py-2 font-bold text-slate-700 min-w-[180px] text-center">
                {format(selectedDate, 'EEEE, d MMMM')}
              </div>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          )}

          {timeMode === 'daily' && (
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
              <button
                onClick={() => setViewMode('professionals')}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-2',
                  viewMode === 'professionals' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <Users className="w-3.5 h-3.5" />
                Profesionales
              </button>
              <button
                onClick={() => setViewMode('rooms')}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-2',
                  viewMode === 'rooms' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <MapPin className="w-3.5 h-3.5" />
                Consultorios
              </button>
            </div>
          )}

          <button
            onClick={() => onOpenModal()}
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            Nuevo Bloque
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col">
        {timeMode === 'daily' ? (
          <>
            <div className="flex border-b border-slate-100 bg-slate-50/40">
              <div className="w-20 border-r border-slate-100 flex items-center justify-center bg-slate-100/50">
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div
                className={cn(
                  'flex-1 grid divide-x divide-slate-100',
                  viewMode === 'professionals' ? 'grid-cols-6' : 'grid-cols-3',
                )}
              >
                {columns.map((col) => (
                  <div key={col.id} className="p-4 text-center">
                    {'color' in col ? (
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center text-white font-bold shadow-sm',
                          col.color,
                        )}
                      >
                        {col.name[0]}
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-white text-slate-900 border border-slate-200 font-bold shadow-sm">
                        {col.name}
                      </div>
                    )}
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">{col.name}</p>
                    {viewMode === 'rooms' && (
                      <p className="text-[9px] text-slate-400 uppercase font-medium mt-0.5">Capacidad: 1</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto relative custom-scrollbar">
              <div className="flex min-h-[1300px]">
                <div className="w-20 border-r border-slate-100 bg-slate-50/20 sticky left-0 z-20 backdrop-blur-sm">
                  {HOURS.map((hour) => (
                    <div key={hour} className="h-[100px] border-b border-slate-100/50 flex items-start justify-center pt-2">
                      <span className="text-[10px] font-black text-slate-400">{hour.toString().padStart(2, '0')}:00</span>
                    </div>
                  ))}
                </div>

                <div
                  className={cn(
                    'flex-1 grid divide-x divide-slate-100 relative',
                    viewMode === 'professionals' ? 'grid-cols-6' : 'grid-cols-3',
                  )}
                >
                  {columns.map((col) => {
                    const columnAppointments = visibleAppointments.filter((appointment) =>
                      viewMode === 'professionals' ? appointment.proId === col.id : appointment.roomId === col.id,
                    );

                    return (
                      <div
                        key={col.id}
                        className="relative h-full cursor-cell transition-colors hover:bg-slate-50/50"
                        onClick={() =>
                          onOpenModal(
                            viewMode === 'rooms' ? col.name : undefined,
                            viewMode === 'professionals' ? col.name : undefined,
                          )
                        }
                      >
                        {HOURS.map((hour) => (
                          <div key={hour} className="h-[100px] border-b border-slate-50 w-full" />
                        ))}

                        {columnAppointments.length === 0 ? (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="px-3 py-2 rounded-xl border border-dashed border-slate-200 bg-white/80 text-[10px] font-bold text-slate-400">
                              Sin turnos
                            </div>
                          </div>
                        ) : null}

                        {columnAppointments.map((app) => {
                          const pro = PROFESSIONALS.find((p) => p.id === app.proId);
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
                                'absolute left-1 right-1 rounded-2xl p-3 border shadow-sm group cursor-pointer overflow-hidden transition-all hover:ring-2 ring-blue-100',
                                getTypeStyles(app.type),
                              )}
                            >
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-[9px] font-black tracking-[0.2em] uppercase px-2 py-1 rounded-full bg-white/70 border border-white/60">
                                  {app.start} - {app.end}
                                </span>
                                <span className="text-[9px] font-black tracking-widest uppercase opacity-75">
                                  {getTypeLabel(app.type)}
                                </span>
                              </div>

                              <p className="text-[12px] font-bold truncate leading-tight mb-1">{formatLabel(app.title)}</p>
                              <p className="text-[10px] font-medium truncate opacity-80">
                                {app.patient || app.notes || 'Sin detalle adicional'}
                              </p>

                              <div className="mt-auto pt-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-wide opacity-70">
                                <span>{viewMode === 'professionals' ? room?.name || 'Sistema' : pro?.name || 'Sistema'}</span>
                                <span>{app.recurrence && app.recurrence !== 'none' ? app.recurrence : 'Único'}</span>
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
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                <div key={day} className="bg-slate-50 p-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
                      'min-h-[140px] bg-white p-2 border-slate-50 transition-colors hover:bg-slate-50/50 cursor-pointer',
                      !isSameMonth(day, selectedDate) && 'opacity-30',
                    )}
                    onClick={() => {
                      setSelectedDate(day);
                      setTimeMode('daily');
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={cn(
                          'text-xs font-bold',
                          isSameDay(day, new Date())
                            ? 'w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full'
                            : 'text-slate-400',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayAppointments.length > 0 && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                          {dayAppointments.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map((app) => {
                        const pro = PROFESSIONALS.find((p) => p.id === app.proId);
                        return (
                          <div
                            key={app.id}
                            className={cn(
                              'text-[9px] px-2 py-1.5 rounded-xl font-bold truncate border',
                              getTypeStyles(app.type),
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">
                                {app.start} {formatLabel(app.title)}
                              </span>
                              <span className="opacity-70">{pro?.name || 'Sys'}</span>
                            </div>
                          </div>
                        );
                      })}

                      {dayAppointments.length > 3 && (
                        <div className="text-[9px] text-slate-400 font-bold pl-1">
                          + {dayAppointments.length - 3} más
                        </div>
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
