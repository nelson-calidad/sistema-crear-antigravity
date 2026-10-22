/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PatientRecord } from '../types';
import { readStoredValue, writeStoredValue } from './browserStorage';
import { useEffect, useState } from 'react';
import { fetchPatientsFromSheets, savePatientMinimalInSheets } from './googleSheetsService';

const STORAGE_KEY = 'crear.sheets.patients.v2';
const LEGACY_STORAGE_KEY = 'creare.patients';

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `pac-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizePatient = (patient: Partial<PatientRecord>): PatientRecord => ({
  id: patient.id || createId(),
  name: (patient.name || 'Sin nombre').trim(),
  professionalId: patient.professionalId || '',
  dni: patient.dni || '',
  healthInsurance: patient.healthInsurance || '',
  plan: patient.plan || '',
  phone: patient.phone || '',
  email: patient.email || '',
  birthDate: patient.birthDate || '',
  notes: patient.notes || '',
  status: patient.status || 'active',
  createdAt: patient.createdAt || new Date().toISOString(),
  updatedAt: patient.updatedAt || new Date().toISOString(),
});

const listeners = new Set<(patients: PatientRecord[]) => void>();

const deduplicatePatients = (list: PatientRecord[]): PatientRecord[] => {
  const byId = new Map<string, PatientRecord>();
  const byNameAndPro = new Map<string, string>();

  for (const item of list) {
    const normalized = normalizePatient(item);
    const key = `${normalized.name.toLowerCase()}::${(normalized.professionalId || '').toLowerCase()}`;
    const existingId = byId.has(normalized.id) ? normalized.id : byNameAndPro.get(key);
    if (existingId && byId.has(existingId)) {
      const prev = byId.get(existingId)!;
      byId.set(existingId, {
        ...prev,
        ...normalized,
        id: prev.id,
        phone: normalized.phone || prev.phone,
        dni: normalized.dni || prev.dni,
        healthInsurance: normalized.healthInsurance || prev.healthInsurance,
        professionalId: normalized.professionalId || prev.professionalId,
      });
    } else {
      byId.set(normalized.id, normalized);
      byNameAndPro.set(key, normalized.id);
    }
  }

  return Array.from(byId.values());
};

const readLocalPatients = (): PatientRecord[] => {
  if (typeof window === 'undefined') return [];
  const rawPrimary = readStoredValue(STORAGE_KEY);
  const rawLegacy = readStoredValue(LEGACY_STORAGE_KEY);
  try {
    const primary = rawPrimary ? JSON.parse(rawPrimary) : [];
    const legacy = rawLegacy ? JSON.parse(rawLegacy) : [];
    const combined = [
      ...(Array.isArray(primary) ? primary : []),
      ...(Array.isArray(legacy) ? legacy : []),
    ];
    return deduplicatePatients(combined);
  } catch {
    return [];
  }
};

const writeLocalPatients = (patients: PatientRecord[]) => {
  const clean = deduplicatePatients(patients);
  writeStoredValue(STORAGE_KEY, JSON.stringify(clean));
  listeners.forEach((l) => l(clean));
};

export const refreshPatientsFromSheets = async (): Promise<PatientRecord[]> => {
  try {
    const remote = await fetchPatientsFromSheets();
    const merged = deduplicatePatients([...remote, ...readLocalPatients()]);
    writeLocalPatients(merged);
    return merged;
  } catch {
    return readLocalPatients();
  }
};

export const savePatient = async (data: Partial<PatientRecord>): Promise<PatientRecord> => {
  const current = readLocalPatients();
  const cleanName = (data.name || '').trim();
  const existing =
    (data.id ? current.find((p) => p.id === data.id) : undefined) ||
    (cleanName
      ? current.find(
          (p) =>
            p.name.toLowerCase().trim() === cleanName.toLowerCase() &&
            (!data.professionalId || !p.professionalId || p.professionalId === data.professionalId)
        )
      : undefined);

  const normalized = normalizePatient({
    ...existing,
    ...data,
    id: existing?.id || data.id || createId(),
    name: cleanName || existing?.name || 'Sin nombre',
    updatedAt: new Date().toISOString(),
  });

  const next = current.some((p) => p.id === normalized.id)
    ? current.map((p) => (p.id === normalized.id ? normalized : p))
    : [normalized, ...current];

  writeLocalPatients(next);

  // Sincronizar con la única hoja oficial crear_patients en Google Sheets
  await savePatientMinimalInSheets(normalized);
  return normalized;
};

export const deletePatient = async (id: string) => {
  const next = readLocalPatients().filter((p) => p.id !== id);
  writeLocalPatients(next);
};

export const usePatients = () => {
  const [patients, setPatients] = useState<PatientRecord[]>(() => readLocalPatients());

  useEffect(() => {
    listeners.add(setPatients);
    void refreshPatientsFromSheets();
    return () => {
      listeners.delete(setPatients);
    };
  }, []);

  return patients;
};

export const getPatientById = (id: string) => {
  return readLocalPatients().find((p) => p.id === id);
};

export const findPatientByName = (name: string, professionalId?: string) => {
  const lower = name.toLowerCase().trim();
  return readLocalPatients().find(
    (p) =>
      p.name.toLowerCase().trim() === lower &&
      (!professionalId || !p.professionalId || p.professionalId === professionalId)
  );
};

