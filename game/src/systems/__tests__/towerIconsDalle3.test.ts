/**
 * TASK-152: Tower Icons Overhaul — DALL-E 3
 * Updated by TASK-165: icon size upgraded from 64×64 to 96×96 for consistent style
 *
 * Structural + file-integrity tests verifying:
 *  - All tower icons in BootScene are loaded as PNG (no SVGs)
 *  - icon-rock-hurler was migrated from SVG to PNG
 *  - All 6 tower icon PNG files exist and have valid headers
 *  - Icon dimensions are 96×96 (consistent across all towers)
 *  - BootScene preload keys are unchanged (drop-in replacement)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import bootSceneRaw from '../../scenes/BootScene.ts?raw';

// ── Constants ────────────────────────────────────────────────────────────────

const ICONS_DIR = resolve(__dirname, '..', '..', '..', 'public', 'assets', 'icons');

/** The 6 tower icon keys defined in the task. */
const TOWER_ICON_KEYS = [
  'icon-rock-hurler',
  'icon-frost',
  'icon-poison',
  'icon-tesla',
  'icon-aura',
  'icon-arrow',
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract all this.load.image(...) lines from BootScene source. */
function towerIconLoadLines(): string[] {
  return bootSceneRaw
    .split('\n')
    .filter(l => TOWER_ICON_KEYS.some(k => l.includes(`'${k}'`)) && l.includes('this.load.image'));
}

/** Read PNG IHDR dimensions from a file buffer (big-endian uint32 at offsets 16, 20). */
function pngDimensions(buf: Buffer): { width: number; height: number } {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BootScene — all tower icons loaded as PNG
// ─────────────────────────────────────────────────────────────────────────────

describe('BootScene tower icon format (TASK-152)', () => {
  const loadLines = towerIconLoadLines();

  it('has a load.image line for each of the 6 tower icons', () => {
    expect(loadLines.length).toBe(TOWER_ICON_KEYS.length);
    for (const key of TOWER_ICON_KEYS) {
      expect(loadLines.some(l => l.includes(`'${key}'`))).toBe(true);
    }
  });

  it('every tower icon is loaded from a .png file (no .svg)', () => {
    for (const line of loadLines) {
      expect(line).toContain('.png');
      expect(line).not.toContain('.svg');
    }
  });

  it('icon-rock-hurler specifically uses .png (migrated from .svg)', () => {
    const rockLine = loadLines.find(l => l.includes("'icon-rock-hurler'"));
    expect(rockLine).toBeDefined();
    expect(rockLine).toContain('icon-rock-hurler.png');
  });

  it('preload keys are unchanged (just the file extension changed)', () => {
    for (const key of TOWER_ICON_KEYS) {
      const line = loadLines.find(l => l.includes(`'${key}'`));
      expect(line).toBeDefined();
      // Key must appear as the first argument in the exact format
      expect(line).toContain(`'${key}'`);
    }
  });

  it('no .svg tower icon references remain in BootScene', () => {
    for (const key of TOWER_ICON_KEYS) {
      const svgPattern = `${key}.svg`;
      expect(bootSceneRaw).not.toContain(svgPattern);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Tower icon PNG file existence
// ─────────────────────────────────────────────────────────────────────────────

describe('Tower icon PNG files exist (TASK-152)', () => {
  for (const key of TOWER_ICON_KEYS) {
    it(`${key}.png exists in assets/icons/`, () => {
      const filePath = resolve(ICONS_DIR, `${key}.png`);
      expect(existsSync(filePath)).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tower icon PNG file integrity
// ─────────────────────────────────────────────────────────────────────────────

describe('Tower icon PNG integrity (TASK-152)', () => {
  for (const key of TOWER_ICON_KEYS) {
    const filePath = resolve(ICONS_DIR, `${key}.png`);

    it(`${key}.png has valid PNG magic bytes`, () => {
      const buf = readFileSync(filePath);
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50); // P
      expect(buf[2]).toBe(0x4e); // N
      expect(buf[3]).toBe(0x47); // G
    });

    it(`${key}.png is 96×96`, () => {
      const buf = readFileSync(filePath);
      const { width, height } = pngDimensions(buf);
      expect(width).toBe(96);
      expect(height).toBe(96);
    });

    it(`${key}.png file size is reasonable (100 B – 10 KB)`, () => {
      const buf = readFileSync(filePath);
      expect(buf.length).toBeGreaterThan(100);
      expect(buf.length).toBeLessThan(10240);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Consistency — all tower icons have the same dimensions
// ─────────────────────────────────────────────────────────────────────────────

describe('Tower icon dimension consistency (TASK-152)', () => {
  it('all 6 tower icon PNGs share the same dimensions', () => {
    const dimensions = TOWER_ICON_KEYS.map(key => {
      const buf = readFileSync(resolve(ICONS_DIR, `${key}.png`));
      return pngDimensions(buf);
    });
    const first = dimensions[0];
    for (const dim of dimensions) {
      expect(dim.width).toBe(first.width);
      expect(dim.height).toBe(first.height);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('Tower icon edge cases (TASK-152)', () => {
  it('no tower icon key appears more than once in BootScene load calls', () => {
    for (const key of TOWER_ICON_KEYS) {
      const matches = bootSceneRaw.match(new RegExp(`load\\.image\\(\\s*'${key}'`, 'g'));
      expect(matches).not.toBeNull();
      expect(matches!.length).toBe(1);
    }
  });

  it('tower icon file paths use the assets/icons/ directory', () => {
    for (const line of towerIconLoadLines()) {
      expect(line).toContain('assets/icons/');
    }
  });

  it('old icon-rock-hurler.svg is no longer referenced by BootScene', () => {
    expect(bootSceneRaw).not.toContain('icon-rock-hurler.svg');
  });
});
