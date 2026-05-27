# Reflow Optimization

## Goal

Improve reflow performance for large generated datasets without changing algorithm behavior.

## Prompt

Follow the rules from `_base-context.md`.

Optimize `src/reflow/reflow.service.ts`.

Current issue:

- work center conflict detection compares work orders against the full schedule
- large datasets (1000–5000 work orders) become slow

Requirements:

- keep the same public API
- keep deterministic behavior
- keep the same scheduling correctness
- optimize overlap checks by reducing unnecessary comparisons
- avoid checking unrelated work centers
- preserve maintenance work orders as fixed obstacles
- do not change the reflow algorithm conceptually
- do not add complex data structures
- do not overengineer

Focus:

- readability
- correctness
- practical scalability improvement

Expected result:

- noticeably faster runtime for large dataset scenarios
- same scheduling results
