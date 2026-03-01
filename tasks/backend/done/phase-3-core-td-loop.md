---
id: TASK-03
title: Core TD Loop
status: done
category: backend
phase: 3
openspec_ref: "Phase 3"
depends_on: []
created: 2026-02-28
---

## Description

Phase 3 of the GreenTD implementation. See proposal.md for full context.

## Acceptance Criteria

- [x] Implement tower placement (click buildable tile → deduct gold → place tower sprite)
- [x] Render tower range circle (on hover during placement, on click when placed)
- [x] Implement targeting system (find nearest creep in range on attack timer tick)
- [x] Implement `Cannon` tower (fires single-target projectile, 1s attack interval baseline)
- [x] Implement `Projectile` class (travels toward target position, deals damage on arrival)
- [x] Implement creep death (remove sprite, award kill gold, emit `creep-killed` event)
- [x] Implement gold system (starting gold, earn on kill, display in HUD)
- [x] Implement basic `WaveManager` (spawn creeps at interval from a hardcoded wave def)
- [x] Implement wave complete detection (all creeps dead or escaped → between-wave pause)
- [x] Implement tower sell (right-click → refund 70% gold, remove tower)

## Notes

See openspec/changes/greentd-project/tasks.md Phase 3 for the full task list.
