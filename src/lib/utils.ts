/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isSameDay, isAfter, isBefore, getDay } from 'date-fns';
import { AppointmentRecord } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const parseDay = (value?: string | Date | null) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split('/').map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function isAppointmentActiveOnDate(appointment: AppointmentRecord, targetDate: Date): boolean {
  const start = parseDay(appointment.date);
  if (!start) return false;

  // Ensure targetDate is at 00:00:00 for comparison
  const d = new Date(targetDate);
  d.setHours(0, 0, 0, 0);
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);

  // Check excluded dates
  const dateStr = targetDate.toISOString().split('T')[0];
  if (appointment.excludedDates?.includes(dateStr)) {
    return false;
  }

  // Before start date?
  if (d < s) return false;

  // After untilDate?
  if (appointment.untilDate) {
    const until = parseDay(appointment.untilDate);
    if (until) {
      const u = new Date(until);
      u.setHours(0, 0, 0, 0);
      if (d > u) return false;
    }
  }

  // ALWAYS show on the exact start date, regardless of recurrence rule!
  if (isSameDay(s, d)) return true;

  const rec = appointment.recurrence || 'none';

  if (rec === 'none') {
    return isSameDay(s, d);
  }

  if (rec === 'daily') {
    return true;
  }

  if (rec === 'weekdays') {
    const day = getDay(d); // 0 (Sun) to 6 (Sat)
    return day >= 1 && day <= 5;
  }

  if (rec === 'weekly') {
    const day = getDay(d);
    return appointment.selectedDays?.includes(day) ?? false;
  }

  return false;
}
