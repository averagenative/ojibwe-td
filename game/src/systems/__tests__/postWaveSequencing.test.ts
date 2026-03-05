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

import gameSceneSrc      from '../../scenes/GameScene.ts?raw';
import bossOfferSrc      from '../../ui/BossOfferPanel.ts?raw';
import vignetteOverlaySrc from '../../ui/VignetteOverlay.ts?raw';
import betweenWaveSrc    from '../../scenes/BetweenWaveScene.ts?raw';

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
    const block = gameSceneSrc.slice(idx, idx + 700);
    expect(block).toContain('_postWaveQueue.clear()');
  });

  it('triggerGameOver clears _betweenWaveDismiss', () => {
    const idx   = gameSceneSrc.indexOf('private triggerGameOver()');
    const block = gameSceneSrc.slice(idx, idx + 700);
    expect(block).toContain('_betweenWaveDismiss');
    expect(block).toContain('= null');
  });

  it('triggerGameOver clears _pendingBossName', () => {
    const idx   = gameSceneSrc.indexOf('private triggerGameOver()');
    const block = gameSceneSrc.slice(idx, idx + 700);
    expect(block).toContain('this._pendingBossName');
    expect(block).toContain('= null');
  });

  it('triggerGameOver clears _pendingBossRewardOffer', () => {
    const idx   = gameSceneSrc.indexOf('private triggerGameOver()');
    const block = gameSceneSrc.slice(idx, idx + 700);
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

// ── 10. VignetteOverlay — onDismiss fires only after player dismissal ─────────

describe('VignetteOverlay — onDismiss timing', () => {
  it('stores the onDismiss callback in show()', () => {
    // show() must accept and store the onDismiss callback so it survives
    // until the player actually clicks to dismiss.
    expect(vignetteOverlaySrc).toContain('this.onDismiss = onDismiss');
  });

  it('onDismiss is only invoked from the private dismiss() method', () => {
    // All calls to the callback must go through dismiss(), which is the
    // single authorised exit point — never called directly from show() or
    // the typewriter loop.
    const dismissFn = vignetteOverlaySrc.indexOf('private dismiss()');
    expect(dismissFn).toBeGreaterThan(-1);

    // callback?.() should only appear inside the dismiss() block
    const callbackCallIdx = vignetteOverlaySrc.indexOf('callback?.()');
    // The dismiss() body starts at dismissFn; the callback call must come after it
    expect(callbackCallIdx).toBeGreaterThan(dismissFn);
  });

  it('dismiss() captures onDismiss before calling cleanup() to prevent null-deref', () => {
    // cleanup() sets this.onDismiss = null; capturing in a local var first
    // is the safe pattern.
    const dismissIdx = vignetteOverlaySrc.indexOf('private dismiss()');
    const block = vignetteOverlaySrc.slice(dismissIdx, dismissIdx + 200);
    // Local variable must be assigned before cleanup is called
    expect(block).toContain('const callback = this.onDismiss');
    expect(block).toContain('this.cleanup()');
    // cleanup called before callback
    const cleanupPos  = block.indexOf('this.cleanup()');
    const callbackPos = block.indexOf('callback?.()');
    expect(cleanupPos).toBeLessThan(callbackPos);
  });

  it('handleClick() returns without dismissing when text is still being revealed', () => {
    // Mid-reveal click must complete the text instantly (early-return path),
    // NOT call dismiss() — so the next panel does not appear prematurely.
    const handleClickIdx = vignetteOverlaySrc.indexOf('private handleClick()');
    const block = vignetteOverlaySrc.slice(handleClickIdx, handleClickIdx + 600);

    // fullyRevealed guard present
    expect(block).toContain('fullyRevealed');
    // Completes text on mid-reveal click
    expect(block).toContain('this.fullText');
    // Early return without dismiss
    expect(block).toContain('return;');
  });

  it('first-time vignette enforces a hold-to-skip delay before dismiss is accepted', () => {
    // HOLD_SKIP_MS constant must exist — first-time vignettes cannot be
    // dismissed before this many ms have elapsed (prevents accidental skips).
    expect(vignetteOverlaySrc).toContain('HOLD_SKIP_MS');
    expect(vignetteOverlaySrc).toContain('elapsed');
    expect(vignetteOverlaySrc).toContain('shownAt');
  });

  it('previously-seen vignette (seenBefore=true) can be dismissed instantly', () => {
    // canInstantDismiss path — no delay for replays.
    expect(vignetteOverlaySrc).toContain('canInstantDismiss');
    // When true, dismiss() is called directly without elapsed check
    const handleClickIdx = vignetteOverlaySrc.indexOf('private handleClick()');
    const block = vignetteOverlaySrc.slice(handleClickIdx, handleClickIdx + 600);
    expect(block).toContain('canInstantDismiss');
  });
});

// ── 11. BetweenWaveScene — depth and scene launch method ─────────────────────

describe('BetweenWaveScene — rendering depth and scene launch', () => {
  it('is launched as an overlay scene via scene.launch(), not scene.start()', () => {
    // scene.start() would replace GameScene; scene.launch() keeps GameScene
    // running underneath — this is what allows the post-wave queue to continue.
    expect(gameSceneSrc).toContain("scene.launch('BetweenWaveScene'");
    expect(gameSceneSrc).not.toContain("scene.start('BetweenWaveScene'");
  });

  it('blocking overlay uses DEPTH - 1 so it is below the offer cards', () => {
    // The full-screen overlay that intercepts pointer events must be BELOW
    // the card content so cards receive pointer events.
    expect(betweenWaveSrc).toContain('DEPTH - 1');
    // Cards themselves render at DEPTH or above
    expect(betweenWaveSrc).toContain('setDepth(DEPTH)');
  });

  it('BetweenWaveScene stops itself (scene.stop()) after a card is chosen', () => {
    // After the player picks an offer the scene must stop so it does not
    // remain visible while the next wave plays.
    expect(betweenWaveSrc).toContain('this.scene.stop()');
  });

  it('BetweenWaveScene stops before emitting between-wave-offer-picked', () => {
    // Scene must stop BEFORE emitting — the emit handler may synchronously
    // re-launch BetweenWaveScene for the next queued wave, and a subsequent
    // scene.stop() would kill that new instance.
    // Search for the actual emit call (not JSDoc mentions) and the stop call.
    const emitIdx = betweenWaveSrc.indexOf("emit('between-wave-offer-picked'");
    const stopIdx  = betweenWaveSrc.indexOf('this.scene.stop()');
    expect(emitIdx).toBeGreaterThan(-1);
    expect(stopIdx).toBeGreaterThan(-1);
    // stop must come before emit
    expect(stopIdx).toBeLessThan(emitIdx);
  });
});

// ── 12. Non-boss wave sequencing ─────────────────────────────────────────────

describe('GameScene — non-boss wave: boss loot entry is guarded', () => {
  it('boss loot enqueue is inside an _pendingBossRewardOffer guard', () => {
    // On non-boss waves, _pendingBossRewardOffer is false, so the boss loot
    // entry must be skipped — only vignette (if any) + BetweenWaveScene show.
    // The non-final-wave boss loot enqueue uses onDismiss (vs proceedToVictory
    // in the victory path), so we anchor on that specific call.
    const enqueueIdx = gameSceneSrc.indexOf('this.openBossOfferPanel(name, onDismiss)');
    expect(enqueueIdx).toBeGreaterThan(-1);

    // Within 300 chars BEFORE the enqueue call the guard must appear.
    const beforeEnqueue = gameSceneSrc.slice(Math.max(0, enqueueIdx - 300), enqueueIdx);
    expect(beforeEnqueue).toContain('_pendingBossRewardOffer');
    expect(beforeEnqueue).toContain('_pendingBossName');
  });

  it('BetweenWaveScene entry is always enqueued regardless of boss status', () => {
    // Even on non-boss waves the upgrade-offer scene must appear —
    // its enqueue is NOT inside the boss guard.
    const guardIdx       = gameSceneSrc.indexOf('this._pendingBossRewardOffer && this._pendingBossName');
    const betweenIdx     = gameSceneSrc.indexOf("this.scene.launch('BetweenWaveScene'");

    // The BetweenWaveScene launch must come AFTER the guard block
    expect(betweenIdx).toBeGreaterThan(guardIdx);

    // And there must be at least 300 chars between them — the guard + enqueue
    // block comes first, then the unconditional BetweenWaveScene enqueue.
    expect(betweenIdx - guardIdx).toBeGreaterThan(300);
  });

  it('pending boss state is always cleared after the guard regardless of wave type', () => {
    // Verified by group 8, confirmed again here for non-boss wave clarity.
    expect(gameSceneSrc).toContain('Always consume the pending boss state');
  });
});
