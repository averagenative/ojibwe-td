---
id: TASK-154
title: "Bounty" Offer Card Describes Impossible Mechanic — Escaped Creep Can't Be Killed
status: pending
priority: medium
category: backend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

The "Bounty" offer card (`bounty-escape`) reads:
> "The first creep to escape each wave drops triple gold on the next kill."

This is impossible — creeps don't re-route or loop back. Once a creep escapes the map it's
gone, so there is no "next kill" to pay out on.

## Options

Either rework the mechanic to something achievable, or rewrite the description to match
what the code actually does (if anything). Suggested replacements:

**Option A — Rework to a valid mechanic (keep the "escape = bonus" theme):**
- "If any creep escapes this wave, the next wave grants +50% kill gold."
- "The first creep to escape each wave causes the next 5 kills to drop double gold."
- "Each escaped creep increases kill gold by 5% for the rest of the run (stacks)."

**Option B — Replace entirely with a cleaner economy card:**
- "Every 10th kill in a wave drops a bonus gold cache (+15 gold)."
- "Armored creeps drop double gold when killed."

## Acceptance Criteria

- [ ] `bounty-escape` offer reworked to a mechanic that is actually implementable
  given that creeps don't re-route
- [ ] Description clearly communicates what the card does
- [ ] Mechanic is implemented correctly in `GameScene` / `OfferManager`
- [ ] Tests cover the new mechanic
- [ ] No other offer cards reference impossible creep re-route / re-encounter mechanics
  (audit `offerDefs.ts` for similar issues)
- [ ] `npm run typecheck` clean; `npm run test` passes

## Files to Modify

- `game/src/data/offerDefs.ts` — update description and mechanic
- `game/src/scenes/GameScene.ts` — implement new mechanic behavior
- Related test files
