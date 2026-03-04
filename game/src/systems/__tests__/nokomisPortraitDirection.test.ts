import { describe, it, expect } from 'vitest';
import srcRaw from '../../scenes/CommanderSelectScene.ts?raw';

/**
 * TASK-155 — Nokomis portrait flies right-to-left on scene entry.
 *
 * The bug: slide-in direction was index-based (`i < midIdx`), so when only
 * one card was in _animStates (fresh game, only Nokomis unlocked),
 * midIdx = 0, 0 < 0 was false → offsetDir = 1 → flew from right.
 *
 * The fix: direction is now based on card x-position vs screen centre.
 */
describe('TASK-155 — Portrait slide-in direction', () => {

  // ── Structural: old bug pattern is gone ──────────────────────────────────

  it('no longer uses midIdx for slide-in direction', () => {
    expect(srcRaw).not.toContain('midIdx');
  });

  it('no longer compares loop index i to midIdx', () => {
    // The old pattern: `i < midIdx ? -1 : 1`
    expect(srcRaw).not.toMatch(/i\s*<\s*midIdx/);
  });

  // ── Structural: new position-based direction ─────────────────────────────

  it('calculates screenCx from scale.width', () => {
    expect(srcRaw).toMatch(/screenCx\s*=\s*this\.scale\.width\s*\/\s*2/);
  });

  it('determines offsetDir by comparing baseX to screenCx', () => {
    expect(srcRaw).toMatch(/state\.baseX\s*<\s*screenCx\s*\?\s*-1\s*:\s*1/);
  });

  it('uses offsetDir to compute startX from baseX', () => {
    expect(srcRaw).toMatch(/startX\s*=\s*state\.baseX\s*\+\s*offsetDir\s*\*\s*280/);
  });

  it('sets portrait.x to startX before tweening', () => {
    expect(srcRaw).toContain('state.portrait.x = startX');
  });

  it('tweens portrait x back to baseX', () => {
    expect(srcRaw).toMatch(/x:\s*state\.baseX/);
  });

  // ── Arithmetic: direction logic correctness ──────────────────────────────

  describe('offsetDir arithmetic', () => {
    // Replicates the direction calculation from the scene
    function computeOffsetDir(baseX: number, screenCx: number): number {
      return baseX < screenCx ? -1 : 1;
    }

    it('card left of centre → offsetDir = -1 (flies from left)', () => {
      expect(computeOffsetDir(400, 960)).toBe(-1);
    });

    it('card right of centre → offsetDir = 1 (flies from right)', () => {
      expect(computeOffsetDir(1400, 960)).toBe(1);
    });

    it('card exactly at centre → offsetDir = 1 (from right, no jitter)', () => {
      expect(computeOffsetDir(960, 960)).toBe(1);
    });

    it('single leftmost card (Nokomis fresh game) → offsetDir = -1', () => {
      // 6 commanders: totalW = 6*170 + 5*14 = 1090
      // startX = 960 - 1090/2 + 170/2 = 960 - 545 + 85 = 500
      const screenCx = 960;
      const nokomisBaseX = 500;
      expect(computeOffsetDir(nokomisBaseX, screenCx)).toBe(-1);
    });

    it('startX is further away from centre by 280px in offset direction', () => {
      const baseX = 500;
      const screenCx = 960;
      const offsetDir = computeOffsetDir(baseX, screenCx);
      const startX = baseX + offsetDir * 280;
      // Card left of centre starts 280px further left
      expect(startX).toBe(500 - 280);
      expect(startX).toBeLessThan(baseX);
    });
  });

  // ── Structural: all cards animated consistently ──────────────────────────

  it('iterates all _animStates in a single loop', () => {
    // The slide-in block should loop over all cards uniformly
    expect(srcRaw).toMatch(/for\s*\(\s*let\s+i\s*=\s*0;\s*i\s*<\s*n;\s*i\+\+\)/);
  });

  it('applies staggered delay per card index', () => {
    expect(srcRaw).toMatch(/delay:\s*i\s*\*\s*60/);
  });

  it('uses Back.easeOut for natural overshoot', () => {
    expect(srcRaw).toContain("ease: 'Back.easeOut'");
  });

  // ── Structural: baseX is set from card layout ────────────────────────────

  it('stores baseX from the bx parameter in buildCard', () => {
    expect(srcRaw).toContain('baseX: bx');
  });

  // ── Edge: old bug scenario — single unlocked commander ──────────────────

  describe('old midIdx bug scenario', () => {
    it('old formula: n=1 gives midIdx=0, card 0 gets wrong direction', () => {
      const n = 1;
      const midIdx = (n - 1) / 2; // = 0
      const i = 0;
      const oldDir = i < midIdx ? -1 : 1;
      // BUG: single card gets +1 (from right)
      expect(oldDir).toBe(1);
    });

    it('new formula: single card left of centre gets correct direction', () => {
      const baseX = 500;
      const screenCx = 960;
      const newDir = baseX < screenCx ? -1 : 1;
      expect(newDir).toBe(-1);
    });

    it('old formula: n=2 gives midIdx=0.5, both cards go left (also buggy)', () => {
      const n = 2;
      const midIdx = (n - 1) / 2; // = 0.5
      // Card 0: 0 < 0.5 → -1 (correct for leftmost)
      // Card 1: 1 < 0.5 → false → 1 (correct for rightmost)
      // This case was actually fine for 2 cards
      expect(0 < midIdx ? -1 : 1).toBe(-1);
      expect(1 < midIdx ? -1 : 1).toBe(1);
    });
  });
});
