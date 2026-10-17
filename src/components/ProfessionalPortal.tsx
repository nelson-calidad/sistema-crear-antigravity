import { useEffect, useMemo, useState } from 'react';
import { ROOMS, PROFESSIONALS } from '../constants';
import type { AppointmentRecord } from '../types';
import { deleteAppointment, saveAppointment, subscribeToAppointments } from '../lib/appointmentsStore';
import { apiRequest, signOut, useSession } from '../lib/session';
import { localDate, useRecords } from '../lib/crearStore';
import { conflictOnDate, occursOn, type Slot } from '../lib/scheduling';
import logo from '../assets/logo-crear.png';

type Draft = { id?: string; kind: 'session' | 'block'; date: string; start: string; end: string; roomId: string; patient: string; recurrence: 'none' | 'weekly'; untilDate: string; status: AppointmentRecord['status']; excludedDates: string[] };
const blank = (): Draft => ({ kind: 'session', date: localDate(), start: '14:00', end: '14:45', roomId: 'c1', patient: '', recurrence: 'none', untilDate: '', status: 'scheduled', excludedDates: [] });
const input = 'w-full rounded-xl border border-[#E5EAE5] bg-white px-3 py-2.5 text-sm focus:border-[#46766B] focus:outline-none';
export function ProfessionalPortal() {
  const session = useSession();
  const professionalId = session?.actor.professionalId || '';
  const profiles = useRecords('profiles'), interviews = useRecords('interviews'), agreements = useRecords('agreements');
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [date, setDate] = useState(localDate());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [availability, setAvailability] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const profile = profiles.rows.find(item => item.id === professionalId);
  const name = profile?.name || PROFESSIONALS.find(item => item.id === professionalId)?.name || 'Profesional';
  useEffect(() => { setAvailability(profile?.availability || ''); }, [profile?.availability]);
  useEffect(() => subscribeToAppointments(setAppointments, value => setError(value instanceof Error ? value.message : 'No se pudo leer la agenda.')), []);
  const ownAppointments = useMemo(() => appointments.filter(item => item.professionalId === professionalId), [appointments, professionalId]);
  const todayAppointments = ownAppointments.filter(item => item.status !== 'cancelled' && occursOn(item as Slot, date));
  const todayInterviews = interviews.rows.filter(item => item.date === date && item.status !== 'cancelada');
  const weekday = new Date(`${date}T12:00:00`).getDay();
  const todayAgreements = agreements.rows.filter(item => item.status === 'activo' && Number(item.days) === weekday);
  async function saveAvailability() {
    setBusy(true); setError(''); setNotice('');
    try { await apiRequest({ action: 'updateAvailability', entity: 'profiles', record: { id: professionalId, availability } }); await profiles.refresh(); setNotice('Disponibilidad guardada.'); }
    catch (value) { setError(value instanceof Error ? value.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  }
  async function saveDraft() {
    if (!draft) return;
    setError(''); setNotice('');
    if (!draft.roomId || draft.start >= draft.end || draft.recurrence === 'weekly' && draft.untilDate && draft.untilDate < draft.date) { setError('Revisá el consultorio, la fecha y el horario.'); return; }
    const candidate: AppointmentRecord = { id: draft.id || crypto.randomUUID(), title: draft.kind === 'block' ? 'Reserva profesional' : draft.patient || 'Sesión', kind: draft.kind, type: draft.kind, status: draft.status, professionalId, proId: professionalId, roomId: draft.roomId, patient: draft.kind === 'session' ? draft.patient : undefined, date: draft.date, start: draft.start, end: draft.end, recurrence: draft.recurrence, selectedDays: draft.recurrence === 'weekly' ? [new Date(`${draft.date}T12:00:00`).getDay()] : [], untilDate: draft.untilDate || undefined, excludedDates: draft.excludedDates };
    const agreementSlots: Slot[] = agreements.rows.filter(item => item.status === 'activo').map(item => ({ id: item.id, date: draft.date, start: item.start, end: item.end, roomId: item.roomId, professionalId: item.professionalId, status: 'confirmed', kind: 'block', recurrence: 'weekly', selectedDays: [Number(item.days)] }));
    const interviewSlots: Slot[] = interviews.rows.map(item => ({ id: item.id, date: item.date, start: item.start, end: item.end, roomId: item.roomId, professionalId: item.professionalId, status: item.status === 'cancelada' ? 'cancelled' : 'confirmed', kind: 'interview' }));
    if (conflictOnDate(candidate as Slot, [...ownAppointments as Slot[], ...agreementSlots, ...interviewSlots], draft.date)) { setError('Ese horario ya está ocupado. Elegí otra franja.'); return; }
    setBusy(true);
    try { await saveAppointment(candidate, draft.id); setDraft(null); setNotice('Turno guardado.'); }
    catch (value) { setError(value instanceof Error ? value.message : 'No se pudo guardar el turno.'); }
    finally { setBusy(false); }
  }
  async function cancelOccurrence(item: AppointmentRecord) {
    setBusy(true); setError('');
    try {
      if (item.recurrence && item.recurrence !== 'none') await saveAppointment({ ...item, excludedDates: [...new Set([...(item.excludedDates || []), date])] }, item.id);
      else await deleteAppointment(item.id);
      setNotice('La cancelación quedó registrada.');
    } catch (value) { setError(value instanceof Error ? value.message : 'No se pudo cancelar.'); }
    finally { setBusy(false); }
  }
  return <div className="min-h-dvh bg-[#F9F8F5] text-[#34433F]"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5EAE5] bg-white px-4 py-3 sm:px-8"><div className="flex items-center gap-3"><img src={logo} alt="CREAR" className="h-11 w-16 object-contain" /><div><strong className="block">Mi agenda · {name}</strong><span className="text-xs text-[#6D7C76]">{session?.actor.email}</span></div></div><button type="button" className="rounded-xl border border-[#E5EAE5] px-3 py-2 text-sm" onClick={signOut}>Cerrar sesión</button></header>
    <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold">Horarios y turnos</h1><p className="text-sm text-[#6D7C76]">Solo se muestran tus reservas, sesiones y entrevistas.</p></div><button className="rounded-xl bg-[#46766B] px-4 py-2.5 text-sm font-semibold text-white" onClick={() => { setError(''); setDraft({ ...blank(), date }); }}>Nuevo turno</button></div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="rounded-xl bg-[#DDEAE2] p-3 text-sm">{notice}</p>}
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]"><section className="rounded-2xl border border-[#E5EAE5] bg-white p-5"><label className="block text-sm font-medium">Fecha<input type="date" className={`${input} mt-2 max-w-52`} value={date} onChange={event => setDate(event.target.value)} /></label><div className="mt-4 space-y-2">{!todayAppointments.length && !todayInterviews.length && !todayAgreements.length && <p className="rounded-xl bg-[#F1F3EF] p-4 text-sm text-[#6D7C76]">No hay horarios registrados para este día.</p>}{todayAgreements.map(item => <div key={item.id} className="rounded-xl bg-[#DDEAE2] p-3 text-sm"><strong>Consultorio reservado</strong><p>{item.start}–{item.end} · {ROOMS.find(room => room.id === item.roomId)?.name || item.roomId}</p></div>)}{todayInterviews.map(item => <div key={item.id} className="rounded-xl bg-[#F6E9DB] p-3 text-sm"><strong>Entrevista inicial</strong><p>{item.start}–{item.end} · {ROOMS.find(room => room.id === item.roomId)?.name || item.roomId} · {item.status}</p></div>)}{todayAppointments.map(item => <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#E5EAE5] p-3 text-sm"><div><strong>{item.kind === 'block' ? 'Reserva de consultorio' : 'Sesión'}</strong><p>{item.start}–{item.end} · {ROOMS.find(room => room.id === item.roomId)?.name || item.roomId}</p><p className="text-[#6D7C76]">{item.patient || item.status}</p></div><div className="flex gap-2"><button className="rounded-lg border px-2 py-1" onClick={() => setDraft({ id: item.id, kind: item.kind === 'block' ? 'block' : 'session', date: item.date, start: item.start, end: item.end, roomId: item.roomId || 'c1', patient: item.patient || '', recurrence: item.recurrence === 'weekly' ? 'weekly' : 'none', untilDate: item.untilDate || '', status: item.status, excludedDates: item.excludedDates || [] })}>Editar</button><button disabled={busy} className="rounded-lg border px-2 py-1" onClick={() => void cancelOccurrence(item)}>Cancelar {item.recurrence === 'weekly' ? 'este día' : ''}</button></div></div>)}</div></section>
      <section className="rounded-2xl border border-[#E5EAE5] bg-white p-5"><h2 className="font-semibold">Mi disponibilidad</h2><p className="mt-1 text-sm text-[#6D7C76]">Informá cambios a las administradoras. Las reservas confirmadas siguen ocupando el consultorio.</p><textarea className={`${input} mt-3 min-h-32`} maxLength={500} value={availability} onChange={event => setAvailability(event.target.value)} placeholder="Ej.: Disponible los martes por la mañana" /><button disabled={busy || !profile} className="mt-3 rounded-xl bg-[#46766B] px-4 py-2 text-sm text-white disabled:opacity-50" onClick={() => void saveAvailability()}>Guardar disponibilidad</button>{!profile && <p className="mt-2 text-xs text-[#6D7C76]">Una administradora debe crear tu ficha para habilitar este cambio.</p>}</section></div>
    </main>
    {draft && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"><div className="max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">{draft.id ? 'Editar turno' : 'Nuevo turno'}</h2><button onClick={() => setDraft(null)}>Cerrar</button></div><div className="grid gap-3 sm:grid-cols-2"><label>Tipo<select className={input} value={draft.kind} onChange={event => setDraft({ ...draft, kind: event.target.value as Draft['kind'] })}><option value="session">Sesión</option><option value="block">Reserva de consultorio</option></select></label><label>Consultorio<select className={input} value={draft.roomId} onChange={event => setDraft({ ...draft, roomId: event.target.value })}>{ROOMS.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label><label>Fecha<input type="date" className={input} value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} /></label><label>Estado<select className={input} value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as Draft['status'] })}><option value="scheduled">Provisional</option><option value="confirmed">Confirmado</option><option value="cancelled">Cancelado</option></select></label><label>Desde<input type="time" className={input} value={draft.start} onChange={event => setDraft({ ...draft, start: event.target.value })} /></label><label>Hasta<input type="time" className={input} value={draft.end} onChange={event => setDraft({ ...draft, end: event.target.value })} /></label>{draft.kind === 'session' && <label className="sm:col-span-2">Nombre o identificador de paciente propio<input className={input} value={draft.patient} onChange={event => setDraft({ ...draft, patient: event.target.value })} /></label>}<label>Repetición<select className={input} value={draft.recurrence} onChange={event => setDraft({ ...draft, recurrence: event.target.value as Draft['recurrence'] })}><option value="none">Una vez</option><option value="weekly">Semanal</option></select></label>{draft.recurrence === 'weekly' && <label>Hasta<input type="date" className={input} value={draft.untilDate} onChange={event => setDraft({ ...draft, untilDate: event.target.value })} /></label>}</div>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<div className="mt-5 flex justify-end"><button disabled={busy} className="rounded-xl bg-[#46766B] px-4 py-2.5 text-white disabled:opacity-50" onClick={() => void saveDraft()}>{busy ? 'Guardando...' : 'Guardar turno'}</button></div></div></div>}
  </div>;
}
