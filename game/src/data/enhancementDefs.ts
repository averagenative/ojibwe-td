/**
 * Commander enhancement item definitions.
 *
 * Enhancement items are equippable by commanders to modify their
 * passive bonuses and add new minor abilities. Unlocked via commander
 * leveling (slots at levels 2, 8, 15).
 *
 * NO Phaser import — safe for unit tests.
 */

// ── Commander Level Rewards ──────────────────────────────────────────────────

export interface CommanderLevelReward {
  level:       number;
  type:        'enhancement-slot' | 'passive-upgrade' | 'signature-ability' | 'mastery';
  description: string;
  slotIndex?:  number;   // For enhancement-slot type
}

export const COMMANDER_LEVEL_REWARDS: CommanderLevelReward[] = [
  { level: 2,  type: 'enhancement-slot',   description: 'Enhancement slot 1 unlocked', slotIndex: 0 },
  { level: 5,  type: 'passive-upgrade',    description: '+5% to primary aura bonus' },
  { level: 8,  type: 'enhancement-slot',   description: 'Enhancement slot 2 unlocked', slotIndex: 1 },
  { level: 10, type: 'signature-ability',  description: 'Signature ability unlocked' },
  { level: 15, type: 'enhancement-slot',   description: 'Enhancement slot 3 unlocked', slotIndex: 2 },
  { level: 20, type: 'mastery',            description: 'Mastery title + cosmetic border' },
];

/** XP required to reach a given level. XP curve: level² × 50. */
export function xpForLevel(level: number): number {
  return level * level * 50;
}

/** Calculate level from total XP. */
export function levelFromXp(totalXp: number): number {
  let level = 1;
  let xpNeeded = 0;
  while (true) {
    xpNeeded += xpForLevel(level + 1);
    if (totalXp < xpNeeded) break;
    level += 1;
    if (level >= 20) break; // cap at 20
  }
  return Math.min(level, 20);
}

/** Get the number of unlocked enhancement slots at a given level. */
export function enhancementSlotsAtLevel(level: number): number {
  return COMMANDER_LEVEL_REWARDS
    .filter(r => r.type === 'enhancement-slot' && r.level <= level)
    .length;
}

/** Check if signature ability is unlocked at a given level. */
export function isSignatureUnlocked(level: number): boolean {
  return level >= 10;
}

/** Check if mastery is unlocked at a given level. */
export function isMasteryUnlocked(level: number): boolean {
  return level >= 20;
}

/** Check if passive upgrade is unlocked at a given level. */
export function isPassiveUpgraded(level: number): boolean {
  return level >= 5;
}

/**
 * Calculate XP earned from a run.
 * Base XP + wave bonus + boss bonus + ascension multiplier.
 */
export function calculateRunXp(
  wavesCompleted: number,
  _totalWaves: number,
  bossesKilled: number,
  ascension: number,
  won: boolean,
): number {
  const baseXp = 20;
  const waveBonus = wavesCompleted * 5;
  const bossBonus = bossesKilled * 15;
  const completionBonus = won ? 50 : 0;
  const ascMult = 1 + ascension * 0.1;

  return Math.round((baseXp + waveBonus + bossBonus + completionBonus) * ascMult);
}

// ── Enhancement Item Definitions ─────────────────────────────────────────────

export interface EnhancementDef {
  id:          string;
  name:        string;
  description: string;
  /** Which commander(s) can use this. null = any commander. */
  commanderRestriction: string | null;
  /** Stat effect applied while equipped. */
  effect: EnhancementEffect;
}

export interface EnhancementEffect {
  /** Multiplicative bonus to commander's primary aura stat. */
  auraBonusPct?:    number;
  /** Bonus starting lives. */
  startingLives?:   number;
  /** Bonus starting gold. */
  startingGold?:    number;
  /** All towers +range % for first tower of each type. */
  firstTowerRangePct?: number;
  /** Commander passive strength multiplier on challenge maps. */
  challengeMapMult?:   number;
  /** Global tower damage bonus %. */
  towerDamagePct?:     number;
  /** Global tower attack speed bonus %. */
  towerSpeedPct?:      number;
}

export const ALL_ENHANCEMENTS: EnhancementDef[] = [
  {
    id: 'enh-war-paint', name: 'War Paint of Focus',
    description: "Commander's tower damage bonus +10% for first 5 waves.",
    commanderRestriction: null,
    effect: { towerDamagePct: 0.10 },
  },
  {
    id: 'enh-medicine-pouch', name: 'Medicine Pouch',
    description: 'Start each run with +1 life.',
    commanderRestriction: null,
    effect: { startingLives: 1 },
  },
  {
    id: 'enh-eagle-eye', name: 'Eagle Eye Charm',
    description: 'All towers +5% range for the first tower of each type placed.',
    commanderRestriction: null,
    effect: { firstTowerRangePct: 0.05 },
  },
  {
    id: 'enh-spirit-moccasins', name: "Spirit Walker's Moccasins",
    description: 'Commander passive applies at 150% strength on challenge maps.',
    commanderRestriction: null,
    effect: { challengeMapMult: 1.5 },
  },
  {
    id: 'enh-bears-strength', name: "Bear's Strength",
    description: '+8% tower damage globally.',
    commanderRestriction: 'makoons',
    effect: { towerDamagePct: 0.08 },
  },
  {
    id: 'enh-swans-grace', name: "Swan's Grace",
    description: '+2 starting lives.',
    commanderRestriction: 'waabizii',
    effect: { startingLives: 2 },
  },
  {
    id: 'enh-lynx-reflexes', name: "Lynx's Reflexes",
    description: '+6% tower attack speed globally.',
    commanderRestriction: 'bizhiw',
    effect: { towerSpeedPct: 0.06 },
  },
  {
    id: 'enh-thunder-focus', name: 'Thunder Focus',
    description: '+10% Tesla chain damage.',
    commanderRestriction: 'animikiikaa',
    effect: { towerDamagePct: 0.10 },
  },
  {
    id: 'enh-messengers-pouch', name: "Messenger's Pouch",
    description: '+50 starting gold.',
    commanderRestriction: 'oshkaabewis',
    effect: { startingGold: 50 },
  },
  {
    id: 'enh-turtle-shell', name: 'Turtle Shell',
    description: '+3 starting lives, guardian of the earth.',
    commanderRestriction: 'nokomis',
    effect: { startingLives: 3 },
  },
];

// ── Signature Abilities ──────────────────────────────────────────────────────

export interface SignatureAbilityDef {
  commanderId: string;
  name:        string;
  description: string;
  uiIcon:      string;
}

export const SIGNATURE_ABILITIES: SignatureAbilityDef[] = [
  {
    commanderId: 'nokomis',
    name: 'Mashkiki Waawiyeyaag',
    description: 'All towers heal 1 life per 20 kills for the rest of the run (permanent upgrade to aura).',
    uiIcon: 'ability-medicine-circle',
  },
  {
    commanderId: 'bizhiw',
    name: "Bizhiw's Perfect Shot",
    description: 'Next 10 tower shots deal triple damage and ignore all armor.',
    uiIcon: 'ability-perfect-shot',
  },
  {
    commanderId: 'animikiikaa',
    name: 'Storm of Ages',
    description: 'For 12 seconds, all towers fire lightning chains regardless of type.',
    uiIcon: 'ability-storm-ages',
  },
  {
    commanderId: 'makoons',
    name: 'Makwa Rampage',
    description: 'All towers gain +50% damage and +30% attack speed for 10 seconds.',
    uiIcon: 'ability-rampage',
  },
  {
    commanderId: 'oshkaabewis',
    name: "Trader's Fortune",
    description: 'Immediately gain gold equal to 50% of all gold spent on towers this run.',
    uiIcon: 'ability-fortune',
  },
  {
    commanderId: 'waabizii',
    name: 'Wings of Mercy',
    description: 'Fully restore lives and gain immunity to life loss for the next 2 waves.',
    uiIcon: 'ability-wings-mercy',
  },
];

/** Get the signature ability for a commander. */
export function getSignatureAbility(commanderId: string): SignatureAbilityDef | undefined {
  return SIGNATURE_ABILITIES.find(a => a.commanderId === commanderId);
}

/** Get enhancement by ID. */
export function getEnhancementDef(id: string): EnhancementDef | undefined {
  return ALL_ENHANCEMENTS.find(e => e.id === id);
}

/** Get enhancements available to a specific commander. */
export function getAvailableEnhancements(commanderId: string): EnhancementDef[] {
  return ALL_ENHANCEMENTS.filter(
    e => e.commanderRestriction === null || e.commanderRestriction === commanderId,
  );
}
