/** Fraction of total spent (tower + upgrades) returned on sell */
const SELL_REFUND_RATE = 0.7;

/**
 * Calculate gold refunded when selling a tower.
 * @param totalSpent - Total gold spent on tower placement + all upgrades
 */
export function calculateSellRefund(totalSpent: number): number {
  return Math.floor(totalSpent * SELL_REFUND_RATE);
}

/**
 * Calculate wave completion bonus gold.
 * Base bonus scales with wave number so later waves feel more rewarding.
 * @param waveNumber - 1-indexed current wave
 * @param baseBonus  - Flat bonus before scaling (default 50)
 */
export function calculateWaveBonus(waveNumber: number, baseBonus = 50): number {
  return baseBonus + Math.floor(waveNumber * 10);
}

/**
 * Calculate run currency earned at run end.
 * Failed runs earn less than completed runs.
 * @param wavesCompleted - How many waves the player finished
 * @param totalWaves     - Total waves in the run (default 20)
 * @param completed      - Whether the player cleared all waves
 */
export function calculateRunCurrency(
  wavesCompleted: number,
  totalWaves = 20,
  completed = false,
): number {
  // Scale base currency by fraction of run completed (max 100)
  const base = Math.floor((wavesCompleted / totalWaves) * 100);
  const completionBonus = completed ? 50 : 0;
  return base + completionBonus;
}
