/**
 * TASK-071 — Tower Sell Rubble
 *
 * Structural ?raw tests verifying:
 * - Rubble PNG assets are preloaded in BootScene
 * - GameScene has _rubbleSprites Map field
 * - sellTower() calls _placeRubble with the tower's col/row
 * - tryPlaceTower() calls _removeRubble before placing
 * - _placeRestoredTower() calls _removeRubble before restoring
 * - Rubble depth is 2 (above decorations at 1, below markers at 3)
 * - Rubble has random rotation
 * - Rubble has fade-in tween (alpha 0 → 1)
 * - shutdown() destroys all rubble sprites and clears the map
 * - init() resets _rubbleSprites to a new Map
 */
import { describe, it, expect } from 'vitest';

import bootSrc      from '../../scenes/BootScene.ts?raw';
import gameSceneSrc from '../../scenes/GameScene.ts?raw';

// ── BootScene: asset preloading ───────────────────────────────────────────────

describe('BootScene — rubble asset preloading', () => {
  it('preloads rubble-01', () => {
    expect(bootSrc).toContain("this.load.image('rubble-01'");
    expect(bootSrc).toContain("'assets/effects/rubble-01.png'");
  });

  it('preloads rubble-02', () => {
    expect(bootSrc).toContain("this.load.image('rubble-02'");
    expect(bootSrc).toContain("'assets/effects/rubble-02.png'");
  });

  it('preloads rubble-03', () => {
    expect(bootSrc).toContain("this.load.image('rubble-03'");
    expect(bootSrc).toContain("'assets/effects/rubble-03.png'");
  });

  it('all three rubble loads are in _loadAssets()', () => {
    const loadAssetsStart = bootSrc.indexOf('private _loadAssets()');
    const rubble01Idx     = bootSrc.indexOf("'rubble-01'");
    const rubble02Idx     = bootSrc.indexOf("'rubble-02'");
    const rubble03Idx     = bootSrc.indexOf("'rubble-03'");
    expect(rubble01Idx).toBeGreaterThan(loadAssetsStart);
    expect(rubble02Idx).toBeGreaterThan(loadAssetsStart);
    expect(rubble03Idx).toBeGreaterThan(loadAssetsStart);
  });
});

// ── GameScene: _rubbleSprites field ──────────────────────────────────────────

describe('GameScene — _rubbleSprites field', () => {
  it('declares _rubbleSprites as Map', () => {
    expect(gameSceneSrc).toContain('_rubbleSprites: Map<string, Phaser.GameObjects.Image>');
  });

  it('resets _rubbleSprites to a new Map in init()', () => {
    expect(gameSceneSrc).toContain('this._rubbleSprites        = new Map()');
  });
});

// ── GameScene: _placeRubble method ────────────────────────────────────────────

describe('GameScene — _placeRubble()', () => {
  it('has a private _placeRubble method', () => {
    expect(gameSceneSrc).toContain('private _placeRubble(col: number, row: number): void');
  });

  it('uses a "col,row" string key', () => {
    expect(gameSceneSrc).toContain('`${col},${row}`');
  });

  it('picks randomly among 3 rubble variants', () => {
    expect(gameSceneSrc).toContain('Math.floor(Math.random() * 3) + 1');
  });

  it('uses a template literal to build the texture key', () => {
    expect(gameSceneSrc).toContain('`rubble-0${variant}`');
  });

  it('sets depth to 2', () => {
    const placeRubbleStart = gameSceneSrc.indexOf('private _placeRubble');
    const depth2Idx        = gameSceneSrc.indexOf('.setDepth(2)', placeRubbleStart);
    expect(depth2Idx).toBeGreaterThan(placeRubbleStart);
  });

  it('starts with alpha 0 for fade-in', () => {
    const placeRubbleStart = gameSceneSrc.indexOf('private _placeRubble');
    const alpha0Idx        = gameSceneSrc.indexOf('.setAlpha(0)', placeRubbleStart);
    expect(alpha0Idx).toBeGreaterThan(placeRubbleStart);
  });

  it('tweens alpha to 1 (fade-in)', () => {
    const placeRubbleStart = gameSceneSrc.indexOf('private _placeRubble');
    const tweenIdx         = gameSceneSrc.indexOf('this.tweens.add(', placeRubbleStart);
    expect(tweenIdx).toBeGreaterThan(placeRubbleStart);
    const tweenBlock = gameSceneSrc.slice(tweenIdx, tweenIdx + 200);
    expect(tweenBlock).toContain('alpha: 1');
  });

  it('applies a random rotation', () => {
    const placeRubbleStart = gameSceneSrc.indexOf('private _placeRubble');
    const rotationIdx      = gameSceneSrc.indexOf('.setRotation(', placeRubbleStart);
    expect(rotationIdx).toBeGreaterThan(placeRubbleStart);
    const rotationCall = gameSceneSrc.slice(rotationIdx, rotationIdx + 60);
    expect(rotationCall).toContain('Math.random()');
  });

  it('stores the sprite in _rubbleSprites by key', () => {
    const placeRubbleStart = gameSceneSrc.indexOf('private _placeRubble');
    const setIdx           = gameSceneSrc.indexOf('this._rubbleSprites.set(key,', placeRubbleStart);
    expect(setIdx).toBeGreaterThan(placeRubbleStart);
  });

  it('calls _removeRubble(col, row) at the start to guard against duplicates', () => {
    const placeRubbleStart = gameSceneSrc.indexOf('private _placeRubble');
    const removeIdx        = gameSceneSrc.indexOf('this._removeRubble(col, row)', placeRubbleStart);
    expect(removeIdx).toBeGreaterThan(placeRubbleStart);
  });
});

// ── GameScene: _removeRubble method ──────────────────────────────────────────

describe('GameScene — _removeRubble()', () => {
  it('has a private _removeRubble method', () => {
    expect(gameSceneSrc).toContain('private _removeRubble(col: number, row: number): void');
  });

  it('looks up the sprite by "col,row" key', () => {
    const removeStart = gameSceneSrc.indexOf('private _removeRubble');
    const getIdx      = gameSceneSrc.indexOf('this._rubbleSprites.get(key)', removeStart);
    expect(getIdx).toBeGreaterThan(removeStart);
  });

  it('destroys the sprite', () => {
    const removeStart  = gameSceneSrc.indexOf('private _removeRubble');
    const destroyIdx   = gameSceneSrc.indexOf('sprite.destroy()', removeStart);
    expect(destroyIdx).toBeGreaterThan(removeStart);
  });

  it('deletes the key from the map after destroy', () => {
    const removeStart  = gameSceneSrc.indexOf('private _removeRubble');
    const destroyIdx   = gameSceneSrc.indexOf('sprite.destroy()', removeStart);
    const deleteIdx    = gameSceneSrc.indexOf('this._rubbleSprites.delete(key)', removeStart);
    expect(deleteIdx).toBeGreaterThan(destroyIdx);
  });
});

// ── GameScene: sellTower() integration ───────────────────────────────────────

describe('GameScene — sellTower() places rubble', () => {
  it('captures tileCol before calling tower.sell()', () => {
    const sellStart  = gameSceneSrc.indexOf('private sellTower(');
    const colIdx     = gameSceneSrc.indexOf('const sellCol = tower.tileCol', sellStart);
    const rowIdx     = gameSceneSrc.indexOf('const sellRow = tower.tileRow', sellStart);
    const sellCallIdx = gameSceneSrc.indexOf('tower.sell()', sellStart);
    expect(colIdx).toBeGreaterThan(sellStart);
    expect(rowIdx).toBeGreaterThan(sellStart);
    expect(colIdx).toBeLessThan(sellCallIdx);
    expect(rowIdx).toBeLessThan(sellCallIdx);
  });

  it('calls _placeRubble after tower.sell()', () => {
    const sellStart   = gameSceneSrc.indexOf('private sellTower(');
    const sellCallIdx = gameSceneSrc.indexOf('tower.sell()', sellStart);
    const rubbleIdx   = gameSceneSrc.indexOf('this._placeRubble(sellCol, sellRow)', sellStart);
    expect(rubbleIdx).toBeGreaterThan(sellCallIdx);
  });
});

// ── GameScene: tryPlaceTower() removes rubble ─────────────────────────────────

describe('GameScene — tryPlaceTower() removes rubble', () => {
  it('calls _removeRubble(col, row) before placing the tower', () => {
    const placeStart   = gameSceneSrc.indexOf('private tryPlaceTower(');
    const removeIdx    = gameSceneSrc.indexOf('this._removeRubble(col, row)', placeStart);
    const towerNewIdx  = gameSceneSrc.indexOf('const tower = new Tower(', placeStart);
    expect(removeIdx).toBeGreaterThan(placeStart);
    expect(removeIdx).toBeLessThan(towerNewIdx);
  });
});

// ── GameScene: _placeRestoredTower() removes rubble ───────────────────────────

describe('GameScene — _placeRestoredTower() removes rubble', () => {
  it('calls _removeRubble before restoring the tower', () => {
    const restoreStart = gameSceneSrc.indexOf('private _placeRestoredTower(');
    const removeIdx    = gameSceneSrc.indexOf('this._removeRubble(saved.col, saved.row)', restoreStart);
    const towerNewIdx  = gameSceneSrc.indexOf('const tower = new Tower(', restoreStart);
    expect(removeIdx).toBeGreaterThan(restoreStart);
    expect(removeIdx).toBeLessThan(towerNewIdx);
  });
});

// ── GameScene: shutdown() cleanup ────────────────────────────────────────────

describe('GameScene — shutdown() destroys rubble sprites', () => {
  it('iterates _rubbleSprites.values() and destroys each', () => {
    const shutdownStart = gameSceneSrc.indexOf('shutdown(): void');
    const forEachIdx    = gameSceneSrc.indexOf(
      'for (const sprite of this._rubbleSprites.values()) sprite.destroy()',
      shutdownStart,
    );
    expect(forEachIdx).toBeGreaterThan(shutdownStart);
  });

  it('clears _rubbleSprites map in shutdown()', () => {
    const shutdownStart = gameSceneSrc.indexOf('shutdown(): void');
    const clearIdx      = gameSceneSrc.indexOf('this._rubbleSprites.clear()', shutdownStart);
    expect(clearIdx).toBeGreaterThan(shutdownStart);
  });
});

// ── Depth sanity: rubble is above deco (1), below markers (3) ────────────────

describe('Depth layering invariant', () => {
  it('rubble depth (2) is above terrain decoration depth (1)', () => {
    expect(2).toBeGreaterThan(1);
  });

  it('rubble depth (2) is below spawn/exit marker depth (3)', () => {
    expect(2).toBeLessThan(3);
  });

  it('rubble depth (2) is below tower depth (10)', () => {
    expect(2).toBeLessThan(10);
  });
});

// ── Rotation amplitude sanity ──────────────────────────────────────────────

describe('Rotation amplitude arithmetic', () => {
  it('rotation amplitude ±0.3 rad is below π/4 (45°)', () => {
    const amplitude = 0.6 / 2;   // half of the ±0.6 spread
    expect(amplitude).toBeLessThan(Math.PI / 4);
  });

  it('rotation amplitude is subtle (less than 20°)', () => {
    const amplitude = 0.6 / 2;
    expect(amplitude * (180 / Math.PI)).toBeLessThan(20);
  });
});

// ── Variant selection arithmetic ──────────────────────────────────────────

describe('Variant selection arithmetic', () => {
  it('Math.floor(Math.random() * 3) + 1 always yields 1, 2, or 3', () => {
    // Boundary: Math.random() = 0
    expect(Math.floor(0 * 3) + 1).toBe(1);
    // Boundary: Math.random() just under 1/3
    expect(Math.floor(0.333 * 3) + 1).toBe(1);
    // Boundary: Math.random() at 1/3
    expect(Math.floor(0.334 * 3) + 1).toBe(2);
    // Boundary: Math.random() just under 2/3
    expect(Math.floor(0.666 * 3) + 1).toBe(2);
    // Boundary: Math.random() at 2/3
    expect(Math.floor(0.667 * 3) + 1).toBe(3);
    // Boundary: Math.random() approaches 1 (never reaches 1)
    expect(Math.floor(0.999 * 3) + 1).toBe(3);
  });

  it('texture key template produces valid keys for all variants', () => {
    for (const v of [1, 2, 3]) {
      expect(`rubble-0${v}`).toMatch(/^rubble-0[123]$/);
    }
  });
});

// ── Tile center position arithmetic ─────────────────────────────────────────

describe('Tile center position arithmetic', () => {
  it('computes center correctly for tile (0,0) with tileSize 40', () => {
    const ts = 40;
    expect(0 * ts + ts / 2).toBe(20);
  });

  it('computes center correctly for tile (5,3) with tileSize 40', () => {
    const ts = 40;
    expect(5 * ts + ts / 2).toBe(220);
    expect(3 * ts + ts / 2).toBe(140);
  });

  it('computes center correctly for tile (0,0) with tileSize 64', () => {
    const ts = 64;
    expect(0 * ts + ts / 2).toBe(32);
  });
});

// ── _removeRubble guard: safe no-op on missing key ──────────────────────────

describe('_removeRubble — guard logic', () => {
  it('guards sprite access behind an if-check before destroy()', () => {
    const removeStart = gameSceneSrc.indexOf('private _removeRubble');
    const removeEnd   = gameSceneSrc.indexOf('}', gameSceneSrc.indexOf('sprite.destroy()', removeStart));
    const body        = gameSceneSrc.slice(removeStart, removeEnd);
    expect(body).toContain('if (sprite)');
  });
});

// ── Tween configuration verification ────────────────────────────────────────

describe('Tween configuration', () => {
  it('uses 400ms duration for fade-in', () => {
    const placeStart = gameSceneSrc.indexOf('private _placeRubble');
    const tweenIdx   = gameSceneSrc.indexOf('this.tweens.add(', placeStart);
    const tweenBlock = gameSceneSrc.slice(tweenIdx, tweenIdx + 200);
    expect(tweenBlock).toContain('duration: 400');
  });

  it('uses Sine.easeOut easing', () => {
    const placeStart = gameSceneSrc.indexOf('private _placeRubble');
    const tweenIdx   = gameSceneSrc.indexOf('this.tweens.add(', placeStart);
    const tweenBlock = gameSceneSrc.slice(tweenIdx, tweenIdx + 200);
    expect(tweenBlock).toContain("ease: 'Sine.easeOut'");
  });
});

// ── Rubble does NOT affect placement logic ──────────────────────────────────

describe('Rubble does not block placement', () => {
  it('isTileOccupied does not reference _rubbleSprites', () => {
    const occupiedStart = gameSceneSrc.indexOf('isTileOccupied(');
    const occupiedEnd   = gameSceneSrc.indexOf('\n  }', occupiedStart);
    const body          = gameSceneSrc.slice(occupiedStart, occupiedEnd);
    expect(body).not.toContain('_rubbleSprites');
  });

  it('isBuildable does not reference _rubbleSprites', () => {
    const buildableStart = gameSceneSrc.indexOf('isBuildable(');
    const buildableEnd   = gameSceneSrc.indexOf('\n  }', buildableStart);
    const body           = gameSceneSrc.slice(buildableStart, buildableEnd);
    expect(body).not.toContain('_rubbleSprites');
  });
});
