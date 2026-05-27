import { DateTime } from 'luxon';

import { getWorkPeriods, type WorkPeriod } from '../utils/date-utils.js';
import type {
  ReflowInput,
  ReflowResult,
  ScheduleChange,
  Shift,
  MaintenanceWindow,
  WorkOrderData,
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

function workPeriodsCacheKey(data: WorkOrderData): string {
  return `${data.startDate}|${data.endDate}|${data.durationMinutes}`;
}

function getWorkOrderPeriods(
  workOrder: WorkOrderDocument,
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[],
  periodsCache: Map<string, { key: string; periods: WorkPeriod[] }>,
): WorkPeriod[] {
  const cacheKey = workPeriodsCacheKey(workOrder.data);
  const cached = periodsCache.get(workOrder.docId);

  if (cached?.key === cacheKey) {
    return cached.periods;
  }

  const periods = getWorkPeriods(
    workOrder.data.startDate,
    workOrder.data.durationMinutes,
    shifts,
    maintenanceWindows,
  );
  periodsCache.set(workOrder.docId, { key: cacheKey, periods });

  return periods;
}

function getWorkOrderReleaseTime(
  workOrder: WorkOrderDocument,
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[],
  periodsCache: Map<string, { key: string; periods: WorkPeriod[] }>,
): string {
  const periods = getWorkOrderPeriods(
    workOrder,
    shifts,
    maintenanceWindows,
    periodsCache,
  );

  if (periods.length === 0) {
    return workOrder.data.endDate;
  }

  return periods.at(-1)!.endDate;
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

function workPeriodListsOverlap(
  firstPeriods: WorkPeriod[],
  secondPeriods: WorkPeriod[],
): boolean {
  for (const first of firstPeriods) {
    for (const second of secondPeriods) {
      if (
        intervalsOverlap(
          first.startDate,
          first.endDate,
          second.startDate,
          second.endDate,
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function scheduleFromStart(
  candidateStart: string,
  durationMinutes: number,
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[],
): { startDate: string; endDate: string; periods: WorkPeriod[] } {
  const periods = getWorkPeriods(
    candidateStart,
    durationMinutes,
    shifts,
    maintenanceWindows,
  );

  if (periods.length === 0) {
    return { startDate: candidateStart, endDate: candidateStart, periods };
  }

  return {
    startDate: periods[0]!.startDate,
    endDate: periods.at(-1)!.endDate,
    periods,
  };
}

function buildWorkOrdersByCenter(
  workOrders: WorkOrderDocument[],
): Map<string, WorkOrderDocument[]> {
  const workOrdersByCenter = new Map<string, WorkOrderDocument[]>();

  for (const workOrder of workOrders) {
    const centerOrders = workOrdersByCenter.get(workOrder.data.workCenterId) ?? [];
    centerOrders.push(workOrder);
    workOrdersByCenter.set(workOrder.data.workCenterId, centerOrders);
  }

  return workOrdersByCenter;
}

function sortProductionOrdersByDependency(
  productionOrders: WorkOrderDocument[],
): WorkOrderDocument[] {
  const productionIds = new Set(productionOrders.map((order) => order.docId));
  const ordersById = new Map(
    productionOrders.map((order) => [order.docId, order]),
  );
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const order of productionOrders) {
    inDegree.set(order.docId, 0);
    dependents.set(order.docId, []);
  }

  for (const order of productionOrders) {
    for (const parentId of order.data.dependsOnWorkOrderIds) {
      if (!productionIds.has(parentId)) {
        continue;
      }

      inDegree.set(order.docId, (inDegree.get(order.docId) ?? 0) + 1);
      dependents.get(parentId)!.push(order.docId);
    }
  }

  const ready = productionOrders
    .filter((order) => inDegree.get(order.docId) === 0)
    .sort((a, b) => a.docId.localeCompare(b.docId));

  const sorted: WorkOrderDocument[] = [];

  while (ready.length > 0) {
    ready.sort((a, b) => a.docId.localeCompare(b.docId));
    const current = ready.shift()!;

    sorted.push(current);

    for (const childId of dependents.get(current.docId) ?? []) {
      const nextInDegree = (inDegree.get(childId) ?? 0) - 1;
      inDegree.set(childId, nextInDegree);

      if (nextInDegree === 0) {
        ready.push(ordersById.get(childId)!);
      }
    }
  }

  if (sorted.length !== productionOrders.length) {
    throw new Error('Circular dependency detected between production work orders');
  }

  return sorted;
}

function buildDependentsByParent(
  productionIds: Set<string>,
  workOrdersById: Map<string, WorkOrderDocument>,
): Map<string, string[]> {
  const dependentsByParent = new Map<string, string[]>();

  for (const orderId of productionIds) {
    dependentsByParent.set(orderId, []);
  }

  for (const orderId of productionIds) {
    const order = workOrdersById.get(orderId);
    if (!order) {
      continue;
    }

    for (const parentId of order.data.dependsOnWorkOrderIds) {
      if (!productionIds.has(parentId)) {
        continue;
      }

      dependentsByParent.get(parentId)!.push(orderId);
    }
  }

  for (const children of dependentsByParent.values()) {
    children.sort((a, b) => a.localeCompare(b));
  }

  return dependentsByParent;
}

/** Returns null when trigger-aware scope cannot be determined safely. */
function buildAffectedWorkOrderIds(
  triggerWorkOrderId: string,
  workOrdersById: Map<string, WorkOrderDocument>,
  productionIds: Set<string>,
  dependentsByParent: Map<string, string[]>,
): Set<string> | null {
  const trigger = workOrdersById.get(triggerWorkOrderId);
  if (!trigger || trigger.data.isMaintenance || !productionIds.has(triggerWorkOrderId)) {
    return null;
  }

  const affected = new Set<string>([triggerWorkOrderId]);
  let changed = true;

  while (changed) {
    changed = false;
    const snapshot = [...affected].sort((a, b) => a.localeCompare(b));

    for (const orderId of snapshot) {
      const order = workOrdersById.get(orderId);
      if (!order) {
        return null;
      }

      const ancestorQueue = [orderId];
      while (ancestorQueue.length > 0) {
        const currentId = ancestorQueue.shift()!;
        const current = workOrdersById.get(currentId);
        if (!current) {
          return null;
        }

        for (const parentId of current.data.dependsOnWorkOrderIds) {
          if (!productionIds.has(parentId)) {
            continue;
          }

          if (!affected.has(parentId)) {
            affected.add(parentId);
            changed = true;
          }

          ancestorQueue.push(parentId);
        }
      }

      const queue = [orderId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        for (const childId of dependentsByParent.get(currentId) ?? []) {
          if (affected.has(childId)) {
            continue;
          }

          affected.add(childId);
          changed = true;
          queue.push(childId);
        }
      }

      const workCenterId = order.data.workCenterId;
      for (const candidateId of [...productionIds].sort((a, b) => a.localeCompare(b))) {
        if (affected.has(candidateId)) {
          continue;
        }

        const candidate = workOrdersById.get(candidateId);
        if (!candidate || candidate.data.workCenterId !== workCenterId) {
          continue;
        }

        affected.add(candidateId);
        changed = true;
      }
    }
  }

  return affected;
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
  scheduledPeriods: WorkPeriod[],
  workOrderId: string,
  sameCenterOrders: WorkOrderDocument[],
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[],
  periodsCache: Map<string, { key: string; periods: WorkPeriod[] }>,
): WorkOrderDocument | null {
  let latestConflict: WorkOrderDocument | null = null;
  let latestConflictEnd: DateTime | null = null;

  for (const other of sameCenterOrders) {
    if (other.docId === workOrderId) {
      continue;
    }

    const otherPeriods = getWorkOrderPeriods(
      other,
      shifts,
      maintenanceWindows,
      periodsCache,
    );

    if (!workPeriodListsOverlap(scheduledPeriods, otherPeriods)) {
      continue;
    }

    const otherRelease = parseUtc(
      getWorkOrderReleaseTime(other, shifts, maintenanceWindows, periodsCache),
    );
    if (!latestConflictEnd || otherRelease >= latestConflictEnd) {
      latestConflictEnd = otherRelease;
      latestConflict = other;
    }
  }

  return latestConflict;
}

function placeWorkOrder(
  workOrder: WorkOrderDocument,
  sameCenterOrders: WorkOrderDocument[],
  shifts: Shift[],
  maintenanceWindows: MaintenanceWindow[],
  workOrdersById: Map<string, WorkOrderDocument>,
  periodsCache: Map<string, { key: string; periods: WorkPeriod[] }>,
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

    const schedule = scheduleFromStart(
      candidateStart,
      workOrder.data.durationMinutes,
      shifts,
      maintenanceWindows,
    );

    const conflict = findWorkCenterConflict(
      schedule.periods,
      workOrder.docId,
      sameCenterOrders,
      shifts,
      maintenanceWindows,
      periodsCache,
    );

    if (conflict) {
      candidateStart = getWorkOrderReleaseTime(
        conflict,
        shifts,
        maintenanceWindows,
        periodsCache,
      );
      reason = `Delayed by work center conflict with ${conflict.docId}`;
      continue;
    }

    return {
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      reason,
    };
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
  const workOrdersByCenter = buildWorkOrdersByCenter(workOrders);
  const periodsCache = new Map<string, { key: string; periods: WorkPeriod[] }>();

  const originalDates = new Map(
    input.workOrders.map((workOrder) => [
      workOrder.docId,
      {
        startDate: workOrder.data.startDate,
        endDate: workOrder.data.endDate,
      },
    ]),
  );

  const productionOrders = sortProductionOrdersByDependency(
    workOrders.filter((workOrder) => !workOrder.data.isMaintenance),
  );
  const productionIds = new Set(productionOrders.map((order) => order.docId));
  const dependentsByParent = buildDependentsByParent(productionIds, workOrdersById);
  const affectedWorkOrderIds = buildAffectedWorkOrderIds(
    input.triggerWorkOrderId,
    workOrdersById,
    productionIds,
    dependentsByParent,
  );
  const useTriggerAwareReflow = affectedWorkOrderIds !== null;

  const reasons = new Map<string, string>();
  let changed = true;

  for (let pass = 0; changed && pass < MAX_OUTER_PASSES; pass++) {
    changed = false;

    for (const workOrder of productionOrders) {
      if (useTriggerAwareReflow && !affectedWorkOrderIds.has(workOrder.docId)) {
        continue;
      }

      const workCenter = workCentersById.get(workOrder.data.workCenterId);
      if (!workCenter) {
        throw new Error(`Missing work center: ${workOrder.data.workCenterId}`);
      }

      const sameCenterOrders =
        workOrdersByCenter.get(workOrder.data.workCenterId) ?? [];

      const placement = placeWorkOrder(
        workOrder,
        sameCenterOrders,
        workCenter.shifts,
        workCenter.maintenanceWindows,
        workOrdersById,
        periodsCache,
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
