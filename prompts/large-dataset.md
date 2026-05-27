# Large Dataset Scenario

## Goal

Add a generated large demo dataset to show that the scheduler can process many work orders.

## Prompt

Follow the rules from `_base-context.md`.

Create:

- `src/scenarios/demo-data-generator.ts`
- `src/scenarios/large-dataset.ts`

Requirements:

- Generate a realistic large `ReflowInput`
- Default to 1000 work orders
- Make work order count configurable up to 5000
- Use multiple work centers
- Use weekday shifts
- Add some maintenance windows
- Add simple dependency chains
- Keep generation deterministic, not random
- Run `reflowSchedule`
- Print summary only:
  - work order count
  - work center count
  - change count
  - runtime with `console.time` / `console.timeEnd`
- Do not print every work order
- Do not add UI
- Do not add database or API
- Do not change the reflow algorithm

Purpose:

- Demonstrate large demo data
- Keep the scenario readable and fast enough for `pnpm dev`
