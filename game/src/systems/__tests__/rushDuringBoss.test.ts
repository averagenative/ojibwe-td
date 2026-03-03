/**
 * Rush During Boss Wave — bug regression tests.
 *
 * Covers the fix for: rushing during a boss wave would skip the boss loot
 * offer panel and leak pendingBossKillKey into the next wave's post-wave queue.
 *
 * Three test suites:
 *   1. Structural tests (GameScene ?raw) — verify rushNextWave() checks
 *      pending boss state before starting the next wave.
 *   2. Arithmetic tests — verify rush-button visibility rules when currently
 *      ON a boss wave vs. when the NEXT wave is a boss wave.
 *   3. WaveManager e2e tests — verify boss wave completion events (wave-bonus,
 *      wave-complete, boss-killed) fire correctly regardless of rush state.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import type Phaser from 'phaser';
import { WaveManager } from '../WaveManager';
import { calculateWaveBonus } from '../EconomyManager';

import gameSceneSrc from '../../scenes/GameScene.ts?raw';

// ── Phaser mock ────────────────────────────────────────────────────────────
//
// Identical to the mock in WaveManager.boss.e2e.test.ts — keeps the files
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
    count:  2,
    hp:     200,
    speed:  108,
    reward: 10,
  })),
}));

// ── Creep mock ─────────────────────────────────────────────────────────────

interface MockCreepLike {
  x: number;
  y: number;
  active: boolean;
  readonly reward: number;
  readonly maxHp: number;
  readonly isBossCreep: boolean;
  readonly bossAbilityType: string | undefined;
  readonly bossKey: string;
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
      this._listeners.delete(event);
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

// ── Scene helpers ──────────────────────────────────────────────────────────

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

type TimerCfg = {
  callback:       () => void;
  callbackScope?: unknown;
  repeat?:        number;
  delay?:         number;
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

const WAYPOINTS = [
  { x:   0, y: 0 },
  { x: 100, y: 0 },
  { x: 200, y: 0 },
];

const CREEP_TYPE_DEFS = [
  { key: 'basic', type: 'ground' as const, hp: 100, speed: 80, reward: 5 },
];

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

type SceneEventsRef = { events: SceneEmitter };

function getBoss(activeCreeps: Set<MockCreepLike>): MockCreepLike {
  const boss = [...activeCreeps].find(c => c.isBossCreep);
  if (!boss) throw new Error('No boss found in activeCreeps after startWave()');
  return boss;
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Structural tests — rushNextWave() checks pending boss state
// ══════════════════════════════════════════════════════════════════════════════

describe('GameScene — rushNextWave() handles pending boss reward', () => {
  // Extract the full rushNextWave method body (handles 1 level of inner braces).
  const rushMethod = gameSceneSrc.match(
    /private rushNextWave\(\).*?\{(?:[^{}]*|\{[^{}]*\})*\}/s
  );

  it('rushNextWave source extracts cleanly', () => {
    expect(rushMethod).not.toBeNull();
  });

  it('checks _pendingBossRewardOffer before starting the next wave', () => {
    expect(rushMethod![0]).toContain('_pendingBossRewardOffer');
  });

  it('checks _pendingBossName alongside _pendingBossRewardOffer', () => {
    expect(rushMethod![0]).toContain('_pendingBossName');
  });

  it('calls openBossOfferPanel with a startNextWave callback (unique to rush path)', () => {
    // This exact callback form only appears in the rush boss-pending branch;
    // the other two openBossOfferPanel call-sites use proceedToVictory / onDismiss.
    expect(gameSceneSrc).toContain('this.openBossOfferPanel(name, () => this.startNextWave())');
  });

  it('clears _pendingBossRewardOffer before showing the boss panel', () => {
    expect(rushMethod![0]).toContain('_pendingBossRewardOffer = false');
  });

  it('clears pendingBossKillKey in both branches to prevent state bleed', () => {
    // pendingBossKillKey = null appears in the boss-pending branch AND in the
    // no-boss-pending branch (to clear any stale key left from before the rush).
    const matches = rushMethod![0].match(/this\.pendingBossKillKey\s*=\s*null/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. Arithmetic tests — rush-button visibility during a boss wave
// ══════════════════════════════════════════════════════════════════════════════

describe('Rush-button visibility — currently ON a boss wave', () => {
  /**
   * Mirrors _updateRushButton: hide when the NEXT wave is a boss (% 5 === 0)
   * or when it exceeds totalWaves.
   * Returns true when the rush button should be VISIBLE (rush is allowed).
   */
  function isRushVisible(currentWave: number, totalWaves: number, isEndless: boolean): boolean {
    const nextWave = currentWave + 1;
    if ((!isEndless && nextWave > totalWaves) || nextWave % 5 === 0) return false;
    return true;
  }

  // Rush IS available when you are currently on a boss wave (5, 10, 15 …)
  // because the NEXT wave (6, 11, 16 …) is not a boss wave.
  it('wave 5 (boss): rush IS available — next=6, 6%5≠0', () => {
    expect(isRushVisible(5, 20, false)).toBe(true);
  });

  it('wave 10 (boss): rush IS available — next=11, 11%5≠0', () => {
    expect(isRushVisible(10, 20, false)).toBe(true);
  });

  it('wave 15 (boss): rush IS available — next=16, 16%5≠0', () => {
    expect(isRushVisible(15, 20, false)).toBe(true);
  });

  // Rush is HIDDEN when the NEXT wave is a boss wave (cannot rush into boss).
  it('wave 4 (pre-boss): rush is HIDDEN — next=5, 5%5=0', () => {
    expect(isRushVisible(4, 20, false)).toBe(false);
  });

  it('wave 9 (pre-boss): rush is HIDDEN — next=10, 10%5=0', () => {
    expect(isRushVisible(9, 20, false)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. WaveManager e2e tests — boss wave completion events
// ══════════════════════════════════════════════════════════════════════════════

describe('WaveManager — boss wave completion events (regardless of rush state)', () => {
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

  it('boss-killed fires with correct bossKey when the boss takes fatal damage', () => {
    let bossKilledData: unknown;
    (scene as unknown as SceneEventsRef).events.on(
      'boss-killed',
      (data: unknown) => { bossKilledData = data; },
    );

    waveManager.startWave(5);
    const boss = getBoss(activeCreeps);
    boss.takeDamage(boss.maxHp);

    expect(bossKilledData).toBeDefined();
    expect((bossKilledData as { bossKey: string }).bossKey).toBe('waabooz');
  });

  it('boss-killed fires with rewardOffer: true for Waabooz', () => {
    let bossKilledData: unknown;
    (scene as unknown as SceneEventsRef).events.on(
      'boss-killed',
      (data: unknown) => { bossKilledData = data; },
    );

    waveManager.startWave(5);
    getBoss(activeCreeps).takeDamage(1000);

    expect((bossKilledData as { rewardOffer: boolean }).rewardOffer).toBe(true);
  });

  it('wave-bonus fires exactly once after the boss wave settles', () => {
    let bonusCount = 0;
    (scene as unknown as SceneEventsRef).events.on('wave-bonus', () => { bonusCount++; });

    waveManager.startWave(5);
    const boss = getBoss(activeCreeps);
    boss.takeDamage(boss.maxHp);                    // boss dies → 2 split copies
    const copies = [...activeCreeps];
    copies[0].emit('died');
    copies[1].emit('died');

    expect(bonusCount).toBe(1);
  });

  it('wave-bonus fires with calculateWaveBonus(5) gold', () => {
    let bonusGold = 0;
    (scene as unknown as SceneEventsRef).events.on('wave-bonus', (g: unknown) => { bonusGold = g as number; });

    waveManager.startWave(5);
    const boss = getBoss(activeCreeps);
    boss.takeDamage(boss.maxHp);
    const copies = [...activeCreeps];
    copies[0].emit('died');
    copies[1].emit('died');

    expect(bonusGold).toBe(calculateWaveBonus(5));
  });

  it('wave-complete fires with waveNumber = 5 after the boss wave settles', () => {
    let completedWave = -1;
    waveManager.on('wave-complete', (wn: unknown) => { completedWave = wn as number; });

    waveManager.startWave(5);
    const boss = getBoss(activeCreeps);
    boss.takeDamage(boss.maxHp);
    const copies = [...activeCreeps];
    copies[0].emit('died');
    copies[1].emit('died');

    expect(completedWave).toBe(5);
  });

  it('boss-killed fires before wave-complete (event ordering)', () => {
    const order: string[] = [];
    (scene as unknown as SceneEventsRef).events.on('boss-killed', () => { order.push('boss-killed'); });
    waveManager.on('wave-complete', () => { order.push('wave-complete'); });

    waveManager.startWave(5);
    const boss = getBoss(activeCreeps);
    boss.takeDamage(boss.maxHp);
    // After boss dies, split copies remain — wave is not yet complete.
    const copies = [...activeCreeps];
    copies[0].emit('died');
    copies[1].emit('died');

    expect(order).toEqual(['boss-killed', 'wave-complete']);
  });
});
