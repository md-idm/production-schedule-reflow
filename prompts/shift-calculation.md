# Shift Calculation

## Goal

Implement shift-aware work duration calculation.

## Prompt

Follow the rules from `_base-context.md`.

Create a utility module in `src/utils/date-utils.ts`.

Implement:

- `calculateEndDateWithShifts`

Requirements:

- Use Luxon
- Input:
  - startDate
  - durationMinutes
  - shifts
  - maintenanceWindows
- Work only during active shifts
- Pause outside shift hours
- Resume in the next available shift
- Skip maintenance windows
- Return endDate as ISO string
- Assume UTC dates
- Use pure functions
- Keep logic simple and readable

Important:

- Correctness is more important than optimization
- Do not use classes
- Do not overengineer
- Add comments for important scheduling logic

The implementation should correctly handle:

- shift boundaries
- partial remaining duration
- maintenance overlap
- moving to the next working day
