/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  X as CloseIcon, 
  Calendar as CalendarIcon, 
  Clock, 
  Trash2,
  Loader2,
  Phone,
  MessageCircle,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, isAppointmentActiveOnDate, parseDay } from '../lib/utils';

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

// Removed local parseDay as it's now in utils

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
  // ✅ All hooks must be declared before any early return
  const [professionals] = useProfessionals();
  const [kind, setKind] = useState<'session' | 'interview' | 'block'>('session');
  const [coverageType, setCoverageType] = useState<'obra social' | 'particular'>('particular');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'weekdays'>('none');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [untilDate, setUntilDate] = useState<string>('');
  const [deleteChoiceOpen, setDeleteChoiceOpen] = useState(false);
  const [status, setStatus] = useState<AppointmentRecord['status']>('scheduled');
  const [patientPhone, setPatientPhone] = useState('');
  const [selectedProId, setSelectedProId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [formData, setFormData] = useState({
    patient: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '08:45',
    notes: ''
  });

  const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  // Dynamic End Time logic
  useEffect(() => {
    if (!initialData && formData.startTime) {
      setFormData(prev => ({ ...prev, endTime: addMinutesToTime(prev.startTime, getDurationMinutes(kind)) }));
    }
  }, [kind, initialData, formData.startTime]);

  const activeProfessionals = professionals.filter((p) => p.status === 'Activo');
  const isEditing = !!initialData;

  const selectedDayAppointments = useMemo(() => {
    const targetDate = parseDay(formData.date);
    if (!targetDate) return [];
    return appointments.filter((appointment) => {
      if (initialData && appointment.id === initialData.id) return false;
      return isAppointmentActiveOnDate(appointment, targetDate);
    });
  }, [appointments, formData.date, initialData]);

  const occupiedProfessionalIds = useMemo(() => {
    return selectedDayAppointments
      .filter((a) => (a.professionalId || a.proId) && overlaps(formData.startTime, formData.endTime, a.start, a.end))
      .map((a) => (a.professionalId || a.proId) as string);
  }, [selectedDayAppointments, formData.endTime, formData.startTime]);

  const occupiedRoomIds = useMemo(() => {
    return selectedDayAppointments
      .filter((a) => a.roomId && overlaps(formData.startTime, formData.endTime, a.start, a.end))
      .map((a) => a.roomId as string);
  }, [selectedDayAppointments, formData.endTime, formData.startTime]);

  // Populate form when modal opens or data changes
  useEffect(() => {
    if (!isOpen) return;
    setDeleteChoiceOpen(false);
    if (initialData) {
      setKind(initialData.kind || initialData.type || 'session');
      setCoverageType(initialData.coverageType || 'particular');
      setSelectedProId(initialData.proId || initialData.professionalId || '');
      setSelectedRoomId(initialData.roomId || '');
      setRecurrence(initialData.recurrence || 'none');
      setSelectedDays(initialData.selectedDays || []);
      setUntilDate(initialData.untilDate || '');
      setStatus(initialData.status || 'scheduled');
      setPatientPhone(initialData.patientPhone || '');
      setFormData({
        patient: initialData.patient || initialData.title || '',
        date: initialData.date || new Date().toISOString().split('T')[0],
        startTime: initialData.start || '08:00',
        endTime: initialData.end || '09:00',
        notes: initialData.notes || ''
      });
    } else {
      setKind('session');
      setRecurrence('none');
      setSelectedDays([]);
      setUntilDate('');
      setStatus('scheduled');
      setPatientPhone('');
      setCoverageType('particular');
      setFormData({
        patient: '',
        date: initialDate || new Date().toISOString().split('T')[0],
        startTime: initialStartTime || '08:00',
        endTime: addMinutesToTime(initialStartTime || '08:00', getDurationMinutes('session')),
        notes: ''
      });
      if (professional) {
        const pro = professionals.find((p) => p.name === professional);
        setSelectedProId(pro ? pro.id : '');
      } else {
        setSelectedProId('');
      }
      if (room) {
        const r = ROOMS.find(rm => rm.name === room);
        setSelectedRoomId(r ? r.id : '');
      } else {
        setSelectedRoomId('');
      }
    }
  }, [isOpen, initialData, initialDate, initialStartTime, professional, room, professionals]);

  // ✅ Removed early return from here to avoid hook order violation

  const isProfessionalBusy = (proId: string) => occupiedProfessionalIds.includes(proId);
  const isRoomBusy = (roomId: string) => occupiedRoomIds.includes(roomId);

  const selectedProfessionalBusy = selectedProId ? isProfessionalBusy(selectedProId) : false;
  const selectedRoomBusy = selectedRoomId ? isRoomBusy(selectedRoomId) : false;
  const kindLabel = kind === 'interview' ? 'entrevista' : kind === 'block' ? 'otros' : 'sesión';
  const modalTitle = isEditing ? `Editar ${kindLabel}` : `Crear ${kindLabel}`;
  const modalSubtitle = kind === 'block'
    ? 'Completa los detalles para registrar otros usos del espacio.'
    : kind === 'interview'
      ? 'Completa los detalles para registrar la entrevista.'
      : 'Completa los detalles para registrar la sesión.';
  const personLabel = kind === 'block'
    ? 'Detalle / Motivo'
    : kind === 'interview'
      ? 'Paciente / Responsable'
      : 'Paciente';
  const personPlaceholder = kind === 'block'
    ? 'Motivo o detalle...'
    : 'Nombre del paciente...';
  const professionalLabel = kind === 'block' ? 'Profesional' : 'Profesional corresponsal';

  const isFormValid = useMemo(() => {
    return (
      selectedProId !== '' &&
      selectedRoomId !== '' &&
      formData.patient.trim() !== '' &&
      !selectedProfessionalBusy &&
      !selectedRoomBusy
    );
  }, [selectedProId, selectedRoomId, formData.patient, selectedProfessionalBusy, selectedRoomBusy]);

  const handleSave = () => {
    if (isSaving || isDeleting || !isFormValid) {
      return;
    }

    onSave({
      ...formData,
      kind,
      type: kind,
      coverageType,
      professionalId: selectedProId || undefined,
      proId: selectedProId,
      roomId: selectedRoomId,
      recurrence,
      selectedDays: recurrence === 'weekly' ? selectedDays : [],
      untilDate: recurrence !== 'none' ? untilDate : undefined,
      excludedDates: initialData?.excludedDates || [],
      status,
      patientPhone
    });
  };

  const toggleDay = (dayIndex: number) => {
    setSelectedDays(prev => 
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  // ✅ Early return AFTER all hooks, including useMemo
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 sm:p-3 md:p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (isSaving || isDeleting) return;
            onClose();
          }}
          className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm" 
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg md:max-w-2xl rounded-t-[1.25rem] sm:rounded-3xl overflow-hidden h-[100svh] sm:h-auto sm:max-h-[calc(100svh-1.5rem)] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 shadow-[0_28px_80px_rgba(15,23,42,0.14)] dark:shadow-none backdrop-blur-2xl ring-1 ring-white/70 dark:ring-slate-800 flex flex-col"
        >
          <div className="p-3 sm:p-4 md:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-slate-900 dark:text-slate-100 shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-400">
                {isEditing ? 'Editar registro' : 'Nuevo registro'}
              </p>
              <h2 className="mt-0.5 text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-slate-100">{modalTitle}</h2>
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-medium tracking-tight">
                {modalSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isEditing && onDelete && (
                <div className="relative">
                  <button 
                    onClick={() => {
                      if (isSaving || isDeleting) return;
                      if (recurrence === 'none') {
                        onDelete(initialData.id);
                      } else {
                        setDeleteChoiceOpen(!deleteChoiceOpen);
                      }
                    }}
                    disabled={isSaving || isDeleting}
                    className={cn(
                      "p-2 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                      deleteChoiceOpen ? "bg-rose-500 text-white" : "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    )}
                    title="Eliminar reservación"
                  >
                    {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  </button>

                  <AnimatePresence>
                    {deleteChoiceOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden ring-1 ring-black/5"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 py-2">Opciones de borrado</p>
                        <button
                          onClick={() => {
                            const dateStr = formData.date;
                            const currentExcluded = initialData?.excludedDates || [];
                            onSave({
                              ...initialData,
                              excludedDates: [...currentExcluded, dateStr]
                            });
                            setDeleteChoiceOpen(false);
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors group"
                        >
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">Solo esta fecha</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">Cancela el turno para el {formData.date}</p>
                        </button>
                        <button
                          onClick={() => {
                            onDelete(initialData.id);
                            setDeleteChoiceOpen(false);
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors group"
                        >
                          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:text-rose-700">Toda la serie</p>
                          <p className="text-[10px] text-rose-400/80">Elimina el registro permanente</p>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <button onClick={onClose} disabled={isSaving || isDeleting} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors group disabled:opacity-50 disabled:cursor-not-allowed">
                <CloseIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-slate-100" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 overflow-y-auto custom-scrollbar bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100">
            {/* Type Selector */}
            <div className="flex bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl gap-2 overflow-x-auto border border-slate-100 dark:border-slate-800">
              {[
                { id: 'session', label: 'Sesión', icon: User },
                { id: 'interview', label: 'Entrevista', icon: FileText },
                { id: 'block', label: 'Otros', icon: AlertCircle },
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
                    kind === t.id ? "bg-white dark:bg-slate-700 text-cyan-700 dark:text-cyan-300 shadow-sm border border-cyan-200 dark:border-cyan-900/50" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  )}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Cobertura</label>
              <select
                value={coverageType}
                onChange={(e) => setCoverageType(e.target.value as 'obra social' | 'particular')}
                className="w-full p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900 text-slate-900 dark:text-slate-100"
              >
                <option value="particular">Particular</option>
                <option value="obra social">Obra social</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">{professionalLabel} <span className="text-rose-500">*</span></label>
                <select 
                  value={selectedProId}
                  onChange={(e) => setSelectedProId(e.target.value)}
                  disabled={kind === 'block'}
                  className="w-full p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900 disabled:opacity-50 text-slate-900 dark:text-slate-100"
                >
                   <option value="">Seleccionar...</option>
                   {activeProfessionals.map(pro => (
                     <option key={pro.id} value={pro.id} disabled={isProfessionalBusy(pro.id)}>
                       {pro.name} ({pro.specialty}){isProfessionalBusy(pro.id) ? ' - Ocupado' : ''}
                     </option>
                   ))}
                </select>
                {selectedProfessionalBusy && (
                  <div className="flex items-center gap-2 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 rounded-xl px-3 py-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Ese profesional ya está ocupado en este horario.
                  </div>
                )}
                {!selectedProfessionalBusy && selectedDayAppointments.some((appointment) => appointment.professionalId || appointment.proId) && (
                  <div className="flex flex-wrap gap-1.5">
                    {activeProfessionals
                      .filter((pro) => isProfessionalBusy(pro.id))
                      .slice(0, 4)
                      .map((pro) => (
                        <span key={pro.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider border border-rose-100 dark:border-rose-900/50">
                          {pro.name} ocupado
                        </span>
                      ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Consultorio <span className="text-rose-500">*</span></label>
                <select 
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900 text-slate-900 dark:text-slate-100"
                >
                   <option value="">Seleccionar...</option>
                   {ROOMS.map(r => (
                     <option key={r.id} value={r.id} disabled={isRoomBusy(r.id)}>
                       {r.name}{isRoomBusy(r.id) ? ' - Ocupado' : ''}
                     </option>
                   ))}
                </select>
                {selectedRoomBusy && (
                  <div className="flex items-center gap-2 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 rounded-xl px-3 py-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Ese consultorio ya está ocupado en este horario.
                  </div>
                )}
                {!selectedRoomBusy && selectedDayAppointments.some((appointment) => appointment.roomId) && (
                  <div className="flex flex-wrap gap-1.5">
                    {ROOMS.filter((r) => isRoomBusy(r.id))
                      .slice(0, 4)
                      .map((r) => (
                        <span key={r.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider border border-rose-100 dark:border-rose-900/50">
                          {r.name} ocupado
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {kind !== 'block' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Paciente / Título</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input 
                    placeholder="Nombre del paciente..."
                    value={formData.patient}
                    onChange={(e) => setFormData({...formData, patient: e.target.value})}
                    className="w-full pl-10 pr-3 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Teléfono (WhatsApp)</label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input 
                      placeholder="Ej: 1122334455"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  {patientPhone && (
                    <a 
                      href={`https://wa.me/${patientPhone.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2.5 sm:p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-none"
                      title="Enviar WhatsApp"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Fecha Inicio</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full pl-10 pr-3 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-100 color-scheme-light dark:color-scheme-dark"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Repetición</label>
                <select 
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as any)}
                  className="w-full p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="none">No se repite</option>
                  <option value="daily">Todos los días</option>
                  <option value="weekdays">Cada día hábil (Lun a Vie)</option>
                  <option value="weekly">Semanalmente (Personalizado)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Obra Social</label>
                <select 
                  value={coverageType}
                  onChange={(e) => setCoverageType(e.target.value as any)}
                  className="w-full p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 text-slate-900 dark:text-slate-100"
                >
                  <option value="particular">Particular</option>
                  <option value="obra social">Obra Social</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Estado Asistencia</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 text-slate-900 dark:text-slate-100"
                >
                  <option value="scheduled">Agendado</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="waiting">En Espera</option>
                  <option value="in-session">En Sesión</option>
                  <option value="completed">Finalizado</option>
                  <option value="cancelled">Ausente / Cancelado</option>
                </select>
              </div>
            </div>

            {recurrence !== 'none' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-1.5"
              >
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Repetir hasta (Opcional)</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input 
                    type="date" 
                    value={untilDate}
                    onChange={(e) => setUntilDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-100 color-scheme-light dark:color-scheme-dark"
                  />
                </div>
              </motion.div>
            )}

            {recurrence === 'weekly' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-cyan-50 dark:bg-cyan-950/20 rounded-2xl border border-cyan-100 dark:border-cyan-900/50 space-y-3"
              >
                <p className="text-[10px] font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-widest leading-none">Seleccionar días de repetición</p>
                <div className="flex justify-between">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={cn(
                        "w-8 h-8 rounded-full text-[10px] font-bold transition-all",
                        selectedDays.includes(i) ? "bg-cyan-600 dark:bg-cyan-500 text-white shadow-md shadow-cyan-200 dark:shadow-none" : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Hora Inicio</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input 
                    type="time" 
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="w-full pl-10 pr-3 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Hora Fin</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input 
                    type="time" 
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="w-full pl-10 pr-3 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 p-3 sm:p-4 md:p-5 bg-slate-50/95 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex flex-row gap-2 sm:gap-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur">
            <button 
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl sm:rounded-2xl font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!isFormValid || isSaving || isDeleting}
              className={cn(
                'flex-[1.6] py-3 rounded-xl sm:rounded-2xl font-bold text-sm transition-colors shadow-lg',
                !isFormValid || isSaving || isDeleting
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none border border-slate-200 dark:border-slate-700'
                  : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white shadow-slate-200 dark:shadow-none',
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

