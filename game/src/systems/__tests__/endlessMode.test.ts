/**
 * Endless Mode — unit tests for:
 *   • WaveManager.generateEndlessWave() scaling formula
 *   • WaveManager.enableEndless() + startWave() integration
 *   • SaveManager endless-record persistence
 *
 * Phaser is mocked identically to WaveManager.e2e.test.ts.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import type Phaser from 'phaser';

// ── Phaser mock ────────────────────────────────────────────────────────────

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
    off(event: string, fn: (...a: unknown[]) => unknown): this {
      const arr = this._h.get(event) ?? [];
      this._h.set(event, arr.filter(f => f !== fn));
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

// ── Creep mock ─────────────────────────────────────────────────────────────

interface MockCreepLike {
  x: number;
  y: number;
  active: boolean;
  readonly reward: number;
  once(event: string, fn: (...a: unknown[]) => void): MockCreepLike;
  emit(event: string, ...args: unknown[]): boolean;
  setActive(v: boolean): MockCreepLike;
  setVisible(v: boolean): MockCreepLike;
  destroy(): void;
  getCurrentWaypointIndex(): number;
}

vi.mock('../../entities/Creep', () => {
  class MockCreep implements MockCreepLike {
    x = 0;
    y = 0;
    active = true;
    readonly reward: number;
    private readonly _listeners = new Map<string, Array<(...a: unknown[]) => void>>();

    constructor(_scene: unknown, _waypoints: unknown, config: { reward?: number } = {}) {
      this.reward = config.reward ?? 10;
    }

    once(event: string, fn: (...a: unknown[]) => void): this {
      const arr = this._listeners.get(event) ?? [];
      arr.push(fn);
      this._listeners.set(event, arr);
      return this;
    }

    emit(event: string, ...args: unknown[]): boolean {
      const arr = this._listeners.get(event) ?? [];
      this._listeners.delete(event);
      arr.forEach(fn => fn(...args));
      return arr.length > 0;
    }

    setActive(_v: boolean): this { return this; }
    setVisible(_v: boolean): this { return this; }
    destroy(): void { /* no-op */ }
    getCurrentWaypointIndex(): number { return 1; }
  }
  return { Creep: MockCreep };
});

// ── Scene mock ─────────────────────────────────────────────────────────────

class SceneEmitter {
  private readonly _h = new Map<string, Array<(...a: unknown[]) => void>>();
  on(event: string, fn: (...a: unknown[]) => void): void {
    const arr = this._h.get(event) ?? [];
    arr.push(fn);
    this._h.set(event, arr);
  }
  emit(event: string, ...args: unknown[]): void {
    (this._h.get(event) ?? []).forEach(fn => fn(...args));
  }
}

type TimerCfg = {
  callback: () => void;
  callbackScope?: unknown;
  repeat?: number;
  delay?: number;
};

function makeScene(): Phaser.Scene {
  const events = new SceneEmitter();
  const scene = {
    events,
    time: {
      addEvent(cfg: TimerCfg) {
        const count = (cfg.repeat ?? 0) + 1;
        for (let i = 0; i < count; i++) {
          cfg.callback.call(cfg.callbackScope ?? scene);
        }
        return { destroy(): void { /* no-op */ } };
      },
    },
  };
  return scene as unknown as Phaser.Scene;
}

// ── Test data ──────────────────────────────────────────────────────────────

import { WaveManager } from '../WaveManager';

const WAYPOINTS = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }];

const CREEP_TYPE_DEFS = [
  { key: 'grunt',  type: 'ground' as const, hp: 100, speed: 80, reward: 5 },
  { key: 'runner', type: 'ground' as const, hp: 60,  speed: 120, reward: 8 },
];

/**
 * Build a minimal 20-wave array.  Waves 1-19 have hpMult=1, speedMult=1.
 * Wave 20 (index 19) — the endless-mode baseline — has specific multipliers
 * so we can verify the scaling formula.
 */
function makeWaveDefs() {
  const defs = [];
  for (let i = 0; i < 19; i++) {
    defs.push({ count: 5, intervalMs: 1, hpMult: 1, speedMult: 1, pool: ['grunt'] });
  }
  // Wave 20: the baseline for endless scaling
  defs.push({
    count: 10,
    intervalMs: 500,
    hpMult: 6.0,
    speedMult: 1.7,
    pool: ['grunt', 'runner'],
  });
  return defs;
}

// ── Helper ─────────────────────────────────────────────────────────────────

function createManager(waveDefs?: ReturnType<typeof makeWaveDefs>) {
  const scene = makeScene();
  const activeCreeps = new Set<MockCreepLike>();
  const wm = new WaveManager(
    scene,
    WAYPOINTS,
    activeCreeps as unknown as Set<import('../../entities/Creep').Creep>,
    CREEP_TYPE_DEFS,
    waveDefs ?? makeWaveDefs(),
  );
  return { scene, activeCreeps, wm };
}

// ── Tests: generateEndlessWave ─────────────────────────────────────────────

describe('WaveManager.generateEndlessWave()', () => {
  it('wave 21 applies correct HP scaling (overflow=1)', () => {
    const { wm } = createManager();
    wm.enableEndless();
    const wave = wm.generateEndlessWave(21);
    // hpMult = 6.0 × (1 + 0.12 × 1) = 6.0 × 1.12 = 6.72
    expect(wave.hpMult).toBeCloseTo(6.72, 4);
  });

  it('wave 21 applies correct speed scaling (overflow=1)', () => {
    const { wm } = createManager();
    wm.enableEndless();
    const wave = wm.generateEndlessWave(21);
    // speedMult = 1.7 × (1 + 0.03 × 1) = 1.7 × 1.03 = 1.751
    expect(wave.speedMult).toBeCloseTo(1.751, 4);
  });

  it('wave 21 is NOT a boss wave', () => {
    const { wm } = createManager();
    wm.enableEndless();
    const wave = wm.generateEndlessWave(21);
    expect(wave.boss).toBeUndefined();
  });

  it('wave 21 inherits count, intervalMs, and pool from wave 20', () => {
    const { wm } = createManager();
    wm.enableEndless();
    const wave = wm.generateEndlessWave(21);
    expect(wave.count).toBe(10);
    expect(wave.intervalMs).toBe(500);
    expect(wave.pool).toEqual(['grunt', 'runner']);
  });

  it('wave 25 is a boss wave (first endless boss)', () => {
    const { wm } = createManager();
    wm.enableEndless();
    const wave = wm.generateEndlessWave(25);
    expect(wave.boss).toBe('makwa-ew25');
  });

  it('wave 25 HP scales correctly (overflow=5)', () => {
    const { wm } = createManager();
    wm.enableEndless();
    const wave = wm.generateEndlessWave(25);
    // hpMult = 6.0 × (1 + 0.12 × 5) = 6.0 × 1.6 = 9.6
    expect(wave.hpMult).toBeCloseTo(9.6, 4);
  });

  it('boss rotation cycles correctly: 25→makwa, 30→migizi, 35→waabooz, 40→animikiins', () => {
    const { wm } = createManager();
    wm.enableEndless();

    const w25 = wm.generateEndlessWave(25);
    const w30 = wm.generateEndlessWave(30);
    const w35 = wm.generateEndlessWave(35);
    const w40 = wm.generateEndlessWave(40);

    expect(w25.boss).toBe('makwa-ew25');
    expect(w30.boss).toBe('migizi-ew30');
    expect(w35.boss).toBe('waabooz-ew35');
    expect(w40.boss).toBe('animikiins-ew40');
  });

  it('boss rotation wraps after 4 bosses: wave 45 → makwa again', () => {
    const { wm } = createManager();
    wm.enableEndless();
    const w45 = wm.generateEndlessWave(45);
    expect(w45.boss).toBe('makwa-ew45');
  });

  it('non-boss endless waves (22, 23, 24) have no boss key', () => {
    const { wm } = createManager();
    wm.enableEndless();
    for (const n of [22, 23, 24]) {
      const wave = wm.generateEndlessWave(n);
      expect(wave.boss).toBeUndefined();
    }
  });

  it('large wave number scales correctly (wave 100, overflow=80)', () => {
    const { wm } = createManager();
    wm.enableEndless();
    const wave = wm.generateEndlessWave(100);
    // hpMult = 6.0 × (1 + 0.12 × 80) = 6.0 × 10.6 = 63.6
    expect(wave.hpMult).toBeCloseTo(63.6, 4);
    // speedMult = 1.7 × (1 + 0.03 × 80) = 1.7 × 3.4 = 5.78
    expect(wave.speedMult).toBeCloseTo(5.78, 4);
    // wave 100 is a boss wave (100 % 5 === 0)
    expect(wave.boss).toBeDefined();
  });
});

// ── Tests: enableEndless + startWave integration ───────────────────────────

describe('WaveManager endless mode integration', () => {
  it('without endless, startWave beyond waveDefs is a no-op', () => {
    const { wm, activeCreeps } = createManager();
    // Do NOT call enableEndless()
    wm.startWave(21);
    expect(activeCreeps.size).toBe(0);
    expect(wm.isActive()).toBe(false);
  });

  it('with endless enabled, startWave(21) spawns creeps', () => {
    const { wm, activeCreeps } = createManager();
    wm.enableEndless();
    wm.startWave(21);
    // Wave 20 baseline has count=10, so wave 21 should also have count=10
    expect(activeCreeps.size).toBe(10);
    expect(wm.isActive()).toBe(true);
  });

  it('with endless enabled, startWave(25) spawns a boss (1 creep)', () => {
    const { wm, activeCreeps } = createManager();
    wm.enableEndless();
    wm.startWave(25);
    // Boss waves spawn exactly 1 boss creep
    expect(activeCreeps.size).toBe(1);
    expect(wm.isActive()).toBe(true);
  });

  it('wave 20 still uses authored waveDef even in endless mode', () => {
    const { wm, activeCreeps } = createManager();
    wm.enableEndless();
    // Wave 20 exists in waveDefs, so ?? fallback does not trigger
    wm.startWave(20);
    // Wave 20 baseline has count=10 (normal creeps) but it has no boss key
    // in our test data, so it spawns 10 creeps
    expect(activeCreeps.size).toBe(10);
  });

  it('wave-complete fires for endless waves after all creeps settle', () => {
    const { wm, activeCreeps } = createManager();
    wm.enableEndless();

    let completedWave = -1;
    wm.on('wave-complete', (n: unknown) => { completedWave = n as number; });

    wm.startWave(21);
    [...activeCreeps].forEach((c: MockCreepLike) => c.emit('died'));

    expect(completedWave).toBe(21);
    expect(wm.isActive()).toBe(false);
  });

  it('consecutive endless waves work correctly', () => {
    const { wm, activeCreeps } = createManager();
    wm.enableEndless();

    let completeCount = 0;
    wm.on('wave-complete', () => { completeCount++; });

    // Wave 21
    wm.startWave(21);
    [...activeCreeps].forEach((c: MockCreepLike) => c.emit('died'));
    expect(completeCount).toBe(1);

    // Wave 22
    wm.startWave(22);
    [...activeCreeps].forEach((c: MockCreepLike) => c.emit('died'));
    expect(completeCount).toBe(2);
  });
});

// ── Tests: SaveManager endless records ─────────────────────────────────────

import { SaveManager } from '../../meta/SaveManager';

/** Reset the SaveManager singleton and localStorage between tests. */
function resetSaveManager(): void {
  localStorage.clear();
  // Force-reset the private static singleton for test isolation.
  const ctor = SaveManager as unknown as Record<string, unknown>;
  ctor['_instance'] = null;
}

describe('SaveManager endless records', () => {
  beforeEach(() => {
    resetSaveManager();
  });

  it('getEndlessRecord returns 0 for a map with no record', () => {
    const sm = SaveManager.getInstance();
    expect(sm.getEndlessRecord('map-01')).toBe(0);
  });

  it('updateEndlessRecord stores and retrieves the record', () => {
    const sm = SaveManager.getInstance();
    sm.updateEndlessRecord('map-01', 34);
    expect(sm.getEndlessRecord('map-01')).toBe(34);
  });

  it('updateEndlessRecord is idempotent — lower wave does not overwrite', () => {
    const sm = SaveManager.getInstance();
    sm.updateEndlessRecord('map-01', 34);
    sm.updateEndlessRecord('map-01', 20);
    expect(sm.getEndlessRecord('map-01')).toBe(34);
  });

  it('updateEndlessRecord updates when a higher wave is reached', () => {
    const sm = SaveManager.getInstance();
    sm.updateEndlessRecord('map-01', 34);
    sm.updateEndlessRecord('map-01', 50);
    expect(sm.getEndlessRecord('map-01')).toBe(50);
  });

  it('tracks records independently per map', () => {
    const sm = SaveManager.getInstance();
    sm.updateEndlessRecord('map-01', 25);
    sm.updateEndlessRecord('map-02', 40);
    expect(sm.getEndlessRecord('map-01')).toBe(25);
    expect(sm.getEndlessRecord('map-02')).toBe(40);
  });

  it('persists across singleton re-creation (localStorage)', () => {
    const sm1 = SaveManager.getInstance();
    sm1.updateEndlessRecord('map-01', 42);

    // Destroy singleton and re-create from localStorage
    const ctor = SaveManager as unknown as Record<string, unknown>;
    ctor['_instance'] = null;

    const sm2 = SaveManager.getInstance();
    expect(sm2.getEndlessRecord('map-01')).toBe(42);
  });

  it('updateEndlessRecord with equal value is a no-op', () => {
    const sm = SaveManager.getInstance();
    sm.updateEndlessRecord('map-01', 30);
    sm.updateEndlessRecord('map-01', 30);
    expect(sm.getEndlessRecord('map-01')).toBe(30);
  });
});
