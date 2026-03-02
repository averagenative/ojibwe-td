/**
 * Idle animation definitions for commander portraits on the selection screen.
 *
 * This module is Phaser-free and can be imported in unit tests without a DOM
 * or canvas stub.  Follows the same data-driven pattern as creepAnimDefs.ts
 * and towerAnimDefs.ts.
 *
 * Each commander has:
 *  - Breathing parameters (scaleY/scaleX oscillation on a slow sine wave)
 *  - A weighted expression pool for micro-animations (blink, smirk, etc.)
 *  - An elemental alignment for ambient particle effects
 *  - Personality that influences expression weights
 */

// ── Types ────────────────────────────────────────────────────────────────────

/** Expression micro-animation types. */
export type ExpressionType = 'blink' | 'smirk' | 'brow-furrow' | 'glance';

/** Commander elemental alignment for ambient particle effects. */
export type CommanderElement = 'nature' | 'ice' | 'lightning' | 'fire' | 'spirit';

/** Commander personality archetype — drives expression weighting. */
export type CommanderPersonality = 'wise' | 'aggressive' | 'trickster';

/**
 * Per-commander animation parameters used by CommanderSelectScene.
 */
export interface CommanderAnimDef {
  /** Breathing cycle duration in ms (~3000 = 3 seconds). */
  breathRateMs: number;

  /** Peak scaleY amplitude above 1.0 (e.g. 0.01 = 1.0 → 1.01). */
  breathAmpY: number;

  /** Peak scaleX contraction below 1.0 (e.g. 0.005 = 1.0 → 0.995). */
  breathAmpX: number;

  /** Personality archetype — determines expression weighting. */
  personality: CommanderPersonality;

  /** Elemental alignment for ambient particle effects. */
  element: CommanderElement;

  /**
   * Weighted expression pool. Each entry is [type, weight].
   * Weights are relative (don't need to sum to 1).
   */
  expressionPool: readonly [ExpressionType, number][];
}

// ── Expression pools by personality ──────────────────────────────────────────

/** Wise: slow blinks, gentle smiles. */
const WISE_EXPRESSIONS: readonly [ExpressionType, number][] = [
  ['blink', 4],
  ['smirk', 3],
  ['brow-furrow', 1],
  ['glance', 2],
];

/** Aggressive: glares and brow furrows. */
const AGGRESSIVE_EXPRESSIONS: readonly [ExpressionType, number][] = [
  ['blink', 2],
  ['smirk', 1],
  ['brow-furrow', 4],
  ['glance', 3],
];

/** Trickster: smirks and glances. */
const TRICKSTER_EXPRESSIONS: readonly [ExpressionType, number][] = [
  ['blink', 2],
  ['smirk', 4],
  ['brow-furrow', 1],
  ['glance', 3],
];

// ── Per-commander definitions ────────────────────────────────────────────────

const COMMANDER_ANIM_DEFS: Readonly<Record<string, CommanderAnimDef>> = {
  nokomis: {
    breathRateMs: 3200,        // calm, slow breath
    breathAmpY: 0.01,
    breathAmpX: 0.005,
    personality: 'wise',
    element: 'nature',
    expressionPool: WISE_EXPRESSIONS,
  },
  bizhiw: {
    breathRateMs: 2800,        // alert, slightly faster
    breathAmpY: 0.01,
    breathAmpX: 0.005,
    personality: 'aggressive',
    element: 'ice',
    expressionPool: AGGRESSIVE_EXPRESSIONS,
  },
  animikiikaa: {
    breathRateMs: 2600,        // intense, quicker breath
    breathAmpY: 0.012,
    breathAmpX: 0.006,
    personality: 'aggressive',
    element: 'lightning',
    expressionPool: AGGRESSIVE_EXPRESSIONS,
  },
  makoons: {
    breathRateMs: 2400,        // powerful, deep breaths
    breathAmpY: 0.014,
    breathAmpX: 0.007,
    personality: 'aggressive',
    element: 'fire',
    expressionPool: AGGRESSIVE_EXPRESSIONS,
  },
  oshkaabewis: {
    breathRateMs: 2900,        // quick, restless
    breathAmpY: 0.01,
    breathAmpX: 0.005,
    personality: 'trickster',
    element: 'spirit',
    expressionPool: TRICKSTER_EXPRESSIONS,
  },
  waabizii: {
    breathRateMs: 3400,        // serene, slowest
    breathAmpY: 0.009,
    breathAmpX: 0.004,
    personality: 'wise',
    element: 'spirit',
    expressionPool: WISE_EXPRESSIONS,
  },
};

// ── Fallback default ─────────────────────────────────────────────────────────

export const DEFAULT_COMMANDER_ANIM: Readonly<CommanderAnimDef> = {
  breathRateMs: 3000,
  breathAmpY: 0.01,
  breathAmpX: 0.005,
  personality: 'wise',
  element: 'nature',
  expressionPool: WISE_EXPRESSIONS,
};

// ── Lookup ───────────────────────────────────────────────────────────────────

/**
 * Look up the animation definition for a commander by their ID.
 * Returns DEFAULT_COMMANDER_ANIM for unknown IDs.
 */
export function getCommanderAnimDef(commanderId: string): CommanderAnimDef {
  return COMMANDER_ANIM_DEFS[commanderId] ?? DEFAULT_COMMANDER_ANIM;
}

// ── Expression picker helper ─────────────────────────────────────────────────

/**
 * Pick a random expression from the weighted pool.
 * Uses a simple weighted random selection.
 *
 * @param pool  Weighted expression pool from CommanderAnimDef.
 * @returns     A randomly selected expression type.
 */
export function pickExpression(
  pool: readonly [ExpressionType, number][],
): ExpressionType {
  let totalWeight = 0;
  for (const [, w] of pool) totalWeight += w;

  let roll = Math.random() * totalWeight;
  for (const [expr, w] of pool) {
    roll -= w;
    if (roll <= 0) return expr;
  }
  // Fallback (should not reach here).
  return pool[0][0];
}

// ── Expression timing constants ──────────────────────────────────────────────

/** Minimum interval between expressions (ms). */
export const EXPRESSION_MIN_INTERVAL = 5000;
/** Maximum interval between expressions (ms). */
export const EXPRESSION_MAX_INTERVAL = 10000;
