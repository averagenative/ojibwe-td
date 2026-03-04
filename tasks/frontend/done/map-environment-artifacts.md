---
id: TASK-029
title: Map Environment Artifacts & Buildable Tile System
status: pending
priority: medium
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
adding strategic depth.

**Art style**: Use DALL-E 3 generated sprites for all environment decorations — NOT
Phaser graphics primitives. The decorations should visually stand out and match the
Ojibwe woodland art style used in tower icons (TASK-152). Top-down perspective,
semi-flat, bold shapes, natural colours.

## Assets to Generate

All sprites should be **top-down perspective**, transparent background PNG, sized to
fit within a single tile (~48×48px, generate at 64×64 for crisp downscale).

Use a consistent DALL-E 3 prompt style:
> "Top-down view of [subject], Ojibwe woodland art style, bold geometric shapes,
> natural colours, transparent background, 64x64, no text, no shadow, game sprite,
> northern Ontario landscape"

| Asset | Visual | Colours | Blocks Building? |
|---|---|---|---|
| **Pine Tree** | Top-down pine tree cluster, 2-3 trees | Dark green (#2D5016), pine shadow (#1A3009) | Yes |
| **Birch Tree** | Top-down birch grove, white bark visible | White, light green, tan | Yes |
| **Brush / Undergrowth** | Low bushes / ferns, soft ground cover | Light green (#6B8F3E), earth brown | No |
| **Rock Outcrop** | Granite boulders, 2-3 rounded stones | Grey (#8C8070), dark grey | Yes |
| **Water / Pond** | Small pond or puddle, still water | Lake blue (#4A7FA5), lighter blue ripple | No |
| **Cattails / Marsh** | Marsh grass with cattail stalks | Marsh green (#6B8F3E), brown stalks | No |

## File Deliverables

```
game/public/assets/environment/
├── env-pine.png
├── env-birch.png
├── env-brush.png
├── env-rock.png
├── env-water.png
└── env-cattail.png
```

## Acceptance Criteria

- [ ] 6 environment sprite PNGs generated via DALL-E 3
- [ ] All sprites 64×64px with transparent background, top-down perspective
- [ ] Consistent Ojibwe-inspired art style across all sprites
- [ ] New tile type constants added to map data: `TREE`, `BIRCH`, `BRUSH`, `ROCK`, `WATER`, `CATTAIL`
  (in addition to existing `PATH`, `BUILDABLE`, `EMPTY`).
- [ ] Map JSON for both `map-01` and `map-02` updated to include environment tiles —
  at minimum 10–15% of non-path tiles should have decoration.
- [ ] **Tile rendering** uses the DALL-E 3 sprites (Phaser Image objects), not graphics primitives
- [ ] **TREE, BIRCH, and ROCK tiles block tower placement** — clicking them shows "Can't build here"
  message and does not place a tower.
- [ ] `BRUSH`, `WATER`, and `CATTAIL` tiles allow building (soft decoration only).
- [ ] Map thumbnail previews on `MainMenuScene` map cards update to show environment tiles
  (even if just as coloured dots at the thumbnail scale).
- [ ] Tile blocking is data-driven: `MapData` tile type determines buildability, not hardcoded
  pixel checks. A `isBuildable(tileType)` utility returns false for blocking types.
- [ ] Environment tiles render at depth below towers (towers always visible above decoration).
- [ ] BootScene preloads all 6 environment sprites
- [ ] `npm run typecheck` clean; `npm run test` passes (update any map fixture data in tests).

## Notes

- Use the tile's grid position (`col * 31337 + row * 7919`) as a seed for selecting
  which decoration variant to place — keeps placement deterministic across loads.
- Don't place decoration tiles adjacent to PATH tiles — keep a 1-tile clear border around
  the path so creep rendering stays readable.
- The `isBuildable()` check should replace any existing pixel-colour-based placement
  detection if that's what's currently used.
- Vary decoration density: some areas denser (near map edges), sparser near path for readability.
