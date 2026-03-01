/**
 * End-to-end tests: boss wave flow.
 *
 * Exercises the full pipeline:
 *   WaveManager.startWave(5) → boss spawns → boss takes damage → boss dies
 *   → Waabooz split mechanic → mini-copies resolve → wave-complete emitted.
 *
 * Acceptance criteria covered:
 *   1. Exactly one boss spawns on a boss wave with the correct bossKey (Waabooz).
 *   2. 'boss-wave-start' fires with correct boss data.
 *   3. boss.takeDamage(boss.maxHp) triggers 'boss-killed' scene event.
 *   4. Waabooz death spawns two mini-copies at the parent waypoint index.
 *   5. Both mini-copies reaching exit → wave-complete (not after just the first).
 *   6. Both mini-copies killed → wave-complete.
 *   7. Boss dying at the final waypoint does not throw (ROADMAP-noted guard).
 *
 * BOSS_DEFS and computeWaaboozSplitConfig are mocked for deterministic,
 * Phaser-free execution.  Same Phaser + Creep mock patterns as
 * WaveManager.e2e.test.ts.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import type Phaser from 'phaser';
import { WaveManager } from '../WaveManager';

// ── Phaser mock ────────────────────────────────────────────────────────────
//
// Identical to the mock in WaveManager.e2e.test.ts — keeps the two files
// self-contained without a shared helper.

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

// ── bossDefs mock ──────────────────────────────────────────────────────────
//
// Provides a minimal Waabooz def with bossAbility:'split'.
// computeWaaboozSplitConfig is replaced with a deterministic spy that
// returns exactly 2 mini-copies, making assertion counts predictable.

vi.mock('../../data/bossDefs', () => ({
  BOSS_DEFS: {
    waabooz: {
      key:                'waabooz',
      name:               'Waabooz',
      type:               'ground',
      isBoss:             true,
      bossAbility:        'split',
      hp:                 1000,
      speed:              90,
      reward:             100,
      rewardGold:         200,
      rewardOffer:        true,
      physicalResistPct:  0,
      isSlowImmune:       false,
      isPoisonImmune:     false,
      regenPercentPerSec: 0,
      tint:               0xaaddff,
      splitCount:         2,
      splitHpPct:         0.2,
      splitSpeedBonus:    1.2,
    },
  },
  computeWaaboozSplitConfig: vi.fn(() => ({
    count:  2,   // two mini-copies per split (simplified from real 3)
    hp:     200,
    speed:  108,
    reward: 10,
  })),
}));

// ── Creep mock ─────────────────────────────────────────────────────────────
//
// Extended beyond the normal-wave stub:
//   • maxHp, isBossCreep, bossAbilityType, bossKey  — inspect boss identity
//   • takeDamage(amount)  — emits 'died' when hp is drained to zero
//   • _currentWpIdx       — externally settable to simulate boss position

interface MockCreepLike {
  x: number;
  y: number;
  active: boolean;
  readonly reward: number;
  readonly maxHp: number;
  readonly isBossCreep: boolean;
  readonly bossAbilityType: string | undefined;
  readonly bossKey: string;
  /** Mutable waypoint index — override in tests to simulate boss position. */
  _currentWpIdx: number;
  takeDamage(amount: number): void;
  once(event: string, fn: (...a: unknown[]) => void): MockCreepLike;
  emit(event: string, ...args: unknown[]): boolean;
  setActive(v: boolean): MockCreepLike;
  setVisible(v: boolean): MockCreepLike;
  destroy(): void;
  getCurrentWaypointIndex(): number;
}

vi.mock('../../entities/Creep', () => {
  class MockCreep {
    x = 0;
    y = 0;
    active = true;
    readonly reward:          number;
    readonly maxHp:           number;
    readonly isBossCreep:     boolean;
    readonly bossAbilityType: string | undefined;
    readonly bossKey:         string;
    _currentWpIdx = 1;

    private hp: number;
    private readonly _listeners = new Map<string, Array<(...a: unknown[]) => void>>();

    constructor(
      _scene:     unknown,
      _waypoints: unknown,
      config: {
        reward?:      number;
        hp?:          number;
        isBoss?:      boolean;
        bossAbility?: string;
        bossKey?:     string;
      } = {},
    ) {
      this.reward          = config.reward      ?? 10;
      this.maxHp           = config.hp          ?? 100;
      this.hp              = this.maxHp;
      this.isBossCreep     = config.isBoss      ?? false;
      this.bossAbilityType = config.bossAbility;
      this.bossKey         = config.bossKey     ?? '';
    }

    takeDamage(amount: number): void {
      this.hp -= amount;
      if (this.hp <= 0) this.emit('died');
    }

    once(event: string, fn: (...a: unknown[]) => void): this {
      const arr = this._listeners.get(event) ?? [];
      arr.push(fn);
      this._listeners.set(event, arr);
      return this;
    }

    emit(event: string, ...args: unknown[]): boolean {
      const arr = this._listeners.get(event) ?? [];
      this._listeners.delete(event);       // "once": consume before firing
      arr.forEach(fn => fn(...args));
      return arr.length > 0;
    }

    setActive(_v: boolean): this  { return this; }
    setVisible(_v: boolean): this { return this; }
    destroy(): void               { /* no-op */ }
    getCurrentWaypointIndex(): number { return this._currentWpIdx; }
  }

  return { Creep: MockCreep };
});

// ── Simple EventEmitter for the scene mock ─────────────────────────────────

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
 * Minimal Phaser.Scene lookalike.
 * time.addEvent() fires the callback (repeat + 1) times SYNCHRONOUSLY,
 * so boss spawn timers complete instantly — no game loop required.
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

/** Wave defs: waves 1–4 are normal, wave 5 is the Waabooz boss wave. */
function makeBossWaveDefs() {
  const normal = { count: 1, intervalMs: 1, hpMult: 1, speedMult: 1, pool: ['basic'] };
  return [
    { ...normal },
    { ...normal },
    { ...normal },
    { ...normal },
    { ...normal, boss: 'waabooz' },   // wave 5: boss wave
  ];
}

/** 1-indexed wave number used in all boss tests. */
const BOSS_WAVE = 5;

/** Mini-copy count returned by the mocked computeWaaboozSplitConfig. */
const MOCK_SPLIT_COUNT = 2;

// ── Helpers ────────────────────────────────────────────────────────────────

type SceneEventsRef = { events: SceneEmitter };

/** Returns the boss creep from activeCreeps (throws if none found). */
function getBoss(activeCreeps: Set<MockCreepLike>): MockCreepLike {
  const boss = [...activeCreeps].find(c => c.isBossCreep);
  if (!boss) throw new Error('No boss found in activeCreeps after startWave()');
  return boss;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('boss wave flow (end-to-end)', () => {
  let scene:        Phaser.Scene;
  let activeCreeps: Set<MockCreepLike>;
  let waveManager:  WaveManager;

  beforeEach(() => {
    scene        = makeScene();
    activeCreeps = new Set<MockCreepLike>();
    waveManager  = new WaveManager(
      scene,
      WAYPOINTS,
      activeCreeps as unknown as Set<import('../../entities/Creep').Creep>,
      CREEP_TYPE_DEFS,
      makeBossWaveDefs(),
    );
  });

  // ── 1. Boss spawns ─────────────────────────────────────────────────────

  it('startWave(5) spawns exactly one boss creep with bossKey "waabooz"', () => {
    waveManager.startWave(BOSS_WAVE);

    expect(activeCreeps.size).toBe(1);
    const boss = [...activeCreeps][0];
    expect(boss.isBossCreep).toBe(true);
    expect(boss.bossKey).toBe('waabooz');
    expect(boss.bossAbilityType).toBe('split');
  });

  // ── 2. boss-wave-start event ───────────────────────────────────────────

  it('emits boss-wave-start with correct boss data when boss wave begins', () => {
    let received: unknown;
    (scene as unknown as SceneEventsRef).events.on(
      'boss-wave-start',
      (data: unknown) => { received = data; },
    );

    waveManager.startWave(BOSS_WAVE);

    expect(received).toEqual({ bossKey: 'waabooz', bossName: 'Waabooz' });
  });

  // ── 3. Boss takes damage and triggers boss-killed ──────────────────────

  it('boss.takeDamage(boss.maxHp) triggers boss-killed scene event with correct bossKey', () => {
    let bossKilledData: unknown;
    (scene as unknown as SceneEventsRef).events.on(
      'boss-killed',
      (data: unknown) => { bossKilledData = data; },
    );

    waveManager.startWave(BOSS_WAVE);
    const boss = getBoss(activeCreeps);
    boss.takeDamage(boss.maxHp);

    expect(bossKilledData).toBeDefined();
    expect((bossKilledData as { bossKey: string }).bossKey).toBe('waabooz');
  });

  // ── 4. Waabooz split: mini-copies at the correct waypoint index ────────

  it('Waabooz death spawns two non-boss mini-copies at the parent waypoint index', () => {
    waveManager.startWave(BOSS_WAVE);
    const boss = getBoss(activeCreeps);
    const parentWpIdx = boss.getCurrentWaypointIndex();  // 1 (mock default)

    boss.takeDamage(boss.maxHp);  // boss dies → split fires

    // Boss is removed; exactly MOCK_SPLIT_COUNT mini-copies remain.
    expect(activeCreeps.size).toBe(MOCK_SPLIT_COUNT);
    for (const mini of activeCreeps) {
      expect(mini.isBossCreep).toBe(false);
      expect(mini.getCurrentWaypointIndex()).toBe(parentWpIdx);
    }
  });

  // ── 5. Both mini-copies reach exit → wave-complete ─────────────────────

  it('wave-complete fires only after BOTH mini-copies reach the exit (not after first)', () => {
    let completeCount = 0;
    waveManager.on('wave-complete', () => { completeCount++; });

    waveManager.startWave(BOSS_WAVE);
    const boss = getBoss(activeCreeps);
    boss.takeDamage(boss.maxHp);  // boss dies → 2 mini-copies

    const minis = [...activeCreeps];
    expect(minis).toHaveLength(MOCK_SPLIT_COUNT);

    // First mini escapes — wave must remain active.
    minis[0].emit('reached-exit');
    expect(completeCount).toBe(0);
    expect(waveManager.isActive()).toBe(true);

    // Second mini escapes — wave complete.
    minis[1].emit('reached-exit');
    expect(completeCount).toBe(1);
    expect(waveManager.isActive()).toBe(false);
  });

  // ── 6. Both mini-copies killed → wave-complete ─────────────────────────

  it('wave-complete fires after both mini-copies are killed', () => {
    let completeCount = 0;
    waveManager.on('wave-complete', () => { completeCount++; });

    waveManager.startWave(BOSS_WAVE);
    const boss = getBoss(activeCreeps);
    boss.takeDamage(boss.maxHp);  // boss dies → 2 mini-copies

    const minis = [...activeCreeps];

    // Kill first mini — wave still active.
    minis[0].emit('died');
    expect(completeCount).toBe(0);
    expect(waveManager.isActive()).toBe(true);

    // Kill second mini — wave complete.
    minis[1].emit('died');
    expect(completeCount).toBe(1);
  });

  // ── 7. Boss dies at the final waypoint — no array-out-of-bounds ────────

  it('handles Waabooz death at the final waypoint without throwing', () => {
    let completeCount = 0;
    waveManager.on('wave-complete', () => { completeCount++; });

    waveManager.startWave(BOSS_WAVE);
    const boss = getBoss(activeCreeps);

    // Simulate boss dying at or past the last waypoint.
    // waypoints.slice(WAYPOINTS.length) === [] so remainingWps = [bossPos].
    boss._currentWpIdx = WAYPOINTS.length;

    // Must not throw even though waypoints.slice(3) is empty.
    expect(() => boss.takeDamage(boss.maxHp)).not.toThrow();

    // Mini-copies are still spawned from the boss position.
    expect(activeCreeps.size).toBe(MOCK_SPLIT_COUNT);

    // Settle both mini-copies → wave-complete fires.
    const minis = [...activeCreeps];
    minis[0].emit('reached-exit');
    minis[1].emit('reached-exit');
    expect(completeCount).toBe(1);
  });
});
