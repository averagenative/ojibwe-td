/**
 * Balance calculation utilities.
 *
 * Provides pure-function DPS / HP / traversal-time formulas used by:
 *   - Automated balance tests (src/systems/__tests__/BalanceCalc.test.ts)
 *   - The in-game debug overlay (GameScene.ts, dev builds only)
 *   - The balance-table generator (scripts/generate-balance-table.ts)
 *
 * No Phaser import — safe in unit tests and Node.js scripts.
 */

import type { TowerDef, TowerUpgradeStats } from '../data/towerDefs';
import { defaultUpgradeStats } from '../data/towerDefs';
import { ALL_UPGRADE_DEFS } from '../data/upgradeDefs';
import type { TowerUpgradeState } from './UpgradeManager';
import {
  WAVE_HP_MULTS,
  WAVE_SPEED_MULTS,
  CREEP_BASE_HP,
  CREEP_BASE_SPEED,
  MAP_PATH_LENGTH_PX,
} from '../data/scalingConfig';

// ── Stat computation ──────────────────────────────────────────────────────────

/**
 * Compute effective TowerUpgradeStats from a TowerDef and a TowerUpgradeState.
 *
 * This is a standalone replica of UpgradeManager.computeEffectiveStats, usable
 * without a live Tower instance (for tests, scripts, and the debug overlay).
 */
export function computeStatsForBalance(
  towerDef: TowerDef,
  state: TowerUpgradeState,
): TowerUpgradeStats {
  const upgDef = ALL_UPGRADE_DEFS.find(d => d.towerKey === towerDef.key);
  const base   = defaultUpgradeStats(towerDef);
  if (!upgDef) return base;

  // Accumulate numeric deltas
  let damageDelta          = 0;
  let rangeDelta           = 0;
  let speedPct             = 0;   // additive %; capped at 50
  let splashDelta          = 0;
  let chainCountDelta      = 0;
  let chainRatioDelta      = 0;
  let auraIntervalMultDelta = 0;
  let auraDamageMultDelta  = 0;
  let auraRangePctDelta    = 0;

  // Effect overrides (last-write-wins within path)
  let armorShredPct      = 0;
  let armorShredDuration = base.armorShredDuration;
  let executeThreshold   = 0;
  let slowFactor         = base.slowFactor;
  let slowDurationMs     = base.slowDurationMs;
  let shatterOnDeath     = false;
  let clusterCount       = 0;
  let dotDamageBonus        = 0;
  let maxDotStacks          = base.maxDotStacks;
  let dotSpreadOnDeath      = false;
  let dotSpreadRadiusDelta  = 0;
  let dotSpreadStackCount   = 1;
  let dotSpreadHitsAir      = false;
  let overloadMode          = false;
  let overloadDebuffPct  = 0;
  let auraSpecType: '' | 'speed' | 'damage' | 'range' = '';
  let multiShotCountDelta = 0;
  let arrowSlowFactor     = 0;
  let arrowSlowDurationMs = 0;

  for (const path of ['A', 'B', 'C'] as const) {
    const purchasedTiers = state.tiers[path];
    for (let i = 0; i < purchasedTiers; i++) {
      const tierDef = upgDef.paths[path].tiers[i];
      if (!tierDef) continue;

      const sd = tierDef.statDelta;
      if (sd) {
        damageDelta          += sd.damageDelta           ?? 0;
        rangeDelta           += sd.rangeDelta            ?? 0;
        speedPct             += sd.attackSpeedPct        ?? 0;
        splashDelta          += sd.splashRadiusDelta     ?? 0;
        chainCountDelta      += sd.chainCountDelta       ?? 0;
        chainRatioDelta      += sd.chainDamageRatioDelta ?? 0;
        auraIntervalMultDelta += sd.auraIntervalMultDelta ?? 0;
        auraDamageMultDelta  += sd.auraDamageMultDelta   ?? 0;
        auraRangePctDelta    += sd.auraRangePctDelta     ?? 0;
        dotSpreadRadiusDelta += sd.spreadRadiusDelta     ?? 0;
        multiShotCountDelta  += sd.multiShotCountDelta   ?? 0;
      }

      const fx = tierDef.effects;
      if (fx) {
        if (fx.armorShredPct      !== undefined) { armorShredPct = fx.armorShredPct; armorShredDuration = fx.armorShredDuration ?? base.armorShredDuration; }
        if (fx.executeThreshold   !== undefined) executeThreshold   = fx.executeThreshold;
        if (fx.slowFactor         !== undefined) slowFactor         = fx.slowFactor;
        if (fx.slowDurationMs     !== undefined) slowDurationMs     = fx.slowDurationMs;
        if (fx.shatterOnDeath)                   shatterOnDeath     = true;
        if (fx.clusterCount       !== undefined) clusterCount       = fx.clusterCount;
        if (fx.dotDamageBonus     !== undefined) dotDamageBonus     = fx.dotDamageBonus;
        if (fx.maxDotStacks       !== undefined) maxDotStacks       = fx.maxDotStacks;
        if (fx.dotSpreadOnDeath)                   dotSpreadOnDeath      = true;
        if (fx.spreadStackCount !== undefined)    dotSpreadStackCount   = fx.spreadStackCount;
        if (fx.spreadHitsAir)                     dotSpreadHitsAir      = true;
        if (fx.overloadMode)                     overloadMode       = true;
        if (fx.overloadDebuffPct  !== undefined) overloadDebuffPct  = fx.overloadDebuffPct;
        if (fx.auraSpecialization !== undefined) auraSpecType       = fx.auraSpecialization;
        if (fx.arrowSlowFactor     !== undefined) arrowSlowFactor     = fx.arrowSlowFactor;
        if (fx.arrowSlowDurationMs !== undefined) arrowSlowDurationMs = fx.arrowSlowDurationMs;
      }
    }
  }

  const clampedSpeedPct   = Math.min(speedPct, 50);
  const effectiveInterval = base.attackIntervalMs * (1 - clampedSpeedPct / 100);

  return {
    damage:           base.damage + damageDelta,
    range:            base.range  + rangeDelta,
    attackIntervalMs: effectiveInterval,
    splashRadius:     base.splashRadius + splashDelta,
    chainCount:       base.chainCount   + chainCountDelta,
    chainDamageRatio: base.chainDamageRatio + chainRatioDelta,
    auraIntervalMult: base.auraIntervalMult + auraIntervalMultDelta,
    auraDamageMult:   1.0 + auraDamageMultDelta,
    auraRangePct:     base.auraRangePct + auraRangePctDelta,

    armorShredPct,
    armorShredDuration,
    executeThreshold,
    slowFactor,
    slowDurationMs,
    shatterOnDeath,
    clusterCount,
    dotDamageBase:        base.dotDamageBase,
    dotDamageBonus,
    maxDotStacks,
    dotSpreadOnDeath,
    dotSpreadRadiusDelta,
    dotSpreadStackCount,
    dotSpreadHitsAir,
    overloadMode,
    overloadDebuffPct,
    auraSpecType,
    multiShotCount:       base.multiShotCount + multiShotCountDelta,
    arrowSlowFactor,
    arrowSlowDurationMs,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute effective single-target DPS for a tower given its upgrade state.
 *
 * - Arrow / Rock Hurler / Frost / Tesla: `damage / attackIntervalSec`
 *   (Rock Hurler: direct hit only; splash bonus not included in single-target DPS)
 * - Poison: steady-state DoT DPS at max stacks = `(base + bonus) × 2 ticks/s × maxStacks`
 * - Aura: 0 (no direct damage output)
 *
 * The `_wave` parameter is reserved for future wave-dependent mechanics
 * (e.g. armour tiers) and does not currently affect the result.
 */
export function towerEffectiveDPS(
  towerDef:     TowerDef,
  upgradeState: TowerUpgradeState,
  _wave:        number,
): number {
  if (towerDef.isAura) return 0;

  const stats = computeStatsForBalance(towerDef, upgradeState);

  if (!isFinite(stats.attackIntervalMs) || stats.attackIntervalMs <= 0) return 0;

  if (towerDef.key === 'poison') {
    // Steady-state: assume the creep has max stacks applied.
    // Each stack ticks every 500ms = 2 ticks/sec.
    const DOT_TICK_RATE = 1000 / 500; // 2 ticks/sec
    const dmgPerTick    = stats.dotDamageBase + stats.dotDamageBonus;
    return dmgPerTick * DOT_TICK_RATE * stats.maxDotStacks;
  }

  return stats.damage / (stats.attackIntervalMs / 1000);
}

/**
 * Compute the effective HP of a creep type at a given wave.
 *
 * @param wave      1-based wave number (clamped to 1–20)
 * @param creepType Creep type key (grunt, runner, brute, swarm, scout, flier)
 */
export function creepEffectiveHP(wave: number, creepType: string): number {
  const clampedWave = Math.max(1, Math.min(wave, WAVE_HP_MULTS.length));
  const baseHP      = CREEP_BASE_HP[creepType] ?? 80;
  const mult        = WAVE_HP_MULTS[clampedWave - 1] ?? 1;
  return Math.round(baseHP * mult);
}

/**
 * Compute path traversal time in seconds for a creep type at a given wave.
 *
 * @param wave          1-based wave number
 * @param creepType     Creep type key
 * @param pathLengthPx  Total path length in pixels (default: map-01 = 2400px)
 */
export function creepTraversalSec(
  wave:        number,
  creepType:   string,
  pathLengthPx = MAP_PATH_LENGTH_PX,
): number {
  const clampedWave  = Math.max(1, Math.min(wave, WAVE_SPEED_MULTS.length));
  const baseSpeed    = CREEP_BASE_SPEED[creepType] ?? 75;
  const speedMult    = WAVE_SPEED_MULTS[clampedWave - 1] ?? 1;
  const effectiveSpd = baseSpeed * speedMult;
  return pathLengthPx / effectiveSpd;
}
