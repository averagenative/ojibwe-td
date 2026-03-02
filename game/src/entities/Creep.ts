import Phaser from 'phaser';
import { tickRegen } from '../data/bossDefs';
import {
  computeArrivalThreshold,
  advanceWaypointIndex,
  computeDirection,
  type CreepDirection,
} from '../data/pathing';
import { hpBarColor } from '../systems/visualUtils';
import {
  EFFECT_CONFIGS,
  ICON_BAR_OFFSET_Y,
  ICON_RADIUS,
  ICON_COLORS,
  activeEffectKeys,
  poisonParticleCount,
  poisonOverlayAlpha,
  frostOverlayAlpha,
} from './StatusEffectVisuals';
import type { StatusEffectKey, StatusEffectVisualConfig } from './StatusEffectVisuals';

// Re-export so existing imports from Creep.ts still work.
export { tickRegen };

export type CreepType = 'ground' | 'air';

/**
 * Boss mechanic tag — must match the `bossAbility` field in BossDef.
 * Defined here (not in bossDefs.ts) to avoid circular runtime imports.
 */
export type BossAbility = 'armored' | 'slow-immune' | 'split' | 'regen';

export interface CreepConfig {
  hp:       number;
  speed:    number;   // pixels per second (base, before status effects)
  type:     CreepType;
  reward:   number;   // gold on kill
  isArmored?: boolean; // optional; defaults to false
  /** Texture key for the creep sprite (e.g. 'creep-normal'). Falls back to rectangle if absent. */
  spriteKey?: string;

  // ── Boss-specific fields (optional) ─────────────────────────────────────
  isBoss?:             boolean;
  bossAbility?:        BossAbility;
  /** 0–1 fraction of incoming damage blocked by armor (Makwa). */
  physicalResistPct?:  number;
  /** If true, applySlow() is a no-op for this creep (Migizi). */
  isSlowImmune?:       boolean;
  /** If true, applyDot() is a no-op for this creep (Animikiins). */
  isPoisonImmune?:     boolean;
  /** HP regenerated per second as % of maxHp; 0 = none (Animikiins: 1). */
  regenPercentPerSec?: number;
  /** RGB hex tint applied to the body (boss visual). */
  tint?:               number;
  /** Bonus gold emitted via 'boss-killed' event on death. */
  bossRewardGold?:     number;
  /** Whether a bonus offer draw should fire on death. */
  bossRewardOffer?:    boolean;
  /** Boss identifier key (matches BossDef.key). */
  bossKey?:            string;
  /** Boss display name (Ojibwe animal name). */
  bossName?:           string;
}

interface Waypoint {
  x: number;
  y: number;
}

/**
 * A single pooled particle arc used for status-effect visuals.
 * Arcs are children of the Creep Container and use local (container-relative)
 * coordinates.  The `phase` field drives a sine-wave alpha animation.
 */
interface EffectParticle {
  arc:    Phaser.GameObjects.Arc;
  /** Animation phase [0, 1).  0 = just born, 1 = expired → reset. */
  phase:  number;
  /** Phase increment per millisecond (1/particleLifeMs, staggered per slot). */
  speed:  number;
  /** Local X origin (re-randomised on each reset). */
  baseX:  number;
  /** Max upward displacement in pixels (negative Y = upward in Phaser). */
  riseY:  number;
  /** Total horizontal drift across the full lifetime (±). */
  drift:  number;
}

const BODY_COLORS: Record<CreepType, number> = {
  ground: 0x22cc55,
  air:    0x4488ff,
};

// ── Air creep visual constants ────────────────────────────────────────────────
/** Y offset applied to body/shadow visuals for air creeps (floating effect). */
const AIR_BODY_OFFSET_Y = -10;
/** Wing rectangle half-width. */
const AIR_WING_W = 10;
const AIR_WING_H = 4;

// ── Bobbing animation constants ───────────────────────────────────────────────
/** Sine-wave amplitude in pixels (±). */
const BOB_AMPLITUDE   = 1.5;
/** rad per (px/s) of effective speed — gives ≈ 2 Hz at 80 px/s base speed. */
const BOB_FREQ_FACTOR = 0.157;

// ── Directional body dimensions ───────────────────────────────────────────────
// Moving horizontally → wider; moving vertically → taller.
const BODY_HORIZ_W = 30; const BODY_HORIZ_H = 18;
const BODY_VERT_W  = 18; const BODY_VERT_H  = 30;
const BOSS_HORIZ_W = 56; const BOSS_HORIZ_H = 36;
const BOSS_VERT_W  = 36; const BOSS_VERT_H  = 56;

// Normal creep HP-bar dimensions
const HP_BAR_WIDTH  = 30;
const HP_BAR_HEIGHT = 4;
const HP_BAR_OFFSET_Y = -20;

// Boss HP-bar dimensions (larger, visible across the map)
const BOSS_HP_BAR_WIDTH    = 64;
const BOSS_HP_BAR_HEIGHT   = 8;
const BOSS_HP_BAR_OFFSET_Y = -36;

// Health bar fill colours — bosses use a fixed ember colour; normal creeps
// transition green → yellow → red as HP drops (see visualUtils.hpBarColor).
const BOSS_HP_BAR_COLOR   = 0xc0501e;   // deep ember (PAL.bossWarningN) for boss bars

// Depth for the creep container — must be above terrain (0-1) and decorations (1)
// but below projectiles (20) and UI (30+). Matches the depth hierarchy spec.
const CREEP_DEPTH = 15;

/** Regen cooldown after taking damage (ms). Animikiins-specific. */
const REGEN_DAMAGE_COOLDOWN_MS = 3000;

/** Data emitted on scene.events when a poisoned creep dies (used for DoT spread). */
export interface CreepDiedPoisonedData {
  x:           number;
  y:           number;
  dotDamage:   number;
  dotTickMs:   number;
  dotTicks:    number;
  /** True when the Frost shatter mechanic is active — prevents spread. */
  isShattered: boolean;
}

/** Data emitted on scene.events when a boss creep is killed. */
export interface BossKilledData {
  bossKey:    string;
  bossName:   string;
  rewardGold: number;
  rewardOffer: boolean;
  tint:        number;
  x:           number;
  y:           number;
}

export class Creep extends Phaser.GameObjects.Container {
  public readonly maxHp:     number;
  public readonly reward:    number;
  public readonly creepType: CreepType;
  /** True when this creep subtype is flagged as armored (used by Cannon Armor Focus). */
  public readonly isArmored: boolean;

  // ── Boss flags ─────────────────────────────────────────────────────────────
  public readonly isBossCreep:     boolean;
  public readonly bossAbilityType: BossAbility | undefined;
  private readonly physicalResistPct:   number;
  private readonly slowImmune:          boolean;
  private readonly poisonImmune:        boolean;
  private readonly regenPercentPerSec:  number;
  readonly bossRewardGold:   number;
  readonly bossRewardOffer:  boolean;
  readonly bossKey:          string;
  readonly bossName:         string;

  private hp: number;
  private baseSpeed: number;
  private speedMultiplier = 1.0; // modified by slow effects
  private waypoints: Waypoint[];
  private waypointIndex = 1; // index 0 is spawn

  /** Sprite image — set when a valid spriteKey texture is available. */
  private bodyImage?: Phaser.GameObjects.Image;
  /** Rectangle fallback — used when no sprite texture is available. */
  private bodyRect?: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private readonly hpBarMaxWidth: number;
  /** Stored separately so status-effect color changes don't lose the tint. */
  private readonly baseBodyColor: number;
  /**
   * For sprite-path creeps: the base tint applied to bodyImage when no status
   * effect is active.  0xffffff means no tint (clear).
   */
  private readonly baseSpriteTint: number;

  // ── status effects ────────────────────────────────────────────────────────
  private slowFactor  = 1.0; // 1 = full speed
  private slowTimer?: Phaser.Time.TimerEvent;
  private dotStacks   = 0;
  private dotTimers: Phaser.Time.TimerEvent[] = [];

  // Frost shatter: set when a Frost-C tower's slow is applied.
  // Cleared when the slow expires.
  private shatterActive = false;

  // Tracks the most-recently applied DoT params for spread-on-death purposes.
  private lastDotParams: { damage: number; tickMs: number; ticks: number } | null = null;

  // Armor shred: damage amplification applied by Cannon-A upgrades.
  private damageAmpPct = 0;
  private shredTimer?: Phaser.Time.TimerEvent;

  // ── Regen (Animikiins) ────────────────────────────────────────────────────
  /** Remaining cooldown in ms before regen ticks resume. */
  private regenCooldownMs = 0;

  // ── Directional movement ──────────────────────────────────────────────────
  private direction: CreepDirection = 'right';
  /** Accumulated phase (radians) for the bobbing sine wave. */
  private bobPhase = 0;
  /** Small armour badge shown at the leading edge of armoured creeps. */
  private armorIndicator?: Phaser.GameObjects.Rectangle;
  /** Cached base position for the armour badge (avoids tuple alloc per frame). */
  private armorBaseX = 0;
  private armorBaseY = 0;

  // ── Status effect visuals ─────────────────────────────────────────────────
  /** Reference to hpBg child — used to find the insert index for overlays. */
  private _hpBarBg!: Phaser.GameObjects.Rectangle;
  /** Semi-transparent tint overlay per active effect (container children). */
  private _effectOverlays  = new Map<StatusEffectKey, Phaser.GameObjects.Rectangle>();
  /** Animated particle arcs per active effect (container children). */
  private _effectParticles = new Map<StatusEffectKey, EffectParticle[]>();
  /** Ice ring / frost patch drawn beneath the creep body (container child). */
  private _frostRingGfx?: Phaser.GameObjects.Graphics;
  /** Status icon bar drawn above the HP bar (container child). */
  private _iconBarGfx?: Phaser.GameObjects.Graphics;

  // Burn state — new effect (applicable when cannon/mortar enables burn splash)
  private _burnActive  = false;
  private _burnTimer?: Phaser.Time.TimerEvent;

  // Tesla shock — residual static for 0.5 s after chain-lightning hit
  private _teslaShockedMs = 0;

  constructor(
    scene: Phaser.Scene,
    waypoints: Waypoint[],
    config: CreepConfig,
  ) {
    const start = waypoints[0];
    super(scene, start.x, start.y);

    this.maxHp     = config.hp;
    this.hp        = config.hp;
    this.baseSpeed = config.speed;
    this.reward    = config.reward;
    this.creepType = config.type;
    this.isArmored = config.isArmored ?? false;
    this.waypoints = waypoints;

    // Boss flags
    this.isBossCreep          = config.isBoss            ?? false;
    this.bossAbilityType      = config.bossAbility;
    this.physicalResistPct    = config.physicalResistPct ?? 0;
    this.slowImmune           = config.isSlowImmune      ?? false;
    this.poisonImmune         = config.isPoisonImmune    ?? false;
    this.regenPercentPerSec   = config.regenPercentPerSec ?? 0;
    this.bossRewardGold       = config.bossRewardGold    ?? 0;
    this.bossRewardOffer      = config.bossRewardOffer   ?? false;
    this.bossKey              = config.bossKey           ?? '';
    this.bossName             = config.bossName          ?? '';

    this.hpBarMaxWidth  = this.isBossCreep ? BOSS_HP_BAR_WIDTH : HP_BAR_WIDTH;
    this.baseBodyColor  = config.tint ?? BODY_COLORS[config.type];
    // For sprite-path: boss tint or 0xffffff (no tint) for standard creeps.
    this.baseSpriteTint = config.tint ?? 0xffffff;

    // Determine initial facing direction from the first path segment.
    if (waypoints.length > 1) {
      const dx0 = waypoints[1].x - waypoints[0].x;
      const dy0 = waypoints[1].y - waypoints[0].y;
      this.direction = computeDirection(dx0, dy0);
    }

    this.buildVisuals(config);
    // Apply the initial directional transform (flip / rotation / size).
    this.updateDirectionalVisual();
    scene.add.existing(this);
    // Depth 15: above terrain (0), decorations (1), towers (10); below
    // projectiles (20) and UI panels (30+).  Health bars render at this depth
    // too since they are children of this container.
    this.setDepth(CREEP_DEPTH);
  }

  // ── update ────────────────────────────────────────────────────────────────

  step(delta: number): void {
    if (!this.active) return;

    // HP regen (Animikiins)
    if (this.regenPercentPerSec > 0 && this.hp < this.maxHp) {
      const result = tickRegen(
        this.hp, this.maxHp, this.regenPercentPerSec, this.regenCooldownMs, delta,
      );
      if (result.hp !== this.hp) {
        this.hp = result.hp;
        const hpPct = this.hp / this.maxHp;
        this.hpBarFill.width = this.hpBarMaxWidth * hpPct;
        if (!this.isBossCreep) this.hpBarFill.setFillStyle(hpBarColor(hpPct));
      }
      this.regenCooldownMs = result.regenCooldownMs;
    }

    if (this.waypointIndex >= this.waypoints.length) {
      this.emit('reached-exit');
      this.setActive(false).setVisible(false);
      return;
    }

    const effectiveSpeed = this.baseSpeed * this.speedMultiplier;
    const stepDist = (effectiveSpeed * delta) / 1000;

    // Speed-aware arrival threshold: max(WAYPOINT_ARRIVAL_PX, stepDist) ensures
    // that even on a slow frame a creep cannot travel past a waypoint without
    // registering arrival.  advanceWaypointIndex() rechecks each successive
    // waypoint in the same frame — no early return — so the creep begins moving
    // toward the new target immediately (eliminates the corner pause).
    const arrivalThreshold = computeArrivalThreshold(stepDist);
    this.waypointIndex = advanceWaypointIndex(
      this.x, this.y, this.waypoints, this.waypointIndex, arrivalThreshold,
    );

    if (this.waypointIndex >= this.waypoints.length) {
      this.emit('reached-exit');
      this.setActive(false).setVisible(false);
      return;
    }

    const target = this.waypoints[this.waypointIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    // ── Direction update ─────────────────────────────────────────────────────
    if (dist > 0) {
      const newDir = computeDirection(dx, dy);
      if (newDir !== this.direction) {
        this.direction = newDir;
        this.updateDirectionalVisual();
      }
    }

    // ── Bobbing (sine wave on body Y, scales with effective speed) ───────────
    const bobY = Math.sin(this.bobPhase) * BOB_AMPLITUDE;
    if (this.bodyImage) this.bodyImage.y = bobY;
    if (this.bodyRect)  this.bodyRect.y  = bobY;
    if (this.armorIndicator) {
      this.armorIndicator.y = this.armorBaseY + bobY;
    }
    // Accumulate phase after applying so phase=0 → bobY=0 on the first frame.
    this.bobPhase += (effectiveSpeed / 1000) * delta * BOB_FREQ_FACTOR;

    if (dist > 0) {
      this.x += (dx / dist) * stepDist;
      this.y += (dy / dist) * stepDist;
    }

    // ── Animate status-effect particles ──────────────────────────────────────
    this._stepParticles(delta);

    // ── Tesla shock countdown ─────────────────────────────────────────────────
    if (this._teslaShockedMs > 0) {
      this._teslaShockedMs = Math.max(0, this._teslaShockedMs - delta);
      if (this._teslaShockedMs === 0) {
        this.refreshStatusVisual();
      }
    }
  }

  // ── combat ────────────────────────────────────────────────────────────────

  takeDamage(amount: number): void {
    if (!this.active) return;

    // Makoons ability: bypass armor when ignoreArmorAndImmunity is active.
    const cmdState = this.scene?.data?.get('commanderState') as { ignoreArmorAndImmunity?: boolean } | undefined;
    const ignoreFlags = cmdState?.ignoreArmorAndImmunity ?? false;

    // Apply armor (Makwa): reduces incoming damage.
    const afterArmor = ignoreFlags ? amount : amount * (1 - this.physicalResistPct);
    // Apply armor-shred damage amplification (Cannon-A counters Makwa's armor).
    const amplified = afterArmor * (1 + this.damageAmpPct);

    this.hp = Math.max(0, this.hp - amplified);
    const hpPct = this.hp / this.maxHp;
    this.hpBarFill.width = this.hpBarMaxWidth * hpPct;
    if (!this.isBossCreep) this.hpBarFill.setFillStyle(hpBarColor(hpPct));

    // Regen cooldown: reset 3 s after any damage (Animikiins).
    if (this.regenPercentPerSec > 0) {
      this.regenCooldownMs = REGEN_DAMAGE_COOLDOWN_MS;
    }

    if (this.hp <= 0) {
      // Emit spread event before destroying (GameScene handles the spread logic).
      if (this.dotStacks > 0 && this.lastDotParams) {
        const data: CreepDiedPoisonedData = {
          x:           this.x,
          y:           this.y,
          dotDamage:   this.lastDotParams.damage,
          dotTickMs:   this.lastDotParams.tickMs,
          dotTicks:    this.lastDotParams.ticks,
          isShattered: this.shatterActive,
        };
        this.scene.events.emit('creep-died-poisoned', data);
      }
      this.setActive(false).setVisible(false);
      this.emit('died', this);
      this.destroy();
    }
  }

  getHpRatio(): number {
    return this.hp / this.maxHp;
  }

  /** Current raw HP value (used by targeting priority comparators). */
  getCurrentHp(): number {
    return this.hp;
  }

  /**
   * A monotonically-increasing floating-point score indicating how far along
   * the path this creep has traveled.  Higher = closer to the exit.
   *
   * Integer part = waypointIndex (index of the NEXT waypoint the creep is
   * heading toward).  Fractional part = progress within the current segment.
   */
  getProgressScore(): number {
    const idx = this.waypointIndex;
    if (idx <= 0) return 0;
    if (idx >= this.waypoints.length) return this.waypoints.length;

    const target = this.waypoints[idx];
    const prev   = this.waypoints[idx - 1];
    const segLen = Math.hypot(target.x - prev.x, target.y - prev.y);
    const remaining = Math.hypot(target.x - this.x, target.y - this.y);
    const progress = segLen > 0 ? (segLen - remaining) / segLen : 0;
    return idx - 1 + progress;
  }

  /**
   * Returns a buff count for MOST_BUFFED priority:
   *   • +1 per active Poison DoT stack
   *   • +1 if a Frost chill is currently active
   */
  getBuffCount(): number {
    return this.dotStacks + (this.isSlowed() ? 1 : 0);
  }

  /** Current number of active DoT stacks. */
  getDotStacks(): number {
    return this.dotStacks;
  }

  /** Current cardinal movement direction (updated each step). */
  getDirection(): CreepDirection {
    return this.direction;
  }

  /** True while any slow is active (used by Frost shatter logic). */
  isSlowed(): boolean {
    return this.slowFactor < 1.0;
  }

  /**
   * The targeting domain of this creep — matches `creepType`.
   * Towers filter candidates by their `targetDomain` against this value.
   */
  get domain(): 'ground' | 'air' {
    return this.creepType;
  }

  /**
   * Index of the next waypoint this creep is heading toward.
   * Used by WaveManager to spawn Waabooz split copies along the remaining path.
   */
  getCurrentWaypointIndex(): number {
    return this.waypointIndex;
  }

  // ── status effects ────────────────────────────────────────────────────────

  /**
   * Apply a slow that reduces movement speed.
   * No-op if this creep is slow-immune (Migizi).
   * Multiple calls take the strongest slow (lowest factor).
   * @param factor     0–1 speed multiplier (e.g. 0.5 = half speed)
   * @param durationMs How long the slow lasts
   */
  applySlow(factor: number, durationMs: number): void {
    if (!this.active) return;
    // Makoons ability: bypass slow immunity when ignoreArmorAndImmunity is active.
    const cmdState = this.scene?.data?.get('commanderState') as { ignoreArmorAndImmunity?: boolean } | undefined;
    if (this.slowImmune && !(cmdState?.ignoreArmorAndImmunity)) return; // Migizi: immune to slow/freeze

    // Air creeps have wind resistance — Frost slow is only 50% effective.
    // e.g. factor=0.5 (halves speed) becomes 0.75 (only 25% reduction) for air.
    const effectiveFactor = this.creepType === 'air'
      ? 1 - (1 - factor) * 0.5
      : factor;

    this.slowFactor = Math.min(this.slowFactor, effectiveFactor);
    this.speedMultiplier = this.slowFactor;
    this.refreshStatusVisual();

    this.slowTimer?.destroy();
    this.slowTimer = this.scene.time.addEvent({
      delay: durationMs,
      callback: () => {
        if (!this.active) return;
        this.slowFactor      = 1.0;
        this.speedMultiplier = 1.0;
        this.shatterActive   = false; // shatter clears when the slow expires
        this.refreshStatusVisual();
      },
    });
  }

  /**
   * Mark this creep as shattered (Frost C upgrade).
   * Shatter is active as long as the creep is slowed; it prevents
   * Poison C's DoT spread from triggering on this creep's death.
   */
  applyShatter(): void {
    if (!this.active) return;
    this.shatterActive = true;
  }

  /**
   * Apply a poison DoT stack. Each stack ticks independently.
   * No-op if this creep is poison-immune (Animikiins).
   * @param damage     Damage per tick
   * @param tickMs     Ms between ticks
   * @param ticks      Number of ticks before this stack expires
   */
  applyDot(damage: number, tickMs: number, ticks: number): void {
    if (!this.active) return;
    // Makoons ability: bypass poison immunity when ignoreArmorAndImmunity is active.
    const cmdState = this.scene?.data?.get('commanderState') as { ignoreArmorAndImmunity?: boolean } | undefined;
    if (this.poisonImmune && !(cmdState?.ignoreArmorAndImmunity)) return; // Animikiins: immune to DoT

    this.lastDotParams = { damage, tickMs, ticks };
    this.dotStacks++;
    this.refreshStatusVisual();

    let remaining = ticks;
    const timer = this.scene.time.addEvent({
      delay: tickMs,
      loop: true,
      callback: () => {
        if (!this.active) {
          timer.destroy();
          return;
        }
        this.takeDamage(damage);
        remaining--;
        if (remaining <= 0) {
          timer.destroy();
          this.dotTimers = this.dotTimers.filter(t => t !== timer);
          this.dotStacks = Math.max(0, this.dotStacks - 1);
          this.refreshStatusVisual();
        }
      },
    });
    this.dotTimers.push(timer);
  }

  /**
   * Apply a damage vulnerability debuff from Cannon A (Armor Shred).
   * This counteracts Makwa's physicalResistPct — at high enough pct, the
   * armor is fully overcome.
   * @param pct        Damage amplification fraction (e.g. 0.15 = 15% more damage taken)
   * @param durationMs How long the debuff lasts
   */
  applyArmorShred(pct: number, durationMs: number): void {
    if (!this.active) return;
    // Skip entirely if the existing shred is already stronger — don't cut its
    // timer short by creating a new (shorter-duration) replacement.
    if (pct < this.damageAmpPct) return;
    this.damageAmpPct = pct;

    // Brief flash: show the overlay at high alpha then settle to normal.
    const overlay = this._effectOverlays.get('armorShred');
    if (overlay) {
      overlay.setAlpha(0.7);
      overlay.setVisible(true);
      this.scene.time.delayedCall(150, () => {
        if (!this.active) return;
        overlay.setAlpha(EFFECT_CONFIGS.armorShred.tintAlpha);
      });
    } else {
      // Overlay not yet allocated — refreshStatusVisual will create it,
      // then we flash it and schedule the settle.
      this.refreshStatusVisual();
      const newOv = this._effectOverlays.get('armorShred');
      if (newOv) {
        newOv.setAlpha(0.7);
        this.scene.time.delayedCall(150, () => {
          if (!this.active) return;
          newOv.setAlpha(EFFECT_CONFIGS.armorShred.tintAlpha);
        });
      }
    }

    this.shredTimer?.destroy();
    this.shredTimer = this.scene.time.addEvent({
      delay: durationMs,
      callback: () => {
        if (!this.active) return;
        this.damageAmpPct = 0;
        this.refreshStatusVisual();
      },
    });
  }

  /**
   * Apply a burn DoT visual effect.  Burn is triggered by cannon / mortar
   * splash towers when the burn-splash mechanic is active.
   * Re-application replaces the existing timer (extends the duration).
   */
  applyBurn(durationMs: number): void {
    if (!this.active) return;
    this._burnActive = true;
    this.refreshStatusVisual();
    this._burnTimer?.destroy();
    this._burnTimer = this.scene.time.addEvent({
      delay: durationMs,
      callback: () => {
        if (!this.active) return;
        this._burnActive = false;
        this.refreshStatusVisual();
      },
    });
  }

  /**
   * Apply a brief tesla-shock state that shows residual static sparks.
   * Duration is typically 500 ms (per TASK-047 spec).
   * Multiple hits extend the duration (takes the max of current and new).
   */
  applyTeslaShock(durationMs: number): void {
    if (!this.active) return;
    const wasShocked = this._teslaShockedMs > 0;
    this._teslaShockedMs = Math.max(this._teslaShockedMs, durationMs);
    if (!wasShocked) {
      this.refreshStatusVisual();
    }
  }

  /**
   * Immediately destroy all active DoT stacks and their timers.
   * (Available for future mechanics that need to cancel ongoing DoTs.)
   */
  clearDoTs(): void {
    for (const t of this.dotTimers) t.destroy();
    this.dotTimers = [];
    this.dotStacks = 0;
    this.refreshStatusVisual();
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  destroy(fromScene?: boolean): void {
    this.slowTimer?.destroy();
    this.shredTimer?.destroy();
    this._burnTimer?.destroy();
    for (const t of this.dotTimers) t.destroy();
    this.dotTimers = [];
    // Explicitly destroy dynamically-added visual children so they're not
    // orphaned in the container's child list after the container is destroyed.
    for (const overlay of this._effectOverlays.values()) overlay.destroy();
    this._effectOverlays.clear();
    for (const particles of this._effectParticles.values()) {
      for (const p of particles) p.arc.destroy();
    }
    this._effectParticles.clear();
    this._frostRingGfx?.destroy();
    this._iconBarGfx?.destroy();
    super.destroy(fromScene);
  }

  // ── private ───────────────────────────────────────────────────────────────

  private buildVisuals(config: CreepConfig): void {
    const isBoss   = this.isBossCreep;
    const bodySize = isBoss ? 48 : 24;
    const barW     = this.hpBarMaxWidth;
    const barH     = isBoss ? BOSS_HP_BAR_HEIGHT   : HP_BAR_HEIGHT;
    const barOffY  = isBoss ? BOSS_HP_BAR_OFFSET_Y : HP_BAR_OFFSET_Y;

    // ── Body: sprite image or coloured rectangle fallback ────────────────────
    const useSprite = config.spriteKey
      && this.scene.textures.exists(config.spriteKey);

    let bodyObj: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

    if (useSprite) {
      this.bodyImage = new Phaser.GameObjects.Image(
        this.scene, 0, 0, config.spriteKey!,
      );
      this.bodyImage.setDisplaySize(bodySize, bodySize);
      // Apply boss tint if specified; 0xffffff means no tint (clear).
      if (this.baseSpriteTint !== 0xffffff) {
        this.bodyImage.setTint(this.baseSpriteTint);
      }
      bodyObj = this.bodyImage;
    } else {
      const bodyColor = config.tint ?? BODY_COLORS[config.type];
      this.bodyRect = new Phaser.GameObjects.Rectangle(
        this.scene, 0, 0, bodySize, bodySize, bodyColor,
      );
      bodyObj = this.bodyRect;
    }

    const hpBg = new Phaser.GameObjects.Rectangle(
      this.scene, 0, barOffY, barW, barH, 0x333333,
    );
    this._hpBarBg = hpBg;

    this.hpBarFill = new Phaser.GameObjects.Rectangle(
      this.scene,
      -(barW / 2),
      barOffY,
      barW,
      barH,
      isBoss ? BOSS_HP_BAR_COLOR : hpBarColor(1),
    );
    this.hpBarFill.setOrigin(0, 0.5);

    // ── Armour badge (armored creeps only) ───────────────────────────────────
    if (this.isArmored) {
      this.computeArmorBasePos();
      this.armorIndicator = new Phaser.GameObjects.Rectangle(
        this.scene, this.armorBaseX, this.armorBaseY,
        this.isBossCreep ? 12 : 8,
        this.isBossCreep ? 6 : 4,
        0xaaaacc,
      );
    }

    // ── Air creep visuals ─────────────────────────────────────────────────────
    // Body floats above ground position; shadow circle below shows actual position.
    if (config.type === 'air') {
      bodyObj.y = AIR_BODY_OFFSET_Y;

      // Shadow ellipse at the "ground" position (depth rendered before body)
      const shadow = new Phaser.GameObjects.Ellipse(
        this.scene, 0, 2,
        this.isBossCreep ? 44 : 22,
        this.isBossCreep ? 12 : 6,
        0x000000, 0.25,
      );

      if (useSprite) {
        // Sprite already includes wings — add only shadow + body + UI.
        if (this.armorIndicator) {
          this.add([shadow, bodyObj, this.armorIndicator, hpBg, this.hpBarFill]);
        } else {
          this.add([shadow, bodyObj, hpBg, this.hpBarFill]);
        }
      } else {
        // Rectangle fallback — add wing indicator rectangles on each side.
        const wingColor = 0x88bbff;
        const wx = this.isBossCreep ? 24 : 14;
        const wingY = AIR_BODY_OFFSET_Y;
        const leftWing  = new Phaser.GameObjects.Rectangle(
          this.scene, -wx, wingY, AIR_WING_W, AIR_WING_H, wingColor, 0.75,
        );
        const rightWing = new Phaser.GameObjects.Rectangle(
          this.scene,  wx, wingY, AIR_WING_W, AIR_WING_H, wingColor, 0.75,
        );
        if (this.armorIndicator) {
          this.add([shadow, leftWing, rightWing, bodyObj, this.armorIndicator, hpBg, this.hpBarFill]);
        } else {
          this.add([shadow, leftWing, rightWing, bodyObj, hpBg, this.hpBarFill]);
        }
      }
      return;
    }

    if (this.armorIndicator) {
      this.add([bodyObj, this.armorIndicator, hpBg, this.hpBarFill]);
    } else {
      this.add([bodyObj, hpBg, this.hpBarFill]);
    }
  }

  /**
   * Apply flip / rotation / size to the body object based on the current
   * movement direction.  Also repositions the armour badge.
   *
   * • Rectangle body: resize to wider (horizontal) or taller (vertical).
   * • Image body: flipX for left, ±90° rotation for up/down; displaySize
   *   uses horizontal proportions so rotation produces the taller silhouette.
   */
  private updateDirectionalVisual(): void {
    const isHoriz = this.direction === 'left' || this.direction === 'right';

    if (this.bodyImage) {
      // Sprite path — rotation + flipX
      this.bodyImage.flipX = this.direction === 'left';
      if (isHoriz) {
        this.bodyImage.setRotation(0);
      } else {
        this.bodyImage.setRotation(
          this.direction === 'down' ? Math.PI / 2 : -Math.PI / 2,
        );
      }
      // Always use horizontal display dimensions; 90° rotation produces the
      // taller silhouette without needing a separate vertical texture.
      this.bodyImage.setDisplaySize(
        this.isBossCreep ? BOSS_HORIZ_W : BODY_HORIZ_W,
        this.isBossCreep ? BOSS_HORIZ_H : BODY_HORIZ_H,
      );
    } else if (this.bodyRect) {
      // Rectangle path — resize (no rotation; shape change achieves the effect)
      const w = isHoriz
        ? (this.isBossCreep ? BOSS_HORIZ_W : BODY_HORIZ_W)
        : (this.isBossCreep ? BOSS_VERT_W  : BODY_VERT_W);
      const h = isHoriz
        ? (this.isBossCreep ? BOSS_HORIZ_H : BODY_HORIZ_H)
        : (this.isBossCreep ? BOSS_VERT_H  : BODY_VERT_H);
      this.bodyRect.setSize(w, h);
    }

    // Reposition the armour badge to the new leading edge.
    if (this.armorIndicator) {
      this.computeArmorBasePos();
      this.armorIndicator.x = this.armorBaseX;
      this.armorIndicator.y = this.armorBaseY;
    }
  }

  /**
   * Compute the armour indicator base position into cached fields, avoiding
   * a tuple allocation on every frame.
   */
  private computeArmorBasePos(): void {
    const offset = this.isBossCreep ? 28 : 16;
    switch (this.direction) {
      case 'right': this.armorBaseX =  offset; this.armorBaseY = 0;      break;
      case 'left':  this.armorBaseX = -offset; this.armorBaseY = 0;      break;
      case 'down':  this.armorBaseX = 0;       this.armorBaseY =  offset; break;
      case 'up':    this.armorBaseX = 0;       this.armorBaseY = -offset; break;
    }
  }

  private refreshStatusVisual(): void {
    const slowed   = this.slowFactor < 1.0;
    const poisoned = this.dotStacks > 0;
    const burning  = this._burnActive;
    const shocked  = this._teslaShockedMs > 0;
    const shredded = this.damageAmpPct > 0;

    // ── Body base tint (backwards-compatible colour blending) ─────────────────
    if (this.bodyImage) {
      if (slowed && poisoned) {
        this.bodyImage.setTint(0x44aaaa);
      } else if (slowed) {
        this.bodyImage.setTint(this.shatterActive ? 0xbbd8ff : 0x4488ff);
      } else if (poisoned) {
        this.bodyImage.setTint(0x44ff66);
      } else if (burning) {
        this.bodyImage.setTint(0xff8833);
      } else {
        if (this.baseSpriteTint !== 0xffffff) {
          this.bodyImage.setTint(this.baseSpriteTint);
        } else {
          this.bodyImage.clearTint();
        }
      }
    } else if (this.bodyRect) {
      if (slowed && poisoned) {
        this.bodyRect.setFillStyle(0x44aaaa);
      } else if (slowed) {
        this.bodyRect.setFillStyle(this.shatterActive ? 0xbbd8ff : 0x4488ff);
      } else if (poisoned) {
        this.bodyRect.setFillStyle(0x44ff66);
      } else if (burning) {
        this.bodyRect.setFillStyle(0xff8833);
      } else {
        this.bodyRect.setFillStyle(this.baseBodyColor);
      }
    }

    // ── Poison overlay + particles ────────────────────────────────────────────
    this._syncOverlay(
      'poison', poisoned,
      poisonOverlayAlpha(this.dotStacks),
      EFFECT_CONFIGS.poison.tintColor,
    );
    this._syncParticles(
      'poison', poisoned,
      poisonParticleCount(this.dotStacks),
      EFFECT_CONFIGS.poison,
    );

    // ── Frost overlay + ring + particles ──────────────────────────────────────
    this._syncOverlay(
      'frost', slowed,
      frostOverlayAlpha(this.shatterActive),
      EFFECT_CONFIGS.frost.tintColor,
    );
    this._syncFrostRing(slowed, this.shatterActive);
    this._syncParticles(
      'frost', slowed,
      slowed ? EFFECT_CONFIGS.frost.particleCount : 0,
      EFFECT_CONFIGS.frost,
    );

    // ── Burn overlay + particles ───────────────────────────────────────────────
    this._syncOverlay(
      'burn', burning,
      EFFECT_CONFIGS.burn.tintAlpha,
      EFFECT_CONFIGS.burn.tintColor,
    );
    this._syncParticles(
      'burn', burning,
      burning ? EFFECT_CONFIGS.burn.particleCount : 0,
      EFFECT_CONFIGS.burn,
    );

    // ── Tesla overlay + particles ─────────────────────────────────────────────
    this._syncOverlay(
      'tesla', shocked,
      EFFECT_CONFIGS.tesla.tintAlpha,
      EFFECT_CONFIGS.tesla.tintColor,
    );
    this._syncParticles(
      'tesla', shocked,
      shocked ? EFFECT_CONFIGS.tesla.particleCount : 0,
      EFFECT_CONFIGS.tesla,
    );

    // ── Armor-shred overlay (no particles) ────────────────────────────────────
    this._syncOverlay(
      'armorShred', shredded,
      EFFECT_CONFIGS.armorShred.tintAlpha,
      EFFECT_CONFIGS.armorShred.tintColor,
    );

    // ── Status icon bar ───────────────────────────────────────────────────────
    this._drawIconBar(poisoned, slowed, burning, shocked, shredded);
  }

  // ── Status effect visual helpers ──────────────────────────────────────────

  /**
   * Show or hide the semi-transparent tint overlay for the given effect.
   * Overlays are inserted into the container BEFORE the HP bar so the HP bar
   * always renders on top.
   */
  private _syncOverlay(
    key:    StatusEffectKey,
    active: boolean,
    alpha:  number,
    color:  number,
  ): void {
    let overlay = this._effectOverlays.get(key);

    if (active) {
      if (!overlay) {
        const bodyW = this.isBossCreep ? 58 : 32;
        const bodyH = this.isBossCreep ? 42 : 26;
        overlay = new Phaser.GameObjects.Rectangle(
          this.scene, 0, 0, bodyW, bodyH, color, alpha,
        );
        // Insert before hpBarBg so the HP bar always renders above the overlay.
        const insertIdx = Math.max(0, this.getIndex(this._hpBarBg));
        this.addAt(overlay, insertIdx);
        this._effectOverlays.set(key, overlay);
      } else {
        overlay.setFillStyle(color);
        overlay.setAlpha(alpha);
        overlay.setVisible(true);
      }
    } else if (overlay) {
      overlay.setVisible(false);
      overlay.setAlpha(0);
    }
  }

  /**
   * Ensure the correct number of particle arcs exist for the given effect.
   * Existing particles are kept (and re-enabled); excess ones are hidden.
   */
  private _syncParticles(
    key:     StatusEffectKey,
    active:  boolean,
    count:   number,
    config:  StatusEffectVisualConfig,
  ): void {
    if (!active || count === 0) {
      const existing = this._effectParticles.get(key);
      if (existing) {
        for (const p of existing) p.arc.setVisible(false).setAlpha(0);
      }
      return;
    }

    let pool = this._effectParticles.get(key);
    if (!pool) {
      pool = [];
      this._effectParticles.set(key, pool);
    }

    // Allocate new arcs if the pool is too small.
    while (pool.length < count) {
      const arc = new Phaser.GameObjects.Arc(
        this.scene, 0, 0,
        this.isBossCreep ? 4 : 2.5,
        0, 360, false,
        config.particleColor, 0,
      );
      this.add(arc);
      const slot = pool.length;
      const speed = 1 / (config.particleLifeMs * (0.7 + 0.3 * Math.random()));
      const baseX = (Math.random() - 0.5) * (this.isBossCreep ? 44 : 22);
      const riseY = this.isBossCreep ? -16 : -11;
      const drift = (Math.random() - 0.5) * 8;
      pool.push({
        arc,
        // Stagger phases so particles don't all flash simultaneously.
        phase:  slot / Math.max(1, count),
        speed,
        baseX,
        riseY,
        drift,
      });
    }

    // Show the right number; hide excess.
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (i < count) {
        p.arc.setFillStyle(config.particleColor);
        p.arc.setVisible(true);
      } else {
        p.arc.setVisible(false).setAlpha(0);
      }
    }
  }

  /**
   * Show or remove the frost ring beneath the creep body.
   * The ring is inserted at index 0 of the container so it renders behind
   * the body sprite.
   */
  private _syncFrostRing(active: boolean, shatter: boolean): void {
    if (active) {
      if (!this._frostRingGfx) {
        this._frostRingGfx = new Phaser.GameObjects.Graphics(this.scene);
        this.addAt(this._frostRingGfx, 0);
      }
      const gfx   = this._frostRingGfx;
      const radius = this.isBossCreep ? 32 : 20;
      const color  = shatter ? 0xddf0ff : 0x88ccff;
      const alpha  = shatter ? 0.6 : 0.4;
      gfx.clear();
      gfx.setVisible(true);
      // Outer ring
      gfx.lineStyle(shatter ? 3 : 2, color, alpha);
      gfx.strokeCircle(0, 0, radius);
      // Inner translucent fill for shatter
      if (shatter) {
        gfx.fillStyle(color, 0.12);
        gfx.fillCircle(0, 0, radius);
      }
    } else if (this._frostRingGfx) {
      this._frostRingGfx.setVisible(false);
    }
  }

  /**
   * Redraw the status icon bar above the HP bar.
   * Shows a small coloured dot for each active effect.
   */
  private _drawIconBar(
    poisoned: boolean,
    slowed:   boolean,
    burning:  boolean,
    shocked:  boolean,
    shredded: boolean,
  ): void {
    const keys = activeEffectKeys(poisoned, slowed, burning, shocked, shredded);

    if (keys.length === 0) {
      this._iconBarGfx?.setVisible(false);
      return;
    }

    if (!this._iconBarGfx) {
      this._iconBarGfx = new Phaser.GameObjects.Graphics(this.scene);
      this.add(this._iconBarGfx);
    }
    const gfx = this._iconBarGfx;
    gfx.clear();
    gfx.setVisible(true);

    const spacing = ICON_RADIUS * 2 + 2;
    const totalW  = keys.length * spacing - 2;
    const startX  = -totalW / 2 + ICON_RADIUS;
    const y       = ICON_BAR_OFFSET_Y;

    for (let i = 0; i < keys.length; i++) {
      const color = ICON_COLORS[keys[i]];
      const cx = startX + i * spacing;
      gfx.fillStyle(0x000000, 0.55);
      gfx.fillCircle(cx, y, ICON_RADIUS + 1);
      gfx.fillStyle(color, 1);
      gfx.fillCircle(cx, y, ICON_RADIUS);
    }
  }

  /**
   * Advance all active particle animations by `delta` ms.
   * Called every frame from step().
   */
  private _stepParticles(delta: number): void {
    for (const [, pool] of this._effectParticles) {
      for (const p of pool) {
        if (!p.arc.visible) continue;

        p.phase += p.speed * delta;
        if (p.phase >= 1) {
          // Reset — pick a new spawn position and stagger slightly.
          p.phase  = p.phase - 1; // carry over fractional part
          p.baseX  = (Math.random() - 0.5) * (this.isBossCreep ? 44 : 22);
          p.drift  = (Math.random() - 0.5) * 8;
        }

        const t     = p.phase;
        const alpha = Math.sin(t * Math.PI);
        const localY = p.riseY * t;
        const localX = p.baseX + p.drift * t;

        p.arc.setPosition(localX, localY);
        p.arc.setAlpha(alpha);
      }
    }
  }
}
