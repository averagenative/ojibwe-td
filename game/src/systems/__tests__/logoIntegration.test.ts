/**
 * Logo Integration — TASK-040 (Generate & Integrate Ojibwe TD Logo).
 *
 * Structural source-pattern tests verifying the logo is loaded in BootScene,
 * displayed in MainMenuScene with proper scaling, and falls back to text when
 * the texture is missing.
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
// 3. MainMenuScene — logo image display
// ═══════════════════════════════════════════════════════════════════════════
describe('MainMenuScene logo display', () => {
  it("checks texture existence with textures.exists('logo')", () => {
    expect(mainMenuSrc).toContain("this.textures.exists('logo')");
  });

  it("creates an image with key 'logo' when texture exists", () => {
    expect(mainMenuSrc).toMatch(/this\.add\.image\([^)]*'logo'\)/);
  });

  it('sets origin to (0.5) for centre alignment', () => {
    // Inside the logo-image branch
    const logoBlock = mainMenuSrc.slice(
      mainMenuSrc.indexOf("this.add.image(cx, y, 'logo')"),
      mainMenuSrc.indexOf("this.add.image(cx, y, 'logo')") + 200,
    );
    expect(logoBlock).toContain('.setOrigin(0.5)');
  });

  it('uses setDisplaySize for final sizing', () => {
    expect(mainMenuSrc).toContain('logoImg.setDisplaySize(finalW, finalH)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. MainMenuScene — scaling formula matches acceptance criteria
// ═══════════════════════════════════════════════════════════════════════════
describe('MainMenuScene logo scaling', () => {
  it('computes desiredW via Math.min(width * 0.7, 512)', () => {
    expect(mainMenuSrc).toContain('Math.min(width * 0.7, 512)');
  });

  it('calculates aspect ratio from texture dimensions', () => {
    expect(mainMenuSrc).toMatch(/aspect\s*=\s*logoImg\.width\s*\/\s*logoImg\.height/);
  });

  it('caps height at 70px on mobile', () => {
    expect(mainMenuSrc).toMatch(/this\._isMobile\s*\?\s*70\s*:\s*120/);
  });

  it('caps height at 120px on desktop', () => {
    // Same line as above — just verify 120 is present
    expect(mainMenuSrc).toContain(': 120');
  });

  it('finalH is min of desired height and maxH', () => {
    expect(mainMenuSrc).toContain('Math.min(desiredW / aspect, maxH)');
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
    // The else branch should contain the OJIBWE TD text
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
// 6. Layout offset — logo area pushes content down
// ═══════════════════════════════════════════════════════════════════════════
describe('MainMenuScene layout offset for logo', () => {
  it('computes logoAreaH only when logo texture exists', () => {
    expect(mainMenuSrc).toMatch(/logoAreaH\s*=\s*hasLogo\s*\?/);
  });

  it('logoAreaH is 0 when logo is missing (no layout disruption)', () => {
    expect(mainMenuSrc).toContain(': 0');
    // Verify the ternary ends with : 0
    const match = mainMenuSrc.match(/logoAreaH\s*=\s*hasLogo\s*\?[^;]*:\s*0/);
    expect(match).not.toBeNull();
  });

  it('labelY accounts for logoAreaH offset', () => {
    expect(mainMenuSrc).toContain('TOP_PAD + logoAreaH');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Breathing glow — both branches have tweens
// ═══════════════════════════════════════════════════════════════════════════
describe('MainMenuScene breathing glow on logo', () => {
  it('logo image branch has Sine.easeInOut breathing tween', () => {
    // Get the logo image block (between "Logo image" and "Fallback")
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
