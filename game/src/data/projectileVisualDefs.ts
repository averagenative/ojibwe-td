/**
 * Per-tower projectile visual configuration.
 *
 * Each entry describes what programmatic shape Projectile.ts draws
 * for that tower type during flight.
 *
 * NO Phaser import — safe to load in unit tests.
 */

// ── Shape types ───────────────────────────────────────────────────────────────

/**
 * Shape identifier used by Projectile.ts to select the drawing routine.
 *
 * - 'arrow'       — shaft + arrowhead triangle + fletching; rotates to face travel direction
 * - 'rock'        — rough irregular polygon; tumbles during flight; size varies per instance
 * - 'frost-shard' — 6-pointed ice crystal / snowflake; no rotation
 * - 'poison-blob' — rounded blob with a small drip; slight wobble scale tween
 * - 'none'        — no custom shape; the default Phaser Arc remains visible
 *                   (also used for tesla which draws its visual at impact)
 */
export type ProjectileShape =
  | 'arrow'
  | 'rock'
  | 'frost-shard'
  | 'poison-blob'
  | 'none';

// ── Config interface ──────────────────────────────────────────────────────────

export interface ProjectileVisualConfig {
  /**
   * Shape drawn by Projectile.ts graphics.
   * 'none' keeps the default Arc circle visible.
   */
  shape:   ProjectileShape;

  /** Primary fill/stroke colour for the programmatic shape. */
  color:   number;

  /**
   * Whether the graphics object rotates to face the direction of travel.
   * Only meaningful for oriented shapes (arrow, rock).
   */
  rotates: boolean;

  /**
   * Base half-size in pixels.
   * Arrow: half shaft length. Rock: base polygon radius. Crystal: arm length.
   * Blob: x-radius. Ignored when shape === 'none'.
   */
  size:    number;
}

// ── Per-tower configs ─────────────────────────────────────────────────────────

/**
 * Indexed by tower `def.key`.
 * All six gameplay tower types are represented; mortar falls back to 'none'
 * since it is removed from the main build pool.
 * Cannon entry kept for legacy save compatibility (@deprecated).
 */
export const PROJECTILE_VISUAL_CONFIGS: Readonly<Record<string, ProjectileVisualConfig>> = {
  arrow:         { shape: 'arrow',        color: 0xc4a265, rotates: true,  size: 10 },
  'rock-hurler': { shape: 'rock',         color: 0xcc9944, rotates: true,  size: 8  },
  frost:         { shape: 'frost-shard',  color: 0x88ccff, rotates: false, size: 7  },
  poison:        { shape: 'poison-blob',  color: 0x55ff99, rotates: false, size: 6  },
  tesla:         { shape: 'none',         color: 0xffff44, rotates: false, size: 4  },
  aura:          { shape: 'none',         color: 0xffcc22, rotates: false, size: 0  },
  // @deprecated — cannon replaced by rock-hurler (TASK-098); kept for legacy save compatibility
  cannon:        { shape: 'none',         color: 0xffdd00, rotates: false, size: 5  },
  // Legacy / fallback tower type
  mortar:        { shape: 'none',         color: 0xff8800, rotates: false, size: 7  },
};

// ── Rotation math helpers ─────────────────────────────────────────────────────
// These are pure functions, safe to call in tests without Phaser.

/**
 * Compute the travel angle (radians) from a velocity vector.
 * Returns 0 when both components are zero (stationary — no rotation change).
 */
export function travelAngle(dx: number, dy: number): number {
  if (dx === 0 && dy === 0) return 0;
  return Math.atan2(dy, dx);
}

/**
 * Advance the rock tumble phase by `delta` milliseconds.
 * Tumble speed is 1.8 rad/s — one full rotation every ~3.5 seconds,
 * fast enough to read as "tumbling" at normal game speed.
 */
export const ROCK_TUMBLE_SPEED_RAD_S = 1.8;

export function advanceTumble(currentPhase: number, deltaMs: number): number {
  return currentPhase + (deltaMs / 1000) * ROCK_TUMBLE_SPEED_RAD_S;
}

/**
 * The 3 rock size variants (offset in pixels added to base size).
 * Chosen per-projectile instance for visual variety.
 */
export const ROCK_SIZE_VARIANTS = [0, 2, 3.5] as const;
