/**
 * Cutscene system — unit & structural tests.
 *
 * Covers:
 *   - cutsceneDefs: data integrity, lookup helpers, content requirements
 *   - SaveManager:  cutscene seen/unseen persistence
 *   - CutsceneScene: structural verification via ?raw source inspection
 *   - GameScene / CommanderSelectScene: trigger integration via ?raw
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═════════════════════════════════════════════════════════════════════════════
// cutsceneDefs — data integrity
// ═════════════════════════════════════════════════════════════════════════════

import {
  ALL_CUTSCENES,
  getCutsceneDef,
  getRegionIntroCutsceneId,
  getPreBossCutsceneId,
  getPostBossCutsceneId,
  getCommanderIntroCutsceneId,
} from '../../data/cutsceneDefs';
// Types imported for reference — used in inline type checks above.

describe('cutsceneDefs', () => {
  it('all cutscene IDs are unique', () => {
    const ids = ALL_CUTSCENES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every cutscene has at least 1 frame', () => {
    for (const cs of ALL_CUTSCENES) {
      expect(cs.frames.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every frame has non-empty text', () => {
    for (const cs of ALL_CUTSCENES) {
      for (const frame of cs.frames) {
        expect(frame.text.length).toBeGreaterThan(0);
      }
    }
  });

  it('portraitSide is valid when present', () => {
    for (const cs of ALL_CUTSCENES) {
      for (const frame of cs.frames) {
        if (frame.portraitSide !== undefined) {
          expect(['left', 'right']).toContain(frame.portraitSide);
        }
      }
    }
  });

  it('effect is valid when present', () => {
    const valid = ['shake', 'flash', 'fade'];
    for (const cs of ALL_CUTSCENES) {
      for (const frame of cs.frames) {
        if (frame.effect !== undefined) {
          expect(valid).toContain(frame.effect);
        }
      }
    }
  });

  it('auto is a positive number when present', () => {
    for (const cs of ALL_CUTSCENES) {
      for (const frame of cs.frames) {
        if (frame.auto !== undefined) {
          expect(frame.auto).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  // ── Content requirements ──────────────────────────────────────────────

  it('has an intro cutscene', () => {
    expect(getCutsceneDef('cutscene-intro')).toBeDefined();
  });

  it('intro cutscene has 3-5 frames', () => {
    const intro = getCutsceneDef('cutscene-intro')!;
    expect(intro.frames.length).toBeGreaterThanOrEqual(3);
    expect(intro.frames.length).toBeLessThanOrEqual(5);
  });

  it('has region intro cutscenes for all 4 regions', () => {
    const regions = ['zaagaiganing', 'mashkiig', 'mitigomizh', 'biboon-aki'];
    for (const r of regions) {
      const id = getRegionIntroCutsceneId(r);
      expect(id).toBeDefined();
      const def = getCutsceneDef(id!);
      expect(def).toBeDefined();
      // 3-5 frames per spec
      expect(def!.frames.length).toBeGreaterThanOrEqual(3);
      expect(def!.frames.length).toBeLessThanOrEqual(5);
    }
  });

  it('has pre-boss cutscenes for all 4 bosses', () => {
    const bosses = ['makwa', 'migizi', 'waabooz', 'animikiins'];
    for (const b of bosses) {
      const id = getPreBossCutsceneId(b);
      expect(id).toBeDefined();
      const def = getCutsceneDef(id!);
      expect(def).toBeDefined();
      // 2-3 frames per spec
      expect(def!.frames.length).toBeGreaterThanOrEqual(2);
      expect(def!.frames.length).toBeLessThanOrEqual(3);
    }
  });

  it('has post-boss cutscenes for all 4 bosses', () => {
    const bosses = ['makwa', 'migizi', 'waabooz', 'animikiins'];
    for (const b of bosses) {
      const id = getPostBossCutsceneId(b);
      expect(id).toBeDefined();
      const def = getCutsceneDef(id!);
      expect(def).toBeDefined();
      // 1-2 frames per spec
      expect(def!.frames.length).toBeGreaterThanOrEqual(1);
      expect(def!.frames.length).toBeLessThanOrEqual(2);
    }
  });

  it('has commander intro cutscenes for all 5 commanders', () => {
    const commanders = ['nokomis', 'makoons', 'waabizii', 'bizhiw', 'animikiikaa'];
    for (const c of commanders) {
      const id = getCommanderIntroCutsceneId(c);
      expect(id).toBeDefined();
      const def = getCutsceneDef(id!);
      expect(def).toBeDefined();
      expect(def!.frames.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('getCutsceneDef returns undefined for unknown ID', () => {
    expect(getCutsceneDef('nonexistent')).toBeUndefined();
  });

  it('getRegionIntroCutsceneId returns undefined for unknown region', () => {
    expect(getRegionIntroCutsceneId('nonexistent')).toBeUndefined();
  });

  it('getPreBossCutsceneId returns undefined for unknown boss', () => {
    expect(getPreBossCutsceneId('nonexistent')).toBeUndefined();
  });

  it('getPostBossCutsceneId returns undefined for unknown boss', () => {
    expect(getPostBossCutsceneId('nonexistent')).toBeUndefined();
  });

  it('getCommanderIntroCutsceneId returns undefined for unknown commander', () => {
    expect(getCommanderIntroCutsceneId('nonexistent')).toBeUndefined();
  });

  it('total cutscene count matches expected (intro + 4 regions + 4 pre-boss + 4 post-boss + 5 commanders)', () => {
    // 1 intro + 4 regions + 4 pre-boss + 4 post-boss + 5 commanders = 18
    expect(ALL_CUTSCENES.length).toBe(18);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SaveManager — cutscene persistence
// ═════════════════════════════════════════════════════════════════════════════

import { SaveManager } from '../../meta/SaveManager';

function makeStoreMock() {
  const store = new Map<string, string>();
  return {
    getItem:    (key: string) => store.get(key) ?? null,
    setItem:    (key: string, val: string) => { store.set(key, val); },
    removeItem: (key: string) => { store.delete(key); },
    clear:      () => store.clear(),
    get length() { return store.size; },
    key:        (i: number) => [...store.keys()][i] ?? null,
    _store:     store,
  };
}

function resetSingleton(): void {
  (SaveManager as unknown as { _instance: null })._instance = null;
}

describe('SaveManager cutscene tracking', () => {
  let storageMock: ReturnType<typeof makeStoreMock>;

  beforeEach(() => {
    storageMock = makeStoreMock();
    vi.stubGlobal('localStorage', storageMock);
    resetSingleton();
  });

  it('hasSeenCutscene returns false for unseen cutscene', () => {
    const sm = SaveManager.getInstance();
    expect(sm.hasSeenCutscene('cutscene-intro')).toBe(false);
  });

  it('markCutsceneSeen makes hasSeenCutscene return true', () => {
    const sm = SaveManager.getInstance();
    sm.markCutsceneSeen('cutscene-intro');
    expect(sm.hasSeenCutscene('cutscene-intro')).toBe(true);
  });

  it('markCutsceneSeen is idempotent', () => {
    const sm = SaveManager.getInstance();
    sm.markCutsceneSeen('cutscene-intro');
    sm.markCutsceneSeen('cutscene-intro');
    expect(sm.getSeenCutsceneIds().filter(id => id === 'cutscene-intro').length).toBe(1);
  });

  it('getSeenCutsceneIds returns all marked IDs', () => {
    const sm = SaveManager.getInstance();
    sm.markCutsceneSeen('cutscene-intro');
    sm.markCutsceneSeen('cutscene-boss-makwa');
    const ids = sm.getSeenCutsceneIds();
    expect(ids).toContain('cutscene-intro');
    expect(ids).toContain('cutscene-boss-makwa');
    expect(ids.length).toBe(2);
  });

  it('cutscene IDs persist across singleton resets', () => {
    const sm1 = SaveManager.getInstance();
    sm1.markCutsceneSeen('cutscene-intro');
    resetSingleton();
    const sm2 = SaveManager.getInstance();
    expect(sm2.hasSeenCutscene('cutscene-intro')).toBe(true);
  });

  it('sanitize filters non-string entries from seenCutsceneIds', () => {
    // Seed corrupted data
    storageMock.setItem('ojibwe-td-save', JSON.stringify({
      version: 1,
      seenCutsceneIds: ['valid', 42, null, 'also-valid'],
    }));
    resetSingleton();
    const sm = SaveManager.getInstance();
    const ids = sm.getSeenCutsceneIds();
    expect(ids).toEqual(['valid', 'also-valid']);
  });

  it('handles missing seenCutsceneIds field in old saves', () => {
    storageMock.setItem('ojibwe-td-save', JSON.stringify({ version: 1 }));
    resetSingleton();
    const sm = SaveManager.getInstance();
    expect(sm.hasSeenCutscene('anything')).toBe(false);
    expect(sm.getSeenCutsceneIds()).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CutsceneScene — structural verification
// ═════════════════════════════════════════════════════════════════════════════

import cutsceneSceneSrc from '../../scenes/CutsceneScene.ts?raw';

describe('CutsceneScene (structural)', () => {
  it('registers with key "CutsceneScene"', () => {
    expect(cutsceneSceneSrc).toContain("key: 'CutsceneScene'");
  });

  it('has a skip button for skipping the entire cutscene', () => {
    expect(cutsceneSceneSrc).toContain('SKIP');
    expect(cutsceneSceneSrc).toContain('skipBtn');
  });

  it('skip button calls finish()', () => {
    expect(cutsceneSceneSrc).toContain("this.skipBtn.on('pointerup'");
    expect(cutsceneSceneSrc).toContain('this.finish()');
  });

  it('implements typewriter effect with CHAR_DELAY_MS', () => {
    expect(cutsceneSceneSrc).toContain('CHAR_DELAY_MS');
    expect(cutsceneSceneSrc).toContain('revealNextChar');
    expect(cutsceneSceneSrc).toContain('typeTimer');
  });

  it('CHAR_DELAY_MS is 30', () => {
    expect(cutsceneSceneSrc).toMatch(/CHAR_DELAY_MS\s*=\s*30/);
  });

  it('tap completes typewriter if mid-reveal, advances if complete', () => {
    expect(cutsceneSceneSrc).toContain('handleTap');
    expect(cutsceneSceneSrc).toContain('completeTypewriter');
    expect(cutsceneSceneSrc).toContain('advanceFrame');
  });

  it('renders character portrait with PORTRAIT_SIZE 200-300px', () => {
    const match = cutsceneSceneSrc.match(/PORTRAIT_SIZE\s*=\s*(\d+)/);
    expect(match).toBeTruthy();
    const size = parseInt(match![1], 10);
    expect(size).toBeGreaterThanOrEqual(200);
    expect(size).toBeLessThanOrEqual(300);
  });

  it('portrait slides in with tween animation', () => {
    expect(cutsceneSceneSrc).toContain('PORTRAIT_SLIDE');
    expect(cutsceneSceneSrc).toContain('PORTRAIT_SLIDE_MS');
    expect(cutsceneSceneSrc).toContain('Cubic.easeOut');
  });

  it('supports left and right portrait positioning', () => {
    expect(cutsceneSceneSrc).toContain("portraitSide ?? 'left'");
    expect(cutsceneSceneSrc).toContain("side === 'left'");
  });

  it('has a dark overlay background', () => {
    expect(cutsceneSceneSrc).toContain('0x000000');
    expect(cutsceneSceneSrc).toContain('overlay');
  });

  it('dialog box is in the bottom third of the screen', () => {
    expect(cutsceneSceneSrc).toContain('height / 3');
    expect(cutsceneSceneSrc).toContain('height - panelH');
  });

  it('has speaker nameplate with colour', () => {
    expect(cutsceneSceneSrc).toContain('nameplateColour');
    expect(cutsceneSceneSrc).toContain('nameplateBg');
  });

  it('supports screen effects (shake, flash, fade)', () => {
    expect(cutsceneSceneSrc).toContain("effect === 'shake'");
    expect(cutsceneSceneSrc).toContain("effect === 'flash'");
    expect(cutsceneSceneSrc).toContain("effect === 'fade'");
    expect(cutsceneSceneSrc).toContain('cameras.main.shake');
    expect(cutsceneSceneSrc).toContain('cameras.main.flash');
    expect(cutsceneSceneSrc).toContain('cameras.main.fadeIn');
  });

  it('supports auto-advance frames', () => {
    expect(cutsceneSceneSrc).toContain('frame.auto');
    expect(cutsceneSceneSrc).toContain('autoTimer');
    expect(cutsceneSceneSrc).toContain('onTextFullyRevealed');
  });

  it('calls scene.stop() and onComplete when finished', () => {
    expect(cutsceneSceneSrc).toContain('this.scene.stop()');
    expect(cutsceneSceneSrc).toContain('callback?.()');
  });

  it('is launched as an overlay (uses scene.launch not scene.start)', () => {
    expect(cutsceneSceneSrc).toContain('scene.stop()');
    // Launched from other scenes — not self-starting
  });

  it('mobile text size is at least 16px', () => {
    // bodyFontSize: 18 on mobile, 16 on desktop
    expect(cutsceneSceneSrc).toMatch(/bodyFontSize\s*=\s*this\._isMobile\s*\?\s*18\s*:\s*16/);
  });

  it('mobile skip button is at least 44px height', () => {
    expect(cutsceneSceneSrc).toMatch(/skipH\s*=\s*this\._isMobile\s*\?\s*44/);
  });

  it('has frame indicator showing current frame / total', () => {
    expect(cutsceneSceneSrc).toContain('index + 1');
    expect(cutsceneSceneSrc).toContain('/ ${total}');
  });

  it('cleans up timers and objects in cleanupFrame', () => {
    expect(cutsceneSceneSrc).toContain('cleanupFrame');
    expect(cutsceneSceneSrc).toContain('typeTimer');
    expect(cutsceneSceneSrc).toContain('autoTimer');
    expect(cutsceneSceneSrc).toContain('obj.destroy()');
  });

  it('has shutdown method for scene lifecycle', () => {
    expect(cutsceneSceneSrc).toContain('shutdown()');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GameScene — cutscene trigger integration (structural)
// ═════════════════════════════════════════════════════════════════════════════

import gameSceneSrc from '../../scenes/GameScene.ts?raw';

describe('GameScene cutscene triggers (structural)', () => {
  it('imports cutscene helpers', () => {
    expect(gameSceneSrc).toContain('getCutsceneDef');
    expect(gameSceneSrc).toContain('getRegionIntroCutsceneId');
    expect(gameSceneSrc).toContain('getPreBossCutsceneId');
    expect(gameSceneSrc).toContain('getPostBossCutsceneId');
  });

  it('checks for intro cutscene on first play', () => {
    expect(gameSceneSrc).toContain("hasSeenCutscene('cutscene-intro')");
    expect(gameSceneSrc).toContain("getCutsceneDef('cutscene-intro')");
  });

  it('launches CutsceneScene for intro cutscene', () => {
    expect(gameSceneSrc).toContain("scene.launch('CutsceneScene'");
  });

  it('marks intro cutscene as seen via SaveManager', () => {
    expect(gameSceneSrc).toContain('markCutsceneSeen(introDef.id)');
  });

  it('checks for region intro cutscene', () => {
    expect(gameSceneSrc).toContain('getRegionIntroCutsceneId(regionId)');
    expect(gameSceneSrc).toContain('hasSeenCutscene(regionCutsceneId)');
  });

  it('marks region cutscene as seen', () => {
    expect(gameSceneSrc).toContain('markCutsceneSeen(regionDef.id)');
  });

  it('falls back to FIRST_PLAY vignette when no cutscenes needed', () => {
    expect(gameSceneSrc).toContain('if (firstPlayResult && !this._seenDialogIds.has(firstPlayResult.vignette.id))');
    expect(gameSceneSrc).toContain('vignetteOverlay.show(firstPlayResult.vignette');
  });

  it('checks for pre-boss cutscene before starting boss wave', () => {
    expect(gameSceneSrc).toContain('getPreBossCutsceneId(waveInfo.bossKey)');
    expect(gameSceneSrc).toContain('hasSeenCutscene(cutsceneId)');
  });

  it('defers wave start until pre-boss cutscene completes', () => {
    expect(gameSceneSrc).toContain("onComplete: () => this._doStartWave()");
  });

  it('has _doStartWave method for internal wave start logic', () => {
    expect(gameSceneSrc).toContain('private _doStartWave()');
  });

  it('enqueues post-boss cutscene in post-wave queue', () => {
    expect(gameSceneSrc).toContain('getPostBossCutsceneId(this.pendingBossKillKey)');
    expect(gameSceneSrc).toContain('hasSeenCutscene(postBossCutsceneId)');
    expect(gameSceneSrc).toContain('markCutsceneSeen(postBossCutsceneId)');
  });

  it('cutscene only plays once per save (checks hasSeenCutscene before launching)', () => {
    // All three trigger points check hasSeenCutscene
    const checks = gameSceneSrc.match(/hasSeenCutscene/g);
    expect(checks).toBeTruthy();
    expect(checks!.length).toBeGreaterThanOrEqual(3);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CommanderSelectScene — commander intro cutscene trigger (structural)
// ═════════════════════════════════════════════════════════════════════════════

import commanderSelectSrc from '../../scenes/CommanderSelectScene.ts?raw';

describe('CommanderSelectScene cutscene trigger (structural)', () => {
  it('imports cutscene helpers', () => {
    expect(commanderSelectSrc).toContain('getCommanderIntroCutsceneId');
    expect(commanderSelectSrc).toContain('getCutsceneDef');
  });

  it('checks for commander intro cutscene on confirm', () => {
    expect(commanderSelectSrc).toContain('getCommanderIntroCutsceneId(this.selectedId)');
    expect(commanderSelectSrc).toContain('hasSeenCutscene(cutsceneId)');
  });

  it('launches CutsceneScene before transitioning to GameScene', () => {
    expect(commanderSelectSrc).toContain("scene.launch('CutsceneScene'");
  });

  it('marks commander cutscene as seen', () => {
    expect(commanderSelectSrc).toContain('markCutsceneSeen(cutsceneId)');
  });

  it('falls through to _go(GameScene) when no cutscene needed', () => {
    expect(commanderSelectSrc).toContain("this._go('GameScene', gameData)");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// main.ts — scene registration (structural)
// ═════════════════════════════════════════════════════════════════════════════

import mainSrc from '../../main.ts?raw';

describe('main.ts CutsceneScene registration (structural)', () => {
  it('imports CutsceneScene', () => {
    expect(mainSrc).toContain("import { CutsceneScene }");
  });

  it('registers CutsceneScene in the scene array', () => {
    expect(mainSrc).toContain('CutsceneScene,');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// WaveManager — bossKey in WaveAnnouncementInfo (structural)
// ═════════════════════════════════════════════════════════════════════════════

import waveManagerSrc from '../../systems/WaveManager.ts?raw';

describe('WaveManager bossKey (structural)', () => {
  it('WaveAnnouncementInfo includes bossKey field', () => {
    expect(waveManagerSrc).toContain('bossKey?:');
  });

  it('populates bossKey from bossDef.key', () => {
    expect(waveManagerSrc).toContain('bossKey:     bossDef?.key');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CutsceneScene — cleanup & edge-case structural tests
// ═════════════════════════════════════════════════════════════════════════════

describe('CutsceneScene cleanup (structural)', () => {
  it('_destroyPersistent destroys overlay, skipBtn, and skipLabel', () => {
    expect(cutsceneSceneSrc).toContain('_destroyPersistent');
    expect(cutsceneSceneSrc).toContain('this.overlay?.active');
    expect(cutsceneSceneSrc).toContain('this.skipBtn?.active');
    expect(cutsceneSceneSrc).toContain('this.skipLabel?.active');
  });

  it('finish() calls _destroyPersistent', () => {
    expect(cutsceneSceneSrc).toContain('this._destroyPersistent()');
    // Verify it's within the finish method context
    const finishMatch = cutsceneSceneSrc.match(/finish\(\)[\s\S]*?_destroyPersistent/);
    expect(finishMatch).toBeTruthy();
  });

  it('shutdown() calls _destroyPersistent', () => {
    // shutdown body should call _destroyPersistent
    const shutdownMatch = cutsceneSceneSrc.match(/shutdown\(\)[\s\S]{0,200}?_destroyPersistent/);
    expect(shutdownMatch).toBeTruthy();
  });

  it('showFrame exits via finish() when index is out of bounds', () => {
    expect(cutsceneSceneSrc).toContain('if (index >= this.cutscene.frames.length)');
    expect(cutsceneSceneSrc).toContain('this.finish()');
  });

  it('parseColor handles # prefix', () => {
    expect(cutsceneSceneSrc).toContain("str.startsWith('#')");
    expect(cutsceneSceneSrc).toContain('str.slice(1)');
  });

  it('parseColor has fallback for invalid hex', () => {
    expect(cutsceneSceneSrc).toContain('|| 0x0a1810');
  });

  it('overlay is interactive to capture taps', () => {
    expect(cutsceneSceneSrc).toContain('.setInteractive()');
    expect(cutsceneSceneSrc).toContain("this.overlay.on('pointerup'");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SaveManager — edge cases for cutscene tracking
// ═════════════════════════════════════════════════════════════════════════════

describe('SaveManager cutscene edge cases', () => {
  let storageMock2: ReturnType<typeof makeStoreMock>;

  beforeEach(() => {
    storageMock2 = makeStoreMock();
    vi.stubGlobal('localStorage', storageMock2);
    resetSingleton();
  });

  it('hasSeenCutscene returns false for empty string ID', () => {
    const sm = SaveManager.getInstance();
    expect(sm.hasSeenCutscene('')).toBe(false);
  });

  it('markCutsceneSeen can store an empty string ID without error', () => {
    const sm = SaveManager.getInstance();
    sm.markCutsceneSeen('');
    expect(sm.hasSeenCutscene('')).toBe(true);
  });

  it('handles seenCutsceneIds as non-array in corrupted save', () => {
    storageMock2.setItem('ojibwe-td-save', JSON.stringify({
      version: 1,
      seenCutsceneIds: 'not-an-array',
    }));
    resetSingleton();
    const sm = SaveManager.getInstance();
    expect(sm.getSeenCutsceneIds()).toEqual([]);
  });

  it('markCutsceneSeen initialises array if missing', () => {
    storageMock2.setItem('ojibwe-td-save', JSON.stringify({ version: 1 }));
    resetSingleton();
    const sm = SaveManager.getInstance();
    sm.markCutsceneSeen('test-id');
    expect(sm.hasSeenCutscene('test-id')).toBe(true);
  });

  it('multiple different cutscene IDs are all tracked independently', () => {
    const sm = SaveManager.getInstance();
    const ids = ['a', 'b', 'c', 'd', 'e'];
    for (const id of ids) sm.markCutsceneSeen(id);
    for (const id of ids) expect(sm.hasSeenCutscene(id)).toBe(true);
    expect(sm.getSeenCutsceneIds().length).toBe(5);
    expect(sm.hasSeenCutscene('f')).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// cutsceneDefs — additional boundary checks
// ═════════════════════════════════════════════════════════════════════════════

describe('cutsceneDefs boundary checks', () => {
  it('no cutscene has 0 frames', () => {
    for (const cs of ALL_CUTSCENES) {
      expect(cs.frames.length).toBeGreaterThan(0);
    }
  });

  it('all cutscene IDs follow naming convention (cutscene-*)', () => {
    for (const cs of ALL_CUTSCENES) {
      expect(cs.id).toMatch(/^cutscene-/);
    }
  });

  it('all frames with portraits have a speaker name', () => {
    for (const cs of ALL_CUTSCENES) {
      for (const frame of cs.frames) {
        if (frame.portrait) {
          expect(frame.speaker).toBeTruthy();
        }
      }
    }
  });

  it('no frame has negative auto-advance value', () => {
    for (const cs of ALL_CUTSCENES) {
      for (const frame of cs.frames) {
        if (frame.auto !== undefined) {
          expect(frame.auto).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('lookup helpers are idempotent across calls', () => {
    const id1 = getCutsceneDef('cutscene-intro');
    const id2 = getCutsceneDef('cutscene-intro');
    expect(id1).toBe(id2); // same reference (not a copy)
  });
});
