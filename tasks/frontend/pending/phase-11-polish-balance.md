---
id: TASK-11
title: Polish & Balance
status: pending
category: frontend
phase: 11
openspec_ref: "Phase 11"
depends_on: []
created: 2026-02-28
---

## Description

Phase 11 of the GreenTD implementation. See proposal.md for full context.

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

## Notes

See openspec/changes/greentd-project/tasks.md Phase 11 for the full task list.
