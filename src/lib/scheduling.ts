export type Slot = { id: string; date: string; start: string; end: string; roomId: string; professionalId: string; status: string; recurrence?: 'none' | 'daily' | 'weekly' | 'weekdays'; selectedDays?: number[]; untilDate?: string; excludedDates?: string[]; kind?: string };
export function occursOn(slot: Slot, date: string): boolean {
  if (date < slot.date || slot.untilDate && date > slot.untilDate || slot.excludedDates?.includes(date)) return false;
  if (date === slot.date) return true;
  const day = new Date(`${date}T12:00:00`).getDay();
  return slot.recurrence === 'daily' || slot.recurrence === 'weekdays' && day >= 1 && day <= 5 || slot.recurrence === 'weekly' && Boolean(slot.selectedDays?.includes(day));
}
export function overlaps(a: Slot, b: Slot): boolean { return a.start < b.end && b.start < a.end; }
export function conflictOnDate(candidate: Slot, slots: Slot[], date: string): Slot | undefined {
  if (candidate.start >= candidate.end) throw new Error('La hora de finalización debe ser posterior al inicio.');
  return slots.find(slot => slot.id !== candidate.id && slot.status !== 'cancelled' && slot.status !== 'cancelada' && occursOn(slot, date) && overlaps(candidate, slot) && (candidate.roomId === slot.roomId || Boolean(candidate.professionalId && candidate.professionalId === slot.professionalId)) && !(candidate.professionalId === slot.professionalId && candidate.roomId === slot.roomId && ((candidate.kind === 'block' && slot.kind !== 'block') || (slot.kind === 'block' && candidate.kind !== 'block'))));
}
