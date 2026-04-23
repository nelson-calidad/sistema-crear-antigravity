/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  DoorOpen, 
  FileText, 
  AlertCircle,
  Trash2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import { ROOMS } from '../constants';
import { AppointmentRecord } from '../types';
import { useProfessionals } from '../lib/professionalsStore';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  room?: string;
  professional?: string;
  appointments?: AppointmentRecord[];
  initialData?: any;
  initialDate?: string;
  initialStartTime?: string;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
  isSaving?: boolean;
  isDeleting?: boolean;
}

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
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const overlaps = (startA: string, endA: string, startB: string, endB: string) => {
  if (!startA || !endA || !startB || !endB) {
    return false;
  }

  const [aStartH, aStartM] = startA.split(':').map(Number);
  const [aEndH, aEndM] = endA.split(':').map(Number);
  const [bStartH, bStartM] = startB.split(':').map(Number);
  const [bEndH, bEndM] = endB.split(':').map(Number);

  if ([aStartH, aStartM, aEndH, aEndM, bStartH, bStartM, bEndH, bEndM].some((value) => Number.isNaN(value))) {
    return false;
  }

  const aStart = aStartH * 60 + aStartM;
  const aEnd = aEndH * 60 + aEndM;
  const bStart = bStartH * 60 + bStartM;
  const bEnd = bEndH * 60 + bEndM;

  return aStart < bEnd && aEnd > bStart;
};

const getDurationMinutes = (kind: 'session' | 'interview' | 'block') => {
  if (kind === 'interview') return 30;
  if (kind === 'block') return 60;
  return 45;
};

const addMinutesToTime = (time: string, minutes: number) => {
  const match = String(time).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return time;
  }

  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(mins)) {
    return time;
  }

  const totalMinutes = hours * 60 + mins + minutes;
  const safeMinutes = Math.max(totalMinutes, 0);
  const nextHours = Math.floor(safeMinutes / 60);
  const nextMinutes = safeMinutes % 60;
  return `${nextHours.toString().padStart(2, '0')}:${nextMinutes.toString().padStart(2, '0')}`;
};

export const ReservationModal = ({ isOpen, onClose, room, professional, appointments = [], initialData, initialDate, initialStartTime, onSave, onDelete, isSaving = false, isDeleting = false }: ReservationModalProps) => {
  const [professionals] = useProfessionals();
  const [kind, setKind] = useState<'session' | 'interview' | 'block'>(initialData?.kind || initialData?.type || 'session');
  const [coverageType, setCoverageType] = useState<'obra social' | 'particular'>(initialData?.coverageType || 'particular');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'weekdays'>('none');
  const [selectedDays, setSelectedDays] = useState<number[]>([]); // 0-6 for Sun-Sat

  // States for selection
  const [selectedProId, setSelectedProId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  const [formData, setFormData] = useState({
    patient: initialData?.title || '',
    date: initialData?.date || initialDate || new Date().toISOString().split('T')[0],
    startTime: initialData?.start || initialStartTime || '08:00',
    endTime: initialData?.end || addMinutesToTime(initialData?.start || initialStartTime || '08:00', getDurationMinutes(initialData?.kind || initialData?.type || 'session')),
    notes: initialData?.notes || ''
  });

  const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  // Dynamic End Time logic
  useEffect(() => {
    if (!initialData && formData.startTime) { // Only auto-change for NEW reservations
      setFormData(prev => ({ ...prev, endTime: addMinutesToTime(prev.startTime, getDurationMinutes(kind)) }));
    }
  }, [kind, initialData, formData.startTime]);

  // Filter ONLY active professionals as requested
  const activeProfessionals = professionals.filter((p) => p.status === 'Activo');

  const isEditing = !!initialData;

  const selectedDayAppointments = useMemo(() => {
    const targetDate = parseDay(formData.date);
    if (!targetDate) return [];

    return appointments.filter((appointment) => {
      if (initialData && appointment.id === initialData.id) {
        return false;
      }

      const appointmentDate = parseDay(appointment.date);
      if (!appointmentDate) return false;

      return appointmentDate.toDateString() === targetDate.toDateString();
    });
  }, [appointments, formData.date, initialData]);

  const occupiedProfessionalIds = useMemo(() => {
    return selectedDayAppointments
      .filter((appointment) => (appointment.professionalId || appointment.proId) && overlaps(formData.startTime, formData.endTime, appointment.start, appointment.end))
      .map((appointment) => (appointment.professionalId || appointment.proId) as string);
  }, [selectedDayAppointments, formData.endTime, formData.startTime]);

  const occupiedRoomIds = useMemo(() => {
    return selectedDayAppointments
      .filter((appointment) => appointment.roomId && overlaps(formData.startTime, formData.endTime, appointment.start, appointment.end))
      .map((appointment) => appointment.roomId as string);
  }, [selectedDayAppointments, formData.endTime, formData.startTime]);

  // Update selection/form if initialData or props change
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setKind(initialData.kind || initialData.type || 'session');
        setCoverageType(initialData.coverageType || 'particular');
        setSelectedProId(initialData.proId || '');
        setSelectedRoomId(initialData.roomId || '');
        setFormData({
          patient: initialData.patient || initialData.title || '',
          date: initialData.date || new Date().toISOString().split('T')[0],
          startTime: initialData.start,
          endTime: initialData.end || '09:00',
          notes: initialData.notes || ''
        });
      } else {
        // Reset/New
        setKind('session');
        setRecurrence('none');
        setSelectedDays([]);
        setFormData(prev => ({
          ...prev,
          patient: '',
          date: initialDate || new Date().toISOString().split('T')[0],
          startTime: initialStartTime || '08:00',
          endTime: addMinutesToTime(initialStartTime || '08:00', getDurationMinutes('session')),
          notes: ''
        }));
        setCoverageType('particular');
        if (professional) {
          const pro = professionals.find((p) => p.name === professional);
          if (pro) setSelectedProId(pro.id);
        } else {
          setSelectedProId('');
        }
        if (room) {
          const r = ROOMS.find(rm => rm.name === room);
          if (r) setSelectedRoomId(r.id);
        } else {
          setSelectedRoomId('');
        }
      }
    }
  }, [isOpen, initialData, initialDate, initialStartTime, professional, room, professionals]);

  if (!isOpen) return null;

  const isProfessionalBusy = (proId: string) => occupiedProfessionalIds.includes(proId);
  const isRoomBusy = (roomId: string) => occupiedRoomIds.includes(roomId);

  const selectedProfessionalBusy = selectedProId ? isProfessionalBusy(selectedProId) : false;
  const selectedRoomBusy = selectedRoomId ? isRoomBusy(selectedRoomId) : false;
  const kindLabel = kind === 'interview' ? 'entrevista' : kind === 'block' ? 'bloqueo' : 'sesión';
  const modalTitle = isEditing ? `Editar ${kindLabel}` : `Crear ${kindLabel}`;
  const modalSubtitle = kind === 'block'
    ? 'Completa los detalles para bloquear el espacio.'
    : kind === 'interview'
      ? 'Completa los detalles para registrar la entrevista.'
      : 'Completa los detalles para registrar la sesión.';
  const personLabel = kind === 'block'
    ? 'Detalle / Motivo'
    : kind === 'interview'
      ? 'Paciente / Responsable'
      : 'Paciente';
  const personPlaceholder = kind === 'block'
    ? 'Motivo del bloqueo...'
    : 'Nombre del paciente...';
  const professionalLabel = kind === 'block' ? 'Profesional afectado (opcional)' : 'Profesional corresponsal';

  const handleSave = () => {
    if (isSaving || isDeleting) {
      return;
    }

    if (selectedProfessionalBusy || selectedRoomBusy) {
      alert('Ese colaborador o consultorio ya estÃ¡ ocupado en ese horario. ElegÃ­ otro.');
      return;
    }

    onSave({
      ...formData,
      kind,
      type: kind,
      coverageType,
      status: initialData?.status || 'scheduled',
      professionalId: selectedProId || undefined,
      proId: selectedProId,
      roomId: selectedRoomId,
      recurrence,
      selectedDays: recurrence === 'weekly' ? selectedDays : []
    });
  };

  const toggleDay = (dayIndex: number) => {
    setSelectedDays(prev => 
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-2 md:p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (isSaving || isDeleting) return;
            onClose();
          }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg rounded-t-[1.75rem] md:rounded-3xl overflow-hidden max-h-[calc(100svh-0.75rem)] md:max-h-none border border-slate-200 bg-white text-slate-900 shadow-[0_28px_80px_rgba(15,23,42,0.14)] backdrop-blur-2xl ring-1 ring-white/70 flex flex-col"
        >
          <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-white via-slate-50 to-white text-slate-900 shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-600">
                {isEditing ? 'Editar registro' : 'Nuevo registro'}
              </p>
              <h2 className="mt-1 text-lg md:text-xl font-black text-slate-900">{modalTitle}</h2>
              <p className="hidden md:block text-xs text-slate-500 font-medium tracking-tight">
                {modalSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isEditing && onDelete && (
                <button 
                  onClick={() => {
                    if (isSaving || isDeleting) return;
                    onDelete(initialData.id);
                  }}
                  disabled={isSaving || isDeleting}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Eliminar ReservaciÃ³n"
                >
                  {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </button>
              )}
              <button onClick={onClose} disabled={isSaving || isDeleting} className="p-2 hover:bg-slate-100 rounded-full transition-colors group disabled:opacity-50 disabled:cursor-not-allowed">
                <X className="w-5 h-5 text-slate-400 group-hover:text-slate-900" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 p-4 md:p-8 space-y-5 md:space-y-6 overflow-y-auto custom-scrollbar bg-white text-slate-900">
            {/* Type Selector */}
            <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-2 overflow-x-auto border border-slate-100">
              {[
                { id: 'session', label: 'SesiÃ³n', icon: User },
                { id: 'interview', label: 'Entrevista', icon: FileText },
                { id: 'block', label: 'Bloqueo', icon: AlertCircle },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setKind(t.id as any);
                    if (t.id === 'block') {
                      setSelectedProId('');
                    }
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all",
                    kind === t.id ? "bg-white text-cyan-700 shadow-sm border border-cyan-200" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Cobertura</label>
              <select
                value={coverageType}
                onChange={(e) => setCoverageType(e.target.value as 'obra social' | 'particular')}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-100 text-slate-900"
              >
                <option value="particular">Particular</option>
                <option value="obra social">Obra social</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{professionalLabel}</label>
                <select 
                  value={selectedProId}
                  onChange={(e) => setSelectedProId(e.target.value)}
                  disabled={kind === 'block'}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-100 disabled:opacity-50 text-slate-900"
                >
                   <option value="">Seleccionar...</option>
                   {activeProfessionals.map(pro => (
                     <option key={pro.id} value={pro.id} disabled={isProfessionalBusy(pro.id)}>
                       {pro.name} ({pro.specialty}){isProfessionalBusy(pro.id) ? ' - Ocupado' : ''}
                     </option>
                   ))}
                </select>
                {selectedProfessionalBusy && (
                  <div className="flex items-center gap-2 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Ese profesional ya estÃ¡ ocupado en este horario.
                  </div>
                )}
                {!selectedProfessionalBusy && selectedDayAppointments.some((appointment) => appointment.professionalId || appointment.proId) && (
                  <div className="flex flex-wrap gap-1.5">
                    {activeProfessionals
                      .filter((pro) => isProfessionalBusy(pro.id))
                      .slice(0, 4)
                      .map((pro) => (
                        <span key={pro.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-wider border border-rose-100">
                          {pro.name} ocupado
                        </span>
                      ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Consultorio</label>
                <select 
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-100 text-slate-900"
                >
                   <option value="">Seleccionar...</option>
                   {ROOMS.map(r => (
                     <option key={r.id} value={r.id} disabled={isRoomBusy(r.id)}>
                       {r.name}{isRoomBusy(r.id) ? ' - Ocupado' : ''}
                     </option>
                   ))}
                </select>
                {selectedRoomBusy && (
                  <div className="flex items-center gap-2 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Ese consultorio ya estÃ¡ ocupado en este horario.
                  </div>
                )}
                {!selectedRoomBusy && selectedDayAppointments.some((appointment) => appointment.roomId) && (
                  <div className="flex flex-wrap gap-1.5">
                    {ROOMS.filter((r) => isRoomBusy(r.id))
                      .slice(0, 4)
                      .map((r) => (
                        <span key={r.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-wider border border-rose-100">
                          {r.name} ocupado
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {kind !== 'block' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{personLabel}</label>
                <input 
                  type="text" 
                  value={formData.patient}
                  onChange={(e) => setFormData({...formData, patient: e.target.value})}
                  placeholder={personPlaceholder}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-cyan-100 focus:bg-white transition-all outline-none text-slate-900 placeholder:text-slate-400"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Fecha</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none text-slate-900"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Repetir (Como Google)</label>
                <select 
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as any)}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-100 text-slate-900"
                >
                  <option value="none">No se repite</option>
                  <option value="daily">Todos los dÃ­as</option>
                  <option value="weekdays">Cada dÃ­a hÃ¡bil (Lun a Vie)</option>
                  <option value="weekly">Semanalmente (Personalizado)</option>
                </select>
              </div>
            </div>

            {recurrence === 'weekly' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-cyan-50 rounded-2xl border border-cyan-100 space-y-3"
              >
                <p className="text-[10px] font-black text-cyan-700 uppercase tracking-widest leading-none">Seleccionar dÃ­as de repeticiÃ³n</p>
                <div className="flex justify-between">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={cn(
                        "w-8 h-8 rounded-full text-[10px] font-bold transition-all",
                        selectedDays.includes(i) ? "bg-cyan-600 text-white shadow-md shadow-cyan-200" : "bg-white text-slate-400 hover:bg-slate-100"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Hora Inicio</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="time" 
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none text-slate-900"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Hora Fin</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="time" 
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 p-3 md:p-6 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pb-6">
            <button 
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={selectedProfessionalBusy || selectedRoomBusy || isSaving || isDeleting}
              className={cn(
                'flex-[2] py-3 rounded-2xl font-bold text-sm transition-colors shadow-lg',
                selectedProfessionalBusy || selectedRoomBusy || isSaving || isDeleting
                  ? 'bg-rose-100 text-rose-400 cursor-not-allowed shadow-none'
                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200',
              )}
            >
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </span>
              ) : isDeleting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Eliminando...
                </span>
              ) : (
                'Confirmar Reservación'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

