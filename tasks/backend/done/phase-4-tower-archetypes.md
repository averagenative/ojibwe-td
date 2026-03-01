---
id: TASK-04
title: All 6 Tower Archetypes
status: done
category: backend
phase: 4
openspec_ref: "Phase 4"
depends_on: []
created: 2026-02-28
---

## Description

Phase 4 of the GreenTD implementation. See proposal.md for full context.

## Acceptance Criteria

- [x] Implement status effect system (modifiers on creeps: slow %, DoT stacks, freeze)
- [x] Implement `Frost` tower (projectile applies slow modifier, stacks diminish over time)
- [x] Implement `Mortar` tower (fires at ground target position, AoE splash on impact, ignores air)
- [x] Implement AoE damage resolver (damage all creeps within splash radius)
- [x] Implement `Poison` tower (hit applies DoT stack; each stack ticks damage independently)
- [x] Implement `Tesla` tower (on fire: damages primary target + chains to N nearest creeps)
- [x] Implement `Aura` tower (no attack; emits passive buff aura affecting towers in range)
- [x] Implement aura buff system (fire rate and/or damage multiplier applied to towers in aura range)
- [x] Build tower selection panel in HUD (6 buttons, show name + cost, disabled if insufficient gold)

## Notes

See openspec/changes/greentd-project/tasks.md Phase 4 for the full task list.
