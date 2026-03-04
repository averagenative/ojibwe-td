/**
 * Tests for TASK-159: Tower Map Sprites Must Visually Match Selector Panel Icons
 *
 * Validates the 12 tower sprite PNG files (6 bases + 6 turrets):
 *  1. All files exist and are non-empty
 *  2. Each file is a valid PNG (magic bytes check)
 *  3. Each file is 64×64 pixels (IHDR check)
 *  4. Each file is RGBA (8-bit colour type 6)
 *  5. Filenames match the preload keys in BootScene
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ASSETS_DIR = resolve(__dirname, '../../../public/assets/towers');

const TOWER_KEYS = ['arrow', 'rock-hurler', 'frost', 'poison', 'tesla', 'aura'] as const;

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

// Build the full list of expected files
const EXPECTED_FILES = TOWER_KEYS.flatMap((key) => [
  { key, variant: 'base' as const, filename: `${key}-base.png` },
  { key, variant: 'turret' as const, filename: `${key}-turret.png` },
]);

// ── 1. File existence ──────────────────────────────────────────────────────────

describe('tower sprite files — existence', () => {
  it.each(EXPECTED_FILES)('$filename exists and is non-empty', ({ filename }) => {
    const filePath = resolve(ASSETS_DIR, filename);
    expect(existsSync(filePath)).toBe(true);
    const buf = readFileSync(filePath);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('exactly 12 tower sprite files are expected', () => {
    expect(EXPECTED_FILES).toHaveLength(12);
  });
});

// ── 2. Valid PNG format ────────────────────────────────────────────────────────

describe('tower sprite files — PNG validity', () => {
  it.each(EXPECTED_FILES)('$filename has PNG magic bytes', ({ filename }) => {
    const buf = readFileSync(resolve(ASSETS_DIR, filename));
    expect(buf.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
  });

  it.each(EXPECTED_FILES)('$filename has IHDR chunk', ({ filename }) => {
    const buf = readFileSync(resolve(ASSETS_DIR, filename));
    // IHDR chunk type at bytes 12-15
    const ihdr = buf.subarray(12, 16).toString('ascii');
    expect(ihdr).toBe('IHDR');
  });
});

// ── 3. Dimensions — 64×64 ─────────────────────────────────────────────────────

describe('tower sprite files — dimensions', () => {
  it.each(EXPECTED_FILES)('$filename is 64×64', ({ filename }) => {
    const buf = readFileSync(resolve(ASSETS_DIR, filename));
    const { width, height } = readPngDimensions(buf);
    expect(width).toBe(64);
    expect(height).toBe(64);
  });
});

// ── 4. RGBA colour type ────────────────────────────────────────────────────────

describe('tower sprite files — RGBA colour type', () => {
  it.each(EXPECTED_FILES)('$filename uses RGBA (colour type 6)', ({ filename }) => {
    const buf = readFileSync(resolve(ASSETS_DIR, filename));
    expect(readPngColourType(buf)).toBe(6);
  });
});

// ── 5. BootScene preload key consistency ───────────────────────────────────────

describe('tower sprite files — BootScene preload keys', () => {
  const bootSrc = readFileSync(
    resolve(__dirname, '../../scenes/BootScene.ts'),
    'utf8',
  );

  it.each(TOWER_KEYS)('%s base sprite has matching preload in BootScene', (key) => {
    expect(bootSrc).toContain(`tower-${key}-base`);
    expect(bootSrc).toContain(`assets/towers/${key}-base.png`);
  });

  it.each(TOWER_KEYS)('%s turret sprite has matching preload in BootScene', (key) => {
    expect(bootSrc).toContain(`tower-${key}-turret`);
    expect(bootSrc).toContain(`assets/towers/${key}-turret.png`);
  });
});

// ── 6. Minimum file size sanity check ──────────────────────────────────────────

describe('tower sprite files — minimum size', () => {
  it.each(EXPECTED_FILES)(
    '$filename is at least 100 bytes (not a degenerate/corrupt file)',
    ({ filename }) => {
      const buf = readFileSync(resolve(ASSETS_DIR, filename));
      expect(buf.length).toBeGreaterThanOrEqual(100);
    },
  );
});
