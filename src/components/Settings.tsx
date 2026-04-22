/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Building2, 
  FileText, 
  Bell, 
  ShieldCheck, 
  Plus, 
  Trash2,
  ExternalLink,
  Save
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { cn } from '../lib/utils';

export const Settings = () => {
  const [activeSubTab, setActiveSubTab] = useState('insurances');

  const insurances = [
    { id: '1', name: 'OSDE', plans: ['210', '310', '410'], status: 'Activo' },
    { id: '2', name: 'Swiss Medical', plans: ['SMG20', 'SMG30'], status: 'Activo' },
    { id: '3', name: 'PAMI', plans: ['General'], status: 'En Trámite' },
    { id: '4', name: 'Galeno', plans: ['Oro', 'Plata'], status: 'Activo' },
  ];

  const templates = [
    { id: '1', name: 'Ficha de Ingreso Adultos', format: 'PDF', lastUpdate: '2026-03-15' },
    { id: '2', name: 'Evaluación Psicomotriz Infantil', format: 'PDF', lastUpdate: '2026-04-01' },
    { id: '3', name: 'Informe de Evolución Mensual', format: 'PDF', lastUpdate: '2026-04-10' },
  ];

  return (
    <div className="space-y-8 h-full max-w-5xl mx-auto">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Configuración</h1>
        <p className="text-slate-500">Administra las bases de datos de obras sociales, plantillas y alertas del sistema.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Sub-navigation */}
        <aside className="w-full md:w-64 space-y-1 flex md:block overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          <button
            onClick={() => setActiveSubTab('insurances')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all",
              activeSubTab === 'insurances' ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <Building2 className="w-4 h-4" /> Obras Sociales
          </button>
          <button
            onClick={() => setActiveSubTab('templates')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all",
              activeSubTab === 'templates' ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <FileText className="w-4 h-4" /> Planillas y PDFs
          </button>
          <button
            onClick={() => setActiveSubTab('notifications')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all",
              activeSubTab === 'notifications' ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <Bell className="w-4 h-4" /> Alertas
          </button>
          <button
            onClick={() => setActiveSubTab('security')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all",
              activeSubTab === 'security' ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            <ShieldCheck className="w-4 h-4" /> Seguridad
          </button>
        </aside>

        {/* Content area */}
        <div className="flex-1">
          {activeSubTab === 'insurances' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-900">Gestión de Obras Sociales</h3>
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100">
                    <Plus className="w-3.5 h-3.5" /> Agregar OS
                  </button>
                </div>
                
                <div className="space-y-3">
                  {insurances.map(os => (
                    <div key={os.id} className="flex items-center justify-between p-4 border border-slate-50 rounded-xl hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold">
                          {os.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{os.name}</p>
                          <p className="text-xs text-slate-500">Planes: {os.plans.join(', ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold",
                          os.status === 'Activo' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {os.status}
                        </span>
                        <div className="flex gap-2">
                          <button className="p-2 text-slate-300 hover:text-slate-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'templates' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-900">Plantillas de Documentación</h3>
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100">
                    <Plus className="w-3.5 h-3.5" /> Subir Nueva
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map(tpl => (
                    <div key={tpl.id} className="p-4 bg-slate-50 rounded-xl border border-transparent hover:border-blue-100 transition-all flex flex-col justify-between">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <FileText className="w-6 h-6 text-blue-500" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{tpl.format}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm mb-1">{tpl.name}</h4>
                        <p className="text-[10px] text-slate-500">Última actualización: {tpl.lastUpdate}</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-200/50 flex gap-2">
                        <button className="flex-1 py-1.5 bg-white text-slate-700 text-[10px] font-bold rounded-md hover:bg-slate-100 flex items-center justify-center gap-2">
                          <ExternalLink className="w-3 h-3" /> Ver
                        </button>
                        <button className="flex-1 py-1.5 bg-white text-slate-700 text-[10px] font-bold rounded-md hover:bg-slate-100 flex items-center justify-center gap-2">
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'notifications' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6">Configuración de Alertas</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Notificar nuevos turnos por Email', defaultChecked: true },
                    { label: 'Alerta de colisión de consultorios', defaultChecked: true },
                    { label: 'Recordatorio de entrevistas (24hs antes)', defaultChecked: false },
                    { label: 'Aviso de deuda de pacientes', defaultChecked: true },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-700">{item.label}</span>
                      <div className={cn(
                        "w-10 h-5 rounded-full relative transition-colors cursor-pointer",
                        item.defaultChecked ? "bg-blue-600" : "bg-slate-200"
                      )}>
                        <div className={cn(
                          "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                          item.defaultChecked ? "right-1" : "left-1"
                        )} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                   <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors">
                     <Save className="w-4 h-4" /> Guardar Cambios
                   </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
