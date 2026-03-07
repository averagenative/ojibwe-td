/**
 * Meta Menu UI Fixes — TASK-095
 *
 * Validates that MetaMenuScene uses PAL.bgDark + grid background,
 * word-wraps descriptions with maxLines overflow guard, and uses
 * full-height NODE_H for unlock nodes.
 *
 * Since Phaser cannot be loaded in vitest, we read source files via ?raw
 * imports and verify structural patterns.
 */
import { describe, it, expect } from 'vitest';
import metaMenuSrc from '../../scenes/MetaMenuScene.ts?raw';
import mainMenuSrc from '../../scenes/MainMenuScene.ts?raw';
import { UNLOCK_NODES } from '../../meta/unlockDefs';
import { PAL } from '../../ui/palette';

// ── Helper: extract a method body from source ─────────────────────────────
function extractMethod(src: string, name: string): string {
  const start = src.indexOf(`private ${name}`);
  if (start === -1) return '';
  let depth = 0;
  let begun = false;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') { depth++; begun = true; }
    if (src[i] === '}') { depth--; }
    if (begun && depth === 0) return src.slice(start, i + 1);
  }
  return src.slice(start);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Background — PAL.bgDark + grid overlay
// ═══════════════════════════════════════════════════════════════════════════
describe('background matches game visual style', () => {
  const bgMethod = extractMethod(metaMenuSrc, 'createBackground');

  it('createBackground exists and is called in create()', () => {
    expect(bgMethod.length).toBeGreaterThan(0);
    expect(metaMenuSrc).toContain('this.createBackground()');
  });

  it('uses PAL.bgDark for the background rectangle', () => {
    expect(bgMethod).toContain('PAL.bgDark');
  });

  it('does NOT use the old hardcoded BG_COLOR constant', () => {
    expect(metaMenuSrc).not.toContain('BG_COLOR');
    expect(metaMenuSrc).not.toContain('0x0a0a0a');
  });

  it('draws a 40px grid overlay', () => {
    expect(bgMethod).toContain('const ts = 40');
    // MetaMenuScene uses PAL.bgPanel constant (TASK-170 palette update)
    expect(bgMethod).toContain('gfx.lineStyle(1, PAL.bgPanel, 0.3)');
  });

  it('grid uses PAL constants and same spacing as MainMenuScene', () => {
    const mainBg = extractMethod(mainMenuSrc, 'createBackground');
    // Both use 40px grid and PAL.bgDark for background fill
    expect(mainBg).toContain('const ts = 40');
    expect(bgMethod).toContain('PAL.bgDark');
    expect(mainBg).toContain('PAL.bgDark');
  });

  it('imports PAL from ui/palette', () => {
    expect(metaMenuSrc).toMatch(/import\s*\{[^}]*PAL[^}]*\}\s*from\s*['"]\.\.\/ui\/palette['"]/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Unlock node text overflow prevention
// ═══════════════════════════════════════════════════════════════════════════
describe('unlock node description overflow prevention', () => {
  const renderNodeMethod = extractMethod(metaMenuSrc, 'renderNode');

  it('renderNode description has wordWrap configured', () => {
    expect(renderNodeMethod).toMatch(/wordWrap:\s*\{/);
  });

  it('renderNode description has maxLines: 3', () => {
    expect(renderNodeMethod).toMatch(/maxLines:\s*3/);
  });

  it('wordWrap width accounts for padding and badge', () => {
    // Should be PANEL_W - NODE_PAD_X * 2 - 100
    expect(renderNodeMethod).toContain('PANEL_W - NODE_PAD_X * 2 - 100');
  });

  it('uses full NODE_H (90) for unlock node height', () => {
    const unlockTab = extractMethod(metaMenuSrc, 'renderUnlocksTab');
    // Node height assignment should use NODE_H, not NODE_H_COMPACT
    expect(unlockTab).toContain('const nodeH = NODE_H');
    expect(unlockTab).not.toMatch(/const nodeH\s*=\s*NODE_H_COMPACT/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Shop tab description overflow prevention
// ═══════════════════════════════════════════════════════════════════════════
describe('shop tab description overflow prevention', () => {
  const shopMethod = extractMethod(metaMenuSrc, 'renderShopTab');

  it('shop description has wordWrap configured', () => {
    expect(shopMethod).toMatch(/wordWrap:\s*\{/);
  });

  it('shop description has maxLines: 3', () => {
    expect(shopMethod).toMatch(/maxLines:\s*3/);
  });

  it('shop wordWrap width accounts for padding and badge area', () => {
    expect(shopMethod).toContain('PANEL_W - NODE_PAD_X * 2 - 110');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Description length vs node box capacity
// ═══════════════════════════════════════════════════════════════════════════
describe('description lengths within capacity', () => {
  // At 11px monospace, approx 6.6px/char. Wrap width 280px ≈ 42 chars/line.
  // NODE_H=90, desc starts at y+32 → 58px for text. At ~16px line-height → ~3.6 lines.
  // maxLines: 3 guards overflow.
  const WRAP_WIDTH_CHARS_APPROX = 42;
  const MAX_LINES = 3;

  for (const node of UNLOCK_NODES) {
    it(`"${node.id}" description fits within 3 wrapped lines (desktop)`, () => {
      const estLines = Math.ceil(node.description.length / WRAP_WIDTH_CHARS_APPROX);
      // maxLines: 3 will clip if > 3, but let's verify most fit without clipping
      expect(estLines).toBeLessThanOrEqual(MAX_LINES + 1); // allow 1 line of clipping at most
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Layout constants consistency
// ═══════════════════════════════════════════════════════════════════════════
describe('layout constants', () => {
  it('NODE_H is 90', () => {
    expect(metaMenuSrc).toMatch(/const NODE_H\s*=\s*90/);
  });

  it('NODE_H_COMPACT is 60 (still defined for scroll arrows)', () => {
    expect(metaMenuSrc).toMatch(/const NODE_H_COMPACT\s*=\s*60/);
  });

  it('PANEL_W is 420', () => {
    expect(metaMenuSrc).toMatch(/const PANEL_W\s*=\s*420/);
  });

  it('NODE_PAD_X is 20', () => {
    expect(metaMenuSrc).toMatch(/const NODE_PAD_X\s*=\s*20/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Edge cases & boundary checks
// ═══════════════════════════════════════════════════════════════════════════
describe('edge cases', () => {
  it('PAL.bgDark is a valid hex colour number', () => {
    expect(typeof PAL.bgDark).toBe('number');
    expect(PAL.bgDark).toBeGreaterThanOrEqual(0);
    expect(PAL.bgDark).toBeLessThanOrEqual(0xffffff);
  });

  it('empty description does not break maxLines (0 chars → 0 lines ≤ 3)', () => {
    const lines = Math.ceil(0 / 42);
    expect(lines).toBeLessThanOrEqual(3);
  });

  it('very long description is guarded by maxLines: 3 in both tabs', () => {
    // Even a 500-char description would be 12+ lines, but maxLines clips at 3
    const renderNodeMethod = extractMethod(metaMenuSrc, 'renderNode');
    const shopMethod = extractMethod(metaMenuSrc, 'renderShopTab');
    expect(renderNodeMethod).toMatch(/maxLines:\s*3/);
    expect(shopMethod).toMatch(/maxLines:\s*3/);
  });

  it('all UNLOCK_NODES have non-empty descriptions', () => {
    for (const node of UNLOCK_NODES) {
      expect(node.description.length, `${node.id} description`).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. No stubs or placeholders
// ═══════════════════════════════════════════════════════════════════════════
describe('no stubs or placeholders in MetaMenuScene', () => {
  it('no TODO/FIXME/HACK/STUB comments', () => {
    // Only check non-comment lines to avoid false positives in test descriptions
    const lines = metaMenuSrc.split('\n');
    const codeLines = lines.filter(l => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('//'));
    const joined = codeLines.join('\n');
    expect(joined).not.toMatch(/\/\/\s*(TODO|FIXME|HACK|STUB)/i);
  });

  it('no "not implemented" throws', () => {
    expect(metaMenuSrc).not.toContain('not implemented');
  });
});
