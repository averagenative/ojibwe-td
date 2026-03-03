/**
 * Tests for TASK-119: Remove Visual Box from Tower Turrets.
 *
 * Verifies:
 *  1. buildBody() does NOT call setStrokeStyle on the body rectangle
 *  2. buildBody() still creates a Rectangle with BODY_SIZE and fill color
 *  3. buildBody() still stores _bodyRef
 *  4. Tower rotation tracking is intact (_barrelAngle, lerpAngleDeg usage)
 *  5. Range circle strokes are NOT affected (still present in drawRange)
 *  6. All tower defs still have bodyColor defined
 *  7. BODY_SIZE constant is still 28
 */

import { describe, it, expect } from 'vitest';
import fs   from 'fs';
import path from 'path';
import { ALL_TOWER_DEFS } from '../../data/towerDefs';

const TOWER_SRC = fs.readFileSync(
  path.resolve(__dirname, '../../entities/towers/Tower.ts'),
  'utf8',
);

// Extract just the buildBody method source for targeted assertions.
function extractMethod(src: string, name: string): string {
  // Find `private <name>(` or `<name>(` and extract until the next method
  // at the same indentation level.
  const regex = new RegExp(
    `(private\\s+)?${name}\\s*\\([^)]*\\)\\s*(?::\\s*[\\w.]+)?\\s*\\{`,
  );
  const match = regex.exec(src);
  if (!match) return '';

  const startIdx = match.index;
  let braces = 0;
  let i = src.indexOf('{', startIdx);
  for (; i < src.length; i++) {
    if (src[i] === '{') braces++;
    if (src[i] === '}') braces--;
    if (braces === 0) break;
  }
  return src.slice(startIdx, i + 1);
}

const buildBodySrc = extractMethod(TOWER_SRC, 'buildBody');

// ── 1. No stroke on body rectangle ──────────────────────────────────────────

describe('buildBody — no turret box stroke', () => {
  it('buildBody method exists in Tower.ts', () => {
    expect(buildBodySrc.length).toBeGreaterThan(0);
  });

  it('does NOT call setStrokeStyle', () => {
    expect(buildBodySrc).not.toContain('setStrokeStyle');
  });

  it('does NOT call lineStyle on the body', () => {
    // lineStyle is used on Graphics (range circles), not Rectangles,
    // but guard against accidental addition.
    expect(buildBodySrc).not.toContain('lineStyle');
  });
});

// ── 2. Body rectangle is still created ──────────────────────────────────────

describe('buildBody — rectangle still created', () => {
  it('creates a Phaser.GameObjects.Rectangle', () => {
    expect(buildBodySrc).toContain('Phaser.GameObjects.Rectangle');
  });

  it('uses BODY_SIZE for dimensions', () => {
    expect(buildBodySrc).toContain('BODY_SIZE');
  });

  it('passes this.def.bodyColor as fill', () => {
    expect(buildBodySrc).toContain('this.def.bodyColor');
  });

  it('stores result in this._bodyRef', () => {
    expect(buildBodySrc).toContain('this._bodyRef = body');
  });
});

// ── 3. BODY_SIZE constant ───────────────────────────────────────────────────

describe('BODY_SIZE constant', () => {
  it('is defined as 28', () => {
    expect(TOWER_SRC).toMatch(/const\s+BODY_SIZE\s*=\s*28/);
  });
});

// ── 4. Rotation tracking intact ─────────────────────────────────────────────

describe('tower rotation — still functional', () => {
  it('has _barrelAngle field', () => {
    expect(TOWER_SRC).toContain('_barrelAngle');
  });

  it('imports lerpAngleDeg for smooth tracking', () => {
    expect(TOWER_SRC).toContain('lerpAngleDeg');
  });

  it('has _stepBarrelTracking method', () => {
    expect(TOWER_SRC).toContain('_stepBarrelTracking');
  });
});

// ── 5. Range circle strokes NOT affected ────────────────────────────────────

describe('range circle strokes — preserved', () => {
  const buildRangeSrc = extractMethod(TOWER_SRC, 'buildRangeCircle');
  const refreshRangeSrc = extractMethod(TOWER_SRC, 'refreshRangeCircle');

  it('buildRangeCircle still uses lineStyle for the circle', () => {
    expect(buildRangeSrc).toContain('lineStyle');
  });

  it('buildRangeCircle still uses strokeCircle', () => {
    expect(buildRangeSrc).toContain('strokeCircle');
  });

  it('refreshRangeCircle still uses lineStyle', () => {
    expect(refreshRangeSrc).toContain('lineStyle');
  });

  it('refreshRangeCircle still uses strokeCircle', () => {
    expect(refreshRangeSrc).toContain('strokeCircle');
  });
});

// ── 6. All tower defs have bodyColor ────────────────────────────────────────

describe('tower defs — bodyColor', () => {
  for (const def of ALL_TOWER_DEFS) {
    it(`${def.key} has a numeric bodyColor`, () => {
      expect(typeof def.bodyColor).toBe('number');
    });
  }
});

// ── 7. No setStrokeStyle anywhere in tower entity file on body-related code ─

describe('Tower.ts — no body stroke anywhere', () => {
  it('setStrokeStyle is not called in buildBody (double-check full source)', () => {
    // Ensure no one re-adds a stroke in the future — scan lines between
    // "private buildBody" and the next private method.
    const lines = TOWER_SRC.split('\n');
    const startLine = lines.findIndex(l => l.includes('private buildBody'));
    expect(startLine).toBeGreaterThan(-1);

    let braces = 0;
    let entered = false;
    for (let i = startLine; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') { braces++; entered = true; }
        if (ch === '}') braces--;
      }
      if (entered && braces === 0) break;
      // Within buildBody, should not see setStrokeStyle
      if (entered && lines[i].includes('setStrokeStyle')) {
        expect.fail(`setStrokeStyle found in buildBody at line ${i + 1}`);
      }
    }
  });
});
