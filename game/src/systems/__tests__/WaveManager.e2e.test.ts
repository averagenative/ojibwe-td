/**
 * End-to-end tests: wave completion flow.
 *
 * Exercises the full pipeline:
 *   WaveManager.startWave → creeps spawned → creeps die / escape
 *   → wave-complete emitted → gold / lives updated.
 *
 * Phaser is mocked entirely (to avoid loading the WebGL renderer and its
 * optional peer dependency phaser3spectorjs).  Creep is replaced with a
 * lightweight event-emitter stub.  The scene is a minimal mock that executes
 * spawn timers synchronously — no browser, no game loop required.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import type Phaser from 'phaser';
import { WaveManager } from '../WaveManager';
import { calculateWaveBonus } from '../EconomyManager';

// ── Phaser mock ────────────────────────────────────────────────────────────
//
// Mock the entire phaser package so neither the WebGL renderer nor
// phaser3spectorjs are ever loaded.  WaveManager only needs:
//   • Phaser.Events.EventEmitter  (WaveManager extends this)
//
// NOTE: vi.mock is hoisted before all imports, so the mock is registered
// before WaveManager loads phaser at runtime.

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
//
// WaveManager creates Creep instances via `new Creep(scene, waypoints, config)`.
// We replace the real Creep (a Phaser.GameObjects.Container subclass) with a
// minimal stub that satisfies every Creep API called by WaveManager:
//   • reward property, once(), emit()
//   • setActive(), setVisible(), destroy(), getCurrentWaypointIndex()

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
      this._listeners.delete(event);        // "once": consume before firing
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

// ── Simple EventEmitter for the scene mock ─────────────────────────────────
// Separate from the Phaser mock (vi.mock factories are isolated closures).

class SceneEmitter {
  private readonly _h = new Map<string, Array<(...a: unknown[]) => void>>();

  on(event: string, fn: (...a: unknown[]) => void): void {
    const arr = this._h.get(event) ?? [];
    arr.push(fn);
    this._h.set(event, arr);
  }

  emit(event: string, ...args: unknown[]): void {
    const arr = this._h.get(event) ?? [];
    arr.forEach(fn => fn(...args));
  }
}

// ── Scene mock ─────────────────────────────────────────────────────────────

type TimerCfg = {
  callback:       () => void;
  callbackScope?: unknown;
  repeat?:        number;
  delay?:         number;
};

/**
 * Returns a minimal Phaser.Scene lookalike.
 *
 * time.addEvent() fires the callback (repeat + 1) times SYNCHRONOUSLY, so
 * wave spawning happens instantly without a running game loop.
 */
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

const WAYPOINTS = [
  { x:   0, y: 0 },
  { x: 100, y: 0 },
  { x: 200, y: 0 },
];

const CREEP_TYPE_DEFS = [
  { key: 'basic', type: 'ground' as const, hp: 100, speed: 80, reward: 5 },
];

function makeWaveDef(count: number) {
  return { count, intervalMs: 1, hpMult: 1, speedMult: 1, pool: ['basic'] };
}

// ── Game-state adapter ─────────────────────────────────────────────────────
// Mirrors the scene-event subscriptions in GameScene that update gold / lives.

interface GameState { gold: number; lives: number; }

function wireGameEvents(scene: Phaser.Scene, state: GameState): void {
  // Cast through unknown to call our SceneEmitter.on while preserving the
  // Phaser.Scene type for other call sites.
  const ev = (scene as unknown as { events: SceneEmitter }).events;
  ev.on('creep-killed',  (reward: unknown) => { state.gold  += (reward as number); });
  ev.on('creep-escaped', (cost:   unknown) => { state.lives  = Math.max(0, state.lives - (cost as number)); });
  ev.on('wave-bonus',    (bonus:  unknown) => { state.gold  += (bonus as number); });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('wave completion flow (end-to-end)', () => {
  let scene:        Phaser.Scene;
  let activeCreeps: Set<MockCreepLike>; // runtime: MockCreep instances
  let waveManager:  WaveManager;
  let state:        GameState;

  beforeEach(() => {
    scene        = makeScene();
    activeCreeps = new Set<MockCreepLike>();
    state        = { gold: 0, lives: 20 };
    wireGameEvents(scene, state);
    waveManager  = new WaveManager(
      scene,
      WAYPOINTS,
      activeCreeps as unknown as Set<import('../../entities/Creep').Creep>,
      CREEP_TYPE_DEFS,
      [makeWaveDef(3)],
    );
  });

  // ── spawn ─────────────────────────────────────────────────────────────

  it('spawns the exact creep count declared in the wave def', () => {
    waveManager.startWave(1);
    expect(activeCreeps.size).toBe(3);
  });

  // ── wave-complete fires exactly once ───────────────────────────────────

  it('emits wave-complete exactly once after all creeps are killed', () => {
    let count = 0;
    waveManager.on('wave-complete', () => { count++; });

    waveManager.startWave(1);
    [...activeCreeps].forEach((c: MockCreepLike) => c.emit('died'));

    expect(count).toBe(1);
  });

  it('does NOT emit wave-complete while any creep is still alive', () => {
    let count = 0;
    waveManager.on('wave-complete', () => { count++; });

    waveManager.startWave(1);
    const creeps: MockCreepLike[] = [...activeCreeps];

    // Kill only 2 of 3; wave must remain active
    creeps[0].emit('died');
    creeps[1].emit('died');

    expect(count).toBe(0);
    expect(waveManager.isActive()).toBe(true);
  });

  // ── gold accounting ────────────────────────────────────────────────────

  it('emits wave-bonus with the correct amount for the wave number', () => {
    let receivedBonus = 0;
    (scene as unknown as { events: SceneEmitter }).events.on(
      'wave-bonus',
      (bonus: unknown) => { receivedBonus = bonus as number; },
    );

    waveManager.startWave(1);
    [...activeCreeps].forEach((c: MockCreepLike) => c.emit('died'));

    expect(receivedBonus).toBe(calculateWaveBonus(1));
  });

  it('total gold after wave equals kill rewards plus wave-completion bonus', () => {
    waveManager.startWave(1);
    [...activeCreeps].forEach((c: MockCreepLike) => c.emit('died'));

    const killRewards = 3 * 5;                // 3 creeps × reward 5
    const waveBonus   = calculateWaveBonus(1); // 50 + 1 × 10 = 60
    expect(state.gold).toBe(killRewards + waveBonus);
  });

  // ── lives accounting ───────────────────────────────────────────────────

  it('no lives are lost when all creeps are killed before reaching the exit', () => {
    waveManager.startWave(1);
    [...activeCreeps].forEach((c: MockCreepLike) => c.emit('died'));

    expect(state.lives).toBe(20);
  });

  it('creep-escaped decrements lives by 1 per normal creep that reaches the exit', () => {
    waveManager.startWave(1);
    [...activeCreeps].forEach((c: MockCreepLike) => c.emit('reached-exit'));

    expect(state.lives).toBe(17);   // 20 − 3
  });

  // ── mixed kills and escapes ────────────────────────────────────────────

  it('wave-complete fires and lives update correctly with a mix of kills and escapes', () => {
    let count = 0;
    waveManager.on('wave-complete', () => { count++; });

    waveManager.startWave(1);
    const creeps: MockCreepLike[] = [...activeCreeps];

    creeps[0].emit('reached-exit');  // 1 escaped → lives 19
    creeps[1].emit('died');
    creeps[2].emit('died');

    expect(count).toBe(1);
    expect(state.lives).toBe(19);
  });

  // ── boundary: last creep dies after one already escaped ────────────────

  it('handles boundary: one creep escaped (lives=19) then last creep is killed', () => {
    let count = 0;
    waveManager.on('wave-complete', () => { count++; });

    waveManager.startWave(1);
    const creeps: MockCreepLike[] = [...activeCreeps];

    creeps[0].emit('reached-exit');
    expect(state.lives).toBe(19);
    expect(count).toBe(0);          // wave still active

    creeps[1].emit('died');
    expect(count).toBe(0);          // one creep still alive

    creeps[2].emit('died');
    expect(count).toBe(1);          // last creep settled → wave complete
    expect(state.lives).toBe(19);   // no further life loss after last kill
  });

  // ── wave-complete carries the wave number ──────────────────────────────

  it('wave-complete event payload is the wave number', () => {
    let completedWave = -1;
    waveManager.on('wave-complete', (waveNum: unknown) => { completedWave = waveNum as number; });

    waveManager.startWave(1);
    [...activeCreeps].forEach((c: MockCreepLike) => c.emit('died'));

    expect(completedWave).toBe(1);
  });

  // ── consecutive waves ──────────────────────────────────────────────────

  it('wave-complete fires once per wave across consecutive waves', () => {
    const scene2   = makeScene();
    const creeps2  = new Set<MockCreepLike>();
    const manager2 = new WaveManager(
      scene2, WAYPOINTS,
      creeps2 as unknown as Set<import('../../entities/Creep').Creep>,
      CREEP_TYPE_DEFS, [makeWaveDef(2), makeWaveDef(2)],
    );

    let completeCount = 0;
    manager2.on('wave-complete', () => { completeCount++; });

    // Wave 1
    manager2.startWave(1);
    expect(creeps2.size).toBe(2);
    [...creeps2].forEach((c: MockCreepLike) => c.emit('died'));
    expect(completeCount).toBe(1);

    // Wave 2 — activeCreeps set is empty after all wave-1 creeps died
    expect(creeps2.size).toBe(0);
    manager2.startWave(2);
    expect(creeps2.size).toBe(2);
    [...creeps2].forEach((c: MockCreepLike) => c.emit('died'));
    expect(completeCount).toBe(2);
  });

  // ── invalid / boundary inputs ───────────────────────────────────────────

  it('startWave with out-of-range wave number is a no-op (no crash, no event)', () => {
    let count = 0;
    waveManager.on('wave-complete', () => { count++; });

    waveManager.startWave(999); // waveDefs only has index 0
    expect(activeCreeps.size).toBe(0);
    expect(count).toBe(0);
    expect(waveManager.isActive()).toBe(false);
  });

  it('startWave(0) is a no-op (waveDefs is 1-indexed)', () => {
    waveManager.startWave(0);
    expect(activeCreeps.size).toBe(0);
    expect(waveManager.isActive()).toBe(false);
  });

  it('handles a wave with 1 creep (minimum non-empty wave)', () => {
    const scene1   = makeScene();
    const creeps1  = new Set<MockCreepLike>();
    const state1: GameState = { gold: 0, lives: 10 };
    wireGameEvents(scene1, state1);
    const manager1 = new WaveManager(
      scene1, WAYPOINTS,
      creeps1 as unknown as Set<import('../../entities/Creep').Creep>,
      CREEP_TYPE_DEFS, [makeWaveDef(1)],
    );

    let count = 0;
    manager1.on('wave-complete', () => { count++; });

    manager1.startWave(1);
    expect(creeps1.size).toBe(1);

    [...creeps1].forEach((c: MockCreepLike) => c.emit('died'));
    expect(count).toBe(1);
    expect(state1.gold).toBe(5 + calculateWaveBonus(1)); // 1 kill reward + wave bonus
  });

  it('lives do not go below zero when many creeps escape', () => {
    const scene3   = makeScene();
    const creeps3  = new Set<MockCreepLike>();
    const state3: GameState = { gold: 0, lives: 2 }; // only 2 lives, 3 creeps
    wireGameEvents(scene3, state3);
    const manager3 = new WaveManager(
      scene3, WAYPOINTS,
      creeps3 as unknown as Set<import('../../entities/Creep').Creep>,
      CREEP_TYPE_DEFS, [makeWaveDef(3)],
    );

    manager3.startWave(1);
    [...creeps3].forEach((c: MockCreepLike) => c.emit('reached-exit'));

    expect(state3.lives).toBe(0); // clamped at 0, not -1
  });
});
