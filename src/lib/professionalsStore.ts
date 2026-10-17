import { PROFESSIONALS } from '../constants';
import { save, useRecords, type Profile } from './crearStore';
export type ProfessionalRecord = { id: string; name: string; specialty: string; color: string; status: 'Activo' | 'En Pausa'; email: string; phone: string; hours: string; retention: string; image: string };
const colors = new Map(PROFESSIONALS.map(item => [item.id, item.color]));
const convert = (p: Profile): ProfessionalRecord => ({ id: p.id, name: p.name, specialty: p.specialty, color: colors.get(p.id) || 'bg-emerald-500', status: p.active ? 'Activo' : 'En Pausa', email: p.email, phone: p.phone, hours: p.availability, retention: '', image: '' });
const defaults = (): ProfessionalRecord[] => PROFESSIONALS.map(item => ({ ...item, status: 'Activo', email: '', phone: '', hours: '', retention: '', image: '' }));
let snapshot = defaults();
export const getProfessionalsSnapshot = () => snapshot;
export const refreshProfessionals = async () => snapshot;
export const forceRefreshProfessionals = refreshProfessionals;
export async function updateProfessional(id: string, patch: Partial<ProfessionalRecord>) { const p = snapshot.find(item => item.id === id); if (!p) return snapshot; await save('profiles', { id, name: patch.name ?? p.name, specialty: patch.specialty ?? p.specialty, phone: patch.phone ?? p.phone, email: patch.email ?? p.email, active: (patch.status ?? p.status) === 'Activo', responsible: '', roomId: '', availability: patch.hours ?? p.hours, rent: 0, dueDay: 10, notes: '' }); return snapshot; }
export async function createProfessional(data: Partial<ProfessionalRecord>) { const id = crypto.randomUUID(); await save('profiles', { id, name: data.name || 'Sin nombre', specialty: data.specialty || '', phone: data.phone || '', email: data.email || '', active: data.status !== 'En Pausa', responsible: '', roomId: '', availability: data.hours || '', rent: 0, dueDay: 10, notes: '' }); return snapshot; }
export async function deleteProfessional(id: string) { await updateProfessional(id, { status: 'En Pausa' }); return snapshot; }
export const resetProfessionals = async () => snapshot;
export function useProfessionals() { const profiles = useRecords('profiles'); const records = [...defaults().map(item => { const profile = profiles.rows.find(row => row.id === item.id); return profile ? convert(profile) : item; }), ...profiles.rows.filter(row => !PROFESSIONALS.some(item => item.id === row.id)).map(convert)]; snapshot = records; return [records, updateProfessional, resetProfessionals, createProfessional, deleteProfessional] as const; }
