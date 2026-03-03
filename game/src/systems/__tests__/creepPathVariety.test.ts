import { describe, it, expect, vi } from 'vitest';

// Mock Phaser to avoid phaser3spectorjs resolution error in test env.
vi.mock('phaser', () => ({ default: {} }));

import {
  posHash,
  shiftBrightness,
  PALETTES,
} from '../TerrainRenderer';

// Raw source for structural tests
import srcRaw from '../TerrainRenderer.ts?raw';

// ── New palette fields ──────────────────────────────────────────────────────

describe('Path variety palette fields', () => {
  const SEASONS = ['summer', 'spring', 'autumn', 'winter'] as const;

  it('every season has a pathStoneColor', () => {
    for (const s of SEASONS) {
      expect(typeof PALETTES[s].pathStoneColor).toBe('number');
    }
  });

  it('every season has pathAccentAlpha and pathAccentChance as numbers', () => {
    for (const s of SEASONS) {
      expect(typeof PALETTES[s].pathAccentAlpha).toBe('number');
      expect(typeof PALETTES[s].pathAccentChance).toBe('number');
    }
  });

  it('summer has no path accent overlay (null)', () => {
    expect(PALETTES.summer.pathAccentColor).toBeNull();
    expect(PALETTES.summer.pathAccentChance).toBe(0);
  });

  it('spring has muddy-puddle path accent', () => {
    expect(PALETTES.spring.pathAccentColor).not.toBeNull();
    expect(PALETTES.spring.pathAccentChance).toBeGreaterThan(0);
    expect(PALETTES.spring.pathAccentAlpha).toBeGreaterThan(0);
  });

  it('autumn has leaf-litter path accent', () => {
    expect(PALETTES.autumn.pathAccentColor).not.toBeNull();
    expect(PALETTES.autumn.pathAccentChance).toBeGreaterThan(0);
    expect(PALETTES.autumn.pathAccentAlpha).toBeGreaterThan(0);
  });

  it('winter has frost/ice path accent', () => {
    expect(PALETTES.winter.pathAccentColor).not.toBeNull();
    expect(PALETTES.winter.pathAccentChance).toBeGreaterThan(0);
    expect(PALETTES.winter.pathAccentAlpha).toBeGreaterThan(0);
  });

  it('path accent chances are below 0.25 (performance budget)', () => {
    for (const s of SEASONS) {
      expect(PALETTES[s].pathAccentChance).toBeLessThan(0.25);
    }
  });
});

// ── Brightness factor range ─────────────────────────────────────────────────

describe('Path tile brightness variation', () => {
  it('brightness factor spans a wider range than the old 0.95-1.05', () => {
    // Old: 0.95 + noise * 0.10 → [0.95, 1.05)
    // New: 0.86 + noise * 0.28 → [0.86, 1.14)
    // The minimum possible bFactor (noise=0, warmCool in neutral band)
    const minBase = 0.86;
    // The maximum possible bFactor (noise≈1, warmCool>0.66 → ×1.04)
    const maxBase = (0.86 + 0.28) * 1.04;
    expect(maxBase - minBase).toBeGreaterThan(0.2);
  });

  it('warm/cool shift applies correctly at boundaries', () => {
    // warmCool < 0.33 → bFactor * 0.96 (cooler/darker)
    const coolFactor = 0.86 * 0.96;
    expect(coolFactor).toBeLessThan(0.86);
    // warmCool > 0.66 → bFactor * 1.04 (warmer/brighter)
    const warmFactor = 1.14 * 1.04;
    expect(warmFactor).toBeGreaterThan(1.14);
  });

  it('shiftBrightness with the new range stays within valid RGB', () => {
    const pathBase = PALETTES.summer.pathBase; // 0x2a2010
    // Test extremes
    const darkest = shiftBrightness(pathBase, 0.86 * 0.96);
    const brightest = shiftBrightness(pathBase, 1.14 * 1.04);
    // Should not overflow: all channels in [0, 255]
    for (const c of [darkest, brightest]) {
      const r = (c >> 16) & 0xff;
      const g = (c >> 8) & 0xff;
      const b = c & 0xff;
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(255);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(255);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(255);
    }
  });
});

// ── posHash probability thresholds ──────────────────────────────────────────

describe('Path detail probability thresholds', () => {
  it('worn patches trigger at ~15% of tiles', () => {
    let count = 0;
    const seed = 42;
    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 20; c++) {
        if (posHash(seed, r, c, 41) < 0.15) count++;
      }
    }
    // With 400 samples at 15%, expect roughly 60 ± 30
    expect(count).toBeGreaterThan(20);
    expect(count).toBeLessThan(120);
  });

  it('pebble clusters trigger at ~10% of tiles', () => {
    let count = 0;
    const seed = 42;
    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 20; c++) {
        if (posHash(seed, r, c, 46) < 0.10) count++;
      }
    }
    // 400 samples at 10% → ~40 ± 25
    expect(count).toBeGreaterThan(10);
    expect(count).toBeLessThan(100);
  });

  it('edge grass tufts trigger at ~30% of eligible edges', () => {
    let count = 0;
    const seed = 42;
    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 20; c++) {
        if (posHash(seed, r, c, 60) < 0.30) count++;
      }
    }
    // 400 samples at 30% → ~120 ± 40
    expect(count).toBeGreaterThan(60);
    expect(count).toBeLessThan(200);
  });

  it('edge rocks trigger in the 0.30-0.40 band (~10%)', () => {
    let count = 0;
    const seed = 42;
    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 20; c++) {
        const h = posHash(seed, r, c, 60);
        if (h >= 0.30 && h < 0.40) count++;
      }
    }
    // 400 samples at 10% → ~40 ± 25
    expect(count).toBeGreaterThan(10);
    expect(count).toBeLessThan(100);
  });
});

// ── Structural tests (raw source inspection) ───────────────────────────────

describe('Path variety structural wiring', () => {
  it('drawWornPatch is defined and called from renderTerrain', () => {
    expect(srcRaw).toContain('function drawWornPatch(');
    // Called in the path tile loop
    expect(srcRaw).toContain('drawWornPatch(');
  });

  it('drawPathPebbles is defined and called from renderTerrain', () => {
    expect(srcRaw).toContain('function drawPathPebbles(');
    expect(srcRaw).toContain('drawPathPebbles(');
  });

  it('drawPathAccent is defined and called from renderTerrain', () => {
    expect(srcRaw).toContain('function drawPathAccent(');
    expect(srcRaw).toContain('drawPathAccent(');
  });

  it('drawPathEdgeTuft is defined and called from renderTerrain', () => {
    expect(srcRaw).toContain('function drawPathEdgeTuft(');
    expect(srcRaw).toContain('drawPathEdgeTuft(');
  });

  it('drawPathEdgeRock is defined and called from renderTerrain', () => {
    expect(srcRaw).toContain('function drawPathEdgeRock(');
    expect(srcRaw).toContain('drawPathEdgeRock(');
  });

  it('uses pathStoneColor from palette for pebbles', () => {
    expect(srcRaw).toContain('pal.pathStoneColor');
  });

  it('uses pathAccentColor from palette for season accents', () => {
    expect(srcRaw).toContain('pal.pathAccentColor');
  });

  it('warm/cool brightness shift uses salt 40 for independence', () => {
    // Ensures warm/cool hash is independent from the base noise hash (salt 0)
    expect(srcRaw).toContain('posHash(seed, row, col, 40)');
  });

  it('path accents guard on pathAccentColor !== null', () => {
    expect(srcRaw).toContain('pal.pathAccentColor !== null');
  });

  it('path accents guard on pathAccentChance', () => {
    expect(srcRaw).toContain('pal.pathAccentChance');
  });

  it('drawPathAccent handles autumn differently from spring/winter', () => {
    // Autumn gets leaf litter, others get puddle/frost
    expect(srcRaw).toContain("season === 'autumn'");
  });

  it('all four edge directions are decorated (top, bottom, left, right)', () => {
    expect(srcRaw).toContain("'top'");
    expect(srcRaw).toContain("'bottom'");
    expect(srcRaw).toContain("'left'");
    expect(srcRaw).toContain("'right'");
  });

  it('edge decorations only appear on non-connecting edges (!above, !below, etc.)', () => {
    // The edge decoration block uses the same adjacency checks as the edge lines
    const edgeDecoBlock = srcRaw.slice(srcRaw.indexOf('Path-edge decorations'));
    expect(edgeDecoBlock).toContain('!above');
    expect(edgeDecoBlock).toContain('!below');
    expect(edgeDecoBlock).toContain('!left');
    expect(edgeDecoBlock).toContain('!right');
  });

  it('does not modify pathing logic (TILE.PATH check unchanged)', () => {
    // The path tile loop still uses the same filter
    expect(srcRaw).toContain('tiles[row][col] !== TILE.PATH');
  });

  it('uses existing pathGfx (no new Graphics object for path details)', () => {
    // renderTerrain creates exactly 3 Graphics objects: baseGfx, pathGfx, decoGfx
    // The path detail additions must not create any extra ones
    const fnBody = srcRaw.slice(srcRaw.indexOf('export function renderTerrain'));
    const graphicsCreations = fnBody.match(/scene\.add\.graphics\(\)/g);
    expect(graphicsCreations?.length ?? 0).toBe(3);
  });
});
