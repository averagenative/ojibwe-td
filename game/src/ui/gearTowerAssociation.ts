/**
 * UI helpers for deciding which tower a gear item should appear under.
 *
 * Universal gear can fit any tower, but once it is equipped it should only be
 * treated as belonging to the tower it is actually assigned to.
 */

export const UNIVERSAL_GEAR_FILTER = '__universal';

/** Prefer the actual equipped tower when deciding where a gear item is shown. */
export function resolveGearDisplayTowerKey(
  gearTypeTowerKey: string | null,
  equippedTowerKey: string | null,
): string | null {
  return equippedTowerKey ?? gearTypeTowerKey;
}

/**
 * Match a gear item against the InventoryScene tower filter.
 *
 * Unequipped universal items stay visible under all tower filters because they
 * can still be equipped there. Equipped universal items only show under the
 * tower that currently owns them.
 */
export function matchesGearInventoryFilter(
  activeFilter: string | null,
  gearTypeTowerKey: string | null,
  equippedTowerKey: string | null,
): boolean {
  if (activeFilter === null) return true;
  if (activeFilter === UNIVERSAL_GEAR_FILTER) return gearTypeTowerKey === null;

  if (gearTypeTowerKey === null) {
    return equippedTowerKey === null || equippedTowerKey === activeFilter;
  }

  return gearTypeTowerKey === activeFilter;
}
