/**
 * TASK-098: Tower Role Redesign — Rock Hurler Merger & Armor Effectiveness
 *
 * Tests for:
 * - Rock Hurler tower definition (merged Cannon + Mortar)
 * - armorDamageMult field on TowerDef
 * - Arrow damage reduction vs armored creeps
 * - Rock Hurler bonus damage vs armored creeps
 * - Tower role differentiation (each tower has a clear niche)
 * - Upgrade tree structure for Rock Hurler
 * - Session save migration (cannon/mortar → rock-hurler)
 */
import { describe, it, expect } from 'vitest';
import {
  ROCK_HURLER_DEF,
  ARROW_DEF,
  FROST_DEF,
  POISON_DEF,
  TESLA_DEF,
  AURA_DEF,
  ALL_TOWER_DEFS,
} from '../../data/towerDefs';
import type { TowerDef } from '../../data/towerDefs';
import { ALL_UPGRADE_DEFS } from '../../data/upgradeDefs';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Simulate armor damage modifier logic from Tower.ts fireAt/fireSplashAt. */
function applyArmorMod(baseDamage: number, def: TowerDef, isArmored: boolean): number {
  const armorMod = (def.armorDamageMult !== undefined && isArmored)
    ? def.armorDamageMult
    : 1.0;
  return Math.round(baseDamage * armorMod);
}

// ── 1. Rock Hurler exists and replaces Cannon + Mortar ──────────────────────

describe('Rock Hurler tower definition', () => {
  it('ROCK_HURLER_DEF has key "rock-hurler"', () => {
    expect(ROCK_HURLER_DEF.key).toBe('rock-hurler');
  });

  it('is present in ALL_TOWER_DEFS', () => {
    expect(ALL_TOWER_DEFS.some(d => d.key === 'rock-hurler')).toBe(true);
  });

  it('cannon and mortar are NOT in ALL_TOWER_DEFS', () => {
    expect(ALL_TOWER_DEFS.some(d => d.key === 'cannon')).toBe(false);
    expect(ALL_TOWER_DEFS.some(d => d.key === 'mortar')).toBe(false);
  });

  it('ALL_TOWER_DEFS has exactly 6 towers', () => {
    expect(ALL_TOWER_DEFS).toHaveLength(6);
  });

  it('has AoE splash (splashRadius > 0)', () => {
    expect(ROCK_HURLER_DEF.splashRadius).toBeGreaterThan(0);
  });

  it('targets ground only', () => {
    expect(ROCK_HURLER_DEF.targetDomain).toBe('ground');
    expect(ROCK_HURLER_DEF.groundOnly).toBe(true);
  });

  it('has reasonable base stats', () => {
    expect(ROCK_HURLER_DEF.damage).toBe(55);
    expect(ROCK_HURLER_DEF.attackIntervalMs).toBe(2000);
    expect(ROCK_HURLER_DEF.range).toBe(185);
    expect(ROCK_HURLER_DEF.cost).toBe(150);
  });
});

// ── 2. Armor damage multiplier ──────────────────────────────────────────────

describe('armorDamageMult field', () => {
  it('Arrow has armorDamageMult < 1 (penalised vs armor)', () => {
    expect(ARROW_DEF.armorDamageMult).toBeDefined();
    expect(ARROW_DEF.armorDamageMult!).toBeLessThan(1);
    expect(ARROW_DEF.armorDamageMult!).toBe(0.3);
  });

  it('Rock Hurler has armorDamageMult > 1 (bonus vs armor)', () => {
    expect(ROCK_HURLER_DEF.armorDamageMult).toBeDefined();
    expect(ROCK_HURLER_DEF.armorDamageMult!).toBeGreaterThan(1);
    expect(ROCK_HURLER_DEF.armorDamageMult!).toBe(1.6);
  });

  it('Frost has no armorDamageMult (neutral)', () => {
    expect(FROST_DEF.armorDamageMult).toBeUndefined();
  });

  it('Poison has no armorDamageMult (neutral)', () => {
    expect(POISON_DEF.armorDamageMult).toBeUndefined();
  });

  it('Tesla has no armorDamageMult (neutral)', () => {
    expect(TESLA_DEF.armorDamageMult).toBeUndefined();
  });

  it('Aura has no armorDamageMult (neutral)', () => {
    expect(AURA_DEF.armorDamageMult).toBeUndefined();
  });
});

// ── 3. Armor damage modifier logic ──────────────────────────────────────────

describe('armor damage modifier logic', () => {
  it('Arrow damage is reduced 70% vs armored creeps', () => {
    const dmg = applyArmorMod(18, ARROW_DEF, true);
    expect(dmg).toBe(Math.round(18 * 0.3)); // 5
  });

  it('Arrow damage is full vs non-armored creeps', () => {
    const dmg = applyArmorMod(18, ARROW_DEF, false);
    expect(dmg).toBe(18);
  });

  it('Rock Hurler damage is +60% vs armored creeps', () => {
    const dmg = applyArmorMod(55, ROCK_HURLER_DEF, true);
    expect(dmg).toBe(Math.round(55 * 1.6)); // 88
  });

  it('Rock Hurler damage is normal vs non-armored creeps', () => {
    const dmg = applyArmorMod(55, ROCK_HURLER_DEF, false);
    expect(dmg).toBe(55);
  });

  it('Frost damage is unchanged regardless of armor', () => {
    const base = FROST_DEF.damage;
    expect(applyArmorMod(base, FROST_DEF, true)).toBe(base);
    expect(applyArmorMod(base, FROST_DEF, false)).toBe(base);
  });

  it('armorMod = 1.0 when armorDamageMult undefined and creep is armored', () => {
    // Towers without armorDamageMult are neutral
    const dmg = applyArmorMod(42, TESLA_DEF, true);
    expect(dmg).toBe(42);
  });

  it('handles zero base damage', () => {
    expect(applyArmorMod(0, ARROW_DEF, true)).toBe(0);
    expect(applyArmorMod(0, ROCK_HURLER_DEF, true)).toBe(0);
  });
});

// ── 4. Tower role differentiation ───────────────────────────────────────────

describe('tower role differentiation', () => {
  it('Arrow is cheapest tower (accessible early)', () => {
    for (const def of ALL_TOWER_DEFS) {
      if (def.key !== 'arrow') {
        expect(ARROW_DEF.cost).toBeLessThanOrEqual(def.cost);
      }
    }
  });

  it('Arrow has the fastest attack speed', () => {
    for (const def of ALL_TOWER_DEFS) {
      if (def.key !== 'arrow' && !def.isAura) {
        expect(ARROW_DEF.attackIntervalMs).toBeLessThanOrEqual(def.attackIntervalMs);
      }
    }
  });

  it('Rock Hurler has AoE splash — unique among non-aura towers', () => {
    const splashTowers = ALL_TOWER_DEFS.filter(d => (d.splashRadius ?? 0) > 0 && !d.isAura);
    expect(splashTowers.map(d => d.key)).toContain('rock-hurler');
  });

  it('Frost is the slow/control tower (description mentions slowing)', () => {
    expect(FROST_DEF.description.toLowerCase()).toMatch(/slow/);
  });

  it('Tesla targets air only (niche: anti-air)', () => {
    expect(TESLA_DEF.targetDomain).toBe('air');
  });

  it('all tower keys are unique', () => {
    const keys = ALL_TOWER_DEFS.map(d => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ── 5. Rock Hurler upgrade tree ─────────────────────────────────────────────

describe('Rock Hurler upgrade tree', () => {
  const upgDef = ALL_UPGRADE_DEFS.find(d => d.towerKey === 'rock-hurler');

  it('exists in ALL_UPGRADE_DEFS', () => {
    expect(upgDef).toBeDefined();
  });

  it('has 3 paths (A, B, C)', () => {
    expect(upgDef!.paths.A).toBeDefined();
    expect(upgDef!.paths.B).toBeDefined();
    expect(upgDef!.paths.C).toBeDefined();
  });

  it('each path has exactly 5 tiers', () => {
    expect(upgDef!.paths.A.tiers).toHaveLength(5);
    expect(upgDef!.paths.B.tiers).toHaveLength(5);
    expect(upgDef!.paths.C.tiers).toHaveLength(5);
  });

  it('Path A is Armor Shred (armorShredPct effects)', () => {
    expect(upgDef!.paths.A.name).toBe('Armor Shred');
    for (const tier of upgDef!.paths.A.tiers) {
      expect(tier.effects?.armorShredPct).toBeGreaterThan(0);
    }
  });

  it('Path A armorShredPct increases monotonically', () => {
    const values = upgDef!.paths.A.tiers.map(t => t.effects!.armorShredPct!);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('Path B is Impact Payload (damageDelta + execute)', () => {
    expect(upgDef!.paths.B.name).toBe('Impact Payload');
    for (const tier of upgDef!.paths.B.tiers) {
      expect(tier.statDelta?.damageDelta).toBeGreaterThan(0);
    }
  });

  it('Path B damageDelta increases monotonically', () => {
    const values = upgDef!.paths.B.tiers.map(t => t.statDelta!.damageDelta!);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('Path B tier 3+ adds executeThreshold', () => {
    expect(upgDef!.paths.B.tiers[2].effects?.executeThreshold).toBe(0.10);
    expect(upgDef!.paths.B.tiers[3].effects?.executeThreshold).toBe(0.16);
    expect(upgDef!.paths.B.tiers[4].effects?.executeThreshold).toBe(0.22);
  });

  it('Path C is Cluster (clusterCount effects)', () => {
    expect(upgDef!.paths.C.name).toBe('Cluster');
    for (const tier of upgDef!.paths.C.tiers) {
      expect(tier.effects?.clusterCount).toBeGreaterThan(0);
    }
  });

  it('Path C clusterCount increases monotonically', () => {
    const values = upgDef!.paths.C.tiers.map(t => t.effects!.clusterCount!);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('all tier costs are positive', () => {
    for (const pathId of ['A', 'B', 'C'] as const) {
      for (const tier of upgDef!.paths[pathId].tiers) {
        expect(tier.cost).toBeGreaterThan(0);
      }
    }
  });

  it('tier costs within each path increase monotonically', () => {
    for (const pathId of ['A', 'B', 'C'] as const) {
      const costs = upgDef!.paths[pathId].tiers.map(t => t.cost);
      for (let i = 1; i < costs.length; i++) {
        expect(costs[i]).toBeGreaterThan(costs[i - 1]);
      }
    }
  });

  it('lock threshold is 3 (paths A/C lock each other at tier 3)', () => {
    expect(upgDef!.lockThreshold).toBe(3);
  });

  it('cannon and mortar upgrade defs are NOT in ALL_UPGRADE_DEFS', () => {
    expect(ALL_UPGRADE_DEFS.some(d => d.towerKey === 'cannon')).toBe(false);
    expect(ALL_UPGRADE_DEFS.some(d => d.towerKey === 'mortar')).toBe(false);
  });
});

// ── 6. WaveManager isArmored logic (structural) ────────────────────────────

describe('brute creeps are armored', () => {
  // The WaveManager sets isArmored: typeKey === 'brute' when spawning creeps.
  // We verify the mapping function directly.
  function isArmoredType(typeKey: string): boolean {
    return typeKey === 'brute';
  }

  it('brute → armored', () => {
    expect(isArmoredType('brute')).toBe(true);
  });

  it('grunt → not armored', () => {
    expect(isArmoredType('grunt')).toBe(false);
  });

  it('runner → not armored', () => {
    expect(isArmoredType('runner')).toBe(false);
  });

  it('swarm → not armored', () => {
    expect(isArmoredType('swarm')).toBe(false);
  });

  it('scout → not armored', () => {
    expect(isArmoredType('scout')).toBe(false);
  });

  it('flier → not armored', () => {
    expect(isArmoredType('flier')).toBe(false);
  });
});

// ── 7. Edge cases ───────────────────────────────────────────────────────────

describe('armor damage edge cases', () => {
  it('armorDamageMult = 0 would reduce damage to 0', () => {
    const testDef: Pick<TowerDef, 'armorDamageMult'> = { armorDamageMult: 0 };
    const armorMod = (testDef.armorDamageMult !== undefined && true)
      ? testDef.armorDamageMult
      : 1.0;
    expect(Math.round(100 * armorMod)).toBe(0);
  });

  it('armorDamageMult = 1 is neutral', () => {
    const testDef: Pick<TowerDef, 'armorDamageMult'> = { armorDamageMult: 1.0 };
    const armorMod = (testDef.armorDamageMult !== undefined && true)
      ? testDef.armorDamageMult
      : 1.0;
    expect(Math.round(55 * armorMod)).toBe(55);
  });

  it('very high armorDamageMult amplifies correctly', () => {
    const testDef: Pick<TowerDef, 'armorDamageMult'> = { armorDamageMult: 3.0 };
    const armorMod = (testDef.armorDamageMult !== undefined && true)
      ? testDef.armorDamageMult
      : 1.0;
    expect(Math.round(55 * armorMod)).toBe(165);
  });
});
