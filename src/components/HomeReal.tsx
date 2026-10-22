import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Clock3, WalletCards } from 'lucide-react';
import { localDate, moneyFormat, useRecords } from '../lib/crearStore';
import { subscribeToAppointments } from '../lib/appointmentsStore';
import { buildUnifiedOccupancyAppointments, getActiveOccupancyForDate } from '../lib/occupancy';
import { useProfessionals } from '../lib/professionalsStore';
import type { AppointmentRecord } from '../types';
import { ROOMS } from '../constants';
import { Button, cardClass, ErrorMessage, PageHeader, StatCard } from './ui';

export function HomeReal({ onNewInquiry, onNavigate }: { onNewInquiry: () => void; onNavigate: (tab: string) => void }) {
  const inquiries = useRecords('inquiries'), interviews = useRecords('interviews'), rentals = useRecords('rentals'), agreements = useRecords('agreements'), money = useRecords('money');
  const [professionals] = useProfessionals();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  useEffect(() => subscribeToAppointments(setAppointments, () => {}), []);
  const today = localDate(), month = today.slice(0, 7);
  const previousDay = (date: string) => { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() - 1); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; };
  const pending = inquiries.rows.filter(x => !x.archived && x.status.includes('Pendiente'));
  const due = interviews.rows.filter(x => (x.reminderAt || previousDay(x.date)) <= today && x.reminderStatus === 'pendiente' && x.status !== 'cancelada' && x.status !== 'realizada');
  const unifiedToday = useMemo(
    () =>
      getActiveOccupancyForDate(
        buildUnifiedOccupancyAppointments({
          appointments,
          interviews: interviews.rows,
          agreements: agreements.rows,
          rentals: rentals.rows,
          profiles: professionals,
        }),
        today
      ),
    [appointments, interviews.rows, agreements.rows, rentals.rows, professionals, today]
  );
  const scheduled = unifiedToday;
  const monthly = money.rows.filter(x => x.date.startsWith(month) && x.status === 'pagado');
  const income = monthly.filter(x => x.kind === 'ingreso').reduce((n, x) => n + x.amount, 0);
  const expense = monthly.filter(x => x.kind === 'gasto').reduce((n, x) => n + x.amount, 0);
  const contributions = monthly.filter(x => x.kind === 'aporte').reduce((n, x) => n + x.amount, 0);
  const unpaidInterviews = interviews.rows.filter(x => x.paymentStatus === 'pendiente' && x.status !== 'cancelada');
  const overdueRentals = rentals.rows.filter(x => x.paymentStatus === 'pendiente' && x.dueDate < today && x.status !== 'cancelled');
  const unpaidMonthly = agreements.rows.filter(x => x.status === 'activo' && !money.rows.some(row => row.id === `rent-${x.id}-${month}` && row.status === 'pagado'));
  const errors = [inquiries.error, interviews.error, rentals.error, agreements.error, money.error].filter(Boolean);
  return <div className="space-y-7">
    <PageHeader title="Buen día, equipo CREAR" description={new Intl.DateTimeFormat('es-AR', { dateStyle: 'full', timeZone: 'America/Argentina/Jujuy' }).format(new Date())} action={<Button onClick={onNewInquiry}>Nueva consulta</Button>} />
    {errors.map((error, index) => <div key={index}><ErrorMessage>{error}</ErrorMessage></div>)}
    <section><h2 className="mb-3 text-sm font-semibold text-[#596963]">Para atender hoy</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Consultas pendientes" value={pending.length} detail="Necesitan coordinación" tone="peach" onClick={() => onNavigate('admissions')} />
      <StatCard label="Entrevistas de hoy" value={scheduled.length} detail="Ver agenda del día" tone="sage" onClick={() => onNavigate('agenda')} />
      <StatCard label="Recordatorios" value={due.length} detail="Pendientes de contacto" tone="blue" onClick={() => onNavigate('admissions')} />
      <StatCard label="Cobros pendientes" value={unpaidInterviews.length} detail="Entrevistas sin cobrar" tone="lavender" onClick={() => onNavigate('finance')} />
    </div></section>
    <section className={cardClass}><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Agenda de hoy</h2><p className="text-sm text-[#6D7C76]">Profesionales, horarios y espacios confirmados.</p></div><Button tone="quiet" onClick={() => onNavigate('agenda')}>Agenda <ChevronRight className="ml-1 h-4 w-4" /></Button></div>
      <div className="mt-4 divide-y divide-[#E5EAE5]">{scheduled.length ? scheduled.map(item => <button key={item.id} onClick={() => onNavigate('agenda')} className="grid w-full grid-cols-[64px_1fr] gap-3 py-3 text-left sm:grid-cols-[72px_1fr_auto]"><strong className="text-[#46766B]">{item.start}</strong><span><span className="block font-medium">{professionals.find(p => p.id === (item.professionalId || item.proId))?.name || item.title || 'Profesional'}</span><span className="text-sm text-[#6D7C76]">{item.kind === 'interview' ? 'Entrevista' : item.kind === 'block' ? 'Reserva consultorio' : (item.serviceName || 'Turno')} · {ROOMS.find(r => r.id === item.roomId)?.name || 'Sin consultorio'}</span></span><span className="hidden self-center rounded-full bg-[#DDEAE2] px-3 py-1 text-xs sm:block">{item.status}</span></button>) : <p className="py-7 text-center text-sm text-[#6D7C76]">No hay turnos ni reservas registradas para hoy.</p>}</div>
    </section>
    <section className="grid gap-4 lg:grid-cols-2"><div className={cardClass}><div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-[#46766B]" /><h2 className="font-semibold">Próximos vencimientos</h2></div><div className="mt-4 space-y-3 text-sm"><button onClick={() => onNavigate('finance')} className="flex w-full justify-between"><span>Alquileres mensuales pendientes</span><strong>{unpaidMonthly.length}</strong></button><button onClick={() => onNavigate('rooms')} className="flex w-full justify-between"><span>Alquileres ocasionales vencidos</span><strong>{overdueRentals.length}</strong></button><button onClick={() => onNavigate('admissions')} className="flex w-full justify-between"><span>Seguimientos de consultas</span><strong>{pending.length}</strong></button></div></div>
      <div className={cardClass}><div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-[#46766B]" /><h2 className="font-semibold">Resumen de {new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(new Date())}</h2></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><span className="text-[#6D7C76]">Ingresos</span><strong className="block text-lg">{moneyFormat(income)}</strong></div><div><span className="text-[#6D7C76]">Gastos</span><strong className="block text-lg">{moneyFormat(expense)}</strong></div><div><span className="text-[#6D7C76]">Resultado operativo</span><strong className="block text-lg">{moneyFormat(income - expense)}</strong></div><div><span className="text-[#6D7C76]">Aportes personales</span><strong className="block text-lg">{moneyFormat(contributions)}</strong></div></div><Button tone="quiet" className="mt-3 px-0" onClick={() => onNavigate('finance')}>Abrir finanzas <ChevronRight className="ml-1 h-4 w-4" /></Button></div>
    </section>
  </div>;
}
