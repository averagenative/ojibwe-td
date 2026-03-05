/**
 * AmbientVFX — Continuous ambient particle and Graphics effects per map region.
 *
 * Effects render at depth 2 (above terrain decorations, below path markers/towers).
 * All effects are purely cosmetic — zero gameplay impact.
 *
 * Performance budget:
 *   - Max 30 active Arc particles from the pool at once
 *   - Persistent objects (mist, aurora, sunlight patches, fireflies) are a small
 *     fixed count and do not compete for pool slots
 *   - Mobile: 50-60 % fewer pool particles; mist + aurora disabled
 *
 * Pause behaviour: the caller (GameScene.update) is responsible for not calling
 * update() when speedMultiplier === 0. Effects are fully frozen during that time.
 *
 * Region → effect-set mapping:
 *   zaagaiganing  → sunlight patches, water shimmer, vine glow
 *   mashkiig      → mist, fireflies, bubbles
 *   mitigomizh    → pollen, grass sway, butterfly
 *   biboon-aki    → snow twinkle, snowfall, breath frost, aurora
 *   niizh-miikana → falling leaves, light rays  (stageId override for mashkiig sub-stage)
 */

import Phaser from 'phaser';
import type { MapData } from '../types/MapData';
import { TILE } from '../types/MapData';
import { mapIdToSeed, posHash } from './TerrainRenderer';

// ── Depth ─────────────────────────────────────────────────────────────────────

/** Depth shared by all ambient VFX objects. Above terrain (0-1), same as path layer (2). */
export const AMBIENT_VFX_DEPTH = 2;

// ── Pool slot types ───────────────────────────────────────────────────────────

interface ArcSlot {
  arc:       Phaser.GameObjects.Arc;
  active:    boolean;
  x:         number;
  y:         number;
  vx:        number;   // px / ms
  vy:        number;
  life:      number;   // ms remaining (0 = idle)
  maxLife:   number;
  phase:     number;   // radians — for sine-wave vertical bob
  waveAmpY:  number;   // vertical sine amplitude in pixels
  waveFreq:  number;   // rad / ms
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
  waveAmpY: number;
  waveFreq: number;
  rotVel:   number;  // rad / ms — leaf rotation speed
  rot:      number;
}

// ── AmbientVFX ────────────────────────────────────────────────────────────────

export class AmbientVFX {
  private readonly _scene:    Phaser.Scene;
  private readonly _effectId: string;
  private readonly _mobile:   boolean;
  private readonly _seed:     number;
  private readonly _mapW:     number;
  private readonly _mapH:     number;

  // ── Dynamic particle pools ────────────────────────────────────────────────

  /** Dot (Arc) pool — max POOL_BUDGET slots, shared across all effects. */
  private readonly _pool:     ArcSlot[];
  /** Leaf (Triangle) pool — used only for niizh-miikana falling leaves. */
  private readonly _leafPool: LeafSlot[];

  // ── Persistent effect objects ─────────────────────────────────────────────

  private _sunPatches: Array<{
    arc:    Phaser.GameObjects.Arc;
    phase:  number;   // current sine phase
    period: number;   // ms for one full alpha cycle
  }> = [];

  private _fireflies: Array<{
    arc:   Phaser.GameObjects.Arc;
    x:     number; y: number;
    vx:    number; vy: number;
    phase: number;
  }> = [];

  private _mist:      Phaser.GameObjects.Rectangle | null = null;
  private _mistPhase  = 0;

  private _aurora: Array<{
    rect:   Phaser.GameObjects.Rectangle;
    phase:  number;
    color:  number;
  }> = [];

  private _butterfly:  Phaser.GameObjects.Triangle | null = null;
  private _bfly = {
    active: false, x: 0, y: 0,
    vx: 0, phase: 0,
    timer: 0, nextSpawn: 0,
  };

  private _grassGfx:       Phaser.GameObjects.Graphics | null = null;
  private _grassTiles:     Array<{ x: number; y: number }>   = [];
  private _grassPhase      = 0;
  private _grassRedrawAcc  = 0;

  private _lightRays: Array<{
    rect:  Phaser.GameObjects.Rectangle;
    phase: number;
    baseX: number;
  }> = [];

  // ── Tile anchor lists ─────────────────────────────────────────────────────

  private _waterEdgeTiles: Array<{ x: number; y: number }> = [];
  private _buildableTiles: Array<{ x: number; y: number }> = [];
  private _pathTiles:      Array<{ x: number; y: number }> = [];

  // ── Spawn accumulators (ms since last spawn for each effect) ──────────────

  private _sa: Record<string, number> = {};

  /** Total elapsed game-time ms — used to vary randomness over time. */
  private _elapsed = 0;

  // ─────────────────────────────────────────────────────────────────────────

  constructor(
    scene:    Phaser.Scene,
    mapData:  MapData,
    regionId: string,
    stageId:  string,
    isMobile: boolean,
  ) {
    this._scene  = scene;
    this._mobile = isMobile;
    this._seed   = mapIdToSeed(mapData.id);
    this._mapW   = mapData.cols * mapData.tileSize;
    this._mapH   = mapData.rows * mapData.tileSize;

    // niizh-miikana is a mashkiig sub-stage with its own ambient geography.
    this._effectId = stageId.startsWith('niizh-miikana') ? 'niizh-miikana' : regionId;

    // Arc pool: 30 desktop, 12 mobile (~60 % reduction)
    const poolBudget = isMobile ? 12 : 30;
    this._pool     = this._buildArcPool(poolBudget);
    // Leaf pool: 4 desktop, 2 mobile
    this._leafPool = this._buildLeafPool(isMobile ? 2 : 4);

    this._buildTileLists(mapData);
    this._initEffects(mapData);
  }

  // ── Public interface ──────────────────────────────────────────────────────

  /**
   * Advance all ambient effects by `delta` ms of game time.
   * Should only be called when the game is not paused (GameScene.update handles this).
   */
  update(delta: number): void {
    this._elapsed += delta;
    this._updatePool(delta);
    this._updateLeafPool(delta);

    switch (this._effectId) {
      case 'zaagaiganing':  this._updateZaagaiganing(delta);  break;
      case 'mashkiig':      this._updateMashkiig(delta);      break;
      case 'mitigomizh':    this._updateMitigomizh(delta);    break;
      case 'biboon-aki':    this._updateBiboonAki(delta);     break;
      case 'niizh-miikana': this._updateNiizhMiikana(delta);  break;
      default: break;
    }
  }

  /** Destroy all Phaser objects created by this system. */
  destroy(): void {
    for (const s of this._pool)     { s.arc.destroy(); }
    for (const s of this._leafPool) { s.tri.destroy(); }

    for (const p of this._sunPatches) p.arc.destroy();
    for (const f of this._fireflies)  f.arc.destroy();
    for (const a of this._aurora)     a.rect.destroy();
    for (const r of this._lightRays)  r.rect.destroy();

    this._mist?.destroy();
    this._butterfly?.destroy();
    this._grassGfx?.destroy();
  }

  // ── Pool construction ─────────────────────────────────────────────────────

  private _buildArcPool(size: number): ArcSlot[] {
    const slots: ArcSlot[] = [];
    for (let i = 0; i < size; i++) {
      const arc = this._scene.add.arc(0, 0, 2, 0, 360, false, 0xffffff, 0);
      arc.setDepth(AMBIENT_VFX_DEPTH);
      arc.setActive(false).setVisible(false);
      slots.push({
        arc, active: false,
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1000,
        phase: 0, waveAmpY: 0, waveFreq: 0,
      });
    }
    return slots;
  }

  private _buildLeafPool(size: number): LeafSlot[] {
    const slots: LeafSlot[] = [];
    for (let i = 0; i < size; i++) {
      // Small triangle resembling a leaf
      const tri = this._scene.add.triangle(0, 0, 0, -5, 4, 3, -4, 3, 0x8b4513, 0);
      tri.setDepth(AMBIENT_VFX_DEPTH);
      tri.setActive(false).setVisible(false);
      slots.push({
        tri, active: false,
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1000,
        phase: 0, waveAmpY: 0, waveFreq: 0,
        rotVel: 0, rot: 0,
      });
    }
    return slots;
  }

  // ── Tile list pre-computation ─────────────────────────────────────────────

  private _buildTileLists(mapData: MapData): void {
    const { tiles, rows, cols, tileSize: ts } = mapData;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = c * ts + ts / 2;
        const cy = r * ts + ts / 2;
        if (tiles[r][c] === TILE.PATH) {
          this._pathTiles.push({ x: cx, y: cy });
          // water edge: PATH tile adjacent to a BUILDABLE tile
          if (this._hasAdjacentBuildable(tiles, r, c, rows, cols)) {
            this._waterEdgeTiles.push({ x: cx, y: cy });
          }
        } else if (tiles[r][c] === TILE.BUILDABLE) {
          this._buildableTiles.push({ x: cx, y: cy });
        }
      }
    }
  }

  private _hasAdjacentBuildable(
    tiles: number[][], r: number, c: number, rows: number, cols: number,
  ): boolean {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr; const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && tiles[nr][nc] === TILE.BUILDABLE) {
          return true;
        }
      }
    }
    return false;
  }

  // ── Region initialisation ─────────────────────────────────────────────────

  private _initEffects(mapData: MapData): void {
    switch (this._effectId) {
      case 'zaagaiganing':  this._initZaagaiganing();          break;
      case 'mashkiig':      this._initMashkiig(mapData);       break;
      case 'mitigomizh':    this._initMitigomizh(mapData);     break;
      case 'biboon-aki':    this._initBiboonAki();             break;
      case 'niizh-miikana': this._initNiizhMiikana(mapData);   break;
      default: break;
    }
  }

  // ── zaagaiganing ──────────────────────────────────────────────────────────

  private _initZaagaiganing(): void {
    // 3 large faint sunlight patches drifting across the map
    const sunPositions = [
      { x: this._mapW * 0.25, y: this._mapH * 0.35 },
      { x: this._mapW * 0.6,  y: this._mapH * 0.55 },
      { x: this._mapW * 0.45, y: this._mapH * 0.75 },
    ];
    const periods = [4200, 5100, 3800];  // ms per full alpha cycle

    for (let i = 0; i < 3; i++) {
      const arc = this._scene.add.arc(
        sunPositions[i].x, sunPositions[i].y,
        35 + i * 8, 0, 360, false,
        0xfff0a0, 0,
      );
      arc.setDepth(AMBIENT_VFX_DEPTH);
      this._sunPatches.push({ arc, phase: i * Math.PI * 0.7, period: periods[i] });
    }

    // Spawn timer primes
    this._sa.shimmer  = 0;
    this._sa.vineGlow = 0;
  }

  private _updateZaagaiganing(delta: number): void {
    // Sunlight patches — gentle alpha pulse
    for (const p of this._sunPatches) {
      p.phase += (delta / p.period) * Math.PI * 2;
      const a = 0.025 + 0.02 * Math.sin(p.phase);
      p.arc.setAlpha(a);
      // Very slow drift
      p.arc.x += Math.sin(p.phase * 0.13) * 0.008 * delta;
      p.arc.y += Math.cos(p.phase * 0.09) * 0.006 * delta;
      // Wrap within map bounds
      if (p.arc.x < 0)          p.arc.x = this._mapW;
      if (p.arc.x > this._mapW) p.arc.x = 0;
    }

    // Water shimmer sparkles near path edges
    this._sa.shimmer = (this._sa.shimmer ?? 0) + delta;
    const shimmerInterval = this._mobile ? 1200 : 700;
    if (this._sa.shimmer >= shimmerInterval && this._waterEdgeTiles.length > 0) {
      this._sa.shimmer = 0;
      const tile = this._randomTile(this._waterEdgeTiles, 100);
      const ox = (this._rng(1) - 0.5) * 12;
      const oy = (this._rng(2) - 0.5) * 12;
      this._emitArc(
        tile.x + ox, tile.y + oy,
        (this._rng(3) - 0.5) * 0.01, (this._rng(4) - 0.5) * 0.01,
        800, 2, 0xaaddff, 0.35,
        0, 0,
      );
    }

    // Vine glow — soft green pulse on buildable tiles near path
    this._sa.vineGlow = (this._sa.vineGlow ?? 0) + delta;
    const vineInterval = this._mobile ? 2000 : 1200;
    if (this._sa.vineGlow >= vineInterval && this._buildableTiles.length > 0) {
      this._sa.vineGlow = 0;
      const tile = this._randomTile(this._buildableTiles, 101);
      this._emitArc(
        tile.x, tile.y,
        0, 0,
        1000, 4, 0x44cc44, 0.18,
        0, 0,
      );
    }
  }

  // ── mashkiig ──────────────────────────────────────────────────────────────

  private _initMashkiig(_mapData: MapData): void {
    // Mist layer — disabled on mobile
    if (!this._mobile) {
      const mistY = this._mapH * 0.68;
      this._mist = this._scene.add.rectangle(
        this._mapW / 2, mistY,
        this._mapW * 1.3, this._mapH * 0.35,
        0xe8f0f0, 0.04,
      );
      this._mist.setDepth(AMBIENT_VFX_DEPTH);
      this._mistPhase = 0;
    }

    // Fireflies — 5 desktop, 2 mobile
    const ffCount = this._mobile ? 2 : 5;
    for (let i = 0; i < ffCount; i++) {
      const x = this._mapW * (0.15 + this._seedHash(i, 0) * 0.7);
      const y = this._mapH * (0.4  + this._seedHash(i, 1) * 0.5);
      const arc = this._scene.add.arc(x, y, 2, 0, 360, false, 0xccee66, 0);
      arc.setDepth(AMBIENT_VFX_DEPTH);
      this._fireflies.push({
        arc, x, y,
        vx: (this._seedHash(i, 2) - 0.5) * 0.025,
        vy: (this._seedHash(i, 3) - 0.5) * 0.015,
        phase: this._seedHash(i, 4) * Math.PI * 2,
      });
    }

    this._sa.bubbles = 0;
  }

  private _updateMashkiig(delta: number): void {
    // Mist drift
    if (this._mist) {
      this._mistPhase += delta * 0.00015;
      this._mist.x    = this._mapW / 2 + Math.sin(this._mistPhase) * 18;
      // Subtle alpha pulse
      this._mist.setAlpha(0.03 + 0.01 * Math.sin(this._mistPhase * 1.7));
    }

    // Firefly drift + fade in/out
    for (const f of this._fireflies) {
      f.phase += delta * 0.0007;
      f.x += f.vx * delta + Math.sin(f.phase * 0.8) * 0.006 * delta;
      f.y += f.vy * delta + Math.cos(f.phase * 0.6) * 0.004 * delta;
      // Bounce within map
      if (f.x < 0 || f.x > this._mapW) f.vx *= -1;
      if (f.y < 0 || f.y > this._mapH) f.vy *= -1;
      f.arc.x = f.x;
      f.arc.y = f.y;
      const a = 0.05 + 0.45 * Math.max(0, Math.sin(f.phase));
      f.arc.setAlpha(a);
    }

    // Bubbles rising from path tiles
    this._sa.bubbles = (this._sa.bubbles ?? 0) + delta;
    const bubbleInterval = this._mobile ? 2500 : 1400;
    if (this._sa.bubbles >= bubbleInterval && this._pathTiles.length > 0) {
      this._sa.bubbles = 0;
      const tile = this._randomTile(this._pathTiles, 102);
      this._emitArc(
        tile.x + (this._rng(5) - 0.5) * 10,
        tile.y,
        (this._rng(6) - 0.5) * 0.008,
        -0.04,    // rising
        1600, 2, 0xaaccee, 0.3,
        0, 0,
      );
    }
  }

  // ── mitigomizh ────────────────────────────────────────────────────────────

  private _initMitigomizh(_mapData: MapData): void {
    // Grass sway — Graphics object covering buildable tiles
    this._grassGfx = this._scene.add.graphics();
    this._grassGfx.setDepth(AMBIENT_VFX_DEPTH);
    // Collect a sparse sample of buildable tiles for sway
    this._grassTiles = this._buildableTiles.filter((_, i) =>
      this._seedHash(i, 20) < (this._mobile ? 0.06 : 0.12),
    );
    this._grassPhase = 0;

    // Butterfly — single persistent Triangle, starts hidden
    this._butterfly = this._scene.add.triangle(
      -50, -50, 0, -6, 5, 4, -5, 4, 0xf4c842, 0,
    );
    this._butterfly.setDepth(AMBIENT_VFX_DEPTH);
    this._bfly = {
      active: false, x: -50, y: -50,
      vx: 0, phase: 0,
      timer: 0, nextSpawn: 5000 + this._rng(10) * 25000,
    };

    this._sa.pollen = 0;
  }

  private _updateMitigomizh(delta: number): void {
    // Pollen/seeds — horizontal drift + sine vertical bob
    this._sa.pollen = (this._sa.pollen ?? 0) + delta;
    const pollenInterval = this._mobile ? 1800 : 900;
    if (this._sa.pollen >= pollenInterval) {
      this._sa.pollen = 0;
      const y = this._rng(7) * this._mapH;
      this._emitArc(
        -4, y,
        0.03 + this._rng(8) * 0.02,   // gentle right drift
        0,
        8000, 2, 0xfffaaa, 0.22,
        3 + this._rng(9) * 4,          // sine bob amplitude
        0.0008 + this._rng(11) * 0.0006,
      );
    }

    // Grass sway wave — redraw every ~80 ms
    this._grassRedrawAcc = (this._grassRedrawAcc ?? 0) + delta;
    if (this._grassRedrawAcc >= 80) {
      this._grassRedrawAcc = 0;
      this._grassPhase += 0.04;
      this._redrawGrass();
    }

    // Butterfly logic
    this._bfly.timer += delta;
    if (!this._bfly.active) {
      if (this._bfly.timer >= this._bfly.nextSpawn) {
        this._launchButterfly();
      }
    } else {
      this._stepButterfly(delta);
    }
  }

  private _redrawGrass(): void {
    if (!this._grassGfx) return;
    this._grassGfx.clear();
    for (let i = 0; i < this._grassTiles.length; i++) {
      const tile = this._grassTiles[i];
      const wave = Math.sin(this._grassPhase - i * 0.4) * 0.5 + 0.5;
      const a    = wave * 0.06;
      if (a < 0.005) continue;
      this._grassGfx.fillStyle(0x88bb44, a);
      this._grassGfx.fillRect(tile.x - 8, tile.y - 8, 16, 16);
    }
  }

  private _launchButterfly(): void {
    if (!this._butterfly) return;
    // Fly from left to right at a random vertical position
    const y = this._mapH * (0.2 + this._rng(12) * 0.6);
    this._bfly.active = true;
    this._bfly.x      = -10;
    this._bfly.y      = y;
    this._bfly.vx     = 0.065 + this._rng(13) * 0.04;
    this._bfly.phase  = 0;
    this._butterfly.setPosition(-10, y);
    this._butterfly.setAlpha(0.6);
    this._butterfly.setVisible(true);
  }

  private _stepButterfly(delta: number): void {
    if (!this._butterfly || !this._bfly.active) return;
    this._bfly.phase += delta * 0.0018;
    this._bfly.x     += this._bfly.vx * delta;
    const wobbleY     = Math.sin(this._bfly.phase) * 18;
    this._butterfly.setPosition(this._bfly.x, this._bfly.y + wobbleY);
    // Flap: subtle scale oscillation
    const flap = 0.85 + 0.15 * Math.abs(Math.sin(this._bfly.phase * 3));
    this._butterfly.setScale(flap, 1);
    // Off-screen → hide and schedule next
    if (this._bfly.x > this._mapW + 20) {
      this._bfly.active    = false;
      this._bfly.timer     = 0;
      this._bfly.nextSpawn = 30000 + this._rng(14) * 30000;
      this._butterfly.setVisible(false);
    }
  }

  // ── biboon-aki ────────────────────────────────────────────────────────────

  private _initBiboonAki(): void {
    // Aurora shimmer — disabled on mobile
    if (!this._mobile) {
      const auroraColors  = [0x44ff88, 0x8844ff, 0x44aaff];
      const auroraOffsets = [0, this._mapH * 0.04, this._mapH * 0.08];
      for (let i = 0; i < 3; i++) {
        const rect = this._scene.add.rectangle(
          this._mapW / 2, auroraOffsets[i],
          this._mapW * 1.1, 28,
          auroraColors[i], 0,
        );
        rect.setDepth(AMBIENT_VFX_DEPTH);
        this._aurora.push({ rect, phase: i * 1.1, color: auroraColors[i] });
      }
    }

    this._sa.snowTwinkle  = 0;
    this._sa.snowfall     = 0;
    this._sa.breathFrost  = 0;
  }

  private _updateBiboonAki(delta: number): void {
    // Aurora shimmer
    for (const a of this._aurora) {
      a.phase += delta * 0.0004;
      const alpha = 0.03 * Math.max(0, Math.sin(a.phase));
      a.rect.setAlpha(alpha);
      a.rect.x = this._mapW / 2 + Math.sin(a.phase * 0.3) * 25;
    }

    // Snow twinkle — brief bright flashes on random buildable tiles
    this._sa.snowTwinkle = (this._sa.snowTwinkle ?? 0) + delta;
    const twinkleInterval = this._mobile ? 1000 : 550;
    if (this._sa.snowTwinkle >= twinkleInterval && this._buildableTiles.length > 0) {
      this._sa.snowTwinkle = 0;
      const tile = this._randomTile(this._buildableTiles, 103);
      this._emitArc(
        tile.x + (this._rng(15) - 0.5) * 14,
        tile.y + (this._rng(16) - 0.5) * 14,
        0, 0,
        350, 2, 0xeef8ff, 0.55,
        0, 0,
      );
    }

    // Light snowfall — diagonal drift
    this._sa.snowfall = (this._sa.snowfall ?? 0) + delta;
    const snowInterval = this._mobile ? 2200 : 1200;
    if (this._sa.snowfall >= snowInterval) {
      this._sa.snowfall = 0;
      const x = this._rng(17) * this._mapW;
      this._emitArc(
        x, -5,
        0.012 + this._rng(18) * 0.01,    // slight right drift
        0.022 + this._rng(19) * 0.015,   // falling
        7000, 2, 0xddeeff, 0.28,
        1.5, 0.0006,
      );
    }

    // Breath frost — near HUD (top strip, ~y 24-56)
    this._sa.breathFrost = (this._sa.breathFrost ?? 0) + delta;
    const frostInterval = this._mobile ? 4000 : 2200;
    if (this._sa.breathFrost >= frostInterval) {
      this._sa.breathFrost = 0;
      // Near the commander area (right side of HUD)
      this._emitArc(
        1100 + (this._rng(20) - 0.5) * 80, 40,
        (this._rng(21) - 0.5) * 0.015, -0.02,
        900, 4, 0xe8f4f8, 0.2,
        0, 0,
      );
    }
  }

  // ── niizh-miikana ─────────────────────────────────────────────────────────

  private _initNiizhMiikana(_mapData: MapData): void {
    // Light ray rectangles — diagonal god-rays through the canopy
    const rayCount = this._mobile ? 0 : 4;
    for (let i = 0; i < rayCount; i++) {
      const baseX = this._mapW * (0.1 + i * 0.25);
      const rect  = this._scene.add.rectangle(
        baseX, this._mapH * 0.35,
        22, this._mapH * 0.8,
        0xffeeaa, 0,
      );
      rect.setRotation(-0.25);  // ~-14° diagonal slant
      rect.setDepth(AMBIENT_VFX_DEPTH);
      this._lightRays.push({ rect, phase: i * 1.3, baseX });
    }

    this._sa.leaves = 0;
  }

  private _updateNiizhMiikana(delta: number): void {
    // Light rays — slow phase shift in alpha
    for (const r of this._lightRays) {
      r.phase += delta * 0.00025;
      const alpha = 0.025 * Math.max(0, Math.sin(r.phase));
      r.rect.setAlpha(alpha);
      r.rect.x = r.baseX + Math.sin(r.phase * 0.4) * 12;
    }

    // Falling leaves — rotation + sine drift
    this._sa.leaves = (this._sa.leaves ?? 0) + delta;
    const leafInterval = this._mobile ? 3500 : 1800;
    if (this._sa.leaves >= leafInterval) {
      this._sa.leaves = 0;
      this._emitLeaf();
    }
  }

  private _emitLeaf(): void {
    const slot = this._leafPool.find(s => !s.active);
    if (!slot) return;

    const x    = this._rng(22) * this._mapW;
    const col  = [0xcc6622, 0xdd8833, 0xaa5518][Math.floor(this._rng(23) * 3)];

    slot.active  = true;
    slot.x       = x;
    slot.y       = -8;
    slot.vx      = (this._rng(24) - 0.5) * 0.025 + 0.01;  // slight right drift
    slot.vy      = 0.03 + this._rng(25) * 0.02;
    slot.life    = 6000 + this._rng(26) * 4000;
    slot.maxLife = slot.life;
    slot.phase   = this._rng(27) * Math.PI * 2;
    slot.waveAmpY = 8;
    slot.waveFreq = 0.0009 + this._rng(28) * 0.0005;
    slot.rotVel  = (this._rng(29) - 0.5) * 0.003;
    slot.rot     = this._rng(30) * Math.PI * 2;

    slot.tri.setFillStyle(col, 0.55);
    slot.tri.setPosition(x, -8);
    slot.tri.setRotation(slot.rot);
    slot.tri.setActive(true).setVisible(true);
  }

  // ── Pool update ───────────────────────────────────────────────────────────

  private _updatePool(delta: number): void {
    for (const s of this._pool) {
      if (!s.active) continue;

      s.life -= delta;
      if (s.life <= 0) {
        s.active = false;
        s.arc.setActive(false).setVisible(false);
        continue;
      }

      // Move
      s.phase += s.waveFreq * delta;
      s.x     += s.vx * delta;
      s.y     += s.vy * delta + Math.sin(s.phase) * s.waveAmpY * 0.001 * delta;

      s.arc.x = s.x;
      s.arc.y = s.y;

      // Fade out over last 30 % of life
      const t     = s.life / s.maxLife;
      const alpha = s.arc.alpha;
      if (t < 0.3) {
        s.arc.setAlpha(alpha * (t / 0.3));
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
      s.x     += s.vx * delta;
      s.y     += s.vy * delta;

      s.tri.setPosition(s.x + Math.sin(s.phase) * s.waveAmpY, s.y);
      s.tri.setRotation(s.rot);

      // Fade out over last 25 % of life
      const t = s.life / s.maxLife;
      if (t < 0.25) {
        s.tri.setAlpha(s.tri.alpha * (t / 0.25));
      }
    }
  }

  // ── Emit helpers ──────────────────────────────────────────────────────────

  /**
   * Activate an idle pool slot.
   * Does nothing if all slots are busy (budget enforced).
   */
  private _emitArc(
    x: number, y: number,
    vx: number, vy: number,
    maxLife: number,
    radius: number,
    color: number,
    alpha: number,
    waveAmpY: number,
    waveFreq: number,
  ): void {
    const slot = this._pool.find(s => !s.active);
    if (!slot) return;

    slot.active  = true;
    slot.x       = x;
    slot.y       = y;
    slot.vx      = vx;
    slot.vy      = vy;
    slot.life    = maxLife;
    slot.maxLife = maxLife;
    slot.phase   = this._rng(31) * Math.PI * 2;
    slot.waveAmpY = waveAmpY;
    slot.waveFreq = waveFreq;

    slot.arc.setRadius(radius);
    slot.arc.setFillStyle(color, alpha);
    slot.arc.setPosition(x, y);
    slot.arc.setActive(true).setVisible(true);
  }

  // ── Deterministic helpers ─────────────────────────────────────────────────

  /** Deterministic pseudo-random float in [0, 1) based on seed + salt. */
  private _rng(salt: number): number {
    return posHash(this._seed, Math.floor(this._elapsed * 0.01) | 0, salt, 0);
  }

  /** Seed-based hash for initial placement (not time-varying). */
  private _seedHash(index: number, salt: number): number {
    return posHash(this._seed, index, salt, 777);
  }

  private _randomTile<T>(arr: T[], salt: number): T {
    return arr[Math.floor(this._rng(salt) * arr.length) % arr.length];
  }
}
