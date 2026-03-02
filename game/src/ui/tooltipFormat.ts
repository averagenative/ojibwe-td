/**
 * Pure tooltip formatting helpers — NO Phaser import.
 * Safe to use in unit tests.
 */

/** Minimum margin between tooltip edge and screen edge. */
export const TOOLTIP_MARGIN = 4;

/** Format the damage / attack-interval line for a tower tooltip. */
export function formatDmgLine(def: { isAura?: boolean; damage: number; attackIntervalMs: number }): string {
  if (def.isAura) return 'passive';
  if (def.damage === 0) return `DoT  ·  ${(def.attackIntervalMs / 1000).toFixed(1)}s`;
  return `${def.damage} dmg  ·  ${(def.attackIntervalMs / 1000).toFixed(1)}s`;
}

/** Clamp the tooltip's left-edge X so it stays within the viewport. */
export function clampTooltipX(buttonCenterX: number, tooltipW: number, screenW: number): number {
  const rawLeft = buttonCenterX - tooltipW / 2;
  return Math.max(TOOLTIP_MARGIN, Math.min(rawLeft, screenW - tooltipW - TOOLTIP_MARGIN));
}
