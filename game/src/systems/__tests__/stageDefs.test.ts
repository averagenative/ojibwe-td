/**
 * Phase 12 — Map & Stage Expansion: unit tests for stageDefs, SaveManager
 * lastPlayedStage, unlockDefs stage unlock nodes, and map JSON integrity.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ALL_STAGES,
  ALL_REGIONS,
  getStageDef,
  getRegionDef,
  getStageByPathFile,
  SEASON_PALETTE,
} from '../../data/stageDefs';
import {
  UNLOCK_NODES,
  LOCKED_STAGE_IDS,
  getStageUnlockNode,
} from '../../meta/unlockDefs';

// ── stageDefs data integrity ───────────────────────────────────────────────

describe('ALL_STAGES', () => {
  it('has at least 4 stages', () => {
    expect(ALL_STAGES.length).toBeGreaterThanOrEqual(4);
  });

  it('all stage IDs are unique', () => {
    const ids = ALL_STAGES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all stages have required fields with correct types', () => {
    for (const s of ALL_STAGES) {
      expect(typeof s.id).toBe('string');
      expect(s.id.length).toBeGreaterThan(0);
      expect(typeof s.regionId).toBe('string');
      expect(typeof s.name).toBe('string');
      expect(typeof s.description).toBe('string');
      expect(typeof s.waveCount).toBe('number');
      expect(s.waveCount).toBeGreaterThan(0);
      expect(typeof s.pathFile).toBe('string');
      expect(s.difficulty).toBeGreaterThanOrEqual(1);
      expect(s.difficulty).toBeLessThanOrEqual(5);
      expect(Array.isArray(s.towerAffinities)).toBe(true);
      expect(s.towerAffinities.length).toBeGreaterThanOrEqual(3);
      expect(typeof s.unlockCost).toBe('number');
      expect(s.unlockCost).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(s.creepRoster)).toBe(true);
      expect(s.creepRoster.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('all pathFile values are unique', () => {
    const paths = ALL_STAGES.map(s => s.pathFile);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('all stages reference a valid regionId', () => {
    const regionIds = new Set(ALL_REGIONS.map(r => r.id));
    for (const s of ALL_STAGES) {
      expect(regionIds.has(s.regionId)).toBe(true);
    }
  });

  it('difficulty is an integer between 1 and 5', () => {
    for (const s of ALL_STAGES) {
      expect(Number.isInteger(s.difficulty)).toBe(true);
      expect(s.difficulty).toBeGreaterThanOrEqual(1);
      expect(s.difficulty).toBeLessThanOrEqual(5);
    }
  });

  it('unlockId is null for free stages and a string for locked stages', () => {
    for (const s of ALL_STAGES) {
      if (s.unlockCost === 0) {
        expect(s.unlockId).toBeNull();
      } else {
        expect(typeof s.unlockId).toBe('string');
      }
    }
  });
});

// ── ALL_REGIONS ────────────────────────────────────────────────────────────

describe('ALL_REGIONS', () => {
  it('has 4 regions', () => {
    expect(ALL_REGIONS).toHaveLength(4);
  });

  it('all region IDs are unique', () => {
    const ids = ALL_REGIONS.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all regions have required fields', () => {
    for (const r of ALL_REGIONS) {
      expect(typeof r.id).toBe('string');
      expect(typeof r.name).toBe('string');
      expect(typeof r.displayName).toBe('string');
      expect(['spring', 'summer', 'autumn', 'winter']).toContain(r.seasonalTheme);
      expect(Array.isArray(r.stages)).toBe(true);
      expect(r.stages.length).toBeGreaterThanOrEqual(1);
      expect(typeof r.lore).toBe('string');
      expect(r.lore.length).toBeGreaterThan(0);
    }
  });

  it('all region stage references exist in ALL_STAGES', () => {
    const stageIds = new Set(ALL_STAGES.map(s => s.id));
    for (const r of ALL_REGIONS) {
      for (const sid of r.stages) {
        expect(stageIds.has(sid)).toBe(true);
      }
    }
  });

  it('every stage in ALL_STAGES is referenced by exactly one region', () => {
    const allReferencedStages: string[] = [];
    for (const r of ALL_REGIONS) {
      allReferencedStages.push(...r.stages);
    }
    expect(new Set(allReferencedStages).size).toBe(allReferencedStages.length);
    expect(allReferencedStages.length).toBe(ALL_STAGES.length);
  });

  it('4 named regions match the AC', () => {
    const names = ALL_REGIONS.map(r => r.id);
    expect(names).toContain('zaagaiganing');
    expect(names).toContain('mashkiig');
    expect(names).toContain('mitigomizh');
    expect(names).toContain('biboon-aki');
  });

  it('seasonal themes use all 4 seasons', () => {
    const themes = new Set(ALL_REGIONS.map(r => r.seasonalTheme));
    expect(themes).toEqual(new Set(['spring', 'summer', 'autumn', 'winter']));
  });
});

// ── SEASON_PALETTE ─────────────────────────────────────────────────────────

describe('SEASON_PALETTE', () => {
  it('has entries for all 4 seasons', () => {
    for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
      const pal = SEASON_PALETTE[season];
      expect(typeof pal.bg).toBe('number');
      expect(typeof pal.border).toBe('number');
      expect(typeof pal.text).toBe('string');
      expect(typeof pal.dim).toBe('number');
    }
  });
});

// ── getStageDef ────────────────────────────────────────────────────────────

describe('getStageDef', () => {
  it('returns the correct stage for a known ID', () => {
    const stage = getStageDef('zaagaiganing-01');
    expect(stage).toBeDefined();
    expect(stage!.id).toBe('zaagaiganing-01');
    expect(stage!.name).toBe('Winding Pass');
  });

  it('returns undefined for unknown ID', () => {
    expect(getStageDef('nonexistent-99')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getStageDef('')).toBeUndefined();
  });

  it('returns all 4 defined stages', () => {
    for (const s of ALL_STAGES) {
      expect(getStageDef(s.id)).toBe(s);
    }
  });
});

// ── getRegionDef ───────────────────────────────────────────────────────────

describe('getRegionDef', () => {
  it('returns the correct region for a known ID', () => {
    const region = getRegionDef('zaagaiganing');
    expect(region).toBeDefined();
    expect(region!.id).toBe('zaagaiganing');
  });

  it('returns undefined for unknown ID', () => {
    expect(getRegionDef('nonexistent')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getRegionDef('')).toBeUndefined();
  });
});

// ── getStageByPathFile ─────────────────────────────────────────────────────

describe('getStageByPathFile', () => {
  it('returns zaagaiganing-01 for pathFile map-01', () => {
    const stage = getStageByPathFile('map-01');
    expect(stage).toBeDefined();
    expect(stage!.id).toBe('zaagaiganing-01');
  });

  it('returns mashkiig-01 for pathFile map-02', () => {
    const stage = getStageByPathFile('map-02');
    expect(stage).toBeDefined();
    expect(stage!.id).toBe('mashkiig-01');
  });

  it('returns undefined for unknown pathFile', () => {
    expect(getStageByPathFile('map-99')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getStageByPathFile('')).toBeUndefined();
  });
});

// ── unlockDefs — stage unlock nodes ────────────────────────────────────────

describe('LOCKED_STAGE_IDS', () => {
  it('contains stages that have type:stage unlock nodes', () => {
    const expected = UNLOCK_NODES
      .filter(n => n.effect.type === 'stage')
      .map(n => (n.effect as { type: 'stage'; stageId: string }).stageId);
    expect(LOCKED_STAGE_IDS).toEqual(expected);
  });

  it('contains mitigomizh-01 and biboon-aki-01', () => {
    expect(LOCKED_STAGE_IDS).toContain('mitigomizh-01');
    expect(LOCKED_STAGE_IDS).toContain('biboon-aki-01');
  });

  it('does not contain free stages', () => {
    expect(LOCKED_STAGE_IDS).not.toContain('zaagaiganing-01');
  });
});

describe('getStageUnlockNode', () => {
  it('returns the unlock node for mitigomizh-01', () => {
    const node = getStageUnlockNode('mitigomizh-01');
    expect(node).toBeDefined();
    expect(node!.id).toBe('unlock-stage-mitigomizh-01');
    expect(node!.cost).toBe(500);
  });

  it('returns the unlock node for biboon-aki-01', () => {
    const node = getStageUnlockNode('biboon-aki-01');
    expect(node).toBeDefined();
    expect(node!.id).toBe('unlock-stage-biboon-aki-01');
    expect(node!.cost).toBe(700);
  });

  it('returns undefined for free stages', () => {
    expect(getStageUnlockNode('zaagaiganing-01')).toBeUndefined();
  });

  it('returns undefined for nonexistent stage', () => {
    expect(getStageUnlockNode('nonexistent')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getStageUnlockNode('')).toBeUndefined();
  });
});

describe('stage unlock prereqs are valid', () => {
  it('all stage unlock prereqs reference existing unlock nodes', () => {
    const allNodeIds = new Set(UNLOCK_NODES.map(n => n.id));
    const stageNodes = UNLOCK_NODES.filter(n => n.effect.type === 'stage');
    for (const node of stageNodes) {
      for (const prereq of node.prereqs) {
        expect(allNodeIds.has(prereq)).toBe(true);
      }
    }
  });

  it('biboon-aki prereqs mitigomizh', () => {
    const node = getStageUnlockNode('biboon-aki-01');
    expect(node!.prereqs).toContain('unlock-stage-mitigomizh-01');
  });
});

// ── SaveManager — lastPlayedStage ──────────────────────────────────────────

describe('SaveManager lastPlayedStage', () => {
  const SAVE_KEY = 'ojibwe-td-save';

  beforeEach(() => {
    // Clear singleton and localStorage before each test
    // Access private _instance to reset it
    (SaveManager as unknown as { _instance: null })._instance = null;
    localStorage.removeItem(SAVE_KEY);
  });

  afterEach(() => {
    (SaveManager as unknown as { _instance: null })._instance = null;
    localStorage.removeItem(SAVE_KEY);
  });

  // Import SaveManager after clearing
  it('defaults to zaagaiganing-01', async () => {
    const { SaveManager } = await import('../../meta/SaveManager');
    (SaveManager as unknown as { _instance: null })._instance = null;
    localStorage.removeItem(SAVE_KEY);
    const sm = SaveManager.getInstance();
    expect(sm.getLastPlayedStage()).toBe('zaagaiganing-01');
  });

  it('persists and retrieves a set stage', async () => {
    const { SaveManager } = await import('../../meta/SaveManager');
    (SaveManager as unknown as { _instance: null })._instance = null;
    localStorage.removeItem(SAVE_KEY);
    const sm = SaveManager.getInstance();
    sm.setLastPlayedStage('biboon-aki-01');
    expect(sm.getLastPlayedStage()).toBe('biboon-aki-01');

    // Verify it persists in storage
    const raw = localStorage.getItem(SAVE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.lastPlayedStage).toBe('biboon-aki-01');
  });

  it('back-fills lastPlayedStage for old save data without the field', async () => {
    // Simulate a pre-phase-12 save (no lastPlayedStage field)
    const oldSave = { version: 1, currency: 500, unlocks: ['unlock-map-02'] };
    localStorage.setItem(SAVE_KEY, JSON.stringify(oldSave));

    const { SaveManager } = await import('../../meta/SaveManager');
    (SaveManager as unknown as { _instance: null })._instance = null;
    const sm = SaveManager.getInstance();

    // Should get the default value
    expect(sm.getLastPlayedStage()).toBe('zaagaiganing-01');
    // Currency from old save should be preserved
    expect(sm.getCurrency()).toBe(500);
  });
});

// ── Map JSON file integrity ────────────────────────────────────────────────

import map03 from '../../../public/data/maps/map-03.json';
import map04 from '../../../public/data/maps/map-04.json';

type MapJson = {
  id: string; cols: number; rows: number;
  tiles: number[][]; waypoints: Array<{ col: number; row: number }>;
  startingLives: number; startingGold: number;
};

describe('map JSON files (map-03, map-04)', () => {
  const m3 = map03 as MapJson;
  const m4 = map04 as MapJson;

  it('map-03 has valid structure', () => {
    expect(m3.id).toBe('map-03');
    expect(m3.cols).toBe(32);
    expect(m3.rows).toBe(18);
    expect(m3.tiles).toHaveLength(18);
    expect(m3.tiles[0]).toHaveLength(32);
    expect(m3.waypoints.length).toBeGreaterThanOrEqual(2);
    expect(m3.startingLives).toBeGreaterThan(0);
    expect(m3.startingGold).toBeGreaterThan(0);
  });

  it('map-04 has valid structure', () => {
    expect(m4.id).toBe('map-04');
    expect(m4.cols).toBe(32);
    expect(m4.rows).toBe(18);
    expect(m4.tiles).toHaveLength(18);
    expect(m4.tiles[0]).toHaveLength(32);
    expect(m4.waypoints.length).toBeGreaterThanOrEqual(2);
    expect(m4.startingLives).toBeGreaterThan(0);
    expect(m4.startingGold).toBeGreaterThan(0);
  });

  it('map-03 tile rows all have correct column count', () => {
    for (let r = 0; r < m3.rows; r++) {
      expect(m3.tiles[r]).toHaveLength(m3.cols);
    }
  });

  it('map-04 tile rows all have correct column count', () => {
    for (let r = 0; r < m4.rows; r++) {
      expect(m4.tiles[r]).toHaveLength(m4.cols);
    }
  });

  it('map-03 waypoints trace the tile grid path correctly', () => {
    for (const wp of m3.waypoints) {
      if (wp.col >= m3.cols) continue; // exit point may be off-grid
      expect(m3.tiles[wp.row][wp.col]).toBe(1);
    }
  });

  it('map-04 waypoints trace the tile grid path correctly', () => {
    for (const wp of m4.waypoints) {
      if (wp.col >= m4.cols) continue; // exit point may be off-grid
      expect(m4.tiles[wp.row][wp.col]).toBe(1);
    }
  });

  it('map-03 spawn tile is PATH', () => {
    const spawn = m3.waypoints[0];
    expect(m3.tiles[spawn.row][spawn.col]).toBe(1);
  });

  it('map-04 spawn tile is PATH', () => {
    const spawn = m4.waypoints[0];
    expect(m4.tiles[spawn.row][spawn.col]).toBe(1);
  });
});

// Import SaveManager type for the lastPlayedStage tests above
import { SaveManager } from '../../meta/SaveManager';
