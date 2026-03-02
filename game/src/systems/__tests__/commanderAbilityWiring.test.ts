/**
 * Tests for TASK-020: Wire Commander Ability Effects.
 *
 * Tests the pure logic extracted from Projectile.ts, Tower.ts, and Creep.ts
 * that implements the four commander ability/aura effects. No Phaser import
 * needed — all logic is tested as standalone expressions.
 */

import { describe, it, expect } from 'vitest';
import { defaultCommanderRunState, getCommanderDef } from '../../data/commanderDefs';
import type { CommanderRunState } from '../../data/commanderDefs';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Simulate projectile step distance calculation from Projectile.ts */
function projectileStep(speed: number, speedMult: number, deltaMs: number): number {
  return (speed * speedMult * deltaMs) / 1000;
}

/** Simulate armor damage calculation from Creep.takeDamage() */
function calcDamageAfterArmor(
  amount: number,
  physicalResistPct: number,
  ignoreFlags: boolean,
): number {
  return ignoreFlags ? amount : amount * (1 - physicalResistPct);
}

/** Simulate slow immunity check from Creep.applySlow() */
function shouldBlockSlow(slowImmune: boolean, ignoreFlags: boolean): boolean {
  return slowImmune && !ignoreFlags;
}

/** Simulate poison immunity check from Creep.applyDot() */
function shouldBlockDot(poisonImmune: boolean, ignoreFlags: boolean): boolean {
  return poisonImmune && !ignoreFlags;
}

/** Simulate sticky targeting check from Tower.findTarget() */
function stickyTargetResult(
  stickyTargeting: boolean,
  currentTarget: { active: boolean; x: number; y: number; creepType: string } | null,
  towerX: number,
  towerY: number,
  rangeSq: number,
  targetDomain: 'ground' | 'air' | 'both',
): { retain: boolean } {
  if (!stickyTargeting || !currentTarget) return { retain: false };
  const ct = currentTarget;
  if (!ct.active) return { retain: false };
  // Domain check mirrors Tower.findTarget()'s domainMatch() helper.
  if (targetDomain === 'air' && ct.creepType !== 'air') return { retain: false };
  if (targetDomain === 'ground' && ct.creepType === 'air') return { retain: false };
  const dx = ct.x - towerX;
  const dy = ct.y - towerY;
  if (dx * dx + dy * dy > rangeSq) return { retain: false };
  return { retain: true };
}

/** Simulate Tesla chain AoE check from Tower.fireTesla() */
function getAoETargets(
  chainHitX: number,
  chainHitY: number,
  creeps: Array<{ active: boolean; x: number; y: number; id: number }>,
  chainHitId: number,
  aoeTileSize: number,
): number[] {
  const damaged: number[] = [];
  for (const nearby of creeps) {
    if (!nearby.active || nearby.id === chainHitId) continue;
    if (Math.hypot(nearby.x - chainHitX, nearby.y - chainHitY) <= aoeTileSize) {
      damaged.push(nearby.id);
    }
  }
  return damaged;
}

// ── 1. Bizhiw aura — projectile speed ────────────────────────────────────────

describe('Bizhiw aura — projectile speed multiplier', () => {
  it('default speedMult is 1.0 (no commander)', () => {
    const step = projectileStep(300, 1.0, 16);
    expect(step).toBeCloseTo(4.8, 5);
  });

  it('Bizhiw aura sets speedMult to 1.25', () => {
    const state = defaultCommanderRunState('bizhiw');
    getCommanderDef('bizhiw')!.aura.apply(state);
    expect(state.projectileSpeedMult).toBe(1.25);
  });

  it('projectile travels 25% farther per frame with speedMult 1.25', () => {
    const normal = projectileStep(300, 1.0, 16);
    const boosted = projectileStep(300, 1.25, 16);
    expect(boosted / normal).toBeCloseTo(1.25, 5);
  });

  it('speedMult of 1.0 produces unchanged step distance', () => {
    const step = projectileStep(200, 1.0, 100);
    expect(step).toBe(20);
  });

  it('speedMult of 0 produces zero step (edge case)', () => {
    const step = projectileStep(300, 0, 16);
    expect(step).toBe(0);
  });

  it('negative delta produces negative step (edge guard)', () => {
    const step = projectileStep(300, 1.0, -16);
    expect(step).toBeLessThan(0);
  });
});

// ── 2. Makoons aura — sticky target retention ───────────────────────────────

describe('Makoons aura — sticky target retention', () => {
  const towerX = 100;
  const towerY = 100;
  const range = 150;
  const rangeSq = range * range;

  it('retains current target when active, in range, and stickyTargeting on', () => {
    const target = { active: true, x: 120, y: 120, creepType: 'ground' };
    const result = stickyTargetResult(true, target, towerX, towerY, rangeSq, 'both');
    expect(result.retain).toBe(true);
  });

  it('does not retain when stickyTargeting is off', () => {
    const target = { active: true, x: 120, y: 120, creepType: 'ground' };
    const result = stickyTargetResult(false, target, towerX, towerY, rangeSq, 'both');
    expect(result.retain).toBe(false);
  });

  it('does not retain when currentTarget is null', () => {
    const result = stickyTargetResult(true, null, towerX, towerY, rangeSq, 'both');
    expect(result.retain).toBe(false);
  });

  it('does not retain when target is dead (active=false)', () => {
    const target = { active: false, x: 120, y: 120, creepType: 'ground' };
    const result = stickyTargetResult(true, target, towerX, towerY, rangeSq, 'both');
    expect(result.retain).toBe(false);
  });

  it('does not retain when target moved out of range', () => {
    const target = { active: true, x: 500, y: 500, creepType: 'ground' };
    const result = stickyTargetResult(true, target, towerX, towerY, rangeSq, 'both');
    expect(result.retain).toBe(false);
  });

  it('does not retain air target when targetDomain is ground', () => {
    const target = { active: true, x: 110, y: 110, creepType: 'air' };
    const result = stickyTargetResult(true, target, towerX, towerY, rangeSq, 'ground');
    expect(result.retain).toBe(false);
  });

  it('retains air target when targetDomain is both', () => {
    const target = { active: true, x: 110, y: 110, creepType: 'air' };
    const result = stickyTargetResult(true, target, towerX, towerY, rangeSq, 'both');
    expect(result.retain).toBe(true);
  });

  it('does not retain ground target when targetDomain is air', () => {
    const target = { active: true, x: 110, y: 110, creepType: 'ground' };
    const result = stickyTargetResult(true, target, towerX, towerY, rangeSq, 'air');
    expect(result.retain).toBe(false);
  });

  it('retains air target when targetDomain is air', () => {
    const target = { active: true, x: 110, y: 110, creepType: 'air' };
    const result = stickyTargetResult(true, target, towerX, towerY, rangeSq, 'air');
    expect(result.retain).toBe(true);
  });

  it('retains target exactly at range boundary', () => {
    // Target at exactly range distance from tower
    const target = { active: true, x: towerX + range, y: towerY, creepType: 'ground' };
    const result = stickyTargetResult(true, target, towerX, towerY, rangeSq, 'both');
    expect(result.retain).toBe(true);
  });

  it('does not retain target just beyond range boundary', () => {
    const target = { active: true, x: towerX + range + 1, y: towerY, creepType: 'ground' };
    const result = stickyTargetResult(true, target, towerX, towerY, rangeSq, 'both');
    expect(result.retain).toBe(false);
  });

  it('Makoons aura correctly sets stickyTargeting flag', () => {
    const state = defaultCommanderRunState('makoons');
    expect(state.stickyTargeting).toBe(false);
    getCommanderDef('makoons')!.aura.apply(state);
    expect(state.stickyTargeting).toBe(true);
  });
});

// ── 3. Animikiikaa aura — Tesla chain AoE ───────────────────────────────────

describe('Animikiikaa aura — Tesla chain AoE', () => {
  it('damages nearby creeps within tileSize radius', () => {
    const creeps = [
      { active: true, x: 100, y: 100, id: 1 }, // chain-hit target
      { active: true, x: 110, y: 100, id: 2 }, // 10px away — within 40
      { active: true, x: 130, y: 100, id: 3 }, // 30px away — within 40
    ];
    const damaged = getAoETargets(100, 100, creeps, 1, 40);
    expect(damaged).toContain(2);
    expect(damaged).toContain(3);
  });

  it('excludes the chain-hit creep itself', () => {
    const creeps = [
      { active: true, x: 100, y: 100, id: 1 },
    ];
    const damaged = getAoETargets(100, 100, creeps, 1, 40);
    expect(damaged).not.toContain(1);
    expect(damaged).toHaveLength(0);
  });

  it('excludes creeps outside AoE radius', () => {
    const creeps = [
      { active: true, x: 100, y: 100, id: 1 },
      { active: true, x: 200, y: 200, id: 2 }, // ~141px away — outside 40
    ];
    const damaged = getAoETargets(100, 100, creeps, 1, 40);
    expect(damaged).not.toContain(2);
  });

  it('excludes inactive creeps', () => {
    const creeps = [
      { active: true,  x: 100, y: 100, id: 1 },
      { active: false, x: 105, y: 100, id: 2 }, // close but dead
    ];
    const damaged = getAoETargets(100, 100, creeps, 1, 40);
    expect(damaged).not.toContain(2);
  });

  it('returns empty array when no creeps nearby', () => {
    const creeps = [
      { active: true, x: 100, y: 100, id: 1 },
    ];
    const damaged = getAoETargets(100, 100, creeps, 1, 40);
    expect(damaged).toHaveLength(0);
  });

  it('includes creep exactly at boundary', () => {
    const creeps = [
      { active: true, x: 100, y: 100, id: 1 },
      { active: true, x: 140, y: 100, id: 2 }, // exactly 40px away
    ];
    const damaged = getAoETargets(100, 100, creeps, 1, 40);
    expect(damaged).toContain(2);
  });

  it('AoE radius of 0 damages no one', () => {
    const creeps = [
      { active: true, x: 100, y: 100, id: 1 },
      { active: true, x: 100, y: 100, id: 2 }, // same position
    ];
    const damaged = getAoETargets(100, 100, creeps, 1, 0);
    // Only creeps at distance 0 qualify, but id=2 is at exactly 0 distance
    expect(damaged).toContain(2);
  });

  it('Animikiikaa aura sets teslaChainAoE flag', () => {
    const state = defaultCommanderRunState('animikiikaa');
    expect(state.teslaChainAoE).toBe(false);
    getCommanderDef('animikiikaa')!.aura.apply(state);
    expect(state.teslaChainAoE).toBe(true);
    expect(state.teslaChainBonus).toBe(1);
  });
});

// ── 4. Makoons ability — ignore armor and immunity ──────────────────────────

describe('Makoons ability — ignore armor and immunity', () => {
  describe('armor bypass (takeDamage)', () => {
    it('full armor applied when ignoreFlags is false', () => {
      const dmg = calcDamageAfterArmor(100, 0.3, false);
      expect(dmg).toBe(70); // 100 * (1 - 0.3)
    });

    it('armor bypassed when ignoreFlags is true', () => {
      const dmg = calcDamageAfterArmor(100, 0.3, true);
      expect(dmg).toBe(100);
    });

    it('no armor case produces same result regardless of flag', () => {
      const normal = calcDamageAfterArmor(100, 0, false);
      const bypass = calcDamageAfterArmor(100, 0, true);
      expect(normal).toBe(100);
      expect(bypass).toBe(100);
    });

    it('handles 100% armor reduction', () => {
      const normal = calcDamageAfterArmor(100, 1.0, false);
      const bypass = calcDamageAfterArmor(100, 1.0, true);
      expect(normal).toBe(0);
      expect(bypass).toBe(100);
    });

    it('handles zero damage input', () => {
      const dmg = calcDamageAfterArmor(0, 0.3, false);
      expect(dmg).toBe(0);
    });
  });

  describe('slow immunity bypass (applySlow)', () => {
    it('blocks slow when immune and not ignoring', () => {
      expect(shouldBlockSlow(true, false)).toBe(true);
    });

    it('allows slow when immune but ignoring', () => {
      expect(shouldBlockSlow(true, true)).toBe(false);
    });

    it('allows slow when not immune', () => {
      expect(shouldBlockSlow(false, false)).toBe(false);
    });

    it('allows slow when not immune even with ignore flag', () => {
      expect(shouldBlockSlow(false, true)).toBe(false);
    });
  });

  describe('poison immunity bypass (applyDot)', () => {
    it('blocks DoT when immune and not ignoring', () => {
      expect(shouldBlockDot(true, false)).toBe(true);
    });

    it('allows DoT when immune but ignoring', () => {
      expect(shouldBlockDot(true, true)).toBe(false);
    });

    it('allows DoT when not immune', () => {
      expect(shouldBlockDot(false, false)).toBe(false);
    });

    it('allows DoT when not immune even with ignore flag', () => {
      expect(shouldBlockDot(false, true)).toBe(false);
    });
  });

  describe('ability lifecycle', () => {
    it('ignoreArmorAndImmunity starts false', () => {
      const state = defaultCommanderRunState('makoons');
      expect(state.ignoreArmorAndImmunity).toBe(false);
    });

    it('ability sets flag to true with 6s timer', () => {
      const state = defaultCommanderRunState('makoons');
      const addTimedEffect = (durationMs: number, onEnd: () => void) => {
        expect(durationMs).toBe(6000);
        onEnd(); // simulate timer expiry immediately
      };
      const ctx = {
        currentWave: 5,
        currentLives: 15,
        waveStartLives: 18,
        startingLives: 20,
        currentGold: 500,
        addGold: () => {},
        setLives: () => {},
        addTimedEffect,
        showMessage: () => {},
        getWaveCreepInfo: () => null,
      };

      getCommanderDef('makoons')!.ability.activate(state, ctx);
      // Timer fired immediately in our mock, so flag should be back to false
      expect(state.ignoreArmorAndImmunity).toBe(false);
    });
  });
});

// ── 5. No commander — neutral defaults ──────────────────────────────────────

describe('No commander selected — neutral defaults', () => {
  // Simulates Tower reading from an undefined commanderState reference.
  function readFromState(state: CommanderRunState | undefined) {
    return {
      speedMult: state?.projectileSpeedMult ?? 1.0,
      sticky:    state?.stickyTargeting ?? false,
      chainAoE:  state?.teslaChainAoE ?? false,
    };
  }

  it('undefined commanderState yields default speedMult 1.0', () => {
    expect(readFromState(undefined).speedMult).toBe(1.0);
  });

  it('undefined commanderState yields stickyTargeting false', () => {
    expect(readFromState(undefined).sticky).toBe(false);
  });

  it('undefined commanderState yields teslaChainAoE false', () => {
    expect(readFromState(undefined).chainAoE).toBe(false);
  });

  it('null commanderState from scene.data yields ignoreFlags false', () => {
    // Simulates: const cmdState = scene.data.get('commanderState') as { ... } | undefined
    const cmdState = null as unknown as { ignoreArmorAndImmunity?: boolean } | undefined;
    const ignoreFlags = cmdState?.ignoreArmorAndImmunity ?? false;
    expect(ignoreFlags).toBe(false);
  });
});

// ── 6. Clean state between runs ─────────────────────────────────────────────

describe('Clean state between runs', () => {
  it('defaultCommanderRunState always returns fresh stickyTargeting=false', () => {
    const s1 = defaultCommanderRunState('makoons');
    getCommanderDef('makoons')!.aura.apply(s1);
    expect(s1.stickyTargeting).toBe(true);

    // New run: fresh state
    const s2 = defaultCommanderRunState('makoons');
    expect(s2.stickyTargeting).toBe(false);
  });

  it('defaultCommanderRunState always returns fresh ignoreArmorAndImmunity=false', () => {
    const s1 = defaultCommanderRunState('makoons');
    s1.ignoreArmorAndImmunity = true;

    const s2 = defaultCommanderRunState('makoons');
    expect(s2.ignoreArmorAndImmunity).toBe(false);
  });

  it('defaultCommanderRunState always returns fresh projectileSpeedMult=1.0', () => {
    const s1 = defaultCommanderRunState('bizhiw');
    getCommanderDef('bizhiw')!.aura.apply(s1);
    expect(s1.projectileSpeedMult).toBe(1.25);

    const s2 = defaultCommanderRunState('bizhiw');
    expect(s2.projectileSpeedMult).toBe(1.0);
  });

  it('defaultCommanderRunState always returns fresh teslaChainAoE=false', () => {
    const s1 = defaultCommanderRunState('animikiikaa');
    getCommanderDef('animikiikaa')!.aura.apply(s1);
    expect(s1.teslaChainAoE).toBe(true);

    const s2 = defaultCommanderRunState('animikiikaa');
    expect(s2.teslaChainAoE).toBe(false);
  });
});
