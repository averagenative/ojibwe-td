/**
 * Pure visual-clarity helpers — no Phaser dependency.
 * Kept separate from entity files so they're unit-testable without mocks.
 */

/**
 * Compute an HP-bar fill colour that transitions green → yellow → red.
 * @param pct HP fraction in [0, 1].
 * @returns A packed 0xRRGG00 colour integer.
 */
export function hpBarColor(pct: number): number {
  const p = Math.max(0, Math.min(1, pct));
  // green→yellow in [1.0, 0.5], yellow→red in [0.5, 0.0]
  let r: number, g: number;
  if (p > 0.5) {
    // green → yellow: red rises from 0→255
    r = Math.round(255 * (1 - (p - 0.5) * 2));
    g = 255;
  } else {
    // yellow → red: green drops from 255→0
    r = 255;
    g = Math.round(255 * p * 2);
  }
  return (r << 16) | (g << 8) | 0x00;
}
