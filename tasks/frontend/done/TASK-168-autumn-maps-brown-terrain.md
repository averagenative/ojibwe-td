---
id: TASK-168
title: Add 2 New Autumn (Mitigomizh) Maps with Brown Terrain Visuals
status: done
priority: medium
category: frontend
phase: content
depends_on: []
created: 2026-03-04
---

## Description

Add 2 new story maps to the autumn/Mitigomizh region (Oak Savanna) and
enhance the autumn terrain palette with warmer brown elements.

## New Maps

- `map-06.json` — unique path layout, 32x18 grid
- `map-07.json` — unique path layout, 32x18 grid

## New Stage Defs (stageDefs.ts)

- `mitigomizh-02` → pathFile `map-06`, region `mitigomizh`, appropriate unlock cost
- `mitigomizh-03` → pathFile `map-07`, region `mitigomizh`, higher unlock cost
- Add both to the `mitigomizh` region's `stages` array

## Autumn Terrain Visual Enhancements

Typical autumn palette: browns, dark oranges, reds (fall foliage colours).

- Update the `autumn` palette in `TerrainRenderer.ts`:
  - Dark brown ground base (dried earth)
  - treeColors: deep reds, burnt orange, dark amber, russet brown (fall foliage)
  - trunkColor: dark brown
  - grassColor: golden brown / dried tan
  - rockColor: warm grey-brown
  - Fallen leaf scatter on ground tiles (small red, orange, brown dots/shapes)
  - accentOverlay: scattered fallen leaves (reds, oranges)
- Generate autumn tile sprites:
  - `tile-tree-autumn.png` — tree with red/orange/brown foliage
  - `tile-brush-autumn.png` — dried golden-brown brush
- BRUSH tiles should render with dried golden-brown tones in autumn
- BIRCH trees should have orange/yellow foliage instead of green
- Path should look like packed dirt with scattered leaf litter

## Map Design Guidelines

- Distinct path layouts (not variations of existing Z or spiral)
- Use TREE (3), BRUSH (4), ROCK (5), BIRCH (7) tiles for visual variety
- Adequate buildable space near chokepoints
- 20 starting lives, 200–250 starting gold

## Vignettes & Teachings

Current Act 3 narrator is **Ogichidaa** (Warrior Elder) with portraits
`elder-ogichidaa` and `elder-ogichidaa-fierce` — no new narrator assets needed.

Current Act 3 has 4 vignettes (arrival, mid-wave 10, Migizi boss kill, stage end).
With 3 stages in the region, add stage-specific vignettes for the new maps:

- Add 2–3 new vignettes in `vignetteDefs.ts` for stages `mitigomizh-02` / `mitigomizh-03`
  - Use `stageId` field if stage-specific triggering is supported, otherwise use
    wave triggers that won't overlap with existing Act 3 vignettes
  - Speaker: Ogichidaa
  - Themes: controlled burns, fire as renewal, oak resilience, open-ground strategy
  - Each should unlock a codex teaching (check codexDefs for unlinked teachings)
- If new teachings are needed, add entries to `codexDefs.ts` with appropriate iconKeys
  and generate matching 32x32 teaching icon PNGs

## Acceptance Criteria

- [ ] `map-06.json` and `map-07.json` created with valid tile grids and waypoints
- [ ] Stage defs added to `stageDefs.ts` with region `mitigomizh`
- [ ] Autumn palette updated with warmer browns
- [ ] Leaf litter or brown decoration on autumn buildable tiles
- [ ] Maps playable in-game with correct seasonal visuals
- [ ] New vignettes added for the new stages with codex teaching unlocks
- [ ] New teaching icons generated if new codex entries added
- [ ] All existing tests still pass
