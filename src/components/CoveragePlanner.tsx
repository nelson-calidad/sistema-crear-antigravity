import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, LoaderCircle, Pencil, Plus, Printer, RefreshCw, StickyNote, Trash2, X } from 'lucide-react';
import type { CoverageShift, FounderRecord, WeeklyCoverageNote, WeeklyCoverageTask } from '../types';
import { loadCoverageData, saveCoverageShift, saveWeeklyCoverageNote } from '../lib/coverageStore';
import { cn } from '../lib/utils';

const CURRENT_USER = 'Admin CREAR';
const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
type CoveragePrintMode = 'month' | 'followup';
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

function WeeklyNotePanel({ note, saving, onSave }: { note?: WeeklyCoverageNote; saving: boolean; onSave: (tasks: WeeklyCoverageTask[]) => Promise<void> }) {
  const [newTask, setNewTask] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const tasks = note?.tasks || [];
  const addTask = async (event: FormEvent) => {
    event.preventDefault();
    const text = newTask.trim();
    if (!text) return;
    await onSave([...tasks, { id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, completed: false }]);
    setNewTask('');
  };
  const startEditing = (task: WeeklyCoverageTask) => { setEditingTaskId(task.id); setEditingText(task.text); };
  const saveText = async (task: WeeklyCoverageTask) => {
    const text = editingText.trim();
    if (!text || text === task.text) return setEditingTaskId(null);
    await onSave(tasks.map((item) => item.id === task.id ? { ...item, text } : item));
    setEditingTaskId(null);
  };
  return <section className="mt-4 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-sky-50 shadow-sm dark:border-amber-900/60 dark:from-amber-950/20 dark:via-slate-900 dark:to-sky-950/20">
    <div className="flex flex-col gap-3 border-b border-amber-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/40"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950 shadow-sm"><StickyNote className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-700 dark:text-amber-300">Nota de la semana</p><p className="text-sm font-bold text-slate-800 dark:text-slate-100">Tareas y recordatorios para estas guardias</p></div></div><span className="self-start rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm dark:bg-slate-800">{tasks.filter((task) => task.completed).length}/{tasks.length} realizadas</span></div>
    <div className="p-4"><form onSubmit={(event) => void addTask(event)} className="flex gap-2"><input value={newTask} onChange={(event) => setNewTask(event.target.value)} disabled={saving} className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-400 dark:border-amber-900 dark:bg-slate-800 dark:text-slate-100" placeholder="Ej. Revisar materiales de la sala 2" /><button disabled={saving || !newTask.trim()} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-amber-400 px-3 py-2.5 text-xs font-black text-amber-950 transition hover:bg-amber-300 disabled:opacity-50"><Plus className="h-4 w-4" /> Agregar</button></form>
      {tasks.length ? <ol className="mt-3 space-y-2">{tasks.map((task, index) => <li key={task.id} className="group flex items-center gap-2 rounded-xl border border-white/90 bg-white/80 p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/80"><button type="button" disabled={saving} onClick={() => void onSave(tasks.map((item) => item.id === task.id ? { ...item, completed: !item.completed } : item))} className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition', task.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-transparent hover:border-emerald-400 dark:border-slate-600 dark:bg-slate-900')} aria-label={task.completed ? `Marcar pendiente: ${task.text}` : `Marcar realizada: ${task.text}`}><CheckCircle2 className="h-4 w-4" /></button><span className="w-4 text-xs font-black text-amber-600">{index + 1}</span>{editingTaskId === task.id ? <div className="flex min-w-0 flex-1 items-center gap-1"><input autoFocus value={editingText} disabled={saving} onChange={(event) => setEditingText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void saveText(task); } if (event.key === 'Escape') setEditingTaskId(null); }} className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-2 py-1 text-sm font-semibold text-slate-700 outline-none focus:border-amber-500 dark:bg-slate-900 dark:text-slate-100" aria-label="Editar tarea" /><button type="button" disabled={saving || !editingText.trim()} onClick={() => void saveText(task)} className="rounded-lg bg-amber-400 px-2 py-1 text-[10px] font-black text-amber-950 disabled:opacity-50">Listo</button><button type="button" disabled={saving} onClick={() => setEditingTaskId(null)} className="rounded-lg p-1 text-slate-400" aria-label="Cancelar edición"><X className="h-4 w-4" /></button></div> : <><p className={cn('min-w-0 flex-1 text-sm font-semibold', task.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200')}>{task.text}</p><button type="button" disabled={saving} onClick={() => startEditing(task)} className="rounded-lg p-1 text-slate-300 transition hover:bg-amber-50 hover:text-amber-700 sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Editar ${task.text}`}><Pencil className="h-3.5 w-3.5" /></button><button type="button" disabled={saving} onClick={() => void onSave(tasks.filter((item) => item.id !== task.id))} className="rounded-lg p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Eliminar ${task.text}`}><X className="h-4 w-4" /></button></>}</li>)}</ol> : <div className="mt-3 rounded-xl border border-dashed border-amber-200 bg-white/50 px-4 py-5 text-center text-sm font-medium text-slate-500 dark:border-amber-900/60 dark:bg-slate-900/30">Agregá las actividades que deben realizarse durante esta semana.</div>}</div>
  </section>;
}

function WeeklyNotePreview({ note }: { note?: WeeklyCoverageNote }) {
  const tasks = note?.tasks || [];
  return <section className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/70 dark:bg-amber-950/20"><div className="flex items-center gap-2"><StickyNote className="h-4 w-4 text-amber-600" /><div><p className="text-xs font-black text-amber-900 dark:text-amber-200">Nota semanal adjunta</p><p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Solo lectura: las tareas se modifican desde “Nota semanal”.</p></div></div>{tasks.length ? <ol className="mt-3 space-y-1.5">{tasks.map((task, index) => <li key={task.id} className="flex items-center gap-2 rounded-lg bg-white/70 px-2.5 py-2 text-xs dark:bg-slate-900/60"><CheckCircle2 className={cn('h-3.5 w-3.5 shrink-0', task.completed ? 'text-emerald-600' : 'text-slate-300')} /><span className="font-black text-amber-700">{index + 1}</span><span className={cn('font-semibold', task.completed && 'text-slate-400 line-through')}>{task.text}</span></li>)}</ol> : <p className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-xs font-medium text-slate-500 dark:bg-slate-900/50">Todavía no hay tareas cargadas para esta semana.</p>}</section>;
}

function CoverageShiftPreview({ shift, weeklyNote, nameFor, onClose }: { shift: CoverageShift; weeklyNote?: WeeklyCoverageNote; nameFor: (id?: string) => string; onClose: () => void }) {
  const tasks = weeklyNote?.tasks || [];
  const statusLabel = shift.status === 'Completed' ? 'Realizada' : shift.status === 'Rescheduled' ? 'Reprogramada' : 'Planificada';
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Resumen de guardia"><section className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl"><header className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-600">Resumen de guardia</p><h2 className="mt-1 text-xl font-bold">{shift.place || 'Guardia CREAR'}</h2><p className="mt-1 text-sm font-medium text-slate-500">{new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(parseDate(shift.date))}</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar"><X className="h-5 w-5" /></button></header><div className="space-y-4 p-5"><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-[10px] font-black uppercase text-slate-400">Horario</p><p className="mt-1 text-sm font-black">{shift.startTime} a {shift.endTime}</p></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-[10px] font-black uppercase text-slate-400">Estado</p><p className="mt-1 text-sm font-black text-sky-700 dark:text-sky-300">{statusLabel}</p></div></div><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Responsables</p><p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{nameFor(shift.primaryId)}{shift.secondaryId ? ` + ${nameFor(shift.secondaryId)}` : ''}</p></div>{shift.notes && <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Registro / novedad</p><p className="mt-1 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{shift.notes}</p></div>}{shift.hasWeeklyNote && <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/70 dark:bg-amber-950/20"><div className="flex items-center gap-2"><StickyNote className="h-4 w-4 text-amber-600" /><div><p className="text-xs font-black text-amber-900 dark:text-amber-200">Tareas adjuntas de la semana</p><p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Vista de consulta</p></div></div>{tasks.length ? <ol className="mt-3 space-y-1.5">{tasks.map((task, index) => <li key={task.id} className="flex items-center gap-2 rounded-lg bg-white/70 px-2.5 py-2 text-xs dark:bg-slate-900/60"><CheckCircle2 className={cn('h-3.5 w-3.5 shrink-0', task.completed ? 'text-emerald-600' : 'text-slate-300')} /><span className="font-black text-amber-700">{index + 1}</span><span className={cn('font-semibold', task.completed && 'text-slate-400 line-through')}>{task.text}</span></li>)}</ol> : <p className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-xs font-medium text-slate-500 dark:bg-slate-900/50">Todavía no hay tareas cargadas para esta semana.</p>}</section>}</div><footer className="border-t border-slate-100 p-4 dark:border-slate-800"><button type="button" onClick={onClose} className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900">Cerrar resumen</button></footer></section></div>;
}

function ShiftForm({ founders, shift, weeklyNote, onClose, onSave, onDelete, saving }: {
  founders: FounderRecord[]; shift?: CoverageShift; weeklyNote?: WeeklyCoverageNote; onClose: () => void; onSave: (draft: Partial<CoverageShift>, repeats: number, workweek?: boolean) => Promise<void>; onDelete: (shift: CoverageShift) => Promise<void>; saving: boolean;
}) {
  const [date, setDate] = useState(shift?.date || dateKey(new Date()));
  const [activity, setActivity] = useState(shift?.place || '');
  const [startTime, setStartTime] = useState(shift?.startTime || '09:00');
  const [endTime, setEndTime] = useState(shift?.endTime || '13:00');
  const [primaryId, setPrimaryId] = useState(shift?.primaryId || '');
  const [secondaryId, setSecondaryId] = useState(shift?.secondaryId || '');
  const [status, setStatus] = useState<CoverageShift['status']>(shift?.status || 'Planned');
  const [notes, setNotes] = useState(shift?.notes || '');
  const [hasWeeklyNote, setHasWeeklyNote] = useState(Boolean(shift?.hasWeeklyNote));
  const [repeats, setRepeats] = useState('1');
  const [rangeMode, setRangeMode] = useState<'day' | 'workweek'>('day');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!date || !activity.trim() || !startTime || !endTime || !primaryId) return setError('Completa fecha, actividad, horario y responsable.');
    if (endTime <= startTime) return setError('El horario de salida debe ser posterior al de entrada.');
    if (secondaryId && secondaryId === primaryId) return setError('La acompanante debe ser otra persona.');
    await onSave({
      ...shift,
      date,
      type: 'guard',
      place: activity.trim(),
      startTime,
      endTime,
      primaryId,
      secondaryId: secondaryId || undefined,
      status,
      actualStartTime: status === 'Completed' ? (shift?.actualStartTime || startTime) : undefined,
      actualEndTime: status === 'Completed' ? (shift?.actualEndTime || endTime) : undefined,
      notes: notes.trim() || undefined,
      hasWeeklyNote,
      completedAt: status === 'Completed' ? (shift?.completedAt || dateKey(new Date())) : undefined,
    }, shift?.id ? 1 : Math.max(1, Math.min(12, Number(repeats) || 1)), !shift?.id && rangeMode === 'workweek');
  };

  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-5" role="dialog" aria-modal="true">
    <form onSubmit={submit} className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
      <header className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-600">Guardias CREAR</p><h2 className="mt-1 text-xl font-bold">{shift?.id ? 'Editar guardia CREAR' : 'Nueva guardia CREAR'}</h2></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400" aria-label="Cerrar"><X className="h-5 w-5" /></button></header>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Fecha<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />{!shift?.id && <><span className="mt-3 block">Alcance de las guardias</span><select value={rangeMode} onChange={(event) => setRangeMode(event.target.value as 'day' | 'workweek')} className={inputClass}><option value="day">Solo esta fecha</option><option value="workweek">De lunes a viernes de esa semana</option></select><span className="mt-3 block">Proyectar en semanas</span><select value={repeats} onChange={(event) => setRepeats(event.target.value)} className={inputClass}><option value="1">Solo esta semana</option><option value="2">Esta y la proxima semana</option><option value="4">Durante 4 semanas</option><option value="8">Durante 8 semanas</option><option value="12">Durante 12 semanas</option></select><span className="mt-1 block font-medium text-slate-400">{rangeMode === 'workweek' ? 'Crea una guardia por dia, de lunes a viernes.' : 'Crea la guardia en la fecha elegida.'}</span></>}</label>
        <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Tipo<div className={cn(inputClass, 'flex items-center bg-slate-50 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100')}>Guardia CREAR</div></div>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Actividad<input required value={activity} onChange={(event) => setActivity(event.target.value)} className={inputClass} placeholder="Ej. Limpieza del centro" /></label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Horario de inicio<input required type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClass} /></label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Horario de salida<input required type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className={inputClass} /></label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Responsable principal<select required value={primaryId} onChange={(event) => setPrimaryId(event.target.value)} className={inputClass}><option value="">Seleccionar</option>{founders.map((founder) => <option key={founder.id} value={founder.id}>{founder.displayName}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Acompanante <span className="font-medium text-slate-400">(opcional)</span><select value={secondaryId} onChange={(event) => setSecondaryId(event.target.value)} className={inputClass}><option value="">Sin acompanante</option>{founders.filter((founder) => founder.id !== primaryId).map((founder) => <option key={founder.id} value={founder.id}>{founder.displayName}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Estado<select value={status} onChange={(event) => setStatus(event.target.value as CoverageShift['status'])} className={inputClass}><option value="Planned">Planificada</option><option value="Completed">Realizada</option><option value="Rescheduled">Reprogramada</option><option value="Cancelled">Cancelada</option></select></label>


        <label className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-slate-700 transition hover:border-amber-300 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-slate-200"><input type="checkbox" checked={hasWeeklyNote} onChange={(event) => setHasWeeklyNote(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-500 focus:ring-amber-400" /><span><span className="flex items-center gap-1 font-black"><StickyNote className="h-3.5 w-3.5 text-amber-600" /> Adjuntar nota de la semana</span><span className="mt-0.5 block font-medium text-slate-500 dark:text-slate-400">Marca esta opción si la guardia debe realizar las tareas del block semanal.</span></span></label>
        {hasWeeklyNote && <WeeklyNotePreview note={weeklyNote} />}
        <label className="sm:col-span-2 text-xs font-bold text-slate-600 dark:text-slate-300">Registro / novedad<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={cn(inputClass, 'min-h-20 resize-y')} placeholder="Que se hizo, observaciones o motivo de reprogramacion." /></label>
        {error && <p className="sm:col-span-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5 dark:border-slate-800"><div>{shift?.id && <button type="button" disabled={saving} onClick={() => void onDelete(shift)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:hover:bg-rose-950/30"><Trash2 className="h-4 w-4" /> Eliminar guardia</button>}</div><div className="flex gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{shift?.id ? 'Guardar cambios' : 'Guardar guardia'}</button></div></footer>
    </form>
  </div>;
}

export const CoveragePlanner = () => {
  const [founders, setFounders] = useState<FounderRecord[]>([]);
  const [shifts, setShifts] = useState<CoverageShift[]>([]);
  const [weeklyNotes, setWeeklyNotes] = useState<WeeklyCoverageNote[]>([]);
  const [week, setWeek] = useState(() => monday(new Date()));
  const [balanceMode, setBalanceMode] = useState<'fourWeeks' | 'week' | 'month'>('fourWeeks');
  const [balanceDate, setBalanceDate] = useState(() => new Date());
  const [editor, setEditor] = useState<CoverageShift | null | undefined>(undefined);
  const [preview, setPreview] = useState<CoverageShift | null>(null);
  const [printMode, setPrintMode] = useState<CoveragePrintMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isWeeklyNoteOpen, setIsWeeklyNoteOpen] = useState(false);

  const reload = async () => {
    setLoading(true); setError('');
    try { const data = await loadCoverageData(); setFounders(data.founders); setShifts(data.shifts); setWeeklyNotes(data.weeklyNotes); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las guardias CREAR.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, []);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 3500); return () => window.clearTimeout(timer); }, [notice]);
  useEffect(() => {
    if (!printMode) return;
    const timer = window.setTimeout(() => window.print(), 60);
    const finish = () => setPrintMode(null);
    window.addEventListener('afterprint', finish);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', finish);
    };
  }, [printMode]);

  const nameFor = (id?: string) => founders.find((founder) => founder.id === id)?.displayName || 'Sin asignar';
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(week, index)), [week]);
  const dayKeys = useMemo(() => new Set(days.map(dateKey)), [days]);
  const weekShifts = useMemo(() => shifts.filter((shift) => shift.status !== 'Cancelled' && dayKeys.has(shift.date)).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)), [shifts, dayKeys]);
  const weeklyNote = useMemo(() => weeklyNotes.find((note) => note.weekStart === dateKey(week)), [weeklyNotes, week]);
  const printableMonthShifts = useMemo(() => shifts.filter((shift) => { const date = parseDate(shift.date); return shift.status !== 'Cancelled' && date.getFullYear() === week.getFullYear() && date.getMonth() === week.getMonth(); }), [shifts, week]);
  const followupMonthShifts = useMemo(() => shifts.filter((shift) => { const date = parseDate(shift.date); return date.getFullYear() === week.getFullYear() && date.getMonth() === week.getMonth(); }).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)), [shifts, week]);
  const balancePeriod = useMemo(() => {
    if (balanceMode === 'month') { const start = new Date(balanceDate.getFullYear(), balanceDate.getMonth(), 1); return { start, end: new Date(balanceDate.getFullYear(), balanceDate.getMonth() + 1, 0), title: `Mes de ${new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(balanceDate)}` }; }
    const start = monday(balanceDate);
    if (balanceMode === 'week') return { start, end: addDays(start, 6), title: `Semana del ${weekLabel(start)}` };
    return { start, end: addDays(start, 27), title: `Proyeccion: ${weekLabel(start)} al ${dateLabel(addDays(start, 27))}` };
  }, [balanceDate, balanceMode]);
  const balance = useMemo(() => {
    const range = shifts.filter((shift) => shift.date >= dateKey(balancePeriod.start) && shift.date <= dateKey(balancePeriod.end) && shift.status !== 'Cancelled');
    return founders.map((founder) => range.reduce((total, shift) => {
      if (![shift.primaryId, shift.secondaryId].filter(Boolean).includes(founder.id)) return total;
      const planned = hoursBetween(shift.startTime, shift.endTime);
      const actual = shift.status === 'Completed' ? hoursBetween(shift.actualStartTime || shift.startTime, shift.actualEndTime || shift.endTime) : 0;
      return { ...total, plannedHours: total.plannedHours + planned, actualHours: total.actualHours + actual, plannedGuards: total.plannedGuards + 1, actualGuards: total.actualGuards + (shift.status === 'Completed' ? 1 : 0) };
    }, { founder, plannedHours: 0, actualHours: 0, plannedGuards: 0, actualGuards: 0 }));
  }, [balancePeriod, founders, shifts]);

  const save = async (draft: Partial<CoverageShift>, repeats: number, workweek = false) => {
    const selectedDate = parseDate(draft.date || dateKey(new Date()));
    const firstDate = workweek ? monday(selectedDate) : selectedDate;
    const dates = draft.id ? [draft.date || ''] : Array.from({ length: repeats }, (_, weekIndex) => Array.from({ length: workweek ? 5 : 1 }, (_, dayIndex) => dateKey(addDays(firstDate, weekIndex * 7 + dayIndex)))).flat();
    const previous = shifts;
    const temporary = dates.map((date, index) => ({ ...draft, id: draft.id || `pending-${Date.now()}-${index}`, date } as CoverageShift));
    const temporaryIds = new Set(temporary.map((shift) => shift.id));
    const isCompletion = draft.status === 'Completed' && shifts.find((shift) => shift.id === draft.id)?.status !== 'Completed';
    setSaving(true);
    setNotice(isCompletion ? 'Guardando la realizacion...' : 'Guardando guardia...');
    setShifts((current) => [...current.filter((shift) => draft.id ? shift.id !== draft.id : true), ...temporary]);
    setEditor(undefined);
    try {
      const saved = await Promise.all(dates.map((date) => saveCoverageShift({ ...draft, id: draft.id, date, type: 'guard' }, CURRENT_USER)));
      const savedIds = new Set(saved.map((shift) => shift.id));
      setShifts((current) => [...current.filter((shift) => !temporaryIds.has(shift.id) && !savedIds.has(shift.id)), ...saved]);
      setNotice(isCompletion ? 'Guardia marcada como realizada.' : saved.length > 1 ? `${saved.length} guardias programadas.` : 'Guardia guardada.');
    } catch (cause) {
      setShifts(previous);
      setNotice(cause instanceof Error ? cause.message : 'No se pudo guardar la guardia. Se revirtio el cambio.');
    } finally { setSaving(false); }
  };

  const remove = async (shift: CoverageShift) => {
    if (!window.confirm('¿Eliminar esta cobertura del calendario? Quedará registrada como cancelada en la planilla.')) return;
    const previous = shifts;
    setSaving(true);
    setNotice('Eliminando guardia...');
    setShifts((current) => current.filter((item) => item.id !== shift.id));
    setEditor(undefined);
    try {
      await saveCoverageShift({ ...shift, status: 'Cancelled' }, CURRENT_USER);
      setNotice('Guardia eliminada del calendario.');
    } catch (cause) {
      setShifts(previous);
      setNotice(cause instanceof Error ? cause.message : 'No se pudo eliminar la cobertura. Se recuperó en el calendario.');
    } finally { setSaving(false); }
  };

  const saveWeeklyNote = async (tasks: WeeklyCoverageTask[]) => {
    const nextNote: WeeklyCoverageNote = { weekStart: dateKey(week), tasks };
    const previous = weeklyNotes;
    setSaving(true);
    setWeeklyNotes((current) => [...current.filter((note) => note.weekStart !== nextNote.weekStart), nextNote]);
    try {
      const saved = await saveWeeklyCoverageNote(nextNote, CURRENT_USER);
      setWeeklyNotes((current) => [...current.filter((note) => note.weekStart !== saved.weekStart), saved]);
    } catch (cause) {
      setWeeklyNotes(previous);
      setNotice(cause instanceof Error ? cause.message : 'No se pudo guardar la nota semanal.');
    } finally { setSaving(false); }
  };

  return <>
    {typeof document !== 'undefined' && printMode === 'month' && createPortal(<CoveragePrintSheet month={week} shifts={printableMonthShifts} nameFor={nameFor} />, document.body)}
    {typeof document !== 'undefined' && printMode === 'followup' && createPortal(<CoverageFollowupPrintSheet month={week} shifts={followupMonthShifts} nameFor={nameFor} />, document.body)}
    <div className="space-y-5">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-sky-600">Planificacion operativa</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">Guardias CREAR <CalendarDays className="h-6 w-6 text-sky-600" /></h1><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Organiza las guardias de CREAR y registra lo que se realizo.</p></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => setPrintMode('month')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><Printer className="h-4 w-4" /> Imprimir mes</button><button onClick={() => setPrintMode('followup')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><ClipboardCheck className="h-4 w-4" /> Imprimir seguimiento</button><button onClick={() => setEditor(null)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900"><Plus className="h-4 w-4" /> Nueva guardia</button></div></header>
    {notice && <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">{saving ? <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 inline h-4 w-4" />}{notice}</div>}
    {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700"><p className="font-bold">No se pudieron abrir las guardias CREAR</p><p className="mt-1">{error}</p><button onClick={() => void reload()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-700"><RefreshCw className="h-4 w-4" /> Reintentar</button></div> : <>
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Calendario semanal</p><h2 className="mt-1 text-lg font-bold capitalize">{weekLabel(week)}</h2></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => setWeek((current) => addDays(current, -7))} className="rounded-xl border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-300" aria-label="Semana anterior"><ChevronLeft className="h-5 w-5" /></button><button onClick={() => setWeek(monday(new Date()))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Hoy</button><button onClick={() => setWeek((current) => addDays(current, 7))} className="rounded-xl border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-300" aria-label="Semana siguiente"><ChevronRight className="h-5 w-5" /></button><button onClick={() => setIsWeeklyNoteOpen((current) => !current)} className={cn('inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition', isWeeklyNoteOpen || weeklyNote?.tasks.length ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')} aria-expanded={isWeeklyNoteOpen}><StickyNote className="h-4 w-4" /> Nota semanal{weeklyNote?.tasks.length ? <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] text-amber-950">{weeklyNote.tasks.filter((task) => !task.completed).length}</span> : null}</button></div></div>
        {isWeeklyNoteOpen && <WeeklyNotePanel note={weeklyNote} saving={saving} onSave={saveWeeklyNote} />}
        <div className="mt-4 grid gap-3 md:grid-cols-7">{days.map((day) => { const key = dateKey(day); const today = key === dateKey(new Date()); const entries = weekShifts.filter((shift) => shift.date === key); return <section key={key} className={cn('min-h-52 rounded-2xl border p-2.5', today ? 'border-sky-300 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/20' : 'border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/30')}><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase text-slate-400">{dayName(day)}</p><span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-black', today && 'bg-sky-600 text-white')}>{day.getDate()}</span></div><div className="mt-2 space-y-2">{entries.map((shift) => <article key={shift.id} className={cn('rounded-xl border p-2 text-left shadow-sm', shift.status === 'Completed' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-sky-200 bg-white dark:border-sky-900 dark:bg-slate-900')}><button onClick={() => setPreview(shift)} className="w-full text-left" aria-label={`Ver resumen de ${shift.place || 'guardia'}`}><div className="flex items-center justify-between gap-1"><span className="text-[10px] font-black text-slate-700 dark:text-slate-200">{shift.startTime} a {shift.endTime}</span><span className="flex items-center gap-1">{shift.hasWeeklyNote && <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-1 text-[9px] font-black text-amber-800 shadow-sm dark:bg-amber-950/60 dark:text-amber-200" title="Tiene tareas adjuntas de la nota semanal"><StickyNote className="h-3.5 w-3.5" /><span className="hidden lg:inline">Nota</span></span>}{shift.status === 'Completed' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}</span></div><p className="mt-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">Actividad: {shift.place || 'Sin actividad registrada'}</p><p className="mt-1 text-[11px] font-black text-slate-800 dark:text-slate-100">{nameFor(shift.primaryId)}{shift.secondaryId ? ' + ' + nameFor(shift.secondaryId) : ''}</p></button>{shift.status !== 'Completed' && <button onClick={() => void save({ ...shift, type: 'guard', status: 'Completed', actualStartTime: shift.startTime, actualEndTime: shift.endTime, completedAt: dateKey(new Date()) }, 1)} className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-white/80 px-2 py-1.5 text-[10px] font-black text-emerald-700 shadow-sm dark:bg-slate-800"><CheckCircle2 className="h-3 w-3" /> Marcar realizada</button>}</article>)}{!entries.length && <button onClick={() => setEditor({ id: '', date: key, startTime: '09:00', endTime: '13:00', type: 'guard', place: '', primaryId: '', status: 'Planned' } as CoverageShift)} className="w-full rounded-xl border border-dashed border-slate-200 px-2 py-3 text-[10px] font-bold text-slate-400 transition hover:border-sky-300 hover:text-sky-600 dark:border-slate-700">+ Agregar</button>}</div></section>; })}</div>
      </section>
      <section><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Equilibrio de guardias</p><h2 className="mt-1 text-lg font-bold capitalize">{balancePeriod.title}</h2><p className="mt-1 text-xs text-slate-500">Las horas reales solo suman al marcar la guardia como realizada.</p></div><div className="flex flex-wrap items-center gap-2"><select value={balanceMode} onChange={(event) => setBalanceMode(event.target.value as 'fourWeeks' | 'week' | 'month')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><option value="fourWeeks">4 semanas</option><option value="week">Por semana</option><option value="month">Por mes</option></select><button onClick={() => setBalanceDate((current) => balanceMode === 'month' ? new Date(current.getFullYear(), current.getMonth() - 1, 1) : addDays(current, balanceMode === 'week' ? -7 : -28))} className="rounded-xl border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-300" aria-label="Periodo anterior"><ChevronLeft className="h-4 w-4" /></button><button onClick={() => setBalanceDate(new Date())} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Hoy</button><button onClick={() => setBalanceDate((current) => balanceMode === 'month' ? new Date(current.getFullYear(), current.getMonth() + 1, 1) : addDays(current, balanceMode === 'week' ? 7 : 28))} className="rounded-xl border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-300" aria-label="Periodo siguiente"><ChevronRight className="h-4 w-4" /></button></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{loading ? <p className="col-span-full rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Cargando guardias...</p> : balance.map((item) => <article key={item.founder.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white dark:bg-slate-100 dark:text-slate-900">{item.founder.displayName.slice(0, 2).toUpperCase()}</span><p className="truncate text-sm font-black">{item.founder.displayName}</p></div><div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-[10px] font-black uppercase text-slate-400">Planificado</p><p className="mt-1 text-lg font-black text-sky-700">{item.plannedHours.toFixed(1)} h</p><p className="text-[11px] text-slate-500">{item.plannedGuards} guardias</p></div><div><p className="text-[10px] font-black uppercase text-slate-400">Realizado</p><p className="mt-1 text-lg font-black text-emerald-700">{item.actualHours.toFixed(1)} h</p><p className="text-[11px] text-slate-500">{item.actualGuards} guardias</p></div></div></article>)}</div></section>
    </>}
    {editor !== undefined && <ShiftForm founders={founders} shift={editor || undefined} weeklyNote={weeklyNote} onClose={() => setEditor(undefined)} onSave={save} onDelete={remove} saving={saving} />}
    {preview && <CoverageShiftPreview shift={preview} weeklyNote={preview.hasWeeklyNote ? weeklyNotes.find((note) => note.weekStart === dateKey(monday(parseDate(preview.date)))) : undefined} nameFor={nameFor} onClose={() => setPreview(null)} />}
    </div>
  </>;
};
function CoveragePrintSheet({ month, shifts, nameFor }: { month: Date; shifts: CoverageShift[]; nameFor: (id?: string) => string }) {
  const issuedAt = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(new Date());
  const monthTitle = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(month);
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const calendarStart = monday(firstDay);
  const calendarEnd = addDays(lastDay, (7 - ((lastDay.getDay() + 6) % 7) - 1) % 7);
  const calendarDays = Array.from({ length: Math.round((calendarEnd.getTime() - calendarStart.getTime()) / 86400000) + 1 }, (_, index) => addDays(calendarStart, index));
  const weeks = Array.from({ length: calendarDays.length / 7 }, (_, index) => calendarDays.slice(index * 7, index * 7 + 7));
  const statusLabel = (status: CoverageShift['status']) => status === 'Completed' ? 'Realizada' : status === 'Rescheduled' ? 'Reprogramada' : 'Planificada';
  const PrintDay = ({ day }: { day: Date; key?: string }) => { const inMonth = day.getMonth() === month.getMonth(); const entries = inMonth ? shifts.filter((shift) => shift.date === dateKey(day)) : []; return <article className={`coverage-print-day${inMonth ? '' : ' is-outside'}`}><header><p>{dayName(day)}</p><strong>{dateLabel(day)}</strong></header><div className="coverage-print-day-content">{inMonth ? entries.length ? entries.map((shift) => <div key={shift.id} className="coverage-print-card"><p className="coverage-print-time">{shift.startTime} a {shift.endTime}</p><p className="coverage-print-person">{nameFor(shift.primaryId)}{shift.secondaryId ? ` + ${nameFor(shift.secondaryId)}` : ''}</p><p className="coverage-print-detail">{shift.place || 'Sin actividad registrada'}</p><span>{statusLabel(shift.status)}</span></div>) : <p className="coverage-print-empty">Sin guardias</p> : null}</div></article>; };
  const hasWeekend = shifts.some((shift) => { const date = parseDate(shift.date); return date.getDay() === 0 || date.getDay() === 6; });
  return <section className="coverage-print-sheet" aria-hidden="true"><header className="coverage-print-header"><div><p>CREAR | Espacio Terapeutico</p><h1>Planilla mensual de guardias CREAR</h1></div><div><strong>Mes: {monthTitle}</strong><span>Emitido el {issuedAt}</span></div></header><p className="coverage-print-intro">Responsables, actividades y horarios programados durante el mes.</p><div className="coverage-print-month">{weeks.map((weekDays, index) => <section key={dateKey(weekDays[0])} className="coverage-print-month-week"><p>Semana {index + 1}</p><div>{weekDays.slice(0, 5).map((day) => <PrintDay key={dateKey(day)} day={day} />)}</div></section>)}</div>{hasWeekend && <section className="coverage-print-weekend"><p>Fin de semana</p><div>{calendarDays.filter((day) => day.getMonth() === month.getMonth() && (day.getDay() === 0 || day.getDay() === 6)).map((day) => <PrintDay key={dateKey(day)} day={day} />)}</div></section>}<p className="coverage-print-footnote">Este documento resume la programacion operativa de CREAR para el mes indicado.</p></section>;
}
function CoverageFollowupPrintSheet({ month, shifts, nameFor }: { month: Date; shifts: CoverageShift[]; nameFor: (id?: string) => string }) {
  const issuedAt = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(new Date());
  const monthTitle = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(month);
  const realized = shifts.filter((shift) => shift.status === 'Completed').length;
  const notRealized = shifts.filter((shift) => shift.status === 'Cancelled' || shift.status === 'Rescheduled').length;
  const pending = shifts.length - realized - notRealized;
  const result = (status: CoverageShift['status']) => status === 'Completed' ? 'Si, realizada' : status === 'Cancelled' ? 'No realizada' : status === 'Rescheduled' ? 'No realizada o reprogramada' : 'Pendiente';
  const resultClass = (status: CoverageShift['status']) => status === 'Completed' ? 'is-realized' : status === 'Planned' ? 'is-pending' : 'is-not-realized';
  return <section className="coverage-followup-print-sheet" aria-hidden="true">
    <header className="coverage-followup-header"><div><p>CREAR | Espacio Terapeutico</p><h1>Informe de seguimiento de guardias CREAR</h1><span>Resultados y observaciones de las guardias registradas.</span></div><div><strong>{monthTitle}</strong><span>Emitido el {issuedAt}</span></div></header>
    <section className="coverage-followup-summary"><div><span>Total</span><strong>{shifts.length}</strong></div><div><span>Realizadas</span><strong className="is-realized">{realized}</strong></div><div><span>No realizadas</span><strong className="is-not-realized">{notRealized}</strong></div><div><span>Pendientes</span><strong className="is-pending">{pending}</strong></div></section>
    <table className="coverage-followup-table"><thead><tr><th>Responsable</th><th>Actividad</th><th>Se realizo</th><th>Observacion</th></tr></thead><tbody>{shifts.length ? shifts.map((shift) => <tr key={shift.id}><td>{nameFor(shift.primaryId)}{shift.secondaryId ? ' + ' + nameFor(shift.secondaryId) : ''}</td><td><strong>{shift.place || 'Sin actividad registrada'}</strong><small>{dateLabel(parseDate(shift.date))} - {shift.startTime} a {shift.endTime}</small></td><td className={resultClass(shift.status)}>{result(shift.status)}</td><td>{shift.notes || 'Sin observacion registrada.'}</td></tr>) : <tr><td colSpan={4} className="is-empty">No registra guardias en este mes.</td></tr>}</tbody></table>
    <p className="coverage-followup-footnote">El informe muestra la actividad, su responsable, el resultado registrado y las observaciones del mes seleccionado.</p>
  </section>;
}
