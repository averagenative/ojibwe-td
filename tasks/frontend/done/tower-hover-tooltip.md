---
id: TASK-042
title: Tower Panel — Hover Tooltip
status: done
priority: high
phase: polish
---

# Tower Panel — Hover Tooltip

## Problem

Hovering a tower button in the bottom panel shows no information beyond the
icon, cost, and truncated name. Players can't tell what a tower does before
buying it.

## Goal

Show a small tooltip above the hovered tower button with its name, cost, DPS
stats, and a one-line description. Tooltip disappears when the pointer leaves
the button.

## Acceptance Criteria

- [ ] `TowerPanel` shows a tooltip on `pointerover` of each tower button,
  positioned **above** the button (so it doesn't overlap the panel itself)
- [ ] Tooltip contains:
  - Tower name (e.g. `FROST`)
  - Cost: `150g`
  - Damage / interval: e.g. `25 dmg  ·  1.2s`
  - Range: e.g. `range 130`
  - One-line flavour/mechanic note pulled from `def.description` (add this
    field to `TowerDef` if not already present — see notes below)
- [ ] Tooltip is destroyed (or hidden) on `pointerout`
- [ ] Only one tooltip is visible at a time — moving quickly between buttons
  never leaves a ghost tooltip behind
- [ ] Tooltip does not render outside the viewport — if the rightmost button's
  tooltip would clip the right edge, shift it left
- [ ] Tooltip depth is above all panel elements (`DEPTH + 20` or higher)
- [ ] Styled consistently with the natural palette:
  - Background: dark panel `0x141f0e` with border `0x2D5016`
  - Name text: `#a8c070` (or `PAL.textPrimary` if palette.ts exists)
  - Stats text: `#7a9e52`
  - Description text: `#4a6130` (dim)

## TowerDef description field

Each tower definition needs a short mechanic description. Suggested strings
(add to the def objects in `src/data/towerDefs.ts` or wherever defs live):

| Tower    | description                                      |
|----------|--------------------------------------------------|
| Cannon   | Single target. High damage, moderate fire rate.  |
| Frost    | Slows targets. Chills stack for a freeze bonus.  |
| Tesla    | Chains lightning to up to 3 nearby enemies.      |
| Mortar   | Area splash damage. Ignores terrain.             |
| Poison   | Applies damage-over-time. Spreads on creep death.|
| Aura     | Boosts nearby tower attack speed and damage.     |

If `TowerDef` already has a `description` field, use it. If not, add
`description: string` to the interface and populate it for all 6 towers.

## Implementation Notes

- `TowerPanel` receives `TowerDef[]` and has access to `scene` — all info
  needed is already in scope
- Create a small helper `showTooltip(def, bx, panelY)` / `hideTooltip()`
  inside `TowerPanel` using Phaser `Graphics` + `Text` objects stored in
  instance variables
- Alternatively, a separate `TowerTooltip` class keeps TowerPanel clean
- The tooltip should appear above `panelY - PANEL_HEIGHT / 2` so it floats
  over the map, not over other panel elements
- On mobile (pointer = touch) the tooltip can be skipped or shown briefly
  on `pointerdown` — touch players see the ghost placement preview instead

## Key Files

- `game/src/ui/TowerPanel.ts` — add tooltip logic here
- `game/src/entities/towers/Tower.ts` (or towerDefs data file) — add
  `description` field to `TowerDef`
