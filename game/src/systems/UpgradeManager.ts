import type { Tower } from '../entities/towers/Tower';
import { defaultUpgradeStats } from '../data/towerDefs';
import type { TowerUpgradeStats } from '../data/towerDefs';
import type { TowerUpgradeDef } from '../data/upgradeDefs';
import { ALL_UPGRADE_DEFS } from '../data/upgradeDefs';
import type { Creep } from '../entities/Creep';

/** Base spread radius for Poison C (Plague) on-death spread. Plague II adds 10px on top. */
export const BASE_DOT_SPREAD_RADIUS = 80;

// ── State ─────────────────────────────────────────────────────────────────────

export interface TowerUpgradeState {
  /** Current tier purchased per path (0 = none bought, 5 = max). */
  tiers:      { A: number; B: number; C: number };
  /** Paths that are locked due to deep investment in the opposing path. */
  locked:     Set<'A' | 'B' | 'C'>;
  /** Total gold spent on this tower's upgrades (used for respec calculation). */
  totalSpent: number;
}

// ── UpgradeManager ────────────────────────────────────────────────────────────

export class UpgradeManager {
  private readonly states      = new Map<Tower, TowerUpgradeState>();
  private readonly defs        = new Map<string, TowerUpgradeDef>();
  private readonly getTowers:  () => readonly Tower[];
  private readonly getCreeps:  () => ReadonlySet<Creep>;

  /**
   * @param getTowers  Returns the current list of all placed towers (for overload debuff).
   * @param getCreeps  Returns the active creep set (for DoT spread on death).
   */
  constructor(
    getTowers: () => readonly Tower[],
    getCreeps: () => ReadonlySet<Creep>,
  ) {
    this.getTowers = getTowers;
    this.getCreeps = getCreeps;

    for (const def of ALL_UPGRADE_DEFS) {
      this.defs.set(def.towerKey, def);
    }
  }

  // ── Tower lifecycle ───────────────────────────────────────────────────────

  /** Register a newly placed tower. Must be called before any upgrade queries. */
  registerTower(tower: Tower): void {
    if (!this.states.has(tower)) {
      this.states.set(tower, {
        tiers:      { A: 0, B: 0, C: 0 },
        locked:     new Set(),
        totalSpent: 0,
      });
    }
  }

  /** Remove a sold/destroyed tower. */
  removeTower(tower: Tower): void {
    this.states.delete(tower);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  getState(tower: Tower): TowerUpgradeState | undefined {
    return this.states.get(tower);
  }

  getDef(towerKey: string): TowerUpgradeDef | undefined {
    return this.defs.get(towerKey);
  }

  /** True when the given path can be advanced (not locked, tier < 5). */
  canUpgrade(tower: Tower, path: 'A' | 'B' | 'C'): boolean {
    const state = this.states.get(tower);
    if (!state) return false;
    if (state.locked.has(path)) return false;
    return state.tiers[path] < 5;
  }

  /** Cost to buy the next tier on this path, or 0 if not available. */
  getUpgradeCost(tower: Tower, path: 'A' | 'B' | 'C'): number {
    const state = this.states.get(tower);
    const def   = this.defs.get(tower.def.key);
    if (!state || !def) return 0;
    const tier = state.tiers[path];
    if (tier >= 5) return 0;
    return def.paths[path].tiers[tier]?.cost ?? 0;
  }

  /** Cost for a respec (gold lost — equals respecCostPct × totalSpent). */
  getRespecCost(tower: Tower): number {
    const state = this.states.get(tower);
    const def   = this.defs.get(tower.def.key);
    if (!state || !def) return 0;
    return Math.floor(state.totalSpent * def.respecCostPct);
  }

  /** Total gold that would be refunded by respec (totalSpent − fee). */
  getRespecRefund(tower: Tower): number {
    const state = this.states.get(tower);
    const def   = this.defs.get(tower.def.key);
    if (!state || !def) return 0;
    return state.totalSpent - this.getRespecCost(tower);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  /**
   * Purchase the next tier on the given path.
   * Caller is responsible for deducting gold (returns the gold cost).
   * Returns 0 if the upgrade cannot be purchased.
   */
  buyUpgrade(tower: Tower, path: 'A' | 'B' | 'C'): number {
    const state = this.states.get(tower);
    const def   = this.defs.get(tower.def.key);
    if (!state || !def || !this.canUpgrade(tower, path)) return 0;

    const tier    = state.tiers[path];
    const tierDef = def.paths[path].tiers[tier];
    if (!tierDef) return 0;

    const cost = tierDef.cost;
    state.tiers[path]++;
    state.totalSpent += cost;

    // Path lock: advancing A to lockThreshold locks C, and vice-versa.
    if (path === 'A' && state.tiers.A >= def.lockThreshold) {
      state.locked.add('C');
    } else if (path === 'C' && state.tiers.C >= def.lockThreshold) {
      state.locked.add('A');
    }

    this.applyStatsToTower(tower);
    return cost;
  }

  /**
   * Respec the tower: reset all tiers and unlock paths.
   * Returns the gold refunded (caller should add to player's gold).
   * Returns 0 if nothing has been spent.
   */
  respec(tower: Tower): number {
    const state = this.states.get(tower);
    const def   = this.defs.get(tower.def.key);
    if (!state || !def || state.totalSpent === 0) return 0;

    const refund = this.getRespecRefund(tower);

    state.tiers      = { A: 0, B: 0, C: 0 };
    state.locked     = new Set();
    state.totalSpent = 0;

    this.applyStatsToTower(tower);
    return refund;
  }

  // ── Stat computation ──────────────────────────────────────────────────────

  /**
   * Compute the fully accumulated TowerUpgradeStats for a tower given
   * its current upgrade state.  The result is NOT cached — it is
   * recomputed fresh on every call (only happens on buy / respec).
   */
  computeEffectiveStats(tower: Tower): TowerUpgradeStats {
    const def_data = this.defs.get(tower.def.key);
    const state    = this.states.get(tower);
    const base     = defaultUpgradeStats(tower.def);

    if (!def_data || !state) return base;

    // ── Accumulate numeric deltas ─────────────────────────────────────────
    let damageDelta          = 0;
    let rangeDelta           = 0;
    let speedPct             = 0;   // additive %; capped at 50 in formula
    let splashDelta          = 0;
    let chainCountDelta      = 0;
    let chainRatioDelta      = 0;
    let auraIntervalMultDelta = 0;
    let auraDamageMultDelta  = 0;
    let auraRangePctDelta    = 0;

    // ── Effect overrides (last-write-wins within path, highest tier overall) ─
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

    for (const path of ['A', 'B', 'C'] as const) {
      const purchasedTiers = state.tiers[path];
      for (let i = 0; i < purchasedTiers; i++) {
        const tierDef = def_data.paths[path].tiers[i];
        if (!tierDef) continue;

        const sd = tierDef.statDelta;
        if (sd) {
          damageDelta           += sd.damageDelta           ?? 0;
          rangeDelta            += sd.rangeDelta            ?? 0;
          speedPct              += sd.attackSpeedPct        ?? 0;
          splashDelta           += sd.splashRadiusDelta     ?? 0;
          chainCountDelta       += sd.chainCountDelta       ?? 0;
          chainRatioDelta       += sd.chainDamageRatioDelta ?? 0;
          auraIntervalMultDelta += sd.auraIntervalMultDelta ?? 0;
          auraDamageMultDelta   += sd.auraDamageMultDelta   ?? 0;
          auraRangePctDelta     += sd.auraRangePctDelta     ?? 0;
          dotSpreadRadiusDelta  += sd.spreadRadiusDelta     ?? 0;
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
        }
      }
    }

    // ── Build final stats ─────────────────────────────────────────────────
    const clampedSpeedPct   = Math.min(speedPct, 50);
    const effectiveInterval = base.attackIntervalMs * (1 - clampedSpeedPct / 100);

    const stats: TowerUpgradeStats = {
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
      dotDamageBase:    base.dotDamageBase,
      dotDamageBonus,
      maxDotStacks,
      dotSpreadOnDeath,
      dotSpreadRadiusDelta,
      dotSpreadStackCount,
      dotSpreadHitsAir,
      overloadMode,
      overloadDebuffPct,
      auraSpecType,
    };

    return stats;
  }

  /**
   * Recompute and push the latest stats to the tower.
   * Also wires the Tesla overload callback when overload mode is active.
   */
  applyStatsToTower(tower: Tower): void {
    const stats = this.computeEffectiveStats(tower);
    tower.applyUpgradeStats(stats);

    // Wire / unwire Tesla overload callback
    if (stats.overloadMode && tower.def.key === 'tesla') {
      const getTowers      = this.getTowers;
      const chainRange     = tower.def.chainRange ?? 110;
      const debuffDuration = 1000; // ms

      tower.onChainFired = (positions: Array<{ x: number; y: number }>) => {
        const mult = 1 + stats.overloadDebuffPct / 100;
        for (const t of getTowers()) {
          if (t === tower) continue;
          for (const pos of positions) {
            const dist = Math.hypot(t.x - pos.x, t.y - pos.y);
            if (dist <= chainRange) {
              t.applyAttackDebuff(mult, debuffDuration);
              break; // at most one debuff application per tower per chain
            }
          }
        }
      };
    } else {
      tower.onChainFired = undefined;
    }
  }

  // ── DoT spread helper (called from GameScene) ─────────────────────────────

  /**
   * Returns true if any Poison tower currently has the dotSpreadOnDeath upgrade.
   * GameScene uses this to decide whether to spread DoTs on creep death.
   */
  hasPoisonSpread(): boolean {
    for (const tower of this.getTowers()) {
      if (tower.def.key === 'poison' && tower.upgStats.dotSpreadOnDeath) return true;
    }
    return false;
  }

  /**
   * Spread DoT stacks to nearby creeps on a poisoned creep's death.
   * Reads spread radius, stack count, and domain coverage from the current
   * upgrade state of all Poison towers with dotSpreadOnDeath active.
   */
  spreadDot(
    originX: number,
    originY: number,
    damage:  number,
    tickMs:  number,
    ticks:   number,
  ): void {
    // Derive the best spread parameters from all Poison C towers.
    let spreadRadius = BASE_DOT_SPREAD_RADIUS;
    let stackCount   = 1;
    let hitsAir      = false;

    for (const tower of this.getTowers()) {
      if (tower.def.key === 'poison' && tower.upgStats.dotSpreadOnDeath) {
        const r = BASE_DOT_SPREAD_RADIUS + tower.upgStats.dotSpreadRadiusDelta;
        if (r > spreadRadius) spreadRadius = r;
        if (tower.upgStats.dotSpreadStackCount > stackCount) stackCount = tower.upgStats.dotSpreadStackCount;
        if (tower.upgStats.dotSpreadHitsAir) hitsAir = true;
      }
    }

    for (const creep of this.getCreeps()) {
      if (!creep.active) continue;
      // Base spread (Plague I–IV) only reaches ground creeps; Plague V also air.
      if (!hitsAir && creep.domain === 'air') continue;
      const dist = Math.hypot(creep.x - originX, creep.y - originY);
      if (dist <= spreadRadius) {
        for (let i = 0; i < stackCount; i++) {
          creep.applyDot(damage, tickMs, ticks);
        }
      }
    }
  }
}
