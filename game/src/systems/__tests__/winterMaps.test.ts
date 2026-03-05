import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('phaser', () => ({ default: {} }));

import { ALL_STAGES, ALL_REGIONS } from '../../data/stageDefs';
import { UNLOCK_NODES } from '../../meta/unlockDefs';
import { ALL_VIGNETTES, TriggerType } from '../../data/vignetteDefs';
import { ALL_CODEX_ENTRIES } from '../../data/codexDefs';
import { PALETTES } from '../TerrainRenderer';

// ── Map JSON files ──────────────────────────────────────────────────────────

const mapsDir = path.resolve(__dirname, '../../../public/data/maps');

function loadMap(filename: string) {
  const raw = fs.readFileSync(path.join(mapsDir, filename), 'utf-8');
  return JSON.parse(raw);
}

describe('map-08.json (Frozen Lake Pass)', () => {
  const map = loadMap('map-08.json');

  it('has correct id and dimensions', () => {
    expect(map.id).toBe('map-08');
    expect(map.cols).toBe(32);
    expect(map.rows).toBe(18);
  });

  it('tile grid matches declared dimensions', () => {
    expect(map.tiles).toHaveLength(map.rows);
    for (const row of map.tiles) {
      expect(row).toHaveLength(map.cols);
    }
  });

  it('has starting lives of 20 and starting gold 200–250', () => {
    expect(map.startingLives).toBe(20);
    expect(map.startingGold).toBeGreaterThanOrEqual(200);
    expect(map.startingGold).toBeLessThanOrEqual(250);
  });

  it('has at least 2 waypoints', () => {
    expect(map.waypoints.length).toBeGreaterThanOrEqual(2);
  });

  it('all path tiles along waypoint segments are tile type 1', () => {
    const wps = map.waypoints;
    for (let i = 0; i < wps.length - 1; i++) {
      const from = wps[i];
      const to = wps[i + 1];
      if (from.row === to.row) {
        const r = from.row;
        const minC = Math.min(from.col, to.col);
        const maxC = Math.min(Math.max(from.col, to.col), map.cols - 1);
        for (let c = minC; c <= maxC; c++) {
          expect(map.tiles[r][c]).toBe(1);
        }
      } else if (from.col === to.col) {
        const c = from.col;
        const minR = Math.min(from.row, to.row);
        const maxR = Math.min(Math.max(from.row, to.row), map.rows - 1);
        for (let r = minR; r <= maxR; r++) {
          if (c < map.cols) {
            expect(map.tiles[r][c]).toBe(1);
          }
        }
      }
    }
  });

  it('uses varied scenery tiles (TREE, ROCK, WATER, BIRCH)', () => {
    const flat = map.tiles.flat();
    const tileTypes = new Set(flat);
    expect(tileTypes.has(3)).toBe(true); // TREE
    expect(tileTypes.has(5)).toBe(true); // ROCK
    expect(tileTypes.has(6)).toBe(true); // WATER (frozen lake)
    expect(tileTypes.has(7)).toBe(true); // BIRCH
  });

  it('tile values are all valid (0-8)', () => {
    for (const row of map.tiles) {
      for (const val of row) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(8);
      }
    }
  });
});

describe('map-09.json (Heart of the Storm)', () => {
  const map = loadMap('map-09.json');

  it('has correct id and dimensions', () => {
    expect(map.id).toBe('map-09');
    expect(map.cols).toBe(32);
    expect(map.rows).toBe(18);
  });

  it('tile grid matches declared dimensions', () => {
    expect(map.tiles).toHaveLength(map.rows);
    for (const row of map.tiles) {
      expect(row).toHaveLength(map.cols);
    }
  });

  it('has starting lives of 20 and starting gold 200–250', () => {
    expect(map.startingLives).toBe(20);
    expect(map.startingGold).toBeGreaterThanOrEqual(200);
    expect(map.startingGold).toBeLessThanOrEqual(250);
  });

  it('has at least 2 waypoints', () => {
    expect(map.waypoints.length).toBeGreaterThanOrEqual(2);
  });

  it('uses varied scenery tiles (TREE, ROCK, WATER, BIRCH)', () => {
    const flat = map.tiles.flat();
    const tileTypes = new Set(flat);
    expect(tileTypes.has(3)).toBe(true);
    expect(tileTypes.has(5)).toBe(true);
    expect(tileTypes.has(6)).toBe(true);
    expect(tileTypes.has(7)).toBe(true);
  });

  it('all path tiles along waypoint segments are tile type 1', () => {
    const wps = map.waypoints;
    for (let i = 0; i < wps.length - 1; i++) {
      const from = wps[i];
      const to = wps[i + 1];
      if (from.row === to.row) {
        const r = from.row;
        const minC = Math.min(from.col, to.col);
        const maxC = Math.min(Math.max(from.col, to.col), map.cols - 1);
        for (let c = minC; c <= maxC; c++) {
          expect(map.tiles[r][c]).toBe(1);
        }
      } else if (from.col === to.col) {
        const c = from.col;
        const minR = Math.min(from.row, to.row);
        const maxR = Math.min(Math.max(from.row, to.row), map.rows - 1);
        for (let r = minR; r <= maxR; r++) {
          if (c < map.cols) {
            expect(map.tiles[r][c]).toBe(1);
          }
        }
      }
    }
  });

  it('tile values are all valid (0-8)', () => {
    for (const row of map.tiles) {
      for (const val of row) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(8);
      }
    }
  });

  it('path layout is distinct from map-08', () => {
    const map08 = loadMap('map-08.json');
    const wps08 = JSON.stringify(map08.waypoints);
    const wps09 = JSON.stringify(map.waypoints);
    expect(wps08).not.toBe(wps09);
  });
});

// ── Stage defs ──────────────────────────────────────────────────────────────

describe('stageDefs — biboon-aki stages', () => {
  const bibStages = ALL_STAGES.filter(s => s.regionId === 'biboon-aki');

  it('biboon-aki region has exactly 3 stages', () => {
    expect(bibStages).toHaveLength(3);
  });

  it('biboon-aki-02 uses map-08 with correct properties', () => {
    const s = bibStages.find(s => s.id === 'biboon-aki-02');
    expect(s).toBeDefined();
    expect(s!.pathFile).toBe('map-08');
    expect(s!.regionId).toBe('biboon-aki');
    expect(s!.unlockId).toBe('unlock-stage-biboon-aki-02');
    expect(s!.unlockCost).toBe(850);
  });

  it('biboon-aki-03 uses map-09 with correct properties', () => {
    const s = bibStages.find(s => s.id === 'biboon-aki-03');
    expect(s).toBeDefined();
    expect(s!.pathFile).toBe('map-09');
    expect(s!.regionId).toBe('biboon-aki');
    expect(s!.unlockId).toBe('unlock-stage-biboon-aki-03');
    expect(s!.unlockCost).toBe(1000);
  });

  it('unlock costs increase progressively', () => {
    const costs = bibStages.map(s => s.unlockCost).sort((a, b) => a - b);
    for (let i = 1; i < costs.length; i++) {
      expect(costs[i]).toBeGreaterThan(costs[i - 1]);
    }
  });

  it('biboon-aki region def includes all 3 stage IDs', () => {
    const region = ALL_REGIONS.find(r => r.id === 'biboon-aki');
    expect(region).toBeDefined();
    expect(region!.stages).toEqual(['biboon-aki-01', 'biboon-aki-02', 'biboon-aki-03']);
  });

  it('biboon-aki region has seasonalTheme winter', () => {
    const region = ALL_REGIONS.find(r => r.id === 'biboon-aki');
    expect(region!.seasonalTheme).toBe('winter');
  });
});

// ── Unlock nodes ────────────────────────────────────────────────────────────

describe('unlockDefs — new biboon-aki stage nodes', () => {
  it('unlock-stage-biboon-aki-02 exists with correct prereqs and cost', () => {
    const node = UNLOCK_NODES.find(n => n.id === 'unlock-stage-biboon-aki-02');
    expect(node).toBeDefined();
    expect(node!.cost).toBe(850);
    expect(node!.prereqs).toContain('unlock-stage-biboon-aki-01');
    expect(node!.effect).toEqual({ type: 'stage', stageId: 'biboon-aki-02' });
  });

  it('unlock-stage-biboon-aki-03 exists with correct prereqs and cost', () => {
    const node = UNLOCK_NODES.find(n => n.id === 'unlock-stage-biboon-aki-03');
    expect(node).toBeDefined();
    expect(node!.cost).toBe(1000);
    expect(node!.prereqs).toContain('unlock-stage-biboon-aki-02');
    expect(node!.effect).toEqual({ type: 'stage', stageId: 'biboon-aki-03' });
  });

  it('unlock chain is linear: 01 → 02 → 03', () => {
    const n02 = UNLOCK_NODES.find(n => n.id === 'unlock-stage-biboon-aki-02')!;
    const n03 = UNLOCK_NODES.find(n => n.id === 'unlock-stage-biboon-aki-03')!;
    expect(n02.prereqs).toContain('unlock-stage-biboon-aki-01');
    expect(n03.prereqs).toContain('unlock-stage-biboon-aki-02');
  });

  it('every stage unlock node references a valid stage ID', () => {
    const stageIds = new Set(ALL_STAGES.map(s => s.id));
    const stageNodes = UNLOCK_NODES.filter(n => n.effect.type === 'stage');
    for (const node of stageNodes) {
      expect(stageIds.has((node.effect as { type: 'stage'; stageId: string }).stageId)).toBe(true);
    }
  });

  it('every stage unlockId references a valid unlock node', () => {
    const nodeIds = new Set(UNLOCK_NODES.map(n => n.id));
    for (const stage of ALL_STAGES) {
      if (stage.unlockId) {
        expect(nodeIds.has(stage.unlockId)).toBe(true);
      }
    }
  });
});

// ── Vignettes ───────────────────────────────────────────────────────────────

describe('vignetteDefs — new winter vignettes', () => {
  const bibVignettes = ALL_VIGNETTES.filter(v => v.regionId === 'biboon-aki');

  it('biboon-aki region has at least 8 vignettes total (5 original + 3 new)', () => {
    expect(bibVignettes.length).toBeGreaterThanOrEqual(8);
  });

  it('act4-frozen-lake vignette exists with correct fields', () => {
    const v = bibVignettes.find(v => v.id === 'act4-frozen-lake');
    expect(v).toBeDefined();
    expect(v!.triggerValue).toBe(3);
    expect(v!.speaker).toBe('Mishoomis');
    expect(v!.codexUnlock).toBe('codex-teaching-ice-fishing');
    expect(v!.lines.length).toBeGreaterThanOrEqual(2);
  });

  it('act4-winter-rest vignette exists with correct fields', () => {
    const v = bibVignettes.find(v => v.id === 'act4-winter-rest');
    expect(v).toBeDefined();
    expect(v!.triggerValue).toBe(7);
    expect(v!.speaker).toBe('Mishoomis');
    expect(v!.codexUnlock).toBe('codex-teaching-winter-rest');
    expect(v!.lines.length).toBeGreaterThanOrEqual(2);
  });

  it('act4-heart-approach vignette exists with correct fields', () => {
    const v = bibVignettes.find(v => v.id === 'act4-heart-approach');
    expect(v).toBeDefined();
    expect(v!.triggerValue).toBe(13);
    expect(v!.speaker).toBe('Mishoomis');
    expect(v!.codexUnlock).toBe('codex-teaching-earth-wound');
    expect(v!.lines.length).toBeGreaterThanOrEqual(2);
  });

  it('no two biboon-aki WAVE_COMPLETE vignettes share the same triggerValue', () => {
    const waveCompleteVignettes = bibVignettes.filter(v => v.trigger === TriggerType.WAVE_COMPLETE);
    const values = waveCompleteVignettes.map(v => v.triggerValue);
    expect(new Set(values).size).toBe(values.length);
  });

  it('each codexUnlock references an existing codex entry', () => {
    const codexIds = new Set(ALL_CODEX_ENTRIES.map(e => e.id));
    for (const v of bibVignettes) {
      if (v.codexUnlock) {
        expect(codexIds.has(v.codexUnlock)).toBe(true);
      }
    }
  });
});

// ── Codex teachings ─────────────────────────────────────────────────────────

describe('codexDefs — new winter teachings', () => {
  it('codex-teaching-ice-fishing exists', () => {
    const entry = ALL_CODEX_ENTRIES.find(e => e.id === 'codex-teaching-ice-fishing');
    expect(entry).toBeDefined();
    expect(entry!.iconKey).toBe('teaching-ice-fishing');
    expect(entry!.lines.length).toBeGreaterThanOrEqual(2);
  });

  it('codex-teaching-winter-rest exists', () => {
    const entry = ALL_CODEX_ENTRIES.find(e => e.id === 'codex-teaching-winter-rest');
    expect(entry).toBeDefined();
    expect(entry!.iconKey).toBe('teaching-winter-rest');
    expect(entry!.lines.length).toBeGreaterThanOrEqual(2);
  });

  it('codex-teaching-earth-wound exists', () => {
    const entry = ALL_CODEX_ENTRIES.find(e => e.id === 'codex-teaching-earth-wound');
    expect(entry).toBeDefined();
    expect(entry!.iconKey).toBe('teaching-earth-wound');
    expect(entry!.lines.length).toBeGreaterThanOrEqual(2);
  });

  it('teaching icon PNG files exist on disk', () => {
    const iconsDir = path.resolve(__dirname, '../../../public/assets/icons');
    expect(fs.existsSync(path.join(iconsDir, 'teaching-ice-fishing.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'teaching-winter-rest.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'teaching-earth-wound.png'))).toBe(true);
  });

  it('all codex entry IDs are globally unique', () => {
    const ids = ALL_CODEX_ENTRIES.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── Winter palette ──────────────────────────────────────────────────────────

describe('PALETTES.winter — snow/ice enhancements', () => {
  const pal = PALETTES.winter;

  it('groundBase is white/light blue (high luminosity)', () => {
    const r = (pal.groundBase >> 16) & 0xff;
    const g = (pal.groundBase >> 8) & 0xff;
    const b = pal.groundBase & 0xff;
    // All channels should be high (light snow colour)
    expect(r).toBeGreaterThan(0xa0);
    expect(g).toBeGreaterThan(0xa0);
    expect(b).toBeGreaterThan(0xa0);
  });

  it('pathBase is lighter than summer (packed snow)', () => {
    const winterR = (pal.pathBase >> 16) & 0xff;
    const summerR = (PALETTES.summer.pathBase >> 16) & 0xff;
    expect(winterR).toBeGreaterThan(summerR);
  });

  it('treeColors are dark green conifers (not bare grey)', () => {
    const hasGreen = pal.treeColors.some(c => {
      const g = (c >> 8) & 0xff;
      const r = (c >> 16) & 0xff;
      return g > r; // Green channel > red = green conifer
    });
    expect(hasGreen).toBe(true);
  });

  it('accentOverlay is non-null (snow patches)', () => {
    expect(pal.accentOverlay).not.toBeNull();
  });

  it('accentChance is >= 0.25 (generous snow coverage)', () => {
    expect(pal.accentChance).toBeGreaterThanOrEqual(0.25);
  });

  it('pathAccentColor is light (frost patches)', () => {
    const r = (pal.pathAccentColor! >> 16) & 0xff;
    expect(r).toBeGreaterThan(0xc0);
  });

  it('birchLeafColor is light grey-white (snow-covered)', () => {
    const r = (pal.birchLeafColor >> 16) & 0xff;
    const g = (pal.birchLeafColor >> 8) & 0xff;
    const b = pal.birchLeafColor & 0xff;
    expect(r).toBeGreaterThan(0xc0);
    expect(g).toBeGreaterThan(0xc0);
    expect(b).toBeGreaterThan(0xc0);
  });

  it('brushColor is frosted grey-green (dormant)', () => {
    const r = (pal.brushColor >> 16) & 0xff;
    const g = (pal.brushColor >> 8) & 0xff;
    // Frosted dormant: muted, not vivid green
    expect(r).toBeGreaterThan(0x70);
    expect(g).toBeGreaterThan(0x70);
  });

  it('rockColor is light blue-grey (frosted stone)', () => {
    const r = (pal.rockColor >> 16) & 0xff;
    const b = pal.rockColor & 0xff;
    // Blue-grey: blue channel >= red channel
    expect(b).toBeGreaterThanOrEqual(r);
  });
});

// ── AchievementManager stage-clear mapping ─────────────────────────────────

describe('AchievementManager — biboon-aki stage clears', () => {
  it('new stages map to clear-biboon-aki achievement', async () => {
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../AchievementManager.ts'),
      'utf-8',
    );
    expect(raw).toContain("'biboon-aki-02'");
    expect(raw).toContain("'biboon-aki-03'");
    expect(raw).toContain("'clear-biboon-aki'");
  });
});

// ── TerrainRenderer winter-specific rendering ──────────────────────────────

describe('TerrainRenderer — winter snow rendering code', () => {
  it('renderTerrain source handles winter snow for TREE tiles', async () => {
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../TerrainRenderer.ts'),
      'utf-8',
    );
    expect(raw).toContain("season === 'winter'");
    expect(raw).toContain('drawTreeClusterTile');
    expect(raw).toContain('winterSnow');
  });

  it('drawConifer accepts winterSnow parameter', () => {
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../TerrainRenderer.ts'),
      'utf-8',
    );
    expect(raw).toContain('function drawConifer');
    expect(raw).toContain('winterSnow');
  });

  it('winter water tiles render as frozen ice', () => {
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../TerrainRenderer.ts'),
      'utf-8',
    );
    // Frozen water: check for ice crack rendering in winter branch
    expect(raw).toContain('Frozen/icy water');
    expect(raw).toContain('crack lines');
  });

  it('winter birch tiles get snow accumulation', () => {
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../TerrainRenderer.ts'),
      'utf-8',
    );
    expect(raw).toContain('Snow accumulation on birch in winter');
  });

  it('winter buildable tiles get snowdrifts and frost sparkles', () => {
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../TerrainRenderer.ts'),
      'utf-8',
    );
    expect(raw).toContain('Winter snowdrifts and frost sparkles');
    expect(raw).toContain('Frost sparkle accents');
  });

  it('drawBareTree is no longer in the source (replaced by snow conifers)', () => {
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../TerrainRenderer.ts'),
      'utf-8',
    );
    expect(raw).not.toContain('function drawBareTree');
  });
});
