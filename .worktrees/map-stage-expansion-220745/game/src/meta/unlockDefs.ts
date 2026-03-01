/**
 * Unlock tree definitions.
 *
 * Each node represents something purchasable with run currency in the MetaMenu.
 * Contains map/stage unlocks; tower/path unlocks can be added later.
 *
 * Phaser-free.
 */

export type UnlockEffect =
  | { type: 'map';   mapId:   string }
  | { type: 'stage'; stageId: string };

export interface UnlockNode {
  id:          string;
  label:       string;
  description: string;
  cost:        number;
  prereqs:     string[];
  effect:      UnlockEffect;
}

export const UNLOCK_NODES: UnlockNode[] = [
  // ── backward-compat: Phase 10 map-02 unlock (alias for mashkiig-01) ────────
  {
    id:          'unlock-map-02',
    label:       'Wetland Crossing',
    description: 'Unlock Mashkiig (Wetlands) — a serpentine marsh path that favours AoE towers and poison.',
    cost:        300,
    prereqs:     [],
    effect:      { type: 'stage', stageId: 'mashkiig-01' },
  },

  // ── Mitigomizh (Oak Savanna) ──────────────────────────────────────────────
  {
    id:          'unlock-mitigomizh',
    label:       'Mitigomizh (Oak Savanna)',
    description: 'Unlock Mitigomizh — broad open ground with few chokepoints. AoE and wide coverage are essential.',
    cost:        500,
    prereqs:     ['unlock-map-02'],
    effect:      { type: 'stage', stageId: 'mitigomizh-01' },
  },

  // ── Biboon-aki (Winter Lands) ─────────────────────────────────────────────
  {
    id:          'unlock-biboon-aki',
    label:       'Biboon-aki (Winter Lands)',
    description: 'Unlock Biboon-aki — icy terrain that empowers Frost towers. Creeps move faster in the cold.',
    cost:        700,
    prereqs:     ['unlock-mitigomizh'],
    effect:      { type: 'stage', stageId: 'biboon-aki-01' },
  },
];

// ── Derived helpers ───────────────────────────────────────────────────────────

/** Stage IDs that require a meta-unlock to play. */
export const LOCKED_STAGE_IDS: string[] = UNLOCK_NODES
  .filter(n => n.effect.type === 'stage')
  .map(n => (n.effect as { type: 'stage'; stageId: string }).stageId);

/**
 * @deprecated Use getStageUnlockNode().
 * Map IDs that require a meta-unlock — kept for backward compat.
 */
export const LOCKED_MAP_IDS: string[] = UNLOCK_NODES
  .filter(n => n.effect.type === 'map')
  .map(n => (n.effect as { type: 'map'; mapId: string }).mapId);

/** Look up the unlock node required to access a given stageId. */
export function getStageUnlockNode(stageId: string): UnlockNode | undefined {
  return UNLOCK_NODES.find(
    n => n.effect.type === 'stage' &&
         (n.effect as { type: 'stage'; stageId: string }).stageId === stageId,
  );
}

/** Look up the unlock node required to access a given mapId (legacy). */
export function getMapUnlockNode(mapId: string): UnlockNode | undefined {
  return UNLOCK_NODES.find(
    n => n.effect.type === 'map' &&
         (n.effect as { type: 'map'; mapId: string }).mapId === mapId,
  );
}
