---
id: TASK-055
title: Creep Walking & Movement Animations — Sprite Frame Sequences
status: done
priority: high
phase: polish
---

# Creep Walking & Movement Animations — Sprite Frame Sequences

## Problem

Creeps slide across the map like chess pieces — they face their movement
direction (TASK-049) and bob slightly, but have no actual walking or movement
animation. Wings don't flap, legs don't move, bodies don't undulate. The
battlefield feels static despite all the directional sprite work.

## Goal

Add frame-based or procedural movement animations to all creep types so they
visually "move" as they travel. Ground creeps walk/scuttle, air creeps flap
wings, boss creeps lumber or soar with weight appropriate to their size.

## Acceptance Criteria

### Ground Creep Animations
- [ ] Each ground creep type has a 2-4 frame walk cycle:
  - **Normal (deer)**: legs alternate, gentle trot
  - **Fast (fox)**: rapid leg cycle, body stretches forward
  - **Armoured (porcupine/turtle)**: slow heavy waddle, shell/quills shift
  - **Immune (spirit)**: floating drift, subtle pulse/shimmer instead of walk
  - **Regenerating (salamander)**: slithering body wave, tail sway
- [ ] Walk cycle speed scales with creep movement speed (faster = quicker cycle)
- [ ] Walk pauses when creep is frozen/stunned

### Air Creep Animations
- [ ] Wing flap cycle for all air creeps (2-3 frames):
  - Wings up → wings level → wings down → wings level (repeat)
  - Flap speed proportional to movement speed
- [ ] **Basic flier**: steady medium flap
- [ ] **Scout (hawk)**: quick sharp flaps with occasional glide frame
- [ ] **Armoured (raven)**: slower heavy wingbeats
- [ ] Shadow beneath air creeps pulses slightly with wing flaps

### Boss Animations
- [ ] **Makwa (Bear)**: heavy lumber, body sways side to side, forepaws alternate
- [ ] **Migizi (Eagle)**: majestic slow wingbeats (if air) or proud strut (if ground)
- [ ] **Waabooz (Hare)**: quick hop cycle — crouch, leap, land, pause (repeat)
- [ ] **Animikiins (Thunderbird)**: energy crackle effect, wings pulse with lightning
- [ ] Boss animations more detailed than regular creeps (larger sprite = more frames)

### Implementation Approach
- [ ] Prefer spritesheet approach: each creep sprite becomes a horizontal strip
  of frames in a single PNG (e.g. `creep-normal-walk.png` = 4 frames × 32px)
- [ ] Load as Phaser spritesheets: `this.load.spritesheet('creep-normal', ...)`
- [ ] Use `Phaser.GameObjects.Sprite.play()` with animation configs
- [ ] Fallback: if spritesheets not available, use procedural animation
  (scale/rotate oscillation on the existing single-frame sprites)
- [ ] Animation configs defined in a central `creepAnimDefs.ts` file

### Procedural Fallback (if sprite generation is slow)
- [ ] Squash-and-stretch: subtle scaleX/scaleY oscillation (±5-10%) synced
  to movement
- [ ] Leg stubs: small Graphics lines below the sprite that alternate position
- [ ] Wing flap: rotate wing sub-sprites ±15° on a sine wave
- [ ] These work with the existing single-frame PNGs from TASK-054

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Animations work at 1× and 2× game speed
- [ ] No performance regression with 30+ animated creeps on screen
- [ ] Animations pause when game is paused
- [ ] Creep death animation (existing scale-out tween) still works

## Notes

- TASK-049 already added directional facing and a Y-axis bobbing motion —
  this task builds on top of that with actual frame animation
- TASK-054 generated the static sprites — this task either creates animated
  versions (spritesheets) or adds procedural animation on top
- The procedural fallback is valuable even if we get spritesheets, because it
  adds life with zero asset work
- Consider using Phaser's `anims.create()` and `anims.generateFrameNumbers()`
  for spritesheet-based animation
