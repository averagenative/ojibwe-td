---
id: TASK-151
title: Synergy Offer Cards Must Respect Tower Targeting Rules
status: done
priority: high
category: backend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

Synergy offer cards on wave clear sometimes present combinations that don't work because
the involved tower types can't hit the same creep types. For example:

- **Voltaic Slime** ("Thunder chain deals +25% damage to Poison-stacked creeps") — useless
  if Thunder can only hit air and Poison can only hit ground (or vice versa). The creep
  would never be both poisoned AND in Thunder range.
- **Conductor** ("Poison-debuffed creeps take +50% Thunder chain damage") — same issue.
- **Venomfrost** ("Frost slow is 30% stronger on Poison-stacked creeps") — only works if
  both Frost and Poison can target the same creep types.

The synergy system needs to validate that the tower types involved can actually interact
on the same targets before offering the card.

## Root Cause

`offerDefs.ts` synergy cards have `synergyRequires` (checks towers exist on field) but
NO check for targeting compatibility. A synergy between tower A and tower B is only
meaningful if there exist creep types that BOTH towers can target.

Tower targeting data is in `towerDefs.ts` — some towers have `groundOnly: true`, and
the game has air creeps that bypass ground-only towers.

## Acceptance Criteria

### A. Targeting compatibility check
- [ ] Add a utility function: `canSynergize(towerKeyA: string, towerKeyB: string): boolean`
  - Returns true if both towers share at least one targetable creep category (ground, air)
  - e.g. if Tower A is groundOnly and Tower B can hit both → true (they overlap on ground)
  - e.g. if Tower A is groundOnly and Tower B is airOnly → false (no overlap)
- [ ] All tower types should have explicit targeting metadata: `targets: 'ground' | 'air' | 'both'`
  (currently only `groundOnly` flag exists — normalize this)

### B. Offer pool filtering
- [ ] When building the offer pool for a wave clear, exclude synergy offers whose
  required tower combo fails the `canSynergize()` check
- [ ] This applies to both `synergyRequires`-gated offers AND ungated synergy cards
  that reference specific tower types in their effect description
- [ ] Audit ALL synergy offers in `offerDefs.ts` and tag each with the tower types
  it depends on (some currently lack `synergyRequires` but still reference specific towers)

### C. Audit existing synergy offers
- [ ] Review every synergy offer and verify the described interaction is actually possible
  given current tower targeting rules:
  - Voltaic Slime (thunder + poison)
  - Conductor (poison + tesla/thunder)
  - Voltaic Venom (tesla/thunder + poison)
  - Venomfrost (frost + poison)
  - Static Field (thunder + frost slow)
  - Toxic Shrapnel (rock hurler + poison)
  - Lightning Rod (frost + thunder)
  - Shatter (frost + mortar)
  - Arctic Shrapnel (mortar + frost)
  - Brittle Ice (rock hurler + frost)
  - All others referencing cross-tower interactions
- [ ] Fix or remove any synergy offers that describe impossible interactions
- [ ] Ensure remaining synergies all have proper `synergyRequires` tags

### D. Tests
- [ ] Unit test `canSynergize()` with all tower type combinations
- [ ] Test that offer pool excludes invalid synergies
- [ ] Test that valid synergies still appear correctly
- [ ] Regression: no synergy card describes an interaction between towers that can't
  target the same creep types
- [ ] `npm run typecheck` clean; `npm run test` passes

## Files to Modify

- `game/src/data/offerDefs.ts` — add missing `synergyRequires`, fix impossible offers
- `game/src/data/towerDefs.ts` — normalize targeting metadata
- `game/src/systems/OfferManager.ts` — filter pool by targeting compatibility
- New utility: targeting compatibility helper (could live in OfferManager or a shared util)

## Notes

- Some synergies reference tower types implicitly in their description but lack
  `synergyRequires` — these need to be audited and tagged
- Long-term: if we add more creep movement types (burrowing, phasing, etc.), this
  validation becomes even more important
- The fix should be generic (based on targeting overlap) not hardcoded per-offer
