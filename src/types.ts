/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'admin' | 'professional' | 'secretary';
export type AppointmentKind = 'session' | 'interview' | 'block';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'waiting' | 'in-session' | 'completed' | 'cancelled';
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
  dni?: string;
  healthInsurance?: string;
  plan?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  notes?: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export type PatientRecord = Patient;

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
  patientPhone?: string;
  notes?: string;
  date: string;
  start: string;
  end: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'weekdays';
  selectedDays?: number[];
  untilDate?: string;
  excludedDates?: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ActivityStatus = 'Sin asignar' | 'Pendiente' | 'En proceso' | 'Bloqueada' | 'Completada' | 'No cumplida' | 'Cancelada';
export type ActivityPriority = 'Baja' | 'Media' | 'Alta' | 'Urgente';

export interface FounderRecord {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  role: string;
  order: number;
  active: boolean;
  createdAt?: string;
  notes?: string;
}

export interface ActivityPeriod {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  targetPoints: number;
  status: 'Borrador' | 'Activo' | 'En revisión' | 'Cerrado';
  closedAt?: string;
  closedBy?: string;
  notes?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface ActivityRecord {
  id: string;
  periodId: string;
  category: string;
  title: string;
  description?: string;
  expectedResult?: string;
  responsibleId?: string;
  collaboratorIds: string[];
  startDate?: string;
  dueDate?: string;
  points: number;
  priority: ActivityPriority;
  status: ActivityStatus;
  progress: number;
  complianceFactor: number;
  pointsObtained: number;
  evidence?: string;
  notes?: string;
  boardOrder: number;
  createdBy?: string;
  createdAt?: string;
  modifiedBy?: string;
  modifiedAt?: string;
  finishedAt?: string;
  active: boolean;
}

export interface ActivityHistoryRecord {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  activityId: string;
  field: string;
  previousValue: string;
  newValue: string;
  reason?: string;
}
