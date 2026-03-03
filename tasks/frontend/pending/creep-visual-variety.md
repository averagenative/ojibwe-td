---
id: TASK-028
title: Creep Visual Variety
status: pending
priority: medium
category: frontend
phase: 13
openspec_ref: ""
depends_on: []
created: 2026-03-01
---

## Description

All creeps currently render as similar-looking shapes. Each creep type should be visually
distinct so players can identify wave composition at a glance — armoured creeps should
look armoured, fast creeps should look nimble, boss creeps should look imposing.
Use Phaser graphics primitives (no new asset files required).

## Acceptance Criteria

- [ ] Each creep type has a unique visual signature — distinct shape, colour scheme, and/or
  markings. At minimum:
  - **Normal** — plain rectangle, warm tan/brown (base reference)
  - **Fast** — elongated diamond / arrow shape, bright yellow-orange
  - **Armoured** — rectangle with a visible border/shell overlay, silver-grey with dark edge
  - **Immune** — circle with a pulsing white outline (immune = can't be slowed/poisoned)
  - **Regenerating** — rectangle with small green "+" symbols or a green pulse effect
  - **Flying** — diamond with small wing nubs, light blue tint, renders slightly above path
    (higher depth value, shadow dot on path below)
  - **Boss (Waabooz)** — large rectangle 2× normal size, deep red with white stripe pattern,
    health bar always visible
  - **Waabooz mini-copy** — small version, same red/white colouring, 0.6× scale
- [ ] Creep size scales with HP tier: wave 1–5 creeps slightly smaller than wave 15–20 creeps
  (scale from 0.85× to 1.15× of the base size over the wave range).
- [ ] Health bar visible on all creeps when HP < 100% (already existing — verify it still works
  with new visuals).
- [ ] All rendering is done in `Creep.ts` `draw()` or equivalent method using
  `this.scene.add.graphics()` — no new image assets.
- [ ] Performance: creep drawing uses `geom` objects or cached graphics, not re-creating
  Graphics objects every frame.
- [ ] Visual changes do not affect hitbox or pathfinding — only rendering.
- [ ] Looks correct on both Map 1 and Map 2 tile sizes.
- [ ] `npm run typecheck` clean; `npm run test` passes.

## Notes

- Flying creeps: raise `setDepth()` by +2 compared to ground creeps, add a small grey
  circle at the same x/y at ground depth to simulate a shadow.
- The Immune pulsing outline can be a simple `tween` on alpha (0.4 → 1.0 loop) on a
  Graphics object drawn outside the creep container.
- Keep visual complexity low — these are game units, not character art. Geometric shapes
  with consistent colour language are preferable to complex sprites.
