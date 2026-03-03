/**
 * TASK-099: Regional Difficulty Scaling
 *
 * Tests for:
 * - getRegionDifficulty() lookup and fallback
 * - applyRegionToWaveDefs() HP/speed scaling and pool replacements
 * - Region definitions: escalating multipliers, armor fractions, immunities
 * - BossRegionOverride application via resolveBossDef (structural)
 * - Edge cases: unknown regions, empty wave arrays, 0 fractions
 */
import { describe, it, expect } from 'vitest';
import {
  getRegionDifficulty,
  applyRegionToWaveDefs,
} from '../../data/regionDifficulty';
import type { BossRegionOverride } from '../../data/regionDifficulty';

// ── 1. getRegionDifficulty() ─────────────────────────────────────────────────

describe('getRegionDifficulty', () => {
  it('returns baseline config for Region 1 (zaagaiganing)', () => {
    const rd = getRegionDifficulty('zaagaiganing');
    expect(rd.regionId).toBe('zaagaiganing');
    expect(rd.creepHpMult).toBe(1.0);
    expect(rd.creepSpeedMult).toBe(1.0);
    expect(rd.armoredFraction).toBe(0);
    expect(rd.slowImmuneFraction).toBe(0);
    expect(rd.poisonImmuneFraction).toBe(0);
    expect(Object.keys(rd.bossOverrides)).toHaveLength(0);
  });

  it('returns Region 2 config (mashkiig)', () => {
    const rd = getRegionDifficulty('mashkiig');
    expect(rd.regionId).toBe('mashkiig');
    expect(rd.creepHpMult).toBe(1.15);
    expect(rd.creepSpeedMult).toBe(1.05);
    expect(rd.armoredFraction).toBe(0.15);
  });

  it('returns Region 3 config (mitigomizh)', () => {
    const rd = getRegionDifficulty('mitigomizh');
    expect(rd.regionId).toBe('mitigomizh');
    expect(rd.creepHpMult).toBe(1.30);
    expect(rd.slowImmuneFraction).toBe(0.20);
    expect(rd.poisonImmuneFraction).toBe(0.15);
  });

  it('returns Region 4 config (biboon-aki)', () => {
    const rd = getRegionDifficulty('biboon-aki');
    expect(rd.regionId).toBe('biboon-aki');
    expect(rd.creepHpMult).toBe(1.50);
    expect(rd.creepSpeedMult).toBe(1.15);
    expect(rd.armoredFraction).toBe(0.25);
    expect(rd.slowImmuneFraction).toBe(0.25);
    expect(rd.poisonImmuneFraction).toBe(0.20);
  });

  it('falls back to baseline for unknown region ID', () => {
    const rd = getRegionDifficulty('nonexistent-region');
    expect(rd.regionId).toBe('zaagaiganing');
    expect(rd.creepHpMult).toBe(1.0);
  });

  it('falls back to baseline for empty string', () => {
    const rd = getRegionDifficulty('');
    expect(rd.regionId).toBe('zaagaiganing');
  });
});

// ── 2. applyRegionToWaveDefs() ───────────────────────────────────────────────

describe('applyRegionToWaveDefs', () => {
  const makeWave = (hpMult: number, speedMult: number, pool: string[]) => ({
    hpMult,
    speedMult,
    pool,
    count: 10,
    intervalMs: 500,
  });

  it('applies HP and speed multipliers to all waves', () => {
    const rd = getRegionDifficulty('mashkiig'); // 1.15 HP, 1.05 speed
    const base = [
      makeWave(1.0, 1.0, ['grunt']),
      makeWave(1.5, 1.2, ['grunt', 'runner']),
    ];
    const result = applyRegionToWaveDefs(base, rd);

    expect(result[0].hpMult).toBeCloseTo(1.0 * 1.15, 5);
    expect(result[0].speedMult).toBeCloseTo(1.0 * 1.05, 5);
    expect(result[1].hpMult).toBeCloseTo(1.5 * 1.15, 5);
    expect(result[1].speedMult).toBeCloseTo(1.2 * 1.05, 5);
  });

  it('replaces pools for waves with poolReplacements', () => {
    const rd = getRegionDifficulty('mashkiig');
    // mashkiig replaces waves 3, 4, 5
    const base = [
      makeWave(1.0, 1.0, ['grunt']),           // wave 1 — no change
      makeWave(1.0, 1.0, ['grunt']),           // wave 2 — no change
      makeWave(1.0, 1.0, ['grunt']),           // wave 3 — replaced
      makeWave(1.0, 1.0, ['grunt', 'runner']), // wave 4 — replaced
      makeWave(1.0, 1.0, ['grunt']),           // wave 5 — replaced
    ];
    const result = applyRegionToWaveDefs(base, rd);

    // Waves 1-2 keep original pools.
    expect(result[0].pool).toEqual(['grunt']);
    expect(result[1].pool).toEqual(['grunt']);
    // Waves 3-5 get overridden pools.
    expect(result[2].pool).toEqual(['grunt', 'swarm', 'brute']);
    expect(result[3].pool).toEqual(['grunt', 'runner', 'brute']);
    expect(result[4].pool).toEqual(['grunt', 'runner', 'swarm', 'brute']);
  });

  it('does NOT mutate the input array', () => {
    const rd = getRegionDifficulty('mashkiig');
    const base = [makeWave(1.0, 1.0, ['grunt'])];
    const originalHp = base[0].hpMult;
    const originalPool = [...base[0].pool];
    applyRegionToWaveDefs(base, rd);

    expect(base[0].hpMult).toBe(originalHp);
    expect(base[0].pool).toEqual(originalPool);
  });

  it('returns empty array for empty input', () => {
    const rd = getRegionDifficulty('biboon-aki');
    const result = applyRegionToWaveDefs([], rd);
    expect(result).toEqual([]);
  });

  it('baseline region applies identity multipliers (no change)', () => {
    const rd = getRegionDifficulty('zaagaiganing');
    const base = [makeWave(2.0, 1.5, ['grunt', 'brute'])];
    const result = applyRegionToWaveDefs(base, rd);

    expect(result[0].hpMult).toBe(2.0);
    expect(result[0].speedMult).toBe(1.5);
    expect(result[0].pool).toEqual(['grunt', 'brute']);
  });

  it('preserves extra properties on wave defs', () => {
    const rd = getRegionDifficulty('mashkiig');
    const base = [{
      hpMult: 1.0,
      speedMult: 1.0,
      pool: ['grunt'],
      count: 15,
      intervalMs: 400,
      boss: 'makwa',
    }];
    const result = applyRegionToWaveDefs(base, rd);

    expect(result[0].count).toBe(15);
    expect(result[0].intervalMs).toBe(400);
    expect(result[0].boss).toBe('makwa');
  });

  it('pool replacements are independent copies (not shared refs)', () => {
    const rd = getRegionDifficulty('mashkiig');
    const base = [
      makeWave(1.0, 1.0, ['grunt']), // wave 1
      makeWave(1.0, 1.0, ['grunt']), // wave 2
      makeWave(1.0, 1.0, ['grunt']), // wave 3 — replaced
    ];
    const result = applyRegionToWaveDefs(base, rd);

    // Mutating the returned pool should not affect a second call.
    result[2].pool.push('extra');
    const result2 = applyRegionToWaveDefs(base, rd);
    expect(result2[2].pool).not.toContain('extra');
  });
});

// ── 3. Region escalation — difficulty increases monotonically ────────────────

describe('difficulty escalation', () => {
  const regions = ['zaagaiganing', 'mashkiig', 'mitigomizh', 'biboon-aki'];
  const configs = regions.map(r => getRegionDifficulty(r));

  it('creepHpMult increases across regions', () => {
    for (let i = 1; i < configs.length; i++) {
      expect(configs[i].creepHpMult).toBeGreaterThan(configs[i - 1].creepHpMult);
    }
  });

  it('creepSpeedMult increases across regions', () => {
    for (let i = 1; i < configs.length; i++) {
      expect(configs[i].creepSpeedMult).toBeGreaterThanOrEqual(configs[i - 1].creepSpeedMult);
    }
  });

  it('armoredFraction increases across regions', () => {
    for (let i = 1; i < configs.length; i++) {
      expect(configs[i].armoredFraction).toBeGreaterThanOrEqual(configs[i - 1].armoredFraction);
    }
  });

  it('all fractions are in [0, 1]', () => {
    for (const cfg of configs) {
      expect(cfg.armoredFraction).toBeGreaterThanOrEqual(0);
      expect(cfg.armoredFraction).toBeLessThanOrEqual(1);
      expect(cfg.armorResistPct).toBeGreaterThanOrEqual(0);
      expect(cfg.armorResistPct).toBeLessThanOrEqual(1);
      expect(cfg.slowImmuneFraction).toBeGreaterThanOrEqual(0);
      expect(cfg.slowImmuneFraction).toBeLessThanOrEqual(1);
      expect(cfg.poisonImmuneFraction).toBeGreaterThanOrEqual(0);
      expect(cfg.poisonImmuneFraction).toBeLessThanOrEqual(1);
    }
  });

  it('all HP/speed multipliers are >= 1', () => {
    for (const cfg of configs) {
      expect(cfg.creepHpMult).toBeGreaterThanOrEqual(1);
      expect(cfg.creepSpeedMult).toBeGreaterThanOrEqual(1);
    }
  });
});

// ── 4. Boss overrides ────────────────────────────────────────────────────────

describe('boss overrides', () => {
  it('Region 1 has no boss overrides', () => {
    const rd = getRegionDifficulty('zaagaiganing');
    expect(Object.keys(rd.bossOverrides)).toHaveLength(0);
  });

  it('Region 2 has overrides for all four bosses', () => {
    const rd = getRegionDifficulty('mashkiig');
    expect(rd.bossOverrides).toHaveProperty('makwa');
    expect(rd.bossOverrides).toHaveProperty('migizi');
    expect(rd.bossOverrides).toHaveProperty('waabooz');
    expect(rd.bossOverrides).toHaveProperty('animikiins');
  });

  it('Region 4 makwa has combined abilities (resist + slow immune + regen)', () => {
    const rd = getRegionDifficulty('biboon-aki');
    const makwa = rd.bossOverrides['makwa'] as BossRegionOverride;
    expect(makwa.physicalResistPct).toBe(0.50);
    expect(makwa.isSlowImmune).toBe(true);
    expect(makwa.regenPercentPerSec).toBe(0.5);
    expect(makwa.hpMult).toBe(1.6);
  });

  it('Region 4 waabooz splits into 5', () => {
    const rd = getRegionDifficulty('biboon-aki');
    const waabooz = rd.bossOverrides['waabooz'] as BossRegionOverride;
    expect(waabooz.splitCount).toBe(5);
    expect(waabooz.isSlowImmune).toBe(true);
  });

  it('boss override hpMult values are > 1 for all non-baseline regions', () => {
    for (const regionId of ['mashkiig', 'mitigomizh', 'biboon-aki']) {
      const rd = getRegionDifficulty(regionId);
      for (const [, override] of Object.entries(rd.bossOverrides)) {
        if (override.hpMult !== undefined) {
          expect(override.hpMult).toBeGreaterThan(1);
        }
      }
    }
  });
});

// ── 5. Pool replacements — Region 4 starts diverse from wave 1 ──────────────

describe('pool replacements', () => {
  it('Region 4 replaces wave 1 pool with diverse types', () => {
    const rd = getRegionDifficulty('biboon-aki');
    const wave1Pool = rd.poolReplacements[1];
    expect(wave1Pool).toBeDefined();
    expect(wave1Pool).toContain('grunt');
    expect(wave1Pool).toContain('brute');
    expect(wave1Pool).toContain('runner');
  });

  it('Region 3 introduces air creeps (scout) from wave 4', () => {
    const rd = getRegionDifficulty('mitigomizh');
    // Wave 3 = no air
    expect(rd.poolReplacements[3]).not.toContain('scout');
    expect(rd.poolReplacements[3]).not.toContain('flier');
    // Wave 4 = scout introduced
    expect(rd.poolReplacements[4]).toContain('scout');
  });

  it('Region 1 has no pool replacements', () => {
    const rd = getRegionDifficulty('zaagaiganing');
    expect(Object.keys(rd.poolReplacements)).toHaveLength(0);
  });
});

// ── 6. Multiplicative stacking ───────────────────────────────────────────────

describe('multiplicative stacking', () => {
  it('Region 4 HP scaling stacks correctly with high wave multipliers', () => {
    const rd = getRegionDifficulty('biboon-aki');
    const baseWave = { hpMult: 3.0, speedMult: 2.0, pool: ['grunt'], count: 10, intervalMs: 500 };
    const result = applyRegionToWaveDefs([baseWave], rd);

    // 3.0 × 1.50 = 4.50
    expect(result[0].hpMult).toBeCloseTo(4.50, 5);
    // 2.0 × 1.15 = 2.30
    expect(result[0].speedMult).toBeCloseTo(2.30, 5);
  });
});
