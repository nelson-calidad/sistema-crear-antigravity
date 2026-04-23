/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'admin' | 'professional' | 'secretary';
export type AppointmentKind = 'session' | 'interview' | 'block';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';
export type AppointmentType = AppointmentKind;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  color: string; // For calendar visualization
  retentionRate: number; // e.g., 0.20 for 20%
  activeDays: number[]; // 0-6 (Sunday-Saturday)
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface Patient {
  id: string;
  name: string;
  dni: string;
  healthInsurance: string;
  phone: string;
}

export interface Appointment {
  id: string;
  professionalId: string;
  patientId?: string; // Optional if it's an interview without patient record yet
  patientName?: string; // Cache or for interviews
  consultoryId: string; // C.1 to C.10
  start: Date;
  end: Date;
  type: AppointmentType;
  status: AppointmentStatus;
  price: number;
}

export interface Consultory {
  id: string;
  name: string; // "C.1", "C.2", etc.
}

export interface Expense {
  id: string;
  category: 'services' | 'rent' | 'supplies' | 'other';
  description: string;
  amount: number;
  date: Date;
  responsibleId: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  communalFund: number;
}

export interface AppointmentRecord {
  id: string;
  title: string;
  kind: AppointmentKind;
  status: AppointmentStatus;
  coverageType?: 'obra social' | 'particular';
  type?: AppointmentKind;
  professionalId?: string;
  proId?: string;
  roomId?: string;
  patient?: string;
  notes?: string;
  date: string;
  start: string;
  end: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'weekdays';
  selectedDays?: number[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
