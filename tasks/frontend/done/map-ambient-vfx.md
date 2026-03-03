---
id: TASK-073
title: Map Ambient VFX — Glistening Vines, Snow Twinkle, Water Shimmer
status: done
priority: medium
phase: polish
---

# Map Ambient VFX — Glistening Vines, Snow Twinkle, Water Shimmer

## Problem

Even with environment tiles (TASK-029) and critters (TASK-072), maps still feel
like static paintings. Real forests glisten with dew, snow catches the light,
water ripples — the world should breathe.

## Goal

Add region-appropriate ambient particle and shader effects that run continuously
during gameplay, making each map feel alive without impacting performance or
readability.

## Region Effects

### Zaaga'iganing (Lakeside)
- **Dappled sunlight**: slow-moving light patches that drift across open ground
  (large, very faint yellow circles that fade in/out)
- **Water shimmer**: gentle sparkle particles along any water tile edges
- **Vine glow**: periodic soft green pulse on vine/brush decorations, like dew
  catching sunlight

### Mashkiig (Wetland/Marsh)
- **Mist**: low-hanging fog layer that drifts slowly across the bottom third of
  the map (semi-transparent white, very low alpha)
- **Fireflies**: 3-5 warm yellow-green dots that drift lazily near water/brush
  tiles, fading in and out
- **Bubbles**: occasional tiny bubble particle rising from swamp water tiles

### Mitigomizh (Oak Savanna)
- **Pollen/seeds**: tiny floating particles drifting on wind (slow horizontal
  drift with gentle sine-wave vertical bob)
- **Grass sway**: subtle color shift on open ground tiles in a wave pattern
  (wind moving through grass)
- **Butterfly**: rare single butterfly that flits across the screen (1 per
  30-60 seconds, sine-wave path)

### Biboon-aki (Winter/Frozen)
- **Snow twinkle**: tiny white sparkle particles on tree and ground tiles,
  brief flash like sunlight on ice crystals
- **Light snowfall**: sparse gentle snowflakes drifting down (5-8 on screen,
  slow diagonal drift)
- **Breath frost**: faint puff particles near the HUD area (as if the
  commander is watching in the cold)
- **Aurora shimmer**: very faint, slow-moving color bands across the top of
  the sky (green/purple, barely visible)

### Niizh-miikana (Two Paths)
- **Falling leaves**: occasional leaf particle with rotation and sine-wave
  drift (2-3 on screen)
- **Light rays**: diagonal god-rays through the canopy (faint additive-blend
  rectangles that slowly shift position)

## Acceptance Criteria

### Implementation
- [ ] `AmbientVFX` class or module that reads the current region and spawns
  the appropriate effect set
- [ ] Effects are lightweight Phaser particle emitters or Graphics-based
  (no heavy textures)
- [ ] All effects render at depth 2 (above terrain, below path markers/towers)
- [ ] Effects do NOT obscure creeps, towers, or UI — keep alpha very low
- [ ] Region ID determines which effect set loads (from stageDefs regionId)

### Performance
- [ ] On mobile: reduce particle count by 50-60%, disable the most expensive
  effects (mist layer, aurora)
- [ ] Total particle budget: max 30 active particles across all effects
- [ ] Effects pause when game is paused (speedMultiplier === 0)

### Integration
- [ ] Initialised in GameScene.create() after map is loaded
- [ ] Cleaned up in GameScene.shutdown()
- [ ] Does not interfere with placement preview, range circles, or any
  interactive elements

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] No frame rate regression on desktop or mobile
- [ ] Effects are purely cosmetic — zero gameplay impact

## Notes

- The key principle: SUBTLE. These effects should be noticed subconsciously,
  not consciously. If a player thinks "wow look at those particles" they're
  too prominent.
- All effects should be deterministic where possible (seeded by map position)
  so they feel like part of the world, not random noise.
- This pairs with TASK-029 (environment tiles) and TASK-072 (critters) to
  create a fully alive map. The three tasks can be done independently.
