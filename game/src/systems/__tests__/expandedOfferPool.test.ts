/**
 * TASK-035 — Expanded Roguelike Offer Pool
 *
 * Unit tests covering:
 *  - Expanded pool size (72+ offers, 30 new)
 *  - Rarity distribution (~50% common, ~35% rare, ~15% epic)
 *  - Rarity field on every offer
 *  - isChallenge flag on negative offers
 *  - synergyRequires gating in drawOffers()
 *  - Anti-duplication enforcement (same offer never drawn twice per run)
 *  - All new Phase-14 query methods in OfferManager
 *  - Extended getSellRefundRate() (salvage-rights at 0.90)
 *  - Extended getKillRewardMult() (war-chest-wave penalty stacks with bounty-hunter)
 *  - getGlobalDamageMult() with tower-tax + marksman
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OfferManager } from '../OfferManager';
import { ALL_OFFERS } from '../../data/offerDefs';

describe('Expanded Offer Pool — offerDefs integrity', () => {
  it('has at least 72 total offers', () => {
    expect(ALL_OFFERS.length).toBeGreaterThanOrEqual(72);
  });

  it('all offer IDs are unique', () => {
    const ids = ALL_OFFERS.map(o => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every offer has a rarity field', () => {
    const valid = ['common', 'rare', 'epic'];
    for (const o of ALL_OFFERS) {
      expect(valid).toContain(o.rarity);
    }
  });

  it('all 12 mechanic-changing Phase-14 offer IDs exist', () => {
    const ids = new Set(ALL_OFFERS.map(o => o.id));
    const mechanic = [
      'ricochet-shot', 'flash-freeze', 'chain-reactor', 'plague-doctor',
      'aftershock', 'aura-leech', 'glass-cannon', 'permafrost',
      'living-poison', 'overkill-transfer', 'shared-pain', 'tower-tax',
    ];
    for (const id of mechanic) {
      expect(ids.has(id), `Missing mechanic offer: ${id}`).toBe(true);
    }
  });

  it('all 8 synergy Phase-14 offer IDs exist', () => {
    const ids = new Set(ALL_OFFERS.map(o => o.id));
    const synergy = [
      'shatter', 'conductor', 'siege-mode', 'arctic-shrapnel',
      'voltaic-venom', 'stone-skin', 'blood-price', 'crowded-house',
    ];
    for (const id of synergy) {
      expect(ids.has(id), `Missing synergy offer: ${id}`).toBe(true);
    }
  });

  it('all 10 economy Phase-14 offer IDs exist', () => {
    const ids = new Set(ALL_OFFERS.map(o => o.id));
    const economy = [
      'salvage-rights', 'bulk-discount', 'war-chest-wave', 'gambler',
      'recycler', 'headstart', 'bounty-escape', 'insurance',
      'marksman', 'focused-fire',
    ];
    for (const id of economy) {
      expect(ids.has(id), `Missing economy offer: ${id}`).toBe(true);
    }
  });

  it('mechanic-changing offers are rarity epic', () => {
    const mechanic = [
      'ricochet-shot', 'flash-freeze', 'chain-reactor', 'plague-doctor',
      'aftershock', 'glass-cannon', 'permafrost', 'living-poison',
      'overkill-transfer', 'shared-pain',
    ];
    const byId = new Map(ALL_OFFERS.map(o => [o.id, o]));
    for (const id of mechanic) {
      const o = byId.get(id);
      expect(o, `Offer ${id} not found`).toBeDefined();
      expect(o!.rarity, `${id} should be epic`).toBe('epic');
    }
  });

  it('challenge offers have isChallenge=true', () => {
    const challenges = ['tower-tax', 'stone-skin', 'war-chest-wave'];
    const byId = new Map(ALL_OFFERS.map(o => [o.id, o]));
    for (const id of challenges) {
      const o = byId.get(id);
      expect(o, `Offer ${id} not found`).toBeDefined();
      expect(o!.isChallenge, `${id} should be isChallenge=true`).toBe(true);
    }
  });

  it('non-challenge offers do not have isChallenge set', () => {
    const safe = ['ricochet-shot', 'flash-freeze', 'gold-rush', 'interest'];
    const byId = new Map(ALL_OFFERS.map(o => [o.id, o]));
    for (const id of safe) {
      const o = byId.get(id)!;
      expect(o.isChallenge).toBeFalsy();
    }
  });

  it('synergy offers have synergyRequires populated', () => {
    const gated = ['shatter', 'conductor', 'siege-mode', 'arctic-shrapnel', 'voltaic-venom', 'stone-skin'];
    const byId = new Map(ALL_OFFERS.map(o => [o.id, o]));
    for (const id of gated) {
      const o = byId.get(id)!;
      expect(o.synergyRequires, `${id} should have synergyRequires`).toBeDefined();
      expect(o.synergyRequires!.length, `${id} synergyRequires should be non-empty`).toBeGreaterThan(0);
    }
  });

  it('non-synergy-gated offers do not have synergyRequires', () => {
    const notGated = ['ricochet-shot', 'gold-rush', 'glass-cannon', 'insurance', 'blood-price'];
    const byId = new Map(ALL_OFFERS.map(o => [o.id, o]));
    for (const id of notGated) {
      const o = byId.get(id)!;
      expect(!o.synergyRequires || o.synergyRequires.length === 0).toBe(true);
    }
  });

  it('rarity distribution: ~50% common, ~35% rare, ~15% epic (within ±10pp)', () => {
    const total   = ALL_OFFERS.length;
    const common  = ALL_OFFERS.filter(o => o.rarity === 'common').length;
    const rare    = ALL_OFFERS.filter(o => o.rarity === 'rare').length;
    const epic    = ALL_OFFERS.filter(o => o.rarity === 'epic').length;

    const pCommon = common / total;
    const pRare   = rare   / total;
    const pEpic   = epic   / total;

    expect(pCommon).toBeGreaterThanOrEqual(0.40);  // target 50%
    expect(pCommon).toBeLessThanOrEqual(0.65);
    expect(pRare).toBeGreaterThanOrEqual(0.25);    // target 35%
    expect(pRare).toBeLessThanOrEqual(0.45);
    expect(pEpic).toBeGreaterThanOrEqual(0.10);    // target 15%
    expect(pEpic).toBeLessThanOrEqual(0.25);
  });

  it('all weights are positive', () => {
    for (const o of ALL_OFFERS) {
      expect(o.weight).toBeGreaterThan(0);
    }
  });

  it('all descriptions fit card UI (≤ 100 chars)', () => {
    for (const o of ALL_OFFERS) {
      expect(o.description.length, `${o.id} description too long`).toBeLessThanOrEqual(100);
    }
  });

  it('all categories are valid', () => {
    const valid = ['combat', 'economy', 'synergy'];
    for (const o of ALL_OFFERS) {
      expect(valid).toContain(o.category);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('OfferManager — synergy gating', () => {
  let om: OfferManager;

  beforeEach(() => {
    om = new OfferManager();
  });

  it('shatter only offered when both frost and mortar are placed', () => {
    // Activate all offers except shatter so the pool is exhausted — shatter should
    // still NOT appear when towers don't meet the requirement.
    for (const o of ALL_OFFERS) {
      if (o.id !== 'shatter') om.applyOffer(o.id);
    }
    // No towers placed → shatter should not appear in fallback (synergyRequires not met)
    const drawn = om.drawOffers(3, []);
    const ids = drawn.map(o => o.id);
    expect(ids).not.toContain('shatter');
  });

  it('shatter appears when frost AND mortar are placed', () => {
    // Activate all offers except shatter
    for (const o of ALL_OFFERS) {
      if (o.id !== 'shatter') om.applyOffer(o.id);
    }
    // Both frost and mortar placed
    const drawn = om.drawOffers(3, ['frost', 'mortar']);
    const ids = drawn.map(o => o.id);
    expect(ids).toContain('shatter');
  });

  it('shatter not offered when only frost is placed (no mortar)', () => {
    for (const o of ALL_OFFERS) {
      if (o.id !== 'shatter') om.applyOffer(o.id);
    }
    const drawn = om.drawOffers(3, ['frost']);
    const ids = drawn.map(o => o.id);
    expect(ids).not.toContain('shatter');
  });

  it('conductor NOT offered even when poison and tesla are placed (air+ground incompatible)', () => {
    for (const o of ALL_OFFERS) {
      if (o.id !== 'conductor') om.applyOffer(o.id);
    }
    // conductor requires poison+tesla but tesla=air and poison=ground — canSynergize returns false
    const drawn = om.drawOffers(3, ['poison', 'tesla']);
    expect(drawn.map(o => o.id)).not.toContain('conductor');
  });

  it('siege-mode offered when cannon and aura are placed', () => {
    for (const o of ALL_OFFERS) {
      if (o.id !== 'siege-mode') om.applyOffer(o.id);
    }
    const drawn = om.drawOffers(3, ['cannon', 'aura']);
    expect(drawn.map(o => o.id)).toContain('siege-mode');
  });

  it('arctic-shrapnel offered when mortar is placed', () => {
    for (const o of ALL_OFFERS) {
      if (o.id !== 'arctic-shrapnel') om.applyOffer(o.id);
    }
    const drawn = om.drawOffers(3, ['mortar']);
    expect(drawn.map(o => o.id)).toContain('arctic-shrapnel');
  });

  it('voltaic-venom not offered without tesla + poison', () => {
    for (const o of ALL_OFFERS) {
      if (o.id !== 'voltaic-venom') om.applyOffer(o.id);
    }
    const drawn = om.drawOffers(3, ['cannon']);
    expect(drawn.map(o => o.id)).not.toContain('voltaic-venom');
  });

  it('drawOffers with empty placedTowerKeys still draws non-synergy offers', () => {
    const drawn = om.drawOffers(3, []);
    expect(drawn.length).toBe(3);
    // All drawn should be non-gated offers
    for (const o of drawn) {
      expect(!o.synergyRequires || o.synergyRequires.length === 0).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('OfferManager — anti-duplication', () => {
  let om: OfferManager;

  beforeEach(() => {
    om = new OfferManager();
  });

  it('no intra-draw duplicates', () => {
    const drawn = om.drawOffers(3);
    const ids = drawn.map(o => o.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('the same offer is not drawn twice in the same run when pool has enough unique offers', () => {
    // Apply half the pool; remaining unique offers should fill the 3 slots.
    const half = ALL_OFFERS.slice(0, Math.floor(ALL_OFFERS.length / 2));
    for (const o of half) om.applyOffer(o.id);

    const drawn = om.drawOffers(3);
    for (const o of drawn) {
      expect(half.some(h => h.id === o.id)).toBe(false);
    }
  });

  it('after applying an offer it is not drawn again (anti-duplication on next draw)', () => {
    const [first] = om.drawOffers(1);
    om.applyOffer(first.id);

    // Repeat 10 draws; the applied offer should never appear.
    for (let i = 0; i < 10; i++) {
      const next = om.drawOffers(1);
      expect(next[0].id).not.toBe(first.id);
    }
  });

  it('pads with already-active offers when pool exhausted', () => {
    for (const o of ALL_OFFERS) om.applyOffer(o.id);
    const drawn = om.drawOffers(3);
    // All returned IDs must exist in the pool
    for (const d of drawn) {
      expect(ALL_OFFERS.some(o => o.id === d.id)).toBe(true);
    }
    expect(drawn.length).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('OfferManager — Phase 14 query methods', () => {
  let om: OfferManager;

  beforeEach(() => {
    om = new OfferManager();
  });

  // ── Mechanic-changing ─────────────────────────────────────────────────────

  describe('hasRicochetShot', () => {
    it('returns false without offer', () => expect(om.hasRicochetShot()).toBe(false));
    it('returns true when active', () => {
      om.applyOffer('ricochet-shot');
      expect(om.hasRicochetShot()).toBe(true);
    });
  });

  describe('isFlashFreezeActive', () => {
    it('returns false without offer', () => expect(om.isFlashFreezeActive()).toBe(false));
    it('returns true when active', () => {
      om.applyOffer('flash-freeze');
      expect(om.isFlashFreezeActive()).toBe(true);
    });
  });

  describe('hasChainReactor', () => {
    it('returns false without offer', () => expect(om.hasChainReactor()).toBe(false));
    it('returns true when active', () => {
      om.applyOffer('chain-reactor');
      expect(om.hasChainReactor()).toBe(true);
    });
  });

  describe('isPlagueDoctorActive / getPlagueDoctorMaxStacks', () => {
    it('returns false without offer', () => expect(om.isPlagueDoctorActive()).toBe(false));
    it('returns true when active', () => {
      om.applyOffer('plague-doctor');
      expect(om.isPlagueDoctorActive()).toBe(true);
    });
    it('returns baseCap when not active', () => {
      expect(om.getPlagueDoctorMaxStacks(4)).toBe(4);
    });
    it('returns max(5, baseCap) when active', () => {
      om.applyOffer('plague-doctor');
      expect(om.getPlagueDoctorMaxStacks(4)).toBe(5);  // 4 → 5
      expect(om.getPlagueDoctorMaxStacks(8)).toBe(8);  // already > 5
    });
  });

  describe('hasAftershock', () => {
    it('returns false without offer', () => expect(om.hasAftershock()).toBe(false));
    it('returns true when active', () => {
      om.applyOffer('aftershock');
      expect(om.hasAftershock()).toBe(true);
    });
  });

  describe('getAuraLeechGold', () => {
    it('returns 0 without offer', () => expect(om.getAuraLeechGold(1000)).toBe(0));
    it('returns 5% of buffed damage', () => {
      om.applyOffer('aura-leech');
      expect(om.getAuraLeechGold(1000)).toBe(50);
      expect(om.getAuraLeechGold(200)).toBe(10);
    });
    it('returns 0 when buffed damage is 0', () => {
      om.applyOffer('aura-leech');
      expect(om.getAuraLeechGold(0)).toBe(0);
    });
  });

  describe('getGlassCannonDamageMult / getGlassCannonRangeMult', () => {
    it('returns 1.0 without offer', () => {
      expect(om.getGlassCannonDamageMult('cannon')).toBe(1.0);
      expect(om.getGlassCannonRangeMult('cannon')).toBe(1.0);
    });
    it('returns 2.0 damage / 0.5 range for cannon with offer', () => {
      om.applyOffer('glass-cannon');
      expect(om.getGlassCannonDamageMult('cannon')).toBe(2.0);
      expect(om.getGlassCannonRangeMult('cannon')).toBe(0.5);
    });
    it('returns 1.0 for non-cannon towers', () => {
      om.applyOffer('glass-cannon');
      expect(om.getGlassCannonDamageMult('frost')).toBe(1.0);
      expect(om.getGlassCannonRangeMult('mortar')).toBe(1.0);
    });
  });

  describe('isPermafrostActive / getPermafrostSlowFactor', () => {
    it('not active by default', () => expect(om.isPermafrostActive()).toBe(false));
    it('active when offer applied', () => {
      om.applyOffer('permafrost');
      expect(om.isPermafrostActive()).toBe(true);
    });
    it('returns unmodified factor without offer', () => {
      expect(om.getPermafrostSlowFactor(0.4)).toBeCloseTo(0.4);
    });
    it('halves slow magnitude (moves slowFactor halfway toward 1.0) with offer', () => {
      om.applyOffer('permafrost');
      // base=0.4 → halfway to 1.0 = 0.4 + (1 - 0.4) * 0.5 = 0.4 + 0.3 = 0.7
      expect(om.getPermafrostSlowFactor(0.4)).toBeCloseTo(0.70);
      // base=0.6 → 0.6 + 0.2 = 0.8
      expect(om.getPermafrostSlowFactor(0.6)).toBeCloseTo(0.80);
    });
  });

  describe('hasLivingPoison', () => {
    it('returns false by default', () => expect(om.hasLivingPoison()).toBe(false));
    it('returns true when active', () => {
      om.applyOffer('living-poison');
      expect(om.hasLivingPoison()).toBe(true);
    });
  });

  describe('hasOverkillTransfer', () => {
    it('returns false by default', () => expect(om.hasOverkillTransfer()).toBe(false));
    it('returns true when active', () => {
      om.applyOffer('overkill-transfer');
      expect(om.hasOverkillTransfer()).toBe(true);
    });
  });

  describe('getSharedPainMult', () => {
    it('returns 0 without offer', () => expect(om.getSharedPainMult()).toBe(0));
    it('returns 0.25 when active', () => {
      om.applyOffer('shared-pain');
      expect(om.getSharedPainMult()).toBe(0.25);
    });
  });

  describe('hasTowerTax', () => {
    it('returns false by default', () => expect(om.hasTowerTax()).toBe(false));
    it('returns true when active', () => {
      om.applyOffer('tower-tax');
      expect(om.hasTowerTax()).toBe(true);
    });
  });

  // ── Synergy ───────────────────────────────────────────────────────────────

  describe('getShatterMult', () => {
    it('returns 1.0 without offer', () => {
      expect(om.getShatterMult(true, true)).toBe(1.0);
    });
    it('returns 3.0 when frozen + mortar hit + offer', () => {
      om.applyOffer('shatter');
      expect(om.getShatterMult(true, true)).toBe(3.0);
    });
    it('returns 1.0 if not frozen', () => {
      om.applyOffer('shatter');
      expect(om.getShatterMult(false, true)).toBe(1.0);
    });
    it('returns 1.0 if not mortar hit', () => {
      om.applyOffer('shatter');
      expect(om.getShatterMult(true, false)).toBe(1.0);
    });
  });

  describe('getConductorMult', () => {
    it('returns 1.0 without offer', () => {
      expect(om.getConductorMult(true, true)).toBe(1.0);
    });
    it('returns 1.5 with offer + poison + tesla', () => {
      om.applyOffer('conductor');
      expect(om.getConductorMult(true, true)).toBe(1.50);
    });
    it('returns 1.0 without poison stacks', () => {
      om.applyOffer('conductor');
      expect(om.getConductorMult(false, true)).toBe(1.0);
    });
  });

  describe('getSiegeModeModifiers', () => {
    it('returns no-op without offer', () => {
      const r = om.getSiegeModeModifiers('cannon', true);
      expect(r.intervalMult).toBe(1.0);
      expect(r.damageMult).toBe(1.0);
    });
    it('returns 2× interval, 3× damage for cannon near aura with offer', () => {
      om.applyOffer('siege-mode');
      const r = om.getSiegeModeModifiers('cannon', true);
      expect(r.intervalMult).toBe(2.0);
      expect(r.damageMult).toBe(3.0);
    });
    it('no-op for non-cannon tower', () => {
      om.applyOffer('siege-mode');
      const r = om.getSiegeModeModifiers('frost', true);
      expect(r.intervalMult).toBe(1.0);
      expect(r.damageMult).toBe(1.0);
    });
    it('no-op when not near aura', () => {
      om.applyOffer('siege-mode');
      const r = om.getSiegeModeModifiers('cannon', false);
      expect(r.intervalMult).toBe(1.0);
      expect(r.damageMult).toBe(1.0);
    });
  });

  describe('hasArcticShrapnel / hasVoltaicVenom / hasStoneSkin / hasBloodPrice', () => {
    const pairs: [string, () => boolean][] = [
      ['arctic-shrapnel', () => om.hasArcticShrapnel()],
      ['voltaic-venom',   () => om.hasVoltaicVenom()],
      ['stone-skin',      () => om.hasStoneSkin()],
      ['blood-price',     () => om.hasBloodPrice()],
    ];
    for (const [id, fn] of pairs) {
      it(`${id}: false by default, true when active`, () => {
        expect(fn()).toBe(false);
        om.applyOffer(id);
        expect(fn()).toBe(true);
      });
    }
  });

  describe('getCrowdedHouseMult', () => {
    it('returns 1.0 without offer', () => {
      expect(om.getCrowdedHouseMult(5)).toBe(1.0);
    });
    it('returns +5% per nearby tower', () => {
      om.applyOffer('crowded-house');
      expect(om.getCrowdedHouseMult(1)).toBeCloseTo(1.05);
      expect(om.getCrowdedHouseMult(4)).toBeCloseTo(1.20);
    });
    it('caps at +35% (7 towers)', () => {
      om.applyOffer('crowded-house');
      expect(om.getCrowdedHouseMult(7)).toBeCloseTo(1.35);
      expect(om.getCrowdedHouseMult(10)).toBeCloseTo(1.35);
      expect(om.getCrowdedHouseMult(100)).toBeCloseTo(1.35);
    });
    it('returns 1.0 for 0 nearby towers', () => {
      om.applyOffer('crowded-house');
      expect(om.getCrowdedHouseMult(0)).toBeCloseTo(1.0);
    });
  });

  // ── Economy ───────────────────────────────────────────────────────────────

  describe('getSellRefundRate with salvage-rights', () => {
    it('default is 0.70', () => expect(om.getSellRefundRate()).toBe(0.70));
    it('scavenger → 0.85', () => {
      om.applyOffer('scavenger');
      expect(om.getSellRefundRate()).toBe(0.85);
    });
    it('salvage-rights → 0.90', () => {
      om.applyOffer('salvage-rights');
      expect(om.getSellRefundRate()).toBe(0.90);
    });
    it('both scavenger + salvage-rights → 0.90 (salvage-rights wins)', () => {
      om.applyOffer('scavenger');
      om.applyOffer('salvage-rights');
      expect(om.getSellRefundRate()).toBe(0.90);
    });
  });

  describe('getBulkDiscountRate', () => {
    it('returns 0 without offer', () => {
      expect(om.getBulkDiscountRate(3)).toBe(0);
    });
    it('returns 5% per same-type tower', () => {
      om.applyOffer('bulk-discount');
      expect(om.getBulkDiscountRate(1)).toBeCloseTo(0.05);
      expect(om.getBulkDiscountRate(4)).toBeCloseTo(0.20);
    });
    it('caps at 50% discount', () => {
      om.applyOffer('bulk-discount');
      expect(om.getBulkDiscountRate(10)).toBeCloseTo(0.50);
      expect(om.getBulkDiscountRate(100)).toBeCloseTo(0.50);
    });
    it('returns 0 for 0 same-type towers', () => {
      om.applyOffer('bulk-discount');
      expect(om.getBulkDiscountRate(0)).toBe(0);
    });
  });

  describe('applyPlacementCost with bulk-discount and tower-tax', () => {
    it('bulk-discount reduces cost by 5% per same-type tower', () => {
      om.applyOffer('bulk-discount');
      // 1 of same type already placed → 5% off
      expect(om.applyPlacementCost(100, 'cannon', 1)).toBe(95);
    });
    it('bulk-discount with 4 same-type → 20% off', () => {
      const om2 = new OfferManager();
      om2.applyOffer('bulk-discount');
      expect(om2.applyPlacementCost(100, 'frost', 4)).toBe(80);
    });
    it('tower-tax increases cost by 20%', () => {
      om.applyOffer('tower-tax');
      // first call: no same-type
      expect(om.applyPlacementCost(100, 'cannon', 0)).toBe(120);
    });
    it('tower-tax and bulk-discount compose: tax applied after discount', () => {
      // bulk-discount: -5% for 1 same-type → 95g then tower-tax +20% → 114g
      const om2 = new OfferManager();
      om2.applyOffer('bulk-discount');
      om2.applyOffer('tower-tax');
      // floor(floor(100 * 0.95) * 1.20) = floor(95 * 1.20) = floor(114) = 114
      expect(om2.applyPlacementCost(100, 'cannon', 1)).toBe(114);
    });
  });

  describe('getWarChestWaveBonus', () => {
    it('returns 0 without offer', () => expect(om.getWarChestWaveBonus()).toBe(0));
    it('returns 15 with offer', () => {
      om.applyOffer('war-chest-wave');
      expect(om.getWarChestWaveBonus()).toBe(15);
    });
  });

  describe('getKillRewardMult with war-chest-wave', () => {
    it('war-chest-wave reduces kill gold by 20%', () => {
      om.applyOffer('war-chest-wave');
      expect(om.getKillRewardMult()).toBeCloseTo(0.80);
    });
    it('bounty-hunter + war-chest-wave: 1.2 × 0.8 = 0.96', () => {
      om.applyOffer('bounty-hunter');
      om.applyOffer('war-chest-wave');
      expect(om.getKillRewardMult()).toBeCloseTo(0.96);
    });
  });

  describe('isGamblerWave', () => {
    it('returns false without offer', () => {
      om.setWavesCompleted(5);
      expect(om.isGamblerWave()).toBe(false);
    });
    it('returns true on waves divisible by 5 with offer', () => {
      om.applyOffer('gambler');
      om.setWavesCompleted(5);
      expect(om.isGamblerWave()).toBe(true);
      om.setWavesCompleted(10);
      expect(om.isGamblerWave()).toBe(true);
    });
    it('returns false on non-divisible waves', () => {
      om.applyOffer('gambler');
      om.setWavesCompleted(3);
      expect(om.isGamblerWave()).toBe(false);
    });
    it('returns false on wave 0', () => {
      om.applyOffer('gambler');
      om.setWavesCompleted(0);
      expect(om.isGamblerWave()).toBe(false);
    });
  });

  describe('getRecyclerRate', () => {
    it('returns 0 without offer', () => expect(om.getRecyclerRate()).toBe(0));
    it('returns 0.5 with offer', () => {
      om.applyOffer('recycler');
      expect(om.getRecyclerRate()).toBe(0.50);
    });
  });

  describe('headstart (one-time)', () => {
    it('not available without offer', () => {
      expect(om.isHeadstartAvailable()).toBe(false);
    });
    it('available when offer active and not consumed', () => {
      om.applyOffer('headstart');
      expect(om.isHeadstartAvailable()).toBe(true);
    });
    it('not available after consume', () => {
      om.applyOffer('headstart');
      om.consumeHeadstart();
      expect(om.isHeadstartAvailable()).toBe(false);
    });
    it('appears in getConsumedOneTimeOfferIds after consume', () => {
      om.applyOffer('headstart');
      om.consumeHeadstart();
      expect(om.getConsumedOneTimeOfferIds()).toContain('headstart');
    });
  });

  describe('bounty-escape', () => {
    it('hasBountyEscape: false without offer', () => expect(om.hasBountyEscape()).toBe(false));
    it('hasBountyEscape: true when active', () => {
      om.applyOffer('bounty-escape');
      expect(om.hasBountyEscape()).toBe(true);
    });
    it('activateBounty / isBountyActive / consumeBounty', () => {
      expect(om.isBountyActive()).toBe(false);
      om.activateBounty();
      expect(om.isBountyActive()).toBe(true);
      om.consumeBounty();
      expect(om.isBountyActive()).toBe(false);
    });
  });

  describe('getInsuranceBonus', () => {
    it('returns 0 without offer', () => expect(om.getInsuranceBonus(3)).toBe(0));
    it('returns 20 when 2+ lives lost', () => {
      om.applyOffer('insurance');
      expect(om.getInsuranceBonus(2)).toBe(20);
      expect(om.getInsuranceBonus(5)).toBe(20);
    });
    it('returns 0 when fewer than 2 lives lost', () => {
      om.applyOffer('insurance');
      expect(om.getInsuranceBonus(0)).toBe(0);
      expect(om.getInsuranceBonus(1)).toBe(0);
    });
  });

  describe('getMarksmanRangeBonus', () => {
    it('returns 0 without offer', () => expect(om.getMarksmanRangeBonus()).toBe(0));
    it('returns 0.15 with offer', () => {
      om.applyOffer('marksman');
      expect(om.getMarksmanRangeBonus()).toBeCloseTo(0.15);
    });
  });

  describe('hasFocusedFire / getFocusedFireMult', () => {
    it('hasFocusedFire: false by default', () => expect(om.hasFocusedFire()).toBe(false));
    it('hasFocusedFire: true when active', () => {
      om.applyOffer('focused-fire');
      expect(om.hasFocusedFire()).toBe(true);
    });
    it('getFocusedFireMult: 1.0 without offer', () => {
      expect(om.getFocusedFireMult(true)).toBe(1.0);
    });
    it('getFocusedFireMult: 1.10 with offer + shared target', () => {
      om.applyOffer('focused-fire');
      expect(om.getFocusedFireMult(true)).toBeCloseTo(1.10);
    });
    it('getFocusedFireMult: 1.0 with offer but no shared target', () => {
      om.applyOffer('focused-fire');
      expect(om.getFocusedFireMult(false)).toBe(1.0);
    });
  });

  // ── getGlobalDamageMult with new offers ───────────────────────────────────

  describe('getGlobalDamageMult extended', () => {
    it('tower-tax: +15% damage per tower placed', () => {
      om.applyOffer('tower-tax');
      // 5 towers placed → +75% = 1.75
      expect(om.getGlobalDamageMult(5)).toBeCloseTo(1.75);
    });
    it('marksman: -10% damage penalty', () => {
      om.applyOffer('marksman');
      expect(om.getGlobalDamageMult(0)).toBeCloseTo(0.90);
    });
    it('tower-tax + marksman compose multiplicatively', () => {
      om.applyOffer('tower-tax');
      om.applyOffer('marksman');
      // (1 + 5*0.15) * 0.90 = 1.75 * 0.90 = 1.575
      expect(om.getGlobalDamageMult(5)).toBeCloseTo(1.575);
    });
    it('with no offers and 0 towers returns 1.0', () => {
      expect(om.getGlobalDamageMult(0)).toBe(1.0);
    });
  });

  // ── restoreFromIds with headstart ─────────────────────────────────────────

  describe('restoreFromIds with headstart', () => {
    it('restores headstart as consumed when in consumedOfferIds', () => {
      om.restoreFromIds(['headstart'], ['headstart']);
      expect(om.isHeadstartAvailable()).toBe(false);
    });
    it('headstart available when not in consumedOfferIds', () => {
      om.restoreFromIds(['headstart'], []);
      expect(om.isHeadstartAvailable()).toBe(true);
    });
  });
});
