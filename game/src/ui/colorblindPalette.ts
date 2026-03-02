/**
 * Colorblind-friendly palette helpers.
 *
 * When colorblind mode is active the key gameplay colours shift:
 *   Green  → Blue   (valid placement, ground wave badges, active accents)
 *   Red    → Orange (invalid placement, boss/danger indicators)
 *
 * This covers the most common red-green colour vision deficiency (deuteranopia /
 * protanopia) affecting ~8 % of male players.
 *
 * All functions read the current SaveManager setting at call time so UI built
 * before the toggle changes reflects the updated preference on the next render.
 *
 * Phaser-free — safe for use in any context.
 */

import { PAL } from './palette';
import { SaveManager } from '../meta/SaveManager';

// ── Shifted palette values (numeric 0xRRGGBB) ────────────────────────────────

/** Colorblind valid fill — lake blue (replaces earthy green 0x2a8020). */
export const CB_VALID_FILL    = 0x2255cc;
/** Colorblind invalid fill — amber orange (replaces warm red 0xaa2800). */
export const CB_INVALID_FILL  = 0xdd7722;
/** Colorblind valid accent — blue (replaces marsh green 0x6B8F3E). */
export const CB_VALID_ACCENT  = 0x2255cc;
/** Colorblind invalid accent — amber orange (replaces ember red 0xb84c2a). */
export const CB_INVALID_ACCENT = 0xdd7722;
/** Colorblind ground-wave badge — steel blue (replaces earthy green). */
export const CB_GROUND_BADGE  = 0x2266aa;
/** Colorblind boss-wave badge — vivid orange (replaces deep ember red). */
export const CB_BOSS_BADGE    = 0xdd6611;

// ── Mode query ────────────────────────────────────────────────────────────────

/** Returns true when the player has enabled the colorblind-friendly palette. */
export function isColorblindMode(): boolean {
  return SaveManager.getInstance().getColorblindMode();
}

// ── Colour selectors ─────────────────────────────────────────────────────────

/** Fill colour for a valid tower-placement tile. */
export function cbPlacementValidFill(): number {
  return isColorblindMode() ? CB_VALID_FILL : PAL.bgPlacementValid;
}

/** Fill colour for an invalid tower-placement tile. */
export function cbPlacementInvalidFill(): number {
  return isColorblindMode() ? CB_INVALID_FILL : PAL.bgPlacementInvalid;
}

/** Accent colour (border / range ring) for a valid placement. */
export function cbValidAccent(): number {
  return isColorblindMode() ? CB_VALID_ACCENT : PAL.accentGreenN;
}

/** Accent colour (border / range ring) for an invalid placement. */
export function cbInvalidAccent(): number {
  return isColorblindMode() ? CB_INVALID_ACCENT : PAL.dangerN;
}

/** Fill colour for a ground-wave type badge. */
export function cbGroundBadgeFill(): number {
  return isColorblindMode() ? CB_GROUND_BADGE : PAL.accentGreenN;
}

/** Fill colour for a boss-wave type badge. */
export function cbBossBadgeFill(): number {
  return isColorblindMode() ? CB_BOSS_BADGE : PAL.bossWarningN;
}
