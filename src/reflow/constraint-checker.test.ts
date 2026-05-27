import { describe, expect, it } from 'vitest';

import {
  getDependencyViolation,
  getMaintenanceViolation,
  getShiftViolation,
  getWorkCenterOverlapViolation,
  hasWorkCenterOverlap,
} from './constraint-checker.js';
import type { WorkOrderData, WorkOrderDocument } from './types.js';
import { weekdayShifts } from '../scenarios/scenario-utils.js';

const shifts = weekdayShifts();

function createWorkOrder(
  docId: string,
  overrides: Partial<WorkOrderData> = {},
): WorkOrderDocument {
  return {
    docId,
    docType: 'workOrder',
    data: {
      workOrderNumber: docId,
      manufacturingOrderId: 'mo-1',
      startDate: '2024-01-01T08:00:00.000Z',
      endDate: '2024-01-01T10:00:00.000Z',
      durationMinutes: 120,
      workCenterId: 'wc-1',
      dependsOnWorkOrderIds: [],
      isMaintenance: false,
      ...overrides,
    },
  };
}

describe('getDependencyViolation', () => {
  it('reports when a child starts before its parent finishes', () => {
    const parent = createWorkOrder('wo-parent', {
      startDate: '2024-01-01T08:00:00.000Z',
      endDate: '2024-01-01T12:00:00.000Z',
    });
    const child = createWorkOrder('wo-child', {
      startDate: '2024-01-01T10:00:00.000Z',
      endDate: '2024-01-01T12:00:00.000Z',
      dependsOnWorkOrderIds: ['wo-parent'],
    });

    expect(getDependencyViolation(child, new Map([[parent.docId, parent]]))).toBe(
      'Work order wo-child starts before parent wo-parent finishes',
    );
  });

  it('reports a missing parent dependency', () => {
    const child = createWorkOrder('wo-child', {
      dependsOnWorkOrderIds: ['wo-missing'],
    });

    expect(getDependencyViolation(child, new Map())).toBe(
      'Missing parent work order: wo-missing',
    );
  });
});

describe('work center overlap', () => {
  it('detects overlapping work on the same work center', () => {
    const first = createWorkOrder('wo-a', {
      startDate: '2024-01-01T08:00:00.000Z',
      endDate: '2024-01-01T10:00:00.000Z',
      durationMinutes: 120,
    });
    const second = createWorkOrder('wo-b', {
      startDate: '2024-01-01T09:00:00.000Z',
      endDate: '2024-01-01T11:00:00.000Z',
      durationMinutes: 120,
    });

    expect(hasWorkCenterOverlap(first, second, shifts)).toBe(true);
    expect(
      getWorkCenterOverlapViolation(first, [second], new Map([['wc-1', { shifts, maintenanceWindows: [] }]])),
    ).toBe('Work order wo-a overlaps with wo-b on work center wc-1');
  });
});

describe('getMaintenanceViolation', () => {
  it('reports when work starts during a maintenance window', () => {
    const maintenanceWindows = [
      {
        startDate: '2024-01-02T10:00:00.000Z',
        endDate: '2024-01-02T14:00:00.000Z',
      },
    ];
    const workOrder = createWorkOrder('wo-maint', {
      startDate: '2024-01-02T10:30:00.000Z',
      endDate: '2024-01-02T12:30:00.000Z',
    });

    expect(getMaintenanceViolation(workOrder, shifts, maintenanceWindows)).toBe(
      'Work order wo-maint starts during maintenance window (2024-01-02T10:00:00.000Z - 2024-01-02T14:00:00.000Z)',
    );
  });
});

describe('getShiftViolation', () => {
  it('reports when work starts outside shift hours', () => {
    const workOrder = createWorkOrder('wo-early', {
      startDate: '2024-01-01T07:00:00.000Z',
      endDate: '2024-01-01T09:00:00.000Z',
    });

    expect(getShiftViolation(workOrder, shifts)).toBe(
      'Work order wo-early starts outside shift hours',
    );
  });
});
