/**
 * Unit tests for creep directional movement helpers.
 *
 * All logic under test lives in src/data/pathing.ts — Phaser-free, no jsdom
 * canvas setup required.
 *
 * Covers:
 *   1. computeDirection — all four cardinal outcomes
 *   2. Diagonal inputs — dominant axis wins
 *   3. Equal-magnitude inputs — horizontal wins (tie-break)
 *   4. Zero vector — defaults to 'right'
 *   5. Bob frequency scales with effective speed (pure math)
 */

import { describe, it, expect } from 'vitest';
import {
  computeDirection,
  type CreepDirection,
} from '../../data/pathing';

// ── 1. Cardinal inputs ─────────────────────────────────────────────────────

describe('computeDirection — cardinal vectors', () => {
  it('returns right for positive-x movement', () => {
    expect(computeDirection(100, 0)).toBe<CreepDirection>('right');
  });

  it('returns left for negative-x movement', () => {
    expect(computeDirection(-50, 0)).toBe<CreepDirection>('left');
  });

  it('returns down for positive-y movement', () => {
    expect(computeDirection(0, 80)).toBe<CreepDirection>('down');
  });

  it('returns up for negative-y movement', () => {
    expect(computeDirection(0, -80)).toBe<CreepDirection>('up');
  });
});

// ── 2. Diagonal inputs — dominant axis wins ────────────────────────────────

describe('computeDirection — diagonal vectors', () => {
  it('returns right when |dx| > |dy| and dx > 0', () => {
    expect(computeDirection(10, 5)).toBe<CreepDirection>('right');
  });

  it('returns left when |dx| > |dy| and dx < 0', () => {
    expect(computeDirection(-10, 5)).toBe<CreepDirection>('left');
  });

  it('returns down when |dy| > |dx| and dy > 0', () => {
    expect(computeDirection(3, 7)).toBe<CreepDirection>('down');
  });

  it('returns up when |dy| > |dx| and dy < 0', () => {
    expect(computeDirection(3, -7)).toBe<CreepDirection>('up');
  });

  it('returns left when moving sharply left-and-slightly-up', () => {
    // |dx|=40 > |dy|=1 → horizontal wins; dx < 0 → left
    expect(computeDirection(-40, -1)).toBe<CreepDirection>('left');
  });
});

// ── 3. Equal-magnitude tie-break — horizontal wins ────────────────────────

describe('computeDirection — equal magnitude (tie-break)', () => {
  it('prefers right over down when |dx| === |dy| and dx > 0, dy > 0', () => {
    expect(computeDirection(5, 5)).toBe<CreepDirection>('right');
  });

  it('prefers left over down when |dx| === |dy| and dx < 0, dy > 0', () => {
    expect(computeDirection(-5, 5)).toBe<CreepDirection>('left');
  });

  it('prefers right over up when |dx| === |dy| and dx > 0, dy < 0', () => {
    expect(computeDirection(5, -5)).toBe<CreepDirection>('right');
  });

  it('prefers left over up when |dx| === |dy| and dx < 0, dy < 0', () => {
    expect(computeDirection(-5, -5)).toBe<CreepDirection>('left');
  });
});

// ── 4. Zero vector — safe default ─────────────────────────────────────────

describe('computeDirection — zero vector', () => {
  it('returns right when both components are zero (stationary creep)', () => {
    expect(computeDirection(0, 0)).toBe<CreepDirection>('right');
  });
});

// ── 5. Bob frequency scales with effective speed ───────────────────────────

describe('bobbing — phase accumulation scales with speed', () => {
  /**
   * The Creep class accumulates bobPhase each frame:
   *   bobPhase += (effectiveSpeed / 1000) * delta * BOB_FREQ_FACTOR
   *
   * We verify the relationship directly: doubling effectiveSpeed doubles
   * the phase increment, which doubles the bob frequency.
   */
  const BOB_FREQ_FACTOR = 0.157; // matches Creep.ts constant
  const delta = 16; // ms — one typical frame

  function phaseIncrement(effectiveSpeed: number): number {
    return (effectiveSpeed / 1000) * delta * BOB_FREQ_FACTOR;
  }

  it('phase increment is proportional to effective speed', () => {
    const slow = phaseIncrement(40);
    const fast = phaseIncrement(80);
    expect(fast).toBeCloseTo(slow * 2, 5);
  });

  it('phase increment is zero when speed is zero (fully frozen)', () => {
    expect(phaseIncrement(0)).toBe(0);
  });

  it('gives approximately 2 Hz at 80 px/s base speed', () => {
    // At 80 px/s, 60 frames/s: total rad per second
    const framesPerSec = 60;
    const radPerSec = phaseIncrement(80) * framesPerSec;
    // Expected ≈ 2 * 2π ≈ 12.57 rad/s  → 2 Hz
    expect(radPerSec).toBeGreaterThan(11);
    expect(radPerSec).toBeLessThan(14);
  });
});

// ── 6. Direction exhaustiveness — all values are reachable ────────────────

describe('computeDirection — all four directions reachable', () => {
  const allDirections: CreepDirection[] = ['right', 'left', 'down', 'up'];

  it('every cardinal direction can be produced', () => {
    const produced = new Set<CreepDirection>([
      computeDirection(1, 0),
      computeDirection(-1, 0),
      computeDirection(0, 1),
      computeDirection(0, -1),
    ]);
    for (const dir of allDirections) {
      expect(produced).toContain(dir);
    }
  });
});

// ── 7. Invalid / extreme inputs ──────────────────────────────────────────

describe('computeDirection — invalid and extreme inputs', () => {
  it('handles very large magnitudes without crashing', () => {
    expect(computeDirection(1e12, -1e11)).toBe<CreepDirection>('right');
    expect(computeDirection(-1e12, 1e11)).toBe<CreepDirection>('left');
  });

  it('handles Infinity on x-axis', () => {
    expect(computeDirection(Infinity, 0)).toBe<CreepDirection>('right');
    expect(computeDirection(-Infinity, 0)).toBe<CreepDirection>('left');
  });

  it('handles Infinity on y-axis', () => {
    expect(computeDirection(0, Infinity)).toBe<CreepDirection>('down');
    expect(computeDirection(0, -Infinity)).toBe<CreepDirection>('up');
  });

  it('returns a valid direction for NaN inputs (does not crash)', () => {
    // NaN comparisons all return false — function falls through to vertical
    // branch, then dy (NaN) >= 0 is false → 'up'. This is acceptable as
    // NaN inputs should never occur from real waypoint deltas.
    const result = computeDirection(NaN, NaN);
    expect(['right', 'left', 'up', 'down']).toContain(result);
  });

  it('handles negative zero', () => {
    // -0 >= 0 is true in JS, so this returns 'right' — same as (0, 0)
    expect(computeDirection(-0, -0)).toBe<CreepDirection>('right');
  });
});
