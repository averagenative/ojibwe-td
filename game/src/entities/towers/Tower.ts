import Phaser from 'phaser';
import type { Creep } from '../Creep';
import { Projectile } from '../Projectile';
import type { ProjectileOptions } from '../Projectile';

// ── TowerDef ─────────────────────────────────────────────────────────────────

export interface TowerDef {
  key:              string;
  name:             string;
  cost:             number;
  range:            number;            // px — attack range or aura radius
  damage:           number;
  attackIntervalMs: number;            // base attack speed; use Infinity for Aura
  projectileSpeed:  number;            // px/s
  bodyColor:        number;

  // Projectile appearance
  projectileColor?:  number;
  projectileRadius?: number;

  // Tower behaviour flags
  groundOnly?:          boolean;       // Mortar: cannot target air creeps
  splashRadius?:        number;        // Mortar: AoE radius on impact
  chainCount?:          number;        // Tesla: number of extra chain targets
  chainRange?:          number;        // Tesla: max chain reach from primary hit
  chainDamageRatio?:    number;        // Tesla: chain damage fraction (default 0.6)
  isAura?:              boolean;       // Aura tower: no attack, buffs nearby towers
  auraIntervalMult?:    number;        // Aura: interval multiplier for nearby towers (<1 = faster)
  /** Per-creep effect applied on each hit (Frost slow, Poison DoT) */
  onHitEffect?:         (creep: Creep) => void;
}

// ── Tower definitions ─────────────────────────────────────────────────────────

export const CANNON_DEF: TowerDef = {
  key: 'cannon',  name: 'Cannon',  cost: 100,
  range: 160,  damage: 40,  attackIntervalMs: 1000,  projectileSpeed: 300,
  bodyColor: 0x778888,  projectileColor: 0xffdd00,  projectileRadius: 5,
};

export const FROST_DEF: TowerDef = {
  key: 'frost',  name: 'Frost',  cost: 125,
  range: 140,  damage: 15,  attackIntervalMs: 1200,  projectileSpeed: 280,
  bodyColor: 0x3366aa,  projectileColor: 0x88ccff,  projectileRadius: 5,
  onHitEffect: (creep) => creep.applySlow(0.5, 2500),
};

export const MORTAR_DEF: TowerDef = {
  key: 'mortar',  name: 'Mortar',  cost: 175,
  range: 200,  damage: 60,  attackIntervalMs: 2500,  projectileSpeed: 180,
  bodyColor: 0x996633,  projectileColor: 0xff8800,  projectileRadius: 7,
  groundOnly: true,  splashRadius: 55,
};

export const POISON_DEF: TowerDef = {
  key: 'poison',  name: 'Poison',  cost: 125,
  range: 130,  damage: 0,  attackIntervalMs: 1500,  projectileSpeed: 250,
  bodyColor: 0x338844,  projectileColor: 0x55ff99,  projectileRadius: 5,
  onHitEffect: (creep) => creep.applyDot(6, 500, 8),
};

export const TESLA_DEF: TowerDef = {
  key: 'tesla',  name: 'Tesla',  cost: 200,
  range: 160,  damage: 35,  attackIntervalMs: 1500,  projectileSpeed: 500,
  bodyColor: 0xbbaa22,  projectileColor: 0xffff44,  projectileRadius: 4,
  chainCount: 3,  chainRange: 110,  chainDamageRatio: 0.6,
};

export const AURA_DEF: TowerDef = {
  key: 'aura',  name: 'Aura',  cost: 150,
  range: 180,  damage: 0,  attackIntervalMs: Infinity,  projectileSpeed: 0,
  bodyColor: 0xbb9922,
  isAura: true,  auraIntervalMult: 0.8, // towers in range attack 25% faster
};

export const ALL_TOWER_DEFS: TowerDef[] = [
  CANNON_DEF, FROST_DEF, MORTAR_DEF, POISON_DEF, TESLA_DEF, AURA_DEF,
];

// ── Tower class ───────────────────────────────────────────────────────────────

const BODY_SIZE = 28;

export class Tower extends Phaser.GameObjects.Container {
  readonly def:     TowerDef;
  readonly tileCol: number;
  readonly tileRow: number;

  private rangeGfx:          Phaser.GameObjects.Graphics;
  private auraPulseGfx?:     Phaser.GameObjects.Graphics;
  private auraPulseRadius  = 0;

  private getCreeps:         () => ReadonlySet<Creep>;
  private onProjectileFired: (proj: Projectile) => void;

  // Step-based attack timing (replaces Phaser timer for buff support)
  private attackElapsed      = 0;
  private intervalMultiplier = 1.0; // set by Aura towers each frame

  constructor(
    scene: Phaser.Scene,
    tileCol: number,
    tileRow: number,
    tileSize: number,
    def: TowerDef,
    getCreeps: () => ReadonlySet<Creep>,
    onProjectileFired: (proj: Projectile) => void,
  ) {
    const px = tileCol * tileSize + tileSize / 2;
    const py = tileRow * tileSize + tileSize / 2;
    super(scene, px, py);

    this.def              = def;
    this.tileCol          = tileCol;
    this.tileRow          = tileRow;
    this.getCreeps        = getCreeps;
    this.onProjectileFired = onProjectileFired;

    this.rangeGfx = this.buildRangeCircle();
    this.buildBody();

    if (def.isAura) this.buildAuraPulse();

    this.setInteractive(
      new Phaser.Geom.Rectangle(-BODY_SIZE / 2, -BODY_SIZE / 2, BODY_SIZE, BODY_SIZE),
      Phaser.Geom.Rectangle.Contains,
    );

    scene.add.existing(this);
    this.setDepth(10);
  }

  // ── public ────────────────────────────────────────────────────────────────

  /**
   * Called every frame by GameScene.update().
   * Handles attack timing and aura pulse animation.
   */
  step(delta: number): void {
    if (!this.active) return;

    if (this.def.isAura) {
      this.stepAuraPulse(delta);
      return;
    }

    this.attackElapsed += delta;
    const effectiveInterval = this.def.attackIntervalMs * this.intervalMultiplier;

    if (this.attackElapsed >= effectiveInterval) {
      this.attackElapsed = 0;
      this.tryAttack();
    }
  }

  /**
   * Applied by GameScene.updateAuras() each frame.
   * @param mult <1 = faster attack (e.g. 0.8 = 20% faster)
   */
  setIntervalMultiplier(mult: number): void {
    this.intervalMultiplier = mult;
  }

  setRangeVisible(visible: boolean): void {
    this.rangeGfx.setVisible(visible);
  }

  getSellValue(): number {
    return Math.floor(this.def.cost * 0.7);
  }

  sell(): void {
    this.rangeGfx.destroy();
    this.auraPulseGfx?.destroy();
    this.destroy();
  }

  // ── attack ────────────────────────────────────────────────────────────────

  private tryAttack(): void {
    if (this.def.splashRadius) {
      this.fireMortar();
      return;
    }

    const target = this.findNearest(this.def.groundOnly);
    if (!target) return;

    if (this.def.chainCount) {
      this.fireTesla(target);
      return;
    }

    this.fireAt(target);
  }

  /** Mortar: fires at the ground position of the nearest ground creep */
  private fireMortar(): void {
    const target = this.findNearest(/* groundOnly */ true);
    if (!target) return;

    const opts: ProjectileOptions = {
      color:        this.def.projectileColor ?? 0xff8800,
      radius:       this.def.projectileRadius ?? 7,
      speed:        this.def.projectileSpeed,
      damage:       this.def.damage,
      splashRadius: this.def.splashRadius,
      groundOnly:   this.def.groundOnly,
      getCreeps:    this.getCreeps,
    };

    const proj = new Projectile(
      this.scene, this.x, this.y,
      { x: target.x, y: target.y }, // fixed position snapshot
      opts,
    );
    this.onProjectileFired(proj);
  }

  /** Tesla: fires at primary target; onHit chains to nearby creeps */
  private fireTesla(target: Creep): void {
    const chainCount = this.def.chainCount!;
    const chainRange = this.def.chainRange!;
    const chainDmg   = Math.round(this.def.damage * (this.def.chainDamageRatio ?? 0.6));
    const getCreeps  = this.getCreeps;
    const scene      = this.scene;

    const opts: ProjectileOptions = {
      color:  this.def.projectileColor ?? 0xffff44,
      radius: this.def.projectileRadius ?? 4,
      speed:  this.def.projectileSpeed,
      damage: this.def.damage,
      onHit: (hitCreep) => {
        this.def.onHitEffect?.(hitCreep);

        // Find nearest unchained creeps within chainRange
        const candidates = [...getCreeps()]
          .filter(c => c.active && c !== hitCreep)
          .map(c => ({ creep: c, dist: Math.hypot(c.x - hitCreep.x, c.y - hitCreep.y) }))
          .filter(({ dist }) => dist <= chainRange)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, chainCount);

        for (const { creep } of candidates) {
          creep.takeDamage(chainDmg);
          drawLightningArc(scene, hitCreep.x, hitCreep.y, creep.x, creep.y);
        }
      },
    };

    const proj = new Projectile(this.scene, this.x, this.y, target, opts);
    this.onProjectileFired(proj);
  }

  /** Standard single-target projectile (Cannon, Frost, Poison) */
  private fireAt(target: Creep): void {
    const opts: ProjectileOptions = {
      color:  this.def.projectileColor ?? 0xffdd00,
      radius: this.def.projectileRadius ?? 5,
      speed:  this.def.projectileSpeed,
      damage: this.def.damage,
      onHit:  this.def.onHitEffect ? (c) => this.def.onHitEffect!(c) : undefined,
    };

    const proj = new Projectile(this.scene, this.x, this.y, target, opts);
    this.onProjectileFired(proj);
  }

  // ── targeting ─────────────────────────────────────────────────────────────

  private findNearest(groundOnly = false): Creep | null {
    let nearest: Creep | null = null;
    let nearestDist = this.def.range + 1;

    for (const creep of this.getCreeps()) {
      if (!creep.active) continue;
      if (groundOnly && creep.creepType === 'air') continue;

      const dx   = creep.x - this.x;
      const dy   = creep.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest     = creep;
      }
    }

    return nearest;
  }

  // ── visuals ───────────────────────────────────────────────────────────────

  private buildRangeCircle(): Phaser.GameObjects.Graphics {
    const color      = this.def.isAura ? 0xffdd44 : 0xffffff;
    const strokeAlpha = this.def.isAura ? 0.4 : 0.25;
    const fillAlpha   = this.def.isAura ? 0.06 : 0.04;

    const gfx = this.scene.add.graphics();
    gfx.lineStyle(1, color, strokeAlpha);
    gfx.fillStyle(color, fillAlpha);
    gfx.strokeCircle(this.x, this.y, this.def.range);
    gfx.fillCircle(this.x, this.y, this.def.range);
    gfx.setVisible(false);
    gfx.setDepth(5);
    return gfx;
  }

  private buildBody(): void {
    const body = new Phaser.GameObjects.Rectangle(
      this.scene, 0, 0, BODY_SIZE, BODY_SIZE, this.def.bodyColor,
    );
    body.setStrokeStyle(2, 0xffffff, 0.35);

    const iconKey = `icon-${this.def.key}`;
    if (this.scene.textures.exists(iconKey)) {
      const icon = new Phaser.GameObjects.Image(this.scene, 0, 0, iconKey);
      icon.setDisplaySize(20, 20);
      this.add([body, icon]);
    } else {
      this.add([body]);
    }
  }

  private buildAuraPulse(): void {
    this.auraPulseGfx = this.scene.add.graphics();
    this.auraPulseGfx.setDepth(6);
  }

  private stepAuraPulse(delta: number): void {
    if (!this.auraPulseGfx) return;
    this.auraPulseRadius += (delta / 1000) * 55;
    if (this.auraPulseRadius > this.def.range) this.auraPulseRadius = 0;

    const alpha = (1 - this.auraPulseRadius / this.def.range) * 0.45;
    this.auraPulseGfx.clear();
    this.auraPulseGfx.lineStyle(2, 0xffdd44, alpha);
    this.auraPulseGfx.strokeCircle(this.x, this.y, this.auraPulseRadius);
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Draw a brief jagged lightning arc between two world points. */
function drawLightningArc(
  scene: Phaser.Scene,
  x1: number, y1: number,
  x2: number, y2: number,
): void {
  const gfx = scene.add.graphics();
  gfx.setDepth(30);
  gfx.lineStyle(2, 0xffffff, 0.9);
  gfx.beginPath();
  gfx.moveTo(x1, y1);

  // Two jitter midpoints for a zigzag look
  const mx1 = x1 + (x2 - x1) * 0.33 + (Math.random() - 0.5) * 18;
  const my1 = y1 + (y2 - y1) * 0.33 + (Math.random() - 0.5) * 18;
  const mx2 = x1 + (x2 - x1) * 0.66 + (Math.random() - 0.5) * 18;
  const my2 = y1 + (y2 - y1) * 0.66 + (Math.random() - 0.5) * 18;

  gfx.lineTo(mx1, my1);
  gfx.lineTo(mx2, my2);
  gfx.lineTo(x2, y2);
  gfx.strokePath();

  scene.tweens.add({
    targets: gfx,
    alpha: 0,
    duration: 150,
    onComplete: () => gfx.destroy(),
  });
}
