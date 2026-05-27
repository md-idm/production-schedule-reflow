# Scenarios

## Goal

Create runnable demo scenarios for the production schedule reflow engine.

## Prompt

Follow the rules from `_base-context.md`.

Create sample data in `src/scenarios/` and wire it through `src/index.ts`.

Required scenarios:

- Delay Cascade
- Maintenance Conflict
- Shift Boundary

Requirements:

- Use the existing `reflowSchedule` function
- Use realistic work orders and work centers
- Print before/after schedule changes
- Show clear reasons for each moved work order
- Keep console output readable
- Do not add UI
- Do not add database or API

The demo should run with:

`pnpm dev`

Each scenario should clearly demonstrate one hard constraint:

- dependencies
- maintenance windows
- shift boundaries
- work center conflicts where useful
