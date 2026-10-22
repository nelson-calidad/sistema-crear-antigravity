import React, { useState, useMemo } from 'react';
import { X, Calendar, AlertTriangle, Trash2, CheckCircle2, User, Plus } from 'lucide-react';
import type { AppointmentRecord, ConfiguredRoom, PatientRecord, ServiceCatalogItem } from '../types';
import type { AuthUser } from '../lib/crearAuth';
import { CREAR_TEAM } from '../lib/crearAuth';
import { conflictOnDate, type Slot } from '../lib/scheduling';

interface QuickReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  rooms: ConfiguredRoom[];
  appointments: AppointmentRecord[];
  patients: PatientRecord[];
  services: ServiceCatalogItem[];
  initialData?: AppointmentRecord | null;
  initialRoomId?: string;
  initialDate?: string;
  initialStartTime?: string;
  onSave: (record: Partial<AppointmentRecord>) => Promise<void>;
  onCreatePatient: (name: string, professionalId: string) => Promise<PatientRecord>;
  onDelete?: (id: string) => Promise<void>;
}

export function QuickReservationModal({
  isOpen,
  onClose,
  currentUser,
  rooms,
  appointments,
  patients,
  services,
  initialData,
  initialRoomId,
  initialDate,
  initialStartTime,
  onSave,
  onCreatePatient,
  onDelete,
}: QuickReservationModalProps) {
  if (!isOpen) return null;

  const defaultDate = initialData?.date || initialDate || new Date().toISOString().split('T')[0];
  const defaultStart = initialData?.start || initialStartTime || '15:00';

  const addMinutesToTime = (start: string, mins: number) => {
    const [h, m] = start.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '15:45';
    const total = Math.min(22 * 60, h * 60 + m + mins);
    const endH = Math.floor(total / 60);
    const endM = total % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  const defaultEnd = initialData?.end || addMinutesToTime(defaultStart, 45);

  const [bookingKind, setBookingKind] = useState<'session' | 'block'>(
    initialData?.kind === 'block' ? 'block' : 'session'
  );
  const [roomId, setRoomId] = useState(initialData?.roomId || initialRoomId || rooms[0]?.id || 'c1');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [therapistId, setTherapistId] = useState(
    initialData?.professionalId ||
      (currentUser.role === 'admin' ? CREAR_TEAM[4].id : currentUser.professionalId || currentUser.id)
  );

  // Paciente y Prestación
  const activeServices = useMemo(() => services.filter((s) => s.active !== false), [services]);
  const defaultService = useMemo(() => {
    if (initialData?.serviceId) {
      return activeServices.find((s) => s.id === initialData.serviceId) || activeServices[0];
    }
    const bySpecialty = activeServices.find(
      (s) => s.name.toLowerCase() === (currentUser.specialty || '').toLowerCase()
    );
    return bySpecialty || activeServices[0];
  }, [initialData, activeServices, currentUser.specialty]);

  const [selectedServiceId, setSelectedServiceId] = useState(defaultService?.id || '');
  const [selectedPatientId, setSelectedPatientId] = useState(initialData?.patientId || '');
  const [manualPatientName, setManualPatientName] = useState(initialData?.patient || '');
  const [addingNewPatient, setAddingNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');

  const [isWeekly, setIsWeekly] = useState(initialData?.recurrence === 'weekly');
  const [untilDate, setUntilDate] = useState(initialData?.untilDate || '');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Pacientes activos de la profesional seleccionada
  const proPatients = useMemo(() => {
    return patients.filter(
      (p) =>
        p.status !== 'inactive' &&
        (!p.professionalId || p.professionalId === therapistId)
    );
  }, [patients, therapistId]);

  const currentTherapist = useMemo(() => {
    return (
      CREAR_TEAM.find((t) => t.id === therapistId) || {
        name: currentUser.name,
        id: currentUser.id,
      }
    );
  }, [therapistId, currentUser]);

  // Detectar si el turno cae dentro de un bloque propio ya reservado (no genera conflicto, sino que se vincula)
  const matchingOwnBlock = useMemo(() => {
    if (bookingKind !== 'session') return null;
    return appointments.find(
      (a) =>
        a.status !== 'cancelled' &&
        (a.kind === 'block' || a.type === 'block') &&
        a.roomId === roomId &&
        a.professionalId === therapistId &&
        a.date === date &&
        a.start <= startTime &&
        a.end >= endTime
    );
  }, [bookingKind, appointments, roomId, therapistId, date, startTime, endTime]);

  // Validación instantánea de conflicto
  const conflict = useMemo(() => {
    if (!startTime || !endTime || startTime >= endTime) return null;

    const candidate: Slot = {
      id: initialData?.id || 'temp-id',
      kind: bookingKind,
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
        kind: a.kind || a.type || 'session',
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
  }, [bookingKind, roomId, date, startTime, endTime, therapistId, isWeekly, untilDate, appointments, initialData]);

  async function handleQuickCreatePatient() {
    if (!newPatientName.trim()) return;
    const created = await onCreatePatient(newPatientName.trim(), therapistId);
    setSelectedPatientId(created.id);
    setManualPatientName(created.name);
    setNewPatientName('');
    setAddingNewPatient(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (startTime >= endTime) {
      setError('La hora de inicio debe ser anterior a la hora de finalización.');
      return;
    }

    if (conflict) {
      setError(`Horario ocupado de ${conflict.start} a ${conflict.end}.`);
      return;
    }

    let finalPatientId = selectedPatientId;
    let finalPatientName = manualPatientName.trim();

    if (bookingKind === 'session') {
      if (addingNewPatient && newPatientName.trim()) {
        const created = await onCreatePatient(newPatientName.trim(), therapistId);
        finalPatientId = created.id;
        finalPatientName = created.name;
      } else if (selectedPatientId) {
        const found = proPatients.find((p) => p.id === selectedPatientId);
        if (found) finalPatientName = found.name;
      }

      if (!finalPatientName) {
        setError('Seleccioná un paciente o agregá su nombre.');
        return;
      }
    }

    const chosenService = activeServices.find((s) => s.id === selectedServiceId);

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
        kind: bookingKind,
        type: bookingKind,
        patientId: bookingKind === 'session' ? finalPatientId : '',
        patient: bookingKind === 'session' ? finalPatientName : '',
        serviceId: bookingKind === 'session' ? chosenService?.id || '' : '',
        serviceName: bookingKind === 'session' ? chosenService?.name || '' : '',
        roomBlockId: matchingOwnBlock?.id || '',
        title:
          bookingKind === 'block'
            ? `Reserva de consultorio — ${currentTherapist.name}`
            : finalPatientName,
        recurrence: isWeekly ? 'weekly' : 'none',
        selectedDays: isWeekly ? [new Date(`${date}T12:00:00`).getDay()] : [],
        untilDate: isWeekly ? untilDate : undefined,
        status: 'confirmed',
      };

      onClose(); // Cierre instantáneo para fluidez total
      void onSave(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!initialData?.id || !onDelete) return;
    const idToDelete = initialData.id;
    onClose();
    void onDelete(idToDelete);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 backdrop-blur-xs antialiased animate-[fadeIn_.12s_ease-out] overflow-y-auto">
      <div className="w-full max-w-lg max-h-[94dvh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[#E5EAE5] bg-white shadow-2xl">
        {/* Header Minimalista */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#EAEFEA] bg-[#F9FBF9] px-4 sm:px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#DDEAE2] text-[#46766B]">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#34433F]">
                {initialData ? 'Editar registro' : 'Nuevo registro en agenda'}
              </h2>
              <p className="text-[11px] text-[#6D7C76]">
                {currentTherapist.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#889892] transition hover:bg-[#EAEFEA] hover:text-[#34433F]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario Rápido Clic y Clic */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 pb-6 space-y-3.5 overflow-y-auto overscroll-contain flex-1">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {conflict && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <strong>
                  {rooms.find((r) => r.id === (conflict.roomId || roomId))?.name.split('—')[0].trim() || 'Consultorio'}
                </strong>{' '}
                no disponible de <strong>{conflict.start} a {conflict.end}</strong>.
              </span>
            </div>
          )}

          {/* Selector: Turno con Paciente vs Reserva de Consultorio */}
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#F2F5F3] p-1">
            <button
              type="button"
              onClick={() => setBookingKind('session')}
              className={`rounded-xl py-2 text-xs font-bold transition ${
                bookingKind === 'session'
                  ? 'bg-white text-[#34433F] shadow-xs'
                  : 'text-[#6D7C76] hover:text-[#34433F]'
              }`}
            >
              Turno de Paciente
            </button>
            <button
              type="button"
              onClick={() => setBookingKind('block')}
              className={`rounded-xl py-2 text-xs font-bold transition ${
                bookingKind === 'block'
                  ? 'bg-white text-[#34433F] shadow-xs'
                  : 'text-[#6D7C76] hover:text-[#34433F]'
              }`}
            >
              Reserva Consultorio (Sin paciente)
            </button>
          </div>

          {/* 1. Consultorio (Clic directo) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#52635D] mb-1.5">
              1. Consultorio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {rooms.map((room) => {
                const isSelected = room.id === roomId;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setRoomId(room.id)}
                    className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border text-center transition ${
                      isSelected
                        ? 'border-[#46766B] bg-[#EBF4F0] text-[#1D3E35] font-bold ring-2 ring-[#46766B]/20'
                        : 'border-[#E5EAE5] bg-[#FDFEFC] text-[#52635D] hover:bg-[#F4F9F6]'
                    }`}
                  >
                    <span className="text-xs font-bold">{room.name.split('—')[0].trim()}</span>
                    <span className="text-[10px] text-[#6D7C76] truncate max-w-full">
                      {room.name.split('—')[1]?.trim() || 'Disponible'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Fecha y Horario + Botones rápidos de duración */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#52635D]">
                2. Fecha y Horario (24 hs)
              </label>
              <div className="flex gap-1">
                {[
                  { label: '30m', mins: 30 },
                  { label: '45m', mins: 45 },
                  { label: '60m', mins: 60 },
                  ...(bookingKind === 'block' ? [{ label: '4 hs', mins: 240 }] : []),
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setEndTime(addMinutesToTime(startTime, preset.mins))}
                    className="rounded-lg border border-[#D5DDD7] bg-[#F9FBF9] px-2 py-0.5 text-[10px] font-bold text-[#46766B] hover:bg-[#E8F3EE]"
                  >
                    +{preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="min-h-11 w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] px-3 py-2 text-xs font-bold text-[#34433F] focus:border-[#46766B] focus:bg-white focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    setStartTime(nextStart);
                    const chosen = activeServices.find((s) => s.id === selectedServiceId);
                    setEndTime(addMinutesToTime(nextStart, bookingKind === 'block' ? 60 : chosen?.durationMinutes || 45));
                  }}
                  className="min-h-11 w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] px-3 py-2 text-xs font-bold text-[#34433F] focus:border-[#46766B] focus:bg-white focus:outline-none"
                />
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="min-h-11 w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] px-3 py-2 text-xs font-bold text-[#34433F] focus:border-[#46766B] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Profesional (Solo elegible por Administración; fijo para Terapeuta) */}
          {currentUser.role === 'admin' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#52635D] mb-1">
                Profesional titular
              </label>
              <select
                value={therapistId}
                onChange={(e) => setTherapistId(e.target.value)}
                className="w-full rounded-2xl border border-[#D5DDD7] bg-[#FAFCFA] px-3 py-2.5 text-xs font-bold text-[#34433F] focus:border-[#46766B] focus:bg-white focus:outline-none"
              >
                {CREAR_TEAM.filter((m) => m.role === 'therapist').map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} — {member.specialty}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Paciente y Prestación (solo cuando es Turno de Paciente) */}
          {bookingKind === 'session' && (
            <div className="space-y-3 rounded-2xl border border-[#E5EAE5] bg-[#F9FBF9] p-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#52635D]">
                    3. Paciente
                  </label>
                  <button
                    type="button"
                    onClick={() => setAddingNewPatient((v) => !v)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#46766B] hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{addingNewPatient ? 'Elegir de mi lista' : 'Nuevo paciente'}</span>
                  </button>
                </div>

                {addingNewPatient || proPatients.length === 0 ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nombre y apellido del paciente"
                      value={addingNewPatient ? newPatientName : manualPatientName}
                      onChange={(e) =>
                        addingNewPatient
                          ? setNewPatientName(e.target.value)
                          : setManualPatientName(e.target.value)
                      }
                      className="flex-1 rounded-2xl border border-[#D5DDD7] bg-white px-3 py-2.5 text-xs font-semibold text-[#34433F] focus:border-[#46766B] focus:outline-none"
                    />
                    {addingNewPatient && (
                      <button
                        type="button"
                        onClick={() => void handleQuickCreatePatient()}
                        className="rounded-2xl bg-[#46766B] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#3B645B]"
                      >
                        Listo
                      </button>
                    )}
                  </div>
                ) : (
                  <select
                    value={selectedPatientId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      setSelectedPatientId(pid);
                      const found = proPatients.find((p) => p.id === pid);
                      if (found) setManualPatientName(found.name);
                    }}
                    className="w-full rounded-2xl border border-[#D5DDD7] bg-white px-3 py-2.5 text-xs font-semibold text-[#34433F] focus:border-[#46766B] focus:outline-none"
                  >
                    <option value="">Seleccionar paciente...</option>
                    {proPatients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#52635D] mb-1">
                  4. Tipo de prestación
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setSelectedServiceId(sid);
                    const srv = activeServices.find((s) => s.id === sid);
                    if (srv) {
                      setEndTime(addMinutesToTime(startTime, srv.durationMinutes));
                    }
                  }}
                  className="w-full rounded-2xl border border-[#D5DDD7] bg-white px-3 py-2.5 text-xs font-semibold text-[#34433F] focus:border-[#46766B] focus:outline-none"
                >
                  {activeServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMinutes} min)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 5. Repetición: Único o Semanal */}
          <div className="flex items-center justify-between rounded-2xl border border-[#E5EAE5] bg-[#FAFCFA] px-3.5 py-2.5">
            <span className="text-xs font-bold text-[#34433F]">Repetición</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setIsWeekly(false)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  !isWeekly
                    ? 'bg-[#46766B] text-white'
                    : 'bg-white border border-[#D5DDD7] text-[#6D7C76]'
                }`}
              >
                Único
              </button>
              <button
                type="button"
                onClick={() => setIsWeekly(true)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  isWeekly
                    ? 'bg-[#46766B] text-white'
                    : 'bg-white border border-[#D5DDD7] text-[#6D7C76]'
                }`}
              >
                Semanal
              </button>
            </div>
          </div>

          {isWeekly && (
            <div className="flex items-center justify-between gap-2 px-1">
              <label className="text-xs text-[#6D7C76]">Repetir hasta (opcional):</label>
              <input
                type="date"
                value={untilDate}
                min={date}
                onChange={(e) => setUntilDate(e.target.value)}
                className="rounded-xl border border-[#D5DDD7] bg-white px-2.5 py-1.5 text-xs text-[#34433F]"
              />
            </div>
          )}

          {/* Botones de Acción Directa */}
          <div className="flex items-center justify-between gap-2 pt-2">
            {initialData?.id && onDelete ? (
              <button
                type="button"
                disabled={busy}
                onClick={handleDelete}
                className="flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" />
                <span>Cancelar</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-[#D5DDD7] bg-white px-4 py-3 text-xs font-semibold text-[#52635D] hover:bg-[#F9F8F5]"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={busy || Boolean(conflict)}
                className="flex items-center gap-1.5 rounded-2xl bg-[#46766B] px-6 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-[#3B645B] active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{initialData ? 'Guardar' : 'Confirmar'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
