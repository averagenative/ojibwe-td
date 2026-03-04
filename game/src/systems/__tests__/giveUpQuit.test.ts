/**
 * Give Up / Quit button — TASK-139.
 *
 * Structural (?raw) tests verify that the GameScene wires the give-up button
 * for all game modes (not just endless) and that _quitToMainMenu performs the
 * correct cleanup sequence: guard re-entry, clear session, commit achievements,
 * cleanup wave manager, and transition to MainMenuScene.
 */
import { describe, it, expect } from 'vitest';

import gameSceneSrc from '../../scenes/GameScene.ts?raw';
import hudSrc from '../../ui/HUD.ts?raw';

// ── Give-up button is always visible (not gated behind isEndlessMode) ────────

describe('Give-up button — always visible', () => {
  it('calls createGiveUpButton without an isEndlessMode guard', () => {
    // The old code had: if (this.isEndlessMode) { this.hud.createGiveUpButton(...) }
    // The new code should call createGiveUpButton unconditionally.
    const callIdx = gameSceneSrc.indexOf('this.hud.createGiveUpButton');
    expect(callIdx).toBeGreaterThan(-1);

    // Grab the 200 chars before the call — should NOT contain 'isEndlessMode'
    const preceding = gameSceneSrc.slice(Math.max(0, callIdx - 200), callIdx);
    expect(preceding).not.toContain('if (this.isEndlessMode)');
  });

  it('passes _quitToMainMenu as the callback (not triggerGameOver)', () => {
    expect(gameSceneSrc).toContain(
      'this.hud.createGiveUpButton(() => this._quitToMainMenu())',
    );
  });
});

// ── _quitToMainMenu method structure ─────────────────────────────────────────

describe('_quitToMainMenu — cleanup sequence', () => {
  // Extract the method body for targeted assertions.
  const methodStart = gameSceneSrc.indexOf('private _quitToMainMenu(): void');
  const methodBody = gameSceneSrc.slice(
    methodStart,
    gameSceneSrc.indexOf('\n  }', methodStart) + 4,
  );

  it('is defined as a private method on GameScene', () => {
    expect(methodStart).toBeGreaterThan(-1);
  });

  it('guards against double invocation via gameState check', () => {
    expect(methodBody).toContain("if (this.gameState === 'over') return");
  });

  it('sets gameState to over', () => {
    expect(methodBody).toContain("this.gameState = 'over'");
  });

  it('clears the autosave session', () => {
    expect(methodBody).toContain('SessionManager.getInstance().clear()');
  });

  it('commits run achievements before leaving', () => {
    expect(methodBody).toContain('this._commitRunAchievements(false)');
  });

  it('cleans up wave manager timers', () => {
    expect(methodBody).toContain('this.waveManager.cleanup()');
  });

  it('transitions to MainMenuScene (not GameOverScene)', () => {
    expect(methodBody).toContain("this.scene.start('MainMenuScene')");
    expect(methodBody).not.toContain('GameOverScene');
  });

  it('clears session BEFORE starting MainMenuScene', () => {
    const clearIdx = methodBody.indexOf('SessionManager.getInstance().clear()');
    const startIdx = methodBody.indexOf("this.scene.start('MainMenuScene')");
    expect(clearIdx).toBeLessThan(startIdx);
  });

  it('commits achievements BEFORE cleanup', () => {
    const commitIdx = methodBody.indexOf('this._commitRunAchievements(false)');
    const cleanupIdx = methodBody.indexOf('this.waveManager.cleanup()');
    expect(commitIdx).toBeLessThan(cleanupIdx);
  });
});

// ── HUD createGiveUpButton wires confirmation dialog ─────────────────────────

describe('Give-up button — confirmation dialog wiring', () => {
  it('HUD createGiveUpButton routes pointerup through _showGiveUpConfirm', () => {
    expect(hudSrc).toContain(
      "bg.on('pointerup',   () => this._showGiveUpConfirm(onClick))",
    );
  });

  it('confirmation YES invokes the onConfirm callback', () => {
    expect(hudSrc).toContain('cleanup(); onConfirm();');
  });

  it('confirmation CANCEL only cleans up (does not invoke callback)', () => {
    expect(hudSrc).toContain("noBg.on('pointerup',   () => cleanup())");
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe('Give-up quit — edge cases', () => {
  it('re-entry guard prevents double scene transition', () => {
    // If gameState is already 'over', the method returns immediately.
    // The guard is the first meaningful line.
    const methodStart2 = gameSceneSrc.indexOf('private _quitToMainMenu(): void');
    const guardIdx = gameSceneSrc.indexOf("if (this.gameState === 'over') return", methodStart2);
    const bodyStart = gameSceneSrc.indexOf('{', methodStart2);
    // Guard should be within the first 80 chars of the body
    expect(guardIdx - bodyStart).toBeLessThan(80);
  });

  it('shutdown() is wired via events.once to clean up on scene stop', () => {
    expect(gameSceneSrc).toContain(
      "this.events.once('shutdown', this.shutdown, this)",
    );
  });

  it('shutdown clears waveManager timers (idempotent with _quitToMainMenu)', () => {
    const shutdownIdx = gameSceneSrc.indexOf('shutdown(): void');
    const shutdownBody = gameSceneSrc.slice(
      shutdownIdx,
      gameSceneSrc.indexOf('\n  }', shutdownIdx + 100) + 4,
    );
    expect(shutdownBody).toContain('this.waveManager?.cleanup()');
  });
});
