import Phaser from 'phaser';
import { Creep } from './Creep';
import type { TrailPool } from '../systems/TrailPool';
import { AudioManager } from '../systems/AudioManager';
import {
  PROJECTILE_VISUAL_CONFIGS,
  travelAngle,
  advanceTumble,
  ROCK_SIZE_VARIANTS,
} from '../data/projectileVisualDefs';

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

  // ── Shape graphics ────────────────────────────────────────────────────────
  /**
   * Optional separate Graphics object drawn on top of (or instead of) the Arc.
   * Created in constructor for tower types with custom shapes.
   * Destroyed in destroy() to prevent leaks.
   */
  private _shapeGfx:    Phaser.GameObjects.Graphics | null = null;
  /**
   * Optional sprite-based projectile (replaces _shapeGfx when a texture exists).
   * Uses proj-arrow, proj-rock, proj-frost, proj-poison textures.
   */
  private _shapeSprite: Phaser.GameObjects.Image | null = null;
  /** Current direction of travel in radians. Updated each step. */
  private _travelAngle  = 0;
  /**
   * Cumulative tumble rotation for Rock Hurler (radians).
   * Incremented per step independent of travel direction.
   */
  private _tumblePhase  = 0;

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

    // Build tower-specific shape graphics if applicable.
    this._buildShapeGfx();
  }

  // ── shape graphics ────────────────────────────────────────────────────────

  /** Map tower key → projectile sprite texture key (loaded in BootScene). */
  private static readonly SPRITE_KEYS: Record<string, string> = {
    arrow:         'proj-arrow',
    'rock-hurler': 'proj-rock',
    frost:         'proj-frost',
    poison:        'proj-poison',
  };

  private _buildShapeGfx(): void {
    const key = this.opts.towerKey;
    if (!key) return;

    const cfg = PROJECTILE_VISUAL_CONFIGS[key];
    if (!cfg || cfg.shape === 'none') return;

    // Hide the underlying Arc — the shape replaces it entirely.
    this.setAlpha(0);

    // Prefer sprite textures when available — fall back to procedural Graphics.
    const spriteKey = Projectile.SPRITE_KEYS[key];
    if (spriteKey && this.scene.textures.exists(spriteKey)) {
      this._shapeSprite = this.scene.add.image(this.x, this.y, spriteKey)
        .setDepth(20)
        .setOrigin(0.5);
      // Scale the 32×32 sprite to match the expected projectile visual size.
      const displaySize = cfg.size * 2.2;
      this._shapeSprite.setDisplaySize(displaySize, displaySize);

      // Poison blob: wobble tween on the sprite.
      if (cfg.shape === 'poison-blob') {
        this.scene.tweens.add({
          targets:  this._shapeSprite,
          scaleX:   this._shapeSprite.scaleX * 0.82,
          scaleY:   this._shapeSprite.scaleY * 1.18,
          duration: 160,
          yoyo:     true,
          repeat:   -1,
          ease:     'Sine.easeInOut',
        });
      }
      return;
    }

    // Fallback: procedural Graphics shapes.
    this._shapeGfx = this.scene.add.graphics();
    this._shapeGfx.setDepth(20);
    this._shapeGfx.setPosition(this.x, this.y);

    switch (cfg.shape) {
      case 'arrow':       this._drawArrow(cfg.size, cfg.color);       break;
      case 'rock':        this._drawRock(cfg.size, cfg.color);        break;
      case 'frost-shard': this._drawFrostShard(cfg.size, cfg.color);  break;
      case 'poison-blob': this._drawPoisonBlob(cfg.size, cfg.color);  break;
    }

    // Poison blob: add a looping scale wobble tween.
    if (cfg.shape === 'poison-blob') {
      this.scene.tweens.add({
        targets:  this._shapeGfx,
        scaleX:   0.82,
        scaleY:   1.18,
        duration: 160,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });
    }
  }

  /** Arrow: shaft + triangular arrowhead + small V-fletching at the rear.
   *  Drawn pointing right (angle = 0); rotated to face travel direction. */
  private _drawArrow(size: number, color: number): void {
    const gfx   = this._shapeGfx!;
    const shaft = size;           // half-shaft back from center
    const head  = size * 0.55;   // head forward from shaft tip
    const tipX  = shaft * 0.45;  // where shaft meets head base

    // Shaft
    gfx.lineStyle(2, color, 1.0);
    gfx.beginPath();
    gfx.moveTo(-shaft, 0);
    gfx.lineTo(tipX, 0);
    gfx.strokePath();

    // Arrowhead triangle (filled)
    gfx.fillStyle(color, 1.0);
    gfx.beginPath();
    gfx.moveTo(tipX, -head * 0.38);
    gfx.lineTo(tipX,  head * 0.38);
    gfx.lineTo(tipX + head, 0);
    gfx.closePath();
    gfx.fillPath();

    // Fletching: V shape at rear end
    const fletchColor = 0x8b6000;
    gfx.lineStyle(1.5, fletchColor, 0.85);
    gfx.beginPath();
    gfx.moveTo(-shaft, -head * 0.45);
    gfx.lineTo(-shaft + size * 0.25, 0);
    gfx.lineTo(-shaft, head * 0.45);
    gfx.strokePath();
  }

  /**
   * Rock: rough irregular polygon with a slight brown shading.
   * A random size variant is picked per-instance for visual variety.
   */
  private _drawRock(baseSize: number, color: number): void {
    const gfx = this._shapeGfx!;
    // Pick one of 3 size variants for variety.
    const variant = ROCK_SIZE_VARIANTS[Math.floor(Math.random() * ROCK_SIZE_VARIANTS.length)];
    const r = baseSize + variant;

    // Fixed angular offsets make it look like a natural rock, not a circle.
    // 8 points; each point has a fixed radial deviation to produce an irregular shape.
    const pts: Array<{ x: number; y: number }> = [
      { x: r * 0.85 * Math.cos(0),                y: r * 0.70 * Math.sin(0) },
      { x: r * 1.00 * Math.cos(Math.PI * 0.28),   y: r * 0.90 * Math.sin(Math.PI * 0.28) },
      { x: r * 0.70 * Math.cos(Math.PI * 0.55),   y: r * 1.00 * Math.sin(Math.PI * 0.55) },
      { x: r * 0.90 * Math.cos(Math.PI * 0.80),   y: r * 0.80 * Math.sin(Math.PI * 0.80) },
      { x: r * 0.80 * Math.cos(Math.PI),          y: r * 0.85 * Math.sin(Math.PI) },
      { x: r * 1.00 * Math.cos(Math.PI * 1.25),   y: r * 0.95 * Math.sin(Math.PI * 1.25) },
      { x: r * 0.75 * Math.cos(Math.PI * 1.55),   y: r * 1.00 * Math.sin(Math.PI * 1.55) },
      { x: r * 0.90 * Math.cos(Math.PI * 1.80),   y: r * 0.75 * Math.sin(Math.PI * 1.80) },
    ];

    gfx.fillStyle(color, 1.0);
    gfx.beginPath();
    gfx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i].x, pts[i].y);
    gfx.closePath();
    gfx.fillPath();

    // Dark outline for depth
    gfx.lineStyle(1.5, 0x7a5c28, 0.8);
    gfx.beginPath();
    gfx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i].x, pts[i].y);
    gfx.closePath();
    gfx.strokePath();

    // Highlight facet (top-left bright streak)
    gfx.lineStyle(1, 0xffeebb, 0.45);
    gfx.beginPath();
    gfx.moveTo(-r * 0.3, -r * 0.55);
    gfx.lineTo(r * 0.15, -r * 0.2);
    gfx.strokePath();
  }

  /** Frost shard: 6-pointed ice crystal formed by three crossing lines. */
  private _drawFrostShard(size: number, color: number): void {
    const gfx = this._shapeGfx!;
    const r   = size;
    const inner = r * 0.45; // inner notch radius

    // 3 main axes at 0°, 60°, 120°
    gfx.lineStyle(2.5, color, 0.95);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      gfx.beginPath();
      gfx.moveTo(-Math.cos(a) * r, -Math.sin(a) * r);
      gfx.lineTo( Math.cos(a) * r,  Math.sin(a) * r);
      gfx.strokePath();
    }

    // Small barbs on each arm (6 arms × 2 barbs each)
    gfx.lineStyle(1.2, 0xcceeff, 0.75);
    for (let i = 0; i < 6; i++) {
      const a    = (i * Math.PI) / 3;
      const bx   = Math.cos(a) * inner;
      const by   = Math.sin(a) * inner;
      const perp = a + Math.PI / 2;
      const bl   = r * 0.28; // barb length
      gfx.beginPath();
      gfx.moveTo(bx + Math.cos(perp) * bl, by + Math.sin(perp) * bl);
      gfx.lineTo(bx, by);
      gfx.lineTo(bx - Math.cos(perp) * bl, by - Math.sin(perp) * bl);
      gfx.strokePath();
    }

    // Centre dot
    gfx.fillStyle(0xddf4ff, 0.9);
    gfx.fillCircle(0, 0, 2);
  }

  /** Poison blob: round body with a small drip, bright toxic green. */
  private _drawPoisonBlob(size: number, color: number): void {
    const gfx = this._shapeGfx!;
    const rx  = size;
    const ry  = size * 1.15;

    // Main blob body (slightly oval)
    gfx.fillStyle(color, 0.9);
    gfx.fillEllipse(0, 0, rx * 2, ry * 2);

    // Drip at bottom
    gfx.fillStyle(color, 0.7);
    gfx.fillCircle(0, ry, size * 0.38);

    // Bright highlight
    gfx.fillStyle(0xaaffcc, 0.55);
    gfx.fillCircle(-size * 0.3, -size * 0.35, size * 0.3);

    // Dark edge
    gfx.lineStyle(1, 0x22aa55, 0.6);
    gfx.strokeEllipse(0, 0, rx * 2, ry * 2);
  }

  // ── shape sync ────────────────────────────────────────────────────────────

  /** Sync _shapeGfx / _shapeSprite position and rotation to current projectile position. */
  private _syncShapeGfx(): void {
    if (this._shapeSprite) {
      this._shapeSprite.setPosition(this.x, this.y);
      const key = this.opts.towerKey;
      if (key === 'arrow') this._shapeSprite.setRotation(this._travelAngle);
      else if (key === 'rock-hurler') this._shapeSprite.setRotation(this._tumblePhase);
      return;
    }
    if (!this._shapeGfx) return;
    this._shapeGfx.setPosition(this.x, this.y);

    const key = this.opts.towerKey;
    if (key === 'arrow') {
      this._shapeGfx.setRotation(this._travelAngle);
    } else if (key === 'rock-hurler') {
      this._shapeGfx.setRotation(this._tumblePhase);
    }
    // frost-shard and poison-blob: no rotation applied (symmetric shapes)
  }

  // ── destroy override ──────────────────────────────────────────────────────

  override destroy(fromScene?: boolean): void {
    this._shapeGfx?.destroy();
    this._shapeGfx = null;
    this._shapeSprite?.destroy();
    this._shapeSprite = null;
    super.destroy(fromScene);
  }

  // ── public step ───────────────────────────────────────────────────────────

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

    // Rock Hurler: advance tumble angle each frame.
    if (key === 'rock-hurler') {
      this._tumblePhase = advanceTumble(this._tumblePhase, delta);
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

    // Update travel angle before moving.
    this._travelAngle = travelAngle(dx, dy);

    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;

    this._syncShapeGfx();
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
        const s = 1 + Math.sin(Math.max(0, t) * Math.PI) * 0.55;
        this.setScale(s);
        this._shapeGfx?.setScale(s);
      }
    }

    if (dist <= step) {
      this.setScale(1);
      this._shapeGfx?.setScale(1);
      this.arriveAtPosition(pos.x, pos.y);
      this.destroy();
      return;
    }

    // Update travel angle before moving.
    this._travelAngle = travelAngle(dx, dy);

    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;

    this._syncShapeGfx();
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
    if (this.opts.towerKey) AudioManager.getInstance().playProjectileHit(this.opts.towerKey);

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
    if (this.opts.towerKey) AudioManager.getInstance().playProjectileHit(this.opts.towerKey);
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
    // Expanding ring — Graphics positioned AT the impact point so that the
    // scale tween expands outward from (cx, cy) rather than from (0, 0).
    const ring = this.scene.add.graphics({ x: cx, y: cy });
    ring.lineStyle(2, 0x88ccff, 0.9);
    ring.strokeCircle(0, 0, 5);
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

    // Sparkle cross (ice-crystal hint) — also positioned at impact.
    const spark = this.scene.add.graphics({ x: cx, y: cy });
    spark.lineStyle(1.5, 0xcceeff, 0.85);
    spark.beginPath();
    spark.moveTo(-5, 0); spark.lineTo(5, 0);
    spark.moveTo(0, -5); spark.lineTo(0, 5);
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
