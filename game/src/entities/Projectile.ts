import Phaser from 'phaser';
import { Creep } from './Creep';
import type { TrailPool } from '../systems/TrailPool';

export interface ProjectileOptions {
  color?:       number;  // fill colour, default yellow
  radius?:      number;  // dot radius, default 5
  speed:        number;  // px/s
  /** Multiplier applied to speed (e.g. 1.25 = 25% faster). Default 1.0. */
  speedMult?:   number;
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
   * Used by Rock Hurler cluster submunitions (Cluster C upgrade).
   */
  onImpact?:     (x: number, y: number) => void;
  /**
   * Tower type key — drives trail colour and impact visual style.
   * Recognised values: 'rock-hurler' | 'frost' | 'poison' | 'tesla' | 'aura' | 'arrow'
   */
  towerKey?:     string;
}

/** Interval between trail particle emissions (ms game-time). */
const TRAIL_INTERVAL_MS = 30;
/** How long each trail particle fully fades (ms). */
const TRAIL_LIFE_MS     = 180;

/** Trail colours keyed by tower type. */
const TRAIL_COLORS: Record<string, number> = {
  'rock-hurler': 0xcc9944,
  frost:         0x88ccff,
  poison:        0x44ff88,
  arrow:         0xc4a265,
};

/**
 * A projectile that either tracks a Creep or travels to a fixed world position.
 *
 * - Pass a `Creep` as `target` for homing behaviour (Arrow, Frost, Poison, Tesla).
 * - Pass `{ x, y }` for a position shot (Rock Hurler — fires at where the creep was).
 */
export class Projectile extends Phaser.GameObjects.Arc {
  private readonly targetCreep: Creep | null;
  private readonly targetPos:   { x: number; y: number } | null;
  private readonly opts:        ProjectileOptions;

  /** World-space spawn position (tower center) — used by Tesla arc drawing. */
  private readonly spawnX: number;
  private readonly spawnY: number;

  private trailTimer     = 0;
  /** Lazy-initialised on first mortar step — original distance to target. */
  private mortarInitDist = -1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Creep | { x: number; y: number },
    opts: ProjectileOptions,
  ) {
    super(scene, x, y, opts.radius ?? 5, 0, 360, false, opts.color ?? 0xffdd00);
    this.opts   = opts;
    this.spawnX = x;
    this.spawnY = y;

    if (target instanceof Creep) {
      this.targetCreep = target;
      this.targetPos   = null;
    } else {
      this.targetCreep = null;
      this.targetPos   = target;
    }

    scene.add.existing(this);
    this.setDepth(20);

    // Tesla: hide the Arc — the visual is a lightning arc drawn on impact.
    if (opts.towerKey === 'tesla') this.setAlpha(0);
  }

  step(delta: number): void {
    if (!this.active) return;

    // Emit trail particles for towers that have visible projectiles.
    const key = this.opts.towerKey;
    if (key && key !== 'tesla' && key !== 'aura') {
      this.trailTimer += delta;
      if (this.trailTimer >= TRAIL_INTERVAL_MS) {
        this.trailTimer = 0;
        this.emitTrailParticle();
      }
    }

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
    const step = (this.opts.speed * (this.opts.speedMult ?? 1.0) * delta) / 1000;

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
    const step = (this.opts.speed * (this.opts.speedMult ?? 1.0) * delta) / 1000;

    // Rock Hurler arc: scale the projectile up at mid-flight to simulate a lobbed trajectory.
    if (this.opts.towerKey === 'rock-hurler') {
      if (this.mortarInitDist < 0) this.mortarInitDist = dist;
      if (this.mortarInitDist > 0) {
        const t = 1 - dist / this.mortarInitDist;        // 0 at launch → 1 at impact
        this.setScale(1 + Math.sin(Math.max(0, t) * Math.PI) * 0.55);
      }
    }

    if (dist <= step) {
      this.setScale(1);
      this.arriveAtPosition(pos.x, pos.y);
      this.destroy();
      return;
    }

    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  // ── impact ────────────────────────────────────────────────────────────────

  private hitCreep(creep: Creep): void {
    // Apply on-hit effects BEFORE damage so that flags set by onHit (e.g. frost
    // shatterActive) are in place when takeDamage fires the 'creep-died-poisoned'
    // event on a lethal hit.  If the hit is non-lethal the order has no observable
    // difference.
    this.opts.onHit?.(creep);
    creep.takeDamage(this.opts.damage);

    if (this.opts.splashRadius) {
      this.applyAoe(creep.x, creep.y);
    }

    this.showImpactEffect(creep.x, creep.y);

    // Tesla: draw the tower → primary-target lightning arc on impact.
    if (this.opts.towerKey === 'tesla') {
      this.drawLightningArc(this.spawnX, this.spawnY, creep.x, creep.y);
    }
  }

  private arriveAtPosition(cx: number, cy: number): void {
    if (this.opts.splashRadius) {
      this.applyAoe(cx, cy);
      this.splashVisual(cx, cy);
    }
    this.opts.onImpact?.(cx, cy);
    this.showImpactEffect(cx, cy);
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
        // Apply on-hit effects before damage for the same reason as hitCreep():
        // status flags set by onHit must be in place before takeDamage fires any
        // death events.
        this.opts.onHit?.(creep);
        creep.takeDamage(this.opts.damage);
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

  // ── trail & impact visuals ────────────────────────────────────────────────

  private emitTrailParticle(): void {
    const color = TRAIL_COLORS[this.opts.towerKey ?? ''] ?? 0xffffff;

    // Fast path: reuse a pooled arc from TrailPool — no GC, no Tween object.
    // GameScene sets 'trailPool' on scene.data during create() and removes it
    // on shutdown(), so this is safe to access via optional chaining.
    const pool = this.scene.data?.get('trailPool') as TrailPool | undefined;
    if (pool) {
      pool.emit(this.x, this.y, 2, color, 0.65, 18, TRAIL_LIFE_MS);
      return;
    }

    // Fallback: original tween-based circle (used in scenes without a pool,
    // e.g. unit-test stubs or future scenes that don't init GameScene pools).
    const dot = this.scene.add.circle(this.x, this.y, 2, color, 0.65);
    dot.setDepth(18);
    this.scene.tweens.add({
      targets:    dot,
      alpha:      0,
      duration:   TRAIL_LIFE_MS,
      onComplete: () => dot.destroy(),
    });
  }

  private showImpactEffect(cx: number, cy: number): void {
    switch (this.opts.towerKey) {
      case 'arrow':       this.impactArrowStick(cx, cy);       break;
      case 'rock-hurler': this.impactRockDebris(cx, cy);      break;
      case 'frost':       this.impactFrostBurst(cx, cy);      break;
      case 'poison':      this.impactPoisonSplatter(cx, cy);  break;
      // tesla: primary arc drawn via drawLightningArc() in hitCreep()
      // aura:  no impact effect (no projectile)
      default: break;
    }
  }

  /** Rock Hurler impact: dust + debris particles scatter outward. */
  private impactRockDebris(cx: number, cy: number): void {
    for (let i = 0; i < 5; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const dist   = 8 + Math.random() * 10;
      const radius = 1.5 + Math.random() * 1.5;
      const dot    = this.scene.add.circle(cx, cy, radius, 0xbbaa88, 0.75);
      dot.setDepth(22);
      this.scene.tweens.add({
        targets:    dot,
        x:          cx + Math.cos(angle) * dist,
        y:          cy + Math.sin(angle) * dist,
        alpha:      0,
        duration:   150,
        ease:       'Power1',
        onComplete: () => dot.destroy(),
      });
    }
  }

  /** Frost impact: expanding burst ring and a sparkle cross. */
  private impactFrostBurst(cx: number, cy: number): void {
    // Expanding ring
    const ring = this.scene.add.graphics();
    ring.lineStyle(2, 0x88ccff, 0.9);
    ring.strokeCircle(cx, cy, 5);
    ring.setDepth(25);
    this.scene.tweens.add({
      targets:    ring,
      scaleX:     3.5,
      scaleY:     3.5,
      alpha:      0,
      duration:   180,
      ease:       'Power1',
      onComplete: () => ring.destroy(),
    });

    // Sparkle cross (ice-crystal hint)
    const spark = this.scene.add.graphics();
    spark.lineStyle(1.5, 0xcceeff, 0.85);
    spark.beginPath();
    spark.moveTo(cx - 5, cy); spark.lineTo(cx + 5, cy);
    spark.moveTo(cx, cy - 5); spark.lineTo(cx, cy + 5);
    spark.strokePath();
    spark.setDepth(25);
    this.scene.tweens.add({
      targets:    spark,
      alpha:      0,
      duration:   160,
      onComplete: () => spark.destroy(),
    });
  }

  /** Poison impact: 4 lingering splatter blobs around impact point. */
  private impactPoisonSplatter(cx: number, cy: number): void {
    for (let i = 0; i < 4; i++) {
      const bx   = cx + (Math.random() - 0.5) * 14;
      const by   = cy + (Math.random() - 0.5) * 14;
      const blob = this.scene.add.circle(bx, by, 2.5 + Math.random() * 2, 0x55ff99, 0.7);
      blob.setDepth(22);
      this.scene.tweens.add({
        targets:    blob,
        alpha:      0,
        duration:   130,
        delay:      100,    // linger briefly before fading — DoT visual cue
        onComplete: () => blob.destroy(),
      });
    }
  }

  /** Arrow impact: a brief stuck-arrow line that fades out quickly. */
  private impactArrowStick(cx: number, cy: number): void {
    const angle = Math.atan2(
      cy - this.spawnY,
      cx - this.spawnX,
    );
    const len = 8;
    const gfx = this.scene.add.graphics();
    gfx.setDepth(22);
    // Shaft stub
    gfx.lineStyle(2, 0xa08050, 0.85);
    gfx.beginPath();
    gfx.moveTo(
      cx - Math.cos(angle) * len,
      cy - Math.sin(angle) * len,
    );
    gfx.lineTo(cx, cy);
    gfx.strokePath();
    // Flint tip
    gfx.fillStyle(0x778888, 0.9);
    gfx.fillCircle(cx, cy, 1.5);
    this.scene.tweens.add({
      targets:    gfx,
      alpha:      0,
      duration:   200,
      onComplete: () => gfx.destroy(),
    });
  }

  /**
   * Jagged lightning arc between two world positions.
   * Used for the Tesla tower → primary-target strike (chain hits use the same
   * helper in Tower.ts).
   */
  private drawLightningArc(x1: number, y1: number, x2: number, y2: number): void {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(30);
    gfx.lineStyle(2, 0xffffff, 0.9);
    gfx.beginPath();
    gfx.moveTo(x1, y1);

    const mx1 = x1 + (x2 - x1) * 0.33 + (Math.random() - 0.5) * 18;
    const my1 = y1 + (y2 - y1) * 0.33 + (Math.random() - 0.5) * 18;
    const mx2 = x1 + (x2 - x1) * 0.66 + (Math.random() - 0.5) * 18;
    const my2 = y1 + (y2 - y1) * 0.66 + (Math.random() - 0.5) * 18;

    gfx.lineTo(mx1, my1);
    gfx.lineTo(mx2, my2);
    gfx.lineTo(x2, y2);
    gfx.strokePath();

    this.scene.tweens.add({
      targets:    gfx,
      alpha:      0,
      duration:   150,
      onComplete: () => gfx.destroy(),
    });
  }
}
