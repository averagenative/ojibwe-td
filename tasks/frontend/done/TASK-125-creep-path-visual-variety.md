---
id: TASK-125
title: Creep Path Visual Variety — Less Monotonous Pathing
priority: medium
status: done
type: feature
creative: true
---

# Creep Path Visual Variety

## Problem
The creep path looks monotonous and visually boring — uniform ground tiles with no variation.

## Goal
Make the creep path more visually interesting with texture variety, edge details, and environmental elements along the path.

## Requirements
- Add visual variation to path tiles (worn dirt, grass patches, small stones, puddles, subtle color shifts)
- Path edges could have grass tufts, small rocks, or undergrowth bleeding in
- Consider alternating tile textures along the path to break up repetition
- Changes should be purely visual — do not modify actual pathing logic or walkable tiles
- Must work with all maps (check map data for path tile locations)
- Performance: keep tile count reasonable, especially on mobile
