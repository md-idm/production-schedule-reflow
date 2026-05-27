# README Generation

## Goal

Create a professional README for the production scheduling reflow engine.

## Prompt

Follow the rules from `_base-context.md`.

Create a concise but professional `README.md`.

The README should include:

# Sections

1. Project Overview

- Explain the scheduling/reflow problem
- Explain the goal of the engine

2. Features
   Include:

- dependency-aware scheduling
- shift-aware duration calculation
- maintenance window handling
- work center conflict resolution
- deterministic multi-pass reflow
- large generated dataset support

3. Architecture
   Briefly describe:

- `types.ts`
- `date-utils.ts`
- `constraint-checker.ts`
- `reflow.service.ts`
- `scenarios/`

4. Reflow Algorithm
   Describe the scheduling flow at a high level:

- dependency resolution
- conflict resolution
- recalculation
- iterative convergence

5. Demo Scenarios
   Describe:

- Delay Cascade
- Maintenance Conflict
- Shift Boundary
- Work Center Conflict
- Large Dataset

6. Performance
   Include:

- before optimization (~28s for 1000 work orders)
- after optimization (~6s for 1000 work orders)
- 5000 work orders (~2m)

7. Assumptions
   Include:

- UTC dates
- no overnight shifts
- deterministic ordering
- no persistence layer

8. Limitations
   Include:

- no topological sort
- no advanced scheduling heuristics
- no UI/API/database
- pairwise overlap logic inside work centers

9. Running the Project

Include:

```bash
pnpm install
pnpm dev
pnpm build
```

10. AI-Assisted Development

State that:

- AI tools were used for exploration and implementation assistance
- architectural decisions and final implementation were reviewed and refined manually

Requirements:

- Keep the README readable and engineering-focused
- Avoid marketing language
- Keep explanations concise
- Use proper markdown structure
