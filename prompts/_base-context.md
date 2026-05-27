# Project Context

This project is a TypeScript production scheduling reflow engine.

The goal is to build a correct and readable scheduling algorithm for manufacturing work orders.

Priority:

1. Algorithm correctness
2. Readability
3. Maintainability
4. Simplicity over optimization

Hard constraints:

- work order dependencies
- work center conflicts
- shift boundaries
- maintenance windows

Rules:

- prefer simple and deterministic logic
- avoid overengineering
- avoid unnecessary abstractions
- avoid unnecessary generics
- use pure functions where possible
- keep files focused and readable
- prioritize correctness over performance

Tech stack:

- TypeScript
- Luxon
- pnpm

Architecture:

- service-based structure
- utility functions for date logic
- no database
- no API
- no UI

Expected style:

- readable TypeScript
- minimal architecture
- explicit naming
- strong separation of concerns
