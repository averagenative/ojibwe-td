/**
 * Gear item definitions — data layer for the tower gear system.
 *
 * Each GearItem modifies tower stats when equipped. Items have rarity tiers,
 * tower-type restrictions, stat bonuses, and optional special effects.
 *
 * NO Phaser import — safe for unit tests and Node.js.
 */

// ── Rarity ───────────────────────────────────────────────────────────────────

export const GearRarity = {
  COMMON:    'common',
  UNCOMMON:  'uncommon',
  RARE:      'rare',
  EPIC:      'epic',
  LEGENDARY: 'legendary',
} as const;

export type GearRarity = (typeof GearRarity)[keyof typeof GearRarity];

export const RARITY_ORDER: GearRarity[] = [
  GearRarity.COMMON,
  GearRarity.UNCOMMON,
  GearRarity.RARE,
  GearRarity.EPIC,
  GearRarity.LEGENDARY,
];

export const RARITY_COLORS: Record<GearRarity, { hex: string; num: number }> = {
  common:    { hex: '#888888', num: 0x888888 },
  uncommon:  { hex: '#44cc44', num: 0x44cc44 },
  rare:      { hex: '#4488ff', num: 0x4488ff },
  epic:      { hex: '#aa44ff', num: 0xaa44ff },
  legendary: { hex: '#ff8800', num: 0xff8800 },
};

/** Drop weight per rarity for standard loot rolls. */
export const RARITY_WEIGHTS: Record<GearRarity, number> = {
  common:    60,
  uncommon:  25,
  rare:      10,
  epic:       4,
  legendary:  1,
};

/** Salvage shard value by rarity. */
export const SALVAGE_VALUES: Record<GearRarity, number> = {
  common:     5,
  uncommon:  10,
  rare:      25,
  epic:      60,
  legendary: 150,
};

/** Crystal cost to enhance (+1 through +5). */
export const ENHANCE_COSTS: number[] = [20, 40, 80, 150, 300];

// ── Gear Type ────────────────────────────────────────────────────────────────

export const GearType = {
  BARREL_MOD:      'barrel-mod',      // Cannon
  CRYSTAL_CORE:    'crystal-core',    // Frost
  COIL_AMPLIFIER:  'coil-amplifier',  // Tesla
  SHELL_CASING:    'shell-casing',    // Mortar
  VENOM_GLAND:     'venom-gland',     // Poison
  SPIRIT_TOTEM:    'spirit-totem',    // Aura
  ARROW_FLETCHING: 'arrow-fletching', // Arrow
  UNIVERSAL_CHARM: 'universal-charm', // Any tower
} as const;

export type GearType = (typeof GearType)[keyof typeof GearType];

/** Map from gear type to the tower key it fits (null = universal). */
export const GEAR_TYPE_TOWER: Record<GearType, string | null> = {
  'barrel-mod':      'cannon',
  'crystal-core':    'frost',
  'coil-amplifier':  'tesla',
  'shell-casing':    'mortar',
  'venom-gland':     'poison',
  'spirit-totem':    'aura',
  'arrow-fletching': 'arrow',
  'universal-charm': null,
};

// ── Stat Modifiers ───────────────────────────────────────────────────────────

/** Numeric stat bonuses a gear item can provide (all multiplicative percentages). */
export interface GearStatMods {
  damagePct?:         number;  // +damage %
  rangePct?:          number;  // +range %
  attackSpeedPct?:    number;  // +attack speed % (lower interval)
  splashRadiusPct?:   number;  // +splash radius %
  chainCountBonus?:   number;  // +N extra chains (Tesla)
  chainRangePct?:     number;  // +chain range %
  slowPctBonus?:      number;  // +slow strength (additive reduction to slowFactor)
  freezeDurationPct?: number;  // +freeze/slow duration %
  dotDamagePct?:      number;  // +DoT damage %
  dotStackBonus?:     number;  // +N max DoT stacks
  auraRadiusPct?:     number;  // +aura buff radius %
  auraStrengthPct?:   number;  // +aura buff strength %
  armorPenPct?:       number;  // armor penetration %
  stunDurationMs?:    number;  // impact stun duration (ms)
}

// ── Special Effects ──────────────────────────────────────────────────────────

export interface GearSpecialEffect {
  id:          string;
  description: string;
}

// ── Gear Definition (template) ───────────────────────────────────────────────

export interface GearDef {
  id:           string;
  name:         string;
  description:  string;
  gearType:     GearType;
  rarity:       GearRarity;
  stats:        GearStatMods;
  specialEffect?: GearSpecialEffect;
}

// ── Gear Instance (owned item with unique ID + enhancement level) ────────────

export interface GearInstance {
  uid:            string;       // Unique instance ID (uuid-like)
  defId:          string;       // References GearDef.id
  enhanceLevel:   number;       // 0–5 enhancement level
  rune?:          RuneDef;      // Socketed rune (available at +3)
  isNew?:         boolean;      // "NEW" badge flag (cleared on view)
}

// ── Rune ─────────────────────────────────────────────────────────────────────

export const RuneType = {
  DAMAGE:  'damage',
  SPEED:   'speed',
  RANGE:   'range',
  SPECIAL: 'special',
} as const;

export type RuneType = (typeof RuneType)[keyof typeof RuneType];

export interface RuneDef {
  id:          string;
  name:        string;
  runeType:    RuneType;
  statBonus:   GearStatMods;
  description: string;
}

// ── Rune definitions ─────────────────────────────────────────────────────────

export const ALL_RUNES: RuneDef[] = [
  { id: 'rune-damage-1',  name: 'Rune of Striking',   runeType: 'damage',  statBonus: { damagePct: 0.05 },      description: '+5% damage' },
  { id: 'rune-speed-1',   name: 'Rune of Haste',      runeType: 'speed',   statBonus: { attackSpeedPct: 0.05 }, description: '+5% attack speed' },
  { id: 'rune-range-1',   name: 'Rune of Reach',      runeType: 'range',   statBonus: { rangePct: 0.05 },       description: '+5% range' },
  { id: 'rune-damage-2',  name: 'Greater Rune of Striking', runeType: 'damage', statBonus: { damagePct: 0.08 },  description: '+8% damage' },
  { id: 'rune-speed-2',   name: 'Greater Rune of Haste',    runeType: 'speed',  statBonus: { attackSpeedPct: 0.08 }, description: '+8% attack speed' },
  { id: 'rune-range-2',   name: 'Greater Rune of Reach',    runeType: 'range',  statBonus: { rangePct: 0.08 },   description: '+8% range' },
  { id: 'rune-frost-1',   name: 'Rune of Frost',      runeType: 'special', statBonus: { slowPctBonus: 0.03 },   description: '+3% slow strength' },
  { id: 'rune-venom-1',   name: 'Rune of Venom',      runeType: 'special', statBonus: { dotDamagePct: 0.05 },   description: '+5% DoT damage' },
];

// ── Gear Definitions (30+ items) ─────────────────────────────────────────────

export const ALL_GEAR_DEFS: GearDef[] = [
  // ──────────────── Barrel Mods (Cannon) ────────────────────────────────────
  {
    id: 'barrel-iron-sight', name: 'Iron Sight', gearType: 'barrel-mod', rarity: 'common',
    description: 'A basic scope that tightens aim.',
    stats: { damagePct: 0.08 },
  },
  {
    id: 'barrel-long-range', name: 'Extended Barrel', gearType: 'barrel-mod', rarity: 'common',
    description: 'Longer barrel increases effective range.',
    stats: { rangePct: 0.08 },
  },
  {
    id: 'barrel-rapid-loader', name: 'Rapid Loader', gearType: 'barrel-mod', rarity: 'uncommon',
    description: 'Mechanical loader speeds up firing.',
    stats: { attackSpeedPct: 0.12 },
  },
  {
    id: 'barrel-armor-piercing', name: 'Armor-Piercing Round', gearType: 'barrel-mod', rarity: 'uncommon',
    description: 'Hardened tip punches through defences.',
    stats: { damagePct: 0.15, armorPenPct: 0.10 },
  },
  {
    id: 'barrel-frozen-lakebed', name: 'Frozen Lakebed Barrel', gearType: 'barrel-mod', rarity: 'rare',
    description: 'Ice-tempered steel hits harder and chills on impact.',
    stats: { damagePct: 0.20, rangePct: 0.10 },
    specialEffect: { id: 'cannon-chill', description: 'Cannon shots slow targets by 10% for 1s' },
  },
  {
    id: 'barrel-makwas-claw', name: "Makwa's Claw", gearType: 'barrel-mod', rarity: 'legendary',
    description: "The bear's strike shreds all armour.",
    stats: { damagePct: 0.40 },
    specialEffect: { id: 'armor-shred-50', description: 'Attacks shred 50% armour for 3s' },
  },

  // ──────────────── Crystal Cores (Frost) ───────────────────────────────────
  {
    id: 'crystal-chipped', name: 'Chipped Crystal', gearType: 'crystal-core', rarity: 'common',
    description: 'A rough ice crystal that deepens the chill.',
    stats: { slowPctBonus: 0.03 },
  },
  {
    id: 'crystal-polished', name: 'Polished Crystal', gearType: 'crystal-core', rarity: 'common',
    description: 'Refined frost crystal with longer reach.',
    stats: { rangePct: 0.08 },
  },
  {
    id: 'crystal-deep-frost', name: 'Deep Frost Core', gearType: 'crystal-core', rarity: 'uncommon',
    description: 'Extreme cold slows targets significantly.',
    stats: { slowPctBonus: 0.05, freezeDurationPct: 0.10 },
  },
  {
    id: 'crystal-glacial', name: 'Glacial Lens', gearType: 'crystal-core', rarity: 'rare',
    description: 'Focuses frost energy into a devastating beam.',
    stats: { slowPctBonus: 0.06, damagePct: 0.20 },
    specialEffect: { id: 'frost-vuln', description: 'Frozen creeps take +15% damage from all sources' },
  },
  {
    id: 'crystal-frozen-shard', name: 'Frozen Lakebed Shard', gearType: 'crystal-core', rarity: 'rare',
    description: 'Ancient ice from the deepest lake.',
    stats: { slowPctBonus: 0.07, freezeDurationPct: 0.15 },
    specialEffect: { id: 'frost-dmg-bonus', description: 'Frozen targets take +15% damage' },
  },
  {
    id: 'crystal-biboon', name: "Biboon's Heart", gearType: 'crystal-core', rarity: 'epic',
    description: 'The heart of winter itself, radiating absolute cold.',
    stats: { slowPctBonus: 0.08, freezeDurationPct: 0.25, rangePct: 0.15 },
    specialEffect: { id: 'frost-aura-chill', description: 'Nearby creeps are slowed 5% passively' },
  },

  // ──────────────── Coil Amplifiers (Tesla) ─────────────────────────────────
  {
    id: 'coil-copper', name: 'Copper Coil', gearType: 'coil-amplifier', rarity: 'common',
    description: 'Basic copper winding for slightly more reach.',
    stats: { chainRangePct: 0.10 },
  },
  {
    id: 'coil-silver', name: 'Silver Coil', gearType: 'coil-amplifier', rarity: 'uncommon',
    description: 'Higher conductivity means faster strikes.',
    stats: { attackSpeedPct: 0.12, chainRangePct: 0.08 },
  },
  {
    id: 'coil-multi-arc', name: 'Multi-Arc Amplifier', gearType: 'coil-amplifier', rarity: 'uncommon',
    description: 'Splits the lightning into additional arcs.',
    stats: { chainCountBonus: 1 },
  },
  {
    id: 'coil-storm-caller', name: 'Storm Caller Coil', gearType: 'coil-amplifier', rarity: 'rare',
    description: 'Channels the fury of the storm.',
    stats: { damagePct: 0.20, chainCountBonus: 1, chainRangePct: 0.15 },
    specialEffect: { id: 'tesla-overcharge', description: '+10% chain damage per bounce' },
  },
  {
    id: 'coil-migizi-feather', name: 'Migizi Feather', gearType: 'coil-amplifier', rarity: 'epic',
    description: "The eagle's feather guides lightning to the sky.",
    stats: { chainCountBonus: 2, damagePct: 0.25 },
    specialEffect: { id: 'tesla-air-priority', description: 'Chains prioritize air creeps' },
  },

  // ──────────────── Shell Casings (Mortar) ──────────────────────────────────
  {
    id: 'shell-heavy', name: 'Heavy Shell', gearType: 'shell-casing', rarity: 'common',
    description: 'Heavier payload deals more splash damage.',
    stats: { damagePct: 0.08, splashRadiusPct: 0.05 },
  },
  {
    id: 'shell-wide-blast', name: 'Wide Blast Casing', gearType: 'shell-casing', rarity: 'uncommon',
    description: 'Wider fragmentation pattern covers more ground.',
    stats: { splashRadiusPct: 0.15 },
  },
  {
    id: 'shell-cluster-pack', name: 'Cluster Pack', gearType: 'shell-casing', rarity: 'uncommon',
    description: 'Extra submunitions scatter on impact.',
    stats: { damagePct: 0.10, splashRadiusPct: 0.10 },
  },
  {
    id: 'shell-concussive', name: 'Concussive Shell', gearType: 'shell-casing', rarity: 'rare',
    description: 'Stuns targets briefly on impact.',
    stats: { damagePct: 0.18, splashRadiusPct: 0.12 },
    specialEffect: { id: 'mortar-stun', description: 'Impact stuns targets for 300ms' },
  },
  {
    id: 'shell-earthquake', name: 'Earthquake Casing', gearType: 'shell-casing', rarity: 'epic',
    description: 'Shakes the earth itself, devastating all nearby.',
    stats: { damagePct: 0.30, splashRadiusPct: 0.25 },
    specialEffect: { id: 'mortar-tremor', description: '+20% splash damage to armored targets' },
  },

  // ──────────────── Venom Glands (Poison) ───────────────────────────────────
  {
    id: 'venom-weak', name: 'Diluted Venom Sac', gearType: 'venom-gland', rarity: 'common',
    description: 'A weak toxin that still hurts over time.',
    stats: { dotDamagePct: 0.08 },
  },
  {
    id: 'venom-concentrated', name: 'Concentrated Toxin', gearType: 'venom-gland', rarity: 'uncommon',
    description: 'Highly concentrated poison stacks faster.',
    stats: { dotDamagePct: 0.15, dotStackBonus: 1 },
  },
  {
    id: 'venom-spreading', name: 'Spreading Plague Gland', gearType: 'venom-gland', rarity: 'rare',
    description: 'The toxin leaps between victims.',
    stats: { dotDamagePct: 0.20, dotStackBonus: 1 },
    specialEffect: { id: 'poison-spread-radius', description: '+20% poison spread radius' },
  },
  {
    id: 'venom-necrotic', name: 'Necrotic Venom', gearType: 'venom-gland', rarity: 'epic',
    description: 'Flesh-eating venom that grows stronger over time.',
    stats: { dotDamagePct: 0.30, dotStackBonus: 2 },
    specialEffect: { id: 'poison-ramp', description: 'DoT damage increases 5% per stack' },
  },

  // ──────────────── Spirit Totems (Aura) ────────────────────────────────────
  {
    id: 'totem-wooden', name: 'Wooden Totem', gearType: 'spirit-totem', rarity: 'common',
    description: 'A carved totem that slightly amplifies the aura.',
    stats: { auraStrengthPct: 0.05 },
  },
  {
    id: 'totem-cedar', name: 'Cedar Spirit Totem', gearType: 'spirit-totem', rarity: 'uncommon',
    description: 'Cedar wood channels spirit energy further.',
    stats: { auraRadiusPct: 0.12, auraStrengthPct: 0.08 },
  },
  {
    id: 'totem-ancestor', name: "Ancestor's Totem", gearType: 'spirit-totem', rarity: 'rare',
    description: 'Carries the blessing of those who came before.',
    stats: { auraRadiusPct: 0.15, auraStrengthPct: 0.15 },
    specialEffect: { id: 'aura-dual-buff', description: '10% chance to apply both speed and damage buffs' },
  },
  {
    id: 'totem-great-spirit', name: 'Great Spirit Totem', gearType: 'spirit-totem', rarity: 'epic',
    description: 'A masterwork totem radiating overwhelming power.',
    stats: { auraRadiusPct: 0.25, auraStrengthPct: 0.25 },
    specialEffect: { id: 'aura-triple', description: 'Aura grants speed, damage, AND range buffs simultaneously' },
  },

  // ──────────────── Arrow Fletchings (Arrow) ────────────────────────────────
  {
    id: 'arrow-sinew-string', name: 'Sinew Bowstring', gearType: 'arrow-fletching', rarity: 'common',
    description: 'A sturdy sinew string that speeds up draws.',
    stats: { attackSpeedPct: 0.08 },
  },
  {
    id: 'arrow-flint-heads', name: 'Sharpened Flint Tips', gearType: 'arrow-fletching', rarity: 'common',
    description: 'Hand-knapped flint arrowheads that hit harder.',
    stats: { damagePct: 0.08 },
  },
  {
    id: 'arrow-eagle-feather', name: 'Eagle Feather Fletching', gearType: 'arrow-fletching', rarity: 'uncommon',
    description: 'Eagle feathers guide arrows further and truer.',
    stats: { rangePct: 0.12, damagePct: 0.06 },
  },
  {
    id: 'arrow-birch-recurve', name: 'Birch Recurve Limb', gearType: 'arrow-fletching', rarity: 'uncommon',
    description: 'Flexible birch limb increases draw speed.',
    stats: { attackSpeedPct: 0.15 },
  },
  {
    id: 'arrow-obsidian-broadhead', name: 'Obsidian Broadhead', gearType: 'arrow-fletching', rarity: 'rare',
    description: 'Razor-sharp volcanic glass tears through armour.',
    stats: { damagePct: 0.22, armorPenPct: 0.12 },
    specialEffect: { id: 'arrow-bleed', description: 'Arrows cause bleeding: 3 damage/s for 2s' },
  },
  {
    id: 'arrow-windwalker-bow', name: "Windwalker's Bow", gearType: 'arrow-fletching', rarity: 'epic',
    description: 'The wind itself carries these arrows to their mark.',
    stats: { attackSpeedPct: 0.20, rangePct: 0.18, damagePct: 0.15 },
    specialEffect: { id: 'arrow-pierce', description: 'Arrows have 20% chance to pierce through targets' },
  },

  // ──────────────── Universal Charms ────────────────────────────────────────
  {
    id: 'charm-flint', name: 'Flint Charm', gearType: 'universal-charm', rarity: 'common',
    description: 'A sharp flint fragment tied with sinew.',
    stats: { damagePct: 0.06 },
  },
  {
    id: 'charm-feather', name: 'Feather Charm', gearType: 'universal-charm', rarity: 'common',
    description: 'A light feather that quickens reflexes.',
    stats: { attackSpeedPct: 0.06 },
  },
  {
    id: 'charm-eagle-eye', name: 'Eagle Eye Charm', gearType: 'universal-charm', rarity: 'uncommon',
    description: "The eagle's sight extends your tower's reach.",
    stats: { rangePct: 0.12 },
  },
  {
    id: 'charm-warriors-mark', name: "Warrior's Mark", gearType: 'universal-charm', rarity: 'uncommon',
    description: 'A war marking that empowers all attacks.',
    stats: { damagePct: 0.12, attackSpeedPct: 0.05 },
  },
  {
    id: 'charm-spirit-walker', name: 'Spirit Walker Charm', gearType: 'universal-charm', rarity: 'rare',
    description: 'Walk between worlds — all stats heightened.',
    stats: { damagePct: 0.15, rangePct: 0.10, attackSpeedPct: 0.08 },
    specialEffect: { id: 'spirit-walker', description: 'Tower gains +3% to all stats per wave survived' },
  },
  {
    id: 'charm-thunderbirds-spark', name: "Thunderbird's Spark", gearType: 'universal-charm', rarity: 'legendary',
    description: 'A spark of divine lightning, unpredictable and devastating.',
    stats: { damagePct: 0.35, attackSpeedPct: 0.15 },
    specialEffect: { id: 'lightning-strike', description: '5% chance any attack calls lightning (100 bonus damage)' },
  },
  {
    id: 'charm-seven-fires', name: 'Seven Fires Prophecy', gearType: 'universal-charm', rarity: 'legendary',
    description: 'The prophecy burns bright — all who stand near are empowered.',
    stats: { damagePct: 0.40, rangePct: 0.20 },
    specialEffect: { id: 'seven-fires', description: 'Nearby towers within 80px gain +5% damage' },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Look up a gear definition by its ID. */
export function getGearDef(id: string): GearDef | undefined {
  return ALL_GEAR_DEFS.find(d => d.id === id);
}

/** Get all gear defs for a specific gear type. */
export function getGearDefsByType(gearType: GearType): GearDef[] {
  return ALL_GEAR_DEFS.filter(d => d.gearType === gearType);
}

/** Get all gear defs of a specific rarity. */
export function getGearDefsByRarity(rarity: GearRarity): GearDef[] {
  return ALL_GEAR_DEFS.filter(d => d.rarity === rarity);
}

/** Check if a gear item can be equipped on a specific tower type. */
export function canEquipOnTower(gearDef: GearDef, towerKey: string): boolean {
  const requiredTower = GEAR_TYPE_TOWER[gearDef.gearType];
  return requiredTower === null || requiredTower === towerKey;
}

/** Get the effective stat multiplier including enhancement level. Each +level adds ~5%. */
export function getEnhancedStatMult(enhanceLevel: number): number {
  return 1.0 + enhanceLevel * 0.05;
}

/** Generate a simple unique ID for gear instances. */
export function generateGearUid(): string {
  return `gear-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Create a GearInstance from a GearDef. */
export function createGearInstance(defId: string): GearInstance {
  return {
    uid:          generateGearUid(),
    defId,
    enhanceLevel: 0,
    isNew:        true,
  };
}

/** Get the next rarity tier (for evolution). Returns undefined if already legendary. */
export function getNextRarity(rarity: GearRarity): GearRarity | undefined {
  const idx = RARITY_ORDER.indexOf(rarity);
  if (idx < 0 || idx >= RARITY_ORDER.length - 1) return undefined;
  return RARITY_ORDER[idx + 1];
}

/**
 * Roll loot after a run completes.
 * Returns 0–2 GearInstance items based on performance.
 *
 * @param ascension    Ascension level (0 = none; higher shifts rarity weights up)
 * @param moonRating   Moon rating earned (1–5, or 0 for unrated)
 * @param isChallengeMap  True for challenge maps (guaranteed drop + higher rarity)
 */
export function rollLoot(
  ascension: number,
  moonRating: number,
  isChallengeMap: boolean,
): GearInstance[] {
  const drops: GearInstance[] = [];

  // Determine number of drops
  let dropCount = 0;
  if (isChallengeMap) {
    // Challenge maps: guaranteed 1 drop, 40% chance of second
    dropCount = 1;
    if (Math.random() < 0.4) dropCount = 2;
  } else if (moonRating >= 5) {
    // Full moon: guaranteed 1, 30% chance of second
    dropCount = 1;
    if (Math.random() < 0.3) dropCount = 2;
  } else if (moonRating >= 3) {
    // Good rating: 70% chance of 1 drop
    if (Math.random() < 0.7) dropCount = 1;
  } else if (moonRating >= 1) {
    // Some rating: 40% chance of 1 drop
    if (Math.random() < 0.4) dropCount = 1;
  } else {
    // No rating (lost): 15% chance of 1 drop
    if (Math.random() < 0.15) dropCount = 1;
  }

  for (let i = 0; i < dropCount; i++) {
    const rarity = rollRarity(ascension, isChallengeMap);
    const def = rollGearOfRarity(rarity);
    if (def) {
      drops.push(createGearInstance(def.id));
    }
  }

  return drops;
}

/** Roll a rarity tier with weighted probabilities. */
function rollRarity(ascension: number, isChallengeMap: boolean): GearRarity {
  // Build adjusted weights
  const weights = { ...RARITY_WEIGHTS };

  // Ascension shifts weights toward higher rarity
  // Each ascension level adds +2% to rare, +1% to epic, +0.5% to legendary
  // and removes from common
  const rareShift      = Math.min(ascension * 2, 20);
  const epicShift      = Math.min(ascension * 1, 10);
  const legendaryShift = Math.min(ascension * 0.5, 5);
  weights.common    = Math.max(10, weights.common - rareShift - epicShift - legendaryShift);
  weights.rare      += rareShift;
  weights.epic      += epicShift;
  weights.legendary += legendaryShift;

  // Challenge maps further boost rarity
  if (isChallengeMap) {
    weights.common    = Math.max(5, weights.common - 25);
    weights.uncommon  += 5;
    weights.rare      += 10;
    weights.epic      += 7;
    weights.legendary += 3;
  }

  // Weighted random selection
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const r of RARITY_ORDER) {
    roll -= weights[r];
    if (roll <= 0) return r;
  }
  return GearRarity.COMMON;
}

/** Pick a random gear def of the given rarity. */
function rollGearOfRarity(rarity: GearRarity): GearDef | undefined {
  const pool = ALL_GEAR_DEFS.filter(d => d.rarity === rarity);
  if (pool.length === 0) {
    // Fallback: try any rarity
    return ALL_GEAR_DEFS[Math.floor(Math.random() * ALL_GEAR_DEFS.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
