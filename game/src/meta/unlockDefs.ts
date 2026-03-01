/**
 * Unlock tree definitions.
 *
 * Each node represents something purchasable with run currency in the MetaMenu.
 * Contains map unlocks and commander unlocks; tower/path unlocks can be added here later.
 *
 * Phaser-free.
 */

export type UnlockEffect =
  | { type: 'map'; mapId: string }
  | { type: 'commander'; commanderId: string };

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
  {
    id:          'unlock-commander-makoons',
    label:       'Makoons',
    description: 'Unlock Makoons \u2014 the bear spirit warrior',
    cost:        8,
    prereqs:     [],
    effect:      { type: 'commander', commanderId: 'makoons' },
  },
  {
    id:          'unlock-commander-waabizii',
    label:       'Waabizii',
    description: 'Unlock Waabizii \u2014 the swan healer',
    cost:        8,
    prereqs:     [],
    effect:      { type: 'commander', commanderId: 'waabizii' },
  },
  {
    id:          'unlock-commander-bizhiw',
    label:       'Bizhiw',
    description: 'Unlock Bizhiw \u2014 the lynx hunter',
    cost:        12,
    prereqs:     [],
    effect:      { type: 'commander', commanderId: 'bizhiw' },
  },
  {
    id:          'unlock-commander-animikiikaa',
    label:       'Animikiikaa',
    description: 'Unlock Animikiikaa \u2014 the thunderbird',
    cost:        16,
    prereqs:     [],
    effect:      { type: 'commander', commanderId: 'animikiikaa' },
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

/** Look up the unlock node required to access a given commanderId. */
export function getCommanderUnlockNode(commanderId: string): UnlockNode | undefined {
  return UNLOCK_NODES.find(
    n => n.effect.type === 'commander' &&
      (n.effect as { type: 'commander'; commanderId: string }).commanderId === commanderId,
  );
}
