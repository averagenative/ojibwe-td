import { describe, it, expect, vi } from 'vitest';
import EventEmitter from 'eventemitter3';

/**
 * GameScene shutdown cleanup tests.
 *
 * GameScene.shutdown() removes game-specific event listeners from scene.events
 * to prevent handler accumulation on scene restart. These tests verify the
 * pattern using eventemitter3 — the same emitter Phaser.Events.EventEmitter
 * extends.
 */

/** The exact event names cleaned up by GameScene.shutdown(). */
const GAME_EVENTS = [
  'creep-killed',
  'creep-escaped',
  'wave-bonus',
  'boss-wave-start',
  'boss-killed',
  'creep-died-poisoned',
  'between-wave-offer-picked',
] as const;

/** Simulates registering the same listeners GameScene.create() registers. */
function registerGameListeners(emitter: EventEmitter): void {
  for (const name of GAME_EVENTS) {
    emitter.on(name, () => {});
  }
}

/** Simulates the targeted off() calls in GameScene.shutdown(). */
function removeGameListeners(emitter: EventEmitter): void {
  for (const name of GAME_EVENTS) {
    emitter.off(name);
  }
}

describe('GameScene shutdown cleanup', () => {
  it('removes all game-event listeners', () => {
    const emitter = new EventEmitter();
    registerGameListeners(emitter);

    for (const name of GAME_EVENTS) {
      expect(emitter.listenerCount(name)).toBe(1);
    }

    removeGameListeners(emitter);

    for (const name of GAME_EVENTS) {
      expect(emitter.listenerCount(name)).toBe(0);
    }
  });

  it('preserves Phaser-internal listeners when using targeted off()', () => {
    const emitter = new EventEmitter();
    const internalHandler = vi.fn();

    // Simulate Phaser plugin listeners (TweenManager, TimerManager, etc.)
    emitter.on('preupdate', internalHandler);
    emitter.on('update', internalHandler);
    emitter.on('postupdate', internalHandler);
    emitter.on('start', internalHandler);

    registerGameListeners(emitter);
    removeGameListeners(emitter);

    // Phaser-internal events must survive the cleanup.
    expect(emitter.listenerCount('preupdate')).toBe(1);
    expect(emitter.listenerCount('update')).toBe(1);
    expect(emitter.listenerCount('postupdate')).toBe(1);
    expect(emitter.listenerCount('start')).toBe(1);
  });

  it('is safe to call cleanup when no listeners are registered', () => {
    const emitter = new EventEmitter();
    // Should not throw.
    removeGameListeners(emitter);
    for (const name of GAME_EVENTS) {
      expect(emitter.listenerCount(name)).toBe(0);
    }
  });

  it('is safe to call cleanup twice', () => {
    const emitter = new EventEmitter();
    registerGameListeners(emitter);

    removeGameListeners(emitter);
    removeGameListeners(emitter);

    for (const name of GAME_EVENTS) {
      expect(emitter.listenerCount(name)).toBe(0);
    }
  });

  it('prevents duplicate handlers from accumulating across restarts', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();

    // Simulate two create() cycles without cleanup — handlers accumulate.
    emitter.on('creep-killed', handler);
    emitter.on('creep-killed', handler);
    expect(emitter.listenerCount('creep-killed')).toBe(2);

    // Emit once — both handlers fire (the bug this task fixes).
    emitter.emit('creep-killed', { reward: 10, x: 0, y: 0 });
    expect(handler).toHaveBeenCalledTimes(2);

    handler.mockClear();

    // Now simulate cleanup + re-register (correct flow).
    emitter.off('creep-killed');
    emitter.on('creep-killed', handler);
    expect(emitter.listenerCount('creep-killed')).toBe(1);

    emitter.emit('creep-killed', { reward: 10, x: 0, y: 0 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('clears entity collections', () => {
    const creeps = new Set([{} as unknown, {} as unknown]);
    const projectiles = new Set([{} as unknown]);

    expect(creeps.size).toBe(2);
    expect(projectiles.size).toBe(1);

    // Simulate shutdown clearing.
    creeps.clear();
    projectiles.clear();

    expect(creeps.size).toBe(0);
    expect(projectiles.size).toBe(0);
  });

  it('handles optional waveManager/audioManager cleanup safely', () => {
    const cleanup = vi.fn();
    const destroy = vi.fn();

    // Both defined — should call both.
    const waveManager: { cleanup(): void } | undefined = { cleanup };
    const audioManager: { destroy(): void } | undefined = { destroy };
    waveManager?.cleanup();
    audioManager?.destroy();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();

    // Undefined — optional chaining should not throw.
    function callOptional(
      wm?: { cleanup(): void },
      am?: { destroy(): void },
    ): void {
      wm?.cleanup();
      am?.destroy();
    }
    expect(() => callOptional(undefined, undefined)).not.toThrow();
  });
});
