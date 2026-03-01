/**
 * Boss-round definitions for Ojibwe TD.
 *
 * This module is intentionally Phaser-free so it can be imported in unit tests
 * without a DOM/canvas stub.  The only external types imported are string unions
 * from Creep.ts (erased at compile time).
 */

import type { CreepType, BossAbility } from '../entities/Creep';

// ── CreepDef ──────────────────────────────────────────────────────────────────

/** Mirror of the JSON creep-types.json entry shape. */
export interface CreepDef {
  key:    string;
  type:   CreepType;
  hp:     number;
  speed:  number;
  reward: number;
}

// ── BossDef ───────────────────────────────────────────────────────────────────

/** Full boss-creep definition — extends CreepDef with boss-specific fields. */
export interface BossDef extends CreepDef {
  /** Display name (Ojibwe animal name shown in HUD). */
  name: string;
  isBoss: true;
  bossAbility: BossAbility;

  /** Bonus gold awarded on kill (on top of normal `reward`). */
  rewardGold: number;
  /** Whether killing this boss triggers a bonus roguelike offer draw. */
  rewardOffer: boolean;

  /** 0–1 fraction of damage blocked by natural armor (Makwa). */
  physicalResistPct: number;
  /** If true, Frost/Poison slow effects are fully ignored (Migizi). */
  isSlowImmune: boolean;
  /** If true, poison DoT stacks are not applied (Animikiins). */
  isPoisonImmune: boolean;
  /** HP regenerated per second as a % of maxHp (Animikiins: 1%). 0 = none. */
  regenPercentPerSec: number;

  /** RGB hex tint applied to the boss sprite. */
  tint: number;

  /** Waabooz: number of mini-copies spawned on first death. */
  splitCount?: number;
  /** Waabooz: fraction of boss maxHp each copy starts with. */
  splitHpPct?: number;
  /** Waabooz: speed multiplier for each mini-copy (they run faster). */
  splitSpeedBonus?: number;
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Compute the approximate HP a boss should have for a given wave.
 *
 * Formula: average creep HP across the wave pool (scaled by hpMult) × creep count.
 * This approximates the total HP of all creeps that wave would have spawned.
 */
export function calculateBossHp(
  waveDef: { count: number; hpMult: number; pool: string[] },
  creepTypeDefs: ReadonlyArray<{ key: string; hp: number }>,
): number {
  const { count, hpMult, pool } = waveDef;
  if (pool.length === 0) return 0;

  const totalHp = pool.reduce((sum, key) => {
    const def = creepTypeDefs.find(c => c.key === key);
    return def ? sum + def.hp * hpMult : sum;
  }, 0);

  const avgHp = totalHp / pool.length;
  return Math.round(avgHp * count);
}

/**
 * Compute the mini-creep config for Waabooz's split-on-death mechanic.
 * Returns a plain config object (no Phaser) suitable for unit tests.
 */
export function computeWaaboozSplitConfig(boss: BossDef): {
  count:  number;
  hp:     number;
  speed:  number;
  reward: number;
} {
  const count      = boss.splitCount      ?? 3;
  const splitHpPct = boss.splitHpPct      ?? 0.2;
  const speedBonus = boss.splitSpeedBonus ?? 1.2;
  return {
    count,
    hp:     Math.round(boss.hp     * splitHpPct),
    speed:  Math.round(boss.speed  * speedBonus),
    reward: Math.max(1, Math.round(boss.reward * 0.1)),
  };
}

/**
 * Pure helper — regen tick logic without Phaser.
 * Creep.step() delegates here so unit tests can verify regen behaviour
 * without importing the Phaser-dependent Creep module.
 *
 * @param currentHp         Current HP of the creep
 * @param maxHp             Maximum HP
 * @param regenPercentPerSec % of maxHp regenerated per second
 * @param regenCooldownMs   Remaining cooldown before regen resumes (ms)
 * @param delta             Elapsed time this frame (ms)
 * @returns Updated hp and regenCooldownMs
 */
export function tickRegen(
  currentHp: number,
  maxHp: number,
  regenPercentPerSec: number,
  regenCooldownMs: number,
  delta: number,
): { hp: number; regenCooldownMs: number } {
  const newCooldown = Math.max(0, regenCooldownMs - delta);
  if (newCooldown > 0) {
    return { hp: currentHp, regenCooldownMs: newCooldown };
  }
  const amount = maxHp * (regenPercentPerSec / 100) * (delta / 1000);
  return {
    hp: Math.min(maxHp, currentHp + amount),
    regenCooldownMs: 0,
  };
}

// ── Boss archetypes ───────────────────────────────────────────────────────────

/**
 * Wave 5 — Makwa (Bear)
 * High HP, slow movement, armored (30 % physical damage resistance).
 * HP ≈ sum of all wave-5 creeps: avg(grunt×1.4, runner×1.4, swarm×1.4) × 14 = 1045
 */
export const MAKWA_DEF: BossDef = {
  key:               'makwa',
  name:              'Makwa',   // Bear
  type:              'ground',
  isBoss:            true,
  bossAbility:       'armored',
  hp:                1045,
  speed:             40,         // slow — 53 % of base grunt speed
  reward:            50,
  rewardGold:        100,
  rewardOffer:       true,
  physicalResistPct: 0.30,       // 30 % damage reduction; Cannon armor-shred counters this
  isSlowImmune:      false,
  isPoisonImmune:    false,
  regenPercentPerSec: 0,
  tint:              0xcc6600,   // amber / brown
};

/**
 * Wave 10 — Migizi (Eagle)
 * Moderate HP, very fast movement, immune to slow and freeze.
 * HP ≈ avg(grunt×2.2, runner×2.2, brute×2.2, swarm×2.2) × 18 = 3762
 */
export const MIGIZI_DEF: BossDef = {
  key:               'migizi',
  name:              'Migizi',  // Eagle
  type:              'ground',
  isBoss:            true,
  bossAbility:       'slow-immune',
  hp:                3762,
  speed:             160,        // very fast — more than double normal runners
  reward:            80,
  rewardGold:        150,
  rewardOffer:       true,
  physicalResistPct: 0,
  isSlowImmune:      true,       // Frost and related slow/freeze effects skip this creep
  isPoisonImmune:    false,
  regenPercentPerSec: 0,
  tint:              0xffd700,   // golden yellow
};

/**
 * Wave 15 — Waabooz (Hare)
 * Moderate HP, splits into 3 mini-copies on first death.
 * HP ≈ avg(grunt×3.5, runner×3.5, brute×3.5, scout×3.5, flier×3.5) × 22 = 8393
 * Intentionally punishes burst-damage builds; DoT persists onto split copies.
 */
export const WAABOOZ_DEF: BossDef = {
  key:               'waabooz',
  name:              'Waabooz', // Hare / Rabbit
  type:              'ground',
  isBoss:            true,
  bossAbility:       'split',
  hp:                8393,
  speed:             90,
  reward:            100,
  rewardGold:        200,
  rewardOffer:       true,
  physicalResistPct: 0,
  isSlowImmune:      false,
  isPoisonImmune:    false,
  regenPercentPerSec: 0,
  tint:              0xaaddff,   // pale blue-white
  splitCount:        3,
  splitHpPct:        0.2,        // each copy has 20 % of Waabooz's HP
  splitSpeedBonus:   1.2,        // mini-copies run 20 % faster
};

/**
 * Wave 20 — Animikiins (Little Thunderbird)
 * Very high HP, regenerates 1 % max HP / sec, immune to poison DoT.
 * HP ≈ avg(all 6 types × 6.0) × 30 = 17 250
 */
export const ANIMIKIINS_DEF: BossDef = {
  key:               'animikiins',
  name:              'Animikiins', // Little Thunderbird / Thunder-being
  type:              'ground',
  isBoss:            true,
  bossAbility:       'regen',
  hp:                17250,
  speed:             80,
  reward:            150,
  rewardGold:        300,
  rewardOffer:       true,
  physicalResistPct: 0,
  isSlowImmune:      false,
  isPoisonImmune:    true,        // poison DoT is not applied
  regenPercentPerSec: 1,          // 1 % of maxHp per second; cancelled 3 s after taking damage
  tint:              0x4466ff,    // electric blue
};

/** All boss definitions indexed by their key (matches the JSON wave "boss" field). */
export const BOSS_DEFS: Readonly<Record<string, BossDef>> = {
  makwa:      MAKWA_DEF,
  migizi:     MIGIZI_DEF,
  waabooz:    WAABOOZ_DEF,
  animikiins: ANIMIKIINS_DEF,
};
