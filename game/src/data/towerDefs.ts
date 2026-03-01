/**
 * Pure tower data: TowerDef schema, TowerUpgradeStats schema,
 * defaultUpgradeStats factory, and all per-tower TowerDef constants.
 *
 * NO Phaser import — safe to load in unit tests.
 */
import type { Creep } from '../entities/Creep';

// ── TowerDef ─────────────────────────────────────────────────────────────────

export interface TowerDef {
  key:              string;
  name:             string;
  cost:             number;
  range:            number;            // px — attack range or aura radius
  damage:           number;
  attackIntervalMs: number;            // base attack speed; use Infinity for Aura
  projectileSpeed:  number;            // px/s

  bodyColor:        number;

  // Projectile appearance
  projectileColor?:  number;
  projectileRadius?: number;

  // Tower behaviour flags
  groundOnly?:          boolean;       // Mortar: cannot target air creeps
  splashRadius?:        number;        // Mortar: AoE radius on impact
  chainCount?:          number;        // Tesla: number of extra chain targets
  chainRange?:          number;        // Tesla: max chain reach from primary hit
  chainDamageRatio?:    number;        // Tesla: chain damage fraction (default 0.6)
  isAura?:              boolean;       // Aura tower: no attack, buffs nearby towers
  auraIntervalMult?:    number;        // Aura: interval multiplier for nearby towers (<1 = faster)
  /** Per-creep effect applied on each hit (used by default branch in Tower.fireAt) */
  onHitEffect?:         (creep: Creep) => void;
}

// ── TowerUpgradeStats ─────────────────────────────────────────────────────────
//
// The "live" stat block for a tower — starts as a copy of its TowerDef values
// and is updated by UpgradeManager when upgrades are purchased or respecced.

export interface TowerUpgradeStats {
  // ── Numeric stats (def values + accumulated upgrade deltas) ───────────────
  damage:           number;
  range:            number;
  attackIntervalMs: number;
  splashRadius:     number;
  chainCount:       number;
  chainDamageRatio: number;
  auraIntervalMult: number;   // base speed buff from this aura tower's upgrades
  auraDamageMult:   number;   // damage multiplier this aura tower provides (1.0 = none)
  auraRangePct:     number;   // range % bonus this aura tower provides (0 = none)

  // ── Cannon A: Armor Shred ─────────────────────────────────────────────────
  armorShredPct:      number;   // 0 = off; fraction vulnerability applied on hit
  armorShredDuration: number;   // ms the shred debuff lasts

  // ── Cannon B: Execute ─────────────────────────────────────────────────────
  executeThreshold: number;   // 0 = off; instant-kill target below this HP ratio

  // ── Frost A: Slow Magnitude ───────────────────────────────────────────────
  slowFactor:     number;   // effective slow multiplier (0.5 = 50% speed)

  // ── Frost B: Freeze Duration ──────────────────────────────────────────────
  slowDurationMs: number;   // effective slow duration in ms

  // ── Frost C: Shatter (drawback — destroys Poison DoT stacks on frozen death)
  shatterOnDeath: boolean;

  // ── Mortar C: Cluster Submunitions ───────────────────────────────────────
  clusterCount:   number;   // extra submunitions fired on impact (0 = off)

  // ── Poison A: DoT Damage ─────────────────────────────────────────────────
  dotDamageBase:  number;   // base damage per tick (from base def)
  dotDamageBonus: number;   // added by upgrades

  // ── Poison B: Max Stack Count ─────────────────────────────────────────────
  maxDotStacks:   number;   // 0 = unlimited; default 4

  // ── Poison C: DoT Spread on Death ────────────────────────────────────────
  dotSpreadOnDeath: boolean;

  // ── Tesla C: Overload (drawback — debuffs nearby allied towers) ───────────
  overloadMode:     boolean;
  overloadDebuffPct: number;  // % attack-speed penalty applied to debuffed towers

  // ── Aura deep-path specialisation ────────────────────────────────────────
  auraSpecType: '' | 'speed' | 'damage' | 'range';
}

/** Build default TowerUpgradeStats from a TowerDef (no upgrades applied). */
export function defaultUpgradeStats(def: TowerDef): TowerUpgradeStats {
  return {
    damage:           def.damage,
    range:            def.range,
    attackIntervalMs: def.attackIntervalMs,
    splashRadius:     def.splashRadius ?? 0,
    chainCount:       def.chainCount   ?? 0,
    chainDamageRatio: def.chainDamageRatio ?? 0.6,
    auraIntervalMult: def.auraIntervalMult ?? 1.0,
    auraDamageMult:   1.0,
    auraRangePct:     0,

    armorShredPct:      0,
    armorShredDuration: 3000,
    executeThreshold:   0,
    slowFactor:         0.5,    // Frost base slow factor
    slowDurationMs:     2500,   // Frost base slow duration
    shatterOnDeath:     false,
    clusterCount:       0,
    dotDamageBase:      6,      // Poison base dmg/tick
    dotDamageBonus:     0,
    maxDotStacks:       4,      // default cap (Poison B upgrades increase this)
    dotSpreadOnDeath:   false,
    overloadMode:       false,
    overloadDebuffPct:  0,
    auraSpecType:       '',
  };
}

// ── Tower definitions ─────────────────────────────────────────────────────────

export const CANNON_DEF: TowerDef = {
  key: 'cannon',  name: 'Cannon',  cost: 100,
  range: 160,  damage: 40,  attackIntervalMs: 1000,  projectileSpeed: 300,
  bodyColor: 0x778888,  projectileColor: 0xffdd00,  projectileRadius: 5,
};

export const FROST_DEF: TowerDef = {
  key: 'frost',  name: 'Frost',  cost: 125,
  range: 140,  damage: 15,  attackIntervalMs: 1200,  projectileSpeed: 280,
  bodyColor: 0x3366aa,  projectileColor: 0x88ccff,  projectileRadius: 5,
};

export const MORTAR_DEF: TowerDef = {
  key: 'mortar',  name: 'Mortar',  cost: 175,
  range: 200,  damage: 60,  attackIntervalMs: 2500,  projectileSpeed: 180,
  bodyColor: 0x996633,  projectileColor: 0xff8800,  projectileRadius: 7,
  groundOnly: true,  splashRadius: 55,
};

export const POISON_DEF: TowerDef = {
  key: 'poison',  name: 'Poison',  cost: 125,
  range: 130,  damage: 0,  attackIntervalMs: 1500,  projectileSpeed: 250,
  bodyColor: 0x338844,  projectileColor: 0x55ff99,  projectileRadius: 5,
};

export const TESLA_DEF: TowerDef = {
  key: 'tesla',  name: 'Tesla',  cost: 200,
  range: 160,  damage: 35,  attackIntervalMs: 1500,  projectileSpeed: 500,
  bodyColor: 0xbbaa22,  projectileColor: 0xffff44,  projectileRadius: 4,
  chainCount: 3,  chainRange: 110,  chainDamageRatio: 0.6,
};

export const AURA_DEF: TowerDef = {
  key: 'aura',  name: 'Aura',  cost: 150,
  range: 180,  damage: 0,  attackIntervalMs: Infinity,  projectileSpeed: 0,
  bodyColor: 0xbb9922,
  isAura: true,  auraIntervalMult: 0.8, // towers in range attack 25% faster
};

export const ALL_TOWER_DEFS: TowerDef[] = [
  CANNON_DEF, FROST_DEF, MORTAR_DEF, POISON_DEF, TESLA_DEF, AURA_DEF,
];
