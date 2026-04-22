/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download,
  Calendar,
  Tag,
  CreditCard
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const transactions = [
  { id: '1', date: '2026-04-20', type: 'Ingreso', category: 'Paciente', description: 'Sesión Juan P. (Vero)', amount: 15000, status: 'Completado' },
  { id: '2', date: '2026-04-21', type: 'Gasto', category: 'Servicios', description: 'Luz Consultorios', amount: -6500, status: 'Completado' },
  { id: '3', date: '2026-04-21', type: 'Ingreso', category: 'Paciente', description: 'Entrevista Maria G. (Vero)', amount: 10000, status: 'Pendiente' },
  { id: '4', date: '2026-04-22', type: 'Gasto', category: 'Alquiler', description: 'Alquiler Sede Central', amount: -150000, status: 'Completado' },
  { id: '5', date: '2026-04-22', type: 'Ingreso', category: 'Obra Social', description: 'Liquidación OSDE (Marzo)', amount: 450000, status: 'Completado' },
];

const categoryData = [
  { name: 'Servicios', value: 45000 },
  { name: 'Alquiler', value: 150000 },
  { name: 'Sueldos', value: 300000 },
  { name: 'Insumos', value: 25000 },
];

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#d946ef'];

export const Finance = () => {
  return (
    <div className="space-y-8 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Finanzas</h1>
          <p className="text-slate-500">Control de flujo de caja, gastos y liquidaciones de profesionales.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" /> Exportar Reporte
          </button>
          <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
            <Plus className="w-4 h-4" /> Nuevo Movimiento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main transaction list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="font-bold text-lg text-slate-900">Últimas Transacciones</h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Filtrar..." 
                  className="pl-9 pr-4 py-1.5 bg-slate-50 border-none text-xs rounded-lg w-40 focus:ring-1 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Descripción</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center text-xs font-medium text-slate-600">
                        <Calendar className="w-3 h-3 mr-2 opacity-40" />
                        {t.date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{t.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-xs">
                        <Tag className="w-3 h-3 mr-2 text-blue-500 opacity-60" />
                        <span className="text-slate-500">{t.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "text-sm font-bold",
                        t.amount > 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold",
                          t.status === 'Completado' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {t.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50/50 border-t border-slate-50 text-center">
            <button className="text-xs font-bold text-blue-600 hover:text-blue-700">Ver todas las transacciones</button>
          </div>
        </div>

        {/* Financial metrics sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg">Resumen de Abril</h3>
              <CreditCard className="w-5 h-5 text-white/40" />
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-1">Ingresos de Profesionales (Base 80%)</p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-3xl font-bold">$980,000</h4>
                  <span className="text-emerald-400 text-xs font-bold flex items-center">
                    <ArrowUpRight className="w-3 h-3 mr-1" /> +8%
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-1">Retención Lab (20%)</p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-2xl font-bold text-blue-400">$245,000</h4>
                </div>
              </div>
              
              <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-1">Gastos del Mes</p>
                  <p className="text-xl font-bold text-rose-400">$186,500</p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-1">Fondo Neto</p>
                  <p className="text-xl font-bold text-emerald-400">$58,500</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6">Distribución de Gastos</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 10}}
                    width={70}
                  />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
