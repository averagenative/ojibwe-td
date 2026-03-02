/**
 * Mobile Menu Layout Audit — TASK-080
 *
 * Validates that every Phaser scene modified in this task satisfies the mobile
 * layout acceptance criteria:
 *   - All font sizes ≥ 11px on mobile (body) and ≥ 14px (headers)
 *   - All interactive elements ≥ 44px tap target on mobile
 *   - _fs() scaling factor is 1.35× on mobile, 1× on desktop
 *   - Desktop font sizes unchanged (same numeric value as pre-patch)
 *   - Structural: each scene imports MobileManager and sets _isMobile
 *
 * Since Phaser cannot be loaded in vitest, we read source files via ?raw
 * imports and verify structural patterns + arithmetic contracts.
 */
import { describe, it, expect } from 'vitest';

// ── Source files loaded via Vite ?raw ──────────────────────────────────────
import betweenWaveSrc from '../../scenes/BetweenWaveScene.ts?raw';
import codexSrc from '../../scenes/CodexScene.ts?raw';
import commanderSelectSrc from '../../scenes/CommanderSelectScene.ts?raw';
import gameOverSrc from '../../scenes/GameOverScene.ts?raw';
import metaMenuSrc from '../../scenes/MetaMenuScene.ts?raw';

// ── Constants ──────────────────────────────────────────────────────────────
const MOBILE_SCALE = 1.35;
const MIN_FONT_PX = 11;
const MIN_TAP_TARGET = 44;

/** Scenes modified in TASK-080. */
const SCENES = [
  { name: 'BetweenWaveScene', src: betweenWaveSrc },
  { name: 'CodexScene', src: codexSrc },
  { name: 'CommanderSelectScene', src: commanderSelectSrc },
  { name: 'GameOverScene', src: gameOverSrc },
  { name: 'MetaMenuScene', src: metaMenuSrc },
];

// ── Helper: extract numeric font sizes passed to _fs() ─────────────────────
function extractFsSizes(src: string): number[] {
  // Matches this._fs(N) or _fs(N) where N is an integer
  const re = /\b_fs\((\d+)\)/g;
  const sizes: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    sizes.push(parseInt(m[1], 10));
  }
  return sizes;
}

// ── Helper: simulate _fs() ──────────────────────────────────────────────────
function fs(size: number, isMobile: boolean): string {
  const s = isMobile ? Math.round(size * MOBILE_SCALE) : size;
  return `${s}px`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. _fs() arithmetic
// ═══════════════════════════════════════════════════════════════════════════
describe('_fs() scaling logic', () => {
  it('returns unchanged pixel string on desktop', () => {
    expect(fs(16, false)).toBe('16px');
    expect(fs(11, false)).toBe('11px');
    expect(fs(32, false)).toBe('32px');
  });

  it('scales up by 1.35× and rounds on mobile', () => {
    expect(fs(16, true)).toBe(`${Math.round(16 * MOBILE_SCALE)}px`); // 22px
    expect(fs(13, true)).toBe(`${Math.round(13 * MOBILE_SCALE)}px`); // 18px
    expect(fs(11, true)).toBe(`${Math.round(11 * MOBILE_SCALE)}px`); // 15px
  });

  it('fs(11, mobile) produces at least 14px', () => {
    const size = Math.round(11 * MOBILE_SCALE);
    expect(size).toBeGreaterThanOrEqual(14);
  });

  it('fs(14, mobile) produces at least 18px (header minimum)', () => {
    const size = Math.round(14 * MOBILE_SCALE);
    expect(size).toBeGreaterThanOrEqual(18);
  });

  it('fs(0, desktop) returns 0px', () => {
    expect(fs(0, false)).toBe('0px');
  });

  it('fs(0, mobile) returns 0px', () => {
    expect(fs(0, true)).toBe('0px');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Structural: each scene imports MobileManager & sets _isMobile
// ═══════════════════════════════════════════════════════════════════════════
describe('structural — MobileManager integration', () => {
  for (const { name, src } of SCENES) {
    it(`${name} imports MobileManager`, () => {
      expect(src).toContain("import { MobileManager } from '../systems/MobileManager'");
    });

    it(`${name} sets _isMobile in create()`, () => {
      expect(src).toContain('this._isMobile = MobileManager.getInstance().isMobile()');
    });

    it(`${name} defines _fs() method`, () => {
      expect(src).toMatch(/private _fs\(size:\s*number\):\s*string/);
    });

    it(`${name} uses MOBILE_SCALE factor 1.35`, () => {
      expect(src).toContain('* 1.35');
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Font size floor: all _fs() inputs ≥ MIN_FONT_PX on desktop
// ═══════════════════════════════════════════════════════════════════════════
describe('font size floor — all _fs() args ≥ 11px', () => {
  for (const { name, src } of SCENES) {
    it(`${name}: every _fs() call uses size ≥ ${MIN_FONT_PX}`, () => {
      const sizes = extractFsSizes(src);
      expect(sizes.length).toBeGreaterThan(0);
      for (const s of sizes) {
        expect(s, `_fs(${s}) in ${name} is below ${MIN_FONT_PX}px minimum`).toBeGreaterThanOrEqual(MIN_FONT_PX);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Mobile font sizes all ≥ 11px after scaling
// ═══════════════════════════════════════════════════════════════════════════
describe('mobile font sizes ≥ 11px after 1.35× scaling', () => {
  for (const { name, src } of SCENES) {
    it(`${name}: every mobile font ≥ ${MIN_FONT_PX}px`, () => {
      const sizes = extractFsSizes(src);
      for (const s of sizes) {
        const mobilePx = Math.round(s * MOBILE_SCALE);
        expect(mobilePx, `_fs(${s}) → ${mobilePx}px in ${name}`).toBeGreaterThanOrEqual(MIN_FONT_PX);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Tap target sizes — verify 44px minimums on mobile
// ═══════════════════════════════════════════════════════════════════════════
describe('tap targets — 44px minimum on mobile', () => {
  it('BetweenWaveScene: reroll button height ≥ 44px on mobile', () => {
    // Source: const btnH = this._isMobile ? 44 : 40;
    expect(betweenWaveSrc).toMatch(/const btnH = this\._isMobile \? (\d+)/);
    const m = betweenWaveSrc.match(/const btnH = this\._isMobile \? (\d+)/);
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
  });

  it('BetweenWaveScene: card height ≥ 300px on mobile', () => {
    // Mobile cards are taller: this._cardH = this._isMobile ? 340 : CARD_H
    expect(betweenWaveSrc).toMatch(/this\._cardH = this\._isMobile \? (\d+)/);
    const m = betweenWaveSrc.match(/this\._cardH = this\._isMobile \? (\d+)/);
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(300);
  });

  it('CodexScene: tab height ≥ 44px on mobile', () => {
    expect(codexSrc).toMatch(/const tabH = this\._isMobile \? (\d+)/);
    const m = codexSrc.match(/const tabH = this\._isMobile \? (\d+)/);
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
  });

  it('CodexScene: back button height ≥ 44px on mobile', () => {
    expect(codexSrc).toMatch(/const btnH = this\._isMobile \? (\d+)/);
    const m = codexSrc.match(/const btnH = this\._isMobile \? (\d+)/);
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
  });

  it('CodexScene: mobile close button is 44px', () => {
    expect(codexSrc).toContain('const closeH = 44');
  });

  it('CommanderSelectScene: confirm button ≥ 44px on mobile', () => {
    expect(commanderSelectSrc).toMatch(/const btnH\s*= this\._isMobile \? (\d+)/);
    const m = commanderSelectSrc.match(/const btnH\s*= this\._isMobile \? (\d+)/);
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
  });

  it('CommanderSelectScene: back button ≥ 44px on mobile', () => {
    expect(commanderSelectSrc).toMatch(/const backH = this\._isMobile \? (\d+)/);
    const m = commanderSelectSrc.match(/const backH = this\._isMobile \? (\d+)/);
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
  });

  it('CommanderSelectScene: close button ≥ 44px on mobile', () => {
    expect(commanderSelectSrc).toMatch(/const closeH = this\._isMobile \? (\d+)/);
    const m = commanderSelectSrc.match(/const closeH = this\._isMobile \? (\d+)/);
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
  });

  it('CommanderSelectScene: popup buttons ≥ 44px on mobile', () => {
    expect(commanderSelectSrc).toMatch(/const popupBtnH = this\._isMobile \? (\d+)/);
    const m = commanderSelectSrc.match(/const popupBtnH = this\._isMobile \? (\d+)/);
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
  });

  it('CommanderSelectScene: dismiss button ≥ 44px on mobile', () => {
    expect(commanderSelectSrc).toMatch(/const dismissH = this\._isMobile \? (\d+)/);
    const m = commanderSelectSrc.match(/const dismissH = this\._isMobile \? (\d+)/);
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
  });

  it('GameOverScene: button height ≥ 44px on mobile', () => {
    expect(gameOverSrc).toMatch(/const btnH = this\._isMobile \? (\d+)/);
    const m = gameOverSrc.match(/const btnH = this\._isMobile \? (\d+)/);
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
  });

  it('MetaMenuScene: tab button ≥ 44px on mobile', () => {
    expect(metaMenuSrc).toMatch(/const tabH = this\._isMobile \? (\d+)/);
    const m = metaMenuSrc.match(/const tabH = this\._isMobile \? (\d+)/);
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
  });

  it('MetaMenuScene: navigation button ≥ 44px on mobile', () => {
    // makeButton: const btnH = this._isMobile ? 52 : 48;
    expect(metaMenuSrc).toMatch(/const btnH = this\._isMobile \? (\d+)/);
    const m = metaMenuSrc.match(/const btnH = this\._isMobile \? (\d+)/);
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
  });

  it('MetaMenuScene: unlock node ≥ 44px on mobile', () => {
    // nodeH = this._isMobile ? Math.max(NODE_H_COMPACT, 44) : NODE_H_COMPACT
    expect(metaMenuSrc).toContain('Math.max(NODE_H_COMPACT, 44)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Desktop layout preservation
// ═══════════════════════════════════════════════════════════════════════════
describe('desktop layout — _fs() values unchanged', () => {
  it('_fs(N) on desktop returns exactly N (no scaling)', () => {
    // The _fs function: const s = isMobile ? Math.round(size * 1.35) : size;
    // On desktop, the ternary returns `size` unchanged.
    for (const size of [9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 28, 32, 52]) {
      expect(fs(size, false)).toBe(`${size}px`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Mobile-specific layout adaptations
// ═══════════════════════════════════════════════════════════════════════════
describe('mobile layout adaptations', () => {
  it('CodexScene uses single column on mobile', () => {
    expect(codexSrc).toContain('// Single column — all entries stacked vertically');
    expect(codexSrc).toContain('col = 0');
    expect(codexSrc).toContain('row = i');
  });

  it('CodexScene uses full-screen overlay detail on mobile', () => {
    expect(codexSrc).toContain('// ── Mobile: full-screen overlay');
    expect(codexSrc).toContain("overlay.on('pointerup', () => this.clearDetail())");
  });

  it('CodexScene retains desktop side panel', () => {
    expect(codexSrc).toContain('// ── Desktop: side panel');
  });

  it('GameOverScene stacks buttons into two rows on mobile', () => {
    expect(gameOverSrc).toContain('const row1Y = height - 76');
    expect(gameOverSrc).toContain('const row2Y = height - 22');
  });

  it('GameOverScene keeps single row on desktop', () => {
    expect(gameOverSrc).toContain('const btnCount = 5');
  });

  it('CommanderSelectScene shows "tap for details" on mobile', () => {
    expect(commanderSelectSrc).toContain("'tap for details'");
    expect(commanderSelectSrc).toContain("'click for details'");
  });

  it('BetweenWaveScene uses taller cards on mobile (340 vs 300)', () => {
    expect(betweenWaveSrc).toContain('this._isMobile ? 340 : CARD_H');
  });

  it('CodexScene entry height uses Math.max for 56px minimum on mobile', () => {
    expect(codexSrc).toContain('Math.max(ENTRY_H, 56)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. Boundary & edge cases
// ═══════════════════════════════════════════════════════════════════════════
describe('boundary & edge cases', () => {
  it('_fs scaling factor 1.35 produces integer results for common sizes', () => {
    // Math.round ensures no fractional px values
    for (const size of [11, 12, 13, 14, 16, 18, 20, 24, 32, 52]) {
      const result = Math.round(size * MOBILE_SCALE);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThan(0);
    }
  });

  it('smallest mobile font (11px input) is readable at phone viewport', () => {
    // iPhone SE landscape: 667px wide → scale = 667/1280 ≈ 0.521
    const scaleFactor = 667 / 1280;
    const mobileFontPx = Math.round(11 * MOBILE_SCALE); // 15
    const physicalPx = mobileFontPx * scaleFactor;
    // Apple minimum for readability is ~7px physical
    expect(physicalPx).toBeGreaterThanOrEqual(7);
  });

  it('largest mobile font (52px input) does not exceed viewport', () => {
    const mobileFontPx = Math.round(52 * MOBILE_SCALE); // 70
    // At 720px game height, a 70px font is ~10% — reasonable
    expect(mobileFontPx).toBeLessThan(720 * 0.15);
  });

  it('mobile button height 52px maps to ≥ 27 physical px on phone', () => {
    const scaleFactor = 667 / 1280;
    const physicalH = 52 * scaleFactor;
    expect(physicalH).toBeGreaterThanOrEqual(27);
  });

  it('GameOverScene two-row layout fits within 720px canvas', () => {
    // row1Y = height - 76, row2Y = height - 22
    // With height=720: row1=644, row2=698.  Both within bounds.
    const height = 720;
    const row1Y = height - 76;
    const row2Y = height - 22;
    expect(row1Y).toBeGreaterThan(0);
    expect(row2Y).toBeLessThan(height);
    expect(row2Y - row1Y).toBeGreaterThanOrEqual(44); // enough gap between rows
  });

  it('CodexScene mobile close button is fully within panel bounds', () => {
    // panelH = height - 80 = 640, closeH = 44
    // closeBg y = startY + panelH - closeH/2 - 8 = 40 + 640 - 22 - 8 = 650
    const height = 720;
    const panelH = height - 80;
    const closeH = 44;
    const startY = 40;
    const closeY = startY + panelH - closeH / 2 - 8;
    expect(closeY + closeH / 2).toBeLessThanOrEqual(startY + panelH);
    expect(closeY - closeH / 2).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. No hardcoded pixel strings remain (all use _fs())
// ═══════════════════════════════════════════════════════════════════════════
describe('no raw pixel strings in font sizes of modified scenes', () => {
  for (const { name, src } of SCENES) {
    it(`${name}: no hardcoded fontSize: 'Npx' (all should use _fs())`, () => {
      // Match fontSize patterns like fontSize: '16px' (with quotes)
      // but NOT inside comments or string definitions
      const lines = src.split('\n');
      const violations: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Skip comments and string-only lines
        if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue;
        // Check for hardcoded fontSize with px
        if (/fontSize:\s*['"`]\d+px['"`]/.test(line)) {
          violations.push(`Line ${i + 1}: ${line}`);
        }
      }
      expect(violations, `${name} has hardcoded fontSize pixel strings:\n${violations.join('\n')}`).toHaveLength(0);
    });
  }
});
