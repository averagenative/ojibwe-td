/**
 * TASK-109: Aura & Upgrade Impact Audit
 *
 * Tests verify:
 *  1. Per-tower upgrade stat deltas are computed correctly at each rank.
 *  2. Aura buffs (speed / damage / range) are applied to nearby towers.
 *  3. Deep-spec drawbacks reduce the bonus correctly for ineligible tower types.
 *  4. Multiple aura towers stack using best-wins logic.
 *  5. buildStatsLine() returns tower-type-specific data (UI correctness).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UpgradeManager }       from '../UpgradeManager';
import { buildStatsLine }       from '../../ui/statsLine';
import {
  ARROW_DEF, ROCK_HURLER_DEF, FROST_DEF, POISON_DEF, TESLA_DEF, AURA_DEF,
  defaultUpgradeStats,
} from '../../data/towerDefs';
import type { TowerDef, TowerUpgradeStats } from '../../data/towerDefs';
import type { Tower } from '../../entities/towers/Tower';

// ── Minimal mock-tower factory ─────────────────────────────────────────────────

function makeTower(
  def: TowerDef,
  x = 0,
  y = 0,
): Tower {
  const mock = {
    def,
    x,
    y,
    upgStats: defaultUpgradeStats(def),
    applyUpgradeStats(s: TowerUpgradeStats) { mock.upgStats = s; },
    setAnimTier(_t: number) { /* no-op */ },
    onChainFired: undefined as ((pos: Array<{ x: number; y: number }>) => void) | undefined,
  };
  return mock as unknown as Tower;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeManager(towersRef: Tower[]): UpgradeManager {
  return new UpgradeManager(() => towersRef, () => new Set());
}

function buyN(mgr: UpgradeManager, tower: Tower, path: 'A' | 'B' | 'C', n: number) {
  for (let i = 0; i < n; i++) mgr.buyUpgrade(tower, path);
}

// ── Simulate the GameScene updateAuras() logic in a test environment ──────────
// (pure math — no Phaser dependency)

interface AuraBuffResult {
  speedMult:  number;  // interval multiplier applied to this tower
  damageMult: number;
  rangePct:   number;
}

function computeAuraBuffs(
  target: Tower,
  auras:  Tower[],
): AuraBuffResult {
  let speedMult  = 1.0;
  let damageMult = 1.0;
  let rangePct   = 0;

  for (const aura of auras) {
    if (!aura.def.isAura) continue;

    const stats    = aura.upgStats;
    const auraRange = stats.range;
    const specType  = stats.auraSpecType;

    const dx   = target.x - aura.x;
    const dy   = target.y - aura.y;
    if (Math.sqrt(dx * dx + dy * dy) > auraRange) continue;

    const isAuraTower = target.def.isAura;

    // Speed aura
    const rawSpeed = stats.auraIntervalMult;
    if (rawSpeed < 1.0) {
      const effMult = (specType === 'speed' && isAuraTower)
        ? 1.0 - (1.0 - rawSpeed) * 0.5
        : rawSpeed;
      speedMult = Math.min(speedMult, effMult);
    }

    // Damage aura
    const rawDmg = stats.auraDamageMult;
    if (rawDmg > 1.0) {
      const effMult = (specType === 'damage' && isAuraTower)
        ? 1.0 + (rawDmg - 1.0) * 0.5
        : rawDmg;
      damageMult = Math.max(damageMult, effMult);
    }

    // Range aura
    const rawRange = stats.auraRangePct;
    if (rawRange > 0) {
      const effPct = (specType === 'range' && isAuraTower) ? 0 : rawRange;
      rangePct = Math.max(rangePct, effPct);
    }
  }

  return { speedMult, damageMult, rangePct };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Upgrade stat deltas — per tower type', () => {

  describe('Arrow tower', () => {
    let towers: Tower[];
    let mgr:    UpgradeManager;
    let arrow:  Tower;

    beforeEach(() => {
      towers = [];
      mgr    = makeManager(towers);
      arrow  = makeTower(ARROW_DEF);
      towers.push(arrow);
      mgr.registerTower(arrow);
    });

    it('Path A: each tier adds the declared attackSpeedPct delta', () => {
      // Tier costs: 25, 40, 55, 80, 110; speed pct: 8, 8, 10, 10, 12
      buyN(mgr, arrow, 'A', 1);
      // clamped at 50% max — 8% → effectiveInterval = 600 × (1 - 0.08) = 552
      expect(arrow.upgStats.attackIntervalMs).toBeCloseTo(600 * (1 - 0.08), 1);

      buyN(mgr, arrow, 'A', 4); // 5 total: 8+8+10+10+12 = 48%
      expect(arrow.upgStats.attackIntervalMs).toBeCloseTo(600 * (1 - 0.48), 1);
    });

    it('Path A Tier 5: +5 damage bonus applied correctly', () => {
      buyN(mgr, arrow, 'A', 5);
      expect(arrow.upgStats.damage).toBe(ARROW_DEF.damage + 5);
    });

    it('Path B: multiShotCount accumulates one per tier', () => {
      buyN(mgr, arrow, 'B', 1);
      expect(arrow.upgStats.multiShotCount).toBe(1);

      buyN(mgr, arrow, 'B', 4); // 5 total
      expect(arrow.upgStats.multiShotCount).toBe(5);
    });

    it("Path C Track I: +20 range delta applied", () => {
      buyN(mgr, arrow, 'C', 1);
      expect(arrow.upgStats.range).toBe(ARROW_DEF.range + 20);
    });

    it('Path C Track II: arrowSlowFactor set to 0.85', () => {
      buyN(mgr, arrow, 'C', 2);
      expect(arrow.upgStats.arrowSlowFactor).toBe(0.85);
      expect(arrow.upgStats.arrowSlowDurationMs).toBe(1500);
    });

    it('Path C Track V: strongest slow + cumulative range bonus', () => {
      buyN(mgr, arrow, 'C', 5);
      expect(arrow.upgStats.arrowSlowFactor).toBe(0.70);
      expect(arrow.upgStats.arrowSlowDurationMs).toBe(3000);
      // rangeDelta: tier1 +20, tier4 +10, tier5 +15 → +45 total
      expect(arrow.upgStats.range).toBe(ARROW_DEF.range + 20 + 10 + 15);
    });
  });

  describe('Rock Hurler tower', () => {
    let towers: Tower[];
    let mgr:    UpgradeManager;
    let rh:     Tower;

    beforeEach(() => {
      towers = [];
      mgr    = makeManager(towers);
      rh     = makeTower(ROCK_HURLER_DEF);
      towers.push(rh);
      mgr.registerTower(rh);
    });

    it('Path A: armorShredPct advances by last-write-wins per tier', () => {
      buyN(mgr, rh, 'A', 1);
      expect(rh.upgStats.armorShredPct).toBe(0.10);
      buyN(mgr, rh, 'A', 1);
      expect(rh.upgStats.armorShredPct).toBe(0.18);
      buyN(mgr, rh, 'A', 1);
      expect(rh.upgStats.armorShredPct).toBe(0.26);
    });

    it('Path A Tier 5: 40% shred, 5s duration', () => {
      buyN(mgr, rh, 'A', 5);
      expect(rh.upgStats.armorShredPct).toBe(0.40);
      expect(rh.upgStats.armorShredDuration).toBe(5000);
    });

    it('Path B: damage accumulates across all tiers', () => {
      buyN(mgr, rh, 'B', 5);
      // +18 +30 +42 +55 +70 = +215
      expect(rh.upgStats.damage).toBe(ROCK_HURLER_DEF.damage + 18 + 30 + 42 + 55 + 70);
    });

    it('Path B Tier 3: executeThreshold first appears at 0.10', () => {
      buyN(mgr, rh, 'B', 2);
      expect(rh.upgStats.executeThreshold).toBe(0);
      buyN(mgr, rh, 'B', 1);
      expect(rh.upgStats.executeThreshold).toBe(0.10);
    });

    it('Path C Tier 5: clusterCount = 6', () => {
      buyN(mgr, rh, 'C', 5);
      expect(rh.upgStats.clusterCount).toBe(6);
    });
  });

  describe('Frost tower', () => {
    let towers: Tower[];
    let mgr:    UpgradeManager;
    let frost:  Tower;

    beforeEach(() => {
      towers = [];
      mgr    = makeManager(towers);
      frost  = makeTower(FROST_DEF);
      towers.push(frost);
      mgr.registerTower(frost);
    });

    it('Path A: slowFactor decreases with each tier (last-write-wins)', () => {
      buyN(mgr, frost, 'A', 1);
      expect(frost.upgStats.slowFactor).toBeCloseTo(0.44);
      buyN(mgr, frost, 'A', 4); // 5 total
      expect(frost.upgStats.slowFactor).toBeCloseTo(0.12);
    });

    it('Path B: slowDurationMs increases with each tier', () => {
      buyN(mgr, frost, 'B', 1);
      expect(frost.upgStats.slowDurationMs).toBe(3000);
      buyN(mgr, frost, 'B', 4); // 5 total
      expect(frost.upgStats.slowDurationMs).toBe(6000);
    });

    it('Path C Tier 5: shatterOnDeath active, cumulative +72 damage', () => {
      buyN(mgr, frost, 'C', 5);
      expect(frost.upgStats.shatterOnDeath).toBe(true);
      // +8 +10 +14 +18 +22 = +72
      expect(frost.upgStats.damage).toBe(FROST_DEF.damage + 8 + 10 + 14 + 18 + 22);
    });
  });

  describe('Poison tower', () => {
    let towers: Tower[];
    let mgr:    UpgradeManager;
    let poison: Tower;

    beforeEach(() => {
      towers = [];
      mgr    = makeManager(towers);
      poison = makeTower(POISON_DEF);
      towers.push(poison);
      mgr.registerTower(poison);
    });

    it('Path A: dotDamageBonus set to absolute tier value (last-write-wins)', () => {
      buyN(mgr, poison, 'A', 1);
      expect(poison.upgStats.dotDamageBonus).toBe(2);
      buyN(mgr, poison, 'A', 4); // 5 total → 12
      expect(poison.upgStats.dotDamageBonus).toBe(12);
    });

    it('Path B: maxDotStacks increases per tier', () => {
      expect(poison.upgStats.maxDotStacks).toBe(4); // base
      buyN(mgr, poison, 'B', 1);
      expect(poison.upgStats.maxDotStacks).toBe(5);
      buyN(mgr, poison, 'B', 4); // 5 total
      expect(poison.upgStats.maxDotStacks).toBe(10);
    });

    it('Path C Tier 1: dotSpreadOnDeath enabled, +3 damage', () => {
      buyN(mgr, poison, 'C', 1);
      expect(poison.upgStats.dotSpreadOnDeath).toBe(true);
      expect(poison.upgStats.damage).toBe(POISON_DEF.damage + 3);
    });

    it('Path C Tier 3: spreadStackCount = 2', () => {
      buyN(mgr, poison, 'C', 3);
      expect(poison.upgStats.dotSpreadStackCount).toBe(2);
    });

    it('Path C Tier 5: spreadStackCount = 3, dotSpreadHitsAir = true', () => {
      buyN(mgr, poison, 'C', 5);
      expect(poison.upgStats.dotSpreadStackCount).toBe(3);
      expect(poison.upgStats.dotSpreadHitsAir).toBe(true);
    });
  });

  describe('Tesla tower', () => {
    let towers: Tower[];
    let mgr:    UpgradeManager;
    let tesla:  Tower;

    beforeEach(() => {
      towers = [];
      mgr    = makeManager(towers);
      tesla  = makeTower(TESLA_DEF);
      towers.push(tesla);
      mgr.registerTower(tesla);
    });

    it('Path A: chainCount accumulates all deltas', () => {
      buyN(mgr, tesla, 'A', 5);
      // base: 3, +1+2+3+4+5 = +15 → total 18
      expect(tesla.upgStats.chainCount).toBe(3 + 1 + 2 + 3 + 4 + 5);
    });

    it('Path B: chainDamageRatio accumulates', () => {
      buyN(mgr, tesla, 'B', 5);
      // base: 0.60, +0.10+0.15+0.20+0.25+0.30 = +1.00 → 1.60
      expect(tesla.upgStats.chainDamageRatio).toBeCloseTo(0.60 + 0.10 + 0.15 + 0.20 + 0.25 + 0.30, 5);
    });

    it('Path C Tier 1: overloadMode active, debuffPct = 15', () => {
      buyN(mgr, tesla, 'C', 1);
      expect(tesla.upgStats.overloadMode).toBe(true);
      expect(tesla.upgStats.overloadDebuffPct).toBe(15);
    });

    it('Path C Tier 5: debuffPct = 35, +42 cumulative damage', () => {
      buyN(mgr, tesla, 'C', 5);
      expect(tesla.upgStats.overloadDebuffPct).toBe(35);
      // +8 +14 +20 = +42 (tiers 3-5 have damageDelta)
      expect(tesla.upgStats.damage).toBe(TESLA_DEF.damage + 8 + 14 + 20);
    });
  });

  describe('Aura tower', () => {
    let towers: Tower[];
    let mgr:    UpgradeManager;
    let aura:   Tower;

    beforeEach(() => {
      towers = [];
      mgr    = makeManager(towers);
      aura   = makeTower(AURA_DEF);
      towers.push(aura);
      mgr.registerTower(aura);
    });

    it('base (no upgrades): auraIntervalMult = 0.80, auraDamageMult = 1.0, auraRangePct = 0', () => {
      expect(aura.upgStats.auraIntervalMult).toBeCloseTo(0.80);
      expect(aura.upgStats.auraDamageMult).toBe(1.0);
      expect(aura.upgStats.auraRangePct).toBe(0);
    });

    it('Path A Tier 5: auraIntervalMult = 0.55 (45% faster)', () => {
      buyN(mgr, aura, 'A', 5);
      // base 0.80 + 5 × (−0.05) = 0.55
      expect(aura.upgStats.auraIntervalMult).toBeCloseTo(0.80 - 5 * 0.05, 5);
    });

    it('Path B Tier 5: auraDamageMult = 1.50 (+50% damage)', () => {
      buyN(mgr, aura, 'B', 5);
      // 1.0 + 0.15+0.07+0.08+0.10+0.10 = 1.50
      expect(aura.upgStats.auraDamageMult).toBeCloseTo(1.0 + 0.15 + 0.07 + 0.08 + 0.10 + 0.10, 5);
    });

    it('Path C Tier 5: auraRangePct = 0.50 (+50% range)', () => {
      buyN(mgr, aura, 'C', 5);
      // 0 + 0.12+0.08+0.08+0.10+0.12 = 0.50
      expect(aura.upgStats.auraRangePct).toBeCloseTo(0.12 + 0.08 + 0.08 + 0.10 + 0.12, 5);
    });

    it('Path A Tier 3+: auraSpecType = "speed"', () => {
      buyN(mgr, aura, 'A', 3);
      expect(aura.upgStats.auraSpecType).toBe('speed');
    });

    it('Path B Tier 3+: auraSpecType = "damage"', () => {
      buyN(mgr, aura, 'B', 3);
      expect(aura.upgStats.auraSpecType).toBe('damage');
    });

    it('Path C Tier 3+: auraSpecType = "range"', () => {
      buyN(mgr, aura, 'C', 3);
      expect(aura.upgStats.auraSpecType).toBe('range');
    });
  });
});

// ── Aura application tests ────────────────────────────────────────────────────

describe('Aura buff application', () => {

  it('speed aura: tower in range gets the interval multiplier', () => {
    const towers: Tower[] = [];
    const mgr   = makeManager(towers);

    const aura  = makeTower(AURA_DEF, 0, 0);   // x=0, y=0
    const arrow = makeTower(ARROW_DEF, 100, 0); // within 180px aura range

    towers.push(aura, arrow);
    mgr.registerTower(aura);
    mgr.registerTower(arrow);

    // No upgrades: base auraIntervalMult = 0.80
    const result = computeAuraBuffs(arrow, [aura]);
    expect(result.speedMult).toBeCloseTo(0.80);
  });

  it('speed aura: tower out of range gets no buff', () => {
    const aura  = makeTower(AURA_DEF, 0, 0);    // range 180
    const arrow = makeTower(ARROW_DEF, 300, 0);  // 300px away — outside range

    const result = computeAuraBuffs(arrow, [aura]);
    expect(result.speedMult).toBe(1.0); // unchanged
  });

  it('damage aura: base aura has no damage buff (auraDamageMult starts at 1.0)', () => {
    const aura  = makeTower(AURA_DEF, 0, 0);
    const arrow = makeTower(ARROW_DEF, 100, 0);

    const result = computeAuraBuffs(arrow, [aura]);
    expect(result.damageMult).toBe(1.0);
  });

  it('damage aura: Path B upgrades grant damage buff to nearby towers', () => {
    const towers: Tower[] = [];
    const mgr   = makeManager(towers);

    const aura  = makeTower(AURA_DEF, 0, 0);
    const arrow = makeTower(ARROW_DEF, 100, 0);

    towers.push(aura, arrow);
    mgr.registerTower(aura);
    mgr.registerTower(arrow);
    buyN(mgr, aura, 'B', 5); // +50% damage

    const result = computeAuraBuffs(arrow, [aura]);
    expect(result.damageMult).toBeCloseTo(1.50, 5);
  });

  it('range aura: Path C upgrades grant range bonus to nearby towers', () => {
    const towers: Tower[] = [];
    const mgr   = makeManager(towers);

    const aura  = makeTower(AURA_DEF, 0, 0);
    const arrow = makeTower(ARROW_DEF, 100, 0);

    towers.push(aura, arrow);
    mgr.registerTower(aura);
    mgr.registerTower(arrow);
    buyN(mgr, aura, 'C', 5); // +50% range

    const result = computeAuraBuffs(arrow, [aura]);
    expect(result.rangePct).toBeCloseTo(0.50, 5);
  });

  it('multiple aura towers: speed buff picks the LOWEST multiplier (fastest)', () => {
    const towers: Tower[] = [];
    const mgr   = makeManager(towers);

    const aura1 = makeTower(AURA_DEF, 0, 0);   // tier 1 A → 0.75
    const aura2 = makeTower(AURA_DEF, 50, 0);   // tier 3 A → 0.65
    const arrow = makeTower(ARROW_DEF, 100, 0);

    towers.push(aura1, aura2, arrow);
    [aura1, aura2, arrow].forEach(t => mgr.registerTower(t));
    buyN(mgr, aura1, 'A', 1);
    buyN(mgr, aura2, 'A', 3);

    const result = computeAuraBuffs(arrow, [aura1, aura2]);
    // Best speed = min(0.75, 0.65) = 0.65
    expect(result.speedMult).toBeCloseTo(0.65, 5);
  });

  it('multiple aura towers: damage buff picks the HIGHEST multiplier', () => {
    const towers: Tower[] = [];
    const mgr   = makeManager(towers);

    const aura1 = makeTower(AURA_DEF, 0, 0);   // tier 1 B → 1.15
    const aura2 = makeTower(AURA_DEF, 50, 0);   // tier 3 B → 1.30
    const arrow = makeTower(ARROW_DEF, 100, 0);

    towers.push(aura1, aura2, arrow);
    [aura1, aura2, arrow].forEach(t => mgr.registerTower(t));
    buyN(mgr, aura1, 'B', 1);
    buyN(mgr, aura2, 'B', 3);

    const result = computeAuraBuffs(arrow, [aura1, aura2]);
    // Best damage = max(1.15, 1.30) = 1.30
    expect(result.damageMult).toBeCloseTo(1.30, 5);
  });

  it('deep speed spec: aura tower itself gets only 50% of speed bonus', () => {
    const towers: Tower[] = [];
    const mgr   = makeManager(towers);

    const speedAura = makeTower(AURA_DEF, 0, 0);
    const otherAura = makeTower(AURA_DEF, 50, 0); // another aura tower

    towers.push(speedAura, otherAura);
    [speedAura, otherAura].forEach(t => mgr.registerTower(t));
    buyN(mgr, speedAura, 'A', 3); // spec active, mult = 0.65

    // 0.65 means 35% faster; for another aura tower: 35% × 50% = 17.5% faster → 0.825
    const result = computeAuraBuffs(otherAura, [speedAura]);
    const rawBonus = 1.0 - 0.65;          // 0.35
    const halfBonus = rawBonus * 0.5;     // 0.175
    expect(result.speedMult).toBeCloseTo(1.0 - halfBonus, 5);
  });

  it('deep damage spec: aura tower itself gets only 50% of damage bonus', () => {
    const towers: Tower[] = [];
    const mgr   = makeManager(towers);

    const dmgAura   = makeTower(AURA_DEF, 0, 0);
    const otherAura = makeTower(AURA_DEF, 50, 0);

    towers.push(dmgAura, otherAura);
    [dmgAura, otherAura].forEach(t => mgr.registerTower(t));
    buyN(mgr, dmgAura, 'B', 3); // spec active, mult = 1.30

    // +30% for combat towers; aura towers get only +15%
    const result = computeAuraBuffs(otherAura, [dmgAura]);
    expect(result.damageMult).toBeCloseTo(1.15, 5);
  });

  it('deep range spec: aura tower itself gets zero range bonus', () => {
    const towers: Tower[] = [];
    const mgr   = makeManager(towers);

    const rangeAura = makeTower(AURA_DEF, 0, 0);
    const otherAura = makeTower(AURA_DEF, 50, 0);

    towers.push(rangeAura, otherAura);
    [rangeAura, otherAura].forEach(t => mgr.registerTower(t));
    buyN(mgr, rangeAura, 'C', 3); // spec active, rangePct = 0.28

    // Range spec: aura towers themselves receive 0 range bonus.
    const result = computeAuraBuffs(otherAura, [rangeAura]);
    expect(result.rangePct).toBe(0);
  });

  it('non-aura towers get full range bonus from range-spec aura', () => {
    const towers: Tower[] = [];
    const mgr   = makeManager(towers);

    const rangeAura = makeTower(AURA_DEF, 0, 0);
    const arrow     = makeTower(ARROW_DEF, 100, 0);

    towers.push(rangeAura, arrow);
    [rangeAura, arrow].forEach(t => mgr.registerTower(t));
    buyN(mgr, rangeAura, 'C', 3); // spec active, rangePct = 0.28

    const result = computeAuraBuffs(arrow, [rangeAura]);
    expect(result.rangePct).toBeCloseTo(0.28, 5);
  });
});

// ── buildStatsLine UI correctness ─────────────────────────────────────────────

describe('buildStatsLine — tower-type-specific stats display', () => {

  it('aura (no upgrades): shows base speed +20%, dmg +0%, rng +0%', () => {
    const us = defaultUpgradeStats(AURA_DEF);
    const line = buildStatsLine('aura', true, us, '0.00');
    expect(line).toContain('spd +20%');
    expect(line).toContain('dmg +0%');
    expect(line).toContain('rng +0%');
  });

  it('aura (Path B Tier 1): shows dmg +15%', () => {
    const us = { ...defaultUpgradeStats(AURA_DEF), auraDamageMult: 1.15 };
    const line = buildStatsLine('aura', true, us, '0.00');
    expect(line).toContain('dmg +15%');
  });

  it('aura (Path C Tier 3): shows rng +28%', () => {
    const us = { ...defaultUpgradeStats(AURA_DEF), auraRangePct: 0.28 };
    const line = buildStatsLine('aura', true, us, '0.00');
    expect(line).toContain('rng +28%');
  });

  it('frost: shows slow factor and duration', () => {
    const us   = defaultUpgradeStats(FROST_DEF);
    const line = buildStatsLine('frost', false, us, '1.20');
    expect(line).toContain('slow ×0.50');
    expect(line).toContain('2.5s');
  });

  it('frost (Path A Tier 3): shows updated slow factor 0.28', () => {
    const us   = { ...defaultUpgradeStats(FROST_DEF), slowFactor: 0.28, slowDurationMs: 2500 };
    const line = buildStatsLine('frost', false, us, '1.20');
    expect(line).toContain('slow ×0.28');
  });

  it('poison: shows DoT and stack count', () => {
    const us   = defaultUpgradeStats(POISON_DEF);
    const line = buildStatsLine('poison', false, us, '1.50');
    expect(line).toContain('DoT:');
    expect(line).toContain('/tick×8');
    expect(line).toContain('4 stacks');
  });

  it('poison (Path A Tier 5 + Path B Tier 5): shows elevated DoT and stacks', () => {
    const us = {
      ...defaultUpgradeStats(POISON_DEF),
      dotDamageBase: 6,
      dotDamageBonus: 12,
      maxDotStacks: 10,
    };
    const line = buildStatsLine('poison', false, us, '1.50');
    expect(line).toContain('18/tick×8');
    expect(line).toContain('10 stacks');
  });

  it('tesla: shows chain count and chain damage ratio', () => {
    const us   = defaultUpgradeStats(TESLA_DEF);
    const line = buildStatsLine('tesla', false, us, '1.50');
    expect(line).toContain('chains: 3');
    expect(line).toContain('×0.60');
  });

  it('arrow: shows shot count (1 + multiShotCount)', () => {
    const us   = defaultUpgradeStats(ARROW_DEF);
    const line = buildStatsLine('arrow', false, us, '0.60');
    expect(line).toContain('shots: 1');
  });

  it('arrow (Path B Tier 3): shows shots: 4', () => {
    const us = { ...defaultUpgradeStats(ARROW_DEF), multiShotCount: 3 };
    const line = buildStatsLine('arrow', false, us, '0.60');
    expect(line).toContain('shots: 4');
  });

  it('arrow (Path C Tier 3): shows slow percentage', () => {
    const us = { ...defaultUpgradeStats(ARROW_DEF), arrowSlowFactor: 0.80, arrowSlowDurationMs: 2000 };
    const line = buildStatsLine('arrow', false, us, '0.60');
    expect(line).toContain('slow 20%');
  });

  it('rock-hurler (no upgrades): shows damage+splash, no shred', () => {
    const us   = defaultUpgradeStats(ROCK_HURLER_DEF);
    const line = buildStatsLine('rock-hurler', false, us, '2.00');
    expect(line).toContain('DMG: 55+splash');
    // no shred or cluster info when not upgraded
    expect(line).not.toContain('shred');
    expect(line).not.toContain('clusters');
  });

  it('rock-hurler (Path A Tier 3): shows shred 26%', () => {
    const us = { ...defaultUpgradeStats(ROCK_HURLER_DEF), armorShredPct: 0.26 };
    const line = buildStatsLine('rock-hurler', false, us, '2.00');
    expect(line).toContain('shred 26%');
  });

  it('rock-hurler (Path C Tier 4): shows clusters: 5', () => {
    const us = { ...defaultUpgradeStats(ROCK_HURLER_DEF), clusterCount: 5 };
    const line = buildStatsLine('rock-hurler', false, us, '2.00');
    expect(line).toContain('clusters: 5');
  });

  it('default case: shows DMG / RNG / atk', () => {
    // Hypothetical unlisted tower key
    const us   = defaultUpgradeStats(FROST_DEF);
    const line = buildStatsLine('unknown-tower', false, us, '1.20');
    expect(line).toContain('DMG:');
    expect(line).toContain('RNG:');
    expect(line).toContain('atk');
  });
});
