# Types Engineering Report

## What Was Implemented

Created the core TypeScript domain types for the production scheduling reflow system in `src/reflow/types.ts`.

Includes:

- Shift and maintenance models
- Work order, work center, and manufacturing order data
- Document wrapper types
- Reflow input/result contracts
- Schedule change tracking

## Architecture Decisions

- Interfaces only — no classes or generics
- Simple `{ docId, docType, data }` document structure
- ISO 8601 date strings for Luxon compatibility
- Separate input/output scheduler contracts
- Minimal and readable type design

## Assumptions

- All dates are UTC ISO strings
- Dependencies are stored as work order IDs
- `durationMinutes` is the source of truth for scheduling
- Shifts are day-based and use numeric hours
- Validation is handled outside the type layer

## Limitations

- No runtime validation
- No branded ID/date types
- No support for breaks or overnight shifts
- `ScheduleChange.reason` is a free-form string

## Future Improvements

- Add typed reason codes
- Add validation utilities
- Add warning/error result support
- Extend shift support for more complex schedules

## Scope

This layer only defines the scheduling domain model.
Reflow logic, constraint validation, and date calculations are implemented separately.
