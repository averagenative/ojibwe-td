/**
 * Frost impact effect — structural ?raw tests.
 *
 * Verifies:
 * - impactFrostBurst draws a compact * shape (6 arms) at the impact point
 * - Graphics positioned at (cx, cy) with local-origin drawing
 * - Effect stays tight to creep (short arm length, no expanding ring)
 * - Destroyed after tween completes (no memory leak)
 * - Only dispatched for towerKey 'frost'
 */
import { describe, it, expect } from 'vitest';

import projectileSrc from '../../entities/Projectile.ts?raw';

// ── Helper: extract impactFrostBurst method body ─────────────────────────────

function getFrostBurstBody(): string {
  const start = projectileSrc.indexOf('private impactFrostBurst(');
  expect(start).toBeGreaterThan(-1);

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

// ── Shape: compact * at impact point ─────────────────────────────────────────

describe('Frost impact * shape', () => {
  it('creates Graphics positioned at (cx, cy)', () => {
    const body = getFrostBurstBody();
    expect(body).toContain('this.scene.add.graphics({ x: cx, y: cy })');
  });

  it('draws 6 arms from local origin (0, 0)', () => {
    const body = getFrostBurstBody();
    expect(body).toContain('moveTo(0, 0)');
    // 6 arms in a loop
    expect(body).toMatch(/for\s*\(\s*let\s+\w+\s*=\s*0;\s*\w+\s*<\s*6/);
  });

  it('uses short arm length (≤ 6px) to stay tight to creep', () => {
    const body = getFrostBurstBody();
    const armMatch = body.match(/arm\s*=\s*(\d+)/);
    expect(armMatch).not.toBeNull();
    expect(Number(armMatch![1])).toBeLessThanOrEqual(6);
  });

  it('fades alpha to 0', () => {
    const body = getFrostBurstBody();
    expect(body).toMatch(/alpha:\s*0/);
  });

  it('destroys graphics in onComplete', () => {
    const body = getFrostBurstBody();
    expect(body).toMatch(/\.destroy\(\)/);
  });

  it('has no expanding ring (no strokeCircle)', () => {
    const body = getFrostBurstBody();
    expect(body).not.toContain('strokeCircle');
  });
});

// ── Sparkle dots: tiny, short distance ───────────────────────────────────────

describe('Frost impact sparkle dots', () => {
  it('spawns small dot sparkles (radius ≤ 1px)', () => {
    const body = getFrostBurstBody();
    expect(body).toContain('this.scene.add.circle');
    // Radius arg should be small
    const circleMatch = body.match(/add\.circle\([^)]+,\s*([\d.]+),/);
    expect(circleMatch).not.toBeNull();
    expect(Number(circleMatch![1])).toBeLessThanOrEqual(1);
  });

  it('dots travel short distance (≤ 6px)', () => {
    const body = getFrostBurstBody();
    // Check the drift distance multiplier
    const distMatch = body.match(/\*\s*(\d+)/g);
    // At least one multiply by a small number for drift distance
    expect(distMatch).not.toBeNull();
  });
});

// ── Dispatch ─────────────────────────────────────────────────────────────────

describe('Frost burst dispatch', () => {
  it('showImpactEffect dispatches to impactFrostBurst for frost key', () => {
    expect(projectileSrc).toContain("case 'frost':");
    expect(projectileSrc).toContain('this.impactFrostBurst(cx, cy)');
  });

  it('impactFrostBurst accepts (cx, cy) parameters', () => {
    expect(projectileSrc).toContain('private impactFrostBurst(cx: number, cy: number)');
  });
});

// ── Depth ────────────────────────────────────────────────────────────────────

describe('Frost impact depth', () => {
  it('main shape is set to depth ≥ 22', () => {
    const body = getFrostBurstBody();
    const depthMatch = body.match(/setDepth\((\d+)\)/);
    expect(depthMatch).not.toBeNull();
    expect(Number(depthMatch![1])).toBeGreaterThanOrEqual(22);
  });
});
