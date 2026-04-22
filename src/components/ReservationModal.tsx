/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  DoorOpen, 
  FileText, 
  AlertCircle,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import { PROFESSIONALS, ROOMS } from '../constants';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  room?: string;
  professional?: string;
  initialData?: any;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
}

export const ReservationModal = ({ isOpen, onClose, room, professional, initialData, onSave, onDelete }: ReservationModalProps) => {
  const [type, setType] = useState<'session' | 'interview' | 'survey'>(initialData?.type || 'session');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'weekdays'>('none');
  const [selectedDays, setSelectedDays] = useState<number[]>([]); // 0-6 for Sun-Sat

  // States for selection
  const [selectedProId, setSelectedProId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  const [formData, setFormData] = useState({
    patient: initialData?.title || '',
    date: new Date().toISOString().split('T')[0],
    startTime: initialData?.start || '08:00',
    endTime: initialData?.end || '08:45',
    notes: initialData?.notes || ''
  });

  const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  // Dynamic End Time logic
  useEffect(() => {
    if (!initialData && formData.startTime) { // Only auto-change for NEW reservations
      const durations = {
        session: 45,
        interview: 30,
        survey: 20
      };
      const [h, m] = formData.startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(h, m, 0);
      const endDate = new Date(startDate.getTime() + durations[type] * 60000);
      const endStr = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, endTime: endStr }));
    }
  }, [type, initialData, formData.startTime]);

  // Filter ONLY active professionals as requested
  const activeProfessionals = PROFESSIONALS.filter(p => p.status === 'Activo');

  // Update selection/form if initialData or props change
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setType(initialData.type);
        setSelectedProId(initialData.proId || '');
        setSelectedRoomId(initialData.roomId || '');
        setFormData({
          patient: initialData.title,
          date: new Date().toISOString().split('T')[0],
          startTime: initialData.start,
          endTime: initialData.end || '09:00',
          notes: initialData.notes || ''
        });
      } else {
        // Reset/New
        setFormData(prev => ({
          ...prev,
          patient: '',
          startTime: '08:00',
          notes: ''
        }));
        if (professional) {
          const pro = PROFESSIONALS.find(p => p.name === professional);
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
  }, [isOpen, initialData, professional, room]);

  if (!isOpen) return null;

  const isEditing = !!initialData;

  const handleSave = () => {
    onSave({
      ...formData,
      type,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden shadow-slate-900/20 max-h-[92vh] md:max-h-none"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-xl font-black text-slate-900">{isEditing ? 'Editar Reservación' : 'Nueva Reservación'}</h2>
              <p className="text-xs text-slate-500 font-medium tracking-tight">
                {isEditing ? 'Modifica los parámetros del bloque horario.' : 'Completa los detalles para bloquear el espacio.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isEditing && onDelete && (
                <button 
                  onClick={() => onDelete(initialData.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                  title="Eliminar Reservación"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors group">
                <X className="w-5 h-5 text-slate-400 group-hover:text-slate-900" />
              </button>
            </div>
          </div>

          <div className="p-5 md:p-8 space-y-6 max-h-[72vh] md:max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Type Selector */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 overflow-x-auto">
              {[
                { id: 'session', label: 'Sesión', icon: User },
                { id: 'interview', label: 'Entrevista', icon: FileText },
                { id: 'survey', label: 'Encuesta', icon: AlertCircle },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all",
                    type === t.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Profesional Corresponsal</label>
                <select 
                  value={selectedProId}
                  onChange={(e) => setSelectedProId(e.target.value)}
                  disabled={type === 'survey'}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                >
                   <option value="">Seleccionar...</option>
                   {activeProfessionals.map(pro => (
                     <option key={pro.id} value={pro.id}>{pro.name} ({pro.specialty})</option>
                   ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Consultorio</label>
                <select 
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                >
                   <option value="">Seleccionar...</option>
                   {ROOMS.map(r => (
                     <option key={r.id} value={r.id}>{r.name}</option>
                   ))}
                </select>
              </div>
            </div>

            {type !== 'survey' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Paciente / Responsable</label>
                <input 
                  type="text" 
                  value={formData.patient}
                  onChange={(e) => setFormData({...formData, patient: e.target.value})}
                  placeholder="Nombre del paciente..."
                  className="w-full p-4 bg-slate-50 border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all outline-none"
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
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Repetir (Como Google)</label>
                <select 
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as any)}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="none">No se repite</option>
                  <option value="daily">Todos los días</option>
                  <option value="weekdays">Cada día hábil (Lun a Vie)</option>
                  <option value="weekly">Semanalmente (Personalizado)</option>
                </select>
              </div>
            </div>

            {recurrence === 'weekly' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-3"
              >
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">Seleccionar días de repetición</p>
                <div className="flex justify-between">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={cn(
                        "w-8 h-8 rounded-full text-[10px] font-bold transition-all",
                        selectedDays.includes(i) ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-white text-slate-400 hover:bg-slate-100"
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
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold outline-none"
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
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-slate-100 rounded-xl text-sm font-bold outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="flex-[2] py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
            >
              Confirmar Reservación
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
