Reviewing the codebase against these guidelines so I can align with the project's architecture and constraints.

I've noted the project context. Here's how it maps to the current repo and how I'll approach implementation.

Current state

src/reflow/types.ts — domain types are defined
src/reflow/reflow.service.ts — empty (orchestration entry point)
src/reflow/constraint-checker.ts — empty (constraint validation)
src/utils/date-utils.ts — empty (Luxon date/shift logic)
src/scenarios/\*.ts — empty (test scenarios)
Planned structure (aligned with your rules)

Layer Responsibility
date-utils.ts
Pure Luxon helpers: shift windows, maintenance overlap, next available slot
constraint-checker.ts
Pure checks for dependencies, conflicts, shifts, maintenance
reflow.service.ts
Deterministic reflow: take ReflowInput, return ReflowResult
scenarios/
Concrete inputs that exercise each hard constraint
Approach I'll follow

Correctness first — each hard constraint gets an explicit check before a work order is placed
Deterministic logic — stable sort order, no randomness, predictable cascade when a trigger order moves
Pure functions — date math and constraint checks stay side-effect free; the service owns mutation of the schedule copy
Minimal architecture — no generics, no classes, no extra layers beyond service + utils + types
Readable naming — e.g. findNextAvailableSlot, violatesDependency, overlapsMaintenanceWindow
When you're ready, say which piece to build first — date utils, constraint checker, reflow service, or a specific scenario.
