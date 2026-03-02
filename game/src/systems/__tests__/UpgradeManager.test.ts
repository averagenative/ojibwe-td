import { describe, it, expect, beforeEach } from 'vitest';
import { UpgradeManager } from '../UpgradeManager';
import { CANNON_DEF, defaultUpgradeStats } from '../../data/towerDefs';
import type { TowerDef, TowerUpgradeStats } from '../../data/towerDefs';
import type { Tower } from '../../entities/towers/Tower';

// ── Mock Tower factory ─────────────────────────────────────────────────────────
//
// UpgradeManager only needs: def.key, def.isAura, def.chainRange,
// upgStats (readable), applyUpgradeStats (writable), onChainFired.
// We build a minimal plain-object mock and cast it.

function makeMockTower(def: TowerDef = CANNON_DEF): Tower {
  const mock = {
    def,
    upgStats: defaultUpgradeStats(def),
    applyUpgradeStats(s: TowerUpgradeStats): void { mock.upgStats = s; },
    setAnimTier(_t: number): void { /* no-op in tests */ },
    onChainFired: undefined as ((pos: Array<{ x: number; y: number }>) => void) | undefined,
  };
  return mock as unknown as Tower;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UpgradeManager', () => {
  let towers: Tower[];
  let manager: UpgradeManager;

  beforeEach(() => {
    towers = [];
    manager = new UpgradeManager(
      () => towers,
      () => new Set(),
    );
  });

  // ── apply-tier: buying an upgrade tier updates tower stats ──────────────────

  describe('apply-tier', () => {
    it('applies stat delta and effect after buying one tier', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      // Cannon B tier-1 (Cull I): statDelta +5 dmg, effect executeThreshold 0.10
      manager.buyUpgrade(tower, 'B');
      expect(tower.upgStats.damage).toBe(CANNON_DEF.damage + 5);
      expect(tower.upgStats.executeThreshold).toBe(0.10);
    });

    it('accumulates deltas across multiple tiers on the same path', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      // Tier-1 (+5 dmg) + tier-2 (+8 dmg) → total +13
      manager.buyUpgrade(tower, 'B');
      manager.buyUpgrade(tower, 'B');
      expect(tower.upgStats.damage).toBe(CANNON_DEF.damage + 5 + 8);
      expect(tower.upgStats.executeThreshold).toBe(0.13);
    });

    it('increments totalSpent by each tier cost', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      manager.buyUpgrade(tower, 'A'); // Expose I: cost 40
      expect(manager.getState(tower)!.totalSpent).toBe(40);

      manager.buyUpgrade(tower, 'A'); // Expose II: cost 60
      expect(manager.getState(tower)!.totalSpent).toBe(100);
    });

    it('advancing path A three times reaches tier 3', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      for (let i = 0; i < 3; i++) manager.buyUpgrade(tower, 'A');
      expect(manager.getState(tower)!.tiers.A).toBe(3);
    });
  });

  // ── path-lock: deep investment in A/C locks the opposing path ──────────────

  describe('path-lock', () => {
    it('advancing path A to lockThreshold (3) locks path C', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      manager.buyUpgrade(tower, 'A');
      manager.buyUpgrade(tower, 'A');
      expect(manager.getState(tower)!.locked.has('C')).toBe(false); // not yet

      manager.buyUpgrade(tower, 'A'); // reaches lockThreshold of 3
      expect(manager.getState(tower)!.locked.has('C')).toBe(true);
      expect(manager.getState(tower)!.locked.has('A')).toBe(false);
      expect(manager.getState(tower)!.locked.has('B')).toBe(false);
    });

    it('advancing path C to lockThreshold (3) locks path A', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      for (let i = 0; i < 3; i++) manager.buyUpgrade(tower, 'C');
      expect(manager.getState(tower)!.locked.has('A')).toBe(true);
      expect(manager.getState(tower)!.locked.has('B')).toBe(false);
    });

    it('path B is never locked regardless of A or C investment', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      for (let i = 0; i < 5; i++) manager.buyUpgrade(tower, 'A');
      expect(manager.getState(tower)!.locked.has('B')).toBe(false);
      expect(manager.canUpgrade(tower, 'B')).toBe(true);
    });

    it('lock is cleared after a respec', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      for (let i = 0; i < 3; i++) manager.buyUpgrade(tower, 'A');
      expect(manager.getState(tower)!.locked.has('C')).toBe(true);

      manager.respec(tower);
      expect(manager.getState(tower)!.locked.size).toBe(0);
      expect(manager.canUpgrade(tower, 'C')).toBe(true);
    });
  });

  // ── respec gold calculation ─────────────────────────────────────────────────

  describe('respec gold calculation', () => {
    it('fee equals floor(totalSpent × respecCostPct)', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      manager.buyUpgrade(tower, 'A'); // Expose I: cost 40 → totalSpent 40
      // CANNON respecCostPct = 0.25 → fee = floor(40 × 0.25) = 10
      expect(manager.getRespecCost(tower)).toBe(10);
    });

    it('refund equals totalSpent minus fee', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      manager.buyUpgrade(tower, 'A'); // cost 40 → totalSpent 40
      // refund = 40 - 10 = 30
      expect(manager.getRespecRefund(tower)).toBe(30);
    });

    it('respec() returns the correct gold refund', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      manager.buyUpgrade(tower, 'B'); // cost 40
      manager.buyUpgrade(tower, 'B'); // cost 60 → totalSpent 100
      // fee = 25, refund = 75
      expect(manager.respec(tower)).toBe(75);
    });

    it('respec() resets tiers, unlocks all paths, and zeroes totalSpent', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      for (let i = 0; i < 3; i++) manager.buyUpgrade(tower, 'A'); // locks C
      manager.respec(tower);

      const state = manager.getState(tower)!;
      expect(state.tiers).toEqual({ A: 0, B: 0, C: 0 });
      expect(state.locked.size).toBe(0);
      expect(state.totalSpent).toBe(0);
    });

    it('returns 0 if nothing was spent', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      expect(manager.respec(tower)).toBe(0);
    });
  });

  // ── invalid-upgrade guard: locked / maxed / unregistered paths return 0 ─────

  describe('invalid-upgrade guard', () => {
    it('buyUpgrade returns 0 when the path is locked', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      for (let i = 0; i < 3; i++) manager.buyUpgrade(tower, 'A'); // locks C
      expect(manager.buyUpgrade(tower, 'C')).toBe(0);
    });

    it('buyUpgrade returns 0 when the path is at max tier (5)', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      for (let i = 0; i < 5; i++) manager.buyUpgrade(tower, 'B');
      expect(manager.getState(tower)!.tiers.B).toBe(5);
      expect(manager.buyUpgrade(tower, 'B')).toBe(0);
    });

    it('buyUpgrade returns 0 for an unregistered tower', () => {
      const tower = makeMockTower(CANNON_DEF);
      // intentionally not registered
      expect(manager.buyUpgrade(tower, 'A')).toBe(0);
    });

    it('canUpgrade returns false for a locked path', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      for (let i = 0; i < 3; i++) manager.buyUpgrade(tower, 'A');
      expect(manager.canUpgrade(tower, 'C')).toBe(false);
    });

    it('canUpgrade returns false for a maxed path', () => {
      const tower = makeMockTower(CANNON_DEF);
      towers.push(tower);
      manager.registerTower(tower);

      for (let i = 0; i < 5; i++) manager.buyUpgrade(tower, 'B');
      expect(manager.canUpgrade(tower, 'B')).toBe(false);
    });
  });
});
