---
id: TASK-024
title: Commander Unlock Progression
status: done
category: backend
phase: 12
openspec_ref: ""
depends_on: ["TASK-018", "TASK-09"]
created: 2026-03-01
---

## Description

Currently all commanders except Nokomis (the default) are locked and can never be
unlocked in-game — `SaveManager.isUnlocked()` always returns false because no commander
unlock nodes exist in `unlockDefs.ts`. This task adds the unlock nodes, wires
`CommanderSelectScene` to respect them, and sets unlock costs that form a natural
progression arc.

## Acceptance Criteria

- [ ] `src/data/unlockDefs.ts` gains 4 new unlock nodes — one per locked commander:
  - `unlock-commander-makoons`: cost 8 crystals, description "Unlock Makoons — the bear spirit warrior"
  - `unlock-commander-waabizii`: cost 8 crystals, description "Unlock Waabizii — the swan healer"
  - `unlock-commander-bizhiw`: cost 12 crystals, description "Unlock Bizhiw — the lynx hunter"
  - `unlock-commander-animikiikaa`: cost 16 crystals, description "Unlock Animikiikaa — the thunderbird"
- [ ] `CommanderSelectScene` shows each commander's unlock cost on their card when locked.
- [ ] Clicking a locked commander card shows an inline message: "Unlock in the Upgrades menu for N crystals" and routes to `MetaMenuScene` on confirmation.
- [ ] `MetaMenuScene` unlock tree displays the 4 new nodes (grouped under a "Commanders" section heading).
- [ ] Purchasing an unlock node in `MetaMenuScene` immediately unlocks the commander (no restart required).
- [ ] Unlocked commanders persist across sessions via `SaveManager`.
- [ ] Default unlock state: only Nokomis unlocked (unchanged). A fresh save has 0 commanders unlocked beyond Nokomis.
- [ ] `npm run test` passes; `npm run typecheck` clean.

## Notes

- Unlock node format already established in TASK-09 (Meta-Progression) — follow the same shape as existing unlock nodes.
- Crystal costs intentionally require 2–4 runs to unlock each commander, giving the meta loop meaningful goals.
- The Animikiikaa cost (16) is higher because their thunderbird aura (chain AoE) is the most powerful.
- Nokomis's `defaultUnlocked: true` flag remains unchanged — she's always available.
