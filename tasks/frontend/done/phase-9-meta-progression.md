---
id: TASK-09
title: Meta-Progression
status: done
category: frontend
phase: 9
openspec_ref: "Phase 9"
depends_on: ["TASK-08"]
created: 2026-02-28
---

## Description

Add persistent cross-run progression. Players spend run currency in a meta menu to unlock new towers/upgrade path variants (unlock tree) and purchase cumulative stat bonuses (stat bonus tree). State is persisted in localStorage. Purchased unlocks and stat bonuses are applied at the start of each new run, making the game easier over time and rewarding continued play.

## Acceptance Criteria

- [ ] Implement `SaveManager` (localStorage read/write for: currency balance, unlock states, stat nodes)
- [ ] Define unlock tree data (costs and unlock effects for: locked towers, upgrade path variants, second map)
- [ ] Define stat bonus tree data (nodes: +50 starting gold, +1 life, -5% tower cost, etc.; cumulative)
- [ ] Build `MetaMenuScene` (two panels side by side: Unlocks | Stat Bonuses; currency balance at top)
- [ ] Build unlock tree UI (nodes with icon, name, cost; connected by lines; locked/available/owned states)
- [ ] Build stat bonus tree UI (grid of nodes, show cumulative effect preview before purchase)
- [ ] Implement unlock effects at game start (hide locked towers from placement panel; hide locked upgrade paths)
- [ ] Implement stat bonus effects at run start (read purchased nodes, apply to initial gold/lives/costs)
- [ ] Add Meta button to MainMenu and end screens
- [ ] If localStorage is unavailable or full, the game MUST degrade gracefully (warn user, run without persistence — do not crash)
- [ ] SaveManager MUST version its schema; incompatible saved data MUST be reset with a user-visible notice
- [ ] Purchasing a node MUST be idempotent (re-purchase of an owned node is a no-op, not a double-charge)
- [ ] Stat bonus tree preview MUST show the cumulative effect before the player commits currency

## Notes

See openspec/changes/greentd-project/tasks.md Phase 9 for the full task list.
