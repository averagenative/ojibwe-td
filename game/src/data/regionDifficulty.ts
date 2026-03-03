/**
 * Per-region difficulty scaling for Ojibwe TD.
 *
 * Each region applies multiplicative stat boosts, earlier appearances of
 * dangerous creep types, and per-creep trait injections (armor, slow/poison
 * immunity) to force tower diversity in later regions.
 *
 * Phaser-free — safe for unit tests and Node.js scripts.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** Boss stat/ability overrides applied on top of the base BossDef. */
export interface BossRegionOverride {
  hpMult?:              number;
  speedMult?:           number;
  physicalResistPct?:   number;
  isSlowImmune?:        boolean;
  isPoisonImmune?:      boolean;
  regenPercentPerSec?:  number;
  splitCount?:          number;
}

/** Per-region difficulty configuration. */
export interface RegionDifficulty {
  /** Region this config applies to. */
  regionId: string;

  /** Multiplier applied to every creep's HP (stacks with wave hpMult). */
  creepHpMult: number;

  /** Multiplier applied to every creep's speed (stacks with wave speedMult). */
  creepSpeedMult: number;

  /**
   * Per-wave pool replacements (1-indexed wave number → pool).
   * Only waves listed here are changed; the rest keep their waves.json defaults.
   */
  poolReplacements: Readonly<Record<number, readonly string[]>>;

  /**
   * Fraction (0–1) of non-brute ground creeps that are promoted to armored.
   * Armored creeps receive `armorResistPct` physical damage resistance.
   */
  armoredFraction: number;

  /** Physical resist % for region-armored creeps (0–1). */
  armorResistPct: number;

  /** Fraction (0–1) of non-boss creeps that gain slow immunity. */
  slowImmuneFraction: number;

  /** Fraction (0–1) of non-boss creeps that gain poison immunity. */
  poisonImmuneFraction: number;

  /** Boss stat/ability overrides keyed by boss key (e.g. 'makwa'). */
  bossOverrides: Readonly<Record<string, BossRegionOverride>>;
}

// ── Region Difficulty Definitions ─────────────────────────────────────────────

/**
 * Region 1 — Zaaga'iganing (Lake Country)
 *
 * Beginner-friendly baseline. No creep modifications.
 * Beatable with arrow-only strategies.
 */
const ZAAGAIGANING: RegionDifficulty = {
  regionId:            'zaagaiganing',
  creepHpMult:         1.0,
  creepSpeedMult:      1.0,
  poolReplacements:    {},
  armoredFraction:     0,
  armorResistPct:      0,
  slowImmuneFraction:  0,
  poisonImmuneFraction: 0,
  bossOverrides:       {},
};

/**
 * Region 2 — Mashkiig (Wetlands)
 *
 * Introduces armored creeps earlier. Arrow-only strategies begin to fail
 * as brutes appear from wave 3 (instead of wave 6 in base definitions).
 * 15% of non-brute ground creeps gain light armor (15% physical resist).
 *
 * Bosses receive modest HP buffs; Makwa's armor increases to 40%.
 */
const MASHKIIG: RegionDifficulty = {
  regionId:            'mashkiig',
  creepHpMult:         1.15,
  creepSpeedMult:      1.05,
  poolReplacements: {
    3: ['grunt', 'swarm', 'brute'],
    4: ['grunt', 'runner', 'brute'],
    5: ['grunt', 'runner', 'swarm', 'brute'],
  },
  armoredFraction:     0.15,
  armorResistPct:      0.15,
  slowImmuneFraction:  0,
  poisonImmuneFraction: 0,
  bossOverrides: {
    makwa:      { hpMult: 1.2, physicalResistPct: 0.40 },
    migizi:     { hpMult: 1.15, physicalResistPct: 0.10 },
    waabooz:    { hpMult: 1.15 },
    animikiins: { hpMult: 1.2 },
  },
};

/**
 * Region 3 — Mitigomizh (Oak Savanna)
 *
 * Mixed air+ground from wave 4 (instead of wave 8). Status-immune creeps
 * punish single-tower strategies.
 *
 * 20% of ground creeps gain armor (20% physical resist).
 * 20% of all creeps gain slow immunity; 15% gain poison immunity.
 *
 * Bosses gain secondary abilities:
 * - Makwa gains 0.5% regen + stronger armor
 * - Migizi gains 20% physical resist
 * - Waabooz splits into 4 instead of 3
 * - Animikiins becomes slow-immune
 */
const MITIGOMIZH: RegionDifficulty = {
  regionId:            'mitigomizh',
  creepHpMult:         1.30,
  creepSpeedMult:      1.10,
  poolReplacements: {
    3: ['grunt', 'swarm', 'brute'],
    4: ['grunt', 'runner', 'brute', 'scout'],
    5: ['grunt', 'runner', 'swarm', 'brute', 'scout'],
    6: ['grunt', 'runner', 'brute', 'scout'],
    7: ['grunt', 'runner', 'swarm', 'brute', 'scout', 'flier'],
    8: ['grunt', 'brute', 'scout', 'flier'],
    9: ['grunt', 'runner', 'scout', 'flier'],
  },
  armoredFraction:     0.20,
  armorResistPct:      0.20,
  slowImmuneFraction:  0.20,
  poisonImmuneFraction: 0.15,
  bossOverrides: {
    makwa:      { hpMult: 1.4, physicalResistPct: 0.45, regenPercentPerSec: 0.5 },
    migizi:     { hpMult: 1.3, physicalResistPct: 0.20 },
    waabooz:    { hpMult: 1.3, splitCount: 4 },
    animikiins: { hpMult: 1.4, isSlowImmune: true },
  },
};

/**
 * Region 4 — Biboon-aki (Winter Lands)
 *
 * Maximum difficulty. Full creep diversity from wave 1. Requires the full
 * tower toolkit, upgrades, and meta-progression to clear.
 *
 * 25% armored (25% physical resist), 25% slow-immune, 20% poison-immune.
 *
 * Bosses gain powerful combined abilities:
 * - Makwa: 50% resist + slow-immune + regen
 * - Migizi: 25% resist + poison-immune
 * - Waabooz: splits into 5 + slow-immune
 * - Animikiins: 2% regen + slow-immune + 15% resist
 */
const BIBOON_AKI: RegionDifficulty = {
  regionId:            'biboon-aki',
  creepHpMult:         1.50,
  creepSpeedMult:      1.15,
  poolReplacements: {
    1: ['grunt', 'runner', 'brute'],
    2: ['grunt', 'swarm', 'runner', 'brute'],
    3: ['grunt', 'swarm', 'brute', 'scout'],
    4: ['grunt', 'runner', 'brute', 'scout'],
    5: ['grunt', 'runner', 'swarm', 'brute', 'scout'],
    6: ['grunt', 'runner', 'brute', 'scout', 'flier'],
    7: ['grunt', 'runner', 'swarm', 'brute', 'scout', 'flier'],
    8: ['grunt', 'brute', 'scout', 'flier'],
    9: ['grunt', 'runner', 'brute', 'scout', 'flier'],
  },
  armoredFraction:     0.25,
  armorResistPct:      0.25,
  slowImmuneFraction:  0.25,
  poisonImmuneFraction: 0.20,
  bossOverrides: {
    makwa:      { hpMult: 1.6, physicalResistPct: 0.50, isSlowImmune: true, regenPercentPerSec: 0.5 },
    migizi:     { hpMult: 1.5, physicalResistPct: 0.25, isPoisonImmune: true },
    waabooz:    { hpMult: 1.5, splitCount: 5, isSlowImmune: true },
    animikiins: { hpMult: 1.6, isSlowImmune: true, physicalResistPct: 0.15, regenPercentPerSec: 2 },
  },
};

// ── Registry ──────────────────────────────────────────────────────────────────

const REGION_DIFFICULTY: Readonly<Record<string, RegionDifficulty>> = {
  zaagaiganing: ZAAGAIGANING,
  mashkiig:     MASHKIIG,
  mitigomizh:   MITIGOMIZH,
  'biboon-aki': BIBOON_AKI,
};

/**
 * Look up the regional difficulty config for a given region ID.
 * Returns the baseline (Region 1) config if the region is unknown.
 */
export function getRegionDifficulty(regionId: string): RegionDifficulty {
  return REGION_DIFFICULTY[regionId] ?? ZAAGAIGANING;
}

// ── Wave transform ────────────────────────────────────────────────────────────

/**
 * Apply region difficulty to a base wave definitions array.
 * Returns a new array with HP/speed multipliers and pool overrides applied.
 * Does NOT modify the input array.
 */
export function applyRegionToWaveDefs<
  T extends { hpMult: number; speedMult: number; pool: string[] },
>(baseWaveDefs: readonly T[], region: RegionDifficulty): T[] {
  return baseWaveDefs.map((w, idx) => {
    const waveNum = idx + 1;
    const poolOverride = region.poolReplacements[waveNum];
    return {
      ...w,
      hpMult:    w.hpMult    * region.creepHpMult,
      speedMult: w.speedMult * region.creepSpeedMult,
      ...(poolOverride ? { pool: [...poolOverride] } : {}),
    };
  });
}
