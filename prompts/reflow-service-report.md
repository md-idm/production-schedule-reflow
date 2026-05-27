Reflow Service Engineering Report
Algorithm Approach
Implemented reflowSchedule in src/reflow/reflow.service.ts as a deterministic, iterative placement algorithm.

High-level flow:

Deep-copy input work orders; maintenance orders are never rescheduled
Sort production orders by docId for stable processing
Repeat full passes until no dates change (cascade convergence)
For each production order, run an inner placement loop:
Start from the current startDate
Move after the latest dependency end date
Schedule using getWorkPeriods and calculateEndDateWithShifts
If a work center conflict exists (hasWorkCenterOverlap), move after the latest conflicting order’s end and retry
Record ScheduleChange entries for orders whose dates changed
Placement defers to existing utilities: shift-aware scheduling from date-utils.ts, overlap detection from constraint-checker.ts. Each move records a reason — dependency delay or work center conflict.

Assumptions
Input work orders already reflect the triggering change (e.g. a delayed triggerWorkOrderId)
Maintenance work orders (isMaintenance: true) are fixed obstacles, not rescheduled
All dates are UTC ISO 8601 strings
Work centers, shifts, and maintenance windows are valid and complete
Parent work orders referenced in dependsOnWorkOrderIds exist
durationMinutes is fixed; only start/end dates move
One work center runs one work order at a time
Stable docId sort order is sufficient for deterministic results
Limitations
Greedy placement — orders are pushed forward in time; no backtracking or slot optimization
Fixed processing order — sorted by docId, not dependency topology or priority
Multi-pass convergence — may require several full passes; capped at 100 with an error on failure
Single reason tracked — only the last placement reason is stored per order, not a full cascade chain
No due-date awareness — ManufacturingOrderData.dueDate is not used during reflow
Trigger order not special-cased — triggerWorkOrderId is informational; all production orders are re-evaluated equally
No post-reflow validation — constraint helpers are used for overlap detection only, not a final schedule audit
Inherited date-utils constraints — whole-hour shifts, no overnight shifts, half-open intervals
Future Improvements
Process orders in topological dependency order to reduce pass count
Prioritize or pin the trigger work order before cascading dependents
Consider manufacturing order due dates when choosing placement slots
Run full schedule validation after reflow and return warnings alongside changes
Track a chain of reasons for multi-hop cascades
Add optional backward scheduling from due dates for late orders
Index work orders by work center to reduce pairwise overlap checks
Support configurable ordering (priority, due date, manufacturing order)
Scope
This module orchestrates schedule reflow only. Shift calculation lives in date-utils.ts; individual constraint checks live in constraint-checker.ts. Scenarios and entry-point wiring are separate.
