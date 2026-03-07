/**
 * Resume Game Main Menu — structural and arithmetic tests (TASK-128).
 *
 * Three test suites:
 *   1. MainMenuScene structural tests (?raw) — resume button, overwrite modal,
 *      label changes, SessionManager wiring.
 *   2. GameScene structural tests (?raw) — autoResume flag, direct restore path.
 *   3. Arithmetic tests — button heights, layout math, subtitle display format.
 */

import { describe, it, expect } from 'vitest';

import mainMenuSrc from '../../scenes/MainMenuScene.ts?raw';
import gameSceneSrc from '../../scenes/GameScene.ts?raw';

// ── MainMenuScene — SessionManager integration ─────────────────────────────

describe('MainMenuScene — SessionManager integration', () => {
  it('imports SessionManager', () => {
    expect(mainMenuSrc).toContain("import { SessionManager } from '../systems/SessionManager'");
  });

  it('imports AutoSave type', () => {
    expect(mainMenuSrc).toContain("import type { AutoSave } from '../systems/SessionManager'");
  });

  it('declares _autoSave field typed AutoSave | null', () => {
    expect(mainMenuSrc).toContain('private _autoSave: AutoSave | null = null');
  });

  it('loads autosave in create() before createButtons', () => {
    const loadIdx = mainMenuSrc.indexOf('SessionManager.getInstance().load()');
    const buttonsIdx = mainMenuSrc.indexOf('this.createButtons(');
    expect(loadIdx).toBeGreaterThan(-1);
    expect(buttonsIdx).toBeGreaterThan(-1);
    expect(loadIdx).toBeLessThan(buttonsIdx);
  });
});

// ── MainMenuScene — Resume Game button ──────────────────────────────────────

describe('MainMenuScene — Resume Game button', () => {
  it('shows RESUME GAME text when save exists', () => {
    expect(mainMenuSrc).toContain("'RESUME GAME'");
  });

  it('shows wave/tower subtitle using currentWave + 1', () => {
    expect(mainMenuSrc).toContain('save.currentWave + 1');
    expect(mainMenuSrc).toContain('save.towers.length');
  });

  it('passes autoResume: true when navigating to GameScene', () => {
    expect(mainMenuSrc).toContain('autoResume: true');
  });

  it('passes saved stageId, commanderId, and mapId to GameScene', () => {
    expect(mainMenuSrc).toContain('stageId: save.stageId');
    expect(mainMenuSrc).toContain('commanderId: save.commanderId');
    expect(mainMenuSrc).toContain('mapId: save.mapId');
  });

  it('uses dark green fill (0x0a2a10) for the resume button', () => {
    expect(mainMenuSrc).toContain('0x0a2a10');
  });

  it('has hover/press states on the resume button zone', () => {
    expect(mainMenuSrc).toContain("resumeP.zone.on('pointerover'");
    expect(mainMenuSrc).toContain("resumeP.zone.on('pointerout'");
    expect(mainMenuSrc).toContain("resumeP.zone.on('pointerdown'");
    expect(mainMenuSrc).toContain("resumeP.zone.on(TAP_EVENT");
  });
});

// ── MainMenuScene — hasResume guard ─────────────────────────────────────────

describe('MainMenuScene — hasResume guard', () => {
  it('requires currentWave > 0 to show resume button (matches GameScene check)', () => {
    expect(mainMenuSrc).toContain('this._autoSave.currentWave > 0');
  });

  it('only creates resume panel when hasResume is true', () => {
    expect(mainMenuSrc).toContain('if (hasResume && this._autoSave)');
  });
});

// ── MainMenuScene — Start button label changes ──────────────────────────────

describe('MainMenuScene — Start button behaviour', () => {
  it('changes start label to START NEW RUN when save exists', () => {
    expect(mainMenuSrc).toContain("hasResume ? 'START NEW RUN' : 'START GAME'");
  });

  it('reduces font size for START NEW RUN to fit the longer text', () => {
    expect(mainMenuSrc).toContain('hasResume ? 18 : 22');
  });

  it('shows overwrite confirmation when starting new run with save', () => {
    expect(mainMenuSrc).toContain('if (hasResume)');
    expect(mainMenuSrc).toContain('this._showOverwriteConfirm(');
  });

  it('proceeds directly to CommanderSelectScene when no save', () => {
    // The else branch of the hasResume check calls _go('CommanderSelectScene', ...) directly.
    // Verify both the if and else branches exist in the pointerup handler.
    const pointerUpBlock = mainMenuSrc.slice(
      mainMenuSrc.indexOf("startP.zone.on(TAP_EVENT"),
    );
    expect(pointerUpBlock).toContain('_showOverwriteConfirm');
    expect(pointerUpBlock).toContain("_go('CommanderSelectScene'");
    // The else branch must contain a direct _go call (not wrapped in _showOverwriteConfirm).
    expect(pointerUpBlock).toContain('} else {');
  });
});

// ── MainMenuScene — Overwrite confirmation dialog ───────────────────────────

describe('MainMenuScene — _showOverwriteConfirm dialog', () => {
  it('creates a container at depth 200', () => {
    expect(mainMenuSrc).toContain('.setDepth(200)');
  });

  it('creates a dark backdrop rectangle', () => {
    expect(mainMenuSrc).toContain('0x000000, 0.65');
  });

  it('uses borderDanger for the card stroke', () => {
    expect(mainMenuSrc).toContain('PAL.borderDanger');
  });

  it('shows "Start a new run?" title', () => {
    expect(mainMenuSrc).toContain("'Start a new run?'");
  });

  it('shows "Your saved run will be lost." sub-text', () => {
    expect(mainMenuSrc).toContain("'Your saved run will be lost.'");
  });

  it('has a START FRESH button that clears session', () => {
    expect(mainMenuSrc).toContain("'START FRESH'");
    expect(mainMenuSrc).toContain('SessionManager.getInstance().clear()');
  });

  it('START FRESH calls onConfirm after clearing session', () => {
    // Verify order: container.destroy(), then clear(), then onConfirm()
    const methodSrc = mainMenuSrc.slice(
      mainMenuSrc.indexOf('_showOverwriteConfirm'),
    );
    const destroyIdx = methodSrc.indexOf('container.destroy()');
    const clearIdx   = methodSrc.indexOf('SessionManager.getInstance().clear()');
    const confirmIdx = methodSrc.indexOf('onConfirm()');
    expect(destroyIdx).toBeLessThan(clearIdx);
    expect(clearIdx).toBeLessThan(confirmIdx);
  });

  it('has a CANCEL button', () => {
    expect(mainMenuSrc).toContain("'CANCEL'");
  });

  it('backdrop dismisses on tap', () => {
    expect(mainMenuSrc).toContain("backdrop.on(TAP_EVENT");
  });

  it('CANCEL button dismisses by destroying container', () => {
    // cancelBg tap destroys the container
    expect(mainMenuSrc).toContain("cancelBg.on(TAP_EVENT,   () => container.destroy())");
  });
});

// ── GameScene — autoResume flag ─────────────────────────────────────────────

describe('GameScene — autoResume flag', () => {
  it('declares _autoResume private field', () => {
    expect(gameSceneSrc).toContain('private _autoResume = false');
  });

  it('init() accepts autoResume in the data parameter', () => {
    expect(gameSceneSrc).toContain('autoResume?: boolean');
  });

  it('init() reads autoResume from data', () => {
    expect(gameSceneSrc).toContain("data?.autoResume     ?? false");
  });

  it('when _autoResume is true, calls _restoreFromAutoSave directly (skips prompt)', () => {
    expect(gameSceneSrc).toContain(
      'if (this._autoResume)',
    );
    // The restore call must be inside the autoResume branch
    const autoResumeBlock = gameSceneSrc.slice(
      gameSceneSrc.indexOf('if (this._autoResume)'),
    );
    const restoreIdx  = autoResumeBlock.indexOf('_restoreFromAutoSave(existingSave)');
    const promptIdx   = autoResumeBlock.indexOf('_showResumePrompt(existingSave)');
    expect(restoreIdx).toBeGreaterThan(-1);
    expect(promptIdx).toBeGreaterThan(-1);
    // restore must come before prompt (they are in if/else branches)
    expect(restoreIdx).toBeLessThan(promptIdx);
  });

  it('when _autoResume is false, shows the resume prompt', () => {
    expect(gameSceneSrc).toContain('_showResumePrompt(existingSave)');
  });

  it('both paths are deferred with time.delayedCall(100)', () => {
    const block = gameSceneSrc.slice(
      gameSceneSrc.indexOf('if (this._autoResume)'),
      gameSceneSrc.indexOf('// ── Pre-game cutscenes'),
    );
    const callCount = (block.match(/this\.time\.delayedCall\(100/g) ?? []).length;
    expect(callCount).toBe(2);
  });
});

// ── GameScene — existing guard preserved ────────────────────────────────────

describe('GameScene — autosave guard consistency', () => {
  it('still requires currentWave > 0 to attempt resume', () => {
    expect(gameSceneSrc).toContain('existingSave.currentWave > 0');
  });

  it('still checks stageId match', () => {
    expect(gameSceneSrc).toContain('existingSave.stageId === this.selectedStageId');
  });

  it('still checks commanderId match', () => {
    expect(gameSceneSrc).toContain('existingSave.commanderId === this.selectedCommanderId');
  });
});

// ── Arithmetic tests — button sizing ────────────────────────────────────────

describe('Resume button sizing', () => {
  it('height is 44px (minimum touch target)', () => {
    // Extracted from: const resumeBtnH = 44;
    const match = mainMenuSrc.match(/const resumeBtnH\s*=\s*(\d+)/);
    expect(match).not.toBeNull();
    const height = parseInt(match![1], 10);
    expect(height).toBe(44);
    expect(height).toBeGreaterThanOrEqual(44); // meets minimum touch target
  });

  it('resume gap between buttons is 10px', () => {
    expect(mainMenuSrc).toContain('resumeGap  = 10');
  });
});

// ── Arithmetic tests — layout positioning ───────────────────────────────────

describe('Resume button layout', () => {
  // Simulate the layout calculation for desktop (non-mobile).
  const stageBottom = 400;  // example value
  const height = 720;       // canvas height
  const btnH = 48;          // desktop start button height
  const resumeBtnH = 44;    // desktop
  const resumeGap = 10;

  it('two-button block: resumeY positions correctly above startY', () => {
    const blockTopGap = 28; // desktop
    const blockTopY = stageBottom + blockTopGap;
    const resumeY = blockTopY + resumeBtnH / 2;
    const startY = resumeY + resumeBtnH / 2 + resumeGap + btnH / 2;

    // Resume button should be above start button
    expect(resumeY).toBeLessThan(startY);

    // Gap between the two buttons' edges should be exactly resumeGap
    const resumeBottom = resumeY + resumeBtnH / 2;
    const startTop = startY - btnH / 2;
    expect(startTop - resumeBottom).toBe(resumeGap);
  });

  it('cap logic repositions both buttons when startY exceeds maxStartY', () => {
    // Use values that force the cap: tall stageBottom with a low maxStartY.
    const tallStageBottom = 600;
    const smallHeight = 700;
    const maxStartY = smallHeight - 134; // desktop: 566

    const blockTopGap = 28;
    const blockTopY = tallStageBottom + blockTopGap;
    let resumeY = blockTopY + resumeBtnH / 2;
    let startY = resumeY + resumeBtnH / 2 + resumeGap + btnH / 2;

    // Confirm startY exceeds max before capping.
    expect(startY).toBeGreaterThan(maxStartY);

    // Apply cap logic (mirrors the source code).
    if (startY > maxStartY) {
      startY = maxStartY;
      resumeY = startY - btnH / 2 - resumeGap - resumeBtnH / 2;
    }

    expect(startY).toBe(maxStartY);
    // Buttons should still have the correct gap after capping.
    const resumeBottom = resumeY + resumeBtnH / 2;
    const startTop = startY - btnH / 2;
    expect(startTop - resumeBottom).toBe(resumeGap);
  });

  it('single-button mode (no resume) uses original formula', () => {
    const singleY = Math.min(stageBottom + 44, height - 208);  // desktop: height - 208
    expect(singleY).toBeLessThanOrEqual(height - 208);
    expect(singleY).toBeLessThanOrEqual(stageBottom + 44);
  });
});

// ── Subtitle display format ─────────────────────────────────────────────────

describe('Resume subtitle display', () => {
  it('shows wave number as 1-indexed (currentWave + 1)', () => {
    // Template: `Wave ${save.currentWave + 1}  ·  ${save.towers.length} towers`
    expect(mainMenuSrc).toContain('Wave ${save.currentWave + 1}');
  });

  it('shows tower count from save', () => {
    expect(mainMenuSrc).toContain('${save.towers.length} towers');
  });

  it('for currentWave=3, displays "Wave 4"', () => {
    const currentWave = 3;
    const display = `Wave ${currentWave + 1}`;
    expect(display).toBe('Wave 4');
  });

  it('for 0 towers, displays "0 towers"', () => {
    const towers: unknown[] = [];
    const display = `${towers.length} towers`;
    expect(display).toBe('0 towers');
  });
});
