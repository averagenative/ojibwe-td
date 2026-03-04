---
id: TASK-133
title: Fast Boss Speed Balance — Too Fast
status: in-progress
priority: high
category: backend
phase: balance
depends_on: []
created: 2026-03-03
---

## Description

The fast boss type is moving too quickly, making it feel unfair or unbeatable.
Review the speed values for fast boss creeps and compare against normal creep
speeds and tower firing rates to ensure there's a reasonable window for towers
to deal damage.

## Acceptance Criteria

- [ ] Audit fast boss speed in wave/creep data definitions
- [ ] Compare boss speed vs tower range and fire rate to calculate effective DPS window
- [ ] Reduce fast boss speed to a balanced value (should be fast but killable)
- [ ] Ensure boss still feels threatening — don't nerf too hard
- [ ] Document the speed change and rationale
