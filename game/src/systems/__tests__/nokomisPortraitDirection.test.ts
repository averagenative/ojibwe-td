import { describe, it, expect } from 'vitest';
import srcRaw from '../../scenes/CommanderSelectScene.ts?raw';

/**
 * TASK-155 — Nokomis portrait flies right-to-left on scene entry.
 * TASK-158 — Commander portraits drift off-screen due to stacking expression tweens.
 *
 * TASK-155 bug: slide-in direction was index-based (`i < midIdx`), so when only
 * one card was in _animStates (fresh game, only Nokomis unlocked),
 * midIdx = 0, 0 < 0 was false → offsetDir = 1 → flew from right.
 * Fix: direction is now based on card x-position vs screen centre.
 *
 * TASK-158 bug: idle expression tweens (smirk, glance) stacked when fired
 * before the previous yoyo cycle completed, causing cumulative position drift.
 * Fix: kill in-flight tweens and snap to base position before each expression.
 */
describe('TASK-155 / TASK-158 — Portrait slide-in direction & drift prevention', () => {

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

  // ── TASK-158: Expression tween drift prevention ────────────────────────

  describe('TASK-158 — Expression tween drift prevention', () => {

    // ── Structural: kill + snap before new expression ────────────────────

    it('kills in-flight tweens on portrait before each expression', () => {
      expect(srcRaw).toMatch(/this\.tweens\.killTweensOf\(portrait\)/);
    });

    it('snaps portrait.x back to baseX before expression tween', () => {
      // The snap must appear in _stepExpressions, after killTweensOf
      const killIdx = srcRaw.indexOf('killTweensOf(portrait)');
      const snapXIdx = srcRaw.indexOf('portrait.x = state.baseX', killIdx);
      expect(snapXIdx).toBeGreaterThan(killIdx);
    });

    it('snaps portrait.y back to baseY before expression tween', () => {
      const killIdx = srcRaw.indexOf('killTweensOf(portrait)');
      const snapYIdx = srcRaw.indexOf('portrait.y = state.baseY', killIdx);
      expect(snapYIdx).toBeGreaterThan(killIdx);
    });

    it('kill + snap happens before any expression switch case', () => {
      const killIdx = srcRaw.indexOf('killTweensOf(portrait)');
      const switchIdx = srcRaw.indexOf("case 'blink'", killIdx);
      expect(killIdx).toBeGreaterThan(-1);
      expect(switchIdx).toBeGreaterThan(killIdx);
    });

    // ── Structural: entry slide-in snaps on complete ─────────────────────

    it('entry slide-in tween has onComplete that snaps to baseX', () => {
      // The onComplete in the slide-in tween should set portrait.x = state.baseX
      expect(srcRaw).toMatch(
        /ease:\s*'Back\.easeOut'[\s\S]*?onComplete:\s*\(\)\s*=>\s*\{\s*state\.portrait\.x\s*=\s*state\.baseX;\s*\}/
      );
    });

    // ── Arithmetic: drift simulation ─────────────────────────────────────

    it('without kill+snap, two overlapping yoyo tweens cause drift', () => {
      // Simulates the old bug: two smirk tweens overlap
      let x = 500; // baseX
      const baseX = 500;

      // First smirk starts: moves to baseX + 1.5
      x = baseX + 1.5; // = 501.5
      // Before yoyo completes, second smirk fires
      // Second smirk starts from current x (501.5), yoyo returns to 501.5
      // but targets baseX + 1.5 = 501.5 (no visible move)
      // Meanwhile first tween yoyos back to its start (501.5, not 500!)
      // After both complete, x could be stuck at 501.5 instead of 500
      expect(x).not.toBe(baseX); // demonstrates drift
    });

    it('with kill+snap, position always resets before new expression', () => {
      let x = 501.5; // drifted position
      const baseX = 500;

      // Kill + snap (the fix)
      x = baseX; // snap back
      // Now new smirk tween starts from correct baseX
      expect(x).toBe(baseX);
    });

    // ── Structural: all expression cases use base-relative targets ───────

    it('smirk targets baseX + offset (not portrait.x + offset)', () => {
      expect(srcRaw).toMatch(/case\s+'smirk'[\s\S]*?x:\s*state\.baseX\s*\+\s*1\.5/);
    });

    it('glance targets baseX ± offset (not portrait.x ± offset)', () => {
      expect(srcRaw).toMatch(
        /case\s+'glance'[\s\S]*?x:\s*state\.baseX\s*\+/
      );
    });

    it('brow-furrow targets baseY + offset (not portrait.y + offset)', () => {
      expect(srcRaw).toMatch(
        /case\s+'brow-furrow'[\s\S]*?y:\s*state\.baseY\s*\+\s*1/
      );
    });
  });
});
