---
id: TASK-086
title: Crystal Sink Expansion — More Things to Buy with Crystals
status: pending
priority: high
phase: feature
---

# Crystal Sink Expansion — More Things to Buy with Crystals

## Problem

Crystals (meta-progression currency) become worthless once players have purchased
all available unlocks and stat nodes. There aren't enough things to spend crystals
on, so they pile up with no use, removing a key motivation loop.

## Goal

Add meaningful crystal sinks so crystals remain valuable throughout the entire
progression curve. Players should always have something worth saving toward.

## Design — New Crystal Purchases

Add several new categories of crystal spending (implement at least 3-4 of these):

### Tier 1: Repeatable Sinks (infinite spend)
- **Reroll token** (~50 crystals) — reroll between-wave offer choices once per wave
- **Starting gold boost** (~100 crystals, consumable) — +50 starting gold for next run
- **Extra life token** (~150 crystals, consumable) — +1 life for next run
- **Challenge modifiers** (~75 crystals) — unlock harder modifiers for bonus rewards

### Tier 2: Permanent Unlocks (one-time)
- **Cosmetic tower skins** (200-500 crystals) — visual variants for each tower
- **New commander unlocks** (300-800 crystals) — additional commanders beyond the starter set
- **Map variants** (400 crystals) — alternate versions of existing maps (night mode, weather)
- **Upgrade path expansions** — unlock a 4th upgrade path (D) for select towers

### Tier 3: Prestige / Endgame
- **Ascension levels** (scaling cost) — prestige system that resets some progress for permanent multipliers
- **Trophy cases** (1000+ crystals) — cosmetic achievements displayed on main menu
- **Gear reforge** (variable cost) — reroll stats on legendary gear

## Acceptance Criteria

- [ ] At least 3-4 new crystal purchase options added to MetaMenuScene
- [ ] Mix of repeatable (infinite sink) and one-time purchases
- [ ] Crystal costs balanced so early-game players can still progress while
  late-game players have meaningful goals
- [ ] New purchases integrated with SaveManager persistence
- [ ] MetaMenuScene UI updated to display new purchase categories
  (may need tabs or sections if space is tight)
- [ ] Consumable items (reroll token, gold boost, extra life) properly consumed
  during gameplay and cleared after use
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Unit tests for new purchase/consume flows

## Notes

- Check `src/meta/SaveManager.ts` for current crystal balance and purchase logic
- Check `src/meta/unlockDefs.ts` and `src/meta/statBonusDefs.ts` for existing nodes
- Check `src/scenes/MetaMenuScene.ts` for the current shop UI
- Consumable items need a "pending consumables" field in SaveData that GameScene
  reads at the start of a run
