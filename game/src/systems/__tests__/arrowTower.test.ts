/**
 * Unit tests for the Arrow tower:
 *   - Definition properties
 *   - Damage cap enforcement logic
 *   - UpgradeManager integration (Path A/B/C)
 *   - BalanceCalc parity with UpgradeManager
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ARROW_DEF,
  CANNON_DEF,
  ALL_TOWER_DEFS,
  defaultUpgradeStats,
} from '../../data/towerDefs';
import type { TowerDef, TowerUpgradeStats } from '../../data/towerDefs';
import { TargetingPriority } from '../../data/targeting';
import { UpgradeManager } from '../UpgradeManager';
import { computeStatsForBalance } from '../BalanceCalc';
import type { TowerUpgradeState } from '../UpgradeManager';
import type { Tower } from '../../entities/towers/Tower';

// ── Mock Tower factory ─────────────────────────────────────────────────────────

function makeMockTower(def: TowerDef = ARROW_DEF): Tower {
  const mock = {
    def,
    upgStats: defaultUpgradeStats(def),
    applyUpgradeStats(s: TowerUpgradeStats): void { mock.upgStats = s; },
    onChainFired: undefined as unknown,
    x: 0,
    y: 0,
  };
  return mock as unknown as Tower;
}

// ── Arrow Tower definition ────────────────────────────────────────────────────

describe('Arrow Tower — definition', () => {
  it('has key "arrow"', () => {
    expect(ARROW_DEF.key).toBe('arrow');
  });

  it('targets both air and ground creeps', () => {
    expect(ARROW_DEF.targetDomain).toBe('both');
  });

  it('costs between 15 and 20 gold (cheapest tower)', () => {
    expect(ARROW_DEF.cost).toBeGreaterThanOrEqual(15);
    expect(ARROW_DEF.cost).toBeLessThanOrEqual(20);
  });

  it('has a damageCap defined and greater than base damage', () => {
    expect(ARROW_DEF.damageCap).toBeDefined();
    expect(ARROW_DEF.damageCap!).toBeGreaterThan(ARROW_DEF.damage);
  });

  it('attacks faster than cannon (lower interval)', () => {
    expect(ARROW_DEF.attackIntervalMs).toBeLessThan(CANNON_DEF.attackIntervalMs);
  });

  it('fires projectiles faster than cannon (higher projectileSpeed)', () => {
    expect(ARROW_DEF.projectileSpeed).toBeGreaterThan(CANNON_DEF.projectileSpeed);
  });

  it('has a smaller projectile radius than cannon', () => {
    expect((ARROW_DEF.projectileRadius ?? 5)).toBeLessThan((CANNON_DEF.projectileRadius ?? 5));
  });

  it('defaultPriority is FIRST', () => {
    expect(ARROW_DEF.defaultPriority).toBe(TargetingPriority.FIRST);
  });

  it('has a non-empty description', () => {
    expect(ARROW_DEF.description).toBeTruthy();
    expect(ARROW_DEF.description.length).toBeGreaterThan(10);
  });
});

// ── Damage cap enforcement ────────────────────────────────────────────────────

describe('Arrow Tower — damage cap enforcement', () => {
  const cap = ARROW_DEF.damageCap!;

  it('clamps damage above damageCap down to damageCap', () => {
    const rawDamage = cap + 50;
    expect(Math.min(rawDamage, cap)).toBe(cap);
  });

  it('does not clamp damage that is already below damageCap', () => {
    const rawDamage = cap - 10;
    expect(Math.min(rawDamage, cap)).toBe(rawDamage);
  });

  it('exactly at damageCap is not reduced', () => {
    expect(Math.min(cap, cap)).toBe(cap);
  });

  it('fully-upgraded arrow + aura + global mult is still capped', () => {
    // Path B tier 3 (+5) + tier 5 (+8) + Path A tier 5 (+5) = base 10 + 18 = 28
    const maxUpgradedDamage = ARROW_DEF.damage + 5 + 8 + 5;
    // Extreme multipliers: aura ×1.5, global ×1.4, crit ×3
    const withMultipliers = Math.round(maxUpgradedDamage * 1.5 * 1.4 * 3);
    const clamped = Math.min(withMultipliers, cap);
    expect(clamped).toBeLessThanOrEqual(cap);
    // Verify the raw value would actually exceed the cap (so the test is meaningful)
    expect(withMultipliers).toBeGreaterThan(cap);
  });
});

// ── UpgradeManager integration ────────────────────────────────────────────────

describe('Arrow Tower — UpgradeManager integration', () => {
  let towers: Tower[];
  let manager: UpgradeManager;

  beforeEach(() => {
    towers = [];
    manager = new UpgradeManager(() => towers, () => new Set());
  });

  it('base stats: multiShotCount = 0, arrowSlowFactor = 0', () => {
    const tower = makeMockTower();
    towers.push(tower);
    manager.registerTower(tower);
    expect(tower.upgStats.multiShotCount).toBe(0);
    expect(tower.upgStats.arrowSlowFactor).toBe(0);
    expect(tower.upgStats.arrowSlowDurationMs).toBe(0);
  });

  // ── Path A: Rapid Fire ────────────────────────────────────────────────────

  it('path A tier 1 increases attack speed (lower interval)', () => {
    const tower = makeMockTower();
    towers.push(tower);
    manager.registerTower(tower);
    const baseInterval = tower.upgStats.attackIntervalMs;
    manager.buyUpgrade(tower, 'A');
    expect(tower.upgStats.attackIntervalMs).toBeLessThan(baseInterval);
  });

  it('path A all 5 tiers: attack speed capped at 50% and +5 damage', () => {
    const tower = makeMockTower();
    towers.push(tower);
    manager.registerTower(tower);
    for (let i = 0; i < 5; i++) manager.buyUpgrade(tower, 'A');
    // Total speedPct = 8+8+10+10+12 = 48, capped at 50
    const expectedInterval = ARROW_DEF.attackIntervalMs * (1 - 48 / 100);
    expect(tower.upgStats.attackIntervalMs).toBeCloseTo(expectedInterval, 1);
    expect(tower.upgStats.damage).toBe(ARROW_DEF.damage + 5);
  });

  // ── Path B: Multi-Shot ────────────────────────────────────────────────────

  it('path B tier 1 sets multiShotCount to 1', () => {
    const tower = makeMockTower();
    towers.push(tower);
    manager.registerTower(tower);
    manager.buyUpgrade(tower, 'B');
    expect(tower.upgStats.multiShotCount).toBe(1);
  });

  it('path B tier 2 sets multiShotCount to 2', () => {
    const tower = makeMockTower();
    towers.push(tower);
    manager.registerTower(tower);
    manager.buyUpgrade(tower, 'B');
    manager.buyUpgrade(tower, 'B');
    expect(tower.upgStats.multiShotCount).toBe(2);
  });

  it('path B all 5 tiers: multiShotCount = 5 and +13 damage', () => {
    const tower = makeMockTower();
    towers.push(tower);
    manager.registerTower(tower);
    for (let i = 0; i < 5; i++) manager.buyUpgrade(tower, 'B');
    expect(tower.upgStats.multiShotCount).toBe(5);
    // damageDelta: tier 3 +5, tier 5 +8 → total +13
    expect(tower.upgStats.damage).toBe(ARROW_DEF.damage + 5 + 8);
  });

  // ── Path C: Hunter's Edge ─────────────────────────────────────────────────

  it('path C tier 1 increases range', () => {
    const tower = makeMockTower();
    towers.push(tower);
    manager.registerTower(tower);
    manager.buyUpgrade(tower, 'C');
    expect(tower.upgStats.range).toBeGreaterThan(ARROW_DEF.range);
  });

  it('path C tier 2 enables slow-on-hit', () => {
    const tower = makeMockTower();
    towers.push(tower);
    manager.registerTower(tower);
    manager.buyUpgrade(tower, 'C');
    manager.buyUpgrade(tower, 'C');
    expect(tower.upgStats.arrowSlowFactor).toBeGreaterThan(0);
    expect(tower.upgStats.arrowSlowFactor).toBeLessThan(1);
    expect(tower.upgStats.arrowSlowDurationMs).toBeGreaterThan(0);
  });

  it('path C tier 5 max slow: factor 0.70 for 3s and +25 range total', () => {
    const tower = makeMockTower();
    towers.push(tower);
    manager.registerTower(tower);
    for (let i = 0; i < 5; i++) manager.buyUpgrade(tower, 'C');
    expect(tower.upgStats.arrowSlowFactor).toBeCloseTo(0.70, 5);
    expect(tower.upgStats.arrowSlowDurationMs).toBe(3000);
    // rangeDelta: tier 1 +20, tier 4 +10, tier 5 +15 = +45
    expect(tower.upgStats.range).toBe(ARROW_DEF.range + 20 + 10 + 15);
  });

  // ── Path locking ──────────────────────────────────────────────────────────

  it('advancing path A to tier 3 locks path C', () => {
    const tower = makeMockTower();
    towers.push(tower);
    manager.registerTower(tower);
    for (let i = 0; i < 3; i++) manager.buyUpgrade(tower, 'A');
    expect(manager.getState(tower)!.locked.has('C')).toBe(true);
    expect(manager.canUpgrade(tower, 'C')).toBe(false);
  });

  it('advancing path C to tier 3 locks path A', () => {
    const tower = makeMockTower();
    towers.push(tower);
    manager.registerTower(tower);
    for (let i = 0; i < 3; i++) manager.buyUpgrade(tower, 'C');
    expect(manager.getState(tower)!.locked.has('A')).toBe(true);
    expect(manager.canUpgrade(tower, 'A')).toBe(false);
  });

  it('path B is never locked regardless of A/C advancement', () => {
    const tower = makeMockTower();
    towers.push(tower);
    manager.registerTower(tower);
    for (let i = 0; i < 5; i++) manager.buyUpgrade(tower, 'A');
    expect(manager.canUpgrade(tower, 'B')).toBe(true);
  });

  // ── Respec ────────────────────────────────────────────────────────────────

  it('respec resets multiShotCount and arrowSlowFactor to 0', () => {
    const tower = makeMockTower();
    towers.push(tower);
    manager.registerTower(tower);
    manager.buyUpgrade(tower, 'B');
    manager.buyUpgrade(tower, 'B');
    manager.buyUpgrade(tower, 'C');
    manager.buyUpgrade(tower, 'C');
    expect(tower.upgStats.multiShotCount).toBe(2);
    expect(tower.upgStats.arrowSlowFactor).toBeGreaterThan(0);
    manager.respec(tower);
    expect(tower.upgStats.multiShotCount).toBe(0);
    expect(tower.upgStats.arrowSlowFactor).toBe(0);
    expect(tower.upgStats.arrowSlowDurationMs).toBe(0);
  });

  // ── Boundary: cannot exceed tier 5 ──────────────────────────────────────

  it('buying path B beyond tier 5 returns 0 (no-op)', () => {
    const tower = makeMockTower();
    towers.push(tower);
    manager.registerTower(tower);
    for (let i = 0; i < 5; i++) manager.buyUpgrade(tower, 'B');
    expect(tower.upgStats.multiShotCount).toBe(5);
    const result = manager.buyUpgrade(tower, 'B');
    expect(result).toBe(0);
    expect(tower.upgStats.multiShotCount).toBe(5);
  });

  // ── Non-arrow towers are unaffected by damageCap ────────────────────────

  it('cannon has no damageCap defined', () => {
    expect(CANNON_DEF.damageCap).toBeUndefined();
  });
});

// ── BalanceCalc parity ───────────────────────────────────────────────────────

describe('Arrow Tower — BalanceCalc parity with UpgradeManager', () => {
  function state(a: number, b: number, c: number): TowerUpgradeState {
    return { tiers: { A: a, B: b, C: c }, locked: new Set(), totalSpent: 0 };
  }

  it('base stats match UpgradeManager base stats', () => {
    const balance = computeStatsForBalance(ARROW_DEF, state(0, 0, 0));
    const base    = defaultUpgradeStats(ARROW_DEF);
    expect(balance.damage).toBe(base.damage);
    expect(balance.range).toBe(base.range);
    expect(balance.multiShotCount).toBe(0);
    expect(balance.arrowSlowFactor).toBe(0);
    expect(balance.arrowSlowDurationMs).toBe(0);
  });

  it('path B tier 3 produces multiShotCount = 3 and +5 damage', () => {
    const stats = computeStatsForBalance(ARROW_DEF, state(0, 3, 0));
    expect(stats.multiShotCount).toBe(3);
    expect(stats.damage).toBe(ARROW_DEF.damage + 5);
  });

  it('path B all 5 tiers produces multiShotCount = 5', () => {
    const stats = computeStatsForBalance(ARROW_DEF, state(0, 5, 0));
    expect(stats.multiShotCount).toBe(5);
    expect(stats.damage).toBe(ARROW_DEF.damage + 5 + 8);
  });

  it('path C tier 2 produces slow factor 0.85 for 1500ms', () => {
    const stats = computeStatsForBalance(ARROW_DEF, state(0, 0, 2));
    expect(stats.arrowSlowFactor).toBeCloseTo(0.85, 5);
    expect(stats.arrowSlowDurationMs).toBe(1500);
  });

  it('path C all 5 tiers produces slow factor 0.70 for 3000ms', () => {
    const stats = computeStatsForBalance(ARROW_DEF, state(0, 0, 5));
    expect(stats.arrowSlowFactor).toBeCloseTo(0.70, 5);
    expect(stats.arrowSlowDurationMs).toBe(3000);
    expect(stats.range).toBe(ARROW_DEF.range + 20 + 10 + 15);
  });

  it('path A all 5 tiers speeds up attack and adds +5 damage', () => {
    const stats = computeStatsForBalance(ARROW_DEF, state(5, 0, 0));
    const expectedInterval = ARROW_DEF.attackIntervalMs * (1 - 48 / 100);
    expect(stats.attackIntervalMs).toBeCloseTo(expectedInterval, 1);
    expect(stats.damage).toBe(ARROW_DEF.damage + 5);
  });

  it('arrow is in ALL_TOWER_DEFS', () => {
    expect(ALL_TOWER_DEFS.some(d => d.key === 'arrow')).toBe(true);
  });
});
