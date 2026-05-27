import type { ReflowInput } from '../reflow/types.js';
import { runScenario, weekdayShifts } from './scenario-utils.js';

const shifts = weekdayShifts();

export function runDelayCascadeScenario(): void {
  const input: ReflowInput = {
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
    manufacturingOrders: [
      {
        docId: 'mo-1001',
        docType: 'manufacturingOrder',
        data: {
          manufacturingOrderNumber: 'MO-1001',
          itemId: 'item-widget-a',
          quantity: 50,
          dueDate: '2024-01-05T17:00:00.000Z',
        },
      },
    ],
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

  runScenario(
    'Scenario 1: Delay Cascade',
    'WO-CUT is delayed by 2 hours. Dependent work orders on downstream stations ' +
      'must wait until their parent operations finish.',
    input,
  );
}
