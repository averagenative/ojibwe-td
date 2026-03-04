/**
 * Tower-vs-creep scaling model.
 *
 * This file is Phaser-free and safe to import in unit tests and Node.js scripts.
 * It mirrors the per-wave data in public/data/waves.json and
 * public/data/creep-types.json so balance calculations can run without
 * runtime asset loading.
 */

// ── Wave Scaling Config ───────────────────────────────────────────────────────

export interface WaveScalingConfig {
  /** Base HP of the reference (grunt) creep at wave 1. */
  creepHpBase: number;

  /**
   * Approximate geometric HP growth factor per wave.
   * Derived from: wave-20 hpMult (5.75) = factor^19 → factor ≈ 1.096.
   * The authoritative per-wave values are in WAVE_HP_MULTS.
   */
  creepHpGrowthPerWave: number;

  /**
   * Approximate geometric speed growth factor per wave.
   * Derived from: wave-20 speedMult (1.70) = factor^19 → factor ≈ 1.028.
   * The authoritative per-wave values are in WAVE_SPEED_MULTS.
   */
  creepSpeedGrowthPerWave: number;

  /** HP multiplier applied on top of standard wave HP for boss creeps. */
  bossHpMultiplier: number;

  /** 1-based wave numbers that include a boss creep. */
  bossWaves: readonly number[];

  /**
   * Design TTK (time-to-kill) target in seconds per tower type.
   * An un-upgraded tower of each type SHOULD kill one standard grunt creep
   * of the current wave within this many seconds.
   */
  ttkTargetSeconds: Readonly<Record<string, number>>;
}

export const WAVE_SCALING: WaveScalingConfig = {
  creepHpBase:             80,     // grunt base HP
  creepHpGrowthPerWave:    1.096,  // ≈ 5.75^(1/19)
  creepSpeedGrowthPerWave: 1.028,  // ≈ 1.70^(1/19)
  bossHpMultiplier:        8,      // boss = 8× standard wave HP
  bossWaves:               [5, 10, 15, 20],
  ttkTargetSeconds: {
    'rock-hurler': 3.0,
    arrow:         2.5,
    frost:         5.0,
    poison:        10.0,
    tesla:         5.0,
    aura:          Infinity,
  },
};

// ── Wave data (mirrors public/data/waves.json) ────────────────────────────────

/**
 * Per-wave HP multipliers applied to each creep's base HP.
 * Index 0 = wave 1, index 19 = wave 20.
 */
export const WAVE_HP_MULTS: readonly number[] = [
  1.00, 1.10, 1.20, 1.30, 1.40,
  1.55, 1.70, 1.85, 2.00, 2.20,
  2.40, 2.65, 2.90, 3.20, 3.50,
  3.85, 4.25, 4.70, 5.20, 5.75,
];

/**
 * Per-wave speed multipliers applied to each creep's base speed.
 * Index 0 = wave 1, index 19 = wave 20.
 */
export const WAVE_SPEED_MULTS: readonly number[] = [
  1.00, 1.00, 1.05, 1.08, 1.10,
  1.12, 1.15, 1.18, 1.22, 1.25,
  1.28, 1.30, 1.35, 1.38, 1.42,
  1.46, 1.50, 1.55, 1.60, 1.70,
];

// ── Creep base stats (mirrors public/data/creep-types.json) ──────────────────

/** Base HP per creep type (before wave HP multiplier). */
export const CREEP_BASE_HP: Readonly<Record<string, number>> = {
  grunt:  80,
  runner: 50,
  brute:  220,
  swarm:  30,
  scout:  65,
  flier:  130,
};

/** Base movement speed in px/s per creep type. */
export const CREEP_BASE_SPEED: Readonly<Record<string, number>> = {
  grunt:  75,
  runner: 120,
  brute:  52,
  swarm:  100,
  scout:  115,
  flier:  82,
};

// ── Map constants ─────────────────────────────────────────────────────────────

/**
 * Total path length in pixels for map-01 (Winding Pass).
 * Waypoints: 8+9+8+9+8+9+9 = 60 tiles × 40px/tile = 2400px.
 */
export const MAP_PATH_LENGTH_PX = 2400;

/**
 * Total path length in pixels for map-03 (Oak Savanna Run).
 * Waypoints: (0,5)→(20,5) = 20 tiles, (20,5)→(20,13) = 8 tiles, (20,13)→(33,13) = 13 tiles.
 * Total = 41 tiles × 40px/tile = 1640px.
 */
export const SAVANNAH_PATH_LENGTH_PX = 1640;

// ── Creep count per wave (mirrors public/data/waves.json) ─────────────────────

/**
 * Number of main-pool creeps spawned each wave (boss escorts are separate).
 * Index 0 = wave 1, index 19 = wave 20.
 *
 * Waves 1–9 establish the early-game baseline (8–18 creeps).
 * Waves 10–14 step up significantly (22–30) to overwhelm thin mid-game defences.
 * Waves 15–19 escalate further (32–48) forcing wider tower coverage.
 * Wave 20 peaks at 50 for a climactic final push.
 */
export const WAVE_CREEP_COUNTS: readonly number[] = [
  //  w1   w2   w3   w4   w5
       8,  10,  12,  12,  14,
  //  w6   w7   w8   w9  w10
      14,  16,  16,  18,  22,
  // w11  w12  w13  w14  w15
      24,  26,  28,  30,  32,
  // w16  w17  w18  w19  w20
      36,  40,  44,  48,  50,
];

// ── Balance validation bands ──────────────────────────────────────────────────

/**
 * Expected kill-potential ratio bands [min, max] for a single un-upgraded
 * Rock Hurler tower against one standard grunt per key wave.
 *
 * Kill potential = (towerDPS × pathTraversalTime) / creepHP
 *  > 1: tower can theoretically kill the creep before it exits (continuous fire)
 *  Higher values = easier (excess DPS headroom)
 *
 * These bands encode the difficulty ramp and are checked by automated tests.
 * Rock Hurler base DPS ≈ 27.5 (55 dmg / 2.0s).
 */
export const ROCK_HURLER_KILL_POTENTIAL_BANDS: Readonly<Record<number, readonly [number, number]>> = {
  1:  [7,   16],
  5:  [4.5, 11],
  10: [2.5,  6.5],
  15: [1.3,  3.5],
  20: [0.6,  2.0],
};
