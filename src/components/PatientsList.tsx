/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Search, Phone, MessageCircle, User, Calendar, ExternalLink, Plus, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { AppointmentRecord, PatientRecord } from '../types';
import { usePatients, savePatient, deletePatient } from '../lib/patientsStore';
import { PatientDetailsModal } from './PatientDetailsModal';

interface PatientsListProps {
  appointments: AppointmentRecord[];
  onOpenAgendaWithDate: (date: string) => void;
}

export const PatientsList = ({ appointments, onOpenAgendaWithDate }: PatientsListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const persistedPatients = usePatients();

  // Combinar pacientes de citas con fichas persistidas
  const patients = useMemo(() => {
    const map = new Map<string, PatientRecord & { lastVisit?: string; visitCount: number }>();

    // Primero cargar los persistidos
    persistedPatients.forEach(p => {
      map.set(p.name.toLowerCase().trim(), { ...p, visitCount: 0 });
    });

    // Luego cruzar con citas para estadísticas y agregar los que no están persistidos
    appointments.forEach(app => {
      const name = app.patient?.trim();
      if (!name || app.kind === 'block') return;

      const key = name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, { 
          id: '', // Marcar como no persistido todavía si no tiene ID real
          name, 
          phone: app.patientPhone || '', 
          visitCount: 0,
          status: 'active'
        });
      }

      const current = map.get(key)!;
      current.visitCount += 1;
      
      if (!current.lastVisit || app.date > current.lastVisit) {
        current.lastVisit = app.date;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [appointments, persistedPatients]);

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.phone && p.phone.includes(searchTerm)) ||
    (p.dni && p.dni.includes(searchTerm))
  );

  const handleOpenEdit = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setSelectedPatient(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Directorio de Pacientes</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Gestión de fichas clínicas y contactos del centro.</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-5 h-5" />
            Nuevo Paciente
          </button>
        </div>

        <div className="relative max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all dark:text-slate-100"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPatients.map((patient, idx) => (
            <motion.div
              key={patient.name + idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="bg-white dark:bg-[#0f172a] p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm border",
                    patient.id ? "bg-blue-600 text-white border-blue-500" : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                  )}>
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{patient.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-[0.1em]">{patient.visitCount} Sesiones</p>
                      {patient.id && <span className="w-1 h-1 rounded-full bg-blue-400" />}
                      {patient.id && <p className="text-[10px] text-blue-500 uppercase font-black tracking-[0.1em]">Ficha Activa</p>}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleOpenEdit(patient)}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-transparent group-hover:border-slate-100 dark:group-hover:border-slate-800 transition-all">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <Phone className="w-4.5 h-4.5 opacity-70" />
                    <span className="font-bold text-sm">{patient.phone || '—'}</span>
                  </div>
                  {patient.phone && (
                    <a
                      href={`https://wa.me/${patient.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-4.5 h-4.5" />
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-transparent group-hover:border-slate-100 dark:group-hover:border-slate-800 transition-all">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <Calendar className="w-4.5 h-4.5 opacity-70" />
                    <span className="font-bold text-sm">Última: {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString('es-AR') : '—'}</span>
                  </div>
                  {patient.lastVisit && (
                    <button
                      onClick={() => onOpenAgendaWithDate(patient.lastVisit!)}
                      className="w-9 h-9 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center"
                      title="Ver en Agenda"
                    >
                      <ExternalLink className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>
              </div>
              
              {!patient.id && (
                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                  <button 
                    onClick={() => handleOpenEdit(patient)}
                    className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                  >
                    + Crear Ficha Completa
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
        
        {filteredPatients.length === 0 && (
          <div className="py-32 text-center bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200 dark:text-slate-800">
              <User className="w-10 h-10" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-xs">No se encontraron resultados</p>
          </div>
        )}

        <PatientDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          patient={selectedPatient}
          onSave={async (data) => {
            await savePatient(data);
          }}
          onDelete={async (id) => {
            if (window.confirm('¿Seguro quieres eliminar esta ficha? No borrará las citas pasadas.')) {
              await deletePatient(id);
              setIsModalOpen(false);
            }
          }}
        />
    </div>
  );
};
