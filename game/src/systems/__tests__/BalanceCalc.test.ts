import { describe, it, expect } from 'vitest';
import {
  creepEffectiveHP,
  towerEffectiveDPS,
  creepTraversalSec,
  computeStatsForBalance,
} from '../BalanceCalc';
import type { TowerUpgradeState } from '../UpgradeManager';
import {
  CANNON_DEF,
  FROST_DEF,
  MORTAR_DEF,
  POISON_DEF,
  ROCK_HURLER_DEF,
  TESLA_DEF,
  AURA_DEF,
} from '../../data/towerDefs';
import {
  WAVE_SCALING,
  CANNON_KILL_POTENTIAL_BANDS,
} from '../../data/scalingConfig';

// ── Helpers ───────────────────────────────────────────────────────────────────

function noUpgrades(): TowerUpgradeState {
  return { tiers: { A: 0, B: 0, C: 0 }, locked: new Set(), totalSpent: 0 };
}

function pathState(path: 'A' | 'B' | 'C', tiers: number): TowerUpgradeState {
  return {
    tiers: { A: 0, B: 0, C: 0, [path]: tiers },
    locked: new Set(),
    totalSpent: 0,
  };
}

// ── creepEffectiveHP ──────────────────────────────────────────────────────────

describe('creepEffectiveHP', () => {
  it('returns grunt base HP at wave 1 (mult = 1.00)', () => {
    expect(creepEffectiveHP(1, 'grunt')).toBe(80);
  });

  it('returns scaled grunt HP at wave 10 (mult = 2.20)', () => {
    expect(creepEffectiveHP(10, 'grunt')).toBe(Math.round(80 * 2.20));
  });

  it('returns scaled grunt HP at wave 20 (mult = 6.00)', () => {
    expect(creepEffectiveHP(20, 'grunt')).toBe(480);
  });

  it('applies the correct multiplier for brute at wave 5 (mult = 1.40)', () => {
    expect(creepEffectiveHP(5, 'brute')).toBe(Math.round(220 * 1.40));
  });

  it('falls back to 80 (grunt base) for unknown creep type', () => {
    expect(creepEffectiveHP(1, 'unknown')).toBe(80);
  });

  it('clamps wave below 1 to wave 1', () => {
    expect(creepEffectiveHP(0, 'grunt')).toBe(creepEffectiveHP(1, 'grunt'));
  });

  it('clamps wave above 20 to wave 20', () => {
    expect(creepEffectiveHP(99, 'grunt')).toBe(creepEffectiveHP(20, 'grunt'));
  });
});

// ── towerEffectiveDPS ─────────────────────────────────────────────────────────

describe('towerEffectiveDPS — base stats (no upgrades)', () => {
  it('Cannon: 40 dmg / 1.0s = 40 DPS', () => {
    expect(towerEffectiveDPS(CANNON_DEF, noUpgrades(), 1)).toBeCloseTo(40, 1);
  });

  it('Frost: 15 dmg / 1.2s ≈ 12.5 DPS', () => {
    expect(towerEffectiveDPS(FROST_DEF, noUpgrades(), 1)).toBeCloseTo(12.5, 1);
  });

  it('Mortar: 60 dmg / 2.5s = 24 DPS', () => {
    expect(towerEffectiveDPS(MORTAR_DEF, noUpgrades(), 1)).toBeCloseTo(24, 1);
  });

  it('Poison: 6 dmg/tick × 2 ticks/s × 4 stacks = 48 DPS (steady-state)', () => {
    expect(towerEffectiveDPS(POISON_DEF, noUpgrades(), 1)).toBeCloseTo(48, 1);
  });

  it('Tesla: 42 dmg / 1.5s ≈ 28.0 DPS', () => {
    expect(towerEffectiveDPS(TESLA_DEF, noUpgrades(), 1)).toBeCloseTo(28.0, 1);
  });

  it('Aura: 0 DPS (support-only tower)', () => {
    expect(towerEffectiveDPS(AURA_DEF, noUpgrades(), 1)).toBe(0);
  });
});

describe('towerEffectiveDPS — with upgrades', () => {
  it('Rock Hurler path B tier 5: damage += 215 → 270 dmg / 2.0s = 135 DPS', () => {
    // B tiers: +18, +30, +42, +55, +70 = +215 total
    const dps = towerEffectiveDPS(ROCK_HURLER_DEF, pathState('B', 5), 1);
    expect(dps).toBeCloseTo(135, 0);
  });

  it('Poison path A tier 5: dotDamageBonus = 12 (last-write) → (6+12)×2×4 = 144 DPS', () => {
    // Venom I-V override dotDamageBonus: 2, 4, 6, 9, 12 (last-write-wins, not accumulated)
    // At tier 5: dotDamageBonus = 12; maxDotStacks still 4 (path B not bought)
    // DPS = (6 + 12) × 2 ticks/s × 4 stacks = 144
    const dps = towerEffectiveDPS(POISON_DEF, pathState('A', 5), 1);
    expect(dps).toBeCloseTo(144, 0);
  });

  it('Rock Hurler path C tier 5 (cluster): +5 dmg from Cluster II → 60 dmg / 2.0s = 30 DPS', () => {
    // Cluster II adds +5 statDelta, all other cluster tiers add only clusterCount effect
    const dps = towerEffectiveDPS(ROCK_HURLER_DEF, pathState('C', 5), 1);
    expect(dps).toBeCloseTo(30, 1);
  });
});

// ── Balance criterion: Wave 1 kill before midpoint ───────────────────────────

describe('Balance: Wave 1 Cannon kills grunt before path midpoint', () => {
  it('kill time < 50% of path traversal time', () => {
    const hp          = creepEffectiveHP(1, 'grunt');          // 80
    const dps         = towerEffectiveDPS(CANNON_DEF, noUpgrades(), 1); // 40
    const killTimeSec = hp / dps;                              // 2.0s
    const halfPath    = creepTraversalSec(1, 'grunt') / 2;     // 16s
    expect(killTimeSec).toBeLessThan(halfPath);
  });
});

// ── Balance criterion: Wave-10 cannon does not one-shot grunt ─────────────────

describe('Balance: Wave 10 un-upgraded Cannon does not one-shot grunt', () => {
  it('base damage (40) < wave-10 grunt HP (176)', () => {
    expect(CANNON_DEF.damage).toBeLessThan(creepEffectiveHP(10, 'grunt'));
  });
});

// ── Balance criterion: Fully upgraded single path ≤ 50% of base TTK ─────────

describe('Balance: Fully upgraded tower kills ≤ 50% of base kill time (wave 1)', () => {
  function ttk(towerDef: typeof CANNON_DEF, state: TowerUpgradeState): number {
    const hp  = creepEffectiveHP(1, 'grunt');
    const dps = towerEffectiveDPS(towerDef, state, 1);
    if (dps <= 0) return Infinity;
    return hp / dps;
  }

  it('Rock Hurler path B tier 5: upgraded TTK ≤ 50% of base TTK', () => {
    const baseTTK = ttk(ROCK_HURLER_DEF, noUpgrades());
    const upgTTK  = ttk(ROCK_HURLER_DEF, pathState('B', 5));
    expect(upgTTK).toBeLessThanOrEqual(baseTTK * 0.5);
  });

  it('Frost path C tier 5: upgraded TTK ≤ 50% of base TTK', () => {
    const baseTTK = ttk(FROST_DEF, noUpgrades());
    const upgTTK  = ttk(FROST_DEF, pathState('C', 5));
    expect(upgTTK).toBeLessThanOrEqual(baseTTK * 0.5);
  });

  it('Poison path A tier 5: upgraded TTK ≤ 50% of base TTK', () => {
    const baseTTK = ttk(POISON_DEF, noUpgrades());
    const upgTTK  = ttk(POISON_DEF, pathState('A', 5));
    expect(upgTTK).toBeLessThanOrEqual(baseTTK * 0.5);
  });

  it('Tesla path C tier 5: upgraded TTK ≤ 50% of base TTK', () => {
    // Overload III-V add +8, +14, +20 damageDelta = +42 total → 77 dmg / 1.5s ≈ 51.3 DPS
    const baseTTK = ttk(TESLA_DEF, noUpgrades());
    const upgTTK  = ttk(TESLA_DEF, pathState('C', 5));
    expect(upgTTK).toBeLessThanOrEqual(baseTTK * 0.5);
  });
});

// ── Balance criterion: Boss survives past 50% of path (single cannon) ────────

describe('Balance: Boss HP — un-upgraded single Cannon kill time > 50% of traversal', () => {
  it.each(WAVE_SCALING.bossWaves as number[])(
    'wave %i boss survives > 50%% of path against single un-upgraded Cannon',
    (wave) => {
      const waveGruntHP    = creepEffectiveHP(wave, 'grunt');
      const bossHP         = waveGruntHP * WAVE_SCALING.bossHpMultiplier;
      const dps            = towerEffectiveDPS(CANNON_DEF, noUpgrades(), wave);
      const bossKillTimeSec = bossHP / dps;
      const halfTraversal  = creepTraversalSec(wave, 'grunt') / 2;
      expect(bossKillTimeSec).toBeGreaterThan(halfTraversal);
    },
  );
});

// ── Balance criterion: Kill-potential bands for key waves ────────────────────

describe('Balance: Cannon kill-potential ratio lands in defined target bands', () => {
  it.each([1, 5, 10, 15, 20] as const)(
    'wave %i kill potential is within [min, max] band',
    (wave) => {
      const hp            = creepEffectiveHP(wave, 'grunt');
      const dps           = towerEffectiveDPS(CANNON_DEF, noUpgrades(), wave);
      const traversal     = creepTraversalSec(wave, 'grunt');
      const killPotential = (dps * traversal) / hp;

      const band = CANNON_KILL_POTENTIAL_BANDS[wave];
      expect(band).toBeDefined();
      if (band) {
        const [min, max] = band;
        expect(killPotential).toBeGreaterThanOrEqual(min);
        expect(killPotential).toBeLessThanOrEqual(max);
      }
    },
  );
});

// ── creepTraversalSec ─────────────────────────────────────────────────────────

describe('creepTraversalSec', () => {
  it('grunt wave 1: 2400px / 75px/s = 32s', () => {
    expect(creepTraversalSec(1, 'grunt')).toBeCloseTo(32, 1);
  });

  it('runner wave 1: 2400px / 120px/s = 20s', () => {
    expect(creepTraversalSec(1, 'runner')).toBeCloseTo(20, 1);
  });

  it('grunt wave 20: speed × 1.70 → 2400 / (75×1.70) ≈ 18.82s', () => {
    expect(creepTraversalSec(20, 'grunt')).toBeCloseTo(2400 / (75 * 1.70), 1);
  });

  it('uses custom path length', () => {
    expect(creepTraversalSec(1, 'grunt', 1200)).toBeCloseTo(16, 1);
  });

  it('clamps wave below 1', () => {
    expect(creepTraversalSec(0, 'grunt')).toBe(creepTraversalSec(1, 'grunt'));
  });

  it('clamps wave above 20', () => {
    expect(creepTraversalSec(99, 'grunt')).toBe(creepTraversalSec(20, 'grunt'));
  });

  it('falls back to 75 px/s for unknown creep type', () => {
    expect(creepTraversalSec(1, 'unknown')).toBeCloseTo(32, 1);
  });
});

// ── computeStatsForBalance: basic sanity checks ───────────────────────────────

describe('computeStatsForBalance', () => {
  it('returns base stats when no upgrades purchased', () => {
    const stats = computeStatsForBalance(CANNON_DEF, noUpgrades());
    expect(stats.damage).toBe(40);
    expect(stats.range).toBe(160);
    expect(stats.attackIntervalMs).toBe(1000);
  });

  it('accumulates damage delta on Rock Hurler path B tier 3', () => {
    // Path B tier 1: +18, tier 2: +30, tier 3: +42 = +90 total
    const stats = computeStatsForBalance(ROCK_HURLER_DEF, pathState('B', 3));
    expect(stats.damage).toBe(55 + 18 + 30 + 42);  // 145
  });

  it('does not lock path on lock-threshold tier for computeStatsForBalance', () => {
    // Lock logic lives in UpgradeManager.buyUpgrade — not reproduced here
    const stats = computeStatsForBalance(ROCK_HURLER_DEF, pathState('A', 5));
    expect(stats.armorShredPct).toBeGreaterThan(0);
  });
});
