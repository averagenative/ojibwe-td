/**
 * Seeded pseudo-random number generator using the Mulberry32 algorithm.
 *
 * Phaser-free — safe for unit tests and Node.js scripts.
 *
 * Same seed always produces the same sequence of numbers.
 * Reference: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
 */
export class Rng {
  private _state: number;

  constructor(seed: number) {
    // Use bitwise OR to coerce to 32-bit integer; avoid 0 state.
    this._state = (seed | 0) || 1;
  }

  /**
   * Returns the next pseudo-random float in [0, 1).
   * Uses the Mulberry32 algorithm by Tommy Ettinger.
   */
  next(): number {
    this._state = (this._state + 0x6d2b79f5) | 0;
    let t = Math.imul(this._state ^ (this._state >>> 15), 1 | this._state);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a random integer in [min, max] inclusive.
   */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /**
   * Returns a random integer in [0, n) exclusive.
   */
  nextBelow(n: number): number {
    return Math.floor(this.next() * n);
  }

  /**
   * Shuffles an array in-place using Fisher-Yates.
   * Returns the same array reference.
   */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextBelow(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Returns a boolean with the given probability of being true (default 0.5).
   */
  chance(probability = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Returns a random element from the given array.
   * Throws if the array is empty.
   */
  nextItem<T>(arr: T[]): T {
    if (arr.length === 0) throw new RangeError('nextItem: array must not be empty');
    return arr[this.nextBelow(arr.length)];
  }

  /**
   * Creates a child Rng seeded from the current state mixed with an offset.
   * Useful for independent streams within the same overall seed.
   */
  fork(offset = 0): Rng {
    return new Rng((this._state ^ ((offset * 0x9e3779b9) | 0)) | 0);
  }

  /** Current internal state — useful for reproducibility assertions. */
  get state(): number {
    return this._state;
  }
}
