# Reflow Service

## Goal

Implement the main production schedule reflow algorithm.

## Prompt

Follow the rules from `_base-context.md`.

Create the main orchestration logic in:

`src/reflow/reflow.service.ts`

Implement a function:

`reflowSchedule(input: ReflowInput): ReflowResult`

Requirements:

- Use the existing types from `types.ts`
- Use `calculateEndDateWithShifts` from `date-utils.ts`
- Use constraint helpers from `constraint-checker.ts` where useful
- Keep logic simple, deterministic, and readable
- Do not use classes
- Do not overengineer

Algorithm:

1. Copy the input work orders
2. Keep maintenance work orders fixed
3. Process production work orders in a stable order
4. For each work order:
   - start from its current startDate
   - move start after all dependency end dates
   - move start after conflicting work orders on the same work center
   - calculate new endDate using shifts and maintenance windows
   - repeat until no conflict remains
5. Track changes when startDate or endDate changes
6. Return updated work orders and changes

Rules:

- Dependencies must be respected
- One work center can run only one work order at a time
- Work must happen only during shifts
- Maintenance windows must be skipped
- Maintenance work orders must not be rescheduled

ScheduleChange.reason should explain why the order moved.

Keep implementation focused on correctness, not optimization.
