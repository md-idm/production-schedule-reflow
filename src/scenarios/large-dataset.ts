import { reflowSchedule } from '../reflow/reflow.service.js';
import {
  DEFAULT_WORK_ORDER_COUNT,
  generateDemoReflowInput,
  MAX_WORK_ORDER_COUNT,
} from './demo-data-generator.js';

export function runLargeDatasetScenario(
  workOrderCount = DEFAULT_WORK_ORDER_COUNT,
): void {
  console.log(`\n${'='.repeat(72)}`);
  console.log('Scenario 5: Large Dataset');
  console.log('-'.repeat(72));
  console.log(
    'Generated manufacturing schedule with dependency chains, multiple work centers, ' +
      'and maintenance windows. Reflow runs against the full dataset.',
  );

  const count = Math.min(
    MAX_WORK_ORDER_COUNT,
    Math.max(1, Math.floor(workOrderCount)),
  );
  const input = generateDemoReflowInput({ workOrderCount: count });

  console.log(`\nWork orders: ${input.workOrders.length}`);
  console.log(`Work centers: ${input.workCenters.length}`);
  console.log(`Trigger: ${input.triggerWorkOrderId}`);

  console.time('reflow');
  const result = reflowSchedule(input);
  console.timeEnd('reflow');

  console.log(`Changes: ${result.changes.length}`);
}
