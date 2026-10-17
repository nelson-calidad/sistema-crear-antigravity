import { localDate, moneyFormat, useRecords } from '../lib/crearStore';
import { PROFESSIONALS, ROOMS } from '../constants';
export function HomeReal({ onNewInquiry, onAgenda }: { onNewInquiry: () => void; onAgenda: () => void }) {
  const inquiries = useRecords('inquiries'), interviews = useRecords('interviews'), rentals = useRecords('rentals'), agreements = useRecords('agreements'), money = useRecords('money');
  const today = localDate(), month = today.slice(0, 7);
  const previousDay = (date: string) => { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() - 1); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; };
  const pending = inquiries.rows.filter(x => !x.archived && x.status.includes('Pendiente'));
  const due = interviews.rows.filter(x => (x.reminderAt || previousDay(x.date)) <= today && x.reminderStatus === 'pendiente' && x.status !== 'cancelada' && x.status !== 'realizada');
  const scheduled = interviews.rows.filter(x => x.date === today && x.status !== 'cancelada');
  const monthly = money.rows.filter(x => x.date.startsWith(month) && x.status === 'pagado');
  const income = monthly.filter(x => x.kind === 'ingreso').reduce((n, x) => n + x.amount, 0);
  const expense = monthly.filter(x => x.kind === 'gasto').reduce((n, x) => n + x.amount, 0);
  const overdueRentals = rentals.rows.filter(x => x.paymentStatus === 'pendiente' && x.dueDate < today && x.status !== 'cancelled');
  const unpaidMonthly = agreements.rows.filter(x => x.status === 'activo' && !money.rows.some(row => row.id === `rent-${x.id}-${month}` && row.status === 'pagado'));
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-semibold">Panel de CREAR</h1><p className="text-[#6D7C76]">{new Intl.DateTimeFormat('es-AR', { dateStyle: 'full', timeZone: 'America/Argentina/Jujuy' }).format(new Date())}</p></div><button className="rounded-xl bg-[#46766B] px-4 py-2.5 font-semibold text-white" onClick={onNewInquiry}>Nueva consulta</button></div>
    {[inquiries.error, interviews.error, rentals.error, agreements.error, money.error].filter(Boolean).map((error, i) => <p role="alert" key={i} className="text-red-700">{error}</p>)}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Consultas nuevas', inquiries.rows.filter(x => x.createdAt.startsWith(today)).length], ['Necesitan respuesta', pending.length], ['Entrevistas hoy', scheduled.length], ['Recordatorios', due.length]].map(([label, n]) => <div key={label} className="rounded-2xl border bg-white p-5"><p className="text-sm text-[#6D7C76]">{label}</p><strong className="text-3xl">{n}</strong></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-2xl border bg-white p-5"><div className="flex justify-between"><h2 className="text-lg font-semibold">Agenda de hoy</h2><button className="text-sm text-[#46766B]" onClick={onAgenda}>Abrir agenda</button></div>{scheduled.length ? scheduled.map(x => <p key={x.id} className="border-b py-3 text-sm">{x.start} · {PROFESSIONALS.find(p => p.id === x.professionalId)?.name || 'Profesional'} · {ROOMS.find(r => r.id === x.roomId)?.name || 'Consultorio'}</p>) : <p className="mt-3 text-[#6D7C76]">No hay entrevistas registradas para hoy.</p>}</section><section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-semibold">Seguimiento</h2><p className="mt-3">Consultas pendientes: {pending.length}</p><p>Recordatorios pendientes: {due.length}</p><p>Entrevistas sin cobrar: {interviews.rows.filter(x => x.paymentStatus === 'pendiente' && x.status !== 'cancelada').length}</p><p>Alquileres ocasionales vencidos: {overdueRentals.length}</p><p>Alquileres mensuales pendientes: {unpaidMonthly.length}</p></section></div>
    <section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-semibold">Este mes</h2><p>Ingresos cobrados: {moneyFormat(income)}</p><p>Gastos pagados: {moneyFormat(expense)}</p><p>Resultado operativo: {moneyFormat(income - expense)}</p></section>
  </div>;
}
