/**
 * Status effect visual configurations — no Phaser dependency.
 *
 * Defines per-effect particle and overlay parameters used by Creep.ts.
 * Kept in a separate file so the pure-data logic can be unit-tested without
 * mocking Phaser.
 */

/**
 * Configuration for one status-effect visual layer.
 * All numeric colours are packed 0xRRGGBB values.
 */
export interface StatusEffectVisualConfig {
  /** Colour for rising particle arcs. */
  particleColor:  number;
  /** Colour of the semi-transparent tint overlay on the creep body. */
  tintColor:      number;
  /** Base alpha [0–1] for the tint overlay. */
  tintAlpha:      number;
  /** Number of particle arcs active at once (base value; may be scaled per stack). */
  particleCount:  number;
  /** Lifetime of each particle arc in milliseconds. */
  particleLifeMs: number;
  /** Short identifier token used in the status icon bar. */
  icon:           string;
}

/** The canonical set of named status effects that have visual indicators. */
export type StatusEffectKey = 'poison' | 'frost' | 'burn' | 'tesla' | 'armorShred';

/**
 * Visual configuration for every status effect.
 * Consuming code can read these at runtime and test code can validate them
 * without any Phaser dependency.
 */
export const EFFECT_CONFIGS: Record<StatusEffectKey, StatusEffectVisualConfig> = {
  poison: {
    particleColor:  0x33ff55,
    tintColor:      0x33ff55,
    tintAlpha:      0.22,
    particleCount:  3,
    particleLifeMs: 420,
    icon:           'poison-drop',
  },
  frost: {
    particleColor:  0xaae4ff,
    tintColor:      0x5599ff,
    tintAlpha:      0.28,
    particleCount:  4,
    particleLifeMs: 500,
    icon:           'snowflake',
  },
  burn: {
    particleColor:  0xff6622,
    tintColor:      0xff8833,
    tintAlpha:      0.28,
    particleCount:  3,
    particleLifeMs: 300,
    icon:           'flame',
  },
  tesla: {
    particleColor:  0xeeffaa,
    tintColor:      0xffff55,
    tintAlpha:      0.22,
    particleCount:  4,
    particleLifeMs: 180,
    icon:           'lightning',
  },
  armorShred: {
    particleColor:  0xff4400,
    tintColor:      0xff2200,
    tintAlpha:      0.18,
    particleCount:  0,
    particleLifeMs: 0,
    icon:           'broken-shield',
  },
};

/** Overlay alpha for shatter (deep-freeze Frost-C) — more intense than base frost. */
export const SHATTER_OVERLAY_ALPHA = 0.52;

/** Icon-bar dot radius in pixels (drawn in Graphics). */
export const ICON_RADIUS = 3;

/** Y offset for the icon bar above the HP bar background. */
export const ICON_BAR_OFFSET_Y = -29;

// ── Stack-scaling helpers ─────────────────────────────────────────────────────

/**
 * Active particle count for poison given the current stack count.
 * Each additional stack beyond the first adds one more particle, capped at 8.
 */
export function poisonParticleCount(stacks: number): number {
  if (stacks <= 0) return 0;
  return Math.min(8, EFFECT_CONFIGS.poison.particleCount + (stacks - 1));
}

/**
 * Tint overlay alpha for poison scaled by stack count, capped at 0.6.
 * More stacks → more intense green wash.
 */
export function poisonOverlayAlpha(stacks: number): number {
  if (stacks <= 0) return 0;
  return Math.min(0.6, EFFECT_CONFIGS.poison.tintAlpha * stacks);
}

/**
 * Tint overlay alpha for frost.
 * Shatter (deep-freeze) uses a higher alpha for a pale-blue-white wash.
 */
export function frostOverlayAlpha(shatter: boolean): number {
  return shatter ? SHATTER_OVERLAY_ALPHA : EFFECT_CONFIGS.frost.tintAlpha;
}

// ── Icon-bar layout helpers ───────────────────────────────────────────────────

/** Icon colour for each effect (for drawing the icon bar dots). */
export const ICON_COLORS: Record<StatusEffectKey, number> = {
  poison:    0x33ff55,
  frost:     0x88ccff,
  burn:      0xff6622,
  tesla:     0xffff44,
  armorShred: 0xff4400,
};

/**
 * Compute the list of currently-active effect keys in a stable display order.
 * Used by the icon bar renderer.
 */
export function activeEffectKeys(
  poisoned:  boolean,
  slowed:    boolean,
  burning:   boolean,
  shocked:   boolean,
  shredded:  boolean,
): StatusEffectKey[] {
  const keys: StatusEffectKey[] = [];
  if (poisoned)  keys.push('poison');
  if (slowed)    keys.push('frost');
  if (burning)   keys.push('burn');
  if (shocked)   keys.push('tesla');
  if (shredded)  keys.push('armorShred');
  return keys;
}
