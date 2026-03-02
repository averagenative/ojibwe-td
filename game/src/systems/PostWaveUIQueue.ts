/**
 * PostWaveUIQueue — serialises the end-of-wave UI panels so they appear
 * one at a time in priority order:
 *   1. Boss loot/gear reward (boss waves only)
 *   2. Elder dialog (if any vignette matches)
 *   3. Between-wave upgrade offers (BetweenWaveScene)
 *
 * Each entry provides a `show(onDismiss)` function.  When the player
 * dismisses the panel, `onDismiss` must be called to advance to the next
 * entry.  Call `flush()` once after all entries for a wave are enqueued.
 *
 * Phaser-free — safe for unit tests.
 */

export interface PostWaveEntry {
  /** Show this panel; call `onDismiss` when the player dismisses it. */
  show: (onDismiss: () => void) => void;
}

export class PostWaveUIQueue {
  private readonly _queue: PostWaveEntry[] = [];
  private _active = false;

  /** Append an entry to the tail of the queue. */
  enqueue(entry: PostWaveEntry): void {
    this._queue.push(entry);
  }

  /**
   * Begin processing the queue from the front.
   * No-op if already processing.  Call after all entries for this
   * post-wave window have been enqueued.
   */
  flush(): void {
    if (!this._active) this._next();
  }

  /**
   * Discard all pending entries and mark the queue as inactive.
   * Call on game-over so stale panels cannot appear after the run ends.
   */
  clear(): void {
    this._queue.length = 0;
    this._active = false;
  }

  /** Number of entries waiting to be shown (does not count the active entry). */
  get size(): number { return this._queue.length; }

  /** True while a panel is currently being shown. */
  get isActive(): boolean { return this._active; }

  private _next(): void {
    const entry = this._queue.shift();
    if (!entry) {
      this._active = false;
      return;
    }
    this._active = true;
    entry.show(() => this._next());
  }
}
