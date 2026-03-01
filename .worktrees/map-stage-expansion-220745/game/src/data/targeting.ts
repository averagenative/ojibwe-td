/**
 * Tower targeting priority and behavioral toggles.
 * Pure module — no Phaser import — safe for unit tests.
 */

// ── TargetingPriority ─────────────────────────────────────────────────────────
//
// Declared as a const object + type union instead of a TypeScript enum so the
// project's erasableSyntaxOnly setting is satisfied (enums have runtime state
// and therefore cannot be erased).

/** Which creep a tower prefers to target each attack cycle. */
export const TargetingPriority = {
  /** Furthest along the path (closest to exit). */
  FIRST:       'FIRST',
  /** Closest to spawn (least progress along path). */
  LAST:        'LAST',
  /** Highest current HP. */
  STRONGEST:   'STRONGEST',
  /** Lowest current HP. */
  WEAKEST:     'WEAKEST',
  /** Nearest to the tower. */
  CLOSEST:     'CLOSEST',
  /** Most active DoT stacks + Frost chill (each counted separately). */
  MOST_BUFFED: 'MOST_BUFFED',
} as const;

/** Union of all valid targeting priority strings. */
export type TargetingPriority = typeof TargetingPriority[keyof typeof TargetingPriority];

export const ALL_PRIORITIES: TargetingPriority[] = [
  TargetingPriority.FIRST,
  TargetingPriority.LAST,
  TargetingPriority.STRONGEST,
  TargetingPriority.WEAKEST,
  TargetingPriority.CLOSEST,
  TargetingPriority.MOST_BUFFED,
];

/** Short display labels for each priority (used by BehaviorPanel). */
export const PRIORITY_LABEL: Record<TargetingPriority, string> = {
  [TargetingPriority.FIRST]:       'FIRST',
  [TargetingPriority.LAST]:        'LAST',
  [TargetingPriority.STRONGEST]:   'STRONG',
  [TargetingPriority.WEAKEST]:     'WEAK',
  [TargetingPriority.CLOSEST]:     'NEAR',
  [TargetingPriority.MOST_BUFFED]: 'BUFFED',
};

// ── TowerBehaviorToggles ──────────────────────────────────────────────────────

/** Per-tower behavioral toggles — no gold cost, freely flippable at any time. */
export interface TowerBehaviorToggles {
  /** Cannon: prioritize armored creep subtypes over default priority. */
  armorFocus: boolean;
  /** Frost: apply slow but never trigger a full freeze (preserves Poison DoT stacks). */
  chillOnly: boolean;
  /** Mortar: pause firing (useful to avoid disrupting Frost slow zones). */
  holdFire: boolean;
  /** Poison: maintain at most 1 DoT stack per creep (optimises spread efficiency). */
  maintainOneStack: boolean;
  /** Tesla: prefer chaining toward enemies closer to the exit. */
  chainToExit: boolean;
}

export function defaultBehaviorToggles(): TowerBehaviorToggles {
  return {
    armorFocus:      false,
    chillOnly:       false,
    holdFire:        false,
    maintainOneStack: false,
    chainToExit:     false,
  };
}

// ── Targetable — minimal interface for pickTarget ─────────────────────────────

/**
 * Minimal interface a creep candidate must satisfy for priority-based selection.
 * Implemented by Creep; also satisfied by plain-object test mocks.
 */
export interface Targetable {
  readonly active:    boolean;
  readonly isArmored: boolean;
  readonly x:         number;
  readonly y:         number;
  getCurrentHp():     number;
  getProgressScore(): number;
  getBuffCount():     number;
}

// ── pickTarget — pure targeting utility ───────────────────────────────────────

/**
 * Select the best target from `candidates` according to `priority`.
 *
 * All candidates are assumed to be in range — the caller must pre-filter
 * by range.  Inactive candidates are always skipped.
 *
 * Returns `null` if no active candidate is found.
 */
export function pickTarget<T extends Targetable>(
  candidates: readonly T[],
  priority:   TargetingPriority,
  towerX:     number,
  towerY:     number,
): T | null {
  let best: T | null = null;
  for (const c of candidates) {
    if (!c.active) continue;
    if (best === null || isBetter(c, best, priority, towerX, towerY)) {
      best = c;
    }
  }
  return best;
}

/**
 * Returns true if `a` is a strictly better target than `b`
 * under the given priority.
 */
function isBetter<T extends Targetable>(
  a:        T,
  b:        T,
  priority: TargetingPriority,
  towerX:   number,
  towerY:   number,
): boolean {
  switch (priority) {
    case TargetingPriority.FIRST:
      return a.getProgressScore() > b.getProgressScore();

    case TargetingPriority.LAST:
      return a.getProgressScore() < b.getProgressScore();

    case TargetingPriority.STRONGEST:
      return a.getCurrentHp() > b.getCurrentHp();

    case TargetingPriority.WEAKEST:
      return a.getCurrentHp() < b.getCurrentHp();

    case TargetingPriority.CLOSEST: {
      const da = Math.hypot(a.x - towerX, a.y - towerY);
      const db = Math.hypot(b.x - towerX, b.y - towerY);
      return da < db;
    }

    case TargetingPriority.MOST_BUFFED:
      return a.getBuffCount() > b.getBuffCount();
  }
}
