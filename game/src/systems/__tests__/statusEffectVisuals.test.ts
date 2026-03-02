/**
 * Unit tests for TASK-066: Creep Status Effect Visuals.
 *
 * All logic under test lives in src/entities/StatusEffectVisuals.ts, which is
 * a Phaser-free pure-data module.  No mocking required.
 *
 * Covers:
 *   1. EFFECT_CONFIGS — all five effects have valid config entries
 *   2. poisonParticleCount — scales with stack count, caps at 8
 *   3. poisonOverlayAlpha  — scales with stack count, caps at 0.6
 *   4. frostOverlayAlpha   — shatter vs. base frost
 *   5. activeEffectKeys    — correct keys in stable display order
 *   6. ICON_COLORS         — every StatusEffectKey has a colour entry
 *   7. Composability       — multiple effects produce distinct, non-conflicting configs
 */

import { describe, it, expect } from 'vitest';
import {
  EFFECT_CONFIGS,
  SHATTER_OVERLAY_ALPHA,
  ICON_COLORS,
  ICON_RADIUS,
  ICON_BAR_OFFSET_Y,
  poisonParticleCount,
  poisonOverlayAlpha,
  frostOverlayAlpha,
  activeEffectKeys,
} from '../../entities/StatusEffectVisuals';
import type { StatusEffectKey } from '../../entities/StatusEffectVisuals';

// ── 1. EFFECT_CONFIGS completeness ───────────────────────────────────────────

const ALL_KEYS: StatusEffectKey[] = ['poison', 'frost', 'burn', 'tesla', 'armorShred'];

describe('EFFECT_CONFIGS', () => {
  it('has an entry for every StatusEffectKey', () => {
    for (const key of ALL_KEYS) {
      expect(EFFECT_CONFIGS[key]).toBeDefined();
    }
  });

  it('all particleColor values are valid hex integers', () => {
    for (const key of ALL_KEYS) {
      const c = EFFECT_CONFIGS[key].particleColor;
      expect(typeof c).toBe('number');
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(0xffffff);
    }
  });

  it('all tintColor values are valid hex integers', () => {
    for (const key of ALL_KEYS) {
      const c = EFFECT_CONFIGS[key].tintColor;
      expect(typeof c).toBe('number');
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(0xffffff);
    }
  });

  it('all tintAlpha values are in [0, 1]', () => {
    for (const key of ALL_KEYS) {
      const a = EFFECT_CONFIGS[key].tintAlpha;
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  it('all particleCount values are non-negative integers', () => {
    for (const key of ALL_KEYS) {
      const n = EFFECT_CONFIGS[key].particleCount;
      expect(n).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('all particleLifeMs values are non-negative', () => {
    for (const key of ALL_KEYS) {
      expect(EFFECT_CONFIGS[key].particleLifeMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('all icon strings are non-empty', () => {
    for (const key of ALL_KEYS) {
      expect(EFFECT_CONFIGS[key].icon.length).toBeGreaterThan(0);
    }
  });

  it('poison icon is poison-drop', () => {
    expect(EFFECT_CONFIGS.poison.icon).toBe('poison-drop');
  });

  it('frost icon is snowflake', () => {
    expect(EFFECT_CONFIGS.frost.icon).toBe('snowflake');
  });

  it('burn icon is flame', () => {
    expect(EFFECT_CONFIGS.burn.icon).toBe('flame');
  });

  it('tesla icon is lightning', () => {
    expect(EFFECT_CONFIGS.tesla.icon).toBe('lightning');
  });

  it('armorShred icon is broken-shield', () => {
    expect(EFFECT_CONFIGS.armorShred.icon).toBe('broken-shield');
  });

  it('poison particleCount is at least 3 (task spec: 3-4 active)', () => {
    expect(EFFECT_CONFIGS.poison.particleCount).toBeGreaterThanOrEqual(3);
  });

  it('frost particleCount is at least 3 (task spec: sparkles)', () => {
    expect(EFFECT_CONFIGS.frost.particleCount).toBeGreaterThanOrEqual(3);
  });

  it('burn particleCount is at least 2 (task spec: 2-3 flames)', () => {
    expect(EFFECT_CONFIGS.burn.particleCount).toBeGreaterThanOrEqual(2);
  });
});

// ── 2. poisonParticleCount ────────────────────────────────────────────────────

describe('poisonParticleCount', () => {
  it('returns 0 for 0 stacks', () => {
    expect(poisonParticleCount(0)).toBe(0);
  });

  it('returns base count for 1 stack', () => {
    expect(poisonParticleCount(1)).toBe(EFFECT_CONFIGS.poison.particleCount);
  });

  it('increments by 1 per additional stack', () => {
    const base = poisonParticleCount(1);
    expect(poisonParticleCount(2)).toBe(base + 1);
    expect(poisonParticleCount(3)).toBe(base + 2);
  });

  it('caps at 8', () => {
    for (let s = 6; s <= 20; s++) {
      expect(poisonParticleCount(s)).toBeLessThanOrEqual(8);
    }
  });

  it('is exactly 8 at high stack counts', () => {
    expect(poisonParticleCount(100)).toBe(8);
  });

  it('is monotonically non-decreasing with stacks', () => {
    let prev = 0;
    for (let s = 1; s <= 10; s++) {
      const count = poisonParticleCount(s);
      expect(count).toBeGreaterThanOrEqual(prev);
      prev = count;
    }
  });

  it('handles negative stacks gracefully (same as 0)', () => {
    expect(poisonParticleCount(-1)).toBe(0);
  });
});

// ── 3. poisonOverlayAlpha ─────────────────────────────────────────────────────

describe('poisonOverlayAlpha', () => {
  it('returns 0 for 0 stacks', () => {
    expect(poisonOverlayAlpha(0)).toBe(0);
  });

  it('returns base tintAlpha for 1 stack', () => {
    expect(poisonOverlayAlpha(1)).toBeCloseTo(EFFECT_CONFIGS.poison.tintAlpha, 5);
  });

  it('scales with stack count (2 stacks > 1 stack)', () => {
    expect(poisonOverlayAlpha(2)).toBeGreaterThan(poisonOverlayAlpha(1));
  });

  it('caps at 0.6', () => {
    for (let s = 3; s <= 20; s++) {
      expect(poisonOverlayAlpha(s)).toBeLessThanOrEqual(0.6);
    }
  });

  it('is exactly 0.6 at very high stack counts', () => {
    expect(poisonOverlayAlpha(100)).toBe(0.6);
  });

  it('alpha is always in [0, 1]', () => {
    for (let s = 0; s <= 10; s++) {
      const a = poisonOverlayAlpha(s);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  it('handles negative stacks gracefully (same as 0)', () => {
    expect(poisonOverlayAlpha(-5)).toBe(0);
  });
});

// ── 4. frostOverlayAlpha ──────────────────────────────────────────────────────

describe('frostOverlayAlpha', () => {
  it('returns base frost tintAlpha when not shattered', () => {
    expect(frostOverlayAlpha(false)).toBeCloseTo(EFFECT_CONFIGS.frost.tintAlpha, 5);
  });

  it('returns SHATTER_OVERLAY_ALPHA when shattered', () => {
    expect(frostOverlayAlpha(true)).toBeCloseTo(SHATTER_OVERLAY_ALPHA, 5);
  });

  it('shatter alpha is higher than base frost alpha', () => {
    expect(frostOverlayAlpha(true)).toBeGreaterThan(frostOverlayAlpha(false));
  });

  it('shatter alpha is in [0, 1]', () => {
    expect(SHATTER_OVERLAY_ALPHA).toBeGreaterThan(0);
    expect(SHATTER_OVERLAY_ALPHA).toBeLessThanOrEqual(1);
  });
});

// ── 5. activeEffectKeys ───────────────────────────────────────────────────────

describe('activeEffectKeys', () => {
  it('returns empty array when no effects are active', () => {
    expect(activeEffectKeys(false, false, false, false, false)).toEqual([]);
  });

  it('returns [poison] when only poisoned', () => {
    expect(activeEffectKeys(true, false, false, false, false)).toEqual(['poison']);
  });

  it('returns [frost] when only slowed', () => {
    expect(activeEffectKeys(false, true, false, false, false)).toEqual(['frost']);
  });

  it('returns [burn] when only burning', () => {
    expect(activeEffectKeys(false, false, true, false, false)).toEqual(['burn']);
  });

  it('returns [tesla] when only shocked', () => {
    expect(activeEffectKeys(false, false, false, true, false)).toEqual(['tesla']);
  });

  it('returns [armorShred] when only shredded', () => {
    expect(activeEffectKeys(false, false, false, false, true)).toEqual(['armorShred']);
  });

  it('returns [poison, frost] for dual poison+slow', () => {
    const keys = activeEffectKeys(true, true, false, false, false);
    expect(keys).toContain('poison');
    expect(keys).toContain('frost');
    expect(keys).toHaveLength(2);
  });

  it('returns all five keys when all effects are active', () => {
    const keys = activeEffectKeys(true, true, true, true, true);
    expect(keys).toHaveLength(5);
    for (const k of ALL_KEYS) {
      expect(keys).toContain(k);
    }
  });

  it('poison comes before frost in display order', () => {
    const keys = activeEffectKeys(true, true, false, false, false);
    expect(keys.indexOf('poison')).toBeLessThan(keys.indexOf('frost'));
  });

  it('result length matches the number of true flags', () => {
    for (const count of [0, 1, 2, 3, 4, 5]) {
      // Build a flags tuple with `count` trues, rest false
      const flags: [boolean, boolean, boolean, boolean, boolean] = [
        count > 0, count > 1, count > 2, count > 3, count > 4,
      ];
      expect(activeEffectKeys(...flags)).toHaveLength(count);
    }
  });
});

// ── 6. ICON_COLORS ────────────────────────────────────────────────────────────

describe('ICON_COLORS', () => {
  it('has an entry for every StatusEffectKey', () => {
    for (const key of ALL_KEYS) {
      expect(ICON_COLORS[key]).toBeDefined();
    }
  });

  it('all values are valid hex colours', () => {
    for (const key of ALL_KEYS) {
      const c = ICON_COLORS[key];
      expect(typeof c).toBe('number');
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(0xffffff);
    }
  });

  it('poison icon is green (high green channel)', () => {
    const g = (ICON_COLORS.poison >> 8) & 0xff;
    expect(g).toBeGreaterThan(200);
  });

  it('frost icon is blue-dominant', () => {
    const b = ICON_COLORS.frost & 0xff;
    expect(b).toBeGreaterThan(200);
  });

  it('burn icon is red/orange-dominant', () => {
    const r = (ICON_COLORS.burn >> 16) & 0xff;
    expect(r).toBeGreaterThan(200);
  });
});

// ── 7. Constants ──────────────────────────────────────────────────────────────

describe('Icon bar constants', () => {
  it('ICON_RADIUS is a positive number', () => {
    expect(ICON_RADIUS).toBeGreaterThan(0);
  });

  it('ICON_RADIUS is small enough to not obscure the HP bar (<=5)', () => {
    // Task spec: icons are "tiny (6×6px)" — radius ≤ 5 keeps diameter ≤ 10px
    expect(ICON_RADIUS).toBeLessThanOrEqual(5);
  });

  it('ICON_BAR_OFFSET_Y is above the HP bar (more negative than HP_BAR_OFFSET_Y=-20)', () => {
    // HP bar is at y=-20; icon bar should be above that (more negative)
    expect(ICON_BAR_OFFSET_Y).toBeLessThan(-20);
  });
});

// ── 8. Composability — distinct configs for simultaneous effects ───────────────

describe('composability — distinct effect configs', () => {
  it('poison and frost have different particleColors', () => {
    expect(EFFECT_CONFIGS.poison.particleColor).not.toBe(EFFECT_CONFIGS.frost.particleColor);
  });

  it('poison and frost have different tintColors', () => {
    expect(EFFECT_CONFIGS.poison.tintColor).not.toBe(EFFECT_CONFIGS.frost.tintColor);
  });

  it('burn and frost have different tintColors (warm vs. cold)', () => {
    expect(EFFECT_CONFIGS.burn.tintColor).not.toBe(EFFECT_CONFIGS.frost.tintColor);
  });

  it('all five effects have distinct particleColors', () => {
    const colors = ALL_KEYS.map(k => EFFECT_CONFIGS[k].particleColor);
    const unique = new Set(colors);
    expect(unique.size).toBe(ALL_KEYS.length);
  });

  it('all five effects have distinct tintColors', () => {
    const colors = ALL_KEYS.map(k => EFFECT_CONFIGS[k].tintColor);
    const unique = new Set(colors);
    expect(unique.size).toBe(ALL_KEYS.length);
  });

  it('activeEffectKeys for poison+frost returns both independently', () => {
    const keys = activeEffectKeys(true, true, false, false, false);
    expect(keys).toContain('poison');
    expect(keys).toContain('frost');
  });
});
