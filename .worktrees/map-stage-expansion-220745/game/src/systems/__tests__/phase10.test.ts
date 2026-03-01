/**
 * Phase 10 — Second Map: unit tests for unlockDefs, WaveManager.getWaveInfo(),
 * and map data integrity.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  UNLOCK_NODES,
  LOCKED_MAP_IDS,
  getMapUnlockNode,
} from '../../meta/unlockDefs';

// ── unlockDefs ──────────────────────────────────────────────────────────────

describe('unlockDefs', () => {
  it('UNLOCK_NODES has at least 1 node', () => {
    expect(UNLOCK_NODES.length).toBeGreaterThanOrEqual(1);
  });

  it('all node IDs are unique', () => {
    const ids = UNLOCK_NODES.map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all nodes have required fields', () => {
    for (const node of UNLOCK_NODES) {
      expect(typeof node.id).toBe('string');
      expect(node.id.length).toBeGreaterThan(0);
      expect(typeof node.label).toBe('string');
      expect(typeof node.description).toBe('string');
      expect(typeof node.cost).toBe('number');
      expect(node.cost).toBeGreaterThan(0);
      expect(Array.isArray(node.prereqs)).toBe(true);
      expect(node.effect).toBeDefined();
    }
  });

  it('unlock-map-02 exists with correct cost', () => {
    const node = UNLOCK_NODES.find(n => n.id === 'unlock-map-02');
    expect(node).toBeDefined();
    expect(node!.cost).toBe(300);
    expect(node!.effect).toEqual({ type: 'map', mapId: 'map-02' });
  });
});

describe('LOCKED_MAP_IDS', () => {
  it('contains map-02', () => {
    expect(LOCKED_MAP_IDS).toContain('map-02');
  });

  it('does not contain map-01 (always unlocked)', () => {
    expect(LOCKED_MAP_IDS).not.toContain('map-01');
  });

  it('derives from UNLOCK_NODES with map-type effects', () => {
    const expected = UNLOCK_NODES
      .filter(n => n.effect.type === 'map')
      .map(n => (n.effect as { type: 'map'; mapId: string }).mapId);
    expect(LOCKED_MAP_IDS).toEqual(expected);
  });
});

describe('getMapUnlockNode', () => {
  it('returns the unlock node for map-02', () => {
    const node = getMapUnlockNode('map-02');
    expect(node).toBeDefined();
    expect(node!.id).toBe('unlock-map-02');
  });

  it('returns undefined for map-01 (no unlock required)', () => {
    expect(getMapUnlockNode('map-01')).toBeUndefined();
  });

  it('returns undefined for nonexistent map', () => {
    expect(getMapUnlockNode('map-99')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getMapUnlockNode('')).toBeUndefined();
  });
});

// ── WaveManager.getWaveInfo ──────────────────────────────────────────────────

// Mock Phaser exactly as WaveManager.e2e.test.ts does.
vi.mock('phaser', () => {
  class EventEmitter {
    private readonly _h = new Map<string, Array<(...a: unknown[]) => unknown>>();
    on(event: string, fn: (...a: unknown[]) => unknown): this {
      const arr = this._h.get(event) ?? [];
      arr.push(fn);
      this._h.set(event, arr);
      return this;
    }
    emit(event: string, ...args: unknown[]): boolean {
      const arr = [...(this._h.get(event) ?? [])];
      arr.forEach(fn => fn(...args));
      return arr.length > 0;
    }
    removeAllListeners(event?: string): this {
      if (event !== undefined) this._h.delete(event);
      else this._h.clear();
      return this;
    }
  }
  return { default: { Events: { EventEmitter } } };
});

vi.mock('../../entities/Creep', () => {
  class MockCreep {
    x = 0; y = 0; active = true; readonly reward: number;
    private readonly _ls = new Map<string, Array<(...a: unknown[]) => void>>();
    constructor(_s: unknown, _w: unknown, cfg: { reward?: number } = {}) {
      this.reward = cfg.reward ?? 10;
    }
    once(e: string, fn: (...a: unknown[]) => void): this {
      const arr = this._ls.get(e) ?? [];
      arr.push(fn);
      this._ls.set(e, arr);
      return this;
    }
    emit(e: string, ...args: unknown[]): boolean {
      const arr = this._ls.get(e) ?? [];
      this._ls.delete(e);
      arr.forEach(fn => fn(...args));
      return arr.length > 0;
    }
    setActive(): this { return this; }
    setVisible(): this { return this; }
    destroy(): void {}
    getCurrentWaypointIndex(): number { return 1; }
  }
  return { Creep: MockCreep };
});

import { WaveManager } from '../WaveManager';

function makeScene() {
  class Emitter {
    private readonly _h = new Map<string, Array<(...a: unknown[]) => void>>();
    on(e: string, fn: (...a: unknown[]) => void): void {
      const arr = this._h.get(e) ?? [];
      arr.push(fn);
      this._h.set(e, arr);
    }
    emit(e: string, ...args: unknown[]): void {
      (this._h.get(e) ?? []).forEach(fn => fn(...args));
    }
  }
  type TimerCfg = { callback: () => void; callbackScope?: unknown; repeat?: number; delay?: number };
  const events = new Emitter();
  return {
    events,
    time: {
      addEvent(cfg: TimerCfg) {
        const count = (cfg.repeat ?? 0) + 1;
        for (let i = 0; i < count; i++) cfg.callback.call(cfg.callbackScope ?? scene);
        return { destroy(): void {} };
      },
    },
  } as unknown as import('phaser').Scene;
}

const WAYPOINTS = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
const CREEP_DEFS = [
  { key: 'grunt',  type: 'ground' as const, hp: 100, speed: 80, reward: 5 },
  { key: 'runner', type: 'ground' as const, hp: 60,  speed: 120, reward: 8 },
];

const WAVE_DEFS = [
  { count: 10, intervalMs: 1, hpMult: 1, speedMult: 1, pool: ['grunt'] },
  { count: 8,  intervalMs: 1, hpMult: 1, speedMult: 1, pool: ['grunt', 'runner'] },
  { count: 5,  intervalMs: 1, hpMult: 1, speedMult: 1, pool: ['runner'] },
];

let scene: import('phaser').Scene;

describe('WaveManager.getWaveInfo', () => {
  let wm: WaveManager;

  beforeEach(() => {
    scene = makeScene();
    const creeps = new Set();
    wm = new WaveManager(
      scene, WAYPOINTS,
      creeps as unknown as Set<import('../../entities/Creep').Creep>,
      CREEP_DEFS, WAVE_DEFS,
    );
  });

  it('returns correct info for wave 1 (single type)', () => {
    const info = wm.getWaveInfo(1);
    expect(info).not.toBeNull();
    expect(info!.count).toBe(10);
    expect(info!.types).toEqual(['grunt']);
    expect(info!.totalRewardGold).toBe(50); // 10 × 5
  });

  it('returns correct info for wave 2 (mixed pool)', () => {
    const info = wm.getWaveInfo(2);
    expect(info).not.toBeNull();
    expect(info!.count).toBe(8);
    expect(info!.types).toContain('grunt');
    expect(info!.types).toContain('runner');
    // Average reward: pool is ['grunt', 'runner'] → (5+8)/2 = 6.5
    // totalRewardGold = round(6.5 * 8) = 52
    expect(info!.totalRewardGold).toBe(52);
  });

  it('returns correct info for wave 3 (single type, different)', () => {
    const info = wm.getWaveInfo(3);
    expect(info).not.toBeNull();
    expect(info!.count).toBe(5);
    expect(info!.types).toEqual(['runner']);
    expect(info!.totalRewardGold).toBe(40); // 5 × 8
  });

  it('returns null for out-of-range wave number', () => {
    expect(wm.getWaveInfo(0)).toBeNull();
    expect(wm.getWaveInfo(4)).toBeNull();
    expect(wm.getWaveInfo(-1)).toBeNull();
    expect(wm.getWaveInfo(999)).toBeNull();
  });

  it('types array contains unique entries only', () => {
    const info = wm.getWaveInfo(2);
    expect(info).not.toBeNull();
    const uniqueTypes = new Set(info!.types);
    expect(uniqueTypes.size).toBe(info!.types.length);
  });
});

// ── Map JSON validation ─────────────────────────────────────────────────────
// Vitest resolves JSON imports via Vite's built-in JSON support.

import map01 from '../../../public/data/maps/map-01.json';
import map02 from '../../../public/data/maps/map-02.json';

type MapJson = {
  id: string; cols: number; rows: number;
  tiles: number[][]; waypoints: Array<{ col: number; row: number }>;
  startingLives: number; startingGold: number;
};

describe('map JSON files integrity', () => {
  const m1 = map01 as MapJson;
  const m2 = map02 as MapJson;

  it('map-01 has valid structure', () => {
    expect(m1.id).toBe('map-01');
    expect(m1.cols).toBe(32);
    expect(m1.rows).toBe(18);
    expect(m1.tiles).toHaveLength(18);
    expect(m1.tiles[0]).toHaveLength(32);
    expect(m1.waypoints.length).toBeGreaterThanOrEqual(2);
    expect(m1.startingLives).toBeGreaterThan(0);
    expect(m1.startingGold).toBeGreaterThan(0);
  });

  it('map-02 has valid structure', () => {
    expect(m2.id).toBe('map-02');
    expect(m2.cols).toBe(32);
    expect(m2.rows).toBe(18);
    expect(m2.tiles).toHaveLength(18);
    expect(m2.tiles[0]).toHaveLength(32);
    expect(m2.waypoints.length).toBeGreaterThanOrEqual(2);
    expect(m2.startingLives).toBeGreaterThan(0);
    expect(m2.startingGold).toBeGreaterThan(0);
  });

  it('map-02 has a longer path than map-01 (more waypoints)', () => {
    expect(m2.waypoints.length).toBeGreaterThan(m1.waypoints.length);
  });

  it('map-02 waypoints trace the tile grid path correctly', () => {
    for (const wp of m2.waypoints) {
      if (wp.col >= m2.cols) continue; // exit point is off-grid by design
      expect(m2.tiles[wp.row][wp.col]).toBe(1);
    }
  });
});
