/**
 * Pure tower data: TowerDef schema, TowerUpgradeStats schema,
 * defaultUpgradeStats factory, and all per-tower TowerDef constants.
 *
 * NO Phaser import — safe to load in unit tests.
 */
import type { Creep } from '../entities/Creep';
import { TargetingPriority } from './targeting';

// ── TowerDef ─────────────────────────────────────────────────────────────────

export interface TowerDef {
  key:              string;
  name:             string;
  cost:             number;
  range:            number;            // px — attack range or aura radius
  damage:           number;
  attackIntervalMs: number;            // base attack speed; use Infinity for Aura
  projectileSpeed:  number;            // px/s

  /** One-line mechanic/flavour description shown in the tower panel tooltip. */
  description:      string;

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

  /** Default targeting priority for newly placed towers of this type. */
  defaultPriority:      TargetingPriority;

  /**
   * Which creep domains this tower can target.
   * - 'ground' : only ground creeps (Cannon, Mortar, Poison)
   * - 'air'    : only air creeps   (Tesla)
   * - 'both'   : all creeps        (Frost, Aura, Arrow)
   */
  targetDomain:         'ground' | 'air' | 'both';

  /**
   * Hard cap on maximum damage per hit (Arrow tower).
   * After all multipliers are applied, damage is clamped to this value.
   * Upgrade paths improve the Arrow but cannot push damage above this ceiling.
   */
  damageCap?:           number;

  /**
   * Damage multiplier applied when hitting an armored creep (isArmored = true).
   * Values < 1.0 penalise the tower (Arrow: 0.3 = 70% damage reduction vs armor).
   * Values > 1.0 bonus-damage the tower (Rock Hurler: 1.6 = +60% vs armor).
   * Undefined = no modifier (neutral, default).
   */
  armorDamageMult?:     number;
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
  dotSpreadOnDeath:     boolean;
  dotSpreadRadiusDelta: number;   // accumulated extra spread radius (px)
  dotSpreadStackCount:  number;   // stacks to apply per spread (1 = base)
  dotSpreadHitsAir:     boolean;  // whether spread hits air creeps

  // ── Tesla C: Overload (drawback — debuffs nearby allied towers) ───────────
  overloadMode:     boolean;
  overloadDebuffPct: number;  // % attack-speed penalty applied to debuffed towers

  // ── Aura deep-path specialisation ────────────────────────────────────────
  auraSpecType: '' | 'speed' | 'damage' | 'range';

  // ── Arrow B: Multi-shot ───────────────────────────────────────────────────
  multiShotCount: number;   // extra simultaneous targets per attack (0 = single shot)

  // ── Arrow C: Slow on Hit ─────────────────────────────────────────────────
  arrowSlowFactor:     number;   // 0 = no slow; e.g. 0.85 = 15% slow applied on hit
  arrowSlowDurationMs: number;   // 0 = no slow; ms the slow lasts on each hit
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
    dotSpreadOnDeath:     false,
    dotSpreadRadiusDelta: 0,
    dotSpreadStackCount:  1,
    dotSpreadHitsAir:     false,
    overloadMode:       false,
    overloadDebuffPct:  0,
    auraSpecType:       '',
    multiShotCount:       0,
    arrowSlowFactor:      0,
    arrowSlowDurationMs:  0,
  };
}

// ── Tower definitions ─────────────────────────────────────────────────────────

export const CANNON_DEF: TowerDef = {
  key: 'cannon',  name: 'Cannon',  cost: 100,
  range: 160,  damage: 40,  attackIntervalMs: 1000,  projectileSpeed: 300,
  description: 'Single target. High damage, moderate fire rate.',
  bodyColor: 0x778888,  projectileColor: 0xffdd00,  projectileRadius: 5,
  defaultPriority: TargetingPriority.FIRST,
  targetDomain: 'ground',
};

export const FROST_DEF: TowerDef = {
  key: 'frost',  name: 'Frost',  cost: 125,
  range: 140,  damage: 15,  attackIntervalMs: 1200,  projectileSpeed: 280,
  description: 'Slows targets. Chills stack for a freeze bonus.',
  bodyColor: 0x3366aa,  projectileColor: 0x88ccff,  projectileRadius: 5,
  defaultPriority: TargetingPriority.STRONGEST,
  targetDomain: 'both',
};

export const MORTAR_DEF: TowerDef = {
  key: 'mortar',  name: 'Mortar',  cost: 175,
  range: 200,  damage: 60,  attackIntervalMs: 2500,  projectileSpeed: 180,
  description: 'Area splash damage. Ignores terrain.',
  bodyColor: 0x996633,  projectileColor: 0xff8800,  projectileRadius: 7,
  groundOnly: true,  splashRadius: 55,
  defaultPriority: TargetingPriority.FIRST,
  targetDomain: 'ground',
};

export const POISON_DEF: TowerDef = {
  key: 'poison',  name: 'Poison',  cost: 125,
  range: 130,  damage: 0,  attackIntervalMs: 1500,  projectileSpeed: 250,
  description: 'Applies damage-over-time. Spreads on creep death.',
  bodyColor: 0x338844,  projectileColor: 0x55ff99,  projectileRadius: 5,
  defaultPriority: TargetingPriority.WEAKEST,
  targetDomain: 'ground',
};

export const TESLA_DEF: TowerDef = {
  key: 'tesla',  name: 'Thunder',  cost: 200,
  range: 160,  damage: 42,  attackIntervalMs: 1500,  projectileSpeed: 500,
  description: 'Chains lightning to up to 3 air targets. Air-only specialist.',
  bodyColor: 0xbbaa22,  projectileColor: 0xffff44,  projectileRadius: 4,
  chainCount: 3,  chainRange: 110,  chainDamageRatio: 0.6,
  defaultPriority: TargetingPriority.FIRST,
  targetDomain: 'air',
};

export const AURA_DEF: TowerDef = {
  key: 'aura',  name: 'Aura',  cost: 150,
  range: 180,  damage: 0,  attackIntervalMs: Infinity,  projectileSpeed: 0,
  description: 'Boosts nearby tower attack speed and damage.',
  bodyColor: 0xbb9922,
  isAura: true,  auraIntervalMult: 0.8, // towers in range attack 25% faster
  defaultPriority: TargetingPriority.FIRST, // passive — value unused
  targetDomain: 'both', // aura buffs towers regardless of creep domain
};

export const ARROW_DEF: TowerDef = {
  key: 'arrow',  name: 'Arrow',  cost: 75,
  range: 180,  damage: 18,  attackIntervalMs: 600,  projectileSpeed: 500,
  description: 'Fast, long-range. Weak vs armor — use Rock Hurler for armored foes.',
  bodyColor: 0x8b6b3d,  projectileColor: 0xc4a265,  projectileRadius: 3,
  defaultPriority: TargetingPriority.FIRST,
  targetDomain: 'both',
  armorDamageMult: 0.3,   // 70% damage reduction vs armored creeps
};

/**
 * Rock Hurler — merges Cannon + Mortar.
 * Fires a heavy rock: direct-hit damage + AoE splash on impact.
 * Physical impact bypasses armor: bonus damage vs armored creeps.
 */
export const ROCK_HURLER_DEF: TowerDef = {
  key: 'rock-hurler',  name: 'Rock Hurler',  cost: 150,
  range: 185,  damage: 55,  attackIntervalMs: 2000,  projectileSpeed: 220,
  description: 'Heavy rock: direct hit + AoE splash. Bonus dmg vs armored.',
  bodyColor: 0x886644,  projectileColor: 0xcc9944,  projectileRadius: 7,
  groundOnly: true,  splashRadius: 45,
  defaultPriority: TargetingPriority.FIRST,
  targetDomain: 'ground',
  armorDamageMult: 1.6,   // +60% damage vs armored creeps
};

export const ALL_TOWER_DEFS: TowerDef[] = [
  ROCK_HURLER_DEF, FROST_DEF, POISON_DEF, TESLA_DEF, AURA_DEF, ARROW_DEF,
];
