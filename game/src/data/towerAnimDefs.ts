/**
 * Procedural idle and attack animation definitions for all tower types.
 *
 * This module is Phaser-free and can be imported in unit tests without a DOM
 * or canvas stub.  All animation state is driven by per-tower `_idlePhase`
 * and `_barrelAngle` accumulators (from Tower.ts), which advance each frame
 * and naturally pause when the game is paused.
 *
 * Idle types:
 *  - 'sweep'     — Cannon: slow barrel rotation scanning for targets (±sweepDeg)
 *  - 'pulse'     — Frost/Arrow: gentle scale breathing (pulseScale amplitude)
 *  - 'spark'     — Tesla: periodic random electric arcs around coil tips
 *  - 'bob'       — Mortar: slow up-down barrel elevation bob (bobAmpY px)
 *  - 'bubble'    — Poison: periodic green bubble particles rising from cauldron
 *  - 'aura-idle' — Aura: radial pulse already handled by stepAuraPulse(); no-op here
 *
 * All amplitude values are BASE values; multiply by `tierIntensity(tier)` at
 * runtime to scale with upgrade level.
 */

/** Visual idle personality of a tower. */
export type TowerIdleType =
  | 'sweep'
  | 'pulse'
  | 'spark'
  | 'bob'
  | 'bubble'
  | 'aura-idle';

/**
 * Per-tower animation parameters used by Tower._stepIdleAnim() and
 * Tower._playFireAnim().
 */
export interface TowerAnimDef {
  /** Idle animation type. */
  idleType: TowerIdleType;

  /**
   * Cannon/Mortar idle sweep: half-angle of the oscillation sweep in degrees.
   * Container rotates in range [−sweepDeg, +sweepDeg] while no target is active.
   */
  sweepDeg: number;

  /**
   * Frost/Arrow idle pulse: scale amplitude (0.05 = ±5% body scale breathing).
   * Body scaleX/Y = tierSizeScale × (1 + sin(phase) × pulseScale).
   */
  pulseScale: number;

  /**
   * Mortar idle bob: peak vertical displacement in container-local pixels.
   * Body Y offset = sin(phase) × bobAmpY × tierIntensity.
   */
  bobAmpY: number;

  /**
   * Tesla idle spark: milliseconds between random spark arc draws.
   * Actual interval = sparkIntervalMs / tierIntensity (faster at higher tier).
   */
  sparkIntervalMs: number;

  /**
   * Poison idle bubble: milliseconds between bubble particle spawns.
   * Actual interval = bubbleIntervalMs / tierIntensity.
   */
  bubbleIntervalMs: number;

  /**
   * Idle animation frequency: cycles per second for the sin-based idle phase.
   * idlePhase advances at idleFreq × 2π per second.
   */
  idleFreq: number;

  /**
   * Barrel-tracking lerp rate: max degrees the barrel rotates per frame toward
   * the visual target.  ~10°/frame gives smooth but responsive tracking.
   */
  lerpDegPerFrame: number;

  /**
   * Tesla lean: maximum container rotation in degrees toward the current target.
   * Subtle ±3° lean gives the coil a sense of reaching toward its prey.
   */
  leanDeg: number;

  // ── Fire animation parameters ─────────────────────────────────────────────

  /**
   * Cannon/Arrow recoil: body scale factor at peak recoil (0.9 = shrinks 10%).
   * Body snaps to recoilScale on fire, tweens back to 1.0 over recoilMs.
   */
  recoilScale: number;

  /**
   * Cannon/Arrow recoil: tween duration in ms for the scale-back animation.
   */
  recoilMs: number;

  /**
   * Tesla flash / Frost pulse: duration of the bright flash on firing (ms).
   * Tesla: entire body flashes white for this many ms.
   * Frost: body stays enlarged for this many ms before scaling back.
   */
  fireFlashMs: number;

  /**
   * Frost fire pulse: peak scale factor added on top of tierSizeScale on firing.
   * Body scale = tierSizeScale × (1 + firePulseScale) at peak, then eases back.
   */
  firePulseScale: number;

  /**
   * Mortar kick: barrel rotation offset in degrees on firing (positive = kick up).
   * Applied instantly on fire, eases back to tracking angle over kickMs.
   */
  kickDeg: number;

  /**
   * Mortar kick: tween duration in ms for the kick-back animation.
   */
  kickMs: number;
}

// ── Per-tower animation definitions ──────────────────────────────────────────

const TOWER_ANIM_DEFS: Readonly<Record<string, TowerAnimDef>> = {
  // @deprecated — cannon was replaced by rock-hurler (TASK-098); kept for legacy save compatibility
  cannon: {
    idleType:        'sweep',
    sweepDeg:        10,
    pulseScale:      0,
    bobAmpY:         0,
    sparkIntervalMs: 0,
    bubbleIntervalMs: 0,
    idleFreq:        0.25,       // slow scan: 1 sweep cycle every 4 s
    lerpDegPerFrame: 10,
    leanDeg:         0,
    recoilScale:     0.9,
    recoilMs:        120,
    fireFlashMs:     0,
    firePulseScale:  0,
    kickDeg:         0,
    kickMs:          0,
  },

  frost: {
    idleType:        'pulse',
    sweepDeg:        0,
    pulseScale:      0.05,       // ±5% breathing scale
    bobAmpY:         0,
    sparkIntervalMs: 0,
    bubbleIntervalMs: 0,
    idleFreq:        0.8,        // ~0.8 Hz gentle pulse
    lerpDegPerFrame: 0,
    leanDeg:         0,
    recoilScale:     0,
    recoilMs:        0,
    fireFlashMs:     150,        // 150 ms expansion flash
    firePulseScale:  0.08,       // peak 1.08× scale on firing
    kickDeg:         0,
    kickMs:          0,
  },

  tesla: {
    idleType:        'spark',
    sweepDeg:        0,
    pulseScale:      0,
    bobAmpY:         0,
    sparkIntervalMs: 500,        // spark arc every 500 ms at base
    bubbleIntervalMs: 0,
    idleFreq:        1.0,
    lerpDegPerFrame: 0,
    leanDeg:         3,          // ±3° lean toward target
    recoilScale:     0,
    recoilMs:        0,
    fireFlashMs:     80,         // 80 ms white flash on fire
    firePulseScale:  0,
    kickDeg:         0,
    kickMs:          0,
  },

  mortar: {
    idleType:        'bob',
    sweepDeg:        8,          // sweepDeg reused for barrel sweep fallback
    pulseScale:      0,
    bobAmpY:         3,          // ±3 px elevation bob
    sparkIntervalMs: 0,
    bubbleIntervalMs: 0,
    idleFreq:        0.4,        // slow elevation adjustment
    lerpDegPerFrame: 10,
    leanDeg:         0,
    recoilScale:     0,
    recoilMs:        0,
    fireFlashMs:     0,
    firePulseScale:  0,
    kickDeg:         15,         // +15° upward rotation on fire
    kickMs:          200,
  },

  poison: {
    idleType:        'bubble',
    sweepDeg:        0,
    pulseScale:      0,
    bobAmpY:         0,
    sparkIntervalMs: 0,
    bubbleIntervalMs: 400,       // bubble every 400 ms
    idleFreq:        0.6,
    lerpDegPerFrame: 0,
    leanDeg:         0,
    recoilScale:     0,
    recoilMs:        0,
    fireFlashMs:     0,
    firePulseScale:  0,
    kickDeg:         0,
    kickMs:          0,
  },

  aura: {
    idleType:        'aura-idle',
    sweepDeg:        0,
    pulseScale:      0,
    bobAmpY:         0,
    sparkIntervalMs: 0,
    bubbleIntervalMs: 0,
    idleFreq:        0.35,       // matches auraPulsePhase rate in Tower.ts
    lerpDegPerFrame: 0,
    leanDeg:         0,
    recoilScale:     0,
    recoilMs:        0,
    fireFlashMs:     0,
    firePulseScale:  0,
    kickDeg:         0,
    kickMs:          0,
  },

  'rock-hurler': {
    // Heavy rock thrower: barrel bobs while scanning, strong kick on fire
    idleType:        'bob',
    sweepDeg:        10,         // sweepDeg reused for barrel sweep during bob idle
    pulseScale:      0,
    bobAmpY:         4,          // ±4 px heavy elevation bob
    sparkIntervalMs: 0,
    bubbleIntervalMs: 0,
    idleFreq:        0.35,       // slow heavy rock rhythm
    lerpDegPerFrame: 8,
    leanDeg:         0,
    recoilScale:     0,
    recoilMs:        0,
    fireFlashMs:     0,
    firePulseScale:  0,
    kickDeg:         20,         // +20° upward kick on fire
    kickMs:          250,
  },

  arrow: {
    idleType:        'pulse',
    sweepDeg:        0,
    pulseScale:      0.04,       // ±4% subtle breathing
    bobAmpY:         0,
    sparkIntervalMs: 0,
    bubbleIntervalMs: 0,
    idleFreq:        0.7,
    lerpDegPerFrame: 0,
    leanDeg:         0,
    recoilScale:     0.92,       // snappier recoil than rock-hurler
    recoilMs:        100,
    fireFlashMs:     0,
    firePulseScale:  0,
    kickDeg:         0,
    kickMs:          0,
  },
};

// ── Fallback default ──────────────────────────────────────────────────────────

export const DEFAULT_TOWER_ANIM: Readonly<TowerAnimDef> = {
  idleType:        'pulse',
  sweepDeg:        0,
  pulseScale:      0.03,
  bobAmpY:         0,
  sparkIntervalMs: 0,
  bubbleIntervalMs: 0,
  idleFreq:        0.5,
  lerpDegPerFrame: 10,
  leanDeg:         0,
  recoilScale:     0.95,
  recoilMs:        120,
  fireFlashMs:     80,
  firePulseScale:  0,
  kickDeg:         0,
  kickMs:          0,
};

/**
 * Look up the animation definition for a tower by its TowerDef key.
 * Returns DEFAULT_TOWER_ANIM for unknown keys.
 */
export function getTowerAnimDef(key: string): TowerAnimDef {
  return TOWER_ANIM_DEFS[key] ?? DEFAULT_TOWER_ANIM;
}

// ── Tier scaling helpers ──────────────────────────────────────────────────────

/**
 * Returns an intensity multiplier based on the tower's current upgrade tier.
 * Higher tiers produce more energetic idle animations.
 *
 * Brackets:
 *   Tier 0–2 → 1.00 (base)
 *   Tier 3–4 → 1.30 (more energetic)
 *   Tier 5   → 1.65 (max — visually distinct max-tier feel)
 */
export function tierIntensity(tier: number): number {
  if (tier >= 5) return 1.65;
  if (tier >= 3) return 1.30;
  return 1.00;
}

/**
 * Returns a body-size scale multiplier based on the tower's upgrade tier.
 * Higher tiers appear slightly larger, reinforcing visual upgrade progression.
 *
 * Brackets:
 *   Tier 0–2 → 1.00 (base)
 *   Tier 3–4 → 1.08 (+8%)
 *   Tier 5   → 1.16 (+16%)
 */
export function tierSizeScale(tier: number): number {
  if (tier >= 5) return 1.16;
  if (tier >= 3) return 1.08;
  return 1.00;
}

// ── Angle helper ──────────────────────────────────────────────────────────────

/**
 * Lerp an angle (degrees) from `from` toward `to` by at most `maxStep` degrees,
 * always taking the shortest arc through ±180°.
 * Handles JavaScript's negative-modulo behaviour correctly.
 *
 * @param from     Current angle in degrees.
 * @param to       Target angle in degrees.
 * @param maxStep  Maximum rotation per call (degrees).  ≤ 0 returns `from` unchanged.
 * @returns        New angle, never further than `maxStep` degrees from `from`.
 */
export function lerpAngleDeg(from: number, to: number, maxStep: number): number {
  if (maxStep <= 0) return from;
  // Normalise delta to [-180, +180] — the shortest-arc direction.
  const delta = ((to - from) % 360 + 540) % 360 - 180;
  if (Math.abs(delta) <= maxStep) return to;
  return from + Math.sign(delta) * maxStep;
}
