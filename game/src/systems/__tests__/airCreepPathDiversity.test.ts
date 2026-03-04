/**
 * Air Creep Path Diversity — TASK-134 / TASK-160 tests.
 *
 * Covers:
 *   1. `deriveAirPathsFromGround()` — pure logic tests for offset derivation.
 *   2. `getAirWaypointPaths()` — priority, validation, fallback.
 *   3. Structural tests (GameScene ?raw, WaveManager ?raw) — verify multi-lane
 *      wiring, random lane selection, and ascension modifier applied per lane.
 *   4. Map data — auto-derived air lanes per ground path entrance.
 */

import { describe, it, expect } from 'vitest';
import {
  getAirWaypointPaths,
  getWaypointPaths,
  deriveAirPathsFromGround,
  AIR_LANE_OFFSETS,
} from '../../types/MapData';
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

// ── 1. deriveAirPathsFromGround() — pure logic ────────────────────────────

describe('deriveAirPathsFromGround', () => {
  it('returns exactly 3 lanes (one per AIR_LANE_OFFSET)', () => {
    const result = deriveAirPathsFromGround(defaultGroundPath, 17);
    expect(result.length).toBe(AIR_LANE_OFFSETS.length);
    expect(result.length).toBe(3);
  });

  it('each lane has the same number of waypoints as the ground path', () => {
    const result = deriveAirPathsFromGround(defaultGroundPath, 17);
    for (const lane of result) {
      expect(lane.length).toBe(defaultGroundPath.length);
    }
  });

  it('col values are unchanged across all lanes', () => {
    const result = deriveAirPathsFromGround(defaultGroundPath, 17);
    for (let li = 0; li < result.length; li++) {
      for (let wi = 0; wi < defaultGroundPath.length; wi++) {
        expect(result[li][wi].col).toBe(defaultGroundPath[wi].col);
      }
    }
  });

  it('lane rows are ground row + offset for each offset', () => {
    const result = deriveAirPathsFromGround(defaultGroundPath, 17);
    for (let li = 0; li < AIR_LANE_OFFSETS.length; li++) {
      const offset = AIR_LANE_OFFSETS[li];
      for (let wi = 0; wi < defaultGroundPath.length; wi++) {
        const expected = Math.max(0, Math.min(17, defaultGroundPath[wi].row + offset));
        expect(result[li][wi].row).toBe(expected);
      }
    }
  });

  it('clamps rows to [0, maxRow] for offset -2 when row is 0', () => {
    const path = [wp(0, 0), wp(33, 0)];
    const result = deriveAirPathsFromGround(path, 17);
    // Offset -2 would give row = -2, should clamp to 0.
    expect(result[0][0].row).toBe(0);
    expect(result[0][1].row).toBe(0);
  });

  it('clamps rows to [0, maxRow] for offset +2 when row is near maxRow', () => {
    const path = [wp(0, 16), wp(33, 16)];
    const result = deriveAirPathsFromGround(path, 17);
    // Offset +2 would give row = 18, should clamp to 17.
    expect(result[2][0].row).toBe(17);
    expect(result[2][1].row).toBe(17);
  });

  it('returns empty array when groundPath has fewer than 2 waypoints', () => {
    expect(deriveAirPathsFromGround([wp(5, 5)], 17)).toEqual([]);
    expect(deriveAirPathsFromGround([], 17)).toEqual([]);
  });

  it('middle lane (offset 0) follows ground path exactly when not clamped', () => {
    const result = deriveAirPathsFromGround(defaultGroundPath, 17);
    // Offset 0 is AIR_LANE_OFFSETS[1].
    const midLane = result[1];
    expect(midLane).toEqual(defaultGroundPath);
  });
});

// ── 2. getAirWaypointPaths() — pure logic ──────────────────────────────────

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
    // Should fall through to auto-derived lanes (3 lanes from ground path).
    expect(result.length).toBe(3);
  });

  // ── Priority 3: Auto-derive from ground path ──────────────────────────

  it('returns 3 derived lanes when no air fields are defined', () => {
    const result = getAirWaypointPaths(stubMap(), defaultGroundPath);
    expect(result.length).toBe(3);
  });

  it('derived lanes shadow the ground path with row offsets [-2, 0, +2]', () => {
    const result = getAirWaypointPaths(stubMap(), defaultGroundPath);
    // stubMap rows=18, maxRow=17; ground row=5 → lanes at 3, 5, 7.
    expect(result[0][0].row).toBe(3); // offset -2
    expect(result[1][0].row).toBe(5); // offset  0
    expect(result[2][0].row).toBe(7); // offset +2
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

  it('every returned path has at least 2 waypoints (auto-derived)', () => {
    const result = getAirWaypointPaths(stubMap(), defaultGroundPath);
    for (const p of result) {
      expect(p.length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ── 3. Structural tests — GameScene ────────────────────────────────────────

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

  it('iterates all ground paths when building air lanes', () => {
    // buildAllAirWaypointPaths iterates groundPaths for multi-entrance support.
    expect(gameSceneSrc).toContain('getWaypointPaths(this.mapData)');
    expect(gameSceneSrc).toContain('for (const groundPath of groundPaths)');
  });
});

// ── 4. Structural tests — WaveManager ──────────────────────────────────────

describe('WaveManager — air lane diversity (structural)', () => {
  it('stores airWaypointPaths as an array of lanes', () => {
    expect(waveManagerSrc).toContain('airWaypointPaths: Waypoint[][]');
  });

  it('has a _pickAirPath method that returns a random lane', () => {
    expect(waveManagerSrc).toContain('_pickAirPath');
    // Uses injected Rng — Math.random() replaced with this.rng
    expect(waveManagerSrc).toContain('this.rng');
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

// ── 5. Map data — auto-derived air lanes per ground path entrance ──────────

describe('Map data — air lanes auto-derived from ground path', () => {
  const mapIds = ['01', '02', '03', '04', '05'];

  for (const id of mapIds) {
    it(`map-${id} generates 3 air lanes per ground path entrance`, async () => {
      const fs = await import('fs');
      const path = await import('path');
      const mapPath = path.resolve(
        __dirname,
        `../../../public/data/maps/map-${id}.json`,
      );
      const raw = fs.readFileSync(mapPath, 'utf-8');
      const data = JSON.parse(raw) as MapData;

      const allGroundPaths = getWaypointPaths(data);

      // Each entrance produces exactly 3 auto-derived lanes.
      for (const groundPath of allGroundPaths) {
        const lanes = getAirWaypointPaths(data, groundPath);
        expect(lanes.length).toBe(3);

        // Each lane has ≥ 2 waypoints.
        for (const lane of lanes) {
          expect(lane.length).toBeGreaterThanOrEqual(2);
          // Each waypoint has col and row.
          for (const wpt of lane) {
            expect(typeof wpt.col).toBe('number');
            expect(typeof wpt.row).toBe('number');
          }
        }

        // Lanes shadow the ground path — same col values at each waypoint.
        for (const lane of lanes) {
          for (let i = 0; i < groundPath.length; i++) {
            expect(lane[i].col).toBe(groundPath[i].col);
          }
        }

        // Lane rows are close to the ground path (within 2 rows).
        for (const lane of lanes) {
          for (let i = 0; i < groundPath.length; i++) {
            const rowDiff = Math.abs(lane[i].row - groundPath[i].row);
            expect(rowDiff).toBeLessThanOrEqual(2);
          }
        }
      }
    });
  }
});
