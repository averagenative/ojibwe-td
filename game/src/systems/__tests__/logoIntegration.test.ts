/**
 * Logo Integration — TASK-040 (Generate & Integrate Ojibwe TD Logo).
 *
 * Structural source-pattern tests verifying the logo is loaded in BootScene,
 * displayed in MainMenuScene in the LEFT panel with proper scaling, and falls
 * back to text when the texture is missing.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const readScene = (name: string) =>
  fs.readFileSync(path.resolve(__dirname, `../../scenes/${name}`), 'utf-8');

const bootSrc     = readScene('BootScene.ts');
const mainMenuSrc = readScene('MainMenuScene.ts');

// ═══════════════════════════════════════════════════════════════════════════
// 1. Asset presence — logo.png exists in public/assets/ui/
// ═══════════════════════════════════════════════════════════════════════════
describe('logo asset file', () => {
  const logoPath = path.resolve(__dirname, '../../../public/assets/ui/logo.png');

  it('logo.png exists on disk', () => {
    expect(fs.existsSync(logoPath)).toBe(true);
  });

  it('logo.png is a valid PNG (magic bytes)', () => {
    const buf = fs.readFileSync(logoPath);
    // PNG magic: 0x89 0x50 0x4e 0x47
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50); // P
    expect(buf[2]).toBe(0x4e); // N
    expect(buf[3]).toBe(0x47); // G
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. BootScene — loads logo as texture key 'logo'
// ═══════════════════════════════════════════════════════════════════════════
describe('BootScene logo preload', () => {
  it("loads logo image with key 'logo'", () => {
    expect(bootSrc).toContain("this.load.image('logo'");
  });

  it('loads from assets/ui/logo.png path', () => {
    expect(bootSrc).toContain("'assets/ui/logo.png'");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. MainMenuScene — logo image display (left panel)
// ═══════════════════════════════════════════════════════════════════════════
describe('MainMenuScene logo display', () => {
  it("checks texture existence with textures.exists('logo')", () => {
    expect(mainMenuSrc).toContain("this.textures.exists('logo')");
  });

  it("creates an image with key 'logo' when texture exists", () => {
    expect(mainMenuSrc).toMatch(/this\.add\.image\([^)]*'logo'\)/);
  });

  it('sets origin to (0.5) for centre alignment', () => {
    const logoBlock = mainMenuSrc.slice(
      mainMenuSrc.indexOf("this.add.image(logoX, logoY, 'logo')"),
      mainMenuSrc.indexOf("this.add.image(logoX, logoY, 'logo')") + 200,
    );
    expect(logoBlock).toContain('.setOrigin(0.5)');
  });

  it('uses setDisplaySize for final sizing', () => {
    expect(mainMenuSrc).toContain('logoImg.setDisplaySize(finalW, finalH)');
  });

  it('logo is positioned just left of stage card area', () => {
    expect(mainMenuSrc).toContain('STAGE_W / 2) - 120');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. MainMenuScene — scaling formula (left panel, larger than before)
// ═══════════════════════════════════════════════════════════════════════════
describe('MainMenuScene logo scaling', () => {
  it('calculates aspect ratio from texture dimensions', () => {
    expect(mainMenuSrc).toMatch(/aspect\s*=\s*logoImg\.width\s*\/\s*logoImg\.height/);
  });

  it('caps height at maxH', () => {
    expect(mainMenuSrc).toMatch(/maxH\s*=\s*this\._isMobile/);
  });

  it('finalH is min of maxH and maxW/aspect', () => {
    expect(mainMenuSrc).toContain('Math.min(maxH, maxW / aspect)');
  });

  it('finalW preserves aspect ratio', () => {
    expect(mainMenuSrc).toContain('finalH * aspect');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. MainMenuScene — text fallback when logo texture is missing
// ═══════════════════════════════════════════════════════════════════════════
describe('MainMenuScene text fallback', () => {
  it("renders 'OJIBWE TD' text in the else branch", () => {
    const elseIdx = mainMenuSrc.indexOf('Fallback: text title');
    expect(elseIdx).toBeGreaterThan(-1);
    const fallbackBlock = mainMenuSrc.slice(elseIdx, elseIdx + 300);
    expect(fallbackBlock).toContain("'OJIBWE TD'");
  });

  it('uses PAL.gold colour for fallback text', () => {
    const elseIdx = mainMenuSrc.indexOf('Fallback: text title');
    const fallbackBlock = mainMenuSrc.slice(elseIdx, elseIdx + 300);
    expect(fallbackBlock).toContain('PAL.gold');
  });

  it('uses PAL.fontTitle for fallback text', () => {
    const elseIdx = mainMenuSrc.indexOf('Fallback: text title');
    const fallbackBlock = mainMenuSrc.slice(elseIdx, elseIdx + 300);
    expect(fallbackBlock).toContain('PAL.fontTitle');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Layout — logo is in left panel, not in vertical flow
// ═══════════════════════════════════════════════════════════════════════════
describe('MainMenuScene layout — logo in left panel', () => {
  it('logo is no longer in the vertical header flow', () => {
    // No logoAreaH in the vertical layout computation
    expect(mainMenuSrc).not.toMatch(/labelY\s*=\s*TOP_PAD\s*\+\s*logoAreaH/);
  });

  it('labelY starts directly from TOP_PAD', () => {
    expect(mainMenuSrc).toContain('const labelY = TOP_PAD;');
  });

  it('logoY is aligned with stageRowY', () => {
    expect(mainMenuSrc).toContain('const logoY = this.stageRowY');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Breathing glow — both branches have tweens
// ═══════════════════════════════════════════════════════════════════════════
describe('MainMenuScene breathing glow on logo', () => {
  it('logo image branch has Sine.easeInOut breathing tween', () => {
    const startIdx = mainMenuSrc.indexOf('Logo image');
    const endIdx   = mainMenuSrc.indexOf('Fallback: text title');
    const block = mainMenuSrc.slice(startIdx, endIdx);
    expect(block).toMatch(/ease:\s*'Sine\.easeInOut'/);
    expect(block).toMatch(/repeat:\s*-1/);
    expect(block).toMatch(/yoyo:\s*true/);
  });

  it('fallback text branch also has breathing tween', () => {
    const fallbackIdx = mainMenuSrc.indexOf('Fallback: text title');
    const block = mainMenuSrc.slice(fallbackIdx, fallbackIdx + 600);
    expect(block).toMatch(/ease:\s*'Sine\.easeInOut'/);
    expect(block).toMatch(/repeat:\s*-1/);
    expect(block).toMatch(/yoyo:\s*true/);
  });
});
