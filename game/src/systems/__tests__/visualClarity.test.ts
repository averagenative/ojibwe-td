import { describe, it, expect } from 'vitest';
import { hpBarColor } from '../visualUtils';

// ── hpBarColor ────────────────────────────────────────────────────────────────
//
// Health-bar fill transitions green → yellow → red as HP drops.
// The function takes a HP fraction [0, 1] and returns a 0xRRGG00 colour.

describe('hpBarColor', () => {
  // ── Helper to decompose packed colour into channels ──
  const r = (c: number) => (c >> 16) & 0xff;
  const g = (c: number) => (c >> 8) & 0xff;
  const b = (c: number) => c & 0xff;

  // ── happy path ──

  it('full HP (1.0) is pure green (0x00ff00)', () => {
    const c = hpBarColor(1);
    expect(r(c)).toBe(0);
    expect(g(c)).toBe(255);
    expect(b(c)).toBe(0);
  });

  it('half HP (0.5) is yellow (0xffff00)', () => {
    const c = hpBarColor(0.5);
    expect(r(c)).toBe(255);
    expect(g(c)).toBe(255);
    expect(b(c)).toBe(0);
  });

  it('zero HP (0.0) is red (0xff0000)', () => {
    const c = hpBarColor(0);
    expect(r(c)).toBe(255);
    expect(g(c)).toBe(0);
    expect(b(c)).toBe(0);
  });

  it('quarter HP (0.25) is orange-ish (high red, some green)', () => {
    const c = hpBarColor(0.25);
    expect(r(c)).toBe(255);
    expect(g(c)).toBeGreaterThan(0);
    expect(g(c)).toBeLessThan(255);
  });

  it('three-quarter HP (0.75) is yellow-green (some red, full green)', () => {
    const c = hpBarColor(0.75);
    expect(r(c)).toBeGreaterThan(0);
    expect(r(c)).toBeLessThan(255);
    expect(g(c)).toBe(255);
  });

  // ── boundary / edge cases ──

  it('clamps values above 1 to pure green', () => {
    expect(hpBarColor(1.5)).toBe(hpBarColor(1));
  });

  it('clamps negative values to pure red', () => {
    expect(hpBarColor(-0.5)).toBe(hpBarColor(0));
  });

  it('blue channel is always 0', () => {
    for (const pct of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      expect(b(hpBarColor(pct))).toBe(0);
    }
  });

  it('colour monotonically transitions (green channel rises with HP)', () => {
    let prevGreen = -1;
    for (let p = 0; p <= 1; p += 0.05) {
      const green = g(hpBarColor(p));
      expect(green).toBeGreaterThanOrEqual(prevGreen);
      prevGreen = green;
    }
  });
});
