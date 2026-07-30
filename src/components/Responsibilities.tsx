import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  GripVertical,
  LoaderCircle,
  Plus,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  Undo2,
  UserRound,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { ActivityPeriod, ActivityRecord, ActivityStatus, FounderRecord } from '../types';
import { createPeriod, deletePeriod, loadActivitiesData, readCachedActivitiesData, saveActivity, updatePeriod } from '../lib/activitiesStore';

const CURRENT_USER = 'Admin CREAR';
const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

type Notice = { tone: 'success' | 'error'; message: string } | null;
type MoveRequest = { activity: ActivityRecord; responsibleId?: string; name: string };

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseCalendarDate = (value?: string) => {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (year && month && day) return new Date(year, month - 1, day);
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const toDateInput = (value?: string) => {
  const date = parseCalendarDate(value);
  return date ? dateKey(date) : '';
};

const formatActivityDate = (value?: string, includeYear = false) => {
  const date = parseCalendarDate(value);
  if (!date) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(date);
};

const isOverdue = (activity: ActivityRecord) => {
  const dueDate = parseCalendarDate(activity.dueDate);
  return activity.status !== 'Completada' && !!dueDate && dateKey(dueDate) < dateKey(new Date());
};

const activitySignal = (activity: ActivityRecord) => {
  if (activity.status === 'Completada') return { color: 'bg-emerald-500', label: 'Lista', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' };
  if (!activity.responsibleId) return { color: 'bg-slate-400', label: 'Sin responsable', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
  if (activity.status === 'Bloqueada') return { color: 'bg-rose-500', label: 'Bloqueada', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' };
  if (isOverdue(activity)) return { color: 'bg-rose-500', label: 'Vencida', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' };
  return { color: 'bg-amber-400', label: activity.status === 'En proceso' ? 'En proceso' : 'Pendiente', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' };
};

function ActivityForm({ activity, periodId, founders, onClose, onSave, saving }: {
  activity?: ActivityRecord;
  periodId: string;
  founders: FounderRecord[];
  onClose: () => void;
  onSave: (activity: Partial<ActivityRecord>) => Promise<void>;
  saving: boolean;
}) {
  const [title, setTitle] = useState(activity?.title || '');
  const [responsibleId, setResponsibleId] = useState(activity?.responsibleId || '');
  const [startDate, setStartDate] = useState(() => toDateInput(activity?.startDate) || dateKey(new Date()));
  const [dueDate, setDueDate] = useState(() => toDateInput(activity?.dueDate));
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError('Escribi la actividad.');
    if (!periodId) return setError('Primero crea o selecciona un periodo.');
    if (!startDate || !dueDate) return setError('Indica la fecha de inicio y la fecha limite.');
    if (dueDate < startDate) return setError('La fecha limite no puede ser anterior al inicio.');
    await onSave({
      ...activity,
      title: title.trim(),
      periodId,
      responsibleId: responsibleId || undefined,
      startDate,
      dueDate,
      points: activity?.points ?? 1,
      status: responsibleId ? (activity?.status === 'Completada' ? 'Completada' : 'Pendiente') : 'Sin asignar',
      active: true,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 sm:items-center sm:p-6">
      <form onSubmit={submit} className="w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Responsabilidades</p><h2 className="text-lg font-bold">{activity ? 'Editar actividad' : 'Nueva actividad'}</h2></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Actividad<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="Ej. Comprar matafuegos" /></label>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Responsable <span className="font-medium text-slate-400">(opcional)</span><select value={responsibleId} onChange={(event) => setResponsibleId(event.target.value)} className={inputClass}><option value="">Sin asignar</option>{founders.map((founder) => <option key={founder.id} value={founder.id}>{founder.displayName}</option>)}</select></label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Fecha de inicio<input type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} /></label><label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Fecha limite<input type="date" required min={startDate || undefined} value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputClass} /></label></div>
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">La fecha limite aparecera en el calendario y en el acta de compromiso.</p>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 p-5 dark:border-slate-800"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Guardar</button></div>
      </form>
    </div>
  );
}

function PeriodForm({ period, onClose, onSave, saving }: { period?: ActivityPeriod; onClose: () => void; onSave: (period: Partial<ActivityPeriod>) => Promise<void>; saving: boolean }) {
  const [name, setName] = useState(period?.name || '');
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError('Escribi un nombre para el periodo.');
    await onSave({ ...period, name: name.trim(), status: period?.status || 'Activo' });
  };
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4" role="dialog" aria-modal="true"><form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Organizacion</p><h2 className="text-lg font-bold">{period ? 'Editar periodo' : 'Nuevo periodo'}</h2></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400" aria-label="Cerrar"><X className="h-5 w-5" /></button></div><label className="mt-5 block text-xs font-bold text-slate-600 dark:text-slate-300">Nombre<input autoFocus value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Ej. Apertura del centro" /></label>{error && <p className="mt-3 text-xs font-medium text-rose-600">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancelar</button><button disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900">{saving ? 'Guardando...' : period ? 'Guardar cambios' : 'Crear periodo'}</button></div></form></div>;
}

function ResponsibilitiesCalendar({ activities, activePeriod, founderById, onClose, onOpenActivity }: {
  activities: ActivityRecord[];
  activePeriod?: ActivityPeriod;
  founderById: Map<string, FounderRecord>;
  onClose: () => void;
  onOpenActivity: (id: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const dated = activities.filter((activity) => activity.active && activity.dueDate).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    return parseCalendarDate(dated.find((activity) => !isOverdue(activity))?.dueDate || dated[0]?.dueDate) || new Date();
  });
  const dueByDate = useMemo(() => {
    const result = new Map<string, ActivityRecord[]>();
    activities.filter((activity) => activity.active && activity.dueDate).forEach((activity) => {
      const key = toDateInput(activity.dueDate);
      if (key) result.set(key, [...(result.get(key) || []), activity]);
    });
    return result;
  }, [activities]);
  const upcoming = useMemo(() => activities.filter((activity) => activity.active && activity.dueDate && activity.status !== 'Completada').sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).slice(0, 7), [activities]);
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - firstDay.getDay());
  const days = Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
  const monthName = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(firstDay);
  const changeMonth = (amount: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));

  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-5" role="dialog" aria-modal="true"><section className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"><header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Planificacion</p><h2 className="mt-1 text-xl font-bold">Calendario de responsabilidades</h2><p className="mt-1 text-sm text-slate-500">{activePeriod?.name || 'Periodo actual'} · cada tarjeta marca su fecha limite.</p></div><button onClick={onClose} className="rounded-xl p-2 text-slate-400" aria-label="Cerrar calendario"><X className="h-5 w-5" /></button></header>
    <div className="custom-scrollbar grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div><div className="mb-4 flex items-center justify-between"><button onClick={() => changeMonth(-1)} className="rounded-xl border border-slate-200 p-2 text-slate-600 dark:border-slate-700" aria-label="Mes anterior"><ChevronLeft className="h-5 w-5" /></button><p className="capitalize text-base font-bold">{monthName}</p><button onClick={() => changeMonth(1)} className="rounded-xl border border-slate-200 p-2 text-slate-600 dark:border-slate-700" aria-label="Mes siguiente"><ChevronRight className="h-5 w-5" /></button></div>
        <div className="grid grid-cols-7 border-b border-slate-200 text-center text-[10px] font-black uppercase text-slate-400 dark:border-slate-800">{['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day) => <span key={day} className="pb-2">{day}</span>)}</div>
        <div className="grid grid-cols-7 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          {days.map((day) => {
            const key = dateKey(day);
            const items = dueByDate.get(key) || [];
            const inMonth = day.getMonth() === month.getMonth();
            const today = key === dateKey(new Date());
            return <div key={key} className={cn('min-h-28 border-b border-r border-slate-100 p-1.5 dark:border-slate-800 sm:min-h-32 sm:p-2', !inMonth && 'bg-slate-50 text-slate-300 dark:bg-slate-950', today && 'bg-sky-50 dark:bg-sky-950/20')}><span className={cn('inline-flex h-6 min-w-6 items-center justify-center rounded-full text-[11px] font-bold', today && 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900')}>{day.getDate()}</span><div className="mt-1 space-y-1">{items.slice(0, 2).map((activity) => <button key={activity.id} onClick={() => onOpenActivity(activity.id)} className={cn('block w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-bold', activity.status === 'Completada' ? 'bg-emerald-100 text-emerald-700' : isOverdue(activity) ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800')} title={activity.title}>{activity.title}</button>)}{items.length > 2 && <span className="block px-1 text-[10px] font-bold text-slate-400">+{items.length - 2} mas</span>}</div></div>;
          })}
        </div>
      </div>
      <aside className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/40"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-sky-600" /><h3 className="text-sm font-bold">Proximas fechas limite</h3></div><div className="mt-3 space-y-2">{upcoming.map((activity) => <button key={activity.id} onClick={() => onOpenActivity(activity.id)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left dark:border-slate-800 dark:bg-slate-900"><p className="line-clamp-2 text-xs font-bold text-slate-700 dark:text-slate-200">{activity.title}</p><div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-bold"><span className={isOverdue(activity) ? 'text-rose-600' : 'text-sky-700'}>{isOverdue(activity) ? 'Vencida' : formatActivityDate(activity.dueDate, true)}</span><span className="truncate text-slate-400">{founderById.get(activity.responsibleId || '')?.displayName || 'Sin asignar'}</span></div></button>)}{!upcoming.length && <p className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-400">No hay actividades pendientes con fecha limite.</p>}</div><div className="mt-5 flex gap-3 text-[10px] font-bold text-slate-500"><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-400" /> Pendiente</span><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" /> Lista</span></div></aside>
    </div>
  </section></div>;
}

export const Responsibilities = () => {
  const [founders, setFounders] = useState<FounderRecord[]>([]);
  const [periods, setPeriods] = useState<ActivityPeriod[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [periodId, setPeriodId] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ActivityRecord | null | undefined>(undefined);
  const [periodEditor, setPeriodEditor] = useState<ActivityPeriod | null | undefined>(undefined);
  const [periodToDelete, setPeriodToDelete] = useState<ActivityPeriod | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [moveRequest, setMoveRequest] = useState<MoveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [error, setError] = useState('');

  const applyData = (data: Awaited<ReturnType<typeof loadActivitiesData>>) => {
    setFounders(data.founders.filter((founder) => founder.active).sort((a, b) => a.order - b.order));
    setPeriods(data.periods);
    setActivities(data.activities);
    setPeriodId((current) => current || data.periods.find((period) => period.status === 'Activo')?.id || data.periods[0]?.id || '');
  };
  const reload = async () => {
    const cached = readCachedActivitiesData();
    setError('');
    if (cached) { applyData(cached); setLoading(false); } else setLoading(true);
    try { applyData(await loadActivitiesData()); } catch (cause) { if (!cached) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el tablero.'); } finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, []);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(null), 3200); return () => window.clearTimeout(timer); }, [notice]);

  const founderById = useMemo(() => new Map(founders.map((founder) => [founder.id, founder] as [string, FounderRecord])), [founders]);
  const selected = activities.find((activity) => activity.id === selectedId) || null;
  const activePeriod = periods.find((period) => period.id === periodId);
  const visibleActivities = useMemo(() => activities.filter((activity) => {
    if (!activity.active || (periodId && activity.periodId !== periodId)) return false;
    return `${activity.title} ${founderById.get(activity.responsibleId || '')?.displayName || ''}`.toLocaleLowerCase('es-AR').includes(search.trim().toLocaleLowerCase('es-AR'));
  }), [activities, founderById, periodId, search]);
  const printableActivities = useMemo(() => activities.filter((activity) => activity.active && (!periodId || activity.periodId === periodId)), [activities, periodId]);

  const save = async (draft: Partial<ActivityRecord>, reason?: string) => {
    const previous = draft.id ? activities.find((activity) => activity.id === draft.id) : undefined;
    const optimistic = previous ? { ...previous, ...draft, id: previous.id } as ActivityRecord : undefined;
    setSaving(true);
    if (optimistic) {
      setActivities((current) => current.map((activity) => activity.id === optimistic.id ? optimistic : activity));
      setEditing(undefined); setSelectedId(optimistic.id);
    }
    try {
      const saved = await saveActivity(draft, CURRENT_USER, reason);
      setActivities((current) => current.some((activity) => activity.id === saved.id) ? current.map((activity) => activity.id === saved.id ? saved : activity) : [...current, saved]);
      setEditing(undefined); setSelectedId(saved.id);
      setNotice({ tone: 'success', message: saved.status === 'Completada' ? 'Actividad lista y marcada en verde.' : 'Actividad guardada.' });
    } catch (cause) {
      if (previous) setActivities((current) => current.map((activity) => activity.id === previous.id ? previous : activity));
      setNotice({ tone: 'error', message: cause instanceof Error ? cause.message : 'No se pudo guardar la actividad. Se revirtió el cambio.' });
    } finally { setSaving(false); }
  };
  const savePeriod = async (period: Partial<ActivityPeriod>) => {
    setSaving(true);
    try {
      const saved = period.id ? await updatePeriod(period, CURRENT_USER) : await createPeriod(period, CURRENT_USER);
      setPeriods((current) => period.id ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setPeriodId(saved.id); setPeriodEditor(undefined);
      setNotice({ tone: 'success', message: period.id ? 'Nombre del periodo actualizado.' : 'Periodo creado.' });
    } catch (cause) { setNotice({ tone: 'error', message: cause instanceof Error ? cause.message : 'No se pudo guardar el periodo.' }); } finally { setSaving(false); }
  };
  const removePeriod = async () => {
    if (!periodToDelete) return;
    setSaving(true);
    try {
      await deletePeriod(periodToDelete.id, CURRENT_USER);
      const remaining = periods.filter((period) => period.id !== periodToDelete.id);
      setPeriods(remaining); setPeriodId((current) => current === periodToDelete.id ? remaining.find((period) => period.status === 'Activo')?.id || remaining[0]?.id || '' : current);
      setPeriodToDelete(null); setNotice({ tone: 'success', message: 'Periodo eliminado.' });
    } catch (cause) { setNotice({ tone: 'error', message: cause instanceof Error ? cause.message : 'No se pudo eliminar el periodo.' }); } finally { setSaving(false); }
  };
  const toggleActivityCompletion = async (activity: ActivityRecord) => {
    if (activity.status === 'Completada') {
      await save({ ...activity, status: activity.responsibleId ? 'Pendiente' : 'Sin asignar', progress: 0 }, 'Se quito la marca de completada');
      return;
    }
    await save({ ...activity, status: 'Completada', progress: 100, finishedAt: dateKey(new Date()), evidence: activity.evidence || 'Confirmada como realizada desde el tablero.' }, 'Marcada como completada');
  };
  const drop = (responsibleId?: string) => {
    if (!draggedId) return;
    const activity = activities.find((item) => item.id === draggedId);
    setDraggedId(null);
    if (!activity || (activity.responsibleId || '') === (responsibleId || '')) return;
    setMoveRequest({ activity, responsibleId, name: responsibleId ? founderById.get(responsibleId)?.displayName || 'la fundadora seleccionada' : 'Sin asignar' });
  };
  const confirmMove = async () => {
    if (!moveRequest) return;
    const status: ActivityStatus = moveRequest.responsibleId ? (moveRequest.activity.status === 'Completada' ? 'Completada' : 'Pendiente') : 'Sin asignar';
    const previous = moveRequest.activity;
    const optimistic = { ...previous, responsibleId: moveRequest.responsibleId, status, progress: status === 'Completada' ? 100 : previous.progress };
    setSaving(true);
    setActivities((current) => current.map((activity) => activity.id === optimistic.id ? optimistic : activity));
    setMoveRequest(null);
    try { const saved = await saveActivity(optimistic, CURRENT_USER, 'Cambio de responsable'); setActivities((current) => current.map((activity) => activity.id === saved.id ? saved : activity)); setNotice({ tone: 'success', message: 'Responsable actualizada.' }); } catch (cause) { setActivities((current) => current.map((activity) => activity.id === previous.id ? previous : activity)); setNotice({ tone: 'error', message: cause instanceof Error ? cause.message : 'No se pudo asignar la actividad. Se revirtió el cambio.' }); } finally { setSaving(false); }
  };
  const printedDate = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(new Date());

  return <div className="space-y-5">
    <section id="responsibilities-commitment-print" className="responsibilities-commitment-print-sheet" aria-hidden="true">
      {founders.map((founder) => {
        const founderActivities = printableActivities.filter((activity) => activity.responsibleId === founder.id);
        return <article key={founder.id} className="responsibilities-commitment-document"><header className="responsibilities-commitment-header"><div><p>CREAR · Espacio Terapeutico</p><h1>Acta de compromiso de responsabilidades</h1></div><div><strong>{activePeriod?.name || 'Periodo actual'}</strong><span>Emitido el {printedDate}</span></div></header><section className="responsibilities-commitment-summary"><div><span>Responsable</span><strong>{founder.displayName}</strong></div><div><span>Actividades asignadas</span><strong>{founderActivities.length}</strong></div><div><span>Periodo</span><strong>{activePeriod?.name || 'Actual'}</strong></div></section><p className="responsibilities-commitment-text">Declaro haber recibido las actividades detalladas a continuacion y me comprometo a realizarlas dentro de los plazos acordados, informando con anticipacion cualquier impedimento o demora.</p><table className="responsibilities-commitment-table"><thead><tr><th>Actividad</th><th>Inicio</th><th>Fecha limite</th><th>Estado</th></tr></thead><tbody>{founderActivities.length ? founderActivities.map((activity) => <tr key={activity.id}><td>{activity.title}</td><td>{formatActivityDate(activity.startDate, true)}</td><td>{formatActivityDate(activity.dueDate, true)}</td><td className={activity.status === 'Completada' ? 'is-complete' : ''}>{activity.status === 'Completada' ? 'Lista' : 'Pendiente'}</td></tr>) : <tr><td colSpan={4} className="is-empty">No registra actividades asignadas en este periodo.</td></tr>}</tbody></table><p className="responsibilities-commitment-footnote">Esta acta deja constancia interna de la asignacion y el compromiso asumido por la persona responsable.</p><footer className="responsibilities-commitment-signatures"><div><span>Firma y aclaracion</span></div><div><span>DNI</span></div><div><span>Fecha</span></div></footer></article>;
      })}
    </section>

    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-slate-400">Planificacion operativa</p><button onClick={() => setShowCalendar(true)} className="group mt-1 inline-flex items-center gap-2 rounded-lg text-left" title="Abrir calendario de actividades"><h1 className="text-2xl font-bold text-slate-900 transition group-hover:text-sky-700 dark:text-slate-100 md:text-3xl">Responsabilidades</h1><CalendarDays className="h-5 w-5 text-sky-600" /></button><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Organiza, asigna y completa las tareas. Toca el titulo para ver las fechas.</p></div><div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"><button onClick={() => setShowCalendar(true)} disabled={!periodId} className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700 disabled:opacity-50"><CalendarDays className="h-4 w-4" /> Calendario</button><button onClick={() => window.print()} disabled={!periodId} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><Printer className="h-4 w-4" /> Imprimir actas</button><button onClick={() => setPeriodEditor(null)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><CalendarDays className="h-4 w-4" /> Nuevo periodo</button><button onClick={() => setEditing(null)} disabled={!periodId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"><Plus className="h-4 w-4" /> Nueva actividad</button></div></header>

    {notice && <div className={cn('flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium', notice.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')}><CircleAlert className="h-4 w-4" />{notice.message}</div>}
    {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700"><div className="flex gap-3"><AlertCircle className="h-5 w-5 shrink-0" /><div><p className="font-bold">No se pudo abrir Responsabilidades</p><p className="mt-1">{error}</p><button onClick={() => void reload()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold"><RefreshCw className="h-3.5 w-3.5" /> Reintentar</button></div></div></div>}
    {!error && <><div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none dark:bg-slate-800" placeholder="Buscar actividad" /></div><div className="flex gap-2"><select value={periodId} onChange={(event) => setPeriodId(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</select><button onClick={() => activePeriod && setPeriodEditor(activePeriod)} disabled={!activePeriod} className="rounded-xl border border-slate-200 px-3 text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300" title="Editar nombre del periodo"><Pencil className="h-4 w-4" /></button><button onClick={() => activePeriod && setPeriodToDelete(activePeriod)} disabled={!activePeriod} className="rounded-xl border border-rose-200 px-3 text-rose-600 disabled:opacity-40" title="Eliminar periodo"><Trash2 className="h-4 w-4" /></button></div></div>
      {!loading && founders.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"><UserRound className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 font-bold">Faltan las fundadoras</h2><p className="mt-1 text-sm text-slate-500">Cargalas en la hoja FUNDADORAS para crear sus columnas.</p></div>}
      {!loading && founders.length > 0 && !periodId && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"><CalendarDays className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 font-bold">Crea el primer periodo</h2><button onClick={() => setPeriodEditor(null)} className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Crear periodo</button></div>}
      {loading ? <div className="flex min-h-72 items-center justify-center rounded-3xl bg-white dark:bg-slate-900"><LoaderCircle className="h-6 w-6 animate-spin text-slate-400" /></div> : founders.length > 0 && periodId && <section className="pb-3"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[{ id: '', name: 'Sin asignar' }, ...founders.map((founder) => ({ id: founder.id, name: founder.displayName }))].map((column) => {
          const cards = visibleActivities.filter((activity) => (activity.responsibleId || '') === column.id).sort((a, b) => Number(a.status === 'Completada') - Number(b.status === 'Completada') || (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'));
          const completed = cards.filter((activity) => activity.status === 'Completada').length;
          return <section key={column.id || 'unassigned'} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(column.id || undefined)} className="flex min-h-[17rem] flex-col rounded-2xl border border-slate-200 bg-slate-100/70 p-3 dark:border-slate-800 dark:bg-slate-950/40"><header className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 px-1 pb-3 dark:border-slate-800"><div className="min-w-0"><h2 className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{column.name}</h2>{completed > 0 && <p className="mt-0.5 text-[10px] font-bold text-emerald-600">{completed} lista{completed === 1 ? '' : 's'}</p>}</div><span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-slate-500 dark:bg-slate-800">{cards.length}</span></header><div className="min-h-28 space-y-2">
            {cards.map((activity) => {
              const signal = activitySignal(activity);
              const complete = activity.status === 'Completada';
              return <article key={activity.id} draggable onDragStart={() => setDraggedId(activity.id)} className={cn('group rounded-xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md', complete ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20' : isOverdue(activity) ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900')}>
                <div className="flex items-start gap-2"><GripVertical className="mt-1 h-4 w-4 shrink-0 cursor-grab text-slate-300 opacity-0 transition group-hover:opacity-100" /><button onClick={() => setSelectedId(activity.id)} className="min-w-0 flex-1 text-left"><p className={cn('mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide', signal.badge)}><span className={cn('h-1.5 w-1.5 rounded-full', signal.color)} />{signal.label}</p><h3 className={cn('line-clamp-2 text-sm font-bold leading-5 text-slate-800 dark:text-slate-100', complete && 'text-emerald-800 line-through decoration-emerald-400 dark:text-emerald-200')}>{activity.title}</h3></button><button onClick={() => void toggleActivityCompletion(activity)} disabled={saving} title={complete ? 'Quitar marca de lista' : 'Marcar como lista'} className={cn('mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition', complete ? 'border-emerald-300 bg-emerald-500 text-white hover:bg-emerald-600' : 'border-slate-200 text-slate-400 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600')}>{complete ? <Undo2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</button></div>
                <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px] font-bold"><span className="inline-flex min-w-0 items-center gap-1 rounded-lg bg-white/70 px-2 py-1.5 text-slate-500 dark:bg-slate-900/40"><CalendarDays className="h-3 w-3 shrink-0" /><span className="truncate">Inicio {formatActivityDate(activity.startDate)}</span></span><span className={cn('inline-flex min-w-0 items-center gap-1 rounded-lg px-2 py-1.5', complete ? 'bg-emerald-100 text-emerald-700' : isOverdue(activity) ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}><CalendarDays className="h-3 w-3 shrink-0" /><span className="truncate">Limite {formatActivityDate(activity.dueDate)}</span></span></div>
              </article>;
            })}
            {!cards.length && <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 text-center text-xs text-slate-400 dark:border-slate-700">Suelta aqui una actividad</div>}
          </div></section>;
        })}
      </div></section>}</>}
      {editing !== undefined && <ActivityForm activity={editing || undefined} periodId={periodId} founders={founders} onClose={() => setEditing(undefined)} onSave={save} saving={saving} />}
      {periodEditor !== undefined && <PeriodForm period={periodEditor || undefined} onClose={() => setPeriodEditor(undefined)} onSave={savePeriod} saving={saving} />}
      {periodToDelete && <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40"><Trash2 className="h-5 w-5" /></div><p className="mt-4 text-[10px] font-black uppercase tracking-[.18em] text-rose-500">Confirmacion requerida</p><h2 className="mt-1 text-lg font-bold">Eliminar este periodo?</h2><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Vas a eliminar <strong>{periodToDelete.name}</strong>. Esta accion no se puede deshacer. Por seguridad, solo se permite borrar periodos sin actividades.</p><div className="mt-6 flex justify-end gap-3"><button onClick={() => setPeriodToDelete(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancelar</button><button onClick={() => void removePeriod()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Trash2 className="h-4 w-4" /> {saving ? 'Eliminando...' : 'Si, eliminar'}</button></div></div></div>}
      {showCalendar && <ResponsibilitiesCalendar activities={printableActivities} activePeriod={activePeriod} founderById={founderById} onClose={() => setShowCalendar(false)} onOpenActivity={(id) => { setShowCalendar(false); setSelectedId(id); }} />}
      {moveRequest && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Asignacion</p><h2 className="mt-1 text-lg font-bold">Confirmar responsable</h2><p className="mt-3 text-sm text-slate-600 dark:text-slate-300"><strong>{moveRequest.activity.title}</strong><br />Se movera a {moveRequest.name}.</p><div className="mt-6 flex justify-end gap-3"><button onClick={() => setMoveRequest(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancelar</button><button onClick={() => void confirmMove()} disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">{saving ? 'Guardando...' : 'Confirmar'}</button></div></div></div>}
      {selected && <><button aria-label="Cerrar detalle" onClick={() => setSelectedId(null)} className="fixed inset-0 z-[59] bg-slate-950/20" /><aside className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900"><div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800"><div><div className="flex items-center gap-2"><span className={cn('h-2.5 w-2.5 rounded-full', activitySignal(selected).color)} /><p className="text-xs font-bold text-slate-500">{activitySignal(selected).label}</p></div><h2 className={cn('mt-2 text-xl font-bold', selected.status === 'Completada' && 'text-emerald-700')}>{selected.title}</h2></div><button onClick={() => setSelectedId(null)} className="rounded-xl p-2 text-slate-400" aria-label="Cerrar"><X className="h-5 w-5" /></button></div><div className="flex-1 space-y-6 p-5"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Responsable</p><p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{selected.responsibleId ? founderById.get(selected.responsibleId)?.displayName || 'No disponible' : 'Sin asignar'}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Plazos acordados</p><dl className="mt-3 grid grid-cols-2 gap-3"><div><dt className="text-xs font-medium text-slate-500">Inicio</dt><dd className="mt-1 text-sm font-bold">{formatActivityDate(selected.startDate, true)}</dd></div><div><dt className="text-xs font-medium text-slate-500">Fecha limite</dt><dd className={cn('mt-1 text-sm font-bold', isOverdue(selected) ? 'text-rose-600' : selected.status === 'Completada' ? 'text-emerald-600' : '')}>{formatActivityDate(selected.dueDate, true)}</dd></div></dl></div>{selected.status === 'Completada' && <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0" /><p><strong>Actividad lista.</strong><br />Quedo registrada como completada{selected.finishedAt ? ` el ${formatActivityDate(selected.finishedAt, true)}` : ''}.</p></div>}</div><div className="flex gap-3 border-t border-slate-100 p-5 dark:border-slate-800"><button onClick={() => setEditing(selected)} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">Editar</button><button onClick={() => void toggleActivityCompletion(selected)} disabled={saving} className={cn('inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-50', selected.status === 'Completada' ? 'border-amber-200 text-amber-700' : 'border-emerald-200 text-emerald-700')}>{selected.status === 'Completada' ? <><Undo2 className="h-4 w-4" /> Quitar listo</> : <><CheckCircle2 className="h-4 w-4" /> Completar</>}</button></div></aside></>}
    </div>;
};
