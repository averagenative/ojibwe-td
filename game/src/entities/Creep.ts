import Phaser from 'phaser';
import { tickRegen } from '../data/bossDefs';

// Re-export so existing imports from Creep.ts still work.
export { tickRegen };

export type CreepType = 'ground' | 'air';

/**
 * Boss mechanic tag — must match the `bossAbility` field in BossDef.
 * Defined here (not in bossDefs.ts) to avoid circular runtime imports.
 */
export type BossAbility = 'armored' | 'slow-immune' | 'split' | 'regen';

export interface CreepConfig {
  hp:     number;
  speed:  number;   // pixels per second (base, before status effects)
  type:   CreepType;
  reward: number;   // gold on kill
  isArmored?: boolean; // optional; defaults to false

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

const BODY_COLORS: Record<CreepType, number> = {
  ground: 0x22cc55,
  air:    0x4488ff,
};

// Normal creep HP-bar dimensions
const HP_BAR_WIDTH  = 30;
const HP_BAR_HEIGHT = 4;
const HP_BAR_OFFSET_Y = -20;

// Boss HP-bar dimensions (larger, visible across the map)
const BOSS_HP_BAR_WIDTH    = 64;
const BOSS_HP_BAR_HEIGHT   = 8;
const BOSS_HP_BAR_OFFSET_Y = -36;

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

  private bodyRect!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private readonly hpBarMaxWidth: number;
  /** Stored separately so status-effect color changes don't lose the tint. */
  private readonly baseBodyColor: number;

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

    this.buildVisuals(config);
    scene.add.existing(this);
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
        this.hpBarFill.width = this.hpBarMaxWidth * (this.hp / this.maxHp);
      }
      this.regenCooldownMs = result.regenCooldownMs;
    }

    if (this.waypointIndex >= this.waypoints.length) {
      this.emit('reached-exit');
      this.setActive(false).setVisible(false);
      return;
    }

    const target = this.waypoints[this.waypointIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      this.waypointIndex++;
      return;
    }

    const effectiveSpeed = this.baseSpeed * this.speedMultiplier;
    const step = (effectiveSpeed * delta) / 1000;
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  // ── combat ────────────────────────────────────────────────────────────────

  takeDamage(amount: number): void {
    if (!this.active) return;

    // Apply armor (Makwa): reduces incoming damage.
    const afterArmor = amount * (1 - this.physicalResistPct);
    // Apply armor-shred damage amplification (Cannon-A counters Makwa's armor).
    const amplified = afterArmor * (1 + this.damageAmpPct);

    this.hp = Math.max(0, this.hp - amplified);
    this.hpBarFill.width = this.hpBarMaxWidth * (this.hp / this.maxHp);

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

  /** True while any slow is active (used by Frost shatter logic). */
  isSlowed(): boolean {
    return this.slowFactor < 1.0;
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
    if (this.slowImmune) return; // Migizi: immune to slow/freeze

    this.slowFactor = Math.min(this.slowFactor, factor);
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
    if (this.poisonImmune) return; // Animikiins: immune to DoT

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

    this.shredTimer?.destroy();
    this.shredTimer = this.scene.time.addEvent({
      delay: durationMs,
      callback: () => {
        if (!this.active) return;
        this.damageAmpPct = 0;
      },
    });
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
    for (const t of this.dotTimers) t.destroy();
    this.dotTimers = [];
    super.destroy(fromScene);
  }

  // ── private ───────────────────────────────────────────────────────────────

  private buildVisuals(config: CreepConfig): void {
    const isBoss   = this.isBossCreep;
    const bodySize = isBoss ? 48 : 24;
    const barW     = this.hpBarMaxWidth;
    const barH     = isBoss ? BOSS_HP_BAR_HEIGHT   : HP_BAR_HEIGHT;
    const barOffY  = isBoss ? BOSS_HP_BAR_OFFSET_Y : HP_BAR_OFFSET_Y;
    const bodyColor = config.tint ?? BODY_COLORS[config.type];

    this.bodyRect = new Phaser.GameObjects.Rectangle(
      this.scene, 0, 0, bodySize, bodySize, bodyColor,
    );

    const hpBg = new Phaser.GameObjects.Rectangle(
      this.scene, 0, barOffY, barW, barH, 0x333333,
    );

    this.hpBarFill = new Phaser.GameObjects.Rectangle(
      this.scene,
      -(barW / 2),
      barOffY,
      barW,
      barH,
      0x00ff44,
    );
    this.hpBarFill.setOrigin(0, 0.5);

    this.add([this.bodyRect, hpBg, this.hpBarFill]);
  }

  private refreshStatusVisual(): void {
    const slowed   = this.slowFactor < 1.0;
    const poisoned = this.dotStacks > 0;

    if (slowed && poisoned) {
      this.bodyRect.setFillStyle(0x44aaaa); // teal: both
    } else if (slowed) {
      this.bodyRect.setFillStyle(0x4488ff); // blue: slowed
    } else if (poisoned) {
      this.bodyRect.setFillStyle(0x44ff66); // bright green: poisoned
    } else {
      // Restore the base color (boss tint or normal type color).
      this.bodyRect.setFillStyle(this.baseBodyColor);
    }
  }
}
