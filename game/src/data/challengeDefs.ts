/**
 * Challenge map definitions — special maps with unique modifiers and
 * guaranteed loot drops.
 *
 * NO Phaser import — safe for unit tests.
 */

// ── Challenge Modifier ───────────────────────────────────────────────────────

export interface ChallengeModifier {
  id:          string;
  description: string;
  /** Tower keys that are BANNED from this challenge. Empty = all allowed. */
  bannedTowers: string[];
  /** Creep speed multiplier (>1 = faster). */
  creepSpeedMult: number;
  /** Creep HP multiplier (>1 = more HP). */
  creepHpMult: number;
  /** If true, all creeps in this challenge are armored. */
  allArmored: boolean;
  /** If true, all creeps in this challenge are air type. */
  allAir: boolean;
  /** If true, every killed creep spawns 2 mini creeps. */
  splitOnDeath: boolean;
  /** Number of waves in this challenge. */
  waveCount: number;
  /** Gold multiplier for this challenge. */
  goldMult: number;
}

// ── Challenge Map Definition ─────────────────────────────────────────────────

export interface ChallengeDef {
  id:              string;
  name:            string;
  description:     string;
  /** Map JSON file to load (e.g. 'challenge-01'). */
  pathFile:        string;
  /** Minimum crystals spent (total unlocks) to access this challenge. */
  unlockThreshold: number;
  modifier:        ChallengeModifier;
  /** Guaranteed minimum drop rarity. */
  guaranteedRarity: 'rare' | 'epic' | 'legendary';
  /** Lore / flavor text. */
  lore:            string;
}

// ── Challenge Definitions ────────────────────────────────────────────────────

export const ALL_CHALLENGES: ChallengeDef[] = [
  {
    id: 'challenge-makwas-den',
    name: "Makwa's Den",
    description: 'All creeps armoured, 15 waves, no Cannon allowed.',
    pathFile: 'challenge-01',
    unlockThreshold: 200,
    modifier: {
      id: 'makwas-den',
      description: 'All creeps are armoured. Rock Hurler towers are banned.',
      bannedTowers: ['rock-hurler'],
      creepSpeedMult: 1.0,
      creepHpMult: 1.2,
      allArmored: true,
      allAir: false,
      splitOnDeath: false,
      waveCount: 15,
      goldMult: 1.2,
    },
    guaranteedRarity: 'rare',
    lore: 'Deep in the forest, the bear\'s den hides treasures guarded by armoured beasts. Only those who abandon brute force will prevail.',
  },
  {
    id: 'challenge-eagles-nest',
    name: "Eagle's Nest",
    description: 'Air-only waves, vertical map, tight build space.',
    pathFile: 'challenge-02',
    unlockThreshold: 400,
    modifier: {
      id: 'eagles-nest',
      description: 'All creeps are airborne. Build space is limited.',
      bannedTowers: [],
      creepSpeedMult: 1.1,
      creepHpMult: 1.0,
      allArmored: false,
      allAir: true,
      splitOnDeath: false,
      waveCount: 15,
      goldMult: 1.3,
    },
    guaranteedRarity: 'rare',
    lore: 'High above the clouds, the eagle\'s nest is besieged by flying invaders. Only anti-air specialists thrive here.',
  },
  {
    id: 'challenge-waabooz-warren',
    name: 'Waabooz Warren',
    description: 'Every killed creep spawns 2 mini creeps. Endless splitting.',
    pathFile: 'challenge-03',
    unlockThreshold: 600,
    modifier: {
      id: 'waabooz-warren',
      description: 'Every killed creep spawns 2 smaller creeps. AoE is essential.',
      bannedTowers: [],
      creepSpeedMult: 1.2,
      creepHpMult: 0.7,
      allArmored: false,
      allAir: false,
      splitOnDeath: true,
      waveCount: 12,
      goldMult: 1.5,
    },
    guaranteedRarity: 'rare',
    lore: 'The rabbit\'s warren multiplies endlessly. For every enemy you fell, two more take its place.',
  },
  {
    id: 'challenge-thunderbird-spire',
    name: 'Thunderbird Spire',
    description: '10 waves, ascending difficulty, triple boss finale.',
    pathFile: 'challenge-04',
    unlockThreshold: 1000,
    modifier: {
      id: 'thunderbird-spire',
      description: 'Intense 10-wave gauntlet. Wave difficulty escalates rapidly. Final wave: 3 bosses.',
      bannedTowers: [],
      creepSpeedMult: 1.15,
      creepHpMult: 1.5,
      allArmored: false,
      allAir: false,
      splitOnDeath: false,
      waveCount: 10,
      goldMult: 2.0,
    },
    guaranteedRarity: 'epic',
    lore: 'Ascend the Thunderbird\'s spire where lightning cracks and the mightiest foes await. Only the worthy earn its treasures.',
  },
  {
    id: 'challenge-michi-gami-shore',
    name: 'Michi-gami Shore',
    description: 'Dual entrance, limited build area, currency bonus.',
    pathFile: 'challenge-05',
    unlockThreshold: 1500,
    modifier: {
      id: 'michi-gami-shore',
      description: 'Two paths converge. Build space is scarce but rewards are plentiful.',
      bannedTowers: [],
      creepSpeedMult: 1.0,
      creepHpMult: 1.3,
      allArmored: false,
      allAir: false,
      splitOnDeath: false,
      waveCount: 15,
      goldMult: 1.8,
    },
    guaranteedRarity: 'epic',
    lore: 'On the shores of the Great Lake, two tides of enemies crash together. Strategic placement is everything.',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Get challenge def by ID. */
export function getChallengeDef(id: string): ChallengeDef | undefined {
  return ALL_CHALLENGES.find(c => c.id === id);
}

/** Get challenges the player has unlocked (based on total crystals spent). */
export function getUnlockedChallenges(totalCrystalsSpent: number): ChallengeDef[] {
  return ALL_CHALLENGES.filter(c => totalCrystalsSpent >= c.unlockThreshold);
}

/**
 * Weekly rotation logic — deterministic "featured" challenge map.
 * Uses the ISO week number as a seed to pick from available challenges.
 */
export function getFeaturedChallengeId(): string {
  const weekNum = getIsoWeekNumber(new Date());
  const idx = weekNum % ALL_CHALLENGES.length;
  return ALL_CHALLENGES[idx].id;
}

/** Get the ISO week number for a date. */
function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/** Check if a tower key is allowed in a challenge. */
export function isTowerAllowed(challengeId: string, towerKey: string): boolean {
  const challenge = getChallengeDef(challengeId);
  if (!challenge) return true;
  return !challenge.modifier.bannedTowers.includes(towerKey);
}
