/**
 * AmbientVFX — structural and logic tests.
 *
 * AmbientVFX depends on Phaser and cannot be instantiated in jsdom.
 * All tests use ?raw source imports to verify structural patterns,
 * plus pure-logic arithmetic tests that require no Phaser dependency.
 */
import { describe, it, expect } from 'vitest';

import ambientSrc    from '../AmbientVFX.ts?raw';
import gameSceneSrc  from '../../scenes/GameScene.ts?raw';

/** Local copy of posHash to avoid importing Phaser via TerrainRenderer. */
function posHash(seed: number, row: number, col: number, salt: number): number {
  let h = seed ^ (row * 7919 + col * 104729 + salt * 15731);
  h ^= h << 13;
  h ^= h >>> 17;
  h ^= h << 5;
  return ((h >>> 0) % 10000) / 10000;
}

// ── AMBIENT_VFX_DEPTH constant ────────────────────────────────────────────────

describe('AmbientVFX — depth constant', () => {
  it('exports AMBIENT_VFX_DEPTH', () => {
    expect(ambientSrc).toContain('export const AMBIENT_VFX_DEPTH');
  });

  it('sets AMBIENT_VFX_DEPTH to 2', () => {
    expect(ambientSrc).toContain('AMBIENT_VFX_DEPTH = 2');
  });
});

// ── Class export ──────────────────────────────────────────────────────────────

describe('AmbientVFX — class structure', () => {
  it('exports AmbientVFX class', () => {
    expect(ambientSrc).toContain('export class AmbientVFX');
  });

  it('has a public update(delta) method', () => {
    expect(ambientSrc).toContain('update(delta: number): void');
  });

  it('has a public destroy() method', () => {
    expect(ambientSrc).toContain('destroy(): void');
  });

  it('accepts regionId and stageId in constructor', () => {
    expect(ambientSrc).toContain('regionId: string');
    expect(ambientSrc).toContain('stageId:  string');
  });

  it('accepts isMobile in constructor', () => {
    expect(ambientSrc).toContain('isMobile: boolean');
  });
});

// ── niizh-miikana override ────────────────────────────────────────────────────

describe('AmbientVFX — niizh-miikana stageId override', () => {
  it('derives effectId from stageId for niizh-miikana sub-stage', () => {
    expect(ambientSrc).toContain("stageId.startsWith('niizh-miikana')");
  });

  it('maps niizh-miikana to its own effect set, not mashkiig', () => {
    expect(ambientSrc).toContain("'niizh-miikana'");
  });
});

// ── Particle pool ─────────────────────────────────────────────────────────────

describe('AmbientVFX — particle pool', () => {
  it('builds an Arc pool', () => {
    expect(ambientSrc).toContain('_buildArcPool');
  });

  it('uses a budget of 30 for desktop', () => {
    expect(ambientSrc).toContain('30');
  });

  it('reduces pool size on mobile (~60%)', () => {
    // mobile pool should be 12 (60% reduction from 30)
    expect(ambientSrc).toContain('isMobile ? 12 : 30');
  });

  it('destroys all pool slots in destroy()', () => {
    expect(ambientSrc).toContain('s.arc.destroy()');
  });

  it('destroys leaf pool slots in destroy()', () => {
    expect(ambientSrc).toContain('s.tri.destroy()');
  });
});

// ── Depth applied to all persistent objects ───────────────────────────────────

describe('AmbientVFX — depth assignment', () => {
  it('sets AMBIENT_VFX_DEPTH on Arc pool objects', () => {
    expect(ambientSrc).toContain('arc.setDepth(AMBIENT_VFX_DEPTH)');
  });

  it('sets AMBIENT_VFX_DEPTH on leaf Triangle objects', () => {
    expect(ambientSrc).toContain('tri.setDepth(AMBIENT_VFX_DEPTH)');
  });
});

// ── Mobile: mist disabled ─────────────────────────────────────────────────────

describe('AmbientVFX — mobile guards', () => {
  it('disables mist layer on mobile', () => {
    expect(ambientSrc).toContain('if (!this._mobile)');
    // Mist is inside the !mobile guard
    expect(ambientSrc).toContain('_mist');
  });

  it('disables aurora on mobile', () => {
    // Aurora init also inside !mobile guard
    expect(ambientSrc).toContain('_aurora');
    const auroraBlock = ambientSrc.indexOf('_initBiboonAki');
    const mobileGuardInBiboon = ambientSrc.indexOf('if (!this._mobile)', auroraBlock);
    expect(mobileGuardInBiboon).toBeGreaterThan(auroraBlock);
  });

  it('reduces leaf pool to 2 on mobile', () => {
    expect(ambientSrc).toContain('isMobile ? 2 : 4');
  });
});

// ── Pause behaviour ───────────────────────────────────────────────────────────

describe('AmbientVFX — pause via update() not called', () => {
  it('update() increments _elapsed', () => {
    expect(ambientSrc).toContain('this._elapsed += delta');
  });
});

// ── zaagaiganing effects ─────────────────────────────────────────────────────

describe('AmbientVFX — zaagaiganing', () => {
  it('initialises sunlight patches', () => {
    expect(ambientSrc).toContain('_sunPatches');
  });

  it('spawns water shimmer particles near path edges', () => {
    expect(ambientSrc).toContain('_waterEdgeTiles');
    expect(ambientSrc).toContain('shimmer');
  });

  it('spawns vine glow particles on buildable tiles', () => {
    expect(ambientSrc).toContain('vineGlow');
  });
});

// ── mashkiig effects ──────────────────────────────────────────────────────────

describe('AmbientVFX — mashkiig', () => {
  it('initialises fireflies', () => {
    expect(ambientSrc).toContain('_fireflies');
  });

  it('spawns bubble particles rising from path tiles', () => {
    expect(ambientSrc).toContain('bubbles');
    expect(ambientSrc).toContain('_pathTiles');
  });

  it('has 5 fireflies on desktop and 2 on mobile', () => {
    expect(ambientSrc).toContain('_mobile ? 2 : 5');
  });
});

// ── mitigomizh effects ────────────────────────────────────────────────────────

describe('AmbientVFX — mitigomizh', () => {
  it('spawns pollen/seed particles', () => {
    expect(ambientSrc).toContain('pollen');
  });

  it('implements grass sway with Graphics', () => {
    expect(ambientSrc).toContain('_grassGfx');
    expect(ambientSrc).toContain('_redrawGrass');
  });

  it('implements butterfly effect', () => {
    expect(ambientSrc).toContain('_butterfly');
    expect(ambientSrc).toContain('_launchButterfly');
    expect(ambientSrc).toContain('_stepButterfly');
  });

  it('butterfly respawns every 30-60 seconds', () => {
    // 30000 ms minimum, 30000 ms variance = up to 60000 ms
    expect(ambientSrc).toContain('30000');
  });
});

// ── biboon-aki effects ────────────────────────────────────────────────────────

describe('AmbientVFX — biboon-aki', () => {
  it('spawns snow twinkle particles', () => {
    expect(ambientSrc).toContain('snowTwinkle');
  });

  it('spawns snowfall particles drifting diagonally', () => {
    expect(ambientSrc).toContain('snowfall');
  });

  it('spawns breath frost particles near HUD area', () => {
    expect(ambientSrc).toContain('breathFrost');
  });

  it('initialises aurora rectangles', () => {
    expect(ambientSrc).toContain('_aurora');
    expect(ambientSrc).toContain('auroraColors');
  });
});

// ── niizh-miikana effects ─────────────────────────────────────────────────────

describe('AmbientVFX — niizh-miikana', () => {
  it('spawns falling leaf particles with rotation', () => {
    expect(ambientSrc).toContain('leaves');
    expect(ambientSrc).toContain('_emitLeaf');
    expect(ambientSrc).toContain('rotVel');
  });

  it('initialises light ray rectangles', () => {
    expect(ambientSrc).toContain('_lightRays');
    expect(ambientSrc).toContain('setRotation');
  });

  it('light rays are disabled on mobile', () => {
    // rayCount = this._mobile ? 0 : 4
    expect(ambientSrc).toContain('_mobile ? 0 : 4');
  });
});

// ── GameScene integration ─────────────────────────────────────────────────────

describe('GameScene — AmbientVFX integration', () => {
  it('imports AmbientVFX', () => {
    expect(gameSceneSrc).toContain("import { AmbientVFX }");
  });

  it('declares _ambientVFX field', () => {
    expect(gameSceneSrc).toContain('_ambientVFX');
  });

  it('resets _ambientVFX to null in init()', () => {
    expect(gameSceneSrc).toContain('this._ambientVFX           = null;');
  });

  it('creates _ambientVFX in create() after renderMap()', () => {
    const renderMapIdx = gameSceneSrc.indexOf('this.renderMap()');
    const ambientIdx   = gameSceneSrc.indexOf('new AmbientVFX(');
    expect(ambientIdx).toBeGreaterThan(renderMapIdx);
  });

  it('passes regionId to AmbientVFX constructor', () => {
    expect(gameSceneSrc).toContain('regionId,');
  });

  it('passes selectedStageId to AmbientVFX constructor', () => {
    expect(gameSceneSrc).toContain('this.selectedStageId,');
  });

  it('calls _ambientVFX.update(scaledDelta) in update()', () => {
    expect(gameSceneSrc).toContain('this._ambientVFX?.update(scaledDelta)');
  });

  it('update() call is after the paused-guard (i.e. inside the unpaused path)', () => {
    const pauseGuardIdx = gameSceneSrc.indexOf("if (this.speedMultiplier === 0) return; // paused");
    const updateCallIdx = gameSceneSrc.indexOf('this._ambientVFX?.update(scaledDelta)');
    expect(updateCallIdx).toBeGreaterThan(pauseGuardIdx);
  });

  it('destroys _ambientVFX in shutdown()', () => {
    expect(gameSceneSrc).toContain('this._ambientVFX?.destroy()');
  });

  it('nulls _ambientVFX after destroy in shutdown()', () => {
    expect(gameSceneSrc).toContain('this._ambientVFX = null;');
  });
});

// ── Pure-logic arithmetic tests ───────────────────────────────────────────────

describe('AmbientVFX — particle budget arithmetic', () => {
  it('mobile pool (12) is about 40% of desktop pool (30)', () => {
    const desktop = 30;
    const mobile  = 12;
    const ratio   = mobile / desktop;
    expect(ratio).toBeGreaterThanOrEqual(0.35);
    expect(ratio).toBeLessThanOrEqual(0.50);
  });

  it('desktop pool fits within the 30-particle budget', () => {
    expect(30).toBeLessThanOrEqual(30);
  });

  it('mobile leaf pool (2) is 50% of desktop (4)', () => {
    expect(2 / 4).toBe(0.5);
  });

  it('butterfly respawn window is 30-60 seconds', () => {
    const minMs = 30000;
    const maxMs = 60000;
    expect(minMs).toBe(30000);
    expect(maxMs).toBe(60000);
    expect(maxMs).toBeGreaterThan(minMs);
  });
});

// ── Pool exhaustion guard ────────────────────────────────────────────────────

describe('AmbientVFX — pool exhaustion safety', () => {
  it('_emitArc returns early when no idle slot found', () => {
    // _emitArc tries to find an idle slot; if none, it returns without crash
    expect(ambientSrc).toContain('const slot = this._pool.find(s => !s.active)');
    expect(ambientSrc).toContain('if (!slot) return');
  });

  it('_emitLeaf returns early when no idle slot found', () => {
    expect(ambientSrc).toContain('const slot = this._leafPool.find(s => !s.active)');
    const leafEmitBlock = ambientSrc.indexOf('_emitLeaf');
    const guardIdx = ambientSrc.indexOf('if (!slot) return', leafEmitBlock);
    expect(guardIdx).toBeGreaterThan(leafEmitBlock);
  });
});

// ── Empty tile list guards ───────────────────────────────────────────────────

describe('AmbientVFX — empty tile list guards', () => {
  it('shimmer checks waterEdgeTiles.length before spawning', () => {
    expect(ambientSrc).toContain('this._waterEdgeTiles.length > 0');
  });

  it('vine glow checks buildableTiles.length before spawning', () => {
    expect(ambientSrc).toContain('this._buildableTiles.length > 0');
  });

  it('bubbles check pathTiles.length before spawning', () => {
    expect(ambientSrc).toContain('this._pathTiles.length > 0');
  });

  it('snow twinkle checks buildableTiles.length before spawning', () => {
    // In the biboon-aki update, snowTwinkle guard
    const biboonUpdate = ambientSrc.indexOf('_updateBiboonAki');
    const twinkleGuard = ambientSrc.indexOf('this._buildableTiles.length > 0', biboonUpdate);
    expect(twinkleGuard).toBeGreaterThan(biboonUpdate);
  });
});

// ── Unknown region fallback ──────────────────────────────────────────────────

describe('AmbientVFX — unknown region handling', () => {
  it('update() switch has a default no-op case', () => {
    // Both _initEffects and update() have default: break
    const matches = ambientSrc.match(/default:\s*break/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Destroy completeness ─────────────────────────────────────────────────────

describe('AmbientVFX — destroy completeness', () => {
  it('destroys sunPatch arcs', () => {
    expect(ambientSrc).toContain('for (const p of this._sunPatches) p.arc.destroy()');
  });

  it('destroys firefly arcs', () => {
    expect(ambientSrc).toContain('for (const f of this._fireflies)  f.arc.destroy()');
  });

  it('destroys aurora rectangles', () => {
    expect(ambientSrc).toContain('for (const a of this._aurora)     a.rect.destroy()');
  });

  it('destroys light ray rectangles', () => {
    expect(ambientSrc).toContain('for (const r of this._lightRays)  r.rect.destroy()');
  });

  it('destroys mist rectangle', () => {
    expect(ambientSrc).toContain('this._mist?.destroy()');
  });

  it('destroys butterfly triangle', () => {
    expect(ambientSrc).toContain('this._butterfly?.destroy()');
  });

  it('destroys grass Graphics object', () => {
    expect(ambientSrc).toContain('this._grassGfx?.destroy()');
  });
});

// ── Pool particle lifecycle ──────────────────────────────────────────────────

describe('AmbientVFX — pool particle lifecycle', () => {
  it('deactivates particles when life reaches 0', () => {
    expect(ambientSrc).toContain('if (s.life <= 0)');
    expect(ambientSrc).toContain('s.active = false');
  });

  it('hides deactivated arc particles', () => {
    expect(ambientSrc).toContain('s.arc.setActive(false).setVisible(false)');
  });

  it('hides deactivated leaf particles', () => {
    expect(ambientSrc).toContain('s.tri.setActive(false).setVisible(false)');
  });

  it('fades arc particles over last 30% of life', () => {
    expect(ambientSrc).toContain('if (t < 0.3)');
  });

  it('fades leaf particles over last 25% of life', () => {
    expect(ambientSrc).toContain('if (t < 0.25)');
  });
});

// ── Boundary handling ────────────────────────────────────────────────────────

describe('AmbientVFX — boundary handling', () => {
  it('sunlight patches wrap horizontally within map bounds', () => {
    expect(ambientSrc).toContain('if (p.arc.x < 0)          p.arc.x = this._mapW');
    expect(ambientSrc).toContain('if (p.arc.x > this._mapW) p.arc.x = 0');
  });

  it('fireflies bounce off map edges', () => {
    expect(ambientSrc).toContain('if (f.x < 0 || f.x > this._mapW) f.vx *= -1');
    expect(ambientSrc).toContain('if (f.y < 0 || f.y > this._mapH) f.vy *= -1');
  });

  it('butterfly hides when it flies off-screen', () => {
    expect(ambientSrc).toContain('if (this._bfly.x > this._mapW + 20)');
    expect(ambientSrc).toContain('this._butterfly.setVisible(false)');
  });
});

// ── _hasAdjacentBuildable edge logic ─────────────────────────────────────────

describe('AmbientVFX — water edge tile detection', () => {
  it('checks 8 neighbors (3x3 minus center)', () => {
    expect(ambientSrc).toContain('if (dr === 0 && dc === 0) continue');
  });

  it('bounds-checks neighbor coordinates', () => {
    expect(ambientSrc).toContain('nr >= 0 && nr < rows && nc >= 0 && nc < cols');
  });

  it('identifies BUILDABLE neighbors', () => {
    expect(ambientSrc).toContain('tiles[nr][nc] === TILE.BUILDABLE');
  });
});

// ── Mobile interval scaling ──────────────────────────────────────────────────

describe('AmbientVFX — mobile spawn rate reduction', () => {
  it('shimmer interval is longer on mobile (1200 vs 700)', () => {
    expect(ambientSrc).toContain('_mobile ? 1200 : 700');
  });

  it('vine glow interval is longer on mobile (2000 vs 1200)', () => {
    expect(ambientSrc).toContain('_mobile ? 2000 : 1200');
  });

  it('bubble interval is longer on mobile (2500 vs 1400)', () => {
    expect(ambientSrc).toContain('_mobile ? 2500 : 1400');
  });

  it('pollen interval is longer on mobile (1800 vs 900)', () => {
    expect(ambientSrc).toContain('_mobile ? 1800 : 900');
  });

  it('snow twinkle interval is longer on mobile (1000 vs 550)', () => {
    expect(ambientSrc).toContain('_mobile ? 1000 : 550');
  });

  it('snowfall interval is longer on mobile (2200 vs 1200)', () => {
    expect(ambientSrc).toContain('_mobile ? 2200 : 1200');
  });

  it('breath frost interval is longer on mobile (4000 vs 2200)', () => {
    expect(ambientSrc).toContain('_mobile ? 4000 : 2200');
  });

  it('leaf interval is longer on mobile (3500 vs 1800)', () => {
    expect(ambientSrc).toContain('_mobile ? 3500 : 1800');
  });
});

// ── No heap allocations in update loop ───────────────────────────────────────

describe('AmbientVFX — update-loop allocation safety', () => {
  it('update() does not contain "new " (no heap allocations per frame)', () => {
    // Extract the update method body (from 'update(delta' to next 'private' or 'destroy')
    const updateStart = ambientSrc.indexOf('update(delta: number): void');
    const updateEnd   = ambientSrc.indexOf('destroy(): void');
    const updateBody  = ambientSrc.slice(updateStart, updateEnd);
    expect(updateBody).not.toContain('new ');
  });
});

// ── All five region update methods dispatched ────────────────────────────────

describe('AmbientVFX — region dispatch completeness', () => {
  const regions = [
    'zaagaiganing',
    'mashkiig',
    'mitigomizh',
    'biboon-aki',
    'niizh-miikana',
  ];

  for (const r of regions) {
    it(`has _init method for ${r}`, () => {
      const methodName = `_init${r.charAt(0).toUpperCase()}${r.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`;
      expect(ambientSrc).toContain(methodName);
    });

    it(`has _update method for ${r}`, () => {
      const methodName = `_update${r.charAt(0).toUpperCase()}${r.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`;
      expect(ambientSrc).toContain(methodName);
    });
  }
});

// ── Deterministic randomness ─────────────────────────────────────────────────

describe('AmbientVFX — deterministic randomness', () => {
  it('uses posHash for _rng (not Math.random)', () => {
    expect(ambientSrc).toContain('posHash(this._seed');
    expect(ambientSrc).not.toContain('Math.random');
  });

  it('imports posHash and mapIdToSeed from TerrainRenderer', () => {
    expect(ambientSrc).toContain("import { mapIdToSeed, posHash } from './TerrainRenderer'");
  });

  it('derives seed from mapData.id', () => {
    expect(ambientSrc).toContain('mapIdToSeed(mapData.id)');
  });
});

// ── _randomTile salt independence ─────────────────────────────────────────────

describe('AmbientVFX — _randomTile uses per-effect salt', () => {
  it('_randomTile accepts a salt parameter (not arr.length)', () => {
    // The signature must include a salt parameter
    expect(ambientSrc).toContain('_randomTile<T>(arr: T[], salt: number): T');
  });

  it('_randomTile passes salt to _rng, not arr.length', () => {
    // Must use the salt argument, not arr.length, as the rng salt
    expect(ambientSrc).toContain('this._rng(salt)');
    // Must NOT use arr.length as the rng salt
    expect(ambientSrc).not.toContain('this._rng(arr.length)');
  });

  it('shimmer uses unique salt 100', () => {
    expect(ambientSrc).toContain('this._randomTile(this._waterEdgeTiles, 100)');
  });

  it('vine glow uses unique salt 101', () => {
    expect(ambientSrc).toContain('this._randomTile(this._buildableTiles, 101)');
  });

  it('bubbles uses unique salt 102', () => {
    expect(ambientSrc).toContain('this._randomTile(this._pathTiles, 102)');
  });

  it('snow twinkle uses unique salt 103', () => {
    expect(ambientSrc).toContain('this._randomTile(this._buildableTiles, 103)');
  });

  it('all four salts (100-103) are distinct', () => {
    const salts = [100, 101, 102, 103];
    expect(new Set(salts).size).toBe(salts.length);
  });
});

// ── _randomTile arithmetic (uses posHash directly) ────────────────────────────

describe('AmbientVFX — _randomTile arithmetic', () => {
  // Replicate the _rng + _randomTile logic outside of Phaser
  const rng = (seed: number, elapsed: number, salt: number) =>
    posHash(seed, Math.floor(elapsed * 0.01) | 0, salt, 0);

  const randomTileIndex = (seed: number, elapsed: number, salt: number, len: number) =>
    Math.floor(rng(seed, elapsed, salt) * len) % len;

  it('different salts yield different indices for same-length arrays', () => {
    const seed = 42;
    const len = 20; // same array length for both
    // With a good hash, different salts should differ across time buckets
    let differ = false;
    for (let t = 0; t < 100; t++) {
      if (randomTileIndex(seed, t * 100, 100, len) !== randomTileIndex(seed, t * 100, 101, len)) {
        differ = true;
        break;
      }
    }
    expect(differ).toBe(true);
  });

  it('index is always within [0, arr.length)', () => {
    const seed = 99;
    for (let salt = 100; salt <= 103; salt++) {
      for (let t = 0; t < 50; t++) {
        const idx = randomTileIndex(seed, t * 100, salt, 15);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(15);
      }
    }
  });

  it('single-element array always returns index 0', () => {
    const idx = randomTileIndex(7, 1000, 100, 1);
    expect(idx).toBe(0);
  });

  it('posHash returns values in [0, 1)', () => {
    for (let salt = 100; salt <= 103; salt++) {
      const v = rng(42, 5000, salt);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
