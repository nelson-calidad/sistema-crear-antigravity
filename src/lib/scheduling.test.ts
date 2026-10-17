import test from 'node:test';
import assert from 'node:assert/strict';
import { conflictOnDate, occursOn, type Slot } from './scheduling.ts';

const base: Slot = { id: 'a', date: '2026-10-15', start: '14:00', end: '20:00', roomId: 'c1', professionalId: 'dana', status: 'confirmed', recurrence: 'weekly', selectedDays: [4], kind: 'block' };
test('reserva semanal con excepción', () => {
  assert.equal(occursOn(base, '2026-10-22'), true);
  assert.equal(occursOn({ ...base, excludedDates: ['2026-10-22'] }, '2026-10-22'), false);
  assert.equal(occursOn(base, '2026-10-23'), false);
});
test('conflictos de consultorio y profesional', () => {
  assert.equal(conflictOnDate({ ...base, id: 'b', professionalId: 'romy' }, [base], '2026-10-22')?.id, 'a');
  assert.equal(conflictOnDate({ ...base, id: 'b', roomId: 'c2' }, [base], '2026-10-22')?.id, 'a');
  assert.equal(conflictOnDate({ ...base, id: 'b', start: '20:00', end: '21:00' }, [base], '2026-10-22'), undefined);
  assert.equal(conflictOnDate({ ...base, id: 'b', kind: 'session', start: '15:00', end: '15:45' }, [base], '2026-10-22'), undefined);
});
