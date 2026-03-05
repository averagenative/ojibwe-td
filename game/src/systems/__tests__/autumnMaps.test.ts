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

describe('map-06.json (Firebreak Trail)', () => {
  const map = loadMap('map-06.json');

  it('has correct id and dimensions', () => {
    expect(map.id).toBe('map-06');
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
      // Only check tiles within the grid bounds
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

  it('uses varied scenery tiles (TREE, BRUSH, ROCK, BIRCH)', () => {
    const flat = map.tiles.flat();
    const tileTypes = new Set(flat);
    expect(tileTypes.has(3)).toBe(true); // TREE
    expect(tileTypes.has(4)).toBe(true); // BRUSH
    expect(tileTypes.has(5)).toBe(true); // ROCK
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

describe('map-07.json (Burnt Ridge)', () => {
  const map = loadMap('map-07.json');

  it('has correct id and dimensions', () => {
    expect(map.id).toBe('map-07');
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

  it('uses varied scenery tiles (TREE, BRUSH, ROCK, BIRCH)', () => {
    const flat = map.tiles.flat();
    const tileTypes = new Set(flat);
    expect(tileTypes.has(3)).toBe(true);
    expect(tileTypes.has(4)).toBe(true);
    expect(tileTypes.has(5)).toBe(true);
    expect(tileTypes.has(7)).toBe(true);
  });

  it('path layout is distinct from map-06', () => {
    const map06 = loadMap('map-06.json');
    const wps06 = JSON.stringify(map06.waypoints);
    const wps07 = JSON.stringify(map.waypoints);
    expect(wps06).not.toBe(wps07);
  });
});

// ── Stage defs ──────────────────────────────────────────────────────────────

describe('stageDefs — mitigomizh stages', () => {
  const mitStages = ALL_STAGES.filter(s => s.regionId === 'mitigomizh');

  it('mitigomizh region has exactly 3 stages', () => {
    expect(mitStages).toHaveLength(3);
  });

  it('mitigomizh-02 uses map-06 with correct properties', () => {
    const s = mitStages.find(s => s.id === 'mitigomizh-02');
    expect(s).toBeDefined();
    expect(s!.pathFile).toBe('map-06');
    expect(s!.regionId).toBe('mitigomizh');
    expect(s!.unlockId).toBe('unlock-stage-mitigomizh-02');
    expect(s!.unlockCost).toBe(600);
  });

  it('mitigomizh-03 uses map-07 with correct properties', () => {
    const s = mitStages.find(s => s.id === 'mitigomizh-03');
    expect(s).toBeDefined();
    expect(s!.pathFile).toBe('map-07');
    expect(s!.regionId).toBe('mitigomizh');
    expect(s!.unlockId).toBe('unlock-stage-mitigomizh-03');
    expect(s!.unlockCost).toBe(750);
  });

  it('unlock costs increase progressively', () => {
    const costs = mitStages.map(s => s.unlockCost).sort((a, b) => a - b);
    for (let i = 1; i < costs.length; i++) {
      expect(costs[i]).toBeGreaterThan(costs[i - 1]);
    }
  });

  it('mitigomizh region def includes all 3 stage IDs', () => {
    const region = ALL_REGIONS.find(r => r.id === 'mitigomizh');
    expect(region).toBeDefined();
    expect(region!.stages).toEqual(['mitigomizh-01', 'mitigomizh-02', 'mitigomizh-03']);
  });

  it('mitigomizh region has seasonalTheme autumn', () => {
    const region = ALL_REGIONS.find(r => r.id === 'mitigomizh');
    expect(region!.seasonalTheme).toBe('autumn');
  });
});

// ── Unlock nodes ────────────────────────────────────────────────────────────

describe('unlockDefs — new mitigomizh stage nodes', () => {
  it('unlock-stage-mitigomizh-02 exists with correct prereqs and cost', () => {
    const node = UNLOCK_NODES.find(n => n.id === 'unlock-stage-mitigomizh-02');
    expect(node).toBeDefined();
    expect(node!.cost).toBe(600);
    expect(node!.prereqs).toContain('unlock-stage-mitigomizh-01');
    expect(node!.effect).toEqual({ type: 'stage', stageId: 'mitigomizh-02' });
  });

  it('unlock-stage-mitigomizh-03 exists with correct prereqs and cost', () => {
    const node = UNLOCK_NODES.find(n => n.id === 'unlock-stage-mitigomizh-03');
    expect(node).toBeDefined();
    expect(node!.cost).toBe(750);
    expect(node!.prereqs).toContain('unlock-stage-mitigomizh-02');
    expect(node!.effect).toEqual({ type: 'stage', stageId: 'mitigomizh-03' });
  });

  it('unlock chain is linear: 01 → 02 → 03', () => {
    const n02 = UNLOCK_NODES.find(n => n.id === 'unlock-stage-mitigomizh-02')!;
    const n03 = UNLOCK_NODES.find(n => n.id === 'unlock-stage-mitigomizh-03')!;
    expect(n02.prereqs).toContain('unlock-stage-mitigomizh-01');
    expect(n03.prereqs).toContain('unlock-stage-mitigomizh-02');
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

describe('vignetteDefs — new autumn vignettes', () => {
  const mitVignettes = ALL_VIGNETTES.filter(v => v.regionId === 'mitigomizh');

  it('mitigomizh region has 6 vignettes total', () => {
    expect(mitVignettes).toHaveLength(6);
  });

  it('act3-controlled-burn vignette exists with correct fields', () => {
    const v = mitVignettes.find(v => v.id === 'act3-controlled-burn');
    expect(v).toBeDefined();
    expect(v!.triggerValue).toBe(5);
    expect(v!.speaker).toBe('Ogichidaa');
    expect(v!.codexUnlock).toBe('codex-teaching-controlled-burns');
    expect(v!.lines.length).toBeGreaterThanOrEqual(2);
  });

  it('act3-oak-resilience vignette exists with correct fields', () => {
    const v = mitVignettes.find(v => v.id === 'act3-oak-resilience');
    expect(v).toBeDefined();
    expect(v!.triggerValue).toBe(15);
    expect(v!.speaker).toBe('Ogichidaa');
    expect(v!.codexUnlock).toBe('codex-teaching-oak-resilience');
    expect(v!.lines.length).toBeGreaterThanOrEqual(2);
  });

  it('no two mitigomizh WAVE_COMPLETE vignettes share the same triggerValue', () => {
    const waveCompleteVignettes = mitVignettes.filter(v => v.trigger === TriggerType.WAVE_COMPLETE);
    const values = waveCompleteVignettes.map(v => v.triggerValue);
    expect(new Set(values).size).toBe(values.length);
  });

  it('each codexUnlock references an existing codex entry', () => {
    const codexIds = new Set(ALL_CODEX_ENTRIES.map(e => e.id));
    for (const v of mitVignettes) {
      if (v.codexUnlock) {
        expect(codexIds.has(v.codexUnlock)).toBe(true);
      }
    }
  });
});

// ── Codex teachings ─────────────────────────────────────────────────────────

describe('codexDefs — new autumn teachings', () => {
  it('codex-teaching-controlled-burns exists', () => {
    const entry = ALL_CODEX_ENTRIES.find(e => e.id === 'codex-teaching-controlled-burns');
    expect(entry).toBeDefined();
    expect(entry!.iconKey).toBe('teaching-controlled-burns');
    expect(entry!.lines.length).toBeGreaterThanOrEqual(2);
  });

  it('codex-teaching-oak-resilience exists', () => {
    const entry = ALL_CODEX_ENTRIES.find(e => e.id === 'codex-teaching-oak-resilience');
    expect(entry).toBeDefined();
    expect(entry!.iconKey).toBe('teaching-oak-resilience');
    expect(entry!.lines.length).toBeGreaterThanOrEqual(2);
  });

  it('teaching icon PNG files exist on disk', () => {
    const iconsDir = path.resolve(__dirname, '../../../public/assets/icons');
    expect(fs.existsSync(path.join(iconsDir, 'teaching-controlled-burns.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'teaching-oak-resilience.png'))).toBe(true);
  });

  it('all codex entry IDs are globally unique', () => {
    const ids = ALL_CODEX_ENTRIES.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── Autumn palette ──────────────────────────────────────────────────────────

describe('PALETTES.autumn — warmer brown enhancements', () => {
  const pal = PALETTES.autumn;

  it('groundBase is a dark brown (R < 0x40)', () => {
    const r = (pal.groundBase >> 16) & 0xff;
    expect(r).toBeLessThan(0x40);
  });

  it('treeColors has at least 4 foliage tones', () => {
    expect(pal.treeColors.length).toBeGreaterThanOrEqual(4);
  });

  it('treeColors include deep reds (R channel > 0x80, G < 0x60)', () => {
    const hasDeepRed = pal.treeColors.some(c => {
      const r = (c >> 16) & 0xff;
      const g = (c >> 8) & 0xff;
      return r > 0x80 && g < 0x60;
    });
    expect(hasDeepRed).toBe(true);
  });

  it('brushColor is dried golden-brown (not green)', () => {
    const g = (pal.brushColor >> 8) & 0xff;
    const r = (pal.brushColor >> 16) & 0xff;
    // Golden-brown: R should dominate G
    expect(r).toBeGreaterThan(g);
  });

  it('birchLeafColor is orange-yellow (not green)', () => {
    const r = (pal.birchLeafColor >> 16) & 0xff;
    const g = (pal.birchLeafColor >> 8) & 0xff;
    const b = pal.birchLeafColor & 0xff;
    // Orange-yellow: R > G > B
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });

  it('accentOverlay is non-null (leaf litter)', () => {
    expect(pal.accentOverlay).not.toBeNull();
  });

  it('grassColor is golden-brown / dried tan', () => {
    const r = (pal.grassColor >> 16) & 0xff;
    const g = (pal.grassColor >> 8) & 0xff;
    // Golden-brown: R should be high, G moderate
    expect(r).toBeGreaterThan(0x80);
    expect(g).toBeGreaterThan(0x40);
  });

  it('rockColor has warm grey-brown tone', () => {
    const r = (pal.rockColor >> 16) & 0xff;
    const g = (pal.rockColor >> 8) & 0xff;
    const b = pal.rockColor & 0xff;
    // Warm grey-brown: R >= G > B
    expect(r).toBeGreaterThanOrEqual(g);
    expect(g).toBeGreaterThanOrEqual(b);
  });

  it('pathAccentChance is > 0 (leaf litter on path)', () => {
    expect(pal.pathAccentChance).toBeGreaterThan(0);
  });

  it('pathAccentColor is brownish (fall leaf litter)', () => {
    const r = (pal.pathAccentColor! >> 16) & 0xff;
    expect(r).toBeGreaterThan(0x60);
  });
});

// ── All palettes have brushColor and birchLeafColor ─────────────────────────

describe('PALETTES — brushColor and birchLeafColor on all seasons', () => {
  for (const season of ['summer', 'spring', 'autumn', 'winter'] as const) {
    it(`${season} palette has brushColor`, () => {
      expect(typeof PALETTES[season].brushColor).toBe('number');
    });

    it(`${season} palette has birchLeafColor`, () => {
      expect(typeof PALETTES[season].birchLeafColor).toBe('number');
    });
  }
});
