---
id: TASK-11
title: Polish & Balance
status: in-progress
category: frontend
phase: 11
openspec_ref: "Phase 11"
depends_on: ["TASK-10"]
created: 2026-02-28
---

## Description

Final polish and balance pass before the v1.0 release. Adds visual feedback (hit flash, death effects, status-effect tints), sound effects, and keyboard shortcuts. Runs 3 full-length playtest sessions to tune wave difficulty, tower economy, and roguelike offer power level. Validates performance (40+ simultaneous entities) and cross-browser compatibility.

## Acceptance Criteria

- [ ] Add creep hit flash (brief white tint on damage received)
- [ ] Add creep death effect (small particle burst or scale-out tween)
- [ ] Add tower fire visual feedback (muzzle flash or projectile trail per tower type)
- [ ] Add slow/freeze visual on affected creeps (blue tint for slow, ice overlay for freeze)
- [ ] Add poison visual on affected creeps (green particle aura while DoT is active)
- [ ] Add sound effects (tower fire, creep death, wave complete, upgrade purchased, life lost)
- [ ] Add keyboard shortcuts (Space = pause, F = speed toggle, Esc = deselect tower)
- [ ] Implement run stats tracking (total kills, gold earned, waves survived; shown on end screen)
- [ ] Balance wave difficulty curve (3 playtest sessions; tune HP/speed scaling coefficients)
- [ ] Balance tower economy (costs, sell refunds, upgrade costs; target: gold is always tight but never blocking)
- [ ] Balance roguelike offer power (no single offer should be auto-pick every run)
- [ ] Performance audit (profile 40+ simultaneous creeps + projectiles; optimize draw calls if needed)
- [ ] Cross-browser smoke test (Chrome, Firefox, Safari; verify no rendering regressions)
- [ ] Game MUST maintain ≥ 60 fps with 40 simultaneous creeps + all active projectiles on a mid-range laptop
- [ ] All sound effects MUST have a mute/volume toggle accessible from the HUD
- [ ] Keyboard shortcuts MUST not conflict with browser defaults (avoid Ctrl/Cmd combos)
- [ ] Balance sign-off: at least 3 complete playtests logged, with documented tuning changes per session

## Notes

See openspec/changes/greentd-project/tasks.md Phase 11 for the full task list.
