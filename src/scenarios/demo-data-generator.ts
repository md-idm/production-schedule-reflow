import { DateTime } from 'luxon';

import { calculateEndDateWithShifts } from '../utils/date-utils.js';
import type {
  ManufacturingOrderDocument,
  ReflowInput,
  WorkCenterDocument,
  WorkOrderDocument,
} from '../reflow/types.js';
import { weekdayShifts } from './scenario-utils.js';

const UTC = 'utc';
const DEFAULT_WORK_ORDER_COUNT = 1000;
const MAX_WORK_ORDER_COUNT = 5000;
const WORK_CENTER_COUNT = 10;
const ORDERS_PER_MANUFACTURING_ORDER = 3;
const BASE_START = DateTime.fromISO('2024-01-01T08:00:00.000Z', { zone: UTC });

export interface GenerateDemoDataOptions {
  workOrderCount?: number;
}

function clampWorkOrderCount(count: number): number {
  if (!Number.isFinite(count)) {
    return DEFAULT_WORK_ORDER_COUNT;
  }

  return Math.min(MAX_WORK_ORDER_COUNT, Math.max(1, Math.floor(count)));
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

function buildWorkCenters(): WorkCenterDocument[] {
  const shifts = weekdayShifts();
  const maintenanceByCenter: Record<
    number,
    { startDate: string; endDate: string; reason: string }[]
  > = {
    1: [
      {
        startDate: '2024-01-03T10:00:00.000Z',
        endDate: '2024-01-03T14:00:00.000Z',
        reason: 'Annual inspection',
      },
    ],
    5: [
      {
        startDate: '2024-01-04T10:00:00.000Z',
        endDate: '2024-01-04T12:00:00.000Z',
        reason: 'Tool replacement',
      },
    ],
    8: [
      {
        startDate: '2024-01-02T13:00:00.000Z',
        endDate: '2024-01-02T15:00:00.000Z',
        reason: 'Calibration',
      },
    ],
  };

  return Array.from({ length: WORK_CENTER_COUNT }, (_, index) => {
    const centerNumber = index + 1;

    return {
      docId: `wc-${pad(centerNumber, 2)}`,
      docType: 'workCenter',
      data: {
        name: `Production Cell ${centerNumber}`,
        shifts,
        maintenanceWindows: maintenanceByCenter[centerNumber] ?? [],
      },
    };
  });
}

function buildManufacturingOrders(workOrderCount: number): ManufacturingOrderDocument[] {
  const manufacturingOrderCount = Math.ceil(workOrderCount / ORDERS_PER_MANUFACTURING_ORDER);

  return Array.from({ length: manufacturingOrderCount }, (_, index) => {
    const orderNumber = index + 1;

    return {
      docId: `mo-${pad(orderNumber, 5)}`,
      docType: 'manufacturingOrder',
      data: {
        manufacturingOrderNumber: `MO-${pad(orderNumber, 5)}`,
        itemId: `item-${pad((index % 50) + 1, 3)}`,
        quantity: 10 + (index % 20),
        dueDate: BASE_START.plus({ days: 7 + (index % 14) }).toISO()!,
      },
    };
  });
}

function buildWorkOrders(
  workOrderCount: number,
  workCenters: WorkCenterDocument[],
): WorkOrderDocument[] {
  const workCenterShifts = new Map(
    workCenters.map((center) => [center.docId, center.data.shifts]),
  );
  const workCenterMaintenance = new Map(
    workCenters.map((center) => [center.docId, center.data.maintenanceWindows]),
  );
  const nextStartByCenter = new Map<string, DateTime>(
    workCenters.map((center) => [center.docId, BASE_START]),
  );
  const endDateByWorkOrder = new Map<string, string>();
  const workOrders: WorkOrderDocument[] = [];

  for (let index = 0; index < workOrderCount; index++) {
    const orderNumber = index + 1;
    const docId = `wo-${pad(orderNumber, 6)}`;
    const manufacturingOrderIndex = Math.floor(index / ORDERS_PER_MANUFACTURING_ORDER);
    const manufacturingOrderId = `mo-${pad(manufacturingOrderIndex + 1, 5)}`;
    const workCenterId = `wc-${pad((index % WORK_CENTER_COUNT) + 1, 2)}`;
    const stepInChain = index % ORDERS_PER_MANUFACTURING_ORDER;
    const dependsOnWorkOrderIds =
      stepInChain === 0 ? [] : [`wo-${pad(orderNumber - 1, 6)}`];

    const durationMinutes = 60 + (index % 3) * 30;
    let candidateStart = nextStartByCenter.get(workCenterId) ?? BASE_START;

    if (dependsOnWorkOrderIds.length > 0) {
      const parentEnd = endDateByWorkOrder.get(dependsOnWorkOrderIds[0]!);
      if (parentEnd) {
        const parentEndDate = DateTime.fromISO(parentEnd, { zone: UTC });
        if (parentEndDate > candidateStart) {
          candidateStart = parentEndDate;
        }
      }
    }

    const startDate = candidateStart.toISO()!;
    const endDate = calculateEndDateWithShifts(
      startDate,
      durationMinutes,
      workCenterShifts.get(workCenterId)!,
      workCenterMaintenance.get(workCenterId),
    );

    nextStartByCenter.set(workCenterId, DateTime.fromISO(endDate, { zone: UTC }));
    endDateByWorkOrder.set(docId, endDate);

    workOrders.push({
      docId,
      docType: 'workOrder',
      data: {
        workOrderNumber: `WO-${pad(orderNumber, 6)}`,
        manufacturingOrderId,
        startDate,
        endDate,
        durationMinutes,
        workCenterId,
        dependsOnWorkOrderIds,
        isMaintenance: false,
      },
    });
  }

  return workOrders;
}

/** Applies a fixed delay to the trigger work order to start reflow propagation. */
function applyTriggerDelay(
  workOrders: WorkOrderDocument[],
  workCenters: WorkCenterDocument[],
  triggerWorkOrderId: string,
): void {
  const trigger = workOrders.find((workOrder) => workOrder.docId === triggerWorkOrderId);
  if (!trigger) {
    return;
  }

  const workCenter = workCenters.find((center) => center.docId === trigger.data.workCenterId);
  if (!workCenter) {
    return;
  }

  const delayedStart = DateTime.fromISO(trigger.data.startDate, { zone: UTC })
    .plus({ minutes: 120 })
    .toISO()!;

  trigger.data.startDate = delayedStart;
  trigger.data.endDate = calculateEndDateWithShifts(
    delayedStart,
    trigger.data.durationMinutes,
    workCenter.data.shifts,
    workCenter.data.maintenanceWindows,
  );
}

export function generateDemoReflowInput(
  options: GenerateDemoDataOptions = {},
): ReflowInput {
  const workOrderCount = clampWorkOrderCount(
    options.workOrderCount ?? DEFAULT_WORK_ORDER_COUNT,
  );
  const workCenters = buildWorkCenters();
  const workOrders = buildWorkOrders(workOrderCount, workCenters);
  const triggerWorkOrderId = 'wo-000001';

  applyTriggerDelay(workOrders, workCenters, triggerWorkOrderId);

  return {
    workCenters,
    manufacturingOrders: buildManufacturingOrders(workOrderCount),
    workOrders,
    triggerWorkOrderId,
  };
}

export { DEFAULT_WORK_ORDER_COUNT, MAX_WORK_ORDER_COUNT };
