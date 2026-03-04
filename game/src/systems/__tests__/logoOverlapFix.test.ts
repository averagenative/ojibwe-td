/**
 * Logo Overlaps Tower Icons — TASK-122
 *
 * Structural source-pattern tests verifying the tower icon row is removed
 * from MainMenuScene's createHeader, so the logo no longer overlaps icons.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const mainMenuSrc = fs.readFileSync(
  path.resolve(__dirname, '../../scenes/MainMenuScene.ts'),
  'utf-8',
);

// ═══════════════════════════════════════════════════════════════════════════
// 1. Tower icons removed from MainMenuScene header
// ═══════════════════════════════════════════════════════════════════════════
describe('tower icons removed from main menu header', () => {
  it('does not reference icon-rock-hurler in createHeader', () => {
    const headerStart = mainMenuSrc.indexOf('createHeader(');
    const headerEnd = mainMenuSrc.indexOf('}', mainMenuSrc.indexOf('createHeader(cx'));
    const headerBlock = mainMenuSrc.slice(headerStart, headerEnd + 1);
    expect(headerBlock).not.toContain('icon-rock-hurler');
  });

  it('does not create an icon row with this.add.image inside createHeader', () => {
    const headerIdx = mainMenuSrc.indexOf('private createHeader(');
    const nextMethodIdx = mainMenuSrc.indexOf('\n  private ', headerIdx + 1);
    const headerBlock = mainMenuSrc.slice(headerIdx, nextMethodIdx);
    expect(headerBlock).not.toContain('this.add.image');
  });

  it('does not reference any tower icon keys in createHeader', () => {
    const headerIdx = mainMenuSrc.indexOf('private createHeader(');
    const nextMethodIdx = mainMenuSrc.indexOf('\n  private ', headerIdx + 1);
    const headerBlock = mainMenuSrc.slice(headerIdx, nextMethodIdx);
    const towerIcons = ['icon-rock-hurler', 'icon-frost', 'icon-poison', 'icon-tesla', 'icon-aura', 'icon-arrow'];
    for (const icon of towerIcons) {
      expect(headerBlock).not.toContain(icon);
    }
  });

  it('does not have iconSpacing variable in createHeader', () => {
    const headerIdx = mainMenuSrc.indexOf('private createHeader(');
    const nextMethodIdx = mainMenuSrc.indexOf('\n  private ', headerIdx + 1);
    const headerBlock = mainMenuSrc.slice(headerIdx, nextMethodIdx);
    expect(headerBlock).not.toContain('iconSpacing');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. createHeader signature simplified
// ═══════════════════════════════════════════════════════════════════════════
describe('createHeader signature', () => {
  it('takes only cx and labelY parameters (no iconY)', () => {
    expect(mainMenuSrc).toMatch(
      /private\s+createHeader\(\s*cx:\s*number\s*,\s*labelY:\s*number\s*\)/,
    );
  });

  it('is called with two arguments (cx, labelY)', () => {
    expect(mainMenuSrc).toMatch(/this\.createHeader\(cx,\s*labelY\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. SELECT REGION label still present
// ═══════════════════════════════════════════════════════════════════════════
describe('SELECT REGION label preserved', () => {
  it("still renders 'SELECT REGION' text in createHeader", () => {
    const headerIdx = mainMenuSrc.indexOf('private createHeader(');
    const nextMethodIdx = mainMenuSrc.indexOf('\n  private ', headerIdx + 1);
    const headerBlock = mainMenuSrc.slice(headerIdx, nextMethodIdx);
    expect(headerBlock).toContain("'SELECT REGION'");
  });

  it('uses PAL.textMuted for the SELECT REGION label', () => {
    const headerIdx = mainMenuSrc.indexOf('private createHeader(');
    const nextMethodIdx = mainMenuSrc.indexOf('\n  private ', headerIdx + 1);
    const headerBlock = mainMenuSrc.slice(headerIdx, nextMethodIdx);
    expect(headerBlock).toContain('PAL.textMuted');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Layout — dead iconY variable removed
// ═══════════════════════════════════════════════════════════════════════════
describe('layout cleanup', () => {
  it('does not declare an iconY variable', () => {
    expect(mainMenuSrc).not.toMatch(/const\s+iconY\s*=/);
  });

  it('labelY is computed directly from TOP_PAD (logo in left panel now)', () => {
    expect(mainMenuSrc).toMatch(/const\s+labelY\s*=\s*TOP_PAD/);
  });

  it('no 28px icon-row offset in labelY computation', () => {
    // Previously: labelY = iconY + 28. Now: labelY = TOP_PAD + logoAreaH.
    expect(mainMenuSrc).not.toMatch(/labelY\s*=\s*iconY\s*\+\s*28/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Tower icons still available for in-game use (not globally removed)
// ═══════════════════════════════════════════════════════════════════════════
describe('tower icon textures still loaded by BootScene', () => {
  const bootSrc = fs.readFileSync(
    path.resolve(__dirname, '../../scenes/BootScene.ts'),
    'utf-8',
  );

  const towerIcons = ['icon-rock-hurler', 'icon-frost', 'icon-poison', 'icon-tesla', 'icon-aura', 'icon-arrow'];

  for (const icon of towerIcons) {
    it(`BootScene still loads '${icon}' texture`, () => {
      expect(bootSrc).toContain(`'${icon}'`);
    });
  }
});
