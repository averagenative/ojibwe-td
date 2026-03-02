/**
 * TASK-085: Challenges List Scrollable — source-pattern tests.
 *
 * Because ChallengeSelectScene is a Phaser scene (excluded from the Vitest
 * transform by vite.config `exclude`), we import it as a raw string and
 * verify that the required scroll implementation patterns are present.
 * This is the same approach used by layoutContract.test.ts.
 *
 * We also exercise pure helper logic from challengeDefs.ts directly.
 */

import { describe, it, expect } from 'vitest';

// ── Raw source import ────────────────────────────────────────────────────────

import src from '../../scenes/ChallengeSelectScene.ts?raw';

// ── challengeDefs pure logic ──────────────────────────────────────────────────

import {
  ALL_CHALLENGES,
  getChallengeDef,
  getUnlockedChallenges,
  getFeaturedChallengeId,
  isTowerAllowed,
} from '../../data/challengeDefs';

// ─────────────────────────────────────────────────────────────────────────────
// Source-pattern tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ChallengeSelectScene — scroll implementation (TASK-085)', () => {

  // ── Scroll position reset ─────────────────────────────────────────────────

  describe('scroll reset on open', () => {
    it('resets camera scroll position to top when scene opens', () => {
      expect(src).toContain('setScroll(0, 0)');
    });

    it('resets _scrollVelocity to 0 on create', () => {
      // The field is set in the class body and also reset in create()
      expect(src).toContain('_scrollVelocity');
      expect(src).toMatch(/_scrollVelocity\s*=\s*0/);
    });
  });

  // ── Desktop scroll ────────────────────────────────────────────────────────

  describe('desktop scroll (mouse wheel)', () => {
    it("registers a 'wheel' input event for mouse scroll", () => {
      expect(src).toContain("'wheel'");
    });

    it('applies 0.5 damping factor to wheel delta', () => {
      // Prevents too-fast scrolling from a single wheel notch
      expect(src).toContain('dy * 0.5');
    });
  });

  // ── Mobile / touch scroll ─────────────────────────────────────────────────

  describe('mobile touch scroll (pointer drag)', () => {
    it("registers 'pointerdown' event to begin drag", () => {
      expect(src).toContain("'pointerdown'");
    });

    it("registers 'pointermove' event to scroll during drag", () => {
      expect(src).toContain("'pointermove'");
    });

    it("registers 'pointerup' event to release drag", () => {
      expect(src).toContain("'pointerup'");
    });

    it('tracks drag start Y and scroll anchor for delta computation', () => {
      expect(src).toContain('_dragStartY');
      expect(src).toContain('_dragStartScrollY');
    });
  });

  // ── Momentum ──────────────────────────────────────────────────────────────

  describe('scroll momentum', () => {
    it('defines SCROLL_FRICTION constant', () => {
      expect(src).toContain('SCROLL_FRICTION');
    });

    it('defines MIN_VELOCITY constant to stop momentum', () => {
      expect(src).toContain('MIN_VELOCITY');
    });

    it('tracks scroll velocity field', () => {
      expect(src).toContain('_scrollVelocity');
    });

    it('overrides update() to apply momentum each frame', () => {
      expect(src).toMatch(/update\s*\(\s*\)\s*:/);
    });

    it('applies SCROLL_FRICTION multiplier in update()', () => {
      expect(src).toContain('*= SCROLL_FRICTION');
    });
  });

  // ── Fixed BACK button ─────────────────────────────────────────────────────

  describe('fixed BACK button', () => {
    it('uses setScrollFactor(0) so button stays pinned to screen', () => {
      expect(src).toContain('setScrollFactor(0)');
    });

    it('has a _makeFixedButton helper', () => {
      expect(src).toContain('_makeFixedButton');
    });

    it('renders the fixed button at a high depth above scrolled content', () => {
      // Depths 202+ reserved for the fixed BACK area and button
      expect(src).toMatch(/setDepth\(20[234]/);
    });
  });

  // ── Visual scroll indicator ───────────────────────────────────────────────

  describe('scrollbar', () => {
    it('creates a scrollbar thumb game object', () => {
      expect(src).toContain('_scrollThumb');
    });

    it('creates _createScrollbar helper', () => {
      expect(src).toContain('_createScrollbar');
    });

    it('updates thumb position via _updateScrollbarThumb', () => {
      expect(src).toContain('_updateScrollbarThumb');
    });

    it('pins scrollbar to screen with setScrollFactor(0)', () => {
      // The scrollbar objects use setScrollFactor(0)
      const scrollbarSection = src.slice(src.indexOf('_createScrollbar'));
      expect(scrollbarSection).toContain('setScrollFactor(0)');
    });
  });

  describe('fade gradient', () => {
    it('creates a bottom-fade graphics object', () => {
      expect(src).toContain('_fadeGfx');
    });

    it('creates _createFadeGradient helper', () => {
      expect(src).toContain('_createFadeGradient');
    });

    it('hides the fade when scrolled to the bottom', () => {
      expect(src).toContain('_updateFadeVisibility');
    });

    it('pins fade to screen with setScrollFactor(0)', () => {
      const fadeSection = src.slice(src.indexOf('_createFadeGradient'));
      expect(fadeSection).toContain('setScrollFactor(0)');
    });
  });

  // ── Layout correctness ────────────────────────────────────────────────────

  describe('layout', () => {
    it('defines BACK_AREA_H constant for bottom-reserved zone', () => {
      expect(src).toContain('BACK_AREA_H');
    });

    it('uses camera.setBounds to enable scrolling', () => {
      expect(src).toContain('setBounds');
    });

    it('clamps scrollY to [0, _maxScrollY]', () => {
      expect(src).toContain('_maxScrollY');
      expect(src).toContain('Phaser.Math.Clamp');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// challengeDefs pure-logic tests
// ─────────────────────────────────────────────────────────────────────────────

describe('challengeDefs — pure logic', () => {

  describe('ALL_CHALLENGES', () => {
    it('has at least one challenge defined', () => {
      expect(ALL_CHALLENGES.length).toBeGreaterThan(0);
    });

    it('every challenge has a unique id', () => {
      const ids = ALL_CHALLENGES.map(c => c.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('every challenge has a waveCount > 0', () => {
      for (const c of ALL_CHALLENGES) {
        expect(c.modifier.waveCount).toBeGreaterThan(0);
      }
    });

    it('every challenge has a guaranteedRarity in the allowed set', () => {
      const allowed = new Set(['rare', 'epic', 'legendary']);
      for (const c of ALL_CHALLENGES) {
        expect(allowed.has(c.guaranteedRarity)).toBe(true);
      }
    });

    it('content height overflows a single 720px viewport (scroll is needed)', () => {
      // Verify the scenario this task was built for actually occurs
      const CARD_H_  = 130;
      const CARD_GAP_ = 16;
      const CARD_TOP_ = 110;
      const BACK_H_   = 64;
      const contentH  = CARD_TOP_ + ALL_CHALLENGES.length * (CARD_H_ + CARD_GAP_) + 60;
      expect(contentH).toBeGreaterThan(720 - BACK_H_);
    });
  });

  describe('getChallengeDef', () => {
    it('returns the correct def for a known id', () => {
      const first = ALL_CHALLENGES[0];
      expect(getChallengeDef(first.id)).toBe(first);
    });

    it('returns undefined for an unknown id', () => {
      expect(getChallengeDef('does-not-exist')).toBeUndefined();
    });
  });

  describe('getUnlockedChallenges', () => {
    it('returns empty array when player has 0 crystals', () => {
      expect(getUnlockedChallenges(0)).toHaveLength(0);
    });

    it('returns all challenges when player exceeds the highest threshold', () => {
      const maxThreshold = Math.max(...ALL_CHALLENGES.map(c => c.unlockThreshold));
      expect(getUnlockedChallenges(maxThreshold)).toHaveLength(ALL_CHALLENGES.length);
    });

    it('respects unlock threshold ordering', () => {
      // Sorted by threshold; challenges are not all at 0
      const sorted = [...ALL_CHALLENGES].sort((a, b) => a.unlockThreshold - b.unlockThreshold);
      const partial = getUnlockedChallenges(sorted[0].unlockThreshold);
      expect(partial.length).toBeGreaterThan(0);
      expect(partial.length).toBeLessThanOrEqual(ALL_CHALLENGES.length);
    });
  });

  describe('getFeaturedChallengeId', () => {
    it('returns a valid challenge id', () => {
      const ids = new Set(ALL_CHALLENGES.map(c => c.id));
      expect(ids.has(getFeaturedChallengeId())).toBe(true);
    });

    it('is deterministic for the same date', () => {
      expect(getFeaturedChallengeId()).toBe(getFeaturedChallengeId());
    });
  });

  describe('isTowerAllowed', () => {
    it('returns true for an unknown challenge id', () => {
      expect(isTowerAllowed('does-not-exist', 'cannon')).toBe(true);
    });

    it('returns false for a banned tower key', () => {
      const banned = ALL_CHALLENGES.find(c => c.modifier.bannedTowers.length > 0);
      if (banned) {
        const towerKey = banned.modifier.bannedTowers[0];
        expect(isTowerAllowed(banned.id, towerKey)).toBe(false);
      }
    });

    it('returns true for an allowed tower key', () => {
      const challenged = ALL_CHALLENGES[0];
      // 'lightning' is not in any banned list
      const notBanned = 'lightning';
      expect(isTowerAllowed(challenged.id, notBanned)).toBe(true);
    });
  });
});
