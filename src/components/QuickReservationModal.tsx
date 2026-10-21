import React, { useState, useMemo } from 'react';
import { X, Calendar, Clock, AlertTriangle, Trash2, CheckCircle2, User, DoorOpen } from 'lucide-react';
import type { AppointmentRecord, ConfiguredRoom } from '../types';
import type { AuthUser } from '../lib/crearAuth';
import { CREAR_TEAM } from '../lib/crearAuth';
import { conflictOnDate, type Slot } from '../lib/scheduling';

interface QuickReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  rooms: ConfiguredRoom[];
  appointments: AppointmentRecord[];
  initialData?: AppointmentRecord | null;
  initialRoomId?: string;
  initialDate?: string;
  initialStartTime?: string;
  onSave: (record: Partial<AppointmentRecord>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function QuickReservationModal({
  isOpen,
  onClose,
  currentUser,
  rooms,
  appointments,
  initialData,
  initialRoomId,
  initialDate,
  initialStartTime,
  onSave,
  onDelete,
}: QuickReservationModalProps) {
  if (!isOpen) return null;

  const defaultDate = initialData?.date || initialDate || new Date().toISOString().split('T')[0];
  const defaultStart = initialData?.start || initialStartTime || '14:00';

  // Calculate default end time (+45 mins or +1h)
  const calculateDefaultEnd = (start: string) => {
    const [h, m] = start.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '15:00';
    const total = h * 60 + m + 45;
    const endH = Math.floor(total / 60);
    const endM = total % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  const defaultEnd = initialData?.end || calculateDefaultEnd(defaultStart);

  const [roomId, setRoomId] = useState(initialData?.roomId || initialRoomId || rooms[0]?.id || 'c1');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [therapistId, setTherapistId] = useState(
    initialData?.professionalId || (currentUser.role === 'admin' ? CREAR_TEAM[4].id : currentUser.id)
  );
  const [patientRef, setPatientRef] = useState(initialData?.patient || initialData?.title || '');
  const [isWeekly, setIsWeekly] = useState(initialData?.recurrence === 'weekly');
  const [untilDate, setUntilDate] = useState(initialData?.untilDate || '');
  
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Selected therapist name
  const currentTherapist = useMemo(() => {
    return CREAR_TEAM.find((t) => t.id === therapistId) || { name: currentUser.name, id: currentUser.id };
  }, [therapistId, currentUser]);

  // Real-time conflict validation
  const conflict = useMemo(() => {
    if (!startTime || !endTime || startTime >= endTime) return null;

    const candidate: Slot = {
      id: initialData?.id || 'temp-id',
      date,
      start: startTime,
      end: endTime,
      roomId,
      professionalId: therapistId,
      status: 'confirmed',
      recurrence: isWeekly ? 'weekly' : 'none',
      selectedDays: isWeekly ? [new Date(`${date}T12:00:00`).getDay()] : [],
      untilDate: untilDate || undefined,
    };

    const existingSlots: Slot[] = appointments
      .filter((a) => a.id !== initialData?.id && a.status !== 'cancelled')
      .map((a) => ({
        id: a.id,
        date: a.date,
        start: a.start,
        end: a.end,
        roomId: a.roomId || '',
        professionalId: a.professionalId || '',
        status: a.status,
        recurrence: a.recurrence,
        selectedDays: a.selectedDays,
        untilDate: a.untilDate,
        excludedDates: a.excludedDates,
      }));

    try {
      return conflictOnDate(candidate, existingSlots, date);
    } catch {
      return null;
    }
  }, [roomId, date, startTime, endTime, therapistId, isWeekly, untilDate, appointments, initialData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (startTime >= endTime) {
      setError('La hora de inicio debe ser anterior a la hora de finalización.');
      return;
    }

    if (conflict) {
      setError(`No se puede guardar: el consultorio ya está ocupado en ese horario (${conflict.start} a ${conflict.end}).`);
      return;
    }

    setBusy(true);
    try {
      const record: Partial<AppointmentRecord> = {
        id: initialData?.id,
        roomId,
        date,
        start: startTime,
        end: endTime,
        professionalId: therapistId,
        proId: therapistId,
        title: patientRef.trim() || `Turno de ${currentTherapist.name}`,
        patient: patientRef.trim() || undefined,
        recurrence: isWeekly ? 'weekly' : 'none',
        selectedDays: isWeekly ? [new Date(`${date}T12:00:00`).getDay()] : [],
        untilDate: isWeekly ? untilDate : undefined,
        status: 'confirmed',
        kind: 'session',
      };

      await onSave(record);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la reserva.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!initialData?.id || !onDelete) return;
    if (!confirm('¿Seguro que querés cancelar esta reserva de consultorio?')) return;

    setBusy(true);
    try {
      await onDelete(initialData.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la reserva.');
    } finally {
      setBusy(false);
    }
  }

  const selectedRoomObj = rooms.find((r) => r.id === roomId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4 backdrop-blur-xs antialiased animate-[fadeIn_.15s_ease-out]">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#E5EAE5] bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#EAEFEA] bg-[#F9FBF9] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#DDEAE2] text-[#46766B]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#34433F]">
                {initialData ? 'Modificar reserva' : 'Nueva reserva de consultorio'}
              </h2>
              <p className="text-xs text-[#6D7C76]">
                {selectedRoomObj?.name || 'Seleccioná horario y espacio'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[#889892] transition hover:bg-[#EAEFEA] hover:text-[#34433F]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Conflict Alert Warning */}
          {conflict && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong className="block font-bold">¡Horario superpuesto!</strong>
                <span>
                  El consultorio ya está reservado de {conflict.start} a {conflict.end}. Por favor seleccioná otro horario o consultorio.
                </span>
              </div>
            </div>
          )}

          {/* Consultorio Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D] mb-1.5">
              Consultorio
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {rooms.map((room) => {
                const isSelected = room.id === roomId;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setRoomId(room.id)}
                    className={`flex flex-col items-start p-3 rounded-2xl border text-left transition ${
                      isSelected
                        ? 'border-[#46766B] bg-[#EBF4F0] ring-2 ring-[#46766B]/20'
                        : 'border-[#E5EAE5] bg-[#FDFEFC] hover:bg-[#F4F9F6]'
                    }`}
                  >
                    <span className="text-xs font-bold text-[#34433F]">{room.name.split('—')[0].trim()}</span>
                    <span className="text-[11px] text-[#6D7C76] line-clamp-1">
                      {room.name.split('—')[1]?.trim() || room.description || 'Espacio CREAR'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fecha y Horarios */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D] mb-1">
                Fecha
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] px-3 py-2.5 text-sm font-medium text-[#34433F] focus:border-[#46766B] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D] mb-1">
                Hora de inicio
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setEndTime(calculateDefaultEnd(e.target.value));
                }}
                className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] px-3 py-2.5 text-sm font-medium text-[#34433F] focus:border-[#46766B] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D] mb-1">
                Hora de fin
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] px-3 py-2.5 text-sm font-medium text-[#34433F] focus:border-[#46766B] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Terapeuta Asignada */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D] mb-1">
              Terapeuta responsable
            </label>
            {currentUser.role === 'admin' ? (
              <select
                value={therapistId}
                onChange={(e) => setTherapistId(e.target.value)}
                className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] px-3 py-2.5 text-sm font-medium text-[#34433F] focus:border-[#46766B] focus:bg-white focus:outline-none"
              >
                {CREAR_TEAM.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.specialty})
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2.5 rounded-2xl border border-[#E5EAE5] bg-[#F7FAF8] p-3 text-sm font-semibold text-[#34433F]">
                <User className="h-4 w-4 text-[#46766B]" />
                <span>{currentUser.name} ({currentUser.specialty || 'Terapeuta'})</span>
              </div>
            )}
          </div>

          {/* Referencia o motivo breve */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52635D] mb-1">
              Referencia o motivo del turno <span className="text-[#889892] font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ej.: Sesión de terapia, Evaluación, Consulta particular"
              value={patientRef}
              onChange={(e) => setPatientRef(e.target.value)}
              className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] px-3.5 py-2.5 text-sm font-medium text-[#34433F] focus:border-[#46766B] focus:bg-white focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-[#889892]">
              🔒 Por confidencialidad, no ingresar diagnósticos ni información médica sensible en este módulo.
            </p>
          </div>

          {/* Horario recurrente semanal */}
          <div className="rounded-2xl border border-[#E5EAE5] bg-[#FBFDFB] p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isWeekly}
                onChange={(e) => setIsWeekly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#46766B] focus:ring-[#46766B]"
              />
              <span className="text-sm font-semibold text-[#34433F]">
                Repetir semanalmente este mismo día
              </span>
            </label>

            {isWeekly && (
              <div className="pt-2 border-t border-[#EAEFEA]">
                <label className="block text-xs font-bold text-[#52635D] mb-1">
                  Repetir hasta fecha límite <span className="text-[#889892] font-normal">(opcional)</span>:
                </label>
                <input
                  type="date"
                  min={date}
                  value={untilDate}
                  onChange={(e) => setUntilDate(e.target.value)}
                  className="rounded-xl border border-[#D5DDD7] bg-white px-3 py-2 text-xs text-[#34433F]"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#EAEFEA]">
            {initialData?.id && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>Cancelar reserva</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-2xl border border-[#D5DDD7] bg-white px-4 py-2.5 text-xs font-semibold text-[#6D7C76] hover:bg-[#F4F6F4]"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={busy || Boolean(conflict)}
                className="flex items-center gap-2 rounded-2xl bg-[#46766B] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#3B645B] active:scale-[0.99] disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{busy ? 'Guardando...' : initialData ? 'Guardar cambios' : 'Confirmar reserva'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

