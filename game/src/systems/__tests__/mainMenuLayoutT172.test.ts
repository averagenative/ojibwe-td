/**
 * Main Menu Layout Adjustments — TASK-172
 *
 * Structural source-pattern tests verifying:
 *   1. Quick Play button uses relative offset (MOBILE_SIDE_OFFSET_RATIO), not hardcoded px
 *   2. Start Game button is centred (positioned at cx, full width)
 *   3. Quick Play button size uses a relative expression
 *   4. Logo and Quick Play share the same offset constant
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '../../scenes/MainMenuScene.ts'),
  'utf-8',
);

// Helper: extract a method body from the source.
function methodBody(name: string): string {
  const re = new RegExp(`private\\s+${name}\\s*\\(`);
  const match = re.exec(src);
  if (!match) throw new Error(`Method ${name} not found`);
  const start = match.index;
  // Find next top-level private method or end of class
  const next = src.indexOf('\n  private ', start + 1);
  return src.slice(start, next > start ? next : undefined);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. MOBILE_SIDE_OFFSET_RATIO constant exists and is relative
// ═══════════════════════════════════════════════════════════════════════════
describe('MOBILE_SIDE_OFFSET_RATIO constant', () => {
  it('declares MOBILE_SIDE_OFFSET_RATIO at module level', () => {
    expect(src).toMatch(/const\s+MOBILE_SIDE_OFFSET_RATIO\s*=/);
  });

  it('value is a ratio (between 0 and 1)', () => {
    const m = src.match(/MOBILE_SIDE_OFFSET_RATIO\s*=\s*([\d./\s]+)/);
    expect(m).not.toBeNull();
    // eslint-disable-next-line no-eval
    const val = eval(m![1].trim());
    expect(val).toBeGreaterThan(0);
    expect(val).toBeLessThan(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. _buildMobileButtons — Start Game is centred
// ═══════════════════════════════════════════════════════════════════════════
describe('_buildMobileButtons — Start Game centred', () => {
  const mobile = methodBody('_buildMobileButtons');

  it('positions Start Game panel at cx (centred)', () => {
    // makePanel(this, cx, startRowY, startBtnW, ...)
    expect(mobile).toMatch(/makePanel\(this,\s*cx,\s*startRowY,\s*startBtnW/);
  });

  it('Start Game width spans full button area (halfW * 2 + gap)', () => {
    expect(mobile).toMatch(/startBtnW\s*=\s*halfW\s*\*\s*2\s*\+\s*gap/);
  });

  it('Start Game label is positioned at cx', () => {
    expect(mobile).toMatch(/this\.add\.text\(cx,\s*startRowY,\s*hasResume/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. _buildMobileButtons — Quick Play uses relative offset
// ═══════════════════════════════════════════════════════════════════════════
describe('_buildMobileButtons — Quick Play relative positioning', () => {
  const mobile = methodBody('_buildMobileButtons');

  it('computes mobileSideOffset from width * MOBILE_SIDE_OFFSET_RATIO', () => {
    expect(mobile).toMatch(/mobileSideOffset\s*=\s*Math\.round\(width\s*\*\s*MOBILE_SIDE_OFFSET_RATIO\)/);
  });

  it('Quick Play X = cx + mobileSideOffset (mirrors logo)', () => {
    expect(mobile).toMatch(/quickPlayX\s*=\s*cx\s*\+\s*mobileSideOffset/);
  });

  it('Quick Play button size is relative to width', () => {
    expect(mobile).toMatch(/mobileQuickBtnSize\s*=\s*Math\.round\(width\s*\*/);
  });

  it('does not hardcode cx + 340 for Quick Play', () => {
    expect(mobile).not.toMatch(/quickPlayX\s*=\s*cx\s*\+\s*340/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. _buildLogoTitle — logo also uses MOBILE_SIDE_OFFSET_RATIO
// ═══════════════════════════════════════════════════════════════════════════
describe('_buildLogoTitle — shared offset with Quick Play', () => {
  const logo = methodBody('_buildLogoTitle');

  it('computes mobileSideOffset from MOBILE_SIDE_OFFSET_RATIO', () => {
    expect(logo).toMatch(/mobileSideOffset\s*=\s*Math\.round\(width\s*\*\s*MOBILE_SIDE_OFFSET_RATIO\)/);
  });

  it('logo X uses mobileSideOffset for mobile path', () => {
    expect(logo).toMatch(/cx\s*-\s*mobileSideOffset/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Desktop layout unchanged — Quick Play still uses STAGE_W formula
// ═══════════════════════════════════════════════════════════════════════════
describe('_buildDesktopButtons — Quick Play still uses STAGE_W-based offset', () => {
  const desktop = methodBody('_buildDesktopButtons');

  it('Quick Play X derived from STAGE_W (not hardcoded)', () => {
    expect(desktop).toMatch(/quickPlayX\s*=\s*width\s*\/\s*2\s*\+\s*\(STAGE_W\s*\/\s*2\)\s*\+\s*120/);
  });
});
