import Phaser from 'phaser';
import type { Creep } from '../Creep';
import { Projectile } from '../Projectile';
import type { ProjectileOptions } from '../Projectile';
import {
  TargetingPriority,
  pickTarget,
  defaultBehaviorToggles,
} from '../../data/targeting';
import type { TowerBehaviorToggles } from '../../data/targeting';

// Re-export pure data types & constants from the Phaser-free data module so
// existing importers of Tower.ts continue to work unchanged.
export type { TowerDef, TowerUpgradeStats } from '../../data/towerDefs';
export {
  defaultUpgradeStats,
  CANNON_DEF, FROST_DEF, MORTAR_DEF, POISON_DEF, TESLA_DEF, AURA_DEF,
  ALL_TOWER_DEFS,
} from '../../data/towerDefs';
// Re-export targeting types so callers need only one import.
export { TargetingPriority } from '../../data/targeting';
export type { TowerBehaviorToggles } from '../../data/targeting';

// Local aliases for use within this file (avoids re-importing from data module).
import type { TowerDef, TowerUpgradeStats } from '../../data/towerDefs';
import { defaultUpgradeStats } from '../../data/towerDefs';

// ── Tower class ───────────────────────────────────────────────────────────────

const BODY_SIZE = 28;

export class Tower extends Phaser.GameObjects.Container {
  readonly def:     TowerDef;
  readonly tileCol: number;
  readonly tileRow: number;

  /** Live stat block — updated by UpgradeManager after each upgrade. */
  upgStats: TowerUpgradeStats;

  /** Current targeting priority — compared fresh on every attack cycle. */
  priority: TargetingPriority;

  /** Per-instance behavioral toggles — no cost, freely settable by BehaviorPanel. */
  behaviorToggles: TowerBehaviorToggles;

  private rangeGfx:          Phaser.GameObjects.Graphics;
  private rangeVisible       = false;
  private auraPulseGfx?:     Phaser.GameObjects.Graphics;
  private auraPulseRadius  = 0;

  private getCreeps:         () => ReadonlySet<Creep>;
  private onProjectileFired: (proj: Projectile) => void;

  // Step-based attack timing (replaces Phaser timer for buff support)
  private attackElapsed      = 0;
  private intervalMultiplier = 1.0; // set by Aura towers each frame (speed buff)

  // Per-frame aura buffs received from Aura towers — reset every frame.
  private auraDamageMult  = 1.0;
  private auraRangePct    = 0;

  // Temporary attack debuff applied by Tesla overload (C upgrade).
  private debuffMultiplier = 1.0;
  private debuffTimer?:    Phaser.Time.TimerEvent;

  /**
   * Optional callback set by UpgradeManager when Tesla overload mode is active.
   * Fires with the chain-hit positions after each Tesla chain.
   */
  onChainFired?: (positions: Array<{ x: number; y: number }>) => void;

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
    this.upgStats         = defaultUpgradeStats(def);
    this.priority         = def.defaultPriority;
    this.behaviorToggles  = defaultBehaviorToggles();
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
    const effectiveInterval =
      this.upgStats.attackIntervalMs * this.intervalMultiplier * this.debuffMultiplier;

    if (this.attackElapsed >= effectiveInterval) {
      this.attackElapsed = 0;
      this.tryAttack();
    }
  }

  /**
   * Called by UpgradeManager after any upgrade purchase or respec.
   * Stores the new stat block and rebuilds visual elements that depend on range.
   */
  applyUpgradeStats(stats: TowerUpgradeStats): void {
    this.upgStats = stats;
    this.refreshRangeCircle();
  }

  /**
   * Applied by GameScene.updateAuras() each frame.
   * @param mult <1 = faster attack (e.g. 0.8 = 20% faster)
   */
  setIntervalMultiplier(mult: number): void {
    this.intervalMultiplier = mult;
  }

  getIntervalMultiplier(): number {
    return this.intervalMultiplier;
  }

  /** Set per-frame damage multiplier from an Aura tower. */
  setAuraDamageMult(mult: number): void {
    this.auraDamageMult = mult;
  }

  getAuraDamageMult(): number {
    return this.auraDamageMult;
  }

  /** Set per-frame range % bonus from an Aura tower (0.1 = +10%). */
  setAuraRangePct(pct: number): void {
    this.auraRangePct = pct;
  }

  getAuraRangePct(): number {
    return this.auraRangePct;
  }

  /**
   * Apply a temporary attack-speed penalty (Tesla C — Overload drawback).
   * @param mult       >1 makes attacks slower (e.g. 1.25 = 25% slower)
   * @param durationMs Duration of the debuff
   */
  applyAttackDebuff(mult: number, durationMs: number): void {
    if (this.def.isAura) return; // aura towers are never debuffed
    this.debuffMultiplier = mult;
    this.debuffTimer?.destroy();
    this.debuffTimer = this.scene.time.addEvent({
      delay: durationMs,
      callback: () => { this.debuffMultiplier = 1.0; },
    });
  }

  setRangeVisible(visible: boolean): void {
    this.rangeVisible = visible;
    this.rangeGfx.setVisible(visible);
  }

  getSellValue(): number {
    return Math.floor(this.def.cost * 0.7);
  }

  sell(): void {
    this.rangeGfx.destroy();
    this.auraPulseGfx?.destroy();
    this.debuffTimer?.destroy();
    this.destroy();
  }

  // ── attack ────────────────────────────────────────────────────────────────

  private tryAttack(): void {
    if (this.upgStats.splashRadius > 0) {
      this.fireMortar();
      return;
    }

    const target = this.findTarget(this.def.groundOnly);
    if (!target) return;

    if (this.upgStats.chainCount > 0) {
      this.fireTesla(target);
      return;
    }

    this.fireAt(target);
  }

  /** Mortar: fires at the ground position of the nearest ground creep */
  private fireMortar(): void {
    // Hold Fire toggle: suppress firing without disturbing the attack timer.
    if (this.behaviorToggles.holdFire) return;

    const target = this.findTarget(/* groundOnly */ true);
    if (!target) return;

    const effectiveDamage = Math.round(this.upgStats.damage * this.auraDamageMult);
    const clusterCount    = this.upgStats.clusterCount;
    const splashR         = this.upgStats.splashRadius;

    const opts: ProjectileOptions = {
      color:        this.def.projectileColor ?? 0xff8800,
      radius:       this.def.projectileRadius ?? 7,
      speed:        this.def.projectileSpeed,
      damage:       effectiveDamage,
      splashRadius: splashR > 0 ? splashR : undefined,
      groundOnly:   this.def.groundOnly,
      getCreeps:    this.getCreeps,
    };

    if (clusterCount > 0) {
      const scene        = this.scene;
      const baseDmg      = Math.max(1, Math.round(effectiveDamage * 0.5));
      const getCreeps    = this.getCreeps;
      const fireProjFn   = this.onProjectileFired;

      opts.onImpact = (cx: number, cy: number) => {
        for (let i = 0; i < clusterCount; i++) {
          const angle = (i / clusterCount) * Math.PI * 2;
          const scatter = 40;
          const px = cx + Math.cos(angle) * scatter;
          const py = cy + Math.sin(angle) * scatter;

          const sub = new Projectile(scene, cx, cy, { x: px, y: py }, {
            color:        0xffaa44,
            radius:       4,
            speed:        200,
            damage:       baseDmg,
            splashRadius: 25,
            groundOnly:   true,
            getCreeps,
          });
          fireProjFn(sub);
        }
      };
    }

    const proj = new Projectile(
      this.scene, this.x, this.y,
      { x: target.x, y: target.y },
      opts,
    );
    this.onProjectileFired(proj);
  }

  /** Tesla: fires at primary target; onHit chains to nearby creeps */
  private fireTesla(target: Creep): void {
    const chainCount   = this.upgStats.chainCount;
    const chainRange   = this.def.chainRange ?? 110;
    const primaryDmg   = Math.round(this.upgStats.damage * this.auraDamageMult);
    const chainDmg     = Math.round(primaryDmg * this.upgStats.chainDamageRatio);
    const getCreeps    = this.getCreeps;
    const scene        = this.scene;
    const overloadMode = this.upgStats.overloadMode;
    const onChainFired = this.onChainFired;
    // Capture toggle at fire time so mid-flight changes don't affect this shot.
    const chainToExit  = this.behaviorToggles.chainToExit;

    const opts: ProjectileOptions = {
      color:  this.def.projectileColor ?? 0xffff44,
      radius: this.def.projectileRadius ?? 4,
      speed:  this.def.projectileSpeed,
      damage: primaryDmg,
      onHit: (hitCreep) => {
        // Collect candidates within chainRange
        const inRange = [...getCreeps()]
          .filter(c => c.active && c !== hitCreep)
          .map(c => ({ creep: c, dist: Math.hypot(c.x - hitCreep.x, c.y - hitCreep.y) }))
          .filter(({ dist }) => dist <= chainRange);

        // Chain Direction toggle: prefer exit-closer vs nearest
        if (chainToExit) {
          inRange.sort((a, b) => b.creep.getProgressScore() - a.creep.getProgressScore());
        } else {
          inRange.sort((a, b) => a.dist - b.dist);
        }

        const candidates = inRange.slice(0, chainCount);

        const chainPositions: Array<{ x: number; y: number }> = [];
        for (const { creep } of candidates) {
          creep.takeDamage(chainDmg);
          drawLightningArc(scene, hitCreep.x, hitCreep.y, creep.x, creep.y);
          if (overloadMode) {
            chainPositions.push({ x: creep.x, y: creep.y });
          }
        }

        if (overloadMode && chainPositions.length > 0 && onChainFired) {
          onChainFired(chainPositions);
        }
      },
    };

    const proj = new Projectile(this.scene, this.x, this.y, target, opts);
    this.onProjectileFired(proj);
  }

  /** Standard single-target projectile (Cannon, Frost, Poison) */
  private fireAt(target: Creep): void {
    const effectiveDamage = Math.round(this.upgStats.damage * this.auraDamageMult);

    // ── Cannon: execute check ────────────────────────────────────────────────
    if (this.def.key === 'cannon' && this.upgStats.executeThreshold > 0) {
      if (target.getHpRatio() <= this.upgStats.executeThreshold) {
        // Deal lethal damage via normal projectile for visual feedback.
        const opts: ProjectileOptions = {
          color:  0xff4400,
          radius: this.def.projectileRadius ?? 5,
          speed:  this.def.projectileSpeed * 1.5,
          damage: target.maxHp * 2,
        };
        const proj = new Projectile(this.scene, this.x, this.y, target, opts);
        this.onProjectileFired(proj);
        return;
      }
    }

    // ── Build per-tower onHit effect ─────────────────────────────────────────
    let onHit: ((c: Creep) => void) | undefined;

    switch (this.def.key) {
      case 'cannon': {
        if (this.upgStats.armorShredPct > 0) {
          const pct = this.upgStats.armorShredPct;
          const dur = this.upgStats.armorShredDuration;
          onHit = (c: Creep) => c.applyArmorShred(pct, dur);
        }
        break;
      }

      case 'frost': {
        const sf   = this.upgStats.slowFactor;
        const sd   = this.upgStats.slowDurationMs;
        // Chill Only toggle: apply slow but never trigger shatter (preserves Poison DoTs).
        const shat = this.upgStats.shatterOnDeath && !this.behaviorToggles.chillOnly;
        onHit = (c: Creep) => {
          c.applySlow(sf, sd);
          if (shat) c.applyShatter();
        };
        break;
      }

      case 'poison': {
        const totalDmg       = this.upgStats.dotDamageBase + this.upgStats.dotDamageBonus;
        const maxStacks      = this.upgStats.maxDotStacks;
        // Stack Cap toggle: maintain exactly one stack per creep (spread efficiency mode).
        const maintainOne    = this.behaviorToggles.maintainOneStack;
        onHit = (c: Creep) => {
          if (maintainOne) {
            // Only apply if the creep has no active DoT stacks.
            if (c.getDotStacks() >= 1) return;
          } else {
            if (maxStacks > 0 && c.getDotStacks() >= maxStacks) return;
          }
          c.applyDot(totalDmg, 500, 8);
        };
        break;
      }

      default:
        onHit = this.def.onHitEffect ? (c) => this.def.onHitEffect!(c) : undefined;
        break;
    }

    const opts: ProjectileOptions = {
      color:  this.def.projectileColor ?? 0xffdd00,
      radius: this.def.projectileRadius ?? 5,
      speed:  this.def.projectileSpeed,
      damage: effectiveDamage,
      onHit,
    };

    const proj = new Projectile(this.scene, this.x, this.y, target, opts);
    this.onProjectileFired(proj);
  }

  // ── targeting ─────────────────────────────────────────────────────────────

  /**
   * Find the best target according to the tower's current priority.
   * Called fresh on every attack cycle so priority changes take effect immediately.
   * Also handles the Cannon Armor Focus overlay (narrow pool to armored creeps
   * when any are in range and the toggle is active).
   */
  private findTarget(groundOnly = false): Creep | null {
    const effectiveRange = this.upgStats.range * (1 + this.auraRangePct);

    // Build in-range candidate list
    const candidates: Creep[] = [];
    for (const c of this.getCreeps()) {
      if (!c.active) continue;
      if (groundOnly && c.creepType === 'air') continue;
      const dx = c.x - this.x;
      const dy = c.y - this.y;
      if (dx * dx + dy * dy > effectiveRange * effectiveRange) continue;
      candidates.push(c);
    }

    if (candidates.length === 0) return null;

    // Cannon Armor Focus: narrow pool to armored creeps when any are in range.
    let pool: Creep[] = candidates;
    if (this.def.key === 'cannon' && this.behaviorToggles.armorFocus) {
      const armored = candidates.filter(c => c.isArmored);
      if (armored.length > 0) pool = armored;
    }

    return pickTarget(pool, this.priority, this.x, this.y);
  }

  // ── visuals ───────────────────────────────────────────────────────────────

  private buildRangeCircle(): Phaser.GameObjects.Graphics {
    const color       = this.def.isAura ? 0xffdd44 : 0xffffff;
    const strokeAlpha = this.def.isAura ? 0.4 : 0.25;
    const fillAlpha   = this.def.isAura ? 0.06 : 0.04;

    const gfx = this.scene.add.graphics();
    gfx.lineStyle(1, color, strokeAlpha);
    gfx.fillStyle(color, fillAlpha);
    gfx.strokeCircle(this.x, this.y, this.upgStats.range);
    gfx.fillCircle(this.x, this.y, this.upgStats.range);
    gfx.setVisible(false);
    gfx.setDepth(5);
    return gfx;
  }

  private refreshRangeCircle(): void {
    const wasVisible = this.rangeVisible;
    this.rangeGfx.clear();

    const color       = this.def.isAura ? 0xffdd44 : 0xffffff;
    const strokeAlpha = this.def.isAura ? 0.4 : 0.25;
    const fillAlpha   = this.def.isAura ? 0.06 : 0.04;

    this.rangeGfx.lineStyle(1, color, strokeAlpha);
    this.rangeGfx.fillStyle(color, fillAlpha);
    this.rangeGfx.strokeCircle(this.x, this.y, this.upgStats.range);
    this.rangeGfx.fillCircle(this.x, this.y, this.upgStats.range);
    this.rangeGfx.setVisible(wasVisible);
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
    if (this.auraPulseRadius > this.upgStats.range) this.auraPulseRadius = 0;

    const alpha = (1 - this.auraPulseRadius / this.upgStats.range) * 0.45;
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
