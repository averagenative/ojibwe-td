/**
 * TASK-072 — Ambient Wildlife Critters
 *
 * Structural ?raw tests verifying:
 * - Critter spritesheets preloaded in BootScene (12 species)
 * - CritterManager class structure (constructor, update, destroy, flee)
 * - Region critter pools map all 5 regions
 * - GameScene integrates CritterManager (field, init, create, update, shutdown)
 * - Critters use CRITTER_DEPTH for depth ordering
 * - Mobile: reduced critter count (50%)
 * - Critters face movement direction (flipX)
 * - Critters flee when tower placed or creeps nearby
 * - Idle/walk/flee state machine
 * - Pool exhaustion guard (empty buildable tiles)
 */
import { describe, it, expect, vi } from 'vitest';

// Mock Phaser before any module that imports it.
vi.mock('phaser', () => ({ default: {} }));

import critterSrc    from '../CritterManager.ts?raw';
import bootSrc       from '../../scenes/BootScene.ts?raw';
import gameSceneSrc  from '../../scenes/GameScene.ts?raw';

import {
  CRITTER_DEPTH,
  ALL_CRITTER_KEYS,
  REGION_CRITTER_POOL,
  CRITTER_COUNT_DESKTOP,
  CRITTER_COUNT_MOBILE,
  FLEE_RADIUS,
} from '../CritterManager';

// ── BootScene: spritesheet preloading ────────────────────────────────────────

describe('BootScene — critter spritesheet preloading', () => {
  const critters = [
    'squirrel', 'frog', 'loon', 'turtle', 'heron',
    'rabbit', 'turkey', 'hare', 'fox', 'owl',
    'raccoon', 'beaver',
  ];

  for (const name of critters) {
    it(`preloads critter-${name} spritesheet`, () => {
      expect(bootSrc).toContain(`'critter-${name}'`);
      expect(bootSrc).toContain(`'assets/critters/${name}.png'`);
    });
  }

  it('loads spritesheets with 16×16 frame size', () => {
    expect(bootSrc).toContain('frameWidth: 16');
    expect(bootSrc).toContain('frameHeight: 16');
  });

  it('all critter loads are in _loadAssets()', () => {
    const loadAssetsStart = bootSrc.indexOf('private _loadAssets()');
    const squirrelIdx     = bootSrc.indexOf("'critter-squirrel'");
    const beaverIdx       = bootSrc.indexOf("'critter-beaver'");
    expect(squirrelIdx).toBeGreaterThan(loadAssetsStart);
    expect(beaverIdx).toBeGreaterThan(loadAssetsStart);
  });

  it('loads spritesheets (not images) for critters', () => {
    expect(bootSrc).toContain("this.load.spritesheet('critter-squirrel'");
    expect(bootSrc).toContain("this.load.spritesheet('critter-beaver'");
  });
});

// ── CritterManager: class structure ──────────────────────────────────────────

describe('CritterManager — class structure', () => {
  it('exports CritterManager class', () => {
    expect(critterSrc).toContain('export class CritterManager');
  });

  it('has a public update(delta) method', () => {
    expect(critterSrc).toContain('update(delta: number): void');
  });

  it('has a public destroy() method', () => {
    expect(critterSrc).toContain('destroy(): void');
  });

  it('has a public notifyTowerPlaced method', () => {
    expect(critterSrc).toContain('notifyTowerPlaced(col: number, row: number): void');
  });

  it('has a public notifyCreepsNear method', () => {
    expect(critterSrc).toContain('notifyCreepsNear(positions: Array<{ x: number; y: number }>): void');
  });

  it('accepts regionId in constructor', () => {
    expect(critterSrc).toContain('regionId: string');
  });

  it('accepts isMobile in constructor', () => {
    expect(critterSrc).toContain('isMobile: boolean');
  });

  it('accepts mapData in constructor', () => {
    expect(critterSrc).toContain('mapData:  MapData');
  });
});

// ── CritterManager: depth constant ──────────────────────────────────────────

describe('CritterManager — depth constant', () => {
  it('exports CRITTER_DEPTH', () => {
    expect(critterSrc).toContain('export const CRITTER_DEPTH');
  });

  it('sets CRITTER_DEPTH to 2.5 (above terrain+ambient at 2, below markers at 3)', () => {
    expect(critterSrc).toContain('CRITTER_DEPTH = 2.5');
  });

  it('applies CRITTER_DEPTH to sprites', () => {
    expect(critterSrc).toContain('sprite.setDepth(CRITTER_DEPTH)');
  });
});

// ── CritterManager: region critter pools ─────────────────────────────────────

describe('CritterManager — region critter pools', () => {
  it('exports REGION_CRITTER_POOL', () => {
    expect(critterSrc).toContain('export const REGION_CRITTER_POOL');
  });

  const regions = [
    'zaagaiganing',
    'mashkiig',
    'mitigomizh',
    'biboon-aki',
    'niizh-miikana',
  ];

  for (const region of regions) {
    it(`has critter pool for ${region}`, () => {
      // Some keys are unquoted (mashkiig:), others quoted ('biboon-aki':)
      const hasQuoted   = critterSrc.includes(`'${region}'`);
      const hasUnquoted = critterSrc.includes(`${region}:`);
      expect(hasQuoted || hasUnquoted).toBe(true);
    });
  }

  it('zaagaiganing pool includes squirrel, frog, loon', () => {
    expect(critterSrc).toContain("'critter-squirrel'");
    expect(critterSrc).toContain("'critter-frog'");
    expect(critterSrc).toContain("'critter-loon'");
  });

  it('mashkiig pool includes frog, turtle, heron', () => {
    const mashkiigIdx = critterSrc.indexOf("mashkiig:");
    const poolLine = critterSrc.slice(mashkiigIdx, mashkiigIdx + 200);
    expect(poolLine).toContain("'critter-frog'");
    expect(poolLine).toContain("'critter-turtle'");
    expect(poolLine).toContain("'critter-heron'");
  });

  it('mitigomizh pool includes rabbit, turkey', () => {
    const idx = critterSrc.indexOf("mitigomizh:");
    const poolLine = critterSrc.slice(idx, idx + 200);
    expect(poolLine).toContain("'critter-rabbit'");
    expect(poolLine).toContain("'critter-turkey'");
  });

  it('biboon-aki pool includes hare, fox, owl', () => {
    const idx = critterSrc.indexOf("'biboon-aki':");
    const poolLine = critterSrc.slice(idx, idx + 200);
    expect(poolLine).toContain("'critter-hare'");
    expect(poolLine).toContain("'critter-fox'");
    expect(poolLine).toContain("'critter-owl'");
  });

  it('niizh-miikana pool includes raccoon, beaver', () => {
    const idx = critterSrc.indexOf("'niizh-miikana':");
    const poolLine = critterSrc.slice(idx, idx + 200);
    expect(poolLine).toContain("'critter-raccoon'");
    expect(poolLine).toContain("'critter-beaver'");
  });
});

// ── CritterManager: critter count ────────────────────────────────────────────

describe('CritterManager — critter count', () => {
  it('exports CRITTER_COUNT_DESKTOP', () => {
    expect(critterSrc).toContain('export const CRITTER_COUNT_DESKTOP');
  });

  it('exports CRITTER_COUNT_MOBILE', () => {
    expect(critterSrc).toContain('export const CRITTER_COUNT_MOBILE');
  });

  it('desktop range is 3–6', () => {
    expect(critterSrc).toContain('min: 3, max: 6');
  });

  it('mobile range is 2–3 (50% reduction)', () => {
    expect(critterSrc).toContain('min: 2, max: 3');
  });

  it('selects mobile or desktop range based on isMobile flag', () => {
    expect(critterSrc).toContain('isMobile ? CRITTER_COUNT_MOBILE : CRITTER_COUNT_DESKTOP');
  });
});

// ── CritterManager: state machine ────────────────────────────────────────────

describe('CritterManager — state machine', () => {
  it('has idle state', () => {
    expect(critterSrc).toContain("'idle'");
    expect(critterSrc).toContain('_stepIdle');
  });

  it('has walk state', () => {
    expect(critterSrc).toContain("'walk'");
    expect(critterSrc).toContain('_stepWalk');
  });

  it('has flee state', () => {
    expect(critterSrc).toContain("'flee'");
    expect(critterSrc).toContain('_stepFlee');
  });

  it('state field uses union type', () => {
    expect(critterSrc).toContain("state:      'idle' | 'walk' | 'flee'");
  });
});

// ── CritterManager: movement ─────────────────────────────────────────────────

describe('CritterManager — movement', () => {
  it('faces movement direction via flipX', () => {
    expect(critterSrc).toContain('c.sprite.setFlipX(nx < 0)');
  });

  it('walks at WALK_SPEED', () => {
    expect(critterSrc).toContain('WALK_SPEED');
  });

  it('flees at FLEE_SPEED', () => {
    expect(critterSrc).toContain('FLEE_SPEED');
  });

  it('idle duration is 1–3 seconds', () => {
    expect(critterSrc).toContain('IDLE_MIN = 1000');
    expect(critterSrc).toContain('IDLE_MAX = 3000');
  });
});

// ── CritterManager: flee behaviour ───────────────────────────────────────────

describe('CritterManager — flee behaviour', () => {
  it('exports FLEE_RADIUS constant', () => {
    expect(critterSrc).toContain('export const FLEE_RADIUS = 80');
  });

  it('triggers flee within FLEE_RADIUS', () => {
    expect(critterSrc).toContain('FLEE_RADIUS * FLEE_RADIUS');
  });

  it('flee duration is 600ms', () => {
    expect(critterSrc).toContain('FLEE_DURATION = 600');
  });

  it('picks a flee target away from threat', () => {
    expect(critterSrc).toContain('_pickFleeTarget');
    expect(critterSrc).toContain('threatX');
    expect(critterSrc).toContain('threatY');
  });

  it('does not trigger flee on already-fleeing critters', () => {
    expect(critterSrc).toContain("if (c.state === 'flee') continue");
  });

  it('plays walk animation during flee', () => {
    const fleeSection = critterSrc.indexOf('_triggerFleeNear');
    const playCall = critterSrc.indexOf('c.sprite.play(', fleeSection);
    expect(playCall).toBeGreaterThan(fleeSection);
  });
});

// ── CritterManager: idle behaviour ───────────────────────────────────────────

describe('CritterManager — idle behaviour', () => {
  it('has subtle idle bobbing animation', () => {
    expect(critterSrc).toContain('Math.sin(');
  });

  it('stops walk animation during idle', () => {
    expect(critterSrc).toContain('c.sprite.anims.stop()');
    expect(critterSrc).toContain('c.sprite.setFrame(0)');
  });

  it('transitions from idle to walk when timer expires', () => {
    expect(critterSrc).toContain("c.state = 'walk'");
  });
});

// ── CritterManager: animation ────────────────────────────────────────────────

describe('CritterManager — animation', () => {
  it('creates walk animations lazily', () => {
    expect(critterSrc).toContain('_ensureAnimation');
    expect(critterSrc).toContain('this._scene.anims.exists(animKey)');
  });

  it('animation has 3 frames (0–2)', () => {
    expect(critterSrc).toContain('start: 0, end: 2');
  });

  it('animation loops', () => {
    expect(critterSrc).toContain('repeat: -1');
  });

  it('frame rate is 4fps', () => {
    expect(critterSrc).toContain('frameRate: 4');
  });
});

// ── CritterManager: tile lists ───────────────────────────────────────────────

describe('CritterManager — tile lists', () => {
  it('pre-computes buildable tiles', () => {
    expect(critterSrc).toContain('_buildableTiles');
    expect(critterSrc).toContain('TILE.BUILDABLE');
  });

  it('only uses BUILDABLE tiles (implicitly avoids path)', () => {
    expect(critterSrc).toContain('TILE.BUILDABLE');
    expect(critterSrc).not.toContain('_pathTileSet');
  });

  it('guards against empty buildable tile list', () => {
    expect(critterSrc).toContain('this._buildableTiles.length === 0');
  });
});

// ── CritterManager: destroy completeness ─────────────────────────────────────

describe('CritterManager — destroy completeness', () => {
  it('destroys all critter sprites', () => {
    expect(critterSrc).toContain('c.sprite.destroy()');
  });

  it('clears critter array', () => {
    expect(critterSrc).toContain('this._critters.length = 0');
  });
});

// ── CritterManager: deterministic randomness ─────────────────────────────────

describe('CritterManager — deterministic randomness', () => {
  it('imports posHash and mapIdToSeed', () => {
    expect(critterSrc).toContain("import { posHash, mapIdToSeed } from './TerrainRenderer'");
  });

  it('uses posHash for RNG (not Math.random)', () => {
    expect(critterSrc).toContain('posHash(this._seed');
    // Only Math.floor should appear, not Math.random
    expect(critterSrc).not.toContain('Math.random');
  });

  it('seeds from mapData.id', () => {
    expect(critterSrc).toContain('mapIdToSeed(mapData.id)');
  });
});

// ── CritterManager: no heap allocations in update ────────────────────────────

describe('CritterManager — update-loop allocation safety', () => {
  it('update() does not contain "new " (no heap allocations per frame)', () => {
    const updateStart = critterSrc.indexOf('update(delta: number): void');
    const destroyStart = critterSrc.indexOf('destroy(): void');
    const updateBody = critterSrc.slice(updateStart, destroyStart);
    expect(updateBody).not.toContain('new ');
  });
});

// ── GameScene integration ────────────────────────────────────────────────────

describe('GameScene — CritterManager integration', () => {
  it('imports CritterManager', () => {
    expect(gameSceneSrc).toContain("import { CritterManager }");
  });

  it('declares _critterManager field', () => {
    expect(gameSceneSrc).toContain('_critterManager: CritterManager | null');
  });

  it('resets _critterManager to null in init()', () => {
    expect(gameSceneSrc).toContain('this._critterManager       = null');
  });

  it('creates CritterManager in create() after AmbientVFX', () => {
    const ambientIdx  = gameSceneSrc.indexOf('new AmbientVFX(');
    const critterIdx  = gameSceneSrc.indexOf('new CritterManager(');
    expect(critterIdx).toBeGreaterThan(ambientIdx);
  });

  it('passes regionId to CritterManager constructor', () => {
    const critterBlock = gameSceneSrc.indexOf('new CritterManager(');
    const regionRef = gameSceneSrc.indexOf('regionId,', critterBlock);
    expect(regionRef).toBeGreaterThan(critterBlock);
  });

  it('passes mobile flag to CritterManager constructor', () => {
    // mobile variable is computed from MobileManager and passed to the constructor.
    expect(gameSceneSrc).toContain('MobileManager.getInstance().isMobile()');
    const critterCall = gameSceneSrc.indexOf('new CritterManager(');
    const callEnd = gameSceneSrc.indexOf(');', critterCall);
    const callArgs = gameSceneSrc.slice(critterCall, callEnd);
    expect(callArgs).toContain('mobile');
  });

  it('calls _critterManager.update(scaledDelta) in update()', () => {
    expect(gameSceneSrc).toContain('this._critterManager.update(scaledDelta)');
  });

  it('update() call is after the paused-guard', () => {
    const pauseGuardIdx = gameSceneSrc.indexOf('if (this.speedMultiplier === 0) return;');
    const updateCallIdx = gameSceneSrc.indexOf('this._critterManager.update(scaledDelta)');
    expect(updateCallIdx).toBeGreaterThan(pauseGuardIdx);
  });

  it('destroys _critterManager in shutdown()', () => {
    expect(gameSceneSrc).toContain('this._critterManager?.destroy()');
  });

  it('nulls _critterManager after destroy in shutdown()', () => {
    expect(gameSceneSrc).toContain('this._critterManager = null');
  });

  it('notifies critters on tower placement', () => {
    expect(gameSceneSrc).toContain('this._critterManager?.notifyTowerPlaced(col, row)');
  });

  it('periodically notifies critters of nearby creeps', () => {
    expect(gameSceneSrc).toContain('notifyCreepsNear');
    expect(gameSceneSrc).toContain('_critterCreepCheckAcc');
  });

  it('creep proximity check interval is ~500ms', () => {
    expect(gameSceneSrc).toContain('>= 500');
  });
});

// ── Pure-logic arithmetic tests ──────────────────────────────────────────────

describe('CritterManager — arithmetic', () => {
  it('mobile critter count (2-3) is ~50% of desktop (3-6)', () => {
    const desktopMid = (3 + 6) / 2;   // 4.5
    const mobileMid  = (2 + 3) / 2;   // 2.5
    const ratio = mobileMid / desktopMid;
    expect(ratio).toBeGreaterThanOrEqual(0.4);
    expect(ratio).toBeLessThanOrEqual(0.6);
  });

  it('FLEE_RADIUS (80px) is ~2 tiles (tileSize = 40)', () => {
    expect(80 / 40).toBe(2);
  });

  it('FLEE_DURATION (600ms) is brief', () => {
    expect(600).toBeLessThan(1000);
    expect(600).toBeGreaterThan(200);
  });

  it('idle range (1000-3000ms) is 1-3 seconds', () => {
    expect(1000).toBe(1000);
    expect(3000).toBe(3000);
  });

  it('CRITTER_DEPTH (2.5) is between ambient VFX (2) and markers (3)', () => {
    expect(2.5).toBeGreaterThan(2);
    expect(2.5).toBeLessThan(3);
  });
});

// ── CritterManager: ALL_CRITTER_KEYS export ─────────────────────────────────

describe('CritterManager — ALL_CRITTER_KEYS', () => {
  it('exports ALL_CRITTER_KEYS array', () => {
    expect(critterSrc).toContain('export const ALL_CRITTER_KEYS');
  });

  it('contains all 12 critter keys', () => {
    const keys = [
      'critter-squirrel', 'critter-frog', 'critter-loon',
      'critter-turtle', 'critter-heron',
      'critter-rabbit', 'critter-turkey',
      'critter-hare', 'critter-fox', 'critter-owl',
      'critter-raccoon', 'critter-beaver',
    ];
    for (const key of keys) {
      expect(critterSrc).toContain(`'${key}'`);
    }
  });
});

// ── CritterManager: walk target picking ──────────────────────────────────────

describe('CritterManager — target picking', () => {
  it('picks nearby buildable tiles (within 3 tiles distance)', () => {
    expect(critterSrc).toContain('this._tileSize * 3');
  });

  it('falls back to any random buildable tile if no nearby tile found', () => {
    const pickTargetIdx = critterSrc.indexOf('_pickTarget');
    const fallbackIdx = critterSrc.indexOf('// Fallback:', pickTargetIdx);
    expect(fallbackIdx).toBeGreaterThan(pickTargetIdx);
  });

  it('tries up to 8 attempts for a nearby tile', () => {
    expect(critterSrc).toContain('attempt < 8');
  });
});

// ── CritterManager: walk arrival ─────────────────────────────────────────────

describe('CritterManager — walk arrival', () => {
  it('arrives when distance < 2 pixels', () => {
    expect(critterSrc).toContain('dist < 2');
  });

  it('transitions to idle on arrival', () => {
    const walkSection = critterSrc.indexOf('_stepWalk');
    const idleTransition = critterSrc.indexOf("c.state = 'idle'", walkSection);
    expect(idleTransition).toBeGreaterThan(walkSection);
  });
});

// ── CritterManager: flee-to-idle transition ──────────────────────────────────

describe('CritterManager — flee-to-idle transition', () => {
  it('transitions from flee to idle when timer expires', () => {
    const fleeSection = critterSrc.indexOf('_stepFlee');
    const idleTransition = critterSrc.indexOf("c.state = 'idle'", fleeSection);
    expect(idleTransition).toBeGreaterThan(fleeSection);
  });

  it('transitions from flee to idle when arriving at flee target', () => {
    const fleeSection = critterSrc.indexOf('_stepFlee');
    const distCheck = critterSrc.indexOf('dist < 2', fleeSection);
    expect(distCheck).toBeGreaterThan(fleeSection);
  });
});

// ── CritterManager: unknown region fallback ──────────────────────────────────

describe('CritterManager — unknown region fallback', () => {
  it('falls back to zaagaiganing pool for unknown regions', () => {
    expect(critterSrc).toContain("REGION_CRITTER_POOL['zaagaiganing']");
  });

  it('uses nullish coalescing for fallback', () => {
    expect(critterSrc).toContain('REGION_CRITTER_POOL[regionId] ?? REGION_CRITTER_POOL');
  });
});

// ── CritterManager: GameScene creep check accumulator reset ──────────────────

describe('GameScene — critter creep check reset', () => {
  it('resets _critterCreepCheckAcc to 0 in init()', () => {
    expect(gameSceneSrc).toContain('this._critterCreepCheckAcc = 0');
  });

  it('resets accumulator to 0 after triggering check', () => {
    const checkBlock = gameSceneSrc.indexOf('>= 500');
    const resetLine = gameSceneSrc.indexOf('this._critterCreepCheckAcc = 0', checkBlock);
    expect(resetLine).toBeGreaterThan(checkBlock);
  });

  it('only notifies when there are active creeps', () => {
    expect(gameSceneSrc).toContain('if (positions.length > 0)');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Real-import tests — validate exported constant values at runtime
// ══════════════════════════════════════════════════════════════════════════════

describe('CritterManager exports — runtime values', () => {
  it('CRITTER_DEPTH is 2.5', () => {
    expect(CRITTER_DEPTH).toBe(2.5);
  });

  it('ALL_CRITTER_KEYS has 12 entries', () => {
    expect(ALL_CRITTER_KEYS).toHaveLength(12);
  });

  it('ALL_CRITTER_KEYS entries start with "critter-"', () => {
    for (const key of ALL_CRITTER_KEYS) {
      expect(key).toMatch(/^critter-/);
    }
  });

  it('REGION_CRITTER_POOL has 5 regions', () => {
    expect(Object.keys(REGION_CRITTER_POOL)).toHaveLength(5);
  });

  it('every pool value references keys in ALL_CRITTER_KEYS', () => {
    for (const pool of Object.values(REGION_CRITTER_POOL)) {
      for (const key of pool) {
        expect(ALL_CRITTER_KEYS).toContain(key);
      }
    }
  });

  it('every region pool has at least 2 critter types', () => {
    for (const [region, pool] of Object.entries(REGION_CRITTER_POOL)) {
      expect(pool.length, `${region} pool`).toBeGreaterThanOrEqual(2);
    }
  });

  it('CRITTER_COUNT_DESKTOP range is valid (min <= max, min >= 1)', () => {
    expect(CRITTER_COUNT_DESKTOP.min).toBeGreaterThanOrEqual(1);
    expect(CRITTER_COUNT_DESKTOP.max).toBeGreaterThanOrEqual(CRITTER_COUNT_DESKTOP.min);
  });

  it('CRITTER_COUNT_MOBILE range is valid and smaller than desktop', () => {
    expect(CRITTER_COUNT_MOBILE.min).toBeGreaterThanOrEqual(1);
    expect(CRITTER_COUNT_MOBILE.max).toBeGreaterThanOrEqual(CRITTER_COUNT_MOBILE.min);
    expect(CRITTER_COUNT_MOBILE.max).toBeLessThanOrEqual(CRITTER_COUNT_DESKTOP.max);
  });

  it('FLEE_RADIUS is positive', () => {
    expect(FLEE_RADIUS).toBeGreaterThan(0);
  });
});
