/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Plus, Search, ArrowUpRight, Download, Calendar, Tag, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';

const transactions = [
  { id: '1', date: '2026-04-20', type: 'Ingreso', category: 'Paciente', description: 'Sesión Juan P. (Vero)', amount: 15000, status: 'Completado' },
  { id: '2', date: '2026-04-21', type: 'Gasto', category: 'Servicios', description: 'Luz Consultorios', amount: -6500, status: 'Completado' },
  { id: '3', date: '2026-04-21', type: 'Ingreso', category: 'Paciente', description: 'Entrevista Maria G. (Vero)', amount: 10000, status: 'Pendiente' },
  { id: '4', date: '2026-04-22', type: 'Gasto', category: 'Alquiler', description: 'Alquiler Sede Central', amount: -150000, status: 'Completado' },
  { id: '5', date: '2026-04-22', type: 'Ingreso', category: 'Obra Social', description: 'Liquidación OSDE (Marzo)', amount: 450000, status: 'Completado' },
];

const categoryData = [
  { name: 'Servicios', value: 45000, color: 'bg-blue-500' },
  { name: 'Alquiler', value: 150000, color: 'bg-indigo-500' },
  { name: 'Sueldos', value: 300000, color: 'bg-violet-500' },
  { name: 'Insumos', value: 25000, color: 'bg-fuchsia-500' },
];

export const Finance = () => {
  const maxCategoryValue = Math.max(...categoryData.map((item) => item.value));

  return (
    <div className="space-y-8 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">Finanzas</h1>
          <p className="text-slate-500 dark:text-slate-400">Control de flujo de caja, gastos y liquidaciones de profesionales.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Download className="w-4 h-4" /> Exportar Reporte
          </button>
          <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200 dark:shadow-none">
            <Plus className="w-4 h-4" /> Nuevo Movimiento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Últimas Transacciones</h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Filtrar..."
                  className="pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 border-none text-xs rounded-lg w-40 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Descripción</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center text-xs font-medium text-slate-600 dark:text-slate-400">
                        <Calendar className="w-3 h-3 mr-2 opacity-40" />
                        {t.date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-xs">
                        <Tag className="w-3 h-3 mr-2 text-blue-500 opacity-60" />
                        <span className="text-slate-500">{t.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn('text-sm font-bold', t.amount > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        {t.amount > 0 ? '+' : ''}
                        {t.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span
                          className={cn(
                            'px-2 py-1 rounded-md text-[10px] font-bold',
                            t.status === 'Completado' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
                          )}
                        >
                          {t.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-50 dark:border-slate-800 text-center">
            <button className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">Ver todas las transacciones</button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 dark:bg-[#0f172a] rounded-2xl p-6 text-white shadow-xl shadow-slate-200 dark:shadow-none border border-transparent dark:border-slate-800">
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

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6">Distribución de Gastos</h3>
            <div className="space-y-4">
              {categoryData.map((item) => {
                const width = Math.max(12, (item.value / maxCategoryValue) * 100);

                return (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>{item.name}</span>
                      <span>{item.value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className={cn('h-full rounded-full', item.color)} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
