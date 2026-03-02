/**
 * Unit tests for the air/ground domain filtering system.
 *
 * All tests are Phaser-free: they exercise the pure logic extracted from
 * Tower.findTarget(), Creep.applySlow(), and WaveManager.hasAirCreepsInWave().
 */
import { describe, it, expect } from 'vitest';
import {
  ROCK_HURLER_DEF, ARROW_DEF, FROST_DEF, POISON_DEF, TESLA_DEF, AURA_DEF,
  ALL_TOWER_DEFS,
} from '../../data/towerDefs';

// ── Types used in the tests ────────────────────────────────────────────────────

type CreepDomain   = 'ground' | 'air';
type TargetDomain  = 'ground' | 'air' | 'both';

interface MockCreep {
  active:    boolean;
  creepType: CreepDomain;
  /** Alias matching the Creep.domain getter. */
  readonly domain: CreepDomain;
}

function makeCreep(active: boolean, creepType: CreepDomain): MockCreep {
  return {
    active,
    creepType,
    get domain() { return this.creepType; },
  };
}

// ── Domain filtering logic (mirrors Tower.findTarget) ─────────────────────────

function domainMatch(creep: MockCreep, domain: TargetDomain): boolean {
  if (domain === 'both')   return true;
  if (domain === 'air')    return creep.domain === 'air';
  /* 'ground' */           return creep.domain !== 'air';
}

function filterByDomain(creeps: MockCreep[], domain: TargetDomain): MockCreep[] {
  return creeps.filter(c => c.active && domainMatch(c, domain));
}

// ── Tesla chain domain filtering (mirrors Tower.fireTesla onHit) ──────────────

function filterChainCandidates(
  creeps: MockCreep[],
  hitCreep: MockCreep,
  towerDomain: TargetDomain,
): MockCreep[] {
  return creeps.filter(c => {
    if (!c.active || c === hitCreep) return false;
    if (towerDomain === 'air' && c.domain !== 'air') return false;
    if (towerDomain === 'ground' && c.domain === 'air') return false;
    return true;
  });
}

// ── Slow resistance formula (mirrors Creep.applySlow) ─────────────────────────

function computeEffectiveSlow(baseFactor: number, isAir: boolean): number {
  return isAir ? 1 - (1 - baseFactor) * 0.5 : baseFactor;
}

// ── Wave air detection (mirrors WaveManager.hasAirCreepsInWave) ───────────────

function waveHasAir(
  pool: string[],
  creepTypeDefs: Array<{ key: string; type: CreepDomain }>,
): boolean {
  return pool.some(typeKey => {
    const def = creepTypeDefs.find(t => t.key === typeKey);
    return def?.type === 'air';
  });
}

// ────────────────────────────────────────────────────────────────────────────────

describe('Domain filter — targetDomain: "ground"', () => {
  const ground1 = makeCreep(true,  'ground');
  const ground2 = makeCreep(true,  'ground');
  const air1    = makeCreep(true,  'air');
  const air2    = makeCreep(true,  'air');

  it('returns only ground creeps', () => {
    const result = filterByDomain([ground1, air1, ground2], 'ground');
    expect(result).toContain(ground1);
    expect(result).toContain(ground2);
    expect(result).not.toContain(air1);
  });

  it('returns empty array when only air creeps are present', () => {
    expect(filterByDomain([air1, air2], 'ground')).toHaveLength(0);
  });

  it('returns all ground creeps when no air creeps present', () => {
    expect(filterByDomain([ground1, ground2], 'ground')).toHaveLength(2);
  });
});

describe('Domain filter — targetDomain: "air"', () => {
  const ground1 = makeCreep(true,  'ground');
  const air1    = makeCreep(true,  'air');
  const air2    = makeCreep(true,  'air');

  it('returns only air creeps', () => {
    const result = filterByDomain([ground1, air1, air2], 'air');
    expect(result).not.toContain(ground1);
    expect(result).toContain(air1);
    expect(result).toContain(air2);
  });

  it('returns empty array when only ground creeps present', () => {
    const g1 = makeCreep(true, 'ground');
    const g2 = makeCreep(true, 'ground');
    expect(filterByDomain([g1, g2], 'air')).toHaveLength(0);
  });

  it('returns all air creeps when no ground creeps present', () => {
    expect(filterByDomain([air1, air2], 'air')).toHaveLength(2);
  });
});

describe('Domain filter — targetDomain: "both"', () => {
  const ground1 = makeCreep(true, 'ground');
  const ground2 = makeCreep(true, 'ground');
  const air1    = makeCreep(true, 'air');
  const air2    = makeCreep(true, 'air');

  it('returns all active creeps regardless of type', () => {
    const result = filterByDomain([ground1, air1, ground2, air2], 'both');
    expect(result).toHaveLength(4);
  });

  it('returns empty when all are inactive', () => {
    const d1 = makeCreep(false, 'ground');
    const d2 = makeCreep(false, 'air');
    expect(filterByDomain([d1, d2], 'both')).toHaveLength(0);
  });
});

describe('Domain filter — inactive creep exclusion', () => {
  it('never includes inactive ground creeps', () => {
    const dead   = makeCreep(false, 'ground');
    const alive  = makeCreep(true,  'ground');
    const result = filterByDomain([dead, alive], 'ground');
    expect(result).not.toContain(dead);
    expect(result).toContain(alive);
  });

  it('never includes inactive air creeps', () => {
    const dead   = makeCreep(false, 'air');
    const alive  = makeCreep(true,  'air');
    const result = filterByDomain([dead, alive], 'air');
    expect(result).not.toContain(dead);
    expect(result).toContain(alive);
  });

  it('returns empty from empty candidate list', () => {
    expect(filterByDomain([], 'both')).toHaveLength(0);
  });
});

describe('Creep.domain getter', () => {
  it('returns "ground" for ground creeps', () => {
    const c = makeCreep(true, 'ground');
    expect(c.domain).toBe('ground');
  });

  it('returns "air" for air creeps', () => {
    const c = makeCreep(true, 'air');
    expect(c.domain).toBe('air');
  });
});

describe('Tesla chain domain filtering', () => {
  const airPrimary = makeCreep(true, 'air');
  const air1       = makeCreep(true, 'air');
  const air2       = makeCreep(true, 'air');
  const ground1    = makeCreep(true, 'ground');
  const ground2    = makeCreep(true, 'ground');

  it('air-only tower chains only to air creeps', () => {
    const result = filterChainCandidates(
      [air1, ground1, air2, ground2], airPrimary, 'air',
    );
    expect(result).toContain(air1);
    expect(result).toContain(air2);
    expect(result).not.toContain(ground1);
    expect(result).not.toContain(ground2);
  });

  it('both-domain tower chains to all active creeps', () => {
    const result = filterChainCandidates(
      [air1, ground1, air2, ground2], airPrimary, 'both',
    );
    expect(result).toHaveLength(4);
  });

  it('excludes the hit creep from chain candidates', () => {
    const result = filterChainCandidates(
      [airPrimary, air1, ground1], airPrimary, 'both',
    );
    expect(result).not.toContain(airPrimary);
    expect(result).toContain(air1);
  });

  it('excludes inactive creeps from chain candidates', () => {
    const dead = makeCreep(false, 'air');
    const result = filterChainCandidates(
      [dead, air1], airPrimary, 'air',
    );
    expect(result).not.toContain(dead);
    expect(result).toContain(air1);
  });

  it('ground-domain tower chains only to ground creeps', () => {
    const result = filterChainCandidates(
      [air1, ground1, ground2], ground1, 'ground',
    );
    // ground1 is the hitCreep, so excluded; only ground2 remains
    expect(result).toContain(ground2);
    expect(result).not.toContain(air1);
    expect(result).not.toContain(ground1);
  });
});

describe('Air creep slow resistance (50% effectiveness)', () => {
  it('ground creeps receive the full slow factor', () => {
    expect(computeEffectiveSlow(0.5, false)).toBe(0.5);
    expect(computeEffectiveSlow(0.25, false)).toBe(0.25);
  });

  it('air creeps receive 50% of the slow magnitude (0.5 factor → 0.75)', () => {
    // slowMagnitude = 1 - factor = 0.5; air gets 50% → 0.25; effectiveFactor = 0.75
    expect(computeEffectiveSlow(0.5, true)).toBeCloseTo(0.75);
  });

  it('stronger slow (0.25) is still halved for air (→ 0.625)', () => {
    // slowMagnitude = 0.75; halved → 0.375; effectiveFactor = 0.625
    expect(computeEffectiveSlow(0.25, true)).toBeCloseTo(0.625);
  });

  it('no-slow (factor=1.0) is unaffected for both types', () => {
    expect(computeEffectiveSlow(1.0, false)).toBe(1.0);
    expect(computeEffectiveSlow(1.0, true)).toBe(1.0);
  });

  it('full stop (factor=0.0) is halved for air (→ 0.5)', () => {
    expect(computeEffectiveSlow(0.0, true)).toBeCloseTo(0.5);
  });
});

describe('Wave air creep detection', () => {
  const creepTypeDefs: Array<{ key: string; type: CreepDomain }> = [
    { key: 'grunt',  type: 'ground' },
    { key: 'runner', type: 'ground' },
    { key: 'brute',  type: 'ground' },
    { key: 'swarm',  type: 'ground' },
    { key: 'scout',  type: 'air' },
    { key: 'flier',  type: 'air' },
  ];

  it('detects air creeps in a mixed pool', () => {
    expect(waveHasAir(['grunt', 'runner', 'scout'], creepTypeDefs)).toBe(true);
  });

  it('returns false for a ground-only pool', () => {
    expect(waveHasAir(['grunt', 'runner', 'brute'], creepTypeDefs)).toBe(false);
  });

  it('detects an all-air pool', () => {
    expect(waveHasAir(['scout', 'flier'], creepTypeDefs)).toBe(true);
  });

  it('returns false for an empty pool', () => {
    expect(waveHasAir([], creepTypeDefs)).toBe(false);
  });

  it('returns false when pool keys are all unrecognised', () => {
    expect(waveHasAir(['unknown-type'], creepTypeDefs)).toBe(false);
  });
});

describe('TowerDef targetDomain assignment (real imports)', () => {
  it('Rock Hurler is ground-only', () => {
    expect(ROCK_HURLER_DEF.targetDomain).toBe('ground');
  });

  it('Arrow targets both air and ground', () => {
    expect(ARROW_DEF.targetDomain).toBe('both');
  });

  it('Poison is ground-only', () => {
    expect(POISON_DEF.targetDomain).toBe('ground');
  });

  it('Frost targets both air and ground', () => {
    expect(FROST_DEF.targetDomain).toBe('both');
  });

  it('Tesla is air-only', () => {
    expect(TESLA_DEF.targetDomain).toBe('air');
  });

  it('Aura targets both (buffs towers, not creeps)', () => {
    expect(AURA_DEF.targetDomain).toBe('both');
  });

  it('every TowerDef in ALL_TOWER_DEFS has a valid targetDomain', () => {
    const valid = ['ground', 'air', 'both'];
    for (const def of ALL_TOWER_DEFS) {
      expect(valid).toContain(def.targetDomain);
    }
  });

  it('Tesla damage is 42 (balanced +20% for air-only role)', () => {
    expect(TESLA_DEF.damage).toBe(42);
  });
});

describe('Air waypoint default path', () => {
  // Mirrors GameScene.buildAirWaypoints() and WaveManager constructor logic.
  function buildAirWaypoints(
    groundWps: Array<{ x: number; y: number }>,
    custom?: Array<{ x: number; y: number }>,
  ): Array<{ x: number; y: number }> {
    if (custom && custom.length >= 2) return custom;
    return [groundWps[0], groundWps[groundWps.length - 1]];
  }

  it('defaults to [first, last] ground waypoint when no custom air path', () => {
    const ground = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 200 },
      { x: 200, y: 200 },
    ];
    const result = buildAirWaypoints(ground);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[1]).toEqual({ x: 200, y: 200 });
  });

  it('uses custom air waypoints when provided with ≥2 points', () => {
    const ground = [{ x: 0, y: 0 }, { x: 200, y: 200 }];
    const custom = [{ x: 10, y: 10 }, { x: 100, y: 50 }, { x: 190, y: 190 }];
    const result = buildAirWaypoints(ground, custom);
    expect(result).toHaveLength(3);
    expect(result).toBe(custom);
  });

  it('falls back to default when custom array has fewer than 2 points', () => {
    const ground = [{ x: 0, y: 0 }, { x: 200, y: 200 }];
    const result = buildAirWaypoints(ground, [{ x: 50, y: 50 }]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ x: 0, y: 0 });
  });

  it('falls back to default when custom is undefined', () => {
    const ground = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
    const result = buildAirWaypoints(ground, undefined);
    expect(result).toHaveLength(2);
  });
});
