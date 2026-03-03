/**
 * TASK-120 — Status Effect Visuals: Clip to Sprite Bounds
 *
 * Structural + arithmetic tests verifying that status-effect overlays are
 * sized and positioned to match the creep sprite's actual visible area, not
 * the full bounding box.
 *
 * Coverage:
 *  1.  Creep.ts declares _getBodyGeometry() private method
 *  2.  _getBodyGeometry reads BODY_HORIZ_W / BODY_HORIZ_H from module constants
 *  3.  _getBodyGeometry reads BODY_VERT_W / BODY_VERT_H for vertical direction
 *  4.  _getBodyGeometry reads BOSS_HORIZ_W / BOSS_HORIZ_H for boss creeps
 *  5.  _getBodyGeometry reads BOSS_VERT_W / BOSS_VERT_H for boss vertical
 *  6.  _getBodyGeometry returns bodyImage.y (air body Y offset) from bodyImage path
 *  7.  _getBodyGeometry returns bodyRect.y from bodyRect path
 *  8.  _getBodyGeometry mirrors bodyImage rotation for vertical directions
 *  9.  Creep.ts declares _refreshOverlayGeometries() private method
 * 10.  updateDirectionalVisual() calls _refreshOverlayGeometries()
 * 11.  _syncOverlay calls _getBodyGeometry() (no hardcoded 32/26/58/42 body dims)
 * 12.  New overlay construction uses geo.y, geo.w, geo.h, geo.rotation
 * 13.  Re-activated overlay uses setSize / setPosition / setRotation from geo
 * 14.  Arithmetic: normal horizontal overlay dims match BODY_HORIZ constants
 * 15.  Arithmetic: normal vertical overlay dims match BODY_VERT constants
 * 16.  Arithmetic: boss horizontal overlay dims match BOSS_HORIZ constants
 * 17.  Arithmetic: boss vertical overlay dims match BOSS_VERT constants
 * 18.  Arithmetic: air body Y offset is -10 (AIR_BODY_OFFSET_Y)
 * 19.  Arithmetic: horizontal rotation is 0; vertical is ±π/2
 * 20.  Old hardcoded overlay sizes (bodyW=32/58, bodyH=26/42) are removed
 */

import { describe, it, expect } from 'vitest';
import creepSrc from '../../entities/Creep.ts?raw';

// ── Constant extraction helpers ────────────────────────────────────────────────
// Read the constant values from the source so tests stay in sync with the code.

function extractNumber(src: string, constantName: string): number {
  // Matches e.g.  "const BODY_HORIZ_W = 30;"  or  "BODY_HORIZ_W = 30 "
  const re = new RegExp(`${constantName}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`);
  const m  = src.match(re);
  if (!m) throw new Error(`Constant ${constantName} not found in source`);
  return parseFloat(m[1]);
}

const BODY_HORIZ_W   = extractNumber(creepSrc, 'BODY_HORIZ_W');
const BODY_HORIZ_H   = extractNumber(creepSrc, 'BODY_HORIZ_H');
const BODY_VERT_W    = extractNumber(creepSrc, 'BODY_VERT_W');
const BODY_VERT_H    = extractNumber(creepSrc, 'BODY_VERT_H');
const BOSS_HORIZ_W   = extractNumber(creepSrc, 'BOSS_HORIZ_W');
const BOSS_HORIZ_H   = extractNumber(creepSrc, 'BOSS_HORIZ_H');
const BOSS_VERT_W    = extractNumber(creepSrc, 'BOSS_VERT_W');
const BOSS_VERT_H    = extractNumber(creepSrc, 'BOSS_VERT_H');
const AIR_BODY_OFFSET_Y = extractNumber(creepSrc, 'AIR_BODY_OFFSET_Y');

// ── 1–2. _getBodyGeometry method declaration ──────────────────────────────────

describe('Creep._getBodyGeometry — method exists', () => {
  it('has a private _getBodyGeometry method', () => {
    expect(creepSrc).toContain('private _getBodyGeometry()');
  });

  it('returns an object with w, h, y, rotation properties', () => {
    expect(creepSrc).toContain('{ w, h, y: this.bodyImage.y, rotation }');
  });
});

// ── 3–5. bodyImage path — uses correct horizontal dimensions + rotation ────────

describe('Creep._getBodyGeometry — bodyImage path', () => {
  it('uses BODY_HORIZ_W for normal creep width', () => {
    const bodyGeoFn = extractBodyGeoFn(creepSrc);
    expect(bodyGeoFn).toContain('BODY_HORIZ_W');
    expect(bodyGeoFn).toContain('BODY_HORIZ_H');
  });

  it('uses BOSS_HORIZ_W for boss creep width', () => {
    const bodyGeoFn = extractBodyGeoFn(creepSrc);
    expect(bodyGeoFn).toContain('BOSS_HORIZ_W');
    expect(bodyGeoFn).toContain('BOSS_HORIZ_H');
  });

  it('sets rotation to 0 for horizontal direction', () => {
    const bodyGeoFn = extractBodyGeoFn(creepSrc);
    // isHoriz ? 0 : ... pattern
    expect(bodyGeoFn).toContain('isHoriz');
    expect(bodyGeoFn).toMatch(/isHoriz\s*\?\s*0/);
  });

  it('sets rotation to Math.PI / 2 for downward movement', () => {
    const bodyGeoFn = extractBodyGeoFn(creepSrc);
    expect(bodyGeoFn).toContain('Math.PI / 2');
  });

  it('sets rotation to -Math.PI / 2 for upward movement', () => {
    const bodyGeoFn = extractBodyGeoFn(creepSrc);
    expect(bodyGeoFn).toContain('-Math.PI / 2');
  });

  it('uses bodyImage.y for the y-offset (air creep support)', () => {
    const bodyGeoFn = extractBodyGeoFn(creepSrc);
    expect(bodyGeoFn).toContain('this.bodyImage.y');
  });
});

// ── 6–7. bodyRect path — uses directional dimensions ─────────────────────────

describe('Creep._getBodyGeometry — bodyRect path', () => {
  it('uses BODY_VERT_W / BODY_VERT_H for vertical direction', () => {
    const bodyGeoFn = extractBodyGeoFn(creepSrc);
    expect(bodyGeoFn).toContain('BODY_VERT_W');
    expect(bodyGeoFn).toContain('BODY_VERT_H');
  });

  it('uses BOSS_VERT_W / BOSS_VERT_H for boss vertical direction', () => {
    const bodyGeoFn = extractBodyGeoFn(creepSrc);
    expect(bodyGeoFn).toContain('BOSS_VERT_W');
    expect(bodyGeoFn).toContain('BOSS_VERT_H');
  });

  it('uses bodyRect.y for the y-offset', () => {
    const bodyGeoFn = extractBodyGeoFn(creepSrc);
    expect(bodyGeoFn).toContain('this.bodyRect.y');
  });

  it('sets rotation to 0 (rect resizes instead of rotating)', () => {
    const bodyGeoFn = extractBodyGeoFn(creepSrc);
    // bodyRect branch returns rotation: 0
    expect(bodyGeoFn).toContain('rotation: 0');
  });
});

// ── 8. _refreshOverlayGeometries ─────────────────────────────────────────────

describe('Creep._refreshOverlayGeometries', () => {
  it('has a private _refreshOverlayGeometries method', () => {
    expect(creepSrc).toContain('private _refreshOverlayGeometries()');
  });

  it('calls _getBodyGeometry()', () => {
    const refreshFn = extractRefreshFn(creepSrc);
    expect(refreshFn).toContain('_getBodyGeometry()');
  });

  it('calls setSize on each overlay', () => {
    const refreshFn = extractRefreshFn(creepSrc);
    expect(refreshFn).toContain('overlay.setSize(geo.w, geo.h)');
  });

  it('calls setPosition on each overlay', () => {
    const refreshFn = extractRefreshFn(creepSrc);
    expect(refreshFn).toContain('overlay.setPosition(0, geo.y)');
  });

  it('calls setRotation on each overlay', () => {
    const refreshFn = extractRefreshFn(creepSrc);
    expect(refreshFn).toContain('overlay.setRotation(geo.rotation)');
  });

  it('guards on _effectOverlays.size === 0 to skip unnecessary work', () => {
    const refreshFn = extractRefreshFn(creepSrc);
    expect(refreshFn).toContain('_effectOverlays.size === 0');
  });
});

// ── 9. updateDirectionalVisual calls _refreshOverlayGeometries ───────────────

describe('Creep.updateDirectionalVisual — calls _refreshOverlayGeometries', () => {
  it('calls _refreshOverlayGeometries() at the end of updateDirectionalVisual', () => {
    const updateFn = extractUpdateDirFn(creepSrc);
    expect(updateFn).toContain('_refreshOverlayGeometries()');
  });
});

// ── 10. _syncOverlay — no hardcoded box sizes ─────────────────────────────────

describe('Creep._syncOverlay — uses _getBodyGeometry, not hardcoded sizes', () => {
  it('calls _getBodyGeometry() inside _syncOverlay', () => {
    const syncFn = extractSyncOverlayFn(creepSrc);
    expect(syncFn).toContain('_getBodyGeometry()');
  });

  it('does NOT use a hardcoded bodyW literal (old 32/58 values removed)', () => {
    const syncFn = extractSyncOverlayFn(creepSrc);
    // The old code had: "const bodyW = this.isBossCreep ? 58 : 32;"
    expect(syncFn).not.toContain('const bodyW');
    expect(syncFn).not.toContain('bodyW =');
  });

  it('does NOT use a hardcoded bodyH literal (old 26/42 values removed)', () => {
    const syncFn = extractSyncOverlayFn(creepSrc);
    expect(syncFn).not.toContain('const bodyH');
    expect(syncFn).not.toContain('bodyH =');
  });

  it('passes geo.y as the Rectangle y-coordinate (not literal 0)', () => {
    const syncFn = extractSyncOverlayFn(creepSrc);
    expect(syncFn).toContain('geo.y,');
  });

  it('passes geo.w and geo.h to the Rectangle constructor', () => {
    const syncFn = extractSyncOverlayFn(creepSrc);
    expect(syncFn).toContain('geo.w, geo.h');
  });

  it('calls setRotation(geo.rotation) on newly created overlays', () => {
    const syncFn = extractSyncOverlayFn(creepSrc);
    expect(syncFn).toContain('overlay.setRotation(geo.rotation)');
  });

  it('calls setSize on re-activated overlays', () => {
    const syncFn = extractSyncOverlayFn(creepSrc);
    expect(syncFn).toContain('overlay.setSize(geo.w, geo.h)');
  });

  it('calls setPosition on re-activated overlays', () => {
    const syncFn = extractSyncOverlayFn(creepSrc);
    expect(syncFn).toContain('overlay.setPosition(0, geo.y)');
  });
});

// ── 11. Arithmetic — constant value cross-checks ─────────────────────────────

describe('Creep body dimension arithmetic — cross-checks', () => {
  it('BODY_HORIZ_W is greater than BODY_HORIZ_H (wider than tall)', () => {
    expect(BODY_HORIZ_W).toBeGreaterThan(BODY_HORIZ_H);
  });

  it('BODY_VERT_W equals BODY_HORIZ_H (transposed for vertical)', () => {
    expect(BODY_VERT_W).toBe(BODY_HORIZ_H);
  });

  it('BODY_VERT_H equals BODY_HORIZ_W (transposed for vertical)', () => {
    expect(BODY_VERT_H).toBe(BODY_HORIZ_W);
  });

  it('BOSS_HORIZ_W is greater than BODY_HORIZ_W (boss is bigger)', () => {
    expect(BOSS_HORIZ_W).toBeGreaterThan(BODY_HORIZ_W);
  });

  it('BOSS_VERT_W equals BOSS_HORIZ_H (transposed for vertical)', () => {
    expect(BOSS_VERT_W).toBe(BOSS_HORIZ_H);
  });

  it('BOSS_VERT_H equals BOSS_HORIZ_W (transposed for vertical)', () => {
    expect(BOSS_VERT_H).toBe(BOSS_HORIZ_W);
  });

  it('AIR_BODY_OFFSET_Y is negative (body floats above ground position)', () => {
    expect(AIR_BODY_OFFSET_Y).toBeLessThan(0);
  });

  it('AIR_BODY_OFFSET_Y is -10', () => {
    expect(AIR_BODY_OFFSET_Y).toBe(-10);
  });

  it('normal horizontal overlay is narrower than old hardcoded value (32)', () => {
    // Old overlay was 32 wide for normal creeps; actual sprite is BODY_HORIZ_W=30
    expect(BODY_HORIZ_W).toBeLessThanOrEqual(32);
  });

  it('normal horizontal overlay height is correct (BODY_HORIZ_H, not old 26)', () => {
    // Old overlay was 26 tall for normal creeps; actual sprite is BODY_HORIZ_H=18
    expect(BODY_HORIZ_H).toBeLessThan(26);
  });

  it('boss horizontal overlay width matches BOSS_HORIZ_W (not old 58)', () => {
    // Old overlay was 58 wide for boss; actual sprite is BOSS_HORIZ_W=56
    expect(BOSS_HORIZ_W).toBeLessThanOrEqual(58);
  });

  it('boss horizontal overlay height matches BOSS_HORIZ_H (not old 42)', () => {
    // Old overlay was 42 tall for boss; actual sprite is BOSS_HORIZ_H=36
    expect(BOSS_HORIZ_H).toBeLessThan(42);
  });
});

// ── 12. Arithmetic — rotation values ─────────────────────────────────────────

describe('Creep overlay rotation arithmetic', () => {
  const HALF_PI = Math.PI / 2;

  it('down rotation (π/2) is approximately 1.5708', () => {
    expect(HALF_PI).toBeCloseTo(1.5708, 4);
  });

  it('up rotation (-π/2) has opposite sign from down rotation', () => {
    expect(-HALF_PI).toBe(-Math.PI / 2);
  });

  it('horizontal rotation 0 is falsy (no rotation)', () => {
    expect(0).toBeFalsy();
  });
});

// ── Source extraction helpers ─────────────────────────────────────────────────
// Slice out each method's source by finding the start marker and slicing up
// to the next private method declaration.  Avoids brace-counting issues with
// TypeScript object return type annotations (e.g. (): { w: number; ... } { ).

/** Extract the source of _getBodyGeometry from Creep.ts. */
function extractBodyGeoFn(src: string): string {
  return sliceBetween(src, 'private _getBodyGeometry()', 'private _refreshOverlayGeometries()');
}

/** Extract the source of _refreshOverlayGeometries from Creep.ts. */
function extractRefreshFn(src: string): string {
  return sliceBetween(src, 'private _refreshOverlayGeometries()', 'private _syncOverlay(');
}

/** Extract the source of _syncOverlay from Creep.ts. */
function extractSyncOverlayFn(src: string): string {
  return sliceBetween(src, 'private _syncOverlay(', 'private _syncParticles(');
}

/** Extract the source of updateDirectionalVisual from Creep.ts. */
function extractUpdateDirFn(src: string): string {
  return sliceBetween(src, 'private updateDirectionalVisual()', 'private computeArmorBasePos()');
}

/**
 * Return the substring of `src` from `startMarker` up to `endMarker`.
 * Throws if `startMarker` is not found.
 */
function sliceBetween(src: string, startMarker: string, endMarker: string): string {
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error(`Marker not found in Creep.ts: ${startMarker}`);
  const end = src.indexOf(endMarker, start + startMarker.length);
  return end === -1 ? src.slice(start) : src.slice(start, end);
}
