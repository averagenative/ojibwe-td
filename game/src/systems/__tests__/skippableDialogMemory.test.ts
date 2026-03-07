/**
 * Skippable Dialog & Story Memory on Resume — unit & structural tests.
 *
 * Covers:
 *  1. VignetteManager.restoreFiredIds() — pre-populates firedThisRun from saved IDs
 *  2. VignetteOverlay skip button — structural verification via ?raw
 *  3. CutsceneScene skip button — structural verification via ?raw
 *  4. GameScene _seenDialogIds — tracking, autosave serialisation, resume restore
 *  5. SessionManager AutoSave.seenDialogs — schema presence
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TriggerType } from '../../data/vignetteDefs';

// ═════════════════════════════════════════════════════════════════════════════
// 1. VignetteManager.restoreFiredIds()
// ═════════════════════════════════════════════════════════════════════════════

const mockSave = {
  getSeenVignetteIds: vi.fn<() => string[]>(() => []),
  markVignetteSeen:   vi.fn(),
  unlockCodexEntry:   vi.fn(),
  isCodexUnlocked:    vi.fn(() => false),
};

vi.mock('../../meta/SaveManager', () => ({
  SaveManager: {
    getInstance: () => mockSave,
  },
}));

const { VignetteManager } = await import('../../systems/VignetteManager');

describe('VignetteManager.restoreFiredIds()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.getSeenVignetteIds.mockReturnValue([]);
  });

  it('suppresses vignettes whose IDs were restored', () => {
    const mgr = new VignetteManager('zaagaiganing');
    mgr.restoreFiredIds(['act1-arrival']);

    // FIRST_PLAY would normally fire act1-arrival, but it was restored.
    const result = mgr.check(TriggerType.FIRST_PLAY);
    expect(result).toBeNull();
  });

  it('allows vignettes whose IDs were NOT restored', () => {
    const mgr = new VignetteManager('zaagaiganing');
    mgr.restoreFiredIds(['some-other-id']);

    const result = mgr.check(TriggerType.FIRST_PLAY);
    expect(result).not.toBeNull();
    expect(result!.vignette.id).toBe('act1-arrival');
  });

  it('handles empty array gracefully', () => {
    const mgr = new VignetteManager('zaagaiganing');
    mgr.restoreFiredIds([]);

    const result = mgr.check(TriggerType.FIRST_PLAY);
    expect(result).not.toBeNull();
  });

  it('handles duplicate IDs in restored array', () => {
    const mgr = new VignetteManager('zaagaiganing');
    mgr.restoreFiredIds(['act1-arrival', 'act1-arrival', 'act1-arrival']);

    const result = mgr.check(TriggerType.FIRST_PLAY);
    expect(result).toBeNull();
  });

  it('restores multiple distinct IDs', () => {
    const mgr = new VignetteManager('zaagaiganing');
    mgr.restoreFiredIds(['act1-arrival', 'act1-first-wave']);

    expect(mgr.check(TriggerType.FIRST_PLAY)).toBeNull();
    expect(mgr.check(TriggerType.WAVE_COMPLETE, 3)).toBeNull();
  });

  it('still marks new vignettes as fired after restore', () => {
    const mgr = new VignetteManager('zaagaiganing');
    mgr.restoreFiredIds(['act1-arrival']);

    // Fire a different vignette (not restored).
    const result = mgr.check(TriggerType.WAVE_COMPLETE, 3);
    expect(result).not.toBeNull();

    // Same vignette should not fire again.
    const second = mgr.check(TriggerType.WAVE_COMPLETE, 3);
    expect(second).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. VignetteOverlay — skip button (structural, ?raw)
// ═════════════════════════════════════════════════════════════════════════════

import vignetteOverlaySrc from '../../ui/VignetteOverlay.ts?raw';

describe('VignetteOverlay skip button (structural)', () => {
  it('imports MobileManager', () => {
    expect(vignetteOverlaySrc).toContain("import { MobileManager");
  });

  it('creates a skip button rectangle with interactive', () => {
    expect(vignetteOverlaySrc).toContain('.setInteractive({ useHandCursor: true })');
  });

  it('skip label text is "Skip ▶"', () => {
    expect(vignetteOverlaySrc).toContain("'Skip \\u25B6'");
  });

  it('skip button calls dismiss() on tap', () => {
    expect(vignetteOverlaySrc).toContain("skipBg.on(TAP_EVENT,   () => this.dismiss())");
  });

  it('skip button has hover effect (pointerover/pointerout)', () => {
    expect(vignetteOverlaySrc).toContain("skipBg.on('pointerover'");
    expect(vignetteOverlaySrc).toContain("skipBg.on('pointerout'");
  });

  it('skip button size is 44px tall on mobile (touch target)', () => {
    expect(vignetteOverlaySrc).toContain('const skipH = isMobile ? 44 : 28');
  });

  it('skip button is positioned at bottom-right of panel', () => {
    expect(vignetteOverlaySrc).toContain('skipX = width - skipW / 2 - 12');
    expect(vignetteOverlaySrc).toContain('skipY = panelY + panelH - skipH / 2 - 8');
  });

  it('skip button objects are pushed to this.objects for cleanup', () => {
    // Both skipBg and skipLabel must be tracked for cleanup.
    const skipBgPush = vignetteOverlaySrc.indexOf('this.objects.push(skipBg)');
    const skipLabelPush = vignetteOverlaySrc.indexOf('this.objects.push(skipLabel)');
    expect(skipBgPush).toBeGreaterThan(-1);
    expect(skipLabelPush).toBeGreaterThan(-1);
  });

  it('skip button depth is above body text', () => {
    // skipBg at DEPTH + 3, skipLabel at DEPTH + 4, body text at DEPTH + 2.
    expect(vignetteOverlaySrc).toContain('setDepth(DEPTH + 3)');
    expect(vignetteOverlaySrc).toContain('setDepth(DEPTH + 4)');
  });

  it('no longer has old "click to dismiss/advance" hint text', () => {
    expect(vignetteOverlaySrc).not.toContain('click to dismiss');
    expect(vignetteOverlaySrc).not.toContain('click to advance');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. CutsceneScene — skip button (structural, ?raw)
// ═════════════════════════════════════════════════════════════════════════════

import cutsceneSceneSrc from '../../scenes/CutsceneScene.ts?raw';

describe('CutsceneScene skip button (structural)', () => {
  it('has a skip button rectangle', () => {
    expect(cutsceneSceneSrc).toContain('this.skipBtn = this.add.rectangle(');
  });

  it('skip label says "SKIP"', () => {
    expect(cutsceneSceneSrc).toContain("'SKIP'");
  });

  it('skip button calls finish() on tap', () => {
    // Uses TAP_EVENT constant (resolves to pointerup/pointerdown based on platform)
    expect(cutsceneSceneSrc).toMatch(/this\.skipBtn\.on\(TAP_EVENT,\s+\(\) => this\.finish\(\)\)/);
  });

  it('skip button is 44px tall on mobile (touch target)', () => {
    expect(cutsceneSceneSrc).toContain('const skipH = this._isMobile ? 44 : 32');
  });

  it('skip button has hover effect', () => {
    expect(cutsceneSceneSrc).toContain("this.skipBtn.on('pointerover'");
    expect(cutsceneSceneSrc).toContain("this.skipBtn.on('pointerout'");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. GameScene — _seenDialogIds tracking (structural, ?raw)
// ═════════════════════════════════════════════════════════════════════════════

import gameSceneSrc from '../../scenes/GameScene.ts?raw';

describe('GameScene _seenDialogIds (structural)', () => {
  // ── Field declaration & init reset ──

  it('declares _seenDialogIds as a Set<string>', () => {
    expect(gameSceneSrc).toContain('_seenDialogIds: Set<string> = new Set()');
  });

  it('resets _seenDialogIds in init()', () => {
    // Find the _seenDialogIds assignment line and verify it assigns new Set().
    expect(gameSceneSrc).toContain('this._seenDialogIds      = new Set()');
  });

  // ── Cutscene trigger guards ──

  it('guards intro cutscene with _seenDialogIds.has', () => {
    expect(gameSceneSrc).toContain("!this._seenDialogIds.has('cutscene-intro')");
  });

  it('guards region cutscene with _seenDialogIds.has', () => {
    expect(gameSceneSrc).toContain('!this._seenDialogIds.has(regionCutsceneId)');
  });

  it('guards pre-boss cutscene with _seenDialogIds.has', () => {
    expect(gameSceneSrc).toContain('!this._seenDialogIds.has(cutsceneId)');
  });

  it('guards post-boss cutscene with _seenDialogIds.has', () => {
    expect(gameSceneSrc).toContain('!this._seenDialogIds.has(postBossCutsceneId)');
  });

  it('guards FIRST_PLAY vignette with _seenDialogIds.has', () => {
    expect(gameSceneSrc).toContain('!this._seenDialogIds.has(firstPlayResult.vignette.id)');
  });

  // ── Adds ID after showing dialog ──

  it('adds intro cutscene ID to _seenDialogIds', () => {
    expect(gameSceneSrc).toContain('this._seenDialogIds.add(introDef.id)');
  });

  it('adds region cutscene ID to _seenDialogIds', () => {
    expect(gameSceneSrc).toContain('this._seenDialogIds.add(regionDef.id)');
  });

  it('adds pre-boss cutscene ID to _seenDialogIds', () => {
    // Pre-boss: cutsceneId (local var)
    expect(gameSceneSrc).toContain('this._seenDialogIds.add(cutsceneId)');
  });

  it('adds post-boss cutscene ID to _seenDialogIds', () => {
    expect(gameSceneSrc).toContain('this._seenDialogIds.add(postBossCutsceneId)');
  });

  it('adds FIRST_PLAY vignette ID to _seenDialogIds', () => {
    expect(gameSceneSrc).toContain('this._seenDialogIds.add(firstPlayResult.vignette.id)');
  });

  it('adds between-wave vignette ID to _seenDialogIds in _buildBetweenWaveVignetteEntry', () => {
    expect(gameSceneSrc).toContain('this._seenDialogIds.add(result.vignette.id)');
  });

  it('adds stage-complete vignette ID to _seenDialogIds', () => {
    expect(gameSceneSrc).toContain('this._seenDialogIds.add(stageVignette.vignette.id)');
  });

  // ── Autosave serialisation ──

  it('serialises _seenDialogIds to seenDialogs in autosave', () => {
    expect(gameSceneSrc).toContain('seenDialogs:     Array.from(this._seenDialogIds)');
  });

  // ── Resume restore ──

  it('restores _seenDialogIds from autoSave.seenDialogs', () => {
    expect(gameSceneSrc).toContain('if (autoSave.seenDialogs)');
    expect(gameSceneSrc).toContain('this._seenDialogIds.add(id)');
  });

  it('restores vignetteManager firedIds on resume', () => {
    expect(gameSceneSrc).toContain('this.vignetteManager.restoreFiredIds(autoSave.seenDialogs)');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. SessionManager AutoSave — seenDialogs field
// ═════════════════════════════════════════════════════════════════════════════

import sessionManagerSrc from '../../systems/SessionManager.ts?raw';

describe('SessionManager AutoSave seenDialogs (structural)', () => {
  it('AutoSave interface includes seenDialogs: string[]', () => {
    expect(sessionManagerSrc).toContain('seenDialogs:');
    expect(sessionManagerSrc).toContain('string[]');
  });

  it('seenDialogs field has a doc comment', () => {
    expect(sessionManagerSrc).toContain('cutscene + vignette IDs shown during this run');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. VignetteManager.restoreFiredIds — source-level (structural)
// ═════════════════════════════════════════════════════════════════════════════

import vignetteManagerSrc from '../../systems/VignetteManager.ts?raw';

describe('VignetteManager restoreFiredIds (structural)', () => {
  it('declares restoreFiredIds method', () => {
    expect(vignetteManagerSrc).toContain('restoreFiredIds(ids: readonly string[]): void');
  });

  it('adds each ID to firedThisRun', () => {
    const fnIdx = vignetteManagerSrc.indexOf('restoreFiredIds');
    const block = vignetteManagerSrc.slice(fnIdx, fnIdx + 200);
    expect(block).toContain('this.firedThisRun.add(id)');
  });

  it('has a doc comment explaining its purpose', () => {
    expect(vignetteManagerSrc).toContain('Pre-populate firedThisRun from a list of IDs');
  });
});
