---
id: TASK-088
title: Fix All Region/Stage Crystal Unlocks — Maps Not Purchasable
status: done
priority: high
phase: bugfix
---

# Fix All Region/Stage Crystal Unlocks — Maps Not Purchasable

## Problem

None of the locked regions/stages can be unlocked with crystals in the
MetaMenuScene. The unlock nodes exist in `unlockDefs.ts` with correct IDs and
costs, and the stages reference them in `stageDefs.ts`, but the purchase flow
is broken — players cannot buy them.

### Locked stages that should be purchasable

| Stage | Unlock ID | Cost | Prereq |
|-------|-----------|------|--------|
| Wetland Crossing (mashkiig-01) | unlock-map-02 | 300 | none |
| Niizh-miikana (niizh-miikana-01) | unlock-stage-niizh-miikana-01 | 250 | unlock-map-02 |
| Oak Savanna Run (mitigomizh-01) | unlock-stage-mitigomizh-01 | 500 | unlock-map-02 |
| Frozen Crossing (biboon-aki-01) | unlock-stage-biboon-aki-01 | 700 | unlock-stage-mitigomizh-01 |

## Investigation

- [ ] Check `src/meta/unlockDefs.ts` — verify all 4 unlock nodes have correct
  `id`, `cost`, `effect`, and `prereqs` fields
- [ ] Check `src/scenes/MetaMenuScene.ts` — are all unlock nodes rendered?
  Are some filtered out? Is the purchase click handler wired correctly?
- [ ] Check `src/meta/SaveManager.ts` — does `purchaseUnlock()` correctly
  deduct crystals and persist the unlock?
- [ ] Check `src/scenes/MainMenuScene.ts` — does it check `isUnlocked()` for
  each stage's `unlockId` to determine lock/playable state?
- [ ] Test the full flow for EACH stage: earn crystals → meta menu → purchase
  unlock → main menu → stage card shows unlocked → can start game on that map

## Acceptance Criteria

- [ ] All 4 locked stages appear as purchasable nodes in MetaMenuScene
- [ ] Prerequisite chains work: unlock-map-02 first, then others become available
- [ ] Crystal cost is deducted on purchase
- [ ] After purchase, the corresponding stage shows as unlocked in MainMenuScene
- [ ] Unlocks persist across sessions (SaveManager)
- [ ] Locked stages that don't meet prereqs show as locked (not purchasable yet)
- [ ] Stages with met prereqs but not yet purchased show cost and are clickable
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes

## Notes

- `unlockDefs.ts` already has all 4 nodes defined — the bug is likely in
  MetaMenuScene rendering or purchase wiring, not missing definitions
- The `LOCKED_MAP_IDS` export derives from unlock nodes with `type: 'map'` effect —
  check if stage unlocks use a different effect type that isn't handled
