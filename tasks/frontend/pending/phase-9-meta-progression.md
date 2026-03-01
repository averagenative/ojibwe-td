---
id: TASK-09
title: Meta-Progression
status: pending
category: frontend
phase: 9
openspec_ref: "Phase 9"
depends_on: []
created: 2026-02-28
---

## Description

Phase 9 of the GreenTD implementation. See proposal.md for full context.

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

## Notes

See openspec/changes/greentd-project/tasks.md Phase 9 for the full task list.
