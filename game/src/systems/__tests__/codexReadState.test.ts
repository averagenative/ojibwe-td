/**
 * Codex read/unread state tests — verifies that SaveManager tracks
 * which codex entries have been viewed and computes unread counts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SaveManager } from '../../meta/SaveManager';

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

// Minimal codex entry stubs for getUnreadCodexCount
const ENTRIES = [
  { id: 'entry-a', defaultUnlocked: true },
  { id: 'entry-b', defaultUnlocked: false },
  { id: 'entry-c', defaultUnlocked: false },
  { id: 'entry-d', defaultUnlocked: true },
];

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SaveManager — codex read/unread state', () => {
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
      readCodexIds: [],
      stageMoons: {},
      gearData: { inventory: [], equipped: {} },
      commanderXp: { xp: {}, enhancementSlots: {} },
      challengeWeek: '',
    };
    storageMock.setItem(SAVE_KEY, JSON.stringify({ ...base, ...overrides }));
  }

  // ── isCodexRead / markCodexRead ──────────────────────────────────────────

  it('returns false for entries that have not been read', () => {
    const sm = SaveManager.getInstance();
    expect(sm.isCodexRead('entry-a')).toBe(false);
  });

  it('marks a codex entry as read', () => {
    const sm = SaveManager.getInstance();
    sm.markCodexRead('entry-a');
    expect(sm.isCodexRead('entry-a')).toBe(true);
  });

  it('markCodexRead is idempotent', () => {
    const sm = SaveManager.getInstance();
    sm.markCodexRead('entry-a');
    sm.markCodexRead('entry-a');
    expect(sm.getReadCodexIds()).toEqual(['entry-a']);
  });

  it('persists read state across singleton resets', () => {
    const sm1 = SaveManager.getInstance();
    sm1.markCodexRead('entry-b');
    resetSingleton();
    const sm2 = SaveManager.getInstance();
    expect(sm2.isCodexRead('entry-b')).toBe(true);
  });

  // ── getReadCodexIds ──────────────────────────────────────────────────────

  it('returns empty array when no entries are read', () => {
    const sm = SaveManager.getInstance();
    expect(sm.getReadCodexIds()).toEqual([]);
  });

  it('returns all read entry IDs', () => {
    const sm = SaveManager.getInstance();
    sm.markCodexRead('entry-a');
    sm.markCodexRead('entry-c');
    expect(sm.getReadCodexIds()).toEqual(['entry-a', 'entry-c']);
  });

  // ── markAllCodexRead ─────────────────────────────────────────────────────

  it('marks all given IDs as read', () => {
    const sm = SaveManager.getInstance();
    sm.markAllCodexRead(['entry-a', 'entry-b', 'entry-c']);
    expect(sm.isCodexRead('entry-a')).toBe(true);
    expect(sm.isCodexRead('entry-b')).toBe(true);
    expect(sm.isCodexRead('entry-c')).toBe(true);
  });

  it('markAllCodexRead does not duplicate existing entries', () => {
    const sm = SaveManager.getInstance();
    sm.markCodexRead('entry-a');
    sm.markAllCodexRead(['entry-a', 'entry-b']);
    expect(sm.getReadCodexIds()).toEqual(['entry-a', 'entry-b']);
  });

  // ── getUnreadCodexCount ──────────────────────────────────────────────────

  it('counts default-unlocked entries as unread when not read', () => {
    const sm = SaveManager.getInstance();
    // entry-a and entry-d are defaultUnlocked, none are read
    expect(sm.getUnreadCodexCount(ENTRIES)).toBe(2);
  });

  it('counts explicitly unlocked entries as unread', () => {
    const sm = SaveManager.getInstance();
    sm.unlockCodexEntry('entry-b');
    // 2 default-unlocked + 1 explicitly unlocked = 3 unread
    expect(sm.getUnreadCodexCount(ENTRIES)).toBe(3);
  });

  it('excludes read entries from unread count', () => {
    const sm = SaveManager.getInstance();
    sm.unlockCodexEntry('entry-b');
    sm.markCodexRead('entry-a');
    sm.markCodexRead('entry-b');
    // entry-d is still unread (default-unlocked)
    expect(sm.getUnreadCodexCount(ENTRIES)).toBe(1);
  });

  it('returns 0 when all entries are read', () => {
    const sm = SaveManager.getInstance();
    sm.unlockCodexEntry('entry-b');
    sm.unlockCodexEntry('entry-c');
    sm.markAllCodexRead(['entry-a', 'entry-b', 'entry-c', 'entry-d']);
    expect(sm.getUnreadCodexCount(ENTRIES)).toBe(0);
  });

  it('badge disappears when all unlocked entries are read', () => {
    const sm = SaveManager.getInstance();
    // Only default entries unlocked, mark them read
    sm.markCodexRead('entry-a');
    sm.markCodexRead('entry-d');
    expect(sm.getUnreadCodexCount(ENTRIES)).toBe(0);
  });

  // ── Sanitization ─────────────────────────────────────────────────────────

  it('sanitizes readCodexIds — filters non-string elements', () => {
    seedRaw({ readCodexIds: ['valid', 42, null, 'also-valid'] });
    const sm = SaveManager.getInstance();
    expect(sm.getReadCodexIds()).toEqual(['valid', 'also-valid']);
  });

  it('defaults non-array readCodexIds to empty', () => {
    seedRaw({ readCodexIds: 'not-an-array' });
    const sm = SaveManager.getInstance();
    expect(sm.getReadCodexIds()).toEqual([]);
  });

  it('back-fills missing readCodexIds for old saves', () => {
    // Simulate an old save without readCodexIds
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
      unlockedCodexIds: ['entry-a'],
      stageMoons: {},
      gearData: { inventory: [], equipped: {} },
      commanderXp: { xp: {}, enhancementSlots: {} },
      challengeWeek: '',
    };
    storageMock.setItem(SAVE_KEY, JSON.stringify(base));
    const sm = SaveManager.getInstance();
    expect(sm.getReadCodexIds()).toEqual([]);
    expect(sm.isCodexUnlocked('entry-a')).toBe(true);
  });

  // ── Newly unlocked entries start as unread ──────────────────────────────

  it('newly unlocked entries start as unread', () => {
    const sm = SaveManager.getInstance();
    sm.markCodexRead('entry-a');
    sm.markCodexRead('entry-d');
    expect(sm.getUnreadCodexCount(ENTRIES)).toBe(0);

    // Unlock a new entry — should increment unread
    sm.unlockCodexEntry('entry-b');
    expect(sm.getUnreadCodexCount(ENTRIES)).toBe(1);
  });
});
