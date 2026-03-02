import { describe, it, expect, beforeEach } from 'vitest';
import { OfferManager } from '../OfferManager';
import { ALL_OFFERS } from '../../data/offerDefs';

describe('OfferManager', () => {
  let om: OfferManager;

  beforeEach(() => {
    om = new OfferManager();
  });

  // ── drawOffers ──────────────────────────────────────────────────────────────

  describe('drawOffers', () => {
    it('returns exactly n offers', () => {
      const drawn = om.drawOffers(3);
      expect(drawn).toHaveLength(3);
    });

    it('returns no intra-draw duplicates', () => {
      const drawn = om.drawOffers(3);
      const ids = drawn.map(o => o.id);
      expect(new Set(ids).size).toBe(3);
    });

    it('prioritises non-active offers over active ones', () => {
      // Activate all but 3 offers.
      for (const o of ALL_OFFERS.slice(3)) om.applyOffer(o.id);

      const drawn = om.drawOffers(3);
      const drawnIds = new Set(drawn.map(o => o.id));
      const expectedIds = new Set(ALL_OFFERS.slice(0, 3).map(o => o.id));
      expect(drawnIds).toEqual(expectedIds);
    });

    it('pads with already-active offers when pool is exhausted', () => {
      // Activate all offers.
      for (const o of ALL_OFFERS) om.applyOffer(o.id);

      const drawn = om.drawOffers(3);
      expect(drawn).toHaveLength(3);
      // All drawn must be from ALL_OFFERS.
      for (const d of drawn) {
        expect(ALL_OFFERS.some(o => o.id === d.id)).toBe(true);
      }
    });

    it('returns fewer than n if total pool < n', () => {
      // Edge: only 1 offer exists would require a tiny pool. Just verify
      // that drawing more than pool size doesn't crash.
      const drawn = om.drawOffers(999);
      expect(drawn.length).toBe(ALL_OFFERS.length);
    });
  });

  // ── applyOffer / hasOffer / getActiveOffers ─────────────────────────────────

  describe('offer state tracking', () => {
    it('tracks applied offers', () => {
      om.applyOffer('gold-rush');
      expect(om.hasOffer('gold-rush')).toBe(true);
      expect(om.hasOffer('scavenger')).toBe(false);
    });

    it('getActiveOffers returns only active offers', () => {
      om.applyOffer('gold-rush');
      om.applyOffer('scavenger');
      const active = om.getActiveOffers();
      expect(active).toHaveLength(2);
      expect(active.map(o => o.id)).toContain('gold-rush');
      expect(active.map(o => o.id)).toContain('scavenger');
    });
  });

  // ── Economy queries ─────────────────────────────────────────────────────────

  describe('getWaveBonusMult', () => {
    it('returns 1.0 without Gold Rush', () => {
      expect(om.getWaveBonusMult()).toBe(1.0);
    });

    it('returns 1.5 with Gold Rush', () => {
      om.applyOffer('gold-rush');
      expect(om.getWaveBonusMult()).toBe(1.5);
    });
  });

  describe('getSellRefundRate', () => {
    it('returns 0.70 by default', () => {
      expect(om.getSellRefundRate()).toBe(0.70);
    });

    it('returns 0.85 with Scavenger', () => {
      om.applyOffer('scavenger');
      expect(om.getSellRefundRate()).toBe(0.85);
    });
  });

  describe('getInterestBonus', () => {
    it('returns 0 without Interest offer', () => {
      expect(om.getInterestBonus(1000)).toBe(0);
    });

    it('returns 2% of gold (floored) with Interest', () => {
      om.applyOffer('interest');
      expect(om.getInterestBonus(1000)).toBe(20);
      expect(om.getInterestBonus(550)).toBe(11);
    });

    it('returns minimum 5 gold with Interest on low gold', () => {
      om.applyOffer('interest');
      expect(om.getInterestBonus(100)).toBe(5); // 2% of 100 = 2, but min 5
      expect(om.getInterestBonus(0)).toBe(5);
    });
  });

  describe('getBossKillBonus', () => {
    it('returns 0 without War Chest', () => {
      expect(om.getBossKillBonus()).toBe(0);
    });

    it('returns 200 with War Chest', () => {
      om.applyOffer('war-chest');
      expect(om.getBossKillBonus()).toBe(200);
    });
  });

  describe('getEscapeRefund', () => {
    it('returns 0 without Tax Collector', () => {
      expect(om.getEscapeRefund(20)).toBe(0);
    });

    it('returns 50% of reward with Tax Collector', () => {
      om.applyOffer('tax-collector');
      expect(om.getEscapeRefund(20)).toBe(10);
      expect(om.getEscapeRefund(15)).toBe(7); // floor(7.5)
    });

    it('returns 0 for 0-value creep', () => {
      om.applyOffer('tax-collector');
      expect(om.getEscapeRefund(0)).toBe(0);
    });
  });

  describe('isRespecFree', () => {
    it('returns false by default', () => {
      expect(om.isRespecFree()).toBe(false);
    });

    it('returns true with Resourceful', () => {
      om.applyOffer('resourceful');
      expect(om.isRespecFree()).toBe(true);
    });
  });

  // ── applyPlacementCost ─────────────────────────────────────────────────────

  describe('applyPlacementCost', () => {
    it('returns base cost with no offers', () => {
      expect(om.applyPlacementCost(100)).toBe(100);
    });

    it('applies Merchant Favor -10%', () => {
      om.applyOffer('merchant-favor');
      expect(om.applyPlacementCost(100)).toBe(90);
    });

    it('applies Rapid Deploy -15%', () => {
      om.applyOffer('rapid-deploy');
      expect(om.applyPlacementCost(100)).toBe(85);
    });

    it('stacks Merchant Favor + Rapid Deploy multiplicatively', () => {
      om.applyOffer('merchant-favor');
      om.applyOffer('rapid-deploy');
      // floor(floor(100 * 0.90) * 0.85) = floor(90 * 0.85) = floor(76.5) = 76
      expect(om.applyPlacementCost(100)).toBe(76);
    });

    it('Investment: first tower per wave free if base ≤ 100', () => {
      om.applyOffer('investment');
      expect(om.applyPlacementCost(100)).toBe(0); // first tower, base ≤ 100
      expect(om.applyPlacementCost(100)).toBe(100); // second tower, not free
    });

    it('Investment: does not apply if base > 100', () => {
      om.applyOffer('investment');
      expect(om.applyPlacementCost(150)).toBe(150);
    });

    it('Investment resets each wave via resetWavePlacements', () => {
      om.applyOffer('investment');
      om.applyPlacementCost(80); // first tower, free
      om.resetWavePlacements();
      expect(om.applyPlacementCost(80)).toBe(0); // first tower of new wave, free again
    });

    it('Bulk Order: every 3rd tower is 50% off', () => {
      om.applyOffer('bulk-order');
      om.applyPlacementCost(100); // tower 1: full price
      om.applyPlacementCost(100); // tower 2: full price
      expect(om.applyPlacementCost(100)).toBe(50); // tower 3: 50% off
    });
  });

  // ── Combat: onKill ─────────────────────────────────────────────────────────

  describe('onKill', () => {
    it('returns all false with no combat offers', () => {
      const r = om.onKill();
      expect(r.chainReaction).toBe(false);
      expect(r.lifeGain).toBe(false);
      expect(r.shockwave).toBe(false);
    });

    it('Chain Reaction: fires on every kill', () => {
      om.applyOffer('chain-reaction');
      expect(om.onKill().chainReaction).toBe(true);
    });

    it('Lifesteal: fires on every 50th kill', () => {
      om.applyOffer('lifesteal');
      for (let i = 1; i < 50; i++) {
        expect(om.onKill().lifeGain).toBe(false);
      }
      expect(om.onKill().lifeGain).toBe(true); // kill #50
    });

    it('Shockwave: fires on every 10th kill', () => {
      om.applyOffer('shockwave');
      for (let i = 1; i < 10; i++) {
        expect(om.onKill().shockwave).toBe(false);
      }
      expect(om.onKill().shockwave).toBe(true); // kill #10
    });

    it('multiple combat offers compose independently', () => {
      om.applyOffer('chain-reaction');
      om.applyOffer('shockwave');
      om.applyOffer('lifesteal');

      // Kill 50 to trigger all 3.
      for (let i = 1; i < 50; i++) om.onKill();
      const r = om.onKill(); // kill #50
      expect(r.chainReaction).toBe(true);
      expect(r.lifeGain).toBe(true);
      expect(r.shockwave).toBe(true); // 50 is divisible by 10
    });
  });

  describe('hasBloodlust / hasAfterburn', () => {
    it('returns false by default', () => {
      expect(om.hasBloodlust()).toBe(false);
      expect(om.hasAfterburn()).toBe(false);
    });

    it('returns true when active', () => {
      om.applyOffer('bloodlust');
      om.applyOffer('afterburn');
      expect(om.hasBloodlust()).toBe(true);
      expect(om.hasAfterburn()).toBe(true);
    });
  });

  // ── Damage multipliers ────────────────────────────────────────────────────

  describe('getGlobalDamageMult', () => {
    it('returns 1.0 with no offers', () => {
      expect(om.getGlobalDamageMult()).toBe(1.0);
    });

    it('Last Stand: +25% when lives < 5', () => {
      om.applyOffer('last-stand');
      om.setCurrentLives(4);
      expect(om.getGlobalDamageMult()).toBe(1.25);
    });

    it('Last Stand: no bonus when lives >= 5', () => {
      om.applyOffer('last-stand');
      om.setCurrentLives(5);
      expect(om.getGlobalDamageMult()).toBe(1.0);
    });

    it('Veteran Arms: +5% per 5 waves', () => {
      om.applyOffer('veteran-arms');
      om.setWavesCompleted(10);
      expect(om.getGlobalDamageMult()).toBe(1.10); // 2 × 5%
    });

    it('Veteran Arms: no bonus below 5 waves', () => {
      om.applyOffer('veteran-arms');
      om.setWavesCompleted(4);
      expect(om.getGlobalDamageMult()).toBe(1.0);
    });

    it('Last Stand + Veteran Arms compose multiplicatively', () => {
      om.applyOffer('last-stand');
      om.applyOffer('veteran-arms');
      om.setCurrentLives(3);
      om.setWavesCompleted(10);
      // 1.25 * 1.10 = 1.375
      expect(om.getGlobalDamageMult()).toBeCloseTo(1.375);
    });
  });

  describe('getHeartseekerMult', () => {
    it('returns 1.0 without Heartseeker', () => {
      expect(om.getHeartseekerMult(0.1)).toBe(1.0);
    });

    it('returns 1.20 for HP < 30%', () => {
      om.applyOffer('heartseeker');
      expect(om.getHeartseekerMult(0.29)).toBe(1.20);
    });

    it('returns 1.0 for HP >= 30%', () => {
      om.applyOffer('heartseeker');
      expect(om.getHeartseekerMult(0.30)).toBe(1.0);
      expect(om.getHeartseekerMult(0.5)).toBe(1.0);
    });

    it('boundary: exactly 0.30 does NOT trigger', () => {
      om.applyOffer('heartseeker');
      expect(om.getHeartseekerMult(0.30)).toBe(1.0);
    });
  });

  describe('critRoll', () => {
    it('returns false without Critical Strike', () => {
      expect(om.critRoll()).toBe(false);
    });

    it('returns boolean with Critical Strike (probabilistic — run 1000 trials)', () => {
      om.applyOffer('critical-strike');
      let crits = 0;
      for (let i = 0; i < 1000; i++) {
        if (om.critRoll()) crits++;
      }
      // Expect ~10% crit rate within a wide tolerance.
      expect(crits).toBeGreaterThan(30);
      expect(crits).toBeLessThan(200);
    });
  });

  // ── Synergy multipliers ────────────────────────────────────────────────────

  describe('getVenomfrostSlowFactor', () => {
    it('returns base factor without Venomfrost', () => {
      expect(om.getVenomfrostSlowFactor(0.6, true)).toBe(0.6);
    });

    it('reduces slow factor by 30% on dotted targets', () => {
      om.applyOffer('venomfrost');
      expect(om.getVenomfrostSlowFactor(0.6, true)).toBeCloseTo(0.42);
    });

    it('no effect on non-dotted targets', () => {
      om.applyOffer('venomfrost');
      expect(om.getVenomfrostSlowFactor(0.6, false)).toBe(0.6);
    });
  });

  describe('getGlacialSurgeMult', () => {
    it('returns 1.0 without offer', () => {
      expect(om.getGlacialSurgeMult(true)).toBe(1.0);
    });

    it('returns 1.15 for slowed targets', () => {
      om.applyOffer('glacial-surge');
      expect(om.getGlacialSurgeMult(true)).toBe(1.15);
    });

    it('returns 1.0 for non-slowed targets', () => {
      om.applyOffer('glacial-surge');
      expect(om.getGlacialSurgeMult(false)).toBe(1.0);
    });
  });

  describe('getStaticFieldMult', () => {
    it('returns 1.20 for slowed targets with offer active', () => {
      om.applyOffer('static-field');
      expect(om.getStaticFieldMult(true)).toBe(1.20);
    });

    it('returns 1.0 for non-slowed', () => {
      om.applyOffer('static-field');
      expect(om.getStaticFieldMult(false)).toBe(1.0);
    });
  });

  describe('getGroundedMult', () => {
    it('returns 1.30 for armored targets with offer active', () => {
      om.applyOffer('grounded');
      expect(om.getGroundedMult(true)).toBe(1.30);
    });

    it('returns 1.0 for non-armored', () => {
      om.applyOffer('grounded');
      expect(om.getGroundedMult(false)).toBe(1.0);
    });
  });

  describe('getOverchargeMult', () => {
    it('returns 1.0 without offer', () => {
      expect(om.getOverchargeMult(0)).toBe(1.0);
      expect(om.getOverchargeMult(3)).toBe(1.0);
    });

    it('compounds 15% per bounce', () => {
      om.applyOffer('overcharge');
      expect(om.getOverchargeMult(0)).toBeCloseTo(1.0);        // 1.15^0
      expect(om.getOverchargeMult(1)).toBeCloseTo(1.15);       // 1.15^1
      expect(om.getOverchargeMult(2)).toBeCloseTo(1.3225);     // 1.15^2
      expect(om.getOverchargeMult(3)).toBeCloseTo(1.520875);   // 1.15^3
    });
  });

  describe('getBrittleIceMult', () => {
    it('returns 1.20 for slowed cannon targets', () => {
      om.applyOffer('brittle-ice');
      expect(om.getBrittleIceMult(true)).toBe(1.20);
    });

    it('returns 1.0 for non-slowed', () => {
      om.applyOffer('brittle-ice');
      expect(om.getBrittleIceMult(false)).toBe(1.0);
    });
  });

  describe('getLightningRodExtra', () => {
    it('returns 0 without offer', () => {
      expect(om.getLightningRodExtra(true)).toBe(0);
    });

    it('returns 1 for slowed targets with offer', () => {
      om.applyOffer('lightning-rod');
      expect(om.getLightningRodExtra(true)).toBe(1);
    });

    it('returns 0 for non-slowed with offer', () => {
      om.applyOffer('lightning-rod');
      expect(om.getLightningRodExtra(false)).toBe(0);
    });
  });

  describe('boolean helpers', () => {
    it('hasToxicShrapnel', () => {
      expect(om.hasToxicShrapnel()).toBe(false);
      om.applyOffer('toxic-shrapnel');
      expect(om.hasToxicShrapnel()).toBe(true);
    });

    it('hasExplosiveResidue', () => {
      expect(om.hasExplosiveResidue()).toBe(false);
      om.applyOffer('explosive-residue');
      expect(om.hasExplosiveResidue()).toBe(true);
    });

    it('hasAcidRain', () => {
      expect(om.hasAcidRain()).toBe(false);
      om.applyOffer('acid-rain');
      expect(om.hasAcidRain()).toBe(true);
    });

    it('hasCryoCannon', () => {
      expect(om.hasCryoCannon()).toBe(false);
      om.applyOffer('cryo-cannon');
      expect(om.hasCryoCannon()).toBe(true);
    });
  });

  // ── offerDefs validation ───────────────────────────────────────────────────

  describe('offerDefs integrity', () => {
    it('has at least 30 offers', () => {
      expect(ALL_OFFERS.length).toBeGreaterThanOrEqual(30);
    });

    it('all offer IDs are unique', () => {
      const ids = ALL_OFFERS.map(o => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all offers have valid categories', () => {
      const validCats = ['combat', 'economy', 'synergy'];
      for (const o of ALL_OFFERS) {
        expect(validCats).toContain(o.category);
      }
    });

    it('all weights are positive', () => {
      for (const o of ALL_OFFERS) {
        expect(o.weight).toBeGreaterThan(0);
      }
    });

    it('all descriptions are short enough for card UI', () => {
      for (const o of ALL_OFFERS) {
        // ~60 chars max for 220px card at 13px monospace with wordWrap.
        // We allow up to 80 chars since wordWrap handles multi-line.
        expect(o.description.length).toBeLessThanOrEqual(80);
      }
    });
  });

  // ── Phase 10 offer methods ─────────────────────────────────────────────────

  describe('getBlitzProtocolAttackSpeedMult', () => {
    it('returns 1.0 without Blitz Protocol', () => {
      expect(om.getBlitzProtocolAttackSpeedMult()).toBe(1.0);
    });

    it('returns 0.85 with Blitz Protocol (15% faster)', () => {
      om.applyOffer('blitz-protocol');
      expect(om.getBlitzProtocolAttackSpeedMult()).toBe(0.85);
    });
  });

  describe('getKillRewardMult', () => {
    it('returns 1.0 without Bounty Hunter', () => {
      expect(om.getKillRewardMult()).toBe(1.0);
    });

    it('returns 1.2 with Bounty Hunter (+20%)', () => {
      om.applyOffer('bounty-hunter');
      expect(om.getKillRewardMult()).toBe(1.2);
    });
  });

  describe('salvage (one-time 100% sell refund)', () => {
    it('isSalvageAvailable returns false without offer', () => {
      expect(om.isSalvageAvailable()).toBe(false);
    });

    it('isSalvageAvailable returns true when offer active and not consumed', () => {
      om.applyOffer('salvage');
      expect(om.isSalvageAvailable()).toBe(true);
    });

    it('consumeSalvage makes it unavailable', () => {
      om.applyOffer('salvage');
      om.consumeSalvage();
      expect(om.isSalvageAvailable()).toBe(false);
    });

    it('multiple consumeSalvage calls do not crash', () => {
      om.applyOffer('salvage');
      om.consumeSalvage();
      om.consumeSalvage(); // idempotent
      expect(om.isSalvageAvailable()).toBe(false);
    });
  });

  describe('getSupplyCacheBonus', () => {
    it('returns 0 without Supply Cache', () => {
      expect(om.getSupplyCacheBonus(5)).toBe(0);
    });

    it('returns 10 * towerCount with Supply Cache', () => {
      om.applyOffer('supply-cache');
      expect(om.getSupplyCacheBonus(0)).toBe(0);
      expect(om.getSupplyCacheBonus(1)).toBe(10);
      expect(om.getSupplyCacheBonus(5)).toBe(50);
    });
  });

  describe('getVoltaicSlimeMult', () => {
    it('returns 1.0 without offer', () => {
      expect(om.getVoltaicSlimeMult(true)).toBe(1.0);
    });

    it('returns 1.25 for poisoned targets with offer', () => {
      om.applyOffer('voltaic-slime');
      expect(om.getVoltaicSlimeMult(true)).toBe(1.25);
    });

    it('returns 1.0 for non-poisoned targets with offer', () => {
      om.applyOffer('voltaic-slime');
      expect(om.getVoltaicSlimeMult(false)).toBe(1.0);
    });
  });

  describe('hasConcussionShell', () => {
    it('returns false by default', () => {
      expect(om.hasConcussionShell()).toBe(false);
    });

    it('returns true when active', () => {
      om.applyOffer('concussion-shell');
      expect(om.hasConcussionShell()).toBe(true);
    });
  });

  describe('getOvergrowthRangeBonus', () => {
    it('returns 0 without offer', () => {
      expect(om.getOvergrowthRangeBonus('poison')).toBe(0);
    });

    it('returns 0.15 for poison towers with offer', () => {
      om.applyOffer('overgrowth');
      expect(om.getOvergrowthRangeBonus('poison')).toBe(0.15);
    });

    it('returns 0 for non-poison towers with offer', () => {
      om.applyOffer('overgrowth');
      expect(om.getOvergrowthRangeBonus('cannon')).toBe(0);
      expect(om.getOvergrowthRangeBonus('frost')).toBe(0);
      expect(om.getOvergrowthRangeBonus('tesla')).toBe(0);
    });
  });

  describe('hasThunderQuake', () => {
    it('returns false by default', () => {
      expect(om.hasThunderQuake()).toBe(false);
    });

    it('returns true when active', () => {
      om.applyOffer('thunder-quake');
      expect(om.hasThunderQuake()).toBe(true);
    });
  });

  describe('reaperMarkRoll', () => {
    it('returns false without offer', () => {
      expect(om.reaperMarkRoll()).toBe(false);
    });

    it('fires probabilistically at ~5% rate (run 2000 trials)', () => {
      om.applyOffer('reapers-mark');
      let hits = 0;
      for (let i = 0; i < 2000; i++) {
        if (om.reaperMarkRoll()) hits++;
      }
      // 5% of 2000 = 100; allow wide tolerance [30, 200].
      expect(hits).toBeGreaterThan(30);
      expect(hits).toBeLessThan(200);
    });
  });

  describe('iron-barrage in getGlobalDamageMult', () => {
    it('adds +4% per 5 waves completed', () => {
      om.applyOffer('iron-barrage');
      om.setWavesCompleted(10);
      expect(om.getGlobalDamageMult()).toBeCloseTo(1.08); // 2 × 4%
    });

    it('no bonus below 5 waves', () => {
      om.applyOffer('iron-barrage');
      om.setWavesCompleted(4);
      expect(om.getGlobalDamageMult()).toBe(1.0);
    });

    it('stacks multiplicatively with Veteran Arms', () => {
      om.applyOffer('iron-barrage');
      om.applyOffer('veteran-arms');
      om.setWavesCompleted(10);
      // iron-barrage: 1.08, veteran-arms: 1.10, compose: 1.08 * 1.10 = 1.188
      expect(om.getGlobalDamageMult()).toBeCloseTo(1.188);
    });
  });

  // ── offerDefs validation (updated count) ──────────────────────────────────

  describe('offerDefs has at least 42 offers (Phase 10 added 10)', () => {
    it('has at least 42 offers total', () => {
      expect(ALL_OFFERS.length).toBeGreaterThanOrEqual(42);
    });

    it('all 10 Phase 10 offer IDs exist', () => {
      const ids = new Set(ALL_OFFERS.map(o => o.id));
      const phase10Ids = [
        'iron-barrage', 'reapers-mark', 'blitz-protocol',
        'bounty-hunter', 'salvage', 'supply-cache',
        'voltaic-slime', 'concussion-shell', 'overgrowth', 'thunder-quake',
      ];
      for (const id of phase10Ids) {
        expect(ids.has(id)).toBe(true);
      }
    });
  });

  // ── EconomyManager integration (calculateSellRefund with rate) ─────────────

  describe('calculateSellRefund with custom rate', () => {
    // Imported separately to verify the API change.
    it('works with Scavenger rate', async () => {
      const { calculateSellRefund } = await import('../EconomyManager');
      expect(calculateSellRefund(100, 0.85)).toBe(85);
      expect(calculateSellRefund(100, 0.70)).toBe(70);
      expect(calculateSellRefund(100)).toBe(70); // default unchanged
    });
  });

  // ── Session save/restore helpers ──────────────────────────────────────────

  describe('getActiveIds', () => {
    it('returns empty array when no offers are active', () => {
      expect(om.getActiveIds()).toEqual([]);
    });

    it('returns all active offer IDs', () => {
      om.applyOffer('gold-rush');
      om.applyOffer('veteran-arms');
      const ids = om.getActiveIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain('gold-rush');
      expect(ids).toContain('veteran-arms');
    });

    it('returns a plain array (not a Set reference)', () => {
      om.applyOffer('gold-rush');
      const ids = om.getActiveIds();
      expect(Array.isArray(ids)).toBe(true);
    });
  });

  describe('getConsumedOneTimeOfferIds', () => {
    it('returns empty array when salvage is not consumed', () => {
      expect(om.getConsumedOneTimeOfferIds()).toEqual([]);
    });

    it('returns empty array when salvage is active but not consumed', () => {
      om.applyOffer('salvage');
      expect(om.getConsumedOneTimeOfferIds()).toEqual([]);
    });

    it('returns ["salvage"] after salvage is consumed', () => {
      om.applyOffer('salvage');
      om.consumeSalvage();
      expect(om.getConsumedOneTimeOfferIds()).toEqual(['salvage']);
    });
  });

  describe('restoreFromIds', () => {
    it('activates offers without the draw flow', () => {
      om.restoreFromIds(['gold-rush', 'veteran-arms']);
      expect(om.getActiveIds()).toContain('gold-rush');
      expect(om.getActiveIds()).toContain('veteran-arms');
    });

    it('marks salvage as consumed when in consumedOfferIds', () => {
      om.restoreFromIds(['salvage'], ['salvage']);
      expect(om.isSalvageAvailable()).toBe(false);
    });

    it('does not mark salvage consumed when not in consumedOfferIds', () => {
      om.restoreFromIds(['salvage'], []);
      expect(om.isSalvageAvailable()).toBe(true);
    });

    it('restores empty arrays without error', () => {
      expect(() => om.restoreFromIds([], [])).not.toThrow();
      expect(om.getActiveIds()).toEqual([]);
    });

    it('restored offers affect game queries', () => {
      om.restoreFromIds(['bounty-hunter']);
      expect(om.getKillRewardMult()).toBeGreaterThan(1);
    });
  });
});
