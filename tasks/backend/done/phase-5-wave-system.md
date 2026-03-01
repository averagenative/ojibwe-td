---
id: TASK-05
title: Wave System
status: done
category: backend
phase: 5
openspec_ref: "Phase 5"
depends_on: []
created: 2026-02-28
---

## Description

Phase 5 of the GreenTD implementation. See proposal.md for full context.

## Acceptance Criteria

- [ ] Define creep type data JSON (ground/air, base HP, speed, armor, gold reward per type)
- [ ] Define 20 wave templates in JSON (difficulty band per wave, eligible creep type pool)
- [ ] Implement randomized wave composition (pick from eligible pool within difficulty budget)
- [ ] Implement HP and speed scaling curve (multiply base stats by wave number factor)
- [ ] Implement air creep type (Mortar cannot target, requires Cannon/Tesla/Frost)
- [ ] Implement wave completion bonus gold (flat + wave number multiplier)
- [ ] Implement speed controls (1× / 2× / pause toggle in HUD)
- [ ] Implement wave counter display in HUD (Wave 3 / 20)
- [ ] Calculate and store run currency on run end (formula: waves × completion multiplier)

## Notes

See openspec/changes/greentd-project/tasks.md Phase 5 for the full task list.
