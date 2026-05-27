import type { ReflowInput } from '../reflow/types.js';
import { runScenario, weekdayShifts } from './scenario-utils.js';

const shifts = weekdayShifts();

export function runWorkCenterConflictScenario(): void {
  const input: ReflowInput = {
    workCenters: [
      {
        docId: 'wc-drill-1',
        docType: 'workCenter',
        data: { name: 'Drill Station 1', shifts, maintenanceWindows: [] },
      },
    ],
    manufacturingOrders: [
      {
        docId: 'mo-4001',
        docType: 'manufacturingOrder',
        data: {
          manufacturingOrderNumber: 'MO-4001',
          itemId: 'item-plate-d',
          quantity: 30,
          dueDate: '2024-01-04T17:00:00.000Z',
        },
      },
    ],
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

  runScenario(
    'Scenario 4: Work Center Conflict',
    'Two work orders are initially scheduled on the same work center with overlapping time. Reflow moves the second order after the first finishes.',
    input,
  );
}
