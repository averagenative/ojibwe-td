---
id: TASK-02
title: Walking Skeleton
status: pending
category: backend
phase: 2
openspec_ref: "Phase 2"
depends_on: []
created: 2026-02-28
---

## Description

Phase 2 of the GreenTD implementation. See proposal.md for full context.

## Acceptance Criteria

- [ ] Define map JSON schema (tile grid, waypoint array, buildable zone flags)
- [ ] Author first map JSON (single winding path, ~12 waypoints)
- [ ] Render tile-based map (path tiles vs buildable tiles, distinct colors)
- [ ] Implement `Creep` class (position, HP, speed, type, current waypoint index)
- [ ] Implement waypoint path-following (lerp between waypoints, advance on arrival)
- [ ] Render HP bar above each creep (scales with current/max HP)
- [ ] Implement lives system (decrement on creep reaching end, emit `lives-changed` event)
- [ ] Implement game over trigger (lives reach 0 → transition to placeholder GameOver screen)
- [ ] Render lives counter in HUD

## Notes

See openspec/changes/greentd-project/tasks.md Phase 2 for the full task list.
