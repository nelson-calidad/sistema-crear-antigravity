import test from 'node:test';
import assert from 'node:assert/strict';
import { conflictOnDate, occursOn, type Slot } from './scheduling.ts';
import { agendaColumnId } from './agendaColumns.ts';
import type { AppointmentRecord } from '../types';

const externalRental: AppointmentRecord = {
  id: 'external-rental', title: 'Subalquiler externo', date: '2026-10-26', start: '10:00', end: '11:00',
  roomId: 'c1', professionalId: '', proId: '', kind: 'block', status: 'confirmed',
};
const agendaProfessionals = [{ id: 'dana' }];
const agendaRooms = [{ id: 'c1' }, { id: 'c2' }];

test('alquiler externo sin profesional conserva su columna tras serializar el registro', () => {
  for (const rental of [externalRental, JSON.parse(JSON.stringify(externalRental))]) {
    assert.equal(agendaColumnId(rental, 'professionals', agendaProfessionals), 'unassigned');
    assert.equal(agendaColumnId(rental, 'rooms', agendaRooms), 'c1');
  }
});

test('cada reserva tiene una columna aunque falte su recurso en el catálogo', () => {
  assert.equal(agendaColumnId({ ...externalRental, professionalId: 'dana' }, 'professionals', agendaProfessionals), 'dana');
  assert.equal(agendaColumnId({ ...externalRental, proId: 'dana' }, 'professionals', agendaProfessionals), 'dana');
  assert.equal(agendaColumnId({ ...externalRental, professionalId: 'retirada' }, 'professionals', agendaProfessionals), 'unassigned');
  assert.equal(agendaColumnId({ ...externalRental, roomId: '' }, 'rooms', agendaRooms), 'unassigned');
});

test('alquiler externo bloquea el consultorio y su cancelación libera el horario', () => {
  const rental = externalRental as Slot;
  const session: Slot = { ...rental, id: 'session', kind: 'session', professionalId: 'dana' };
  assert.equal(conflictOnDate(session, [rental], rental.date)?.id, rental.id);
  assert.equal(conflictOnDate({ ...session, roomId: 'c2' }, [rental], rental.date), undefined);
  assert.equal(conflictOnDate(session, [{ ...rental, status: 'cancelled' }], rental.date), undefined);
});

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
