import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  GripVertical,
  LoaderCircle,
  Plus,
  Printer,
  RefreshCw,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { ActivityPeriod, ActivityRecord, ActivityStatus, FounderRecord } from '../types';
import { createPeriod, loadActivitiesData, readCachedActivitiesData, saveActivity } from '../lib/activitiesStore';

const CURRENT_USER = 'Admin CREAR';
const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

type Notice = { tone: 'success' | 'error'; message: string } | null;
type MoveRequest = { activity: ActivityRecord; responsibleId?: string; name: string };

const activitySignal = (activity: ActivityRecord) => {
  if (activity.status === 'Completada') return { color: 'bg-emerald-500', label: 'Completada', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' };
  if (!activity.responsibleId) return { color: 'bg-slate-400', label: 'Sin responsable', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
  if (activity.status === 'Bloqueada') return { color: 'bg-rose-500', label: 'Bloqueada', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' };
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
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError('Escribí la actividad.');
    if (!periodId) return setError('Primero creá o seleccioná un período.');
    await onSave({
      ...activity,
      title: title.trim(),
      periodId,
      responsibleId: responsibleId || undefined,
      status: responsibleId ? (activity?.status === 'Completada' ? 'Completada' : 'Pendiente') : 'Sin asignar',
      active: true,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-lg rounded-t-3xl bg-white shadow-2xl dark:bg-[#0f172a] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Responsabilidades</p>
            <h2 className="text-lg font-bold">{activity ? 'Editar actividad' : 'Nueva actividad'}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            Actividad
            <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} placeholder="Ej. Comprar matafuegos" />
          </label>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            Responsable <span className="font-medium text-slate-400">(opcional)</span>
            <select value={responsibleId} onChange={(event) => setResponsibleId(event.target.value)} className={inputClass}>
              <option value="">Sin asignar</option>
              {founders.map((founder) => <option key={founder.id} value={founder.id}>{founder.displayName}</option>)}
            </select>
          </label>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 p-5 dark:border-slate-800">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

function PeriodForm({ onClose, onSave, saving }: { onClose: () => void; onSave: (period: Partial<ActivityPeriod>) => Promise<void>; saving: boolean }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError('Escribí un nombre para el período.');
    await onSave({ name: name.trim(), status: 'Activo' });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f172a]">
        <div className="flex items-center justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Organización</p><h2 className="text-lg font-bold">Nuevo período</h2></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>
        <label className="mt-5 block text-xs font-bold text-slate-600 dark:text-slate-300">
          Nombre
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Ej. Apertura del centro" />
        </label>
        {error && <p className="mt-3 text-xs font-medium text-rose-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
          <button disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">{saving ? 'Guardando...' : 'Crear período'}</button>
        </div>
      </form>
    </div>
  );
}

export const Responsibilities = () => {
  const [founders, setFounders] = useState<FounderRecord[]>([]);
  const [periods, setPeriods] = useState<ActivityPeriod[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [periodId, setPeriodId] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ActivityRecord | null | undefined>(undefined);
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [moveRequest, setMoveRequest] = useState<MoveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [error, setError] = useState('');

  const applyData = (data: Awaited<ReturnType<typeof loadActivitiesData>>) => {
    const activeFounders = data.founders.filter((founder) => founder.active).sort((a, b) => a.order - b.order);
    setFounders(activeFounders);
    setPeriods(data.periods);
    setActivities(data.activities);
    setPeriodId((current) => current || data.periods.find((period) => period.status === 'Activo')?.id || data.periods[0]?.id || '');
  };

  const reload = async () => {
    const cached = readCachedActivitiesData();
    setError('');
    if (cached) {
      applyData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      applyData(await loadActivitiesData());
    } catch (cause) {
      if (!cached) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el tablero.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const founderById = useMemo(() => new Map(founders.map((founder) => [founder.id, founder] as [string, FounderRecord])), [founders]);
  const selected = activities.find((activity) => activity.id === selectedId) || null;
  const activePeriod = periods.find((period) => period.id === periodId);
  const visibleActivities = useMemo(() => activities.filter((activity) => {
    if (!activity.active || (periodId && activity.periodId !== periodId)) return false;
    const searchable = `${activity.title} ${founderById.get(activity.responsibleId || '')?.displayName || ''}`.toLocaleLowerCase('es-AR');
    return searchable.includes(search.trim().toLocaleLowerCase('es-AR'));
  }), [activities, founderById, periodId, search]);
  const printableActivities = useMemo(() => activities.filter((activity) => activity.active && (!periodId || activity.periodId === periodId)), [activities, periodId]);

  const save = async (draft: Partial<ActivityRecord>, reason?: string) => {
    setSaving(true);
    try {
      const saved = await saveActivity(draft, CURRENT_USER, reason);
      setActivities((current) => current.some((activity) => activity.id === saved.id)
        ? current.map((activity) => activity.id === saved.id ? saved : activity)
        : [...current, saved]);
      setEditing(undefined);
      setSelectedId(saved.id);
      setNotice({ tone: 'success', message: saved.status === 'Completada' ? 'Actividad marcada como completada.' : 'Actividad guardada.' });
    } catch (cause) {
      setNotice({ tone: 'error', message: cause instanceof Error ? cause.message : 'No se pudo guardar la actividad.' });
    } finally {
      setSaving(false);
    }
  };

  const savePeriod = async (period: Partial<ActivityPeriod>) => {
    setSaving(true);
    try {
      const saved = await createPeriod(period, CURRENT_USER);
      setPeriods((current) => [...current, saved]);
      setPeriodId(saved.id);
      setShowPeriodForm(false);
      setNotice({ tone: 'success', message: 'Período creado.' });
    } catch (cause) {
      setNotice({ tone: 'error', message: cause instanceof Error ? cause.message : 'No se pudo crear el período.' });
    } finally {
      setSaving(false);
    }
  };

  const completeActivity = async (activity: ActivityRecord) => {
    if (activity.status === 'Completada') return;
    await save({ ...activity, status: 'Completada', progress: 100 }, 'Marcada como completada');
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
    setSaving(true);
    try {
      const saved = await saveActivity({ ...moveRequest.activity, responsibleId: moveRequest.responsibleId, status }, CURRENT_USER, 'Cambio de responsable');
      setActivities((current) => current.map((activity) => activity.id === saved.id ? saved : activity));
      setMoveRequest(null);
      setNotice({ tone: 'success', message: 'Responsable actualizada.' });
    } catch (cause) {
      setNotice({ tone: 'error', message: cause instanceof Error ? cause.message : 'No se pudo asignar la actividad.' });
    } finally {
      setSaving(false);
    }
  };

  const printResponsibilities = () => window.print();
  const printedDate = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' }).format(new Date());

  return (
    <div className="space-y-5">
      <section id="responsibilities-print" className="responsibilities-print-sheet" aria-hidden="true">
        <header className="responsibilities-print-header">
          <div><p>CREAR · Espacio Terapéutico</p><h1>Responsabilidades por fundadora</h1></div>
          <div><strong>{activePeriod?.name || 'Período actual'}</strong><span>Emitido el {printedDate}</span></div>
        </header>
        <div className="responsibilities-print-grid">
          {founders.map((founder, index) => {
            const founderActivities = printableActivities.filter((activity) => activity.responsibleId === founder.id);
            return <article key={founder.id} className="responsibilities-print-column">
              <div className="responsibilities-print-founder"><span>{String(index + 1).padStart(2, '0')}</span><h2>{founder.displayName}</h2></div>
              {founderActivities.length ? <ul>{founderActivities.map((activity) => <li key={activity.id}><span className={activity.status === 'Completada' ? 'is-complete' : ''}>{activity.status === 'Completada' ? '✓' : '○'}</span><p>{activity.title}<small>{activity.status === 'Completada' ? 'Completada' : 'Pendiente'}</small></p></li>)}</ul> : <p className="responsibilities-print-empty">Sin actividades asignadas.</p>}
            </article>;
          })}
        </div>
        {printableActivities.some((activity) => !activity.responsibleId) && <section className="responsibilities-print-unassigned"><strong>Sin asignar</strong>{printableActivities.filter((activity) => !activity.responsibleId).map((activity) => <span key={activity.id}>{activity.title}</span>)}</section>}
      </section>

      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Planificación operativa</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">Responsabilidades</h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Organizá, asigná y completá las tareas del equipo en un solo tablero.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={printResponsibilities} disabled={!periodId} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><Printer className="h-4 w-4" /> Imprimir</button>
          <button onClick={() => setShowPeriodForm(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><CalendarDays className="h-4 w-4" /> Nuevo período</button>
          <button onClick={() => setEditing(null)} disabled={!periodId} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"><Plus className="h-4 w-4" /> Nueva actividad</button>
        </div>
      </header>

      {notice && <div className={cn('flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium', notice.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300')}><CircleAlert className="h-4 w-4" />{notice.message}</div>}

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700"><div className="flex gap-3"><AlertCircle className="h-5 w-5 shrink-0" /><div><p className="font-bold">No se pudo abrir Responsabilidades</p><p className="mt-1">{error}</p><button onClick={() => void reload()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold"><RefreshCw className="h-3.5 w-3.5" /> Reintentar</button></div></div></div>}

      {!error && <>
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-[#0f172a] sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none ring-0 dark:bg-slate-800" placeholder="Buscar actividad" /></div>
          <select value={periodId} onChange={(event) => setPeriodId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</select>
        </div>

        {!loading && founders.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-[#0f172a]"><UserRound className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 font-bold">Faltan las fundadoras</h2><p className="mt-1 text-sm text-slate-500">Cargalas en la hoja FUNDADORAS para crear sus columnas.</p></div>}
        {!loading && founders.length > 0 && !periodId && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-[#0f172a]"><CalendarDays className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 font-bold">Creá el primer período</h2><button onClick={() => setShowPeriodForm(true)} className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900">Crear período</button></div>}
        {loading ? <div className="flex min-h-72 items-center justify-center rounded-3xl bg-white dark:bg-[#0f172a]"><LoaderCircle className="h-6 w-6 animate-spin text-slate-400" /></div> : founders.length > 0 && periodId && <section className="overflow-x-auto pb-3 custom-scrollbar"><div className="grid min-w-[64rem] grid-cols-5 gap-3 xl:min-w-0">
          {[{ id: '', name: 'Sin asignar' }, ...founders.map((founder) => ({ id: founder.id, name: founder.displayName }))].map((column) => {
            const cards = visibleActivities.filter((activity) => (activity.responsibleId || '') === column.id).sort((first, second) => Number(first.status === 'Completada') - Number(second.status === 'Completada'));
            return <section key={column.id || 'unassigned'} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(column.id || undefined)} className="flex min-h-[17rem] flex-col rounded-2xl border border-slate-200 bg-slate-100/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <header className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200/80 px-1 pb-3 dark:border-slate-800"><h2 className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{column.name}</h2><span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">{cards.length}</span></header>
              <div className="min-h-28 space-y-2">{cards.map((activity) => {
                const signal = activitySignal(activity);
                return <article key={activity.id} draggable onDragStart={() => setDraggedId(activity.id)} className="group rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
                  <div className="flex items-start gap-2"><GripVertical className="mt-1 h-4 w-4 shrink-0 cursor-grab text-slate-300 opacity-0 transition group-hover:opacity-100" /><button onClick={() => setSelectedId(activity.id)} className="min-w-0 flex-1 text-left"><p className={cn('mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide', signal.badge)}><span className={cn('h-1.5 w-1.5 rounded-full', signal.color)} />{signal.label}</p><h3 className="line-clamp-2 text-sm font-bold leading-5 text-slate-800 dark:text-slate-100">{activity.title}</h3></button><button onClick={() => void completeActivity(activity)} disabled={saving || activity.status === 'Completada'} title={activity.status === 'Completada' ? 'Completada' : 'Marcar como completada'} className={cn('mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition', activity.status === 'Completada' ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40' : 'border-slate-200 text-slate-400 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/40')}><CheckCircle2 className="h-4 w-4" /></button></div>
                </article>;
              })}{!cards.length && <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 text-center text-xs text-slate-400 dark:border-slate-700">Soltá aquí una actividad</div>}</div>
            </section>;
          })}
        </div></section>}
      </>}

      {editing !== undefined && <ActivityForm activity={editing || undefined} periodId={periodId} founders={founders} onClose={() => setEditing(undefined)} onSave={save} saving={saving} />}
      {showPeriodForm && <PeriodForm onClose={() => setShowPeriodForm(false)} onSave={savePeriod} saving={saving} />}
      {moveRequest && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f172a]"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Asignación</p><h2 className="mt-1 text-lg font-bold">¿Confirmar responsable?</h2><p className="mt-3 text-sm text-slate-600 dark:text-slate-300"><strong>{moveRequest.activity.title}</strong><br />Se moverá a {moveRequest.name}.</p><div className="mt-6 flex justify-end gap-3"><button onClick={() => setMoveRequest(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancelar</button><button onClick={() => void confirmMove()} disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900">{saving ? 'Guardando...' : 'Confirmar'}</button></div></div></div>}
      {selected && <><button aria-label="Cerrar detalle" onClick={() => setSelectedId(null)} className="fixed inset-0 z-[59] bg-slate-950/20" /><aside className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-[#0f172a]"><div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800"><div><div className="flex items-center gap-2"><span className={cn('h-2.5 w-2.5 rounded-full', activitySignal(selected).color)} /><p className="text-xs font-bold text-slate-500">{activitySignal(selected).label}</p></div><h2 className="mt-2 text-xl font-bold">{selected.title}</h2></div><button onClick={() => setSelectedId(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar"><X className="h-5 w-5" /></button></div><div className="flex-1 p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Responsable</p><p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{selected.responsibleId ? founderById.get(selected.responsibleId)?.displayName || 'No disponible' : 'Sin asignar'}</p></div><div className="flex gap-3 border-t border-slate-100 p-5 dark:border-slate-800"><button onClick={() => setEditing(selected)} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900">Editar</button>{selected.status !== 'Completada' && <button onClick={() => void completeActivity(selected)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Completar</button>}</div></aside></>}
    </div>
  );
};