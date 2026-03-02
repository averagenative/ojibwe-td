/**
 * Structural tests for TASK-081: Boss Loot Timing & Post-Wave UI Sequencing.
 *
 * GameScene and BossOfferPanel depend on Phaser and cannot be instantiated in
 * vitest's jsdom environment.  These tests use ?raw source imports to assert
 * that the critical structural patterns are present in the implementation.
 *
 * Acceptance criteria verified:
 *   1. boss-killed handler does NOT call openBossOfferPanel() directly
 *      (defers until wave is fully cleared)
 *   2. boss-killed handler stores _pendingBossName and _pendingBossRewardOffer
 *   3. GameScene declares the PostWaveUIQueue field
 *   4. onWaveComplete enqueues boss loot, elder dialog, and upgrade offers
 *   5. onWaveComplete flushes the queue (not direct scene.launch)
 *   6. between-wave-offer-picked advances the queue via _betweenWaveDismiss
 *   7. triggerGameOver clears the queue and pending boss state on game-over
 *   8. shutdown clears the queue on scene shutdown
 *   9. BossOfferPanel accepts an onClosed callback in its constructor
 *  10. openBossOfferPanel passes onClosed to BossOfferPanel
 *  11. Victory path shows boss loot from the final boss wave before victory screen
 *  12. onWaveComplete always clears pending boss fields after checking
 */

import { describe, it, expect } from 'vitest';

import gameSceneSrc    from '../../scenes/GameScene.ts?raw';
import bossOfferSrc    from '../../ui/BossOfferPanel.ts?raw';

// ── 1. PostWaveUIQueue field declarations ────────────────────────────────────

describe('GameScene — PostWaveUIQueue fields', () => {
  it('declares _postWaveQueue field using PostWaveUIQueue', () => {
    expect(gameSceneSrc).toContain('_postWaveQueue');
    expect(gameSceneSrc).toContain('PostWaveUIQueue');
  });

  it('declares _pendingBossName field', () => {
    expect(gameSceneSrc).toContain('_pendingBossName');
  });

  it('declares _pendingBossRewardOffer field', () => {
    expect(gameSceneSrc).toContain('_pendingBossRewardOffer');
  });

  it('declares _betweenWaveDismiss field', () => {
    expect(gameSceneSrc).toContain('_betweenWaveDismiss');
  });
});

// ── 2. boss-killed handler: defer, do NOT show immediately ───────────────────

describe('GameScene — boss-killed handler (deferred boss loot)', () => {
  it('stores _pendingBossName from boss-killed event', () => {
    expect(gameSceneSrc).toContain('this._pendingBossName');
  });

  it('stores _pendingBossRewardOffer from boss-killed event', () => {
    expect(gameSceneSrc).toContain('this._pendingBossRewardOffer');
  });

  it('boss-killed handler no longer calls openBossOfferPanel() directly', () => {
    // The boss-killed listener should NOT contain a direct call to openBossOfferPanel.
    // Extract the boss-killed listener block to verify.
    const bossKilledIdx = gameSceneSrc.indexOf("'boss-killed'");
    expect(bossKilledIdx).toBeGreaterThan(-1);

    // Find the next occurrence of 'boss-killed' string and the block following it
    // (delimited by the next top-level event registration 'creep-died-poisoned').
    const afterBossKilled = gameSceneSrc.slice(bossKilledIdx);
    const creepDiedIdx    = afterBossKilled.indexOf("'creep-died-poisoned'");
    const bossKilledBlock = creepDiedIdx > -1
      ? afterBossKilled.slice(0, creepDiedIdx)
      : afterBossKilled.slice(0, 800); // safety: first ~800 chars

    // openBossOfferPanel should NOT appear in this block.
    expect(bossKilledBlock).not.toContain('openBossOfferPanel');
  });
});

// ── 3. onWaveComplete: queue-based sequencing ────────────────────────────────

describe('GameScene — onWaveComplete builds and flushes the post-wave queue', () => {
  it('calls _postWaveQueue.clear() to reset before building queue', () => {
    expect(gameSceneSrc).toContain('this._postWaveQueue.clear()');
  });

  it('enqueues boss loot (calls openBossOfferPanel from a queue entry)', () => {
    expect(gameSceneSrc).toContain('this.openBossOfferPanel(name, onDismiss)');
  });

  it('calls _buildBetweenWaveVignetteEntry() for the elder dialog entry', () => {
    expect(gameSceneSrc).toContain('_buildBetweenWaveVignetteEntry()');
  });

  it('enqueues BetweenWaveScene via _postWaveQueue.enqueue', () => {
    expect(gameSceneSrc).toContain("this._postWaveQueue.enqueue");
    expect(gameSceneSrc).toContain("'BetweenWaveScene'");
  });

  it('stores _betweenWaveDismiss when the BetweenWaveScene entry runs', () => {
    expect(gameSceneSrc).toContain('this._betweenWaveDismiss = onDismiss');
  });

  it('calls _postWaveQueue.flush() to start the sequence', () => {
    expect(gameSceneSrc).toContain('this._postWaveQueue.flush()');
  });
});

// ── 4. between-wave-offer-picked: advances queue ─────────────────────────────

describe('GameScene — between-wave-offer-picked advances queue', () => {
  it('retrieves and calls _betweenWaveDismiss to advance the queue', () => {
    expect(gameSceneSrc).toContain('this._betweenWaveDismiss');
    expect(gameSceneSrc).toContain('dismiss?.()');
  });
});

// ── 5. Cleanup paths ─────────────────────────────────────────────────────────

describe('GameScene — queue cleanup on game-over and shutdown', () => {
  it('triggerGameOver clears _postWaveQueue', () => {
    const idx   = gameSceneSrc.indexOf('private triggerGameOver()');
    const block = gameSceneSrc.slice(idx, idx + 500);
    expect(block).toContain('_postWaveQueue.clear()');
  });

  it('triggerGameOver clears _betweenWaveDismiss', () => {
    const idx   = gameSceneSrc.indexOf('private triggerGameOver()');
    const block = gameSceneSrc.slice(idx, idx + 500);
    expect(block).toContain('_betweenWaveDismiss');
    expect(block).toContain('= null');
  });

  it('triggerGameOver clears _pendingBossName', () => {
    const idx   = gameSceneSrc.indexOf('private triggerGameOver()');
    const block = gameSceneSrc.slice(idx, idx + 500);
    expect(block).toContain('this._pendingBossName');
    expect(block).toContain('= null');
  });

  it('triggerGameOver clears _pendingBossRewardOffer', () => {
    const idx   = gameSceneSrc.indexOf('private triggerGameOver()');
    const block = gameSceneSrc.slice(idx, idx + 500);
    expect(block).toContain('this._pendingBossRewardOffer');
    expect(block).toContain('= false');
  });

  it('shutdown clears _postWaveQueue', () => {
    const idx   = gameSceneSrc.indexOf('shutdown(): void');
    const block = gameSceneSrc.slice(idx, idx + 2000);
    expect(block).toContain('_postWaveQueue.clear()');
  });
});

// ── 6. _buildBetweenWaveVignetteEntry method ─────────────────────────────────

describe('GameScene — _buildBetweenWaveVignetteEntry', () => {
  it('method is declared', () => {
    expect(gameSceneSrc).toContain('private _buildBetweenWaveVignetteEntry()');
  });

  it('checks BOSS_KILLED vignette using pendingBossKillKey', () => {
    const idx   = gameSceneSrc.indexOf('private _buildBetweenWaveVignetteEntry()');
    const block = gameSceneSrc.slice(idx, idx + 800);
    expect(block).toContain('TriggerType.BOSS_KILLED');
    expect(block).toContain('pendingBossKillKey');
  });

  it('checks WAVE_COMPLETE and WAVE_START vignettes', () => {
    const idx   = gameSceneSrc.indexOf('private _buildBetweenWaveVignetteEntry()');
    const block = gameSceneSrc.slice(idx, idx + 800);
    expect(block).toContain('TriggerType.WAVE_COMPLETE');
    expect(block).toContain('TriggerType.WAVE_START');
  });
});

// ── 7. Victory path — boss loot on the final boss wave ─────────────────────

describe('GameScene — victory path handles final boss wave loot', () => {
  it('victory path shows boss offer panel with proceedToVictory callback', () => {
    // The key pattern: boss offer panel uses proceedToVictory as the onClosed callback
    expect(gameSceneSrc).toContain('openBossOfferPanel(name, proceedToVictory)');
  });

  it('victory path defines proceedToVictory that transitions to GameOverScene', () => {
    expect(gameSceneSrc).toContain('const proceedToVictory');
    // proceedToVictory checks for stage complete vignette then starts GameOverScene
    const idx = gameSceneSrc.indexOf('const proceedToVictory');
    const block = gameSceneSrc.slice(idx, idx + 1800);
    expect(block).toContain('STAGE_COMPLETE');
    expect(block).toContain("'GameOverScene'");
  });

  it('victory path checks _pendingBossRewardOffer before transitioning', () => {
    // The boss loot check is in the onWaveComplete victory path
    const idx = gameSceneSrc.indexOf('openBossOfferPanel(name, proceedToVictory)');
    expect(idx).toBeGreaterThan(-1);
    // Within 500 chars before this call, we should see the guard check
    const block = gameSceneSrc.slice(Math.max(0, idx - 400), idx + 100);
    expect(block).toContain('_pendingBossRewardOffer');
    expect(block).toContain('_pendingBossName');
  });
});

// ── 8. onWaveComplete always clears pending boss fields ──────────────────────

describe('GameScene — onWaveComplete clears pending boss fields unconditionally', () => {
  it('clears _pendingBossName outside the boss-loot if-block', () => {
    // Find the unconditional cleanup comment
    const cleanupIdx = gameSceneSrc.indexOf('Always consume the pending boss state');
    expect(cleanupIdx).toBeGreaterThan(-1);
    const block = gameSceneSrc.slice(cleanupIdx, cleanupIdx + 200);
    expect(block).toContain('this._pendingBossName        = null');
    expect(block).toContain('this._pendingBossRewardOffer = false');
  });
});

// ── 9. BossOfferPanel — onClosed callback ────────────────────────────────────

describe('BossOfferPanel — onClosed callback', () => {
  it('constructor accepts an optional onClosed parameter', () => {
    expect(bossOfferSrc).toContain('onClosed?:');
  });

  it('button pointerup handler calls onClosed after close()', () => {
    // Find the button's pointerup handler — it should call close() then onClosed?.()
    expect(bossOfferSrc).toContain('this.close()');
    expect(bossOfferSrc).toContain('onClosed?.()');
  });

  it('onClosed is called AFTER close() (not before)', () => {
    const closeIdx   = bossOfferSrc.lastIndexOf('this.close()');
    const onClosedIdx = bossOfferSrc.lastIndexOf('onClosed?.()');
    expect(closeIdx).toBeLessThan(onClosedIdx);
  });
});
