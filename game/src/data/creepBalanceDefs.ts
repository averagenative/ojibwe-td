/**
 * Phaser-free creep balance constants used by Creep.ts and unit tests.
 * Centralised here so tests can import without pulling in Phaser.
 */

// ── Frost slow balance constants ──────────────────────────────────────────────

/**
 * Minimum allowed slow factor applied to a creep.
 * A factor of 0.40 means the creep moves at 40% speed (60% reduction).
 * Prevents extreme perma-slow from deep Path-A upgrades (old uncapped minimum ~0.12).
 */
export const SLOW_FACTOR_CAP = 0.40;

/**
 * Duration (ms) a creep is immune to re-slow after a slow expires naturally.
 * Prevents a single frost tower from perma-slowing via timer refreshes.
 */
export const SLOW_IMMUNE_COOLDOWN_MS = 2000;
