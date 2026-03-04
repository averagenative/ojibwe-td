---
id: TASK-149
title: Debuff Visual Effects Should Cover Creep Sprite Only, Not Full Box
status: pending
priority: high
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

Status effect visuals (poison, frost slow, burn, etc.) on creeps currently render as
rectangles/boxes that cover the entire creep bounding box rather than conforming to the
actual pixel art sprite. This looks bad — the colored overlay should only appear on the
visible creep pixels, not the transparent background.

Note: TASK-120 was supposed to fix this but the box issue persists.

## Acceptance Criteria

- [ ] Debuff overlays (tint, color shift, particle effects) are masked or bounded to the
  actual creep sprite pixels, not the full rectangular bounds
- [ ] Approaches to investigate:
  - Use Phaser's `setTint()` / `setTintFill()` on the sprite itself (tints only opaque pixels)
  - If using a separate overlay graphic, apply an alpha mask from the creep's texture
  - Particle-based effects (poison drips, frost crystals) should emit from sprite bounds
- [ ] All debuff types render correctly: poison (green), frost/slow (blue), burn (orange),
  any other status effects
- [ ] Debuffs still visible and readable at small creep sizes
- [ ] Works with animated creep sprites (walking frames, directional sprites)
- [ ] `npm run typecheck` clean; `npm run test` passes

## Files to Investigate

- `game/src/entities/Creep.ts` — debuff rendering, tint application
- `game/src/systems/StatusEffectRenderer.ts` or similar — if a separate renderer exists
- `game/src/scenes/GameScene.ts` — where debuffs are applied visually
