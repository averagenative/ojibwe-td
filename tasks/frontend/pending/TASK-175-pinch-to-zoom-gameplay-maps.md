---
id: TASK-175
title: "Gameplay: pinch-to-zoom on maps"
status: pending
category: frontend
phase: release
priority: high
depends_on: []
created: 2025-03-07
---

## Description

Add pinch-to-zoom support during gameplay so players can zoom in/out on the map. This is a standard mobile expectation for strategy/TD games and helps with precise tower placement on smaller screens.

## Acceptance Criteria

- [ ] Pinch gesture zooms the game camera in/out
- [ ] Zoom has reasonable min/max bounds (don't zoom out past map edges, don't zoom in too far)
- [ ] Zoom is smooth and responsive
- [ ] HUD elements stay fixed (don't scale with map zoom)
- [ ] Double-tap to reset zoom to default (optional but nice)
- [ ] Works alongside existing pan/drag controls without conflict

## Notes

- Phaser camera has built-in zoom support — wire up touch gesture detection.
- May need to adjust tower placement coordinates to account for zoom level.
