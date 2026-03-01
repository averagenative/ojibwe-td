/**
 * Unlock tree definitions.
 *
 * Each node represents something purchasable with run currency in the MetaMenu.
 * Currently contains map unlocks only; tower/path unlocks can be added here later.
 *
 * Phaser-free.
 */

export type UnlockEffect =
  | { type: 'map'; mapId: string };

export interface UnlockNode {
  id:          string;
  label:       string;
  description: string;
  cost:        number;
  prereqs:     string[];
  effect:      UnlockEffect;
}

export const UNLOCK_NODES: UnlockNode[] = [
  {
    id:          'unlock-map-02',
    label:       'Wetland Crossing',
    description: 'Unlock the second map: a serpentine marsh path that favours AoE towers.',
    cost:        300,
    prereqs:     [],
    effect:      { type: 'map', mapId: 'map-02' },
  },
];

/** Map IDs that require a meta-unlock to play. */
export const LOCKED_MAP_IDS: string[] = UNLOCK_NODES
  .filter(n => n.effect.type === 'map')
  .map(n => (n.effect as { type: 'map'; mapId: string }).mapId);

/** Look up the unlock node required to access a given mapId. */
export function getMapUnlockNode(mapId: string): UnlockNode | undefined {
  return UNLOCK_NODES.find(
    n => n.effect.type === 'map' && (n.effect as { type: 'map'; mapId: string }).mapId === mapId,
  );
}
