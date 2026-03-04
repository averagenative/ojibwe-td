---
id: TASK-159
title: Tower Map Sprites Must Visually Match Selector Panel Icons
status: pending
priority: critical
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

The tower selector panel icons (from TASK-152) and the in-game map sprites (from
TASK-156) don't visually match. The most obvious example is the **Poison Tower**:
the selector icon shows a spider, but the in-game turret sprite is a green droplet
with legs — doesn't read as a spider at all.

All 6 tower types need their in-game base+turret sprites regenerated via DALL-E 3
so they are clearly recognizable as the same tower shown in the selector panel.

## Current Mismatches

Check each tower's selector icon (`assets/icons/icon-*.png`) against its map sprites
(`assets/towers/*-base.png` + `*-turret.png`) and regenerate any that don't match.

Known issues:
- **Poison Tower**: icon = spider, turret sprite = green droplet (not a spider)
- Review all other towers for similar mismatches

## Regeneration Approach

For each tower, look at the existing selector icon first, then generate map sprites
that are clearly the **same subject** seen from top-down:

| Tower | Selector Icon Subject | Map Sprite Should Be |
|---|---|---|
| Arrow | Bow/arrows | Top-down bow or arrow bundle on stone base |
| Rock Hurler | Boulder/catapult | Top-down catapult arm with boulder |
| Frost | Snowflake/ice crystal | Top-down ice crystal emitter |
| **Poison** | **Spider** | **Top-down spider body** (legs visible, green/purple) |
| Tesla | Lightning bolt/thunderbird | Top-down lightning rod/conductor |
| Aura | Medicine wheel/radial glow | Top-down radial spirit emanation |

## Sprite Specifications

Same specs as TASK-156:
- **Canvas size**: 64×64px, transparent background PNG
- **Top-down perspective** — looking straight down at the tower
- **Turret sprites**: centered, pointing up (0°), rotationally clean (no baked shadows)
- **Base sprites**: rotationally symmetric, neutral platform
- Consistent DALL-E 3 prompt style across all towers

## Prompt Strategy

For each tower, reference the selector icon subject explicitly:
> "Top-down view of [exact same subject as icon], Ojibwe woodland art style,
> bold geometric shapes, [matching colours from icon], transparent background,
> 64x64, centered, game sprite, no text, no shadow"

The key constraint: **a player looking at the selector icon should immediately
recognize which tower is placed on the map**.

## Acceptance Criteria

- [ ] All 6 tower turret sprites visually match their selector panel icons
- [ ] All 6 tower base sprites are consistent in style
- [ ] Poison tower turret is clearly a spider (matching the spider icon)
- [ ] Sprites replace existing files in `game/public/assets/towers/`
- [ ] No code changes needed (same filenames, same preload keys)
- [ ] Visual check: placing each tower type, the map sprite is immediately
      recognizable as the same thing shown in the selector panel
- [ ] `npm run typecheck` clean; `npm run test` passes
