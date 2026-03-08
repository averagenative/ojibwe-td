/**
 * MetaAmbiance — Living background system for MetaMenuScene.
 *
 * Creates and animates a layered nature scene that renders at depth 0 behind
 * all UI panels:
 *
 *   • Ground: mossy dark strip at the bottom edge
 *   • Trees: silhouette conifers along left/right margins, gentle parallax sway
 *   • Bushes: low rounded clusters at the bottom corners, wind-rustle wobble
 *   • Vines: bezier-sampled tendrils that "grow" into position on scene entry
 *   • Fireflies: persistent glow dots that drift and pulse (warm yellow-green)
 *   • Dust motes: tiny slow-drifting particles for depth
 *   • Falling leaves: 1–4 seasonal leaf triangles with sine-wave horizontal drift
 *   • Boss trophies: one small drawn symbol per defeated boss
 *   • Crystal sparkles: occasional sparkle arcs near the currency display
 *
 * All persistent objects start at alpha 0 and fade in over FADE_IN_MS = 500 ms.
 * Vine growth animates from 0 → 1 over VINE_GROW_MS = 1500 ms.
 *
 * Performance:
 *   - Arc pool capped at 30 (desktop) / 12 (mobile)
 *   - Leaf pool capped at 4 (desktop) / 2 (mobile)
 *   - No heap allocations inside update() (pool-based)
 *   - Bushes and trees redraw at most every BUSH_REDRAW_INTERVAL ms
 */

import Phaser from 'phaser';
import { posHash } from './TerrainRenderer';

// ── Depth ─────────────────────────────────────────────────────────────────────

/** Depth used for all MetaAmbiance game objects. */
export const META_AMBIANCE_DEPTH = 0;

// ── Timing constants ──────────────────────────────────────────────────────────

/** Duration of the entry fade-in for all background elements (ms). */
export const FADE_IN_MS = 500;

/** Duration of the vine growth animation (ms). */
export const VINE_GROW_MS = 1500;

/** Redraw bushes at most this often (ms) — avoids per-frame Graphics clears. */
const BUSH_REDRAW_INTERVAL = 80;

// ── Particle pool sizes ───────────────────────────────────────────────────────

const ARC_POOL_DESKTOP  = 30;
const ARC_POOL_MOBILE   = 12;
const LEAF_POOL_DESKTOP = 4;
const LEAF_POOL_MOBILE  = 2;

const FIREFLY_COUNT_DESKTOP = 7;
const FIREFLY_COUNT_MOBILE  = 3;

// ── Seasonal palette ──────────────────────────────────────────────────────────

/** Visual theme colours per season. */
export interface SeasonalPalette {
  treeFill:     number;
  bushFill:     number;
  vineColor:    number;
  groundFill:   number;
  fireflyColor: number;
  leafColors:   readonly number[];
  dustColor:    number;
  crystalColor: number;
}

/** Seasonal palette map — keyed by SeasonalTheme string. */
export const SEASONAL_PALETTES: Readonly<Record<string, SeasonalPalette>> = {
  summer: {
    treeFill:     0x1a3a10,
    bushFill:     0x143010,
    vineColor:    0x2a6a18,
    groundFill:   0x0d1a0a,
    fireflyColor: 0xddee55,
    leafColors:   [0x44aa22, 0x5a8c3a, 0x33881a],
    dustColor:    0xaaccaa,
    crystalColor: 0x44bbff,
  },
  spring: {
    treeFill:     0x2a5522,
    bushFill:     0x1e4a1a,
    vineColor:    0x3a7a2a,
    groundFill:   0x0f1c0c,
    fireflyColor: 0xeeff88,
    leafColors:   [0x88cc44, 0xffddaa, 0xddbb88],
    dustColor:    0xbbddcc,
    crystalColor: 0x66ddff,
  },
  autumn: {
    treeFill:     0x4a2a08,
    bushFill:     0x3a1c08,
    vineColor:    0x885522,
    groundFill:   0x150f06,
    fireflyColor: 0xffcc44,
    leafColors:   [0xcc6622, 0xdd8833, 0xaa4411],
    dustColor:    0xddaa88,
    crystalColor: 0x88aaff,
  },
  winter: {
    treeFill:     0x1a3a1a,
    bushFill:     0x122a12,
    vineColor:    0x1a441a,
    groundFill:   0x0d150d,
    fireflyColor: 0xaaeeff,
    leafColors:   [0xeef8ff, 0xddeeff, 0xccddff],
    dustColor:    0xccddee,
    crystalColor: 0x99ddff,
  },
} as const;

// ── Config ────────────────────────────────────────────────────────────────────

/** Configuration passed to the MetaAmbiance constructor. */
export interface MetaAmbianceConfig {
  width:            number;
  height:           number;
  season:           'spring' | 'summer' | 'autumn' | 'winter';
  defeatedBossKeys: string[];
  isMobile:         boolean;
}

// ── Boss trophy definitions ───────────────────────────────────────────────────

interface TrophyDef {
  bossKey: string;
  /** Position as fraction of screen width/height. */
  xFrac: number;
  yFrac: number;
  color: number;
}

/** Trophy position/style for each named boss. */
export const BOSS_TROPHIES: readonly TrophyDef[] = [
  { bossKey: 'makwa',      xFrac: 0.04, yFrac: 0.72, color: 0xcc6600 },
  { bossKey: 'migizi',     xFrac: 0.96, yFrac: 0.72, color: 0xffd700 },
  { bossKey: 'waabooz',   xFrac: 0.04, yFrac: 0.55, color: 0xaaddff },
  { bossKey: 'animikiins', xFrac: 0.96, yFrac: 0.55, color: 0x4466ff },
] as const;

// ── Internal pool slot types ──────────────────────────────────────────────────

interface ArcSlot {
  arc:      Phaser.GameObjects.Arc;
  active:   boolean;
  x:        number;
  y:        number;
  vx:       number;
  vy:       number;
  life:     number;
  maxLife:  number;
  phase:    number;
  waveAmpX: number;
  waveFreq: number;
}

interface LeafSlot {
  tri:      Phaser.GameObjects.Triangle;
  active:   boolean;
  x:        number;
  y:        number;
  vx:       number;
  vy:       number;
  life:     number;
  maxLife:  number;
  phase:    number;
  waveAmpX: number;
  waveFreq: number;
  rotVel:   number;
  rot:      number;
}

interface TreeAnchor {
  x:    number;
  y:    number;
  h:    number;   // height of the conifer silhouette
  w:    number;   // width of the conifer base
}

// ── MetaAmbiance ──────────────────────────────────────────────────────────────

export class MetaAmbiance {
  private readonly _scene:  Phaser.Scene;
  private readonly _config: MetaAmbianceConfig;
  private readonly _pal:    SeasonalPalette;
  private readonly _w:      number;
  private readonly _h:      number;
  private readonly _mobile: boolean;

  // ── Graphics objects (nature layer) ───────────────────────────────────────

  private _treeGfx:   Phaser.GameObjects.Graphics | null = null;
  private _bushGfx:   Phaser.GameObjects.Graphics | null = null;
  private _vineGfx:   Phaser.GameObjects.Graphics | null = null;
  private _groundGfx: Phaser.GameObjects.Graphics | null = null;
  private _trophyGfx: Phaser.GameObjects.Graphics | null = null;

  // ── Tree data ──────────────────────────────────────────────────────────────

  private _treeAnchors: TreeAnchor[] = [];
  private _treePhase = 0;

  // ── Bush redraw accumulator ────────────────────────────────────────────────

  private _bushRedrawAcc = 0;

  // ── Vine data ──────────────────────────────────────────────────────────────

  /** Pre-sampled bezier vines: each inner array is an ordered list of (x,y) points. */
  private _vines: Array<Array<{ x: number; y: number }>> = [];
  private _vineProgress = 0;   // 0 → 1

  // ── Firefly persistent objects ─────────────────────────────────────────────

  private _fireflies: Array<{
    arc:   Phaser.GameObjects.Arc;
    x:     number;
    y:     number;
    vx:    number;
    vy:    number;
    phase: number;
  }> = [];

  // ── Particle pools ─────────────────────────────────────────────────────────

  private readonly _pool:     ArcSlot[];
  private readonly _leafPool: LeafSlot[];

  // ── Spawn accumulators (ms since last spawn) ───────────────────────────────

  private _sa: Record<string, number> = { dust: 0, leaf: 0, crystal: 0 };

  // ── Deterministic RNG state ────────────────────────────────────────────────

  /** Seed derived from screen dimensions for deterministic layout. */
  private readonly _seed: number;

  /** Total elapsed ms — used to vary randomness over time. */
  private _elapsed = 0;

  // ── Fade-in state ──────────────────────────────────────────────────────────

  /** Entry fade-in progress (0 → 1 over FADE_IN_MS). */
  private _fadeAlpha = 0;

  // ── Fade-out state ─────────────────────────────────────────────────────────

  private _fadeOut = false;
  private _fadeOutAlpha = 1;
  private _onFadeOutComplete: (() => void) | null = null;

  // ─────────────────────────────────────────────────────────────────────────

  constructor(scene: Phaser.Scene, config: MetaAmbianceConfig) {
    this._scene  = scene;
    this._config = config;
    this._w      = config.width;
    this._h      = config.height;
    this._mobile = config.isMobile;
    this._pal    = SEASONAL_PALETTES[config.season] ?? SEASONAL_PALETTES['summer'];

    // Seed from screen dimensions (deterministic layout).
    this._seed = posHash(
      (this._w * 397 + this._h * 1009) | 0,
      this._w | 0,
      this._h | 0,
      42,
    );

    const arcBudget  = this._mobile ? ARC_POOL_MOBILE  : ARC_POOL_DESKTOP;
    const leafBudget = this._mobile ? LEAF_POOL_MOBILE : LEAF_POOL_DESKTOP;

    this._pool     = this._buildArcPool(arcBudget);
    this._leafPool = this._buildLeafPool(leafBudget);

    this._buildTreeAnchors();
    this._buildVines();
    this._initGraphics();
    this._initFireflies();
    this._initTrophies();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Advance all ambient animations by `delta` milliseconds.
   * Call once per frame from the scene's update() method.
   */
  update(delta: number): void {
    this._elapsed += delta;

    // ── Entry fade-in ──────────────────────────────────────────────────────
    if (this._fadeOut) {
      this._fadeOutAlpha = Math.max(0, this._fadeOutAlpha - delta / 200);
      this._applyFade(this._fadeOutAlpha);
      if (this._fadeOutAlpha <= 0 && this._onFadeOutComplete) {
        const cb = this._onFadeOutComplete;
        this._onFadeOutComplete = null;
        cb();
      }
      return;
    }

    if (this._fadeAlpha < 1) {
      this._fadeAlpha = Math.min(1, this._fadeAlpha + delta / FADE_IN_MS);
      this._applyFade(this._fadeAlpha);
    }

    // ── Vine growth ────────────────────────────────────────────────────────
    if (this._vineProgress < 1) {
      this._vineProgress = Math.min(1, this._vineProgress + delta / VINE_GROW_MS);
      this._redrawVines();
    }

    // ── Tree sway ──────────────────────────────────────────────────────────
    this._treePhase += delta * 0.0006;
    this._redrawTrees();

    // ── Bush rustle (throttled) ────────────────────────────────────────────
    this._bushRedrawAcc += delta;
    if (this._bushRedrawAcc >= BUSH_REDRAW_INTERVAL) {
      this._bushRedrawAcc = 0;
      this._redrawBushes();
    }

    // ── Fireflies ──────────────────────────────────────────────────────────
    this._updateFireflies(delta);

    // ── Particle pools ─────────────────────────────────────────────────────
    this._updateArcPool(delta);
    this._updateLeafPool(delta);

    // ── Particle spawning ──────────────────────────────────────────────────
    this._spawnParticles(delta);
  }

  /**
   * Trigger a 200 ms fade-out, then call `onComplete`.
   * The fade-out replaces the normal entry fade-in.
   */
  startFadeOut(onComplete: () => void): void {
    this._fadeOut           = true;
    this._fadeOutAlpha      = this._fadeAlpha;   // start from current opacity
    this._onFadeOutComplete = onComplete;
  }

  /** Destroy all Phaser game objects created by this system. */
  destroy(): void {
    this._treeGfx?.destroy();
    this._bushGfx?.destroy();
    this._vineGfx?.destroy();
    this._groundGfx?.destroy();
    this._trophyGfx?.destroy();

    for (const f of this._fireflies) f.arc.destroy();
    for (const s of this._pool)      s.arc.destroy();
    for (const s of this._leafPool)  s.tri.destroy();

    this._treeGfx   = null;
    this._bushGfx   = null;
    this._vineGfx   = null;
    this._groundGfx = null;
    this._trophyGfx = null;
    this._fireflies = [];
  }

  // ── Graphics init ─────────────────────────────────────────────────────────

  private _initGraphics(): void {
    // Ground strip (drawn once, no animation)
    this._groundGfx = this._scene.add.graphics()
      .setDepth(META_AMBIANCE_DEPTH).setAlpha(0);
    this._drawGround();

    // Trees (redrawn each frame for sway)
    this._treeGfx = this._scene.add.graphics()
      .setDepth(META_AMBIANCE_DEPTH).setAlpha(0);

    // Bushes (redrawn periodically for wind rustle)
    this._bushGfx = this._scene.add.graphics()
      .setDepth(META_AMBIANCE_DEPTH).setAlpha(0);

    // Vines (redrawn as they grow)
    this._vineGfx = this._scene.add.graphics()
      .setDepth(META_AMBIANCE_DEPTH).setAlpha(0);
  }

  // ── Ground ────────────────────────────────────────────────────────────────

  private _drawGround(): void {
    if (!this._groundGfx) return;
    const groundH = Math.round(this._h * 0.07);
    this._groundGfx.fillStyle(this._pal.groundFill, 0.55);
    this._groundGfx.fillRect(0, this._h - groundH, this._w, groundH);
    this._groundGfx.fillStyle(this._pal.groundFill, 0.25);
    this._groundGfx.fillRect(0, this._h - groundH * 1.6, this._w, groundH * 0.6);
  }

  // ── Trees ─────────────────────────────────────────────────────────────────

  private _buildTreeAnchors(): void {
    const count = this._mobile ? 3 : 5;
    this._treeAnchors = [];

    // Left edge trees
    for (let i = 0; i < count; i++) {
      const yFrac = 0.12 + (i / Math.max(count - 1, 1)) * 0.68;
      this._treeAnchors.push({
        x: 12 + this._seedHash(i, 0) * 22,
        y: yFrac * this._h,
        h: 55 + this._seedHash(i, 1) * 55,
        w: 16 + this._seedHash(i, 2) * 16,
      });
    }

    // Right edge trees
    for (let i = 0; i < count; i++) {
      const yFrac = 0.12 + (i / Math.max(count - 1, 1)) * 0.68;
      this._treeAnchors.push({
        x: this._w - 12 - this._seedHash(i + 10, 0) * 22,
        y: yFrac * this._h,
        h: 55 + this._seedHash(i + 10, 1) * 55,
        w: 16 + this._seedHash(i + 10, 2) * 16,
      });
    }
  }

  private _redrawTrees(): void {
    if (!this._treeGfx) return;
    this._treeGfx.clear();

    for (let i = 0; i < this._treeAnchors.length; i++) {
      const t = this._treeAnchors[i];
      // Parallax sway: trees closer to edge sway more
      const swayAmp = 1.5 + (i % 5) * 0.4;
      const sway    = Math.sin(this._treePhase + i * 0.67) * swayAmp;

      // Draw 3 stacked triangle tiers (classic silhouette conifer)
      for (let tier = 0; tier < 3; tier++) {
        const tierH = t.h * (0.48 - tier * 0.10);
        const tierW = t.w * (0.75 + tier * 0.22);
        // Each tier's tip sways slightly more than the trunk
        const tierSway = sway * (0.4 + tier * 0.3);
        const baseY = t.y - (2 - tier) * t.h * 0.14;
        const tipX  = t.x + tierSway;
        const tipY  = baseY - tierH;
        const leftX  = t.x - tierW / 2;
        const rightX = t.x + tierW / 2;

        this._treeGfx.fillStyle(this._pal.treeFill, 0.50);
        this._treeGfx.fillTriangle(tipX, tipY, leftX, baseY, rightX, baseY);
      }

      // Trunk
      this._treeGfx.fillStyle(this._pal.treeFill, 0.35);
      this._treeGfx.fillRect(t.x - 2, t.y, 4, t.h * 0.18);
    }
  }

  // ── Bushes ────────────────────────────────────────────────────────────────

  private _redrawBushes(): void {
    if (!this._bushGfx) return;
    this._bushGfx.clear();

    const bottomY = this._h - Math.round(this._h * 0.05);
    const positions = [
      { x: 38,           y: bottomY },
      { x: 75,           y: bottomY - 9 },
      { x: 120,          y: bottomY + 3 },
      { x: this._w - 38, y: bottomY },
      { x: this._w - 75, y: bottomY - 9 },
      { x: this._w - 120, y: bottomY + 3 },
    ];

    for (let i = 0; i < positions.length; i++) {
      const pos    = positions[i];
      const r      = 14 + this._seedHash(i, 5) * 12;
      const wobble = Math.sin(this._elapsed * 0.0004 + i * 1.2) * 1.5;

      this._bushGfx.fillStyle(this._pal.bushFill, 0.45);
      this._bushGfx.fillCircle(pos.x + wobble, pos.y, r);
      // Highlight cap
      this._bushGfx.fillStyle(this._pal.bushFill, 0.20);
      this._bushGfx.fillCircle(pos.x + wobble - 2, pos.y - r * 0.3, r * 0.55);
    }
  }

  // ── Vines ─────────────────────────────────────────────────────────────────

  private _buildVines(): void {
    const numVines = this._mobile ? 2 : 4;
    const panelLeft  = this._w / 2 - 220;
    const panelRight = this._w / 2 + 220;
    const stepsPerVine = 22;

    for (let v = 0; v < numVines; v++) {
      const onLeft  = v % 2 === 0;
      const baseX   = onLeft ? panelLeft : panelRight;
      const baseY   = 140 + v * 90;
      const curlDir = onLeft ? -1 : 1;
      const ctrlX   = baseX + curlDir * (28 + this._seedHash(v, 10) * 16);
      const ctrlY   = baseY + 70 + this._seedHash(v, 11) * 30;
      const endX    = baseX + curlDir * (14 + this._seedHash(v, 12) * 10);
      const endY    = baseY + 140 + this._seedHash(v, 13) * 20;

      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i <= stepsPerVine; i++) {
        const t = i / stepsPerVine;
        pts.push({
          x: (1 - t) * (1 - t) * baseX + 2 * (1 - t) * t * ctrlX + t * t * endX,
          y: (1 - t) * (1 - t) * baseY + 2 * (1 - t) * t * ctrlY + t * t * endY,
        });
      }
      this._vines.push(pts);
    }
  }

  private _redrawVines(): void {
    if (!this._vineGfx || this._vines.length === 0) return;
    this._vineGfx.clear();

    for (const vine of this._vines) {
      const endIdx = Math.floor(this._vineProgress * (vine.length - 1));
      if (endIdx < 1) continue;

      this._vineGfx.lineStyle(1.5, this._pal.vineColor, 0.45);
      this._vineGfx.beginPath();
      this._vineGfx.moveTo(vine[0].x, vine[0].y);
      for (let i = 1; i <= endIdx; i++) {
        this._vineGfx.lineTo(vine[i].x, vine[i].y);
      }
      this._vineGfx.strokePath();

      // Small leaf-node circles spaced along the drawn portion
      for (let i = 3; i <= endIdx; i += 5) {
        this._vineGfx.fillStyle(this._pal.vineColor, 0.30);
        this._vineGfx.fillCircle(vine[i].x, vine[i].y, 2);
      }
    }
  }

  // ── Trophies ──────────────────────────────────────────────────────────────

  private _initTrophies(): void {
    const defeated = new Set(this._config.defeatedBossKeys);
    if (defeated.size === 0) return;

    this._trophyGfx = this._scene.add.graphics()
      .setDepth(META_AMBIANCE_DEPTH).setAlpha(0);

    for (const def of BOSS_TROPHIES) {
      if (!defeated.has(def.bossKey)) continue;
      const tx = def.xFrac * this._w;
      const ty = def.yFrac * this._h;
      this._drawTrophy(def.bossKey, tx, ty, def.color);
    }
  }

  private _drawTrophy(bossKey: string, x: number, y: number, color: number): void {
    if (!this._trophyGfx) return;
    this._trophyGfx.fillStyle(color, 0.55);
    this._trophyGfx.lineStyle(1, color, 0.60);

    switch (bossKey) {
      case 'makwa': {
        // Bear skull: circle with two eye dots
        this._trophyGfx.strokeCircle(x, y, 9);
        this._trophyGfx.fillCircle(x - 3, y - 1, 2);
        this._trophyGfx.fillCircle(x + 3, y - 1, 2);
        this._trophyGfx.fillTriangle(x, y + 3, x - 3, y + 8, x + 3, y + 8);
        break;
      }
      case 'migizi': {
        // Eagle feather: elongated teardrop
        this._trophyGfx.fillTriangle(x, y - 14, x - 4, y + 8, x + 4, y + 8);
        this._trophyGfx.strokeCircle(x, y - 12, 3);
        // Quill line
        this._trophyGfx.lineStyle(1, color, 0.50);
        this._trophyGfx.beginPath();
        this._trophyGfx.moveTo(x, y - 10);
        this._trophyGfx.lineTo(x, y + 8);
        this._trophyGfx.strokePath();
        break;
      }
      case 'waabooz': {
        // Bunny ears: two arched ovals
        this._trophyGfx.strokeEllipse(x - 4, y - 8, 5, 12);
        this._trophyGfx.strokeEllipse(x + 4, y - 8, 5, 12);
        // Small head circle below
        this._trophyGfx.strokeCircle(x, y + 3, 4);
        break;
      }
      case 'animikiins': {
        // Thunderbird: zigzag lightning bolt
        this._trophyGfx.beginPath();
        this._trophyGfx.moveTo(x + 2, y - 12);
        this._trophyGfx.lineTo(x - 3, y - 2);
        this._trophyGfx.lineTo(x + 3, y - 2);
        this._trophyGfx.lineTo(x - 2, y + 12);
        this._trophyGfx.strokePath();
        break;
      }
      default:
        // Generic star-dot for unknown bosses
        this._trophyGfx.fillCircle(x, y, 5);
        break;
    }
  }

  // ── Fireflies ─────────────────────────────────────────────────────────────

  private _initFireflies(): void {
    const count = this._mobile ? FIREFLY_COUNT_MOBILE : FIREFLY_COUNT_DESKTOP;
    for (let i = 0; i < count; i++) {
      const x   = this._w * (0.06 + this._seedHash(i, 20) * 0.88);
      const y   = this._h * (0.15 + this._seedHash(i, 21) * 0.65);
      const arc = this._scene.add.arc(x, y, 2, 0, 360, false, this._pal.fireflyColor, 0);
      arc.setDepth(META_AMBIANCE_DEPTH);
      this._fireflies.push({
        arc, x, y,
        vx:    (this._seedHash(i, 22) - 0.5) * 0.022,
        vy:    (this._seedHash(i, 23) - 0.5) * 0.014,
        phase: this._seedHash(i, 24) * Math.PI * 2,
      });
    }
  }

  private _updateFireflies(delta: number): void {
    for (const f of this._fireflies) {
      f.phase += delta * 0.0007;
      f.x += f.vx * delta + Math.sin(f.phase * 0.8) * 0.006 * delta;
      f.y += f.vy * delta + Math.cos(f.phase * 0.6) * 0.004 * delta;

      // Wrap within screen
      if (f.x < 0)       f.x = this._w;
      if (f.x > this._w) f.x = 0;
      if (f.y < 0)       f.y = this._h;
      if (f.y > this._h) f.y = 0;

      f.arc.x = f.x;
      f.arc.y = f.y;

      // Fade-modulated glow pulse
      const glow = Math.max(0, Math.sin(f.phase)) * this._fadeAlpha;
      f.arc.setAlpha(glow * 0.55);
    }
  }

  // ── Pool build ────────────────────────────────────────────────────────────

  private _buildArcPool(size: number): ArcSlot[] {
    const slots: ArcSlot[] = [];
    for (let i = 0; i < size; i++) {
      const arc = this._scene.add.arc(0, 0, 1, 0, 360, false, 0xffffff, 0);
      arc.setDepth(META_AMBIANCE_DEPTH);
      arc.setActive(false).setVisible(false);
      slots.push({
        arc, active: false,
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1000,
        phase: 0, waveAmpX: 0, waveFreq: 0,
      });
    }
    return slots;
  }

  private _buildLeafPool(size: number): LeafSlot[] {
    const slots: LeafSlot[] = [];
    for (let i = 0; i < size; i++) {
      const tri = this._scene.add.triangle(0, 0, 0, -5, 4, 3, -4, 3, 0x88aa33, 0);
      tri.setDepth(META_AMBIANCE_DEPTH);
      tri.setActive(false).setVisible(false);
      slots.push({
        tri, active: false,
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1000,
        phase: 0, waveAmpX: 0, waveFreq: 0,
        rotVel: 0, rot: 0,
      });
    }
    return slots;
  }

  // ── Pool update ───────────────────────────────────────────────────────────

  private _updateArcPool(delta: number): void {
    for (const s of this._pool) {
      if (!s.active) continue;

      s.life -= delta;
      if (s.life <= 0) {
        s.active = false;
        s.arc.setActive(false).setVisible(false);
        continue;
      }

      s.phase += s.waveFreq * delta;
      s.x     += s.vx * delta + Math.sin(s.phase) * s.waveAmpX * 0.001 * delta;
      s.y     += s.vy * delta;
      s.arc.x  = s.x;
      s.arc.y  = s.y;

      // Fade out over last 30 % of life
      const t = s.life / s.maxLife;
      if (t < 0.30) {
        s.arc.setAlpha(s.arc.alpha * (t / 0.30));
      }
    }
  }

  private _updateLeafPool(delta: number): void {
    for (const s of this._leafPool) {
      if (!s.active) continue;

      s.life -= delta;
      if (s.life <= 0) {
        s.active = false;
        s.tri.setActive(false).setVisible(false);
        continue;
      }

      s.phase += s.waveFreq * delta;
      s.rot   += s.rotVel   * delta;
      s.x     += s.vx * delta + Math.sin(s.phase) * s.waveAmpX;
      s.y     += s.vy * delta;

      s.tri.setPosition(s.x, s.y);
      s.tri.setRotation(s.rot);

      // Fade out over last 25 % of life
      const t = s.life / s.maxLife;
      if (t < 0.25) {
        s.tri.setAlpha(s.tri.alpha * (t / 0.25));
      }
    }
  }

  // ── Particle emit helpers ─────────────────────────────────────────────────

  /**
   * Activate an idle Arc pool slot.  Does nothing if all slots are busy.
   */
  private _emitArc(
    x: number, y: number,
    vx: number, vy: number,
    maxLife: number,
    radius: number,
    color: number,
    alpha: number,
    waveAmpX: number,
    waveFreq: number,
  ): void {
    const slot = this._pool.find(s => !s.active);
    if (!slot) return;

    slot.active   = true;
    slot.x        = x;
    slot.y        = y;
    slot.vx       = vx;
    slot.vy       = vy;
    slot.life     = maxLife;
    slot.maxLife  = maxLife;
    slot.phase    = this._rng(31) * Math.PI * 2;
    slot.waveAmpX = waveAmpX;
    slot.waveFreq = waveFreq;

    slot.arc.setRadius(radius);
    slot.arc.setFillStyle(color, alpha * this._fadeAlpha);
    slot.arc.setPosition(x, y);
    slot.arc.setActive(true).setVisible(true);
  }

  /**
   * Activate an idle Leaf pool slot.
   */
  private _emitLeaf(): void {
    const leafSlot = this._leafPool.find(s => !s.active);
    if (!leafSlot) return;

    const x    = this._rng(50) * this._w;
    const cols = this._pal.leafColors;
    const col  = cols[Math.floor(this._rng(51) * cols.length)];

    leafSlot.active   = true;
    leafSlot.x        = x;
    leafSlot.y        = -8;
    leafSlot.vx       = (this._rng(52) - 0.5) * 0.02 + 0.008;
    leafSlot.vy       = 0.025 + this._rng(53) * 0.018;
    leafSlot.life     = 6000 + this._rng(54) * 5000;
    leafSlot.maxLife  = leafSlot.life;
    leafSlot.phase    = this._rng(55) * Math.PI * 2;
    leafSlot.waveAmpX = 7;
    leafSlot.waveFreq = 0.0008 + this._rng(56) * 0.0006;
    leafSlot.rotVel   = (this._rng(57) - 0.5) * 0.003;
    leafSlot.rot      = this._rng(58) * Math.PI * 2;

    leafSlot.tri.setFillStyle(col, 0.50 * this._fadeAlpha);
    leafSlot.tri.setPosition(x, -8);
    leafSlot.tri.setRotation(leafSlot.rot);
    leafSlot.tri.setActive(true).setVisible(true);
  }

  // ── Particle spawning ─────────────────────────────────────────────────────

  private _spawnParticles(delta: number): void {
    // Dust motes — tiny slow-drifting particles
    this._sa.dust += delta;
    const dustInterval = this._mobile ? 2200 : 1100;
    if (this._sa.dust >= dustInterval) {
      this._sa.dust = 0;
      const x = this._rng(60) * this._w;
      const y = this._h * (0.05 + this._rng(61) * 0.85);
      this._emitArc(
        x, y,
        (this._rng(62) - 0.5) * 0.008,
        (this._rng(63) - 0.5) * 0.005,
        4000, 1, this._pal.dustColor, 0.12,
        2, 0.0003,
      );
    }

    // Falling leaves
    this._sa.leaf += delta;
    const leafInterval = this._mobile ? 4000 : 2000;
    if (this._sa.leaf >= leafInterval && this._fadeAlpha > 0.4) {
      this._sa.leaf = 0;
      this._emitLeaf();
    }

    // Crystal sparkles near top-centre (currency display area)
    this._sa.crystal += delta;
    const crystalInterval = this._mobile ? 3500 : 1800;
    if (this._sa.crystal >= crystalInterval && this._fadeAlpha > 0.4) {
      this._sa.crystal = 0;
      // Currency display is roughly at cx=640, y=76
      const cx = this._w / 2 + (this._rng(70) - 0.5) * 80;
      const cy = 76 + (this._rng(71) - 0.5) * 18;
      this._emitArc(
        cx, cy,
        (this._rng(72) - 0.5) * 0.015,
        -0.015 - this._rng(73) * 0.010,
        700, 2, this._pal.crystalColor, 0.45,
        3, 0.0012,
      );
    }
  }

  // ── Fade application ──────────────────────────────────────────────────────

  private _applyFade(alpha: number): void {
    if (this._treeGfx)   this._treeGfx.setAlpha(alpha);
    if (this._bushGfx)   this._bushGfx.setAlpha(alpha);
    if (this._vineGfx)   this._vineGfx.setAlpha(alpha);
    if (this._groundGfx) this._groundGfx.setAlpha(alpha);
    if (this._trophyGfx) this._trophyGfx.setAlpha(alpha * 0.85);
    for (const f of this._fireflies) {
      // Fireflies have their own glow; clamp their max by the fade alpha
      const glow = Math.max(0, Math.sin(f.phase));
      f.arc.setAlpha(glow * 0.55 * alpha);
    }
  }

  // ── Deterministic helpers ─────────────────────────────────────────────────

  /** Time-varying pseudo-random float in [0, 1). */
  private _rng(salt: number): number {
    return posHash(this._seed, Math.floor(this._elapsed * 0.01) | 0, salt, 0);
  }

  /** Seed-only hash for initial placement (not time-varying). */
  private _seedHash(index: number, salt: number): number {
    return posHash(this._seed, index, salt, 777);
  }
}
