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
import type { OfferManager } from '../../systems/OfferManager';
import type { CommanderRunState } from '../../data/commanderDefs';
import {
  getTowerAnimDef,
  tierIntensity,
  tierSizeScale,
  lerpAngleDeg,
} from '../../data/towerAnimDefs';
import type { TowerAnimDef } from '../../data/towerAnimDefs';

// Re-export pure data types & constants from the Phaser-free data module so
// existing importers of Tower.ts continue to work unchanged.
export type { TowerDef, TowerUpgradeStats } from '../../data/towerDefs';
export {
  defaultUpgradeStats,
  ARROW_DEF, ROCK_HURLER_DEF, FROST_DEF, POISON_DEF, TESLA_DEF, AURA_DEF,
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
  /** Phase [0, 1) drives both pulse rings; advances at 0.35 cycles/s. */
  private auraPulsePhase   = 0;

  private getCreeps:             () => ReadonlySet<Creep>;
  private onProjectileFired:     (proj: Projectile) => void;
  private onFired?:              (towerKey: string) => void;
  /**
   * Optional fast-path query supplied by GameScene via SpatialGrid.
   * When set, findTarget() uses this instead of iterating getCreeps() — O(k)
   * where k = creeps in nearby cells rather than O(all creeps).
   */
  private queryCreepsInRadius?: (x: number, y: number, radius: number) => readonly Creep[];

  // Step-based attack timing (replaces Phaser timer for buff support)
  private attackElapsed      = 0;
  private intervalMultiplier = 1.0; // set by Aura towers each frame (speed buff)

  // Per-frame aura buffs received from Aura towers — reset every frame.
  private auraDamageMult  = 1.0;
  private auraRangePct    = 0;

  // Temporary attack debuff applied by Tesla overload (C upgrade).
  private debuffMultiplier = 1.0;
  private debuffTimer?:    Phaser.Time.TimerEvent;

  // Bloodlust: temporary attack-speed bonus from combat offer (0.90 = 10% faster).
  private bloodlustMult  = 1.0;
  private bloodlustTimer?: Phaser.Time.TimerEvent;

  // Ascension disable (levels 6 and 9): tower is silenced and visually greyed.
  private _ascensionDisabled  = false;
  private _ascensionDisableTimer?: Phaser.Time.TimerEvent;

  // Reference to the run's OfferManager — undefined in unit tests and pre-offer runs.
  private offerManager?: OfferManager;

  // Reference to the run's CommanderRunState — undefined when no commander is selected.
  private commanderState?: CommanderRunState;

  // Sticky targeting (Makoons aura): retain the current target between attack cycles.
  private currentTarget: Creep | null = null;

  /**
   * Optional callback set by UpgradeManager when Tesla overload mode is active.
   * Fires with the chain-hit positions after each Tesla chain.
   */
  onChainFired?: (positions: Array<{ x: number; y: number }>) => void;

  // ── Animation state ────────────────────────────────────────────────────────

  /** Animation definition for this tower type — looked up once in constructor. */
  private _animDef:      TowerAnimDef;
  /** Current upgrade tier bracket (0–5); set by setAnimTier(). */
  private _animTier      = 0;
  /** Idle phase accumulator (radians), advances proportionally to idleFreq. */
  private _idlePhase     = 0;
  /** Current barrel/body rotation angle in degrees (tracks toward visual target). */
  private _barrelAngle   = 0;
  /** World-X of the last known attack target (0 = no recent target). */
  private _visualTargetX = 0;
  /** World-Y of the last known attack target (0 = no recent target). */
  private _visualTargetY = 0;
  /** Ms accumulated for Tesla idle spark timer. */
  private _sparkTimer    = 0;
  /** Ms accumulated for Poison idle bubble timer. */
  private _bubbleTimer   = 0;
  /** Persistent Graphics object for Tesla idle arc sparks (cleaned up on sell). */
  private _sparkGfx?:    Phaser.GameObjects.Graphics;
  /** Amber ring drawn around the tower body when part of a multi-select group. */
  private _multiSelGfx?: Phaser.GameObjects.Graphics;
  /** Handle to the currently running fire-animation tween (kill to interrupt). */
  private _fireAnimTween?: Phaser.Tweens.Tween;
  /** Direct reference to the tower body Rectangle (stored in buildBody). */
  private _bodyRef?:     Phaser.GameObjects.Rectangle;
  /** Direct reference to the tower icon Image (stored in buildBody, if present). */
  private _iconRef?:     Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    tileCol: number,
    tileRow: number,
    tileSize: number,
    def: TowerDef,
    getCreeps: () => ReadonlySet<Creep>,
    onProjectileFired: (proj: Projectile) => void,
    offerManager?: OfferManager,
    onFired?: (towerKey: string) => void,
    commanderState?: CommanderRunState,
    queryCreepsInRadius?: (x: number, y: number, radius: number) => readonly Creep[],
  ) {
    const px = tileCol * tileSize + tileSize / 2;
    const py = tileRow * tileSize + tileSize / 2;
    super(scene, px, py);

    this.def                  = def;
    this.tileCol              = tileCol;
    this.tileRow              = tileRow;
    this.upgStats             = defaultUpgradeStats(def);
    this.priority             = def.defaultPriority;
    this.behaviorToggles      = defaultBehaviorToggles();
    this.getCreeps             = getCreeps;
    this.onProjectileFired     = onProjectileFired;
    this.offerManager          = offerManager;
    this.onFired               = onFired;
    this.commanderState        = commanderState;
    this.queryCreepsInRadius   = queryCreepsInRadius;

    // Animation def resolved before buildBody() so it's available immediately.
    this._animDef = getTowerAnimDef(def.key);

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
      this._stepIdleAnim(delta);
      return;
    }

    // Ascension disable — tower cannot attack while silenced.
    if (this._ascensionDisabled) {
      this._stepIdleAnim(delta);
      return;
    }

    this.attackElapsed += delta;
    // Blitz Protocol: permanent +15% faster attack (mult = 0.85).
    const blitzMult = this.offerManager?.getBlitzProtocolAttackSpeedMult() ?? 1.0;
    const effectiveInterval =
      this.upgStats.attackIntervalMs * this.intervalMultiplier * this.debuffMultiplier * this.bloodlustMult * blitzMult;

    if (this.attackElapsed >= effectiveInterval) {
      this.attackElapsed = 0;
      this.tryAttack();
    }

    this._stepIdleAnim(delta);
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
   * Update the animation tier (0–5) — called by UpgradeManager after any
   * upgrade or respec.  Re-scales the tower body when the tier bracket changes.
   */
  setAnimTier(tier: number): void {
    const prevScale = tierSizeScale(this._animTier);
    const newScale  = tierSizeScale(tier);
    this._animTier  = tier;
    if (prevScale !== newScale && this._bodyRef) {
      this._bodyRef.setScale(newScale);
    }
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
   * Apply a temporary attack-speed bonus (Bloodlust offer).
   * @param durationMs How long the bonus lasts (e.g. 3000 ms)
   */
  applyBloodlust(durationMs: number): void {
    if (this.def.isAura) return;
    this.bloodlustMult = 0.90; // 10% faster attacks
    this.bloodlustTimer?.destroy();
    this.bloodlustTimer = this.scene.time.addEvent({
      delay:    durationMs,
      callback: () => { this.bloodlustMult = 1.0; },
    });
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

  /**
   * Disable (silence) this tower for `durationMs` milliseconds.
   * Used by the Ascension 6 and Ascension 9 modifiers.
   * The tower is tweened to low alpha and cannot fire until restored.
   * Calling while already disabled simply extends/resets the timer.
   */
  disableForAscension(durationMs: number): void {
    this._ascensionDisabled = true;
    this._ascensionDisableTimer?.destroy();

    // Visual: tween alpha to a grey-out value.
    this.scene.tweens.add({
      targets:  this,
      alpha:    0.35,
      duration: 200,
      ease:     'Linear',
    });

    this._ascensionDisableTimer = this.scene.time.addEvent({
      delay:    durationMs,
      callback: () => {
        this._ascensionDisabled = false;
        this.scene.tweens.add({
          targets:  this,
          alpha:    1,
          duration: 300,
          ease:     'Linear',
        });
      },
    });
  }

  setRangeVisible(visible: boolean): void {
    this.rangeVisible = visible;
    this.rangeGfx.setVisible(visible);
  }

  /**
   * Show or hide the amber selection ring used for multi-tower selection.
   * A ring is drawn around the tower body (distinct from the green range circle).
   */
  setMultiSelected(on: boolean): void {
    if (on) {
      if (!this._multiSelGfx) {
        this._multiSelGfx = this.scene.add.graphics();
        this._multiSelGfx.lineStyle(3, 0xc8952a, 1.0); // amber
        const r = BODY_SIZE / 2 + 4;
        this._multiSelGfx.strokeRect(-r, -r, r * 2, r * 2);
        this.add(this._multiSelGfx);
      }
      this._multiSelGfx.setVisible(true);
    } else {
      this._multiSelGfx?.setVisible(false);
    }
  }

  getSellValue(): number {
    return Math.floor(this.def.cost * 0.7);
  }

  sell(): void {
    this.rangeGfx.destroy();
    this.auraPulseGfx?.destroy();
    this.debuffTimer?.destroy();
    this.bloodlustTimer?.destroy();
    this._ascensionDisableTimer?.destroy();
    // Clean up animation resources to prevent orphaned tweens / graphics.
    this._fireAnimTween?.stop();
    this._fireAnimTween = undefined;
    this._sparkGfx?.destroy();
    this._sparkGfx = undefined;
    this._multiSelGfx?.destroy();
    this._multiSelGfx = undefined;
    this.destroy();
  }

  // ── attack ────────────────────────────────────────────────────────────────

  private tryAttack(): void {
    if (this.upgStats.splashRadius > 0) {
      this.fireMortar();
      return;
    }

    const target = this.findTarget();
    if (!target) {
      // No target in range — clear visual tracking so idle sweep can resume.
      this._visualTargetX = 0;
      this._visualTargetY = 0;
      return;
    }

    // Update visual tracking and trigger fire animation.
    this._visualTargetX = target.x;
    this._visualTargetY = target.y;
    this._playFireAnim();

    this.onFired?.(this.def.key);

    if (this.upgStats.chainCount > 0) {
      this.fireTesla(target);
      return;
    }

    // Arrow multi-shot (Path B): fire at additional targets within range.
    if (this.def.key === 'arrow' && this.upgStats.multiShotCount > 0) {
      this.fireAt(target);
      let remaining = this.upgStats.multiShotCount;
      const domain       = this.def.targetDomain;
      const overgrowthBonus = this.offerManager?.getOvergrowthRangeBonus(this.def.key) ?? 0;
      const effectiveRange = this.upgStats.range * (1 + this.auraRangePct + overgrowthBonus);
      const rangeSq      = effectiveRange * effectiveRange;
      for (const c of this.getCreeps()) {
        if (remaining <= 0) break;
        if (!c.active || c === target) continue;
        if (domain === 'air'    && c.domain !== 'air') continue;
        if (domain === 'ground' && c.domain === 'air') continue;
        const dx = c.x - this.x;
        const dy = c.y - this.y;
        if (dx * dx + dy * dy > rangeSq) continue;
        this.fireAt(c);
        remaining--;
      }
      return;
    }

    this.fireAt(target);
  }

  /** Mortar: fires at the ground position of the nearest ground creep */
  private fireMortar(): void {
    // Hold Fire toggle: suppress firing without disturbing the attack timer.
    if (this.behaviorToggles.holdFire) return;

    const target = this.findTarget();
    if (!target) {
      // No target in range — clear visual tracking so idle sweep can resume.
      this._visualTargetX = 0;
      this._visualTargetY = 0;
      return;
    }

    // Update visual tracking and trigger fire animation.
    this._visualTargetX = target.x;
    this._visualTargetY = target.y;
    this._playFireAnim();

    this.onFired?.(this.def.key);

    const om = this.offerManager;

    // Apply global damage multiplier (Last Stand, Veteran Arms).
    const globalMult = om?.getGlobalDamageMult() ?? 1.0;
    // Armor damage modifier: apply based on primary target's armor status.
    const armorMod = (this.def.armorDamageMult !== undefined && target.isArmored)
      ? this.def.armorDamageMult
      : 1.0;
    const effectiveDamage = Math.round(
      Math.round(this.upgStats.damage * this.auraDamageMult) * globalMult * armorMod,
    );
    const clusterCount    = this.upgStats.clusterCount;
    const splashR         = this.upgStats.splashRadius;

    // Mortar-synergy onHit effects (Toxic Shrapnel, Explosive Residue, Acid Rain).
    const toxicShrapnel   = om?.hasToxicShrapnel()    ?? false;
    const explosiveResidu = om?.hasExplosiveResidue()  ?? false;
    const acidRain        = om?.hasAcidRain()          ?? false;
    let   mortarOnHit: ((c: Creep) => void) | undefined;
    if (toxicShrapnel || explosiveResidu || acidRain) {
      mortarOnHit = (c: Creep) => {
        if (toxicShrapnel)   c.applyDot(10, 500, 4);   // small Poison DoT
        if (explosiveResidu) c.applySlow(0.80, 2000);   // 20% slow for 2 s
        if (acidRain)        c.applyDot(8,  600, 3);   // weak additional Poison
      };
    }

    const opts: ProjectileOptions = {
      color:        this.def.projectileColor ?? 0xff8800,
      radius:       this.def.projectileRadius ?? 7,
      speed:        this.def.projectileSpeed,
      speedMult:    this.commanderState?.projectileSpeedMult ?? 1.0,
      damage:       effectiveDamage,
      splashRadius: splashR > 0 ? splashR : undefined,
      groundOnly:   this.def.groundOnly,
      getCreeps:    this.getCreeps,
      onHit:        mortarOnHit,
      towerKey:     this.def.key,
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
            towerKey:     this.def.key,
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
    const om           = this.offerManager;

    // Apply global damage multiplier and combat offers to primary damage.
    const globalMult       = om?.getGlobalDamageMult()              ?? 1.0;
    const heartseekerMult  = om?.getHeartseekerMult(target.getHpRatio()) ?? 1.0;
    const critMult         = (om?.critRoll() ?? false) ? 3.0 : 1.0;
    const primaryDmg       = Math.round(
      this.upgStats.damage * this.auraDamageMult * globalMult * heartseekerMult * critMult,
    );
    const chainDmg     = Math.round(primaryDmg * this.upgStats.chainDamageRatio);
    const getCreeps    = this.getCreeps;
    const scene        = this.scene;
    const overloadMode = this.upgStats.overloadMode;
    const onChainFired = this.onChainFired;
    // Capture toggle at fire time so mid-flight changes don't affect this shot.
    const chainToExit  = this.behaviorToggles.chainToExit;
    // Capture targetDomain so chain hits respect the tower's domain restriction.
    const towerDomain  = this.def.targetDomain;
    // Animikiikaa aura: capture AoE flag + radius at fire time.
    const cmdChainAoE  = this.commanderState?.teslaChainAoE ?? false;
    const aoeTileSize  = cmdChainAoE ? (this.scene.data?.get('tileSize') as number ?? 40) : 0;
    // Bizhiw aura: projectile speed multiplier.
    const projSpeedMult = this.commanderState?.projectileSpeedMult ?? 1.0;

    const opts: ProjectileOptions = {
      color:    this.def.projectileColor ?? 0xffff44,
      radius:   this.def.projectileRadius ?? 4,
      speed:    this.def.projectileSpeed,
      speedMult: projSpeedMult,
      damage:   primaryDmg,
      towerKey: this.def.key,
      onHit: (hitCreep) => {
        // Collect candidates within chainRange, respecting the tower's targetDomain.
        const inRange = [...getCreeps()]
          .filter(c => {
            if (!c.active || c === hitCreep) return false;
            if (towerDomain === 'air' && c.domain !== 'air') return false;
            if (towerDomain === 'ground' && c.domain === 'air') return false;
            return true;
          })
          .map(c => ({ creep: c, dist: Math.hypot(c.x - hitCreep.x, c.y - hitCreep.y) }))
          .filter(({ dist }) => dist <= chainRange);

        // Chain Direction toggle: prefer exit-closer vs nearest
        if (chainToExit) {
          inRange.sort((a, b) => b.creep.getProgressScore() - a.creep.getProgressScore());
        } else {
          inRange.sort((a, b) => a.dist - b.dist);
        }

        // Lightning Rod: slowed primary target attracts 1 extra chain hit.
        const lightningRodExtra = om?.getLightningRodExtra(hitCreep.isSlowed()) ?? 0;
        const candidates = inRange.slice(0, chainCount + lightningRodExtra);

        const chainPositions: Array<{ x: number; y: number }> = [];
        const thunderQuake = om?.hasThunderQuake() ?? false;
        for (let ci = 0; ci < candidates.length; ci++) {
          const { creep } = candidates[ci];
          // Compose synergy multipliers: Static Field, Grounded, Overcharge, Voltaic Slime.
          const sfMult    = om?.getStaticFieldMult(creep.isSlowed())      ?? 1.0;
          const gndMult   = om?.getGroundedMult(creep.isArmored)         ?? 1.0;
          const overMult  = om?.getOverchargeMult(ci)                    ?? 1.0;
          const vsMult    = om?.getVoltaicSlimeMult(creep.getDotStacks() > 0) ?? 1.0;
          const finalDmg  = Math.round(chainDmg * sfMult * gndMult * overMult * vsMult);

          creep.takeDamage(finalDmg);
          drawLightningArc(scene, hitCreep.x, hitCreep.y, creep.x, creep.y);

          // Animikiikaa aura: 1-tile AoE splash on each chain jump.
          if (cmdChainAoE) {
            for (const nearby of getCreeps()) {
              if (!nearby.active || nearby === creep) continue;
              if (towerDomain === 'air' && nearby.domain !== 'air') continue;
              if (towerDomain === 'ground' && nearby.domain === 'air') continue;
              if (Math.hypot(nearby.x - creep.x, nearby.y - creep.y) <= aoeTileSize) {
                nearby.takeDamage(chainDmg);
              }
            }
          }

          // Thunder Quake: 15 AoE damage in 30px radius around each chain hit.
          if (thunderQuake) {
            const TQ_RADIUS = 30;
            const TQ_DAMAGE = 15;
            for (const nearby of getCreeps()) {
              if (!nearby.active || nearby === creep) continue;
              if (towerDomain === 'air' && nearby.domain !== 'air') continue;
              if (towerDomain === 'ground' && nearby.domain === 'air') continue;
              if (Math.hypot(nearby.x - creep.x, nearby.y - creep.y) <= TQ_RADIUS) {
                nearby.takeDamage(TQ_DAMAGE);
              }
            }
          }

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

  /** Standard single-target projectile (Arrow, Rock Hurler, Frost, Poison) */
  private fireAt(target: Creep): void {
    const om = this.offerManager;

    // ── Base damage with aura buff ────────────────────────────────────────────
    const baseDamage = Math.round(this.upgStats.damage * this.auraDamageMult);

    // ── Global combat-offer multipliers ───────────────────────────────────────
    const globalMult      = om?.getGlobalDamageMult()              ?? 1.0;
    const heartseekerMult = om?.getHeartseekerMult(target.getHpRatio()) ?? 1.0;
    const critMult        = (om?.critRoll() ?? false) ? 3.0 : 1.0;
    // ── Armor damage modifier ─────────────────────────────────────────────────
    const armorMod        = (this.def.armorDamageMult !== undefined && target.isArmored)
      ? this.def.armorDamageMult
      : 1.0;

    let effectiveDamage = Math.round(baseDamage * globalMult * heartseekerMult * critMult * armorMod);

    // ── Execute check (any tower with executeThreshold upgrade) ───────────────
    if (this.upgStats.executeThreshold > 0) {
      if (target.getHpRatio() <= this.upgStats.executeThreshold) {
        // Deal lethal damage via normal projectile for visual feedback.
        const opts: ProjectileOptions = {
          color:    0xff4400,
          radius:   this.def.projectileRadius ?? 5,
          speed:    this.def.projectileSpeed * 1.5,
          speedMult: this.commanderState?.projectileSpeedMult ?? 1.0,
          damage:   target.maxHp * 2,
          towerKey: this.def.key,
        };
        const proj = new Projectile(this.scene, this.x, this.y, target, opts);
        this.onProjectileFired(proj);
        return;
      }
    }

    // ── Damage cap (Arrow tower): clamp after all multipliers ────────────────
    if (this.def.damageCap !== undefined) {
      effectiveDamage = Math.min(effectiveDamage, this.def.damageCap);
    }

    // ── Build per-tower onHit effect ─────────────────────────────────────────
    let onHit: ((c: Creep) => void) | undefined;

    switch (this.def.key) {
      case 'arrow': {
        // Path C (Hunter's Edge): apply slow on hit when upgrade is active.
        const sf = this.upgStats.arrowSlowFactor;
        const sd = this.upgStats.arrowSlowDurationMs;
        if (sf > 0 && sd > 0) {
          onHit = (c: Creep) => c.applySlow(sf, sd);
        }
        break;
      }

      case 'rock-hurler': {
        // Brittle Ice: +20% damage to frost-slowed targets.
        const brittleIceMult = om?.getBrittleIceMult(target.isSlowed()) ?? 1.0;
        if (brittleIceMult > 1.0) {
          effectiveDamage = Math.round(effectiveDamage * brittleIceMult);
        }

        const armorShredPct     = this.upgStats.armorShredPct;
        const armorShredDur     = this.upgStats.armorShredDuration;
        const cryoActive        = om?.hasCryoCannon()        ?? false;
        const concussionActive  = om?.hasConcussionShell()   ?? false;

        if (armorShredPct > 0 || cryoActive || concussionActive) {
          onHit = (c: Creep) => {
            if (armorShredPct > 0) c.applyArmorShred(armorShredPct, armorShredDur);
            // Cryo Cannon: slow targets by 20% for 1.5 s.
            if (cryoActive) c.applySlow(0.80, 1500);
            // Concussion Shell: slow targets by 15% for 600ms.
            if (concussionActive) c.applySlow(0.85, 600);
          };
        }
        break;
      }

      case 'frost': {
        const sf = this.upgStats.slowFactor;
        const sd = this.upgStats.slowDurationMs;
        // Venomfrost: slow factor 30% stronger on Poison-stacked targets.
        const effectiveSf = om
          ? om.getVenomfrostSlowFactor(sf, target.getDotStacks() > 0)
          : sf;
        // Glacial Surge: +15% damage to already-slowed targets.
        const glacialMult = om?.getGlacialSurgeMult(target.isSlowed()) ?? 1.0;
        if (glacialMult > 1.0) {
          effectiveDamage = Math.round(effectiveDamage * glacialMult);
        }
        // Chill Only toggle: apply slow but never trigger shatter (preserves Poison DoTs).
        const shat = this.upgStats.shatterOnDeath && !this.behaviorToggles.chillOnly;
        onHit = (c: Creep) => {
          c.applySlow(effectiveSf, sd);
          if (shat) c.applyShatter();
        };
        break;
      }

      case 'poison': {
        const totalDmg    = this.upgStats.dotDamageBase + this.upgStats.dotDamageBonus;
        const maxStacks   = this.upgStats.maxDotStacks;
        // Stack Cap toggle: maintain exactly one stack per creep (spread efficiency mode).
        const maintainOne = this.behaviorToggles.maintainOneStack;
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
      color:    this.def.projectileColor ?? 0xffdd00,
      radius:   this.def.projectileRadius ?? 5,
      speed:    this.def.projectileSpeed,
      speedMult: this.commanderState?.projectileSpeedMult ?? 1.0,
      damage:   effectiveDamage,
      onHit,
      towerKey: this.def.key,
    };

    const proj = new Projectile(this.scene, this.x, this.y, target, opts);
    this.onProjectileFired(proj);
  }

  // ── targeting ─────────────────────────────────────────────────────────────

  /**
   * Find the best target according to the tower's current priority and targetDomain.
   * Called fresh on every attack cycle so priority changes take effect immediately.
   * Also handles the Rock Hurler Armor Focus overlay (narrow pool to armored creeps
   * when any are in range and the toggle is active).
   *
   * Domain filtering:
   *   'ground' — only ground creeps
   *   'air'    — only air creeps
   *   'both'   — all creeps
   */
  private findTarget(): Creep | null {
    const domain = this.def.targetDomain;

    // Overgrowth: Poison towers gain +15% range.
    const overgrowthBonus = this.offerManager?.getOvergrowthRangeBonus(this.def.key) ?? 0;
    const effectiveRange = this.upgStats.range * (1 + this.auraRangePct + overgrowthBonus);
    const rangeSq = effectiveRange * effectiveRange;

    // Helper: true when a creep's domain matches this tower's targetDomain.
    const domainMatch = (creep: Creep): boolean => {
      if (domain === 'both')   return true;
      if (domain === 'air')    return creep.domain === 'air';
      /* 'ground' */           return creep.domain !== 'air';
    };

    // Makoons aura — sticky target retention: keep current target if still alive and in range.
    if (this.commanderState?.stickyTargeting && this.currentTarget) {
      const ct = this.currentTarget;
      if (ct.active && domainMatch(ct)) {
        const dx = ct.x - this.x;
        const dy = ct.y - this.y;
        if (dx * dx + dy * dy <= rangeSq) return ct;
      }
      this.currentTarget = null;
    }

    // Build in-range candidate list, filtered by targeting domain.
    // Fast path: use spatial grid (O(nearby cells)) when GameScene provides one.
    // Slow path fallback: iterate the full creep set (O(all creeps)).
    const candidates: Creep[] = [];
    const source: Iterable<Creep> = this.queryCreepsInRadius
      ? this.queryCreepsInRadius(this.x, this.y, effectiveRange)
      : this.getCreeps();

    for (const c of source) {
      if (!c.active) continue;
      if (!domainMatch(c)) continue;
      const dx = c.x - this.x;
      const dy = c.y - this.y;
      if (dx * dx + dy * dy > rangeSq) continue;
      candidates.push(c);
    }

    if (candidates.length === 0) return null;

    // Rock Hurler Armor Focus: narrow pool to armored creeps when any are in range.
    let pool: Creep[] = candidates;
    if (this.def.key === 'rock-hurler' && this.behaviorToggles.armorFocus) {
      const armored = candidates.filter(c => c.isArmored);
      if (armored.length > 0) pool = armored;
    }

    const result = pickTarget(pool, this.priority, this.x, this.y);
    this.currentTarget = result;
    return result;
  }

  // ── visuals ───────────────────────────────────────────────────────────────

  private buildRangeCircle(): Phaser.GameObjects.Graphics {
    // Stroke width ≥ 2px so the ring is visible on all terrain types (dark
    // ground, trees, snow). Alpha 0.35 gives clear contrast without overdraw.
    const color       = this.def.isAura ? 0xffdd44 : 0xffffff;
    const strokeAlpha = this.def.isAura ? 0.4 : 0.35;
    const fillAlpha   = this.def.isAura ? 0.06 : 0.04;

    const gfx = this.scene.add.graphics();
    gfx.lineStyle(2, color, strokeAlpha);
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
    const strokeAlpha = this.def.isAura ? 0.4 : 0.35;
    const fillAlpha   = this.def.isAura ? 0.06 : 0.04;

    this.rangeGfx.lineStyle(2, color, strokeAlpha);
    this.rangeGfx.fillStyle(color, fillAlpha);
    this.rangeGfx.strokeCircle(this.x, this.y, this.upgStats.range);
    this.rangeGfx.fillCircle(this.x, this.y, this.upgStats.range);
    this.rangeGfx.setVisible(wasVisible);
  }

  private buildBody(): void {
    const body = new Phaser.GameObjects.Rectangle(
      this.scene, 0, 0, BODY_SIZE, BODY_SIZE, this.def.bodyColor,
    );
    this._bodyRef = body;

    const iconKey = `icon-${this.def.key}`;
    if (this.scene.textures.exists(iconKey)) {
      const icon = new Phaser.GameObjects.Image(this.scene, 0, 0, iconKey);
      icon.setDisplaySize(20, 20);
      this._iconRef = icon;
      this.add([body, icon]);
    } else {
      this.add([body]);
    }

    // Tesla: create a persistent Graphics object for idle arc sparks.
    if (this.def.key === 'tesla') {
      this._sparkGfx = this.scene.add.graphics();
      this._sparkGfx.setDepth(11);
    }
  }

  private buildAuraPulse(): void {
    this.auraPulseGfx = this.scene.add.graphics();
    this.auraPulseGfx.setDepth(6);
  }

  private stepAuraPulse(delta: number): void {
    if (!this.auraPulseGfx) return;
    // Advance phase: 0.35 cycles/s → ~2.9 s period.
    this.auraPulsePhase = (this.auraPulsePhase + (delta / 1000) * 0.35) % 1;

    this.auraPulseGfx.clear();
    // Two rings half a cycle apart — creates a continuous outward-pulse look.
    for (let i = 0; i < 2; i++) {
      const phase = (this.auraPulsePhase + i * 0.5) % 1;
      const r     = phase * this.upgStats.range;
      // Bell-curve alpha: 0 at edges, peaks near mid-travel.
      const alpha = Math.sin(phase * Math.PI) * 0.45;
      this.auraPulseGfx.lineStyle(2, 0xffdd44, alpha);
      this.auraPulseGfx.strokeCircle(this.x, this.y, r);
    }
  }

  // ── Idle animation ─────────────────────────────────────────────────────────

  /**
   * Called every frame by step().  Advances the idle phase and dispatches
   * to the appropriate per-archetype idle animation.
   */
  private _stepIdleAnim(delta: number): void {
    // Advance idle phase accumulator.
    this._idlePhase = (this._idlePhase + (delta / 1000) * this._animDef.idleFreq * Math.PI * 2) % (Math.PI * 2);

    const intensity = tierIntensity(this._animTier);

    // Barrel-aiming towers always run the tracking step.
    if (this.def.key === 'rock-hurler') {
      this._stepBarrelTracking();
    }

    // Tesla subtle lean toward target.
    if (this.def.key === 'tesla') {
      this._stepTeslaLean(intensity);
    }

    switch (this._animDef.idleType) {
      case 'sweep':     this._stepSweepIdle(intensity);           break;
      case 'pulse':     this._stepPulseIdle(intensity);           break;
      case 'spark':     this._stepSparkIdle(delta, intensity);    break;
      case 'bob':       this._stepBobIdle(intensity);             break;
      case 'bubble':    this._stepBubbleIdle(delta, intensity);   break;
      case 'aura-idle': break; // handled by stepAuraPulse
    }
  }

  /**
   * Lerp the container's rotation angle toward the last-known visual target.
   * Used by Rock Hurler to smoothly aim its barrel.
   */
  private _stepBarrelTracking(): void {
    // Sentinel: (0, 0) means no target has been acquired yet.
    if (this._visualTargetX === 0 && this._visualTargetY === 0) return;

    const targetAngle = Phaser.Math.RAD_TO_DEG * Math.atan2(
      this._visualTargetY - this.y,
      this._visualTargetX - this.x,
    );
    this._barrelAngle = lerpAngleDeg(
      this._barrelAngle,
      targetAngle,
      this._animDef.lerpDegPerFrame,
    );
    this.setAngle(this._barrelAngle);
  }

  /**
   * Cannon idle: slow ±sweepDeg oscillation while no target is in sight.
   * Defers to barrel-tracking when a visual target is present.
   */
  private _stepSweepIdle(intensity: number): void {
    // Only sweep when there is no active tracking target.
    if (this._visualTargetX !== 0 || this._visualTargetY !== 0) return;
    const sweepAngle = Math.sin(this._idlePhase) * this._animDef.sweepDeg * intensity;
    this.setAngle(sweepAngle);
    this._barrelAngle = sweepAngle;
  }

  /**
   * Frost/Arrow idle: subtle scale pulse (breathing effect) on the body rect.
   */
  private _stepPulseIdle(intensity: number): void {
    if (!this._bodyRef) return;
    const base  = tierSizeScale(this._animTier);
    const pulse = 1 + Math.sin(this._idlePhase) * this._animDef.pulseScale * intensity;
    this._bodyRef.setScale(base * pulse);
  }

  /**
   * Tesla idle: periodic random electric arc sparks around the coil tips.
   */
  private _stepSparkIdle(delta: number, intensity: number): void {
    this._sparkTimer += delta;
    const interval = this._animDef.sparkIntervalMs / Math.max(0.1, intensity);
    if (this._sparkTimer < interval) return;
    this._sparkTimer = 0;

    if (!this._sparkGfx) return;

    // Redraw three random arc spokes emanating from the tower edge.
    this._sparkGfx.clear();
    this._sparkGfx.setAlpha(1);
    this._sparkGfx.lineStyle(1, 0x88aaff, 0.75);

    const numArcs = 3;
    for (let i = 0; i < numArcs; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r1    = BODY_SIZE / 2;
      const r2    = r1 + 6 + Math.random() * 6;
      const x1    = this.x + Math.cos(angle) * r1;
      const y1    = this.y + Math.sin(angle) * r1;
      const x2    = this.x + Math.cos(angle) * r2;
      const y2    = this.y + Math.sin(angle) * r2;
      this._sparkGfx.beginPath();
      this._sparkGfx.moveTo(x1, y1);
      this._sparkGfx.lineTo(x2, y2);
      this._sparkGfx.strokePath();
    }

    // Fade the sparks out over the next interval.
    this.scene.tweens.add({
      targets:  this._sparkGfx,
      alpha:    0,
      duration: Math.min(interval * 0.8, 300),
      onComplete: () => { this._sparkGfx?.setAlpha(0); },
    });
  }

  /**
   * Mortar idle: slow vertical Y bob on the body (simulates barrel elevation).
   * Also defers to barrel-tracking when a visual target is present.
   */
  private _stepBobIdle(intensity: number): void {
    if (!this._bodyRef) return;
    const bobY = Math.sin(this._idlePhase) * this._animDef.bobAmpY * intensity;
    this._bodyRef.y = bobY;
  }

  /**
   * Poison idle: periodic small green bubble particles rising from the tower.
   */
  private _stepBubbleIdle(delta: number, intensity: number): void {
    this._bubbleTimer += delta;
    const interval = this._animDef.bubbleIntervalMs / Math.max(0.1, intensity);
    if (this._bubbleTimer < interval) return;
    this._bubbleTimer = 0;

    const gfx = this.scene.add.graphics();
    gfx.setDepth(11);
    gfx.fillStyle(0x44ff44, 0.65);
    gfx.fillCircle(0, 0, 2 + Math.random() * 2);
    // Position near tower centre with small random offset.
    gfx.x = this.x + (Math.random() - 0.5) * 14;
    gfx.y = this.y + (Math.random() - 0.5) * 14;

    this.scene.tweens.add({
      targets:  gfx,
      y:        gfx.y - (10 + Math.random() * 8),
      alpha:    0,
      scaleX:   1.4,
      scaleY:   1.4,
      duration: 500 + Math.random() * 200,
      onComplete: () => gfx.destroy(),
    });
  }

  /**
   * Tesla idle: subtle lean (rotation) of the container toward the target.
   * Maximum lean = leanDeg × intensity, reset to 0 when no target.
   */
  private _stepTeslaLean(intensity: number): void {
    const leanMax = this._animDef.leanDeg * intensity;
    if (this._visualTargetX === 0 && this._visualTargetY === 0) {
      // Ease back to upright.
      this.setAngle(lerpAngleDeg(this.angle, 0, 1.5));
      return;
    }
    // Lean in the horizontal direction of the target, clamped to ±leanMax.
    const dx           = this._visualTargetX - this.x;
    const normalised   = Math.max(-1, Math.min(1, dx / 200));
    const targetLean   = normalised * leanMax;
    this.setAngle(lerpAngleDeg(this.angle, targetLean, 1.5));
  }

  // ── Fire animations ────────────────────────────────────────────────────────

  /**
   * Dispatch to the correct per-archetype fire animation.
   * Any currently running fire tween is killed first so rapid shots don't stack.
   */
  private _playFireAnim(): void {
    switch (this.def.key) {
      case 'rock-hurler': this._playRockHurlerKick(); break;
      case 'frost':       this._playFrostFire();      break;
      case 'tesla':       this._playTeslaFlash();     break;
      case 'poison':      this._playPoisonGlow();     break;
      case 'arrow':       this._playArrowRecoil();    break;
    }
  }

  /** Rock Hurler: barrel kicks +kickDeg on firing, eases back over kickMs. */
  private _playRockHurlerKick(): void {
    this._fireAnimTween?.stop();
    const base      = tierSizeScale(this._animTier);
    const kickAngle = this._barrelAngle + this._animDef.kickDeg;
    this.setAngle(kickAngle);
    if (this._bodyRef) {
      this._bodyRef.setScale(base * 1.0, base * 0.9);
    }
    this._fireAnimTween = this.scene.tweens.add({
      targets:  this,
      angle:    this._barrelAngle,
      duration: this._animDef.kickMs,
      ease:     'Cubic.Out',
      onComplete: () => {
        if (this._bodyRef) this._bodyRef.setScale(base);
        this._fireAnimTween = undefined;
      },
    });
  }

  /**
   * Frost: brief scale expansion pulse (1.0 → firePulseScale → 1.0)
   * + scatter of small ice crystal particles.
   */
  private _playFrostFire(): void {
    if (!this._bodyRef) return;
    this._fireAnimTween?.stop();
    const base  = tierSizeScale(this._animTier);
    const peak  = base * (1 + this._animDef.firePulseScale);
    this._bodyRef.setScale(peak);
    this._spawnFrostCrystals();
    this._fireAnimTween = this.scene.tweens.add({
      targets:  this._bodyRef,
      scaleX:   base,
      scaleY:   base,
      duration: this._animDef.fireFlashMs,
      ease:     'Cubic.Out',
      onComplete: () => { this._fireAnimTween = undefined; },
    });
  }

  /** Spawn small ice-crystal shards that scatter outward from the tower. */
  private _spawnFrostCrystals(): void {
    const numCrystals = 4;
    for (let i = 0; i < numCrystals; i++) {
      const angle = (i / numCrystals) * Math.PI * 2 + Math.random() * 0.4;
      const gfx   = this.scene.add.graphics();
      gfx.setDepth(11);
      gfx.fillStyle(0x88ccff, 0.85);
      gfx.fillRect(-2, -2, 4, 4);
      gfx.x = this.x;
      gfx.y = this.y;
      this.scene.tweens.add({
        targets:  gfx,
        x:        this.x + Math.cos(angle) * 20,
        y:        this.y + Math.sin(angle) * 20,
        alpha:    0,
        duration: 280 + Math.random() * 80,
        onComplete: () => gfx.destroy(),
      });
    }
  }

  /**
   * Tesla: entire tower body flashes white for fireFlashMs, body shakes
   * horizontally on the body rect.
   */
  private _playTeslaFlash(): void {
    if (!this._bodyRef) return;
    this._fireAnimTween?.stop();

    // Flash body to white (Rectangle uses setFillStyle, not setTint).
    this._bodyRef.setFillStyle(0xffffff);
    // Icon tint (Image supports setTint).
    this._iconRef?.setTint(0xffffff);

    this._fireAnimTween = this.scene.tweens.add({
      targets:  {},       // dummy target — we just need an onComplete timer
      duration: this._animDef.fireFlashMs,
      onComplete: () => {
        this._bodyRef?.setFillStyle(this.def.bodyColor);
        this._iconRef?.clearTint();
        this._fireAnimTween = undefined;
      },
    });

    // Rapid shake of body rect along X axis.
    const origX = this._bodyRef.x;
    this.scene.tweens.add({
      targets:  this._bodyRef,
      x:        origX + 2,
      duration: 20,
      yoyo:     true,
      repeat:   2,
      onComplete: () => {
        if (this._bodyRef) this._bodyRef.x = origX;
      },
    });
  }


  /**
   * Poison: tower briefly glows bright green when firing a blob.
   */
  private _playPoisonGlow(): void {
    if (!this._bodyRef) return;
    this._fireAnimTween?.stop();
    this._bodyRef.setFillStyle(0x88ff44);
    this._fireAnimTween = this.scene.tweens.add({
      targets:  {},
      duration: 200,
      onComplete: () => {
        this._bodyRef?.setFillStyle(this.def.bodyColor);
        this._fireAnimTween = undefined;
      },
    });
  }

  /**
   * Arrow: snappier recoil than Cannon (lighter recoilScale, shorter recoilMs).
   */
  private _playArrowRecoil(): void {
    if (!this._bodyRef) return;
    this._fireAnimTween?.stop();
    const base = tierSizeScale(this._animTier);
    this._bodyRef.setScale(base * this._animDef.recoilScale);
    this._fireAnimTween = this.scene.tweens.add({
      targets:  this._bodyRef,
      scaleX:   base,
      scaleY:   base,
      duration: this._animDef.recoilMs,
      ease:     'Cubic.Out',
      onComplete: () => { this._fireAnimTween = undefined; },
    });
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
