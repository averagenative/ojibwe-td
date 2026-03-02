---
id: TASK-061
title: Fix Poison Upgrade Descriptions — Match Implementation or Wire Features
status: pending
priority: high
phase: gameplay
---

# Fix Poison Upgrade Descriptions — Match Implementation or Wire Features

## Problem

Poison upgrade tiers II-V describe features that aren't implemented:
- Plague II: "Spread range +10px" — code uses fixed 80px DOT_SPREAD_RADIUS
- Plague III: "Spread 2 DoT stacks" — spreadDot() always applies 1 stack
- Plague IV: "Spread 3 DoT stacks" — same, always 1
- Plague V: "also affects air creeps" — spread hits all creep types already

Players spend gold on upgrades expecting these effects but get nothing.

## Goal

Either implement the described tier progression (preferred) or rewrite the
descriptions to honestly reflect what each tier actually does.

## Acceptance Criteria

### Option A: Implement the features (preferred)
- [ ] Add `spreadRadiusDelta`, `spreadStackCount`, `spreadHitsAir` fields to
  upgrade def schema
- [ ] `spreadDot()` reads these from the tower's upgrade state
- [ ] Plague II: spread radius increases from 80 → 90px
- [ ] Plague III: spread applies 2 DoT stacks instead of 1
- [ ] Plague IV: spread applies 3 DoT stacks
- [ ] Plague V: spread also hits air creeps (if currently ground-only)
- [ ] Unit tests for each tier's behavior

### Option B: Fix descriptions
- [ ] Rewrite Plague II-V descriptions to match actual behavior (flat damage
  increases, duration changes, or whatever the tier actually provides)
- [ ] Ensure what's described is what's delivered

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Existing poison spread behavior not broken for players without upgrades

## Notes

- Health ticket `health-01da022e` already documents this issue
- This is a player trust issue — upgrade text is a contract with the player
