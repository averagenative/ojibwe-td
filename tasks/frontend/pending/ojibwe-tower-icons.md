---
id: TASK-027
title: Ojibwe-Themed Tower Icons
status: pending
category: frontend
phase: 13
openspec_ref: ""
depends_on: []
created: 2026-03-01
---

## Description

The six tower icons are still WC3-era placeholder PNGs. Redesign them as Ojibwe-themed
SVG icons generated via `scripts/gen_icons.py` (ImageMagick + SVG → PNG pipeline).
Each icon should visually communicate the tower's function while drawing from Ojibwe
visual culture — geometric patterns, natural imagery, and the six directional colours
(black/red/yellow/white/blue/green).

## Acceptance Criteria

- [ ] `scripts/gen_icons.py` updated with six new SVG definitions replacing the placeholders:
  - **Cannon** → Bow & Arrow icon (geometric bow shape, arrow pointing right)
  - **Frost** → Snowflake / Biboon (winter spirit) — 6-pointed geometric snowflake
  - **Tesla** → Animikiikaa (Thunderbird) silhouette — stylised bird with lightning bolt wings
  - **Mortar** → Stone / Earth — concentric circle with dot centre (earth/target symbol)
  - **Poison** → Mashkiki (plant medicine) — stylised leaf or mushroom with spiral pattern
  - **Aura** → Medicine Wheel — circle divided into 4 quadrants, each a directional colour
- [ ] Icons generated at 64×64px and 32×32px variants, saved to `converted_assets/`:
  - `icon-cannon.png`, `icon-frost.png`, `icon-tesla.png`, `icon-mortar.png`, `icon-poison.png`, `icon-aura.png`
- [ ] `TowerPanel.ts` loads the new icons (verify asset key mappings are correct).
- [ ] Icons display correctly in the tower selection panel at both zoom levels.
- [ ] All icons use a consistent visual style: clean geometric lines, 2–3 colours per icon,
  readable at 32×32px on both light and dark backgrounds.
- [ ] `npm run typecheck` clean; icons visible in browser dev server.

## Notes

- `scripts/gen_icons.py` generates icons from inline SVG strings using ImageMagick's `convert`
  command — read it before adding new definitions to match the existing pattern.
- The Ojibwe Medicine Wheel colours are: East=yellow, South=red, West=black, North=white.
  Use these for the Aura icon quadrants.
- Thunderbird (Animikiikaa) is a significant cultural figure — keep the silhouette respectful
  and geometric rather than cartoonish.
- If ImageMagick SVG rendering is limited, use simple path shapes (polygons, circles, lines)
  rather than complex gradients.
- The `public/assets/icons` directory symlinks to `../../converted_assets` — regenerating
  icons there will be picked up automatically by Vite.
