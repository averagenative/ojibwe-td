/**
 * Tests for TASK-123: Poison Tower Icon Rework — Spider Theme
 *
 * Verifies the gen_icons.py SVG template and generated PNG satisfy:
 *  - Spider design elements present (legs, abdomen, cephalothorax, eyes, fangs)
 *  - 64×64 dimensions match other tower icons
 *  - Asset key remains 'icon-poison' (drop-in replacement)
 *  - Green palette consistent with poison tower identity
 *  - BootScene loads the correct key
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ── Helpers ─────────────────────────────────────────────────────────────────

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const GEN_ICONS = resolve(REPO_ROOT, 'scripts', 'gen_icons.py');
const ICON_PATH = resolve(REPO_ROOT, 'game', 'public', 'assets', 'icons', 'icon-poison.png');
const BOOT_SCENE = resolve(REPO_ROOT, 'game', 'src', 'scenes', 'BootScene.ts');

const genSrc = readFileSync(GEN_ICONS, 'utf-8');

/** Extract the SVG body passed to icon('icon-poison', ...) */
function extractPoisonSvgBody(): string {
  const marker = "icon('icon-poison'";
  const start = genSrc.indexOf(marker);
  if (start === -1) throw new Error('icon-poison definition not found in gen_icons.py');
  // Find the matching closing paren for icon(...)
  // The body is a triple-quoted string; find the closing """)
  const bodyStart = genSrc.indexOf('"""', start) + 3;
  const bodyEnd = genSrc.indexOf('"""', bodyStart);
  return genSrc.slice(bodyStart, bodyEnd);
}

const svgBody = extractPoisonSvgBody();

// ── 1. Spider design elements (structural) ──────────────────────────────────

describe('Poison icon SVG — spider design elements', () => {
  it('has 8 legs (4 pairs of path elements inside the leg group)', () => {
    // Extract the leg <g> group content (between <g stroke=...> and </g>)
    const legGroupMatch = svgBody.match(/<g\s+stroke="#22aa44"[^>]*>([\s\S]*?)<\/g>/);
    expect(legGroupMatch).not.toBeNull();
    const legGroup = legGroupMatch![1];
    const legPaths = legGroup.match(/<path\s+d="M\d/g);
    expect(legPaths).not.toBeNull();
    expect(legPaths!.length).toBe(8);
  });

  it('has an abdomen (rear body ellipse)', () => {
    expect(svgBody).toContain('Abdomen');
    // Abdomen is an ellipse with large radii
    expect(svgBody).toMatch(/ellipse.*cy="39".*rx="11".*ry="12"/);
  });

  it('has a cephalothorax (front body ellipse)', () => {
    expect(svgBody).toContain('Cephalothorax');
    expect(svgBody).toMatch(/ellipse.*cy="22".*rx="8".*ry="7"/);
  });

  it('has a waist connector between body segments', () => {
    expect(svgBody).toContain('Waist connector');
    expect(svgBody).toMatch(/ellipse.*cy="29".*rx="4".*ry="3"/);
  });

  it('has eyes (bright green circles)', () => {
    expect(svgBody).toContain('Eyes');
    // Two main eye circles with green fill
    const eyeCircles = svgBody.match(/fill="#88ff44"/g);
    expect(eyeCircles).not.toBeNull();
    expect(eyeCircles!.length).toBe(2);
  });

  it('has eye highlights (white reflections)', () => {
    const highlights = svgBody.match(/r="0\.8".*fill="white"/g);
    expect(highlights).not.toBeNull();
    expect(highlights!.length).toBe(2);
  });

  it('has fangs (venom drip lines)', () => {
    expect(svgBody).toContain('Fangs');
    const fangLines = svgBody.match(/<line.*stroke="#55ff99"/g);
    expect(fangLines).not.toBeNull();
    expect(fangLines!.length).toBe(2);
  });

  it('has venom droplets at fang tips', () => {
    expect(svgBody).toContain('Venom droplets');
    const droplets = svgBody.match(/r="1\.2".*fill="#55ff99"/g);
    expect(droplets).not.toBeNull();
    expect(droplets!.length).toBe(2);
  });

  it('has an hourglass marking on the abdomen', () => {
    expect(svgBody).toContain('Hourglass marking');
    // Red diamond/hourglass shape
    expect(svgBody).toMatch(/fill="#cc2222"/);
  });
});

// ── 2. Green palette consistency ─────────────────────────────────────────────

describe('Poison icon SVG — green palette', () => {
  it('uses green for legs (#22aa44)', () => {
    expect(svgBody).toContain('stroke="#22aa44"');
  });

  it('uses green for body (#22bb44)', () => {
    const bodyFills = svgBody.match(/fill="#22bb44"/g);
    expect(bodyFills).not.toBeNull();
    // Abdomen + cephalothorax
    expect(bodyFills!.length).toBeGreaterThanOrEqual(2);
  });

  it('uses lighter green for sheen (#44dd66)', () => {
    const sheenFills = svgBody.match(/fill="#44dd66"/g);
    expect(sheenFills).not.toBeNull();
    expect(sheenFills!.length).toBeGreaterThanOrEqual(2);
  });

  it('uses bright green for eyes (#88ff44)', () => {
    expect(svgBody).toContain('fill="#88ff44"');
  });
});

// ── 3. Asset file integrity ──────────────────────────────────────────────────

describe('Poison icon PNG — file integrity', () => {
  it('game/public/assets/icons/icon-poison.png exists', () => {
    expect(existsSync(ICON_PATH)).toBe(true);
  });

  it('PNG has valid header (magic bytes)', () => {
    const buf = readFileSync(ICON_PATH);
    // PNG magic: 0x89 P N G 0x0D 0x0A 0x1A 0x0A
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50); // P
    expect(buf[2]).toBe(0x4e); // N
    expect(buf[3]).toBe(0x47); // G
  });

  it('PNG IHDR chunk reports square dimensions', () => {
    const buf = readFileSync(ICON_PATH);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBe(height); // square icon
    expect(width).toBeGreaterThanOrEqual(64);
    expect(width).toBeLessThanOrEqual(128);
  });

  it('PNG file size is reasonable (under 20 KB for a small icon)', () => {
    const buf = readFileSync(ICON_PATH);
    expect(buf.length).toBeLessThan(20480);
    expect(buf.length).toBeGreaterThan(100);
  });
});

// ── 4. Asset key unchanged (drop-in replacement) ────────────────────────────

describe('Poison icon — asset key wiring', () => {
  it('gen_icons.py uses icon-poison as the key', () => {
    expect(genSrc).toContain("icon('icon-poison'");
  });

  it('BootScene loads icon-poison from the correct path', () => {
    const bootSrc = readFileSync(BOOT_SCENE, 'utf-8');
    expect(bootSrc).toContain("this.load.image('icon-poison'");
    expect(bootSrc).toContain("'assets/icons/icon-poison.png'");
  });

  it('gen_icons.py header comment reflects spider theme', () => {
    // The section comment should mention spider, not the old teardrop
    const sectionIdx = genSrc.indexOf('# 4. POISON');
    expect(sectionIdx).toBeGreaterThan(-1);
    const sectionLine = genSrc.slice(sectionIdx, genSrc.indexOf('\n', sectionIdx));
    expect(sectionLine.toLowerCase()).toContain('spider');
    expect(sectionLine.toLowerCase()).not.toContain('teardrop');
    expect(sectionLine.toLowerCase()).not.toContain('drop');
  });
});

// ── 5. Boundary / error cases ────────────────────────────────────────────────

describe('Poison icon — edge cases', () => {
  it('SVG body has no unclosed tags (all elements are self-closing or paired)', () => {
    // Check that <g> tags are balanced
    const gOpen = (svgBody.match(/<g\b/g) || []).length;
    const gClose = (svgBody.match(/<\/g>/g) || []).length;
    expect(gOpen).toBe(gClose);
  });

  it('all SVG coordinates are within the 0-64 viewBox', () => {
    // Extract numeric coordinate values from cx, cy, x, y, x1, y1, x2, y2
    const coords = svgBody.matchAll(/\b(?:cx|cy|x1|y1|x2|y2)="([^"]+)"/g);
    for (const match of coords) {
      const val = parseFloat(match[1]);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(64);
    }
  });

  it('leg paths extend to edges but stay within viewBox bounds', () => {
    // Extract numbers from path d attributes
    const pathDs = svgBody.matchAll(/d="([^"]+)"/g);
    for (const match of pathDs) {
      const nums = match[1].match(/\d+/g) || [];
      for (const n of nums) {
        const val = parseInt(n, 10);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(64);
      }
    }
  });

  it('no old teardrop/skull elements remain in the SVG', () => {
    expect(svgBody.toLowerCase()).not.toContain('teardrop');
    expect(svgBody.toLowerCase()).not.toContain('skull');
    expect(svgBody.toLowerCase()).not.toContain('bubble highlight');
    expect(svgBody.toLowerCase()).not.toContain('skull dots');
    expect(svgBody.toLowerCase()).not.toContain('skull mouth');
  });
});
