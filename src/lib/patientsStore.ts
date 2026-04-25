/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PatientRecord } from '../types';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'creare.patients';

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizePatient = (patient: Partial<PatientRecord>): PatientRecord => ({
  id: patient.id || createId(),
  name: patient.name || 'Sin nombre',
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

const readLocalPatients = (): PatientRecord[] => {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizePatient) : [];
  } catch {
    return [];
  }
};

const writeLocalPatients = (patients: PatientRecord[]) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  listeners.forEach(l => l(patients));
};

export const savePatient = async (data: Partial<PatientRecord>) => {
  const current = readLocalPatients();
  const id = data.id;
  
  const normalized = normalizePatient({
    ...data,
    updatedAt: new Date().toISOString(),
  });

  const next = id 
    ? current.map(p => p.id === id ? normalized : p)
    : [...current, normalized];
    
  writeLocalPatients(next);
  return normalized;
};

export const deletePatient = async (id: string) => {
  const next = readLocalPatients().filter(p => p.id !== id);
  writeLocalPatients(next);
};

export const usePatients = () => {
  const [patients, setPatients] = useState<PatientRecord[]>(readLocalPatients());

  useEffect(() => {
    listeners.add(setPatients);
    return () => {
      listeners.delete(setPatients);
    };
  }, []);

  return patients;
};

export const getPatientById = (id: string) => {
  return readLocalPatients().find(p => p.id === id);
};

export const findPatientByName = (name: string) => {
  const lower = name.toLowerCase().trim();
  return readLocalPatients().find(p => p.name.toLowerCase().trim() === lower);
};
