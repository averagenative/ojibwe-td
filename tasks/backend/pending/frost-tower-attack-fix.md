---
id: TASK-076
title: Frost Tower Attack Fix — Inspect & Repair Targeting, Projectile, and Visual
status: pending
priority: high
phase: bugfix
---

# Frost Tower Attack Fix — Inspect & Repair Targeting, Projectile, and Visual

## Problem

The frost tower attack is visually broken — projectiles fly to wrong locations,
the attack appears to target things all over the map instead of nearby creeps.
The effect looks chaotic and uncontrolled rather than precise and icy.

## Goal

Inspect the full frost tower attack pipeline (targeting → projectile creation →
flight path → impact → slow/shatter effect) and fix whatever is causing the
erratic behavior. The frost tower should feel precise and satisfying — a focused
ice bolt that hits a nearby creep and visibly slows them.

## Investigation Checklist

- [ ] Read `Tower.ts` frost-specific `fireAt()` logic — check target selection,
  projectile spawn position, and any frost-specific branching
- [ ] Read `Projectile.ts` — verify the projectile chases its target correctly
  and doesn't lose reference to a dead/despawned creep
- [ ] Check if frost projectiles are being created at the wrong origin (tower
  position vs some offset)
- [ ] Check if the frost attack is accidentally hitting/targeting creeps outside
  its range circle
- [ ] Check if `findTarget()` or `pickTarget()` is returning stale or distant
  targets for frost specifically (frost default priority is STRONGEST — does
  it correctly filter to in-range only?)
- [ ] Check if shatter/chain effects are spawning projectiles with bad
  positions or targets
- [ ] Check if upgrade-tree frost effects (shatter, chill-only, etc.) are
  creating unintended side effects on targeting or visuals
- [ ] Check if the frost projectile visual (color, size, speed) is appropriate
  or if it's using a generic config that doesn't suit frost

## Acceptance Criteria

- [ ] Frost tower only fires at creeps within its range circle
- [ ] Frost projectile spawns from the tower's center position
- [ ] Frost projectile flies directly to its target (no erratic paths)
- [ ] Frost projectile despawns cleanly on impact (no ghost projectiles
  lingering or flying off-screen)
- [ ] If a target dies mid-flight, projectile despawns gracefully (no flyaway)
- [ ] Frost slow effect applies correctly on impact
- [ ] Shatter effect (if upgraded) triggers at the correct position
- [ ] Visual: frost projectile should be a distinct icy-blue color, clearly
  different from other tower projectiles
- [ ] Add/verify unit tests for frost targeting edge cases

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Other tower types unaffected by frost fixes
- [ ] Desktop and mobile behavior identical

## Notes

- There's already a `frost-attack-visual-fix.md` task in pending — this
  supersedes it with a broader scope (not just visual, but full attack
  pipeline inspection).
- The frost tower uses STRONGEST priority by default (from targeting.ts) —
  this means it picks the highest-HP creep in range, which might visually
  seem "random" if multiple creeps have similar HP. Verify this is working
  as intended.
- Frost tower behaviors: `chillOnly` toggle skips shatter, `shatterOnDeath`
  comes from upgrade path. Both need to be checked.
- Compare frost behavior against cannon/poison which appear to work correctly
  — what's different in the frost code path?
