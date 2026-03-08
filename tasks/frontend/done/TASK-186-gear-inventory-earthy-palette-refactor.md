---
id: TASK-186
title: "UI: Gear inventory & equip screens — earthy palette + style unification"
status: done
category: frontend
phase: release
priority: medium
depends_on: []
created: 2026-03-08
---

## Description

The Gear Inventory and Tower Equip screens use hardcoded neon rarity colors and styling that doesn't match the earthy palette used across the rest of the game (META UPGRADES, achievements, HUD, tower panels). Unify the visual style so these screens feel cohesive with the rest of the UI.

## Files to Update

- `src/data/gearDefs.ts` — `RARITY_COLORS` uses bright neon (#44cc44, #4488ff, #aa44ff, #ff8800). Migrate to earthy equivalents in PAL.
- `src/scenes/InventoryScene.ts` — Grid cells, detail panel, action buttons, rarity borders/stripes. Convert hardcoded colors to PAL references.
- `src/scenes/TowerEquipScene.ts` — Tower cards, gear slots, `TOWER_COLORS` dict. Convert to PAL.
- `src/scenes/GameOverScene.ts` — Loot drop display uses RARITY_COLORS. Update to match.
- `src/ui/palette.ts` — Add earthy rarity tier colors (common/uncommon/rare/epic/legendary).

## Additional Issues

- **Challenges button in Meta Upgrades**: The CHALLENGES button shouldn't be in the upgrades section — it belongs on the main menu or a separate nav. Remove or relocate.
- **Back button inconsistency**: The BACK button on sub-screens (Gear, Challenges) has different behavior than other navigation — should be consistent with the rest of the menu flow.

## Acceptance Criteria

- [ ] Rarity colors replaced with earthy equivalents (common=stone grey, uncommon=forest green, rare=lake blue, epic=autumn purple, legendary=ember gold)
- [ ] Gear inventory grid uses PAL panel/border/text colors consistently
- [ ] Detail panel (item stats, effects, runes) uses PAL colors
- [ ] Action buttons (EQUIP, ENHANCE, EVOLVE, SALVAGE) use PAL button styles
- [ ] Tower equip screen cards use PAL colors
- [ ] Game over loot display matches new rarity colors
- [ ] No hardcoded hex colors remaining in gear UI files
- [ ] Challenges button removed from Meta Upgrades section
- [ ] Back button behavior consistent across all sub-screens
- [ ] Existing tests still pass
