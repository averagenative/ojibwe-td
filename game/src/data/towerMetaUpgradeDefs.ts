/**
 * towerMetaUpgradeDefs.ts
 *
 * Permanent meta-progression upgrade tracks for each tower type.
 * Players spend crystals (earned across runs) to boost tower base stats
 * permanently — applied at the start of each run before in-run upgrades.
 *
 * Phaser-free — safe to import in unit tests and data-only contexts.
 */

import type { TowerUpgradeStats } from './towerDefs';

// ── Constants ──────────────────────────────────────────────────────────────────

/** Maximum number of tiers purchasable per stat track. */
export const MAX_META_TIER = 5;

/**
 * Crystal cost to purchase each tier.
 * Index 0 = cost for tier 1, index 4 = cost for tier 5.
 * Total cost per stat at max tier = 5 + 10 + 20 + 40 + 80 = 155 crystals.
 * Total to max everything (6 towers × 4 stats) = 155 × 24 = 3 720 crystals.
 */
export const META_TIER_COSTS: readonly number[] = [5, 10, 20, 40, 80];

/**
 * Cumulative % bonus provided by each tier.
 * Tier 1 = 5%, tier 2 = 10%, …, tier 5 = 25%.
 * Stored as fractions (0.05, 0.10, …).
 */
export const META_TIER_BONUS_PCT: readonly number[] = [0.05, 0.10, 0.15, 0.20, 0.25];

// ── Interfaces ─────────────────────────────────────────────────────────────────

/**
 * Describes a single upgradeable stat track for one tower type.
 *
 * - `displayKind = 'pct'`  → bonus is shown as a percentage (+5%, +10%, …)
 * - `displayKind = 'flat'` → bonus is a flat integer bonus, shown with flatUnit
 */
export interface TowerMetaStatTrack {
  /** Unique key within the tower's upgrade definition (used in SaveManager). */
  key:         string;
  /** Human-readable stat name shown in the UI. */
  label:       string;
  /** One-line description of what this stat does. */
  description: string;
  /** How to display the tier bonus: '%' or flat integer. */
  displayKind: 'pct' | 'flat';
  /** Unit suffix for flat bonuses (e.g. '' for chain count). */
  flatUnit?: string;
}

/** Per-tower-type upgrade definition: which stats can be upgraded. */
export interface TowerMetaUpgradeDef {
  /** Tower type key matching TowerDef.key. */
  towerKey:  string;
  /** Display name for the tower (used in UI). */
  towerName: string;
  /** Ordered list of upgradeable stat tracks (up to 4). */
  stats:     TowerMetaStatTrack[];
}

// ── Upgrade definitions ────────────────────────────────────────────────────────

export const TOWER_META_UPGRADE_DEFS: readonly TowerMetaUpgradeDef[] = [
  {
    towerKey:  'arrow',
    towerName: 'Arrow',
    stats: [
      { key: 'damage',      label: 'Damage',      description: 'Increases base damage per shot.', displayKind: 'pct' },
      { key: 'attackSpeed', label: 'Attack Speed', description: 'Reduces attack interval (fires faster).', displayKind: 'pct' },
      { key: 'range',       label: 'Range',        description: 'Increases attack range.', displayKind: 'pct' },
      { key: 'multiShot',   label: 'Multi-Shot',   description: 'Extra simultaneous targets per attack (+1 per 2 tiers).', displayKind: 'flat', flatUnit: '' },
    ],
  },
  {
    towerKey:  'rock-hurler',
    towerName: 'Rock Hurler',
    stats: [
      { key: 'damage',      label: 'Damage',      description: 'Increases base impact damage.', displayKind: 'pct' },
      { key: 'attackSpeed', label: 'Attack Speed', description: 'Reduces attack interval (throws faster).', displayKind: 'pct' },
      { key: 'range',       label: 'Range',        description: 'Increases attack range.', displayKind: 'pct' },
      { key: 'splash',      label: 'Splash',       description: 'Increases AoE splash radius.', displayKind: 'pct' },
    ],
  },
  {
    towerKey:  'frost',
    towerName: 'Frost',
    stats: [
      { key: 'damage',      label: 'Damage',      description: 'Increases base hit damage.', displayKind: 'pct' },
      { key: 'attackSpeed', label: 'Attack Speed', description: 'Reduces attack interval (fires faster).', displayKind: 'pct' },
      { key: 'range',       label: 'Range',        description: 'Increases attack range.', displayKind: 'pct' },
      { key: 'slowPct',     label: 'Slow %',       description: 'Increases slow potency (deeper slow factor).', displayKind: 'pct' },
    ],
  },
  {
    towerKey:  'poison',
    towerName: 'Poison',
    stats: [
      { key: 'dotDamage',   label: 'DoT Damage',   description: 'Increases base damage-per-tick.', displayKind: 'pct' },
      { key: 'attackSpeed', label: 'Attack Speed',  description: 'Reduces apply interval (afflicts faster).', displayKind: 'pct' },
      { key: 'range',       label: 'Range',         description: 'Increases attack range.', displayKind: 'pct' },
      { key: 'dotStacks',   label: 'Max Stacks',    description: 'Extra DoT stack capacity (+1 per 2 tiers).', displayKind: 'flat', flatUnit: '' },
    ],
  },
  {
    towerKey:  'tesla',
    towerName: 'Thunder',
    stats: [
      { key: 'damage',      label: 'Damage',       description: 'Increases base lightning damage.', displayKind: 'pct' },
      { key: 'attackSpeed', label: 'Attack Speed',  description: 'Reduces attack interval (fires faster).', displayKind: 'pct' },
      { key: 'range',       label: 'Range',         description: 'Increases attack range.', displayKind: 'pct' },
      { key: 'chains',      label: 'Chain Count',   description: 'Extra chain targets (+1 per 2 tiers).', displayKind: 'flat', flatUnit: '' },
    ],
  },
  {
    towerKey:  'aura',
    towerName: 'Aura',
    stats: [
      { key: 'auraStrength', label: 'Aura Speed',   description: 'Increases attack-speed buff to nearby towers.', displayKind: 'pct' },
      { key: 'range',        label: 'Range',         description: 'Increases aura influence radius.', displayKind: 'pct' },
      { key: 'auraDamage',   label: 'Aura Damage',   description: 'Adds a damage multiplier buff to nearby towers.', displayKind: 'pct' },
      { key: 'auraRange',    label: 'Tower Range',   description: 'Increases range bonus provided to buffed towers.', displayKind: 'pct' },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns the cumulative bonus fraction at a given tier.
 * Tier 0 → 0; tier 1 → 0.05; tier 5 → 0.25.
 * Clamped to MAX_META_TIER.
 */
export function getMetaBonusPct(tier: number): number {
  if (tier <= 0) return 0;
  const idx = Math.min(tier, MAX_META_TIER) - 1;
  return META_TIER_BONUS_PCT[idx];
}

/**
 * Returns the crystal cost to purchase the next tier from the given tier.
 * E.g. getMetaUpgradeCost(0) = 5 (cost to buy tier 1).
 * Returns 0 when already at MAX_META_TIER (no next tier).
 */
export function getMetaUpgradeCost(currentTier: number): number {
  if (currentTier >= MAX_META_TIER) return 0;
  return META_TIER_COSTS[currentTier];
}

/**
 * Returns a display string for the cumulative bonus at the given tier.
 * E.g. for a 'pct' stat at tier 3: "+15%"
 * For a 'flat' stat (multiShot) at tier 4: "+2"
 * Returns "MAXED" when tier >= MAX_META_TIER.
 */
export function getMetaBonusDisplay(track: TowerMetaStatTrack, tier: number): string {
  if (tier <= 0) return '+0' + (track.displayKind === 'pct' ? '%' : (track.flatUnit ?? ''));
  if (tier >= MAX_META_TIER) return 'MAXED';
  if (track.displayKind === 'flat') {
    const bonus = Math.floor(tier / 2);
    return `+${bonus}${track.flatUnit ?? ''}`;
  }
  const pct = getMetaBonusPct(tier) * 100;
  return `+${pct.toFixed(0)}%`;
}

/**
 * Returns a display string for the NEXT tier's incremental bonus.
 * Used to show what the player will gain by buying the next tier.
 * Returns 'MAXED' when already at max tier.
 */
export function getNextTierBonusDisplay(track: TowerMetaStatTrack, currentTier: number): string {
  if (currentTier >= MAX_META_TIER) return 'MAXED';
  if (track.displayKind === 'flat') {
    const nextFlat = Math.floor((currentTier + 1) / 2);
    const curFlat  = Math.floor(currentTier / 2);
    const delta    = nextFlat - curFlat;
    return `+${delta}${track.flatUnit ?? ''}`;
  }
  const nextPct = getMetaBonusPct(currentTier + 1) * 100;
  const curPct  = getMetaBonusPct(currentTier)     * 100;
  const delta   = nextPct - curPct;
  return `+${delta.toFixed(0)}%`;
}

// ── Stat application ───────────────────────────────────────────────────────────

/**
 * Apply all tower meta upgrade bonuses for a given tower type to its live stats.
 * Mutates `stats` in-place. Call after `defaultUpgradeStats()` and before any
 * in-run upgrades (gear bonuses applied just after this).
 *
 * @param stats     The TowerUpgradeStats to modify (from defaultUpgradeStats).
 * @param towerKey  The tower type key (e.g. 'arrow', 'frost').
 * @param upgrades  Map of statKey → tier (0 = not upgraded).
 */
export function applyTowerMetaToStats(
  stats:     TowerUpgradeStats,
  towerKey:  string,
  upgrades:  Record<string, number>,
): void {
  const pct = (key: string): number => getMetaBonusPct(upgrades[key] ?? 0);

  switch (towerKey) {
    case 'arrow': {
      const dmgPct = pct('damage');
      if (dmgPct > 0) stats.damage *= (1 + dmgPct);

      const asPct = pct('attackSpeed');
      if (asPct > 0 && Number.isFinite(stats.attackIntervalMs)) {
        stats.attackIntervalMs *= (1 - asPct);
      }

      const rangePct = pct('range');
      if (rangePct > 0) stats.range *= (1 + rangePct);

      const msTier = upgrades['multiShot'] ?? 0;
      stats.multiShotCount += Math.floor(msTier / 2);
      break;
    }

    case 'rock-hurler': {
      const dmgPct = pct('damage');
      if (dmgPct > 0) stats.damage *= (1 + dmgPct);

      const asPct = pct('attackSpeed');
      if (asPct > 0 && Number.isFinite(stats.attackIntervalMs)) {
        stats.attackIntervalMs *= (1 - asPct);
      }

      const rangePct = pct('range');
      if (rangePct > 0) stats.range *= (1 + rangePct);

      const splashPct = pct('splash');
      if (splashPct > 0) stats.splashRadius *= (1 + splashPct);
      break;
    }

    case 'frost': {
      const dmgPct = pct('damage');
      if (dmgPct > 0) stats.damage *= (1 + dmgPct);

      const asPct = pct('attackSpeed');
      if (asPct > 0 && Number.isFinite(stats.attackIntervalMs)) {
        stats.attackIntervalMs *= (1 - asPct);
      }

      const rangePct = pct('range');
      if (rangePct > 0) stats.range *= (1 + rangePct);

      // Slow potency: reduce slowFactor multiplicatively (0.5 base = 50% speed;
      // a 10% bonus makes slowFactor 0.5 × (1 - 0.10) = 0.45 = 55% speed reduction).
      const slowPct = pct('slowPct');
      if (slowPct > 0) stats.slowFactor *= (1 - slowPct);
      break;
    }

    case 'poison': {
      // Poison damage is dotDamageBase (stats.damage is 0 for poison).
      const dotPct = pct('dotDamage');
      if (dotPct > 0) stats.dotDamageBase *= (1 + dotPct);

      const asPct = pct('attackSpeed');
      if (asPct > 0 && Number.isFinite(stats.attackIntervalMs)) {
        stats.attackIntervalMs *= (1 - asPct);
      }

      const rangePct = pct('range');
      if (rangePct > 0) stats.range *= (1 + rangePct);

      const stackTier = upgrades['dotStacks'] ?? 0;
      stats.maxDotStacks += Math.floor(stackTier / 2);
      break;
    }

    case 'tesla': {
      const dmgPct = pct('damage');
      if (dmgPct > 0) stats.damage *= (1 + dmgPct);

      const asPct = pct('attackSpeed');
      if (asPct > 0 && Number.isFinite(stats.attackIntervalMs)) {
        stats.attackIntervalMs *= (1 - asPct);
      }

      const rangePct = pct('range');
      if (rangePct > 0) stats.range *= (1 + rangePct);

      const chainTier = upgrades['chains'] ?? 0;
      stats.chainCount += Math.floor(chainTier / 2);
      break;
    }

    case 'aura': {
      // auraStrength: reduce the interval multiplier (smaller = faster buff to allies).
      const auraStrPct = pct('auraStrength');
      if (auraStrPct > 0) stats.auraIntervalMult *= (1 - auraStrPct);

      const rangePct = pct('range');
      if (rangePct > 0) stats.range *= (1 + rangePct);

      // auraDamage: add a cumulative damage multiplier buff to nearby towers.
      const auraDmgPct = pct('auraDamage');
      if (auraDmgPct > 0) stats.auraDamageMult *= (1 + auraDmgPct);

      // auraRange: add a range % bonus that this aura grants to buffed towers.
      const auraRngPct = pct('auraRange');
      if (auraRngPct > 0) stats.auraRangePct += auraRngPct;
      break;
    }

    default:
      break;
  }
}
