import type { ReflowInput } from '../reflow/types.js';
import { runScenario, weekdayShifts } from './scenario-utils.js';

export function runMaintenanceConflictScenario(): void {
  const input: ReflowInput = {
    workCenters: [
      {
        docId: 'wc-cnc-1',
        docType: 'workCenter',
        data: {
          name: 'CNC Machine 1',
          shifts: weekdayShifts(),
          maintenanceWindows: [
            {
              startDate: '2024-01-02T10:00:00.000Z',
              endDate: '2024-01-02T14:00:00.000Z',
              reason: 'Planned spindle calibration',
            },
          ],
        },
      },
      {
        docId: 'wc-deburr',
        docType: 'workCenter',
        data: {
          name: 'Deburr Station',
          shifts: weekdayShifts(),
          maintenanceWindows: [],
        },
      },
    ],
    manufacturingOrders: [
      {
        docId: 'mo-2001',
        docType: 'manufacturingOrder',
        data: {
          manufacturingOrderNumber: 'MO-2001',
          itemId: 'item-bracket-b',
          quantity: 25,
          dueDate: '2024-01-03T17:00:00.000Z',
        },
      },
    ],
    triggerWorkOrderId: 'wo-a-mill',
    workOrders: [
      {
        docId: 'wo-a-mill',
        docType: 'workOrder',
        data: {
          workOrderNumber: 'WO-MILL',
          manufacturingOrderId: 'mo-2001',
          startDate: '2024-01-02T09:00:00.000Z',
          endDate: '2024-01-02T12:00:00.000Z',
          durationMinutes: 180,
          workCenterId: 'wc-cnc-1',
          dependsOnWorkOrderIds: [],
          isMaintenance: false,
        },
      },
      {
        docId: 'wo-b-finish',
        docType: 'workOrder',
        data: {
          workOrderNumber: 'WO-FINISH',
          manufacturingOrderId: 'mo-2001',
          startDate: '2024-01-02T12:00:00.000Z',
          endDate: '2024-01-02T14:00:00.000Z',
          durationMinutes: 120,
          workCenterId: 'wc-deburr',
          dependsOnWorkOrderIds: ['wo-a-mill'],
          isMaintenance: false,
        },
      },
    ],
  };

  runScenario(
    'Scenario 2: Maintenance Conflict',
    'WO-MILL spans a Tuesday maintenance window. Reflow pauses before maintenance, ' +
      'resumes afterward, and pushes dependent WO-FINISH on the deburr station.',
    input,
  );
}
