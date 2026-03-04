/**
 * TASK-151 — Synergy Offer Cards Must Respect Tower Targeting Rules
 *
 * Covers:
 *  A. canSynergize() with all tower type combinations
 *  B. Offer pool filtering — invalid synergies excluded (voltaic-slime, conductor, voltaic-venom)
 *  C. Valid synergies still drawn when towers are placed
 *  D. All synergy offers audited: every offer has synergyRequires populated
 *  E. Regression: no synergyRequires combo has an incompatible tower pair
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { canSynergize, TOWER_TARGET_DOMAIN, OfferManager } from '../OfferManager';
import { ALL_OFFERS } from '../../data/offerDefs';

// ── A. canSynergize() unit tests ──────────────────────────────────────────────

describe('canSynergize — same-domain overlaps', () => {
  it('ground + ground → true (rock-hurler + poison)', () => {
    expect(canSynergize('rock-hurler', 'poison')).toBe(true);
  });

  it('ground + ground → true (rock-hurler + mortar)', () => {
    expect(canSynergize('rock-hurler', 'mortar')).toBe(true);
  });

  it('ground + ground → true (poison + mortar)', () => {
    expect(canSynergize('poison', 'mortar')).toBe(true);
  });

  it('air + air → true (tesla + tesla, same key)', () => {
    expect(canSynergize('tesla', 'tesla')).toBe(true);
  });
});

describe('canSynergize — "both" overlaps everything', () => {
  it('both + ground → true (frost + rock-hurler)', () => {
    expect(canSynergize('frost', 'rock-hurler')).toBe(true);
  });

  it('both + ground → true (arrow + poison)', () => {
    expect(canSynergize('arrow', 'poison')).toBe(true);
  });

  it('both + air → true (frost + tesla)', () => {
    expect(canSynergize('frost', 'tesla')).toBe(true);
  });

  it('both + air → true (arrow + tesla)', () => {
    expect(canSynergize('arrow', 'tesla')).toBe(true);
  });

  it('both + both → true (frost + arrow)', () => {
    expect(canSynergize('frost', 'arrow')).toBe(true);
  });

  it('both + both → true (aura + frost)', () => {
    expect(canSynergize('aura', 'frost')).toBe(true);
  });

  it('both + both → true (aura + arrow)', () => {
    expect(canSynergize('aura', 'arrow')).toBe(true);
  });

  it('ground + both → true (poison + frost)', () => {
    expect(canSynergize('poison', 'frost')).toBe(true);
  });

  it('air + both → true (tesla + aura)', () => {
    expect(canSynergize('tesla', 'aura')).toBe(true);
  });
});

describe('canSynergize — incompatible domains', () => {
  it('air + ground → false (tesla + poison)', () => {
    expect(canSynergize('tesla', 'poison')).toBe(false);
  });

  it('ground + air → false (poison + tesla) — symmetric', () => {
    expect(canSynergize('poison', 'tesla')).toBe(false);
  });

  it('air + ground → false (tesla + rock-hurler)', () => {
    expect(canSynergize('tesla', 'rock-hurler')).toBe(false);
  });

  it('air + ground → false (tesla + mortar)', () => {
    expect(canSynergize('tesla', 'mortar')).toBe(false);
  });
});

describe('canSynergize — unknown / future tower keys', () => {
  it('unknown key A treated as "both" → true with ground', () => {
    expect(canSynergize('future-tower', 'poison')).toBe(true);
  });

  it('unknown key B treated as "both" → true with air', () => {
    expect(canSynergize('tesla', 'future-tower')).toBe(true);
  });

  it('both unknowns → true', () => {
    expect(canSynergize('tower-x', 'tower-y')).toBe(true);
  });
});

// ── TOWER_TARGET_DOMAIN coverage ─────────────────────────────────────────────

describe('TOWER_TARGET_DOMAIN — all tower keys defined', () => {
  const expected: Record<string, 'ground' | 'air' | 'both'> = {
    'arrow':       'both',
    'rock-hurler': 'ground',
    'frost':       'both',
    'poison':      'ground',
    'tesla':       'air',
    'aura':        'both',
    'mortar':      'ground',
  };

  for (const [key, domain] of Object.entries(expected)) {
    it(`${key} → '${domain}'`, () => {
      expect(TOWER_TARGET_DOMAIN[key]).toBe(domain);
    });
  }
});

// ── B. Offer pool filtering — incompatible synergies excluded ─────────────────

describe('drawOffers — incompatible synergy offers excluded', () => {
  let om: OfferManager;

  beforeEach(() => { om = new OfferManager(); });

  it('voltaic-slime (tesla+poison) never appears even with both towers placed', () => {
    for (const o of ALL_OFFERS) {
      if (o.id !== 'voltaic-slime') om.applyOffer(o.id);
    }
    const drawn = om.drawOffers(3, ['tesla', 'poison']);
    expect(drawn.map(o => o.id)).not.toContain('voltaic-slime');
  });

  it('conductor (poison+tesla) never appears even with both towers placed', () => {
    for (const o of ALL_OFFERS) {
      if (o.id !== 'conductor') om.applyOffer(o.id);
    }
    const drawn = om.drawOffers(3, ['poison', 'tesla']);
    expect(drawn.map(o => o.id)).not.toContain('conductor');
  });

  it('voltaic-venom (tesla+poison) never appears even with both towers placed', () => {
    for (const o of ALL_OFFERS) {
      if (o.id !== 'voltaic-venom') om.applyOffer(o.id);
    }
    const drawn = om.drawOffers(3, ['tesla', 'poison']);
    expect(drawn.map(o => o.id)).not.toContain('voltaic-venom');
  });
});

// ── C. Valid synergies still appear ──────────────────────────────────────────

describe('drawOffers — valid synergy offers still appear', () => {
  const validCases: [string, string[]][] = [
    ['venomfrost',        ['frost', 'poison']],
    ['toxic-shrapnel',    ['rock-hurler', 'poison']],
    ['cryo-cannon',       ['rock-hurler', 'frost']],
    ['brittle-ice',       ['rock-hurler', 'frost']],
    ['acid-rain',         ['rock-hurler', 'poison']],
    ['static-field',      ['frost', 'tesla']],
    ['lightning-rod',     ['frost', 'tesla']],
  ];

  for (const [offerId, towerKeys] of validCases) {
    it(`${offerId} appears when required towers (${towerKeys.join('+')}) are placed`, () => {
      const om = new OfferManager();
      for (const o of ALL_OFFERS) {
        if (o.id !== offerId) om.applyOffer(o.id);
      }
      const drawn = om.drawOffers(3, towerKeys);
      expect(drawn.map(o => o.id)).toContain(offerId);
    });
  }
});

// ── D. Tower-type synergy offers have synergyRequires ────────────────────────
//
// blood-price and crowded-house are category='synergy' but are general build
// offers that do NOT reference specific tower types, so they intentionally
// have no synergyRequires.  All OTHER synergy offers reference at least one
// tower type and must be tagged.

describe('offerDefs — tower-type synergy offers have synergyRequires', () => {
  // Offers in the 'synergy' category that are intentionally untagged because
  // they apply universally (no specific tower type interaction).
  const generalSynergyOffers = new Set(['blood-price', 'crowded-house']);

  it('every tower-type synergy offer has a non-empty synergyRequires', () => {
    const synergy = ALL_OFFERS.filter(
      o => o.category === 'synergy' && !generalSynergyOffers.has(o.id),
    );
    for (const o of synergy) {
      expect(
        o.synergyRequires && o.synergyRequires.length > 0,
        `${o.id} is missing synergyRequires`,
      ).toBe(true);
    }
  });

  it('general synergy offers (blood-price, crowded-house) have no synergyRequires', () => {
    const byId = new Map(ALL_OFFERS.map(o => [o.id, o]));
    for (const id of generalSynergyOffers) {
      const o = byId.get(id)!;
      expect(!o.synergyRequires || o.synergyRequires.length === 0).toBe(true);
    }
  });
});

// ── E. Regression: valid synergyRequires pairs all pass canSynergize ──────────

describe('regression — all synergyRequires combos are targeting-compatible (or intentionally excluded)', () => {
  // These three are intentionally incompatible — they are filtered from the pool.
  const intentionallyExcluded = new Set(['voltaic-slime', 'conductor', 'voltaic-venom']);

  it('every non-excluded synergy offer has compatible tower pairs', () => {
    const synergy = ALL_OFFERS.filter(
      o => o.category === 'synergy' && !intentionallyExcluded.has(o.id),
    );
    for (const o of synergy) {
      if (!o.synergyRequires || o.synergyRequires.length < 2) continue;
      const keys = o.synergyRequires;
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          expect(
            canSynergize(keys[i], keys[j]),
            `${o.id}: ${keys[i]} + ${keys[j]} should be compatible`,
          ).toBe(true);
        }
      }
    }
  });

  it('intentionally excluded offers have incompatible tower pairs', () => {
    const excluded = ALL_OFFERS.filter(o => intentionallyExcluded.has(o.id));
    for (const o of excluded) {
      expect(o.synergyRequires, `${o.id} should have synergyRequires`).toBeDefined();
      const keys = o.synergyRequires!;
      let anyIncompatible = false;
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          if (!canSynergize(keys[i], keys[j])) anyIncompatible = true;
        }
      }
      expect(anyIncompatible, `${o.id} should have at least one incompatible pair`).toBe(true);
    }
  });
});
