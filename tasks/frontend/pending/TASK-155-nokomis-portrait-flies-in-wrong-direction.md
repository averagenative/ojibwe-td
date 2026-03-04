---
id: TASK-155
title: Nokomis Commander Portrait Flies Right-to-Left on Scene Entry
status: pending
priority: high
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

When the commander selection screen loads, the Nokomis portrait animates in from the
wrong direction — it flies right-to-left before settling in its correct position.
All other commander portraits animate correctly. It ends up in the right place but
the entry animation is visually wrong.

## Likely Cause

Commander portraits slide in from the sides on scene entry. Nokomis is the leftmost
card but may have its initial off-screen x position set incorrectly — starting from
the right side of the screen instead of the left.

Check `CommanderSelectScene.ts` where portrait slide-in tweens are defined:
- The starting x offset for each portrait's enter tween
- Whether Nokomis is being treated as a right-side card instead of left-side
- Any card index or position calculation that may be off-by-one for Nokomis specifically

## Acceptance Criteria

- [ ] Nokomis portrait slides in from the left (same direction as cards to its left,
  or fades in if it's the first/only default card)
- [ ] Entry animation is consistent with all other commander cards
- [ ] No position jitter or wrong-direction movement on scene load
- [ ] Fix does not affect other commander portrait animations
- [ ] `npm run typecheck` clean; `npm run test` passes

## Files to Investigate

- `game/src/scenes/CommanderSelectScene.ts` — portrait slide-in tween setup,
  card index/position calculations, Nokomis-specific handling
