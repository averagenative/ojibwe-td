/**
 * towerMetaUpgrades.test.ts
 *
 * Unit tests for the crystal-based permanent tower-stat upgrade system:
 *   A. Upgrade def data (costs, bonuses, tier caps, helpers)
 *   B. SaveManager persistence (buy, load, max-tier guard, sanitization)
 *   C. Stat application (applyTowerMetaToStats per tower type)
 *
 * Phaser-free. localStorage is mocked via vi.stubGlobal.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  TOWER_META_UPGRADE_DEFS,
  META_TIER_COSTS,
  META_TIER_BONUS_PCT,
  MAX_META_TIER,
  getMetaBonusPct,
  getMetaUpgradeCost,
  getMetaBonusDisplay,
  getNextTierBonusDisplay,
  applyTowerMetaToStats,
} from '../../data/towerMetaUpgradeDefs';

import { SaveManager } from '../../meta/SaveManager';
import { defaultUpgradeStats, ARROW_DEF, FROST_DEF, POISON_DEF, TESLA_DEF, AURA_DEF, ROCK_HURLER_DEF } from '../../data/towerDefs';

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
  };
}

function resetSingleton(): void {
  (SaveManager as unknown as { _instance: null })._instance = null;
}

// ════════════════════════════════════════════════════════════════════════════════
// A. Upgrade def data
// ════════════════════════════════════════════════════════════════════════════════

describe('A. TOWER_META_UPGRADE_DEFS — structure', () => {
  it('defines exactly 6 tower types', () => {
    expect(TOWER_META_UPGRADE_DEFS).toHaveLength(6);
  });

  it('covers arrow, rock-hurler, frost, poison, tesla, aura keys', () => {
    const keys = TOWER_META_UPGRADE_DEFS.map(d => d.towerKey);
    expect(keys).toContain('arrow');
    expect(keys).toContain('rock-hurler');
    expect(keys).toContain('frost');
    expect(keys).toContain('poison');
    expect(keys).toContain('tesla');
    expect(keys).toContain('aura');
  });

  it('each tower has exactly 4 stat tracks', () => {
    for (const def of TOWER_META_UPGRADE_DEFS) {
      expect(def.stats).toHaveLength(4);
    }
  });

  it('arrow has damage, attackSpeed, range, multiShot tracks', () => {
    const arrow = TOWER_META_UPGRADE_DEFS.find(d => d.towerKey === 'arrow')!;
    const keys = arrow.stats.map(s => s.key);
    expect(keys).toContain('damage');
    expect(keys).toContain('attackSpeed');
    expect(keys).toContain('range');
    expect(keys).toContain('multiShot');
  });

  it('multiShot track is flat displayKind', () => {
    const arrow = TOWER_META_UPGRADE_DEFS.find(d => d.towerKey === 'arrow')!;
    const ms = arrow.stats.find(s => s.key === 'multiShot')!;
    expect(ms.displayKind).toBe('flat');
  });

  it('frost has slowPct track', () => {
    const frost = TOWER_META_UPGRADE_DEFS.find(d => d.towerKey === 'frost')!;
    expect(frost.stats.map(s => s.key)).toContain('slowPct');
  });

  it('poison has dotDamage and dotStacks tracks', () => {
    const poison = TOWER_META_UPGRADE_DEFS.find(d => d.towerKey === 'poison')!;
    const keys = poison.stats.map(s => s.key);
    expect(keys).toContain('dotDamage');
    expect(keys).toContain('dotStacks');
  });

  it('dotStacks track is flat displayKind', () => {
    const poison = TOWER_META_UPGRADE_DEFS.find(d => d.towerKey === 'poison')!;
    const ds = poison.stats.find(s => s.key === 'dotStacks')!;
    expect(ds.displayKind).toBe('flat');
  });

  it('tesla has chains track', () => {
    const tesla = TOWER_META_UPGRADE_DEFS.find(d => d.towerKey === 'tesla')!;
    expect(tesla.stats.map(s => s.key)).toContain('chains');
  });

  it('chains track is flat displayKind', () => {
    const tesla = TOWER_META_UPGRADE_DEFS.find(d => d.towerKey === 'tesla')!;
    const ch = tesla.stats.find(s => s.key === 'chains')!;
    expect(ch.displayKind).toBe('flat');
  });

  it('aura has auraStrength, range, auraDamage, auraRange tracks', () => {
    const aura = TOWER_META_UPGRADE_DEFS.find(d => d.towerKey === 'aura')!;
    const keys = aura.stats.map(s => s.key);
    expect(keys).toContain('auraStrength');
    expect(keys).toContain('range');
    expect(keys).toContain('auraDamage');
    expect(keys).toContain('auraRange');
  });
});

describe('A. Constants', () => {
  it('MAX_META_TIER is 5', () => {
    expect(MAX_META_TIER).toBe(5);
  });

  it('META_TIER_COSTS has 5 entries matching [5,10,20,40,80]', () => {
    expect(META_TIER_COSTS).toHaveLength(5);
    expect([...META_TIER_COSTS]).toEqual([5, 10, 20, 40, 80]);
  });

  it('META_TIER_BONUS_PCT has 5 entries', () => {
    expect(META_TIER_BONUS_PCT).toHaveLength(5);
  });

  it('total cost to max one stat is 155', () => {
    const total = META_TIER_COSTS.reduce((sum, c) => sum + c, 0);
    expect(total).toBe(155);
  });

  it('META_TIER_BONUS_PCT is monotonically increasing', () => {
    for (let i = 1; i < META_TIER_BONUS_PCT.length; i++) {
      expect(META_TIER_BONUS_PCT[i]).toBeGreaterThan(META_TIER_BONUS_PCT[i - 1]);
    }
  });
});

describe('A. getMetaBonusPct', () => {
  it('tier 0 returns 0', () => expect(getMetaBonusPct(0)).toBe(0));
  it('tier 1 returns 0.05', () => expect(getMetaBonusPct(1)).toBeCloseTo(0.05));
  it('tier 3 returns 0.15', () => expect(getMetaBonusPct(3)).toBeCloseTo(0.15));
  it('tier 5 returns 0.25', () => expect(getMetaBonusPct(5)).toBeCloseTo(0.25));
  it('tier >5 clamps to 0.25', () => expect(getMetaBonusPct(99)).toBeCloseTo(0.25));
  it('negative tier returns 0', () => expect(getMetaBonusPct(-1)).toBe(0));
});

describe('A. getMetaUpgradeCost', () => {
  it('tier 0 costs 5 (cost to buy tier 1)', () => expect(getMetaUpgradeCost(0)).toBe(5));
  it('tier 1 costs 10', () => expect(getMetaUpgradeCost(1)).toBe(10));
  it('tier 4 costs 80 (last tier)', () => expect(getMetaUpgradeCost(4)).toBe(80));
  it('tier 5 (already maxed) returns 0', () => expect(getMetaUpgradeCost(5)).toBe(0));
});

describe('A. getMetaBonusDisplay', () => {
  const pctTrack = { key: 'damage', label: 'Damage', description: '', displayKind: 'pct' as const };
  const flatTrack = { key: 'multiShot', label: 'Multi-Shot', description: '', displayKind: 'flat' as const, flatUnit: '' };

  it('pct track tier 0 shows +0%', () => {
    expect(getMetaBonusDisplay(pctTrack, 0)).toBe('+0%');
  });
  it('pct track tier 1 shows +5%', () => {
    expect(getMetaBonusDisplay(pctTrack, 1)).toBe('+5%');
  });
  it('pct track tier 5 shows MAXED', () => {
    expect(getMetaBonusDisplay(pctTrack, 5)).toBe('MAXED');
  });
  it('flat track tier 0 shows +0', () => {
    expect(getMetaBonusDisplay(flatTrack, 0)).toBe('+0');
  });
  it('flat track tier 2 shows +1', () => {
    expect(getMetaBonusDisplay(flatTrack, 2)).toBe('+1');
  });
  it('flat track tier 5 shows MAXED', () => {
    expect(getMetaBonusDisplay(flatTrack, 5)).toBe('MAXED');
  });
});

describe('A. getNextTierBonusDisplay', () => {
  const pctTrack = { key: 'damage', label: 'Damage', description: '', displayKind: 'pct' as const };
  const flatTrack = { key: 'multiShot', label: 'Multi-Shot', description: '', displayKind: 'flat' as const, flatUnit: '' };

  it('pct track tier 0 → next is +5%', () => {
    expect(getNextTierBonusDisplay(pctTrack, 0)).toBe('+5%');
  });
  it('pct track tier 4 → next is +5%', () => {
    expect(getNextTierBonusDisplay(pctTrack, 4)).toBe('+5%');
  });
  it('pct track tier 5 (maxed) → MAXED', () => {
    expect(getNextTierBonusDisplay(pctTrack, 5)).toBe('MAXED');
  });
  it('flat track tier 0 → +0 (no gain at tier 1)', () => {
    // floor(1/2) - floor(0/2) = 0 - 0 = 0
    expect(getNextTierBonusDisplay(flatTrack, 0)).toBe('+0');
  });
  it('flat track tier 1 → +1 (gain at tier 2)', () => {
    // floor(2/2) - floor(1/2) = 1 - 0 = 1
    expect(getNextTierBonusDisplay(flatTrack, 1)).toBe('+1');
  });
  it('flat track tier 5 → MAXED', () => {
    expect(getNextTierBonusDisplay(flatTrack, 5)).toBe('MAXED');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// B. SaveManager persistence
// ════════════════════════════════════════════════════════════════════════════════

describe('B. SaveManager — towerMetaUpgrades', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeStoreMock());
    resetSingleton();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetSingleton();
  });

  it('defaults to empty record', () => {
    const save = SaveManager.getInstance();
    expect(save.getTowerMetaUpgrades()).toEqual({});
  });

  it('getTowerMetaUpgradeTier returns 0 for unknown tower/stat', () => {
    const save = SaveManager.getInstance();
    expect(save.getTowerMetaUpgradeTier('arrow', 'damage')).toBe(0);
  });

  it('purchaseTowerMetaUpgrade deducts cost and increments tier', () => {
    const save = SaveManager.getInstance();
    save.addCurrency(100);
    const ok = save.purchaseTowerMetaUpgrade('arrow', 'damage');
    expect(ok).toBe(true);
    expect(save.getTowerMetaUpgradeTier('arrow', 'damage')).toBe(1);
    expect(save.getCurrency()).toBe(95); // 100 - 5
  });

  it('purchasing multiple tiers accumulates correctly', () => {
    const save = SaveManager.getInstance();
    save.addCurrency(200);
    save.purchaseTowerMetaUpgrade('arrow', 'damage'); // tier 1, cost 5
    save.purchaseTowerMetaUpgrade('arrow', 'damage'); // tier 2, cost 10
    expect(save.getTowerMetaUpgradeTier('arrow', 'damage')).toBe(2);
    expect(save.getCurrency()).toBe(185); // 200 - 5 - 10
  });

  it('returns false when cannot afford', () => {
    const save = SaveManager.getInstance();
    // No currency added — cost is 5
    const ok = save.purchaseTowerMetaUpgrade('frost', 'range');
    expect(ok).toBe(false);
    expect(save.getTowerMetaUpgradeTier('frost', 'range')).toBe(0);
  });

  it('returns false when already at MAX_META_TIER', () => {
    const save = SaveManager.getInstance();
    save.addCurrency(999);
    // Buy all 5 tiers
    for (let i = 0; i < MAX_META_TIER; i++) {
      save.purchaseTowerMetaUpgrade('tesla', 'damage');
    }
    expect(save.getTowerMetaUpgradeTier('tesla', 'damage')).toBe(MAX_META_TIER);
    const ok = save.purchaseTowerMetaUpgrade('tesla', 'damage');
    expect(ok).toBe(false);
  });

  it('getTowerMetaUpgrades returns a deep copy', () => {
    const save = SaveManager.getInstance();
    save.addCurrency(100);
    save.purchaseTowerMetaUpgrade('aura', 'range');
    const copy = save.getTowerMetaUpgrades();
    copy['aura']['range'] = 99; // mutate copy
    expect(save.getTowerMetaUpgradeTier('aura', 'range')).toBe(1); // original unchanged
  });

  it('persists across singleton resets (localStorage round-trip)', () => {
    const save = SaveManager.getInstance();
    save.addCurrency(200);
    save.purchaseTowerMetaUpgrade('poison', 'dotDamage'); // tier 1
    save.purchaseTowerMetaUpgrade('poison', 'dotDamage'); // tier 2

    // Reset singleton and reload
    resetSingleton();
    const save2 = SaveManager.getInstance();
    expect(save2.getTowerMetaUpgradeTier('poison', 'dotDamage')).toBe(2);
    expect(save2.getCurrency()).toBe(185); // 200 - 5 - 10
  });

  it('sanitizes tier values > MAX_META_TIER on load', () => {
    // Directly seed localStorage with an out-of-range tier
    const raw = {
      version: 1,
      currency: 0,
      unlocks: [],
      towerMetaUpgrades: { arrow: { damage: 99 } },
    };
    (localStorage as ReturnType<typeof makeStoreMock>).setItem('ojibwe-td-save', JSON.stringify(raw));
    resetSingleton();
    const save = SaveManager.getInstance();
    expect(save.getTowerMetaUpgradeTier('arrow', 'damage')).toBe(MAX_META_TIER);
  });

  it('sanitizes negative tier values to 0', () => {
    const raw = {
      version: 1,
      currency: 0,
      unlocks: [],
      towerMetaUpgrades: { frost: { range: -3 } },
    };
    (localStorage as ReturnType<typeof makeStoreMock>).setItem('ojibwe-td-save', JSON.stringify(raw));
    resetSingleton();
    const save = SaveManager.getInstance();
    expect(save.getTowerMetaUpgradeTier('frost', 'range')).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// C. Stat application — applyTowerMetaToStats
// ════════════════════════════════════════════════════════════════════════════════

describe('C. applyTowerMetaToStats — arrow', () => {
  it('no upgrades → stats unchanged', () => {
    const stats = defaultUpgradeStats(ARROW_DEF);
    const baseDmg = stats.damage;
    applyTowerMetaToStats(stats, 'arrow', {});
    expect(stats.damage).toBeCloseTo(baseDmg);
  });

  it('damage tier 1 increases damage by 5%', () => {
    const stats = defaultUpgradeStats(ARROW_DEF);
    const base = stats.damage;
    applyTowerMetaToStats(stats, 'arrow', { damage: 1 });
    expect(stats.damage).toBeCloseTo(base * 1.05);
  });

  it('damage tier 5 increases damage by 25%', () => {
    const stats = defaultUpgradeStats(ARROW_DEF);
    const base = stats.damage;
    applyTowerMetaToStats(stats, 'arrow', { damage: 5 });
    expect(stats.damage).toBeCloseTo(base * 1.25);
  });

  it('attackSpeed tier 1 reduces attackIntervalMs by 5%', () => {
    const stats = defaultUpgradeStats(ARROW_DEF);
    const base = stats.attackIntervalMs;
    applyTowerMetaToStats(stats, 'arrow', { attackSpeed: 1 });
    expect(stats.attackIntervalMs).toBeCloseTo(base * 0.95);
  });

  it('range tier 3 increases range by 15%', () => {
    const stats = defaultUpgradeStats(ARROW_DEF);
    const base = stats.range;
    applyTowerMetaToStats(stats, 'arrow', { range: 3 });
    expect(stats.range).toBeCloseTo(base * 1.15);
  });

  it('multiShot tier 2 grants +1 extra shot', () => {
    const stats = defaultUpgradeStats(ARROW_DEF);
    const base = stats.multiShotCount;
    applyTowerMetaToStats(stats, 'arrow', { multiShot: 2 });
    expect(stats.multiShotCount).toBe(base + 1);
  });

  it('multiShot tier 5 grants +2 extra shots', () => {
    const stats = defaultUpgradeStats(ARROW_DEF);
    const base = stats.multiShotCount;
    applyTowerMetaToStats(stats, 'arrow', { multiShot: 5 });
    expect(stats.multiShotCount).toBe(base + 2);
  });

  it('multiShot tier 1 grants +0 (no gain at tier 1)', () => {
    const stats = defaultUpgradeStats(ARROW_DEF);
    const base = stats.multiShotCount;
    applyTowerMetaToStats(stats, 'arrow', { multiShot: 1 });
    expect(stats.multiShotCount).toBe(base + 0);
  });
});

describe('C. applyTowerMetaToStats — rock-hurler', () => {
  it('damage tier 5 increases damage by 25%', () => {
    const stats = defaultUpgradeStats(ROCK_HURLER_DEF);
    const base = stats.damage;
    applyTowerMetaToStats(stats, 'rock-hurler', { damage: 5 });
    expect(stats.damage).toBeCloseTo(base * 1.25);
  });

  it('splash tier 3 increases splashRadius by 15%', () => {
    const stats = defaultUpgradeStats(ROCK_HURLER_DEF);
    const base = stats.splashRadius;
    applyTowerMetaToStats(stats, 'rock-hurler', { splash: 3 });
    expect(stats.splashRadius).toBeCloseTo(base * 1.15);
  });

  it('attackSpeed tier 2 reduces interval by 10%', () => {
    const stats = defaultUpgradeStats(ROCK_HURLER_DEF);
    const base = stats.attackIntervalMs;
    applyTowerMetaToStats(stats, 'rock-hurler', { attackSpeed: 2 });
    expect(stats.attackIntervalMs).toBeCloseTo(base * 0.90);
  });
});

describe('C. applyTowerMetaToStats — frost', () => {
  it('damage upgrade increases damage', () => {
    const stats = defaultUpgradeStats(FROST_DEF);
    const base = stats.damage;
    applyTowerMetaToStats(stats, 'frost', { damage: 2 });
    expect(stats.damage).toBeCloseTo(base * 1.10);
  });

  it('slowPct tier 1 reduces slowFactor by 5%', () => {
    const stats = defaultUpgradeStats(FROST_DEF);
    const base = stats.slowFactor;
    applyTowerMetaToStats(stats, 'frost', { slowPct: 1 });
    expect(stats.slowFactor).toBeCloseTo(base * 0.95);
  });

  it('slowPct tier 5 reduces slowFactor by 25%', () => {
    const stats = defaultUpgradeStats(FROST_DEF);
    const base = stats.slowFactor;
    applyTowerMetaToStats(stats, 'frost', { slowPct: 5 });
    expect(stats.slowFactor).toBeCloseTo(base * 0.75);
  });
});

describe('C. applyTowerMetaToStats — poison', () => {
  it('dotDamage tier 3 increases dotDamageBase by 15%', () => {
    const stats = defaultUpgradeStats(POISON_DEF);
    const base = stats.dotDamageBase;
    applyTowerMetaToStats(stats, 'poison', { dotDamage: 3 });
    expect(stats.dotDamageBase).toBeCloseTo(base * 1.15);
  });

  it('dotStacks tier 4 adds +2 to maxDotStacks', () => {
    const stats = defaultUpgradeStats(POISON_DEF);
    const base = stats.maxDotStacks;
    applyTowerMetaToStats(stats, 'poison', { dotStacks: 4 });
    expect(stats.maxDotStacks).toBe(base + 2);
  });

  it('dotStacks tier 3 adds +1 to maxDotStacks', () => {
    const stats = defaultUpgradeStats(POISON_DEF);
    const base = stats.maxDotStacks;
    applyTowerMetaToStats(stats, 'poison', { dotStacks: 3 });
    expect(stats.maxDotStacks).toBe(base + 1);
  });
});

describe('C. applyTowerMetaToStats — tesla', () => {
  it('damage tier 2 increases damage by 10%', () => {
    const stats = defaultUpgradeStats(TESLA_DEF);
    const base = stats.damage;
    applyTowerMetaToStats(stats, 'tesla', { damage: 2 });
    expect(stats.damage).toBeCloseTo(base * 1.10);
  });

  it('chains tier 4 adds +2 to chainCount', () => {
    const stats = defaultUpgradeStats(TESLA_DEF);
    const base = stats.chainCount;
    applyTowerMetaToStats(stats, 'tesla', { chains: 4 });
    expect(stats.chainCount).toBe(base + 2);
  });

  it('chains tier 5 adds +2 to chainCount (same as tier 4 for floor(5/2)=2)', () => {
    const stats = defaultUpgradeStats(TESLA_DEF);
    const base = stats.chainCount;
    applyTowerMetaToStats(stats, 'tesla', { chains: 5 });
    expect(stats.chainCount).toBe(base + 2);
  });
});

describe('C. applyTowerMetaToStats — aura', () => {
  it('auraStrength tier 1 reduces auraIntervalMult by 5%', () => {
    const stats = defaultUpgradeStats(AURA_DEF);
    const base = stats.auraIntervalMult;
    applyTowerMetaToStats(stats, 'aura', { auraStrength: 1 });
    expect(stats.auraIntervalMult).toBeCloseTo(base * 0.95);
  });

  it('auraDamage tier 5 multiplies auraDamageMult by 1.25', () => {
    const stats = defaultUpgradeStats(AURA_DEF);
    const base = stats.auraDamageMult;
    applyTowerMetaToStats(stats, 'aura', { auraDamage: 5 });
    expect(stats.auraDamageMult).toBeCloseTo(base * 1.25);
  });

  it('auraRange tier 3 adds 0.15 to auraRangePct', () => {
    const stats = defaultUpgradeStats(AURA_DEF);
    const base = stats.auraRangePct;
    applyTowerMetaToStats(stats, 'aura', { auraRange: 3 });
    expect(stats.auraRangePct).toBeCloseTo(base + 0.15);
  });

  it('aura attackIntervalMs is Infinity — does not go NaN from attackSpeed track', () => {
    // Aura has no attackSpeed track, but guard should prevent NaN
    const stats = defaultUpgradeStats(AURA_DEF);
    applyTowerMetaToStats(stats, 'aura', {}); // no-op
    expect(Number.isFinite(stats.attackIntervalMs)).toBe(false); // still Infinity
    expect(Number.isNaN(stats.attackIntervalMs)).toBe(false);
  });
});

describe('C. applyTowerMetaToStats — unknown tower key', () => {
  it('does not throw and leaves stats unchanged', () => {
    const stats = defaultUpgradeStats(ARROW_DEF);
    const baseDmg = stats.damage;
    expect(() => applyTowerMetaToStats(stats, 'unknown-tower', { damage: 5 })).not.toThrow();
    expect(stats.damage).toBeCloseTo(baseDmg);
  });
});
