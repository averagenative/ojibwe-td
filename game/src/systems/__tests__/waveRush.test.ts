/**
 * Wave Rush — structural and logic tests.
 *
 * GameScene and HUD rely on Phaser and cannot be instantiated in vitest's
 * jsdom environment.  These tests use ?raw source imports to assert that the
 * critical structural patterns are present in the implementation.
 *
 * Additional pure-logic tests verify the arithmetic guard conditions
 * (boss-wave detection, final-wave guard) without any Phaser dependency.
 */
import { describe, it, expect } from 'vitest';

import gameSceneSrc from '../../scenes/GameScene.ts?raw';
import hudSrc       from '../../ui/HUD.ts?raw';
import waveManagerSrc from '../WaveManager.ts?raw';

// ── RUSH_GOLD_AMOUNT constant ─────────────────────────────────────────────────

describe('GameScene — RUSH_GOLD_AMOUNT constant', () => {
  it('defines RUSH_GOLD_AMOUNT as a module-level constant', () => {
    expect(gameSceneSrc).toContain('RUSH_GOLD_AMOUNT');
  });

  it('sets RUSH_GOLD_AMOUNT to 150', () => {
    expect(gameSceneSrc).toContain('RUSH_GOLD_AMOUNT = 150');
  });
});

// ── No _nextWaveRushed flag (replaced by concurrent wave tracking) ────────────

describe('GameScene — no one-ahead limit (concurrent waves)', () => {
  it('does not declare a _nextWaveRushed field', () => {
    expect(gameSceneSrc).not.toContain('_nextWaveRushed');
  });
});

// ── rushNextWave() method ─────────────────────────────────────────────────────

describe('GameScene — rushNextWave()', () => {
  it('defines rushNextWave method', () => {
    expect(gameSceneSrc).toContain('private rushNextWave()');
  });

  it('guards against rushing outside of wave state', () => {
    expect(gameSceneSrc).toContain("if (this.gameState !== 'wave') return;");
  });

  it('awards RUSH_GOLD_AMOUNT gold to the player', () => {
    expect(gameSceneSrc).toContain('this.gold += RUSH_GOLD_AMOUNT;');
  });

  it('updates the HUD gold display after awarding gold', () => {
    expect(gameSceneSrc).toContain('this.hud.setGold(this.gold);');
  });

  it('calls _showRushBonusFeedback with the bonus amount', () => {
    expect(gameSceneSrc).toContain('this._showRushBonusFeedback(RUSH_GOLD_AMOUNT)');
  });

  it('calls _doStartWave() when no boss reward is pending', () => {
    // Find the rushNextWave method (handles 1 level of inner braces) and
    // verify _doStartWave is called in the no-boss-pending branch.
    const rushMethod = gameSceneSrc.match(
      /private rushNextWave\(\).*?\{(?:[^{}]*|\{[^{}]*\})*\}/s
    );
    expect(rushMethod).not.toBeNull();
    expect(rushMethod![0]).toContain('this._doStartWave()');
  });

  it('does not set a _nextWaveRushed flag (multiple rushes allowed)', () => {
    const rushMethod = gameSceneSrc.match(
      /private rushNextWave\(\).*?\{(?:[^{}]*|\{[^{}]*\})*\}/s
    );
    expect(rushMethod).not.toBeNull();
    expect(rushMethod![0]).not.toContain('_nextWaveRushed');
  });

  it('adds gold before calling _doStartWave()', () => {
    const rushMethod = gameSceneSrc.match(
      /private rushNextWave\(\).*?\{(?:[^{}]*|\{[^{}]*\})*\}/s
    );
    expect(rushMethod).not.toBeNull();
    const body = rushMethod![0];
    const goldIdx      = body.indexOf('this.gold += RUSH_GOLD_AMOUNT');
    const startWaveIdx = body.indexOf('this._doStartWave()');
    expect(goldIdx).toBeGreaterThan(-1);
    expect(startWaveIdx).toBeGreaterThan(-1);
    expect(goldIdx).toBeLessThan(startWaveIdx);
  });
});

// ── _updateRushButton() method ────────────────────────────────────────────────

describe('GameScene — _updateRushButton()', () => {
  it('defines _updateRushButton method', () => {
    expect(gameSceneSrc).toContain('private _updateRushButton()');
  });

  it('hides the button when not in wave state', () => {
    expect(gameSceneSrc).toContain("if (this.gameState !== 'wave')");
  });

  it('hides the button when next wave exceeds totalWaves (non-endless only)', () => {
    expect(gameSceneSrc).toContain('!this.isEndlessMode && nextWave > this.totalWaves');
  });

  it('hides the button when next wave is a boss wave (every 5th)', () => {
    expect(gameSceneSrc).toContain('nextWave % 5 === 0');
  });

  it('always shows button enabled — no one-ahead limit', () => {
    expect(gameSceneSrc).toContain('this.hud.setRushWaveVisible(true, true)');
  });

  it('is called from _doStartWave()', () => {
    expect(gameSceneSrc).toContain('this._updateRushButton()');
  });
});

// ── _showRushBonusFeedback() method ──────────────────────────────────────────

describe('GameScene — _showRushBonusFeedback()', () => {
  it('defines _showRushBonusFeedback method', () => {
    expect(gameSceneSrc).toContain('private _showRushBonusFeedback(bonus: number)');
  });

  it('creates a text object with the bonus amount', () => {
    expect(gameSceneSrc).toContain('`+${bonus} RUSH BONUS`');
  });

  it('uses a tween to fade out the feedback text', () => {
    expect(gameSceneSrc).toContain('this.tweens.add(');
  });

  it('destroys the feedback text after the tween completes', () => {
    expect(gameSceneSrc).toContain('feedbackText.destroy()');
  });
});

// ── onWaveComplete concurrent wave handling ───────────────────────────────────

describe('GameScene — onWaveComplete concurrent wave handling', () => {
  it('hides rush button when all waves complete', () => {
    expect(gameSceneSrc).toContain('this.hud.setRushWaveVisible(false)');
  });

  it('tracks concurrent wave state via isConcurrent flag (not early return)', () => {
    // TASK-148: the early return was removed so rushed waves still receive offer panels.
    // onWaveComplete now captures isConcurrent = waveManager.isActive() and uses it
    // to skip only the final-wave victory block, not the entire offer-panel flow.
    expect(gameSceneSrc).toContain('const isConcurrent = this.waveManager.isActive()');
    expect(gameSceneSrc).not.toContain('if (this.waveManager.isActive()) return;');
  });

  it('uses this.currentWave for the final-wave check (not waveNum from event)', () => {
    expect(gameSceneSrc).toContain('this.currentWave >= this.totalWaves');
  });

  it('does not have a _nextWaveRushed rush path inside onWaveComplete', () => {
    // onWaveComplete should not reference the old flag
    expect(gameSceneSrc).not.toContain('_nextWaveRushed');
  });
});

// ── HUD structure ─────────────────────────────────────────────────────────────

describe('HUD — rush-wave button fields', () => {
  it('declares rushWaveBg field', () => {
    expect(hudSrc).toContain('rushWaveBg');
  });

  it('declares rushWaveLabel field', () => {
    expect(hudSrc).toContain('rushWaveLabel');
  });
});

describe('HUD — createRushWaveButton()', () => {
  it('defines createRushWaveButton method', () => {
    expect(hudSrc).toContain('createRushWaveButton(');
  });

  it('accepts an onClick callback and a rushGold amount', () => {
    expect(hudSrc).toContain('createRushWaveButton(onClick: () => void, rushGold: number)');
  });

  it('positions the button at cx=960', () => {
    expect(hudSrc).toContain('const cx   = 960;');
  });

  it('uses width=180 for the button', () => {
    expect(hudSrc).toContain('const btnW = 180;');
  });

  it('uses larger height on mobile (44) vs desktop (36)', () => {
    expect(hudSrc).toContain('44 : 36');
  });

  it('starts hidden (setVisible(false))', () => {
    expect(hudSrc).toContain('.setVisible(false)');
  });

  it('includes the rushGold amount in the button label', () => {
    expect(hudSrc).toContain('`RUSH +${rushGold}G ▶`');
  });
});

describe('HUD — setRushWaveVisible()', () => {
  it('defines setRushWaveVisible method', () => {
    expect(hudSrc).toContain('setRushWaveVisible(');
  });

  it('accepts visible and optional enabled parameters', () => {
    expect(hudSrc).toContain('setRushWaveVisible(visible: boolean, enabled = true)');
  });

  it('shows or hides both rushWaveBg and rushWaveLabel', () => {
    expect(hudSrc).toContain('this.rushWaveBg.setVisible(visible)');
    expect(hudSrc).toContain('this.rushWaveLabel.setVisible(visible)');
  });

  it('disables interactivity when enabled=false', () => {
    expect(hudSrc).toContain('this.rushWaveBg.disableInteractive()');
  });

  it('uses textDisabled colour when greyed out', () => {
    expect(hudSrc).toContain('PAL.textDisabled');
  });
});

// ── GameScene wires HUD button ────────────────────────────────────────────────

describe('GameScene — wires rush button in create()', () => {
  it('calls createRushWaveButton with rushNextWave callback and RUSH_GOLD_AMOUNT', () => {
    expect(gameSceneSrc).toContain(
      'this.hud.createRushWaveButton(() => this.rushNextWave(), RUSH_GOLD_AMOUNT)'
    );
  });
});

// ── WaveManager concurrent wave structure ─────────────────────────────────────

describe('WaveManager — concurrent wave support (ActiveWave interface)', () => {
  it('defines the ActiveWave interface', () => {
    expect(waveManagerSrc).toContain('interface ActiveWave');
  });

  it('ActiveWave has waveNumber field', () => {
    expect(waveManagerSrc).toContain('waveNumber:');
  });

  it('ActiveWave has cancelled field', () => {
    expect(waveManagerSrc).toContain('cancelled:');
  });

  it('uses _activeWaves array (not a single waveActive boolean)', () => {
    expect(waveManagerSrc).toContain('_activeWaves: ActiveWave[]');
    expect(waveManagerSrc).not.toContain('private waveActive');
  });

  it('isActive() checks _activeWaves.length', () => {
    expect(waveManagerSrc).toContain('_activeWaves.length > 0');
  });

  it('startWave() pushes a new ActiveWave onto _activeWaves', () => {
    expect(waveManagerSrc).toContain('this._activeWaves.push(wave)');
  });

  it('cleanup() sets cancelled = true for all active waves', () => {
    expect(waveManagerSrc).toContain('wave.cancelled = true');
  });

  it('cleanup() clears _activeWaves', () => {
    expect(waveManagerSrc).toContain('this._activeWaves = []');
  });

  it('_onSettledForWave splices the wave from _activeWaves when done', () => {
    expect(waveManagerSrc).toContain('this._activeWaves.splice(idx, 1)');
  });

  it('uses _spawnOneForWave instead of spawnOne', () => {
    expect(waveManagerSrc).toContain('_spawnOneForWave(');
    expect(waveManagerSrc).not.toContain('private spawnOne(');
  });

  it('uses _spawnBossForWave instead of spawnBoss', () => {
    expect(waveManagerSrc).toContain('_spawnBossForWave(');
    expect(waveManagerSrc).not.toContain('private spawnBoss(');
  });

  it('uses _spawnMiniForWave instead of spawnMini', () => {
    expect(waveManagerSrc).toContain('_spawnMiniForWave(');
    expect(waveManagerSrc).not.toContain('private spawnMini(');
  });

  it('uses _onSettledForWave instead of onSettled', () => {
    expect(waveManagerSrc).toContain('_onSettledForWave(');
    expect(waveManagerSrc).not.toContain('private onSettled(');
  });
});

// ── Boss-wave guard arithmetic ────────────────────────────────────────────────
// These tests exercise the guard condition purely as arithmetic (no Phaser).

describe('Boss-wave guard arithmetic', () => {
  /** Mirrors the _updateRushButton logic: hide if next wave is a boss (% 5 === 0). */
  function shouldHideForBoss(nextWave: number): boolean {
    return nextWave % 5 === 0;
  }

  it('wave 5 is a boss wave — rush button should be hidden', () => {
    expect(shouldHideForBoss(5)).toBe(true);
  });

  it('wave 10 is a boss wave — rush button should be hidden', () => {
    expect(shouldHideForBoss(10)).toBe(true);
  });

  it('wave 15 is a boss wave — rush button should be hidden', () => {
    expect(shouldHideForBoss(15)).toBe(true);
  });

  it('wave 20 is a boss wave — rush button should be hidden', () => {
    expect(shouldHideForBoss(20)).toBe(true);
  });

  it('wave 4 is not a boss wave — rush allowed', () => {
    expect(shouldHideForBoss(4)).toBe(false);
  });

  it('wave 6 is not a boss wave — rush allowed', () => {
    expect(shouldHideForBoss(6)).toBe(false);
  });

  it('wave 11 is not a boss wave — rush allowed', () => {
    expect(shouldHideForBoss(11)).toBe(false);
  });

  it('wave 19 is not a boss wave — rush allowed', () => {
    expect(shouldHideForBoss(19)).toBe(false);
  });
});

// ── Final-wave guard arithmetic ───────────────────────────────────────────────

describe('Final-wave guard arithmetic', () => {
  /** Mirrors the _updateRushButton logic: hide if no next wave exists. */
  function shouldHideForFinalWave(currentWave: number, totalWaves: number): boolean {
    const nextWave = currentWave + 1;
    return nextWave > totalWaves;
  }

  it('rushing on the last wave is blocked (no next wave to rush into)', () => {
    expect(shouldHideForFinalWave(20, 20)).toBe(true);
  });

  it('rushing on the second-to-last wave is allowed (next wave exists)', () => {
    expect(shouldHideForFinalWave(19, 20)).toBe(false);
  });

  it('rushing on wave 1 is allowed when totalWaves > 2', () => {
    expect(shouldHideForFinalWave(1, 20)).toBe(false);
  });

  it('wave 10 of 10 (final) blocks rush', () => {
    expect(shouldHideForFinalWave(10, 10)).toBe(true);
  });

  it('wave 9 of 10 (not final) allows rush (assuming non-boss)', () => {
    expect(shouldHideForFinalWave(9, 10)).toBe(false);
  });
});

// ── Endless-mode guard arithmetic ──────────────────────────────────────────

describe('Endless-mode guard arithmetic', () => {
  /**
   * Mirrors the _updateRushButton logic: in endless mode the totalWaves guard
   * is skipped so the rush button remains available past wave 20.
   */
  function shouldHideForFinalWave(currentWave: number, totalWaves: number, isEndless: boolean): boolean {
    const nextWave = currentWave + 1;
    return (!isEndless && nextWave > totalWaves) || nextWave % 5 === 0;
  }

  it('endless wave 21 — rush allowed (not boss, not bounded by totalWaves)', () => {
    expect(shouldHideForFinalWave(21, 20, true)).toBe(false);
  });

  it('endless wave 24 — hidden (next wave 25 is boss)', () => {
    expect(shouldHideForFinalWave(24, 20, true)).toBe(true);
  });

  it('endless wave 30 — rush allowed (next wave 31 is not boss)', () => {
    expect(shouldHideForFinalWave(30, 20, true)).toBe(false);
  });

  it('non-endless wave 20 of 20 — hidden (final wave)', () => {
    expect(shouldHideForFinalWave(20, 20, false)).toBe(true);
  });

  it('non-endless wave 19 of 20 — hidden (next wave 20 is boss)', () => {
    expect(shouldHideForFinalWave(19, 20, false)).toBe(true);
  });

  it('non-endless wave 18 of 20 — rush allowed', () => {
    expect(shouldHideForFinalWave(18, 20, false)).toBe(false);
  });
});

// ── Structural: endless mode guard in _updateRushButton ──────────────────────

describe('GameScene — _updateRushButton endless mode guard', () => {
  it('uses isEndlessMode to gate the totalWaves check', () => {
    expect(gameSceneSrc).toContain('!this.isEndlessMode && nextWave > this.totalWaves');
  });
});

// ── Concurrent rushes (multiple consecutive rushes allowed) ───────────────────

describe('Rush wave — multiple consecutive rushes allowed', () => {
  it('_updateRushButton always calls setRushWaveVisible(true, true) when enabled', () => {
    // After each rush, _doStartWave increments currentWave and calls _updateRushButton.
    // The button must show enabled for the next rush (no flag-gating).
    expect(gameSceneSrc).toContain('this.hud.setRushWaveVisible(true, true)');
  });

  it('rushNextWave calls _doStartWave directly to start the wave immediately', () => {
    expect(gameSceneSrc).toContain('this._doStartWave()');
  });
});
