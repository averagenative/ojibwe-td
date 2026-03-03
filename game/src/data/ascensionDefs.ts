/**
 * Ascension system definitions.
 *
 * Each Ascension level (1–10) adds a curated global modifier that changes
 * how the game plays.  Modifiers are cumulative — Ascension 3 applies levels
 * 1, 2, and 3 simultaneously.
 *
 * Phaser-free — safe to import from any context.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** Category of a gameplay modifier applied at a given ascension level. */
export type AscensionModifierType =
  | 'hp_mult'                // Creeps have +N% max HP
  | 'speed_mult'             // Creeps move N% faster
  | 'armored_early'          // Armoured creeps appear earlier (value = waves earlier)
  | 'regen_per_sec'          // Creeps regenerate value% max HP per second
  | 'immune_slow_and_poison' // Slow-immune or poison-immune creeps get both immunities
  | 'tower_disable'          // A random tower is disabled for value seconds each wave
  | 'air_bypass_tiles'       // Flying creeps bypass last value path tiles
  | 'poison_cloud'           // Poison-killed creeps emit a cloud that debuffs towers
  | 'lightning_strikes'      // Every 5th wave, value lightning strikes disable random towers
  | 'gold_income_penalty';   // Gold income multiplied by value (< 1 = penalty)

/** A single gameplay modifier applied at an ascension level. */
export interface AscensionModifier {
  type:   AscensionModifierType;
  /** Numeric parameter for the modifier (multiplier, count, duration, etc.). */
  value?: number;
}

/** Definition for one ascension tier (1–10). */
export interface AscensionDef {
  level:       number;
  /** Ojibwe name — shown in the pre-run screen and HUD tooltip. */
  name:        string;
  /** One-sentence description shown on the pre-run screen. */
  description: string;
  /** Modifiers introduced at this tier (not cumulative — cumulation handled at runtime). */
  modifiers:   AscensionModifier[];
}

// ── Data ──────────────────────────────────────────────────────────────────────

/**
 * Ascension level definitions, indexed 0 = level 1 through 9 = level 10.
 * Each entry describes ONLY the modifiers added by that specific level;
 * the runtime system applies all modifiers from level 1 up to the chosen level.
 */
export const ASCENSION_DEFS: AscensionDef[] = [
  {
    level:       1,
    name:        'Nimaajiidaa',
    description: 'All enemies carry greater endurance — creeps have 20% more health.',
    modifiers:   [{ type: 'hp_mult', value: 1.2 }],
  },
  {
    level:       2,
    name:        'Waabishkizi',
    description: 'The land itself urges the enemy onward — creeps move 10% faster.',
    modifiers:   [{ type: 'speed_mult', value: 1.1 }],
  },
  {
    level:       3,
    name:        'Mashkawizid',
    description: 'Armoured creeps enter the fray three waves earlier than expected.',
    modifiers:   [{ type: 'armored_early', value: 3 }],
  },
  {
    level:       4,
    name:        'Moozhitaad',
    description: 'Regenerating creeps recover 1% of their maximum health per second.',
    modifiers:   [{ type: 'regen_per_sec', value: 0.01 }],
  },
  {
    level:       5,
    name:        'Ozhaawashkwaa',
    description: 'Immune creeps resist both slowing and poison simultaneously.',
    modifiers:   [{ type: 'immune_slow_and_poison' }],
  },
  {
    level:       6,
    name:        'Bizhiw-mitig',
    description: 'At the start of each wave, a random tower is silenced for 20 seconds.',
    modifiers:   [{ type: 'tower_disable', value: 20 }],
  },
  {
    level:       7,
    name:        'Ajijaak',
    description: 'Flying creeps bypass the last three tiles of the path and appear near the exit.',
    modifiers:   [{ type: 'air_bypass_tiles', value: 3 }],
  },
  {
    level:       8,
    name:        'Miigaazid',
    description: 'Creeps slain by poison release a toxic cloud that reduces nearby tower attack speed by 15%.',
    modifiers:   [{ type: 'poison_cloud', value: 0.15 }],
  },
  {
    level:       9,
    name:        'Animikiikaa',
    description: 'Every fifth wave, three lightning strikes disable random towers for 5 seconds each.',
    modifiers:   [{ type: 'lightning_strikes', value: 3 }],
  },
  {
    level:       10,
    name:        'Michi-gami',
    description: 'All modifiers combined — and gold income is reduced by 10%.',
    modifiers:   [{ type: 'gold_income_penalty', value: 0.9 }],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return the combined set of modifiers active at a given ascension level.
 * Level 0 returns an empty array (standard run).
 * Level N returns modifiers from levels 1 through N.
 */
export function getActiveModifiers(level: number): AscensionModifier[] {
  if (level <= 0) return [];
  const mods: AscensionModifier[] = [];
  for (let i = 0; i < Math.min(level, ASCENSION_DEFS.length); i++) {
    mods.push(...ASCENSION_DEFS[i].modifiers);
  }
  return mods;
}

/**
 * Return the first modifier of a given type active at the specified level,
 * or undefined if that modifier is not yet active.
 */
export function getModifier(level: number, type: AscensionModifierType): AscensionModifier | undefined {
  return getActiveModifiers(level).find(m => m.type === type);
}
