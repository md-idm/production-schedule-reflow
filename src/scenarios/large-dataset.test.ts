import { describe, expect, it } from 'vitest';

import { reflowSchedule } from '../reflow/reflow.service.js';
import { generateDemoReflowInput } from './demo-data-generator.js';

describe('large dataset regression', () => {
  it('returns a stable change count for the default generated dataset', () => {
    const firstRun = reflowSchedule(generateDemoReflowInput({ workOrderCount: 1000 }));
    const secondRun = reflowSchedule(generateDemoReflowInput({ workOrderCount: 1000 }));

    expect(firstRun.workOrders).toHaveLength(1000);
    expect(firstRun.changes).toHaveLength(168);
    expect(secondRun.changes).toHaveLength(168);
  }, 60_000);
});
