/**
 * Tests for TASK-164: Regenerate All Environment Tiles — Consistent DALL-E 3 Top-Down Style
 *
 * Validates the 4 environment tile PNG files:
 *  1. All files exist and are non-empty
 *  2. Each file is a valid PNG (magic bytes check)
 *  3. Each file is 64×64 pixels (IHDR check)
 *  4. Each file is RGBA (8-bit colour type 6 — transparent background)
 *  5. Filenames match the preload keys used in BootScene
 *  6. File sizes are reasonable for game tiles (< 50 KB)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const TILES_DIR = resolve(__dirname, '../../../public/assets/tiles');

const TILE_KEYS = ['tile-tree', 'tile-brush', 'tile-rock', 'tile-water'] as const;

/** PNG magic bytes: 137 80 78 71 13 10 26 10 */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Read width and height from the IHDR chunk (bytes 16–23 of a PNG). */
function readPngDimensions(buf: Buffer): { width: number; height: number } {
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

/** Read colour type from IHDR (byte 25). Type 6 = RGBA. */
function readPngColourType(buf: Buffer): number {
  return buf[25];
}

// ── File existence ──────────────────────────────────────────────────────────

describe('environment tile files exist', () => {
  for (const key of TILE_KEYS) {
    it(`${key}.png exists and is non-empty`, () => {
      const filePath = resolve(TILES_DIR, `${key}.png`);
      expect(existsSync(filePath)).toBe(true);
      const buf = readFileSync(filePath);
      expect(buf.length).toBeGreaterThan(0);
    });
  }
});

// ── Valid PNG format ────────────────────────────────────────────────────────

describe('environment tiles are valid PNGs', () => {
  for (const key of TILE_KEYS) {
    it(`${key}.png has PNG magic bytes`, () => {
      const buf = readFileSync(resolve(TILES_DIR, `${key}.png`));
      expect(buf.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
    });
  }
});

// ── Dimensions: 64×64 ──────────────────────────────────────────────────────

describe('environment tiles are 64×64 pixels', () => {
  for (const key of TILE_KEYS) {
    it(`${key}.png is 64×64`, () => {
      const buf = readFileSync(resolve(TILES_DIR, `${key}.png`));
      const { width, height } = readPngDimensions(buf);
      expect(width).toBe(64);
      expect(height).toBe(64);
    });
  }
});

// ── RGBA colour type ────────────────────────────────────────────────────────

describe('environment tiles use RGBA (transparent background)', () => {
  for (const key of TILE_KEYS) {
    it(`${key}.png colour type is 6 (RGBA)`, () => {
      const buf = readFileSync(resolve(TILES_DIR, `${key}.png`));
      expect(readPngColourType(buf)).toBe(6);
    });
  }
});

// ── Reasonable file sizes ───────────────────────────────────────────────────

describe('environment tile file sizes', () => {
  const MAX_BYTES = 50 * 1024; // 50 KB max
  const MIN_BYTES = 512; // at least 512 bytes (not a stub)

  for (const key of TILE_KEYS) {
    it(`${key}.png is between 512 bytes and 50 KB`, () => {
      const buf = readFileSync(resolve(TILES_DIR, `${key}.png`));
      expect(buf.length).toBeGreaterThanOrEqual(MIN_BYTES);
      expect(buf.length).toBeLessThanOrEqual(MAX_BYTES);
    });
  }
});

// ── Preload key consistency ─────────────────────────────────────────────────

describe('tile filenames match BootScene preload keys', () => {
  it('all 4 tile keys are present', () => {
    expect(TILE_KEYS).toHaveLength(4);
    expect(TILE_KEYS).toContain('tile-tree');
    expect(TILE_KEYS).toContain('tile-brush');
    expect(TILE_KEYS).toContain('tile-rock');
    expect(TILE_KEYS).toContain('tile-water');
  });

  it('BootScene references these exact filenames', () => {
    const bootSrc = readFileSync(
      resolve(__dirname, '../../scenes/BootScene.ts'),
      'utf-8',
    );
    for (const key of TILE_KEYS) {
      expect(bootSrc).toContain(key);
    }
  });
});
