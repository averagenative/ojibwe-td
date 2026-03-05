---
id: TASK-169
title: Add 2 New Winter (Biboon-aki) Maps with Snow Terrain Visuals
status: pending
priority: medium
category: frontend
phase: content
depends_on: []
created: 2026-03-04
---

## Description

Add 2 new story maps to the winter/Biboon-aki region (Winter Lands) and
enhance the winter terrain with snow and ice visuals.

## New Maps

- `map-08.json` — unique path layout, 32x18 grid
- `map-09.json` — unique path layout, 32x18 grid

## New Stage Defs (stageDefs.ts)

- `biboon-aki-02` → pathFile `map-08`, region `biboon-aki`, appropriate unlock cost
- `biboon-aki-03` → pathFile `map-09`, region `biboon-aki`, higher unlock cost
- Add both to the `biboon-aki` region's `stages` array

## Winter Terrain Visual Enhancements

- Update the `winter` palette in `TerrainRenderer.ts`:
  - White/light blue ground base tones
  - Snow-covered tree visuals (white caps on conifer tops, white patches on branches)
  - Frosted rock textures (light blue-grey highlights)
  - Snow accumulation on BIRCH trees
  - Light blue water tiles (frozen/icy appearance)
  - Snowdrift decoration on buildable tiles (small white mounds)
  - Frost sparkle accents (tiny white dots scattered on ground)
- Generate winter tile sprites with PIL:
  - `tile-tree-winter.png` — conifer with snow on branches (white caps)
  - Consider `tile-rock-winter.png` — frosted rock with ice highlights
- Path should look like packed snow/ice (lighter colour, white edges)
- CATTAIL tiles should look frosted/dormant

## Map Design Guidelines

- Distinct path layouts
- Use TREE (3), ROCK (5), BIRCH (7), WATER (6) tiles (frozen lake areas)
- Adequate buildable space near chokepoints
- 20 starting lives, 200–250 starting gold

## Vignettes & Teachings

Current Act 4 narrator is **Mishoomis** (Grandfather) with portraits
`elder-mishoomis` and `elder-mishoomis-proud` — no new narrator assets needed.

Current Act 4 has 5 vignettes (arrival, mid-wave 10, Animikiins boss kill,
clean ending, bittersweet ending). With 3 stages in the region, add
stage-specific vignettes for the new maps:

- Add 2–3 new vignettes in `vignetteDefs.ts` for stages `biboon-aki-02` / `biboon-aki-03`
  - Use `stageId` field if stage-specific triggering is supported, otherwise use
    wave triggers that won't overlap with existing Act 4 vignettes
  - Speaker: Mishoomis
  - Themes: winter rest, ice and stillness, the source of the disturbance,
    approaching the heart of the imbalance, frozen lake crossings
  - Each should unlock a codex teaching (check codexDefs for unlinked teachings)
- If new teachings are needed, add entries to `codexDefs.ts` with appropriate iconKeys
  and generate matching 32x32 teaching icon PNGs

## Acceptance Criteria

- [ ] `map-08.json` and `map-09.json` created with valid tile grids and waypoints
- [ ] Stage defs added to `stageDefs.ts` with region `biboon-aki`
- [ ] Winter palette updated with white/light blue tones
- [ ] Snow-capped tree sprites generated and loaded
- [ ] Snowdrift and frost decorations on winter tiles
- [ ] Maps playable in-game with correct seasonal visuals
- [ ] New vignettes added for the new stages with codex teaching unlocks
- [ ] New teaching icons generated if new codex entries added
- [ ] All existing tests still pass
