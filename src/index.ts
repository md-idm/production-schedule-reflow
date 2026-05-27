import { runDelayCascadeScenario } from './scenarios/delay-cascade.js';
import { runLargeDatasetScenario } from './scenarios/large-dataset.js';
import { runMaintenanceConflictScenario } from './scenarios/maintenance-conflict.js';
import { runShiftBoundaryScenario } from './scenarios/shift-boundary.js';
import { runWorkCenterConflictScenario } from './scenarios/work-center-conflict.js';

console.log('Production Schedule Reflow — Demo Scenarios');

runDelayCascadeScenario();
runMaintenanceConflictScenario();
runShiftBoundaryScenario();
runWorkCenterConflictScenario();
runLargeDatasetScenario();

console.log(`\n${'='.repeat(72)}`);
console.log('All scenarios complete.');
