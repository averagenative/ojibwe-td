---
id: TASK-106
title: Evaluate Orchestrator Pipeline for Token Cost Reduction
priority: high
status: pending
type: infra
---

# Evaluate Orchestrator Pipeline for Token Cost Reduction

## Problem
The orchestrator pipeline uses Claude agents for tasks that may not require LLM reasoning — burning tokens on work that bash scripts could handle deterministically and for free.

## Goal
Audit the full orchestrator pipeline (parallel-orchestrator.sh, orchestrator.sh, agent prompts, pre/post steps) and identify stages where bash scripts could replace or reduce LLM calls.

## Audit Areas
- **Task claiming & status management** — can file renames / sed replacements replace agent calls?
- **Pre-implementation checks** — file existence, grep for patterns, test runs — all scriptable
- **Post-implementation validation** — TypeScript compilation (`npx tsc --noEmit`), lint, test suite — could run as bash before sending to review agent
- **Review stage** — can we pre-filter obvious failures (build errors, test failures) before spending opus tokens on review?
- **Commit & ship stage** — git operations are already scripted but check for unnecessary agent involvement
- **Health check triage** — currently creates tasks; could bash auto-fix trivial patterns (unused imports, missing semicolons)
- **Prompt size** — are we sending too much context in agent prompts? Can we trim boilerplate?

## Deliverable
- A written analysis in `docs/token-optimization.md` listing each pipeline stage, current token cost (estimated), and recommended bash replacement or reduction
- Implement quick wins (bash pre-validation, build-before-review gate) immediately
- Flag larger refactors as follow-up tasks
