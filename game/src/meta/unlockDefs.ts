/**
 * Unlock tree definitions.
 *
 * Each node represents something purchasable with run currency in the MetaMenu.
 * Contains map unlocks and commander unlocks; tower/path unlocks can be added here later.
 *
 * Phaser-free.
 */

export type UnlockEffect =
  | { type: 'map';       mapId:      string }
  | { type: 'stage';     stageId:    string }
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
    cost:        400,
    prereqs:     [],
    effect:      { type: 'commander', commanderId: 'makoons' },
  },
  {
    id:          'unlock-commander-waabizii',
    label:       'Waabizii',
    description: 'Unlock Waabizii \u2014 the swan healer',
    cost:        500,
    prereqs:     [],
    effect:      { type: 'commander', commanderId: 'waabizii' },
  },
  {
    id:          'unlock-commander-bizhiw',
    label:       'Bizhiw',
    description: 'Unlock Bizhiw \u2014 the lynx hunter',
    cost:        650,
    prereqs:     [],
    effect:      { type: 'commander', commanderId: 'bizhiw' },
  },
  {
    id:          'unlock-commander-animikiikaa',
    label:       'Animikiikaa',
    description: 'Unlock Animikiikaa \u2014 the thunderbird',
    cost:        800,
    prereqs:     [],
    effect:      { type: 'commander', commanderId: 'animikiikaa' },
  },

  // ── Stage unlocks ─────────────────────────────────────────────────────────
  {
    id:          'unlock-stage-niizh-miikana-01',
    label:       'Niizh-miikana \u2014 Two Paths',
    description: 'Unlock the Two Paths stage: dual entrance map where creeps converge at a deadly chokepoint.',
    cost:        250,
    prereqs:     ['unlock-map-02'],
    effect:      { type: 'stage', stageId: 'niizh-miikana-01' },
  },
  {
    id:          'unlock-stage-mitigomizh-01',
    label:       'Mitigomizh \u2014 Oak Savanna Run',
    description: 'Unlock the Oak Savanna Run stage: open ground with few chokepoints and high AoE demand.',
    cost:        500,
    prereqs:     ['unlock-map-02'],
    effect:      { type: 'stage', stageId: 'mitigomizh-01' },
  },
  {
    id:          'unlock-stage-mitigomizh-02',
    label:       'Mitigomizh \u2014 Firebreak Trail',
    description: 'Unlock the Firebreak Trail stage: a hook-shaped path through scorched oak savanna.',
    cost:        600,
    prereqs:     ['unlock-stage-mitigomizh-01'],
    effect:      { type: 'stage', stageId: 'mitigomizh-02' },
  },
  {
    id:          'unlock-stage-mitigomizh-03',
    label:       'Mitigomizh \u2014 Burnt Ridge',
    description: 'Unlock the Burnt Ridge stage: creeps descend from the ridge into charred lowlands.',
    cost:        750,
    prereqs:     ['unlock-stage-mitigomizh-02'],
    effect:      { type: 'stage', stageId: 'mitigomizh-03' },
  },
  {
    id:          'unlock-stage-biboon-aki-01',
    label:       'Biboon-aki \u2014 Frozen Crossing',
    description: 'Unlock the Frozen Crossing stage: a challenging winter map where frost towers are amplified.',
    cost:        700,
    prereqs:     ['unlock-stage-mitigomizh-01'],
    effect:      { type: 'stage', stageId: 'biboon-aki-01' },
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

/** Look up the unlock node required to access a given stageId. */
export function getStageUnlockNode(stageId: string): UnlockNode | undefined {
  return UNLOCK_NODES.find(
    n => n.effect.type === 'stage' &&
      (n.effect as { type: 'stage'; stageId: string }).stageId === stageId,
  );
}

/** Stage IDs that require a meta-unlock to play. */
export const LOCKED_STAGE_IDS: string[] = UNLOCK_NODES
  .filter(n => n.effect.type === 'stage')
  .map(n => (n.effect as { type: 'stage'; stageId: string }).stageId);
