/**
 * TASK-135 — Late-wave creep count scaling tests.
 *
 * Acceptance criteria verified here:
 *   AC1. Audit current wave creep count progression in wave data
 *   AC2. Increase creep counts for waves 10+ (escalating further at 15, 20, etc.)
 *   AC3. Scaling creates pressure to build more towers (not just upgrade existing ones)
 *   AC4. Scaling doesn't make early waves too easy by comparison
 *   AC5. Balance with gold income so players CAN afford enough towers if they play well
 *
 * All tests are Phaser-free and run in Node.js / Vitest.
 */

import { describe, it, expect } from 'vitest';
import { WAVE_CREEP_COUNTS } from '../../data/scalingConfig';
import { calculateWaveBonus } from '../EconomyManager';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Average creep kill reward across all creep types (used for gold income estimate). */
const AVG_CREEP_KILL_REWARD = (8 + 6 + 16 + 4 + 10 + 13) / 6; // ≈ 9.5 gold

/** Cheapest tower cost — Arrow tower. */
const CHEAPEST_TOWER_COST = 75;

/** Boss waves (1-indexed). */
const BOSS_WAVES = [5, 10, 15, 20] as const;

// ── AC1: Audit — array shape and early-wave baseline ─────────────────────────

describe('AC1: WAVE_CREEP_COUNTS array — audit and baseline', () => {
  it('has exactly 20 entries (one per wave)', () => {
    expect(WAVE_CREEP_COUNTS).toHaveLength(20);
  });

  it('wave 1 count is 8 (baseline)', () => {
    expect(WAVE_CREEP_COUNTS[0]).toBe(8);
  });

  it('all counts are positive integers', () => {
    for (const count of WAVE_CREEP_COUNTS) {
      expect(count).toBeGreaterThan(0);
      expect(Number.isInteger(count)).toBe(true);
    }
  });

  it('counts are non-decreasing across all waves', () => {
    for (let i = 1; i < WAVE_CREEP_COUNTS.length; i++) {
      expect(WAVE_CREEP_COUNTS[i]).toBeGreaterThanOrEqual(WAVE_CREEP_COUNTS[i - 1]);
    }
  });
});

// ── AC2: Creep counts for waves 10+ are increased; escalate at 15 and 20 ─────

describe('AC2: Wave 10+ counts are increased relative to wave 9', () => {
  const wave9Count = WAVE_CREEP_COUNTS[8]; // index 8 = wave 9

  it('wave 10 count is greater than wave 9', () => {
    expect(WAVE_CREEP_COUNTS[9]).toBeGreaterThan(wave9Count);
  });

  it('wave 10 count is at least 20% more than wave 9', () => {
    expect(WAVE_CREEP_COUNTS[9]).toBeGreaterThanOrEqual(Math.ceil(wave9Count * 1.2));
  });

  it('wave 10 count equals 24', () => {
    expect(WAVE_CREEP_COUNTS[9]).toBe(24);
  });

  it('wave 11 count equals 26', () => {
    expect(WAVE_CREEP_COUNTS[10]).toBe(26);
  });

  it('wave 12 count equals 28', () => {
    expect(WAVE_CREEP_COUNTS[11]).toBe(28);
  });

  it('wave 13 count equals 32', () => {
    expect(WAVE_CREEP_COUNTS[12]).toBe(32);
  });

  it('wave 14 count equals 34', () => {
    expect(WAVE_CREEP_COUNTS[13]).toBe(34);
  });
});

describe('AC2: Escalation at wave 15 — counts jump again', () => {
  it('wave 15 count (36) is greater than wave 14 count (34)', () => {
    expect(WAVE_CREEP_COUNTS[14]).toBeGreaterThan(WAVE_CREEP_COUNTS[13]);
  });

  it('wave 15 count equals 36', () => {
    expect(WAVE_CREEP_COUNTS[14]).toBe(36);
  });

  it('wave 16 count equals 40', () => {
    expect(WAVE_CREEP_COUNTS[15]).toBe(40);
  });

  it('wave 17 count equals 44', () => {
    expect(WAVE_CREEP_COUNTS[16]).toBe(44);
  });

  it('wave 18 count equals 48', () => {
    expect(WAVE_CREEP_COUNTS[17]).toBe(48);
  });

  it('wave 19 count equals 52', () => {
    expect(WAVE_CREEP_COUNTS[18]).toBe(52);
  });
});

describe('AC2: Final escalation at wave 20', () => {
  it('wave 20 count (56) is the maximum', () => {
    const max = Math.max(...WAVE_CREEP_COUNTS);
    expect(WAVE_CREEP_COUNTS[19]).toBe(max);
  });

  it('wave 20 count equals 56', () => {
    expect(WAVE_CREEP_COUNTS[19]).toBe(56);
  });

  it('wave 20 count is more than 60% higher than wave 9 count', () => {
    // wave 9 = 20, wave 20 = 56 → +180%
    expect(WAVE_CREEP_COUNTS[19]).toBeGreaterThan(WAVE_CREEP_COUNTS[8] * 1.6);
  });
});

// ── AC3: Pressure to build more towers (count growth per tier) ────────────────

describe('AC3: Count growth creates pressure for tower coverage (not just upgrades)', () => {
  it('waves 10–14 average count is at least 25% higher than waves 5–9 average', () => {
    const earlyAvg = (WAVE_CREEP_COUNTS[4] + WAVE_CREEP_COUNTS[5] +
                      WAVE_CREEP_COUNTS[6] + WAVE_CREEP_COUNTS[7] +
                      WAVE_CREEP_COUNTS[8]) / 5;
    const midAvg   = (WAVE_CREEP_COUNTS[9]  + WAVE_CREEP_COUNTS[10] +
                      WAVE_CREEP_COUNTS[11] + WAVE_CREEP_COUNTS[12] +
                      WAVE_CREEP_COUNTS[13]) / 5;
    expect(midAvg).toBeGreaterThan(earlyAvg * 1.25);
  });

  it('waves 15–19 average count is at least 40% higher than waves 10–14 average', () => {
    const midAvg  = (WAVE_CREEP_COUNTS[9]  + WAVE_CREEP_COUNTS[10] +
                     WAVE_CREEP_COUNTS[11] + WAVE_CREEP_COUNTS[12] +
                     WAVE_CREEP_COUNTS[13]) / 5;
    const lateAvg = (WAVE_CREEP_COUNTS[14] + WAVE_CREEP_COUNTS[15] +
                     WAVE_CREEP_COUNTS[16] + WAVE_CREEP_COUNTS[17] +
                     WAVE_CREEP_COUNTS[18]) / 5;
    expect(lateAvg).toBeGreaterThan(midAvg * 1.4);
  });

  it('wave 20 count is at least 50% more than wave 15 count', () => {
    // A single-path strategy (upgrade 1 tower to tier 5) gives ~5× DPS, but
    // a 50%+ count increase means you need more towers in range, not just stronger ones.
    expect(WAVE_CREEP_COUNTS[19]).toBeGreaterThan(WAVE_CREEP_COUNTS[14] * 1.5);
  });

  it('the step from wave 14 to wave 15 is at least 2 creeps (visible jump)', () => {
    expect(WAVE_CREEP_COUNTS[14] - WAVE_CREEP_COUNTS[13]).toBeGreaterThanOrEqual(2);
  });

  it('the step from wave 19 to wave 20 is at least 2 creeps (climactic push)', () => {
    expect(WAVE_CREEP_COUNTS[19] - WAVE_CREEP_COUNTS[18]).toBeGreaterThanOrEqual(2);
  });
});

// ── AC4: Early waves (1–9) are unchanged — don't dilute the baseline ──────────

describe('AC4: Early wave counts (waves 1–9) are unchanged', () => {
  const EARLY_WAVE_COUNTS = [8, 10, 12, 14, 14, 16, 18, 18, 20];

  it.each(EARLY_WAVE_COUNTS.map((count, i) => ({ wave: i + 1, count })))(
    'wave $wave count is $count (unchanged baseline)',
    ({ wave, count }) => {
      expect(WAVE_CREEP_COUNTS[wave - 1]).toBe(count);
    },
  );

  it('waves 1–9 span is still 8–20 (early game baseline)', () => {
    const earlySlice = WAVE_CREEP_COUNTS.slice(0, 9);
    expect(Math.min(...earlySlice)).toBe(8);
    expect(Math.max(...earlySlice)).toBe(20);
  });
});

// ── AC5: Gold income scales to afford towers on higher-count waves ─────────────

describe('AC5: Gold income allows purchasing enough towers on late waves', () => {
  it.each([10, 15, 20] as const)(
    'wave %i: estimated gold per wave ≥ cost of 2 Arrow towers',
    (wave) => {
      const count       = WAVE_CREEP_COUNTS[wave - 1];
      const killGold    = Math.floor(count * AVG_CREEP_KILL_REWARD);
      const waveBonus   = calculateWaveBonus(wave);
      const totalGold   = killGold + waveBonus;
      // Player should be able to buy at least 2 cheapest towers per wave
      expect(totalGold).toBeGreaterThanOrEqual(CHEAPEST_TOWER_COST * 2);
    },
  );

  it('wave 20 total gold income is at least 40% more than wave 10 income', () => {
    const incomeAt = (wave: number): number => {
      const count = WAVE_CREEP_COUNTS[wave - 1];
      return Math.floor(count * AVG_CREEP_KILL_REWARD) + calculateWaveBonus(wave);
    };
    expect(incomeAt(20)).toBeGreaterThan(incomeAt(10) * 1.4);
  });

  it('kill-gold contribution grows with count (more creeps = more rewards)', () => {
    // At wave 10: 24 creeps; at wave 20: 56 creeps.
    // Kill gold should increase proportionally.
    const killGold10 = Math.floor(WAVE_CREEP_COUNTS[9]  * AVG_CREEP_KILL_REWARD);
    const killGold20 = Math.floor(WAVE_CREEP_COUNTS[19] * AVG_CREEP_KILL_REWARD);
    expect(killGold20).toBeGreaterThan(killGold10);
  });

  it('boss waves (10, 15, 20) have non-boss-wave comparison: count is higher', () => {
    // Boss waves have higher main-creep counts to compensate for players grinding
    // the boss kill; the additional creeps provide extra gold.
    for (const bossWave of BOSS_WAVES) {
      if (bossWave > 9) {
        const prevWave = bossWave - 1;
        // Boss waves should have at least as many creeps as the preceding wave
        expect(WAVE_CREEP_COUNTS[bossWave - 1]).toBeGreaterThanOrEqual(
          WAVE_CREEP_COUNTS[prevWave - 1],
        );
      }
    }
  });
});
