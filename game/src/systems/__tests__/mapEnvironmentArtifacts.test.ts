import { describe, it, expect, vi } from 'vitest';

// Mock Phaser to avoid resolution errors in test env.
vi.mock('phaser', () => ({ default: {} }));

import { TILE, isBuildable } from '../../types/MapData';
import { tilePosSeed } from '../TerrainRenderer';

// ── TILE constants ──────────────────────────────────────────────────────────

describe('TILE constants', () => {
  it('defines all 9 tile types with unique values', () => {
    const values = [
      TILE.BUILDABLE,
      TILE.PATH,
      TILE.SCENERY,
      TILE.TREE,
      TILE.BRUSH,
      TILE.ROCK,
      TILE.WATER,
      TILE.BIRCH,
      TILE.CATTAIL,
    ];
    expect(new Set(values).size).toBe(9);
  });

  it('has BIRCH defined', () => {
    expect(TILE.BIRCH).toBeDefined();
    expect(typeof TILE.BIRCH).toBe('number');
  });

  it('has CATTAIL defined', () => {
    expect(TILE.CATTAIL).toBeDefined();
    expect(typeof TILE.CATTAIL).toBe('number');
  });
});

// ── isBuildable ─────────────────────────────────────────────────────────────

describe('isBuildable', () => {
  it('returns true for BUILDABLE', () => {
    expect(isBuildable(TILE.BUILDABLE)).toBe(true);
  });

  it('returns false for PATH', () => {
    expect(isBuildable(TILE.PATH)).toBe(false);
  });

  it('returns false for SCENERY', () => {
    expect(isBuildable(TILE.SCENERY)).toBe(false);
  });

  it('returns false for TREE (blocks building)', () => {
    expect(isBuildable(TILE.TREE)).toBe(false);
  });

  it('returns false for BIRCH (blocks building)', () => {
    expect(isBuildable(TILE.BIRCH)).toBe(false);
  });

  it('returns false for ROCK (blocks building)', () => {
    expect(isBuildable(TILE.ROCK)).toBe(false);
  });

  it('returns true for BRUSH (soft decoration)', () => {
    expect(isBuildable(TILE.BRUSH)).toBe(true);
  });

  it('returns true for WATER (soft decoration)', () => {
    expect(isBuildable(TILE.WATER)).toBe(true);
  });

  it('returns true for CATTAIL (soft decoration)', () => {
    expect(isBuildable(TILE.CATTAIL)).toBe(true);
  });

  // Edge cases
  it('returns true for unknown positive tile type (forward compat)', () => {
    expect(isBuildable(99)).toBe(true);
  });

  it('returns true for negative tile type', () => {
    expect(isBuildable(-1)).toBe(true);
  });

  it('handles NaN gracefully (returns true, no crash)', () => {
    expect(isBuildable(NaN)).toBe(true);
  });
});

// ── tilePosSeed ─────────────────────────────────────────────────────────────

describe('tilePosSeed', () => {
  it('returns a deterministic value for the same position', () => {
    expect(tilePosSeed(5, 3)).toBe(tilePosSeed(5, 3));
  });

  it('returns different values for different positions', () => {
    expect(tilePosSeed(0, 0)).not.toBe(tilePosSeed(1, 0));
    expect(tilePosSeed(0, 0)).not.toBe(tilePosSeed(0, 1));
  });

  it('uses the formula col * 31337 + row * 7919', () => {
    expect(tilePosSeed(3, 7)).toBe((3 * 31337 + 7 * 7919) | 0);
  });

  it('returns an integer', () => {
    const seed = tilePosSeed(10, 20);
    expect(seed).toBe(Math.floor(seed));
  });

  it('handles zero position', () => {
    expect(tilePosSeed(0, 0)).toBe(0);
  });
});

// ── Map JSON validation ─────────────────────────────────────────────────────

describe('map JSON: environment tiles', () => {
  // Load maps from JSON files via require (test env)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const map01 = require('../../../public/data/maps/map-01.json');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const map02 = require('../../../public/data/maps/map-02.json');

  const ALL_TILE_VALUES = new Set(Object.values(TILE));

  function collectTileTypes(tiles: number[][]): Set<number> {
    const types = new Set<number>();
    for (const row of tiles) {
      for (const t of row) types.add(t);
    }
    return types;
  }

  it('map-01 contains at least one BIRCH tile', () => {
    expect(collectTileTypes(map01.tiles).has(TILE.BIRCH)).toBe(true);
  });

  it('map-01 contains at least one CATTAIL tile', () => {
    expect(collectTileTypes(map01.tiles).has(TILE.CATTAIL)).toBe(true);
  });

  it('map-02 contains at least one BIRCH tile', () => {
    expect(collectTileTypes(map02.tiles).has(TILE.BIRCH)).toBe(true);
  });

  it('map-02 contains at least one CATTAIL tile', () => {
    expect(collectTileTypes(map02.tiles).has(TILE.CATTAIL)).toBe(true);
  });

  it.each([
    ['map-01', map01],
    ['map-02', map02],
  ])('%s uses only valid tile type values', (_name, map) => {
    const types = collectTileTypes(map.tiles);
    for (const t of types) {
      expect(ALL_TILE_VALUES.has(t as typeof TILE[keyof typeof TILE])).toBe(true);
    }
  });

  it.each([
    ['map-01', map01],
    ['map-02', map02],
  ])('%s has ≥ 10%% non-path decoration tiles', (_name, map) => {
    const { tiles, rows, cols } = map;
    let path = 0;
    let deco = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = tiles[r][c];
        if (t === TILE.PATH) path++;
        else if (t !== TILE.BUILDABLE && t !== TILE.SCENERY) deco++;
      }
    }
    const nonPath = rows * cols - path;
    expect(deco / nonPath).toBeGreaterThanOrEqual(0.10);
  });

  it.each([
    ['map-01', map01],
    ['map-02', map02],
  ])('%s has no environment decoration adjacent to PATH tiles', (_name, map) => {
    const { tiles, rows, cols } = map;
    const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    const violations: string[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = tiles[r][c];
        // Only check decoration tiles (> SCENERY)
        if (t <= TILE.SCENERY) continue;
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && tiles[nr][nc] === TILE.PATH) {
            violations.push(`tile(${r},${c})=${t} adjacent to PATH(${nr},${nc})`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

// ── Blocking tile types in GameScene ────────────────────────────────────────

describe('blocking tile types', () => {
  const BLOCKING_TYPES = [TILE.PATH, TILE.SCENERY, TILE.TREE, TILE.BIRCH, TILE.ROCK];
  const NON_BLOCKING_TYPES = [TILE.BUILDABLE, TILE.BRUSH, TILE.WATER, TILE.CATTAIL];

  it.each(BLOCKING_TYPES)(
    'tile type %i blocks building',
    (t) => {
      expect(isBuildable(t)).toBe(false);
    },
  );

  it.each(NON_BLOCKING_TYPES)(
    'tile type %i allows building',
    (t) => {
      expect(isBuildable(t)).toBe(true);
    },
  );
});
