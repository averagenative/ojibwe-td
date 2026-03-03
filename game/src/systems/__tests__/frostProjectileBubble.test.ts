/**
 * TASK-116 — Frost Tower Projectile Bug: Stray Bubble Flies Across Screen
 *
 * Structural ?raw tests verifying:
 * - Frost impact Graphics objects are positioned at the impact point (cx, cy)
 * - Shapes are drawn at local (0, 0) so scale tweens expand from impact, not from world origin
 * - Both ring and sparkle cross are destroyed after their tweens (no memory leak)
 * - Alpha tweens ensure particles fade out near impact, not fly across screen
 * - impactFrostBurst is only dispatched for towerKey 'frost'
 */
import { describe, it, expect } from 'vitest';

import projectileSrc from '../../entities/Projectile.ts?raw';

// ── Helper: extract impactFrostBurst method body ─────────────────────────────

function getFrostBurstBody(): string {
  const start = projectileSrc.indexOf('private impactFrostBurst(');
  expect(start).toBeGreaterThan(-1);

  // Find the method body by tracking brace depth
  let braceDepth = 0;
  let bodyStart = -1;
  for (let i = start; i < projectileSrc.length; i++) {
    if (projectileSrc[i] === '{') {
      if (bodyStart === -1) bodyStart = i;
      braceDepth++;
    } else if (projectileSrc[i] === '}') {
      braceDepth--;
      if (braceDepth === 0) {
        return projectileSrc.slice(bodyStart, i + 1);
      }
    }
  }
  throw new Error('Could not find impactFrostBurst method body');
}

// ── Ring: positioned at impact point ─────────────────────────────────────────

describe('Frost impact ring — positioned at impact point', () => {
  it('creates Graphics with { x: cx, y: cy } constructor options', () => {
    const body = getFrostBurstBody();
    // The Graphics must be positioned at the impact coordinates
    expect(body).toContain('this.scene.add.graphics({ x: cx, y: cy })');
  });

  it('draws strokeCircle at local origin (0, 0), not at world coords', () => {
    const body = getFrostBurstBody();
    expect(body).toContain('strokeCircle(0, 0, 5)');
    // Must NOT contain the old buggy pattern
    expect(body).not.toContain('strokeCircle(cx, cy');
  });

  it('applies a scale tween (expanding burst)', () => {
    const body = getFrostBurstBody();
    expect(body).toContain('scaleX');
    expect(body).toContain('scaleY');
  });

  it('applies an alpha tween to fade out', () => {
    const body = getFrostBurstBody();
    // The ring tween must fade alpha to 0
    expect(body).toMatch(/alpha:\s*0/);
  });

  it('destroys the ring in onComplete', () => {
    const body = getFrostBurstBody();
    expect(body).toContain('ring.destroy()');
  });
});

// ── Sparkle cross: positioned at impact point ────────────────────────────────

describe('Frost impact sparkle cross — positioned at impact point', () => {
  it('creates spark Graphics with { x: cx, y: cy } constructor options', () => {
    const body = getFrostBurstBody();
    // Both ring and spark must be positioned; there should be two occurrences
    const matches = body.match(/this\.scene\.add\.graphics\(\{ x: cx, y: cy \}\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(2);
  });

  it('draws sparkle lines at local coords, not world coords', () => {
    const body = getFrostBurstBody();
    // Horizontal line: moveTo(-5, 0) lineTo(5, 0)
    expect(body).toContain('moveTo(-5, 0)');
    expect(body).toContain('lineTo(5, 0)');
    // Vertical line: moveTo(0, -5) lineTo(0, 5)
    expect(body).toContain('moveTo(0, -5)');
    expect(body).toContain('lineTo(0, 5)');
  });

  it('does NOT use world coordinates for sparkle lines', () => {
    const body = getFrostBurstBody();
    // The old buggy pattern used (cx - 5, cy), (cx + 5, cy), etc.
    expect(body).not.toContain('cx - 5');
    expect(body).not.toContain('cx + 5');
    expect(body).not.toContain('cy - 5');
    expect(body).not.toContain('cy + 5');
  });

  it('fades sparkle alpha to 0', () => {
    const body = getFrostBurstBody();
    // The spark tween is the second tween block; both must have alpha: 0
    const alphaMatches = body.match(/alpha:\s*0/g);
    expect(alphaMatches).not.toBeNull();
    expect(alphaMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it('destroys the spark in onComplete', () => {
    const body = getFrostBurstBody();
    expect(body).toContain('spark.destroy()');
  });
});

// ── Dispatch: only fires for towerKey 'frost' ────────────────────────────────

describe('Frost burst dispatch', () => {
  it('showImpactEffect dispatches to impactFrostBurst for frost key', () => {
    // Verify the switch case wiring in showImpactEffect
    expect(projectileSrc).toContain("case 'frost':");
    expect(projectileSrc).toContain('this.impactFrostBurst(cx, cy)');
  });

  it('impactFrostBurst accepts (cx, cy) parameters', () => {
    expect(projectileSrc).toContain('private impactFrostBurst(cx: number, cy: number)');
  });
});

// ── Depth: both effects at depth 25 ──────────────────────────────────────────

describe('Frost impact depth', () => {
  it('ring and spark are set to depth 25', () => {
    const body = getFrostBurstBody();
    const depthMatches = body.match(/setDepth\(25\)/g);
    expect(depthMatches).not.toBeNull();
    expect(depthMatches!.length).toBe(2);
  });
});

// ── Particle containment: no world-coord scale drift ─────────────────────────

describe('Frost particles stay near impact (no scale drift)', () => {
  it('ring scale origin matches ring position (both at impact point)', () => {
    // The fix ensures that the Graphics object is at (cx, cy) and the shape
    // is drawn at (0, 0). When the scale tween runs, it scales around the
    // Graphics origin (cx, cy) — so the ring expands in place.
    const body = getFrostBurstBody();

    // Ring creation: positioned at impact
    expect(body).toContain('this.scene.add.graphics({ x: cx, y: cy })');
    // Ring shape: centered at local origin
    expect(body).toContain('strokeCircle(0, 0, 5)');
    // Scale tween targets the ring
    expect(body).toContain('targets:    ring');
  });

  it('sparkle cross has no scale tween (only alpha fade)', () => {
    const body = getFrostBurstBody();
    // The spark tween should only change alpha, not scale.
    // Find the spark tween block (after spark is created)
    const sparkIdx = body.indexOf('const spark');
    const sparkSection = body.slice(sparkIdx);

    // The spark tween should have alpha: 0 but no scaleX/scaleY
    const sparkTweenStart = sparkSection.indexOf('this.scene.tweens.add');
    const sparkTweenEnd = sparkSection.indexOf('});', sparkTweenStart);
    const sparkTween = sparkSection.slice(sparkTweenStart, sparkTweenEnd + 3);

    expect(sparkTween).toContain('alpha');
    expect(sparkTween).not.toContain('scaleX');
    expect(sparkTween).not.toContain('scaleY');
  });

  it('ring max visual radius is bounded (5px base × 3.5 scale = 17.5px)', () => {
    const body = getFrostBurstBody();
    // strokeCircle radius is 5, scale goes to 3.5 → max visual radius 17.5px
    // This is well within the 30-50px max travel requirement
    expect(body).toContain('strokeCircle(0, 0, 5)');
    expect(body).toMatch(/scaleX:\s*3\.5/);
    expect(body).toMatch(/scaleY:\s*3\.5/);
    const maxRadius = 5 * 3.5;
    expect(maxRadius).toBeLessThanOrEqual(50);
  });
});
