import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, ClipboardCheck, LoaderCircle, MapPin, Plus, RefreshCw, UsersRound, X } from 'lucide-react';
import type { CoverageShift, FounderRecord } from '../types';
import { loadCoverageData, saveCoverageShift } from '../lib/coverageStore';
import { cn } from '../lib/utils';

const CURRENT_USER = 'Admin CREAR';
const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
const dateKey = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const parseDate = (value: string) => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day); };
const addDays = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const monday = (date: Date) => addDays(date, (date.getDay() + 6) % 7 * -1);
const hoursBetween = (start?: string, end?: string) => {
  const toMinutes = (value?: string) => { const [hour, minute] = (value || '').split(':').map(Number); return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0; };
  const minutes = toMinutes(end) - toMinutes(start);
  return minutes > 0 ? minutes / 60 : 0;
};
const dayName = (date: Date) => new Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(date);
const dateLabel = (date: Date) => new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(date);
const weekLabel = (start: Date) => `${dateLabel(start)} al ${dateLabel(addDays(start, 6))}`;

function ShiftForm({ founders, shift, onClose, onSave, saving }: {
  founders: FounderRecord[]; shift?: CoverageShift; onClose: () => void; onSave: (draft: Partial<CoverageShift>, repeats: number) => Promise<void>; saving: boolean;
}) {
  const [date, setDate] = useState(shift?.date || dateKey(new Date()));
  const [type, setType] = useState<CoverageShift['type']>(shift?.type || 'guard');
  const [place, setPlace] = useState(shift?.place || 'CREAR');
  const [startTime, setStartTime] = useState(shift?.startTime || '09:00');
  const [endTime, setEndTime] = useState(shift?.endTime || '13:00');
  const [primaryId, setPrimaryId] = useState(shift?.primaryId || '');
  const [secondaryId, setSecondaryId] = useState(shift?.secondaryId || '');
  const [professional, setProfessional] = useState(shift?.professional || '');
  const [status, setStatus] = useState<CoverageShift['status']>(shift?.status || 'Planned');
  const [actualStartTime, setActualStartTime] = useState(shift?.actualStartTime || '');
  const [actualEndTime, setActualEndTime] = useState(shift?.actualEndTime || '');
  const [notes, setNotes] = useState(shift?.notes || '');
  const [repeats, setRepeats] = useState('1');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!date || !startTime || !endTime || !primaryId) return setError('Completa fecha, horario y responsable.');
    if (endTime <= startTime) return setError('El horario de salida debe ser posterior al de entrada.');
    if (secondaryId && secondaryId === primaryId) return setError('La acompanante debe ser otra persona.');
    if (type === 'control' && !professional.trim()) return setError('Indica a que terapeuta corresponde el control.');
    await onSave({
      ...shift, date, type, place: place.trim() || (type === 'control' ? 'Control externo' : 'CREAR'), startTime, endTime,
      primaryId, secondaryId: secondaryId || undefined, professional: professional.trim() || undefined, status,
      actualStartTime: actualStartTime || undefined, actualEndTime: actualEndTime || undefined, notes: notes.trim() || undefined,
      completedAt: status === 'Completed' ? (shift?.completedAt || dateKey(new Date())) : undefined,
    }, shift ? 1 : Math.max(1, Math.min(12, Number(repeats) || 1)));
  };

  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-5" role="dialog" aria-modal="true">
    <form onSubmit={submit} className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
      <header className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-600">Cobertura operativa</p><h2 className="mt-1 text-xl font-bold">{shift ? 'Editar guardia o control' : 'Nueva guardia o control'}</h2></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400" aria-label="Cerrar"><X className="h-5 w-5" /></button></header>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Fecha<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Tipo<select value={type} onChange={(event) => { const value = event.target.value as CoverageShift['type']; setType(value); if (!place || place === 'CREAR' || place === 'Control externo') setPlace(value === 'control' ? 'Control externo' : 'CREAR'); }} className={inputClass}><option value="guard">Guardia en CREAR</option><option value="control">Control externo</option></select></label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Lugar<input value={place} onChange={(event) => setPlace(event.target.value)} className={inputClass} placeholder="CREAR o domicilio/consultorio" /></label>
        {type === 'control' ? <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Terapeuta o equipo<input required value={professional} onChange={(event) => setProfessional(event.target.value)} className={inputClass} placeholder="Ej. Lic. Garcia" /></label> : <div />}
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Horario de inicio<input required type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClass} /></label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Horario de salida<input required type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className={inputClass} /></label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Responsable principal<select required value={primaryId} onChange={(event) => setPrimaryId(event.target.value)} className={inputClass}><option value="">Seleccionar</option>{founders.map((founder) => <option key={founder.id} value={founder.id}>{founder.displayName}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Acompanante <span className="font-medium text-slate-400">(opcional)</span><select value={secondaryId} onChange={(event) => setSecondaryId(event.target.value)} className={inputClass}><option value="">Sin acompanante</option>{founders.filter((founder) => founder.id !== primaryId).map((founder) => <option key={founder.id} value={founder.id}>{founder.displayName}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Estado<select value={status} onChange={(event) => setStatus(event.target.value as CoverageShift['status'])} className={inputClass}><option value="Planned">Planificada</option><option value="Completed">Realizada</option><option value="Rescheduled">Reprogramada</option><option value="Cancelled">Cancelada</option></select></label>
        {!shift && <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Proyectar esta cobertura<select value={repeats} onChange={(event) => setRepeats(event.target.value)} className={inputClass}><option value="1">Solo esta semana</option><option value="2">Por 2 semanas</option><option value="4">Por 4 semanas</option><option value="8">Por 8 semanas</option><option value="12">Por 12 semanas</option></select></label>}
        {status === 'Completed' && <><label className="text-xs font-bold text-slate-600 dark:text-slate-300">Inicio real<input type="time" value={actualStartTime} onChange={(event) => setActualStartTime(event.target.value)} className={inputClass} /></label><label className="text-xs font-bold text-slate-600 dark:text-slate-300">Salida real<input type="time" value={actualEndTime} onChange={(event) => setActualEndTime(event.target.value)} className={inputClass} /></label></>}
        <label className="sm:col-span-2 text-xs font-bold text-slate-600 dark:text-slate-300">Registro / novedad<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={cn(inputClass, 'min-h-20 resize-y')} placeholder="Que se hizo, observaciones o motivo de reprogramacion." /></label>
        {error && <p className="sm:col-span-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
      </div>
      <footer className="flex justify-end gap-3 border-t border-slate-100 p-5 dark:border-slate-800"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{shift ? 'Guardar cambios' : 'Guardar cobertura'}</button></footer>
    </form>
  </div>;
}

export const CoveragePlanner = () => {
  const [founders, setFounders] = useState<FounderRecord[]>([]);
  const [shifts, setShifts] = useState<CoverageShift[]>([]);
  const [week, setWeek] = useState(() => monday(new Date()));
  const [editor, setEditor] = useState<CoverageShift | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = async () => {
    setLoading(true); setError('');
    try { const data = await loadCoverageData(); setFounders(data.founders); setShifts(data.shifts); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar la cobertura operativa.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, []);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 3500); return () => window.clearTimeout(timer); }, [notice]);

  const nameFor = (id?: string) => founders.find((founder) => founder.id === id)?.displayName || 'Sin asignar';
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(week, index)), [week]);
  const dayKeys = useMemo(() => new Set(days.map(dateKey)), [days]);
  const weekShifts = useMemo(() => shifts.filter((shift) => dayKeys.has(shift.date)).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)), [shifts, dayKeys]);
  const balance = useMemo(() => {
    const horizonStart = monday(new Date()); const horizonEnd = dateKey(addDays(horizonStart, 27));
    const range = shifts.filter((shift) => shift.date >= dateKey(horizonStart) && shift.date <= horizonEnd && shift.status !== 'Cancelled');
    return founders.map((founder) => range.reduce((total, shift) => {
      if (![shift.primaryId, shift.secondaryId].filter(Boolean).includes(founder.id)) return total;
      const planned = hoursBetween(shift.startTime, shift.endTime);
      const actual = shift.status === 'Completed' ? hoursBetween(shift.actualStartTime || shift.startTime, shift.actualEndTime || shift.endTime) : 0;
      return { ...total, plannedHours: total.plannedHours + planned, actualHours: total.actualHours + actual, plannedControls: total.plannedControls + (shift.type === 'control' ? 1 : 0), actualControls: total.actualControls + (shift.type === 'control' && shift.status === 'Completed' ? 1 : 0) };
    }, { founder, plannedHours: 0, actualHours: 0, plannedControls: 0, actualControls: 0 }));
  }, [founders, shifts]);

  const save = async (draft: Partial<CoverageShift>, repeats: number) => {
    setSaving(true);
    try {
      const dates = draft.id ? [draft.date || ''] : Array.from({ length: repeats }, (_, index) => dateKey(addDays(parseDate(draft.date || dateKey(new Date())), index * 7)));
      const saved = await Promise.all(dates.map((date) => saveCoverageShift({ ...draft, id: draft.id, date }, CURRENT_USER)));
      setShifts((current) => { const ids = new Set(saved.map((shift) => shift.id)); return [...current.filter((shift) => !ids.has(shift.id)), ...saved]; });
      setEditor(undefined); setNotice(saved.length > 1 ? `${saved.length} semanas proyectadas.` : 'Cobertura guardada.');
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'No se pudo guardar la cobertura.'); }
    finally { setSaving(false); }
  };

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-sky-600">Planificacion operativa</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">Guardias y controles <CalendarDays className="h-6 w-6 text-sky-600" /></h1><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Organiza la cobertura de CREAR, los controles externos y registra lo que realmente se hizo.</p></div><button onClick={() => setEditor(null)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900"><Plus className="h-4 w-4" /> Nueva cobertura</button></header>
    {notice && <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800"><ClipboardCheck className="mr-2 inline h-4 w-4" />{notice}</div>}
    {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700"><p className="font-bold">No se pudo abrir Guardias y controles</p><p className="mt-1">{error}</p><button onClick={() => void reload()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-700"><RefreshCw className="h-4 w-4" /> Reintentar</button></div> : <>
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Calendario semanal</p><h2 className="mt-1 text-lg font-bold capitalize">{weekLabel(week)}</h2></div><div className="flex items-center gap-2"><button onClick={() => setWeek((current) => addDays(current, -7))} className="rounded-xl border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-300" aria-label="Semana anterior"><ChevronLeft className="h-5 w-5" /></button><button onClick={() => setWeek(monday(new Date()))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Hoy</button><button onClick={() => setWeek((current) => addDays(current, 7))} className="rounded-xl border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-300" aria-label="Semana siguiente"><ChevronRight className="h-5 w-5" /></button></div></div>
        <div className="mt-4 grid gap-3 md:grid-cols-7">{days.map((day) => { const key = dateKey(day); const today = key === dateKey(new Date()); const entries = weekShifts.filter((shift) => shift.date === key); return <section key={key} className={cn('min-h-52 rounded-2xl border p-2.5', today ? 'border-sky-300 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/20' : 'border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/30')}><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase text-slate-400">{dayName(day)}</p><span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-black', today && 'bg-sky-600 text-white')}>{day.getDate()}</span></div><div className="mt-2 space-y-2">{entries.map((shift) => <article key={shift.id} className={cn('rounded-xl border p-2 text-left shadow-sm', shift.status === 'Completed' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : shift.type === 'control' ? 'border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/30' : 'border-sky-200 bg-white dark:border-sky-900 dark:bg-slate-900')}><button onClick={() => setEditor(shift)} className="w-full text-left"><div className="flex items-center justify-between gap-1"><span className="text-[10px] font-black text-slate-700 dark:text-slate-200">{shift.startTime}?{shift.endTime}</span>{shift.status === 'Completed' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}</div><p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300"><MapPin className="h-3 w-3" />{shift.place}</p><p className="mt-1 text-[11px] font-black text-slate-800 dark:text-slate-100">{nameFor(shift.primaryId)}{shift.secondaryId ? ` + ${nameFor(shift.secondaryId)}` : ''}</p>{shift.type === 'control' && <p className="mt-1 text-[10px] text-violet-700 dark:text-violet-300">{shift.professional || 'Control externo'}</p>}</button>{shift.status !== 'Completed' && shift.status !== 'Cancelled' && <button onClick={() => void save({ ...shift, status: 'Completed', actualStartTime: shift.startTime, actualEndTime: shift.endTime, completedAt: dateKey(new Date()) }, 1)} disabled={saving} className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-white/80 px-2 py-1.5 text-[10px] font-black text-emerald-700 shadow-sm dark:bg-slate-800"><CheckCircle2 className="h-3 w-3" /> Marcar realizada</button>}</article>)}{!entries.length && <button onClick={() => setEditor({ id: '', date: key, startTime: '09:00', endTime: '13:00', type: 'guard', place: 'CREAR', primaryId: '', status: 'Planned' } as CoverageShift)} className="w-full rounded-xl border border-dashed border-slate-200 px-2 py-3 text-[10px] font-bold text-slate-400 transition hover:border-sky-300 hover:text-sky-600 dark:border-slate-700">+ Agregar</button>}</div></section>; })}</div>
      </section>
      <section><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Equilibrio de cobertura</p><h2 className="mt-1 text-lg font-bold">Proyeccion de las proximas 4 semanas</h2></div><p className="text-xs text-slate-500">Las horas reales solo suman al marcar la cobertura como realizada.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{loading ? <p className="col-span-full rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Cargando cobertura...</p> : balance.map((item) => <article key={item.founder.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white dark:bg-slate-100 dark:text-slate-900">{item.founder.displayName.slice(0, 2).toUpperCase()}</span><p className="truncate text-sm font-black">{item.founder.displayName}</p></div><div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-[10px] font-black uppercase text-slate-400">Planificado</p><p className="mt-1 text-lg font-black text-sky-700">{item.plannedHours.toFixed(1)} h</p><p className="text-[11px] text-slate-500">{item.plannedControls} controles</p></div><div><p className="text-[10px] font-black uppercase text-slate-400">Realizado</p><p className="mt-1 text-lg font-black text-emerald-700">{item.actualHours.toFixed(1)} h</p><p className="text-[11px] text-slate-500">{item.actualControls} controles</p></div></div></article>)}</div></section>
    </>}
    {editor !== undefined && <ShiftForm founders={founders} shift={editor || undefined} onClose={() => setEditor(undefined)} onSave={save} saving={saving} />}
  </div>;
};
