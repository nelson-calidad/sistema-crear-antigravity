/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart,
  Users,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const data = [
  { name: 'Ene', ingresos: 4000, gastos: 2400 },
  { name: 'Feb', ingresos: 3000, gastos: 1398 },
  { name: 'Mar', ingresos: 2000, gastos: 6800 },
  { name: 'Abr', ingresos: 2780, gastos: 3908 },
  { name: 'May', ingresos: 1890, gastos: 4800 },
  { name: 'Jun', ingresos: 2390, gastos: 3800 },
];

import { cn } from '../lib/utils';
import { DoorOpen, Stethoscope, Clock, Zap } from 'lucide-react';

const StatCard = ({ title, value, change, icon: Icon, color, trend }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        <div className={cn("flex items-center mt-2 text-xs font-semibold", trend === 'up' ? "text-emerald-600" : "text-rose-600")}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {change}
          <span className="text-slate-400 font-normal ml-1">vs mes pasado</span>
        </div>
      </div>
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </motion.div>
);

export const Dashboard = ({ onQuickReserve }: { onQuickReserve?: () => void }) => {
  const todayLabel = format(new Date(), "d 'de' MMMM yyyy", { locale: es });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Resumen Administrativo</h1>
          <p className="text-slate-500 font-medium">Estado de CREAR al {todayLabel}</p>
        </header>
        <button 
          onClick={onQuickReserve}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
        >
           <Zap className="w-4 h-4 text-amber-400" /> Reserva Rápida
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Ingresos Totales" 
          value="$1,240,000" 
          change="+12.5%" 
          trend="up"
          icon={TrendingUp} 
          color="bg-blue-600"
        />
        <StatCard 
          title="Gastos Operativos" 
          value="$450,000" 
          change="-2.4%" 
          trend="down"
          icon={TrendingDown} 
          color="bg-rose-500"
        />
        <StatCard 
          title="Fondo Común" 
          value="$150,000" 
          change="+5.1%" 
          trend="up"
          icon={PieChart} 
          color="bg-amber-500"
        />
        <StatCard 
          title="Ganancia Neta" 
          value="$640,000" 
          change="+18.2%" 
          trend="up"
          icon={DollarSign} 
          color="bg-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-8">
              <h3 className="font-bold text-slate-800 text-lg">Flujo de Caja Anual</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center text-xs font-medium text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" /> Ingresos
                </div>
                <div className="flex items-center text-xs font-medium text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-slate-200 mr-2" /> Gastos
                </div>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area type="monotone" dataKey="ingresos" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                  <Area type="monotone" dataKey="gastos" stroke="#e2e8f0" strokeWidth={2} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'C.1', status: 'occupied', pro: 'Vero', end: '10:45', until: 'Ocupado' },
              { id: 'C.2', status: 'free', pro: '-', end: '-', until: 'Libre para Encuesta' },
              { id: 'C.3', status: 'occupied', pro: 'Carlos', end: '11:00', until: 'Ocupado' },
            ].map((room) => (
              <div key={room.id} className={cn(
                "p-4 rounded-2xl border transition-all",
                room.status === 'occupied' ? "bg-white border-slate-100" : "bg-emerald-50 border-emerald-100 shadow-sm shadow-emerald-100"
              )}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <DoorOpen className={cn("w-4 h-4", room.status === 'occupied' ? "text-slate-400" : "text-emerald-500")} />
                    <span className="font-bold text-slate-900">{room.id}</span>
                  </div>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    room.status === 'occupied' ? "bg-amber-400 animate-pulse" : "bg-emerald-500"
                  )} />
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
          <h3 className="font-bold text-lg mb-6">Próximos Turnos</h3>
          <div className="space-y-4">
            {[
              { time: '09:00 AM', name: 'Vero - Paciente: Juan P.', room: 'C.1' },
              { time: '10:30 AM', name: 'Laura - Paciente: Maria G.', room: 'C.3' },
              { time: '11:15 AM', name: 'Vero - Entrevista', room: 'C.2' },
              { time: '01:00 PM', name: 'Carlos - Paciente: Luis R.', room: 'C.1' },
            ].map((appointment, i) => (
              <div key={i} className="flex items-center p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="bg-blue-500/20 text-blue-400 p-2 rounded-lg text-xs font-mono font-bold">
                  {appointment.time}
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium">{appointment.name}</p>
                  <p className="text-white/40 text-xs">{appointment.room}</p>
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
