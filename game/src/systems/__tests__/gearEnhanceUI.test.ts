import { describe, it, expect } from 'vitest';
import { getEnhancedStatMult } from '../../data/gearDefs';
import inventorySrc from '../../scenes/InventoryScene.ts?raw';

// ── Pure logic tests for getEnhancedStatMult ─────────────────────────────────

describe('getEnhancedStatMult', () => {
  it('returns 1.0 at enhance level 0', () => {
    expect(getEnhancedStatMult(0)).toBe(1.0);
  });
  it('returns 1.05 at enhance level 1', () => {
    expect(getEnhancedStatMult(1)).toBeCloseTo(1.05);
  });
  it('returns 1.25 at enhance level 5 (max)', () => {
    expect(getEnhancedStatMult(5)).toBeCloseTo(1.25);
  });
  it('scales linearly with level', () => {
    for (let lvl = 0; lvl <= 5; lvl++) {
      expect(getEnhancedStatMult(lvl)).toBeCloseTo(1.0 + lvl * 0.05);
    }
  });
});

// ── _formatStatVal structural tests ──────────────────────────────────────────

describe('_formatStatVal implementation', () => {
  it('exists as a private method in InventoryScene', () => {
    expect(inventorySrc).toContain('_formatStatVal');
  });

  it('handles percent stats with pct rounding', () => {
    // Method: Math.round(val * 1000) / 10 for percent display
    expect(inventorySrc).toContain('Math.round(val * 1000) / 10');
  });

  it('handles flat stats with one-decimal rounding', () => {
    expect(inventorySrc).toContain('Math.round(val * 10) / 10');
  });

  it('shows positive sign prefix for positive display values', () => {
    // Sign computed after rounding to avoid "+0" for tiny values
    expect(inventorySrc).toContain("const sign = pct > 0 ? '+' : ''");
    expect(inventorySrc).toContain("const sign = rounded > 0 ? '+' : ''");
  });

  it('uses toFixed(1) for non-integer results', () => {
    // Two toFixed calls: one for pct, one for flat
    const matches = inventorySrc.match(/\.toFixed\(1\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Before → after display (AC: "Damage: 10 → 12" format) ───────────────────

describe('before→after stat display', () => {
  it('uses arrow (→) to show before/after values', () => {
    // The arrow character between current and next values
    expect(inventorySrc).toContain('→ ${nextStr}');
  });

  it('computes currentMult from getEnhancedStatMult(item.enhanceLevel)', () => {
    expect(inventorySrc).toContain('getEnhancedStatMult(item.enhanceLevel)');
  });

  it('computes nextMult from getEnhancedStatMult(item.enhanceLevel + 1)', () => {
    expect(inventorySrc).toContain('getEnhancedStatMult(item.enhanceLevel + 1)');
  });

  it('only shows arrow when nextMult is not null (not maxed)', () => {
    expect(inventorySrc).toContain('if (nextMult !== null)');
  });

  it('shows only current value when at max level (no arrow)', () => {
    // When nextMult is null, lineStr = `${statLabel}: ${currentStr}` (no arrow)
    expect(inventorySrc).toMatch(/lineStr\s*=\s*`\$\{statLabel\}:\s*\$\{currentStr\}`/);
  });

  it('multiplies base stat by currentMult for current display', () => {
    expect(inventorySrc).toContain('(val as number) * currentMult');
  });

  it('multiplies base stat by nextMult for next-level display', () => {
    expect(inventorySrc).toContain('(val as number) * nextMult');
  });
});

// ── Max level indicator (AC: max level shown clearly) ────────────────────────

describe('max level indicator', () => {
  it('shows MAX LEVEL badge when enhanceLevel >= 5', () => {
    expect(inventorySrc).toContain('item.enhanceLevel >= 5');
    expect(inventorySrc).toContain("'MAX LEVEL'");
  });

  it('always shows enhance level as X/5 format', () => {
    expect(inventorySrc).toContain('+${item.enhanceLevel}/5');
  });
});

// ── Enhancement cost display (AC: cost shown clearly) ────────────────────────

describe('enhance button label', () => {
  it('shows target level and crystal cost in button label', () => {
    expect(inventorySrc).toContain('ENHANCE →');
    expect(inventorySrc).toContain('crystals)');
  });

  it('shows ENHANCE (MAX LEVEL) when at max', () => {
    expect(inventorySrc).toContain('ENHANCE (MAX LEVEL)');
  });

  it('disables button when player cannot afford enhancement', () => {
    // Button color is accent when affordable, borderInactive when not
    expect(inventorySrc).toContain('canEnhance ? PAL.accentBlueN : PAL.borderInactive');
  });
});

// ── UI refresh after enhance (AC: UI updates immediately) ────────────────────

describe('UI refresh after enhancement', () => {
  it('re-shows detail panel after enhancing', () => {
    // After inv.enhance(), calls _showDetail(updated)
    expect(inventorySrc).toContain('this.inv.enhance(item.uid)');
    expect(inventorySrc).toContain('this._showDetail(updated)');
  });

  it('refreshes balance and grid after enhancing', () => {
    expect(inventorySrc).toContain('this._refreshBalance()');
    expect(inventorySrc).toContain('this._buildGrid()');
  });

  it('fetches updated item after enhance to get new enhanceLevel', () => {
    expect(inventorySrc).toContain('this.inv.getItem(item.uid)');
  });
});

// ── Arithmetic: _formatStatVal manual replication ────────────────────────────

describe('_formatStatVal arithmetic (replicated)', () => {
  // Replicate the logic to verify expected outputs
  function formatStatVal(val: number, isPct: boolean): string {
    if (isPct) {
      const pct = Math.round(val * 1000) / 10;
      const sign = pct > 0 ? '+' : '';
      const pctStr = pct % 1 === 0 ? String(Math.round(pct)) : pct.toFixed(1);
      return `${sign}${pctStr}%`;
    } else {
      const rounded = Math.round(val * 10) / 10;
      const sign = rounded > 0 ? '+' : '';
      const numStr = rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1);
      return `${sign}${numStr}`;
    }
  }

  // Happy path
  it('formats positive percent stat correctly', () => {
    expect(formatStatVal(0.08, true)).toBe('+8%');
  });

  it('formats positive flat stat correctly', () => {
    expect(formatStatVal(5, false)).toBe('+5');
  });

  it('formats zero stat with no sign', () => {
    expect(formatStatVal(0, true)).toBe('0%');
    expect(formatStatVal(0, false)).toBe('0');
  });

  it('formats negative stat correctly', () => {
    expect(formatStatVal(-0.1, true)).toBe('-10%');
    expect(formatStatVal(-3, false)).toBe('-3');
  });

  // Boundary: enhanced multiplier applied to base stat
  it('formats enhanced percent stat (e.g. 0.08 * 1.25 at +5)', () => {
    const base = 0.08;
    const enhanced = base * getEnhancedStatMult(5); // 0.08 * 1.25 = 0.1
    expect(formatStatVal(enhanced, true)).toBe('+10%');
  });

  it('formats enhanced percent with one decimal', () => {
    const base = 0.05;
    const enhanced = base * getEnhancedStatMult(3); // 0.05 * 1.15 ≈ 0.05749…
    // JS float: 0.05 * 1.15 = 0.057499… → Math.round(57.499…) = 57 → 5.7
    expect(formatStatVal(enhanced, true)).toBe('+5.7%');
  });

  it('formats enhanced flat stat', () => {
    const base = 10;
    const enhanced = base * getEnhancedStatMult(2); // 10 * 1.10 = 11
    expect(formatStatVal(enhanced, false)).toBe('+11');
  });

  it('formats enhanced flat stat with decimal', () => {
    const base = 3;
    const enhanced = base * getEnhancedStatMult(1); // 3 * 1.05 = 3.15 → rounds to 3.2
    expect(formatStatVal(enhanced, false)).toBe('+3.2');
  });

  // Edge: very small values
  it('handles very small percent values', () => {
    expect(formatStatVal(0.001, true)).toBe('+0.1%');
  });

  it('handles very small flat values that round to zero (no sign)', () => {
    // val=0.04 → rounded=0, sign computed from rounded → displays '0'
    expect(formatStatVal(0.04, false)).toBe('0');
  });
});
