# Automated Test Suite Engineering Report

## Test Coverage Focus

The suite uses **Vitest** (`pnpm test` → `vitest run`) with three focused test files under `src/`:

| Module | File | Tests |
|--------|------|-------|
| Shift calculation | `src/utils/date-utils.test.ts` | 4 |
| Reflow orchestration | `src/reflow/reflow.service.test.ts` | 3 |
| Large dataset regression | `src/scenarios/large-dataset.test.ts` | 1 |

Coverage targets **correctness regression**, not line coverage. Tests use small, explicit fixtures, reuse `weekdayShifts()` from scenario utilities, and assert expected dates and change records directly — no snapshots.

## Critical Behaviors Verified

**date-utils**

- **Shift boundary carryover** — 180 minutes starting at 16:00 on Monday completes at 10:00 Tuesday (work spans two shift days).
- **Maintenance pause/resume** — work stops before a maintenance window and resumes afterward; end time reflects only active shift minutes.
- **Invalid shift validation** — rejects shifts where `endHour <= startHour`.
- **Work period splitting** — `getWorkPeriods` returns separate active segments around maintenance.

**reflow.service**

- **Dependency cascade** — a three-order chain (cut → weld → paint) shifts downstream orders after upstream completion; two schedule changes recorded.
- **Work center conflict resolution** — overlapping orders on the same center are serialized; the later `docId` order moves after the first, with a conflict reason on the change record.
- **Shift boundary correction** — a 180-minute order starting at 16:00 gets a corrected end date on the next shift day; its dependent order moves accordingly.

**Large dataset**

- **Deterministic regression** — the default 1000-order generated dataset produces a stable **168** change count across repeated runs (no runtime threshold assertion).

## Limitations

- **No constraint-checker tests** — validation helpers in `constraint-checker.ts` are not exercised directly; overlap behavior is covered indirectly through reflow integration tests.
- **No maintenance or trigger-order scenarios** — demo scenarios for maintenance conflicts and trigger pinning are not yet automated.
- **Large dataset checks change count only** — individual order dates and full schedule validity are not asserted; a logic change could preserve count while altering placements.
- **No negative or malformed-input coverage** — missing work centers, broken dependency references, and invalid ISO dates are untested.
- **Single regression baseline** — only the 1000-order default generator is pinned; other sizes (e.g. 5000) have no regression guard.
- **Slowest test is integration-scale** — the large dataset case runs the full reflow engine (~15–20s) and relies on a 60s timeout.

## Future Improvements

- Add unit tests for `constraint-checker.ts` (dependency, overlap, maintenance, shift violations) with minimal fixtures.
- Cover maintenance-window reflow and fixed maintenance orders as obstacles during placement.
- Assert post-reflow schedule validity via a full constraint audit helper.
- Pin additional regression baselines (e.g. change count or checksum of changed order IDs for 5000 orders).
- Add edge-case tests: convergence cap, missing parent dependency, invalid date input.
- Optionally extract shared scenario builders from demo scenarios to reduce duplication between tests and `src/scenarios/`.

## Scope

This suite verifies scheduling correctness at the utility and service layers. Demo wiring (`src/index.ts`) and CLI output are out of scope. Run via `pnpm test` or as part of `pnpm check`.
