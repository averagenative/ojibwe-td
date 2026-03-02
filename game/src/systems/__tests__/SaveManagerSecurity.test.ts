/**
 * SaveManager security tests — tamper detection, sanitization, and checksum.
 *
 * localStorage is mocked via vi.stubGlobal so these tests run in jsdom.
 * The SaveManager singleton is reset between tests by nulling the private
 * static field via a TS cast.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SaveManager, MAX_CURRENCY } from '../../meta/SaveManager';

// ── localStorage mock ──────────────────────────────────────────────────────────

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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SaveManager — security & sanitization', () => {
  let storageMock: ReturnType<typeof makeStoreMock>;

  beforeEach(() => {
    storageMock = makeStoreMock();
    vi.stubGlobal('localStorage', storageMock);
    resetSingleton();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetSingleton();
  });

  // ── Helper: seed localStorage with raw JSON, bypassing SaveManager ─────────
  function seedRaw(overrides: Record<string, unknown>) {
    const base = {
      version: 1,
      currency: 0,
      unlocks: [],
      lastPlayedStage: 'zaagaiganing-01',
      audioMaster: 1,
      audioSfx: 1,
      audioMusic: 0.3,
      audioMuted: false,
      endlessRecords: {},
      seenVignetteIds: [],
      unlockedCodexIds: [],
      stageMoons: {},
      gearData: { inventory: [], equipped: {} },
      commanderXp: { xp: {}, enhancementSlots: {} },
      challengeWeek: '',
    };
    const merged = { ...base, ...overrides };
    storageMock.setItem(SAVE_KEY, JSON.stringify(merged));
  }

  // ── Helper: get the raw save JSON from storage ─────────────────────────────
  function readRaw(): Record<string, unknown> {
    const raw = storageMock.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  // ── Checksum ───────────────────────────────────────────────────────────────

  describe('checksum / tamper detection', () => {
    it('writes a _checksum field to localStorage on save', () => {
      const sm = SaveManager.getInstance();
      sm.addCurrency(10);
      const saved = readRaw();
      expect(saved._checksum).toBeDefined();
      expect(typeof saved._checksum).toBe('string');
      expect((saved._checksum as string).length).toBe(8);
    });

    it('loads without warning when checksum matches', () => {
      // Let SaveManager write a valid save
      const sm1 = SaveManager.getInstance();
      sm1.addCurrency(50);
      expect(sm1.lastWarning).toBeNull();

      // Reload
      resetSingleton();
      const sm2 = SaveManager.getInstance();
      expect(sm2.getCurrency()).toBe(50);
      expect(sm2.lastWarning).toBeNull();
    });

    it('sets lastWarning when checksum is tampered', () => {
      const sm1 = SaveManager.getInstance();
      sm1.addCurrency(50);

      // Tamper: change currency without updating checksum
      const raw = readRaw();
      raw.currency = 9999;
      storageMock.setItem(SAVE_KEY, JSON.stringify(raw));

      resetSingleton();
      const sm2 = SaveManager.getInstance();
      expect(sm2.lastWarning).toBe(
        'Save data appears to have been modified outside the game.',
      );
      // Data still loads (clamped, but not reset)
      expect(sm2.getCurrency()).toBe(9999);
    });

    it('loads without warning when _checksum field is absent (backward compat)', () => {
      seedRaw({ currency: 100 }); // no _checksum field
      const sm = SaveManager.getInstance();
      expect(sm.getCurrency()).toBe(100);
      expect(sm.lastWarning).toBeNull();
    });

    it('detects invalid checksum type gracefully', () => {
      seedRaw({ currency: 50, _checksum: 12345 });
      resetSingleton();
      const sm = SaveManager.getInstance();
      // Non-string _checksum still triggers a mismatch
      expect(sm.lastWarning).toBe(
        'Save data appears to have been modified outside the game.',
      );
    });
  });

  // ── Currency sanitization ──────────────────────────────────────────────────

  describe('currency sanitization', () => {
    it('clamps currency above MAX_CURRENCY', () => {
      seedRaw({ currency: 2_000_000 });
      const sm = SaveManager.getInstance();
      expect(sm.getCurrency()).toBe(MAX_CURRENCY);
    });

    it('clamps negative currency to 0', () => {
      seedRaw({ currency: -500 });
      const sm = SaveManager.getInstance();
      expect(sm.getCurrency()).toBe(0);
    });

    it('floors fractional currency to integer', () => {
      seedRaw({ currency: 99.7 });
      const sm = SaveManager.getInstance();
      expect(sm.getCurrency()).toBe(99);
    });

    it('defaults non-number currency to 0', () => {
      seedRaw({ currency: 'lots' });
      const sm = SaveManager.getInstance();
      expect(sm.getCurrency()).toBe(0);
    });

    it('defaults null currency to 0 (NaN/Infinity serialize as null in JSON)', () => {
      seedRaw({ currency: null });
      const sm = SaveManager.getInstance();
      expect(sm.getCurrency()).toBe(0);
    });
  });

  // ── Unlocks sanitization ───────────────────────────────────────────────────

  describe('unlocks sanitization', () => {
    it('preserves valid string unlocks', () => {
      seedRaw({ unlocks: ['unlock-mortar', 'unlock-tesla'] });
      const sm = SaveManager.getInstance();
      expect(sm.isUnlocked('unlock-mortar')).toBe(true);
      expect(sm.isUnlocked('unlock-tesla')).toBe(true);
    });

    it('filters non-string elements from unlocks', () => {
      seedRaw({ unlocks: ['valid', 42, null, true, 'also-valid'] });
      const sm = SaveManager.getInstance();
      expect(sm.isUnlocked('valid')).toBe(true);
      expect(sm.isUnlocked('also-valid')).toBe(true);
    });

    it('defaults non-array unlocks to empty array', () => {
      seedRaw({ unlocks: 'not-an-array' });
      const sm = SaveManager.getInstance();
      expect(sm.isUnlocked('anything')).toBe(false);
    });
  });

  // ── Audio sanitization ─────────────────────────────────────────────────────

  describe('audio settings sanitization', () => {
    it('clamps audio volumes to [0, 1]', () => {
      seedRaw({ audioMaster: 5.0, audioSfx: -2.0, audioMusic: 1.5 });
      const sm = SaveManager.getInstance();
      const a = sm.getAudioSettings();
      expect(a.master).toBe(1);
      expect(a.sfx).toBe(0);
      expect(a.music).toBe(1);
    });

    it('defaults non-number audio to default values', () => {
      seedRaw({ audioMaster: 'loud', audioSfx: null, audioMusic: undefined });
      const sm = SaveManager.getInstance();
      const a = sm.getAudioSettings();
      expect(a.master).toBe(1);     // default
      expect(a.sfx).toBe(1);        // default
      expect(a.music).toBe(0.3);    // default
    });

    it('coerces non-boolean audioMuted to false', () => {
      seedRaw({ audioMuted: 'yes' });
      const sm = SaveManager.getInstance();
      expect(sm.getAudioSettings().muted).toBe(false);
    });

    it('defaults null audio volumes to defaults (NaN serializes as null)', () => {
      seedRaw({ audioMaster: null, audioSfx: null, audioMusic: null });
      const sm = SaveManager.getInstance();
      const a = sm.getAudioSettings();
      expect(a.master).toBe(1);
      expect(a.sfx).toBe(1);
      expect(a.music).toBe(0.3);
    });
  });

  // ── Stage moons sanitization ───────────────────────────────────────────────

  describe('stageMoons sanitization', () => {
    it('preserves valid moon ratings 1-5', () => {
      seedRaw({ stageMoons: { 'stage-01': 3, 'stage-02': 5 } });
      const sm = SaveManager.getInstance();
      expect(sm.getStageMoons('stage-01')).toBe(3);
      expect(sm.getStageMoons('stage-02')).toBe(5);
    });

    it('discards moon ratings outside 1-5', () => {
      seedRaw({ stageMoons: { 'stage-01': 0, 'stage-02': 6, 'stage-03': -1 } });
      const sm = SaveManager.getInstance();
      expect(sm.getStageMoons('stage-01')).toBe(0); // not found → default 0
      expect(sm.getStageMoons('stage-02')).toBe(0);
      expect(sm.getStageMoons('stage-03')).toBe(0);
    });

    it('floors fractional moon ratings', () => {
      seedRaw({ stageMoons: { 'stage-01': 3.9 } });
      const sm = SaveManager.getInstance();
      expect(sm.getStageMoons('stage-01')).toBe(3);
    });

    it('handles non-object stageMoons', () => {
      seedRaw({ stageMoons: 'bad' });
      const sm = SaveManager.getInstance();
      expect(sm.getStageMoons('anything')).toBe(0);
    });
  });

  // ── Endless records sanitization ───────────────────────────────────────────

  describe('endlessRecords sanitization', () => {
    it('preserves valid non-negative records', () => {
      seedRaw({ endlessRecords: { 'map-01': 25 } });
      const sm = SaveManager.getInstance();
      expect(sm.getEndlessRecord('map-01')).toBe(25);
    });

    it('discards negative records', () => {
      seedRaw({ endlessRecords: { 'map-01': -5 } });
      const sm = SaveManager.getInstance();
      expect(sm.getEndlessRecord('map-01')).toBe(0);
    });

    it('floors fractional records', () => {
      seedRaw({ endlessRecords: { 'map-01': 12.8 } });
      const sm = SaveManager.getInstance();
      expect(sm.getEndlessRecord('map-01')).toBe(12);
    });
  });

  // ── String array fields sanitization ───────────────────────────────────────

  describe('seenVignetteIds sanitization', () => {
    it('preserves valid string vignette IDs', () => {
      seedRaw({ seenVignetteIds: ['intro', 'chapter-1'] });
      const sm = SaveManager.getInstance();
      expect(sm.hasSeenVignette('intro')).toBe(true);
      expect(sm.hasSeenVignette('chapter-1')).toBe(true);
    });

    it('filters non-string elements', () => {
      seedRaw({ seenVignetteIds: ['valid', 42, null, 'also-valid'] });
      const sm = SaveManager.getInstance();
      expect(sm.getSeenVignetteIds()).toEqual(['valid', 'also-valid']);
    });

    it('defaults non-array to empty', () => {
      seedRaw({ seenVignetteIds: 'nope' });
      const sm = SaveManager.getInstance();
      expect(sm.getSeenVignetteIds()).toEqual([]);
    });
  });

  describe('unlockedCodexIds sanitization', () => {
    it('preserves valid string codex IDs', () => {
      seedRaw({ unlockedCodexIds: ['entry-a', 'entry-b'] });
      const sm = SaveManager.getInstance();
      expect(sm.isCodexUnlocked('entry-a')).toBe(true);
    });

    it('filters non-string elements', () => {
      seedRaw({ unlockedCodexIds: ['valid', 123, false] });
      const sm = SaveManager.getInstance();
      expect(sm.getUnlockedCodexIds()).toEqual(['valid']);
    });
  });

  // ── String field sanitization ──────────────────────────────────────────────

  describe('lastPlayedStage sanitization', () => {
    it('preserves valid string', () => {
      seedRaw({ lastPlayedStage: 'custom-stage' });
      const sm = SaveManager.getInstance();
      expect(sm.getLastPlayedStage()).toBe('custom-stage');
    });

    it('defaults non-string to default stage', () => {
      seedRaw({ lastPlayedStage: 42 });
      const sm = SaveManager.getInstance();
      expect(sm.getLastPlayedStage()).toBe('zaagaiganing-01');
    });
  });

  describe('challengeWeek sanitization', () => {
    it('preserves valid string', () => {
      seedRaw({ challengeWeek: 'week-2026-09' });
      const sm = SaveManager.getInstance();
      expect(sm.getChallengeWeek()).toBe('week-2026-09');
    });

    it('defaults non-string to empty', () => {
      seedRaw({ challengeWeek: 999 });
      const sm = SaveManager.getInstance();
      expect(sm.getChallengeWeek()).toBe('');
    });
  });

  // ── Malformed JSON ─────────────────────────────────────────────────────────

  describe('malformed data handling', () => {
    it('resets to defaults on malformed JSON', () => {
      storageMock.setItem(SAVE_KEY, '{not valid json!!!');
      const sm = SaveManager.getInstance();
      expect(sm.getCurrency()).toBe(0);
      expect(sm.lastWarning).toBeNull();
    });

    it('resets on schema version mismatch', () => {
      seedRaw({ version: 999, currency: 500 });
      const sm = SaveManager.getInstance();
      expect(sm.getCurrency()).toBe(0);
      expect(sm.lastWarning).toBe(
        'Save data was from an older version and has been reset.',
      );
    });

    it('loads correctly when no save exists', () => {
      const sm = SaveManager.getInstance();
      expect(sm.getCurrency()).toBe(0);
      expect(sm.lastWarning).toBeNull();
    });
  });

  // ── Roundtrip: save then reload ────────────────────────────────────────────

  describe('save/load roundtrip', () => {
    it('survives a full roundtrip with valid checksum', () => {
      const sm1 = SaveManager.getInstance();
      sm1.addCurrency(250);
      sm1.purchaseUnlock('unlock-mortar', 100);
      sm1.setStageMoons('stage-01', 4);
      sm1.updateEndlessRecord('map-01', 15);

      resetSingleton();
      const sm2 = SaveManager.getInstance();
      expect(sm2.getCurrency()).toBe(150);
      expect(sm2.isUnlocked('unlock-mortar')).toBe(true);
      expect(sm2.getStageMoons('stage-01')).toBe(4);
      expect(sm2.getEndlessRecord('map-01')).toBe(15);
      expect(sm2.lastWarning).toBeNull();
    });

    it('checksum changes when data changes', () => {
      const sm1 = SaveManager.getInstance();
      sm1.addCurrency(10);
      const cs1 = readRaw()._checksum;

      sm1.addCurrency(10);
      const cs2 = readRaw()._checksum;

      expect(cs1).not.toBe(cs2);
    });
  });

  // ── MAX_CURRENCY export ────────────────────────────────────────────────────

  describe('MAX_CURRENCY constant', () => {
    it('is exported and equals 999_999', () => {
      expect(MAX_CURRENCY).toBe(999_999);
    });
  });
});
