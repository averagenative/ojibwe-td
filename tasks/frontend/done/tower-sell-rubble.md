---
id: TASK-071
title: Tower Sell Rubble — Show Damaged Tile After Selling a Tower
status: done
priority: low
phase: polish
---

# Tower Sell Rubble — Show Damaged Tile After Selling a Tower

## Problem

When a tower is sold, the tile returns to its pristine buildable state with no
visual indication that a tower was ever there.

## Goal

After selling a tower, leave a subtle rubble/damaged-ground visual on the tile
so players can see where towers used to be. The tile remains buildable — the
rubble is purely cosmetic.

## Acceptance Criteria

### Asset Creation
- [ ] Create 2-3 rubble sprite variants (PNG, tile-sized ~40×40px)
- [ ] Style: top-down scattered stone fragments, cracked earth, broken mortar
- [ ] Palette: muted browns/greys that blend with the terrain
- [ ] Save to `public/assets/effects/rubble-01.png`, `rubble-02.png`, etc.
- [ ] Preload in BootScene alongside other effect assets

### Implementation
- [ ] When a tower is sold, a rubble sprite is placed at the tower's former
  tile position (randomly pick from the 2-3 variants)
- [ ] Rubble sits at a low depth (above terrain, below towers and creeps)
- [ ] Rubble does NOT block placement — player can build on a rubble tile
- [ ] When a new tower is placed on a rubble tile, the rubble is removed
- [ ] Rubble persists for the duration of the run (not permanent across runs)
- [ ] Optional: subtle fade-in when rubble appears
- [ ] Optional: slight random rotation on each rubble for variety

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Desktop and mobile layout unaffected
