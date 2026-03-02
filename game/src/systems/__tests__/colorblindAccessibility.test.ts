/**
 * Colorblind Accessibility — TASK-062
 *
 * Tests cover:
 *  1. SaveManager — colorblindMode getter/setter/sanitization/persistence
 *  2. colorblindPalette — color selectors in normal vs colorblind mode
 *  3. WaveBanner — BADGE_LABEL contains shape icons (structural source check)
 *  4. BetweenWaveScene — BADGE_TEXT contains shape icons (structural source check)
 *  5. TowerPanel — domainLabel uses arrow symbols; domainSymbol present in panel
 *  6. GameScene — _placementIcon field, helper methods present (structural)
 *  7. AudioSettingsPanel — colorblind toggle row wired to SaveManager (structural)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SaveManager } from '../../meta/SaveManager';
import {
  isColorblindMode,
  cbPlacementValidFill,
  cbPlacementInvalidFill,
  cbValidAccent,
  cbInvalidAccent,
  cbGroundBadgeFill,
  cbBossBadgeFill,
  CB_VALID_FILL,
  CB_INVALID_FILL,
  CB_VALID_ACCENT,
  CB_INVALID_ACCENT,
  CB_GROUND_BADGE,
  CB_BOSS_BADGE,
} from '../../ui/colorblindPalette';
import { PAL } from '../../ui/palette';

// ── Source file imports for structural assertions ─────────────────────────────
import waveBannerSrc      from '../../ui/WaveBanner.ts?raw';
import betweenWaveSrc     from '../../scenes/BetweenWaveScene.ts?raw';
import towerPanelSrc      from '../../ui/TowerPanel.ts?raw';
import gameSceneSrc       from '../../scenes/GameScene.ts?raw';
import audioSettingsSrc   from '../../ui/AudioSettingsPanel.ts?raw';
import saveManagerSrc     from '../../meta/SaveManager.ts?raw';

// ── localStorage mock ─────────────────────────────────────────────────────────

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

const SAVE_KEY = 'ojibwe-td-save';

let storageMock: ReturnType<typeof makeStoreMock>;

beforeEach(() => {
  storageMock = makeStoreMock();
  vi.stubGlobal('localStorage', storageMock);
  resetSingleton();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetSingleton();
});

// ── 1. SaveManager — colorblindMode ──────────────────────────────────────────

describe('SaveManager — colorblindMode', () => {
  it('defaults to false', () => {
    expect(SaveManager.getInstance().getColorblindMode()).toBe(false);
  });

  it('setColorblindMode(true) persists true', () => {
    const sm = SaveManager.getInstance();
    sm.setColorblindMode(true);
    expect(sm.getColorblindMode()).toBe(true);
  });

  it('setColorblindMode(false) persists false after true', () => {
    const sm = SaveManager.getInstance();
    sm.setColorblindMode(true);
    sm.setColorblindMode(false);
    expect(sm.getColorblindMode()).toBe(false);
  });

  it('persists colorblindMode across singleton resets (round-trip)', () => {
    SaveManager.getInstance().setColorblindMode(true);
    resetSingleton();
    expect(SaveManager.getInstance().getColorblindMode()).toBe(true);
  });

  it('sanitizes non-boolean to false on load', () => {
    const raw = JSON.stringify({
      version: 1, currency: 0, unlocks: [], lastPlayedStage: 'zaagaiganing-01',
      audioMaster: 1, audioSfx: 1, audioMusic: 0.3, audioMuted: false,
      audioMusicMuted: false, audioSfxMuted: false,
      endlessRecords: {}, seenVignetteIds: [], unlockedCodexIds: [], readCodexIds: [],
      stageMoons: {}, gearData: { inventory: [], equipped: {} },
      commanderXp: { xp: {}, enhancementSlots: {} }, challengeWeek: '',
      pendingConsumables: { rerollTokens: 0, goldBoostTokens: 0, extraLifeTokens: 0 },
      colorblindMode: 'yes',  // invalid — should be coerced to false
    });
    storageMock.setItem(SAVE_KEY, raw);
    resetSingleton();
    expect(SaveManager.getInstance().getColorblindMode()).toBe(false);
  });

  it('SaveManager source declares colorblindMode field in SaveData', () => {
    expect(saveManagerSrc).toContain('colorblindMode: boolean');
  });

  it('SaveManager source has getColorblindMode() method', () => {
    expect(saveManagerSrc).toContain('getColorblindMode()');
  });

  it('SaveManager source has setColorblindMode() method', () => {
    expect(saveManagerSrc).toContain('setColorblindMode(');
  });
});

// ── 2. colorblindPalette — color selectors ───────────────────────────────────

describe('colorblindPalette — normal mode (colorblind OFF)', () => {
  beforeEach(() => {
    SaveManager.getInstance().setColorblindMode(false);
  });

  it('isColorblindMode() returns false', () => {
    expect(isColorblindMode()).toBe(false);
  });

  it('cbPlacementValidFill() returns PAL.bgPlacementValid', () => {
    expect(cbPlacementValidFill()).toBe(PAL.bgPlacementValid);
  });

  it('cbPlacementInvalidFill() returns PAL.bgPlacementInvalid', () => {
    expect(cbPlacementInvalidFill()).toBe(PAL.bgPlacementInvalid);
  });

  it('cbValidAccent() returns PAL.accentGreenN', () => {
    expect(cbValidAccent()).toBe(PAL.accentGreenN);
  });

  it('cbInvalidAccent() returns PAL.dangerN', () => {
    expect(cbInvalidAccent()).toBe(PAL.dangerN);
  });

  it('cbGroundBadgeFill() returns PAL.accentGreenN', () => {
    expect(cbGroundBadgeFill()).toBe(PAL.accentGreenN);
  });

  it('cbBossBadgeFill() returns PAL.bossWarningN', () => {
    expect(cbBossBadgeFill()).toBe(PAL.bossWarningN);
  });
});

describe('colorblindPalette — colorblind mode (colorblind ON)', () => {
  beforeEach(() => {
    SaveManager.getInstance().setColorblindMode(true);
  });

  it('isColorblindMode() returns true', () => {
    expect(isColorblindMode()).toBe(true);
  });

  it('cbPlacementValidFill() returns CB_VALID_FILL (blue, not green)', () => {
    expect(cbPlacementValidFill()).toBe(CB_VALID_FILL);
    // Must differ from normal green
    expect(cbPlacementValidFill()).not.toBe(PAL.bgPlacementValid);
  });

  it('cbPlacementInvalidFill() returns CB_INVALID_FILL (orange, not red)', () => {
    expect(cbPlacementInvalidFill()).toBe(CB_INVALID_FILL);
    expect(cbPlacementInvalidFill()).not.toBe(PAL.bgPlacementInvalid);
  });

  it('cbValidAccent() returns CB_VALID_ACCENT (blue)', () => {
    expect(cbValidAccent()).toBe(CB_VALID_ACCENT);
  });

  it('cbInvalidAccent() returns CB_INVALID_ACCENT (orange)', () => {
    expect(cbInvalidAccent()).toBe(CB_INVALID_ACCENT);
  });

  it('cbGroundBadgeFill() returns CB_GROUND_BADGE (steel blue)', () => {
    expect(cbGroundBadgeFill()).toBe(CB_GROUND_BADGE);
  });

  it('cbBossBadgeFill() returns CB_BOSS_BADGE (vivid orange)', () => {
    expect(cbBossBadgeFill()).toBe(CB_BOSS_BADGE);
  });

  it('CB_VALID_FILL and CB_INVALID_FILL are distinguishable in greyscale', () => {
    // Simple luminance check: blue (0x2255cc) and orange (0xdd7722) have
    // clearly different green-channel values (the dominant channel for greyscale).
    const validG  = (CB_VALID_FILL   >> 8) & 0xff;  // blue: ~0x55
    const invalidG = (CB_INVALID_FILL >> 8) & 0xff; // orange: ~0x77
    // Both must be valid hex colours
    expect(CB_VALID_FILL).toBeGreaterThanOrEqual(0);
    expect(CB_VALID_FILL).toBeLessThanOrEqual(0xffffff);
    expect(CB_INVALID_FILL).toBeGreaterThanOrEqual(0);
    expect(CB_INVALID_FILL).toBeLessThanOrEqual(0xffffff);
    // Green channel differs by > 5 counts (they are distinguishable)
    expect(Math.abs(validG - invalidG)).toBeGreaterThan(5);
  });
});

describe('colorblindPalette — mode toggles correctly', () => {
  it('switching mode mid-run reflects in next call', () => {
    SaveManager.getInstance().setColorblindMode(false);
    expect(cbPlacementValidFill()).toBe(PAL.bgPlacementValid);

    SaveManager.getInstance().setColorblindMode(true);
    expect(cbPlacementValidFill()).toBe(CB_VALID_FILL);

    SaveManager.getInstance().setColorblindMode(false);
    expect(cbPlacementValidFill()).toBe(PAL.bgPlacementValid);
  });
});

// ── 3. WaveBanner — badge icons ───────────────────────────────────────────────

describe('WaveBanner — wave-type badge icons (non-colour indicators)', () => {
  it('ground badge label contains mountain icon ⛰', () => {
    expect(waveBannerSrc).toContain('⛰');
  });

  it('air badge label contains aircraft icon ✈', () => {
    expect(waveBannerSrc).toContain('✈');
  });

  it('mixed badge label contains both ⛰ and ✈', () => {
    expect(waveBannerSrc).toContain('⛰✈');
  });

  it('boss badge label contains skull icon ☠', () => {
    expect(waveBannerSrc).toContain('☠');
  });

  it('badge labels are defined for all 4 wave types', () => {
    expect(waveBannerSrc).toContain("ground:");
    expect(waveBannerSrc).toContain("air:");
    expect(waveBannerSrc).toContain("mixed:");
    expect(waveBannerSrc).toContain("boss:");
  });

  it('uses cbGroundBadgeFill() for ground badge (colorblind-aware)', () => {
    expect(waveBannerSrc).toContain('cbGroundBadgeFill()');
  });

  it('uses cbBossBadgeFill() for boss badge (colorblind-aware)', () => {
    expect(waveBannerSrc).toContain('cbBossBadgeFill()');
  });
});

// ── 4. BetweenWaveScene — badge icons ────────────────────────────────────────

describe('BetweenWaveScene — wave-type badge icons (non-colour indicators)', () => {
  it('ground badge text contains mountain icon ⛰', () => {
    expect(betweenWaveSrc).toContain('⛰');
  });

  it('air badge text contains aircraft icon ✈', () => {
    expect(betweenWaveSrc).toContain('✈');
  });

  it('mixed badge text contains both ⛰ and ✈', () => {
    expect(betweenWaveSrc).toContain('⛰✈');
  });

  it('boss badge text contains skull icon ☠', () => {
    expect(betweenWaveSrc).toContain('☠');
  });

  it('boss badge uses larger text size', () => {
    // Structural: boss badge has a font-size branch
    expect(betweenWaveSrc).toContain("waveType === 'boss'");
  });

  it('uses cbGroundBadgeFill() for ground badge fill', () => {
    expect(betweenWaveSrc).toContain('cbGroundBadgeFill()');
  });

  it('uses cbBossBadgeFill() for boss badge fill', () => {
    expect(betweenWaveSrc).toContain('cbBossBadgeFill()');
  });
});

// ── 5. TowerPanel — domain indicators ────────────────────────────────────────

describe('TowerPanel — domain indicators', () => {
  it('domainLabel uses ▼ for ground-only towers', () => {
    expect(towerPanelSrc).toContain("'▼ Ground only'");
  });

  it('domainLabel uses ▲ for air-only towers', () => {
    expect(towerPanelSrc).toContain("'▲ Air only'");
  });

  it('domainLabel uses ⇅ for all-domain towers (not ◆)', () => {
    expect(towerPanelSrc).toContain('⇅');
    expect(towerPanelSrc).not.toContain("'◆ Air & Ground'");
  });

  it('domainSymbol() function is defined for panel buttons', () => {
    expect(towerPanelSrc).toContain('domainSymbol(');
  });

  it('panel buttons show domain symbol (▼/▲/⇅)', () => {
    // The domainSymbol() call should appear in the button-building loop
    expect(towerPanelSrc).toContain('domainSymbol(def.targetDomain)');
  });

  it('tooltip domain row uses domainColor() function', () => {
    expect(towerPanelSrc).toContain('domainColor(def.targetDomain)');
  });

  it('air towers get blue domain color (#88ccff)', () => {
    expect(towerPanelSrc).toContain('#88ccff');
  });
});

// ── 6. GameScene — placement non-colour indicators ───────────────────────────

describe('GameScene — placement preview non-colour indicators', () => {
  it('declares _placementIcon Graphics field', () => {
    expect(gameSceneSrc).toContain('_placementIcon');
  });

  it('initialises _placementIcon in create()', () => {
    expect(gameSceneSrc).toContain('_placementIcon = this.add.graphics()');
  });

  it('shows _placementIcon in enterPlacementMode', () => {
    expect(gameSceneSrc).toContain('_placementIcon.setVisible(true)');
  });

  it('hides _placementIcon in exitPlacementMode', () => {
    expect(gameSceneSrc).toContain('_placementIcon.setVisible(false)');
  });

  it('has _drawDashedRect helper for invalid placement border', () => {
    expect(gameSceneSrc).toContain('_drawDashedRect(');
  });

  it('has _drawPlacementCheckmark helper for valid indicator', () => {
    expect(gameSceneSrc).toContain('_drawPlacementCheckmark(');
  });

  it('has _drawPlacementXMark helper for invalid indicator', () => {
    expect(gameSceneSrc).toContain('_drawPlacementXMark(');
  });

  it('uses cbPlacementValidFill() — colorblind-aware fill for valid tiles', () => {
    expect(gameSceneSrc).toContain('cbPlacementValidFill()');
  });

  it('uses cbPlacementInvalidFill() — colorblind-aware fill for invalid tiles', () => {
    expect(gameSceneSrc).toContain('cbPlacementInvalidFill()');
  });

  it('uses cbValidAccent() for range preview and border color', () => {
    expect(gameSceneSrc).toContain('cbValidAccent()');
  });

  it('uses cbInvalidAccent() for range preview and border color', () => {
    expect(gameSceneSrc).toContain('cbInvalidAccent()');
  });
});

// ── 7. AudioSettingsPanel — colorblind toggle ─────────────────────────────────

describe('AudioSettingsPanel — colorblind mode toggle', () => {
  it('imports SaveManager', () => {
    expect(audioSettingsSrc).toContain("from '../meta/SaveManager'");
  });

  it('has COLORBLIND MODE label text', () => {
    expect(audioSettingsSrc).toContain('COLORBLIND MODE');
  });

  it('calls SaveManager.getInstance().getColorblindMode()', () => {
    expect(audioSettingsSrc).toContain('getColorblindMode()');
  });

  it('calls SaveManager.getInstance().setColorblindMode()', () => {
    expect(audioSettingsSrc).toContain('setColorblindMode(');
  });

  it('has _cbText() helper method', () => {
    expect(audioSettingsSrc).toContain('_cbText(');
  });
});

// ── Arithmetic: placement valid/invalid color difference ──────────────────────

describe('Placement color arithmetic', () => {
  it('normal mode valid is a green-dominant colour (green channel > blue)', () => {
    const g = (PAL.bgPlacementValid >> 8) & 0xff;
    const b = PAL.bgPlacementValid & 0xff;
    expect(g).toBeGreaterThan(b);
  });

  it('normal mode invalid is a red-dominant colour (red channel > green)', () => {
    const r = (PAL.bgPlacementInvalid >> 16) & 0xff;
    const g = (PAL.bgPlacementInvalid >> 8) & 0xff;
    expect(r).toBeGreaterThan(g);
  });

  it('CB valid fill is a blue-dominant colour (blue channel > red)', () => {
    const r = (CB_VALID_FILL >> 16) & 0xff;
    const b = CB_VALID_FILL & 0xff;
    expect(b).toBeGreaterThan(r);
  });

  it('CB invalid fill is an orange-dominant colour (red > blue)', () => {
    const r = (CB_INVALID_FILL >> 16) & 0xff;
    const b = CB_INVALID_FILL & 0xff;
    expect(r).toBeGreaterThan(b);
  });

  it('normal valid and invalid fills are clearly different hues', () => {
    expect(PAL.bgPlacementValid).not.toBe(PAL.bgPlacementInvalid);
  });

  it('CB valid and CB invalid fills are clearly different hues', () => {
    expect(CB_VALID_FILL).not.toBe(CB_INVALID_FILL);
  });
});
