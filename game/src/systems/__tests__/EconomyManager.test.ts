import { describe, it, expect } from 'vitest';
import {
  calculateSellRefund,
  calculateWaveBonus,
  calculateRunCurrency,
} from '../EconomyManager';

describe('calculateSellRefund', () => {
  it('returns 70% of total spent', () => {
    expect(calculateSellRefund(100)).toBe(70);
  });

  it('floors fractional results', () => {
    expect(calculateSellRefund(101)).toBe(70);
    expect(calculateSellRefund(99)).toBe(69);
  });

  it('returns 0 for zero spent', () => {
    expect(calculateSellRefund(0)).toBe(0);
  });
});

describe('calculateWaveBonus', () => {
  it('scales with wave number', () => {
    expect(calculateWaveBonus(1)).toBe(60);   // 50 + 10
    expect(calculateWaveBonus(10)).toBe(150);  // 50 + 100
    expect(calculateWaveBonus(20)).toBe(250);  // 50 + 200
  });

  it('respects custom base bonus', () => {
    expect(calculateWaveBonus(1, 100)).toBe(110);
  });
});

describe('calculateRunCurrency', () => {
  it('earns 5 currency per wave completed', () => {
    expect(calculateRunCurrency(10)).toBe(50);
    expect(calculateRunCurrency(20)).toBe(100);
  });

  it('awards completion bonus for clearing all waves', () => {
    expect(calculateRunCurrency(20, 20, true)).toBe(150);  // 100 + 50 bonus
  });

  it('no completion bonus on failed run', () => {
    expect(calculateRunCurrency(15, 20, false)).toBe(75);
  });

  it('earns currency even on wave 1 failure', () => {
    expect(calculateRunCurrency(1)).toBe(5);
  });
});
