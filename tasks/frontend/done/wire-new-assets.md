---
id: TASK-038
title: Wire Generated Assets Into Game UI
status: done
priority: high
phase: polish
---

# Wire Generated Assets Into Game UI

## Problem

The DALL-E pipeline generated 25 assets (portraits, creep sprites, map tiles,
tower icons) but the game still renders placeholder coloured rectangles for
commanders and creeps, and the map tiles are not loaded. Only tower icons are
wired.

## Goal

Load every new asset in BootScene and use them throughout the UI so players
see the actual Ojibwe art instead of geometry placeholders.

## Assets to Wire

### Commander Portraits (`assets/portraits/portrait-*.png`, 96×96)
- `portrait-nokomis.png`, `portrait-makoons.png`, `portrait-waabizii.png`,
  `portrait-bizhiw.png`, `portrait-animikiikaa.png`
- **CommanderSelectScene** — replace the coloured rectangle placeholder with
  the actual portrait image
- **VignetteOverlay** — replace the coloured rectangle + letter icon with the
  real portrait image keyed by `vignette.portrait`
- **HUD commander display** — if a portrait is shown there, use the real image

### Creep Sprites (`assets/sprites/creep-*.png`, 48×48)
- `creep-normal.png`, `creep-fast.png`, `creep-armored.png`,
  `creep-immune.png`, `creep-regen.png`, `creep-flying.png`,
  `creep-boss.png`, `creep-boss-mini.png`
- **Creep entity** (`src/entities/Creep.ts`) — replace the tinted rectangle
  with a Phaser Image using the sprite keyed by `CreepType`; preserve the
  tint-on-hit flash effect
- Map the `CreepType` enum values to texture keys:
  `normal→creep-normal`, `fast→creep-fast`, `armored→creep-armored`,
  `immune→creep-immune`, `regen→creep-regen`, `flying→creep-flying`,
  `boss→creep-boss`, `boss-mini→creep-boss-mini`

### Map Tiles (`assets/tiles/tile-*.png`, 64×64)
- `tile-tree.png`, `tile-brush.png`, `tile-rock.png`, `tile-water.png`
- **GameScene / map renderer** — if tiles are drawn as coloured rectangles,
  replace with tiled images; map tile type strings to texture keys
  (`tree→tile-tree`, `brush→tile-brush`, `rock→tile-rock`, `water→tile-water`)

## Acceptance Criteria

- [ ] All 25 texture keys are loaded in `BootScene.preload()` (or wherever
  assets are loaded) before any scene that uses them starts
- [ ] Commander select screen shows real portrait images, not coloured boxes
- [ ] VignetteOverlay uses portrait images when `vignette.portrait` is set;
  falls back gracefully to the letter icon if the texture key is missing
- [ ] Creeps render as sprites; tint-on-hit flash still works (use
  `setTintFill` or a brief tint on the image object)
- [ ] Map tiles render as images (or at minimum the tile sprites are loaded
  and available for future use)
- [ ] No console errors about missing textures

## Notes

- Assets live at `game/public/assets/` — Vite serves them from `/assets/`
- Texture key convention already established for icons: `icon-cannon`, etc.
  Use the filename minus extension as the key (e.g. `portrait-nokomis`)
- If a sprite looks wrong scale-wise, adjust `setDisplaySize` to match the
  existing placeholder dimensions rather than changing gameplay logic
