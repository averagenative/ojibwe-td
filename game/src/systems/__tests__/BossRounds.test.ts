/**
 * Unit tests for boss-round mechanics.
 *
 * These tests cover pure functions and do not require Phaser or a DOM.
 *
 * Covered:
 *   1. calculateBossHp  — boss HP derived from wave data + creep type defs
 *   2. computeWaaboozSplitConfig — split-copy stats from BossDef
 *   3. tickRegen — Animikiins regen state machine (cooldown cancellation)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBossHp,
  computeWaaboozSplitConfig,
  tickRegen,
  BOSS_DEFS,
  MAKWA_DEF,
  MIGIZI_DEF,
  WAABOOZ_DEF,
  ANIMIKIINS_DEF,
} from '../../data/bossDefs';

// ── Sample data matching public/data/creep-types.json ─────────────────────

const CREEP_DEFS = [
  { key: 'grunt',  type: 'ground' as const, hp:  80, speed:  75, reward:  8 },
  { key: 'runner', type: 'ground' as const, hp:  50, speed: 120, reward:  6 },
  { key: 'brute',  type: 'ground' as const, hp: 220, speed:  52, reward: 16 },
  { key: 'swarm',  type: 'ground' as const, hp:  30, speed: 100, reward:  4 },
  { key: 'scout',  type: 'air'    as const, hp:  65, speed: 115, reward: 10 },
  { key: 'flier',  type: 'air'    as const, hp: 130, speed:  82, reward: 13 },
];

// ── 1. Boss HP calculation ─────────────────────────────────────────────────

describe('calculateBossHp', () => {
  it('returns 0 for an empty pool', () => {
    const result = calculateBossHp({ count: 10, hpMult: 1.0, pool: [] }, CREEP_DEFS);
    expect(result).toBe(0);
  });

  it('wave 5 — Makwa: avg(grunt×1.4, runner×1.4, swarm×1.4) × 14 ≈ 1045', () => {
    const wave5 = { count: 14, hpMult: 1.40, pool: ['grunt', 'runner', 'swarm'] };
    const hp    = calculateBossHp(wave5, CREEP_DEFS);
    // avg = (80*1.4 + 50*1.4 + 30*1.4) / 3 = (112+70+42)/3 = 74.667
    // total = Math.round(74.667 × 14) = 1045
    expect(hp).toBe(MAKWA_DEF.hp); // 1045
  });

  it('wave 10 — Migizi: avg(grunt,runner,brute,swarm × 2.2) × 18 ≈ 3762', () => {
    const wave10 = { count: 18, hpMult: 2.20, pool: ['grunt', 'runner', 'brute', 'swarm'] };
    const hp     = calculateBossHp(wave10, CREEP_DEFS);
    // avg = (176+110+484+66)/4 = 209; total = 209×18 = 3762
    expect(hp).toBe(MIGIZI_DEF.hp); // 3762
  });

  it('wave 15 — Waabooz: avg(grunt,runner,brute,scout,flier × 3.5) × 22 ≈ 8393', () => {
    const wave15 = {
      count: 22, hpMult: 3.50,
      pool: ['grunt', 'runner', 'brute', 'scout', 'flier'],
    };
    const hp = calculateBossHp(wave15, CREEP_DEFS);
    // avg = (280+175+770+227.5+455)/5 = 381.5; total = Math.round(381.5×22) = 8393
    expect(hp).toBe(WAABOOZ_DEF.hp); // 8393
  });

  it('wave 20 — Animikiins: avg(all 6 × 6.0) × 30 ≈ 17250', () => {
    const wave20 = {
      count: 30, hpMult: 6.00,
      pool: ['grunt', 'runner', 'brute', 'swarm', 'scout', 'flier'],
    };
    const hp = calculateBossHp(wave20, CREEP_DEFS);
    // avg = (480+300+1320+180+390+780)/6 = 575; total = 575×30 = 17250
    expect(hp).toBe(ANIMIKIINS_DEF.hp); // 17250
  });

  it('ignores unknown creep keys in the pool gracefully', () => {
    const result = calculateBossHp(
      { count: 10, hpMult: 1.0, pool: ['grunt', 'UNKNOWN'] },
      CREEP_DEFS,
    );
    // Only grunt contributes: avg = 80 / 2 = 40 (UNKNOWN skipped); total = 400
    expect(result).toBe(400);
  });
});

// ── 2. Waabooz split config ────────────────────────────────────────────────

describe('computeWaaboozSplitConfig', () => {
  it('produces 3 split copies', () => {
    const cfg = computeWaaboozSplitConfig(WAABOOZ_DEF);
    expect(cfg.count).toBe(3);
  });

  it('each copy has 20 % of Waabooz HP', () => {
    const cfg = computeWaaboozSplitConfig(WAABOOZ_DEF);
    expect(cfg.hp).toBe(Math.round(WAABOOZ_DEF.hp * 0.2));
  });

  it('mini-copies are faster than the original', () => {
    const cfg = computeWaaboozSplitConfig(WAABOOZ_DEF);
    expect(cfg.speed).toBeGreaterThan(WAABOOZ_DEF.speed);
  });

  it('split copies receive a small reward (at least 1 gold)', () => {
    const cfg = computeWaaboozSplitConfig(WAABOOZ_DEF);
    expect(cfg.reward).toBeGreaterThanOrEqual(1);
  });

  it('total split HP is less than original HP (boss penalises burst damage)', () => {
    const cfg      = computeWaaboozSplitConfig(WAABOOZ_DEF);
    const totalHP  = cfg.hp * cfg.count;
    expect(totalHP).toBeLessThan(WAABOOZ_DEF.hp);
  });
});

// ── 3. Regen tick cancellation (Animikiins) ────────────────────────────────

describe('tickRegen', () => {
  const MAX_HP = 17250; // Animikiins maxHp
  const REGEN  = 1;     // 1 % per second

  it('heals when cooldown is 0: 1 % maxHp per 1000 ms frame', () => {
    const result = tickRegen(MAX_HP - 1000, MAX_HP, REGEN, 0, 1000);
    // amount = 17250 * (1/100) * (1000/1000) = 172.5
    expect(result.hp).toBeCloseTo(MAX_HP - 1000 + 172.5, 0);
    expect(result.regenCooldownMs).toBe(0);
  });

  it('does NOT heal while cooldown is active', () => {
    const result = tickRegen(10000, MAX_HP, REGEN, 2000, 1000);
    expect(result.hp).toBe(10000); // unchanged
    expect(result.regenCooldownMs).toBe(1000); // cooldown decremented
  });

  it('cooldown decrements by the delta each frame', () => {
    const r1 = tickRegen(10000, MAX_HP, REGEN, 3000, 1000);
    expect(r1.regenCooldownMs).toBe(2000);

    const r2 = tickRegen(r1.hp, MAX_HP, REGEN, r1.regenCooldownMs, 1000);
    expect(r2.regenCooldownMs).toBe(1000);

    const r3 = tickRegen(r2.hp, MAX_HP, REGEN, r2.regenCooldownMs, 1000);
    expect(r3.regenCooldownMs).toBe(0);
    // Now cooldown expired — regen fires on this final frame
    expect(r3.hp).toBeGreaterThan(r2.hp);
  });

  it('does not regen beyond maxHp', () => {
    const result = tickRegen(MAX_HP - 1, MAX_HP, REGEN, 0, 10000);
    expect(result.hp).toBe(MAX_HP);
  });

  it('cooldown clamps to 0, never goes negative', () => {
    const result = tickRegen(10000, MAX_HP, REGEN, 500, 2000);
    // 500 - 2000 would be -1500 without clamp
    expect(result.regenCooldownMs).toBe(0);
    // Cooldown expired → regen fires
    expect(result.hp).toBeGreaterThan(10000);
  });

  it('returns hp unchanged and cooldown=0 when regenPercentPerSec is 0', () => {
    const result = tickRegen(10000, MAX_HP, 0, 0, 1000);
    expect(result.hp).toBe(10000); // no regen
    expect(result.regenCooldownMs).toBe(0);
  });
});

// ── 4. Boss archetype flag validation ─────────────────────────────────────

describe('boss archetype flags', () => {
  it('Makwa has physicalResistPct of 0.30 and is not slow-immune', () => {
    expect(MAKWA_DEF.physicalResistPct).toBe(0.30);
    expect(MAKWA_DEF.isSlowImmune).toBe(false);
    expect(MAKWA_DEF.isPoisonImmune).toBe(false);
    expect(MAKWA_DEF.bossAbility).toBe('armored');
  });

  it('Migizi is slow-immune with no physical resist', () => {
    expect(MIGIZI_DEF.isSlowImmune).toBe(true);
    expect(MIGIZI_DEF.physicalResistPct).toBe(0);
    expect(MIGIZI_DEF.bossAbility).toBe('slow-immune');
  });

  it('Waabooz has split ability with 3 copies at 20 % HP', () => {
    expect(WAABOOZ_DEF.bossAbility).toBe('split');
    expect(WAABOOZ_DEF.splitCount).toBe(3);
    expect(WAABOOZ_DEF.splitHpPct).toBe(0.2);
  });

  it('Animikiins is poison-immune and regens 1 % HP/s', () => {
    expect(ANIMIKIINS_DEF.isPoisonImmune).toBe(true);
    expect(ANIMIKIINS_DEF.regenPercentPerSec).toBe(1);
    expect(ANIMIKIINS_DEF.bossAbility).toBe('regen');
    expect(ANIMIKIINS_DEF.isSlowImmune).toBe(false);
  });

  it('all bosses have isBoss: true and rewardOffer: true', () => {
    for (const def of [MAKWA_DEF, MIGIZI_DEF, WAABOOZ_DEF, ANIMIKIINS_DEF]) {
      expect(def.isBoss).toBe(true);
      expect(def.rewardOffer).toBe(true);
    }
  });

  it('all bosses have positive rewardGold', () => {
    for (const def of [MAKWA_DEF, MIGIZI_DEF, WAABOOZ_DEF, ANIMIKIINS_DEF]) {
      expect(def.rewardGold).toBeGreaterThan(0);
    }
  });

  it('only Waabooz has split fields', () => {
    expect(WAABOOZ_DEF.splitCount).toBeDefined();
    expect(MAKWA_DEF.splitCount).toBeUndefined();
    expect(MIGIZI_DEF.splitCount).toBeUndefined();
    expect(ANIMIKIINS_DEF.splitCount).toBeUndefined();
  });
});

// ── 5. BOSS_DEFS lookup table ─────────────────────────────────────────────

describe('BOSS_DEFS lookup', () => {
  it('contains exactly 4 bosses keyed by their .key field', () => {
    expect(Object.keys(BOSS_DEFS)).toHaveLength(4);
    for (const [key, def] of Object.entries(BOSS_DEFS)) {
      expect(def.key).toBe(key);
    }
  });

  it('boss keys match the waves.json boss field values', () => {
    const expectedKeys = ['makwa', 'migizi', 'waabooz', 'animikiins'];
    for (const k of expectedKeys) {
      expect(BOSS_DEFS[k]).toBeDefined();
    }
  });
});

// ── 6. calculateBossHp edge cases ─────────────────────────────────────────

describe('calculateBossHp edge cases', () => {
  it('returns 0 when count is 0', () => {
    const result = calculateBossHp({ count: 0, hpMult: 2.0, pool: ['grunt'] }, CREEP_DEFS);
    expect(result).toBe(0);
  });

  it('handles single-type pool correctly', () => {
    const result = calculateBossHp({ count: 10, hpMult: 1.0, pool: ['grunt'] }, CREEP_DEFS);
    // avg = 80 / 1 = 80; total = 80 × 10 = 800
    expect(result).toBe(800);
  });

  it('handles pool with ALL unknown keys (returns 0)', () => {
    const result = calculateBossHp(
      { count: 10, hpMult: 1.0, pool: ['UNKNOWN_A', 'UNKNOWN_B'] },
      CREEP_DEFS,
    );
    // No known keys → sum = 0, avg = 0/2 = 0; total = 0
    expect(result).toBe(0);
  });
});

// ── 7. computeWaaboozSplitConfig edge cases ───────────────────────────────

describe('computeWaaboozSplitConfig edge cases', () => {
  it('uses defaults when split fields are undefined', () => {
    // Create a BossDef without optional split fields.
    const noSplitFields = { ...MAKWA_DEF, bossAbility: 'split' as const };
    const cfg = computeWaaboozSplitConfig(noSplitFields);
    // Defaults: count=3, splitHpPct=0.2, splitSpeedBonus=1.2
    expect(cfg.count).toBe(3);
    expect(cfg.hp).toBe(Math.round(noSplitFields.hp * 0.2));
    expect(cfg.speed).toBe(Math.round(noSplitFields.speed * 1.2));
  });

  it('split copy reward is at least 1 even for a low-reward boss', () => {
    const lowReward = { ...WAABOOZ_DEF, reward: 1 };
    const cfg = computeWaaboozSplitConfig(lowReward);
    expect(cfg.reward).toBe(1); // Math.max(1, ...) guard
  });
});
