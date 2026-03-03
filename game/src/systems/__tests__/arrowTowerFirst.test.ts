/**
 * TASK-121 — Arrow Tower First in Tower Selection List
 *
 * Acceptance criteria:
 *  - Arrow tower is the first entry in ALL_TOWER_DEFS
 *  - The full ordering is: Arrow → Rock Hurler → Frost → Poison → Thunder → Aura
 *  - No tower stats or behaviour are changed — only display order
 */
import { describe, it, expect } from 'vitest';
import {
  ALL_TOWER_DEFS,
  ARROW_DEF,
  ROCK_HURLER_DEF,
  FROST_DEF,
  POISON_DEF,
  TESLA_DEF,
  AURA_DEF,
} from '../../data/towerDefs';

// ── Ordering ─────────────────────────────────────────────────────────────────

describe('TASK-121: Arrow tower first in tower list', () => {
  it('Arrow tower is the first element in ALL_TOWER_DEFS', () => {
    expect(ALL_TOWER_DEFS[0]).toBe(ARROW_DEF);
    expect(ALL_TOWER_DEFS[0].key).toBe('arrow');
  });

  it('full ordering matches: Arrow → Rock Hurler → Frost → Poison → Thunder → Aura', () => {
    const expectedOrder = ['arrow', 'rock-hurler', 'frost', 'poison', 'tesla', 'aura'];
    const actualOrder = ALL_TOWER_DEFS.map(d => d.key);
    expect(actualOrder).toEqual(expectedOrder);
  });

  it('full name ordering matches: Arrow → Rock Hurler → Frost → Poison → Thunder → Aura', () => {
    const expectedNames = ['Arrow', 'Rock Hurler', 'Frost', 'Poison', 'Thunder', 'Aura'];
    const actualNames = ALL_TOWER_DEFS.map(d => d.name);
    expect(actualNames).toEqual(expectedNames);
  });

  it('still contains exactly 6 towers', () => {
    expect(ALL_TOWER_DEFS).toHaveLength(6);
  });

  it('each tower definition object is the correct exported constant', () => {
    expect(ALL_TOWER_DEFS[0]).toBe(ARROW_DEF);
    expect(ALL_TOWER_DEFS[1]).toBe(ROCK_HURLER_DEF);
    expect(ALL_TOWER_DEFS[2]).toBe(FROST_DEF);
    expect(ALL_TOWER_DEFS[3]).toBe(POISON_DEF);
    expect(ALL_TOWER_DEFS[4]).toBe(TESLA_DEF);
    expect(ALL_TOWER_DEFS[5]).toBe(AURA_DEF);
  });
});

// ── Stats unchanged (regression guard) ───────────────────────────────────────

describe('TASK-121: No stat changes — regression guard', () => {
  it('Arrow tower cost is 75', () => {
    expect(ARROW_DEF.cost).toBe(75);
  });

  it('Arrow tower damage is 18', () => {
    expect(ARROW_DEF.damage).toBe(18);
  });

  it('Arrow tower attackIntervalMs is 600', () => {
    expect(ARROW_DEF.attackIntervalMs).toBe(600);
  });

  it('Arrow tower range is 180', () => {
    expect(ARROW_DEF.range).toBe(180);
  });

  it('Arrow tower armorDamageMult is 0.3', () => {
    expect(ARROW_DEF.armorDamageMult).toBe(0.3);
  });

  it('Arrow tower targets both ground and air', () => {
    expect(ARROW_DEF.targetDomain).toBe('both');
  });

  it('no tower in the list has altered cost values', () => {
    const expectedCosts: Record<string, number> = {
      arrow: 75,
      'rock-hurler': 150,
      frost: 125,
      poison: 125,
      tesla: 200,
      aura: 150,
    };
    for (const def of ALL_TOWER_DEFS) {
      expect(def.cost).toBe(expectedCosts[def.key]);
    }
  });
});

// ── Edge cases / boundary ────────────────────────────────────────────────────

describe('TASK-121: Edge cases', () => {
  it('Arrow is not duplicated in the list', () => {
    const arrowCount = ALL_TOWER_DEFS.filter(d => d.key === 'arrow').length;
    expect(arrowCount).toBe(1);
  });

  it('all keys are unique (no accidental duplicates from reorder)', () => {
    const keys = ALL_TOWER_DEFS.map(d => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('Rock Hurler (previously first) is now second', () => {
    expect(ALL_TOWER_DEFS[1].key).toBe('rock-hurler');
  });

  it('Aura (support) is last', () => {
    expect(ALL_TOWER_DEFS[ALL_TOWER_DEFS.length - 1].key).toBe('aura');
  });
});
