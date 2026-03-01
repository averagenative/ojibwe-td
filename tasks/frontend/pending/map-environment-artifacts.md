---
id: TASK-029
title: Map Environment Artifacts & Buildable Tile System
status: pending
category: frontend
phase: 13
openspec_ref: ""
depends_on: []
created: 2026-03-01
---

## Description

Both maps are visually sparse — flat coloured tiles with a path. Add environmental
decoration (trees, brush, rock outcroppings, water features) to make the maps feel
like northern Ontario / Great Lakes landscape. Some tiles should block tower placement,
adding strategic depth. All rendering uses Phaser graphics primitives — no new assets.

## Acceptance Criteria

- [ ] New tile type constants added to map data: `TREE`, `BRUSH`, `ROCK`, `WATER` (in
  addition to existing `PATH`, `BUILDABLE`, `EMPTY`).
- [ ] Map JSON for both `map-01` and `map-02` updated to include environment tiles —
  at minimum 10–15% of non-path tiles should have decoration.
- [ ] **Tile rendering in `MapRenderer.ts`** (or equivalent):
  - `TREE` — dark green circle cluster (2–3 overlapping circles of varying size)
  - `BRUSH` — light green irregular blob (polygon with slight randomisation seeded by tile pos)
  - `ROCK` — grey irregular polygon, 5–7 vertices
  - `WATER` — blue rectangle with a lighter blue horizontal stripe (ripple effect, static)
- [ ] **TREE and ROCK tiles block tower placement** — clicking them shows "Can't build here"
  message and does not place a tower.
- [ ] `BRUSH` and `WATER` tiles allow building (soft decoration only).
- [ ] Map thumbnail previews on `MainMenuScene` map cards update to show environment tiles
  (even if just as coloured dots at the thumbnail scale).
- [ ] Tile blocking is data-driven: `MapData` tile type determines buildability, not hardcoded
  pixel checks. A `isBuildable(tileType)` utility returns false for `TREE` and `ROCK`.
- [ ] Environment tiles render at depth below towers (towers always visible above decoration).
- [ ] `npm run typecheck` clean; `npm run test` passes (update any map fixture data in tests).

## Notes

- Use the tile's grid position (`col * 31337 + row * 7919`) as a seed for any
  "randomised" shape so decoration is deterministic (same every load, no jitter).
- Northern Ontario palette: forest green (#2D5016), pine shadow (#1A3009), granite grey
  (#8C8070), lake blue (#4A7FA5), cattail marsh (#6B8F3E).
- Don't place decoration tiles adjacent to PATH tiles — keep a 1-tile clear border around
  the path so creep rendering stays readable.
- The `isBuildable()` check should replace any existing pixel-colour-based placement
  detection if that's what's currently used.
