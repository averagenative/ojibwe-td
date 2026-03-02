/**
 * TrailPool — zero-GC object pool for short-lived circle particles.
 *
 * Problem: Projectile trail particles are emitted every 30 ms per active
 * projectile, and each one previously created a new Phaser.GameObjects.Arc +
 * a Tween object that were both destroyed 180 ms later. With 10+ simultaneous
 * projectiles at 2× speed this caused ~40 object allocations per frame, each
 * triggering a GC event when collected.
 *
 * Solution: Pre-allocate a fixed pool of Arc objects. On each emit(), reuse
 * an idle arc (setActive(true)/setVisible(true)), then fade it manually in
 * update() by decrementing alpha each frame. No Tweens, no create/destroy.
 *
 * Lifecycle:
 *   1. GameScene.create()  → new TrailPool(scene) + scene.data.set('trailPool', pool)
 *   2. GameScene.update()  → pool.update(scaledDelta)
 *   3. GameScene.shutdown() → pool.destroy()
 *   4. Projectile.emitTrailParticle() → reads pool from scene.data, calls pool.emit()
 */

import Phaser from 'phaser';

interface PooledArc {
  arc:        Phaser.GameObjects.Arc;
  /** Remaining alpha — particle is idle when this reaches 0. */
  alpha:      number;
  /** Alpha units to subtract per millisecond. */
  decayPerMs: number;
}

export class TrailPool {
  private readonly particles: PooledArc[] = [];
  private readonly scene: Phaser.Scene;

  /**
   * @param scene    Scene that owns the Arc game objects.
   * @param capacity Initial pool size — grows if all slots are busy.
   *                 80 covers ~6 active projectiles × 13 live particles each.
   */
  constructor(scene: Phaser.Scene, capacity = 80) {
    this.scene = scene;
    for (let i = 0; i < capacity; i++) {
      this._addSlot();
    }
  }

  // ── public ────────────────────────────────────────────────────────────────

  /**
   * Activate a pooled arc at world position (x, y).
   * The arc fades from `alpha` to 0 over `lifetimeMs` game-time milliseconds
   * (automatically scaled with game speed by the caller passing scaledDelta).
   */
  emit(
    x:          number,
    y:          number,
    radius:     number,
    color:      number,
    alpha:      number,
    depth:      number,
    lifetimeMs: number,
  ): void {
    const slot = this._acquire();
    slot.arc.setPosition(x, y);
    slot.arc.setRadius(radius);
    slot.arc.setFillStyle(color);
    slot.arc.setDepth(depth);
    slot.arc.setAlpha(alpha);
    slot.arc.setActive(true).setVisible(true);
    slot.alpha      = alpha;
    slot.decayPerMs = alpha / lifetimeMs;
  }

  /**
   * Advance all active particles.
   * Call once per game-loop tick with the *scaled* delta (game-time ms).
   */
  update(delta: number): void {
    for (const p of this.particles) {
      if (!p.arc.active) continue;
      p.alpha -= p.decayPerMs * delta;
      if (p.alpha <= 0) {
        p.arc.setActive(false).setVisible(false);
      } else {
        p.arc.setAlpha(p.alpha);
      }
    }
  }

  /** Release all Phaser objects. Call from GameScene.shutdown(). */
  destroy(): void {
    for (const p of this.particles) p.arc.destroy();
    this.particles.length = 0;
  }

  // ── private ───────────────────────────────────────────────────────────────

  private _addSlot(): PooledArc {
    const arc = this.scene.add.circle(0, 0, 2, 0xffffff, 0);
    arc.setDepth(18).setActive(false).setVisible(false);
    const slot: PooledArc = { arc, alpha: 0, decayPerMs: 0 };
    this.particles.push(slot);
    return slot;
  }

  /** Find an idle slot, growing the pool if every slot is active. */
  private _acquire(): PooledArc {
    for (const p of this.particles) {
      if (!p.arc.active) return p;
    }
    // Pool exhausted: grow by one (rare under normal play).
    return this._addSlot();
  }
}
