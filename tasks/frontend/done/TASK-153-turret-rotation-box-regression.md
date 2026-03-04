---
id: TASK-153
title: Turret Rotation Box Still Visible — Regression from TASK-119
status: done
priority: high
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

The square/rectangular box around tower turrets is still visible when towers rotate
to aim at creeps. This was supposed to be fixed in TASK-119 but the issue persists.

The box is especially noticeable during rotation — the hitbox/bounding rect is being
rendered or a debug graphic is still showing.

## Acceptance Criteria

- [ ] No visible rectangular box around any tower turret sprite during idle or rotation
- [ ] Investigate what TASK-119 changed and why the box is still appearing
- [ ] Likely causes:
  - A debug graphics object still being drawn (`this.add.rectangle(...)` or similar)
  - The turret sprite itself has a visible border baked into the asset
  - Phaser `setInteractive()` debug rendering enabled
  - A separate selection/hover indicator being shown unintentionally
  - The sprite frame has a visible bounding box in the spritesheet
- [ ] Fix applies to all tower types
- [ ] No regression in click/interaction target area
- [ ] `npm run typecheck` clean; `npm run test` passes

## Files to Investigate

- `game/src/entities/towers/Tower.ts` — turret sprite creation, debug graphics
- `game/src/scenes/GameScene.ts` — tower placement, interaction setup
- `game/src/ui/TowerSelectIndicator.ts` (if exists) — selection box visuals
- Tower sprite assets — check if the PNG itself has a box baked in

## Notes

- Check git diff on TASK-119 changes to understand what was attempted
- If the fix in TASK-119 only removed it from one state (e.g. idle) but not rotation, extend it
