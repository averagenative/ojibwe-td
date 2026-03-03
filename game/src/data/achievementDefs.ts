/**
 * Achievement definitions for Ojibwe TD.
 *
 * 77 achievements across 7 categories.
 * Phaser-free — safe for unit tests and SaveManager.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type AchievementCategory =
  | 'map-clear'
  | 'commander'
  | 'region'
  | 'tower-mastery'
  | 'economy'
  | 'combat'
  | 'misc';

export interface AchievementDef {
  id:          string;
  title:       string;
  description: string;
  /** Emoji/text icon displayed in the gallery and toast. */
  icon:        string;
  category:    AchievementCategory;
  /**
   * Target value for progress tracking.
   * 1 = binary (you either have it or you don't).
   * >1 = cumulative counter shown as current/target.
   */
  target:      number;
  /**
   * When true the title and description are replaced with "???" in the gallery
   * until the achievement is unlocked (spoiler protection).
   */
  hidden?:     boolean;
}

// ── Definitions ────────────────────────────────────────────────────────────

export const ALL_ACHIEVEMENTS: AchievementDef[] = [

  // ── Map Clearing (9) ──────────────────────────────────────────────────────

  {
    id:          'clear-zaagaiganing',
    title:       "Lake Country Defender",
    description: "Clear Zaaga'iganing — Winding Pass.",
    icon:        '🌊',
    category:    'map-clear',
    target:      1,
  },
  {
    id:          'clear-mashkiig',
    title:       "Marshland Guardian",
    description: "Clear Mashkiig — Wetland Crossing.",
    icon:        '🌿',
    category:    'map-clear',
    target:      1,
  },
  {
    id:          'clear-niizh-miikana',
    title:       "Two-Path Victor",
    description: "Clear Mashkiig — Niizh-miikana (Two Paths).",
    icon:        '🔀',
    category:    'map-clear',
    target:      1,
  },
  {
    id:          'clear-mitigomizh',
    title:       "Savanna Keeper",
    description: "Clear Mitigomizh — Oak Savanna Run.",
    icon:        '🌳',
    category:    'map-clear',
    target:      1,
  },
  {
    id:          'clear-biboon-aki',
    title:       "Winter Conqueror",
    description: "Clear Biboon-aki — Frozen Crossing.",
    icon:        '❄️',
    category:    'map-clear',
    target:      1,
  },
  {
    id:          'clear-all-stages',
    title:       "Completionist",
    description: "Clear every stage in the game.",
    icon:        '🏆',
    category:    'map-clear',
    target:      1,
  },
  {
    id:          'endless-wave-30',
    title:       "Enduring Spirit",
    description: "Survive to wave 30 in endless mode.",
    icon:        '♾️',
    category:    'map-clear',
    target:      30,
  },
  {
    id:          'endless-wave-50',
    title:       "Unbreakable",
    description: "Survive to wave 50 in endless mode.",
    icon:        '💎',
    category:    'map-clear',
    target:      50,
    hidden:      true,
  },
  {
    id:          'endless-wave-100',
    title:       "Legend of the Land",
    description: "Survive to wave 100 in endless mode.",
    icon:        '⭐',
    category:    'map-clear',
    target:      100,
    hidden:      true,
  },

  // ── Commander (8) ─────────────────────────────────────────────────────────

  {
    id:          'unlock-any-commander',
    title:       "New Ally",
    description: "Unlock your first additional commander.",
    icon:        '🤝',
    category:    'commander',
    target:      1,
  },
  {
    id:          'unlock-all-commanders',
    title:       "Council of Leaders",
    description: "Unlock all commanders.",
    icon:        '👑',
    category:    'commander',
    target:      1,
    hidden:      true,
  },
  {
    id:          'win-nokomis',
    title:       "Grandmother's Blessing",
    description: "Win a game with Nokomis.",
    icon:        '🌙',
    category:    'commander',
    target:      1,
  },
  {
    id:          'win-bizhiw',
    title:       "Lynx Strike",
    description: "Win a game with Bizhiw.",
    icon:        '🐆',
    category:    'commander',
    target:      1,
  },
  {
    id:          'win-animikiikaa',
    title:       "Thunder's Roar",
    description: "Win a game with Animikiikaa.",
    icon:        '⚡',
    category:    'commander',
    target:      1,
  },
  {
    id:          'win-makoons',
    title:       "Bear's Strength",
    description: "Win a game with Makoons.",
    icon:        '🐻',
    category:    'commander',
    target:      1,
  },
  {
    id:          'win-oshkaabewis',
    title:       "Messenger's Gold",
    description: "Win a game with Oshkaabewis.",
    icon:        '💰',
    category:    'commander',
    target:      1,
  },
  {
    id:          'win-waabizii',
    title:       "Swan's Grace",
    description: "Win a game with Waabizii.",
    icon:        '🦢',
    category:    'commander',
    target:      1,
  },
  {
    id:          'win-all-commanders',
    title:       "Voice of the People",
    description: "Win a game with every commander.",
    icon:        '🌟',
    category:    'commander',
    target:      1,
    hidden:      true,
  },

  // ── Region Unlocks (4) ────────────────────────────────────────────────────

  {
    id:          'unlock-mashkiig',
    title:       "Into the Wetlands",
    description: "Unlock the Mashkiig region.",
    icon:        '🗺️',
    category:    'region',
    target:      1,
  },
  {
    id:          'unlock-mitigomizh',
    title:       "Oak Savanna Explorer",
    description: "Unlock the Mitigomizh region.",
    icon:        '🌲',
    category:    'region',
    target:      1,
  },
  {
    id:          'unlock-biboon-aki',
    title:       "Frozen Frontier",
    description: "Unlock the Biboon-aki region.",
    icon:        '🌨️',
    category:    'region',
    target:      1,
  },
  {
    id:          'unlock-all-regions',
    title:       "Land of Anishinaabe",
    description: "Unlock all regions.",
    icon:        '🏔️',
    category:    'region',
    target:      1,
    hidden:      true,
  },

  // ── Tower Mastery (14) ───────────────────────────────────────────────────

  {
    id:          'build-25-towers-run',
    title:       "Tower Builder",
    description: "Build 25 towers in a single run.",
    icon:        '🏗️',
    category:    'tower-mastery',
    target:      25,
  },
  {
    id:          'build-50-towers-run',
    title:       "Master Architect",
    description: "Build 50 towers in a single run.",
    icon:        '🏰',
    category:    'tower-mastery',
    target:      50,
  },
  {
    id:          'build-500-towers-total',
    title:       "Tireless Builder",
    description: "Build 500 towers across all runs.",
    icon:        '🔨',
    category:    'tower-mastery',
    target:      500,
  },
  {
    id:          'build-2000-towers-total',
    title:       "Grand Constructor",
    description: "Build 2,000 towers across all runs.",
    icon:        '🏛️',
    category:    'tower-mastery',
    target:      2000,
    hidden:      true,
  },
  {
    id:          'max-upgrade-first',
    title:       "Fully Upgraded",
    description: "Max upgrade a tower for the first time (all 3 upgrade paths at tier 3).",
    icon:        '✨',
    category:    'tower-mastery',
    target:      1,
  },
  {
    id:          'max-upgrade-3-types',
    title:       "Upgrade Specialist",
    description: "Max upgrade 3 different tower types across any runs.",
    icon:        '🎯',
    category:    'tower-mastery',
    target:      3,
  },
  {
    id:          'max-upgrade-every-type',
    title:       "Tower Grandmaster",
    description: "Max upgrade every tower type across any runs.",
    icon:        '🌈',
    category:    'tower-mastery',
    target:      1,
    hidden:      true,
  },
  {
    id:          'full-equipped',
    title:       "Full Arsenal",
    description: "Have every tower on the field with at least one upgrade bought.",
    icon:        '⚔️',
    category:    'tower-mastery',
    target:      1,
  },
  {
    id:          'mono-tower',
    title:       "One Way",
    description: "Win a game using only one type of tower.",
    icon:        '1️⃣',
    category:    'tower-mastery',
    target:      1,
    hidden:      true,
  },
  {
    id:          'all-tower-types-in-run',
    title:       "Diverse Defense",
    description: "Build every type of tower in a single run.",
    icon:        '🎪',
    category:    'tower-mastery',
    target:      1,
  },
  {
    id:          'place-50-towers-total',
    title:       "Steady Builder",
    description: "Place 50 towers across all runs.",
    icon:        '🧱',
    category:    'tower-mastery',
    target:      50,
  },
  {
    id:          'place-200-towers-total',
    title:       "Veteran Builder",
    description: "Place 200 towers across all runs.",
    icon:        '🏗️',
    category:    'tower-mastery',
    target:      200,
  },
  {
    id:          'place-1000-towers-total',
    title:       "Legendary Architect",
    description: "Place 1,000 towers across all runs.",
    icon:        '🏯',
    category:    'tower-mastery',
    target:      1000,
    hidden:      true,
  },
  {
    id:          'all-6-types-simultaneous',
    title:       "Balanced Arsenal",
    description: "Have 6 different tower types on the field at the same time.",
    icon:        '⚖️',
    category:    'tower-mastery',
    target:      1,
  },

  // ── Economy (12) ─────────────────────────────────────────────────────────

  {
    id:          'earn-2000-gold',
    title:       "Prosperous Run",
    description: "Earn 2,000 gold in a single run.",
    icon:        '💵',
    category:    'economy',
    target:      2000,
  },
  {
    id:          'earn-5000-gold',
    title:       "Gold Rush",
    description: "Earn 5,000 gold in a single run.",
    icon:        '💎',
    category:    'economy',
    target:      5000,
  },
  {
    id:          'spend-250-crystals',
    title:       "Crystal Investor",
    description: "Spend 250 crystals in the meta shop.",
    icon:        '💠',
    category:    'economy',
    target:      250,
  },
  {
    id:          'spend-1000-crystals',
    title:       "Crystal Patron",
    description: "Spend 1,000 crystals in the meta shop.",
    icon:        '🔷',
    category:    'economy',
    target:      1000,
  },
  {
    id:          'accumulate-500-crystals',
    title:       "Crystal Hoard",
    description: "Accumulate 500 crystals at one time.",
    icon:        '💾',
    category:    'economy',
    target:      500,
  },
  {
    id:          'unlock-all-meta',
    title:       "Fully Invested",
    description: "Purchase all meta upgrades.",
    icon:        '🎓',
    category:    'economy',
    target:      1,
    hidden:      true,
  },
  {
    id:          'earn-gold-5000-total',
    title:       "Prosperous Journey",
    description: "Earn 5,000 gold across all runs.",
    icon:        '💛',
    category:    'economy',
    target:      5000,
  },
  {
    id:          'earn-gold-25000-total',
    title:       "Gold Magnate",
    description: "Earn 25,000 gold across all runs.",
    icon:        '🤑',
    category:    'economy',
    target:      25000,
    hidden:      true,
  },
  {
    id:          'spend-500-crystals',
    title:       "Crystal Benefactor",
    description: "Spend 500 crystals in the meta shop.",
    icon:        '🔹',
    category:    'economy',
    target:      500,
  },
  {
    id:          'sell-10-towers',
    title:       "First Trade",
    description: "Sell 10 towers across all runs.",
    icon:        '🔄',
    category:    'economy',
    target:      10,
  },
  {
    id:          'sell-50-towers',
    title:       "Tower Trader",
    description: "Sell 50 towers across all runs.",
    icon:        '♻️',
    category:    'economy',
    target:      50,
  },
  {
    id:          'sell-200-towers',
    title:       "Scrap Master",
    description: "Sell 200 towers across all runs.",
    icon:        '🗑️',
    category:    'economy',
    target:      200,
    hidden:      true,
  },

  // ── Combat (14) ──────────────────────────────────────────────────────────

  {
    id:          'kill-100-creeps',
    title:       "First Stand",
    description: "Kill 100 creeps total across all runs.",
    icon:        '🗡️',
    category:    'combat',
    target:      100,
  },
  {
    id:          'kill-500-creeps',
    title:       "Defender",
    description: "Kill 500 creeps total across all runs.",
    icon:        '🗡️',
    category:    'combat',
    target:      500,
  },
  {
    id:          'kill-5000-creeps',
    title:       "Veteran Defender",
    description: "Kill 5,000 creeps total across all runs.",
    icon:        '⚔️',
    category:    'combat',
    target:      5000,
  },
  {
    id:          'kill-25000-creeps',
    title:       "The Bulwark",
    description: "Kill 25,000 creeps total across all runs.",
    icon:        '🛡️',
    category:    'combat',
    target:      25000,
    hidden:      true,
  },
  {
    id:          'kill-2000-creeps',
    title:       "Relentless",
    description: "Kill 2,000 creeps total across all runs.",
    icon:        '⚔️',
    category:    'combat',
    target:      2000,
  },
  {
    id:          'kill-100000-creeps',
    title:       "Guardian of the Land",
    description: "Kill 100,000 creeps total across all runs.",
    icon:        '🌍',
    category:    'combat',
    target:      100000,
    hidden:      true,
  },
  {
    id:          'kill-50-air-creeps',
    title:       "Falcon's Eye",
    description: "Kill 50 air creeps total across all runs.",
    icon:        '🦅',
    category:    'combat',
    target:      50,
  },
  {
    id:          'kill-200-air-creeps',
    title:       "Sky Warden",
    description: "Kill 200 air creeps total across all runs.",
    icon:        '🌤️',
    category:    'combat',
    target:      200,
    hidden:      true,
  },
  {
    id:          'kill-5-bosses',
    title:       "Boss Hunter",
    description: "Kill 5 bosses total across all runs.",
    icon:        '🎯',
    category:    'combat',
    target:      5,
  },
  {
    id:          'kill-20-bosses',
    title:       "Boss Slayer",
    description: "Kill 20 bosses total across all runs.",
    icon:        '🔱',
    category:    'combat',
    target:      20,
  },
  {
    id:          'kill-50-bosses',
    title:       "Bane of Giants",
    description: "Kill 50 bosses total across all runs.",
    icon:        '💀',
    category:    'combat',
    target:      50,
    hidden:      true,
  },
  {
    id:          'flawless-victory',
    title:       "Flawless Victory",
    description: "Win a game without losing a single life.",
    icon:        '🌟',
    category:    'combat',
    target:      1,
    hidden:      true,
  },
  {
    id:          'iron-defense',
    title:       "Iron Defense",
    description: "Win a game with 15 or more lives remaining.",
    icon:        '🏅',
    category:    'combat',
    target:      1,
  },
  {
    id:          'comeback-kid',
    title:       "Comeback Kid",
    description: "Win a game with only 1 life remaining.",
    icon:        '❤️',
    category:    'combat',
    target:      1,
    hidden:      true,
  },

  // ── Misc (15) ────────────────────────────────────────────────────────────

  {
    id:          'first-victory',
    title:       "First Victory",
    description: "Win your first game.",
    icon:        '🎉',
    category:    'misc',
    target:      1,
  },
  {
    id:          'play-10-games',
    title:       "Regular",
    description: "Play 10 games.",
    icon:        '🎮',
    category:    'misc',
    target:      10,
  },
  {
    id:          'play-50-games',
    title:       "Dedicated",
    description: "Play 50 games.",
    icon:        '🔥',
    category:    'misc',
    target:      50,
  },
  {
    id:          'play-200-games',
    title:       "Devoted",
    description: "Play 200 games.",
    icon:        '💯',
    category:    'misc',
    target:      200,
    hidden:      true,
  },
  {
    id:          'use-all-consumables',
    title:       "Prepared",
    description: "Use all 3 consumable types in a single run.",
    icon:        '🎒',
    category:    'misc',
    target:      1,
  },
  {
    id:          'reroll-5-times-run',
    title:       "Indecisive",
    description: "Reroll 5 times in a single run.",
    icon:        '🎲',
    category:    'misc',
    target:      5,
  },
  {
    id:          'reroll-30-times-total',
    title:       "Fortune's Favourite",
    description: "Reroll 30 times across all runs.",
    icon:        '🍀',
    category:    'misc',
    target:      30,
  },
  {
    id:          'codex-scholar',
    title:       "Codex Scholar",
    description: "Read all codex entries.",
    icon:        '📖',
    category:    'misc',
    target:      1,
  },

  // ── Run milestones ────────────────────────────────────────────────────────

  {
    id:          'win-5-runs',
    title:       "Rising Defender",
    description: "Win 5 runs.",
    icon:        '🏅',
    category:    'misc',
    target:      5,
  },
  {
    id:          'win-20-runs',
    title:       "Seasoned Warrior",
    description: "Win 20 runs.",
    icon:        '🎖️',
    category:    'misc',
    target:      20,
  },
  {
    id:          'win-50-runs',
    title:       "Champion of the Land",
    description: "Win 50 runs.",
    icon:        '🏆',
    category:    'misc',
    target:      50,
    hidden:      true,
  },
  {
    id:          'win-100-runs',
    title:       "Legend",
    description: "Win 100 runs.",
    icon:        '🌟',
    category:    'misc',
    target:      100,
    hidden:      true,
  },

  // ── Rush / challenge ─────────────────────────────────────────────────────

  {
    id:          'rush-10-waves',
    title:       "Early Riser",
    description: "Rush 10 waves total across all runs.",
    icon:        '⚡',
    category:    'misc',
    target:      10,
  },
  {
    id:          'rush-50-waves',
    title:       "Impatient Warrior",
    description: "Rush 50 waves total across all runs.",
    icon:        '💨',
    category:    'misc',
    target:      50,
  },
  {
    id:          'rush-200-waves',
    title:       "Whirlwind",
    description: "Rush 200 waves total across all runs.",
    icon:        '🌪️',
    category:    'misc',
    target:      200,
    hidden:      true,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Look up an achievement definition by ID. */
export function getAchievementDef(id: string): AchievementDef | undefined {
  return ALL_ACHIEVEMENTS.find(a => a.id === id);
}

/** Return all achievements in a given category. */
export function getAchievementsByCategory(category: AchievementCategory): AchievementDef[] {
  return ALL_ACHIEVEMENTS.filter(a => a.category === category);
}

/** Human-readable label for each category. */
export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  'map-clear':     'Map Clearing',
  'commander':     'Commanders',
  'region':        'Regions',
  'tower-mastery': 'Tower Mastery',
  'economy':       'Economy',
  'combat':        'Combat',
  'misc':          'Miscellaneous',
};

/** Ordered list of categories for gallery display. */
export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  'map-clear',
  'commander',
  'region',
  'tower-mastery',
  'economy',
  'combat',
  'misc',
];
