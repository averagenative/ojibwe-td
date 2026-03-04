/**
 * Air Creep Path Diversity — TASK-134 tests.
 *
 * Covers:
 *   1. `getAirWaypointPaths()` — pure logic tests (priority, validation, fallback).
 *   2. Structural tests (GameScene ?raw, WaveManager ?raw) — verify multi-lane
 *      wiring, random lane selection, and ascension modifier applied per lane.
 */

import { describe, it, expect } from 'vitest';
import { getAirWaypointPaths } from '../../types/MapData';
import type { MapData, MapWaypoint } from '../../types/MapData';

import gameSceneSrc from '../../scenes/GameScene.ts?raw';
import waveManagerSrc from '../../systems/WaveManager.ts?raw';

// ── Helpers ────────────────────────────────────────────────────────────────

function wp(col: number, row: number): MapWaypoint {
  return { col, row };
}

/** Minimal MapData stub for testing getAirWaypointPaths. */
function stubMap(overrides: Partial<MapData> = {}): MapData {
  return {
    id: 'test',
    name: 'Test',
    description: '',
    tileSize: 40,
    cols: 34,
    rows: 18,
    tiles: [],
    waypoints: [wp(0, 5), wp(10, 5), wp(20, 5), wp(33, 5)],
    startingLives: 20,
    startingGold: 200,
    ...overrides,
  };
}

const defaultGroundPath: MapWaypoint[] = [wp(0, 5), wp(10, 5), wp(33, 5)];

// ── 1. getAirWaypointPaths() — pure logic ──────────────────────────────────

describe('getAirWaypointPaths', () => {
  // ── Priority 1: airWaypointPaths ──────────────────────────────────────

  it('returns airWaypointPaths when present and valid', () => {
    const paths = [
      [wp(0, 1), wp(10, 2), wp(33, 1)],
      [wp(0, 8), wp(15, 5), wp(33, 8)],
    ];
    const result = getAirWaypointPaths(stubMap({ airWaypointPaths: paths }), defaultGroundPath);
    expect(result).toEqual(paths);
  });

  it('filters out sub-arrays with fewer than 2 waypoints from airWaypointPaths', () => {
    const paths = [
      [wp(0, 1)],                          // invalid — only 1 waypoint
      [wp(0, 8), wp(15, 5), wp(33, 8)],    // valid
      [],                                   // invalid — empty
    ];
    const result = getAirWaypointPaths(stubMap({ airWaypointPaths: paths }), defaultGroundPath);
    expect(result).toEqual([[wp(0, 8), wp(15, 5), wp(33, 8)]]);
  });

  it('falls through to airWaypoints when all airWaypointPaths sub-arrays are invalid', () => {
    const legacy = [wp(0, 3), wp(16, 6), wp(33, 3)];
    const result = getAirWaypointPaths(
      stubMap({ airWaypointPaths: [[wp(0, 1)]], airWaypoints: legacy }),
      defaultGroundPath,
    );
    expect(result).toEqual([legacy]);
  });

  // ── Priority 2: airWaypoints (legacy) ─────────────────────────────────

  it('wraps legacy airWaypoints in an array when airWaypointPaths is absent', () => {
    const legacy = [wp(0, 3), wp(16, 6), wp(33, 3)];
    const result = getAirWaypointPaths(stubMap({ airWaypoints: legacy }), defaultGroundPath);
    expect(result).toEqual([legacy]);
  });

  it('ignores legacy airWaypoints with fewer than 2 waypoints', () => {
    const result = getAirWaypointPaths(stubMap({ airWaypoints: [wp(0, 3)] }), defaultGroundPath);
    // Should fall through to ground-path fallback.
    expect(result).toEqual([[defaultGroundPath[0], defaultGroundPath[2]]]);
  });

  // ── Priority 3: Fallback — ground-path derived ────────────────────────

  it('returns spawn→exit from ground path when no air fields are defined', () => {
    const result = getAirWaypointPaths(stubMap(), defaultGroundPath);
    expect(result).toEqual([[wp(0, 5), wp(33, 5)]]);
  });

  it('returns empty array when groundPath has fewer than 2 waypoints', () => {
    const result = getAirWaypointPaths(stubMap(), [wp(5, 5)]);
    expect(result).toEqual([]);
  });

  it('returns empty array when groundPath is empty', () => {
    const result = getAirWaypointPaths(stubMap(), []);
    expect(result).toEqual([]);
  });

  // ── Boundary: airWaypointPaths takes precedence over airWaypoints ─────

  it('prefers airWaypointPaths over airWaypoints when both are present', () => {
    const multi = [[wp(0, 1), wp(33, 1)], [wp(0, 14), wp(33, 14)]];
    const legacy = [wp(0, 7), wp(33, 7)];
    const result = getAirWaypointPaths(
      stubMap({ airWaypointPaths: multi, airWaypoints: legacy }),
      defaultGroundPath,
    );
    expect(result).toEqual(multi);
  });

  // ── Each returned path has ≥ 2 waypoints ──────────────────────────────

  it('every returned path has at least 2 waypoints (multi-lane)', () => {
    const paths = [
      [wp(0, 1), wp(10, 2), wp(33, 1)],
      [wp(0, 8), wp(33, 8)],
    ];
    const result = getAirWaypointPaths(stubMap({ airWaypointPaths: paths }), defaultGroundPath);
    for (const p of result) {
      expect(p.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('every returned path has at least 2 waypoints (fallback)', () => {
    const result = getAirWaypointPaths(stubMap(), defaultGroundPath);
    for (const p of result) {
      expect(p.length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ── 2. Structural tests — GameScene ────────────────────────────────────────

describe('GameScene — air path diversity wiring (structural)', () => {
  it('imports getAirWaypointPaths from MapData', () => {
    expect(gameSceneSrc).toContain('getAirWaypointPaths');
  });

  it('calls buildAllAirWaypointPaths (renamed from buildAirWaypoints)', () => {
    expect(gameSceneSrc).toContain('buildAllAirWaypointPaths');
    // The old single-path method should be gone.
    expect(gameSceneSrc).not.toMatch(/\bbuildAirWaypoints\b\s*\(/);
  });

  it('applies ascension modifyAirWaypoints to each lane via .map()', () => {
    // The ascension modifier should be mapped over each lane.
    expect(gameSceneSrc).toContain('rawAirPaths.map');
    expect(gameSceneSrc).toContain('modifyAirWaypoints');
  });

  it('passes multi-lane airPaths to WaveManager constructor', () => {
    // The 6th argument to WaveManager constructor should be airPaths.
    expect(gameSceneSrc).toMatch(/new WaveManager\([^)]*airPaths/);
  });
});

// ── 3. Structural tests — WaveManager ──────────────────────────────────────

describe('WaveManager — air lane diversity (structural)', () => {
  it('stores airWaypointPaths as an array of lanes', () => {
    expect(waveManagerSrc).toContain('airWaypointPaths: Waypoint[][]');
  });

  it('has a _pickAirPath method that returns a random lane', () => {
    expect(waveManagerSrc).toContain('_pickAirPath');
    expect(waveManagerSrc).toContain('Math.random()');
  });

  it('uses _pickAirPath for air creep spawning', () => {
    // Both _spawnOneForWave and _spawnBossForWave should use _pickAirPath for air types.
    const airPickCalls = waveManagerSrc.match(/_pickAirPath\(\)/g);
    expect(airPickCalls).not.toBeNull();
    expect(airPickCalls!.length).toBeGreaterThanOrEqual(2);
  });

  it('accepts Waypoint[] | Waypoint[][] for backward compatibility', () => {
    expect(waveManagerSrc).toContain('Waypoint[] | Waypoint[][]');
  });

  it('normalises single flat Waypoint[] into a single-lane array', () => {
    // The constructor has Array.isArray(airWaypoints[0]) check for detection.
    expect(waveManagerSrc).toContain('Array.isArray(airWaypoints[0])');
  });
});

// ── 4. Map data — all maps have airWaypointPaths ────────────────────────────

describe('Map data — airWaypointPaths defined', () => {
  const mapIds = ['01', '02', '03', '04', '05'];

  for (const id of mapIds) {
    it(`map-${id} has airWaypointPaths with 2-3 lanes`, async () => {
      // Use dynamic import to load the JSON.
      const fs = await import('fs');
      const path = await import('path');
      const mapPath = path.resolve(
        __dirname,
        `../../../public/data/maps/map-${id}.json`,
      );
      const raw = fs.readFileSync(mapPath, 'utf-8');
      const data = JSON.parse(raw) as MapData;

      expect(data.airWaypointPaths).toBeDefined();
      expect(data.airWaypointPaths!.length).toBeGreaterThanOrEqual(2);
      expect(data.airWaypointPaths!.length).toBeLessThanOrEqual(3);

      // Each lane has ≥ 2 waypoints.
      for (const lane of data.airWaypointPaths!) {
        expect(lane.length).toBeGreaterThanOrEqual(2);
        // Each waypoint has col and row.
        for (const wp of lane) {
          expect(typeof wp.col).toBe('number');
          expect(typeof wp.row).toBe('number');
        }
      }
    });
  }
});
