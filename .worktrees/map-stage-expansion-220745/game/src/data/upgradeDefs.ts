// ── Upgrade Tree Schema ────────────────────────────────────────────────────────
//
// Each tower has 3 upgrade paths (A, B, C) × 5 tiers.
// Advancing path A or C to the lockThreshold tier locks out the other.
// Path B is always purchasable.
//
// Drawbacks:
//   Frost C (shatterOnDeath):  destroys Poison DoT stacks on frozen creep death
//   Tesla C (overloadMode):    chains briefly debuff nearby allied towers
//   Aura deep spec:            deep path reduces bonus for non-matching tower types

export interface UpgradeTierDef {
  name:        string;
  description: string;
  cost:        number;

  /** Flat / percentage stat changes accumulated across purchased tiers */
  statDelta?: {
    damageDelta?:            number;   // flat damage bonus
    rangeDelta?:             number;   // flat range bonus (px)
    attackSpeedPct?:         number;   // additive % faster attack (e.g. 5 = 5% faster)
    splashRadiusDelta?:      number;   // flat splash radius bonus (Mortar)
    chainCountDelta?:        number;   // extra chain targets (Tesla)
    chainDamageRatioDelta?:  number;   // chain damage fraction added (Tesla)
    auraIntervalMultDelta?:  number;   // added to auraIntervalMult (negative = better)
    auraDamageMultDelta?:    number;   // added to damage multiplier
    auraRangePctDelta?:      number;   // fraction added to range bonus (e.g. 0.12 = +12%)
  };

  /** Behavioural flags / overrides; later tiers override earlier within the same path */
  effects?: {
    armorShredPct?:      number;  // Cannon A: damage vulnerability % applied on hit
    armorShredDuration?: number;  // Cannon A: shred debuff duration (ms)
    executeThreshold?:   number;  // Cannon B: instant-kill below this HP ratio (0–1)
    slowFactor?:         number;  // Frost A: override slow factor (lower = stronger)
    slowDurationMs?:     number;  // Frost B: override slow duration (ms)
    shatterOnDeath?:     true;    // Frost C: clear Poison DoT stacks on frozen creep death
    clusterCount?:       number;  // Mortar C: extra submunitions fired on impact
    dotDamageBonus?:     number;  // Poison A: extra damage per DoT tick
    maxDotStacks?:       number;  // Poison B: max stack cap (replaces previous cap)
    dotSpreadOnDeath?:   true;    // Poison C: spread 1 DoT stack to nearby creeps on death
    overloadMode?:       true;    // Tesla C: chains also debuff nearby allied towers
    overloadDebuffPct?:  number;  // Tesla C: % attack-speed penalty applied to debuffed towers
    auraSpecialization?: 'speed' | 'damage' | 'range'; // Aura deep-path type
  };
}

export interface UpgradePathDef {
  id:    'A' | 'B' | 'C';
  name:  string;
  tiers: [UpgradeTierDef, UpgradeTierDef, UpgradeTierDef, UpgradeTierDef, UpgradeTierDef];
}

export interface TowerUpgradeDef {
  towerKey:      string;
  /**
   * Reaching this tier on path A OR C locks the opposing path.
   * (Path B is never locked.)
   */
  lockThreshold: number;
  /**
   * Fraction of totalSpent lost as the respec fee.
   * e.g. 0.25 → player gets back 75% of what they spent.
   */
  respecCostPct: number;
  paths:         { A: UpgradePathDef; B: UpgradePathDef; C: UpgradePathDef };
}

// ── Cannon ────────────────────────────────────────────────────────────────────
// Base: 40 dmg, 160 range, 1000ms interval

const CANNON_UPGRADES: TowerUpgradeDef = {
  towerKey: 'cannon', lockThreshold: 3, respecCostPct: 0.25,
  paths: {
    A: {
      id: 'A', name: 'Armor Shred',
      tiers: [
        { name: 'Expose I',   description: 'Hits apply 8% damage vulnerability for 3s.',  cost: 40,  effects: { armorShredPct: 0.08, armorShredDuration: 3000 } },
        { name: 'Expose II',  description: 'Vulnerability increased to 14%.',              cost: 60,  effects: { armorShredPct: 0.14, armorShredDuration: 3000 } },
        { name: 'Expose III', description: 'Vulnerability 20%, lasts 4s. Locks Path C.',   cost: 80,  effects: { armorShredPct: 0.20, armorShredDuration: 4000 } },
        { name: 'Expose IV',  description: 'Vulnerability 26%, lasts 4s.',                 cost: 120, effects: { armorShredPct: 0.26, armorShredDuration: 4000 } },
        { name: 'Expose V',   description: 'Vulnerability 32%, lasts 5s.',                 cost: 150, effects: { armorShredPct: 0.32, armorShredDuration: 5000 } },
      ],
    },
    B: {
      id: 'B', name: 'Execute',
      tiers: [
        { name: 'Cull I',   description: 'Instantly kills targets below 10% HP. +5 dmg.', cost: 40,  statDelta: { damageDelta: 5  }, effects: { executeThreshold: 0.10 } },
        { name: 'Cull II',  description: 'Execute below 13% HP. +8 dmg.',                  cost: 60,  statDelta: { damageDelta: 8  }, effects: { executeThreshold: 0.13 } },
        { name: 'Cull III', description: 'Execute below 16% HP. +10 dmg.',                 cost: 80,  statDelta: { damageDelta: 10 }, effects: { executeThreshold: 0.16 } },
        { name: 'Cull IV',  description: 'Execute below 20% HP. +12 dmg.',                 cost: 120, statDelta: { damageDelta: 12 }, effects: { executeThreshold: 0.20 } },
        { name: 'Cull V',   description: 'Execute below 25% HP. +15 dmg.',                 cost: 150, statDelta: { damageDelta: 15 }, effects: { executeThreshold: 0.25 } },
      ],
    },
    C: {
      id: 'C', name: 'Range & Speed',
      tiers: [
        { name: 'Scope I',   description: '+15 range.',                              cost: 40,  statDelta: { rangeDelta: 15 } },
        { name: 'Scope II',  description: '+20 range. 5% faster attack.',            cost: 60,  statDelta: { rangeDelta: 20, attackSpeedPct: 5  } },
        { name: 'Scope III', description: '+25 range. 5% faster. Locks Path A.',    cost: 80,  statDelta: { rangeDelta: 25, attackSpeedPct: 5  } },
        { name: 'Scope IV',  description: '+30 range. 5% faster.',                  cost: 120, statDelta: { rangeDelta: 30, attackSpeedPct: 5  } },
        { name: 'Scope V',   description: '+35 range. 5% faster.',                  cost: 150, statDelta: { rangeDelta: 35, attackSpeedPct: 5  } },
      ],
    },
  },
};

// ── Frost ─────────────────────────────────────────────────────────────────────
// Base: 15 dmg, 140 range, 1200ms, slow 0.5 factor, 2500ms duration

const FROST_UPGRADES: TowerUpgradeDef = {
  towerKey: 'frost', lockThreshold: 3, respecCostPct: 0.25,
  paths: {
    A: {
      id: 'A', name: 'Slow Magnitude',
      tiers: [
        { name: 'Chill I',   description: 'Slow factor 0.44.',             cost: 40,  effects: { slowFactor: 0.44 } },
        { name: 'Chill II',  description: 'Slow factor 0.37.',             cost: 60,  effects: { slowFactor: 0.37 } },
        { name: 'Chill III', description: 'Slow factor 0.28. Locks Path C.', cost: 80, effects: { slowFactor: 0.28 } },
        { name: 'Chill IV',  description: 'Slow factor 0.20.',             cost: 120, effects: { slowFactor: 0.20 } },
        { name: 'Chill V',   description: 'Slow factor 0.12.',             cost: 150, effects: { slowFactor: 0.12 } },
      ],
    },
    B: {
      id: 'B', name: 'Freeze Duration',
      tiers: [
        { name: 'Extend I',   description: 'Slow lasts 3s.',  cost: 40,  effects: { slowDurationMs: 3000 } },
        { name: 'Extend II',  description: 'Slow lasts 3.5s.', cost: 60, effects: { slowDurationMs: 3500 } },
        { name: 'Extend III', description: 'Slow lasts 4s.',  cost: 80,  effects: { slowDurationMs: 4000 } },
        { name: 'Extend IV',  description: 'Slow lasts 5s.',  cost: 120, effects: { slowDurationMs: 5000 } },
        { name: 'Extend V',   description: 'Slow lasts 6s.',  cost: 150, effects: { slowDurationMs: 6000 } },
      ],
    },
    C: {
      id: 'C', name: 'Shatter',
      tiers: [
        { name: 'Shatter I',   description: 'Frozen creep deaths destroy Poison DoT stacks. +8 dmg.',  cost: 50,  statDelta: { damageDelta: 8  }, effects: { shatterOnDeath: true } },
        { name: 'Shatter II',  description: '+10 dmg.',                                                 cost: 70,  statDelta: { damageDelta: 10 }, effects: { shatterOnDeath: true } },
        { name: 'Shatter III', description: '+14 dmg. Locks Path A.',                                   cost: 90,  statDelta: { damageDelta: 14 }, effects: { shatterOnDeath: true } },
        { name: 'Shatter IV',  description: '+18 dmg. 8% faster attack.',                               cost: 130, statDelta: { damageDelta: 18, attackSpeedPct: 8  }, effects: { shatterOnDeath: true } },
        { name: 'Shatter V',   description: '+22 dmg. 8% faster attack.',                               cost: 160, statDelta: { damageDelta: 22, attackSpeedPct: 8  }, effects: { shatterOnDeath: true } },
      ],
    },
  },
};

// ── Mortar ────────────────────────────────────────────────────────────────────
// Base: 60 dmg, 200 range, 2500ms, splash 55

const MORTAR_UPGRADES: TowerUpgradeDef = {
  towerKey: 'mortar', lockThreshold: 3, respecCostPct: 0.25,
  paths: {
    A: {
      id: 'A', name: 'Splash Radius',
      tiers: [
        { name: 'Blast I',   description: '+8 splash radius.',             cost: 50,  statDelta: { splashRadiusDelta: 8  } },
        { name: 'Blast II',  description: '+14 splash radius.',            cost: 70,  statDelta: { splashRadiusDelta: 14 } },
        { name: 'Blast III', description: '+20 splash. Locks Path C.',     cost: 95,  statDelta: { splashRadiusDelta: 20 } },
        { name: 'Blast IV',  description: '+28 splash radius.',            cost: 140, statDelta: { splashRadiusDelta: 28 } },
        { name: 'Blast V',   description: '+38 splash radius.',            cost: 175, statDelta: { splashRadiusDelta: 38 } },
      ],
    },
    B: {
      id: 'B', name: 'Raw Damage',
      tiers: [
        { name: 'Payload I',   description: '+15 damage.',  cost: 50,  statDelta: { damageDelta: 15 } },
        { name: 'Payload II',  description: '+25 damage.',  cost: 70,  statDelta: { damageDelta: 25 } },
        { name: 'Payload III', description: '+35 damage.',  cost: 95,  statDelta: { damageDelta: 35 } },
        { name: 'Payload IV',  description: '+50 damage.',  cost: 140, statDelta: { damageDelta: 50 } },
        { name: 'Payload V',   description: '+65 damage.',  cost: 175, statDelta: { damageDelta: 65 } },
      ],
    },
    C: {
      id: 'C', name: 'Cluster',
      tiers: [
        { name: 'Cluster I',   description: 'Impact fires 2 cluster submunitions.',               cost: 55,  effects: { clusterCount: 2 } },
        { name: 'Cluster II',  description: '3 clusters, each deals +5 dmg.',                     cost: 80,  statDelta: { damageDelta: 5 }, effects: { clusterCount: 3 } },
        { name: 'Cluster III', description: '4 clusters. Locks Path A.',                          cost: 100, effects: { clusterCount: 4 } },
        { name: 'Cluster IV',  description: '5 clusters, wider scatter.',                         cost: 145, effects: { clusterCount: 5 } },
        { name: 'Cluster V',   description: '6 clusters, each with AoE splash.',                  cost: 180, effects: { clusterCount: 6 } },
      ],
    },
  },
};

// ── Poison ────────────────────────────────────────────────────────────────────
// Base: DoT 6 dmg/tick, 500ms tick, 8 ticks; max 4 stacks

const POISON_UPGRADES: TowerUpgradeDef = {
  towerKey: 'poison', lockThreshold: 3, respecCostPct: 0.25,
  paths: {
    A: {
      id: 'A', name: 'DoT Damage',
      tiers: [
        { name: 'Venom I',   description: '+2 damage per DoT tick.',             cost: 45,  effects: { dotDamageBonus: 2  } },
        { name: 'Venom II',  description: '+4 damage per tick.',                  cost: 65,  effects: { dotDamageBonus: 4  } },
        { name: 'Venom III', description: '+6 damage per tick. Locks Path C.',    cost: 90,  effects: { dotDamageBonus: 6  } },
        { name: 'Venom IV',  description: '+9 damage per tick.',                  cost: 130, effects: { dotDamageBonus: 9  } },
        { name: 'Venom V',   description: '+12 damage per tick.',                 cost: 165, effects: { dotDamageBonus: 12 } },
      ],
    },
    B: {
      id: 'B', name: 'Stack Count',
      tiers: [
        { name: 'Infest I',   description: 'Max 5 DoT stacks per creep.',  cost: 45,  effects: { maxDotStacks: 5  } },
        { name: 'Infest II',  description: 'Max 6 stacks.',                 cost: 65,  effects: { maxDotStacks: 6  } },
        { name: 'Infest III', description: 'Max 7 stacks.',                 cost: 90,  effects: { maxDotStacks: 7  } },
        { name: 'Infest IV',  description: 'Max 8 stacks.',                 cost: 130, effects: { maxDotStacks: 8  } },
        { name: 'Infest V',   description: 'Max 10 stacks.',                cost: 165, effects: { maxDotStacks: 10 } },
      ],
    },
    C: {
      id: 'C', name: 'Spread',
      tiers: [
        { name: 'Plague I',   description: 'Poisoned creep deaths spread 1 DoT to nearby creeps. +3 dmg.',  cost: 55,  statDelta: { damageDelta: 3 }, effects: { dotSpreadOnDeath: true } },
        { name: 'Plague II',  description: 'Spread range +10px.',                                            cost: 75,  effects: { dotSpreadOnDeath: true } },
        { name: 'Plague III', description: 'Spread 2 DoT stacks. Locks Path A.',                             cost: 100, effects: { dotSpreadOnDeath: true } },
        { name: 'Plague IV',  description: 'Spread 3 DoT stacks.',                                           cost: 145, effects: { dotSpreadOnDeath: true } },
        { name: 'Plague V',   description: 'Spread also affects air creeps. +5 dmg.',                        cost: 180, statDelta: { damageDelta: 5 }, effects: { dotSpreadOnDeath: true } },
      ],
    },
  },
};

// ── Tesla ─────────────────────────────────────────────────────────────────────
// Base: 35 dmg, chainCount 3, chainRange 110, chainDamageRatio 0.6

const TESLA_UPGRADES: TowerUpgradeDef = {
  towerKey: 'tesla', lockThreshold: 3, respecCostPct: 0.25,
  paths: {
    A: {
      id: 'A', name: 'Chain Count',
      tiers: [
        { name: 'Fork I',   description: '+1 chain target.',              cost: 55,  statDelta: { chainCountDelta: 1 } },
        { name: 'Fork II',  description: '+2 chain targets.',             cost: 80,  statDelta: { chainCountDelta: 2 } },
        { name: 'Fork III', description: '+3 chain targets. Locks Path C.', cost: 105, statDelta: { chainCountDelta: 3 } },
        { name: 'Fork IV',  description: '+4 chain targets.',             cost: 155, statDelta: { chainCountDelta: 4 } },
        { name: 'Fork V',   description: '+5 chain targets.',             cost: 195, statDelta: { chainCountDelta: 5 } },
      ],
    },
    B: {
      id: 'B', name: 'Arc Damage',
      tiers: [
        { name: 'Surge I',   description: 'Chain damage ratio +10%.',  cost: 55,  statDelta: { chainDamageRatioDelta: 0.10 } },
        { name: 'Surge II',  description: 'Chain damage ratio +15%.',  cost: 80,  statDelta: { chainDamageRatioDelta: 0.15 } },
        { name: 'Surge III', description: 'Chain damage ratio +20%.',  cost: 105, statDelta: { chainDamageRatioDelta: 0.20 } },
        { name: 'Surge IV',  description: 'Chain damage ratio +25%.',  cost: 155, statDelta: { chainDamageRatioDelta: 0.25 } },
        { name: 'Surge V',   description: 'Chain damage ratio +30%.',  cost: 195, statDelta: { chainDamageRatioDelta: 0.30 } },
      ],
    },
    C: {
      id: 'C', name: 'Overload',
      tiers: [
        { name: 'Overload I',   description: 'Chains debuff nearby allied towers (15% slower attack, 1s). Locks A at tier 3.', cost: 65,  effects: { overloadMode: true, overloadDebuffPct: 15 } },
        { name: 'Overload II',  description: 'Debuff increased to 20%.',                                                        cost: 90,  effects: { overloadMode: true, overloadDebuffPct: 20 } },
        { name: 'Overload III', description: 'Debuff 25%. +8 dmg. Locks Path A.',                                              cost: 115, statDelta: { damageDelta: 8  }, effects: { overloadMode: true, overloadDebuffPct: 25 } },
        { name: 'Overload IV',  description: 'Debuff 30%. +14 dmg.',                                                           cost: 165, statDelta: { damageDelta: 14 }, effects: { overloadMode: true, overloadDebuffPct: 30 } },
        { name: 'Overload V',   description: 'Debuff 35%. +20 dmg.',                                                           cost: 200, statDelta: { damageDelta: 20 }, effects: { overloadMode: true, overloadDebuffPct: 35 } },
      ],
    },
  },
};

// ── Aura ──────────────────────────────────────────────────────────────────────
// Base: auraIntervalMult 0.8 (towers in range attack 25% faster)
// Deep specialization drawback: non-matching tower types receive only 50% of the bonus.
// Path C deep spec: aura towers receive 0 range bonus.

const AURA_UPGRADES: TowerUpgradeDef = {
  towerKey: 'aura', lockThreshold: 3, respecCostPct: 0.25,
  paths: {
    A: {
      id: 'A', name: 'Attack Speed Aura',
      tiers: [
        { name: 'Haste I',   description: 'Attack speed aura: ×0.75 (25% faster).',             cost: 50,  statDelta: { auraIntervalMultDelta: -0.05 } },
        { name: 'Haste II',  description: '×0.70 (30% faster).',                                 cost: 75,  statDelta: { auraIntervalMultDelta: -0.05 } },
        { name: 'Haste III', description: '×0.65 (35% faster). Locks Path C. Deep spec active.', cost: 100, statDelta: { auraIntervalMultDelta: -0.05 }, effects: { auraSpecialization: 'speed' } },
        { name: 'Haste IV',  description: '×0.60 (40% faster).',                                 cost: 150, statDelta: { auraIntervalMultDelta: -0.05 }, effects: { auraSpecialization: 'speed' } },
        { name: 'Haste V',   description: '×0.55 (45% faster).',                                 cost: 190, statDelta: { auraIntervalMultDelta: -0.05 }, effects: { auraSpecialization: 'speed' } },
      ],
    },
    B: {
      id: 'B', name: 'Damage Aura',
      tiers: [
        { name: 'Power I',   description: '+15% damage to nearby towers.',                          cost: 55,  statDelta: { auraDamageMultDelta: 0.15 } },
        { name: 'Power II',  description: '+22% damage.',                                            cost: 80,  statDelta: { auraDamageMultDelta: 0.07 } },
        { name: 'Power III', description: '+30% damage. Deep spec active.',                          cost: 110, statDelta: { auraDamageMultDelta: 0.08 }, effects: { auraSpecialization: 'damage' } },
        { name: 'Power IV',  description: '+40% damage.',                                            cost: 155, statDelta: { auraDamageMultDelta: 0.10 }, effects: { auraSpecialization: 'damage' } },
        { name: 'Power V',   description: '+50% damage.',                                            cost: 200, statDelta: { auraDamageMultDelta: 0.10 }, effects: { auraSpecialization: 'damage' } },
      ],
    },
    C: {
      id: 'C', name: 'Range Aura',
      tiers: [
        { name: 'Reach I',   description: '+12% range to nearby towers.',                            cost: 55,  statDelta: { auraRangePctDelta: 0.12 } },
        { name: 'Reach II',  description: '+20% range.',                                              cost: 80,  statDelta: { auraRangePctDelta: 0.08 } },
        { name: 'Reach III', description: '+28% range. Locks Path A. Deep spec active.',              cost: 110, statDelta: { auraRangePctDelta: 0.08 }, effects: { auraSpecialization: 'range' } },
        { name: 'Reach IV',  description: '+38% range.',                                              cost: 155, statDelta: { auraRangePctDelta: 0.10 }, effects: { auraSpecialization: 'range' } },
        { name: 'Reach V',   description: '+50% range.',                                              cost: 200, statDelta: { auraRangePctDelta: 0.12 }, effects: { auraSpecialization: 'range' } },
      ],
    },
  },
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const ALL_UPGRADE_DEFS: TowerUpgradeDef[] = [
  CANNON_UPGRADES,
  FROST_UPGRADES,
  MORTAR_UPGRADES,
  POISON_UPGRADES,
  TESLA_UPGRADES,
  AURA_UPGRADES,
];
