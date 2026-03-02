---
id: TASK-094
title: Rename Tesla Tower to Thunder Tower
status: pending
category: backend
priority: medium
depends_on: []
created: 2026-03-02
---

## Description

Rename the Tesla tower to "Thunder" (or similar — Animikii/Thunder). "Tesla" doesn't fit
the Ojibwe theme. The tower represents lightning/thunder which aligns with the Thunderbird
(Animikiikaa) lore already in the game.

## Acceptance Criteria

- [ ] Tower display name changed from "Tesla" to "Thunder" everywhere in-game
- [ ] Internal key can remain `tesla` for backward compatibility (save data, upgrade paths) OR be renamed to `thunder` with a migration
- [ ] TowerDef name field updated: `name: 'Thunder'`
- [ ] All UI references updated (TowerPanel tooltip, UpgradePanel header, BehaviorPanel, codex)
- [ ] Upgrade path names updated if they reference "Tesla" (e.g. "Tesla Overload" → "Thunder Overload")
- [ ] Codex/lore entries updated
- [ ] `npm run typecheck` clean; `npm run test` passes

## Notes

- Consider Ojibwe name options: "Animikii" (thunder), "Wawaatesi" (lightning bug — probably not right for this)
- The simplest approach: change `name` field in towerDefs.ts, leave `key: 'tesla'` unchanged
- Search all files for "Tesla" (case-insensitive) to find every reference
- upgradeDefs.ts has the upgrade tree names — update those too
