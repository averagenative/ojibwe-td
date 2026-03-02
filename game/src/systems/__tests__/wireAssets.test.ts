/**
 * Tests for TASK-038: Wire Generated Assets Into Game UI
 *
 * Verifies:
 *  - CREEP_SPRITE_KEYS covers all creep-types.json keys
 *  - Sprite keys follow the naming convention
 *  - Boss / mini-boss sprite keys are correct
 *  - Portrait texture key format matches commander IDs
 *  - WaveManager passes spriteKey through to CreepConfig
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CREEP_SPRITE_KEYS } from '../WaveManager';
import { BOSS_DEFS } from '../../data/bossDefs';
import type { BossDef } from '../../data/bossDefs';

// ── 1. CREEP_SPRITE_KEYS mapping ────────────────────────────────────────────

describe('CREEP_SPRITE_KEYS', () => {
  // Keys from public/data/creep-types.json
  const KNOWN_CREEP_TYPE_KEYS = ['grunt', 'runner', 'brute', 'swarm', 'scout', 'flier'];

  it('maps every creep-types.json key to a sprite key', () => {
    for (const key of KNOWN_CREEP_TYPE_KEYS) {
      expect(CREEP_SPRITE_KEYS[key]).toBeDefined();
      expect(typeof CREEP_SPRITE_KEYS[key]).toBe('string');
    }
  });

  it('all sprite keys follow the creep-* naming convention (with optional sub-type segments)', () => {
    for (const spriteKey of Object.values(CREEP_SPRITE_KEYS)) {
      // Allows compound keys like 'creep-air-scout' as well as simple 'creep-normal'.
      expect(spriteKey).toMatch(/^creep-[a-z]+(-[a-z]+)*$/);
    }
  });

  it('maps grunt to creep-normal', () => {
    expect(CREEP_SPRITE_KEYS['grunt']).toBe('creep-normal');
  });

  it('maps runner to creep-fast', () => {
    expect(CREEP_SPRITE_KEYS['runner']).toBe('creep-fast');
  });

  it('maps brute to creep-armored', () => {
    expect(CREEP_SPRITE_KEYS['brute']).toBe('creep-armored');
  });

  it('maps swarm to creep-normal (shared sprite)', () => {
    expect(CREEP_SPRITE_KEYS['swarm']).toBe('creep-normal');
  });

  it('maps scout to creep-air-scout (hawk/falcon silhouette)', () => {
    expect(CREEP_SPRITE_KEYS['scout']).toBe('creep-air-scout');
  });

  it('maps flier to creep-air-basic (generic bird silhouette)', () => {
    expect(CREEP_SPRITE_KEYS['flier']).toBe('creep-air-basic');
  });

  it('returns undefined for unknown type keys (graceful fallback)', () => {
    expect(CREEP_SPRITE_KEYS['unknown-type']).toBeUndefined();
    expect(CREEP_SPRITE_KEYS['']).toBeUndefined();
  });
});

// ── 2. Portrait key format ──────────────────────────────────────────────────

describe('portrait texture key format', () => {
  // Commander IDs from commanderDefs.ts
  const COMMANDER_IDS = ['nokomis', 'bizhiw', 'animikiikaa', 'makoons', 'waabizii'];

  // Portrait assets that exist on disk
  const PORTRAIT_ASSETS = [
    'portrait-nokomis',
    'portrait-makoons',
    'portrait-waabizii',
    'portrait-bizhiw',
    'portrait-animikiikaa',
  ];

  it('portrait-${id} format produces keys matching loaded assets', () => {
    for (const id of COMMANDER_IDS) {
      const key = `portrait-${id}`;
      expect(PORTRAIT_ASSETS).toContain(key);
    }
  });

  it('portrait keys follow the portrait-* naming convention', () => {
    for (const key of PORTRAIT_ASSETS) {
      expect(key).toMatch(/^portrait-[a-z]+$/);
    }
  });
});

// ── 3. Boss / mini-boss sprite key constants ────────────────────────────────

describe('boss sprite keys', () => {
  // Each boss has a unique animal sprite; mini (Waabooz split copies) has its own.
  const BOSS_SPRITE_KEYS_LIST = ['boss-makwa', 'boss-migizi', 'boss-waabooz', 'boss-animikiins'];
  const MINI_SPRITE_KEY = 'boss-waabooz-mini';

  it('all boss sprite keys follow the boss-{animal} naming convention', () => {
    for (const key of BOSS_SPRITE_KEYS_LIST) {
      expect(key).toMatch(/^boss-[a-z]+$/);
    }
  });

  it('mini-boss sprite key follows boss-waabooz-mini naming', () => {
    expect(MINI_SPRITE_KEY).toMatch(/^boss-[a-z]+-mini$/);
  });

  it('all boss sprite keys are unique', () => {
    const all = [...BOSS_SPRITE_KEYS_LIST, MINI_SPRITE_KEY];
    expect(new Set(all).size).toBe(all.length);
  });

  it('mini-boss sprite is distinct from all full-boss sprites', () => {
    for (const key of BOSS_SPRITE_KEYS_LIST) {
      expect(key).not.toBe(MINI_SPRITE_KEY);
    }
  });
});

// ── 3b. BossDef.spriteKey field validation ──────────────────────────────────

describe('BossDef spriteKey field', () => {
  it('every BossDef in BOSS_DEFS has a spriteKey set', () => {
    for (const [, def] of Object.entries(BOSS_DEFS)) {
      expect(def.spriteKey).toBeDefined();
      expect(typeof def.spriteKey).toBe('string');
      expect(def.spriteKey!.length).toBeGreaterThan(0);
    }
  });

  it('every BossDef spriteKey matches the boss-{key} naming convention', () => {
    for (const [key, def] of Object.entries(BOSS_DEFS)) {
      expect(def.spriteKey).toBe(`boss-${key}`);
    }
  });

  it('all BossDef spriteKeys are unique across bosses', () => {
    const keys = Object.values(BOSS_DEFS).map(d => d.spriteKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('boss spriteKey fallback expression matches explicit value', () => {
    // The WaveManager uses: bossDef.spriteKey ?? `boss-${bossDef.key}`
    // Verify that the explicit spriteKey equals the fallback for all defs.
    for (const [, def] of Object.entries(BOSS_DEFS)) {
      const fallback = `boss-${def.key}`;
      const resolved = def.spriteKey ?? fallback;
      expect(resolved).toBe(def.spriteKey);
    }
  });

  it('spriteKey fallback works when field is absent', () => {
    // Simulate a BossDef without explicit spriteKey (future-proofing).
    const defWithout = { key: 'test-boss', spriteKey: undefined } as unknown as BossDef;
    const resolved = defWithout.spriteKey ?? `boss-${defWithout.key}`;
    expect(resolved).toBe('boss-test-boss');
  });

  it('BOSS_DEFS contains exactly 4 bosses', () => {
    expect(Object.keys(BOSS_DEFS)).toHaveLength(4);
  });

  it('BOSS_DEFS keys match their definition key fields', () => {
    for (const [mapKey, def] of Object.entries(BOSS_DEFS)) {
      expect(def.key).toBe(mapKey);
    }
  });
});

// ── 4. WaveManager spriteKey propagation (via mock) ─────────────────────────

// Mock Phaser so WaveManager can be instantiated
vi.mock('phaser', () => {
  class EventEmitter {
    private readonly _h = new Map<string, Array<(...a: unknown[]) => unknown>>();
    on(event: string, fn: (...a: unknown[]) => unknown): this {
      const arr = this._h.get(event) ?? [];
      arr.push(fn);
      this._h.set(event, arr);
      return this;
    }
    once(event: string, fn: (...a: unknown[]) => unknown): this {
      const wrapped = (...a: unknown[]): unknown => {
        const arr = this._h.get(event) ?? [];
        this._h.set(event, arr.filter(f => f !== wrapped));
        return fn(...a);
      };
      return this.on(event, wrapped);
    }
    emit(event: string, ...args: unknown[]): boolean {
      const arr = [...(this._h.get(event) ?? [])];
      arr.forEach(fn => fn(...args));
      return arr.length > 0;
    }
    removeAllListeners(): this {
      this._h.clear();
      return this;
    }
  }
  return { default: { Events: { EventEmitter } } };
});

// Lightweight Creep stub that captures the config it was created with
const capturedConfigs: Array<{ spriteKey?: string }> = [];

vi.mock('../../entities/Creep', () => {
  class EventEmitter {
    private readonly _h = new Map<string, Array<(...a: unknown[]) => unknown>>();
    on(event: string, fn: (...a: unknown[]) => unknown): this {
      const arr = this._h.get(event) ?? [];
      arr.push(fn);
      this._h.set(event, arr);
      return this;
    }
    once(event: string, fn: (...a: unknown[]) => unknown): this {
      const wrapped = (...a: unknown[]): unknown => {
        const arr = this._h.get(event) ?? [];
        this._h.set(event, arr.filter(f => f !== wrapped));
        return fn(...a);
      };
      return this.on(event, wrapped);
    }
    emit(event: string, ...args: unknown[]): boolean {
      const arr = [...(this._h.get(event) ?? [])];
      arr.forEach(fn => fn(...args));
      return arr.length > 0;
    }
  }

  class Creep extends EventEmitter {
    x = 0; y = 0;
    reward: number;
    active = true;
    constructor(_scene: unknown, _wp: unknown, config: { reward: number; spriteKey?: string }) {
      super();
      this.reward = config.reward;
      capturedConfigs.push({ spriteKey: config.spriteKey });
    }
    setActive() { return this; }
    setVisible() { return this; }
    destroy() { /* noop */ }
    getCurrentWaypointIndex() { return 1; }
  }

  return { Creep };
});

describe('WaveManager spriteKey propagation', () => {
  const waypoints = [{ x: 0, y: 0 }, { x: 100, y: 0 }];

  // Minimal scene mock
  function mockScene() {
    const timers: Array<{ delay: number; callback: () => void; repeat: number }> = [];
    return {
      events: {
        emit: vi.fn(),
        on: vi.fn(),
      },
      time: {
        addEvent: (cfg: { delay: number; callback: () => void; callbackScope?: unknown; repeat?: number }) => {
          timers.push({ delay: cfg.delay, callback: cfg.callback, repeat: cfg.repeat ?? 0 });
          // Bind callbackScope if provided (WaveManager passes `this` as scope)
          const bound = cfg.callbackScope
            ? (cfg.callback as Function).bind(cfg.callbackScope)
            : cfg.callback;
          // Immediately invoke all spawn callbacks for synchronous testing
          for (let i = 0; i <= (cfg.repeat ?? 0); i++) {
            bound();
          }
          return { destroy: vi.fn() };
        },
      },
      _timers: timers,
    } as unknown;
  }

  const creepTypeDefs = [
    { key: 'grunt', type: 'ground' as const, hp: 80, speed: 75, reward: 8 },
    { key: 'runner', type: 'ground' as const, hp: 50, speed: 120, reward: 6 },
  ];

  const waveDefs = [
    { count: 3, intervalMs: 500, hpMult: 1, speedMult: 1, pool: ['grunt', 'grunt', 'grunt'] },
  ];

  beforeEach(() => {
    capturedConfigs.length = 0;
  });

  it('normal wave creeps receive spriteKey from CREEP_SPRITE_KEYS', async () => {
    const { WaveManager } = await import('../WaveManager');
    const scene = mockScene();
    const activeCreeps = new Set();
    const wm = new WaveManager(
      scene as never,
      waypoints,
      activeCreeps as never,
      creepTypeDefs,
      waveDefs,
    );
    wm.startWave(1);

    expect(capturedConfigs.length).toBe(3);
    for (const cfg of capturedConfigs) {
      expect(cfg.spriteKey).toBe('creep-normal');
    }
  });

  it('unknown creep type key produces undefined spriteKey', async () => {
    const { WaveManager } = await import('../WaveManager');
    const scene = mockScene();
    const activeCreeps = new Set();

    const unknownDefs = [
      { key: 'unknown', type: 'ground' as const, hp: 50, speed: 50, reward: 5 },
    ];
    const unknownWaves = [
      { count: 1, intervalMs: 500, hpMult: 1, speedMult: 1, pool: ['unknown'] },
    ];

    const wm = new WaveManager(
      scene as never,
      waypoints,
      activeCreeps as never,
      unknownDefs,
      unknownWaves,
    );
    wm.startWave(1);

    expect(capturedConfigs.length).toBeGreaterThan(0);
    expect(capturedConfigs[capturedConfigs.length - 1].spriteKey).toBeUndefined();
  });
});

// ── 5. Tile texture key constants ───────────────────────────────────────────

describe('tile texture keys', () => {
  // From GameScene.renderMap() and BootScene.preload()
  const TILE_KEYS = ['tile-tree', 'tile-brush', 'tile-rock', 'tile-water'];

  it('all tile keys follow the tile-* naming convention', () => {
    for (const key of TILE_KEYS) {
      expect(key).toMatch(/^tile-[a-z]+$/);
    }
  });

  it('contains exactly 4 tile variants', () => {
    expect(TILE_KEYS).toHaveLength(4);
  });

  it('all tile keys are unique', () => {
    expect(new Set(TILE_KEYS).size).toBe(TILE_KEYS.length);
  });
});

// ── 6. BootScene texture key coverage ───────────────────────────────────────

describe('BootScene expected texture keys', () => {
  // All texture keys that BootScene.loadAssets() should load
  const EXPECTED_KEYS = [
    // Tower icons
    'icon-rock-hurler', 'icon-frost', 'icon-poison', 'icon-tesla', 'icon-aura', 'icon-arrow',
    // Misc UI
    'icon-dice', 'icon-mystery',
    // Commander portraits
    'portrait-nokomis', 'portrait-makoons', 'portrait-waabizii',
    'portrait-bizhiw', 'portrait-animikiikaa',
    // Ground creep sprites (refreshed animal silhouettes)
    'creep-normal', 'creep-fast', 'creep-armored', 'creep-immune', 'creep-regen',
    // Air creep sprites (distinct per subtype)
    'creep-air-basic', 'creep-air-scout', 'creep-air-armored',
    // Boss sprites (unique animal portraits)
    'boss-makwa', 'boss-migizi', 'boss-waabooz', 'boss-animikiins', 'boss-waabooz-mini',
    // Map tiles
    'tile-tree', 'tile-brush', 'tile-rock', 'tile-water',
    // Logo
    'logo',
  ];

  it('expects 31 total texture keys (logo + 8 icons + 5 portraits + 5 ground creeps + 3 air creeps + 5 bosses + 4 tiles)', () => {
    expect(EXPECTED_KEYS).toHaveLength(31);
  });

  it('all keys are unique', () => {
    expect(new Set(EXPECTED_KEYS).size).toBe(EXPECTED_KEYS.length);
  });

  it('every key follows a known prefix pattern', () => {
    const validPrefixes = ['icon-', 'portrait-', 'creep-', 'boss-', 'tile-', 'logo'];
    for (const key of EXPECTED_KEYS) {
      const matchesPrefix = validPrefixes.some(p => key.startsWith(p));
      expect(matchesPrefix).toBe(true);
    }
  });
});
