import { describe, it, expect } from 'vitest';
import { Rng } from '../Rng';

describe('Rng', () => {

  // ── Sequence reproducibility ──────────────────────────────────────────────

  describe('reproducibility', () => {
    it('same seed produces the same sequence', () => {
      const a = new Rng(42);
      const b = new Rng(42);
      const seqA = Array.from({ length: 20 }, () => a.next());
      const seqB = Array.from({ length: 20 }, () => b.next());
      expect(seqA).toEqual(seqB);
    });

    it('different seeds produce different sequences', () => {
      const a = new Rng(1);
      const b = new Rng(2);
      const seqA = Array.from({ length: 10 }, () => a.next());
      const seqB = Array.from({ length: 10 }, () => b.next());
      expect(seqA).not.toEqual(seqB);
    });

    it('seed 0 is coerced to 1 (no zero state)', () => {
      const rng = new Rng(0);
      // Should not hang or produce all-zero output.
      const val = rng.next();
      expect(typeof val).toBe('number');
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });

    it('negative seeds are accepted', () => {
      const rng = new Rng(-999);
      expect(() => rng.next()).not.toThrow();
    });
  });

  // ── next() range ──────────────────────────────────────────────────────────

  describe('next()', () => {
    it('returns values in [0, 1)', () => {
      const rng = new Rng(12345);
      for (let i = 0; i < 500; i++) {
        const v = rng.next();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  });

  // ── Distribution uniformity ───────────────────────────────────────────────

  describe('distribution', () => {
    it('mean of 1000 samples is within 0.05 of 0.5', () => {
      const rng = new Rng(99999);
      let sum = 0;
      const N = 1000;
      for (let i = 0; i < N; i++) sum += rng.next();
      const mean = sum / N;
      expect(Math.abs(mean - 0.5)).toBeLessThan(0.05);
    });
  });

  // ── nextInt ───────────────────────────────────────────────────────────────

  describe('nextInt(min, max)', () => {
    it('returns integers in [min, max] inclusive', () => {
      const rng = new Rng(7);
      for (let i = 0; i < 500; i++) {
        const v = rng.nextInt(3, 7);
        expect(v).toBeGreaterThanOrEqual(3);
        expect(v).toBeLessThanOrEqual(7);
        expect(Number.isInteger(v)).toBe(true);
      }
    });

    it('covers the full range', () => {
      const rng = new Rng(42);
      const seen = new Set<number>();
      for (let i = 0; i < 1000; i++) seen.add(rng.nextInt(1, 5));
      expect(seen.size).toBe(5);
    });

    it('returns min when min === max', () => {
      const rng = new Rng(1);
      expect(rng.nextInt(4, 4)).toBe(4);
    });
  });

  // ── nextItem ──────────────────────────────────────────────────────────────

  describe('nextItem<T>(arr)', () => {
    it('returns an element from the array', () => {
      const rng  = new Rng(100);
      const arr  = ['a', 'b', 'c', 'd'];
      for (let i = 0; i < 100; i++) {
        expect(arr).toContain(rng.nextItem(arr));
      }
    });

    it('covers all elements over many draws', () => {
      const rng  = new Rng(555);
      const arr  = [1, 2, 3, 4, 5];
      const seen = new Set<number>();
      for (let i = 0; i < 1000; i++) seen.add(rng.nextItem(arr));
      expect(seen.size).toBe(arr.length);
    });

    it('returns the only element for a single-element array', () => {
      const rng = new Rng(1);
      expect(rng.nextItem(['only'])).toBe('only');
    });

    it('throws on empty array', () => {
      const rng = new Rng(1);
      expect(() => rng.nextItem([])).toThrow(RangeError);
    });

    it('is deterministic with a fixed seed', () => {
      const arr = ['x', 'y', 'z'];
      const a   = new Rng(77);
      const b   = new Rng(77);
      const seqA = Array.from({ length: 10 }, () => a.nextItem(arr));
      const seqB = Array.from({ length: 10 }, () => b.nextItem(arr));
      expect(seqA).toEqual(seqB);
    });
  });

  // ── shuffle ───────────────────────────────────────────────────────────────

  describe('shuffle(arr)', () => {
    it('returns the same array reference', () => {
      const rng = new Rng(1);
      const arr = [1, 2, 3];
      expect(rng.shuffle(arr)).toBe(arr);
    });

    it('contains the same elements after shuffle', () => {
      const rng = new Rng(2);
      const arr = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle([...arr]);
      expect(shuffled.sort()).toEqual(arr.sort());
    });

    it('is deterministic with a fixed seed', () => {
      const a = new Rng(42);
      const b = new Rng(42);
      const arrA = a.shuffle([1, 2, 3, 4, 5]);
      const arrB = b.shuffle([1, 2, 3, 4, 5]);
      expect(arrA).toEqual(arrB);
    });
  });

  // ── nextBelow ────────────────────────────────────────────────────────────

  describe('nextBelow(n)', () => {
    it('returns integers in [0, n) exclusive', () => {
      const rng = new Rng(42);
      for (let i = 0; i < 500; i++) {
        const v = rng.nextBelow(5);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(5);
        expect(Number.isInteger(v)).toBe(true);
      }
    });

    it('covers the full range [0, n)', () => {
      const rng = new Rng(99);
      const seen = new Set<number>();
      for (let i = 0; i < 1000; i++) seen.add(rng.nextBelow(4));
      expect(seen.size).toBe(4);
    });

    it('returns 0 when n is 1', () => {
      const rng = new Rng(1);
      for (let i = 0; i < 10; i++) {
        expect(rng.nextBelow(1)).toBe(0);
      }
    });
  });

  // ── chance ──────────────────────────────────────────────────────────────

  describe('chance(probability)', () => {
    it('returns boolean values', () => {
      const rng = new Rng(7);
      for (let i = 0; i < 50; i++) {
        expect(typeof rng.chance()).toBe('boolean');
      }
    });

    it('probability 0 always returns false', () => {
      const rng = new Rng(42);
      for (let i = 0; i < 100; i++) {
        expect(rng.chance(0)).toBe(false);
      }
    });

    it('probability 1 always returns true', () => {
      const rng = new Rng(42);
      for (let i = 0; i < 100; i++) {
        expect(rng.chance(1)).toBe(true);
      }
    });

    it('default probability is ~50%', () => {
      const rng = new Rng(12345);
      let trues = 0;
      const N = 1000;
      for (let i = 0; i < N; i++) if (rng.chance()) trues++;
      expect(trues).toBeGreaterThan(400);
      expect(trues).toBeLessThan(600);
    });

    it('is deterministic with a fixed seed', () => {
      const a = new Rng(77);
      const b = new Rng(77);
      const seqA = Array.from({ length: 20 }, () => a.chance(0.3));
      const seqB = Array.from({ length: 20 }, () => b.chance(0.3));
      expect(seqA).toEqual(seqB);
    });
  });

  // ── fork ─────────────────────────────────────────────────────────────────

  describe('fork(offset)', () => {
    it('produces an independent Rng instance', () => {
      const parent = new Rng(10);
      const child  = parent.fork(1);
      expect(child).not.toBe(parent);
      // Child should produce a deterministic sequence.
      const childA = parent.fork(1);
      const childB = parent.fork(1);
      const seqA = Array.from({ length: 5 }, () => childA.next());
      const seqB = Array.from({ length: 5 }, () => childB.next());
      expect(seqA).toEqual(seqB);
    });

    it('different offsets produce different sequences', () => {
      const parent = new Rng(10);
      const childA = parent.fork(1);
      const childB = parent.fork(2);
      const seqA = Array.from({ length: 10 }, () => childA.next());
      const seqB = Array.from({ length: 10 }, () => childB.next());
      expect(seqA).not.toEqual(seqB);
    });
  });

});
