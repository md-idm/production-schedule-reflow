# Production Schedule Reflow Engine

TypeScript engine for recalculating manufacturing work orders after delays, maintenance, or resource conflicts.

When a work order slips, dependent operations and shared work centers often need to move as well. This project implements a **reflow** pass that takes an existing schedule plus a triggering change and returns an updated schedule that satisfies hard manufacturing constraints.

The focus is correctness, readability, and deterministic behavior—not advanced optimization.

## Features

- Dependency-aware scheduling
- Shift-aware duration calculation
- Maintenance window handling
- Work center conflict resolution
- Deterministic multi-pass reflow
- Large generated dataset support (1000–5000 work orders)

## Architecture

```
src/
├── index.ts                         # Demo entry point
├── reflow/
│   ├── types.ts                     # Domain types and reflow contracts
│   ├── constraint-checker.ts        # Schedule validation helpers
│   └── reflow.service.ts            # Main reflow orchestration
├── utils/
│   └── date-utils.ts                # Shift and maintenance-aware date logic
└── scenarios/
    ├── scenario-utils.ts            # Shared formatting and scenario runner
    ├── demo-data-generator.ts       # Deterministic large-dataset builder
    ├── delay-cascade.ts
    ├── maintenance-conflict.ts
    ├── shift-boundary.ts
    ├── work-center-conflict.ts
    └── large-dataset.ts
```

| Module                             | Responsibility                                                             |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `src/reflow/types.ts`              | Work orders, work centers, manufacturing orders, reflow input/result types |
| `src/utils/date-utils.ts`          | `calculateEndDateWithShifts`, `getWorkPeriods`, shift boundary logic       |
| `src/reflow/constraint-checker.ts` | Validation for dependencies, overlaps, maintenance, and shifts             |
| `src/reflow/reflow.service.ts`     | `reflowSchedule` — multi-pass placement and conflict resolution            |
| `src/scenarios/`                   | Demo data and console-based scenario runners                               |

**Stack:** TypeScript, Luxon, pnpm

The project intentionally avoids databases, APIs, and UI layers in order to focus on scheduling correctness and algorithm clarity.

## Reflow Algorithm

`reflowSchedule(input)` runs a deterministic multi-pass reflow:

1. Copy the input schedule; maintenance work orders stay fixed
2. Sort production work orders by `docId`
3. For each work order, iteratively:
   - Start from the current `startDate`
   - Move start after the latest dependency end date
   - Compute start/end using shift-aware work periods
   - If the order overlaps another on the same work center, move start after that order's end and retry
4. Recalculate end dates from shift-aware duration logic
5. Repeat full passes until no dates change
6. Record `ScheduleChange` entries with reasons and delay minutes

Overlap checks use actual work periods, not raw calendar spans between start and end dates.

## Demo Scenarios

Run all scenarios with `pnpm dev`.

| Scenario             | What it demonstrates                                                 |
| -------------------- | -------------------------------------------------------------------- |
| Delay Cascade        | Delay propagation through a dependency chain                         |
| Maintenance Conflict | Work paused around a maintenance window                              |
| Shift Boundary       | Work carried into the next shift/day                                 |
| Work Center Conflict | Overlapping orders on one center resolved by moving the second order |
| Large Dataset        | Reflow against 1000 generated work orders across 10 work centers     |

The large dataset scenario prints summary output only (counts and runtime).

## Performance

Large-dataset reflow was improved by indexing work orders per work center and caching work period calculations.

| Dataset          | Before optimization | After optimization |
| ---------------- | ------------------- | ------------------ |
| 1000 work orders | ~28s                | ~6s                |
| 5000 work orders | —                   | ~2m                |

Results are unchanged; see `src/reflow/reflow.service.ts` for the work center index and period cache.

The large dataset scenario is intended as a scalability demonstration rather than a production benchmark.

## Assumptions

- Dates are UTC ISO 8601 strings
- Shifts use whole-hour boundaries; no overnight shifts
- Processing order is deterministic (`docId` sort)
- No persistence layer—in-memory data only
- `durationMinutes` is fixed during reflow

## Limitations

- No topological sort for dependency processing order
- No advanced heuristics (due dates, priorities, back scheduling)
- No UI, API, or database
- Pairwise overlap checks within each work center
- Greedy forward placement only

## Running the Project

```bash
pnpm install
pnpm dev
pnpm build
```

Additional scripts:

```bash
pnpm lint    # ESLint
pnpm check   # lint + build
```

## AI-Assisted Development

AI tools were used during exploration and implementation. Architectural decisions and the final code were reviewed and refined manually.
