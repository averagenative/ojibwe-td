---
id: TASK-120
title: Status Effect Visuals — Clip to Sprite Bounds, Not Full Box
priority: high
status: in-progress
type: bug
---

# Status Effect Visuals — Clip to Sprite Bounds

## Problem
Poison and other status effects (slow, etc.) visually cover the entire creep bounding box rather than just the sprite area. This looks bad — the tint/overlay extends beyond the actual creep graphic into empty space.

## Goal
Constrain status effect visuals (tint, overlay, particles) to the creep sprite bounds only.

## Requirements
- Investigate how status effect overlays are applied in Creep.ts (`refreshStatusVisual`, `_syncOverlay`)
- Ensure tint/color effects only apply to the sprite image, not the container or bounding box
- If using rectangle overlays, size them to match the sprite's visible area (not the full display size)
- Test with all status effects: poison (green), slow/frost (blue), and any other active effects
- Test with different creep sizes (normal, boss, mini)
