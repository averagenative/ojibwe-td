import { describe, it, expect } from 'vitest';
import { formatDmgLine, clampTooltipX } from '../../ui/tooltipFormat';
import {
  ROCK_HURLER_DEF,
  ARROW_DEF,
  FROST_DEF,
  POISON_DEF,
  TESLA_DEF,
  AURA_DEF,
  ALL_TOWER_DEFS,
} from '../../data/towerDefs';

// ── formatDmgLine ─────────────────────────────────────────────────────────────

describe('formatDmgLine', () => {
  it('returns "passive" for aura towers', () => {
    expect(formatDmgLine(AURA_DEF)).toBe('passive');
  });

  it('formats DoT line for zero-damage non-aura towers (Poison)', () => {
    expect(formatDmgLine(POISON_DEF)).toBe('DoT  ·  1.5s');
  });

  it('formats damage + interval for standard towers', () => {
    expect(formatDmgLine(ROCK_HURLER_DEF)).toBe('55 dmg  ·  2.0s');
    expect(formatDmgLine(FROST_DEF)).toBe('15 dmg  ·  1.2s');
    expect(formatDmgLine(ARROW_DEF)).toBe('18 dmg  ·  0.6s');
    expect(formatDmgLine(TESLA_DEF)).toBe('42 dmg  ·  1.5s');
  });

  it('handles fractional interval correctly', () => {
    const def = { isAura: false, damage: 10, attackIntervalMs: 1750 };
    expect(formatDmgLine(def)).toBe('10 dmg  ·  1.8s');
  });

  it('prioritises isAura over damage===0', () => {
    // An aura tower also has damage 0 — isAura takes precedence
    const def = { isAura: true, damage: 0, attackIntervalMs: Infinity };
    expect(formatDmgLine(def)).toBe('passive');
  });
});

// ── clampTooltipX ──────────────────────────────────────────────────────────────

describe('clampTooltipX', () => {
  const TW = 190; // tooltip width matching TowerPanel's TOOLTIP_W

  it('centres tooltip when there is plenty of room', () => {
    // button at x=400, screen 800px wide → rawLeft = 305
    expect(clampTooltipX(400, TW, 800)).toBe(305);
  });

  it('clamps to left margin when button is near the left edge', () => {
    // button at x=20 → rawLeft = -75, clamped to 4
    expect(clampTooltipX(20, TW, 800)).toBe(4);
  });

  it('clamps to right margin when button is near the right edge', () => {
    // button at x=780 → rawLeft = 685, max allowed = 800 - 190 - 4 = 606
    expect(clampTooltipX(780, TW, 800)).toBe(606);
  });

  it('handles screen width exactly equal to tooltip width + margins', () => {
    // screenW = 198 → max = 198 - 190 - 4 = 4 → always returns 4
    expect(clampTooltipX(99, TW, 198)).toBe(4);
  });

  it('handles screen width smaller than tooltip (degenerate)', () => {
    // screenW = 100 → max = 100 - 190 - 4 = -94, min = 4 → returns 4
    expect(clampTooltipX(50, TW, 100)).toBe(4);
  });
});

// ── TowerDef description field ─────────────────────────────────────────────────

describe('TowerDef.description', () => {
  it('every tower def has a non-empty description string', () => {
    for (const def of ALL_TOWER_DEFS) {
      expect(def.description, `${def.key} missing description`).toBeTruthy();
      expect(typeof def.description).toBe('string');
      expect(def.description.length).toBeGreaterThan(10);
    }
  });

  it('descriptions match the task specification', () => {
    expect(ROCK_HURLER_DEF.description).toBe('Heavy rock: direct hit + AoE splash. Bonus dmg vs armored.');
    expect(ARROW_DEF.description).toBe('Fast, long-range. Weak vs armor — use Rock Hurler for armored foes.');
    expect(FROST_DEF.description).toBe('Slows targets. Chills stack for a freeze bonus.');
    expect(TESLA_DEF.description).toBe('Chains lightning to up to 3 air targets. Air-only specialist.');
    expect(POISON_DEF.description).toBe('Applies damage-over-time. Spreads on creep death.');
    expect(AURA_DEF.description).toBe('Boosts nearby tower attack speed and damage.');
  });
});
