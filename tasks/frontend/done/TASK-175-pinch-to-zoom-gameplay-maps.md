---
id: TASK-175
title: "Gameplay: pinch-to-zoom on maps"
status: done
category: frontend
phase: release
priority: high
depends_on: []
created: 2025-03-07
---

## Description

Add pinch-to-zoom support during gameplay so players can zoom in/out on the map. This is a standard mobile expectation for strategy/TD games and helps with precise tower placement on smaller screens.

## Acceptance Criteria

- [x] Pinch gesture zooms the game camera in/out
- [x] Zoom has reasonable min/max bounds (don't zoom out past map edges, don't zoom in too far)
- [x] Zoom is smooth and responsive
- [x] HUD elements stay fixed (don't scale with map zoom)
- [x] Double-tap to reset zoom to default (optional but nice)
- [x] Single-finger drag pans/scrolls the map when zoomed in
- [x] Camera pan is bounded — cannot scroll past map edges at any zoom level
- [x] Works alongside existing controls without conflict

## Notes

- Phaser camera has built-in zoom support — wire up touch gesture detection.
- May need to adjust tower placement coordinates to account for zoom level.
