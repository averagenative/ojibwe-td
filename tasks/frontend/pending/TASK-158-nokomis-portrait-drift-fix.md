---
id: TASK-158
title: Commander Portraits Drift Off-Screen Due to Stacking Expression Tweens
status: in-progress
priority: critical
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

Commander portraits (especially Nokomis) drift off-screen over time on the
CommanderSelectScene. The TASK-155 fix corrected the initial slide-in direction
but the root cause is deeper: idle expression tweens stack and cause position drift.

## Root Cause

`CommanderSelectScene.ts` has a `_stepExpressions` method that periodically fires
random idle animations on portraits:

- **'smirk'** tweens `portrait.x` to `baseX + 1.5` with `yoyo: true`
- **'glance'** tweens `portrait.x` to `baseX ± 2` (random direction) with `yoyo: true`

The problem: **no guard against stacking**. If `_stepExpressions` fires a new
expression before the previous tween's yoyo cycle completes, multiple tweens fight
over `portrait.x` simultaneously. The yoyo returns to the *starting* x (which may
already be offset from baseX), causing cumulative drift. Over time, portraits
walk off-screen.

## Fix

In `_stepExpressions` (or wherever expression tweens are created):

1. **Kill existing x/y tweens on the portrait before adding new ones:**
   ```typescript
   this.tweens.killTweensOf(state.portrait);
   state.portrait.x = state.baseX; // snap back before new tween
   ```

2. **OR use a guard flag** on each `CardAnimState`:
   ```typescript
   if (state.expressionActive) return;
   state.expressionActive = true;
   this.tweens.add({
     ...
     onComplete: () => { state.expressionActive = false; }
   });
   ```

3. **Add an `onComplete` to the entry slide-in tween** that snaps position:
   ```typescript
   onComplete: () => { state.portrait.x = state.baseX; }
   ```

Option 1 (kill + snap) is simplest and most robust.

## Acceptance Criteria

- [ ] Commander portraits stay at their `baseX` position and do not drift over time
- [ ] Idle expression animations still play (smirk, glance, etc.) — just don't stack
- [ ] No portrait moves off-screen regardless of how long the scene is open
- [ ] Entry slide-in tween completes cleanly to exact `baseX` position
- [ ] Fix applies to ALL commander cards, not just Nokomis
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes — update `nokomisPortraitDirection.test.ts` if needed
