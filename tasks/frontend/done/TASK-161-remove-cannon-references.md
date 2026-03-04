---
id: TASK-161
title: Remove All Cannon Tower References — Remap Offers, Gear, and Logic
status: done
priority: critical
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

The cannon tower was removed in TASK-098 and replaced by rock-hurler, but "cannon"
still appears extensively in offers, gear, OfferManager logic, tests, and comments.
Three offer cards reference a tower that no longer exists. Clean up ALL cannon
references and remap offers/gear to the correct tower keys.

## Offer Cards to Fix

### 1. Glass Cannon (id: 'glass-cannon')
- Currently: "Cannon towers deal +100% damage but have -50% range"
- **Remap to rock-hurler**: "Rock Hurler towers deal +100% damage but have -50% range"
- Update `getGlassCannonDamageMult(towerKey)` → check for `'rock-hurler'` not `'cannon'`
- Update `getGlassCannonRangeMult(towerKey)` → check for `'rock-hurler'` not `'cannon'`
- Consider renaming the offer: "Glass Cannon" name is fine thematically, but the
  internal id, method names, and description must reference rock-hurler

### 2. Siege Mode (id: 'siege-mode')
- Currently: "Cannon towers near an Aura tower have attack speed halved but damage tripled"
- synergyRequires: `['cannon', 'aura']` → change to `['rock-hurler', 'aura']`
- **Remap to rock-hurler**: "Rock Hurler towers near an Aura tower..."
- Update `getSiegeModeModifiers(towerKey, nearAura)` → check for `'rock-hurler'`

### 3. Cryo Cannon (id: 'cryo-cannon')
- Currently: "Rock Hurler shots slow targets by 20% for 1.5s"
- Description already mentions Rock Hurler — just rename offer:
  - name: 'Cryo Cannon' → 'Cryo Hurler' or 'Frozen Impact' (or keep name, it's flavourful)
  - synergyRequires already correct: `['rock-hurler', 'frost']`
- `hasCryoCannon()` method name can stay (internal, not user-facing)

## OfferManager.ts Changes

- `TOWER_TARGET_DOMAIN`: remove `'cannon': 'ground'` entry
- `getGlassCannonDamageMult(towerKey)`: check `towerKey === 'rock-hurler'`
- `getGlassCannonRangeMult(towerKey)`: check `towerKey === 'rock-hurler'`
- `getSiegeModeModifiers(towerKey, nearAura)`: check `towerKey === 'rock-hurler'`

## Gear Defs Changes

File: `game/src/data/gearDefs.ts`
- Gear with `specialEffect.id: 'cannon-chill'`: rename to `'hurler-chill'` or similar
- Update description: "Cannon shots slow..." → "Rock Hurler shots slow..."
- Ensure gear applies to rock-hurler tower, not cannon

## Tower Defs Cleanup

File: `game/src/data/towerDefs.ts`
- Remove or deprecate `CANNON_DEF` export (only used in `evaluate-map.ts` script)
- If keeping for eval script, add `@deprecated` JSDoc comment

File: `game/src/data/towerAnimDefs.ts`
- Remove cannon animation def entry (or keep with `@deprecated` comment)

File: `game/src/data/projectileVisualDefs.ts`
- Remove cannon entry from projectile visual map

## Other Files

- `game/src/systems/SessionManager.ts` lines 110-117: KEEP the cannon→rock-hurler
  migration code (still needed for old saves)
- `game/src/systems/AudioManager.ts`: rename `_sfxCannon()` → `_sfxRockHurler()` or
  just update comments; keep the sound itself (it's the rock hurler fire sound now)
- `game/src/entities/Creep.ts`: update comments mentioning "cannon/mortar"
- `game/src/scenes/BetweenWaveScene.ts`: update comment on line 21
- `game/src/systems/AchievementManager.ts` line 329: remove 'cannon' from tower
  type array (it's not a placeable tower anymore)
- `game/scripts/evaluate-map.ts`: update to use rock-hurler def instead of CANNON_DEF

## Asset Cleanup

- `game/public/assets/icons/icon-cannon.png` — can be removed if nothing references it
- Check BootScene preloads for icon-cannon

## Test Updates

60+ test assertions reference 'cannon'. Key test files to update:
- `expandedOfferPool.test.ts` — glass-cannon, siege-mode, and cannon tower placement tests
- `OfferManager.test.ts` — cryo-cannon offer tests
- `synergyTargetingValidation.test.ts` — cannon in domain map and synergy tests
- `achievements.test.ts` — cannon in tower-built achievement tests
- `towerIdleAnims.test.ts` — cannon animation def test
- `towerRoleRedesign.test.ts` — cannon removal assertions (may need updating)
- `frostTowerBalance.test.ts` — cryo cannon slow tests
- `gearSystem.test.ts` — cannon-chill gear tests
- `AudioManager.test.ts` — sfx-cannon buffer tests
- `SessionManager.test.ts` — KEEP cannon migration tests (they verify old saves work)

## Acceptance Criteria

- [ ] No user-facing text mentions "cannon" as a tower type
- [ ] Glass Cannon offer works on rock-hurler towers (not dead)
- [ ] Siege Mode offer works on rock-hurler + aura (not dead)
- [ ] Cryo Cannon offer still works (already targets rock-hurler)
- [ ] OfferManager methods check for 'rock-hurler' instead of 'cannon'
- [ ] Gear cannon-chill retargeted to rock-hurler
- [ ] AchievementManager tower list updated (no 'cannon')
- [ ] SessionManager cannon→rock-hurler migration code PRESERVED
- [ ] No dead code paths checking for towerKey === 'cannon'
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes — all cannon test assertions updated
