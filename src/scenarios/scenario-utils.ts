import { DateTime } from 'luxon';

import { reflowSchedule } from '../reflow/reflow.service.js';
import type {
  ReflowInput,
  ReflowResult,
  Shift,
  WorkOrderDocument,
} from '../reflow/types.js';

const UTC = 'utc';

export function weekdayShifts(): Shift[] {
  return [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    dayOfWeek,
    startHour: 8,
    endHour: 17,
  }));
}

export function formatDate(iso: string): string {
  return DateTime.fromISO(iso, { zone: UTC }).toFormat('EEE yyyy-MM-dd HH:mm');
}

export function printWorkOrders(workOrders: WorkOrderDocument[]): void {
  for (const workOrder of workOrders) {
    const { data } = workOrder;
    const deps =
      data.dependsOnWorkOrderIds.length > 0
        ? data.dependsOnWorkOrderIds.join(', ')
        : 'none';

    console.log(
      `  ${data.workOrderNumber} (${workOrder.docId})` +
        ` | ${formatDate(data.startDate)} -> ${formatDate(data.endDate)}` +
        ` | ${data.durationMinutes} min | deps: ${deps}`,
    );
  }
}

export function runScenario(
  title: string,
  description: string,
  input: ReflowInput,
): ReflowResult {
  console.log(`\n${'='.repeat(72)}`);
  console.log(title);
  console.log('-'.repeat(72));
  console.log(description);
  console.log(`\nTrigger: ${input.triggerWorkOrderId}`);

  console.log('\nBefore reflow:');
  printWorkOrders(input.workOrders);

  const result = reflowSchedule(input);

  console.log('\nAfter reflow:');
  printWorkOrders(result.workOrders);

  if (result.changes.length === 0) {
    console.log('\nChanges: none');
    return result;
  }

  console.log('\nChanges:');
  for (const change of result.changes) {
    console.log(`  ${change.workOrderId}`);
    console.log(
      `    ${formatDate(change.oldStartDate)} -> ${formatDate(change.oldEndDate)}`,
    );
    console.log(
      `    ${formatDate(change.newStartDate)} -> ${formatDate(change.newEndDate)}`,
    );
    console.log(`    reason: ${change.reason}`);
    console.log(`    delay: ${change.delayMinutes} min`);
  }

  return result;
}
