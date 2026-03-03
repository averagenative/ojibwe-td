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
    spreadRadiusDelta?:      number;   // flat spread radius bonus (Poison C)
    multiShotCountDelta?:    number;   // extra simultaneous targets (Arrow B)
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
    dotSpreadOnDeath?:   true;    // Poison C: spread DoT stacks to nearby creeps on death
    spreadStackCount?:   number;  // Poison C: stacks applied per spread (default 1)
    spreadHitsAir?:      true;    // Poison C: spread also hits air creeps
    overloadMode?:       true;    // Tesla C: chains also debuff nearby allied towers
    overloadDebuffPct?:  number;  // Tesla C: % attack-speed penalty applied to debuffed towers
    auraSpecialization?: 'speed' | 'damage' | 'range'; // Aura deep-path type
    arrowSlowFactor?:     number; // Arrow C: slow factor on hit (e.g. 0.85 = 15% slow)
    arrowSlowDurationMs?: number; // Arrow C: slow duration in ms
  };
}

export interface UpgradePathDef {
  id:    'A' | 'B' | 'C';
  name:  string;
  /**
   * One-line summary shown in the upgrade panel column header.
   * Helps players understand the path before committing gold.
   */
  description?: string;
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
        { name: 'Plague I',   description: 'Poisoned creep deaths spread 1 DoT to nearby ground creeps (80px). +3 dmg.',  cost: 55,  statDelta: { damageDelta: 3 }, effects: { dotSpreadOnDeath: true } },
        { name: 'Plague II',  description: 'Spread range +10px (now 90px).',                                              cost: 75,  statDelta: { spreadRadiusDelta: 10 }, effects: { dotSpreadOnDeath: true } },
        { name: 'Plague III', description: 'Spread 2 DoT stacks instead of 1. Locks Path A.',                            cost: 100, effects: { dotSpreadOnDeath: true, spreadStackCount: 2 } },
        { name: 'Plague IV',  description: 'Spread 3 DoT stacks.',                                                        cost: 145, effects: { dotSpreadOnDeath: true, spreadStackCount: 3 } },
        { name: 'Plague V',   description: 'Spread also affects air creeps. +5 dmg.',                                     cost: 180, statDelta: { damageDelta: 5 }, effects: { dotSpreadOnDeath: true, spreadHitsAir: true } },
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

// ── Arrow ─────────────────────────────────────────────────────────────────────
// Base: 10 dmg, 160 range, 700ms, damageCap 45, targetDomain 'both'

const ARROW_UPGRADES: TowerUpgradeDef = {
  towerKey: 'arrow', lockThreshold: 3, respecCostPct: 0.25,
  paths: {
    A: {
      id: 'A', name: 'Rapid Fire',
      tiers: [
        { name: 'Swift I',   description: '8% faster attack.',                        cost: 25,  statDelta: { attackSpeedPct: 8  } },
        { name: 'Swift II',  description: '8% faster attack.',                        cost: 40,  statDelta: { attackSpeedPct: 8  } },
        { name: 'Swift III', description: '10% faster attack. Locks Path C.',         cost: 55,  statDelta: { attackSpeedPct: 10 } },
        { name: 'Swift IV',  description: '10% faster attack.',                       cost: 80,  statDelta: { attackSpeedPct: 10 } },
        { name: 'Swift V',   description: '12% faster attack. +5 damage.',            cost: 110, statDelta: { attackSpeedPct: 12, damageDelta: 5 } },
      ],
    },
    B: {
      id: 'B', name: 'Multi-Shot',
      tiers: [
        { name: 'Volley I',   description: 'Fires at 1 extra target per attack.',                 cost: 30,  statDelta: { multiShotCountDelta: 1 } },
        { name: 'Volley II',  description: 'Fires at 2 extra targets per attack.',                cost: 50,  statDelta: { multiShotCountDelta: 1 } },
        { name: 'Volley III', description: 'Fires at 3 extra targets. +5 damage.',               cost: 70,  statDelta: { multiShotCountDelta: 1, damageDelta: 5 } },
        { name: 'Volley IV',  description: 'Fires at 4 extra targets.',                          cost: 100, statDelta: { multiShotCountDelta: 1 } },
        { name: 'Volley V',   description: 'Fires at 5 extra targets. +8 damage.',               cost: 140, statDelta: { multiShotCountDelta: 1, damageDelta: 8 } },
      ],
    },
    C: {
      id: 'C', name: "Hunter's Edge",
      description: 'Extends range (tiers 1, 4, 5) and slows targets on hit (tiers 2–5).',
      tiers: [
        { name: 'Track I',   description: '+20 range.',                                           cost: 30,  statDelta: { rangeDelta: 20 } },
        { name: 'Track II',  description: 'Arrows slow targets 15% for 1.5s.',                   cost: 50,  effects: { arrowSlowFactor: 0.85, arrowSlowDurationMs: 1500 } },
        { name: 'Track III', description: 'Slow 20% for 2s. Locks Path A.',                      cost: 70,  effects: { arrowSlowFactor: 0.80, arrowSlowDurationMs: 2000 } },
        { name: 'Track IV',  description: 'Slow 25% for 2.5s. +10 range.',                       cost: 100, statDelta: { rangeDelta: 10 }, effects: { arrowSlowFactor: 0.75, arrowSlowDurationMs: 2500 } },
        { name: 'Track V',   description: 'Slow 30% for 3s. +15 range.',                         cost: 140, statDelta: { rangeDelta: 15 }, effects: { arrowSlowFactor: 0.70, arrowSlowDurationMs: 3000 } },
      ],
    },
  },
};

// ── Rock Hurler ───────────────────────────────────────────────────────────────
// Base: 55 dmg, 185 range, 2000ms, splash 45, groundOnly
// Path A: Armor Shred — debuff armored targets, synergises with armor bonus
// Path B: Impact Payload — raw damage + execute threshold
// Path C: Cluster Submunitions — extra fragment projectiles on impact

const ROCK_HURLER_UPGRADES: TowerUpgradeDef = {
  towerKey: 'rock-hurler', lockThreshold: 3, respecCostPct: 0.25,
  paths: {
    A: {
      id: 'A', name: 'Armor Shred',
      tiers: [
        { name: 'Expose I',   description: 'Hits apply 10% damage vulnerability for 3s.',  cost: 45,  effects: { armorShredPct: 0.10, armorShredDuration: 3000 } },
        { name: 'Expose II',  description: 'Vulnerability increased to 18%.',              cost: 65,  effects: { armorShredPct: 0.18, armorShredDuration: 3000 } },
        { name: 'Expose III', description: 'Vulnerability 26%, lasts 4s. Locks Path C.',  cost: 90,  effects: { armorShredPct: 0.26, armorShredDuration: 4000 } },
        { name: 'Expose IV',  description: 'Vulnerability 34%, lasts 4s.',                cost: 130, effects: { armorShredPct: 0.34, armorShredDuration: 4000 } },
        { name: 'Expose V',   description: 'Vulnerability 40%, lasts 5s.',                cost: 165, effects: { armorShredPct: 0.40, armorShredDuration: 5000 } },
      ],
    },
    B: {
      id: 'B', name: 'Impact Payload',
      tiers: [
        { name: 'Payload I',   description: '+18 damage.',                              cost: 50,  statDelta: { damageDelta: 18 } },
        { name: 'Payload II',  description: '+30 damage.',                              cost: 70,  statDelta: { damageDelta: 30 } },
        { name: 'Payload III', description: '+42 damage. Instantly kills below 10% HP.',cost: 95,  statDelta: { damageDelta: 42 }, effects: { executeThreshold: 0.10 } },
        { name: 'Payload IV',  description: '+55 damage. Execute below 16% HP.',        cost: 140, statDelta: { damageDelta: 55 }, effects: { executeThreshold: 0.16 } },
        { name: 'Payload V',   description: '+70 damage. Execute below 22% HP.',        cost: 175, statDelta: { damageDelta: 70 }, effects: { executeThreshold: 0.22 } },
      ],
    },
    C: {
      id: 'C', name: 'Cluster',
      tiers: [
        { name: 'Cluster I',   description: 'Impact fires 2 cluster submunitions.',    cost: 55,  effects: { clusterCount: 2 } },
        { name: 'Cluster II',  description: '3 clusters, each deals +5 dmg.',          cost: 80,  statDelta: { damageDelta: 5 }, effects: { clusterCount: 3 } },
        { name: 'Cluster III', description: '4 clusters. Locks Path A.',               cost: 100, effects: { clusterCount: 4 } },
        { name: 'Cluster IV',  description: '5 clusters, wider scatter.',              cost: 145, effects: { clusterCount: 5 } },
        { name: 'Cluster V',   description: '6 clusters, each with AoE splash.',       cost: 180, effects: { clusterCount: 6 } },
      ],
    },
  },
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const ALL_UPGRADE_DEFS: TowerUpgradeDef[] = [
  ARROW_UPGRADES,
  ROCK_HURLER_UPGRADES,
  FROST_UPGRADES,
  POISON_UPGRADES,
  TESLA_UPGRADES,
  AURA_UPGRADES,
];
