/**
 * Achievements system — unit tests for AchievementManager, SaveManager
 * achievement methods, achievement definitions, and integration wiring.
 *
 * localStorage is mocked via vi.stubGlobal; singletons are reset between tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SaveManager } from '../../meta/SaveManager';
import { AchievementManager } from '../AchievementManager';
import type { VictoryData } from '../AchievementManager';
import {
  ALL_ACHIEVEMENTS,
  getAchievementDef,
  getAchievementsByCategory,
  ACHIEVEMENT_CATEGORIES,
  CATEGORY_LABELS,
} from '../../data/achievementDefs';
import type { AchievementCategory } from '../../data/achievementDefs';

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

function resetSaveManager(): void {
  (SaveManager as unknown as { _instance: null })._instance = null;
}

function resetAchievementManager(): void {
  (AchievementManager as unknown as { _instance: null })._instance = null;
}

const SAVE_KEY = 'ojibwe-td-save';

let storageMock: ReturnType<typeof makeStoreMock>;

function seedRaw(overrides: Record<string, unknown>): void {
  const base: Record<string, unknown> = {
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
    pendingConsumables: { rerollTokens: 0, goldBoostTokens: 0, extraLifeTokens: 0 },
    colorblindMode: false,
    achievements: { unlocked: [], progress: {}, stats: {} },
  };
  storageMock.setItem(SAVE_KEY, JSON.stringify({ ...base, ...overrides }));
}

// ── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  storageMock = makeStoreMock();
  vi.stubGlobal('localStorage', storageMock);
  resetSaveManager();
  resetAchievementManager();
});

afterEach(() => {
  vi.restoreAllMocks();
  resetSaveManager();
  resetAchievementManager();
});

// ══════════════════════════════════════════════════════════════════════════════
// Achievement definitions
// ══════════════════════════════════════════════════════════════════════════════

describe('Achievement definitions', () => {
  it('has at least 70 achievements (TASK-131 expanded set)', () => {
    expect(ALL_ACHIEVEMENTS.length).toBeGreaterThanOrEqual(70);
    expect(ALL_ACHIEVEMENTS.length).toBeLessThanOrEqual(100);
  });

  it('has no duplicate IDs', () => {
    const ids = ALL_ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every achievement has all required fields', () => {
    for (const a of ALL_ACHIEVEMENTS) {
      expect(typeof a.id).toBe('string');
      expect(a.id.length).toBeGreaterThan(0);
      expect(typeof a.title).toBe('string');
      expect(typeof a.description).toBe('string');
      expect(typeof a.icon).toBe('string');
      expect(typeof a.category).toBe('string');
      expect(a.target).toBeGreaterThanOrEqual(1);
    }
  });

  it('every achievement belongs to a known category', () => {
    for (const a of ALL_ACHIEVEMENTS) {
      expect(ACHIEVEMENT_CATEGORIES).toContain(a.category);
    }
  });

  it('getAchievementDef returns matching def', () => {
    const def = getAchievementDef('first-victory');
    expect(def).toBeDefined();
    expect(def!.title).toBe('First Victory');
  });

  it('getAchievementDef returns undefined for unknown ID', () => {
    expect(getAchievementDef('nonexistent')).toBeUndefined();
  });

  it('getAchievementsByCategory returns correct subset', () => {
    const mapClear = getAchievementsByCategory('map-clear');
    expect(mapClear.length).toBeGreaterThan(0);
    expect(mapClear.every(a => a.category === 'map-clear')).toBe(true);
  });

  it('CATEGORY_LABELS covers all categories', () => {
    for (const cat of ACHIEVEMENT_CATEGORIES) {
      expect(typeof CATEGORY_LABELS[cat]).toBe('string');
      expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
    }
  });

  it('some achievements are hidden', () => {
    expect(ALL_ACHIEVEMENTS.some(a => a.hidden === true)).toBe(true);
  });

  it('all category counts match task spec ranges', () => {
    const counts = new Map<AchievementCategory, number>();
    for (const a of ALL_ACHIEVEMENTS) {
      counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
    }
    // Map Clearing (~10)
    expect(counts.get('map-clear')).toBeGreaterThanOrEqual(5);
    // Commander (~9+)
    expect(counts.get('commander')).toBeGreaterThanOrEqual(6);
    // Region (~4+)
    expect(counts.get('region')).toBeGreaterThanOrEqual(4);
    // Tower Mastery (~14 after TASK-131)
    expect(counts.get('tower-mastery')).toBeGreaterThanOrEqual(12);
    // Economy (~12 after TASK-131)
    expect(counts.get('economy')).toBeGreaterThanOrEqual(10);
    // Combat (~14 after TASK-131)
    expect(counts.get('combat')).toBeGreaterThanOrEqual(12);
    // Misc (~15 after TASK-131)
    expect(counts.get('misc')).toBeGreaterThanOrEqual(12);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SaveManager — achievement persistence
// ══════════════════════════════════════════════════════════════════════════════

describe('SaveManager achievement persistence', () => {
  describe('getAchievements()', () => {
    it('returns default empty data on fresh save', () => {
      const sm = SaveManager.getInstance();
      const ach = sm.getAchievements();
      expect(ach.unlocked).toEqual([]);
      expect(ach.progress).toEqual({});
      expect(ach.stats).toEqual({});
    });

    it('back-fills achievements field when missing from old save', () => {
      seedRaw({});
      // Remove the achievements field from the raw save
      const raw = JSON.parse(storageMock.getItem(SAVE_KEY)!);
      delete raw.achievements;
      storageMock.setItem(SAVE_KEY, JSON.stringify(raw));
      resetSaveManager();
      const sm = SaveManager.getInstance();
      const ach = sm.getAchievements();
      expect(ach.unlocked).toEqual([]);
      expect(ach.progress).toEqual({});
      expect(ach.stats).toEqual({});
    });
  });

  describe('unlockAchievement()', () => {
    it('returns true for new unlock', () => {
      const sm = SaveManager.getInstance();
      expect(sm.unlockAchievement('first-victory')).toBe(true);
    });

    it('returns false for duplicate unlock (idempotent)', () => {
      const sm = SaveManager.getInstance();
      sm.unlockAchievement('first-victory');
      expect(sm.unlockAchievement('first-victory')).toBe(false);
    });

    it('removes progress on unlock', () => {
      const sm = SaveManager.getInstance();
      sm.setAchievementProgress('kill-500-creeps', 300);
      sm.unlockAchievement('kill-500-creeps');
      expect(sm.getAchievementProgress('kill-500-creeps')).toBe(0);
    });

    it('persists across singleton reset', () => {
      const sm = SaveManager.getInstance();
      sm.unlockAchievement('first-victory');
      resetSaveManager();
      const sm2 = SaveManager.getInstance();
      expect(sm2.isAchievementUnlocked('first-victory')).toBe(true);
    });
  });

  describe('isAchievementUnlocked()', () => {
    it('returns false for unearned achievement', () => {
      const sm = SaveManager.getInstance();
      expect(sm.isAchievementUnlocked('first-victory')).toBe(false);
    });

    it('returns true after unlock', () => {
      const sm = SaveManager.getInstance();
      sm.unlockAchievement('first-victory');
      expect(sm.isAchievementUnlocked('first-victory')).toBe(true);
    });
  });

  describe('setAchievementProgress()', () => {
    it('stores and retrieves progress value', () => {
      const sm = SaveManager.getInstance();
      sm.setAchievementProgress('kill-500-creeps', 250);
      expect(sm.getAchievementProgress('kill-500-creeps')).toBe(250);
    });

    it('clamps negative values to 0', () => {
      const sm = SaveManager.getInstance();
      sm.setAchievementProgress('kill-500-creeps', -10);
      expect(sm.getAchievementProgress('kill-500-creeps')).toBe(0);
    });

    it('floors fractional values', () => {
      const sm = SaveManager.getInstance();
      sm.setAchievementProgress('kill-500-creeps', 3.7);
      expect(sm.getAchievementProgress('kill-500-creeps')).toBe(3);
    });

    it('does nothing when achievement is already unlocked', () => {
      const sm = SaveManager.getInstance();
      sm.unlockAchievement('first-victory');
      sm.setAchievementProgress('first-victory', 99);
      // Progress should still be 0 (removed on unlock, and setProgress is no-op)
      expect(sm.getAchievementProgress('first-victory')).toBe(0);
    });

    it('persists across singleton reset', () => {
      const sm = SaveManager.getInstance();
      sm.setAchievementProgress('kill-500-creeps', 123);
      resetSaveManager();
      const sm2 = SaveManager.getInstance();
      expect(sm2.getAchievementProgress('kill-500-creeps')).toBe(123);
    });
  });

  describe('getLifetimeStat() / addLifetimeStat()', () => {
    it('returns 0 for unknown stat', () => {
      const sm = SaveManager.getInstance();
      expect(sm.getLifetimeStat('kills')).toBe(0);
    });

    it('adds delta and returns new total', () => {
      const sm = SaveManager.getInstance();
      expect(sm.addLifetimeStat('kills', 10)).toBe(10);
      expect(sm.addLifetimeStat('kills', 5)).toBe(15);
    });

    it('ignores zero delta', () => {
      const sm = SaveManager.getInstance();
      sm.addLifetimeStat('kills', 10);
      expect(sm.addLifetimeStat('kills', 0)).toBe(10);
    });

    it('ignores negative delta', () => {
      const sm = SaveManager.getInstance();
      sm.addLifetimeStat('kills', 10);
      expect(sm.addLifetimeStat('kills', -5)).toBe(10);
    });

    it('floors fractional delta', () => {
      const sm = SaveManager.getInstance();
      expect(sm.addLifetimeStat('kills', 3.9)).toBe(3);
    });

    it('persists across singleton reset', () => {
      const sm = SaveManager.getInstance();
      sm.addLifetimeStat('kills', 42);
      resetSaveManager();
      const sm2 = SaveManager.getInstance();
      expect(sm2.getLifetimeStat('kills')).toBe(42);
    });
  });

  describe('achievement data sanitization', () => {
    it('handles corrupt unlocked array (non-strings filtered)', () => {
      seedRaw({
        achievements: { unlocked: ['first-victory', 42, null, 'clear-all-stages'], progress: {}, stats: {} },
      });
      const sm = SaveManager.getInstance();
      const ach = sm.getAchievements();
      expect(ach.unlocked).toEqual(['first-victory', 'clear-all-stages']);
    });

    it('handles corrupt progress (non-finite/negative values dropped)', () => {
      seedRaw({
        achievements: {
          unlocked: [],
          progress: { good: 10, negative: -5, nan: 'bad', infinity: Infinity },
          stats: {},
        },
      });
      const sm = SaveManager.getInstance();
      expect(sm.getAchievementProgress('good')).toBe(10);
      expect(sm.getAchievementProgress('negative')).toBe(0);
      expect(sm.getAchievementProgress('nan')).toBe(0);
    });

    it('handles corrupt stats (non-finite/negative values dropped)', () => {
      seedRaw({
        achievements: {
          unlocked: [],
          progress: {},
          stats: { kills: 100, bad: -1, str: 'nope' },
        },
      });
      const sm = SaveManager.getInstance();
      expect(sm.getLifetimeStat('kills')).toBe(100);
      expect(sm.getLifetimeStat('bad')).toBe(0);
      expect(sm.getLifetimeStat('str')).toBe(0);
    });

    it('handles entirely missing achievements field', () => {
      const raw = JSON.parse(storageMock.getItem(SAVE_KEY) ?? '{}');
      delete raw.achievements;
      seedRaw(raw);
      const sm = SaveManager.getInstance();
      expect(sm.getAchievements()).toEqual({ unlocked: [], progress: {}, stats: {} });
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AchievementManager — unit tests
// ══════════════════════════════════════════════════════════════════════════════

describe('AchievementManager', () => {
  describe('singleton', () => {
    it('returns the same instance', () => {
      const a = AchievementManager.getInstance();
      const b = AchievementManager.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('drainNewlyUnlocked()', () => {
    it('returns empty array when nothing unlocked', () => {
      const am = AchievementManager.getInstance();
      expect(am.drainNewlyUnlocked()).toEqual([]);
    });

    it('drains and clears the queue', () => {
      const am = AchievementManager.getInstance();
      // Trigger a binary unlock
      am.onGameStarted(); // games-played goes from 0→1, but play-10-games needs 10
      // Manually trigger something that unlocks
      const sm = SaveManager.getInstance();
      sm.addCurrency(600);
      am.onCurrencyChanged(600);
      const ids = am.drainNewlyUnlocked();
      expect(ids).toContain('accumulate-500-crystals');
      // Second drain should be empty
      expect(am.drainNewlyUnlocked()).toEqual([]);
    });
  });

  describe('getAll()', () => {
    it('returns state for all 55 achievements', () => {
      const am = AchievementManager.getInstance();
      const all = am.getAll();
      expect(all.length).toBe(ALL_ACHIEVEMENTS.length);
    });

    it('reflects unlocked state', () => {
      const sm = SaveManager.getInstance();
      sm.unlockAchievement('first-victory');
      const am = AchievementManager.getInstance();
      const state = am.getAll().find(s => s.def.id === 'first-victory');
      expect(state?.unlocked).toBe(true);
      expect(state?.current).toBe(1); // target value
    });

    it('reflects progress state', () => {
      const sm = SaveManager.getInstance();
      sm.setAchievementProgress('kill-500-creeps', 250);
      const am = AchievementManager.getInstance();
      const state = am.getAll().find(s => s.def.id === 'kill-500-creeps');
      expect(state?.unlocked).toBe(false);
      expect(state?.current).toBe(250);
    });
  });

  // ── Kills ────────────────────────────────────────────────────────────────────

  describe('addKills()', () => {
    it('ignores zero or negative kills', () => {
      const am = AchievementManager.getInstance();
      am.addKills(0);
      am.addKills(-10);
      const sm = SaveManager.getInstance();
      expect(sm.getLifetimeStat('kills')).toBe(0);
    });

    it('accumulates lifetime kills', () => {
      const am = AchievementManager.getInstance();
      am.addKills(100);
      am.addKills(200);
      expect(SaveManager.getInstance().getLifetimeStat('kills')).toBe(300);
    });

    it('unlocks kill-500-creeps at threshold', () => {
      const am = AchievementManager.getInstance();
      am.addKills(499);
      expect(am.isUnlocked('kill-500-creeps')).toBe(false);
      am.addKills(1);
      expect(am.isUnlocked('kill-500-creeps')).toBe(true);
      expect(am.drainNewlyUnlocked()).toContain('kill-500-creeps');
    });

    it('unlocks multiple kill achievements at once', () => {
      const am = AchievementManager.getInstance();
      am.addKills(5000);
      expect(am.isUnlocked('kill-500-creeps')).toBe(true);
      expect(am.isUnlocked('kill-5000-creeps')).toBe(true);
    });
  });

  // ── Bosses ────────────────────────────────────────────────────────────────────

  describe('addBosses()', () => {
    it('ignores zero or negative', () => {
      const am = AchievementManager.getInstance();
      am.addBosses(0);
      expect(SaveManager.getInstance().getLifetimeStat('bosses')).toBe(0);
    });

    it('unlocks kill-5-bosses at threshold', () => {
      const am = AchievementManager.getInstance();
      am.addBosses(5);
      expect(am.isUnlocked('kill-5-bosses')).toBe(true);
    });
  });

  // ── Endless wave ──────────────────────────────────────────────────────────────

  describe('onEndlessWaveReached()', () => {
    it('does not unlock below threshold', () => {
      const am = AchievementManager.getInstance();
      am.onEndlessWaveReached(29);
      expect(am.isUnlocked('endless-wave-30')).toBe(false);
    });

    it('unlocks at wave 30', () => {
      const am = AchievementManager.getInstance();
      am.onEndlessWaveReached(30);
      expect(am.isUnlocked('endless-wave-30')).toBe(true);
    });

    it('unlocks multiple tiers at once', () => {
      const am = AchievementManager.getInstance();
      am.onEndlessWaveReached(100);
      expect(am.isUnlocked('endless-wave-30')).toBe(true);
      expect(am.isUnlocked('endless-wave-50')).toBe(true);
      expect(am.isUnlocked('endless-wave-100')).toBe(true);
    });
  });

  // ── Tower built ───────────────────────────────────────────────────────────────

  describe('addTowerBuilt()', () => {
    it('increments lifetime tower stat', () => {
      const am = AchievementManager.getInstance();
      am.addTowerBuilt(1, 'cannon');
      am.addTowerBuilt(2, 'frost');
      expect(SaveManager.getInstance().getLifetimeStat('towersBuilt')).toBe(2);
    });

    it('unlocks build-25-towers-run at threshold', () => {
      const am = AchievementManager.getInstance();
      am.addTowerBuilt(25, 'cannon');
      expect(am.isUnlocked('build-25-towers-run')).toBe(true);
    });

    it('unlocks build-500-towers-total at lifetime threshold', () => {
      const am = AchievementManager.getInstance();
      // Seed lifetime to 499
      SaveManager.getInstance().addLifetimeStat('towersBuilt', 499);
      am.addTowerBuilt(1, 'cannon'); // 499 + 1 = 500
      expect(am.isUnlocked('build-500-towers-total')).toBe(true);
    });
  });

  // ── Tower path maxed ──────────────────────────────────────────────────────────

  describe('onTowerPathMaxed()', () => {
    it('unlocks max-upgrade-first on first call', () => {
      const am = AchievementManager.getInstance();
      am.onTowerPathMaxed('cannon');
      expect(am.isUnlocked('max-upgrade-first')).toBe(true);
    });

    it('tracks distinct tower types maxed', () => {
      const am = AchievementManager.getInstance();
      am.onTowerPathMaxed('cannon');
      am.onTowerPathMaxed('cannon'); // duplicate — should not double-count
      am.onTowerPathMaxed('frost');
      am.onTowerPathMaxed('mortar');
      expect(am.isUnlocked('max-upgrade-3-types')).toBe(true);
    });

    it('does not double-count same tower type', () => {
      const am = AchievementManager.getInstance();
      am.onTowerPathMaxed('cannon');
      am.onTowerPathMaxed('cannon');
      expect(SaveManager.getInstance().getLifetimeStat('maxUpgradedTypes')).toBe(1);
    });

    it('unlocks max-upgrade-every-type when all 8 types maxed', () => {
      const am = AchievementManager.getInstance();
      const types = ['cannon', 'frost', 'mortar', 'poison', 'tesla', 'aura', 'arrow', 'rock-hurler'];
      for (const t of types) am.onTowerPathMaxed(t);
      expect(am.isUnlocked('max-upgrade-every-type')).toBe(true);
    });
  });

  // ── Crystal spending ──────────────────────────────────────────────────────────

  describe('addCrystalsSpent()', () => {
    it('ignores zero or negative', () => {
      const am = AchievementManager.getInstance();
      am.addCrystalsSpent(0);
      am.addCrystalsSpent(-10);
      expect(SaveManager.getInstance().getLifetimeStat('crystalsSpent')).toBe(0);
    });

    it('unlocks spend-250-crystals at threshold', () => {
      const am = AchievementManager.getInstance();
      am.addCrystalsSpent(250);
      expect(am.isUnlocked('spend-250-crystals')).toBe(true);
    });

    it('accumulates across calls', () => {
      const am = AchievementManager.getInstance();
      am.addCrystalsSpent(100);
      am.addCrystalsSpent(200);
      expect(SaveManager.getInstance().getLifetimeStat('crystalsSpent')).toBe(300);
    });
  });

  // ── Currency changed ──────────────────────────────────────────────────────────

  describe('onCurrencyChanged()', () => {
    it('does not unlock below 500', () => {
      const am = AchievementManager.getInstance();
      am.onCurrencyChanged(499);
      expect(am.isUnlocked('accumulate-500-crystals')).toBe(false);
    });

    it('unlocks at exactly 500', () => {
      const am = AchievementManager.getInstance();
      am.onCurrencyChanged(500);
      expect(am.isUnlocked('accumulate-500-crystals')).toBe(true);
    });
  });

  // ── Game started ──────────────────────────────────────────────────────────────

  describe('onGameStarted()', () => {
    it('increments games played', () => {
      const am = AchievementManager.getInstance();
      am.onGameStarted();
      expect(SaveManager.getInstance().getLifetimeStat('gamesPlayed')).toBe(1);
    });

    it('unlocks play-10-games at threshold', () => {
      const am = AchievementManager.getInstance();
      for (let i = 0; i < 10; i++) am.onGameStarted();
      expect(am.isUnlocked('play-10-games')).toBe(true);
    });

    it('does not unlock play-10-games at 9', () => {
      const am = AchievementManager.getInstance();
      for (let i = 0; i < 9; i++) am.onGameStarted();
      expect(am.isUnlocked('play-10-games')).toBe(false);
    });
  });

  // ── Rerolls ───────────────────────────────────────────────────────────────────

  describe('addRerolls()', () => {
    it('ignores zero or negative', () => {
      const am = AchievementManager.getInstance();
      am.addRerolls(0);
      am.addRerolls(-3);
      expect(SaveManager.getInstance().getLifetimeStat('rerollsTotal')).toBe(0);
    });

    it('accumulates lifetime rerolls', () => {
      const am = AchievementManager.getInstance();
      am.addRerolls(3);
      am.addRerolls(7);
      expect(SaveManager.getInstance().getLifetimeStat('rerollsTotal')).toBe(10);
    });

    it('unlocks reroll-5-times-run when runRerolls >= 5', () => {
      const am = AchievementManager.getInstance();
      am.addRerolls(5);
      expect(am.isUnlocked('reroll-5-times-run')).toBe(true);
    });

    it('does not unlock reroll-5-times-run at 4', () => {
      const am = AchievementManager.getInstance();
      am.addRerolls(4);
      expect(am.isUnlocked('reroll-5-times-run')).toBe(false);
    });

    it('unlocks reroll-30-times-total at threshold', () => {
      const am = AchievementManager.getInstance();
      am.addRerolls(30);
      expect(am.isUnlocked('reroll-30-times-total')).toBe(true);
    });
  });

  // ── Air kills ─────────────────────────────────────────────────────────────────

  describe('addAirKills()', () => {
    it('ignores zero or negative', () => {
      const am = AchievementManager.getInstance();
      am.addAirKills(0);
      am.addAirKills(-5);
      expect(SaveManager.getInstance().getLifetimeStat('airKills')).toBe(0);
    });

    it('accumulates lifetime air kills', () => {
      const am = AchievementManager.getInstance();
      am.addAirKills(30);
      am.addAirKills(25);
      expect(SaveManager.getInstance().getLifetimeStat('airKills')).toBe(55);
    });

    it('unlocks kill-50-air-creeps at threshold', () => {
      const am = AchievementManager.getInstance();
      am.addAirKills(49);
      expect(am.isUnlocked('kill-50-air-creeps')).toBe(false);
      am.addAirKills(1);
      expect(am.isUnlocked('kill-50-air-creeps')).toBe(true);
      expect(am.drainNewlyUnlocked()).toContain('kill-50-air-creeps');
    });

    it('unlocks kill-200-air-creeps at threshold', () => {
      const am = AchievementManager.getInstance();
      am.addAirKills(200);
      expect(am.isUnlocked('kill-200-air-creeps')).toBe(true);
    });
  });

  // ── Tower sells ───────────────────────────────────────────────────────────────

  describe('addTowersSold()', () => {
    it('ignores zero or negative', () => {
      const am = AchievementManager.getInstance();
      am.addTowersSold(0);
      expect(SaveManager.getInstance().getLifetimeStat('towersSold')).toBe(0);
    });

    it('accumulates lifetime sells', () => {
      const am = AchievementManager.getInstance();
      am.addTowersSold(5);
      am.addTowersSold(7);
      expect(SaveManager.getInstance().getLifetimeStat('towersSold')).toBe(12);
    });

    it('unlocks sell-10-towers at threshold', () => {
      const am = AchievementManager.getInstance();
      am.addTowersSold(9);
      expect(am.isUnlocked('sell-10-towers')).toBe(false);
      am.addTowersSold(1);
      expect(am.isUnlocked('sell-10-towers')).toBe(true);
    });

    it('unlocks sell-50-towers and sell-200-towers at thresholds', () => {
      const am = AchievementManager.getInstance();
      am.addTowersSold(200);
      expect(am.isUnlocked('sell-50-towers')).toBe(true);
      expect(am.isUnlocked('sell-200-towers')).toBe(true);
    });
  });

  // ── Rushes ────────────────────────────────────────────────────────────────────

  describe('addRushes()', () => {
    it('ignores zero or negative', () => {
      const am = AchievementManager.getInstance();
      am.addRushes(0);
      expect(SaveManager.getInstance().getLifetimeStat('rushesTotal')).toBe(0);
    });

    it('accumulates lifetime rushes', () => {
      const am = AchievementManager.getInstance();
      am.addRushes(4);
      am.addRushes(6);
      expect(SaveManager.getInstance().getLifetimeStat('rushesTotal')).toBe(10);
    });

    it('unlocks rush-10-waves at threshold', () => {
      const am = AchievementManager.getInstance();
      am.addRushes(10);
      expect(am.isUnlocked('rush-10-waves')).toBe(true);
    });

    it('unlocks rush-50-waves and rush-200-waves at thresholds', () => {
      const am = AchievementManager.getInstance();
      am.addRushes(200);
      expect(am.isUnlocked('rush-50-waves')).toBe(true);
      expect(am.isUnlocked('rush-200-waves')).toBe(true);
    });
  });

  // ── Lifetime gold ─────────────────────────────────────────────────────────────

  describe('addLifetimeGold()', () => {
    it('ignores zero or negative', () => {
      const am = AchievementManager.getInstance();
      am.addLifetimeGold(0);
      expect(SaveManager.getInstance().getLifetimeStat('goldEarnedTotal')).toBe(0);
    });

    it('accumulates lifetime gold', () => {
      const am = AchievementManager.getInstance();
      am.addLifetimeGold(3000);
      am.addLifetimeGold(3000);
      expect(SaveManager.getInstance().getLifetimeStat('goldEarnedTotal')).toBe(6000);
    });

    it('unlocks earn-gold-5000-total at threshold', () => {
      const am = AchievementManager.getInstance();
      am.addLifetimeGold(4999);
      expect(am.isUnlocked('earn-gold-5000-total')).toBe(false);
      am.addLifetimeGold(1);
      expect(am.isUnlocked('earn-gold-5000-total')).toBe(true);
    });

    it('unlocks earn-gold-25000-total at threshold', () => {
      const am = AchievementManager.getInstance();
      am.addLifetimeGold(25000);
      expect(am.isUnlocked('earn-gold-25000-total')).toBe(true);
    });
  });

  // ── Win count ─────────────────────────────────────────────────────────────────

  describe('addWins()', () => {
    it('ignores zero or negative', () => {
      const am = AchievementManager.getInstance();
      am.addWins(0);
      expect(SaveManager.getInstance().getLifetimeStat('winsTotal')).toBe(0);
    });

    it('accumulates lifetime wins', () => {
      const am = AchievementManager.getInstance();
      am.addWins(3);
      am.addWins(2);
      expect(SaveManager.getInstance().getLifetimeStat('winsTotal')).toBe(5);
    });

    it('unlocks win-5-runs at threshold', () => {
      const am = AchievementManager.getInstance();
      am.addWins(4);
      expect(am.isUnlocked('win-5-runs')).toBe(false);
      am.addWins(1);
      expect(am.isUnlocked('win-5-runs')).toBe(true);
    });

    it('unlocks win-20-runs, win-50-runs, win-100-runs at thresholds', () => {
      const am = AchievementManager.getInstance();
      am.addWins(100);
      expect(am.isUnlocked('win-20-runs')).toBe(true);
      expect(am.isUnlocked('win-50-runs')).toBe(true);
      expect(am.isUnlocked('win-100-runs')).toBe(true);
    });
  });

  // ── Simultaneous tower types ───────────────────────────────────────────────────

  describe('checkAllTypesSimultaneous()', () => {
    it('does not unlock below 6', () => {
      const am = AchievementManager.getInstance();
      am.checkAllTypesSimultaneous(5);
      expect(am.isUnlocked('all-6-types-simultaneous')).toBe(false);
    });

    it('unlocks at exactly 6', () => {
      const am = AchievementManager.getInstance();
      am.checkAllTypesSimultaneous(6);
      expect(am.isUnlocked('all-6-types-simultaneous')).toBe(true);
    });

    it('unlocks above 6', () => {
      const am = AchievementManager.getInstance();
      am.checkAllTypesSimultaneous(8);
      expect(am.isUnlocked('all-6-types-simultaneous')).toBe(true);
    });
  });

  // ── Tower total milestones ─────────────────────────────────────────────────────

  describe('addTowerBuilt() — new lifetime milestones', () => {
    it('unlocks place-50-towers-total at lifetime threshold', () => {
      const am = AchievementManager.getInstance();
      SaveManager.getInstance().addLifetimeStat('towersBuilt', 49);
      am.addTowerBuilt(1, 'cannon'); // 49 + 1 = 50
      expect(am.isUnlocked('place-50-towers-total')).toBe(true);
    });

    it('unlocks place-200-towers-total at lifetime threshold', () => {
      const am = AchievementManager.getInstance();
      SaveManager.getInstance().addLifetimeStat('towersBuilt', 199);
      am.addTowerBuilt(1, 'cannon');
      expect(am.isUnlocked('place-200-towers-total')).toBe(true);
    });

    it('unlocks place-1000-towers-total at lifetime threshold', () => {
      const am = AchievementManager.getInstance();
      SaveManager.getInstance().addLifetimeStat('towersBuilt', 999);
      am.addTowerBuilt(1, 'cannon');
      expect(am.isUnlocked('place-1000-towers-total')).toBe(true);
    });
  });

  // ── Kill milestones (new tiers) ───────────────────────────────────────────────

  describe('addKills() — new tiers', () => {
    it('unlocks kill-100-creeps at threshold', () => {
      const am = AchievementManager.getInstance();
      am.addKills(99);
      expect(am.isUnlocked('kill-100-creeps')).toBe(false);
      am.addKills(1);
      expect(am.isUnlocked('kill-100-creeps')).toBe(true);
    });

    it('unlocks kill-2000-creeps at threshold', () => {
      const am = AchievementManager.getInstance();
      am.addKills(2000);
      expect(am.isUnlocked('kill-2000-creeps')).toBe(true);
    });
  });

  // ── Crystal spend milestone ───────────────────────────────────────────────────

  describe('addCrystalsSpent() — spend-500-crystals', () => {
    it('unlocks spend-500-crystals at threshold', () => {
      const am = AchievementManager.getInstance();
      am.addCrystalsSpent(499);
      expect(am.isUnlocked('spend-500-crystals')).toBe(false);
      am.addCrystalsSpent(1);
      expect(am.isUnlocked('spend-500-crystals')).toBe(true);
    });

    it('does not interfere with spend-250-crystals or spend-1000-crystals thresholds', () => {
      const am = AchievementManager.getInstance();
      am.addCrystalsSpent(1000);
      expect(am.isUnlocked('spend-250-crystals')).toBe(true);
      expect(am.isUnlocked('spend-500-crystals')).toBe(true);
      expect(am.isUnlocked('spend-1000-crystals')).toBe(true);
    });
  });

  // ── Codex ─────────────────────────────────────────────────────────────────────

  describe('onCodexAllRead()', () => {
    it('unlocks codex-scholar when passed true', () => {
      const am = AchievementManager.getInstance();
      am.onCodexAllRead(true);
      expect(am.isUnlocked('codex-scholar')).toBe(true);
    });

    it('does not unlock when passed false', () => {
      const am = AchievementManager.getInstance();
      am.onCodexAllRead(false);
      expect(am.isUnlocked('codex-scholar')).toBe(false);
    });
  });

  // ── onVictory ─────────────────────────────────────────────────────────────────

  describe('onVictory()', () => {
    function makeVictoryData(overrides?: Partial<VictoryData>): VictoryData {
      return {
        stageId:           'zaagaiganing-01',
        commanderId:       'nokomis',
        livesLeft:         20,
        maxLives:          20,
        towerTypesUsed:    ['cannon', 'frost'],
        allTowersUpgraded: false,
        goldEarned:        500,
        consumablesUsed:   [],
        ...overrides,
      };
    }

    it('unlocks first-victory', () => {
      const am = AchievementManager.getInstance();
      am.onVictory(makeVictoryData());
      expect(am.isUnlocked('first-victory')).toBe(true);
    });

    it('unlocks stage-specific clear achievement', () => {
      const am = AchievementManager.getInstance();
      am.onVictory(makeVictoryData({ stageId: 'mashkiig-01' }));
      expect(am.isUnlocked('clear-mashkiig')).toBe(true);
    });

    it('unlocks commander-specific win achievement', () => {
      const am = AchievementManager.getInstance();
      am.onVictory(makeVictoryData({ commanderId: 'bizhiw' }));
      expect(am.isUnlocked('win-bizhiw')).toBe(true);
    });

    it('unlocks flawless-victory when lives == maxLives', () => {
      const am = AchievementManager.getInstance();
      am.onVictory(makeVictoryData({ livesLeft: 20, maxLives: 20 }));
      expect(am.isUnlocked('flawless-victory')).toBe(true);
    });

    it('does not unlock flawless-victory when lives < maxLives', () => {
      const am = AchievementManager.getInstance();
      am.onVictory(makeVictoryData({ livesLeft: 19, maxLives: 20 }));
      expect(am.isUnlocked('flawless-victory')).toBe(false);
    });

    it('unlocks iron-defense when lives >= 15', () => {
      const am = AchievementManager.getInstance();
      am.onVictory(makeVictoryData({ livesLeft: 15 }));
      expect(am.isUnlocked('iron-defense')).toBe(true);
    });

    it('unlocks comeback-kid when lives === 1', () => {
      const am = AchievementManager.getInstance();
      am.onVictory(makeVictoryData({ livesLeft: 1, maxLives: 20 }));
      expect(am.isUnlocked('comeback-kid')).toBe(true);
    });

    it('does not unlock comeback-kid at 2 lives', () => {
      const am = AchievementManager.getInstance();
      am.onVictory(makeVictoryData({ livesLeft: 2, maxLives: 20 }));
      expect(am.isUnlocked('comeback-kid')).toBe(false);
    });

    it('unlocks mono-tower when only one tower type used', () => {
      const am = AchievementManager.getInstance();
      am.onVictory(makeVictoryData({ towerTypesUsed: ['cannon'] }));
      expect(am.isUnlocked('mono-tower')).toBe(true);
    });

    it('does not unlock mono-tower with multiple types', () => {
      const am = AchievementManager.getInstance();
      am.onVictory(makeVictoryData({ towerTypesUsed: ['cannon', 'frost'] }));
      expect(am.isUnlocked('mono-tower')).toBe(false);
    });

    it('unlocks all-tower-types-in-run when all 8 types used', () => {
      const am = AchievementManager.getInstance();
      const allTypes = ['cannon', 'frost', 'mortar', 'poison', 'tesla', 'aura', 'arrow', 'rock-hurler'];
      am.onVictory(makeVictoryData({ towerTypesUsed: allTypes }));
      expect(am.isUnlocked('all-tower-types-in-run')).toBe(true);
    });

    it('unlocks full-equipped when allTowersUpgraded is true', () => {
      const am = AchievementManager.getInstance();
      am.onVictory(makeVictoryData({ allTowersUpgraded: true }));
      expect(am.isUnlocked('full-equipped')).toBe(true);
    });

    it('unlocks earn-2000-gold when goldEarned >= 2000', () => {
      const am = AchievementManager.getInstance();
      am.onVictory(makeVictoryData({ goldEarned: 2000 }));
      expect(am.isUnlocked('earn-2000-gold')).toBe(true);
    });

    it('does not unlock earn-2000-gold at 1999', () => {
      const am = AchievementManager.getInstance();
      am.onVictory(makeVictoryData({ goldEarned: 1999 }));
      expect(am.isUnlocked('earn-2000-gold')).toBe(false);
    });

    it('unlocks use-all-consumables when all 3 types used', () => {
      const am = AchievementManager.getInstance();
      am.onVictory(makeVictoryData({
        consumablesUsed: ['rerollTokens', 'goldBoostTokens', 'extraLifeTokens'],
      }));
      expect(am.isUnlocked('use-all-consumables')).toBe(true);
    });

    it('does not unlock use-all-consumables with partial consumables', () => {
      const am = AchievementManager.getInstance();
      am.onVictory(makeVictoryData({
        consumablesUsed: ['rerollTokens', 'goldBoostTokens'],
      }));
      expect(am.isUnlocked('use-all-consumables')).toBe(false);
    });

    it('unlocks clear-all-stages when all stages have been cleared', () => {
      const am = AchievementManager.getInstance();
      const sm = SaveManager.getInstance();
      // Pre-unlock all stage clears except one
      sm.unlockAchievement('clear-zaagaiganing');
      sm.unlockAchievement('clear-mashkiig');
      sm.unlockAchievement('clear-niizh-miikana');
      sm.unlockAchievement('clear-mitigomizh');
      // Now clear the last one via victory
      am.onVictory(makeVictoryData({ stageId: 'biboon-aki-01' }));
      expect(am.isUnlocked('clear-biboon-aki')).toBe(true);
      expect(am.isUnlocked('clear-all-stages')).toBe(true);
    });

    it('unlocks win-all-commanders when all commanders have won', () => {
      const am = AchievementManager.getInstance();
      const sm = SaveManager.getInstance();
      // Pre-unlock all commander wins except one
      sm.unlockAchievement('win-nokomis');
      sm.unlockAchievement('win-bizhiw');
      sm.unlockAchievement('win-animikiikaa');
      sm.unlockAchievement('win-makoons');
      sm.unlockAchievement('win-oshkaabewis');
      // Now win with the last commander
      am.onVictory(makeVictoryData({ commanderId: 'waabizii' }));
      expect(am.isUnlocked('win-waabizii')).toBe(true);
      expect(am.isUnlocked('win-all-commanders')).toBe(true);
    });
  });

  // ── Meta unlock purchased ─────────────────────────────────────────────────────

  describe('onMetaUnlockPurchased()', () => {
    it('unlocks unlock-mashkiig when map-02 is unlocked', () => {
      const sm = SaveManager.getInstance();
      sm.addCurrency(300);
      sm.purchaseUnlock('unlock-map-02', 300);
      const am = AchievementManager.getInstance();
      am.onMetaUnlockPurchased();
      expect(am.isUnlocked('unlock-mashkiig')).toBe(true);
    });

    it('does not unlock region achievements when prereqs not met', () => {
      const am = AchievementManager.getInstance();
      am.onMetaUnlockPurchased();
      expect(am.isUnlocked('unlock-mashkiig')).toBe(false);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Structural tests (source-level wiring checks via ?raw imports)
// ══════════════════════════════════════════════════════════════════════════════

import achievementDefsSrc from '../../data/achievementDefs.ts?raw';
import achievementManagerSrc from '../AchievementManager.ts?raw';
import gameSceneSrc from '../../scenes/GameScene.ts?raw';
import metaMenuSrc from '../../scenes/MetaMenuScene.ts?raw';
import mainMenuSrc from '../../scenes/MainMenuScene.ts?raw';
import gameOverSrc from '../../scenes/GameOverScene.ts?raw';
import mainSrc from '../../main.ts?raw';
import toastSrc from '../../ui/AchievementToast.ts?raw';
import achievementsSceneSrc from '../../scenes/AchievementsScene.ts?raw';
import waveManagerSrc from '../WaveManager.ts?raw';

describe('Structural: achievement wiring', () => {
  // ── Scene registration ─────────────────────────────────────────────────────

  it('AchievementsScene is registered in main.ts', () => {
    expect(mainSrc).toContain("import { AchievementsScene }");
    expect(mainSrc).toContain('AchievementsScene');
  });

  // ── MainMenuScene has achievements button ──────────────────────────────────

  it('MainMenuScene has achievements button that navigates to AchievementsScene', () => {
    expect(mainMenuSrc).toContain('ACHIEVEMENTS');
    expect(mainMenuSrc).toContain("'AchievementsScene'");
  });

  // ── GameScene integration ──────────────────────────────────────────────────

  it('GameScene imports AchievementManager', () => {
    expect(gameSceneSrc).toContain("import { AchievementManager }");
  });

  it('GameScene imports AchievementToast', () => {
    expect(gameSceneSrc).toContain("import { AchievementToast }");
  });

  it('GameScene calls onGameStarted()', () => {
    expect(gameSceneSrc).toContain('AchievementManager.getInstance().onGameStarted()');
  });

  it('GameScene tracks towers built via addTowerBuilt()', () => {
    expect(gameSceneSrc).toContain('addTowerBuilt(');
  });

  it('GameScene calls onTowerPathMaxed() on upgrade', () => {
    expect(gameSceneSrc).toContain('AchievementManager.getInstance().onTowerPathMaxed(');
  });

  it('GameScene calls onEndlessWaveReached() in endless mode', () => {
    expect(gameSceneSrc).toContain('AchievementManager.getInstance().onEndlessWaveReached(');
  });

  it('GameScene creates AchievementToast in create()', () => {
    expect(gameSceneSrc).toContain('new AchievementToast(this)');
  });

  it('GameScene destroys achievement toast in shutdown', () => {
    expect(gameSceneSrc).toContain('_achToast?.destroy()');
  });

  it('GameScene stores initial reroll count for tracking', () => {
    expect(gameSceneSrc).toContain('_achInitialRerolls');
    expect(gameSceneSrc).toContain('this._achInitialRerolls = c.rerollTokens');
  });

  it('GameScene computes rerollsUsed from initial - remaining', () => {
    expect(gameSceneSrc).toContain('this._achInitialRerolls - this._rerollTokens');
  });

  it('GameScene calls addRerolls() in _commitRunAchievements', () => {
    expect(gameSceneSrc).toContain('am.addRerolls(rerollsUsed)');
  });

  it('GameScene calls _commitRunAchievements(true) on victory', () => {
    expect(gameSceneSrc).toContain('this._commitRunAchievements(true)');
  });

  it('GameScene calls _commitRunAchievements(false) on game over', () => {
    expect(gameSceneSrc).toContain('this._commitRunAchievements(false)');
  });

  // ── MetaMenuScene integration ──────────────────────────────────────────────

  it('MetaMenuScene imports AchievementManager', () => {
    expect(metaMenuSrc).toContain("import { AchievementManager }");
  });

  it('MetaMenuScene calls addCrystalsSpent on consumable purchase', () => {
    expect(metaMenuSrc).toContain('AchievementManager.getInstance().addCrystalsSpent(');
  });

  it('MetaMenuScene calls addCrystalsSpent on unlock purchase', () => {
    // Must have addCrystalsSpent(node.cost)
    expect(metaMenuSrc).toContain('addCrystalsSpent(node.cost)');
  });

  it('MetaMenuScene calls onMetaUnlockPurchased on unlock purchase', () => {
    expect(metaMenuSrc).toContain('AchievementManager.getInstance().onMetaUnlockPurchased()');
  });

  // ── GameOverScene integration ──────────────────────────────────────────────

  it('GameOverScene imports AchievementManager', () => {
    expect(gameOverSrc).toContain("import { AchievementManager }");
  });

  it('GameOverScene checks currency achievement on crystal gain', () => {
    expect(gameOverSrc).toContain('onCurrencyChanged');
  });

  it('GameOverScene drains newly unlocked for toast display', () => {
    expect(gameOverSrc).toContain('drainNewlyUnlocked()');
  });

  // ── AchievementToast ──────────────────────────────────────────────────────

  it('AchievementToast has show(), showBatch(), and destroy()', () => {
    expect(toastSrc).toContain('show(achievementId: string)');
    expect(toastSrc).toContain('showBatch(ids: string[])');
    expect(toastSrc).toContain('destroy()');
  });

  it('AchievementToast queues multiple toasts', () => {
    expect(toastSrc).toContain('this.queue');
  });

  // ── AchievementsScene ──────────────────────────────────────────────────────

  it('AchievementsScene shows hidden achievements as ???', () => {
    expect(achievementsSceneSrc).toContain("'???'");
  });

  it('AchievementsScene shows progress bars for multi-target achievements', () => {
    expect(achievementsSceneSrc).toContain('def.target > 1');
  });

  it('AchievementsScene has category tabs', () => {
    expect(achievementsSceneSrc).toContain('ACHIEVEMENT_CATEGORIES');
  });

  it('AchievementsScene shows unlock count', () => {
    expect(achievementsSceneSrc).toContain('unlocked');
  });

  it('AchievementsScene has back button', () => {
    expect(achievementsSceneSrc).toContain("'BACK'");
  });

  // ── Achievement definitions structure ──────────────────────────────────────

  it('achievementDefs exports ALL_ACHIEVEMENTS', () => {
    expect(achievementDefsSrc).toContain('export const ALL_ACHIEVEMENTS');
  });

  it('achievementDefs exports helper functions', () => {
    expect(achievementDefsSrc).toContain('export function getAchievementDef');
    expect(achievementDefsSrc).toContain('export function getAchievementsByCategory');
  });

  // ── TASK-131 new wiring ────────────────────────────────────────────────────

  it('GameScene has _achAirKillsRun field', () => {
    expect(gameSceneSrc).toContain('_achAirKillsRun');
  });

  it('GameScene has _achTowersSoldRun field', () => {
    expect(gameSceneSrc).toContain('_achTowersSoldRun');
  });

  it('GameScene has _achRushesRun field', () => {
    expect(gameSceneSrc).toContain('_achRushesRun');
  });

  it('GameScene increments _achAirKillsRun on air creep kill', () => {
    expect(gameSceneSrc).toContain("data.creepType === 'air'");
    expect(gameSceneSrc).toContain('_achAirKillsRun++');
  });

  it('GameScene increments _achTowersSoldRun in sellTower', () => {
    expect(gameSceneSrc).toContain('_achTowersSoldRun++');
  });

  it('GameScene increments _achRushesRun in rushNextWave', () => {
    expect(gameSceneSrc).toContain('_achRushesRun++');
  });

  it('GameScene calls addAirKills in _commitRunAchievements', () => {
    expect(gameSceneSrc).toContain('am.addAirKills(this._achAirKillsRun)');
  });

  it('GameScene calls addTowersSold in _commitRunAchievements', () => {
    expect(gameSceneSrc).toContain('am.addTowersSold(this._achTowersSoldRun)');
  });

  it('GameScene calls addRushes in _commitRunAchievements', () => {
    expect(gameSceneSrc).toContain('am.addRushes(this._achRushesRun)');
  });

  it('GameScene calls addLifetimeGold in _commitRunAchievements', () => {
    expect(gameSceneSrc).toContain('am.addLifetimeGold(this._goldEarned)');
  });

  it('GameScene calls addWins(1) on victory in _commitRunAchievements', () => {
    expect(gameSceneSrc).toContain('am.addWins(1)');
  });

  it('GameScene calls checkAllTypesSimultaneous after tower placement', () => {
    expect(gameSceneSrc).toContain('checkAllTypesSimultaneous(');
  });

  it('WaveManager CreepKilledData includes creepType field', () => {
    expect(waveManagerSrc ?? '').toContain("creepType: 'ground' | 'air'");
  });

  it('WaveManager creep-killed emissions include creepType', () => {
    const wm = waveManagerSrc ?? '';
    expect(wm).toContain('creepType: creep.creepType');
  });

  it('AchievementManager has addAirKills method', () => {
    expect(achievementManagerSrc).toContain('addAirKills(');
  });

  it('AchievementManager has addTowersSold method', () => {
    expect(achievementManagerSrc).toContain('addTowersSold(');
  });

  it('AchievementManager has addRushes method', () => {
    expect(achievementManagerSrc).toContain('addRushes(');
  });

  it('AchievementManager has addLifetimeGold method', () => {
    expect(achievementManagerSrc).toContain('addLifetimeGold(');
  });

  it('AchievementManager has addWins method', () => {
    expect(achievementManagerSrc).toContain('addWins(');
  });

  it('AchievementManager has checkAllTypesSimultaneous method', () => {
    expect(achievementManagerSrc).toContain('checkAllTypesSimultaneous(');
  });

  it('AchievementManager does not track rerolls inside onVictory (moved to addRerolls)', () => {
    // The onVictory method should NOT contain rerollsTotal tracking
    // (this was moved to addRerolls to avoid double-counting)
    const onVictoryMatch = achievementManagerSrc.match(/onVictory\(data[\s\S]*?^  \}/m);
    if (onVictoryMatch) {
      expect(onVictoryMatch[0]).not.toContain("'rerollsTotal'");
    }
  });

  it('VictoryData interface does not include rerollsUsed (handled by addRerolls)', () => {
    // Extract the VictoryData interface
    const interfaceMatch = achievementManagerSrc.match(/export interface VictoryData \{[\s\S]*?\}/);
    expect(interfaceMatch).not.toBeNull();
    expect(interfaceMatch![0]).not.toContain('rerollsUsed');
  });
});
