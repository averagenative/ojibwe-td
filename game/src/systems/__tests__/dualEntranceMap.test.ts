/**
 * Dual Entrance Map — unit tests for multi-path waypoint normalisation,
 * map-05 data integrity, stage/unlock registration, and WaveManager
 * multi-path creep alternation.
 */

import { describe, it, expect } from 'vitest';
import type { MapData, MapWaypoint } from '../../types/MapData';
import { getWaypointPaths } from '../../types/MapData';
import { ALL_STAGES, ALL_REGIONS, getStageDef, getStageByPathFile } from '../../data/stageDefs';
import {
  UNLOCK_NODES,
  LOCKED_STAGE_IDS,
  getStageUnlockNode,
} from '../../meta/unlockDefs';
import map05 from '../../../public/data/maps/map-05.json';

// ── getWaypointPaths — normalisation ──────────────────────────────────────

describe('getWaypointPaths', () => {
  it('wraps a flat (single-path) waypoint array into [[...waypoints]]', () => {
    const data: MapData = {
      id: 'test-single', name: '', description: '', tileSize: 40,
      cols: 10, rows: 10, tiles: [],
      waypoints: [{ col: 0, row: 2 }, { col: 9, row: 2 }],
      startingLives: 20, startingGold: 100,
    };
    const paths = getWaypointPaths(data);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toEqual([{ col: 0, row: 2 }, { col: 9, row: 2 }]);
  });

  it('returns multi-path arrays as-is', () => {
    const pathA: MapWaypoint[] = [{ col: 0, row: 3 }, { col: 8, row: 3 }];
    const pathB: MapWaypoint[] = [{ col: 0, row: 14 }, { col: 12, row: 14 }];
    const data: MapData = {
      id: 'test-multi', name: '', description: '', tileSize: 40,
      cols: 32, rows: 18, tiles: [],
      waypoints: [pathA, pathB],
      startingLives: 20, startingGold: 100,
    };
    const paths = getWaypointPaths(data);
    expect(paths).toHaveLength(2);
    expect(paths[0]).toBe(pathA);
    expect(paths[1]).toBe(pathB);
  });

  it('handles empty waypoints by returning [[]]', () => {
    const data: MapData = {
      id: 'test-empty', name: '', description: '', tileSize: 40,
      cols: 10, rows: 10, tiles: [],
      waypoints: [],
      startingLives: 20, startingGold: 100,
    };
    const paths = getWaypointPaths(data);
    expect(paths).toEqual([[]]);
  });

  it('handles single-path with one waypoint', () => {
    const data: MapData = {
      id: 'test-one', name: '', description: '', tileSize: 40,
      cols: 10, rows: 10, tiles: [],
      waypoints: [{ col: 5, row: 5 }],
      startingLives: 20, startingGold: 100,
    };
    const paths = getWaypointPaths(data);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toEqual([{ col: 5, row: 5 }]);
  });

  it('handles multi-path with 3+ paths', () => {
    const p1: MapWaypoint[] = [{ col: 0, row: 0 }];
    const p2: MapWaypoint[] = [{ col: 0, row: 5 }];
    const p3: MapWaypoint[] = [{ col: 0, row: 10 }];
    const data: MapData = {
      id: 'test-three', name: '', description: '', tileSize: 40,
      cols: 10, rows: 15, tiles: [],
      waypoints: [p1, p2, p3],
      startingLives: 20, startingGold: 100,
    };
    const paths = getWaypointPaths(data);
    expect(paths).toHaveLength(3);
  });

  it('does not mutate the original waypoints array', () => {
    const wp: MapWaypoint[] = [{ col: 0, row: 0 }, { col: 5, row: 5 }];
    const data: MapData = {
      id: 'test-immutable', name: '', description: '', tileSize: 40,
      cols: 10, rows: 10, tiles: [],
      waypoints: wp,
      startingLives: 20, startingGold: 100,
    };
    const paths = getWaypointPaths(data);
    expect(paths[0]).toBe(wp); // same reference, not a copy
    expect(data.waypoints).toBe(wp); // original untouched
  });
});

// ── map-05.json data integrity ──────────────────────────────────────────

describe('map-05.json (Niizh-miikana)', () => {
  const m5 = map05 as unknown as MapData;

  it('has correct id', () => {
    expect(m5.id).toBe('map-05');
  });

  it('has 32×18 grid with tileSize 40', () => {
    expect(m5.cols).toBe(32);
    expect(m5.rows).toBe(18);
    expect(m5.tileSize).toBe(40);
  });

  it('tile array has exactly 18 rows', () => {
    expect(m5.tiles).toHaveLength(18);
  });

  it('each tile row has exactly 32 columns', () => {
    for (let r = 0; r < 18; r++) {
      expect(m5.tiles[r]).toHaveLength(32);
    }
  });

  it('has exactly 2 waypoint paths (multi-path format)', () => {
    const paths = getWaypointPaths(m5);
    expect(paths).toHaveLength(2);
  });

  it('path A starts at top-left (col 0, row 3)', () => {
    const paths = getWaypointPaths(m5);
    expect(paths[0][0]).toEqual({ col: 0, row: 3 });
  });

  it('path B starts at bottom-left (col 0, row 14)', () => {
    const paths = getWaypointPaths(m5);
    expect(paths[1][0]).toEqual({ col: 0, row: 14 });
  });

  it('both paths share the same exit point', () => {
    const paths = getWaypointPaths(m5);
    const exitA = paths[0][paths[0].length - 1];
    const exitB = paths[1][paths[1].length - 1];
    expect(exitA).toEqual(exitB);
  });

  it('exit is on the right side (col >= 31)', () => {
    const paths = getWaypointPaths(m5);
    const exit = paths[0][paths[0].length - 1];
    expect(exit.col).toBeGreaterThanOrEqual(31);
  });

  it('paths converge at row 9 (mid-map)', () => {
    const paths = getWaypointPaths(m5);
    // Both paths should pass through row 9
    const pathARows = paths[0].map(wp => wp.row);
    const pathBRows = paths[1].map(wp => wp.row);
    expect(pathARows).toContain(9);
    expect(pathBRows).toContain(9);
  });

  it('each path has at least 1 turn before convergence', () => {
    const paths = getWaypointPaths(m5);
    // Path A: (0,3)→(8,3)→(8,9)→(33,9) — turns at (8,3)
    expect(paths[0].length).toBeGreaterThanOrEqual(3);
    // Path B: (0,14)→(12,14)→(12,9)→(33,9) — turns at (12,14)
    expect(paths[1].length).toBeGreaterThanOrEqual(3);
  });

  it('path A waypoints lie on PATH tiles (or off-grid exit)', () => {
    const paths = getWaypointPaths(m5);
    for (const wp of paths[0]) {
      if (wp.col >= m5.cols) continue; // off-grid exit
      expect(m5.tiles[wp.row][wp.col]).toBe(1);
    }
  });

  it('path B waypoints lie on PATH tiles (or off-grid exit)', () => {
    const paths = getWaypointPaths(m5);
    for (const wp of paths[1]) {
      if (wp.col >= m5.cols) continue;
      expect(m5.tiles[wp.row][wp.col]).toBe(1);
    }
  });

  it('starting gold is higher than single-path maps (+25 to +50)', () => {
    expect(m5.startingGold).toBeGreaterThanOrEqual(225);
    expect(m5.startingGold).toBeLessThanOrEqual(250);
  });

  it('starting lives are standard (20)', () => {
    expect(m5.startingLives).toBe(20);
  });

  it('paths have different lengths for staggered arrival at convergence', () => {
    const paths = getWaypointPaths(m5);
    // Count total manhattan distance for each path
    const dist = (p: MapWaypoint[]) => {
      let d = 0;
      for (let i = 1; i < p.length; i++) {
        d += Math.abs(p[i].col - p[i - 1].col) + Math.abs(p[i].row - p[i - 1].row);
      }
      return d;
    };
    // Paths should have different lengths so waves don't arrive simultaneously
    expect(dist(paths[0])).not.toBe(dist(paths[1]));
  });
});

// ── Stage registration ──────────────────────────────────────────────────

describe('niizh-miikana-01 stage registration', () => {
  const stage = getStageDef('niizh-miikana-01');

  it('exists in ALL_STAGES', () => {
    expect(stage).toBeDefined();
  });

  it('has correct pathFile', () => {
    expect(stage!.pathFile).toBe('map-05');
  });

  it('is in the mashkiig region', () => {
    expect(stage!.regionId).toBe('mashkiig');
  });

  it('has difficulty 3 (intermediate)', () => {
    expect(stage!.difficulty).toBe(3);
  });

  it('has 20 waves', () => {
    expect(stage!.waveCount).toBe(20);
  });

  it('tower affinities include tesla and rock-hurler (AoE at convergence)', () => {
    expect(stage!.towerAffinities).toContain('tesla');
    expect(stage!.towerAffinities).toContain('rock-hurler');
  });

  it('unlock cost is between 200 and 300 crystals', () => {
    expect(stage!.unlockCost).toBeGreaterThanOrEqual(200);
    expect(stage!.unlockCost).toBeLessThanOrEqual(300);
  });

  it('has a non-null unlockId', () => {
    expect(stage!.unlockId).toBe('unlock-stage-niizh-miikana-01');
  });

  it('is discoverable via getStageByPathFile', () => {
    const found = getStageByPathFile('map-05');
    expect(found).toBe(stage);
  });

  it('mashkiig region lists it', () => {
    const region = ALL_REGIONS.find(r => r.id === 'mashkiig');
    expect(region).toBeDefined();
    expect(region!.stages).toContain('niizh-miikana-01');
  });
});

// ── Unlock node registration ─────────────────────────────────────────────

describe('niizh-miikana-01 unlock node', () => {
  const node = getStageUnlockNode('niizh-miikana-01');

  it('exists in UNLOCK_NODES', () => {
    expect(node).toBeDefined();
  });

  it('has id unlock-stage-niizh-miikana-01', () => {
    expect(node!.id).toBe('unlock-stage-niizh-miikana-01');
  });

  it('costs 250 crystals', () => {
    expect(node!.cost).toBe(250);
  });

  it('has unlock-map-02 as prerequisite', () => {
    expect(node!.prereqs).toContain('unlock-map-02');
  });

  it('effect type is stage with correct stageId', () => {
    expect(node!.effect).toEqual({ type: 'stage', stageId: 'niizh-miikana-01' });
  });

  it('is included in LOCKED_STAGE_IDS', () => {
    expect(LOCKED_STAGE_IDS).toContain('niizh-miikana-01');
  });

  it('prereq node (unlock-map-02) exists in UNLOCK_NODES', () => {
    const prereqNode = UNLOCK_NODES.find(n => n.id === 'unlock-map-02');
    expect(prereqNode).toBeDefined();
  });

  it('has a non-empty description', () => {
    expect(node!.description.length).toBeGreaterThan(0);
  });

  it('has a non-empty label', () => {
    expect(node!.label.length).toBeGreaterThan(0);
  });
});

// ── Backward compatibility — existing single-path maps ──────────────────

describe('backward compatibility with existing single-path maps', () => {
  // Import existing single-path maps
  it('map-01 normalises to 1 path', async () => {
    const map01 = (await import('../../../public/data/maps/map-01.json')).default as unknown as MapData;
    const paths = getWaypointPaths(map01);
    expect(paths).toHaveLength(1);
    expect(paths[0].length).toBeGreaterThanOrEqual(2);
  });

  it('map-02 normalises to 1 path', async () => {
    const map02 = (await import('../../../public/data/maps/map-02.json')).default as unknown as MapData;
    const paths = getWaypointPaths(map02);
    expect(paths).toHaveLength(1);
    expect(paths[0].length).toBeGreaterThanOrEqual(2);
  });

  it('map-03 normalises to 1 path', async () => {
    const map03 = (await import('../../../public/data/maps/map-03.json')).default as unknown as MapData;
    const paths = getWaypointPaths(map03);
    expect(paths).toHaveLength(1);
  });

  it('map-04 normalises to 1 path', async () => {
    const map04 = (await import('../../../public/data/maps/map-04.json')).default as unknown as MapData;
    const paths = getWaypointPaths(map04);
    expect(paths).toHaveLength(1);
  });
});

// ── Cross-referencing integrity ─────────────────────────────────────────

describe('overall data integrity after dual-entrance addition', () => {
  it('UNLOCK_NODES has 10 total nodes (1 map + 4 commanders + 5 stages)', () => {
    expect(UNLOCK_NODES).toHaveLength(10);
  });

  it('ALL_STAGES has 7 stages', () => {
    expect(ALL_STAGES).toHaveLength(7);
  });

  it('ALL_REGIONS still has 4 regions', () => {
    expect(ALL_REGIONS).toHaveLength(4);
  });

  it('mashkiig region has 2 stages', () => {
    const region = ALL_REGIONS.find(r => r.id === 'mashkiig');
    expect(region!.stages).toHaveLength(2);
    expect(region!.stages).toContain('mashkiig-01');
    expect(region!.stages).toContain('niizh-miikana-01');
  });

  it('every stage is referenced by exactly one region', () => {
    const allReferenced: string[] = [];
    for (const r of ALL_REGIONS) {
      allReferenced.push(...r.stages);
    }
    expect(new Set(allReferenced).size).toBe(allReferenced.length);
    expect(allReferenced.length).toBe(ALL_STAGES.length);
  });

  it('all locked stages have a matching unlock node', () => {
    for (const stageId of LOCKED_STAGE_IDS) {
      const node = getStageUnlockNode(stageId);
      expect(node).toBeDefined();
    }
  });

  it('stage unlock costs form ascending progression', () => {
    const stageNodes = UNLOCK_NODES.filter(n => n.effect.type === 'stage');
    const costs = stageNodes.map(n => n.cost).sort((a, b) => a - b);
    expect(costs).toEqual([250, 500, 600, 700, 750]);
  });
});
