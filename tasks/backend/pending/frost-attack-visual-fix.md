# Frost Attack Visual Bug Fix

- id: TASK-069
- status: pending
- priority: critical
- tags: bugfix, visual, frost

## Problem

Frost tower attacks render "weird across the screen" — likely unreleased graphics objects from impact effects persisting and scaling incorrectly.

## Root Cause Analysis

In `Projectile.ts`, `impactFrostBurst()` (lines ~270–301) creates two `scene.add.graphics()` objects (expanding ring + sparkle cross) with tweens that call `.destroy()` in `onComplete`. If the scene transitions, creep dies mid-tween, or the game state changes before the tween completes, these graphics objects leak and persist at world coordinates.

Additional issues:
- Frost projectile body color is `0xffdd00` (yellow) but trail particles are `0x88ccff` (blue) — color mismatch
- Graphics objects are world-space positioned, not attached to any parent — if created at wrong coords they appear "across the screen"
- Ring scales from 1x to 3.5x (depth 25, above everything) which would be very visible if stuck

## Fix Plan

### 1. Fix graphics cleanup in impactFrostBurst()

```typescript
// Add safety: track active graphics and clean on scene shutdown
// Option A: Use scene.events.once('shutdown', ...) to destroy lingering objects
// Option B: Switch from Graphics to Phaser.GameObjects.Arc/Line for simpler lifecycle
// Option C: Add tween.on('stop') handler alongside onComplete
```

- Register all impact graphics in a scene-level cleanup set
- On scene `shutdown` / `destroy` events, destroy any remaining impact graphics
- Add null guards: check `this.scene?.scene?.isActive()` before creating graphics

### 2. Fix frost projectile color

- Change frost projectile body color from `0xffdd00` to `0x88ccff` to match trail

### 3. Add tween safety

- In all impact burst tweens (frost, fire, etc.), add both `onComplete` and `onStop` destroy handlers
- Ensure tweens are added to the scene's tween manager (not orphaned)

### 4. Test scenarios

- Rapid frost tower firing at creeps near screen edge
- Creep dying mid-flight from frost projectile
- Scene transition (game over / wave complete) while frost projectiles are active
- Multiple frost towers firing simultaneously

## Files to Modify

- `game/src/entities/Projectile.ts` — impactFrostBurst(), projectile color, tween cleanup
- `game/src/entities/towers/Tower.ts` — frost projectile color param if needed
- `game/src/scenes/GameScene.ts` — scene shutdown cleanup for lingering graphics

## Acceptance Criteria

- [ ] No frost graphics persist after impact animation completes
- [ ] No frost graphics leak on scene transition
- [ ] Frost projectile color matches trail color (blue, not yellow)
- [ ] No visual artifacts from frost attacks at any game speed
- [ ] Existing frost slow/shatter mechanics unchanged
