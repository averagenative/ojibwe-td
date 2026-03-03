/**
 * Tests for TASK-117: Makwa Boss Sprite Rework
 *
 * Validates the boss-makwa.png asset file integrity and that the sprite
 * is correctly wired into game data definitions.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { BOSS_DEFS } from '../../data/bossDefs';

const SPRITE_PATH = resolve(__dirname, '../../../public/assets/sprites/boss-makwa.png');

// PNG magic bytes: 137 80 78 71 13 10 26 10
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Read width and height from the IHDR chunk (bytes 16–23 of a PNG). */
function readPngDimensions(buf: Buffer): { width: number; height: number } {
  // IHDR starts at byte 8 (chunk length 4 + 'IHDR' 4) → width at 16, height at 20
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

describe('boss-makwa.png asset file', () => {
  const buf = readFileSync(SPRITE_PATH);

  it('exists and is non-empty', () => {
    expect(buf.length).toBeGreaterThan(0);
  });

  it('has valid PNG magic bytes', () => {
    const header = buf.subarray(0, 8);
    expect(Buffer.compare(header, PNG_MAGIC)).toBe(0);
  });

  it('is 64×64 pixels (matching original dimensions)', () => {
    const { width, height } = readPngDimensions(buf);
    expect(width).toBe(64);
    expect(height).toBe(64);
  });

  it('uses RGBA color type (8-bit with alpha)', () => {
    // Byte 24 = bit depth, byte 25 = color type (6 = RGBA)
    const bitDepth = buf[24];
    const colorType = buf[25];
    expect(bitDepth).toBe(8);
    expect(colorType).toBe(6); // truecolour with alpha
  });

  it('file size is reasonable (100B–50KB)', () => {
    expect(buf.length).toBeGreaterThan(100);
    expect(buf.length).toBeLessThan(50_000);
  });
});

describe('boss-makwa wiring in game data', () => {
  it('BOSS_DEFS contains a makwa entry', () => {
    expect(BOSS_DEFS).toHaveProperty('makwa');
  });

  it('makwa BossDef has spriteKey "boss-makwa"', () => {
    expect(BOSS_DEFS.makwa.spriteKey).toBe('boss-makwa');
  });

  it('spriteKey matches the boss-{key} convention', () => {
    const def = BOSS_DEFS.makwa;
    expect(def.spriteKey).toBe(`boss-${def.key}`);
  });
});
