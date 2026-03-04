/**
 * MapGenerator — procedural TD map generation from a numeric seed.
 *
 * Same seed + same config = identical map every time (deterministic).
 *
 * Algorithm (winding-path / waypoint-based):
 *   1. Divide the grid into N vertical "lane" sections.
 *   2. At each lane boundary (pivot column), randomly pick a new row.
 *   3. Connect consecutive pivot points with horizontal then vertical segments.
 *   4. Mark all path cells as TILE.PATH (1), everything else as TILE.BUILDABLE (0).
 *   5. Validate path length and buildable tile count.
 *   6. On failure, retry with a deterministic seed offset.
 *
 * Phaser-free — safe for unit tests and Node.js scripts.
 *
 * The existing hand-crafted maps (Zaagaiganing, Mashkiig, etc.) remain
 * unchanged as "story mode" maps.  MapGenerator is for Quick Play / Endless.
 */

import { Rng } from './Rng';
import type { MapData, MapWaypoint } from '../types/MapData';
import { TILE } from '../types/MapData';

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Configuration for procedural map generation.
 * All fields are optional — sensible defaults are applied.
 */
export interface MapGenConfig {
  /** Grid width in tiles. Default: 32 */
  cols?: number;
  /** Grid height in tiles. Default: 18 */
  rows?: number;
  /** Tile size in pixels. Default: 40 */
  tileSize?: number;
  /**
   * Minimum number of path tiles required for a map to be considered valid.
   * Default: 50
   */
  minPathTiles?: number;
  /**
   * Number of direction changes (turns) in the ground path.
   * If omitted, derived from `difficultyTier`.
   */
  numTurns?: number;
  /**
   * Difficulty tier 1–5; influences path complexity when `numTurns` is not
   * explicitly provided.  Default: 2
   */
  difficultyTier?: 1 | 2 | 3 | 4 | 5;
  /** Starting lives for the generated map. Default: 20 */
  startingLives?: number;
  /** Starting gold for the generated map. Default: 200 */
  startingGold?: number;
}

/**
 * A fully generated map.
 *
 * Extends MapData so it can be passed directly to GameScene, TerrainRenderer,
 * and WaveManager without any conversion.
 */
export interface GeneratedMap extends MapData {
  /** The seed used to generate this map. */
  seed: number;
  /**
   * All buildable tile positions (TILE.BUILDABLE = 0).
   * Convenience field — mirrors tiles[][] but as a flat list.
   */
  buildableTiles: MapWaypoint[];
  /** Entry waypoint (spawn point, on or just outside the left edge). */
  spawnPoint: MapWaypoint;
  /** Exit waypoint (one column past the right edge — creep leaves screen). */
  exitPoint: MapWaypoint;
}

// ── Internal constants ────────────────────────────────────────────────────────

/** Number of direction changes (turns) per difficulty tier. */
const TURNS_BY_TIER: Readonly<Record<number, number>> = {
  1: 4,
  2: 6,
  3: 8,
  4: 10,
  5: 12,
};

/** Row margin from top/bottom edges — keeps paths away from screen borders. */
const ROW_MARGIN = 2;

/** Minimum meaningful vertical distance between consecutive horizontal segments. */
const MIN_ROW_DELTA = 4;

/** Number of air lanes generated per map. */
const AIR_LANE_COUNT = 3;

/** Maximum retries when a generated map fails validation. */
const MAX_RETRIES = 10;

/** Prime multiplier used to derive per-retry seeds. */
const RETRY_PRIME = 0x9e3779b9;

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Generate ground path waypoints as a winding sequence of horizontal and
 * vertical segments across the grid.
 *
 * Returns an array of MapWaypoint objects.  The first entry is the spawn
 * point on the left edge; the last entry is one column past the right edge
 * (the creep exit point).
 */
function buildWaypoints(
  rng: Rng,
  cols: number,
  rows: number,
  numTurns: number,
): MapWaypoint[] {
  const minRow = ROW_MARGIN;
  const maxRow = rows - 1 - ROW_MARGIN;
  const rowRange = maxRow - minRow;

  // Pivot columns divide the grid into equal-width lane sections.
  // Each pivot contributes two turns (H→V, V→H), so numPivots ≈ numTurns/2.
  const numPivots = Math.max(1, Math.ceil(numTurns / 2));
  const spacing   = Math.floor(cols / (numPivots + 1));

  const pivotCols: number[] = [];
  for (let i = 1; i <= numPivots; i++) {
    pivotCols.push(i * spacing);
  }

  const waypoints: MapWaypoint[] = [];
  let currentRow = rng.nextInt(minRow, maxRow);

  // Entry: left edge at a random row.
  waypoints.push({ col: 0, row: currentRow });

  for (const pivotCol of pivotCols) {
    // Arrive at this pivot column (end of horizontal segment).
    waypoints.push({ col: pivotCol, row: currentRow });

    // Choose a new row ensuring a meaningful vertical travel distance.
    const minDelta = Math.max(MIN_ROW_DELTA, Math.floor(rowRange / (numPivots + 1)));
    let newRow = currentRow;
    for (let attempt = 0; attempt < 20; attempt++) {
      newRow = rng.nextInt(minRow, maxRow);
      if (Math.abs(newRow - currentRow) >= minDelta) break;
    }
    // Hard fallback: flip to the opposite half of the grid.
    if (Math.abs(newRow - currentRow) < minDelta) {
      newRow = currentRow < rows / 2 ? maxRow : minRow;
    }

    // Depart from this pivot column (end of vertical segment).
    waypoints.push({ col: pivotCol, row: newRow });
    currentRow = newRow;
  }

  // Exit: one column past the right edge (creep leaves screen).
  waypoints.push({ col: cols, row: currentRow });

  return waypoints;
}

/**
 * Build the tile grid and collect all path cell positions.
 *
 * @returns An object containing:
 *   - `tiles`     – the [row][col] tile grid (0 = buildable, 1 = path)
 *   - `pathCells` – Set of "col,row" strings for all path tile positions
 *   - `pathCount` – number of path tiles inside the grid bounds
 */
function buildTileGrid(
  waypoints: MapWaypoint[],
  cols: number,
  rows: number,
): { tiles: (0 | 1 | 2)[][]; pathCells: Set<string>; pathCount: number } {
  const tiles: (0 | 1 | 2)[][] = Array.from(
    { length: rows },
    () => new Array<0 | 1 | 2>(cols).fill(TILE.BUILDABLE),
  );
  const pathCells = new Set<string>();

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];

    if (a.col === b.col) {
      // Vertical segment — column is constant.
      const r0 = Math.min(a.row, b.row);
      const r1 = Math.max(a.row, b.row);
      const c  = a.col;
      for (let r = r0; r <= r1; r++) {
        if (c >= 0 && c < cols && r >= 0 && r < rows) {
          tiles[r][c] = TILE.PATH;
          pathCells.add(`${c},${r}`);
        }
      }
    } else {
      // Horizontal segment — row is constant.
      const c0 = Math.min(a.col, b.col);
      const c1 = Math.max(a.col, b.col);
      const r  = a.row; // same for both endpoints (by construction)
      for (let c = c0; c <= c1; c++) {
        if (c >= 0 && c < cols && r >= 0 && r < rows) {
          tiles[r][c] = TILE.PATH;
          pathCells.add(`${c},${r}`);
        }
      }
    }
  }

  return { tiles, pathCells, pathCount: pathCells.size };
}

/**
 * Generate simple air lane paths from left to right.
 *
 * Creates AIR_LANE_COUNT lanes at evenly distributed row fractions,
 * each with slight random jitter at mid-points to add variety.
 */
function buildAirPaths(rng: Rng, cols: number, rows: number): MapWaypoint[][] {
  const paths: MapWaypoint[][] = [];
  const fractions = [0.15, 0.5, 0.85];

  for (const fraction of fractions) {
    const baseRow = Math.round(rows * fraction);
    const path: MapWaypoint[] = [];
    const midCols = [Math.floor(cols * 0.33), Math.floor(cols * 0.66)];

    path.push({ col: 0, row: baseRow });

    for (const midCol of midCols) {
      const jitter = rng.nextInt(-2, 2);
      const row = Math.max(0, Math.min(rows - 1, baseRow + jitter));
      path.push({ col: midCol, row });
    }

    path.push({ col: cols, row: baseRow });
    paths.push(path);
  }

  return paths;
}

/**
 * Validate the generated map meets minimum quality requirements.
 */
function isValid(
  pathCount: number,
  buildableCount: number,
  minPathTiles: number,
): boolean {
  if (pathCount < minPathTiles)  return false;
  if (buildableCount < 20)       return false;
  return true;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a map from a numeric seed and optional configuration.
 *
 * Determinism guarantee: the same `seed` + `config` always produces an
 * identical `GeneratedMap`.
 *
 * If the first attempt produces a map that fails validation (e.g. path too
 * short for an unusual config), this function retries up to MAX_RETRIES times
 * using a deterministic seed offset, then throws if all retries fail.
 *
 * @param seed   Integer seed.  Use any positive integer; negative values and
 *               floats are accepted (they are coerced to 32-bit integers).
 * @param config Optional configuration overrides.
 *
 * @throws {Error} if a valid map cannot be produced after MAX_RETRIES.
 */
export function generateMap(seed: number, config: MapGenConfig = {}): GeneratedMap {
  const cols           = config.cols           ?? 32;
  const rows           = config.rows           ?? 18;
  const tileSize       = config.tileSize       ?? 40;
  const difficultyTier = config.difficultyTier ?? 2;
  const numTurns       = config.numTurns       ?? (TURNS_BY_TIER[difficultyTier] ?? 6);
  const minPathTiles   = config.minPathTiles   ?? 50;
  const startingLives  = config.startingLives  ?? 20;
  const startingGold   = config.startingGold   ?? 200;

  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    // Each retry uses a deterministic but different seed.
    const retrySeed = ((seed | 0) + ((retry * RETRY_PRIME) | 0)) | 0;
    const rng       = new Rng(retrySeed);

    const waypoints              = buildWaypoints(rng, cols, rows, numTurns);
    const { tiles, pathCount }   = buildTileGrid(waypoints, cols, rows);

    // Collect buildable tiles (all non-path cells within the grid).
    const buildableTiles: MapWaypoint[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (tiles[r][c] === TILE.BUILDABLE) {
          buildableTiles.push({ col: c, row: r });
        }
      }
    }

    if (!isValid(pathCount, buildableTiles.length, minPathTiles)) continue;

    // Build air paths using a forked RNG (independent from ground generation).
    const airWaypointPaths = buildAirPaths(rng.fork(AIR_LANE_COUNT), cols, rows);

    const spawnPoint: MapWaypoint = { col: waypoints[0].col, row: waypoints[0].row };
    const exitPoint:  MapWaypoint = {
      col: waypoints[waypoints.length - 1].col,
      row: waypoints[waypoints.length - 1].row,
    };

    return {
      // MapData fields
      id:              `generated-${seed}`,
      name:            `Seed ${seed}`,
      description:     `Procedurally generated map (seed ${seed}, tier ${difficultyTier}).`,
      tileSize,
      cols,
      rows,
      tiles,
      waypoints,           // MapWaypoint[] — normalised by getWaypointPaths()
      airWaypointPaths,
      startingLives,
      startingGold,
      // GeneratedMap extra fields
      seed,
      buildableTiles,
      spawnPoint,
      exitPoint,
    };
  }

  throw new Error(
    `MapGenerator: failed to produce a valid map after ${MAX_RETRIES} retries ` +
    `(seed=${seed}, cols=${cols}, rows=${rows}, minPathTiles=${minPathTiles}).`,
  );
}
