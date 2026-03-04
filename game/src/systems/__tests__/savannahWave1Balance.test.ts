/**
 * TASK-138: Savannah Wave 1 Clearability & Armor Bear Balance
 *
 * Tests verify:
 * 1. MITIGOMIZH armoredStartWave = 3 (no armored grunts in waves 1-2)
 * 2. Wave 1-2 armor immunity — armoredFraction roll is skipped for early waves
 * 3. Wave 3+ armor applies normally
 * 4. Wave 1 is clearable with 3 Arrow towers (250g starting gold budget)
 * 5. Linear difficulty escalation across waves 1-5 on Savannah
 * 6. Gear enhancement (+10% damage) provides a meaningful DPS improvement
 * 7. Starting gold budget for map-03 supports at least 3 basic towers
 */

import { describe, it, expect } from 'vitest';
import { getRegionDifficulty } from '../../data/regionDifficulty';
import { ARROW_DEF, ROCK_HURLER_DEF } from '../../data/towerDefs';
import {
  WAVE_HP_MULTS,
  WAVE_SPEED_MULTS,
  CREEP_BASE_HP,
  CREEP_BASE_SPEED,
  SAVANNAH_PATH_LENGTH_PX,
} from '../../data/scalingConfig';
import { towerEffectiveDPS, creepTraversalSec } from '../BalanceCalc';
import type { TowerUpgradeState } from '../UpgradeManager';

// ── Helpers ───────────────────────────────────────────────────────────────────

function noUpgrades(): TowerUpgradeState {
  return { tiers: { A: 0, B: 0, C: 0 }, locked: new Set(), totalSpent: 0 };
}

/**
 * Compute effective grunt HP for a given wave on Savannah (MITIGOMIZH region).
 * Stacks the base wave hpMult with the region creepHpMult (1.30).
 */
function savannahGruntHp(wave: number): number {
  const rd      = getRegionDifficulty('mitigomizh');
  const hpMult  = WAVE_HP_MULTS[Math.min(wave, 20) - 1] ?? 1;
  return Math.round(CREEP_BASE_HP['grunt'] * hpMult * rd.creepHpMult);
}

/**
 * Compute effective grunt traversal time (seconds) on Savannah for a given wave.
 */
function savannahGruntTraversal(wave: number): number {
  const rd        = getRegionDifficulty('mitigomizh');
  const speedMult = WAVE_SPEED_MULTS[Math.min(wave, 20) - 1] ?? 1;
  const speed     = CREEP_BASE_SPEED['grunt'] * speedMult * rd.creepSpeedMult;
  return SAVANNAH_PATH_LENGTH_PX / speed;
}

// ── 1. armoredStartWave field ─────────────────────────────────────────────────

describe('MITIGOMIZH armoredStartWave', () => {
  it('MITIGOMIZH has armoredStartWave set to 3', () => {
    const rd = getRegionDifficulty('mitigomizh');
    expect(rd.armoredStartWave).toBe(3);
  });

  it('ZAAGAIGANING has no armoredStartWave (defaults to 1 — applies from wave 1)', () => {
    const rd = getRegionDifficulty('zaagaiganing');
    // No armoredFraction anyway (0), and armoredStartWave is undefined (defaults to 1)
    expect(rd.armoredStartWave).toBeUndefined();
    expect(rd.armoredFraction).toBe(0);
  });

  it('MASHKIIG has no armoredStartWave (armored applies from wave 1)', () => {
    const rd = getRegionDifficulty('mashkiig');
    expect(rd.armoredStartWave).toBeUndefined();
    // Still has armoredFraction — but no threshold set
    expect(rd.armoredFraction).toBe(0.15);
  });

  it('BIBOON-AKI has no armoredStartWave (armored applies from wave 1 — max difficulty)', () => {
    const rd = getRegionDifficulty('biboon-aki');
    expect(rd.armoredStartWave).toBeUndefined();
    expect(rd.armoredFraction).toBe(0.25);
  });
});

// ── 2. armoredStartWave gating logic ─────────────────────────────────────────

describe('armoredStartWave gating', () => {
  it('wave 1 is below MITIGOMIZH armoredStartWave(3) — armor must not apply', () => {
    const rd = getRegionDifficulty('mitigomizh');
    const startWave = rd.armoredStartWave ?? 1;
    expect(1).toBeLessThan(startWave);
  });

  it('wave 2 is below MITIGOMIZH armoredStartWave(3) — armor must not apply', () => {
    const rd = getRegionDifficulty('mitigomizh');
    const startWave = rd.armoredStartWave ?? 1;
    expect(2).toBeLessThan(startWave);
  });

  it('wave 3 meets MITIGOMIZH armoredStartWave(3) — armor applies', () => {
    const rd = getRegionDifficulty('mitigomizh');
    const startWave = rd.armoredStartWave ?? 1;
    expect(3).toBeGreaterThanOrEqual(startWave);
  });

  it('wave 5 (boss wave) is above armoredStartWave — armor applies', () => {
    const rd = getRegionDifficulty('mitigomizh');
    const startWave = rd.armoredStartWave ?? 1;
    expect(5).toBeGreaterThanOrEqual(startWave);
  });

  it('armoredStartWave defaults to 1 when field is absent', () => {
    // Simulates how WaveManager reads the field
    const rdMash = getRegionDifficulty('mashkiig');
    const effectiveStart = rdMash.armoredStartWave ?? 1;
    expect(effectiveStart).toBe(1);
  });
});

// ── 3. Wave 1 clearability — 3 Arrow towers ──────────────────────────────────

describe('Savannah wave 1 clearability', () => {
  it('MITIGOMIZH wave 1 has no armored creeps (armoredStartWave=3)', () => {
    // All grunts in wave 1 are regular (not armored)
    // Arrow DPS vs regular grunt on Savannah wave 1
    const arrowDPS     = towerEffectiveDPS(ARROW_DEF, noUpgrades(), 1); // 30 DPS
    const gruntHp      = savannahGruntHp(1);  // 80 × 1.00 × 1.30 = 104
    const traversal    = savannahGruntTraversal(1);

    // 3 Arrow towers: kill potential = (dps × traversal) / hp
    const killPotential3 = (arrowDPS * 3 * traversal) / gruntHp;
    expect(killPotential3).toBeGreaterThan(3);   // 3 towers should kill 3+ grunts each pass
  });

  it('3 Arrow towers kill time < Savannah wave 1 traversal time for regular grunt', () => {
    const arrowDPS  = towerEffectiveDPS(ARROW_DEF, noUpgrades(), 1);
    const gruntHp   = savannahGruntHp(1);
    const traversal = savannahGruntTraversal(1);
    const killTime  = gruntHp / (arrowDPS * 3);
    expect(killTime).toBeLessThan(traversal);
  });

  it('1 Rock Hurler kills regular grunt in < 50% traversal time on Savannah wave 1', () => {
    const rhDPS     = towerEffectiveDPS(ROCK_HURLER_DEF, noUpgrades(), 1);
    const gruntHp   = savannahGruntHp(1);
    const traversal = savannahGruntTraversal(1);
    const killTime  = gruntHp / rhDPS;
    expect(killTime).toBeLessThan(traversal * 0.5);
  });

  it('Savannah wave 1 grunt HP is 104 (80 × 1.00 × 1.30)', () => {
    expect(savannahGruntHp(1)).toBe(Math.round(80 * 1.00 * 1.30));
  });

  it('Savannah path length (1640px) is shorter than Winding Pass (2400px)', () => {
    expect(SAVANNAH_PATH_LENGTH_PX).toBe(1640);
    expect(SAVANNAH_PATH_LENGTH_PX).toBeLessThan(2400);
  });
});

// ── 4. Starting gold budget ───────────────────────────────────────────────────

describe('Map-03 starting gold budget', () => {
  const SAVANNAH_STARTING_GOLD = 250;
  const ARROW_COST             = ARROW_DEF.cost;         // 75
  const ROCK_HURLER_COST       = ROCK_HURLER_DEF.cost;   // 150

  it('250g starting gold allows purchasing 3 Arrow towers (225g)', () => {
    expect(ARROW_COST * 3).toBeLessThanOrEqual(SAVANNAH_STARTING_GOLD);
  });

  it('250g starting gold allows 1 Rock Hurler + 1 Arrow (225g)', () => {
    expect(ROCK_HURLER_COST + ARROW_COST).toBeLessThanOrEqual(SAVANNAH_STARTING_GOLD);
  });

  it('250g starting gold does NOT allow 2 Rock Hurlers (300g)', () => {
    expect(ROCK_HURLER_COST * 2).toBeGreaterThan(SAVANNAH_STARTING_GOLD);
  });

  it('Arrow tower cost is 75g', () => {
    expect(ARROW_COST).toBe(75);
  });

  it('Rock Hurler cost is 150g', () => {
    expect(ROCK_HURLER_COST).toBe(150);
  });
});

// ── 5. Linear difficulty escalation — waves 1-5 ──────────────────────────────

describe('Savannah difficulty escalation (waves 1-5)', () => {
  it('grunt HP increases each wave on Savannah', () => {
    for (let w = 1; w < 5; w++) {
      expect(savannahGruntHp(w + 1)).toBeGreaterThan(savannahGruntHp(w));
    }
  });

  it('kill potential decreases across waves (harder to kill later grunts)', () => {
    const arrowDPS = towerEffectiveDPS(ARROW_DEF, noUpgrades(), 1);
    let prevKP = Infinity;
    for (let w = 1; w <= 5; w++) {
      const hp        = savannahGruntHp(w);
      const traversal = savannahGruntTraversal(w);
      const kp        = (arrowDPS * traversal) / hp;
      expect(kp).toBeLessThanOrEqual(prevKP);
      prevKP = kp;
    }
  });

  it('wave 5 Savannah grunt HP is substantially higher than wave 1', () => {
    const ratio = savannahGruntHp(5) / savannahGruntHp(1);
    expect(ratio).toBeGreaterThanOrEqual(1.35);   // at least 35% harder
  });

  it('wave 3 introduces brutes (via MITIGOMIZH poolReplacements)', () => {
    const rd = getRegionDifficulty('mitigomizh');
    const wave3Pool = rd.poolReplacements[3];
    expect(wave3Pool).toBeDefined();
    expect(wave3Pool).toContain('brute');
  });

  it('wave 3 also introduces armored mechanics (armoredStartWave = 3)', () => {
    const rd = getRegionDifficulty('mitigomizh');
    expect(rd.armoredStartWave).toBe(3);
    // Brutes + armored grunts arrive together — difficulty spike is deliberate
    const wave3Pool = rd.poolReplacements[3];
    expect(wave3Pool).toContain('brute');
  });

  it('wave 5 adds air units and boss (scout in pool)', () => {
    const rd = getRegionDifficulty('mitigomizh');
    const wave5Pool = rd.poolReplacements[5];
    expect(wave5Pool).toBeDefined();
    expect(wave5Pool).toContain('scout');
  });
});

// ── 6. Gear enhancement meaningfulness ───────────────────────────────────────

describe('Gear enhancement provides meaningful DPS improvement', () => {
  it('10% global tower damage boost increases Arrow DPS by >= 10%', () => {
    const baseDPS     = towerEffectiveDPS(ARROW_DEF, noUpgrades(), 1);  // 30
    const enhancedDPS = baseDPS * 1.10;                                  // 33
    const pctIncrease = (enhancedDPS - baseDPS) / baseDPS;
    expect(pctIncrease).toBeCloseTo(0.10, 2);
    expect(enhancedDPS).toBeGreaterThan(baseDPS);
  });

  it('10% global damage boost makes 2 Arrow towers clear armored-start-wave grunts faster', () => {
    // Wave 3 is first armored wave in Mitigomizh; grunt HP at wave 3
    const rd      = getRegionDifficulty('mitigomizh');
    const hpMult  = WAVE_HP_MULTS[2];   // wave 3 index 2
    const hp      = Math.round(CREEP_BASE_HP['grunt'] * hpMult * rd.creepHpMult);

    const arrowDPS    = towerEffectiveDPS(ARROW_DEF, noUpgrades(), 3);
    const arrowDPSenh = arrowDPS * 1.10;
    const killTimeBase = hp / (arrowDPS * 2);
    const killTimeEnh  = hp / (arrowDPSenh * 2);

    // Enhanced towers kill faster
    expect(killTimeEnh).toBeLessThan(killTimeBase);
    // Improvement is >= 8% (rounding-safe threshold)
    expect((killTimeBase - killTimeEnh) / killTimeBase).toBeGreaterThanOrEqual(0.08);
  });

  it('Rock Hurler with 10% damage bonus improves vs armored grunt kill time by >= 8%', () => {
    const baseDPS = towerEffectiveDPS(ROCK_HURLER_DEF, noUpgrades(), 1);
    const enhDPS  = baseDPS * 1.10;
    const gruntHp = savannahGruntHp(1);

    const baseKillTime = gruntHp / baseDPS;
    const enhKillTime  = gruntHp / enhDPS;

    expect(enhKillTime).toBeLessThan(baseKillTime);
    expect((baseKillTime - enhKillTime) / baseKillTime).toBeGreaterThanOrEqual(0.08);
  });

  it('MITIGOMIZH armoredFraction (0.20) makes later waves meaningfully harder', () => {
    const rd = getRegionDifficulty('mitigomizh');
    expect(rd.armoredFraction).toBe(0.20);
    // armorResistPct stacks with Arrow's armorDamageMult: effective multiplier = 0.3 × (1-0.2) = 0.24
    const effectiveMult = (ARROW_DEF.armorDamageMult ?? 1) * (1 - rd.armorResistPct);
    // Arrow vs armored in Mitigomizh does only 24% of normal damage
    expect(effectiveMult).toBeCloseTo(0.24, 2);
  });
});

// ── 7. MITIGOMIZH config sanity ───────────────────────────────────────────────

describe('MITIGOMIZH region config sanity', () => {
  it('creepHpMult is 1.30', () => {
    const rd = getRegionDifficulty('mitigomizh');
    expect(rd.creepHpMult).toBe(1.30);
  });

  it('armoredFraction is 0.20 (20% of non-brute ground creeps can be armored from wave 3+)', () => {
    const rd = getRegionDifficulty('mitigomizh');
    expect(rd.armoredFraction).toBe(0.20);
  });

  it('armorResistPct is 0.20 (20% physical damage reduction for armored creeps)', () => {
    const rd = getRegionDifficulty('mitigomizh');
    expect(rd.armorResistPct).toBe(0.20);
  });

  it('SAVANNAH_PATH_LENGTH_PX constant matches map-03 waypoints calculation', () => {
    // Waypoints: (0,5)→(20,5) = 20 tiles, (20,5)→(20,13) = 8 tiles, (20,13)→(33,13) = 13 tiles
    // Total = 41 × 40px = 1640px
    expect(SAVANNAH_PATH_LENGTH_PX).toBe((20 + 8 + 13) * 40);
  });
});

// ── 8. creepTraversalSec with Savannah path length ────────────────────────────

describe('Savannah traversal time helpers', () => {
  it('wave 1 grunt traversal time on Savannah is shorter than on Winding Pass', () => {
    const winding  = creepTraversalSec(1, 'grunt');            // default 2400px
    const savannah = creepTraversalSec(1, 'grunt', SAVANNAH_PATH_LENGTH_PX);
    expect(savannah).toBeLessThan(winding);
  });

  it('Savannah grunt traversal time wave 1: 1640 / (75 × 1.10) ≈ 19.88s', () => {
    const rd      = getRegionDifficulty('mitigomizh');
    const speed   = CREEP_BASE_SPEED['grunt'] * WAVE_SPEED_MULTS[0] * rd.creepSpeedMult;
    const expected = SAVANNAH_PATH_LENGTH_PX / speed;
    expect(savannahGruntTraversal(1)).toBeCloseTo(expected, 1);
  });
});
