---
id: TASK-145
title: Crystal Tower Base Stat Upgrades — Permanent Meta-Progression
status: done
priority: high
category: backend
phase: meta
depends_on: []
created: 2026-03-04
---

## Description

Add a crystal-based permanent upgrade system for tower base stats. Players spend crystals
(earned across runs) to permanently boost tower stats, giving a strong replayability loop.
Each tower type has its own upgrade track with multiple tiers. Upgrades persist across runs
via SaveManager.

This is separate from the in-run upgrade tree (UpgradeManager) — these are meta-progression
bonuses applied at run start.

## Acceptance Criteria

### A. Data layer
- [ ] New `src/data/towerMetaUpgradeDefs.ts` — defines per-tower-type upgrade tracks:
  - Each tower type (rock-hurler, frost, poison, aura, arrow, thunder) has upgradeable stats
  - Stats: damage, attack speed, range (where applicable), and one tower-specific stat
    (e.g. frost slow %, poison tick damage, arrow pierce count)
  - 5 tiers per stat, escalating crystal costs (e.g. 5/10/20/40/80)
  - Each tier gives a % bonus (e.g. +5%, +10%, +15%, +20%, +25% cumulative)
- [ ] Type-safe interfaces for upgrade definitions and saved state

### B. Persistence
- [ ] `SaveManager` extended with `towerMetaUpgrades: Record<string, Record<string, number>>`
  - Outer key = tower type, inner key = stat name, value = current tier (0 = not upgraded)
- [ ] Schema migration if needed (version bump)
- [ ] Purchase function: deduct crystals, increment tier, save immediately

### C. Application at run start
- [ ] `GameScene` reads tower meta upgrades from SaveManager on `create()`
- [ ] When a tower is placed, its base stats are modified by the meta upgrade bonuses
  before any in-run upgrades are applied
- [ ] `metaStatBonuses` in autosave snapshot updated to include tower meta upgrades
- [ ] Restored towers from autosave also receive the bonuses

### D. UI — Meta upgrade screen
- [ ] New scene or panel accessible from MetaMenuScene (alongside existing unlock tree)
- [ ] Shows all tower types with their upgrade tracks
- [ ] Each stat shows: current tier, next tier bonus, crystal cost, upgrade button
- [ ] Max tier stats show "MAXED" indicator
- [ ] Total crystals display + affordability check (greyed out if can't afford)
- [ ] Visual feedback on purchase (flash, sound if audio enabled)

### E. Balance
- [ ] Bonuses should be meaningful but not game-breaking at max tier
- [ ] Suggested cap: ~25-30% total bonus per stat at max tier across 5 levels
- [ ] Crystal costs should create a meaningful long-term grind (50+ runs to max everything)

### F. Tests
- [ ] Unit tests for upgrade defs (costs, bonuses, tier caps)
- [ ] Unit tests for SaveManager persistence (buy, save, load, max tier guard)
- [ ] Unit tests for stat application (base stat × meta bonus = effective stat)
- [ ] `npm run typecheck` clean; `npm run test` passes

## Notes

- This is the "carrot" for replaying — each run earns crystals that make future runs incrementally easier
- Similar to Binding of Isaac's item unlocks or Bloons TD monkey knowledge
- The existing `metaStatBonuses` field in SessionManager was forward-thinking — leverage it
- Consider showing "effective stats" in tower tooltip so players see the meta bonus impact
