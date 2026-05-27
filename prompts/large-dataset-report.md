Wired as Scenario 5 in src/index.ts. Output includes work order count, work center count, change count, and reflow runtime via console.time / console.timeEnd.

Generation Approach
Data is built with index-based formulas — no randomness.

10 work centers with shared Mon–Fri 08:00–17:00 shifts
Maintenance windows on 3 centers (inspection, tool replacement, calibration)
Manufacturing orders in groups of 3 work orders each
Dependency chains — each step depends on the previous work order in its chain
Work center assignment — round-robin across centers (index % 10)
Scheduling — per-center sequential placement using calculateEndDateWithShifts, respecting parent end dates
Trigger — wo-000001 delayed by 2 hours to start reflow propagation
Default size is 1000 work orders; workOrderCount is configurable from 1 to 5000 via generateDemoReflowInput({ workOrderCount }) or runLargeDatasetScenario(count).

Initial schedules avoid same-center overlaps so reflow completes in reasonable time at scale (~28s for 1000 orders).

Assumptions
All dates are UTC, starting Monday 2024-01-01
Generated schedules are valid before the trigger delay
Dependency chains are linear (one parent per work order)
Each chain step runs on a different work center (round-robin)
Reflow algorithm is unchanged; the generator adapts to its behavior
Summary-only output is sufficient for demo purposes
Limitations
No per-order output — individual schedule changes are not printed
No automated validation — no assertions on change count or runtime
Runtime scales poorly — ~28s at 1000 orders; 5000 would be significantly slower due to reflow’s pairwise checks
Simplified model — no parallel operations, priority, or due-date-driven placement
Single trigger — only wo-000001 is delayed; no varied disruption patterns
Sequential per-center scheduling — avoids work center conflicts in initial data, so the scenario mainly stress-tests dependency cascade and scale
Fixed topology — 10 centers, 3-step chains, and 3 maintenance windows are hardcoded
Future Improvements
Add CLI or environment variable to configure work order count without code changes
Run constraint-checker validation after reflow and report violation counts
Support configurable disruption types (random delays, maintenance spikes, center outages)
Add automated benchmark tests with expected runtime/change thresholds
Generate intentional same-center overlaps for conflict testing at scale
Export generated dataset to JSON for offline analysis
Split large dataset from pnpm dev default run for faster iteration (pnpm dev:large)
Scope
This scenario demonstrates that the reflow engine handles large, structured inputs. It does not add UI, persistence, API endpoints, or changes to the reflow algorithm.
