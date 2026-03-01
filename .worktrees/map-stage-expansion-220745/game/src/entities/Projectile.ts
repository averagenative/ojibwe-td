import Phaser from 'phaser';
import { Creep } from './Creep';

export interface ProjectileOptions {
  color?:       number;  // fill colour, default yellow
  radius?:      number;  // dot radius, default 5
  speed:        number;  // px/s
  damage:       number;
  /** If set, deals AoE damage to all creeps within this radius on arrival */
  splashRadius?: number;
  /** If true, AoE skips air creeps (Mortar) */
  groundOnly?:   boolean;
  /** Extra per-hit effect applied to each struck creep (slow, DoT, …) */
  onHit?:        (creep: Creep) => void;
  /** Required when splashRadius is set */
  getCreeps?:    () => ReadonlySet<Creep>;
  /**
   * Called when a position-target projectile arrives at its destination.
   * Used by Mortar cluster submunitions (Mortar C upgrade).
   */
  onImpact?:     (x: number, y: number) => void;
}

/**
 * A projectile that either tracks a Creep or travels to a fixed world position.
 *
 * - Pass a `Creep` as `target` for homing behaviour (Cannon, Frost, Poison, Tesla).
 * - Pass `{ x, y }` for a position shot (Mortar — fires at where the creep was).
 */
export class Projectile extends Phaser.GameObjects.Arc {
  private readonly targetCreep: Creep | null;
  private readonly targetPos:   { x: number; y: number } | null;
  private readonly opts:        ProjectileOptions;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Creep | { x: number; y: number },
    opts: ProjectileOptions,
  ) {
    super(scene, x, y, opts.radius ?? 5, 0, 360, false, opts.color ?? 0xffdd00);
    this.opts = opts;

    if (target instanceof Creep) {
      this.targetCreep = target;
      this.targetPos   = null;
    } else {
      this.targetCreep = null;
      this.targetPos   = target;
    }

    scene.add.existing(this);
    this.setDepth(20);
  }

  step(delta: number): void {
    if (!this.active) return;

    if (this.targetPos) {
      this.stepToPosition(delta);
    } else {
      this.stepToCreep(delta);
    }
  }

  // ── movement ──────────────────────────────────────────────────────────────

  private stepToCreep(delta: number): void {
    const creep = this.targetCreep!;
    if (!creep.active) { this.destroy(); return; }

    const dx   = creep.x - this.x;
    const dy   = creep.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = (this.opts.speed * delta) / 1000;

    if (dist <= step) {
      this.hitCreep(creep);
      this.destroy();
      return;
    }

    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  private stepToPosition(delta: number): void {
    const pos  = this.targetPos!;
    const dx   = pos.x - this.x;
    const dy   = pos.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = (this.opts.speed * delta) / 1000;

    if (dist <= step) {
      this.arriveAtPosition(pos.x, pos.y);
      this.destroy();
      return;
    }

    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  // ── impact ────────────────────────────────────────────────────────────────

  private hitCreep(creep: Creep): void {
    creep.takeDamage(this.opts.damage);
    this.opts.onHit?.(creep);

    if (this.opts.splashRadius) {
      this.applyAoe(creep.x, creep.y);
    }
  }

  private arriveAtPosition(cx: number, cy: number): void {
    if (this.opts.splashRadius) {
      this.applyAoe(cx, cy);
      this.splashVisual(cx, cy);
    }
    this.opts.onImpact?.(cx, cy);
  }

  private applyAoe(cx: number, cy: number): void {
    if (!this.opts.getCreeps || !this.opts.splashRadius) return;
    const r = this.opts.splashRadius;

    for (const creep of this.opts.getCreeps()) {
      if (!creep.active) continue;
      if (this.opts.groundOnly && creep.creepType === 'air') continue;

      const dx = creep.x - cx;
      const dy = creep.y - cy;
      if (Math.sqrt(dx * dx + dy * dy) <= r) {
        creep.takeDamage(this.opts.damage);
        this.opts.onHit?.(creep);
      }
    }
  }

  private splashVisual(cx: number, cy: number): void {
    const r     = this.opts.splashRadius ?? 40;
    const color = this.opts.color ?? 0xff8800;

    const ring = this.scene.add.graphics();
    ring.lineStyle(3, color, 0.9);
    ring.strokeCircle(cx, cy, 8);
    ring.setDepth(25);

    const fill = this.scene.add.circle(cx, cy, r, color, 0.3);
    fill.setDepth(24);

    this.scene.tweens.add({
      targets: [ring, fill],
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 280,
      onComplete: () => { ring.destroy(); fill.destroy(); },
    });
  }
}
