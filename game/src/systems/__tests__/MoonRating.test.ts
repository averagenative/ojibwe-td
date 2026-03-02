import { describe, it, expect } from 'vitest';
import { calculateMoons, moonRatingLabel, moonSymbol } from '../MoonRating';

// ── calculateMoons ────────────────────────────────────────────────────────────

describe('calculateMoons — threshold cases', () => {
  it('5 moons: full health + all waves cleared', () => {
    expect(calculateMoons(20, 20, 20, 20)).toBe(5);
  });

  it('4 moons: ≤ 20% lives lost + all waves cleared (exactly 20% lost)', () => {
    // 20 max, 16 remaining → 4 lost = 20% exactly
    expect(calculateMoons(16, 20, 20, 20)).toBe(4);
  });

  it('4 moons: ≤ 20% lives lost (1 life lost of 20)', () => {
    expect(calculateMoons(19, 20, 20, 20)).toBe(4);
  });

  it('3 moons: ≤ 50% lives lost + all waves cleared (exactly 50% lost)', () => {
    // 20 max, 10 remaining → 10 lost = 50%
    expect(calculateMoons(10, 20, 20, 20)).toBe(3);
  });

  it('3 moons: 21% lives lost (just over 20% threshold)', () => {
    // 20 max, 15 remaining → 5/20 = 25%
    expect(calculateMoons(15, 20, 20, 20)).toBe(3);
  });

  it('2 moons: all waves cleared, more than 50% lives lost', () => {
    // 20 max, 9 remaining → 11/20 = 55%
    expect(calculateMoons(9, 20, 20, 20)).toBe(2);
  });

  it('2 moons: all waves cleared with 1 life remaining', () => {
    expect(calculateMoons(1, 20, 20, 20)).toBe(2);
  });

  it('1 moon: cleared exactly 75% of waves (not all)', () => {
    // 15/20 waves = 75%
    expect(calculateMoons(0, 20, 15, 20)).toBe(1);
  });

  it('1 moon: cleared more than 75% but not all waves', () => {
    expect(calculateMoons(10, 20, 18, 20)).toBe(1);
  });

  it('1 moon: cleared less than 75% of waves (fallback minimum)', () => {
    // 10/20 = 50%
    expect(calculateMoons(10, 20, 10, 20)).toBe(1);
  });
});

describe('calculateMoons — edge cases', () => {
  it('0 lives remaining + all waves cleared → 2 moons (not 5)', () => {
    expect(calculateMoons(0, 20, 20, 20)).toBe(2);
  });

  it('maxLives of 0 does not divide by zero (treated as maxLives=1)', () => {
    expect(() => calculateMoons(0, 0, 20, 20)).not.toThrow();
    // lostFraction = (1-0)/1 = 1 → all waves cleared → 2 moons
    expect(calculateMoons(0, 0, 20, 20)).toBe(2);
  });

  it('livesLeft > maxLives (healed above starting lives) → clamps to 5', () => {
    // e.g. commander ability healed extra — treat as full health
    expect(calculateMoons(22, 20, 20, 20)).toBe(5);
  });

  it('wavesCleared > totalWaves → still 5 if full health', () => {
    expect(calculateMoons(20, 20, 25, 20)).toBe(5);
  });

  it('totalWaves of 0 does not produce NaN or throw', () => {
    expect(() => calculateMoons(20, 20, 0, 0)).not.toThrow();
    // allCleared = 0>=0 → true; lostFraction = 0 → 5 moons
    expect(calculateMoons(20, 20, 0, 0)).toBe(5);
  });

  it('1-life run, full health + all waves → 5 moons', () => {
    expect(calculateMoons(1, 1, 10, 10)).toBe(5);
  });

  it('1-life run, 0 lives left + all waves → 2 moons', () => {
    expect(calculateMoons(0, 1, 10, 10)).toBe(2);
  });

  it('negative livesLeft treated as all lives lost', () => {
    // Shouldn't happen in practice, but guard against negative inputs.
    expect(calculateMoons(-5, 20, 20, 20)).toBe(2); // allCleared, lostFraction clamped to 1
  });

  it('negative totalWaves: wavesCleared >= negative threshold → allCleared', () => {
    expect(() => calculateMoons(10, 10, 0, -1)).not.toThrow();
  });
});

// ── moonRatingLabel ───────────────────────────────────────────────────────────

describe('moonRatingLabel', () => {
  it('returns "Full Moon!" for 5', () => {
    expect(moonRatingLabel(5)).toBe('Full Moon!');
  });

  it('returns "Waxing Gibbous" for 4', () => {
    expect(moonRatingLabel(4)).toBe('Waxing Gibbous');
  });

  it('returns "Half Moon" for 3', () => {
    expect(moonRatingLabel(3)).toBe('Half Moon');
  });

  it('returns "Crescent" for 2', () => {
    expect(moonRatingLabel(2)).toBe('Crescent');
  });

  it('returns "New Moon" for 1', () => {
    expect(moonRatingLabel(1)).toBe('New Moon');
  });

  it('returns "New Moon" for out-of-range values (0, 6, -1)', () => {
    expect(moonRatingLabel(0)).toBe('New Moon');
    expect(moonRatingLabel(6)).toBe('New Moon');
    expect(moonRatingLabel(-1)).toBe('New Moon');
  });
});

// ── moonSymbol ────────────────────────────────────────────────────────────────

describe('moonSymbol', () => {
  it('returns filled moon for earned slot', () => {
    expect(moonSymbol(0, 3)).toBe('🌕');
    expect(moonSymbol(2, 3)).toBe('🌕');
  });

  it('returns empty moon for unearned slot', () => {
    expect(moonSymbol(3, 3)).toBe('🌑');
    expect(moonSymbol(4, 3)).toBe('🌑');
  });

  it('all 5 filled when 5 moons earned', () => {
    const row = Array.from({ length: 5 }, (_, i) => moonSymbol(i, 5));
    expect(row.every(s => s === '🌕')).toBe(true);
  });

  it('all 5 empty when 0 moons (edge case)', () => {
    const row = Array.from({ length: 5 }, (_, i) => moonSymbol(i, 0));
    expect(row.every(s => s === '🌑')).toBe(true);
  });
});
