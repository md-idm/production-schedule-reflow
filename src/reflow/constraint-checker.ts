import { DateTime } from 'luxon';

import {
  calculateEndDateWithShifts,
  getWorkPeriods,
  isDateInActiveShift,
} from '../utils/date-utils.js';
import type {
  MaintenanceWindow,
  Shift,
  WorkOrderData,
  WorkOrderDocument,
} from './types.js';

const UTC = 'utc';

function parseUtc(iso: string): DateTime {
  const date = DateTime.fromISO(iso, { zone: UTC });

  if (!date.isValid) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }

  return date;
}

function hasSameTimestamp(isoA: string, isoB: string): boolean {
  return parseUtc(isoA).toMillis() === parseUtc(isoB).toMillis();
}

/** Half-open interval overlap: [startA, endA) and [startB, endB). */
function intervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const aStart = parseUtc(startA);
  const aEnd = parseUtc(endA);
  const bStart = parseUtc(startB);
  const bEnd = parseUtc(endB);

  return aStart < bEnd && bStart < aEnd;
}

function workPeriodsOverlap(
  first: WorkOrderData,
  second: WorkOrderData,
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[],
): boolean {
  const firstPeriods = getWorkPeriods(
    first.startDate,
    first.durationMinutes,
    shifts,
    maintenanceWindows,
  );
  const secondPeriods = getWorkPeriods(
    second.startDate,
    second.durationMinutes,
    shifts,
    maintenanceWindows,
  );

  for (const a of firstPeriods) {
    for (const b of secondPeriods) {
      if (intervalsOverlap(a.startDate, a.endDate, b.startDate, b.endDate)) {
        return true;
      }
    }
  }

  return false;
}

export function satisfiesDependencies(
  workOrder: WorkOrderDocument,
  workOrdersById: Map<string, WorkOrderDocument>,
): boolean {
  return getDependencyViolation(workOrder, workOrdersById) === null;
}

/** Child work order cannot start before all parent work orders finish. */
export function getDependencyViolation(
  workOrder: WorkOrderDocument,
  workOrdersById: Map<string, WorkOrderDocument>,
): string | null {
  const childStart = parseUtc(workOrder.data.startDate);

  for (const parentId of workOrder.data.dependsOnWorkOrderIds) {
    const parent = workOrdersById.get(parentId);
    if (!parent) {
      return `Missing parent work order: ${parentId}`;
    }

    const parentEnd = parseUtc(parent.data.endDate);
    if (childStart < parentEnd) {
      return `Work order ${workOrder.docId} starts before parent ${parentId} finishes`;
    }
  }

  return null;
}

export function hasWorkCenterOverlap(
  workOrder: WorkOrderDocument,
  otherWorkOrder: WorkOrderDocument,
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[] = [],
): boolean {
  if (workOrder.docId === otherWorkOrder.docId) {
    return false;
  }

  if (workOrder.data.workCenterId !== otherWorkOrder.data.workCenterId) {
    return false;
  }

  return workPeriodsOverlap(
    workOrder.data,
    otherWorkOrder.data,
    shifts,
    maintenanceWindows,
  );
}

export function getWorkCenterOverlapViolation(
  workOrder: WorkOrderDocument,
  otherWorkOrders: WorkOrderDocument[],
  workCentersById: Map<string, { shifts: Shift[]; maintenanceWindows: MaintenanceWindow[] }>,
): string | null {
  const workCenter = workCentersById.get(workOrder.data.workCenterId);
  if (!workCenter) {
    return `Missing work center: ${workOrder.data.workCenterId}`;
  }

  for (const other of otherWorkOrders) {
    if (!hasWorkCenterOverlap(workOrder, other, workCenter.shifts, workCenter.maintenanceWindows)) {
      continue;
    }

    return `Work order ${workOrder.docId} overlaps with ${other.docId} on work center ${workOrder.data.workCenterId}`;
  }

  return null;
}

export function overlapsMaintenance(
  workOrder: WorkOrderDocument,
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[],
): boolean {
  return getMaintenanceViolation(workOrder, shifts, maintenanceWindows) !== null;
}

export function getMaintenanceViolation(
  workOrder: WorkOrderDocument,
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[],
): string | null {
  const { startDate, endDate, durationMinutes } = workOrder.data;
  const start = parseUtc(startDate);

  for (const window of maintenanceWindows) {
    const windowStart = parseUtc(window.startDate);
    const windowEnd = parseUtc(window.endDate);

    if (start >= windowStart && start < windowEnd) {
      return `Work order ${workOrder.docId} starts during maintenance window (${window.startDate} - ${window.endDate})`;
    }
  }

  const expectedEndDate = calculateEndDateWithShifts(
    startDate,
    durationMinutes,
    shifts,
    maintenanceWindows,
  );
  if (!hasSameTimestamp(endDate, expectedEndDate)) {
    return `Work order ${workOrder.docId} end date does not account for maintenance windows`;
  }

  const workPeriods = getWorkPeriods(
    startDate,
    durationMinutes,
    shifts,
    maintenanceWindows,
  );

  for (const period of workPeriods) {
    for (const window of maintenanceWindows) {
      if (intervalsOverlap(period.startDate, period.endDate, window.startDate, window.endDate)) {
        return `Work order ${workOrder.docId} overlaps maintenance window (${window.startDate} - ${window.endDate})`;
      }
    }
  }

  return null;
}

export function satisfiesShiftConstraints(
  workOrder: WorkOrderDocument,
  shifts: Shift[],
): boolean {
  return getShiftViolation(workOrder, shifts) === null;
}

export function getShiftViolation(
  workOrder: WorkOrderDocument,
  shifts: Shift[],
): string | null {
  const { startDate, endDate, durationMinutes } = workOrder.data;

  if (!isDateInActiveShift(startDate, shifts)) {
    return `Work order ${workOrder.docId} starts outside shift hours`;
  }

  const workPeriods = getWorkPeriods(startDate, durationMinutes, shifts);
  for (const period of workPeriods) {
    if (!isDateInActiveShift(period.startDate, shifts)) {
      return `Work order ${workOrder.docId} has work outside shift hours`;
    }
  }

  const expectedEndDate = calculateEndDateWithShifts(startDate, durationMinutes, shifts);
  if (!hasSameTimestamp(endDate, expectedEndDate)) {
    return `Work order ${workOrder.docId} end date does not match shift schedule`;
  }

  return null;
}
