/**
 * Crystal-sink expansion — unit tests for purchase/consume flows.
 *
 * Tests SaveManager.purchaseConsumable(), getPendingConsumables(),
 * consumeAndClearRunConsumables(), and sanitization of the new
 * pendingConsumables field.
 *
 * localStorage is mocked via vi.stubGlobal; singleton is reset between tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SaveManager,
  CONSUMABLE_COSTS,
  GOLD_BOOST_AMOUNT,
} from '../../meta/SaveManager';
import type { ConsumablePending } from '../../meta/SaveManager';

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  };
  storageMock.setItem(SAVE_KEY, JSON.stringify({ ...base, ...overrides }));
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('Crystal-sink consumables', () => {
  beforeEach(() => {
    storageMock = makeStoreMock();
    vi.stubGlobal('localStorage', storageMock);
    resetSingleton();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetSingleton();
  });

  // ── Exported constants ────────────────────────────────────────────────────

  describe('exported constants', () => {
    it('CONSUMABLE_COSTS has all three types with positive costs', () => {
      expect(CONSUMABLE_COSTS.rerollTokens).toBeGreaterThan(0);
      expect(CONSUMABLE_COSTS.goldBoostTokens).toBeGreaterThan(0);
      expect(CONSUMABLE_COSTS.extraLifeTokens).toBeGreaterThan(0);
    });

    it('GOLD_BOOST_AMOUNT is a positive number', () => {
      expect(GOLD_BOOST_AMOUNT).toBeGreaterThan(0);
    });

    it('extraLifeTokens costs more than rerollTokens', () => {
      expect(CONSUMABLE_COSTS.extraLifeTokens).toBeGreaterThan(CONSUMABLE_COSTS.rerollTokens);
    });
  });

  // ── Default state ─────────────────────────────────────────────────────────

  describe('default state', () => {
    it('starts with all pending consumables at 0', () => {
      const sm = SaveManager.getInstance();
      const pending = sm.getPendingConsumables();
      expect(pending.rerollTokens).toBe(0);
      expect(pending.goldBoostTokens).toBe(0);
      expect(pending.extraLifeTokens).toBe(0);
    });

    it('getPendingConsumables returns a snapshot (not a live reference)', () => {
      const sm = SaveManager.getInstance();
      const snap1 = sm.getPendingConsumables();
      sm.purchaseConsumable('rerollTokens');  // no currency — will fail, that's fine
      const snap2 = sm.getPendingConsumables();
      // Modifying snap1 should not affect sm's internal data
      snap1.rerollTokens = 99;
      expect(sm.getPendingConsumables().rerollTokens).toBe(snap2.rerollTokens);
    });
  });

  // ── purchaseConsumable ────────────────────────────────────────────────────

  describe('purchaseConsumable', () => {
    it('returns false when player cannot afford it', () => {
      const sm = SaveManager.getInstance();
      sm.addCurrency(10); // less than any consumable cost
      expect(sm.purchaseConsumable('rerollTokens')).toBe(false);
      expect(sm.getPendingConsumables().rerollTokens).toBe(0);
    });

    it('deducts crystal cost and adds token when affordable', () => {
      const sm = SaveManager.getInstance();
      const cost = CONSUMABLE_COSTS.rerollTokens;
      sm.addCurrency(cost);
      expect(sm.purchaseConsumable('rerollTokens')).toBe(true);
      expect(sm.getCurrency()).toBe(0);
      expect(sm.getPendingConsumables().rerollTokens).toBe(1);
    });

    it('tokens accumulate with multiple purchases', () => {
      const sm = SaveManager.getInstance();
      const cost = CONSUMABLE_COSTS.rerollTokens;
      sm.addCurrency(cost * 3);
      sm.purchaseConsumable('rerollTokens');
      sm.purchaseConsumable('rerollTokens');
      sm.purchaseConsumable('rerollTokens');
      expect(sm.getPendingConsumables().rerollTokens).toBe(3);
      expect(sm.getCurrency()).toBe(0);
    });

    it('works independently for each consumable type', () => {
      const sm = SaveManager.getInstance();
      sm.addCurrency(
        CONSUMABLE_COSTS.rerollTokens +
        CONSUMABLE_COSTS.goldBoostTokens +
        CONSUMABLE_COSTS.extraLifeTokens,
      );
      sm.purchaseConsumable('rerollTokens');
      sm.purchaseConsumable('goldBoostTokens');
      sm.purchaseConsumable('extraLifeTokens');
      const pending = sm.getPendingConsumables();
      expect(pending.rerollTokens).toBe(1);
      expect(pending.goldBoostTokens).toBe(1);
      expect(pending.extraLifeTokens).toBe(1);
      expect(sm.getCurrency()).toBe(0);
    });

    it('returns false when token cap (99) is reached without deducting currency', () => {
      // Seed with 99 reroll tokens already held
      seedRaw({ currency: 999_999, pendingConsumables: { rerollTokens: 99, goldBoostTokens: 0, extraLifeTokens: 0 } });
      resetSingleton();
      const sm2 = SaveManager.getInstance();
      const currBefore = sm2.getCurrency();
      expect(sm2.purchaseConsumable('rerollTokens')).toBe(false);
      expect(sm2.getPendingConsumables().rerollTokens).toBe(99);
      expect(sm2.getCurrency()).toBe(currBefore); // no crystals deducted
    });

    it('returns false when currency is one short of cost', () => {
      const sm = SaveManager.getInstance();
      const cost = CONSUMABLE_COSTS.extraLifeTokens;
      sm.addCurrency(cost - 1);
      expect(sm.purchaseConsumable('extraLifeTokens')).toBe(false);
      expect(sm.getPendingConsumables().extraLifeTokens).toBe(0);
      expect(sm.getCurrency()).toBe(cost - 1);
    });

    it('succeeds when currency exactly equals cost', () => {
      const sm = SaveManager.getInstance();
      const cost = CONSUMABLE_COSTS.goldBoostTokens;
      sm.addCurrency(cost);
      expect(sm.purchaseConsumable('goldBoostTokens')).toBe(true);
      expect(sm.getPendingConsumables().goldBoostTokens).toBe(1);
      expect(sm.getCurrency()).toBe(0);
    });

    it('persists tokens across save/load roundtrip', () => {
      const sm = SaveManager.getInstance();
      const cost = CONSUMABLE_COSTS.goldBoostTokens;
      sm.addCurrency(cost * 2);
      sm.purchaseConsumable('goldBoostTokens');
      sm.purchaseConsumable('goldBoostTokens');
      // Reload
      resetSingleton();
      const sm2 = SaveManager.getInstance();
      expect(sm2.getPendingConsumables().goldBoostTokens).toBe(2);
    });
  });

  // ── consumeAndClearRunConsumables ─────────────────────────────────────────

  describe('consumeAndClearRunConsumables', () => {
    it('returns zero snapshot when no tokens held', () => {
      const sm = SaveManager.getInstance();
      const result = sm.consumeAndClearRunConsumables();
      expect(result.rerollTokens).toBe(0);
      expect(result.goldBoostTokens).toBe(0);
      expect(result.extraLifeTokens).toBe(0);
    });

    it('returns correct snapshot and clears all tokens', () => {
      const sm = SaveManager.getInstance();
      const totalCost =
        CONSUMABLE_COSTS.rerollTokens +
        CONSUMABLE_COSTS.goldBoostTokens * 2 +
        CONSUMABLE_COSTS.extraLifeTokens;
      sm.addCurrency(totalCost);
      sm.purchaseConsumable('rerollTokens');
      sm.purchaseConsumable('goldBoostTokens');
      sm.purchaseConsumable('goldBoostTokens');
      sm.purchaseConsumable('extraLifeTokens');

      const result = sm.consumeAndClearRunConsumables();
      expect(result.rerollTokens).toBe(1);
      expect(result.goldBoostTokens).toBe(2);
      expect(result.extraLifeTokens).toBe(1);

      // All cleared
      const after = sm.getPendingConsumables();
      expect(after.rerollTokens).toBe(0);
      expect(after.goldBoostTokens).toBe(0);
      expect(after.extraLifeTokens).toBe(0);
    });

    it('does not modify currency when consuming', () => {
      const sm = SaveManager.getInstance();
      sm.addCurrency(CONSUMABLE_COSTS.rerollTokens);
      sm.purchaseConsumable('rerollTokens');
      const currencyBefore = sm.getCurrency();
      sm.consumeAndClearRunConsumables();
      expect(sm.getCurrency()).toBe(currencyBefore); // consuming doesn't cost crystals
    });

    it('persists cleared state after consume', () => {
      const sm = SaveManager.getInstance();
      sm.addCurrency(CONSUMABLE_COSTS.extraLifeTokens);
      sm.purchaseConsumable('extraLifeTokens');
      sm.consumeAndClearRunConsumables();
      // Reload singleton
      resetSingleton();
      const sm2 = SaveManager.getInstance();
      expect(sm2.getPendingConsumables().extraLifeTokens).toBe(0);
    });

    it('calling twice in a row returns zero on the second call', () => {
      const sm = SaveManager.getInstance();
      sm.addCurrency(CONSUMABLE_COSTS.rerollTokens);
      sm.purchaseConsumable('rerollTokens');
      sm.consumeAndClearRunConsumables();
      const second = sm.consumeAndClearRunConsumables();
      expect(second.rerollTokens).toBe(0);
    });
  });

  // ── pendingConsumables sanitization ───────────────────────────────────────

  describe('pendingConsumables sanitization', () => {
    it('back-fills default zeros for old saves lacking the field', () => {
      seedRaw({}); // no pendingConsumables key
      const sm = SaveManager.getInstance();
      const pending = sm.getPendingConsumables();
      expect(pending.rerollTokens).toBe(0);
      expect(pending.goldBoostTokens).toBe(0);
      expect(pending.extraLifeTokens).toBe(0);
    });

    it('clamps negative values to 0', () => {
      seedRaw({ pendingConsumables: { rerollTokens: -5, goldBoostTokens: -1, extraLifeTokens: -99 } });
      const sm = SaveManager.getInstance();
      const p = sm.getPendingConsumables();
      expect(p.rerollTokens).toBe(0);
      expect(p.goldBoostTokens).toBe(0);
      expect(p.extraLifeTokens).toBe(0);
    });

    it('clamps values above 99 to 99', () => {
      seedRaw({ pendingConsumables: { rerollTokens: 200, goldBoostTokens: 999, extraLifeTokens: 100 } });
      const sm = SaveManager.getInstance();
      const p = sm.getPendingConsumables();
      expect(p.rerollTokens).toBe(99);
      expect(p.goldBoostTokens).toBe(99);
      expect(p.extraLifeTokens).toBe(99);
    });

    it('floors fractional values', () => {
      seedRaw({ pendingConsumables: { rerollTokens: 3.9, goldBoostTokens: 1.1, extraLifeTokens: 2.5 } });
      const sm = SaveManager.getInstance();
      const p = sm.getPendingConsumables();
      expect(p.rerollTokens).toBe(3);
      expect(p.goldBoostTokens).toBe(1);
      expect(p.extraLifeTokens).toBe(2);
    });

    it('defaults non-number values to 0', () => {
      seedRaw({ pendingConsumables: { rerollTokens: 'lots', goldBoostTokens: null, extraLifeTokens: true } });
      const sm = SaveManager.getInstance();
      const p = sm.getPendingConsumables();
      expect(p.rerollTokens).toBe(0);
      expect(p.goldBoostTokens).toBe(0);
      expect(p.extraLifeTokens).toBe(0);
    });

    it('handles non-object pendingConsumables gracefully', () => {
      seedRaw({ pendingConsumables: 'bad' });
      const sm = SaveManager.getInstance();
      const p = sm.getPendingConsumables();
      expect(p.rerollTokens).toBe(0);
      expect(p.goldBoostTokens).toBe(0);
      expect(p.extraLifeTokens).toBe(0);
    });
  });

  // ── Gold boost amount ─────────────────────────────────────────────────────

  describe('GOLD_BOOST_AMOUNT', () => {
    it('equals 50', () => {
      expect(GOLD_BOOST_AMOUNT).toBe(50);
    });
  });
});

// ── ConsumablePending interface shape ─────────────────────────────────────────

describe('ConsumablePending interface', () => {
  it('has the expected keys', () => {
    // Type-level check exercised at runtime via the CONSUMABLE_COSTS object
    const keys = Object.keys(CONSUMABLE_COSTS) as (keyof ConsumablePending)[];
    expect(keys).toContain('rerollTokens');
    expect(keys).toContain('goldBoostTokens');
    expect(keys).toContain('extraLifeTokens');
    expect(keys).toHaveLength(3);
  });
});
