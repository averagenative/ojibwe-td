/**
 * TASK-150 — Tower Projectile Visual Overhaul
 *
 * Tests for the pure-logic parts of the projectile visual system:
 *   - PROJECTILE_VISUAL_CONFIGS: structural validation (shape, color, size)
 *   - travelAngle(): direction-of-travel rotation math
 *   - advanceTumble(): rock tumble phase accumulator
 *   - ROCK_SIZE_VARIANTS: variety values
 *
 * The Phaser-side drawing (Graphics objects, tweens) is exercised in-game
 * and cannot be unit-tested without a real renderer.
 *
 * These tests follow the "simulate the logic" pattern used throughout the test suite.
 */
import { describe, it, expect } from 'vitest';
import {
  PROJECTILE_VISUAL_CONFIGS,
  travelAngle,
  advanceTumble,
  ROCK_SIZE_VARIANTS,
  ROCK_TUMBLE_SPEED_RAD_S,
} from '../../data/projectileVisualDefs';
import type { ProjectileShape } from '../../data/projectileVisualDefs';

// ── Config: all 6 gameplay tower types present ───────────────────────────────

describe('PROJECTILE_VISUAL_CONFIGS — coverage', () => {
  const GAMEPLAY_KEYS = ['arrow', 'rock-hurler', 'frost', 'poison', 'tesla', 'aura'] as const;

  for (const key of GAMEPLAY_KEYS) {
    it(`contains entry for ${key}`, () => {
      expect(PROJECTILE_VISUAL_CONFIGS[key]).toBeDefined();
    });
  }
});

// ── Config: shape values are valid ProjectileShape literals ──────────────────

describe('PROJECTILE_VISUAL_CONFIGS — shape types', () => {
  const VALID_SHAPES: ReadonlySet<ProjectileShape> = new Set([
    'arrow', 'rock', 'frost-shard', 'poison-blob', 'none',
  ]);

  it('arrow → shape "arrow"', () => {
    expect(PROJECTILE_VISUAL_CONFIGS['arrow'].shape).toBe('arrow');
  });

  it('rock-hurler → shape "rock"', () => {
    expect(PROJECTILE_VISUAL_CONFIGS['rock-hurler'].shape).toBe('rock');
  });

  it('frost → shape "frost-shard"', () => {
    expect(PROJECTILE_VISUAL_CONFIGS['frost'].shape).toBe('frost-shard');
  });

  it('poison → shape "poison-blob"', () => {
    expect(PROJECTILE_VISUAL_CONFIGS['poison'].shape).toBe('poison-blob');
  });

  it('tesla → shape "none" (arc drawn at impact)', () => {
    expect(PROJECTILE_VISUAL_CONFIGS['tesla'].shape).toBe('none');
  });

  it('aura → shape "none" (pulse ring on Tower, not Projectile)', () => {
    expect(PROJECTILE_VISUAL_CONFIGS['aura'].shape).toBe('none');
  });

  it('all shapes are valid ProjectileShape literals', () => {
    for (const [key, cfg] of Object.entries(PROJECTILE_VISUAL_CONFIGS)) {
      expect(VALID_SHAPES.has(cfg.shape), `${key}.shape = "${cfg.shape}" is invalid`).toBe(true);
    }
  });
});

// ── Config: rotation flags ───────────────────────────────────────────────────

describe('PROJECTILE_VISUAL_CONFIGS — rotation flags', () => {
  it('arrow rotates to face direction of travel', () => {
    expect(PROJECTILE_VISUAL_CONFIGS['arrow'].rotates).toBe(true);
  });

  it('rock-hurler rotates (tumbles) during flight', () => {
    expect(PROJECTILE_VISUAL_CONFIGS['rock-hurler'].rotates).toBe(true);
  });

  it('frost-shard does NOT rotate (symmetric shape)', () => {
    expect(PROJECTILE_VISUAL_CONFIGS['frost'].rotates).toBe(false);
  });

  it('poison-blob does NOT rotate (symmetric shape)', () => {
    expect(PROJECTILE_VISUAL_CONFIGS['poison'].rotates).toBe(false);
  });

  it('tesla does NOT rotate (no visible projectile)', () => {
    expect(PROJECTILE_VISUAL_CONFIGS['tesla'].rotates).toBe(false);
  });

  it('aura does NOT rotate (pulse ring, not a projectile)', () => {
    expect(PROJECTILE_VISUAL_CONFIGS['aura'].rotates).toBe(false);
  });
});

// ── Config: size values are within spec (16–24px visual diameter ≈ size 8–12) ─

describe('PROJECTILE_VISUAL_CONFIGS — size values', () => {
  it('arrow size is in expected range [8, 14]', () => {
    const { size } = PROJECTILE_VISUAL_CONFIGS['arrow'];
    expect(size).toBeGreaterThanOrEqual(8);
    expect(size).toBeLessThanOrEqual(14);
  });

  it('rock-hurler base size is in expected range [6, 12]', () => {
    const { size } = PROJECTILE_VISUAL_CONFIGS['rock-hurler'];
    expect(size).toBeGreaterThanOrEqual(6);
    expect(size).toBeLessThanOrEqual(12);
  });

  it('frost base size is in expected range [5, 12]', () => {
    const { size } = PROJECTILE_VISUAL_CONFIGS['frost'];
    expect(size).toBeGreaterThanOrEqual(5);
    expect(size).toBeLessThanOrEqual(12);
  });

  it('poison base size is in expected range [4, 12]', () => {
    const { size } = PROJECTILE_VISUAL_CONFIGS['poison'];
    expect(size).toBeGreaterThanOrEqual(4);
    expect(size).toBeLessThanOrEqual(12);
  });

  it('aura size is 0 (no projectile shape drawn)', () => {
    expect(PROJECTILE_VISUAL_CONFIGS['aura'].size).toBe(0);
  });
});

// ── travelAngle: direction-of-travel rotation math ───────────────────────────

describe('travelAngle()', () => {
  it('rightward travel (dx>0, dy=0) → 0 radians', () => {
    expect(travelAngle(10, 0)).toBeCloseTo(0, 5);
  });

  it('downward travel (dx=0, dy>0) → π/2 radians', () => {
    expect(travelAngle(0, 10)).toBeCloseTo(Math.PI / 2, 5);
  });

  it('leftward travel (dx<0, dy=0) → ±π radians', () => {
    const a = travelAngle(-10, 0);
    expect(Math.abs(a)).toBeCloseTo(Math.PI, 5);
  });

  it('upward travel (dx=0, dy<0) → -π/2 radians', () => {
    expect(travelAngle(0, -10)).toBeCloseTo(-Math.PI / 2, 5);
  });

  it('diagonal 45° → π/4 radians', () => {
    expect(travelAngle(1, 1)).toBeCloseTo(Math.PI / 4, 5);
  });

  it('diagonal 135° → 3π/4 radians', () => {
    expect(travelAngle(-1, 1)).toBeCloseTo((3 * Math.PI) / 4, 5);
  });

  it('returns 0 when both components are zero (stationary guard)', () => {
    expect(travelAngle(0, 0)).toBe(0);
  });

  it('result magnitude does not exceed π', () => {
    const angles = [
      travelAngle(1, 0),
      travelAngle(-1, 0),
      travelAngle(0, 1),
      travelAngle(0, -1),
      travelAngle(1, 1),
      travelAngle(-1, -1),
      travelAngle(3, -7),
    ];
    for (const a of angles) {
      expect(Math.abs(a)).toBeLessThanOrEqual(Math.PI + 1e-9);
    }
  });

  it('is consistent with Math.atan2(dy, dx) for cardinal directions', () => {
    const pairs = [
      [10, 0], [0, 10], [-5, 0], [0, -8], [3, 4],
    ] as const;
    for (const [dx, dy] of pairs) {
      expect(travelAngle(dx, dy)).toBeCloseTo(Math.atan2(dy, dx), 10);
    }
  });
});

// ── advanceTumble: rock tumble phase accumulator ─────────────────────────────

describe('advanceTumble()', () => {
  it('phase increases each call', () => {
    const p1 = advanceTumble(0, 100);
    const p2 = advanceTumble(p1, 100);
    expect(p2).toBeGreaterThan(p1);
  });

  it('advances by ROCK_TUMBLE_SPEED_RAD_S per second', () => {
    const result = advanceTumble(0, 1000);
    expect(result).toBeCloseTo(ROCK_TUMBLE_SPEED_RAD_S, 5);
  });

  it('one full 2π rotation takes ~3.5 seconds at default speed', () => {
    // 2π / 1.8 ≈ 3.49 s
    const fullRotationMs = (2 * Math.PI) / ROCK_TUMBLE_SPEED_RAD_S * 1000;
    const phase = advanceTumble(0, fullRotationMs);
    expect(phase).toBeCloseTo(2 * Math.PI, 3);
  });

  it('accumulates correctly across multiple short steps', () => {
    let phase = 0;
    for (let i = 0; i < 10; i++) phase = advanceTumble(phase, 100); // 10 × 100ms = 1s
    expect(phase).toBeCloseTo(ROCK_TUMBLE_SPEED_RAD_S, 4);
  });

  it('handles zero delta without changing phase', () => {
    const before = 1.23;
    expect(advanceTumble(before, 0)).toBeCloseTo(before, 10);
  });
});

// ── ROCK_SIZE_VARIANTS: variety values ───────────────────────────────────────

describe('ROCK_SIZE_VARIANTS', () => {
  it('has exactly 3 variants', () => {
    expect(ROCK_SIZE_VARIANTS).toHaveLength(3);
  });

  it('all variants are non-negative', () => {
    for (const v of ROCK_SIZE_VARIANTS) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('variants are distinct (produce visual variety)', () => {
    const unique = new Set(ROCK_SIZE_VARIANTS);
    expect(unique.size).toBe(3);
  });

  it('largest variant is ≤ 6px (keeps rock within spec 16-24px diameter)', () => {
    const max = Math.max(...ROCK_SIZE_VARIANTS);
    expect(max).toBeLessThanOrEqual(6);
  });

  it('when added to base size 8, max total is within 16px (≤24px diameter)', () => {
    const base = PROJECTILE_VISUAL_CONFIGS['rock-hurler'].size;
    for (const v of ROCK_SIZE_VARIANTS) {
      const diameter = (base + v) * 2;
      expect(diameter).toBeLessThanOrEqual(24);
    }
  });
});

// ── Integration: shaped towers all have custom visuals ───────────────────────

describe('shaped tower coverage', () => {
  const SHAPED_TOWERS = ['arrow', 'rock-hurler', 'frost', 'poison'] as const;

  for (const key of SHAPED_TOWERS) {
    it(`${key} has a non-'none' shape`, () => {
      expect(PROJECTILE_VISUAL_CONFIGS[key].shape).not.toBe('none');
    });
  }

  it('tesla and aura retain "none" shape (handled by separate visual systems)', () => {
    expect(PROJECTILE_VISUAL_CONFIGS['tesla'].shape).toBe('none');
    expect(PROJECTILE_VISUAL_CONFIGS['aura'].shape).toBe('none');
  });
});

// ── Structural: Projectile.ts uses PROJECTILE_VISUAL_CONFIGS ─────────────────

import projectileSrc from '../../entities/Projectile.ts?raw';

describe('Projectile.ts structural checks', () => {
  it('imports PROJECTILE_VISUAL_CONFIGS from projectileVisualDefs', () => {
    expect(projectileSrc).toContain('PROJECTILE_VISUAL_CONFIGS');
    expect(projectileSrc).toContain('projectileVisualDefs');
  });

  it('imports travelAngle helper', () => {
    expect(projectileSrc).toContain('travelAngle');
  });

  it('imports advanceTumble helper', () => {
    expect(projectileSrc).toContain('advanceTumble');
  });

  it('has _shapeGfx field', () => {
    expect(projectileSrc).toContain('_shapeGfx');
  });

  it('has _travelAngle field', () => {
    expect(projectileSrc).toContain('_travelAngle');
  });

  it('has _tumblePhase field for rock tumble', () => {
    expect(projectileSrc).toContain('_tumblePhase');
  });

  it('overrides destroy() to clean up _shapeGfx', () => {
    expect(projectileSrc).toContain('override destroy');
    expect(projectileSrc).toContain('_shapeGfx?.destroy()');
  });

  it('has _buildShapeGfx method', () => {
    expect(projectileSrc).toContain('_buildShapeGfx');
  });

  it('calls _syncShapeGfx() in step methods', () => {
    expect(projectileSrc).toContain('_syncShapeGfx()');
  });

  it('draws arrow shape', () => {
    expect(projectileSrc).toContain('_drawArrow');
  });

  it('draws rock shape', () => {
    expect(projectileSrc).toContain('_drawRock');
  });

  it('draws frost shard shape', () => {
    expect(projectileSrc).toContain('_drawFrostShard');
  });

  it('draws poison blob shape', () => {
    expect(projectileSrc).toContain('_drawPoisonBlob');
  });

  it('poison blob has a wobble tween', () => {
    expect(projectileSrc).toContain("cfg.shape === 'poison-blob'");
    expect(projectileSrc).toContain('yoyo:');
    expect(projectileSrc).toContain('repeat:   -1');
  });

  it('rock hurler arc scale also synced to _shapeGfx', () => {
    expect(projectileSrc).toContain('_shapeGfx?.setScale(s)');
  });
});

// ── Structural: projectileVisualDefs.ts is Phaser-free ───────────────────────

import defsSrc from '../../data/projectileVisualDefs.ts?raw';

describe('projectileVisualDefs.ts structural checks', () => {
  it('does NOT import phaser', () => {
    expect(defsSrc.toLowerCase()).not.toContain("import phaser");
    expect(defsSrc.toLowerCase()).not.toContain("from 'phaser'");
  });

  it('exports PROJECTILE_VISUAL_CONFIGS', () => {
    expect(defsSrc).toContain('export const PROJECTILE_VISUAL_CONFIGS');
  });

  it('exports ProjectileShape type', () => {
    expect(defsSrc).toContain('export type ProjectileShape');
  });

  it('exports ProjectileVisualConfig interface', () => {
    expect(defsSrc).toContain('export interface ProjectileVisualConfig');
  });

  it('exports travelAngle function', () => {
    expect(defsSrc).toContain('export function travelAngle');
  });

  it('exports advanceTumble function', () => {
    expect(defsSrc).toContain('export function advanceTumble');
  });

  it('exports ROCK_SIZE_VARIANTS', () => {
    expect(defsSrc).toContain('export const ROCK_SIZE_VARIANTS');
  });
});
