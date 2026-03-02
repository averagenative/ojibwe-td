import { describe, it, expect } from 'vitest';
import {
  ALL_GEAR_DEFS,
  getGearDef,
  canEquipOnTower,
  rollLoot,
  createGearInstance,
  getNextRarity,
  RARITY_ORDER,
  getEnhancedStatMult,
  generateGearUid,
  getGearDefsByType,
  getGearDefsByRarity,
} from '../../data/gearDefs';
import {
  applyGearToStats,
  emptyGearBonuses,
  hasGearEffect,
} from '../GearSystem';
import { defaultUpgradeStats, CANNON_DEF, FROST_DEF, TESLA_DEF, AURA_DEF } from '../../data/towerDefs';
import {
  calculateRunXp,
  levelFromXp,
  xpForLevel,
  enhancementSlotsAtLevel,
  isSignatureUnlocked,
  isMasteryUnlocked,
  isPassiveUpgraded,
  getAvailableEnhancements,
  getSignatureAbility,
  ALL_ENHANCEMENTS,
  COMMANDER_LEVEL_REWARDS,
} from '../../data/enhancementDefs';
import {
  ALL_CHALLENGES,
  getChallengeDef,
  getFeaturedChallengeId,
  isTowerAllowed,
  getUnlockedChallenges,
} from '../../data/challengeDefs';

// ── gearDefs ─────────────────────────────────────────────────────────────────

describe('gearDefs', () => {
  it('has at least 30 gear definitions', () => {
    expect(ALL_GEAR_DEFS.length).toBeGreaterThanOrEqual(30);
  });

  it('all gear defs have unique IDs', () => {
    const ids = ALL_GEAR_DEFS.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getGearDef finds existing items', () => {
    expect(getGearDef('barrel-iron-sight')).toBeDefined();
    expect(getGearDef('charm-thunderbirds-spark')).toBeDefined();
    expect(getGearDef('nonexistent')).toBeUndefined();
  });

  it('canEquipOnTower allows universal on any tower', () => {
    const charm = getGearDef('charm-flint')!;
    expect(canEquipOnTower(charm, 'cannon')).toBe(true);
    expect(canEquipOnTower(charm, 'frost')).toBe(true);
    expect(canEquipOnTower(charm, 'tesla')).toBe(true);
  });

  it('canEquipOnTower restricts typed gear', () => {
    const barrel = getGearDef('barrel-iron-sight')!;
    expect(canEquipOnTower(barrel, 'cannon')).toBe(true);
    expect(canEquipOnTower(barrel, 'frost')).toBe(false);
    expect(canEquipOnTower(barrel, 'tesla')).toBe(false);
  });

  it('covers all tower types plus universal', () => {
    const types = new Set(ALL_GEAR_DEFS.map(d => d.gearType));
    expect(types.has('barrel-mod')).toBe(true);
    expect(types.has('crystal-core')).toBe(true);
    expect(types.has('coil-amplifier')).toBe(true);
    expect(types.has('shell-casing')).toBe(true);
    expect(types.has('venom-gland')).toBe(true);
    expect(types.has('spirit-totem')).toBe(true);
    expect(types.has('universal-charm')).toBe(true);
  });

  it('covers all rarity tiers', () => {
    const rarities = new Set(ALL_GEAR_DEFS.map(d => d.rarity));
    for (const r of RARITY_ORDER) {
      expect(rarities.has(r)).toBe(true);
    }
  });

  it('getGearDefsByType filters correctly', () => {
    const cannons = getGearDefsByType('barrel-mod');
    expect(cannons.length).toBeGreaterThan(0);
    for (const d of cannons) {
      expect(d.gearType).toBe('barrel-mod');
    }
  });

  it('getGearDefsByRarity filters correctly', () => {
    const rares = getGearDefsByRarity('rare');
    expect(rares.length).toBeGreaterThan(0);
    for (const d of rares) {
      expect(d.rarity).toBe('rare');
    }
  });

  it('getNextRarity returns correct progression', () => {
    expect(getNextRarity('common')).toBe('uncommon');
    expect(getNextRarity('uncommon')).toBe('rare');
    expect(getNextRarity('rare')).toBe('epic');
    expect(getNextRarity('epic')).toBe('legendary');
    expect(getNextRarity('legendary')).toBeUndefined();
  });

  it('getEnhancedStatMult scales correctly', () => {
    expect(getEnhancedStatMult(0)).toBe(1.0);
    expect(getEnhancedStatMult(1)).toBeCloseTo(1.05);
    expect(getEnhancedStatMult(5)).toBeCloseTo(1.25);
  });

  it('generateGearUid produces unique IDs', () => {
    const a = generateGearUid();
    const b = generateGearUid();
    expect(a).not.toBe(b);
    expect(a.startsWith('gear-')).toBe(true);
  });

  it('createGearInstance sets defaults', () => {
    const inst = createGearInstance('barrel-iron-sight');
    expect(inst.defId).toBe('barrel-iron-sight');
    expect(inst.enhanceLevel).toBe(0);
    expect(inst.isNew).toBe(true);
    expect(inst.uid.startsWith('gear-')).toBe(true);
  });
});

// ── rollLoot ─────────────────────────────────────────────────────────────────

describe('rollLoot', () => {
  it('returns 0-2 items', () => {
    for (let i = 0; i < 50; i++) {
      const drops = rollLoot(0, 3, false);
      expect(drops.length).toBeLessThanOrEqual(2);
    }
  });

  it('challenge maps always drop at least 1', () => {
    let found = false;
    for (let i = 0; i < 50; i++) {
      const drops = rollLoot(0, 0, true);
      if (drops.length >= 1) found = true;
    }
    expect(found).toBe(true);
  });

  it('drops have valid defIds', () => {
    const drops = rollLoot(5, 5, true);
    for (const d of drops) {
      expect(getGearDef(d.defId)).toBeDefined();
    }
  });

  it('higher ascension shifts rarity upward', () => {
    // Statistical test: higher ascension should produce more rares on average
    let lowRareCount = 0;
    let highRareCount = 0;
    const trials = 200;

    for (let i = 0; i < trials; i++) {
      const lowDrops = rollLoot(0, 5, true);
      const highDrops = rollLoot(10, 5, true);
      for (const d of lowDrops) {
        const def = getGearDef(d.defId)!;
        if (def.rarity === 'rare' || def.rarity === 'epic' || def.rarity === 'legendary') lowRareCount++;
      }
      for (const d of highDrops) {
        const def = getGearDef(d.defId)!;
        if (def.rarity === 'rare' || def.rarity === 'epic' || def.rarity === 'legendary') highRareCount++;
      }
    }
    // High ascension should have more rare+ drops
    expect(highRareCount).toBeGreaterThanOrEqual(lowRareCount);
  });
});

// ── GearSystem ───────────────────────────────────────────────────────────────

describe('GearSystem', () => {
  it('emptyGearBonuses returns zeroed object', () => {
    const b = emptyGearBonuses();
    expect(b.damagePct).toBe(0);
    expect(b.rangePct).toBe(0);
    expect(b.specialEffects).toHaveLength(0);
  });

  it('applyGearToStats modifies stats correctly', () => {
    const stats = defaultUpgradeStats(CANNON_DEF);
    const origDamage = stats.damage;
    const origRange = stats.range;

    const bonuses = emptyGearBonuses();
    bonuses.damagePct = 0.20;
    bonuses.rangePct = 0.10;

    applyGearToStats(stats, bonuses);

    expect(stats.damage).toBe(Math.round(origDamage * 1.20));
    expect(stats.range).toBe(Math.round(origRange * 1.10));
  });

  it('stat caps at +50%', () => {
    const stats = defaultUpgradeStats(CANNON_DEF);
    const origDamage = stats.damage;

    const bonuses = emptyGearBonuses();
    bonuses.damagePct = 0.80; // exceeds cap

    applyGearToStats(stats, bonuses);

    // Should be capped at +50%, not +80%
    expect(stats.damage).toBe(Math.round(origDamage * 1.50));
  });

  it('attack speed bonus reduces interval', () => {
    const stats = defaultUpgradeStats(CANNON_DEF);
    const origInterval = stats.attackIntervalMs;

    const bonuses = emptyGearBonuses();
    bonuses.attackSpeedPct = 0.20;

    applyGearToStats(stats, bonuses);

    expect(stats.attackIntervalMs).toBeLessThan(origInterval);
    expect(stats.attackIntervalMs).toBe(Math.round(origInterval / 1.20));
  });

  it('chain count bonus adds chains', () => {
    const stats = defaultUpgradeStats(TESLA_DEF);
    const origChains = stats.chainCount;

    const bonuses = emptyGearBonuses();
    bonuses.chainCountBonus = 2;

    applyGearToStats(stats, bonuses);

    expect(stats.chainCount).toBe(origChains + 2);
  });

  it('slow bonus reduces slow factor', () => {
    const stats = defaultUpgradeStats(FROST_DEF);

    const bonuses = emptyGearBonuses();
    bonuses.slowPctBonus = 0.05;

    applyGearToStats(stats, bonuses);

    expect(stats.slowFactor).toBe(0.45); // 0.50 - 0.05
  });

  it('slow factor does not go below 0.1', () => {
    const stats = defaultUpgradeStats(FROST_DEF);

    const bonuses = emptyGearBonuses();
    bonuses.slowPctBonus = 0.50; // would make it negative

    applyGearToStats(stats, bonuses);

    expect(stats.slowFactor).toBe(0.1); // clamped
  });

  it('hasGearEffect detects effects', () => {
    const bonuses = emptyGearBonuses();
    bonuses.specialEffects.push({ id: 'test-effect', description: 'test' });

    expect(hasGearEffect(bonuses, 'test-effect')).toBe(true);
    expect(hasGearEffect(bonuses, 'other-effect')).toBe(false);
  });

  it('aura strength bonus reduces aura interval multiplier', () => {
    const stats = defaultUpgradeStats(AURA_DEF);
    const origMult = stats.auraIntervalMult;

    const bonuses = emptyGearBonuses();
    bonuses.auraStrengthPct = 0.10;

    applyGearToStats(stats, bonuses);

    expect(stats.auraIntervalMult).toBeLessThan(origMult);
    expect(stats.auraIntervalMult).toBeGreaterThanOrEqual(0.3); // floor
  });
});

// ── enhancementDefs ──────────────────────────────────────────────────────────

describe('enhancementDefs', () => {
  it('xpForLevel scales quadratically', () => {
    expect(xpForLevel(1)).toBe(50);
    expect(xpForLevel(2)).toBe(200);
    expect(xpForLevel(5)).toBe(1250);
  });

  it('levelFromXp returns correct levels', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(200)).toBe(2);
    expect(levelFromXp(150000)).toBe(20); // cap (cumulative XP for lvl 20 ≈ 143,450)
  });

  it('enhancement slots unlock at correct levels', () => {
    expect(enhancementSlotsAtLevel(1)).toBe(0);
    expect(enhancementSlotsAtLevel(2)).toBe(1);
    expect(enhancementSlotsAtLevel(8)).toBe(2);
    expect(enhancementSlotsAtLevel(15)).toBe(3);
  });

  it('signature ability unlocks at level 10', () => {
    expect(isSignatureUnlocked(9)).toBe(false);
    expect(isSignatureUnlocked(10)).toBe(true);
  });

  it('mastery unlocks at level 20', () => {
    expect(isMasteryUnlocked(19)).toBe(false);
    expect(isMasteryUnlocked(20)).toBe(true);
  });

  it('passive upgrade unlocks at level 5', () => {
    expect(isPassiveUpgraded(4)).toBe(false);
    expect(isPassiveUpgraded(5)).toBe(true);
  });

  it('calculateRunXp returns positive values', () => {
    const xp = calculateRunXp(10, 20, 2, 0, false);
    expect(xp).toBeGreaterThan(0);
  });

  it('calculateRunXp gives bonus for winning', () => {
    const loseXp = calculateRunXp(20, 20, 0, 0, false);
    const winXp = calculateRunXp(20, 20, 0, 0, true);
    expect(winXp).toBeGreaterThan(loseXp);
  });

  it('calculateRunXp scales with ascension', () => {
    const base = calculateRunXp(10, 20, 0, 0, false);
    const asc5 = calculateRunXp(10, 20, 0, 5, false);
    expect(asc5).toBeGreaterThan(base);
  });

  it('all commanders have signature abilities', () => {
    const cmdIds = ['nokomis', 'bizhiw', 'animikiikaa', 'makoons', 'oshkaabewis', 'waabizii'];
    for (const id of cmdIds) {
      expect(getSignatureAbility(id)).toBeDefined();
    }
  });

  it('all enhancements have unique IDs', () => {
    const ids = ALL_ENHANCEMENTS.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getAvailableEnhancements includes universal and specific', () => {
    const makoons = getAvailableEnhancements('makoons');
    const universal = ALL_ENHANCEMENTS.filter(e => e.commanderRestriction === null);
    const specific = ALL_ENHANCEMENTS.filter(e => e.commanderRestriction === 'makoons');
    expect(makoons.length).toBe(universal.length + specific.length);
  });

  it('COMMANDER_LEVEL_REWARDS covers all milestone levels', () => {
    const levels = COMMANDER_LEVEL_REWARDS.map(r => r.level);
    expect(levels).toContain(2);
    expect(levels).toContain(5);
    expect(levels).toContain(8);
    expect(levels).toContain(10);
    expect(levels).toContain(15);
    expect(levels).toContain(20);
  });
});

// ── challengeDefs ────────────────────────────────────────────────────────────

describe('challengeDefs', () => {
  it('has 5 challenge maps', () => {
    expect(ALL_CHALLENGES.length).toBe(5);
  });

  it('all challenges have unique IDs', () => {
    const ids = ALL_CHALLENGES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getChallengeDef finds existing challenges', () => {
    expect(getChallengeDef('challenge-makwas-den')).toBeDefined();
    expect(getChallengeDef('nonexistent')).toBeUndefined();
  });

  it('getFeaturedChallengeId returns a valid challenge', () => {
    const id = getFeaturedChallengeId();
    expect(getChallengeDef(id)).toBeDefined();
  });

  it('isTowerAllowed respects banned towers', () => {
    // Makwa's Den bans cannon
    expect(isTowerAllowed('challenge-makwas-den', 'cannon')).toBe(false);
    expect(isTowerAllowed('challenge-makwas-den', 'frost')).toBe(true);
  });

  it('getUnlockedChallenges filters by threshold', () => {
    expect(getUnlockedChallenges(0)).toHaveLength(0);
    expect(getUnlockedChallenges(200).length).toBeGreaterThan(0);
    expect(getUnlockedChallenges(10000).length).toBe(ALL_CHALLENGES.length);
  });

  it('all challenges have valid modifiers', () => {
    for (const c of ALL_CHALLENGES) {
      expect(c.modifier.waveCount).toBeGreaterThan(0);
      expect(c.modifier.goldMult).toBeGreaterThan(0);
      expect(['rare', 'epic', 'legendary']).toContain(c.guaranteedRarity);
    }
  });
});
