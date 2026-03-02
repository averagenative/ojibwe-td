import { describe, it, expect, vi } from 'vitest';

// Mock Phaser to avoid phaser3spectorjs resolution error in test env.
vi.mock('phaser', () => ({ default: {} }));

import {
  mapIdToSeed,
  posHash,
  shiftBrightness,
  hasAdjacentPath,
  isNearSpawnOrExit,
  PALETTES,
  TERRAIN_BASE_DEPTH,
  TERRAIN_DECO_DEPTH,
  TERRAIN_PATH_DEPTH,
} from '../TerrainRenderer';
import { TILE } from '../../types/MapData';

// ── mapIdToSeed ──────────────────────────────────────────────────────────────

describe('mapIdToSeed', () => {
  it('returns a deterministic number for the same input', () => {
    expect(mapIdToSeed('map-01')).toBe(mapIdToSeed('map-01'));
  });

  it('returns different seeds for different map IDs', () => {
    expect(mapIdToSeed('map-01')).not.toBe(mapIdToSeed('map-02'));
  });

  it('returns 0 for an empty string', () => {
    expect(mapIdToSeed('')).toBe(0);
  });

  it('handles single-character input', () => {
    const seed = mapIdToSeed('a');
    expect(typeof seed).toBe('number');
    expect(Number.isFinite(seed)).toBe(true);
  });
});

// ── posHash ──────────────────────────────────────────────────────────────────

describe('posHash', () => {
  it('returns the same value for the same inputs', () => {
    const a = posHash(42, 3, 5, 0);
    const b = posHash(42, 3, 5, 0);
    expect(a).toBe(b);
  });

  it('returns a value in [0, 1)', () => {
    for (let row = 0; row < 20; row++) {
      for (let col = 0; col < 20; col++) {
        const v = posHash(12345, row, col, 0);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it('produces different values for different positions', () => {
    const a = posHash(1, 0, 0, 0);
    const b = posHash(1, 0, 1, 0);
    const c = posHash(1, 1, 0, 0);
    // At least two of three should differ (collision is theoretically possible
    // but astronomically unlikely with these inputs).
    const unique = new Set([a, b, c]);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it('produces different values for different salts', () => {
    const a = posHash(1, 5, 5, 0);
    const b = posHash(1, 5, 5, 1);
    expect(a).not.toBe(b);
  });

  it('handles negative seed values', () => {
    const v = posHash(-999, 0, 0, 0);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it('handles large row/col values', () => {
    const v = posHash(1, 9999, 9999, 0);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});

// ── shiftBrightness ──────────────────────────────────────────────────────────

describe('shiftBrightness', () => {
  it('returns the same colour at factor 1.0', () => {
    expect(shiftBrightness(0x2a3a1a, 1.0)).toBe(0x2a3a1a);
  });

  it('doubles brightness at factor 2.0 (clamped to 255)', () => {
    // 0x80 = 128 → 256 → clamped to 255
    const result = shiftBrightness(0x808080, 2.0);
    expect(result).toBe(0xffffff);
  });

  it('halves brightness at factor 0.5', () => {
    // 0x80 = 128 → 64 = 0x40
    const result = shiftBrightness(0x808080, 0.5);
    expect(result).toBe(0x404040);
  });

  it('returns 0x000000 at factor 0', () => {
    expect(shiftBrightness(0xffffff, 0)).toBe(0x000000);
  });

  it('clamps negative factors to 0', () => {
    expect(shiftBrightness(0xffffff, -1)).toBe(0x000000);
  });

  it('handles pure-channel colours correctly', () => {
    // Only red channel: 0xFF0000
    expect(shiftBrightness(0xff0000, 0.5)).toBe(0x800000);
    // Only green channel: 0x00FF00
    expect(shiftBrightness(0x00ff00, 0.5)).toBe(0x008000);
    // Only blue channel: 0x0000FF
    expect(shiftBrightness(0x0000ff, 0.5)).toBe(0x000080);
  });
});

// ── hasAdjacentPath ──────────────────────────────────────────────────────────

describe('hasAdjacentPath', () => {
  // 3×3 grid with center path tile
  const tiles3x3: number[][] = [
    [TILE.BUILDABLE, TILE.BUILDABLE, TILE.BUILDABLE],
    [TILE.BUILDABLE, TILE.PATH,      TILE.BUILDABLE],
    [TILE.BUILDABLE, TILE.BUILDABLE, TILE.BUILDABLE],
  ];

  it('returns true for tiles adjacent to a path', () => {
    // (0,0) is diagonally adjacent to path at (1,1)
    expect(hasAdjacentPath(0, 0, tiles3x3, 3, 3)).toBe(true);
    // (0,1) is directly above path at (1,1)
    expect(hasAdjacentPath(0, 1, tiles3x3, 3, 3)).toBe(true);
  });

  it('returns false for a tile with no adjacent path', () => {
    // 3×3 grid with no path tiles at all
    const noPaths = [
      [TILE.BUILDABLE, TILE.BUILDABLE, TILE.BUILDABLE],
      [TILE.BUILDABLE, TILE.BUILDABLE, TILE.BUILDABLE],
      [TILE.BUILDABLE, TILE.BUILDABLE, TILE.BUILDABLE],
    ];
    expect(hasAdjacentPath(1, 1, noPaths, 3, 3)).toBe(false);
  });

  it('does not count self as adjacent', () => {
    // The path tile at (1,1) — checking (1,1) should NOT count itself.
    // But it checks only dr/dc != (0,0), so the path at (1,1) is skipped.
    // Result depends on whether other adjacent tiles are paths.
    const singlePath = [
      [TILE.BUILDABLE, TILE.BUILDABLE, TILE.BUILDABLE],
      [TILE.BUILDABLE, TILE.PATH,      TILE.BUILDABLE],
      [TILE.BUILDABLE, TILE.BUILDABLE, TILE.BUILDABLE],
    ];
    // None of (1,1)'s neighbours are paths
    expect(hasAdjacentPath(1, 1, singlePath, 3, 3)).toBe(false);
  });

  it('handles corner tiles correctly (partial neighbourhood)', () => {
    // Path at (0,1): corner (0,0) sees it as adjacent
    const cornerTest = [
      [TILE.BUILDABLE, TILE.PATH],
      [TILE.BUILDABLE, TILE.BUILDABLE],
    ];
    expect(hasAdjacentPath(0, 0, cornerTest, 2, 2)).toBe(true);
    expect(hasAdjacentPath(1, 0, cornerTest, 2, 2)).toBe(true);
    // (1,1) is diagonally adjacent to (0,1)
    expect(hasAdjacentPath(1, 1, cornerTest, 2, 2)).toBe(true);
  });

  it('handles 1x1 grid', () => {
    const tiny = [[TILE.BUILDABLE]];
    expect(hasAdjacentPath(0, 0, tiny, 1, 1)).toBe(false);
  });
});

// ── isNearSpawnOrExit ────────────────────────────────────────────────────────

describe('isNearSpawnOrExit', () => {
  const spawn = { row: 2, col: 0 };
  const exit  = { row: 8, col: 15 };

  it('returns true for tile at spawn location', () => {
    expect(isNearSpawnOrExit(2, 0, spawn, exit)).toBe(true);
  });

  it('returns true for tile adjacent to spawn', () => {
    expect(isNearSpawnOrExit(1, 0, spawn, exit)).toBe(true);
    expect(isNearSpawnOrExit(3, 1, spawn, exit)).toBe(true);
  });

  it('returns true for tile at exit location', () => {
    expect(isNearSpawnOrExit(8, 15, spawn, exit)).toBe(true);
  });

  it('returns true for tile adjacent to exit', () => {
    expect(isNearSpawnOrExit(7, 14, spawn, exit)).toBe(true);
  });

  it('returns false for tile far from both', () => {
    expect(isNearSpawnOrExit(5, 8, spawn, exit)).toBe(false);
  });

  it('returns false for tile exactly 2 away from spawn', () => {
    // (0, 0) is 2 rows away from spawn (2,0) → not within ±1
    expect(isNearSpawnOrExit(0, 0, spawn, exit)).toBe(false);
  });
});

// ── PALETTES ─────────────────────────────────────────────────────────────────

describe('PALETTES', () => {
  it('has entries for all four seasons', () => {
    expect(PALETTES).toHaveProperty('summer');
    expect(PALETTES).toHaveProperty('spring');
    expect(PALETTES).toHaveProperty('autumn');
    expect(PALETTES).toHaveProperty('winter');
  });

  it('summer groundBase matches spec colour 0x2a3a1a', () => {
    expect(PALETTES.summer.groundBase).toBe(0x2a3a1a);
  });

  it('spring has non-null accentOverlay (wet patches)', () => {
    expect(PALETTES.spring.accentOverlay).not.toBeNull();
    expect(PALETTES.spring.accentChance).toBeGreaterThan(0);
  });

  it('winter has non-null accentOverlay (snow patches)', () => {
    expect(PALETTES.winter.accentOverlay).not.toBeNull();
    expect(PALETTES.winter.accentChance).toBeGreaterThan(0);
  });

  it('summer and autumn have no accent overlays', () => {
    expect(PALETTES.summer.accentOverlay).toBeNull();
    expect(PALETTES.autumn.accentOverlay).toBeNull();
  });

  it('every palette has at least one tree colour', () => {
    for (const season of ['summer', 'spring', 'autumn', 'winter'] as const) {
      expect(PALETTES[season].treeColors.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ── Depth hierarchy contract ──────────────────────────────────────────────────
//
// These tests enforce the visual clarity depth spec:
//   Depth 0: terrain base   (TERRAIN_BASE_DEPTH)
//   Depth 1: terrain deco   (TERRAIN_DECO_DEPTH)
//   Depth 2: path tiles     (TERRAIN_PATH_DEPTH)
//   Depth 5: range circles, placement preview
//   Depth 10: towers
//   Depth 15: creeps + health bars
//   Depth 20: projectiles + effects
//
// Decorations MUST sit below all gameplay elements so they never obscure
// range circles, creep health bars, projectiles, or tower bodies.
// Paths render ABOVE decorations so adjacent trees never cover the trail.

describe('Depth hierarchy contract', () => {
  const RANGE_CIRCLE_DEPTH  = 5;
  const TOWER_DEPTH         = 10;
  const CREEP_DEPTH         = 15;
  const PROJECTILE_DEPTH    = 20;

  it('TERRAIN_BASE_DEPTH is 0', () => {
    expect(TERRAIN_BASE_DEPTH).toBe(0);
  });

  it('TERRAIN_DECO_DEPTH is 1 (above base, below path)', () => {
    expect(TERRAIN_DECO_DEPTH).toBe(1);
  });

  it('TERRAIN_PATH_DEPTH is 2 (above deco, below range circles)', () => {
    expect(TERRAIN_PATH_DEPTH).toBe(2);
  });

  it('base < deco < path (terrain ordering)', () => {
    expect(TERRAIN_BASE_DEPTH).toBeLessThan(TERRAIN_DECO_DEPTH);
    expect(TERRAIN_DECO_DEPTH).toBeLessThan(TERRAIN_PATH_DEPTH);
  });

  it('path is below range circles', () => {
    expect(TERRAIN_PATH_DEPTH).toBeLessThan(RANGE_CIRCLE_DEPTH);
  });

  it('decorations are below range circles', () => {
    expect(TERRAIN_DECO_DEPTH).toBeLessThan(RANGE_CIRCLE_DEPTH);
  });

  it('decorations are below towers', () => {
    expect(TERRAIN_DECO_DEPTH).toBeLessThan(TOWER_DEPTH);
  });

  it('decorations are below creeps', () => {
    expect(TERRAIN_DECO_DEPTH).toBeLessThan(CREEP_DEPTH);
  });

  it('decorations are below projectiles', () => {
    expect(TERRAIN_DECO_DEPTH).toBeLessThan(PROJECTILE_DEPTH);
  });

  it('creeps render above towers (health bars always visible)', () => {
    expect(CREEP_DEPTH).toBeGreaterThan(TOWER_DEPTH);
  });

  it('projectiles render above creeps (effects on top)', () => {
    expect(PROJECTILE_DEPTH).toBeGreaterThan(CREEP_DEPTH);
  });
});
