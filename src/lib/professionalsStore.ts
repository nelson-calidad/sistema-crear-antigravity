import { PROFESSIONALS } from '../constants';
import { DEFAULT_PROFILES_SEED, save, useRecords, type Profile } from './crearStore';

export type ProfessionalRecord = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  specialty: string;
  subSpecialty?: string;
  licenseNumber?: string;
  joinedDate?: string;
  acceptingPatients?: boolean;
  serviceIds?: string[];
  color: string;
  status: 'Activo' | 'En Pausa';
  email: string;
  phone: string;
  hours: string;
  retention: string;
  image: string;
  roomId?: string;
  responsible?: string;
  notes?: string;
};

const colors = new Map(PROFESSIONALS.map(item => [item.id, item.color]));

const convert = (p: Profile): ProfessionalRecord => ({
  id: p.id,
  name: p.name,
  firstName: p.firstName,
  lastName: p.lastName,
  specialty: p.specialty,
  subSpecialty: p.subSpecialty,
  licenseNumber: p.licenseNumber,
  joinedDate: p.joinedDate,
  acceptingPatients: p.acceptingPatients !== false,
  serviceIds: p.serviceIds || [],
  color: p.color || colors.get(p.id) || 'bg-emerald-500',
  status: p.active ? 'Activo' : 'En Pausa',
  email: p.email,
  phone: p.phone,
  hours: p.availability,
  retention: '',
  image: '',
  roomId: p.roomId,
  responsible: p.responsible,
  notes: p.notes,
});

const defaults = (): ProfessionalRecord[] => DEFAULT_PROFILES_SEED.map(convert);

let snapshot = defaults();

export const getProfessionalsSnapshot = () => snapshot;
export const refreshProfessionals = async () => snapshot;
export const forceRefreshProfessionals = refreshProfessionals;

export async function updateProfessional(id: string, patch: Partial<ProfessionalRecord>) {
  const p = snapshot.find(item => item.id === id);
  if (!p) return snapshot;
  await save('profiles', {
    id,
    name: patch.name ?? p.name,
    firstName: patch.firstName ?? p.firstName,
    lastName: patch.lastName ?? p.lastName,
    specialty: patch.specialty ?? p.specialty,
    subSpecialty: patch.subSpecialty ?? p.subSpecialty,
    licenseNumber: patch.licenseNumber ?? p.licenseNumber,
    joinedDate: patch.joinedDate ?? p.joinedDate,
    acceptingPatients: patch.acceptingPatients ?? p.acceptingPatients,
    serviceIds: patch.serviceIds ?? p.serviceIds,
    phone: patch.phone ?? p.phone,
    email: patch.email ?? p.email,
    active: (patch.status ?? p.status) === 'Activo',
    responsible: patch.responsible ?? p.responsible ?? '',
    roomId: patch.roomId ?? p.roomId ?? '',
    availability: patch.hours ?? p.hours,
    rent: 65000,
    dueDay: 10,
    notes: patch.notes ?? p.notes ?? '',
    color: patch.color ?? p.color,
  });
  return snapshot;
}

export async function createProfessional(data: Partial<ProfessionalRecord>) {
  const id = crypto.randomUUID();
  await save('profiles', {
    id,
    name: data.name || 'Sin nombre',
    firstName: data.firstName,
    lastName: data.lastName,
    specialty: data.specialty || '',
    subSpecialty: data.subSpecialty,
    licenseNumber: data.licenseNumber,
    joinedDate: data.joinedDate,
    acceptingPatients: data.acceptingPatients !== false,
    serviceIds: data.serviceIds || [],
    phone: data.phone || '',
    email: data.email || '',
    active: data.status !== 'En Pausa',
    responsible: data.responsible || '',
    roomId: data.roomId || '',
    availability: data.hours || '',
    rent: 65000,
    dueDay: 10,
    notes: data.notes || '',
    color: data.color || 'bg-emerald-500',
  });
  return snapshot;
}

export async function deleteProfessional(id: string) {
  await updateProfessional(id, { status: 'En Pausa' });
  return snapshot;
}

export const resetProfessionals = async () => snapshot;

export function useProfessionals() {
  const profiles = useRecords('profiles');
  const records = [
    ...DEFAULT_PROFILES_SEED.map(seed => {
      const profile = profiles.rows.find(row => row.id === seed.id);
      return convert(profile ? { ...seed, ...profile } : seed);
    }),
    ...profiles.rows.filter(row => !DEFAULT_PROFILES_SEED.some(seed => seed.id === row.id)).map(convert),
  ];
  snapshot = records;
  return [records, updateProfessional, resetProfessionals, createProfessional, deleteProfessional] as const;
}
