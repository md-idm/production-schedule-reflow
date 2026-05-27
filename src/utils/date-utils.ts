import { DateTime } from 'luxon';

import type { MaintenanceWindow, Shift } from '../reflow/types.js';

const UTC = 'utc';

function parseUtc(iso: string): DateTime {
  const date = DateTime.fromISO(iso, { zone: UTC });

  if (!date.isValid) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }

  return date;
}

/** Assignment uses 0 = Sunday; Luxon uses 7 = Sunday. */
function matchesDayOfWeek(date: DateTime, dayOfWeek: number): boolean {
  const luxonWeekday = dayOfWeek === 0 ? 7 : dayOfWeek;
  return date.weekday === luxonWeekday;
}

function minutesFromDayStart(date: DateTime): number {
  return date.hour * 60 + date.minute + date.second / 60;
}

function isWithinShift(date: DateTime, shift: Shift): boolean {
  if (!matchesDayOfWeek(date, shift.dayOfWeek)) {
    return false;
  }

  const minutes = minutesFromDayStart(date);
  return minutes >= shift.startHour * 60 && minutes < shift.endHour * 60;
}

function getShiftEnd(date: DateTime, shift: Shift): DateTime {
  return date.startOf('day').plus({ hours: shift.endHour });
}

function findActiveShift(date: DateTime, shifts: Shift[]): Shift | undefined {
  return shifts.find((shift) => isWithinShift(date, shift));
}

function findActiveMaintenance(
  date: DateTime,
  maintenanceWindows: MaintenanceWindow[],
): MaintenanceWindow | undefined {
  return maintenanceWindows.find((window) => {
    const start = parseUtc(window.startDate);
    const end = parseUtc(window.endDate);
    return date >= start && date < end;
  });
}

/** Next shift start at or after the given moment. */
function findNextShiftStart(date: DateTime, shifts: Shift[]): DateTime {
  if (shifts.length === 0) {
    throw new Error('No shifts configured');
  }

  // Search day by day until the next valid shift start is found.
  for (let dayOffset = 0; dayOffset < 366; dayOffset++) {
    const day = date.plus({ days: dayOffset }).startOf('day');
    const dayOfWeek = day.weekday === 7 ? 0 : day.weekday;

    const dayShifts = shifts
      .filter((shift) => shift.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startHour - b.startHour);

    for (const shift of dayShifts) {
      const shiftStart = day.plus({ hours: shift.startHour });
      if (shiftStart >= date) {
        return shiftStart;
      }
    }
  }

  throw new Error('No upcoming shift found within one year');
}

/** Earliest maintenance start between date (inclusive) and limit (exclusive). */
function findNextMaintenanceStart(
  date: DateTime,
  limit: DateTime,
  maintenanceWindows: MaintenanceWindow[],
): DateTime | undefined {
  let nearest: DateTime | undefined;

  for (const window of maintenanceWindows) {
    const start = parseUtc(window.startDate);
    if (start >= date && start < limit && (!nearest || start < nearest)) {
      nearest = start;
    }
  }

  return nearest;
}

function assertValidShifts(shifts: Shift[]): void {
  for (const shift of shifts) {
    if (shift.endHour <= shift.startHour) {
      throw new Error(
        `Invalid shift: endHour (${shift.endHour}) must be greater than startHour (${shift.startHour})`,
      );
    }
  }
}

export interface WorkPeriod {
  startDate: string;
  endDate: string;
}

/** Returns true when the given moment falls inside an active shift. */
export function isDateInActiveShift(dateIso: string, shifts: Shift[]): boolean {
  return findActiveShift(parseUtc(dateIso), shifts) !== undefined;
}

/**
 * Returns each continuous work segment while consuming duration during active shifts
 * and skipping maintenance windows.
 */
export function getWorkPeriods(
  startDate: string,
  durationMinutes: number,
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[] = [],
): WorkPeriod[] {
  if (!Number.isFinite(durationMinutes)) {
    throw new Error('durationMinutes must be a finite number');
  }

  assertValidShifts(shifts);

  if (durationMinutes <= 0) {
    return [];
  }

  const periods: WorkPeriod[] = [];
  let current = parseUtc(startDate);
  let remainingMinutes = durationMinutes;
  let chunkStart: DateTime | null = null;

  while (remainingMinutes > 0) {
    const activeMaintenance = findActiveMaintenance(current, maintenanceWindows);
    if (activeMaintenance) {
      if (chunkStart) {
        periods.push({ startDate: chunkStart.toISO()!, endDate: current.toISO()! });
        chunkStart = null;
      }
      current = parseUtc(activeMaintenance.endDate);
      continue;
    }

    const activeShift = findActiveShift(current, shifts);
    if (!activeShift) {
      if (chunkStart) {
        periods.push({ startDate: chunkStart.toISO()!, endDate: current.toISO()! });
        chunkStart = null;
      }
      current = findNextShiftStart(current, shifts);
      continue;
    }

    if (!chunkStart) {
      chunkStart = current;
    }

    const shiftEnd = getShiftEnd(current, activeShift);
    let workUntil = shiftEnd;

    const maintenanceStart = findNextMaintenanceStart(current, shiftEnd, maintenanceWindows);
    if (maintenanceStart) {
      workUntil = maintenanceStart;
    }

    const availableMinutes = workUntil.diff(current, 'minutes').minutes;
    if (availableMinutes <= 0) {
      if (chunkStart) {
        periods.push({ startDate: chunkStart.toISO()!, endDate: current.toISO()! });
        chunkStart = null;
      }
      current = findNextShiftStart(current.plus({ minutes: 1 }), shifts);
      continue;
    }

    const workedMinutes = Math.min(remainingMinutes, availableMinutes);
    remainingMinutes -= workedMinutes;
    current = current.plus({ minutes: workedMinutes });

    if (remainingMinutes === 0 || workedMinutes < availableMinutes) {
      periods.push({ startDate: chunkStart.toISO()!, endDate: current.toISO()! });
      chunkStart = null;
    }
  }

  return periods;
}

/**
 * Calculates when work finishes by consuming duration only during active shifts,
 * pausing outside shift hours and skipping maintenance windows.
 */
export function calculateEndDateWithShifts(
  startDate: string,
  durationMinutes: number,
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[] = [],
): string {
  if (!Number.isFinite(durationMinutes)) {
    throw new Error('durationMinutes must be a finite number');
  }

  assertValidShifts(shifts);

  if (durationMinutes <= 0) {
    return parseUtc(startDate).toISO()!;
  }

  const periods = getWorkPeriods(startDate, durationMinutes, shifts, maintenanceWindows);
  return periods.at(-1)?.endDate ?? parseUtc(startDate).toISO()!;
}
