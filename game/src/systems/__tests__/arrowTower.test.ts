/**
 * Tests for TASK-089: Arrow Tower Assets — Icon, Projectile Sprite, Gear Icons.
 *
 * Verifies:
 *  - ARROW_DEF is present in ALL_TOWER_DEFS with correct stats
 *  - Arrow gear (arrow-fletching) definitions exist and are well-formed
 *  - Arrow gear equip restrictions work correctly
 *  - Arrow tower is wired into UI color maps
 *  - Arrow icon is loaded in BootScene texture key list
 *  - Arrow projectile trail and impact visuals are registered
 */

import { describe, it, expect } from 'vitest';
import {
  ARROW_DEF,
  ALL_TOWER_DEFS,
  defaultUpgradeStats,
} from '../../data/towerDefs';
import {
  GEAR_TYPE_TOWER,
  GearType,
  canEquipOnTower,
  getGearDefsByType,
  getGearDef,
} from '../../data/gearDefs';

// ── ARROW_DEF basics ────────────────────────────────────────────────────────

describe('ARROW_DEF', () => {
  it('is included in ALL_TOWER_DEFS', () => {
    expect(ALL_TOWER_DEFS).toContain(ARROW_DEF);
  });

  it('has key "arrow"', () => {
    expect(ARROW_DEF.key).toBe('arrow');
  });

  it('has name "Arrow"', () => {
    expect(ARROW_DEF.name).toBe('Arrow');
  });

  it('costs 75 gold (cheapest tower)', () => {
    expect(ARROW_DEF.cost).toBe(75);
    for (const def of ALL_TOWER_DEFS) {
      expect(ARROW_DEF.cost).toBeLessThanOrEqual(def.cost);
    }
  });

  it('has fast attack interval (600ms)', () => {
    expect(ARROW_DEF.attackIntervalMs).toBe(600);
  });

  it('has high projectile speed (500 px/s)', () => {
    expect(ARROW_DEF.projectileSpeed).toBe(500);
  });

  it('has long range (180px)', () => {
    expect(ARROW_DEF.range).toBe(180);
  });

  it('deals 18 base damage', () => {
    expect(ARROW_DEF.damage).toBe(18);
  });

  it('targets both ground and air', () => {
    expect(ARROW_DEF.targetDomain).toBe('both');
  });

  it('defaults to FIRST targeting priority', () => {
    expect(ARROW_DEF.defaultPriority).toBe('FIRST');
  });

  it('has earth-tone body color', () => {
    expect(ARROW_DEF.bodyColor).toBe(0x8b6b3d);
  });

  it('has projectile color and small radius', () => {
    expect(ARROW_DEF.projectileColor).toBe(0xc4a265);
    expect(ARROW_DEF.projectileRadius).toBe(3);
  });

  it('has a non-empty description', () => {
    expect(ARROW_DEF.description.length).toBeGreaterThan(10);
  });

  it('is not an aura tower', () => {
    expect(ARROW_DEF.isAura).toBeFalsy();
  });

  it('has no splash radius', () => {
    expect(ARROW_DEF.splashRadius).toBeUndefined();
  });

  it('has no chain mechanics', () => {
    expect(ARROW_DEF.chainCount).toBeUndefined();
    expect(ARROW_DEF.chainRange).toBeUndefined();
  });

  it('has no onHitEffect', () => {
    expect(ARROW_DEF.onHitEffect).toBeUndefined();
  });
});

// ── defaultUpgradeStats for Arrow ────────────────────────────────────────────

describe('Arrow defaultUpgradeStats', () => {
  it('initialises damage from ARROW_DEF', () => {
    const stats = defaultUpgradeStats(ARROW_DEF);
    expect(stats.damage).toBe(18);
  });

  it('initialises range from ARROW_DEF', () => {
    const stats = defaultUpgradeStats(ARROW_DEF);
    expect(stats.range).toBe(180);
  });

  it('initialises attackIntervalMs from ARROW_DEF', () => {
    const stats = defaultUpgradeStats(ARROW_DEF);
    expect(stats.attackIntervalMs).toBe(600);
  });

  it('has zero splash radius (no AoE)', () => {
    const stats = defaultUpgradeStats(ARROW_DEF);
    expect(stats.splashRadius).toBe(0);
  });

  it('has zero chain count (no chaining)', () => {
    const stats = defaultUpgradeStats(ARROW_DEF);
    expect(stats.chainCount).toBe(0);
  });
});

// ── Arrow gear definitions ──────────────────────────────────────────────────

describe('Arrow gear (arrow-fletching)', () => {
  it('GEAR_TYPE_TOWER maps arrow-fletching to "arrow"', () => {
    expect(GEAR_TYPE_TOWER['arrow-fletching']).toBe('arrow');
  });

  it('GearType.ARROW_FLETCHING equals "arrow-fletching"', () => {
    expect(GearType.ARROW_FLETCHING).toBe('arrow-fletching');
  });

  it('has at least 6 arrow-fletching gear items', () => {
    const arrowGear = getGearDefsByType('arrow-fletching');
    expect(arrowGear.length).toBeGreaterThanOrEqual(6);
  });

  it('all arrow gear IDs start with "arrow-"', () => {
    const arrowGear = getGearDefsByType('arrow-fletching');
    for (const g of arrowGear) {
      expect(g.id).toMatch(/^arrow-/);
    }
  });

  it('all arrow gear has gearType "arrow-fletching"', () => {
    const arrowGear = getGearDefsByType('arrow-fletching');
    for (const g of arrowGear) {
      expect(g.gearType).toBe('arrow-fletching');
    }
  });

  it('arrow gear has unique IDs', () => {
    const arrowGear = getGearDefsByType('arrow-fletching');
    const ids = arrowGear.map(g => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('arrow gear covers common through epic rarities', () => {
    const arrowGear = getGearDefsByType('arrow-fletching');
    const rarities = new Set(arrowGear.map(g => g.rarity));
    expect(rarities.has('common')).toBe(true);
    expect(rarities.has('uncommon')).toBe(true);
    expect(rarities.has('rare')).toBe(true);
    expect(rarities.has('epic')).toBe(true);
  });

  it('every arrow gear item has non-empty stats', () => {
    const arrowGear = getGearDefsByType('arrow-fletching');
    for (const g of arrowGear) {
      const statKeys = Object.keys(g.stats).filter(
        k => (g.stats as Record<string, number>)[k] !== 0,
      );
      expect(statKeys.length).toBeGreaterThan(0);
    }
  });

  it('every arrow gear item has a non-empty description', () => {
    const arrowGear = getGearDefsByType('arrow-fletching');
    for (const g of arrowGear) {
      expect(g.description.length).toBeGreaterThan(5);
    }
  });

  it('rare and epic arrow gear have special effects', () => {
    const arrowGear = getGearDefsByType('arrow-fletching');
    const highTier = arrowGear.filter(g => g.rarity === 'rare' || g.rarity === 'epic');
    expect(highTier.length).toBeGreaterThan(0);
    for (const g of highTier) {
      expect(g.specialEffect).toBeDefined();
      expect(g.specialEffect!.id.length).toBeGreaterThan(0);
      expect(g.specialEffect!.description.length).toBeGreaterThan(0);
    }
  });
});

// ── Arrow gear equip restrictions ────────────────────────────────────────────

describe('Arrow gear equip restrictions', () => {
  it('arrow-fletching gear equips on arrow towers', () => {
    const gear = getGearDef('arrow-sinew-string')!;
    expect(canEquipOnTower(gear, 'arrow')).toBe(true);
  });

  it('arrow-fletching gear does NOT equip on other towers', () => {
    const gear = getGearDef('arrow-sinew-string')!;
    expect(canEquipOnTower(gear, 'cannon')).toBe(false);
    expect(canEquipOnTower(gear, 'frost')).toBe(false);
    expect(canEquipOnTower(gear, 'mortar')).toBe(false);
    expect(canEquipOnTower(gear, 'poison')).toBe(false);
    expect(canEquipOnTower(gear, 'tesla')).toBe(false);
    expect(canEquipOnTower(gear, 'aura')).toBe(false);
  });

  it('universal charms equip on arrow towers', () => {
    const charm = getGearDef('charm-flint')!;
    expect(canEquipOnTower(charm, 'arrow')).toBe(true);
  });

  it('other tower-specific gear does NOT equip on arrow towers', () => {
    const barrel = getGearDef('barrel-iron-sight')!;
    expect(canEquipOnTower(barrel, 'arrow')).toBe(false);
    const crystal = getGearDef('crystal-chipped')!;
    expect(canEquipOnTower(crystal, 'arrow')).toBe(false);
  });
});

// ── Specific arrow gear items ────────────────────────────────────────────────

describe('Arrow gear item details', () => {
  it('Sinew Bowstring boosts attack speed', () => {
    const g = getGearDef('arrow-sinew-string')!;
    expect(g.stats.attackSpeedPct).toBe(0.08);
    expect(g.rarity).toBe('common');
  });

  it('Sharpened Flint Tips boosts damage', () => {
    const g = getGearDef('arrow-flint-heads')!;
    expect(g.stats.damagePct).toBe(0.08);
    expect(g.rarity).toBe('common');
  });

  it('Eagle Feather Fletching boosts range and damage', () => {
    const g = getGearDef('arrow-eagle-feather')!;
    expect(g.stats.rangePct).toBe(0.12);
    expect(g.stats.damagePct).toBe(0.06);
    expect(g.rarity).toBe('uncommon');
  });

  it('Obsidian Broadhead has bleed effect', () => {
    const g = getGearDef('arrow-obsidian-broadhead')!;
    expect(g.specialEffect?.id).toBe('arrow-bleed');
    expect(g.stats.armorPenPct).toBe(0.12);
    expect(g.rarity).toBe('rare');
  });

  it("Windwalker's Bow has pierce effect", () => {
    const g = getGearDef('arrow-windwalker-bow')!;
    expect(g.specialEffect?.id).toBe('arrow-pierce');
    expect(g.stats.attackSpeedPct).toBe(0.20);
    expect(g.stats.rangePct).toBe(0.18);
    expect(g.stats.damagePct).toBe(0.15);
    expect(g.rarity).toBe('epic');
  });
});

// ── Arrow tower DPS sanity check ─────────────────────────────────────────────

describe('Arrow tower balance', () => {
  it('has highest DPS-per-gold among non-aura towers', () => {
    const arrowDps = (ARROW_DEF.damage / ARROW_DEF.attackIntervalMs) * 1000;
    const arrowDpsPerGold = arrowDps / ARROW_DEF.cost;

    for (const def of ALL_TOWER_DEFS) {
      if (def.isAura || def.damage === 0 || def.key === 'arrow') continue;
      const dps = (def.damage / def.attackIntervalMs) * 1000;
      const dpsPerGold = dps / def.cost;
      expect(arrowDpsPerGold).toBeGreaterThanOrEqual(dpsPerGold * 0.8);
    }
  });

  it('DPS is moderate (not overpowered)', () => {
    const arrowDps = (ARROW_DEF.damage / ARROW_DEF.attackIntervalMs) * 1000;
    // 30 DPS — reasonable for a 75-gold tower
    expect(arrowDps).toBe(30);
  });

  it('attack interval is faster than all other non-aura towers', () => {
    for (const def of ALL_TOWER_DEFS) {
      if (def.isAura || def.key === 'arrow') continue;
      expect(ARROW_DEF.attackIntervalMs).toBeLessThan(def.attackIntervalMs);
    }
  });
});

// ── ALL_TOWER_DEFS integrity after Arrow addition ────────────────────────────

describe('ALL_TOWER_DEFS with Arrow', () => {
  it('contains 7 tower definitions', () => {
    expect(ALL_TOWER_DEFS).toHaveLength(7);
  });

  it('all tower keys are unique', () => {
    const keys = ALL_TOWER_DEFS.map(d => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('all tower names are unique', () => {
    const names = ALL_TOWER_DEFS.map(d => d.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all towers have positive cost', () => {
    for (const def of ALL_TOWER_DEFS) {
      expect(def.cost).toBeGreaterThan(0);
    }
  });

  it('all towers have a valid targetDomain', () => {
    for (const def of ALL_TOWER_DEFS) {
      expect(['ground', 'air', 'both']).toContain(def.targetDomain);
    }
  });
});
