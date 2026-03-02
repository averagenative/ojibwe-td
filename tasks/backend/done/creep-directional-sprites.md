---
id: TASK-049
title: Creep Directional Sprites — Face Movement Direction
status: done
priority: high
phase: gameplay
---

# Creep Directional Sprites — Face Movement Direction

## Problem

Creeps currently look the same regardless of which direction they're moving.
A creep walking left looks identical to one walking right or down. This makes
the battlefield feel static and makes it harder to read creep flow at a glance.

## Goal

Creeps should visually indicate their movement direction — at minimum by
flipping/rotating their sprite, ideally with distinct shapes or poses for
cardinal directions.

## Acceptance Criteria

### Direction Detection
- [ ] `Creep.ts` tracks current movement direction based on velocity or
  waypoint heading: `'left' | 'right' | 'up' | 'down'`
- [ ] Direction updates each frame as the creep moves between waypoints
- [ ] Direction changes smoothly at waypoint turns (no teleport-snapping)

### Visual Rotation/Flip
- [ ] Creeps moving **right**: default facing (no transform)
- [ ] Creeps moving **left**: `flipX = true` (horizontal mirror)
- [ ] Creeps moving **down**: rotate sprite ~90° clockwise or use a distinct
  "front-facing" shape (wider, shorter silhouette)
- [ ] Creeps moving **up**: rotate sprite ~90° counter-clockwise or use a
  "back-facing" shape

### Shape Variation (stretch goal)
- [ ] If creeps are drawn procedurally (Graphics), adjust the body proportions:
  - Horizontal movement: wider oval, legs/appendages on sides
  - Vertical movement: taller oval, legs/appendages top/bottom
- [ ] Boss creeps should also respect directional facing
- [ ] Armoured creeps maintain their shield/armour indicator relative to
  facing direction

### Animation Feel
- [ ] Add a subtle bobbing motion (sine wave on Y position, ±1-2px) while
  moving to suggest walking/floating
- [ ] Bob frequency scales with move speed (faster = quicker bob)
- [ ] Bobbing pauses when creep is slowed/frozen (optional)

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] No performance impact — direction calc is simple vector math
- [ ] Works correctly at 1× and 2× game speed
- [ ] Creeps at spawn point face their initial movement direction
