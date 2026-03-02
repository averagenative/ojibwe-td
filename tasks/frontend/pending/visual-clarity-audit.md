---
id: TASK-048
title: Visual Clarity Audit — Ensure Assets Don't Obscure Gameplay
status: in-progress
priority: high
phase: polish
---

# Visual Clarity Audit — Ensure Assets Don't Obscure Gameplay

## Problem

As we add terrain decorations, tower icons, attack effects, and palette changes,
there's a risk that visual clutter makes it hard to see critical gameplay info:
tower range circles, creep health bars, path boundaries, projectiles, and
placement previews.

## Goal

Audit all visual layers and ensure gameplay-critical elements are always clearly
visible on top of decorative elements. Establish a depth/alpha hierarchy that
prioritises readability over aesthetics.

## Acceptance Criteria

### Tower Range Circle
- [ ] Range circle renders clearly over ALL terrain types (dark ground, trees,
  rocks, snow, water-adjacent tiles)
- [ ] Range circle uses a high-contrast colour with sufficient alpha — test
  against each seasonal theme background
- [ ] Range circle stroke width ≥ 2px, colour distinct from terrain greens
  (suggest: white or cream at alpha 0.3-0.4, or PAL.accentBlue at 0.25)
- [ ] Selected tower range persists until deselected — no flicker

### Placement Preview
- [ ] Tower placement ghost is clearly visible over terrain decorations
- [ ] Valid placement: green-tinted semi-transparent tower at alpha 0.5-0.6
- [ ] Invalid placement (on path/occupied): red-tinted, clearly distinct
- [ ] Range preview circle visible during placement drag

### Creep Health Bars
- [ ] Health bars render above ALL decorative layers (trees, rocks, grass)
- [ ] Health bar background (black) + fill (green→yellow→red) has enough
  contrast against any terrain
- [ ] Boss creeps: health bar is larger and uses boss warning colour

### Path Visibility
- [ ] Creep path is visually distinct from buildable terrain — the trail
  should read clearly even with adjacent decorations
- [ ] Path edges have subtle border/contrast line separating path from ground
- [ ] Spawn and exit markers remain prominent

### Depth Hierarchy (verify correct ordering)
- [ ] Depth 0: terrain base (ground fills)
- [ ] Depth 1: terrain decorations (trees, rocks, grass)
- [ ] Depth 2-3: path rendering
- [ ] Depth 5: range circles, placement preview
- [ ] Depth 10: towers
- [ ] Depth 15: creeps + health bars
- [ ] Depth 20: projectiles + effects
- [ ] Depth 30+: UI panels, tooltips

### Colour Contrast Checks
- [ ] Test each seasonal theme (summer/spring/autumn/winter) to ensure:
  - Tower icons on the bottom panel are readable
  - Gold/lives HUD text is legible against the game background
  - Wave counter and speed buttons don't blend into terrain
- [ ] No gameplay element uses the same colour as its background layer

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Manual visual check on both maps at all 4 seasonal themes
- [ ] No decorative element placed at depth > tower/creep depth

## Notes

- This task should run AFTER TASK-046 (Natural Map Terrain) ships, since that
  task changes the entire terrain layer
- If conflicts are found, gameplay clarity ALWAYS wins over decoration aesthetics
- Consider adding a debug toggle (keyboard shortcut) that hides all decorations
  to verify gameplay layers look correct in isolation
