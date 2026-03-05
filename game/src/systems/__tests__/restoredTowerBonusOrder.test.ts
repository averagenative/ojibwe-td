/**
 * HEALTH-4c493575 — _placeRestoredTower: gear+meta bonuses applied AFTER buyUpgrade loop
 *
 * Bug: gear and meta bonuses were applied to tower.upgStats before the buyUpgrade
 * loop.  Each buyUpgrade() call invokes applyStatsToTower() which recomputes
 * upgStats from defaultUpgradeStats + upgrade deltas, erasing the gear and meta
 * bonuses.  Restored towers with any saved upgrade tiers therefore had neither
 * gear nor meta bonuses active at run start.
 *
 * Fix: move applyGearToStats and _applyTowerMetaBonuses to AFTER the buyUpgrade loop.
 */

import { describe, it, expect } from 'vitest';
import gameSceneSrc from '../../scenes/GameScene.ts?raw';

// ── Locate _placeRestoredTower ────────────────────────────────────────────────

const methodStart = gameSceneSrc.indexOf('private _placeRestoredTower(');
const methodBody  = gameSceneSrc.slice(methodStart, methodStart + 2500);

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('_placeRestoredTower — gear+meta applied after buyUpgrade loop', () => {

  it('_placeRestoredTower exists in GameScene', () => {
    expect(methodStart).toBeGreaterThan(-1);
  });

  it('buyUpgrade loop appears in the method', () => {
    expect(methodBody).toContain('upgradeManager.buyUpgrade(tower, path)');
  });

  it('applyGearToStats appears in the method', () => {
    expect(methodBody).toContain('applyGearToStats(tower.upgStats, gearBonuses)');
  });

  it('_applyTowerMetaBonuses appears in the method', () => {
    expect(methodBody).toContain('_applyTowerMetaBonuses(tower)');
  });

  it('buyUpgrade loop comes BEFORE applyGearToStats', () => {
    const buyUpgradeIdx    = methodBody.indexOf('upgradeManager.buyUpgrade(tower, path)');
    const applyGearIdx     = methodBody.indexOf('applyGearToStats(tower.upgStats, gearBonuses)');
    expect(buyUpgradeIdx).toBeGreaterThan(-1);
    expect(applyGearIdx).toBeGreaterThan(buyUpgradeIdx);
  });

  it('buyUpgrade loop comes BEFORE _applyTowerMetaBonuses', () => {
    const buyUpgradeIdx    = methodBody.indexOf('upgradeManager.buyUpgrade(tower, path)');
    const applyMetaIdx     = methodBody.indexOf('_applyTowerMetaBonuses(tower)');
    expect(buyUpgradeIdx).toBeGreaterThan(-1);
    expect(applyMetaIdx).toBeGreaterThan(buyUpgradeIdx);
  });

  it('applyGearToStats comes BEFORE _applyTowerMetaBonuses (gear first, then meta)', () => {
    const applyGearIdx = methodBody.indexOf('applyGearToStats(tower.upgStats, gearBonuses)');
    const applyMetaIdx = methodBody.indexOf('_applyTowerMetaBonuses(tower)');
    expect(applyGearIdx).toBeGreaterThan(-1);
    expect(applyMetaIdx).toBeGreaterThan(applyGearIdx);
  });

  it('gear/meta comment explains why order matters', () => {
    // The fix comment mentions "after buyUpgrade loop" or "AFTER this loop"
    expect(methodBody).toMatch(/after.*this loop|after.*buyUpgrade loop|must come after/i);
  });

  it('no applyGearToStats call exists before the buyUpgrade loop (regression guard)', () => {
    const buyUpgradeIdx = methodBody.indexOf('upgradeManager.buyUpgrade(tower, path)');
    // Scan the text before the buyUpgrade loop for any applyGearToStats call
    const beforeLoop = methodBody.slice(0, buyUpgradeIdx);
    expect(beforeLoop).not.toContain('applyGearToStats');
  });

  it('no _applyTowerMetaBonuses call exists before the buyUpgrade loop (regression guard)', () => {
    const buyUpgradeIdx = methodBody.indexOf('upgradeManager.buyUpgrade(tower, path)');
    const beforeLoop = methodBody.slice(0, buyUpgradeIdx);
    expect(beforeLoop).not.toContain('_applyTowerMetaBonuses');
  });
});

// ── tryPlaceTower parity check ───────────────────────────────────────────────

describe('tryPlaceTower — gear+meta ordering parity', () => {
  const tpStart = gameSceneSrc.indexOf('private tryPlaceTower(');
  const tpBody  = gameSceneSrc.slice(tpStart, tpStart + 2500);

  it('tryPlaceTower applies gear bonuses after registerTower', () => {
    const registerIdx = tpBody.indexOf('upgradeManager.registerTower(tower)');
    const gearIdx     = tpBody.indexOf('applyGearToStats(tower.upgStats, gearBonuses)');
    expect(registerIdx).toBeGreaterThan(-1);
    expect(gearIdx).toBeGreaterThan(registerIdx);
  });

  it('tryPlaceTower applies meta bonuses after gear bonuses', () => {
    const gearIdx = tpBody.indexOf('applyGearToStats(tower.upgStats, gearBonuses)');
    const metaIdx = tpBody.indexOf('_applyTowerMetaBonuses(tower)');
    expect(gearIdx).toBeGreaterThan(-1);
    expect(metaIdx).toBeGreaterThan(gearIdx);
  });
});
