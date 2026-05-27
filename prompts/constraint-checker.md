# Constraint Checker

## Goal

Implement schedule validation helpers for the production scheduling system.

## Prompt

Follow the rules from `_base-context.md`.

Create validation utilities in:

`src/reflow/constraint-checker.ts`

Implement pure functions for:

- dependency validation
- work center overlap detection
- maintenance conflict detection
- shift validation

Requirements:

- Use readable pure functions
- Keep validation logic separate
- Return boolean values or descriptive errors
- Use Luxon where needed
- Reuse existing date utilities if useful
- Prioritize correctness and readability

Validation rules:

Dependencies:

- child work order cannot start before all parents finish

Work center conflicts:

- work orders on the same work center cannot overlap

Maintenance:

- work orders cannot overlap maintenance windows

Shifts:

- work orders must stay within valid shift working periods

Important:

- Do not overengineer
- Do not use classes
- Do not add optimization logic
- Keep the API simple and explicit
