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
   * Derived from: wave-20 hpMult (6.0) = factor^19 → factor ≈ 1.094.
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
  creepHpGrowthPerWave:    1.094,  // ≈ 6.0^(1/19)
  creepSpeedGrowthPerWave: 1.028,  // ≈ 1.70^(1/19)
  bossHpMultiplier:        8,      // boss = 8× standard wave HP
  bossWaves:               [5, 10, 15, 20],
  ttkTargetSeconds: {
    cannon: 3.0,
    frost:  5.0,
    mortar: 4.0,
    poison: 10.0,
    tesla:  5.0,
    aura:   Infinity,
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
  3.85, 4.25, 4.70, 5.20, 6.00,
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

// ── Balance validation bands ──────────────────────────────────────────────────

/**
 * Expected kill-potential ratio bands [min, max] for a single un-upgraded
 * Cannon tower against one standard grunt per key wave.
 *
 * Kill potential = (towerDPS × pathTraversalTime) / creepHP
 *  > 1: tower can theoretically kill the creep before it exits (continuous fire)
 *  Higher values = easier (excess DPS headroom)
 *
 * These bands encode the difficulty ramp and are checked by automated tests.
 */
export const CANNON_KILL_POTENTIAL_BANDS: Readonly<Record<number, readonly [number, number]>> = {
  1:  [12, 25],
  5:  [8,  15],
  10: [4,  10],
  15: [2,   6],
  20: [1,   4],
};
