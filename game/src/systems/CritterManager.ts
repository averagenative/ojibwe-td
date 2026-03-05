/**
 * CritterManager — Ambient wildlife critters that wander map edges and open tiles.
 *
 * Each region gets its own pool of critter types appropriate to its biome.
 * Critters are purely cosmetic — zero gameplay impact.
 *
 * Behaviour:
 *   - Spawn 3–6 critters (desktop) or 2–3 (mobile) from the region's pool
 *   - Each critter picks a nearby buildable tile, walks slowly, idles 1–3 s, repeat
 *   - Critters flee (speed up briefly) when a tower is placed nearby or creeps pass
 *   - Face movement direction (flip sprite horizontally)
 *   - Stay at CRITTER_DEPTH (above terrain/ambient, below towers/creeps/UI)
 *
 * Performance: lightweight Phaser.GameObjects.Sprite instances — no physics bodies.
 * Pause: caller (GameScene.update) does not call update() when paused.
 */

import Phaser from 'phaser';
import type { MapData } from '../types/MapData';
import { TILE } from '../types/MapData';
import { posHash, mapIdToSeed } from './TerrainRenderer';

// ── Depth ─────────────────────────────────────────────────────────────────────

/** Critter depth: above terrain (0-1) and ambient VFX (2), below tile markers (3). */
export const CRITTER_DEPTH = 2.5;

// ── Critter pool definitions per region ──────────────────────────────────────

/** Texture key (matches BootScene preload key and spritesheet animation prefix). */
export type CritterKey =
  | 'critter-squirrel' | 'critter-frog' | 'critter-loon'
  | 'critter-turtle' | 'critter-heron'
  | 'critter-rabbit' | 'critter-turkey'
  | 'critter-hare' | 'critter-fox' | 'critter-owl'
  | 'critter-raccoon' | 'critter-beaver';

/** All critter texture keys — used for preload iteration. */
export const ALL_CRITTER_KEYS: readonly CritterKey[] = [
  'critter-squirrel', 'critter-frog', 'critter-loon',
  'critter-turtle', 'critter-heron',
  'critter-rabbit', 'critter-turkey',
  'critter-hare', 'critter-fox', 'critter-owl',
  'critter-raccoon', 'critter-beaver',
];

/** Map region ID → available critter pool. */
export const REGION_CRITTER_POOL: Readonly<Record<string, readonly CritterKey[]>> = {
  zaagaiganing:  ['critter-squirrel', 'critter-frog', 'critter-loon'],
  mashkiig:      ['critter-frog', 'critter-turtle', 'critter-heron'],
  mitigomizh:    ['critter-rabbit', 'critter-turkey'],
  'biboon-aki':  ['critter-hare', 'critter-fox', 'critter-owl'],
  'niizh-miikana': ['critter-raccoon', 'critter-beaver'],
};

/** Desktop critter count range. */
export const CRITTER_COUNT_DESKTOP = { min: 3, max: 6 };
/** Mobile critter count — 50% reduction. */
export const CRITTER_COUNT_MOBILE  = { min: 2, max: 3 };

/** Walk speed in pixels/ms. */
const WALK_SPEED  = 0.012;
/** Flee speed in pixels/ms (brief burst). */
const FLEE_SPEED  = 0.06;
/** How long the flee burst lasts (ms). */
const FLEE_DURATION = 600;
/** Distance (in pixels) that triggers fleeing when tower placed or creep nearby. */
export const FLEE_RADIUS = 80;
/** Idle duration range (ms). */
const IDLE_MIN = 1000;
const IDLE_MAX = 3000;

// ── Internal critter state ───────────────────────────────────────────────────

interface CritterSlot {
  sprite:     Phaser.GameObjects.Sprite;
  key:        CritterKey;
  /** Current world position. */
  x:          number;
  y:          number;
  /** Target tile centre (world coords). */
  tx:         number;
  ty:         number;
  /** Current state. */
  state:      'idle' | 'walk' | 'flee';
  /** Timer accumulator (ms) — counts down idle or flee duration. */
  timer:      number;
  /** Walk/flee speed (px/ms). */
  speed:      number;
  /** Animation frame accumulator. */
  animAcc:    number;
  /** Current animation frame index (0–2). */
  animFrame:  number;
}

// ── CritterManager ──────────────────────────────────────────────────────────

export class CritterManager {
  private readonly _scene:    Phaser.Scene;
  private readonly _seed:     number;
  private readonly _tileSize: number;
  private readonly _offsetX:  number;

  /** Pre-computed list of buildable tile centres (world coords). */
  private readonly _buildableTiles: Array<{ x: number; y: number; col: number; row: number }> = [];

  /** All active critter slots. */
  private readonly _critters: CritterSlot[] = [];

  /** Elapsed time — used for deterministic RNG salting. */
  private _elapsed = 0;

  constructor(
    scene:    Phaser.Scene,
    mapData:  MapData,
    regionId: string,
    isMobile: boolean,
    offsetX = 0,
  ) {
    this._scene    = scene;
    this._seed     = mapIdToSeed(mapData.id);
    this._tileSize = mapData.tileSize;
    this._offsetX  = offsetX;

    this._buildTileLists(mapData);

    // Determine critter count.
    const range = isMobile ? CRITTER_COUNT_MOBILE : CRITTER_COUNT_DESKTOP;
    const count = range.min + Math.floor(
      posHash(this._seed, 0, 0, 999) * (range.max - range.min + 1),
    );

    // Resolve region pool (fall back to zaagaiganing if unknown).
    const pool = REGION_CRITTER_POOL[regionId] ?? REGION_CRITTER_POOL['zaagaiganing'];

    this._spawnCritters(count, pool);
  }

  // ── Public interface ──────────────────────────────────────────────────────

  /** Advance all critter logic by `delta` ms. */
  update(delta: number): void {
    this._elapsed += delta;

    for (const c of this._critters) {
      this._stepCritter(c, delta);
    }
  }

  /** Notify critters that a tower was placed at (col, row). Nearby critters flee. */
  notifyTowerPlaced(col: number, row: number): void {
    const tx = col * this._tileSize + this._tileSize / 2 + this._offsetX;
    const ty = row * this._tileSize + this._tileSize / 2;
    this._triggerFleeNear(tx, ty);
  }

  /** Notify critters that creeps are at the given world positions. Call sparingly. */
  notifyCreepsNear(positions: Array<{ x: number; y: number }>): void {
    for (const pos of positions) {
      this._triggerFleeNear(pos.x, pos.y);
    }
  }

  /** Destroy all Phaser objects. */
  destroy(): void {
    for (const c of this._critters) {
      c.sprite.destroy();
    }
    this._critters.length = 0;
  }

  // ── Tile list pre-computation ─────────────────────────────────────────────

  private _buildTileLists(mapData: MapData): void {
    const { tiles, rows, cols, tileSize: ts } = mapData;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = c * ts + ts / 2 + this._offsetX;
        const cy = r * ts + ts / 2;
        if (tiles[r][c] === TILE.BUILDABLE) {
          this._buildableTiles.push({ x: cx, y: cy, col: c, row: r });
        }
      }
    }
  }

  // ── Spawn ─────────────────────────────────────────────────────────────────

  private _spawnCritters(count: number, pool: readonly CritterKey[]): void {
    if (this._buildableTiles.length === 0 || pool.length === 0) return;

    for (let i = 0; i < count; i++) {
      // Pick a random critter type from the region pool.
      const keyIdx = Math.floor(posHash(this._seed, i, 0, 42) * pool.length);
      const key = pool[keyIdx];

      // Pick a random starting tile.
      const tileIdx = Math.floor(posHash(this._seed, i, 1, 77) * this._buildableTiles.length);
      const tile = this._buildableTiles[tileIdx];

      // Create animation if not yet registered.
      this._ensureAnimation(key);

      const sprite = this._scene.add.sprite(tile.x, tile.y, key, 0);
      sprite.setDepth(CRITTER_DEPTH);
      sprite.setOrigin(0.5, 0.5);

      const slot: CritterSlot = {
        sprite,
        key,
        x: tile.x,
        y: tile.y,
        tx: tile.x,
        ty: tile.y,
        state: 'idle',
        timer: IDLE_MIN + posHash(this._seed, i, 2, 123) * (IDLE_MAX - IDLE_MIN),
        speed: WALK_SPEED,
        animAcc: 0,
        animFrame: 0,
      };

      this._critters.push(slot);
    }
  }

  /** Lazily register a 3-frame walk animation for the given critter key. */
  private _ensureAnimation(key: CritterKey): void {
    const animKey = `${key}-walk`;
    if (this._scene.anims.exists(animKey)) return;

    this._scene.anims.create({
      key: animKey,
      frames: this._scene.anims.generateFrameNumbers(key, { start: 0, end: 2 }),
      frameRate: 4,
      repeat: -1,
    });
  }

  // ── Per-critter step ──────────────────────────────────────────────────────

  private _stepCritter(c: CritterSlot, delta: number): void {
    switch (c.state) {
      case 'idle':
        this._stepIdle(c, delta);
        break;
      case 'walk':
        this._stepWalk(c, delta);
        break;
      case 'flee':
        this._stepFlee(c, delta);
        break;
    }
  }

  private _stepIdle(c: CritterSlot, delta: number): void {
    c.timer -= delta;
    // Subtle idle bobbing — update sprite Y with a small sine offset.
    c.animAcc += delta;
    const bob = Math.sin(c.animAcc * 0.003) * 0.5;
    c.sprite.y = c.y + bob;

    // Stop walk animation during idle — show frame 0.
    if (c.sprite.anims.isPlaying) {
      c.sprite.anims.stop();
      c.sprite.setFrame(0);
    }

    if (c.timer <= 0) {
      // Pick a new target tile and start walking.
      this._pickTarget(c);
      c.state = 'walk';
      c.speed = WALK_SPEED;
      c.sprite.play(`${c.key}-walk`);
    }
  }

  private _stepWalk(c: CritterSlot, delta: number): void {
    const dx = c.tx - c.x;
    const dy = c.ty - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      // Arrived — enter idle.
      c.x = c.tx;
      c.y = c.ty;
      c.sprite.x = c.x;
      c.sprite.y = c.y;
      c.state = 'idle';
      c.timer = IDLE_MIN + this._rng(c.x + c.y) * (IDLE_MAX - IDLE_MIN);
      return;
    }

    const step = c.speed * delta;
    const nx = dx / dist;
    const ny = dy / dist;
    c.x += nx * step;
    c.y += ny * step;
    c.sprite.x = c.x;
    c.sprite.y = c.y;

    // Face movement direction.
    c.sprite.setFlipX(nx < 0);
  }

  private _stepFlee(c: CritterSlot, delta: number): void {
    c.timer -= delta;

    const dx = c.tx - c.x;
    const dy = c.ty - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2 || c.timer <= 0) {
      // Done fleeing — pick new idle spot.
      c.x = c.sprite.x;
      c.y = c.sprite.y;
      c.state = 'idle';
      c.timer = IDLE_MIN + this._rng(c.x * 7 + c.y) * (IDLE_MAX - IDLE_MIN);
      return;
    }

    const step = FLEE_SPEED * delta;
    const nx = dx / dist;
    const ny = dy / dist;
    c.x += nx * step;
    c.y += ny * step;
    c.sprite.x = c.x;
    c.sprite.y = c.y;

    c.sprite.setFlipX(nx < 0);
  }

  // ── Target picking ────────────────────────────────────────────────────────

  /** Pick a nearby buildable tile as the walk target. */
  private _pickTarget(c: CritterSlot): void {
    if (this._buildableTiles.length === 0) return;

    // Try up to 8 times to find a tile within ~3 tiles distance.
    const maxDist = this._tileSize * 3;
    for (let attempt = 0; attempt < 8; attempt++) {
      const idx = Math.floor(
        this._rng(c.x + c.y + attempt * 13) * this._buildableTiles.length,
      );
      const tile = this._buildableTiles[idx];
      const dx = tile.x - c.x;
      const dy = tile.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 4 && dist < maxDist) {
        c.tx = tile.x;
        c.ty = tile.y;
        return;
      }
    }

    // Fallback: pick any random buildable tile.
    const idx = Math.floor(this._rng(c.x * 3 + c.y * 7) * this._buildableTiles.length);
    const tile = this._buildableTiles[idx];
    c.tx = tile.x;
    c.ty = tile.y;
  }

  /** Pick a flee target — away from the threat at (tx, ty). */
  private _pickFleeTarget(c: CritterSlot, threatX: number, threatY: number): void {
    if (this._buildableTiles.length === 0) return;

    // Try to find a tile that is farther from the threat.
    let bestDist = 0;
    let bestTile = this._buildableTiles[0];

    for (let attempt = 0; attempt < 6; attempt++) {
      const idx = Math.floor(
        this._rng(threatX + threatY + attempt * 31) * this._buildableTiles.length,
      );
      const tile = this._buildableTiles[idx];
      const dx = tile.x - threatX;
      const dy = tile.y - threatY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > bestDist) {
        bestDist = dist;
        bestTile = tile;
      }
    }

    c.tx = bestTile.x;
    c.ty = bestTile.y;
  }

  // ── Flee trigger ──────────────────────────────────────────────────────────

  private _triggerFleeNear(worldX: number, worldY: number): void {
    for (const c of this._critters) {
      if (c.state === 'flee') continue; // already fleeing
      const dx = c.x - worldX;
      const dy = c.y - worldY;
      if (dx * dx + dy * dy < FLEE_RADIUS * FLEE_RADIUS) {
        c.state = 'flee';
        c.timer = FLEE_DURATION;
        c.speed = FLEE_SPEED;
        this._pickFleeTarget(c, worldX, worldY);
        c.sprite.play(`${c.key}-walk`);
      }
    }
  }

  // ── RNG ────────────────────────────────────────────────────────────────────

  private _rng(salt: number): number {
    return posHash(this._seed, Math.floor(this._elapsed * 0.01) | 0, salt | 0, 0);
  }
}
