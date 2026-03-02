---
id: TASK-058
title: Tower Idle & Attack Animations — Breathing Turrets, Firing Recoil
status: pending
priority: high
phase: polish
---

# Tower Idle & Attack Animations — Breathing Turrets, Firing Recoil

## Problem

Towers sit perfectly still on the map like painted icons. They fire projectiles
but the tower itself shows no sign of life — no idle sway, no aiming rotation,
no recoil kick when firing. The battlefield feels like a spreadsheet with
particles.

## Goal

Add idle and attack animations to all tower archetypes so they feel like living
machinery or natural forces. Each tower type should have a distinct animation
personality that matches its combat role.

## Acceptance Criteria

### Idle Animations (All Towers)
- [ ] Every placed tower has a subtle idle animation when NOT attacking:
  - **Cannon**: slow barrel rotation (scanning for targets), ±10° sweep
  - **Frost**: gentle crystalline shimmer/pulse (cold aura breathing)
  - **Tesla**: small electric arcs flickering between coil tips (random sparks)
  - **Mortar**: slow up-down barrel bob (as if adjusting elevation)
  - **Poison**: bubbling cauldron effect (green particles rising, popping)
  - **Aura**: steady radial pulse ring expanding outward (matches buff radius)
- [ ] Idle animation speed scales with tower level (upgraded = more energetic)
- [ ] Idle animation pauses when game is paused

### Target Tracking
- [ ] Towers with directional barrels (Cannon, Mortar) rotate to face their
  current target
- [ ] Rotation is smooth (lerp toward target angle, ~10°/frame) not instant snap
- [ ] When target dies or leaves range, barrel slowly returns to idle sweep
- [ ] Tesla coils "lean" slightly toward target (subtle tilt, ±3°)

### Attack/Firing Animations
- [ ] Each tower has a distinct firing animation triggered on `tryAttack()`:
  - **Cannon**: recoil kick (brief scale to 0.9× in fire direction, snap back),
    barrel flash (muzzle flash already exists — sync with recoil)
  - **Frost**: brief expansion pulse (scale 1.0 → 1.08 → 1.0 over 150ms),
    ice crystals scatter from tower position
  - **Tesla**: entire tower brightens/flashes white for 80ms, arc lines drawn
    from tower to target (already exists in TASK-047 — enhance with tower shake)
  - **Mortar**: barrel kicks upward (rotation +15°, ease back over 200ms),
    slight downward push on tower body (squash effect)
  - **Poison**: bubbling intensifies, tower briefly glows green, blob launches
  - **Aura**: pulse ring intensifies briefly when buff is reapplied (brighter
    ring, faster expansion on the active tick)
- [ ] Attack animation duration respects attack speed (fast towers = snappier)
- [ ] Multiple rapid fires don't stack animations — new fire interrupts previous

### Upgrade Visual Progression
- [ ] Tower appearance subtly changes with upgrade tier:
  - Tier 1-2: base appearance
  - Tier 3-4: slightly larger, more intense idle effects
  - Tier 5: max tier glow/aura, most energetic idle animation
- [ ] Path specialization (A/B/C) could tint or modify the idle effect colour
  (stretch goal — depends on upgrade path being visually distinct)

### Implementation Approach
- [ ] Use Phaser tweens for recoil/scale/rotation animations
- [ ] Use Graphics objects for particle effects (sparks, crystals, bubbles)
- [ ] Tower.ts gets `playIdleAnimation()` called each frame when no target
- [ ] Tower.ts `tryAttack()` calls `playFireAnimation()` before/after projectile
- [ ] Animation configs in `towerAnimDefs.ts`:
  ```typescript
  cannon: { idleType: 'sweep', sweepAngle: 10, recoilScale: 0.9, recoilMs: 120 }
  ```
- [ ] Aura tower pulse synced with `updateAuras()` tick in GameScene

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Performance: 20+ towers animating simultaneously without frame drops
- [ ] Animations don't interfere with tower selection, upgrade panel, or tooltips
- [ ] Range circle display still works correctly over animated towers
- [ ] Tower sell/respec doesn't leave orphaned animation tweens

## Notes

- TASK-047 (Tower Attack Type Visuals) already added distinct projectile styles —
  this task adds animation to the tower BODY itself
- The muzzle flash from Phase 11 (`triggerMuzzleFlash()`) should be synced with
  the new recoil animation, not replaced
- Tower rotation toward targets is a classic TD feel — even simple ±rotation
  makes towers feel intelligent
- Keep idle animations very subtle — they should add ambiance, not distraction.
  Players need to read tower positions clearly for placement strategy
