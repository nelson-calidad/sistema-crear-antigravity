import type { AppointmentRecord } from '../types';

export function agendaColumnId(
  appointment: AppointmentRecord,
  view: 'professionals' | 'rooms',
  resources: readonly { id: string }[],
): string {
  const id = view === 'professionals'
    ? appointment.professionalId || appointment.proId
    : appointment.roomId;
  return id && resources.some(resource => resource.id === id) ? id : 'unassigned';
}
