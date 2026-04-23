/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { MoreHorizontal, Mail, Phone, Clock, DollarSign, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ProfessionalRecord, createProfessional, deleteProfessional, resetProfessionals, useProfessionals } from '../lib/professionalsStore';

const colorOptions = [
  { label: 'Azul', value: 'bg-blue-500' },
  { label: 'Indigo', value: 'bg-indigo-500' },
  { label: 'Verde', value: 'bg-emerald-500' },
  { label: 'Rosa', value: 'bg-rose-500' },
  { label: 'Amarillo', value: 'bg-amber-500' },
  { label: 'Violeta', value: 'bg-purple-500' },
  { label: 'Cian', value: 'bg-cyan-500' },
  { label: 'Gris', value: 'bg-slate-500' },
];

const buildDefaultForm = (professional: ProfessionalRecord) => ({
  name: professional.name,
  specialty: professional.specialty,
  color: professional.color,
  status: professional.status,
  email: professional.email,
  phone: professional.phone,
  hours: professional.hours,
  retention: professional.retention,
  image: professional.image,
});

const buildNewForm = () => ({
  name: '',
  specialty: '',
  color: 'bg-blue-500',
  status: 'Activo' as ProfessionalRecord['status'],
  email: '',
  phone: '',
  hours: 'Lun, Mie, Vie (08:00 - 14:00)',
  retention: '20%',
  image: '',
});

export const ProfessionalsGrid = () => {
  const [professionals, updateProfessional] = useProfessionals();
  const [editingProfessional, setEditingProfessional] = useState<ProfessionalRecord | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<ReturnType<typeof buildDefaultForm> | ReturnType<typeof buildNewForm> | null>(null);

  const professionalsWithDetails = useMemo(() => professionals, [professionals]);

  const openEditor = (professional: ProfessionalRecord) => {
    setEditingProfessional(professional);
    setEditorMode('edit');
    setForm(buildDefaultForm(professional));
  };

  const openCreator = () => {
    setEditingProfessional(null);
    setEditorMode('create');
    setForm(buildNewForm());
  };

  const closeEditor = () => {
    setEditingProfessional(null);
    setEditorMode(null);
    setForm(null);
  };

  const handleSave = async () => {
    if (!form || !editorMode) return;

    const payload = {
      ...form,
      status: form.status === 'En Pausa' ? 'En Pausa' : 'Activo',
    };

    try {
      if (editorMode === 'create') {
        await createProfessional(payload);
      } else if (editingProfessional) {
        await updateProfessional(editingProfessional.id, payload);
      }

      closeEditor();
    } catch (error) {
      console.error('No se pudo guardar el colaborador.', error);
      window.alert('No se pudo guardar el colaborador. Reintentá en unos segundos.');
    }
  };

  const handleDelete = async () => {
    if (!editingProfessional) return;

    const confirmed = window.confirm(`Eliminar a ${editingProfessional.name}? Esta accion no se puede deshacer.`);
    if (!confirmed) return;

    try {
      await deleteProfessional(editingProfessional.id);
      closeEditor();
    } catch (error) {
      console.error('No se pudo eliminar el colaborador.', error);
      window.alert('No se pudo eliminar el colaborador. Reintentá en unos segundos.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Gestión Humana</h1>
          <p className="text-slate-500">Administra el equipo de profesionales y sus configuraciones.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              void resetProfessionals().catch((error) => {
                console.error('No se pudo restaurar la base de colaboradores.', error);
                window.alert('No se pudo restaurar la base. Reintentá en unos segundos.');
              });
            }}
            className="inline-flex items-center justify-center px-5 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors shadow-sm"
          >
            Restaurar base
          </button>
          <button
            onClick={openCreator}
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            Nuevo Profesional
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {professionalsWithDetails.map((pro) => (
          <motion.button
            key={pro.id}
            type="button"
            whileHover={{ y: -5 }}
            onClick={() => openEditor(pro)}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-left"
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <img src={pro.image} alt={pro.name} className="w-14 h-14 rounded-xl object-cover" />
                  <div className="ml-4">
                    <h3 className="font-bold text-slate-900 text-lg">{pro.name}</h3>
                    <p className="text-blue-600 text-sm font-medium">{pro.specialty}</p>
                  </div>
                </div>
                <div className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <div className="flex items-center text-slate-500 text-sm">
                  <Mail className="w-4 h-4 mr-3 text-slate-400" />
                  {pro.email}
                </div>
                <div className="flex items-center text-slate-500 text-sm">
                  <Phone className="w-4 h-4 mr-3 text-slate-400" />
                  {pro.phone}
                </div>
                <div className="flex items-center text-slate-500 text-sm">
                  <Clock className="w-4 h-4 mr-3 text-slate-400" />
                  {pro.hours}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg">
                  <DollarSign className="w-4 h-4 text-emerald-600 mr-1" />
                  <span className="text-slate-900 font-bold text-sm">{pro.retention} Retención</span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    pro.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {pro.status}
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {form && editorMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeEditor} />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh]"
            >
              <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    {editorMode === 'create' ? 'Crear colaborador' : 'Editar colaborador'}
                  </p>
                  <h2 className="text-xl font-black text-slate-900">
                    {editorMode === 'create' ? 'Nuevo colaborador' : editingProfessional?.name}
                  </h2>
                </div>
                <button onClick={closeEditor} className="p-2 rounded-full hover:bg-white transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-5 md:p-6 overflow-y-auto custom-scrollbar max-h-[calc(92vh-140px)] space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre</span>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-sm"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Especialidad</span>
                    <input
                      value={form.specialty}
                      onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-sm"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email</span>
                    <input
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-sm"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Telefono</span>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-sm"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Horario</span>
                    <input
                      value={form.hours}
                      onChange={(e) => setForm({ ...form, hours: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-sm"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Retencion</span>
                    <input
                      value={form.retention}
                      onChange={(e) => setForm({ ...form, retention: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-sm"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Estado</span>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as ProfessionalRecord['status'] })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-sm"
                    >
                      <option value="Activo">Activo</option>
                      <option value="En Pausa">En Pausa</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Color</span>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setForm({ ...form, color: option.value })}
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-black',
                            form.color === option.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700',
                          )}
                        >
                          <span className={cn('w-3 h-3 rounded-full', option.value)} />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-12 h-12 rounded-2xl', form.color)} />
                    <div>
                      <p className="text-sm font-black text-slate-900">{form.name || 'Sin nombre'}</p>
                      <p className="text-xs text-slate-500">{form.specialty || 'Sin especialidad'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {editorMode === 'edit' && editingProfessional && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-rose-200 text-rose-600 bg-white font-bold text-sm hover:bg-rose-50 transition-colors"
                      >
                        Eliminar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSave}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {editorMode === 'create' ? 'Crear colaborador' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
