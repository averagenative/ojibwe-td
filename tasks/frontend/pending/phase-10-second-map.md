---
id: TASK-10
title: Second Map
status: pending
category: frontend
phase: 10
openspec_ref: "Phase 10"
depends_on: ["TASK-09"]
created: 2026-02-28
---

## Description

Add a second playable map to extend replayability. The map favours AoE towers over single-target and features a longer path with multiple chokepoints, contrasting the first map's style. It is locked behind the meta-progression unlock tree. Selecting a map on the MainMenu loads its JSON into the Game scene; all gameplay systems are map-agnostic.

## Acceptance Criteria

- [ ] Design second map path (longer path, multiple chokepoints, favors AoE towers over single-target)
- [ ] Author second map JSON (waypoints, tile grid, buildable zones)
- [ ] Build map selection UI on MainMenu (map name, short description, path thumbnail preview)
- [ ] Wire map selection into game start (load chosen map JSON into Game scene)
- [ ] Lock second map behind unlock tree (purchasable with run currency)
- [ ] Add 10 additional roguelike offers to pool (ensure pool has variety at higher wave counts)
- [ ] Second map path MUST be validated: no dead-ends, all waypoints reachable, no buildable zone overlaps path
- [ ] Map selection UI MUST clearly indicate locked state and show unlock cost for locked maps
- [ ] Loading a different map between runs MUST not bleed state from the previous run's map
- [ ] Both maps MUST pass the same wave-completion flow (no map-specific gameplay bugs)

## Notes

See openspec/changes/greentd-project/tasks.md Phase 10 for the full task list.
