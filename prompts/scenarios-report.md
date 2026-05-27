Demo Scenarios Engineering Report
What Was Added
Runnable demo scenarios in src/scenarios/, wired through src/index.ts and executed via pnpm dev.

File Scenario
scenario-utils.ts
Shared weekday shifts, date formatting, and console output helpers
delay-cascade.ts
Delay Cascade
maintenance-conflict.ts
Maintenance Conflict
shift-boundary.ts
Shift Boundary
index.ts
Runs all three scenarios sequentially
Each scenario builds a complete ReflowInput (work centers, manufacturing orders, work orders), calls reflowSchedule, and prints before/after schedules with change details.

What Each Scenario Demonstrates

1. Delay Cascade
   WO-CUT is delayed by 2 hours on the cutting station. WO-WELD and WO-PAINT on downstream stations still start too early relative to their dependencies. Reflow pushes each dependent order forward with "Delayed by dependency on …" reasons, showing how a single delay propagates through a manufacturing chain.

2. Maintenance Conflict
   WO-MILL on a CNC machine runs through a Tuesday maintenance window (10:00–14:00). Its end date is corrected from 12:00 to 16:00 as work pauses before maintenance and resumes afterward. Dependent WO-FINISH on a separate deburr station is pushed later accordingly.

3. Shift Boundary
   WO-TURN starts at 16:00 with 3 hours of work — only 1 hour remains in the Monday shift. Reflow extends the end date from Monday 19:00 (invalid) to Tuesday 10:00. Dependent WO-INSPECT on a QC station moves to start after WO-TURN completes.

Assumptions
All scenarios use Mon–Fri shifts, 08:00–17:00 UTC
Input data already reflects the triggering change (delayed or incorrectly scheduled orders)
Work orders on different stations avoid same-center placement ordering issues during reflow
triggerWorkOrderId is set for context but does not alter reflow behavior
Console output is the only interface — no UI, database, or API
Dates use January 2024 with Monday as the first working day
Limitations
No automated assertions — scenarios print output only; correctness is verified manually
No same-center conflict demo — overlapping orders on one work center are avoided due to reflow placement ordering constraints
Simplified manufacturing model — one work order per station step, no parallel operations or batching
Fixed shift pattern — all work centers share identical weekday hours
No maintenance work orders — only work center maintenance windows are used, not fixed isMaintenance work orders
End-only changes — some orders show "Reflow schedule update" with 0 delay when only the end date is corrected
Future Improvements
Add automated scenario tests that assert expected dates and change reasons
Include a dedicated work center conflict scenario once reflow placement ordering is improved
Add a scenario with fixed maintenance work orders (isMaintenance: true)
Support running individual scenarios via CLI argument (e.g. pnpm dev -- delay-cascade)
Add a scenario covering manufacturing order due date pressure
Validate reflow output with constraint-checker helpers after each scenario run
Scope
These scenarios demonstrate the reflow engine's behavior through console output. They do not add UI, persistence, or test infrastructure.
