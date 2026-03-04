---
id: TASK-156
title: In-Game Tower Sprites Overhaul — DALL-E 3 Base + Turret Sprites
status: pending
priority: high
category: frontend
phase: polish
depends_on: [TASK-152]
created: 2026-03-04
---

## Description

Replace the current procedural tower rendering (colored rectangles + icon overlay)
with proper DALL-E 3 generated sprites. Each tower needs a **base** sprite and a
**turret** sprite so the turret can rotate programmatically to face targets while
the base stays fixed.

Art style should match the TASK-152 icon overhaul — Ojibwe woodland-inspired,
semi-flat, bold geometric shapes, natural colours.

## Current Architecture

Towers are rendered as a Phaser Container:
- `_bodyRef`: 28×28 solid-colour Rectangle (the "tower")
- `_iconRef`: 20×20 icon overlay (from `assets/icons/`)
- The entire container rotates via `setAngle()` to face targets

Rotation behaviour varies by tower type:
- **Rock Hurler, Mortar, Cannon**: Full barrel tracking (~10°/frame lerp toward target)
- **Tesla**: Subtle ±3° lean toward target
- **Frost, Arrow, Aura**: No rotation (static)

## New Sprite Architecture

Each tower gets **two layers** rendered in the Container:
1. **Base sprite** — fixed, never rotates. Represents the tower platform/foundation.
2. **Turret sprite** — rotates to face target. Represents the weapon/barrel/emitter.

For non-rotating towers (Frost, Arrow, Aura), the turret sprite still exists but
is drawn in a neutral orientation and never rotated.

## Assets to Generate

All sprites should be **top-down perspective**, designed to look correct when the
turret layer rotates 360°. Turret sprites must be **rotationally clean** — no
shadows or details that look wrong at odd angles.

| Tower | Base Visual | Turret Visual | Rotates? |
|---|---|---|---|
| **Arrow Tower** | Circular stone platform, earth tones | Bow or crossed arrows, pointing up | No |
| **Rock Hurler** | Heavy stone foundation, rough edges | Catapult arm / throwing arm, pointing up | Yes |
| **Frost Tower** | Ice crystal platform, blue/white | Snowflake or ice shard emitter | No |
| **Poison Tower** | Dark mossy base, green/purple tones | Spider body or venom dripper | No |
| **Tesla Tower** | Metal/copper circular base | Lightning rod / conductor spike | Lean only |
| **Aura Tower** | Medicine wheel base, warm tones | Radial spirit glow / emanation ring | No |

## File Deliverables

```
game/public/assets/towers/
├── arrow-base.png
├── arrow-turret.png
├── rock-hurler-base.png
├── rock-hurler-turret.png
├── frost-base.png
├── frost-turret.png
├── poison-base.png
├── poison-turret.png
├── tesla-base.png
├── tesla-turret.png
├── aura-base.png
└── aura-turret.png
```

## Sprite Specifications

- **Canvas size**: 64×64px (renders at ~28-32px in-game via scale, allows crisp detail)
- **Transparent background** (PNG with alpha)
- **Top-down perspective** — as if looking straight down at the tower
- **Turret sprites**: weapon/emitter centered, pointing **straight up** (0° = up).
  The game will rotate this sprite to face the target.
- **Base sprites**: rotationally symmetric or neutral — should look correct regardless
  of turret angle on top
- **Consistent art style** across all 6 towers — same prompt parameters, same visual weight
- **Readable at 28-32px** — bold shapes, not too detailed

## Prompt Strategy

Use a consistent base prompt for all sprites, e.g.:
> "Top-down view flat icon of [subject], Ojibwe woodland art style, bold geometric shapes,
> [2-3 colours], transparent background, 64x64, centered, clean silhouette, no text,
> no shadow, simple, game sprite"

For turret sprites, add:
> "weapon pointing straight up, rotationally clean design, no directional shadow"

## Code Changes

### BootScene.ts
- Preload all 12 new sprites from `assets/towers/`

### Tower.ts
- Replace `_bodyRef` (Rectangle) with `_baseSprite` (Image) — does not rotate
- Replace `_iconRef` (Image) with `_turretSprite` (Image) — receives rotation
- `_baseSprite` added to container first (below), `_turretSprite` on top
- `setAngle()` calls now target `_turretSprite` only, not the whole container
- Tier scaling (`tierSizeScale`) applies to both sprites equally
- Fire animations (recoil, pulse, kick) apply to `_turretSprite`
- Idle animations (sweep, bob) apply to `_turretSprite`

### Existing behaviour preserved
- Range circle, selection ring, aura pulse all stay on the container
- Rubble sprites (TASK-071) unaffected — they're independent of tower rendering
- Tower sell/place logic unchanged

## Acceptance Criteria

- [ ] 12 new PNG sprites generated via DALL-E 3 (6 bases + 6 turrets)
- [ ] All sprites 64×64px with transparent background
- [ ] Consistent Ojibwe-inspired art style matching TASK-152 icons
- [ ] Turret sprites designed for 360° rotation (no baked-in shadows/direction)
- [ ] Tower.ts refactored: separate base (static) and turret (rotating) Image objects
- [ ] Barrel tracking rotation applies to turret sprite only
- [ ] Idle animations (sweep, bob, pulse) apply to turret sprite only
- [ ] Fire animations (recoil, kick, flash) apply to turret sprite only
- [ ] Tier scaling applies to both base and turret sprites
- [ ] BootScene preloads all 12 new assets
- [ ] No regression in tower placement, selling, targeting, or upgrade visuals
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes — update structural tests if Tower rendering assertions change
