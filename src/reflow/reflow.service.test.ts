import { describe, expect, it } from 'vitest';

import { reflowSchedule } from './reflow.service.js';
import type { ReflowInput, ReflowResult, WorkOrderDocument } from './types.js';
import { weekdayShifts } from '../scenarios/scenario-utils.js';

const shifts = weekdayShifts();

function getWorkOrder(result: ReflowResult, docId: string): WorkOrderDocument {
  const workOrder = result.workOrders.find((order) => order.docId === docId);
  if (!workOrder) {
    throw new Error(`Missing work order: ${docId}`);
  }

  return workOrder;
}

function createDelayCascadeInput(): ReflowInput {
  return {
    workCenters: [
      {
        docId: 'wc-cut',
        docType: 'workCenter',
        data: { name: 'Cutting Station', shifts, maintenanceWindows: [] },
      },
      {
        docId: 'wc-weld',
        docType: 'workCenter',
        data: { name: 'Welding Station', shifts, maintenanceWindows: [] },
      },
      {
        docId: 'wc-paint',
        docType: 'workCenter',
        data: { name: 'Paint Booth', shifts, maintenanceWindows: [] },
      },
    ],
    manufacturingOrders: [],
    triggerWorkOrderId: 'wo-a-cut',
    workOrders: [
      {
        docId: 'wo-a-cut',
        docType: 'workOrder',
        data: {
          workOrderNumber: 'WO-CUT',
          manufacturingOrderId: 'mo-1001',
          startDate: '2024-01-01T10:00:00.000Z',
          endDate: '2024-01-01T12:00:00.000Z',
          durationMinutes: 120,
          workCenterId: 'wc-cut',
          dependsOnWorkOrderIds: [],
          isMaintenance: false,
        },
      },
      {
        docId: 'wo-b-weld',
        docType: 'workOrder',
        data: {
          workOrderNumber: 'WO-WELD',
          manufacturingOrderId: 'mo-1001',
          startDate: '2024-01-01T10:00:00.000Z',
          endDate: '2024-01-01T12:00:00.000Z',
          durationMinutes: 120,
          workCenterId: 'wc-weld',
          dependsOnWorkOrderIds: ['wo-a-cut'],
          isMaintenance: false,
        },
      },
      {
        docId: 'wo-c-paint',
        docType: 'workOrder',
        data: {
          workOrderNumber: 'WO-PAINT',
          manufacturingOrderId: 'mo-1001',
          startDate: '2024-01-01T12:00:00.000Z',
          endDate: '2024-01-01T14:00:00.000Z',
          durationMinutes: 120,
          workCenterId: 'wc-paint',
          dependsOnWorkOrderIds: ['wo-b-weld'],
          isMaintenance: false,
        },
      },
    ],
  };
}

function createWorkCenterConflictInput(): ReflowInput {
  return {
    workCenters: [
      {
        docId: 'wc-drill-1',
        docType: 'workCenter',
        data: { name: 'Drill Station 1', shifts, maintenanceWindows: [] },
      },
    ],
    manufacturingOrders: [],
    triggerWorkOrderId: 'wo-1-drill-b',
    workOrders: [
      {
        docId: 'wo-2-drill-a',
        docType: 'workOrder',
        data: {
          workOrderNumber: 'WO-DRILL-A',
          manufacturingOrderId: 'mo-4001',
          startDate: '2024-01-01T08:00:00.000Z',
          endDate: '2024-01-01T10:00:00.000Z',
          durationMinutes: 120,
          workCenterId: 'wc-drill-1',
          dependsOnWorkOrderIds: [],
          isMaintenance: false,
        },
      },
      {
        docId: 'wo-1-drill-b',
        docType: 'workOrder',
        data: {
          workOrderNumber: 'WO-DRILL-B',
          manufacturingOrderId: 'mo-4001',
          startDate: '2024-01-01T09:00:00.000Z',
          endDate: '2024-01-01T11:00:00.000Z',
          durationMinutes: 120,
          workCenterId: 'wc-drill-1',
          dependsOnWorkOrderIds: [],
          isMaintenance: false,
        },
      },
    ],
  };
}

function createShiftBoundaryInput(): ReflowInput {
  return {
    workCenters: [
      {
        docId: 'wc-lathe-1',
        docType: 'workCenter',
        data: { name: 'Lathe Station 1', shifts, maintenanceWindows: [] },
      },
      {
        docId: 'wc-qc-1',
        docType: 'workCenter',
        data: { name: 'Quality Check Station', shifts, maintenanceWindows: [] },
      },
    ],
    manufacturingOrders: [],
    triggerWorkOrderId: 'wo-a-turn',
    workOrders: [
      {
        docId: 'wo-a-turn',
        docType: 'workOrder',
        data: {
          workOrderNumber: 'WO-TURN',
          manufacturingOrderId: 'mo-3001',
          startDate: '2024-01-01T16:00:00.000Z',
          endDate: '2024-01-01T19:00:00.000Z',
          durationMinutes: 180,
          workCenterId: 'wc-lathe-1',
          dependsOnWorkOrderIds: [],
          isMaintenance: false,
        },
      },
      {
        docId: 'wo-b-inspect',
        docType: 'workOrder',
        data: {
          workOrderNumber: 'WO-INSPECT',
          manufacturingOrderId: 'mo-3001',
          startDate: '2024-01-01T17:00:00.000Z',
          endDate: '2024-01-01T18:00:00.000Z',
          durationMinutes: 60,
          workCenterId: 'wc-qc-1',
          dependsOnWorkOrderIds: ['wo-a-turn'],
          isMaintenance: false,
        },
      },
    ],
  };
}

describe('reflowSchedule', () => {
  it('propagates delays through a dependency chain', () => {
    const result = reflowSchedule(createDelayCascadeInput());

    expect(getWorkOrder(result, 'wo-a-cut').data).toMatchObject({
      startDate: '2024-01-01T10:00:00.000Z',
      endDate: '2024-01-01T12:00:00.000Z',
    });
    expect(getWorkOrder(result, 'wo-b-weld').data).toMatchObject({
      startDate: '2024-01-01T12:00:00.000Z',
      endDate: '2024-01-01T14:00:00.000Z',
    });
    expect(getWorkOrder(result, 'wo-c-paint').data).toMatchObject({
      startDate: '2024-01-01T14:00:00.000Z',
      endDate: '2024-01-01T16:00:00.000Z',
    });

    expect(result.changes).toHaveLength(2);
    expect(result.changes.map((change) => change.workOrderId).sort()).toEqual([
      'wo-b-weld',
      'wo-c-paint',
    ]);
  });

  it('moves the overlapping work order after the first on the same work center', () => {
    const result = reflowSchedule(createWorkCenterConflictInput());

    expect(getWorkOrder(result, 'wo-2-drill-a').data).toMatchObject({
      startDate: '2024-01-01T08:00:00.000Z',
      endDate: '2024-01-01T10:00:00.000Z',
    });
    expect(getWorkOrder(result, 'wo-1-drill-b').data).toMatchObject({
      startDate: '2024-01-01T10:00:00.000Z',
      endDate: '2024-01-01T12:00:00.000Z',
    });

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({
      workOrderId: 'wo-1-drill-b',
      reason: 'Delayed by work center conflict with wo-2-drill-a',
    });
  });

  it('uses the conflicting order work period end when its endDate is stale', () => {
    const maintenanceWindows = [
      {
        startDate: '2024-01-02T10:00:00.000Z',
        endDate: '2024-01-02T14:00:00.000Z',
      },
    ];
    const input: ReflowInput = {
      workCenters: [
        {
          docId: 'wc-mill-1',
          docType: 'workCenter',
          data: { name: 'Mill Station 1', shifts, maintenanceWindows },
        },
      ],
      manufacturingOrders: [],
      triggerWorkOrderId: 'wo-1-overlap',
      workOrders: [
        {
          docId: 'wo-2-blocker',
          docType: 'workOrder',
          data: {
            workOrderNumber: 'WO-BLOCKER',
            manufacturingOrderId: 'mo-5001',
            startDate: '2024-01-02T09:00:00.000Z',
            endDate: '2024-01-02T13:00:00.000Z',
            durationMinutes: 180,
            workCenterId: 'wc-mill-1',
            dependsOnWorkOrderIds: [],
            isMaintenance: false,
          },
        },
        {
          docId: 'wo-1-overlap',
          docType: 'workOrder',
          data: {
            workOrderNumber: 'WO-OVERLAP',
            manufacturingOrderId: 'mo-5001',
            startDate: '2024-01-02T09:30:00.000Z',
            endDate: '2024-01-02T11:30:00.000Z',
            durationMinutes: 120,
            workCenterId: 'wc-mill-1',
            dependsOnWorkOrderIds: [],
            isMaintenance: false,
          },
        },
      ],
    };

    const result = reflowSchedule(input);

    expect(getWorkOrder(result, 'wo-2-blocker').data).toMatchObject({
      startDate: '2024-01-02T09:00:00.000Z',
      endDate: '2024-01-02T16:00:00.000Z',
    });
    expect(getWorkOrder(result, 'wo-1-overlap').data.startDate).toBe(
      '2024-01-02T16:00:00.000Z',
    );
    expect(getWorkOrder(result, 'wo-1-overlap').data.startDate).not.toBe(
      '2024-01-02T13:00:00.000Z',
    );
  });

  it('corrects shift boundary end dates and moves dependent work later', () => {
    const result = reflowSchedule(createShiftBoundaryInput());

    expect(getWorkOrder(result, 'wo-a-turn').data).toMatchObject({
      startDate: '2024-01-01T16:00:00.000Z',
      endDate: '2024-01-02T10:00:00.000Z',
    });
    expect(getWorkOrder(result, 'wo-b-inspect').data).toMatchObject({
      startDate: '2024-01-02T10:00:00.000Z',
      endDate: '2024-01-02T11:00:00.000Z',
    });

    expect(result.changes).toHaveLength(2);
    expect(result.changes.map((change) => change.workOrderId).sort()).toEqual([
      'wo-a-turn',
      'wo-b-inspect',
    ]);
  });

  it('processes a parent before its child when docId would sort the child first', () => {
    const input: ReflowInput = {
      workCenters: [
        {
          docId: 'wc-parent',
          docType: 'workCenter',
          data: { name: 'Parent Station', shifts, maintenanceWindows: [] },
        },
        {
          docId: 'wc-child',
          docType: 'workCenter',
          data: { name: 'Child Station', shifts, maintenanceWindows: [] },
        },
      ],
      manufacturingOrders: [],
      triggerWorkOrderId: 'wo-a-child',
      workOrders: [
        {
          docId: 'wo-a-child',
          docType: 'workOrder',
          data: {
            workOrderNumber: 'WO-CHILD',
            manufacturingOrderId: 'mo-6001',
            startDate: '2024-01-01T17:00:00.000Z',
            endDate: '2024-01-01T18:00:00.000Z',
            durationMinutes: 60,
            workCenterId: 'wc-child',
            dependsOnWorkOrderIds: ['wo-z-parent'],
            isMaintenance: false,
          },
        },
        {
          docId: 'wo-z-parent',
          docType: 'workOrder',
          data: {
            workOrderNumber: 'WO-PARENT',
            manufacturingOrderId: 'mo-6001',
            startDate: '2024-01-01T16:00:00.000Z',
            endDate: '2024-01-01T19:00:00.000Z',
            durationMinutes: 180,
            workCenterId: 'wc-parent',
            dependsOnWorkOrderIds: [],
            isMaintenance: false,
          },
        },
      ],
    };

    const result = reflowSchedule(input);

    expect(getWorkOrder(result, 'wo-z-parent').data).toMatchObject({
      startDate: '2024-01-01T16:00:00.000Z',
      endDate: '2024-01-02T10:00:00.000Z',
    });
    expect(getWorkOrder(result, 'wo-a-child').data).toMatchObject({
      startDate: '2024-01-02T10:00:00.000Z',
      endDate: '2024-01-02T11:00:00.000Z',
    });
  });

  it('throws when production work orders have a circular dependency', () => {
    const input: ReflowInput = {
      workCenters: [
        {
          docId: 'wc-1',
          docType: 'workCenter',
          data: { name: 'Station 1', shifts, maintenanceWindows: [] },
        },
      ],
      manufacturingOrders: [],
      triggerWorkOrderId: 'wo-a',
      workOrders: [
        {
          docId: 'wo-a',
          docType: 'workOrder',
          data: {
            workOrderNumber: 'WO-A',
            manufacturingOrderId: 'mo-7001',
            startDate: '2024-01-01T08:00:00.000Z',
            endDate: '2024-01-01T10:00:00.000Z',
            durationMinutes: 120,
            workCenterId: 'wc-1',
            dependsOnWorkOrderIds: ['wo-b'],
            isMaintenance: false,
          },
        },
        {
          docId: 'wo-b',
          docType: 'workOrder',
          data: {
            workOrderNumber: 'WO-B',
            manufacturingOrderId: 'mo-7001',
            startDate: '2024-01-01T10:00:00.000Z',
            endDate: '2024-01-01T12:00:00.000Z',
            durationMinutes: 120,
            workCenterId: 'wc-1',
            dependsOnWorkOrderIds: ['wo-a'],
            isMaintenance: false,
          },
        },
      ],
    };

    expect(() => reflowSchedule(input)).toThrow(
      /Circular dependency detected between production work orders/,
    );
  });
});
