/**
 * SessionManager unit tests.
 *
 * sessionStorage is mocked via vi.stubGlobal so these tests run in jsdom
 * without a real browser storage API.  The SessionManager singleton is reset
 * between tests by directly nulling the private static field via a TS cast.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionManager, AUTOSAVE_EXPIRY_MS } from '../SessionManager';
import type { AutoSave } from '../SessionManager';

// ── sessionStorage mock ────────────────────────────────────────────────────────

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
  (SessionManager as unknown as { _instance: null })._instance = null;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeSave(overrides: Partial<AutoSave> = {}): Omit<AutoSave, 'version' | 'timestamp'> {
  return {
    mapId:           'map-01',
    stageId:         'zaagaiganing-01',
    commanderId:     'nokomis',
    currentWave:     5,
    gold:            350,
    lives:           18,
    totalKills:      42,
    goldEarned:      900,
    towers:          [
      { key: 'rock-hurler', col: 3, row: 4, upgrades: { A: 2, B: 1, C: 0 }, totalSpent: 150 },
    ],
    offers:          ['gold-rush', 'veteran-arms'],
    consumedOffers:  [],
    metaStatBonuses: {},
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SessionManager', () => {
  let storageMock: ReturnType<typeof makeStoreMock>;

  beforeEach(() => {
    storageMock = makeStoreMock();
    vi.stubGlobal('sessionStorage', storageMock);
    resetSingleton();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetSingleton();
  });

  // ── Availability ────────────────────────────────────────────────────────────

  it('reports storage as available when sessionStorage works', () => {
    const mgr = SessionManager.getInstance();
    expect(mgr.isAvailable()).toBe(true);
  });

  it('reports storage unavailable when sessionStorage throws', () => {
    const throwing = {
      ...storageMock,
      setItem: () => { throw new Error('QuotaExceededError'); },
    };
    vi.stubGlobal('sessionStorage', throwing);
    resetSingleton();
    const mgr = SessionManager.getInstance();
    expect(mgr.isAvailable()).toBe(false);
  });

  // ── save → load round-trip ──────────────────────────────────────────────────

  it('saves and loads a valid snapshot', () => {
    const mgr  = SessionManager.getInstance();
    const data = makeSave();
    mgr.save(data);

    const loaded = mgr.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.stageId).toBe('zaagaiganing-01');
    expect(loaded!.currentWave).toBe(5);
    expect(loaded!.gold).toBe(350);
    expect(loaded!.towers).toHaveLength(1);
    expect(loaded!.offers).toEqual(['gold-rush', 'veteran-arms']);
  });

  it('stamps version and timestamp on save', () => {
    const mgr  = SessionManager.getInstance();
    const before = Date.now();
    mgr.save(makeSave());
    const after = Date.now();

    const loaded = mgr.load();
    expect(loaded!.version).toBe(1);
    expect(loaded!.timestamp).toBeGreaterThanOrEqual(before);
    expect(loaded!.timestamp).toBeLessThanOrEqual(after);
  });

  // ── expiry ──────────────────────────────────────────────────────────────────

  it('returns null for a save older than 30 minutes', () => {
    const mgr = SessionManager.getInstance();
    mgr.save(makeSave());

    // Backdate the stored timestamp.
    const raw = storageMock.getItem('ojibwe-td-autosave')!;
    const parsed = JSON.parse(raw) as AutoSave;
    parsed.timestamp = Date.now() - AUTOSAVE_EXPIRY_MS - 1000;
    storageMock.setItem('ojibwe-td-autosave', JSON.stringify(parsed));

    expect(mgr.load()).toBeNull();
    // Expired save should be cleaned up.
    expect(storageMock.getItem('ojibwe-td-autosave')).toBeNull();
  });

  it('accepts a save just within the 30-minute window', () => {
    const mgr = SessionManager.getInstance();
    mgr.save(makeSave());

    const raw = storageMock.getItem('ojibwe-td-autosave')!;
    const parsed = JSON.parse(raw) as AutoSave;
    parsed.timestamp = Date.now() - AUTOSAVE_EXPIRY_MS + 5000;
    storageMock.setItem('ojibwe-td-autosave', JSON.stringify(parsed));

    expect(mgr.load()).not.toBeNull();
  });

  // ── version mismatch ────────────────────────────────────────────────────────

  it('returns null and clears the save when version does not match', () => {
    const mgr = SessionManager.getInstance();
    mgr.save(makeSave());

    const raw = storageMock.getItem('ojibwe-td-autosave')!;
    const parsed = JSON.parse(raw) as AutoSave;
    parsed.version = 99;
    storageMock.setItem('ojibwe-td-autosave', JSON.stringify(parsed));

    expect(mgr.load()).toBeNull();
    expect(storageMock.getItem('ojibwe-td-autosave')).toBeNull();
  });

  // ── clear ──────────────────────────────────────────────────────────────────

  it('clear() removes the saved key', () => {
    const mgr = SessionManager.getInstance();
    mgr.save(makeSave());
    expect(mgr.load()).not.toBeNull();

    mgr.clear();
    expect(mgr.load()).toBeNull();
    expect(storageMock.getItem('ojibwe-td-autosave')).toBeNull();
  });

  it('clear() is a no-op when nothing is saved', () => {
    const mgr = SessionManager.getInstance();
    expect(() => mgr.clear()).not.toThrow();
  });

  // ── malformed JSON ──────────────────────────────────────────────────────────

  it('returns null on malformed JSON without throwing', () => {
    const mgr = SessionManager.getInstance();
    storageMock.setItem('ojibwe-td-autosave', '{not valid json');

    expect(mgr.load()).toBeNull();
  });

  // ── missing key ────────────────────────────────────────────────────────────

  it('returns null when no save exists', () => {
    const mgr = SessionManager.getInstance();
    expect(mgr.load()).toBeNull();
  });

  // ── quota error on save ─────────────────────────────────────────────────────

  it('silently ignores quota errors on save', () => {
    const quota = {
      ...storageMock,
      setItem: (key: string, _val: string) => {
        if (key === 'ojibwe-td-autosave') throw new Error('QuotaExceededError');
        // allow test-key write (needed for _testStorage during init)
        storageMock.setItem(key, _val);
      },
      getItem: storageMock.getItem.bind(storageMock),
      removeItem: storageMock.removeItem.bind(storageMock),
    };
    vi.stubGlobal('sessionStorage', quota);
    resetSingleton();
    const mgr = SessionManager.getInstance();

    // Should not throw even when setItem fails.
    expect(() => mgr.save(makeSave())).not.toThrow();
  });

  // ── singleton ──────────────────────────────────────────────────────────────

  it('returns the same instance on repeated calls', () => {
    const a = SessionManager.getInstance();
    const b = SessionManager.getInstance();
    expect(a).toBe(b);
  });

  // ── tower data integrity ────────────────────────────────────────────────────

  it('preserves tower upgrade tiers through save/load cycle', () => {
    const mgr = SessionManager.getInstance();
    mgr.save(makeSave({
      towers: [
        { key: 'frost', col: 1, row: 2, upgrades: { A: 3, B: 0, C: 1 }, totalSpent: 200 },
        { key: 'tesla', col: 5, row: 6, upgrades: { A: 0, B: 5, C: 0 }, totalSpent: 450 },
      ],
    }));

    const loaded = mgr.load()!;
    expect(loaded.towers).toHaveLength(2);
    expect(loaded.towers[0].key).toBe('frost');
    expect(loaded.towers[0].upgrades.A).toBe(3);
    expect(loaded.towers[0].upgrades.C).toBe(1);
    expect(loaded.towers[1].upgrades.B).toBe(5);
  });

  // ── consumed offers ─────────────────────────────────────────────────────────

  it('preserves consumedOffers list through save/load cycle', () => {
    const mgr = SessionManager.getInstance();
    mgr.save(makeSave({ consumedOffers: ['salvage'] }));

    const loaded = mgr.load()!;
    expect(loaded.consumedOffers).toContain('salvage');
  });

  // ── empty towers ────────────────────────────────────────────────────────────

  it('handles save with zero towers', () => {
    const mgr = SessionManager.getInstance();
    mgr.save(makeSave({ towers: [] }));
    const loaded = mgr.load()!;
    expect(loaded.towers).toHaveLength(0);
  });

  // ── wave 0 boundary ───────────────────────────────────────────────────────

  it('handles save at wave 0', () => {
    const mgr = SessionManager.getInstance();
    mgr.save(makeSave({ currentWave: 0 }));
    const loaded = mgr.load()!;
    expect(loaded.currentWave).toBe(0);
  });

  // ── save overwrites previous ──────────────────────────────────────────────

  it('overwrites previous save on subsequent save()', () => {
    const mgr = SessionManager.getInstance();
    mgr.save(makeSave({ gold: 100 }));
    mgr.save(makeSave({ gold: 999 }));
    const loaded = mgr.load()!;
    expect(loaded.gold).toBe(999);
  });

  // ── unavailable storage ───────────────────────────────────────────────────

  it('save and load are no-ops when storage is unavailable', () => {
    const throwing = {
      ...storageMock,
      setItem: () => { throw new Error('SecurityError'); },
    };
    vi.stubGlobal('sessionStorage', throwing);
    resetSingleton();
    const mgr = SessionManager.getInstance();

    mgr.save(makeSave());
    expect(mgr.load()).toBeNull();
    expect(() => mgr.clear()).not.toThrow();
  });

  // ── TASK-098 migration: cannon/mortar → rock-hurler ───────────────────────

  it('migrates legacy cannon tower key to rock-hurler on load', () => {
    const mgr = SessionManager.getInstance();
    // Inject raw JSON with legacy 'cannon' key directly into storage,
    // bypassing save() so the old key is preserved.
    const raw: AutoSave = {
      version:         1,
      timestamp:       Date.now(),
      mapId:           'map-01',
      stageId:         'zaagaiganing-01',
      commanderId:     'nokomis',
      currentWave:     3,
      gold:            200,
      lives:           20,
      totalKills:      10,
      goldEarned:      300,
      towers:          [{ key: 'cannon', col: 2, row: 3, upgrades: { A: 1, B: 0, C: 0 }, totalSpent: 100 }],
      offers:          [],
      consumedOffers:  [],
      metaStatBonuses: {},
    };
    storageMock.setItem('ojibwe-td-autosave', JSON.stringify(raw));

    const loaded = mgr.load()!;
    expect(loaded).not.toBeNull();
    expect(loaded.towers[0].key).toBe('rock-hurler');
  });

  it('migrates legacy mortar tower key to rock-hurler on load', () => {
    const mgr = SessionManager.getInstance();
    const raw: AutoSave = {
      version:         1,
      timestamp:       Date.now(),
      mapId:           'map-01',
      stageId:         'zaagaiganing-01',
      commanderId:     'nokomis',
      currentWave:     7,
      gold:            500,
      lives:           15,
      totalKills:      60,
      goldEarned:      1200,
      towers:          [
        { key: 'mortar',  col: 1, row: 1, upgrades: { A: 2, B: 0, C: 0 }, totalSpent: 120 },
        { key: 'cannon',  col: 4, row: 4, upgrades: { A: 0, B: 3, C: 0 }, totalSpent: 200 },
        { key: 'frost',   col: 6, row: 2, upgrades: { A: 1, B: 1, C: 0 }, totalSpent: 150 },
      ],
      offers:          [],
      consumedOffers:  [],
      metaStatBonuses: {},
    };
    storageMock.setItem('ojibwe-td-autosave', JSON.stringify(raw));

    const loaded = mgr.load()!;
    expect(loaded).not.toBeNull();
    expect(loaded.towers[0].key).toBe('rock-hurler');
    expect(loaded.towers[1].key).toBe('rock-hurler');
    // Non-legacy towers are untouched.
    expect(loaded.towers[2].key).toBe('frost');
  });
});
