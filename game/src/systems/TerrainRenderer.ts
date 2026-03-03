/**
 * Procedural terrain renderer for Ojibwe TD.
 *
 * Replaces the tiled-icon approach with a natural Northern Ontario landscape:
 * boreal forest clearings, granite outcrops, marshland, lakeshore.
 *
 * Uses two Phaser.GameObjects.Graphics objects (base + decorations) for
 * efficient batched rendering — no individual game objects per tile.
 */

import Phaser from 'phaser';
import type { MapData } from '../types/MapData';
import { TILE, getWaypointPaths } from '../types/MapData';
import type { SeasonalTheme } from '../data/stageDefs';

// ── Seeded pseudo-random ─────────────────────────────────────────────────────

/** Convert a map ID string into a numeric seed. @internal */
export function mapIdToSeed(mapId: string): number {
  let h = 0;
  for (let i = 0; i < mapId.length; i++) {
    h = ((h << 5) - h + mapId.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * Position-based seeded hash → deterministic float in [0, 1).
 * Same (seed, row, col, salt) always produces the same value.
 */
export function posHash(seed: number, row: number, col: number, salt: number): number {
  let h = seed ^ (row * 7919 + col * 104729 + salt * 15731);
  h ^= h << 13;
  h ^= h >>> 17;
  h ^= h << 5;
  return ((h >>> 0) % 10000) / 10000;
}

// ── Colour helpers ───────────────────────────────────────────────────────────

/** Shift the brightness of a 0xRRGGBB colour by a multiplicative factor. @internal */
export function shiftBrightness(color: number, factor: number): number {
  const r = Math.min(255, Math.max(0, Math.round(((color >> 16) & 0xff) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((color >> 8) & 0xff) * factor)));
  const b = Math.min(255, Math.max(0, Math.round((color & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}

// ── Seasonal palettes ────────────────────────────────────────────────────────

interface SeasonPalette {
  groundBase: number;
  pathBase: number;
  pathEdge: number;
  pathCenter: number;
  gridLine: number;
  gridAlpha: number;
  treeColors: number[];
  trunkColor: number;
  rockColor: number;
  grassColor: number;
  /** Accent overlay colour (wet patches in spring, snow in winter). Null = none. */
  accentOverlay: number | null;
  accentAlpha: number;
  accentChance: number;
  /** Colour for small pebbles/stones scattered on the path. */
  pathStoneColor: number;
  /** Season-specific overlay ON path tiles (puddles / frost / leaves). Null = none. */
  pathAccentColor: number | null;
  pathAccentAlpha: number;
  pathAccentChance: number;
}

/** @internal */
export const PALETTES: Record<SeasonalTheme, SeasonPalette> = {
  summer: {
    groundBase:    0x2a3a1a,   // warm mossy green
    pathBase:      0x2a2010,   // dark brown dirt
    pathEdge:      0x1e1808,   // darker brown at path edges
    pathCenter:    0x382c18,   // lighter worn center
    gridLine:      0x1e2e10,   // subtle grid
    gridAlpha:     0.25,
    treeColors:    [0x1a4a10, 0x1e5515, 0x224a18],  // dark green conifers
    trunkColor:    0x3a2a10,
    rockColor:     0x707070,   // grey granite
    grassColor:    0x3a6820,
    accentOverlay: null,
    accentAlpha:   0,
    accentChance:  0,
    pathStoneColor:   0x808080,  // grey pebbles
    pathAccentColor:  null,
    pathAccentAlpha:  0,
    pathAccentChance: 0,
  },
  spring: {
    groundBase:    0x1e3518,   // fresh green, cooler
    pathBase:      0x2a2010,
    pathEdge:      0x1e1808,
    pathCenter:    0x382c18,
    gridLine:      0x162e14,
    gridAlpha:     0.2,
    treeColors:    [0x22aa22, 0x28bb30, 0x20a020],  // bright fresh green
    trunkColor:    0x3a2a10,
    rockColor:     0x556666,   // grey-blue
    grassColor:    0x44aa30,
    accentOverlay: 0x2050a0,   // blue-tinted wet patches
    accentAlpha:   0.12,
    accentChance:  0.15,
    pathStoneColor:   0x707070,  // damp grey-blue pebbles
    pathAccentColor:  0x204060,  // muddy puddles
    pathAccentAlpha:  0.15,
    pathAccentChance: 0.12,
  },
  autumn: {
    groundBase:    0x3a2a10,   // golden-brown ground
    pathBase:      0x2a2010,
    pathEdge:      0x1e1808,
    pathCenter:    0x382c18,
    gridLine:      0x2e2008,
    gridAlpha:     0.25,
    treeColors:    [0xbb6622, 0xcc7733, 0xaa5518],  // orange-red foliage
    trunkColor:    0x4a3020,
    rockColor:     0x6a5a4a,   // brownish granite
    grassColor:    0x887730,   // dried grass
    accentOverlay: null,
    accentAlpha:   0,
    accentChance:  0,
    pathStoneColor:   0x6a5a4a,  // brownish stones
    pathAccentColor:  0x884420,  // fallen leaf litter
    pathAccentAlpha:  0.18,
    pathAccentChance: 0.14,
  },
  winter: {
    groundBase:    0xb0bcc8,   // pale blue-grey snow
    pathBase:      0x887060,   // frozen bare earth
    pathEdge:      0x706050,
    pathCenter:    0x998878,
    gridLine:      0x98a4b0,
    gridAlpha:     0.2,
    treeColors:    [0x506060, 0x5a6868, 0x485858],  // bare grey branches
    trunkColor:    0x505050,
    rockColor:     0x7888a0,   // cold grey stone
    grassColor:    0x80a890,   // muted green-grey
    accentOverlay: 0xe0e8f0,   // bright snow patches
    accentAlpha:   0.25,
    accentChance:  0.20,
    pathStoneColor:   0x7888a0,  // cold grey stones
    pathAccentColor:  0xd0dde8,  // frost / ice patches
    pathAccentAlpha:  0.20,
    pathAccentChance: 0.16,
  },
};

// ── Adjacency helpers ────────────────────────────────────────────────────────

/** @internal */
export function hasAdjacentPath(
  row: number, col: number,
  tiles: number[][], rows: number, cols: number,
): boolean {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols && tiles[r][c] === TILE.PATH) {
        return true;
      }
    }
  }
  return false;
}

/** @internal */
export function isNearSpawnOrExit(
  row: number, col: number,
  spawn: { row: number; col: number },
  exit: { row: number; col: number },
): boolean {
  const nearSpawn = Math.abs(row - spawn.row) <= 1 && Math.abs(col - spawn.col) <= 1;
  const nearExit  = Math.abs(row - exit.row)  <= 1 && Math.abs(col - exit.col)  <= 1;
  return nearSpawn || nearExit;
}

// ── Decoration drawing ───────────────────────────────────────────────────────

function drawConifer(
  gfx: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  color: number, trunkColor: number, sizeHash: number,
): void {
  const h = 10 + sizeHash * 4;
  const w = 5 + sizeHash * 3;
  // Main canopy triangle
  gfx.fillStyle(color, 0.85);
  gfx.fillTriangle(cx, cy - h / 2, cx - w, cy + h / 2 - 2, cx + w, cy + h / 2 - 2);
  // Slightly darker inner triangle for depth
  gfx.fillStyle(shiftBrightness(color, 0.8), 0.4);
  gfx.fillTriangle(cx, cy - h / 2 + 3, cx - w + 2, cy + h / 2 - 1, cx + w - 2, cy + h / 2 - 1);
  // Trunk
  gfx.fillStyle(trunkColor, 0.8);
  gfx.fillRect(cx - 1, cy + h / 2 - 2, 2, 4);
}

function drawDeciduousTree(
  gfx: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  color: number, trunkColor: number, sizeHash: number,
): void {
  const r = 5 + sizeHash * 3;
  gfx.fillStyle(color, 0.8);
  gfx.fillCircle(cx, cy - 3, r);
  // Highlight spot
  gfx.fillStyle(shiftBrightness(color, 1.2), 0.3);
  gfx.fillCircle(cx - 1, cy - 4, r * 0.5);
  // Trunk
  gfx.fillStyle(trunkColor, 0.8);
  gfx.fillRect(cx - 1, cy + r - 5, 2, 5);
}

function drawBareTree(
  gfx: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  color: number, sizeHash: number,
): void {
  const trunkH = 8 + sizeHash * 4;
  // Trunk
  gfx.lineStyle(2, color, 0.7);
  gfx.lineBetween(cx, cy + trunkH / 2, cx, cy - trunkH / 2);
  // Upper branches
  gfx.lineStyle(1, color, 0.5);
  gfx.lineBetween(cx, cy - 2, cx - 4 - sizeHash * 2, cy - 5 - sizeHash * 2);
  gfx.lineBetween(cx, cy - 2, cx + 4 + sizeHash * 2, cy - 5 - sizeHash * 2);
  // Lower branches
  gfx.lineBetween(cx, cy + 1, cx - 3, cy - 2);
  gfx.lineBetween(cx, cy + 1, cx + 3, cy - 2);
}

function drawRockCluster(
  gfx: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  color: number, h1: number, h2: number,
): void {
  // Main rock
  gfx.fillStyle(color, 0.65);
  gfx.fillCircle(cx, cy, 3 + h1 * 2);
  // Secondary rock
  gfx.fillStyle(shiftBrightness(color, 0.85), 0.55);
  gfx.fillCircle(cx + 3 + h2 * 2, cy + 1 + h1, 2 + h2 * 1.5);
  // Optional third rock
  if (h1 > 0.5) {
    gfx.fillStyle(shiftBrightness(color, 1.1), 0.5);
    gfx.fillCircle(cx - 2, cy + 2, 1.5 + h2);
  }
}

function drawGrassTuft(
  gfx: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  color: number, hash: number,
): void {
  gfx.lineStyle(1, color, 0.5);
  const count = 3 + Math.floor(hash * 3);
  for (let i = 0; i < count; i++) {
    const ox = (i - count / 2) * 2.5;
    const lean = -0.3 + hash * 0.6;
    gfx.lineBetween(
      cx + ox, cy + 3,
      cx + ox + Math.sin(lean + i * 0.3) * 5, cy - 4,
    );
  }
}

// ── Path detail drawing ─────────────────────────────────────────────────────

/** Draw a cluster of 2-4 tiny pebbles on a path tile. */
function drawPathPebbles(
  gfx: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  color: number, h1: number, h2: number,
): void {
  const count = 2 + Math.floor(h1 * 3);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + h2 * Math.PI;
    const dist = 2 + h1 * 5;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const r = 0.8 + (h2 + i * 0.1) * 0.8;
    gfx.fillStyle(shiftBrightness(color, 0.8 + i * 0.12), 0.4 + h1 * 0.15);
    gfx.fillCircle(px, py, r);
  }
}

/** Draw a worn/trampled darker patch on the path surface. */
function drawWornPatch(
  gfx: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  color: number, h1: number, h2: number,
): void {
  gfx.fillStyle(color, 0.10 + h1 * 0.08);
  gfx.fillCircle(cx, cy, 4 + h1 * 5);
  gfx.fillCircle(cx + 3 * (h2 - 0.5), cy - 2 * (h1 - 0.5), 3 + h2 * 3);
}

/** Draw short grass blades bleeding inward from a path edge. */
function drawPathEdgeTuft(
  gfx: Phaser.GameObjects.Graphics,
  ex: number, ey: number,
  color: number,
  side: 'top' | 'bottom' | 'left' | 'right',
  hash: number,
): void {
  const count = 2 + Math.floor(hash * 2);
  gfx.lineStyle(1, color, 0.35 + hash * 0.15);
  for (let i = 0; i < count; i++) {
    const lean = -0.2 + hash * 0.4;
    let bx: number, by: number, tx: number, ty: number;
    const spread = (i - count / 2) * 3;
    const bladeLen = 3 + hash * 3;
    switch (side) {
      case 'top':
        bx = ex + spread;     by = ey;
        tx = bx + lean * 3;   ty = ey + bladeLen;
        break;
      case 'bottom':
        bx = ex + spread;     by = ey;
        tx = bx + lean * 3;   ty = ey - bladeLen;
        break;
      case 'left':
        bx = ex;              by = ey + spread;
        tx = ex + bladeLen;   ty = by + lean * 3;
        break;
      case 'right':
        bx = ex;              by = ey + spread;
        tx = ex - bladeLen;   ty = by + lean * 3;
        break;
    }
    gfx.lineBetween(bx, by, tx, ty);
  }
}

/** Draw a season-specific accent on a path tile (puddle, frost, leaf litter). */
function drawPathAccent(
  gfx: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  color: number, alpha: number,
  season: SeasonalTheme, h1: number, h2: number,
): void {
  if (season === 'autumn') {
    // Fallen leaf litter: 2-3 small specs in warm tones
    const count = 2 + Math.floor(h1 * 2);
    for (let i = 0; i < count; i++) {
      const lx = cx + (h2 - 0.5) * 12 + i * 4;
      const ly = cy + (h1 - 0.5) * 10 - i * 2;
      gfx.fillStyle(shiftBrightness(color, 0.9 + i * 0.15), alpha);
      gfx.fillCircle(lx, ly, 1.2 + h2 * 0.8);
    }
  } else {
    // Puddle (spring), frost patch (winter): rounded spot
    const r = 3 + h1 * 5;
    gfx.fillStyle(color, alpha * (0.7 + h2 * 0.3));
    gfx.fillCircle(cx + (h2 - 0.5) * 4, cy + (h1 - 0.5) * 4, r);
    // Highlight/shine spot
    gfx.fillStyle(shiftBrightness(color, 1.3), alpha * 0.3);
    gfx.fillCircle(cx + (h2 - 0.5) * 4 - 1, cy + (h1 - 0.5) * 4 - 1, r * 0.4);
  }
}

/** Draw a small rock at a path edge. */
function drawPathEdgeRock(
  gfx: Phaser.GameObjects.Graphics,
  ex: number, ey: number,
  color: number, hash: number,
): void {
  const r = 1.5 + hash * 1.5;
  gfx.fillStyle(color, 0.45);
  gfx.fillCircle(ex, ey, r);
  // Subtle highlight
  gfx.fillStyle(shiftBrightness(color, 1.2), 0.2);
  gfx.fillCircle(ex - 0.5, ey - 0.5, r * 0.5);
}

// ── Depth constants ───────────────────────────────────────────────────────────

/**
 * Depth of the terrain base layer (ground fills only — no path tiles).
 * All other gameplay elements must be at a strictly higher depth.
 * @public
 */
export const TERRAIN_BASE_DEPTH = 0;

/**
 * Depth of the terrain decoration layer (trees, rocks, grass tufts).
 * Must be above TERRAIN_BASE_DEPTH but below path tiles and gameplay elements.
 * @public
 */
export const TERRAIN_DECO_DEPTH = 1;

/**
 * Depth of the path rendering layer (path fills + edge borders).
 * Above decorations so trees/rocks from adjacent tiles never obscure the trail.
 * Below range circles (5), towers (10), creeps (15), and projectiles (20).
 * @public
 */
export const TERRAIN_PATH_DEPTH = 2;

// ── Main render function ─────────────────────────────────────────────────────

/**
 * Render procedural terrain for a map.
 *
 * Creates three Graphics objects:
 *   1. Base layer  (depth 0) — ground fills + grid lines
 *   2. Deco layer  (depth 1) — sparse trees, rocks, grass tufts
 *   3. Path layer  (depth 2) — path fills + edge borders (above decorations)
 *
 * All placement is deterministic (seeded by map ID + tile position).
 *
 * @returns `{ decoGfx }` — reference to the decoration graphics object,
 *   used by GameScene's debug decoration-hide toggle (dev mode only).
 */
export function renderTerrain(
  scene: Phaser.Scene,
  mapData: MapData,
  season: SeasonalTheme,
): { decoGfx: Phaser.GameObjects.Graphics } {
  const { tileSize: ts, cols, rows, tiles } = mapData;
  const seed = mapIdToSeed(mapData.id);
  const pal = PALETTES[season];
  const primaryPath = getWaypointPaths(mapData)[0] ?? [];
  const spawnWp = primaryPath[0];
  const exitWp  = primaryPath[primaryPath.length - 1];

  // ── Base layer (ground fills only — no paths) ──────────────────────────────
  const baseGfx = scene.add.graphics();
  baseGfx.setDepth(TERRAIN_BASE_DEPTH);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (tiles[row][col] === TILE.PATH) continue;

      const x = col * ts;
      const y = row * ts;

      // ── Ground tile (BUILDABLE or SCENERY) ──
      const noise = posHash(seed, row, col, 0);
      const edgeDist = Math.min(row, rows - 1 - row, col, cols - 1 - col);

      let brightnessFactor = 0.9 + noise * 0.2;
      if (edgeDist === 0)      brightnessFactor *= 0.82;
      else if (edgeDist === 1) brightnessFactor *= 0.91;

      const color = shiftBrightness(pal.groundBase, brightnessFactor);
      baseGfx.fillStyle(color, 1);
      baseGfx.fillRect(x, y, ts, ts);

      // Subtle grid lines for visual structure
      baseGfx.lineStyle(1, pal.gridLine, pal.gridAlpha);
      baseGfx.strokeRect(x, y, ts, ts);

      // Season-specific accent overlay (wet patches / snow patches)
      if (pal.accentOverlay !== null) {
        const accentHash = posHash(seed, row, col, 10);
        if (accentHash < pal.accentChance) {
          baseGfx.fillStyle(pal.accentOverlay, pal.accentAlpha);
          const ax = x + posHash(seed, row, col, 11) * (ts * 0.3);
          const ay = y + posHash(seed, row, col, 12) * (ts * 0.3);
          const ar = 6 + posHash(seed, row, col, 13) * 8;
          baseGfx.fillCircle(ax + ts * 0.35, ay + ts * 0.35, ar);
        }
      }
    }
  }

  // ── Path layer (depth 2 — above decorations so trails are never obscured) ─
  const pathGfx = scene.add.graphics();
  pathGfx.setDepth(TERRAIN_PATH_DEPTH);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (tiles[row][col] !== TILE.PATH) continue;

      const x = col * ts;
      const y = row * ts;
      const tileCx = x + ts / 2;
      const tileCy = y + ts / 2;

      // ── Path tile: worn dirt / gravel trail with visual variety ──
      const noise = posHash(seed, row, col, 0);
      // Wider brightness range for more visible tile-to-tile variation
      const warmCool = posHash(seed, row, col, 40);
      let bFactor = 0.86 + noise * 0.28;
      // Occasional warm/cool shift: ~33% warmer, ~33% neutral, ~33% cooler
      if (warmCool < 0.33)      bFactor *= 0.96;
      else if (warmCool > 0.66) bFactor *= 1.04;
      const base = shiftBrightness(pal.pathBase, bFactor);
      pathGfx.fillStyle(base, 1);
      pathGfx.fillRect(x, y, ts, ts);

      // Lighter center strip, extending toward adjacent path tiles
      const inset = Math.floor(ts * 0.15);
      let cx = x + inset;
      let cy = y + inset;
      let cw = ts - inset * 2;
      let ch = ts - inset * 2;

      const above = row > 0 && tiles[row - 1][col] === TILE.PATH;
      const below = row < rows - 1 && tiles[row + 1][col] === TILE.PATH;
      const left  = col > 0 && tiles[row][col - 1] === TILE.PATH;
      const right = col < cols - 1 && tiles[row][col + 1] === TILE.PATH;

      if (above) { cy = y; ch += inset; }
      if (below) { ch += inset; }
      if (left)  { cx = x; cw += inset; }
      if (right) { cw += inset; }

      pathGfx.fillStyle(pal.pathCenter, 0.5);
      pathGfx.fillRect(cx, cy, cw, ch);

      // ── Worn dirt patches — darker trampled areas (~15%) ──
      const wornHash = posHash(seed, row, col, 41);
      if (wornHash < 0.15) {
        const wcx = tileCx + (posHash(seed, row, col, 42) - 0.5) * (ts * 0.4);
        const wcy = tileCy + (posHash(seed, row, col, 43) - 0.5) * (ts * 0.4);
        drawWornPatch(
          pathGfx, wcx, wcy, pal.pathEdge,
          posHash(seed, row, col, 44), posHash(seed, row, col, 45),
        );
      }

      // ── Scattered pebbles (~10%) ──
      const pebbleHash = posHash(seed, row, col, 46);
      if (pebbleHash < 0.10) {
        const pcx = tileCx + (posHash(seed, row, col, 47) - 0.5) * (ts * 0.5);
        const pcy = tileCy + (posHash(seed, row, col, 48) - 0.5) * (ts * 0.5);
        drawPathPebbles(
          pathGfx, pcx, pcy, pal.pathStoneColor,
          posHash(seed, row, col, 49), posHash(seed, row, col, 50),
        );
      }

      // ── Season-specific path accent (puddles / frost / leaf litter) ──
      if (pal.pathAccentColor !== null) {
        const accentHash = posHash(seed, row, col, 55);
        if (accentHash < pal.pathAccentChance) {
          const acx = tileCx + (posHash(seed, row, col, 56) - 0.5) * (ts * 0.3);
          const acy = tileCy + (posHash(seed, row, col, 57) - 0.5) * (ts * 0.3);
          drawPathAccent(
            pathGfx, acx, acy, pal.pathAccentColor, pal.pathAccentAlpha,
            season, posHash(seed, row, col, 58), posHash(seed, row, col, 59),
          );
        }
      }

      // Darker edge lines where NOT connecting to another path tile.
      // Alpha 0.5 gives a clear but subtle contrast border against ground.
      pathGfx.fillStyle(pal.pathEdge, 0.5);
      if (!above) pathGfx.fillRect(x,            y,            ts, 2);
      if (!below) pathGfx.fillRect(x,            y + ts - 2,   ts, 2);
      if (!left)  pathGfx.fillRect(x,            y,            2,  ts);
      if (!right) pathGfx.fillRect(x + ts - 2,   y,            2,  ts);

      // ── Path-edge decorations (grass tufts & rocks bleeding onto path) ──
      // ~30% of eligible edges get a grass tuft, ~10% get a small rock
      if (!above) {
        const egHash = posHash(seed, row, col, 60);
        if (egHash < 0.30) {
          const ex = x + ts * (0.2 + posHash(seed, row, col, 61) * 0.6);
          drawPathEdgeTuft(pathGfx, ex, y, pal.grassColor, 'top', posHash(seed, row, col, 62));
        } else if (egHash < 0.40) {
          const ex = x + ts * (0.2 + posHash(seed, row, col, 61) * 0.6);
          drawPathEdgeRock(pathGfx, ex, y + 2, pal.rockColor, posHash(seed, row, col, 63));
        }
      }
      if (!below) {
        const egHash = posHash(seed, row, col, 64);
        if (egHash < 0.30) {
          const ex = x + ts * (0.2 + posHash(seed, row, col, 65) * 0.6);
          drawPathEdgeTuft(pathGfx, ex, y + ts, pal.grassColor, 'bottom', posHash(seed, row, col, 66));
        } else if (egHash < 0.40) {
          const ex = x + ts * (0.2 + posHash(seed, row, col, 65) * 0.6);
          drawPathEdgeRock(pathGfx, ex, y + ts - 2, pal.rockColor, posHash(seed, row, col, 67));
        }
      }
      if (!left) {
        const egHash = posHash(seed, row, col, 68);
        if (egHash < 0.30) {
          const ey = y + ts * (0.2 + posHash(seed, row, col, 69) * 0.6);
          drawPathEdgeTuft(pathGfx, x, ey, pal.grassColor, 'left', posHash(seed, row, col, 70));
        } else if (egHash < 0.40) {
          const ey = y + ts * (0.2 + posHash(seed, row, col, 69) * 0.6);
          drawPathEdgeRock(pathGfx, x + 2, ey, pal.rockColor, posHash(seed, row, col, 71));
        }
      }
      if (!right) {
        const egHash = posHash(seed, row, col, 72);
        if (egHash < 0.30) {
          const ey = y + ts * (0.2 + posHash(seed, row, col, 73) * 0.6);
          drawPathEdgeTuft(pathGfx, x + ts, ey, pal.grassColor, 'right', posHash(seed, row, col, 74));
        } else if (egHash < 0.40) {
          const ey = y + ts * (0.2 + posHash(seed, row, col, 73) * 0.6);
          drawPathEdgeRock(pathGfx, x + ts - 2, ey, pal.rockColor, posHash(seed, row, col, 75));
        }
      }
    }
  }

  // ── Decorative scatter layer ──────────────────────────────────────────────
  const decoGfx = scene.add.graphics();
  decoGfx.setDepth(TERRAIN_DECO_DEPTH);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (tiles[row][col] !== TILE.BUILDABLE) continue;
      if (isNearSpawnOrExit(row, col, spawnWp, exitWp)) continue;

      const edgeDist = Math.min(row, rows - 1 - row, col, cols - 1 - col);
      const isEdge   = edgeDist < 2;
      const nearPath = hasAdjacentPath(row, col, tiles, rows, cols);

      // Tile center with random offset for organic feel
      const baseCx = col * ts + ts / 2;
      const baseCy = row * ts + ts / 2;

      // ── Trees ──
      // Denser at edges (forest frame), moderate near paths, sparse interior
      let treeProbability = 0.06;
      if (isEdge)        treeProbability = 0.30;
      else if (nearPath) treeProbability = 0.12;

      const treeHash = posHash(seed, row, col, 100);
      if (treeHash < treeProbability) {
        const ox = (posHash(seed, row, col, 101) - 0.5) * (ts * 0.4);
        const oy = (posHash(seed, row, col, 102) - 0.5) * (ts * 0.4);
        const tcx = baseCx + ox;
        const tcy = baseCy + oy;
        const colorIdx = Math.floor(posHash(seed, row, col, 103) * pal.treeColors.length);
        const treeColor = pal.treeColors[colorIdx];
        const sizeHash = posHash(seed, row, col, 104);

        if (season === 'winter') {
          drawBareTree(decoGfx, tcx, tcy, treeColor, sizeHash);
        } else if (season === 'autumn') {
          drawDeciduousTree(decoGfx, tcx, tcy, treeColor, pal.trunkColor, sizeHash);
        } else {
          drawConifer(decoGfx, tcx, tcy, treeColor, pal.trunkColor, sizeHash);
        }
        continue; // one decoration per tile
      }

      // ── Rocks ──
      let rockProbability = 0.05;
      if (isEdge) rockProbability = 0.08;

      const rockHash = posHash(seed, row, col, 200);
      if (rockHash < rockProbability) {
        const ox = (posHash(seed, row, col, 201) - 0.5) * (ts * 0.3);
        const oy = (posHash(seed, row, col, 202) - 0.5) * (ts * 0.3);
        drawRockCluster(
          decoGfx, baseCx + ox, baseCy + oy, pal.rockColor,
          posHash(seed, row, col, 203), posHash(seed, row, col, 204),
        );
        continue;
      }

      // ── Grass tufts ── (only near path)
      if (nearPath) {
        const grassHash = posHash(seed, row, col, 300);
        if (grassHash < 0.10) {
          const ox = (posHash(seed, row, col, 301) - 0.5) * (ts * 0.5);
          const oy = (posHash(seed, row, col, 302) - 0.5) * (ts * 0.5);
          drawGrassTuft(
            decoGfx, baseCx + ox, baseCy + oy, pal.grassColor,
            posHash(seed, row, col, 303),
          );
        }
      }
    }
  }

  return { decoGfx };
}
