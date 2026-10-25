import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { X, Calendar, AlertTriangle, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import type { AppointmentRecord, ConfiguredRoom, PatientRecord } from '../types';
import type { AuthUser } from '../lib/crearAuth';
import { useProfessionals } from '../lib/professionalsStore';
import { conflictOnDate, occursOn, type Slot } from '../lib/scheduling';
import { localDate } from '../lib/crearStore';
import { reservationDetail, reservationDetails, reservationPurpose, type ReservationPurpose } from '../lib/reservationDetails';

interface QuickReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  rooms: ConfiguredRoom[];
  appointments: AppointmentRecord[];
  patients: PatientRecord[];
  initialData?: AppointmentRecord | null;
  initialRoomId?: string;
  initialDate?: string;
  initialStartTime?: string;
  initialKind?: 'block' | 'session';
  onSave: (record: Partial<AppointmentRecord>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

// Cada apertura monta un formulario nuevo, sin cambiar el orden de los hooks.
export function QuickReservationModal(props: QuickReservationModalProps) {
  return props.isOpen ? <ReservationForm {...props} /> : null;
}

function ReservationForm({
  onClose, currentUser, rooms, appointments, patients, initialData,
  initialRoomId, initialDate, initialStartTime, initialKind, onSave, onDelete,
}: QuickReservationModalProps) {
  const [professionals] = useProfessionals();
  const patientListId = useId();
  const submitting = useRef(false);
  const defaultStart = initialData?.start || initialStartTime || '15:00';
  const [hour, minute] = defaultStart.split(':').map(Number);
  const endMinutes = Math.min(23 * 60 + 59, hour * 60 + minute + 60);
  const defaultEnd = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
  const [roomId, setRoomId] = useState(initialData?.roomId || initialRoomId || rooms[0]?.id || '');
  const [date, setDate] = useState(initialData?.date || initialDate || localDate());
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(initialData?.end || defaultEnd);
  const [purpose, setPurpose] = useState<ReservationPurpose>(initialData ? reservationPurpose(initialData) : initialKind || 'block');
  const [detail, setDetail] = useState(reservationDetail(initialData));
  const activeProfessionals = professionals.filter(p => p.status === 'Activo' || p.id === initialData?.professionalId);
  const [therapistId, setTherapistId] = useState(
    initialData?.professionalId || initialData?.proId || currentUser.professionalId ||
    (currentUser.role === 'admin' ? activeProfessionals[0]?.id || '' : currentUser.id)
  );
  const [recurrence, setRecurrence] = useState<NonNullable<AppointmentRecord['recurrence']>>(initialData?.recurrence || 'none');
  const [untilDate, setUntilDate] = useState(initialData?.untilDate || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isPatientVisit = purpose === 'session' || purpose === 'interview';
  const proPatients = patients.filter(p => p.status !== 'inactive' && (!p.professionalId || p.professionalId === therapistId));
  const selectedDays = recurrence === 'weekly'
    ? initialData?.date === date && initialData.selectedDays?.length
      ? initialData.selectedDays
      : [new Date(`${date}T12:00:00`).getDay()]
    : [];
  const details = reservationDetails(purpose, detail);

  const candidate: Slot = {
    id: initialData?.id || 'new-reservation', kind: details.kind, date,
    start: startTime, end: endTime, roomId, professionalId: therapistId,
    status: 'confirmed', recurrence, selectedDays,
    untilDate: recurrence === 'none' ? undefined : untilDate || undefined,
    excludedDates: initialData?.excludedDates || [],
  };
  const conflict = useMemo(() => {
    if (!date || !startTime || !endTime || startTime >= endTime) return undefined;
    return conflictOnDate(candidate, appointments.map(a => ({
      ...a, kind: a.kind || a.type || 'session', roomId: a.roomId || '',
      professionalId: a.professionalId || a.proId || '',
    })), date);
  }, [appointments, date, startTime, endTime, roomId, therapistId, details.kind, initialData]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    if (!roomId || !therapistId || !date || !startTime || !endTime || startTime >= endTime) {
      setError('Elegí consultorio, profesional, fecha y un horario de fin posterior al inicio.');
      return;
    }
    if (recurrence !== 'none' && untilDate && untilDate < date) {
      setError('La fecha final de repetición no puede ser anterior a la reserva.');
      return;
    }
    if (conflict) {
      setError(`El consultorio o la profesional ya tiene una reserva de ${conflict.start} a ${conflict.end}.`);
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const patient = proPatients.find(p => p.name.trim() === detail.trim());
      const retainedPatientId = initialData?.patient === detail.trim() &&
        (initialData.professionalId || initialData.proId) === therapistId ? initialData.patientId : '';
      const ownBlock = details.kind !== 'block' ? appointments.find(a =>
        a.id !== initialData?.id && a.status !== 'cancelled' && (a.kind || a.type) === 'block' &&
        a.roomId === roomId && (a.professionalId || a.proId) === therapistId &&
        occursOn(a as Slot, date) && a.start <= startTime && a.end >= endTime
      ) : undefined;
      await onSave({
        ...initialData,
        ...candidate,
        id: initialData?.id,
        status: 'confirmed',
        ...reservationDetails(purpose, detail, patient?.id || retainedPatientId || ''),
        proId: therapistId,
        serviceId: isPatientVisit ? initialData?.serviceId || '' : '',
        serviceName: isPatientVisit ? initialData?.serviceName || '' : '',
        roomBlockId: ownBlock?.id || '',
        untilDate: recurrence === 'none' ? '' : untilDate,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Tus datos siguen aquí para reintentar.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!initialData?.id || !onDelete || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await onDelete(initialData.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar la reserva.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const input = 'min-h-11 w-full rounded-xl border border-[#D5DDD7] bg-[#FAFCFA] px-3 py-2 text-sm text-[#34433F] focus:border-[#46766B] focus:bg-white focus:outline-none';
  const label = 'block text-xs font-semibold text-[#52635D] mb-1.5';
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" aria-label={initialData ? 'Editar reserva' : 'Nueva reserva'} className="w-full max-w-lg max-h-[94dvh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[#E5EAE5] bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#EAEFEA] bg-[#F9FBF9] px-5 py-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-[#46766B]" />
            <div><h2 className="font-bold text-[#34433F]">{initialData ? 'Editar reserva' : 'Nueva reserva'}</h2>
              <p className="text-xs text-[#6D7C76]">{professionals.find(p => p.id === therapistId)?.name || currentUser.name}</p>
            </div>
          </div>
          <button type="button" disabled={busy} onClick={onClose} aria-label="Cerrar reserva" className="rounded-xl p-2 text-[#889892] hover:bg-[#EAEFEA] disabled:opacity-50"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
          {conflict && <div role="alert" className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" /><span>El consultorio o la profesional ya tiene una reserva de {conflict.start} a {conflict.end}.</span></div>}
          <fieldset disabled={busy} className="space-y-4 disabled:opacity-70">
            <label className={label}>Consultorio
              <select required value={roomId} onChange={e => setRoomId(e.target.value)} className={`${input} mt-1.5`}>
                <option value="" disabled>Elegir consultorio</option>
                {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`${label} col-span-2`}>Fecha<input type="date" required value={date} onChange={e => setDate(e.target.value)} className={`${input} mt-1.5`} /></label>
              <label className={label}>Desde<input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className={`${input} mt-1.5`} /></label>
              <label className={label}>Hasta<input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} className={`${input} mt-1.5`} /></label>
            </div>
            {currentUser.role === 'admin' && <label className={label}>Profesional
              <select required value={therapistId} onChange={e => { setTherapistId(e.target.value); setDetail(''); }} className={`${input} mt-1.5`}>
                <option value="" disabled>Elegir profesional</option>
                {activeProfessionals.map(pro => <option key={pro.id} value={pro.id}>{pro.name}</option>)}
              </select>
            </label>}
            <label className={label}>Motivo
              <select value={purpose} onChange={e => { setPurpose(e.target.value as ReservationPurpose); setDetail(''); }} className={`${input} mt-1.5`}>
                <option value="block">Reservar consultorio</option>
                <option value="session">Atención a paciente</option>
                <option value="interview">Entrevista</option>
                <option value="talk">Charla</option>
                <option value="other">Otro</option>
              </select>
            </label>
            <label className={label}>{isPatientVisit ? 'Paciente (opcional)' : 'Detalle (opcional)'}
              <input type="text" list={isPatientVisit ? patientListId : undefined} value={detail} onChange={e => setDetail(e.target.value)} placeholder={isPatientVisit ? 'Nombre del paciente, si ya lo tenés' : 'Podés agregar un motivo o dejarlo vacío'} className={`${input} mt-1.5`} />
              {isPatientVisit && <datalist id={patientListId}>{proPatients.map(p => <option key={p.id} value={p.name} />)}</datalist>}
            </label>
            <p className="text-xs text-[#6D7C76]">Podés reservar sin cargar paciente y completar los datos después.</p>
            <label className={label}>Repetir
              <select value={recurrence} onChange={e => setRecurrence(e.target.value as typeof recurrence)} className={`${input} mt-1.5`}>
                <option value="none">No repetir</option><option value="weekly">Todas las semanas</option>
                {initialData?.recurrence === 'daily' && <option value="daily">Todos los días</option>}
                {initialData?.recurrence === 'weekdays' && <option value="weekdays">De lunes a viernes</option>}
              </select>
            </label>
            {recurrence !== 'none' && <label className={label}>Repetir hasta (opcional)<input type="date" min={date} value={untilDate} onChange={e => setUntilDate(e.target.value)} className={`${input} mt-1.5`} /></label>}
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {initialData?.id && onDelete && <button type="button" disabled={busy} onClick={() => void handleDelete()} className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-xs font-semibold text-rose-700 disabled:opacity-50"><Trash2 className="h-4 w-4" />{recurrence === 'none' ? 'Cancelar reserva' : 'Cancelar toda la serie'}</button>}
            <button type="submit" disabled={busy || Boolean(conflict)} className="ml-auto flex items-center gap-2 rounded-xl bg-[#46766B] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {busy ? 'Guardando…' : initialData ? 'Guardar cambios' : 'Reservar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
