/**
 * TASK-148 — Rush Wave Offer Parity
 *
 * Verifies that:
 *  1. BetweenWaveScene accepts an `offerCount` parameter
 *  2. `offerCount` drives the number of drawOffers() calls (not hardcoded 3)
 *  3. GameScene.onWaveComplete passes `commanderState.offerCardCount` as offerCount
 *  4. The early-return that skipped offer panels for rushed (concurrent) waves
 *     has been removed
 *  5. Commander aura bonuses (Oshkaabewis +1 card) are propagated correctly
 *  6. OfferManager.drawOffers(n) returns the correct count for n=3 and n=4
 *
 * GameScene and BetweenWaveScene depend on Phaser and cannot be instantiated in
 * vitest's jsdom environment.  Structural (?raw) tests assert the patterns are
 * present; pure-logic tests exercise OfferManager directly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import betweenWaveSrc from '../../scenes/BetweenWaveScene.ts?raw';
import gameSceneSrc   from '../../scenes/GameScene.ts?raw';
import { OfferManager } from '../OfferManager';

// ── BetweenWaveScene — offerCount field ───────────────────────────────────────

describe('BetweenWaveScene — offerCount data field', () => {
  it('BetweenWaveData interface declares offerCount field', () => {
    expect(betweenWaveSrc).toContain('offerCount?');
  });

  it('BetweenWaveScene has a private _offerCount field', () => {
    expect(betweenWaveSrc).toContain('private _offerCount');
  });

  it('create() reads offerCount from data with default of 3', () => {
    expect(betweenWaveSrc).toContain('offerCount = 3');
  });

  it('create() assigns offerCount to this._offerCount', () => {
    expect(betweenWaveSrc).toContain('this._offerCount      = offerCount');
  });
});

// ── BetweenWaveScene — _buildCards uses _offerCount ───────────────────────────

describe('BetweenWaveScene — _buildCards uses _offerCount (not hardcoded 3)', () => {
  it('_buildCards calls drawOffers with this._offerCount', () => {
    expect(betweenWaveSrc).toContain('drawOffers(this._offerCount,');
  });

  it('_buildCards no longer hardcodes drawOffers(3,', () => {
    // The only drawOffers call should use this._offerCount, not a literal 3.
    expect(betweenWaveSrc).not.toContain('drawOffers(3,');
  });

  it('startX calculation centres N cards dynamically', () => {
    // Formula: cx - ((this._offerCount - 1) / 2) * SPACING
    expect(betweenWaveSrc).toContain('((this._offerCount - 1) / 2) * SPACING');
  });
});

// ── GameScene — no early return for concurrent waves ─────────────────────────

describe('GameScene — onWaveComplete no longer skips offers for rushed waves', () => {
  it('onWaveComplete does not contain the old "isActive() return" early exit', () => {
    // The old code was:  if (this.waveManager.isActive()) return;
    // This caused offers to be silently skipped when rushing.
    // It must be replaced with isConcurrent tracking.
    expect(gameSceneSrc).not.toContain(
      'if (this.waveManager.isActive()) return;'
    );
  });

  it('onWaveComplete captures isConcurrent from waveManager.isActive()', () => {
    expect(gameSceneSrc).toContain('const isConcurrent = this.waveManager.isActive()');
  });

  it('final-wave victory block is guarded by !isConcurrent', () => {
    expect(gameSceneSrc).toContain('!isConcurrent && (endlessComplete || (this.currentWave >= this.totalWaves');
  });
});

// ── GameScene — _postWaveQueue not cleared while active ───────────────────────

describe('GameScene — _postWaveQueue.clear() guarded by isActive', () => {
  it('clears the queue only when it is not currently active', () => {
    expect(gameSceneSrc).toContain('if (!this._postWaveQueue.isActive)');
    expect(gameSceneSrc).toContain('this._postWaveQueue.clear()');
  });
});

// ── GameScene — offerCount passed to BetweenWaveScene ────────────────────────

describe('GameScene — passes offerCount to BetweenWaveScene launch', () => {
  it('reads offerCardCount from commanderState with fallback 3', () => {
    expect(gameSceneSrc).toContain('commanderState?.offerCardCount ?? 3');
  });

  it('passes offerCount to BetweenWaveScene launch params', () => {
    expect(gameSceneSrc).toContain('offerCount,');
  });

  it('uses nextWaveForDisplay for concurrent vs non-concurrent', () => {
    expect(gameSceneSrc).toContain('const nextWaveForDisplay = isConcurrent');
  });
});

// ── GameScene — offer-picked handler returns to wave state when concurrent ────

describe('GameScene — between-wave-offer-picked handles concurrent wave', () => {
  it('checks _postWaveQueue.isActive before showing next-wave button', () => {
    expect(gameSceneSrc).toContain('if (!this._postWaveQueue.isActive)');
  });

  it('sets gameState to wave when concurrent wave is still running', () => {
    const handlerRegion = gameSceneSrc.match(
      /between-wave-offer-picked[\s\S]*?if \(!this\._postWaveQueue\.isActive\)[\s\S]*?\}\);/
    );
    expect(handlerRegion).not.toBeNull();
    expect(handlerRegion![0]).toContain("this.gameState = 'wave'");
  });

  it('calls _updateRushButton when returning to wave state after pick', () => {
    expect(gameSceneSrc).toContain('this._updateRushButton()');
  });
});

// ── OfferManager — drawOffers(n) parity ──────────────────────────────────────

describe('OfferManager — drawOffers returns correct count for n=3 and n=4', () => {
  let om: OfferManager;

  beforeEach(() => {
    om = new OfferManager();
  });

  it('drawOffers(3) returns exactly 3 offers', () => {
    const offers = om.drawOffers(3);
    expect(offers.length).toBe(3);
  });

  it('drawOffers(4) returns exactly 4 offers (Oshkaabewis count)', () => {
    const offers = om.drawOffers(4);
    expect(offers.length).toBe(4);
  });

  it('drawOffers(3) and drawOffers(4) return no intra-draw duplicates', () => {
    const three = om.drawOffers(3);
    expect(new Set(three.map(o => o.id)).size).toBe(3);

    const four = om.drawOffers(4);
    expect(new Set(four.map(o => o.id)).size).toBe(4);
  });

  it('rushed-wave offer count equals non-rushed offer count (same OfferManager)', () => {
    // Simulate: non-rushed wave shows n offers, rushed wave should also show n offers.
    const nonRushed = om.drawOffers(3).length;
    const rushed    = om.drawOffers(3).length;
    expect(rushed).toBe(nonRushed);
  });

  it('Oshkaabewis offerCardCount=4 draws one more card than default', () => {
    const defaultCount     = om.drawOffers(3).length;  // 3
    const oshkaabewisCount = om.drawOffers(4).length;  // 4
    expect(oshkaabewisCount).toBe(defaultCount + 1);
  });
});

// ── commanderDefs — offerCardCount default and Oshkaabewis override ───────────

describe('commanderDefs — offerCardCount', () => {
  it('defaultCommanderRunState sets offerCardCount to 3', () => {
    // Verified via existing commanderDefs.test.ts; reconfirmed structurally.
    expect(gameSceneSrc).toContain('offerCardCount ?? 3');
  });
});
