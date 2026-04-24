/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrendingUp, TrendingDown, DollarSign, PieChart, ArrowUpRight, ArrowDownRight, DoorOpen, Stethoscope, Clock, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const monthlyCashflow = [
  { name: 'Ene', ingresos: 4000, gastos: 2400 },
  { name: 'Feb', ingresos: 3000, gastos: 1398 },
  { name: 'Mar', ingresos: 2000, gastos: 6800 },
  { name: 'Abr', ingresos: 2780, gastos: 3908 },
  { name: 'May', ingresos: 1890, gastos: 4800 },
  { name: 'Jun', ingresos: 2390, gastos: 3800 },
];

const StatCard = ({ title, value, change, icon: Icon, color, trend }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
        <div className={cn('flex items-center mt-2 text-xs font-semibold', trend === 'up' ? 'text-emerald-600' : 'text-rose-600')}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {change}
          <span className="text-slate-400 font-normal ml-1">vs mes pasado</span>
        </div>
      </div>
      <div className={cn('p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-100')}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </motion.div>
);

export const Dashboard = ({ onQuickReserve }: { onQuickReserve?: () => void }) => {
  const todayLabel = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const maxCashflow = Math.max(...monthlyCashflow.flatMap((item) => [item.ingresos, item.gastos]));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Resumen Administrativo</h1>
          <p className="text-slate-500 font-medium">Estado de CREAR al {todayLabel}</p>
        </header>
        <button
          onClick={onQuickReserve}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-sm"
        >
          <Zap className="w-4 h-4 text-amber-400" /> Reserva rápida
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Ingresos Totales" value="$1,240,000" change="+12.5%" trend="up" icon={TrendingUp} color="bg-blue-600" />
        <StatCard title="Gastos Operativos" value="$450,000" change="-2.4%" trend="down" icon={TrendingDown} color="bg-rose-500" />
        <StatCard title="Fondo Común" value="$150,000" change="+5.1%" trend="up" icon={PieChart} color="bg-amber-500" />
        <StatCard title="Ganancia Neta" value="$640,000" change="+18.2%" trend="up" icon={DollarSign} color="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-8">
              <h3 className="font-bold text-slate-800 text-lg">Flujo de Caja Anual</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center text-xs font-medium text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-slate-800 mr-2" /> Ingresos
                </div>
                <div className="flex items-center text-xs font-medium text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-slate-200 mr-2" /> Gastos
                </div>
              </div>
            </div>

            <div className="h-[300px]">
              <div className="grid h-full grid-cols-6 gap-3 items-end">
                {monthlyCashflow.map((item) => {
                  const incomeHeight = Math.max(12, (item.ingresos / maxCashflow) * 100);
                  const expenseHeight = Math.max(12, (item.gastos / maxCashflow) * 100);

                  return (
                    <div key={item.name} className="flex h-full flex-col items-center justify-end gap-2">
                      <div className="flex w-full flex-1 items-end gap-2">
                        <div
                          className="flex-1 rounded-t-xl bg-slate-800"
                          style={{ height: `${incomeHeight}%` }}
                          title={`Ingresos ${item.name}`}
                        />
                        <div
                          className="flex-1 rounded-t-xl bg-slate-200 shadow-sm"
                          style={{ height: `${expenseHeight}%` }}
                          title={`Gastos ${item.name}`}
                        />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'C.1', status: 'occupied', pro: 'Vero', end: '10:45', until: 'Ocupado' },
              { id: 'C.2', status: 'free', pro: '-', end: '-', until: 'Libre para reserva' },
              { id: 'C.3', status: 'occupied', pro: 'Carlos', end: '11:00', until: 'Ocupado' },
            ].map((room) => (
              <div
                key={room.id}
                className={cn(
                  'p-4 rounded-2xl border transition-all',
                  room.status === 'occupied' ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 shadow-sm',
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <DoorOpen className={cn('w-4 h-4', room.status === 'occupied' ? 'text-slate-400' : 'text-emerald-500')} />
                    <span className="font-bold text-slate-900">{room.id}</span>
                  </div>
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      room.status === 'occupied' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500',
                    )}
                  />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{room.until}</p>
                {room.status === 'occupied' ? (
                  <div className="space-y-1">
                    <div className="flex items-center text-xs font-bold text-slate-700">
                      <Stethoscope className="w-3 h-3 mr-1 text-blue-500" /> {room.pro}
                    </div>
                    <div className="flex items-center text-[10px] font-medium text-slate-500">
                      <Clock className="w-3 h-3 mr-1" /> Hasta {room.end}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => onQuickReserve?.()}
                    className="w-full py-2 bg-white text-emerald-600 text-[10px] font-bold rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors"
                  >
                    Reservar ahora
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl text-white">
          <h3 className="font-bold text-lg mb-6">Próximos turnos</h3>
          <div className="space-y-4">
            {[
              { time: '09:00 AM', name: 'Vero - Paciente: Juan P.', room: 'C.1' },
              { time: '10:30 AM', name: 'Laura - Paciente: Maria G.', room: 'C.3' },
              { time: '11:15 AM', name: 'Vero - Entrevista', room: 'C.2' },
              { time: '01:00 PM', name: 'Carlos - Paciente: Luis R.', room: 'C.1' },
            ].map((appointment, i) => (
              <div key={i} className="flex items-center p-3 bg-slate-800 rounded-xl border border-slate-700">
                <div className="bg-slate-700 text-slate-300 p-2 rounded-lg text-xs font-mono font-bold">{appointment.time}</div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium">{appointment.name}</p>
                  <p className="text-slate-400 text-xs">{appointment.room}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => onQuickReserve?.()}
            className="w-full mt-8 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors"
          >
            Ver Agenda Completa
          </button>
        </div>
      </div>
    </div>
  );
};
