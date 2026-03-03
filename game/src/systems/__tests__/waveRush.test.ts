/**
 * Wave Rush — structural and logic tests.
 *
 * GameScene and HUD rely on Phaser and cannot be instantiated in vitest's
 * jsdom environment.  These tests use ?raw source imports to assert that the
 * critical structural patterns are present in the implementation.
 *
 * Additional pure-logic tests verify the arithmetic guard conditions
 * (boss-wave detection, final-wave guard, one-ahead limit) without any
 * Phaser dependency.
 */
import { describe, it, expect } from 'vitest';

import gameSceneSrc from '../../scenes/GameScene.ts?raw';
import hudSrc       from '../../ui/HUD.ts?raw';

// ── RUSH_GOLD_AMOUNT constant ─────────────────────────────────────────────────

describe('GameScene — RUSH_GOLD_AMOUNT constant', () => {
  it('defines RUSH_GOLD_AMOUNT as a module-level constant', () => {
    expect(gameSceneSrc).toContain('RUSH_GOLD_AMOUNT');
  });

  it('sets RUSH_GOLD_AMOUNT to 25', () => {
    expect(gameSceneSrc).toContain('RUSH_GOLD_AMOUNT = 25');
  });
});

// ── _nextWaveRushed field ─────────────────────────────────────────────────────

describe('GameScene — _nextWaveRushed field', () => {
  it('declares _nextWaveRushed field', () => {
    expect(gameSceneSrc).toContain('_nextWaveRushed');
  });

  it('resets _nextWaveRushed to false in init()', () => {
    expect(gameSceneSrc).toContain('this._nextWaveRushed         = false;');
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

  it('guards against double-rush (one-ahead limit)', () => {
    expect(gameSceneSrc).toContain('if (this._nextWaveRushed) return;');
  });

  it('awards RUSH_GOLD_AMOUNT gold to the player', () => {
    expect(gameSceneSrc).toContain('this.gold += RUSH_GOLD_AMOUNT;');
  });

  it('updates the HUD gold display after awarding gold', () => {
    expect(gameSceneSrc).toContain('this.hud.setGold(this.gold);');
  });

  it('sets _nextWaveRushed to true after rush', () => {
    expect(gameSceneSrc).toContain('this._nextWaveRushed = true;');
  });

  it('disables the rush button after clicking (enabled=false)', () => {
    expect(gameSceneSrc).toContain('this.hud.setRushWaveVisible(true, false);');
  });

  it('calls _showRushBonusFeedback with the bonus amount', () => {
    expect(gameSceneSrc).toContain('this._showRushBonusFeedback(RUSH_GOLD_AMOUNT)');
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

  it('shows button enabled when player has not yet rushed', () => {
    expect(gameSceneSrc).toContain('this.hud.setRushWaveVisible(true, !this._nextWaveRushed)');
  });

  it('is called from startNextWave()', () => {
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

// ── onWaveComplete rush path ──────────────────────────────────────────────────

describe('GameScene — onWaveComplete rush path', () => {
  it('hides rush button at the start of onWaveComplete', () => {
    expect(gameSceneSrc).toContain('this.hud.setRushWaveVisible(false)');
  });

  it('checks _nextWaveRushed inside onWaveComplete', () => {
    expect(gameSceneSrc).toContain('if (this._nextWaveRushed)');
  });

  it('clears _nextWaveRushed in the rush path', () => {
    expect(gameSceneSrc).toContain('this._nextWaveRushed = false;');
  });

  it('calls startNextWave() in the rush path', () => {
    // The rush path calls startNextWave() and returns early.
    // We verify both appear in the rush block context.
    const rushBlock = gameSceneSrc.match(
      /if \(this\._nextWaveRushed\) \{[\s\S]*?return;\s*\}/
    );
    expect(rushBlock).not.toBeNull();
    expect(rushBlock![0]).toContain('this.startNextWave()');
  });

  it('returns early in the rush path (skips between-wave queue)', () => {
    const rushBlock = gameSceneSrc.match(
      /if \(this\._nextWaveRushed\) \{[\s\S]*?return;\s*\}/
    );
    expect(rushBlock).not.toBeNull();
    expect(rushBlock![0]).toContain('return;');
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
    expect(hudSrc).toContain('`RUSH +${rushGold}⬡ ▶`');
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
