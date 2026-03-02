/**
 * GearSystem — applies equipped gear stats to towers at runtime.
 *
 * When a tower is constructed, GearSystem reads the InventoryManager's
 * equip map, resolves gear definitions, and computes combined stat
 * multipliers that are applied to the tower's TowerUpgradeStats.
 *
 * NO Phaser import — safe for unit tests.
 */

import type { TowerUpgradeStats } from '../data/towerDefs';
import type { GearStatMods, GearSpecialEffect } from '../data/gearDefs';
import { getGearDef, getEnhancedStatMult, canEquipOnTower } from '../data/gearDefs';
import { InventoryManager } from '../meta/InventoryManager';

/** Combined gear bonuses resolved for a specific tower type. */
export interface GearBonuses {
  damagePct:         number;
  rangePct:          number;
  attackSpeedPct:    number;
  splashRadiusPct:   number;
  chainCountBonus:   number;
  chainRangePct:     number;
  slowPctBonus:      number;
  freezeDurationPct: number;
  dotDamagePct:      number;
  dotStackBonus:     number;
  auraRadiusPct:     number;
  auraStrengthPct:   number;
  armorPenPct:       number;
  stunDurationMs:    number;
  specialEffects:    GearSpecialEffect[];
}

/** Empty/default gear bonuses (no gear equipped). */
export function emptyGearBonuses(): GearBonuses {
  return {
    damagePct:         0,
    rangePct:          0,
    attackSpeedPct:    0,
    splashRadiusPct:   0,
    chainCountBonus:   0,
    chainRangePct:     0,
    slowPctBonus:      0,
    freezeDurationPct: 0,
    dotDamagePct:      0,
    dotStackBonus:     0,
    auraRadiusPct:     0,
    auraStrengthPct:   0,
    armorPenPct:       0,
    stunDurationMs:    0,
    specialEffects:    [],
  };
}

/**
 * Resolve the combined gear bonuses for a tower type.
 * Reads from InventoryManager's equip map.
 */
export function resolveGearBonuses(towerKey: string): GearBonuses {
  const inv = InventoryManager.getInstance();
  const slots = inv.getEquipped(towerKey);
  const bonuses = emptyGearBonuses();

  for (const uid of slots) {
    if (!uid) continue;
    const instance = inv.getItem(uid);
    if (!instance) continue;
    const def = getGearDef(instance.defId);
    if (!def) continue;
    if (!canEquipOnTower(def, towerKey)) continue;

    const enhMult = getEnhancedStatMult(instance.enhanceLevel);
    addScaledStats(bonuses, def.stats, enhMult);

    // Include rune stats
    if (instance.rune) {
      addScaledStats(bonuses, instance.rune.statBonus, 1.0);
    }

    // Collect special effects
    if (def.specialEffect) {
      bonuses.specialEffects.push(def.specialEffect);
    }
  }

  return bonuses;
}

/** Add scaled stat modifiers to bonuses (mutates `bonuses`). */
function addScaledStats(bonuses: GearBonuses, stats: GearStatMods, mult: number): void {
  if (stats.damagePct)         bonuses.damagePct         += stats.damagePct * mult;
  if (stats.rangePct)          bonuses.rangePct           += stats.rangePct * mult;
  if (stats.attackSpeedPct)    bonuses.attackSpeedPct     += stats.attackSpeedPct * mult;
  if (stats.splashRadiusPct)   bonuses.splashRadiusPct    += stats.splashRadiusPct * mult;
  if (stats.chainCountBonus)   bonuses.chainCountBonus    += stats.chainCountBonus;  // flat, not scaled
  if (stats.chainRangePct)     bonuses.chainRangePct      += stats.chainRangePct * mult;
  if (stats.slowPctBonus)      bonuses.slowPctBonus       += stats.slowPctBonus * mult;
  if (stats.freezeDurationPct) bonuses.freezeDurationPct  += stats.freezeDurationPct * mult;
  if (stats.dotDamagePct)      bonuses.dotDamagePct       += stats.dotDamagePct * mult;
  if (stats.dotStackBonus)     bonuses.dotStackBonus      += stats.dotStackBonus;    // flat
  if (stats.auraRadiusPct)     bonuses.auraRadiusPct      += stats.auraRadiusPct * mult;
  if (stats.auraStrengthPct)   bonuses.auraStrengthPct    += stats.auraStrengthPct * mult;
  if (stats.armorPenPct)       bonuses.armorPenPct        += stats.armorPenPct * mult;
  if (stats.stunDurationMs)    bonuses.stunDurationMs     += stats.stunDurationMs * mult;
}

/**
 * Apply gear bonuses to a TowerUpgradeStats block (mutates `stats`).
 *
 * Called by GameScene after constructing a tower's base upgrade stats.
 * Caps: total multiplier per stat capped at +50% (balance guard).
 */
export function applyGearToStats(stats: TowerUpgradeStats, bonuses: GearBonuses): void {
  const cap = (v: number) => Math.min(v, 0.50);

  stats.damage           = Math.round(stats.damage * (1 + cap(bonuses.damagePct)));
  stats.range            = Math.round(stats.range * (1 + cap(bonuses.rangePct)));
  stats.attackIntervalMs = Math.round(stats.attackIntervalMs / (1 + cap(bonuses.attackSpeedPct)));
  stats.splashRadius     = Math.round(stats.splashRadius * (1 + cap(bonuses.splashRadiusPct)));
  stats.chainCount       += bonuses.chainCountBonus;
  stats.slowFactor       = Math.max(0.1, stats.slowFactor - bonuses.slowPctBonus);
  stats.slowDurationMs   = Math.round(stats.slowDurationMs * (1 + cap(bonuses.freezeDurationPct)));
  stats.dotDamageBonus   += Math.round(stats.dotDamageBase * cap(bonuses.dotDamagePct));
  stats.maxDotStacks     += bonuses.dotStackBonus;
  stats.auraIntervalMult = Math.max(0.3, stats.auraIntervalMult * (1 - cap(bonuses.auraStrengthPct)));
}

/**
 * Check if a gear set includes a specific special effect.
 */
export function hasGearEffect(bonuses: GearBonuses, effectId: string): boolean {
  return bonuses.specialEffects.some(e => e.id === effectId);
}
