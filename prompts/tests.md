# Scheduler Tests

## Goal

Add automated regression tests for the production scheduling reflow engine.

## Prompt

Follow the rules from `_base-context.md`.

Set up Vitest and create a focused automated test suite.

Requirements:

- Use Vitest
- Add a `pnpm test` script
- Keep tests readable and deterministic
- Do not overengineer
- Focus on correctness regression coverage

Add tests for:

## date-utils

- shift boundary carryover
- maintenance pause/resume
- invalid shift validation

## reflow.service

- dependency cascade
- work center conflict resolution
- shift boundary correction

## large dataset

- deterministic regression check:
  - generated dataset returns stable change count
  - no runtime assertion needed

Requirements:

- Use existing scenario patterns where useful
- Keep test data small and explicit
- Use clear test names
- Prefer direct assertions over snapshots
- Do not rewrite the architecture

Goal:

- Improve engineering confidence
- Add correctness verification
- Support interview discussion
