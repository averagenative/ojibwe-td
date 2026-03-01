---
id: TASK-020
title: Wire Commander Ability Effects
status: pending
category: frontend
phase: 12
openspec_ref: ""
depends_on: ["TASK-018"]
created: 2026-03-01
---

## Description

Four commander ability/aura effects were stubbed during Tower Commanders (TASK-018) — the
state flags are set but the game systems don't read them. This task wires them into the
actual damage, targeting, and projectile pipelines so they have real gameplay impact.

## Acceptance Criteria

- [ ] **Bizhiw aura — projectile travel speed +25%**: `Projectile.ts` reads `scene.data.get('projectileSpeedMult')` (or equivalent channel from `GameScene`) and multiplies `this.speed` during `update()`. Value is 1.0 normally, 1.25 when Bizhiw aura is active.
- [ ] **Makoons aura — sticky target retention**: `Tower.ts` `findTarget()` checks if the current target is still active and in range before searching for a new one. If still valid, keep it regardless of priority mode (prevents re-acquisition on speed-burst creeps).
- [ ] **Animikiikaa aura — Tesla chain triggers 1-tile AoE on each jump**: When Tesla chain fires and `teslaChainAoE` aura flag is active, each chain-jump hit applies splash damage (same as chain damage) to all creeps within 1 tile of the jump target.
- [ ] **Makoons ability — ignore armor and immunity**: When `ignoreArmorAndImmunity` flag is active in `GameScene`, Tower.ts damage application bypasses `creep.isArmored` and `creep.isImmune` checks for the ability duration (15 seconds per TASK-018 spec).
- [ ] All four effects activate/deactivate cleanly — no state leak between runs (verify on game restart via GameScene shutdown).
- [ ] Existing unit tests still pass (`npm run test`).
- [ ] TypeScript compiles with no new errors (`npm run typecheck`).

## Notes

- `GameScene` already manages the aura flags via `CommanderSystem` from TASK-018 — check `src/systems/CommanderSystem.ts` for the state shape.
- The `teslaChainAoE` flag likely lives on the GameScene or is passed through the `getAuraState()` accessor — read those files before modifying Tower.ts.
- Keep changes minimal: only touch `Projectile.ts`, `Tower.ts`, and `GameScene.ts` (for flag passing). Do not refactor the aura system.
