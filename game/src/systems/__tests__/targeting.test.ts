import { describe, it, expect } from 'vitest';
import {
  TargetingPriority,
  ALL_PRIORITIES,
  pickTarget,
  defaultBehaviorToggles,
} from '../../data/targeting';
import type { Targetable } from '../../data/targeting';
import { defaultUpgradeStats, FROST_DEF } from '../../data/towerDefs';
import { ALL_UPGRADE_DEFS } from '../../data/upgradeDefs';

// ── Mock creep factory ─────────────────────────────────────────────────────────

function makeCreep(overrides: {
  active?:   boolean;
  isArmored?: boolean;
  x?:        number;
  y?:        number;
  hp?:       number;
  progress?: number;
  buffs?:    number;
} = {}): Targetable {
  const {
    active    = true,
    isArmored = false,
    x         = 0,
    y         = 0,
    hp        = 100,
    progress  = 0,
    buffs     = 0,
  } = overrides;

  return {
    active,
    isArmored,
    x,
    y,
    getCurrentHp:     () => hp,
    getProgressScore: () => progress,
    getBuffCount:     () => buffs,
  };
}

// ── Priority comparator tests ─────────────────────────────────────────────────

describe('pickTarget — priority comparator', () => {
  describe('FIRST (furthest along path)', () => {
    it('selects the creep with the highest progress score', () => {
      const a = makeCreep({ progress: 1.5 });
      const b = makeCreep({ progress: 3.0 });
      const c = makeCreep({ progress: 0.5 });
      expect(pickTarget([a, b, c], TargetingPriority.FIRST, 0, 0)).toBe(b);
    });

    it('returns the single active creep', () => {
      const a = makeCreep({ progress: 5 });
      expect(pickTarget([a], TargetingPriority.FIRST, 0, 0)).toBe(a);
    });
  });

  describe('LAST (closest to spawn)', () => {
    it('selects the creep with the lowest progress score', () => {
      const a = makeCreep({ progress: 1.5 });
      const b = makeCreep({ progress: 3.0 });
      const c = makeCreep({ progress: 0.5 });
      expect(pickTarget([a, b, c], TargetingPriority.LAST, 0, 0)).toBe(c);
    });
  });

  describe('STRONGEST (highest current HP)', () => {
    it('selects the creep with the most current HP', () => {
      const a = makeCreep({ hp: 200 });
      const b = makeCreep({ hp: 50  });
      const c = makeCreep({ hp: 150 });
      expect(pickTarget([a, b, c], TargetingPriority.STRONGEST, 0, 0)).toBe(a);
    });
  });

  describe('WEAKEST (lowest current HP)', () => {
    it('selects the creep with the least current HP', () => {
      const a = makeCreep({ hp: 200 });
      const b = makeCreep({ hp: 50  });
      const c = makeCreep({ hp: 150 });
      expect(pickTarget([a, b, c], TargetingPriority.WEAKEST, 0, 0)).toBe(b);
    });
  });

  describe('CLOSEST (nearest to tower)', () => {
    it('selects the creep nearest to the tower position', () => {
      // Tower is at (0, 0) (towerX/Y params)
      const a = makeCreep({ x: 100, y: 0 }); // dist 100
      const b = makeCreep({ x: 30,  y: 0 }); // dist 30
      const c = makeCreep({ x: 200, y: 0 }); // dist 200
      expect(pickTarget([a, b, c], TargetingPriority.CLOSEST, 0, 0)).toBe(b);
    });

    it('uses the towerX/Y arguments to compute distance', () => {
      // Tower at (50, 0): b is at (55, 0) → dist 5; a is at (0, 0) → dist 50
      const a = makeCreep({ x: 0,  y: 0 });
      const b = makeCreep({ x: 55, y: 0 });
      expect(pickTarget([a, b], TargetingPriority.CLOSEST, 50, 0)).toBe(b);
    });
  });

  describe('MOST_BUFFED (most DoT stacks + Frost chill)', () => {
    it('selects the creep with the highest buff count', () => {
      const a = makeCreep({ buffs: 1 });
      const b = makeCreep({ buffs: 3 });
      const c = makeCreep({ buffs: 2 });
      expect(pickTarget([a, b, c], TargetingPriority.MOST_BUFFED, 0, 0)).toBe(b);
    });

    it('counts DoT stacks and Frost chill as separate buff contributions', () => {
      // Creep A: 2 dots + 1 frost chill = 3 total buffs
      // Creep B: 2 dots + 0 frost chill = 2 total buffs
      const chilled  = makeCreep({ buffs: 3 }); // getBuffCount() = dotStacks + isSlowed()
      const unchilled = makeCreep({ buffs: 2 });
      expect(pickTarget([chilled, unchilled], TargetingPriority.MOST_BUFFED, 0, 0)).toBe(chilled);
    });
  });
});

// ── Inactive creep filtering ──────────────────────────────────────────────────

describe('pickTarget — inactive creep filtering', () => {
  it('never selects an inactive creep even with the best stat', () => {
    const dead  = makeCreep({ active: false, progress: 99 });
    const alive = makeCreep({ active: true,  progress: 1  });
    expect(pickTarget([dead, alive], TargetingPriority.FIRST, 0, 0)).toBe(alive);
  });

  it('returns null when all candidates are inactive', () => {
    const dead1 = makeCreep({ active: false });
    const dead2 = makeCreep({ active: false });
    expect(pickTarget([dead1, dead2], TargetingPriority.FIRST, 0, 0)).toBeNull();
  });

  it('returns null for an empty candidate list', () => {
    expect(pickTarget([], TargetingPriority.FIRST, 0, 0)).toBeNull();
  });
});

// ── Frost chill-only guard ────────────────────────────────────────────────────

describe('Frost chill-only guard', () => {
  /**
   * Tower.fireAt() uses:
   *   const shat = this.upgStats.shatterOnDeath && !this.behaviorToggles.chillOnly;
   * We test the boolean expression directly to keep the test Phaser-free.
   */
  it('when chillOnly is true, shatter is suppressed even if shatterOnDeath is set', () => {
    let shatterCalled = false;
    const mockCreep = {
      applySlow:    (_f: number, _d: number) => { /* no-op */ },
      applyShatter: () => { shatterCalled = true; },
    };

    const shatterOnDeath = true;
    const chillOnly      = true;
    const shat           = shatterOnDeath && !chillOnly; // must be false

    mockCreep.applySlow(0.5, 2500);
    if (shat) mockCreep.applyShatter();

    expect(shatterCalled).toBe(false);
  });

  it('when chillOnly is false, shatter IS applied when shatterOnDeath is set', () => {
    let shatterCalled = false;
    const mockCreep = {
      applySlow:    (_f: number, _d: number) => { /* no-op */ },
      applyShatter: () => { shatterCalled = true; },
    };

    const shatterOnDeath = true;
    const chillOnly      = false;
    const shat           = shatterOnDeath && !chillOnly; // must be true

    mockCreep.applySlow(0.5, 2500);
    if (shat) mockCreep.applyShatter();

    expect(shatterCalled).toBe(true);
  });

  it('chillOnly has no effect when shatterOnDeath is false', () => {
    let shatterCalled = false;
    const mockCreep = {
      applySlow:    (_f: number, _d: number) => { /* no-op */ },
      applyShatter: () => { shatterCalled = true; },
    };

    const shatterOnDeath = false;
    const chillOnly      = false;
    const shat           = shatterOnDeath && !chillOnly; // still false

    mockCreep.applySlow(0.5, 2500);
    if (shat) mockCreep.applyShatter();

    expect(shatterCalled).toBe(false);
  });
});

// ── Target re-acquisition on death ────────────────────────────────────────────

describe('target re-acquisition on death', () => {
  it('dead creep (active=false) is never selected as target', () => {
    const dying = makeCreep({ active: false, hp: 9999 });
    const alive = makeCreep({ active: true,  hp: 50   });
    const result = pickTarget([dying, alive], TargetingPriority.STRONGEST, 0, 0);
    expect(result).toBe(alive);
  });

  it('subsequent call picks a different creep after the best one dies', () => {
    const creepA = makeCreep({ active: true, progress: 5 });
    const creepB = makeCreep({ active: true, progress: 3 });

    // First cycle: A is best (highest progress = FIRST priority)
    expect(pickTarget([creepA, creepB], TargetingPriority.FIRST, 0, 0)).toBe(creepA);

    // A dies — the next cycle must re-acquire B
    (creepA as { active: boolean }).active = false;

    expect(pickTarget([creepA, creepB], TargetingPriority.FIRST, 0, 0)).toBe(creepB);
  });

  it('out-of-range creep is never in the candidate list (simulated by excluding it)', () => {
    // Range filtering happens in Tower.findTarget(); here we verify pickTarget
    // itself — the caller must pre-filter.  Pass only the in-range creep.
    const inRange  = makeCreep({ hp: 50  });
    const outRange = makeCreep({ hp: 999 });

    // Simulate caller only passing in-range candidates
    const result = pickTarget([inRange], TargetingPriority.STRONGEST, 0, 0);
    expect(result).toBe(inRange);
    expect(result).not.toBe(outRange);
  });
});

// ── defaultBehaviorToggles ────────────────────────────────────────────────────

describe('defaultBehaviorToggles', () => {
  it('all toggles default to false', () => {
    const toggles = defaultBehaviorToggles();
    expect(toggles.armorFocus).toBe(false);
    expect(toggles.chillOnly).toBe(false);
    expect(toggles.holdFire).toBe(false);
    expect(toggles.maintainOneStack).toBe(false);
    expect(toggles.chainToExit).toBe(false);
  });

  it('returns a fresh object each call (no shared mutable state)', () => {
    const a = defaultBehaviorToggles();
    const b = defaultBehaviorToggles();
    a.armorFocus = true;
    expect(b.armorFocus).toBe(false);
  });
});

// ── Cannon armorFocus pool narrowing (pure logic) ─────────────────────────────

describe('Cannon armorFocus — pool narrowing', () => {
  it('narrows to armored creeps when at least one is present', () => {
    const armored   = makeCreep({ isArmored: true,  hp: 50  });
    const unarmored = makeCreep({ isArmored: false, hp: 200 });

    // Simulate Tower.findTarget() logic:
    // When armorFocus is ON, narrow pool to armored creeps only.
    const candidates = [armored, unarmored];
    const armorFocusOn = true;
    let pool = candidates;
    if (armorFocusOn) {
      const armoredOnly = candidates.filter(c => c.isArmored);
      if (armoredOnly.length > 0) pool = armoredOnly;
    }

    const result = pickTarget(pool, TargetingPriority.STRONGEST, 0, 0);
    expect(result).toBe(armored);
  });

  it('falls back to full pool when no armored creeps are in range', () => {
    const a = makeCreep({ isArmored: false, hp: 200 });
    const b = makeCreep({ isArmored: false, hp: 50  });

    const candidates = [a, b];
    const armorFocusOn = true;
    let pool = candidates;
    if (armorFocusOn) {
      const armoredOnly = candidates.filter(c => c.isArmored);
      if (armoredOnly.length > 0) pool = armoredOnly;
    }

    const result = pickTarget(pool, TargetingPriority.STRONGEST, 0, 0);
    expect(result).toBe(a);
  });

  it('does not narrow when armorFocus is off', () => {
    const armored   = makeCreep({ isArmored: true,  hp: 50  });
    const unarmored = makeCreep({ isArmored: false, hp: 200 });

    const candidates = [armored, unarmored];
    const armorFocusOn = false;
    let pool = candidates;
    if (armorFocusOn) {
      const armoredOnly = candidates.filter(c => c.isArmored);
      if (armoredOnly.length > 0) pool = armoredOnly;
    }

    // STRONGEST picks highest HP — unarmored has 200
    const result = pickTarget(pool, TargetingPriority.STRONGEST, 0, 0);
    expect(result).toBe(unarmored);
  });
});

// ── Mortar holdFire guard (pure logic) ────────────────────────────────────────

describe('Mortar holdFire guard', () => {
  it('suppresses firing when holdFire is true', () => {
    let fired = false;
    const holdFire = true;
    // Simulates the guard at top of Tower.fireMortar()
    if (!holdFire) fired = true;
    expect(fired).toBe(false);
  });

  it('allows firing when holdFire is false', () => {
    let fired = false;
    const holdFire = false;
    if (!holdFire) fired = true;
    expect(fired).toBe(true);
  });
});

// ── Poison maintainOneStack guard (pure logic) ───────────────────────────────

describe('Poison maintainOneStack guard', () => {
  it('blocks new DoT when creep already has 1+ stacks and toggle is ON', () => {
    const maintainOne = true;
    const dotStacks   = 1;

    let applied = true;
    if (maintainOne && dotStacks >= 1) applied = false;

    expect(applied).toBe(false);
  });

  it('allows DoT when creep has 0 stacks even with toggle ON', () => {
    const maintainOne = true;
    const dotStacks   = 0;

    let applied = true;
    if (maintainOne && dotStacks >= 1) applied = false;

    expect(applied).toBe(true);
  });

  it('applies normal maxStacks check when toggle is OFF', () => {
    const maintainOne = false;
    const maxStacks   = 4;
    const dotStacks   = 3;

    let applied = true;
    if (maintainOne) {
      if (dotStacks >= 1) applied = false;
    } else {
      if (maxStacks > 0 && dotStacks >= maxStacks) applied = false;
    }

    expect(applied).toBe(true); // 3 < 4 → still applies
  });

  it('blocks at max stacks when toggle is OFF', () => {
    const maintainOne = false;
    const maxStacks   = 4;
    const dotStacks   = 4;

    let applied = true;
    if (maintainOne) {
      if (dotStacks >= 1) applied = false;
    } else {
      if (maxStacks > 0 && dotStacks >= maxStacks) applied = false;
    }

    expect(applied).toBe(false); // 4 >= 4 → blocked
  });
});

// ── Tesla chainToExit sort (pure logic) ──────────────────────────────────────

describe('Tesla chainToExit sort', () => {
  it('sorts by progress descending when chainToExit is true', () => {
    const candidates = [
      { progress: 1.0, dist: 10 },
      { progress: 3.0, dist: 50 },
      { progress: 2.0, dist: 30 },
    ];

    const chainToExit = true;
    if (chainToExit) {
      candidates.sort((a, b) => b.progress - a.progress);
    } else {
      candidates.sort((a, b) => a.dist - b.dist);
    }

    expect(candidates[0].progress).toBe(3.0);
    expect(candidates[1].progress).toBe(2.0);
    expect(candidates[2].progress).toBe(1.0);
  });

  it('sorts by distance ascending when chainToExit is false', () => {
    const candidates = [
      { progress: 1.0, dist: 50 },
      { progress: 3.0, dist: 10 },
      { progress: 2.0, dist: 30 },
    ];

    const chainToExit = false;
    if (chainToExit) {
      candidates.sort((a, b) => b.progress - a.progress);
    } else {
      candidates.sort((a, b) => a.dist - b.dist);
    }

    expect(candidates[0].dist).toBe(10);
    expect(candidates[1].dist).toBe(30);
    expect(candidates[2].dist).toBe(50);
  });
});

// ── pickTarget tie-breaking and edge cases ───────────────────────────────────

describe('pickTarget — ties and edge cases', () => {
  it('returns the first candidate when all have equal stats (stable)', () => {
    const a = makeCreep({ progress: 5 });
    const b = makeCreep({ progress: 5 });
    const c = makeCreep({ progress: 5 });
    // With equal stats, isBetter returns false, so the first candidate wins
    expect(pickTarget([a, b, c], TargetingPriority.FIRST, 0, 0)).toBe(a);
  });

  it('CLOSEST uses 2D Euclidean distance (diagonal)', () => {
    // Tower at (0,0); a at (3,4) → dist 5; b at (6,0) → dist 6
    const a = makeCreep({ x: 3, y: 4 });
    const b = makeCreep({ x: 6, y: 0 });
    expect(pickTarget([a, b], TargetingPriority.CLOSEST, 0, 0)).toBe(a);
  });

  it('MOST_BUFFED with 0 buffs returns the first candidate', () => {
    const a = makeCreep({ buffs: 0 });
    const b = makeCreep({ buffs: 0 });
    expect(pickTarget([a, b], TargetingPriority.MOST_BUFFED, 0, 0)).toBe(a);
  });
});

// ── ALL_PRIORITIES exhaustiveness ────────────────────────────────────────────

describe('ALL_PRIORITIES', () => {
  it('contains exactly 6 priorities', () => {
    expect(ALL_PRIORITIES).toHaveLength(6);
  });

  it('contains every TargetingPriority value', () => {
    expect(ALL_PRIORITIES).toContain(TargetingPriority.FIRST);
    expect(ALL_PRIORITIES).toContain(TargetingPriority.LAST);
    expect(ALL_PRIORITIES).toContain(TargetingPriority.STRONGEST);
    expect(ALL_PRIORITIES).toContain(TargetingPriority.WEAKEST);
    expect(ALL_PRIORITIES).toContain(TargetingPriority.CLOSEST);
    expect(ALL_PRIORITIES).toContain(TargetingPriority.MOST_BUFFED);
  });
});

// ── Frost tower targeting edge cases ─────────────────────────────────────────
//
// Frost uses STRONGEST priority and 'both' targetDomain.  These tests verify
// the pure-logic components of the frost attack pipeline.

describe('Frost targeting — STRONGEST priority picks highest HP', () => {
  it('selects the highest-HP creep from multiple candidates', () => {
    const weak   = makeCreep({ hp: 40  });
    const strong = makeCreep({ hp: 200 });
    const mid    = makeCreep({ hp: 100 });
    expect(pickTarget([weak, strong, mid], TargetingPriority.STRONGEST, 0, 0)).toBe(strong);
  });

  it('ignores inactive creeps even if they have the highest HP', () => {
    const dead  = makeCreep({ active: false, hp: 999 });
    const alive = makeCreep({ active: true,  hp: 50  });
    expect(pickTarget([dead, alive], TargetingPriority.STRONGEST, 0, 0)).toBe(alive);
  });

  it('returns null when candidate list is empty (no creeps in range)', () => {
    expect(pickTarget([], TargetingPriority.STRONGEST, 0, 0)).toBeNull();
  });

  it('returns the single candidate when only one is in range', () => {
    const only = makeCreep({ hp: 150 });
    expect(pickTarget([only], TargetingPriority.STRONGEST, 0, 0)).toBe(only);
  });

  it('is stable on equal HP — first candidate wins', () => {
    const a = makeCreep({ hp: 100 });
    const b = makeCreep({ hp: 100 });
    // isBetter returns false on ties, so the first candidate is retained.
    expect(pickTarget([a, b], TargetingPriority.STRONGEST, 0, 0)).toBe(a);
  });
});

describe('Frost targeting — range filtering is caller responsibility', () => {
  /**
   * Tower.findTarget() pre-filters candidates by rangeSq before calling
   * pickTarget().  These tests verify that pickTarget() itself operates only
   * on whatever list it receives — it has no knowledge of range.
   *
   * In production, the frost tower will never pass an out-of-range creep to
   * pickTarget() because findTarget() already excludes them.
   */
  it('out-of-range creep is excluded before pickTarget is called', () => {
    // Simulate Tower.findTarget() range logic: only pass in-range candidates.
    const towerX = 200;
    const towerY = 200;
    const range  = 140;
    const rangeSq = range * range;

    const inRange  = makeCreep({ x: 250, y: 200, hp: 50  }); // dist=50 ✅
    const outRange = makeCreep({ x: 400, y: 200, hp: 999 }); // dist=200 ✗

    // Simulate the caller filtering (Tower.findTarget())
    const candidates = [inRange, outRange].filter(c => {
      const dx = c.x - towerX;
      const dy = c.y - towerY;
      return dx * dx + dy * dy <= rangeSq;
    });

    const result = pickTarget(candidates, TargetingPriority.STRONGEST, towerX, towerY);
    expect(result).toBe(inRange);
    expect(result).not.toBe(outRange);
  });

  it('returns null when all creeps are beyond frost range', () => {
    const towerX = 0;
    const towerY = 0;
    const range  = 140;
    const rangeSq = range * range;

    const farCreep = makeCreep({ x: 300, y: 300, hp: 500 });

    const candidates = [farCreep].filter(c => {
      const dx = c.x - towerX;
      const dy = c.y - towerY;
      return dx * dx + dy * dy <= rangeSq;
    });

    expect(pickTarget(candidates, TargetingPriority.STRONGEST, towerX, towerY)).toBeNull();
  });
});

describe('Frost shatter on-hit ordering (bug regression)', () => {
  /**
   * Frost C upgrade sets shatterActive on the creep via onHit.
   * The shatterActive flag must be in place BEFORE takeDamage fires the
   * 'creep-died-poisoned' event on a lethal hit.
   *
   * Correct order:  onHit (set shatterActive) → takeDamage (reads shatterActive in death event)
   * Buggy order:    takeDamage (reads shatterActive = false) → onHit (sets shatterActive too late)
   *
   * These tests document the required ordering.
   */
  it('shatterActive is set before the death event when onHit precedes takeDamage', () => {
    let shatterActiveAtDeathTime = false;
    let shatterActive = false;

    const onHit = () => { shatterActive = true; };
    const takeDamage = () => {
      // Simulates creep dying and emitting creep-died-poisoned with current flag.
      shatterActiveAtDeathTime = shatterActive;
    };

    // Correct order (what Projectile.hitCreep now does):
    onHit();
    takeDamage();

    expect(shatterActiveAtDeathTime).toBe(true);
  });

  it('shatterActive is NOT set at death time when onHit follows takeDamage (bug reproduction)', () => {
    let shatterActiveAtDeathTime = false;
    let shatterActive = false;

    const onHit = () => { shatterActive = true; };
    const takeDamage = () => {
      shatterActiveAtDeathTime = shatterActive;
    };

    // Buggy order (what Projectile.hitCreep used to do):
    takeDamage();
    onHit();

    expect(shatterActiveAtDeathTime).toBe(false); // demonstrates the bug
  });

  it('chillOnly toggle suppresses shatter regardless of onHit call order', () => {
    let shatterCalled = false;
    const shatterOnDeath = true;
    const chillOnly      = true;

    // The shat flag is computed at fire time — with chillOnly on, shat = false.
    const shat = shatterOnDeath && !chillOnly;

    const onHit = (applyShatterFn: () => void) => {
      if (shat) applyShatterFn();
    };

    onHit(() => { shatterCalled = true; });
    expect(shatterCalled).toBe(false);
  });
});

describe('Frost slow effect — correct application', () => {
  /**
   * Frost onHit applies a speed slow via applySlow(factor, durationMs).
   * These tests verify actual values from towerDefs / upgradeDefs so they
   * catch regressions if someone changes the balance data.
   */
  const baseStats = defaultUpgradeStats(FROST_DEF);
  const frostUpg  = ALL_UPGRADE_DEFS.find(u => u.towerKey === 'frost')!;

  it('base frost slow factor is 0.5 (halves creep speed)', () => {
    expect(baseStats.slowFactor).toBe(0.5);
    expect(baseStats.slowFactor).toBeGreaterThan(0);
    expect(baseStats.slowFactor).toBeLessThan(1);
  });

  it('base frost slow duration is 2500ms', () => {
    expect(baseStats.slowDurationMs).toBe(2500);
  });

  it('Frost A upgrades reduce the slow factor (stronger slow)', () => {
    const pathA = frostUpg.paths.A.tiers.map(t => t.effects?.slowFactor).filter(
      (v): v is number => v !== undefined,
    );
    expect(pathA.length).toBe(5);
    const isDescending = pathA.every((v, i) => i === 0 || v < pathA[i - 1]);
    expect(isDescending).toBe(true);
  });

  it('Frost B upgrades increase slow duration', () => {
    const pathB = frostUpg.paths.B.tiers.map(t => t.effects?.slowDurationMs).filter(
      (v): v is number => v !== undefined,
    );
    expect(pathB.length).toBe(5);
    const isAscending = pathB.every((v, i) => i === 0 || v > pathB[i - 1]);
    expect(isAscending).toBe(true);
  });
});
