Constraint Checker Engineering Report
Validation Approach
Implemented pure validation helpers in src/reflow/constraint-checker.ts, with each rule exposed as:

A boolean helper (satisfiesDependencies, hasWorkCenterOverlap, etc.)
A descriptive error function returning string | null (getDependencyViolation, etc.)
Validation is split into four focused checks:

Rule Method
Dependencies
Child startDate must be ≥ every parent’s endDate
Work center conflicts
Compare shift-aware work periods via getWorkPeriods — not raw calendar spans
Maintenance
Reject starts during maintenance; verify endDate matches calculateEndDateWithShifts with maintenance; confirm work periods don’t overlap windows
Shifts
Start must fall in an active shift; endDate must match shift-only calculation; each work period start must be within a shift
Overlap detection uses half-open intervals [start, end). Work center and maintenance checks reuse getWorkPeriods and calculateEndDateWithShifts from date-utils.ts so validation matches scheduling behavior.

Assumptions
All dates are UTC ISO 8601 strings
Work orders store consistent startDate, endDate, and durationMinutes
Parent work orders exist in the provided lookup map
Work center shifts and maintenance windows are passed in by the caller
Dependencies are direct parent IDs only (no transitive graph validation)
A valid schedule’s startDate is the actual work start, not a pre-maintenance placeholder
Shift and maintenance rules follow the same conventions as date-utils.ts
Limitations
Per-order validation — no single function validates an entire schedule at once
Pairwise work center checks — getWorkCenterOverlapViolation compares one order against a list; no batch optimization
No circular dependency detection — missing or cyclic dependency graphs are not explicitly handled
String error messages only — no structured error codes or severity levels
Shift/maintenance rules inherited from date-utils — whole-hour shifts, no overnight shifts, half-open intervals
Redundant checks — maintenance and shift validation both recompute work periods and expected end dates independently
Future Improvements
Add validateSchedule(input: ReflowInput): string[] to run all checks across the full schedule
Return structured violations (code, work order ID, related entity) for better reflow integration
Detect circular dependencies and missing references in one pass
Index work orders by work center to reduce overlap comparison cost
Consolidate shift and maintenance validation into a single consistency check against calculateEndDateWithShifts
Add optional tolerance for sub-minute floating-point differences in date comparisons
Scope
This module validates individual scheduling constraints only. It does not perform reflow, reschedule work orders, or resolve conflicts. Full schedule recalculation belongs in reflow.service.ts.
