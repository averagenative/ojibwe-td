import { describe, it, expect } from 'vitest';
import { PAL } from '../../ui/palette';

// ── Helper ────────────────────────────────────────────────────────────────────

/** True if value is a valid 0xRRGGBB integer in [0, 0xFFFFFF]. */
function isValidHexNumber(v: number): boolean {
  return Number.isInteger(v) && v >= 0 && v <= 0xffffff;
}

/** True if value is a valid CSS '#RRGGBB' or '#rrggbb' string. */
function isValidCssHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

// ── Structure & Completeness ──────────────────────────────────────────────────

describe('PAL structure', () => {
  it('exports a frozen object (as const)', () => {
    // `as const` makes the object readonly at the type level;
    // at runtime we just verify the shape exists.
    expect(typeof PAL).toBe('object');
    expect(PAL).not.toBeNull();
  });

  it('has at least the core palette keys from the task spec', () => {
    const required = [
      'bgDark', 'bgPanel', 'borderInactive', 'borderActive',
      'accentGreen', 'accentBlue',
      'textPrimary', 'textSecondary', 'textDim',
      'gold', 'danger', 'bossWarning',
      'fontTitle', 'fontBody',
    ] as const;
    for (const key of required) {
      expect(PAL).toHaveProperty(key);
    }
  });

  it('has no undefined or null values', () => {
    for (const [key, value] of Object.entries(PAL)) {
      expect(value, `PAL.${key} should not be undefined`).not.toBeUndefined();
      expect(value, `PAL.${key} should not be null`).not.toBeNull();
    }
  });
});

// ── Numeric (0x) colour values ────────────────────────────────────────────────

describe('PAL numeric colours', () => {
  const numericKeys = Object.entries(PAL).filter(
    ([key, v]) => typeof v === 'number' && !key.startsWith('font'),
  );

  it('all numeric entries are valid 0xRRGGBB values', () => {
    for (const [key, value] of numericKeys) {
      expect(
        isValidHexNumber(value as number),
        `PAL.${key} = ${value} is not a valid hex colour`,
      ).toBe(true);
    }
  });

  it('numeric N-suffixed entries match their CSS counterparts', () => {
    // e.g. accentGreenN should equal the numeric parse of accentGreen
    const pairs: Array<[string, string]> = [
      ['accentGreenN', 'accentGreen'],
      ['accentBlueN', 'accentBlue'],
      ['goldN', 'gold'],
      ['dangerN', 'danger'],
      ['bossWarningN', 'bossWarning'],
      ['waveWarningN', 'waveWarning'],
    ];
    for (const [numKey, cssKey] of pairs) {
      const numVal = (PAL as Record<string, number | string>)[numKey] as number;
      const cssVal = (PAL as Record<string, number | string>)[cssKey] as string;
      const parsed = parseInt(cssVal.slice(1), 16);
      expect(numVal, `PAL.${numKey} should match parsed PAL.${cssKey}`).toBe(parsed);
    }
  });
});

// ── CSS string colour values ──────────────────────────────────────────────────

describe('PAL CSS colour strings', () => {
  const cssKeys = Object.entries(PAL).filter(
    ([key, v]) => typeof v === 'string' && !key.startsWith('font') && (v as string).startsWith('#'),
  );

  it('all CSS colour strings are valid #rrggbb format', () => {
    for (const [key, value] of cssKeys) {
      expect(
        isValidCssHex(value as string),
        `PAL.${key} = '${value}' is not valid #rrggbb`,
      ).toBe(true);
    }
  });

  it('no neon-green terminal colours remain (#00ff44, #00ff88, #00ff00)', () => {
    const forbidden = ['#00ff44', '#00ff88', '#00ff00', '#00FF44', '#00FF88', '#00FF00'];
    for (const [key, value] of cssKeys) {
      expect(
        forbidden.includes(value as string),
        `PAL.${key} = '${value}' is a forbidden neon-green`,
      ).toBe(false);
    }
  });
});

// ── Typography ────────────────────────────────────────────────────────────────

describe('PAL typography', () => {
  it('fontTitle includes a web font and a web-safe fallback', () => {
    expect(PAL.fontTitle).toContain('Cinzel');
    expect(PAL.fontTitle).toContain('serif');
  });

  it('fontBody includes a web-safe serif', () => {
    expect(PAL.fontBody).toContain('Georgia');
    expect(PAL.fontBody).toContain('serif');
  });

  it('fontFamily values do not include "monospace"', () => {
    expect(PAL.fontTitle).not.toContain('monospace');
    expect(PAL.fontBody).not.toContain('monospace');
  });
});

// ── Edge cases / boundaries ───────────────────────────────────────────────────

describe('PAL edge cases', () => {
  it('bgDark is darker than bgPanel', () => {
    expect(PAL.bgDark).toBeLessThan(PAL.bgPanel);
  });

  it('bgPanelDark is darker than bgPanel', () => {
    expect(PAL.bgPanelDark).toBeLessThan(PAL.bgPanel);
  });

  it('hover backgrounds are lighter than their base counterparts', () => {
    expect(PAL.bgPanelHover).toBeGreaterThan(PAL.bgPanel);
    expect(PAL.bgCardHover).toBeGreaterThan(PAL.bgCard);
    expect(PAL.bgStartBtnHover).toBeGreaterThan(PAL.bgStartBtn);
    expect(PAL.bgGiveUpHover).toBeGreaterThan(PAL.bgGiveUp);
  });

  it('borderActive is brighter than borderInactive', () => {
    expect(PAL.borderActive).toBeGreaterThan(PAL.borderInactive);
  });

  it('bgLockedOverlay equals bgGiveUp (both are the same dark red base)', () => {
    expect(PAL.bgLockedOverlay).toBe(PAL.bgGiveUp);
  });
});

// ── No duplicate keys (regression guard) ──────────────────────────────────────

describe('PAL key uniqueness', () => {
  it('all property values are intentional (no accidental key collisions)', () => {
    // Verify a few keys that could be confused with each other
    expect(PAL.textLocked).not.toBe(PAL.textDim);
    expect(PAL.borderInactive).not.toBe(PAL.borderActive);
    expect(PAL.accentGreen).not.toBe(PAL.accentBlue);
  });
});
