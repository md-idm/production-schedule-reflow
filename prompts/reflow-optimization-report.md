Reflow Optimization Engineering Report
Optimization Approach
Optimized reflowSchedule in src/reflow/reflow.service.ts without changing the public API or scheduling logic. The reflow algorithm is unchanged — same placement loop, dependency handling, conflict resolution, and multi-pass convergence.

Three targeted improvements reduce redundant work during overlap detection:

Work center index — buildWorkOrdersByCenter groups orders by center so conflict checks only compare orders on the same work center
Work period cache — getWorkOrderPeriods caches getWorkPeriods results per work order, keyed by schedule data; recomputes only when dates or duration change
Single period computation per step — scheduleFromStart returns work periods once per placement iteration; overlap checks reuse them instead of recomputing via hasWorkCenterOverlap
A redundant calculateEndDateWithShifts call at the end of placement was also removed; the end date is taken from the same period list.

Bottlenecks Reduced
Bottleneck Before After
Conflict comparisons
Every order vs full schedule (O(n) per check)
Only same-center orders (~n / centers)
getWorkPeriods calls
Recomputed for both orders on every overlap check
Cached for unchanged orders
Per-step scheduling
getWorkPeriods + calculateEndDateWithShifts
Single getWorkPeriods call
Cross-center filtering
Runtime workCenterId check on every pair
Pre-indexed lists
Measured impact (1000 work orders): runtime dropped from ~28s to ~6s with identical output (168 changes).

Tradeoffs
Memory for speed — period cache stores computed work segments in memory for the duration of reflow
Local overlap logic — overlap checking moved from constraint-checker.ts into the service to accept precomputed periods; validation helpers remain available for standalone checks
Cache invalidation via key comparison — simple string key instead of explicit invalidation; slightly more string allocation on cache miss
Same-center lists rebuilt once — index is built at reflow start; centers are assumed not to change during reflow
Limitations
Still O(n²) within a work center — dense schedules on one center remain slow
Multi-pass convergence unchanged — outer loop still runs until stable; no early exit optimization
5000 orders still slow — ~3 minutes at max scale due to volume of per-center comparisons
No spatial indexing — orders are not sorted or filtered by time range before comparison
Cache grows with dataset size — one entry per work order for the reflow run
Future Improvements
Sort same-center orders by start date and skip pairs that cannot overlap by time range
Invalidate or rebuild the work center index only when order dates change
Topological processing order to reduce multi-pass iterations
Share period cache between reflow and constraint-checker validation
Benchmark suite with automated regression checks on runtime and change counts
Parallel conflict checking per work center if scale requirements grow further
Scope
Optimization is limited to reflow.service.ts. The reflow algorithm, types, date utilities, constraint checker, and scenario data generator are unchanged.

## Performance Results

Before optimization:

- 1000 work orders: ~28s
- Changes: 168
- 5000 work orders: ~8m

After optimization:

- 1000 work orders: ~6s
- Changes: 168

Large scale:

- 5000 work orders: ~2m
