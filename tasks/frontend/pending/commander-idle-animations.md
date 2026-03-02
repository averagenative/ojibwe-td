---
id: TASK-056
title: Commander Portrait Idle Animations — Breathing, Expressions, Life
status: pending
priority: medium
phase: polish
---

# Commander Portrait Idle Animations — Breathing, Expressions, Life

## Problem

Commander portraits on the selection screen are static images. They look like
photos pinned to a board rather than living characters. Players should feel
like they're choosing a companion, not a trading card.

## Goal

Add subtle idle animations to commander portraits so they feel alive — gentle
breathing motion, occasional expression changes (smirk, blink, focused glare),
and ambient effects that match each commander's personality and element.

## Acceptance Criteria

### Base Breathing Animation (All Commanders)
- [ ] Subtle vertical scale oscillation on the portrait: scaleY 1.0 → 1.01 → 1.0
  on a slow sine wave (~3 second cycle)
- [ ] Slight scaleX inverse (1.0 → 0.995) to simulate chest expansion
- [ ] Breathing rate varies slightly per commander (calm vs aggressive personality)

### Expression Micro-Animations
- [ ] Every 5-10 seconds (randomized), commander does ONE of:
  - **Blink**: quick scaleY squish on eye region (or brief alpha dip, 100ms)
  - **Smirk/smile**: slight horizontal shift of lower portrait (1-2px, 200ms)
  - **Brow furrow**: slight downward shift of upper portrait region (1px, 300ms)
  - **Glance**: subtle horizontal shift of entire portrait (±2px, 400ms ease)
- [ ] Expression type weighted by commander personality:
  - Aggressive commanders: more glares and brow furrows
  - Wise commanders: more slow blinks and gentle smiles
  - Trickster commanders: more smirks and glances

### Per-Commander Ambient Effects
- [ ] Elemental particle effects around the portrait frame:
  - Fire-aligned: subtle ember particles drifting up from bottom
  - Ice-aligned: occasional frost sparkle at portrait edges
  - Lightning-aligned: brief electric arc flicker on frame border
  - Nature-aligned: gentle leaf particle drift
  - Spirit-aligned: soft ethereal glow pulse on portrait border
- [ ] Effects are subtle — they accent the portrait, not overwhelm it

### Selection Feedback
- [ ] When a commander is hovered: breathing speeds up slightly, ambient effect
  intensifies
- [ ] When selected: brief "power up" flash, then settle into confident pose
  (slight zoom to 1.05× scale, then ease back to 1.02×)
- [ ] Unselected commanders dim slightly and slow their breathing

### Technical Approach
- [ ] Use Phaser tweens for breathing and expression animations — no new sprites
  needed
- [ ] Particle effects via `Phaser.GameObjects.Particles.ParticleEmitter` or
  simple Graphics circles with alpha fade
- [ ] All animations defined in a `commanderAnimDefs.ts` config file:
  ```typescript
  { breathRate: 3000, expressionPool: ['blink', 'smirk'], element: 'fire' }
  ```
- [ ] Animations start in `CommanderSelectScene.create()`, stop in `shutdown()`

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Animations don't interfere with portrait click/selection handling
- [ ] Performance: 6 animated portraits simultaneously without frame drops
- [ ] Animations pause when scene is not active

## Notes

- This is purely cosmetic but high-impact for player engagement — the commander
  select screen is where players bond with their character
- Keep it subtle. Overanimated portraits feel uncanny. The goal is "this
  character is alive" not "this character is having a seizure"
- If commander portraits are currently generated images (DALL-E/AI art), the
  animations work on the full portrait image — no sprite layers needed
- Future: these animations could also play during boss encounters ("your
  commander reacts to the boss appearing")
