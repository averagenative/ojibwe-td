/**
 * Tests for TASK-126: Makwa Boss Sprite — Full Bear Body
 *
 * Validates the boss-makwa.png asset file integrity and that the sprite
 * is correctly wired into game data definitions.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { BOSS_DEFS } from '../../data/bossDefs';
import bootSceneRaw from '../../scenes/BootScene.ts?raw';

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

describe('BootScene preloads boss-makwa sprite', () => {
  it('loads boss-makwa image from assets/sprites/boss-makwa.png', () => {
    expect(bootSceneRaw).toContain("'boss-makwa'");
    expect(bootSceneRaw).toContain('boss-makwa.png');
  });
});

describe('gen-boss-makwa.py generation script', () => {
  const GEN_SCRIPT_PATH = resolve(__dirname, '../../../scripts/gen-boss-makwa.py');
  const scriptSrc = readFileSync(GEN_SCRIPT_PATH, 'utf-8');

  it('script file exists', () => {
    expect(existsSync(GEN_SCRIPT_PATH)).toBe(true);
  });

  it('generates a full-body design (has body, legs, head, tail sections)', () => {
    expect(scriptSrc).toContain('BODY');
    expect(scriptSrc).toContain('LEGS');
    expect(scriptSrc).toContain('HEAD');
    expect(scriptSrc).toContain('TAIL');
  });

  it('outputs to the correct sprite path (boss-makwa.png)', () => {
    expect(scriptSrc).toContain("'boss-makwa.png'");
  });

  it('works at 4× resolution and downscales to 64×64', () => {
    expect(scriptSrc).toContain('FINAL_SIZE = 64');
    expect(scriptSrc).toContain('WORK_SIZE = FINAL_SIZE * 4');
    expect(scriptSrc).toContain('LANCZOS');
  });

  it('uses PNW formline palette (BLACK, RED, TEAL, AMBER)', () => {
    for (const color of ['BLACK', 'RED', 'TEAL', 'AMBER']) {
      expect(scriptSrc).toContain(`${color}`);
    }
  });

  it('does not import unused modules', () => {
    expect(scriptSrc).not.toMatch(/^import math$/m);
  });

  it('output PNG matches script output path', () => {
    // The checked-in PNG path should match what the script writes to
    const outDirMatch = scriptSrc.match(/OUT_DIR\s*=.*'sprites'/);
    expect(outDirMatch).not.toBeNull();
  });
});
