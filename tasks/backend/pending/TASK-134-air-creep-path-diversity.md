---
id: TASK-134
title: Air Creep Path Diversity — Not Just Diagonal
status: in-progress
priority: medium
category: backend
phase: balance
depends_on: []
created: 2026-03-03
---

## Description

Air creep pathing is currently a straight diagonal line across the map, which
looks boring and gives players no reason to think about air tower placement.
Air paths need more variety — curves, zigzags, or multiple entry/exit points.

## Acceptance Criteria

- [ ] Audit current air path definitions in map data files
- [ ] Design 2-3 varied air paths per map (curves, S-shapes, multi-entry)
- [ ] Air paths should cross different zones of the map to encourage diverse tower placement
- [ ] Ensure air paths work with existing air tower targeting/range
- [ ] Visual clarity — air paths should be distinguishable if shown on map
