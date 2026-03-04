/**
 * TASK-149 — Debuff Visual Effects Should Cover Creep Sprite Only, Not Full Box
 *
 * Structural tests verifying that:
 *  1. refreshStatusVisual() applies tint for ALL five debuff types on bodyImage
 *  2. _syncOverlay() returns early when bodyImage exists (no rectangle overlays)
 *  3. _syncOverlay() hides any pre-existing overlay when bodyImage exists
 *  4. _syncParticles() does NOT have a bodyImage early-return (particles still emit)
 *  5. Tint priority chain is correct (slowed+poisoned > slowed > poisoned > burning > shocked > shredded)
 *  6. Clear/restore tint when no effects active
 *  7. EFFECT_CONFIGS.tesla and EFFECT_CONFIGS.armorShred are referenced for bodyImage tint
 */

import { describe, it, expect } from 'vitest';
import creepSrc from '../../entities/Creep.ts?raw';

// ── Source extraction helpers ─────────────────────────────────────────────────

function sliceBetween(src: string, startMarker: string, endMarker: string): string {
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error(`Marker not found: ${startMarker}`);
  const end = src.indexOf(endMarker, start + startMarker.length);
  return end === -1 ? src.slice(start) : src.slice(start, end);
}

function extractRefreshStatusVisual(src: string): string {
  return sliceBetween(src, 'private refreshStatusVisual()', '// ── Status effect visual helpers');
}

function extractSyncOverlay(src: string): string {
  return sliceBetween(src, 'private _syncOverlay(', 'private _syncParticles(');
}

function extractSyncParticles(src: string): string {
  return sliceBetween(src, 'private _syncParticles(', 'private _syncFrostRing(');
}

// ── 1. bodyImage tint for all debuff types ────────────────────────────────────

describe('refreshStatusVisual — bodyImage tint covers all debuff types', () => {
  const fn = extractRefreshStatusVisual(creepSrc);

  it('applies tint for slowed+poisoned combo', () => {
    expect(fn).toContain('slowed && poisoned');
    expect(fn).toContain('setTint(0x44aaaa)');
  });

  it('applies tint for slowed (frost)', () => {
    expect(fn).toContain('} else if (slowed)');
    expect(fn).toContain('0x4488ff');
  });

  it('applies tint for poisoned', () => {
    expect(fn).toContain('} else if (poisoned)');
    expect(fn).toContain('setTint(0x44ff66)');
  });

  it('applies tint for burning', () => {
    expect(fn).toContain('} else if (burning)');
    expect(fn).toContain('setTint(0xff8833)');
  });

  it('applies tint for shocked (tesla)', () => {
    expect(fn).toContain('} else if (shocked)');
    expect(fn).toContain('EFFECT_CONFIGS.tesla.tintColor');
  });

  it('applies tint for shredded (armor shred)', () => {
    expect(fn).toContain('} else if (shredded)');
    expect(fn).toContain('EFFECT_CONFIGS.armorShred.tintColor');
  });

  it('clears tint when no effects are active', () => {
    expect(fn).toContain('clearTint()');
  });

  it('restores baseSpriteTint when no effects but base tint exists', () => {
    expect(fn).toContain('this.baseSpriteTint');
  });
});

// ── 2. Tint priority order ────────────────────────────────────────────────────

describe('refreshStatusVisual — tint priority chain', () => {
  const fn = extractRefreshStatusVisual(creepSrc);

  it('slowed+poisoned combo appears before individual slowed branch', () => {
    const comboIdx = fn.indexOf('slowed && poisoned');
    const slowIdx  = fn.indexOf('} else if (slowed)', comboIdx + 1);
    expect(comboIdx).toBeGreaterThan(-1);
    expect(slowIdx).toBeGreaterThan(comboIdx);
  });

  it('shocked appears after burning in priority chain', () => {
    const burnIdx    = fn.indexOf('else if (burning)');
    const shockedIdx = fn.indexOf('else if (shocked)');
    expect(burnIdx).toBeGreaterThan(-1);
    expect(shockedIdx).toBeGreaterThan(burnIdx);
  });

  it('shredded appears after shocked in priority chain', () => {
    const shockedIdx  = fn.indexOf('else if (shocked)');
    const shreddedIdx = fn.indexOf('else if (shredded)');
    expect(shockedIdx).toBeGreaterThan(-1);
    expect(shreddedIdx).toBeGreaterThan(shockedIdx);
  });
});

// ── 3. _syncOverlay — early return for sprite-path creeps ─────────────────────

describe('_syncOverlay — skips rectangle overlays for bodyImage creeps', () => {
  const fn = extractSyncOverlay(creepSrc);

  it('checks this.bodyImage before creating overlays', () => {
    expect(fn).toContain('if (this.bodyImage)');
  });

  it('returns early when bodyImage exists', () => {
    // The bodyImage guard block ends with "return;"
    const bodyImageIdx = fn.indexOf('if (this.bodyImage)');
    const returnIdx    = fn.indexOf('return;', bodyImageIdx);
    // The return must come before the overlay creation logic
    const overlayCreateIdx = fn.indexOf('new Phaser.GameObjects.Rectangle');
    expect(returnIdx).toBeGreaterThan(bodyImageIdx);
    expect(returnIdx).toBeLessThan(overlayCreateIdx);
  });

  it('hides any pre-existing overlay before returning', () => {
    const bodyImageIdx = fn.indexOf('if (this.bodyImage)');
    const returnIdx    = fn.indexOf('return;', bodyImageIdx);
    const hiddenBlock  = fn.slice(bodyImageIdx, returnIdx);
    expect(hiddenBlock).toContain('_effectOverlays.get(key)');
    expect(hiddenBlock).toContain('setVisible(false)');
  });

  it('still creates overlays for non-sprite creeps (Rectangle path exists)', () => {
    expect(fn).toContain('new Phaser.GameObjects.Rectangle');
  });
});

// ── 4. _syncParticles — no bodyImage early return ─────────────────────────────

describe('_syncParticles — particles still emit for sprite-path creeps', () => {
  const fn = extractSyncParticles(creepSrc);

  it('does NOT have a bodyImage early-return guard', () => {
    expect(fn).not.toContain('if (this.bodyImage)');
  });
});

// ── 5. refreshStatusVisual calls _syncOverlay for all effect types ────────────

describe('refreshStatusVisual — _syncOverlay called for all effects', () => {
  const fn = extractRefreshStatusVisual(creepSrc);

  for (const key of ['poison', 'frost', 'burn', 'tesla', 'armorShred'] as const) {
    it(`calls _syncOverlay for '${key}'`, () => {
      expect(fn).toContain(`'${key}'`);
    });
  }
});

// ── 6. Comment documents sprite-bounded approach ──────────────────────────────

describe('_syncOverlay — documents sprite-bounded rationale', () => {
  const fn = extractSyncOverlay(creepSrc);

  it('explains that tint is bounded to opaque pixels', () => {
    expect(fn).toContain('only opaque pixels are affected');
  });

  it('explains why rectangle overlays are skipped', () => {
    expect(fn).toContain('Rectangle overlays would bleed');
  });
});

// ── 7. Boolean flags for shocked and shredded exist ───────────────────────────

describe('refreshStatusVisual — debuff boolean flags', () => {
  const fn = extractRefreshStatusVisual(creepSrc);

  it('derives shocked from _teslaShockedMs > 0', () => {
    expect(fn).toContain('this._teslaShockedMs > 0');
  });

  it('derives shredded from damageAmpPct > 0', () => {
    expect(fn).toContain('this.damageAmpPct > 0');
  });
});
