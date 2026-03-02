/**
 * MoonRating — performance rating (1–5 moons) for a completed stage run.
 *
 * The Ojibwe word for moon is "dibiki-giizis" (night sun).
 *
 * Phaser-free — safe for use in unit tests and any non-game context.
 */

/**
 * Calculate a 1–5 moon rating based on run performance.
 *
 * Thresholds (evaluated top-down, first match wins):
 *   5 — full health (zero lives lost) + all waves cleared
 *   4 — lost ≤ 20 % of lives + all waves cleared
 *   3 — lost ≤ 50 % of lives + all waves cleared
 *   2 — cleared all waves (any lives remaining)
 *   1 — cleared at least 75 % of waves (partial clear / survived)
 *
 * @param livesLeft    Lives remaining at end of run.
 * @param maxLives     Maximum lives the run started with.
 * @param wavesCleared Number of waves the player cleared.
 * @param totalWaves   Total waves in the stage.
 * @returns Integer in the range [1, 5].
 */
export function calculateMoons(
  livesLeft:    number,
  maxLives:     number,
  wavesCleared: number,
  totalWaves:   number,
): number {
  const allCleared   = wavesCleared >= totalWaves;
  const safeMax      = Math.max(maxLives, 1);
  // Clamp to [0, 1] so over-healed runs (livesLeft > maxLives) are treated as full health.
  const lostFraction = Math.max(0, Math.min(1, (safeMax - livesLeft) / safeMax));

  if (allCleared && lostFraction === 0)   return 5;
  if (allCleared && lostFraction <= 0.20) return 4;
  if (allCleared && lostFraction <= 0.50) return 3;
  if (allCleared)                         return 2;
  if (wavesCleared >= totalWaves * 0.75)  return 1;
  return 1; // minimum — callers may choose not to save this rating
}

/** Human-readable label for a moon rating (1–5). */
export function moonRatingLabel(moons: number): string {
  switch (moons) {
    case 5:  return 'Full Moon!';
    case 4:  return 'Waxing Gibbous';
    case 3:  return 'Half Moon';
    case 2:  return 'Crescent';
    default: return 'New Moon';
  }
}

/**
 * Return the unicode moon symbol string for a given slot index (0-based) and
 * total earned moon count.  Filled symbol for earned slots, empty for the rest.
 */
export function moonSymbol(slotIndex: number, moonsEarned: number): string {
  return slotIndex < moonsEarned ? '🌕' : '🌑';
}
