/**
 * AscensionSystem — runtime modifier engine for the post-campaign Ascension ladder.
 *
 * Instantiated by GameScene at run start.  Consumes the chosen ascension level and
 * provides:
 *  1. Passive multipliers (HP, speed, gold income) queried by WaveManager / Creep.
 *  2. Active per-wave effects (tower disable, lightning strikes) driven by Phaser timers.
 *  3. Reactive effects (poison cloud) triggered by scene events.
 *
 * All scheduled timers are cancelled in destroy() so the system is safe to shut down
 * mid-wave without leaving orphaned callbacks.
 */

import Phaser from 'phaser';
import type { Tower } from '../entities/towers/Tower';
import { getModifier } from '../data/ascensionDefs';

// Attack-speed slow fraction applied to towers hit by a poison cloud.
const POISON_CLOUD_RADIUS_PX = 100;
const POISON_CLOUD_DURATION_MS = 4000;
// Lightning-strike disable duration (level 9).
const LIGHTNING_DISABLE_DURATION_MS = 5000;
// Delay from wave start to first/second/third lightning strike (ms).
const LIGHTNING_DELAYS_MS = [3000, 6000, 9000] as const;

export class AscensionSystem {
  private readonly scene: Phaser.Scene;
  private readonly level: number;
  /** All Phaser timers this system has scheduled — cleared on destroy(). */
  private readonly _timers: Phaser.Time.TimerEvent[] = [];

  constructor(scene: Phaser.Scene, level: number) {
    this.scene = scene;
    this.level = Math.max(0, Math.min(10, Math.floor(level)));
  }

  getLevel(): number {
    return this.level;
  }

  // ── Passive multipliers ────────────────────────────────────────────────────

  /**
   * Multiplier applied to creep max HP when spawning.
   * Composes Ascension 1 modifier (+20%) and Ascension 10's cumulative stack.
   * All levels 1–10 include level 1 if active, so the factor is simply 1.2 × 1.
   */
  getHpMultiplier(): number {
    const mod = getModifier(this.level, 'hp_mult');
    return mod?.value ?? 1;
  }

  /**
   * Multiplier applied to creep base speed in the Creep constructor.
   * Ascension 2 adds +10%.
   */
  getSpeedMultiplier(): number {
    const mod = getModifier(this.level, 'speed_mult');
    return mod?.value ?? 1;
  }

  /**
   * Multiplier applied to in-run gold income (kill rewards, wave bonuses, etc.).
   * Ascension 10 introduces a 10% penalty (value = 0.9).
   */
  getGoldIncomeMultiplier(): number {
    const mod = getModifier(this.level, 'gold_income_penalty');
    return mod?.value ?? 1;
  }

  /**
   * Whether armoured creeps should appear earlier (Ascension 3).
   * Returns the number of waves earlier (3), or 0 when inactive.
   */
  getArmoredEarlyWaves(): number {
    const mod = getModifier(this.level, 'armored_early');
    return mod?.value ?? 0;
  }

  /**
   * Per-second HP regen fraction applied to non-boss normal creeps (Ascension 4).
   * Returns 0 when the modifier is inactive.
   */
  getRegenPerSec(): number {
    const mod = getModifier(this.level, 'regen_per_sec');
    return mod?.value ?? 0;
  }

  /**
   * Whether immune creeps should have both slow and poison immunity (Ascension 5).
   */
  isImmuneSlowAndPoison(): boolean {
    return getModifier(this.level, 'immune_slow_and_poison') !== undefined;
  }

  /**
   * Number of path tiles that flying creeps bypass at the end of the path (Ascension 7).
   * Returns 0 when inactive.
   */
  getAirBypassTiles(): number {
    const mod = getModifier(this.level, 'air_bypass_tiles');
    return mod?.value ?? 0;
  }

  // ── Air waypoint shortening (level 7) ─────────────────────────────────────

  /**
   * Shorten an air waypoints array by dropping the last `getAirBypassTiles()`
   * entries from the middle of the path (keeping spawn + exit points).
   * If bypass is inactive or the path is too short, returns the original array.
   *
   * The result preserves the final waypoint (the exit), so creeps still
   * reach it — they just skip intermediate tiles, appearing closer to the exit.
   */
  modifyAirWaypoints(waypoints: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
    const bypass = this.getAirBypassTiles();
    if (bypass <= 0 || waypoints.length <= 2) return waypoints;
    // Remove `bypass` waypoints from near the end but keep the final exit tile.
    const keepUntil = Math.max(1, waypoints.length - 1 - bypass);
    return [...waypoints.slice(0, keepUntil), waypoints[waypoints.length - 1]];
  }

  // ── Wave-start active effects ──────────────────────────────────────────────

  /**
   * Called by GameScene at the start of each wave.
   * Applies tower-disable (level 6) and schedules lightning strikes (level 9).
   *
   * @param waveNumber  1-based wave number.
   * @param getTowers   Callback returning the current tower list.
   */
  onWaveStart(waveNumber: number, getTowers: () => Tower[]): void {
    this._applyTowerDisable(getTowers);
    this._scheduleLightningStrikes(waveNumber, getTowers);
  }

  // ── Poison-cloud reactive effect (level 8) ─────────────────────────────────

  /**
   * Called by GameScene when a creep is killed by poison (`creep-died-poisoned`).
   * At Ascension 8+, releases a toxic cloud that slows nearby towers' attack
   * speed by 15% for POISON_CLOUD_DURATION_MS.
   *
   * @param x, y       World position of the dead creep.
   * @param getTowers  Callback returning the current tower list.
   */
  onCreepDiedPoisoned(x: number, y: number, getTowers: () => Tower[]): void {
    if (getModifier(this.level, 'poison_cloud') === undefined) return;
    const towers = getTowers();
    const radiusSq = POISON_CLOUD_RADIUS_PX * POISON_CLOUD_RADIUS_PX;
    for (const tower of towers) {
      const dx = tower.x - x;
      const dy = tower.y - y;
      if (dx * dx + dy * dy <= radiusSq) {
        // applyAttackDebuff: mult > 1 slows attacks; 1 / (1 - 0.15) ≈ 1.176 = 15% slower.
        tower.applyAttackDebuff(1.176, POISON_CLOUD_DURATION_MS);
      }
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Cancel all pending timers.  Must be called from GameScene.shutdown().
   */
  destroy(): void {
    for (const t of this._timers) {
      t.destroy();
    }
    this._timers.length = 0;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /** Ascension 6 — disable a random non-aura tower for 20 s at wave start. */
  private _applyTowerDisable(getTowers: () => Tower[]): void {
    const mod = getModifier(this.level, 'tower_disable');
    if (!mod) return;
    const durationMs = (mod.value ?? 20) * 1000;

    const eligible = getTowers().filter(t => !t.def.isAura);
    if (eligible.length === 0) return;

    const target = eligible[Math.floor(Math.random() * eligible.length)];
    target.disableForAscension(durationMs);
  }

  /** Ascension 9 — 3 lightning strikes on 5th waves, each disabling a tower for 5s. */
  private _scheduleLightningStrikes(waveNumber: number, getTowers: () => Tower[]): void {
    const mod = getModifier(this.level, 'lightning_strikes');
    if (!mod) return;
    if (waveNumber % 5 !== 0) return; // Only on every 5th wave

    const count = Math.floor(mod.value ?? 3);

    for (let i = 0; i < count; i++) {
      const delay = LIGHTNING_DELAYS_MS[i] ?? LIGHTNING_DELAYS_MS[LIGHTNING_DELAYS_MS.length - 1] + i * 3000;
      const timer = this.scene.time.delayedCall(delay, () => {
        const eligible = getTowers().filter(t => !t.def.isAura);
        if (eligible.length === 0) return;
        const target = eligible[Math.floor(Math.random() * eligible.length)];
        target.disableForAscension(LIGHTNING_DISABLE_DURATION_MS);
        this._showLightningStrikeVFX(target.x, target.y);
      });
      this._timers.push(timer);
    }
  }

  /** Brief visual flash at the strike position. */
  private _showLightningStrikeVFX(x: number, y: number): void {
    const gfx = this.scene.add.graphics();
    gfx.lineStyle(3, 0xffff44, 1);
    gfx.strokeRect(x - 20, y - 20, 40, 40);
    gfx.lineStyle(1, 0xffffff, 0.6);
    gfx.strokeCircle(x, y, 30);
    gfx.setDepth(50);

    this.scene.tweens.add({
      targets:  gfx,
      alpha:    0,
      duration: 500,
      onComplete: () => gfx.destroy(),
    });
  }
}
