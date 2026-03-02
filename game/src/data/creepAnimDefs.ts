/**
 * Procedural walk/flight animation definitions for all creep types.
 *
 * This module is Phaser-free and can be imported in unit tests without a DOM
 * or canvas stub.  All animation state is driven by the creep's `bobPhase`
 * accumulator (from Creep.ts), which advances proportionally to movement speed
 * and therefore naturally pauses when the creep is frozen or the game is
 * paused.
 *
 * Animation approach:
 *  - Ground creeps: squash-and-stretch (scaleX / scaleY oscillation) synced to
 *    movement speed, giving a walk/trot/waddle feel.
 *  - Air creeps: squash-stretch on the body + wing-rotation on the rect-path
 *    wing stubs (±wingRotAmp radians), and a shadow-width pulse.
 *  - Bosses: larger amplitudes and per-boss styles (lumber/strut/hop/crackle).
 *
 * The `freqMult` field multiplies the current `bobPhase` to control how many
 * animation cycles occur per bobbing period:
 *   freqMult 1 = same period as the Y-bob (~2 Hz at 80 px/s)
 *   freqMult 2 = twice as fast (~4 Hz)
 *   freqMult 3 = three times (~6 Hz)
 */

/** Visual personality of a creep's movement animation. */
export type CreepAnimStyle =
  | 'trot'         // normal ground creep (deer) — gentle trot
  | 'sprint'       // fast ground creep (fox) — rapid stride
  | 'waddle'       // armoured (porcupine/turtle) — slow heavy waddle
  | 'float'        // immune (spirit) — gentle floating pulse
  | 'slither'      // regen (salamander) — body wave with tail sway
  | 'flap-basic'   // basic air creep — steady medium wing-flap
  | 'flap-scout'   // scout air creep (hawk) — quick sharp flaps
  | 'flap-heavy'   // armoured air creep (raven) — slow heavy wingbeats
  | 'lumber'       // Makwa boss — heavy side-swaying lumber
  | 'strut'        // Migizi boss — proud fast strut
  | 'hop'          // Waabooz boss — bounce cycle (crouch → leap → land → pause)
  | 'crackle';     // Animikiins boss — rapid energy-crackle pulse

/**
 * Per-creep animation parameters used by Creep._stepWalkAnim().
 */
export interface CreepAnimDef {
  style: CreepAnimStyle;

  /**
   * Squash-and-stretch X amplitude.
   * Body scaleX = 1 ± squashAmpX (e.g. 0.08 → body oscillates 92%–108% width).
   */
  squashAmpX: number;

  /**
   * Squash-and-stretch Y amplitude.
   * Applied inversely to squashAmpX for visual conservation-of-volume feel:
   *   scaleY = 1 ∓ squashAmpY
   */
  squashAmpY: number;

  /**
   * Frequency multiplier applied to the current bobPhase.
   * Higher = faster animation cycle relative to movement speed.
   */
  freqMult: number;

  /**
   * When true, uses Math.abs(sin(phase)) instead of sin(phase) for the
   * squash-and-stretch, producing a "one-sided" bounce pattern (always
   * compresses → never stretches above neutral on one axis).
   * Used for Waabooz hop-cycle to simulate a ground-contact bounce.
   */
  useBounce: boolean;

  /**
   * Horizontal body sway amplitude in container-local pixels (0 = no sway).
   * Adds a side-to-side X offset oscillation independent of the squash-stretch.
   * Used for Makwa lumber and salamander slither.
   */
  swayAmpX: number;

  /**
   * Wing rotation amplitude in radians (rect-path air creeps only).
   * Left wing rotates −wingRotAmp … 0 … +wingRotAmp; right wing mirrors it.
   * Set to 0 for ground creeps and sprite-path air creeps (body squash
   * already conveys the flap on those).
   */
  wingRotAmp: number;

  /**
   * Shadow scaleX pulse amplitude for air creeps.
   * Shadow scaleX = 1 + shadowAmp × |sin(bobPhase × freqMult)|
   * Set to 0 for ground creeps.
   */
  shadowAmp: number;
}

// ── Ground creep definitions by sprite key ────────────────────────────────────

const GROUND_ANIM_DEFS: Readonly<Record<string, CreepAnimDef>> = {
  'creep-normal': {
    style: 'trot',
    squashAmpX: 0.07, squashAmpY: 0.07,
    freqMult: 2, useBounce: false,
    swayAmpX: 0, wingRotAmp: 0, shadowAmp: 0,
  },
  'creep-fast': {
    style: 'sprint',
    squashAmpX: 0.10, squashAmpY: 0.10,
    freqMult: 3, useBounce: false,
    swayAmpX: 0, wingRotAmp: 0, shadowAmp: 0,
  },
  'creep-armored': {
    style: 'waddle',
    squashAmpX: 0.05, squashAmpY: 0.05,
    freqMult: 1, useBounce: false,
    swayAmpX: 0, wingRotAmp: 0, shadowAmp: 0,
  },
  'creep-immune': {
    style: 'float',
    squashAmpX: 0.04, squashAmpY: 0.04,
    freqMult: 1, useBounce: false,
    swayAmpX: 0, wingRotAmp: 0, shadowAmp: 0,
  },
  'creep-regen': {
    style: 'slither',
    squashAmpX: 0.09, squashAmpY: 0.05,
    freqMult: 2, useBounce: false,
    swayAmpX: 2.5, wingRotAmp: 0, shadowAmp: 0,
  },
};

// ── Air creep definitions by sprite key ──────────────────────────────────────

const AIR_ANIM_DEFS: Readonly<Record<string, CreepAnimDef>> = {
  'creep-air-basic': {
    style: 'flap-basic',
    squashAmpX: 0.08, squashAmpY: 0.05,
    freqMult: 2, useBounce: false,
    swayAmpX: 0, wingRotAmp: 0.26, shadowAmp: 0.12,
  },
  'creep-air-scout': {
    style: 'flap-scout',
    squashAmpX: 0.10, squashAmpY: 0.06,
    freqMult: 3, useBounce: false,
    swayAmpX: 0, wingRotAmp: 0.35, shadowAmp: 0.10,
  },
  'creep-air-armored': {
    style: 'flap-heavy',
    squashAmpX: 0.06, squashAmpY: 0.04,
    freqMult: 1.5, useBounce: false,
    swayAmpX: 0, wingRotAmp: 0.20, shadowAmp: 0.08,
  },
};

// ── Boss definitions by boss key ──────────────────────────────────────────────

const BOSS_ANIM_DEFS: Readonly<Record<string, CreepAnimDef>> = {
  'makwa': {
    style: 'lumber',
    squashAmpX: 0.08, squashAmpY: 0.06,
    freqMult: 1, useBounce: false,
    swayAmpX: 3.0, wingRotAmp: 0, shadowAmp: 0,
  },
  'migizi': {
    style: 'strut',
    squashAmpX: 0.06, squashAmpY: 0.06,
    freqMult: 2.5, useBounce: false,
    swayAmpX: 0, wingRotAmp: 0, shadowAmp: 0,
  },
  'waabooz': {
    style: 'hop',
    squashAmpX: 0.10, squashAmpY: 0.12,
    freqMult: 1.5, useBounce: true,
    swayAmpX: 0, wingRotAmp: 0, shadowAmp: 0,
  },
  'animikiins': {
    style: 'crackle',
    squashAmpX: 0.07, squashAmpY: 0.07,
    freqMult: 3.5, useBounce: false,
    swayAmpX: 1.5, wingRotAmp: 0, shadowAmp: 0,
  },
};

// ── Fallback defaults ─────────────────────────────────────────────────────────

export const DEFAULT_GROUND_ANIM: Readonly<CreepAnimDef> = {
  style: 'trot',
  squashAmpX: 0.06, squashAmpY: 0.06,
  freqMult: 2, useBounce: false,
  swayAmpX: 0, wingRotAmp: 0, shadowAmp: 0,
};

export const DEFAULT_AIR_ANIM: Readonly<CreepAnimDef> = {
  style: 'flap-basic',
  squashAmpX: 0.07, squashAmpY: 0.05,
  freqMult: 2, useBounce: false,
  swayAmpX: 0, wingRotAmp: 0.26, shadowAmp: 0.10,
};

/**
 * Look up the animation definition for a creep based on its sprite key,
 * creature type, and boss classification.
 *
 * Endless-mode boss keys have the form `<base>-ew<n>` (e.g. `makwa-ew25`).
 * The `-ew<n>` suffix is stripped before the lookup so the same animation
 * applies to all scaled boss variants.
 *
 * @param spriteKey  Phaser texture key (e.g. 'creep-fast', 'boss-makwa').
 * @param creepType  'ground' or 'air'.
 * @param isBoss     True when this is a boss creep.
 * @param bossKey    Boss identifier key (e.g. 'makwa', 'waabooz').
 */
export function getCreepAnimDef(
  spriteKey: string | undefined,
  creepType: 'ground' | 'air',
  isBoss: boolean,
  bossKey: string,
): CreepAnimDef {
  if (isBoss) {
    // Strip endless-mode suffix (e.g. 'makwa-ew25' → 'makwa').
    const baseBossKey = bossKey.replace(/-ew\d+$/, '');
    return BOSS_ANIM_DEFS[baseBossKey] ?? DEFAULT_GROUND_ANIM;
  }
  if (creepType === 'air') {
    return AIR_ANIM_DEFS[spriteKey ?? ''] ?? DEFAULT_AIR_ANIM;
  }
  return GROUND_ANIM_DEFS[spriteKey ?? ''] ?? DEFAULT_GROUND_ANIM;
}
