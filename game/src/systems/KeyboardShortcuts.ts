/**
 * Keyboard shortcut guard logic.
 *
 * Pure functions used by GameScene to decide whether a keyboard shortcut
 * should fire given the current game state.  Extracted here so the guards
 * are testable without needing a full Phaser scene.
 */

export type ShortcutContext = {
  gameOver: boolean;
  bossOfferOpen: boolean;
  paused: boolean;
};

/**
 * Returns `true` when the shortcut should be **blocked** (i.e. not fire).
 *
 * @param ctx           Snapshot of current game state.
 * @param allowWhenPaused  `true` for Space / Esc which work while paused.
 */
export function isShortcutBlocked(
  ctx: ShortcutContext,
  allowWhenPaused = false,
): boolean {
  if (ctx.gameOver) return true;
  if (ctx.bossOfferOpen) return true;
  if (!allowWhenPaused && ctx.paused) return true;
  return false;
}
