---
id: TASK-047
title: Tower Attack Type Visuals — Distinct Projectile & Effect Styles
status: done
priority: high
phase: gameplay
---

# Tower Attack Type Visuals — Distinct Projectile & Effect Styles

## Problem

Towers currently fire generic projectiles that look similar across all types.
Each tower archetype should have a visually distinct attack style so players
can immediately read what's happening on the battlefield.

## Goal

Give each tower type a unique attack visual that communicates its role at a
glance — heavy impacts for cannon, icy trails for frost, explosive arcs for
mortar, toxic clouds for poison, chain lightning for tesla, pulsing rings for aura.

## Acceptance Criteria

### Per-Tower Attack Visuals
- [ ] **Cannon**: solid round projectile, slight smoke trail, impact dust puff
- [ ] **Frost**: pale blue crystalline shard, leaves a brief ice-sparkle trail,
  impact creates a small frost burst ring
- [ ] **Mortar**: arcing shell (parabolic tween or scale trick), explosion radius
  circle flash on impact, small debris particles
- [ ] **Poison**: green glob projectile, dripping trail particles, impact splatter
  that lingers briefly (DoT visual cue)
- [ ] **Tesla**: no projectile — chain lightning drawn as jagged line segments
  between tower → target → chain targets, with brief glow/fade
- [ ] **Aura**: no projectile — periodic pulse ring expanding outward from tower
  center (already partially implemented, refine timing and alpha)

### Projectile Trail System
- [ ] `Projectile.ts` updated with optional trail rendering — small particles
  or line segments left behind as projectile moves
- [ ] Trail colour/style determined by tower type key
- [ ] Trails fade and clean up automatically (alpha tween → destroy)
- [ ] Performance: max ~20 active trail particles per projectile, pooled or
  lightweight (Graphics strokes, not full game objects)

### Impact Effects
- [ ] Brief impact effect at point of damage — circle burst, particle spray,
  or screen-shake for mortar
- [ ] Impact colour matches tower theme
- [ ] Effects last 100-200ms then auto-destroy
- [ ] Must not obscure gameplay (low alpha, small radius)

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] No performance regression — 50+ active projectiles should still run at 60fps
- [ ] Effects must be visually distinct at 1× and 2× game speed
