Shift Calculation Engineering Report
Algorithm Approach
Implemented calculateEndDateWithShifts in src/utils/date-utils.ts as a pure, iterative function using Luxon.

The function advances a cursor from startDate and consumes durationMinutes in work chunks. Each loop iteration:

Skip maintenance — if the cursor is inside a maintenance window, jump to the window end
Find active shift — if outside shift hours, move to the next shift start
Compute work chunk — work until the earliest of shift end or the next maintenance start
Consume duration — subtract minutes worked and advance the cursor
Helper functions handle shift matching, maintenance detection, and next-shift lookup. The main loop stays linear and readable; correctness takes priority over batching or optimization.

Assumptions
All dates are UTC ISO 8601 strings
Shifts use whole-hour boundaries (startHour inclusive, endHour exclusive)
dayOfWeek follows the assignment convention: 0 = Sunday
Each weekday must be defined explicitly (e.g. Mon–Fri requires five shift entries)
Maintenance windows are half-open intervals: work is blocked at start, allowed again at end
durationMinutes <= 0 returns startDate unchanged
At least one shift is configured; empty shift arrays throw
Limitations
No sub-hour shift precision — startHour / endHour are integers; partial-hour shift boundaries are not modeled
No overnight shifts — a shift cannot span midnight (e.g. 22:00–06:00)
Linear search for next shift — scans up to 366 days forward; sufficient for typical durations but not optimized for very long schedules
No input validation — invalid shift definitions (e.g. endHour <= startHour) are not rejected
No overlap handling — overlapping shifts or maintenance windows rely on first-match behavior rather than explicit resolution
Single work center scope — the function operates on one shift/maintenance set; cross-center logic belongs in the reflow service
Future Improvements
Add a reverse function (calculateStartDateWithShifts) for backward scheduling from a due date
Pre-index maintenance windows by date to avoid scanning on every iteration
Support minute-level shift boundaries if the domain model evolves beyond whole hours
Add validation helpers for shift and maintenance window consistency
Extract a shared findAvailableWorkSlots helper if the reflow service needs start-date placement as well as end-date calculation
Scope
This module handles shift-aware duration calculation only. Work order dependencies, work center conflicts, and full schedule reflow are implemented separately.
