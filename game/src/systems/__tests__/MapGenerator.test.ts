/**
 * MapGenerator.test.ts
 *
 * Tests for:
 *   A. Rng — seeded pseudo-random number generator
 *   B. generateMap — path validity, determinism, config, edge cases, performance
 *
 * Phaser-free. No DOM required.
 */

import { describe, it, expect } from 'vitest';
import { Rng } from '../Rng';
import { generateMap } from '../MapGenerator';
import { TILE, getWaypointPaths, getAirWaypointPaths } from '../../types/MapData';

// ════════════════════════════════════════════════════════════════════════════
// A. Rng
// ════════════════════════════════════════════════════════════════════════════

describe('A. Rng — seeded PRNG', () => {
  it('produces values in [0, 1)', () => {
    const rng = new Rng(42);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('same seed produces identical sequence', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    for (let i = 0; i < 50; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('different seeds produce different sequences', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const aVals = Array.from({ length: 10 }, () => a.next());
    const bVals = Array.from({ length: 10 }, () => b.next());
    expect(aVals).not.toEqual(bVals);
  });

  it('nextInt returns integers in [min, max] inclusive', () => {
    const rng = new Rng(99);
    for (let i = 0; i < 200; i++) {
      const v = rng.nextInt(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('nextBelow returns integers in [0, n)', () => {
    const rng = new Rng(77);
    for (let i = 0; i < 200; i++) {
      const v = rng.nextBelow(5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('shuffle rearranges all elements without loss', () => {
    const rng = new Rng(111);
    const arr = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle([...arr]);
    expect(shuffled).toHaveLength(arr.length);
    expect(shuffled.sort()).toEqual(arr.sort());
  });

  it('shuffle is deterministic for same seed', () => {
    const arr = [10, 20, 30, 40, 50];
    const a = new Rng(555);
    const b = new Rng(555);
    expect(a.shuffle([...arr])).toEqual(b.shuffle([...arr]));
  });

  it('fork produces independent stream from parent', () => {
    const rng = new Rng(42);
    const child = rng.fork(1);
    const parentVals = Array.from({ length: 5 }, () => rng.next());
    const childVals  = Array.from({ length: 5 }, () => child.next());
    expect(parentVals).not.toEqual(childVals);
  });

  it('chance returns boolean with expected distribution', () => {
    const rng = new Rng(88);
    let trueCount = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      if (rng.chance(0.5)) trueCount++;
    }
    // Expect ~50 ± 10% with very high probability.
    expect(trueCount).toBeGreaterThan(N * 0.4);
    expect(trueCount).toBeLessThan(N * 0.6);
  });

  it('seed=0 does not crash (avoids degenerate state)', () => {
    const rng = new Rng(0);
    expect(() => rng.next()).not.toThrow();
    expect(rng.next()).toBeGreaterThanOrEqual(0);
  });

  it('negative seed is accepted and produces valid sequence', () => {
    const rng = new Rng(-12345);
    for (let i = 0; i < 20; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// B. generateMap — determinism
// ════════════════════════════════════════════════════════════════════════════

describe('B. generateMap — seed reproducibility', () => {
  it('same seed + same config produces identical tiles', () => {
    const a = generateMap(42);
    const b = generateMap(42);
    expect(a.tiles).toEqual(b.tiles);
  });

  it('same seed + same config produces identical waypoints', () => {
    const a = generateMap(999);
    const b = generateMap(999);
    expect(a.waypoints).toEqual(b.waypoints);
  });

  it('same seed + same config produces identical airWaypointPaths', () => {
    const a = generateMap(7);
    const b = generateMap(7);
    expect(a.airWaypointPaths).toEqual(b.airWaypointPaths);
  });

  it('same seed + same config produces identical buildableTiles list', () => {
    const a = generateMap(1234);
    const b = generateMap(1234);
    expect(a.buildableTiles).toEqual(b.buildableTiles);
  });

  it('different seeds produce different tiles', () => {
    const a = generateMap(1);
    const b = generateMap(2);
    expect(a.tiles).not.toEqual(b.tiles);
  });

  it('seed is stored in GeneratedMap.seed', () => {
    const map = generateMap(808);
    expect(map.seed).toBe(808);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// C. generateMap — grid dimensions
// ════════════════════════════════════════════════════════════════════════════

describe('C. generateMap — grid dimensions', () => {
  it('default grid is 32 cols × 18 rows', () => {
    const map = generateMap(1);
    expect(map.cols).toBe(32);
    expect(map.rows).toBe(18);
  });

  it('tiles array has rows rows', () => {
    const map = generateMap(1);
    expect(map.tiles).toHaveLength(map.rows);
  });

  it('each tile row has cols columns', () => {
    const map = generateMap(1);
    for (const row of map.tiles) {
      expect(row).toHaveLength(map.cols);
    }
  });

  it('respects custom cols and rows', () => {
    // Smaller grid → fewer path tiles, so lower the minimum.
    const map = generateMap(1, { cols: 24, rows: 14, minPathTiles: 20 });
    expect(map.cols).toBe(24);
    expect(map.rows).toBe(14);
    expect(map.tiles).toHaveLength(14);
    expect(map.tiles[0]).toHaveLength(24);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// D. generateMap — path validity
// ════════════════════════════════════════════════════════════════════════════

describe('D. generateMap — path validity', () => {
  it('path has minimum number of path tiles', () => {
    const map = generateMap(42);
    const pathCount = map.tiles.flat().filter(t => t === TILE.PATH).length;
    expect(pathCount).toBeGreaterThanOrEqual(50);
  });

  it('all cells along waypoint segments are marked as PATH', () => {
    const map = generateMap(42);
    const wps = map.waypoints as { col: number; row: number }[];
    for (let i = 0; i < wps.length - 1; i++) {
      const a = wps[i];
      const b = wps[i + 1];
      if (a.col === b.col) {
        // Vertical segment
        const r0 = Math.min(a.row, b.row);
        const r1 = Math.max(a.row, b.row);
        for (let r = r0; r <= r1; r++) {
          if (a.col < map.cols && r < map.rows) {
            expect(map.tiles[r][a.col]).toBe(TILE.PATH);
          }
        }
      } else {
        // Horizontal segment
        const c0 = Math.min(a.col, b.col);
        const c1 = Math.max(a.col, b.col);
        for (let c = c0; c <= c1; c++) {
          if (c < map.cols && a.row < map.rows) {
            expect(map.tiles[a.row][c]).toBe(TILE.PATH);
          }
        }
      }
    }
  });

  it('path reaches the exit (last waypoint is at col=cols)', () => {
    const map = generateMap(42);
    const wps = map.waypoints as { col: number; row: number }[];
    expect(wps[wps.length - 1].col).toBe(map.cols);
  });

  it('path starts at left edge (first waypoint col=0)', () => {
    const map = generateMap(42);
    const wps = map.waypoints as { col: number; row: number }[];
    expect(wps[0].col).toBe(0);
  });

  it('spawnPoint matches first waypoint', () => {
    const map = generateMap(42);
    const wps = map.waypoints as { col: number; row: number }[];
    expect(map.spawnPoint).toEqual(wps[0]);
  });

  it('exitPoint matches last waypoint', () => {
    const map = generateMap(42);
    const wps = map.waypoints as { col: number; row: number }[];
    expect(map.exitPoint).toEqual(wps[wps.length - 1]);
  });

  it('waypoints have no gaps (consecutive waypoints are aligned H or V)', () => {
    const map = generateMap(123);
    const wps = map.waypoints as { col: number; row: number }[];
    for (let i = 0; i < wps.length - 1; i++) {
      const a = wps[i];
      const b = wps[i + 1];
      const isAligned = a.col === b.col || a.row === b.row;
      expect(isAligned).toBe(true);
    }
  });

  it('all tiles are only BUILDABLE (0) or PATH (1)', () => {
    const map = generateMap(77);
    for (const row of map.tiles) {
      for (const cell of row) {
        expect(cell === TILE.BUILDABLE || cell === TILE.PATH).toBe(true);
      }
    }
  });

  it('has at least 20 buildable tiles', () => {
    const map = generateMap(1);
    expect(map.buildableTiles.length).toBeGreaterThanOrEqual(20);
  });

  it('buildableTiles matches tiles[][] (all tile=0 positions)', () => {
    const map = generateMap(55);
    const expected: { col: number; row: number }[] = [];
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        if (map.tiles[r][c] === TILE.BUILDABLE) {
          expected.push({ col: c, row: r });
        }
      }
    }
    expect(map.buildableTiles).toEqual(expected);
  });

  it('path + buildable = total grid cells', () => {
    const map = generateMap(99);
    const totalCells    = map.cols * map.rows;
    const pathCount     = map.tiles.flat().filter(t => t === TILE.PATH).length;
    const buildCount    = map.buildableTiles.length;
    expect(pathCount + buildCount).toBe(totalCells);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// E. generateMap — air waypoint paths
// ════════════════════════════════════════════════════════════════════════════

describe('E. generateMap — air waypoint paths', () => {
  it('generates at least 1 air lane', () => {
    const map = generateMap(1);
    expect(map.airWaypointPaths).toBeDefined();
    expect(map.airWaypointPaths!.length).toBeGreaterThanOrEqual(1);
  });

  it('each air lane has at least 2 waypoints', () => {
    const map = generateMap(1);
    for (const lane of map.airWaypointPaths ?? []) {
      expect(lane.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('air lanes start at left edge (col=0) and end at right edge (col=cols)', () => {
    const map = generateMap(42);
    for (const lane of map.airWaypointPaths ?? []) {
      expect(lane[0].col).toBe(0);
      expect(lane[lane.length - 1].col).toBe(map.cols);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// F. generateMap — config options
// ════════════════════════════════════════════════════════════════════════════

describe('F. generateMap — config options', () => {
  it('respects startingLives', () => {
    const map = generateMap(1, { startingLives: 30 });
    expect(map.startingLives).toBe(30);
  });

  it('respects startingGold', () => {
    const map = generateMap(1, { startingGold: 350 });
    expect(map.startingGold).toBe(350);
  });

  it('tileSize is stored on the map', () => {
    const map = generateMap(1, { tileSize: 48 });
    expect(map.tileSize).toBe(48);
  });

  it('higher difficulty tier produces more path complexity (more turns)', () => {
    // Harder maps should have more waypoints (= more turns).
    const easy = generateMap(42, { difficultyTier: 1 });
    const hard  = generateMap(42, { difficultyTier: 5 });
    const easyWps = (easy.waypoints as { col: number; row: number }[]).length;
    const hardWps = (hard.waypoints as { col: number; row: number }[]).length;
    expect(hardWps).toBeGreaterThan(easyWps);
  });

  it('explicit numTurns overrides difficultyTier', () => {
    const map = generateMap(42, { numTurns: 4, difficultyTier: 5 });
    // 4 turns → ceil(4/2)=2 pivots → 2*2 + 2 = 6 waypoints (entry + 2 pairs + exit)
    const wps = (map.waypoints as { col: number; row: number }[]).length;
    expect(wps).toBe(6);
  });

  it('map id encodes the seed', () => {
    const map = generateMap(12345);
    expect(map.id).toContain('12345');
  });

  it('map name encodes the seed', () => {
    const map = generateMap(12345);
    expect(map.name).toContain('12345');
  });

  it('minPathTiles=0 always succeeds', () => {
    expect(() => generateMap(1, { minPathTiles: 0 })).not.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// G. generateMap — edge cases
// ════════════════════════════════════════════════════════════════════════════

describe('G. generateMap — edge cases', () => {
  it('minimum viable grid size (16×10) generates without error', () => {
    const map = generateMap(1, { cols: 16, rows: 10, minPathTiles: 10 });
    expect(map.cols).toBe(16);
    expect(map.rows).toBe(10);
    expect(map.tiles).toHaveLength(10);
  });

  it('seed=1 works', () => {
    expect(() => generateMap(1)).not.toThrow();
  });

  it('very large seed works', () => {
    expect(() => generateMap(0x7fffffff)).not.toThrow();
  });

  it('negative seed produces a valid map', () => {
    const map = generateMap(-999);
    expect(map.seed).toBe(-999);
    expect(map.tiles.flat().filter(t => t === TILE.PATH).length).toBeGreaterThanOrEqual(50);
  });

  it('float seed is coerced to integer (deterministic)', () => {
    const a = generateMap(3.14);
    const b = generateMap(3.14);
    expect(a.tiles).toEqual(b.tiles);
  });

  it('throws when minPathTiles is impossibly high for tiny grid', () => {
    // 8×8 grid with only 64 cells — demanding 9999 path tiles is impossible.
    expect(() => generateMap(1, { cols: 8, rows: 8, minPathTiles: 9999 })).toThrow(
      /failed to produce a valid map/,
    );
  });

  it('MapData-compatible: waypoints usable with getWaypointPaths()', () => {
    const map = generateMap(42);
    const paths = getWaypointPaths(map);
    expect(paths).toHaveLength(1);
    expect(paths[0].length).toBeGreaterThanOrEqual(2);
  });

  it('MapData-compatible: air paths usable with getAirWaypointPaths()', () => {
    const map = generateMap(42);
    const groundPaths = getWaypointPaths(map);
    const airPaths = getAirWaypointPaths(map, groundPaths[0]);
    expect(airPaths.length).toBeGreaterThanOrEqual(1);
    for (const lane of airPaths) {
      expect(lane.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('generates multiple distinct seeds without collision', () => {
    const maps = Array.from({ length: 20 }, (_, i) => generateMap(i + 1));
    const tileHashes = maps.map(m => JSON.stringify(m.tiles));
    const unique = new Set(tileHashes);
    expect(unique.size).toBe(20);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// H. generateMap — performance
// ════════════════════════════════════════════════════════════════════════════

describe('H. generateMap — performance', () => {
  it('standard 32×18 grid generates in < 100ms', () => {
    const start = performance.now();
    generateMap(42);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('100 consecutive maps complete in < 1000ms total', () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      generateMap(i);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });

  it('large 64×36 grid generates in < 200ms', () => {
    const start = performance.now();
    generateMap(42, { cols: 64, rows: 36, minPathTiles: 30 });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });
});
