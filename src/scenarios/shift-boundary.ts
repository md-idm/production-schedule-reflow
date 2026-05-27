import type { ReflowInput } from '../reflow/types.js';
import { runScenario, weekdayShifts } from './scenario-utils.js';

const shifts = weekdayShifts();

export function runShiftBoundaryScenario(): void {
  const input: ReflowInput = {
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
    manufacturingOrders: [
      {
        docId: 'mo-3001',
        docType: 'manufacturingOrder',
        data: {
          manufacturingOrderNumber: 'MO-3001',
          itemId: 'item-shaft-c',
          quantity: 10,
          dueDate: '2024-01-03T17:00:00.000Z',
        },
      },
    ],
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

  runScenario(
    'Scenario 3: Shift Boundary',
    'WO-TURN starts near end of shift with 3 hours of work. Reflow carries remaining ' +
      'work into the next working day and moves dependent WO-INSPECT after it.',
    input,
  );
}
