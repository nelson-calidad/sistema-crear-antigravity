/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MoreHorizontal, Mail, Phone, Clock, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';

import { PROFESSIONALS } from '../constants';

const professionalsWithDetails = PROFESSIONALS.map(pro => ({
  ...pro,
  email: `${pro.name.toLowerCase()}@lab.com`,
  phone: '+54 11 2345-6789',
  retention: '20%',
  hours: 'Lun, Mié, Vie (08:00 - 14:00)',
  image: `https://images.unsplash.com/photo-${pro.id === '1' ? '1494790108377-be9c29b29330' : pro.id === '2' ? '1507003211169-0a1dd7228f2d' : '1438761681033-6461ffad8d80'}?w=150&h=150&fit=crop`
}));

export const ProfessionalsGrid = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión Humana</h1>
          <p className="text-slate-500">Administra el equipo de profesionales y sus configuraciones.</p>
        </div>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
          Nuevo Profesional
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {professionalsWithDetails.map((pro) => (
          <motion.div
            key={pro.id}
            whileHover={{ y: -5 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
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
                <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
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
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  pro.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {pro.status}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
