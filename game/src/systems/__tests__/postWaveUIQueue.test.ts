/**
 * Unit tests for PostWaveUIQueue.
 *
 * Covers:
 *   1. FIFO ordering — entries execute in enqueue order
 *   2. Sequential gating — second entry waits for first to dismiss
 *   3. flush() is a no-op when the queue is empty
 *   4. flush() is a no-op if already processing (no re-entry)
 *   5. isActive reflects processing state correctly
 *   6. size reflects pending (not yet started) entries
 *   7. clear() discards pending entries
 *   8. clear() mid-processing: subsequent onDismiss does not advance queue
 *   9. Three-entry sequence flows correctly
 */

import { describe, it, expect, vi } from 'vitest';
import { PostWaveUIQueue } from '../PostWaveUIQueue';

// ── 1. FIFO ordering ──────────────────────────────────────────────────────────

describe('PostWaveUIQueue — ordering', () => {
  it('executes entries in FIFO order (synchronous dismiss)', () => {
    const queue = new PostWaveUIQueue();
    const order: number[] = [];

    queue.enqueue({ show: (d) => { order.push(1); d(); } });
    queue.enqueue({ show: (d) => { order.push(2); d(); } });
    queue.enqueue({ show: (d) => { order.push(3); d(); } });
    queue.flush();

    expect(order).toEqual([1, 2, 3]);
  });

  it('second entry does not show until first calls onDismiss', () => {
    const queue = new PostWaveUIQueue();
    const spy1 = vi.fn();
    const spy2 = vi.fn();

    let firstDismiss = (): void => { /* noop */ };
    queue.enqueue({
      show: (onDismiss) => { spy1(); firstDismiss = onDismiss; },
    });
    queue.enqueue({ show: (d) => { spy2(); d(); } });
    queue.flush();

    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).not.toHaveBeenCalled();

    firstDismiss(); // dismiss first → second shows
    expect(spy2).toHaveBeenCalledTimes(1);
  });
});

// ── 2. flush() edge cases ─────────────────────────────────────────────────────

describe('PostWaveUIQueue — flush()', () => {
  it('flush() on empty queue is a no-op (does not throw)', () => {
    const queue = new PostWaveUIQueue();
    expect(() => queue.flush()).not.toThrow();
    expect(queue.isActive).toBe(false);
  });

  it('calling flush() twice while processing does not re-enter', () => {
    const queue = new PostWaveUIQueue();
    const spy = vi.fn();
    let savedDismiss = (): void => { /* noop */ };

    queue.enqueue({ show: (d) => { spy(); savedDismiss = d; } });
    queue.enqueue({ show: (d) => { spy(); d(); } });

    queue.flush();
    expect(spy).toHaveBeenCalledTimes(1);

    // Second flush while first entry is still showing
    queue.flush();
    expect(spy).toHaveBeenCalledTimes(1); // not called again

    savedDismiss(); // dismiss first
    expect(spy).toHaveBeenCalledTimes(2); // second entry now shows
  });
});

// ── 3. isActive ───────────────────────────────────────────────────────────────

describe('PostWaveUIQueue — isActive', () => {
  it('isActive is false before flush()', () => {
    const queue = new PostWaveUIQueue();
    queue.enqueue({ show: (_d) => { /* deferred */ } });
    expect(queue.isActive).toBe(false);
  });

  it('isActive is true while an entry is being shown', () => {
    const queue = new PostWaveUIQueue();
    let savedDismiss = (): void => { /* noop */ };
    queue.enqueue({ show: (d) => { savedDismiss = d; } });
    queue.flush();
    expect(queue.isActive).toBe(true);
    savedDismiss();
    expect(queue.isActive).toBe(false);
  });

  it('isActive is false after all synchronous entries are dismissed', () => {
    const queue = new PostWaveUIQueue();
    queue.enqueue({ show: (d) => d() });
    queue.enqueue({ show: (d) => d() });
    queue.flush();
    expect(queue.isActive).toBe(false);
  });
});

// ── 4. size ───────────────────────────────────────────────────────────────────

describe('PostWaveUIQueue — size', () => {
  it('size reflects the number of waiting (not yet started) entries', () => {
    const queue = new PostWaveUIQueue();
    let savedDismiss = (): void => { /* noop */ };

    queue.enqueue({ show: (d) => { savedDismiss = d; } });
    queue.enqueue({ show: (d) => d() });
    expect(queue.size).toBe(2);

    queue.flush();            // entry 1 starts (shifted off), entry 2 waiting
    expect(queue.size).toBe(1);

    savedDismiss();           // advance to entry 2 (which immediately dismisses)
    expect(queue.size).toBe(0);
  });
});

// ── 5. clear() ────────────────────────────────────────────────────────────────

describe('PostWaveUIQueue — clear()', () => {
  it('clear() discards all pending entries', () => {
    const queue = new PostWaveUIQueue();
    const spy = vi.fn();

    queue.enqueue({ show: (d) => d() });
    queue.enqueue({ show: () => spy() });
    queue.clear();

    expect(queue.size).toBe(0);
    expect(queue.isActive).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('clear() mid-processing: stale onDismiss does not advance to next entry', () => {
    const queue = new PostWaveUIQueue();
    const spy2 = vi.fn();
    let savedDismiss = (): void => { /* noop */ };

    queue.enqueue({ show: (d) => { savedDismiss = d; } });
    queue.enqueue({ show: () => spy2() });

    queue.flush();
    queue.clear(); // simulates game-over clearing the queue

    // Calling the captured dismiss after clear should not show entry 2
    savedDismiss();
    expect(spy2).not.toHaveBeenCalled();
  });

  it('re-enqueue after clear() works normally', () => {
    const queue = new PostWaveUIQueue();
    const spy = vi.fn();

    queue.enqueue({ show: () => spy() });
    queue.clear();

    // Re-enqueue and flush fresh batch
    queue.enqueue({ show: (d) => { spy(); d(); } });
    queue.flush();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ── 6. Three-entry sequence (full integration) ────────────────────────────────

describe('PostWaveUIQueue — three-entry post-wave sequence', () => {
  it('boss loot → elder dialog → upgrade offers run in order with deferred dismissals', () => {
    const queue = new PostWaveUIQueue();
    const calls: string[] = [];

    let dismissBossLoot = (): void => { /* noop */ };
    let dismissElderDialog = (): void => { /* noop */ };

    // 1. Boss loot
    queue.enqueue({
      show: (onDismiss) => {
        calls.push('boss-loot');
        dismissBossLoot = onDismiss;
      },
    });
    // 2. Elder dialog
    queue.enqueue({
      show: (onDismiss) => {
        calls.push('elder-dialog');
        dismissElderDialog = onDismiss;
      },
    });
    // 3. Upgrade offers (synchronously dismisses when shown)
    queue.enqueue({
      show: (onDismiss) => {
        calls.push('upgrade-offers');
        onDismiss();
      },
    });

    queue.flush();
    expect(calls).toEqual(['boss-loot']); // only first shown

    dismissBossLoot();
    expect(calls).toEqual(['boss-loot', 'elder-dialog']); // second shown

    dismissElderDialog();
    expect(calls).toEqual(['boss-loot', 'elder-dialog', 'upgrade-offers']); // third shown

    expect(queue.isActive).toBe(false); // all done
  });
});
