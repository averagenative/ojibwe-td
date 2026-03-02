---
id: TASK-066
title: Creep Status Effect Visuals — Poison, Slow, Burn, Bleed Indicators
status: in-progress
priority: high
phase: polish
---

# Creep Status Effect Visuals — Poison, Slow, Burn, Bleed Indicators

## Problem

When creeps are affected by status effects (poison DoT, frost slow, shatter,
etc.), the visual feedback is minimal — Phase 11 added a green particle puff for
poison and an ice-blue tint for shatter, but these are easy to miss in a busy
battlefield. Players can't tell at a glance which creeps are poisoned, slowed,
burning, or stacking multiple effects.

## Goal

Add clear, distinct visual indicators for every status effect so players can
read the battlefield state instantly. Each effect should be visible even when
30+ creeps are on screen and multiple effects overlap.

## Acceptance Criteria

### Poison (DoT Active)
- [ ] Green bubbling particle trail behind the creep (small green circles that
  rise and pop, 3-4 active at a time)
- [ ] Creep body has a green-tinted overlay (semi-transparent green wash)
- [ ] Multi-stack poison: more intense green, more particles per stack
- [ ] Effect clears immediately when DoT expires

### Frost Slow
- [ ] Ice crystal particles around the creep (small blue-white sparkles)
- [ ] Creep movement visually sluggish (animation plays at reduced speed)
- [ ] Frost ring or ice patch beneath the creep's feet
- [ ] Deep freeze / shatter: creep turns pale blue-white, frost crystals more
  intense, slight transparency

### Burning (if applicable from cannon/mortar splash)
- [ ] Small flame particles rising from creep (orange-red, 2-3 at a time)
- [ ] Creep body flickers with warm orange tint
- [ ] Smoke trail behind moving creep (grey particles, lower opacity)

### Tesla / Electrified
- [ ] Brief electric arc lines around the creep on hit (already partially
  implemented in TASK-047 — enhance)
- [ ] Residual static: tiny spark particles for 0.5s after being hit by chain
  lightning
- [ ] Chain lightning visual clearly shows the arc path between chained creeps

### Armour Broken / Debuffed
- [ ] If cannon armour-shred is active: cracked shield icon or broken border
  visual on the creep
- [ ] Brief flash when armour break is applied

### Status Icon Bar (stretch)
- [ ] Small icon row above the creep health bar showing active effects:
  - 🟢 poison drop icon (with stack count number)
  - 🔵 snowflake icon (slow)
  - 🟠 flame icon (burn)
  - ⚡ lightning icon (shocked)
- [ ] Icons are tiny (6×6px) but readable in aggregate
- [ ] Only shown when creep has active status effects

### Implementation
- [ ] Each status effect has a `StatusEffectVisual` config:
  ```typescript
  { particleColor: 0x33ff33, tintColor: 0x33ff33, tintAlpha: 0.2,
    particleCount: 3, particleLifeMs: 400, icon: 'poison-drop' }
  ```
- [ ] `Creep.ts` manages active effect visuals — creates/destroys particle
  emitters and tint overlays as effects are applied/removed
- [ ] Effects composable: a creep can be poisoned AND slowed simultaneously,
  showing both indicators without visual conflict
- [ ] Use Phaser particle emitters with low emission rates (performance-safe)

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Status visuals don't obscure health bar or directional sprite
- [ ] Performance: 30 creeps with 2+ effects each stays above 30fps
- [ ] Effects clear cleanly on creep death (no orphaned particles)
- [ ] Works correctly at 1× and 2× game speed

## Notes

- Phase 11 already added: green puffs for poison (every 280ms via
  `poisonParticleTimer`), ice-blue tint for shatter, hit flash (80ms white
  tint). This task enhances and systematizes those into a proper effect system.
- The key improvement is making effects READABLE — current poison puffs are
  sporadic and easy to miss. A persistent green overlay + steady particle
  stream is much clearer.
- Multiple overlapping effects should blend, not fight — poison green + frost
  blue = both visible, not muddy brown
- The status icon bar is stretch but would be the gold standard for
  competitive TD players who want to optimize tower targeting
