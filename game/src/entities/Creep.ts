import Phaser from 'phaser';

export type CreepType = 'ground' | 'air';

export interface CreepConfig {
  hp: number;
  speed: number;   // pixels per second (base, before status effects)
  type: CreepType;
  reward: number;  // gold on kill
}

interface Waypoint {
  x: number;
  y: number;
}

const BODY_COLORS: Record<CreepType, number> = {
  ground: 0x22cc55,
  air:    0x4488ff,
};

const HP_BAR_WIDTH  = 30;
const HP_BAR_HEIGHT = 4;
const HP_BAR_OFFSET_Y = -20;

export class Creep extends Phaser.GameObjects.Container {
  public readonly maxHp: number;
  public readonly reward: number;
  public readonly creepType: CreepType;

  private hp: number;
  private baseSpeed: number;
  private speedMultiplier = 1.0; // modified by slow effects
  private waypoints: Waypoint[];
  private waypointIndex = 1; // index 0 is spawn

  private bodyRect!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;

  // ── status effects ────────────────────────────────────────────────────────
  private slowFactor  = 1.0; // 1 = full speed
  private slowTimer?: Phaser.Time.TimerEvent;
  private dotStacks   = 0;
  private dotTimers: Phaser.Time.TimerEvent[] = [];

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
    this.waypoints = waypoints;

    this.buildVisuals(config.type);
    scene.add.existing(this);
  }

  // ── update ────────────────────────────────────────────────────────────────

  step(delta: number): void {
    if (!this.active) return;

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
    this.hp = Math.max(0, this.hp - amount);
    this.hpBarFill.width = HP_BAR_WIDTH * (this.hp / this.maxHp);

    if (this.hp <= 0) {
      this.setActive(false).setVisible(false);
      this.emit('died', this);
      this.destroy();
    }
  }

  getHpRatio(): number {
    return this.hp / this.maxHp;
  }

  // ── status effects ────────────────────────────────────────────────────────

  /**
   * Apply a slow that reduces movement speed.
   * Multiple calls take the strongest slow (lowest factor).
   * @param factor     0–1 speed multiplier (e.g. 0.5 = half speed)
   * @param durationMs How long the slow lasts
   */
  applySlow(factor: number, durationMs: number): void {
    if (!this.active) return;
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.speedMultiplier = this.slowFactor;
    this.refreshStatusVisual();

    this.slowTimer?.destroy();
    this.slowTimer = this.scene.time.addEvent({
      delay: durationMs,
      callback: () => {
        if (!this.active) return;
        this.slowFactor = 1.0;
        this.speedMultiplier = 1.0;
        this.refreshStatusVisual();
      },
    });
  }

  /**
   * Apply a poison DoT stack. Each stack ticks independently.
   * @param damage     Damage per tick
   * @param tickMs     Ms between ticks
   * @param ticks      Number of ticks before this stack expires
   */
  applyDot(damage: number, tickMs: number, ticks: number): void {
    if (!this.active) return;
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

  // ── lifecycle ─────────────────────────────────────────────────────────────

  destroy(fromScene?: boolean): void {
    this.slowTimer?.destroy();
    for (const t of this.dotTimers) t.destroy();
    this.dotTimers = [];
    super.destroy(fromScene);
  }

  // ── private ───────────────────────────────────────────────────────────────

  private buildVisuals(type: CreepType): void {
    this.bodyRect = new Phaser.GameObjects.Rectangle(
      this.scene, 0, 0, 24, 24, BODY_COLORS[type],
    );

    const hpBg = new Phaser.GameObjects.Rectangle(
      this.scene, 0, HP_BAR_OFFSET_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT, 0x333333,
    );

    this.hpBarFill = new Phaser.GameObjects.Rectangle(
      this.scene,
      -(HP_BAR_WIDTH / 2),
      HP_BAR_OFFSET_Y,
      HP_BAR_WIDTH,
      HP_BAR_HEIGHT,
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
      this.bodyRect.setFillStyle(BODY_COLORS[this.creepType]);
    }
  }
}
