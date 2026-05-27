import { DateTime } from 'luxon';

import { calculateEndDateWithShifts, getWorkPeriods } from '../utils/date-utils.js';
import { hasWorkCenterOverlap } from './constraint-checker.js';
import type {
  ReflowInput,
  ReflowResult,
  ScheduleChange,
  Shift,
  MaintenanceWindow,
  WorkOrderDocument,
} from './types.js';

const UTC = 'utc';
const MAX_OUTER_PASSES = 100;
const MAX_PLACEMENT_STEPS = 100;

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

function copyWorkOrder(workOrder: WorkOrderDocument): WorkOrderDocument {
  return {
    docId: workOrder.docId,
    docType: workOrder.docType,
    data: {
      ...workOrder.data,
      dependsOnWorkOrderIds: [...workOrder.data.dependsOnWorkOrderIds],
    },
  };
}

function scheduleFromStart(
  candidateStart: string,
  durationMinutes: number,
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[],
): { startDate: string; endDate: string } {
  const periods = getWorkPeriods(
    candidateStart,
    durationMinutes,
    shifts,
    maintenanceWindows,
  );

  if (periods.length === 0) {
    return { startDate: candidateStart, endDate: candidateStart };
  }

  return {
    startDate: periods[0]!.startDate,
    endDate: periods.at(-1)!.endDate,
  };
}

function findLatestDependencyEnd(
  workOrder: WorkOrderDocument,
  workOrdersById: Map<string, WorkOrderDocument>,
): { endDate: string; parentId: string } | null {
  let latestEnd: DateTime | null = null;
  let latestParentId: string | null = null;

  for (const parentId of workOrder.data.dependsOnWorkOrderIds) {
    const parent = workOrdersById.get(parentId);
    if (!parent) {
      throw new Error(`Missing parent work order: ${parentId}`);
    }

    const parentEnd = parseUtc(parent.data.endDate);
    if (!latestEnd || parentEnd > latestEnd) {
      latestEnd = parentEnd;
      latestParentId = parentId;
    }
  }

  if (!latestEnd || !latestParentId) {
    return null;
  }

  return { endDate: latestEnd.toISO()!, parentId: latestParentId };
}

function findWorkCenterConflict(
  workOrder: WorkOrderDocument,
  otherWorkOrders: WorkOrderDocument[],
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[],
): WorkOrderDocument | null {
  let latestConflict: WorkOrderDocument | null = null;
  let latestConflictEnd: DateTime | null = null;

  for (const other of otherWorkOrders) {
    if (other.data.workCenterId !== workOrder.data.workCenterId) {
      continue;
    }

    if (!hasWorkCenterOverlap(workOrder, other, shifts, maintenanceWindows)) {
      continue;
    }

    const otherEnd = parseUtc(other.data.endDate);
    if (!latestConflictEnd || otherEnd >= latestConflictEnd) {
      latestConflictEnd = otherEnd;
      latestConflict = other;
    }
  }

  return latestConflict;
}

function placeWorkOrder(
  workOrder: WorkOrderDocument,
  otherWorkOrders: WorkOrderDocument[],
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[],
  workOrdersById: Map<string, WorkOrderDocument>,
): { startDate: string; endDate: string; reason: string } {
  let candidateStart = workOrder.data.startDate;
  let reason = 'Reflow schedule update';

  for (let step = 0; step < MAX_PLACEMENT_STEPS; step++) {
    const dependency = findLatestDependencyEnd(workOrder, workOrdersById);
    if (
      dependency &&
      parseUtc(dependency.endDate) > parseUtc(candidateStart)
    ) {
      candidateStart = dependency.endDate;
      reason = `Delayed by dependency on ${dependency.parentId}`;
    }

    let schedule = scheduleFromStart(
      candidateStart,
      workOrder.data.durationMinutes,
      shifts,
      maintenanceWindows,
    );

    const scheduledOrder: WorkOrderDocument = {
      ...workOrder,
      data: {
        ...workOrder.data,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
      },
    };

    const conflict = findWorkCenterConflict(
      scheduledOrder,
      otherWorkOrders,
      shifts,
      maintenanceWindows,
    );

    if (conflict) {
      candidateStart = conflict.data.endDate;
      reason = `Delayed by work center conflict with ${conflict.docId}`;
      continue;
    }

    // Ensure end date matches shift and maintenance rules.
    schedule = {
      startDate: schedule.startDate,
      endDate: calculateEndDateWithShifts(
        schedule.startDate,
        workOrder.data.durationMinutes,
        shifts,
        maintenanceWindows,
      ),
    };

    return { ...schedule, reason };
  }

  throw new Error(
    `Could not place work order ${workOrder.docId} without conflicts`,
  );
}

export function reflowSchedule(input: ReflowInput): ReflowResult {
  const workOrders = input.workOrders.map(copyWorkOrder);
  const workOrdersById = new Map(workOrders.map((workOrder) => [workOrder.docId, workOrder]));
  const workCentersById = new Map(
    input.workCenters.map((workCenter) => [workCenter.docId, workCenter.data]),
  );

  const originalDates = new Map(
    input.workOrders.map((workOrder) => [
      workOrder.docId,
      {
        startDate: workOrder.data.startDate,
        endDate: workOrder.data.endDate,
      },
    ]),
  );

  const productionOrders = workOrders
    .filter((workOrder) => !workOrder.data.isMaintenance)
    .sort((a, b) => a.docId.localeCompare(b.docId));

  const reasons = new Map<string, string>();
  let changed = true;

  for (let pass = 0; changed && pass < MAX_OUTER_PASSES; pass++) {
    changed = false;

    for (const workOrder of productionOrders) {
      const workCenter = workCentersById.get(workOrder.data.workCenterId);
      if (!workCenter) {
        throw new Error(`Missing work center: ${workOrder.data.workCenterId}`);
      }

      const otherWorkOrders = workOrders.filter(
        (candidate) => candidate.docId !== workOrder.docId,
      );

      const placement = placeWorkOrder(
        workOrder,
        otherWorkOrders,
        workCenter.shifts,
        workCenter.maintenanceWindows,
        workOrdersById,
      );

      const datesChanged =
        !hasSameTimestamp(workOrder.data.startDate, placement.startDate) ||
        !hasSameTimestamp(workOrder.data.endDate, placement.endDate);

      if (datesChanged) {
        workOrder.data.startDate = placement.startDate;
        workOrder.data.endDate = placement.endDate;
        reasons.set(workOrder.docId, placement.reason);
        changed = true;
      }
    }
  }

  if (changed) {
    throw new Error('Reflow did not converge within the maximum number of passes');
  }

  const changes: ScheduleChange[] = [];

  for (const workOrder of productionOrders) {
    const original = originalDates.get(workOrder.docId);
    if (!original) {
      continue;
    }

    const datesChanged =
      !hasSameTimestamp(original.startDate, workOrder.data.startDate) ||
      !hasSameTimestamp(original.endDate, workOrder.data.endDate);

    if (!datesChanged) {
      continue;
    }

    changes.push({
      workOrderId: workOrder.docId,
      oldStartDate: original.startDate,
      oldEndDate: original.endDate,
      newStartDate: workOrder.data.startDate,
      newEndDate: workOrder.data.endDate,
      reason: reasons.get(workOrder.docId) ?? 'Reflow schedule update',
      delayMinutes: parseUtc(workOrder.data.startDate).diff(
        parseUtc(original.startDate),
        'minutes',
      ).minutes,
    });
  }

  return { workOrders, changes };
}
