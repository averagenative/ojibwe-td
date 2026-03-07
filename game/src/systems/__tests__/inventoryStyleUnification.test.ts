/**
 * Inventory Style Unification — TASK-171
 *
 * Source-pattern tests verifying that InventoryScene matches MetaMenuScene
 * styling conventions: same palette constants, grid overlay, button patterns,
 * and touch scroll support.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const readScene = (name: string) =>
  fs.readFileSync(path.resolve(__dirname, `../../scenes/${name}`), 'utf-8');

const inventorySrc = readScene('InventoryScene.ts');
const metaMenuSrc  = readScene('MetaMenuScene.ts');

// ═══════════════════════════════════════════════════════════════════════════
// 1. Grid overlay matches MetaMenuScene
// ═══════════════════════════════════════════════════════════════════════════
describe('grid overlay matches MetaMenuScene', () => {
  it('uses PAL.bgPanel for grid line colour', () => {
    expect(inventorySrc).toContain('lineStyle(1, PAL.bgPanel, 0.3)');
  });

  it('uses 40px tile size for grid', () => {
    expect(inventorySrc).toContain('const ts = 40');
  });

  it('MetaMenuScene uses same grid pattern', () => {
    expect(metaMenuSrc).toContain('lineStyle(1, PAL.bgPanel, 0.3)');
  });

  it('both scenes use PAL.bgDark as base background', () => {
    expect(inventorySrc).toContain('PAL.bgDark');
    expect(metaMenuSrc).toContain('PAL.bgDark');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Button styling matches MetaMenuScene conventions
// ═══════════════════════════════════════════════════════════════════════════
describe('_makeButton matches MetaMenuScene.makeButton', () => {
  it('uses 200×48 button dimensions', () => {
    expect(inventorySrc).toMatch(/rectangle\(x, y, 200, 48, PAL\.bgPanel\)/);
  });

  it('uses PAL.borderInactive for button stroke', () => {
    expect(inventorySrc).toMatch(/setStrokeStyle\(2, PAL\.borderInactive\)/);
  });

  it('uses PAL.textSecondary for button text colour', () => {
    expect(inventorySrc).toContain("color: PAL.textSecondary");
  });

  it('hover changes fill to PAL.bgPanelHover', () => {
    expect(inventorySrc).toContain('bg.setFillStyle(PAL.bgPanelHover)');
  });

  it('hover changes text to PAL.textPrimary', () => {
    expect(inventorySrc).toContain("txt.setColor(PAL.textPrimary)");
  });

  it('does not use old accentGreenN for main buttons', () => {
    // _makeButton should not reference accentGreenN — that was the old style
    const makeButtonBlock = inventorySrc.slice(
      inventorySrc.indexOf('private _makeButton('),
      inventorySrc.indexOf('private _makeDetailButton('),
    );
    expect(makeButtonBlock).not.toContain('accentGreenN');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Filter button styling uses unified palette
// ═══════════════════════════════════════════════════════════════════════════
describe('filter button palette alignment', () => {
  it('active filter border uses PAL.borderActive', () => {
    expect(inventorySrc).toContain('PAL.borderActive');
  });

  it('active filter text uses PAL.textPrimary', () => {
    // In _buildFilters, active filter label colour should be textPrimary
    const filterBlock = inventorySrc.slice(
      inventorySrc.indexOf('private _buildFilters'),
      inventorySrc.indexOf('private _getFilteredItems'),
    );
    expect(filterBlock).toContain('PAL.textPrimary');
  });

  it('inactive filter border uses PAL.borderInactive', () => {
    expect(inventorySrc).toContain('PAL.borderInactive');
  });

  it('inactive filter text uses PAL.textMuted', () => {
    const filterBlock = inventorySrc.slice(
      inventorySrc.indexOf('private _buildFilters'),
      inventorySrc.indexOf('private _getFilteredItems'),
    );
    expect(filterBlock).toContain('PAL.textMuted');
  });

  it('does not use raw hex accentGreen for filter text', () => {
    const filterBlock = inventorySrc.slice(
      inventorySrc.indexOf('private _buildFilters'),
      inventorySrc.indexOf('private _getFilteredItems'),
    );
    expect(filterBlock).not.toContain("PAL.accentGreen");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Touch scroll support
// ═══════════════════════════════════════════════════════════════════════════
describe('touch scroll for gear list', () => {
  it('registers pointerdown handler', () => {
    expect(inventorySrc).toContain("this.input.on('pointerdown'");
  });

  it('registers pointerup handler', () => {
    expect(inventorySrc).toContain("this.input.on('pointerup'");
  });

  it('checks pointer is within grid area on pointerdown', () => {
    expect(inventorySrc).toContain('ptr.y >= GRID_TOP && ptr.y <= gridBottom');
  });

  it('applies a 30px swipe threshold', () => {
    expect(inventorySrc).toContain('Math.abs(dy) < 30');
  });

  it('computes gridBottom from GRID_TOP + visible rows', () => {
    expect(inventorySrc).toContain(
      'GRID_TOP + GRID_ROWS_VIS * (CELL_SIZE + CELL_GAP)',
    );
  });

  it('clamps scroll to maxOffset', () => {
    expect(inventorySrc).toContain('this.scrollOffset < maxOffset');
  });

  it('prevents scrolling below zero', () => {
    expect(inventorySrc).toContain('this.scrollOffset > 0');
  });

  it('calls _buildGrid after scrolling', () => {
    // Both scroll directions should rebuild the grid
    const touchBlock = inventorySrc.slice(
      inventorySrc.indexOf("this.input.on('pointerup'"),
      inventorySrc.indexOf('// BACK button'),
    );
    const buildGridCalls = (touchBlock.match(/_buildGrid\(\)/g) || []).length;
    expect(buildGridCalls).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Palette import and consistency
// ═══════════════════════════════════════════════════════════════════════════
describe('palette imports and consistency', () => {
  it('imports PAL from ../ui/palette', () => {
    expect(inventorySrc).toContain("from '../ui/palette'");
  });

  it('MetaMenuScene also imports PAL from same module', () => {
    expect(metaMenuSrc).toContain("from '../ui/palette'");
  });

  it('title uses PAL.fontTitle for heading', () => {
    expect(inventorySrc).toContain('PAL.fontTitle');
  });

  it('body text uses PAL.fontBody', () => {
    expect(inventorySrc).toContain('PAL.fontBody');
  });
});
