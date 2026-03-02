---
id: TASK-046
title: Natural Map Terrain — Replace Tiled Icons with Procedural Landscape
status: done
priority: critical
phase: polish
creative: true
---

# Natural Map Terrain — Replace Tiled Icons with Procedural Landscape

## Problem

The current map rendering tiles 4 asset images (tree, brush, rock, water) in a
mechanical repeating pattern across every buildable cell: `TILE_KEYS[(row * cols + col) % 4]`.
The result looks like wallpaper — every cell is a full icon, tiled uniformly, with
no sense of natural landscape. It's hideous and undermines the Ojibwe aesthetic.

## Goal

Replace the tiled-icon approach with procedural terrain rendering that feels like
a natural Northern Ontario landscape viewed from above — boreal forest clearings,
granite outcrops, marshland, lakeshore. Buildable tiles should look like open ground
where towers could plausibly be placed. Decorative elements (trees, rocks, reeds)
should be sparse and placed with organic variation, not carpeted across every cell.

## Design Reference

Think satellite/aerial imagery of Northern Ontario:
- **Boreal forest clearings**: Mossy ground with scattered conifers at edges
- **Canadian Shield granite**: Exposed grey-pink rock with lichen patches
- **Marshland**: Wet ground with sedge grass clumps, cattails near water
- **Lakeshore**: Sand/gravel transitions, driftwood, smooth stones

Each map has a seasonal theme (summer/spring/autumn/winter) — terrain colours
should reflect the season.

## Acceptance Criteria

### Terrain Base Layer (GameScene.renderMap)
- [ ] Buildable tiles (TILE=0) rendered as solid ground fill using subtle colour
  variation — NOT tiled icons. Use Phaser Graphics with per-tile colour noise:
  - Base colour from season palette (e.g. summer: mossy green, winter: snow-white)
  - Each tile gets a slight random tint shift (±5-10% brightness) seeded by position
  - Optional: 1-2px darker grid lines at tile borders for visual structure
- [ ] Path tiles (TILE=1) rendered as worn dirt/gravel trail — keep current brown
  fill but add subtle texture variation (lighter center, darker edges)
- [ ] No tile-sized icons stamped across the grid

### Decorative Scatter Layer
- [ ] Sparse decorative elements drawn ON TOP of the base layer using Graphics:
  - Small trees (green circles/triangles) at ~10-15% of buildable tiles, clustered
    near map edges and path borders — NOT uniformly distributed
  - Rock clusters (grey irregular shapes) at ~5% of tiles, preferring corners and
    edges of open areas
  - Grass/reed tufts (short strokes) at ~8% of tiles near path and water features
- [ ] Decorative placement uses a seeded pseudo-random function (position-based)
  so the same map always looks the same
- [ ] Decorations must NOT obscure gameplay — they sit at depth 0 (below towers,
  creeps, projectiles)
- [ ] Decorations should NOT appear on path tiles or directly adjacent to spawn/exit

### Seasonal Variation
- [ ] Each `SeasonalTheme` produces distinct ground colours:
  - `summer`: warm mossy green base (`0x2a3a1a`), dark green trees
  - `spring`: fresh green with blue-tinted wet patches
  - `autumn`: golden-brown ground, orange-tinted tree clusters
  - `winter`: white/pale blue ground, bare grey trees, snow patches
- [ ] The season is determined by the stage's region theme (already in stageDefs.ts)

### Map Edge & Atmosphere
- [ ] Map edges (outermost 1-2 rows/cols) should have denser tree cover to frame
  the playfield — creates a "clearing in the forest" feel
- [ ] Subtle vignette or darkening at map edges (optional, low priority)

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Existing tile assets (`tile-tree.png` etc.) can remain in assets/ but should
  no longer be rendered in the main map view
- [ ] Performance: rendering 576 tiles (32×18) must complete in <50ms — use
  Graphics batching, not individual game objects per tile

## Implementation Notes

- All rendering happens in `GameScene.renderMap()` (~line 577)
- Current tile images loaded in `BootScene.loadAssets()` (lines 79-83)
- Use `Phaser.GameObjects.Graphics` for all terrain — one Graphics object for
  base tiles, one for decorations. Avoid creating 500+ individual game objects.
- Seed the decoration RNG with map ID + tile position for deterministic placement:
  `hash(mapId + row * 1000 + col)` — simple multiply-xorshift is fine
- The `SCENERY` tile type (value=2) is defined but unused — could be used for
  pre-placed decorations in future map designs

## Model Routing

This task benefits from creative/visual thinking for the terrain design.
Use **opus** for the implement stage (research + design the procedural algorithm)
and **sonnet** for any mechanical follow-up fixes.
