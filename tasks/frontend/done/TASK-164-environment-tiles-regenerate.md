---
id: TASK-164
title: Regenerate All Environment Tiles — Consistent DALL-E 3 Top-Down Style
status: done
priority: high
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

The current environment tiles (tree, brush, rock, water) shipped from TASK-029 are
visually inconsistent with each other and with the game's art style:
- `tile-brush.png` — photorealistic overhead photo, doesn't match game
- `tile-rock.png` — isometric 3D cube pile, wrong perspective
- `tile-tree.png` — dark blob, no detail, doesn't read as a tree
- `tile-water.png` — geometric slab with hard edges, looks artificial

All 4 tiles need regenerating with a **consistent top-down perspective** and
**Ojibwe woodland art style** matching the tower sprites (TASK-156) and icons (TASK-152).

## Current Files

```
game/public/assets/tiles/
├── tile-brush.png    ← photorealistic, wrong style
├── tile-rock.png     ← isometric 3D, wrong perspective
├── tile-tree.png     ← dark shapeless blob
└── tile-water.png    ← geometric slab, ugly
```

## Regeneration Requirements

All tiles must be:
- **Top-down perspective** (looking straight down, matching the game camera)
- **Semi-flat Ojibwe woodland art style** — bold shapes, natural colours, clean
- **64×64px PNG** with transparent background
- **Visually consistent** across all 4 tiles (same prompt style, same rendering approach)
- **Readable at small sizes** (~40px in-game) — silhouette matters more than detail
- **Tileable-friendly** — should look natural when multiple appear near each other

### Tile Descriptions

| Tile | Subject | Colours | Notes |
|---|---|---|---|
| **tile-tree.png** | Top-down pine/birch tree cluster, 2-3 trees visible from above | Forest green (#2D5016), pine shadow (#1A3009) | Round canopy shapes, slight variation in size |
| **tile-brush.png** | Low bushes / fern ground cover, top-down | Light green (#6B8F3E), earth brown | Soft organic shapes, lower profile than trees |
| **tile-rock.png** | Granite boulder cluster, 2-3 rounded stones from above | Grey (#8C8070), dark grey, slight moss green | Rounded natural shapes, NOT cubic/isometric |
| **tile-water.png** | Small pond or lake patch, top-down | Lake blue (#4A7FA5), lighter blue (#6FA8C4) | Organic shoreline edges, subtle ripple texture, NOT a rectangle |

### DALL-E 3 Prompt Strategy

Use a consistent base prompt for all:
> "Top-down view of [subject], Ojibwe woodland art style, bold geometric shapes,
> natural colours, transparent background, 64x64, game tile sprite, northern Ontario
> landscape, no text, no shadow, semi-flat, clean edges"

The key difference from TASK-029: explicitly specify **top-down perspective** and
**consistent semi-flat style** — avoid photorealism, avoid isometric, avoid 3D.

## Acceptance Criteria

- [ ] 4 regenerated tile PNGs, all 64×64px with transparent background
- [ ] All tiles use consistent top-down perspective
- [ ] All tiles use consistent Ojibwe woodland art style
- [ ] Water tile has organic edges (not rectangular) with subtle ripple detail
- [ ] Rock tile is rounded boulders from above (not isometric cubes)
- [ ] Tree tile is clearly recognizable as tree canopy from above
- [ ] Brush tile is low ground cover, visually distinct from trees
- [ ] Tiles replace existing files in `game/public/assets/tiles/` (same filenames)
- [ ] No code changes needed — same preload keys, same rendering pipeline
- [ ] Tiles look natural when placed adjacent to each other on the map
- [ ] `npm run typecheck` clean; `npm run test` passes
