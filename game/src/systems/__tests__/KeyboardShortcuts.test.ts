import { describe, it, expect } from 'vitest';
import { isShortcutBlocked } from '../KeyboardShortcuts';
import type { ShortcutContext } from '../KeyboardShortcuts';

// ── Helper ────────────────────────────────────────────────────────────────────

function ctx(overrides: Partial<ShortcutContext> = {}): ShortcutContext {
  return {
    gameOver: false,
    bossOfferOpen: false,
    paused: false,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('isShortcutBlocked', () => {
  // ── happy path: normal gameplay ──────────────────────────────────────────
  describe('normal gameplay (not paused, not over, no boss offer)', () => {
    it('allows shortcuts', () => {
      expect(isShortcutBlocked(ctx())).toBe(false);
    });

    it('allows pause-safe shortcuts', () => {
      expect(isShortcutBlocked(ctx(), true)).toBe(false);
    });
  });

  // ── game over blocks everything ─────────────────────────────────────────
  describe('game over', () => {
    it('blocks regular shortcuts', () => {
      expect(isShortcutBlocked(ctx({ gameOver: true }))).toBe(true);
    });

    it('blocks even pause-safe shortcuts', () => {
      expect(isShortcutBlocked(ctx({ gameOver: true }), true)).toBe(true);
    });
  });

  // ── boss offer panel blocks everything ──────────────────────────────────
  describe('boss offer panel open', () => {
    it('blocks regular shortcuts', () => {
      expect(isShortcutBlocked(ctx({ bossOfferOpen: true }))).toBe(true);
    });

    it('blocks pause-safe shortcuts', () => {
      expect(isShortcutBlocked(ctx({ bossOfferOpen: true }), true)).toBe(true);
    });
  });

  // ── paused state ────────────────────────────────────────────────────────
  describe('paused', () => {
    it('blocks regular shortcuts (F, S, U, 1-6)', () => {
      expect(isShortcutBlocked(ctx({ paused: true }))).toBe(true);
    });

    it('allows pause-safe shortcuts (Space, Esc)', () => {
      expect(isShortcutBlocked(ctx({ paused: true }), true)).toBe(false);
    });
  });

  // ── combined states ─────────────────────────────────────────────────────
  describe('combined states', () => {
    it('game over + paused: blocks pause-safe shortcuts', () => {
      expect(isShortcutBlocked(ctx({ gameOver: true, paused: true }), true)).toBe(true);
    });

    it('boss offer + paused: blocks pause-safe shortcuts', () => {
      expect(isShortcutBlocked(ctx({ bossOfferOpen: true, paused: true }), true)).toBe(true);
    });

    it('all flags: blocks everything', () => {
      expect(isShortcutBlocked(ctx({ gameOver: true, bossOfferOpen: true, paused: true }))).toBe(true);
      expect(isShortcutBlocked(ctx({ gameOver: true, bossOfferOpen: true, paused: true }), true)).toBe(true);
    });
  });

  // ── default allowWhenPaused ─────────────────────────────────────────────
  describe('allowWhenPaused defaults to false', () => {
    it('blocks when paused and no second argument provided', () => {
      expect(isShortcutBlocked(ctx({ paused: true }))).toBe(true);
    });

    it('explicit false behaves the same as omitting the argument', () => {
      expect(isShortcutBlocked(ctx({ paused: true }), false)).toBe(true);
    });
  });
});
