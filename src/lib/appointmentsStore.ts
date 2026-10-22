import type { AppointmentRecord } from '../types';
import { getSession } from './session';
import {
  bookAppointmentInSheets,
  cancelAppointmentInSheets,
  fetchAppointmentsFromSheets,
  subscribeToSheetsAppointments,
  type SyncFeedbackCallbacks,
} from './googleSheetsService';

export const refreshAppointments = fetchAppointmentsFromSheets;
export const forceRefreshAppointments = fetchAppointmentsFromSheets;
export const getBackendLabel = () => 'Google Sheets · En línea';
export const getSessionUser = () => ({
  uid: getSession()?.actor.email || 'admin@crear.com',
  displayName: getSession()?.actor.name || getSession()?.actor.email || 'Admin CREAR',
  photoURL: '',
});
export const signInWithGoogle = async () => getSessionUser();
export const logout = async () => undefined;

export function subscribeToAppointments(
  callback: (rows: AppointmentRecord[]) => void,
  onError?: (error: unknown) => void
) {
  return subscribeToSheetsAppointments(
    callback,
    onError ? (err) => onError(err) : undefined
  );
}

export async function saveAppointment(
  data: Partial<AppointmentRecord>,
  id?: string,
  callbacks?: SyncFeedbackCallbacks
) {
  await bookAppointmentInSheets(
    {
      ...data,
      id: id || data.id,
    },
    callbacks
  );
}

export async function deleteAppointment(id: string) {
  await cancelAppointmentInSheets(id);
}
