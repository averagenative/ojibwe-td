/**
 * HEALTH-82edfc89 — applyStatsToTower resets gear+meta bonuses on every upgrade
 *
 * Bug: computeEffectiveStats() starts from defaultUpgradeStats(tower.def) and
 * accumulates only in-run upgrade tier deltas, then tower.applyUpgradeStats()
 * replaces the live upgStats entirely.  Gear bonuses (applyGearToStats) and
 * meta bonuses (applyTowerMetaToStats) applied to upgStats at placement time
 * are silently erased on every buyUpgrade() or respec() call.
 *
 * Fix: UpgradeManager stores per-tower GearBonuses and meta upgrade tiers via
 * setTowerBonuses(), and re-applies them inside applyStatsToTower() after every
 * buyUpgrade() / respec() call.  GameScene calls setTowerBonuses() for both
 * tryPlaceTower and _placeRestoredTower after applying gear+meta manually.
 */

import { describe, it, expect } from 'vitest';
import upgradeManagerSrc from '../UpgradeManager.ts?raw';
import gameSceneSrc      from '../../scenes/GameScene.ts?raw';

// ── UpgradeManager structural checks ─────────────────────────────────────────

describe('UpgradeManager — setTowerBonuses + re-apply in applyStatsToTower', () => {

  it('imports applyGearToStats from GearSystem', () => {
    expect(upgradeManagerSrc).toContain("import { applyGearToStats } from './GearSystem'");
  });

  it('imports applyTowerMetaToStats from towerMetaUpgradeDefs', () => {
    expect(upgradeManagerSrc).toContain("import { applyTowerMetaToStats } from '../data/towerMetaUpgradeDefs'");
  });

  it('TowerUpgradeState declares gearBonuses field', () => {
    expect(upgradeManagerSrc).toContain('gearBonuses?: GearBonuses');
  });

  it('TowerUpgradeState declares metaTiers field', () => {
    expect(upgradeManagerSrc).toContain('metaTiers?:');
  });

  it('setTowerBonuses method exists', () => {
    expect(upgradeManagerSrc).toContain('setTowerBonuses(');
  });

  it('setTowerBonuses assigns gearBonuses on state', () => {
    expect(upgradeManagerSrc).toContain('state.gearBonuses = gear');
  });

  it('setTowerBonuses assigns metaTiers on state', () => {
    expect(upgradeManagerSrc).toContain('state.metaTiers   = metaTiers');
  });

  it('applyStatsToTower re-applies gearBonuses after applyUpgradeStats', () => {
    const idx  = upgradeManagerSrc.indexOf('applyStatsToTower(tower: Tower)');
    const body = upgradeManagerSrc.slice(idx, idx + 800);
    const applyUpgradeIdx = body.indexOf('tower.applyUpgradeStats(stats)');
    const gearReApplyIdx  = body.indexOf('applyGearToStats(tower.upgStats, state.gearBonuses)');
    expect(applyUpgradeIdx).toBeGreaterThan(-1);
    expect(gearReApplyIdx).toBeGreaterThan(applyUpgradeIdx);
  });

  it('applyStatsToTower re-applies metaTiers after applyUpgradeStats', () => {
    const idx  = upgradeManagerSrc.indexOf('applyStatsToTower(tower: Tower)');
    const body = upgradeManagerSrc.slice(idx, idx + 800);
    const applyUpgradeIdx = body.indexOf('tower.applyUpgradeStats(stats)');
    const metaReApplyIdx  = body.indexOf('applyTowerMetaToStats(tower.upgStats, tower.def.key, state.metaTiers)');
    expect(applyUpgradeIdx).toBeGreaterThan(-1);
    expect(metaReApplyIdx).toBeGreaterThan(applyUpgradeIdx);
  });

  it('gear re-apply is guarded by state.gearBonuses check', () => {
    const idx  = upgradeManagerSrc.indexOf('applyStatsToTower(tower: Tower)');
    const body = upgradeManagerSrc.slice(idx, idx + 800);
    expect(body).toContain('state.gearBonuses');
  });

  it('meta re-apply is guarded by state.metaTiers check', () => {
    const idx  = upgradeManagerSrc.indexOf('applyStatsToTower(tower: Tower)');
    const body = upgradeManagerSrc.slice(idx, idx + 800);
    expect(body).toContain('state.metaTiers');
  });
});

// ── GameScene — setTowerBonuses wired after placement ─────────────────────────

describe('GameScene tryPlaceTower — setTowerBonuses called after gear+meta', () => {
  const tpStart = gameSceneSrc.indexOf('private tryPlaceTower(');
  const tpBody  = gameSceneSrc.slice(tpStart, tpStart + 2800);

  it('tryPlaceTower calls setTowerBonuses', () => {
    expect(tpBody).toContain('upgradeManager.setTowerBonuses(');
  });

  it('setTowerBonuses comes after applyGearToStats', () => {
    const gearIdx = tpBody.indexOf('applyGearToStats(tower.upgStats, gearBonuses)');
    const setBIdx = tpBody.indexOf('upgradeManager.setTowerBonuses(');
    expect(gearIdx).toBeGreaterThan(-1);
    expect(setBIdx).toBeGreaterThan(gearIdx);
  });

  it('setTowerBonuses comes after _applyTowerMetaBonuses', () => {
    const metaIdx = tpBody.indexOf('_applyTowerMetaBonuses(tower)');
    const setBIdx = tpBody.indexOf('upgradeManager.setTowerBonuses(');
    expect(metaIdx).toBeGreaterThan(-1);
    expect(setBIdx).toBeGreaterThan(metaIdx);
  });
});

describe('GameScene _placeRestoredTower — setTowerBonuses called after gear+meta', () => {
  const prtStart = gameSceneSrc.indexOf('private _placeRestoredTower(');
  const prtBody  = gameSceneSrc.slice(prtStart, prtStart + 2800);

  it('_placeRestoredTower calls setTowerBonuses', () => {
    expect(prtBody).toContain('upgradeManager.setTowerBonuses(');
  });

  it('setTowerBonuses comes after applyGearToStats', () => {
    const gearIdx = prtBody.indexOf('applyGearToStats(tower.upgStats, gearBonuses)');
    const setBIdx = prtBody.indexOf('upgradeManager.setTowerBonuses(');
    expect(gearIdx).toBeGreaterThan(-1);
    expect(setBIdx).toBeGreaterThan(gearIdx);
  });

  it('setTowerBonuses comes after _applyTowerMetaBonuses', () => {
    const metaIdx = prtBody.indexOf('_applyTowerMetaBonuses(tower)');
    const setBIdx = prtBody.indexOf('upgradeManager.setTowerBonuses(');
    expect(metaIdx).toBeGreaterThan(-1);
    expect(setBIdx).toBeGreaterThan(metaIdx);
  });

  it('setTowerBonuses comes after buyUpgrade loop', () => {
    const buyIdx  = prtBody.indexOf('upgradeManager.buyUpgrade(tower, path)');
    const setBIdx = prtBody.indexOf('upgradeManager.setTowerBonuses(');
    expect(buyIdx).toBeGreaterThan(-1);
    expect(setBIdx).toBeGreaterThan(buyIdx);
  });
});

// ── Edge cases & boundary tests ───────────────────────────────────────────────

describe('UpgradeManager — setTowerBonuses edge cases', () => {

  it('setTowerBonuses guards against unregistered tower (no state)', () => {
    // The method definition gets state from the Map; if the tower isn't registered,
    // it should bail out without error (the `if (state)` guard).
    const methodSig = 'setTowerBonuses(\n';
    const idx  = upgradeManagerSrc.indexOf(methodSig);
    const body = upgradeManagerSrc.slice(idx, idx + 400);
    expect(body).toContain('this.states.get(tower)');
    expect(body).toContain('if (state)');
  });

  it('gear re-apply uses tower.upgStats (the live stats object)', () => {
    const idx  = upgradeManagerSrc.indexOf('applyStatsToTower(tower: Tower)');
    const body = upgradeManagerSrc.slice(idx, idx + 800);
    expect(body).toContain('applyGearToStats(tower.upgStats,');
  });

  it('meta re-apply uses tower.def.key for tower identification', () => {
    const idx  = upgradeManagerSrc.indexOf('applyStatsToTower(tower: Tower)');
    const body = upgradeManagerSrc.slice(idx, idx + 800);
    expect(body).toContain('applyTowerMetaToStats(tower.upgStats, tower.def.key,');
  });

  it('gear is re-applied before meta (consistent with placement order)', () => {
    const idx  = upgradeManagerSrc.indexOf('applyStatsToTower(tower: Tower)');
    const body = upgradeManagerSrc.slice(idx, idx + 800);
    const gearIdx = body.indexOf('applyGearToStats(');
    const metaIdx = body.indexOf('applyTowerMetaToStats(');
    expect(gearIdx).toBeGreaterThan(-1);
    expect(metaIdx).toBeGreaterThan(gearIdx);
  });

  it('applyStatsToTower starts from fresh computeEffectiveStats (no compounding)', () => {
    const idx  = upgradeManagerSrc.indexOf('applyStatsToTower(tower: Tower)');
    const body = upgradeManagerSrc.slice(idx, idx + 300);
    // First line of the method should call computeEffectiveStats
    expect(body).toContain('const stats = this.computeEffectiveStats(tower)');
    // Then replace tower stats with the fresh computed ones
    expect(body).toContain('tower.applyUpgradeStats(stats)');
    // computeEffectiveStats must come before applyUpgradeStats
    const computeIdx = body.indexOf('computeEffectiveStats(tower)');
    const applyIdx   = body.indexOf('tower.applyUpgradeStats(stats)');
    expect(computeIdx).toBeLessThan(applyIdx);
  });

  it('GameScene passes fallback {} when tower key has no meta upgrades', () => {
    // Both tryPlaceTower and _placeRestoredTower use ?? {} for metaTiers
    expect(gameSceneSrc).toContain("this._towerMetaUpgrades[tower.def.key] ?? {}");
  });

  it('removeTower deletes the state (including stored bonuses)', () => {
    const idx  = upgradeManagerSrc.indexOf('removeTower(tower: Tower)');
    const body = upgradeManagerSrc.slice(idx, idx + 200);
    expect(body).toContain('this.states.delete(tower)');
  });
});
