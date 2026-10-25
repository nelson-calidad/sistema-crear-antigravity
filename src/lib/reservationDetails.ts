import type { AppointmentRecord } from '../types';

export type ReservationPurpose = 'block' | 'session' | 'interview' | 'talk' | 'other';

export function reservationPurpose(record?: AppointmentRecord | null): ReservationPurpose {
  if (!record) return 'block';
  const kind = record.kind || record.type;
  if (kind === 'session' || kind === 'interview') return kind;
  if (/^Charla(?: — |$)/.test(record.title)) return 'talk';
  if (record.title && !record.title.startsWith('Reserva de consultorio')) return 'other';
  return 'block';
}

export function reservationDetail(record?: AppointmentRecord | null): string {
  if (!record) return '';
  const purpose = reservationPurpose(record);
  if (purpose === 'session' || purpose === 'interview') return record.patient || '';
  if (purpose === 'talk') return record.title.replace(/^Charla(?: — )?/, '');
  if (purpose === 'other') return record.title;
  return record.patient || '';
}

export function reservationDetails(purpose: ReservationPurpose, detail: string, patientId = ''): Pick<AppointmentRecord, 'kind' | 'type' | 'title' | 'patient' | 'patientId'> {
  const name = detail.trim();
  const kind = purpose === 'session' || purpose === 'interview' ? purpose : 'block';
  const title = purpose === 'talk' ? `Charla${name ? ` — ${name}` : ''}`
    : purpose === 'interview' ? `Entrevista${name ? ` — ${name}` : ''}`
    : purpose === 'session' ? name || 'Atención a paciente'
    : name || 'Reserva de consultorio';
  return {
    kind, type: kind, title,
    patient: kind === 'block' ? '' : name,
    patientId: kind === 'block' ? '' : patientId,
  };
}
