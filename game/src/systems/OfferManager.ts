/**
 * OfferManager — roguelike run state for the offer layer.
 *
 * Responsibilities:
 *  - Weighted-random draw of 3 offers (no duplicates within a single draw; unique
 *    offers prioritised over already-active ones as a last resort).
 *  - Synergy-gating: offers with `synergyRequires` only appear when the player
 *    has the relevant tower types placed.
 *  - Tracks which offers are active for the current run.
 *  - Exposes query methods used by GameScene and Tower at runtime to apply effects.
 *
 * Phaser-free — safe for unit tests.
 */

import { ALL_OFFERS } from '../data/offerDefs';
import type { OfferDef } from '../data/offerDefs';

/**
 * Targeting domain for each tower type.
 * Used by canSynergize() to validate synergy offer compatibility.
 * Unknown keys fall back to 'both' (permissive) so future towers don't
 * silently break synergy offers.
 */
export const TOWER_TARGET_DOMAIN: Record<string, 'ground' | 'air' | 'both'> = {
  'arrow':       'both',
  'rock-hurler': 'ground',
  'frost':       'both',
  'poison':      'ground',
  'tesla':       'air',
  'aura':        'both',
  'cannon':      'ground',
  'mortar':      'ground',
};

/**
 * Returns true when towerKeyA and towerKeyB can meaningfully interact — i.e.
 * there exists at least one creep category (ground or air) that BOTH towers
 * can target.  Unknown keys are treated as 'both' (permissive) so future
 * tower types don't silently break existing synergy offers.
 *
 * Examples:
 *   canSynergize('frost', 'rock-hurler') → true  (frost=both overlaps ground)
 *   canSynergize('frost', 'tesla')       → true  (frost=both overlaps air)
 *   canSynergize('tesla', 'poison')      → false (air ∩ ground = ∅)
 */
export function canSynergize(towerKeyA: string, towerKeyB: string): boolean {
  const domainA = TOWER_TARGET_DOMAIN[towerKeyA] ?? 'both';
  const domainB = TOWER_TARGET_DOMAIN[towerKeyB] ?? 'both';
  if (domainA === 'both' || domainB === 'both') return true;
  return domainA === domainB; // both 'ground' or both 'air'
}

export class OfferManager {
  private readonly activeIds = new Set<string>();

  // ── kill tracking (combat offers) ─────────────────────────────────────────
  private totalKills       = 0;
  private shockwaveCounter = 0; // resets every 10 kills for Shockwave

  // ── placement tracking (economy offers) ───────────────────────────────────
  private towerPlacedThisWave = 0;
  private totalTowersPlaced   = 0;

  // ── run state (updated by GameScene) ──────────────────────────────────────
  private currentLives   = 20;
  private wavesCompleted = 0;

  // ── one-time offer state ───────────────────────────────────────────────────
  private _salvageConsumed    = false;
  private _headstartConsumed  = false;

  // ── bounty state (first-escape mechanic) ──────────────────────────────────
  private _bountyActive       = false;  // set when first creep escapes a wave

  // ── State setters (called by GameScene) ───────────────────────────────────

  setCurrentLives(n: number): void   { this.currentLives   = n; }
  setWavesCompleted(n: number): void { this.wavesCompleted = n; }
  resetWavePlacements(): void        { this.towerPlacedThisWave = 0; }

  // ── Offer management ──────────────────────────────────────────────────────

  /**
   * Draw `n` unique offers using weighted random sampling.
   *
   * Prioritises offers NOT yet active in the run.
   * Falls back to already-active offers only if fewer than `n` new offers remain
   * in the pool (as mandated by the "last resort" rule).
   *
   * Returns exactly min(n, total-pool-size) offers, always without intra-draw
   * duplicates.
   *
   * @param n               Number of offers to draw.
   * @param placedTowerKeys Tower keys currently on the field.  Used to gate
   *                        synergy offers that require specific tower types.
   */
  drawOffers(n: number, placedTowerKeys: string[] = []): OfferDef[] {
    const towerSet = new Set(placedTowerKeys);

    /** True when all synergyRequires are present in towerSet. */
    const synergyMet = (o: OfferDef): boolean => {
      if (!o.synergyRequires || o.synergyRequires.length === 0) return true;
      return o.synergyRequires.every(key => towerSet.has(key));
    };

    /**
     * True when every pair of tower keys in synergyRequires can actually
     * interact (share at least one targetable creep category).
     * Offers referencing incompatible tower combos (e.g. air-only + ground-only)
     * are excluded from the eligible pool so the player never sees a useless card.
     */
    const synergyCompatible = (o: OfferDef): boolean => {
      if (!o.synergyRequires || o.synergyRequires.length < 2) return true;
      const keys = o.synergyRequires;
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          if (!canSynergize(keys[i], keys[j])) return false;
        }
      }
      return true;
    };

    const eligible   = ALL_OFFERS.filter(o => !this.activeIds.has(o.id) && synergyMet(o) && synergyCompatible(o));
    const fallback   = ALL_OFFERS.filter(o =>  this.activeIds.has(o.id));

    const result:  OfferDef[]    = [];
    const usedIds: Set<string>   = new Set();

    const drawOne = (pool: OfferDef[]): boolean => {
      const candidates = pool.filter(o => !usedIds.has(o.id));
      if (candidates.length === 0) return false;

      const total = candidates.reduce((s, o) => s + o.weight, 0);
      let   roll  = Math.random() * total;

      for (const offer of candidates) {
        roll -= offer.weight;
        if (roll <= 0) {
          result.push(offer);
          usedIds.add(offer.id);
          return true;
        }
      }
      // Floating-point safety: pick the last candidate.
      const last = candidates[candidates.length - 1];
      result.push(last);
      usedIds.add(last.id);
      return true;
    };

    // Fill from non-active (synergy-gated) offers first.
    while (result.length < n && eligible.some(o => !usedIds.has(o.id))) {
      drawOne(eligible);
    }
    // Pad with already-active offers as last resort.
    while (result.length < n && fallback.some(o => !usedIds.has(o.id))) {
      drawOne(fallback);
    }

    return result;
  }

  /** Activate an offer for the current run. */
  applyOffer(id: string): void { this.activeIds.add(id); }

  hasOffer(id: string): boolean { return this.activeIds.has(id); }

  getActiveOffers(): OfferDef[] {
    return ALL_OFFERS.filter(o => this.activeIds.has(o.id));
  }

  // ── Economy queries ───────────────────────────────────────────────────────

  /** Gold Rush: wave completion bonus multiplier (1.5× if active). */
  getWaveBonusMult(): number {
    return this.activeIds.has('gold-rush') ? 1.5 : 1.0;
  }

  /**
   * Sell refund rate, taking all sell-rate offers into account.
   * - Default:        0.70
   * - Scavenger:      0.85
   * - Salvage Rights: 0.90 (supersedes Scavenger)
   * Both active together → 0.90.
   */
  getSellRefundRate(): number {
    if (this.activeIds.has('salvage-rights')) return 0.90;
    if (this.activeIds.has('scavenger'))      return 0.85;
    return 0.70;
  }

  /** Interest: bonus gold = 2% of current gold (min 5). Returns 0 if not active. */
  getInterestBonus(gold: number): number {
    if (!this.activeIds.has('interest')) return 0;
    return Math.max(5, Math.floor(gold * 0.02));
  }

  /** War Chest (boss): +200 gold on boss kill. Returns 0 if not active. */
  getBossKillBonus(): number {
    return this.activeIds.has('war-chest') ? 200 : 0;
  }

  /**
   * Tax Collector: refund 50% of the escaped creep's reward.
   * Returns 0 if not active.
   * @param rewardValue Gold value of the escaped creep (from its definition)
   */
  getEscapeRefund(rewardValue: number): number {
    if (!this.activeIds.has('tax-collector')) return 0;
    return Math.floor(rewardValue * 0.5);
  }

  /** Jackpot: 20% chance of +200 bonus gold each wave. Returns 0 if not active. */
  getJackpotBonus(): number {
    if (!this.activeIds.has('jackpot')) return 0;
    return Math.random() < 0.20 ? 200 : 0;
  }

  /** Resourceful: respec costs nothing (full refund). */
  isRespecFree(): boolean {
    return this.activeIds.has('resourceful');
  }

  /**
   * Compute the gold cost the player pays to place a tower, applying all
   * active economy offer modifiers in sequence.
   *
   * Also increments internal placement counters used by Investment and Bulk Order.
   *
   * @param baseCost    Base tower cost before any modifiers.
   * @param towerKey    Tower type key — used by Bulk Discount to compute same-type count.
   * @param sameTypeCount Number of towers of this type already placed (for Bulk Discount).
   * @returns Adjusted gold cost (may be 0 for a free Investment / Headstart placement).
   */
  applyPlacementCost(baseCost: number, _towerKey = '', sameTypeCount = 0): number {
    let cost = baseCost;

    // Merchant's Favor: -10%
    if (this.activeIds.has('merchant-favor')) cost = Math.floor(cost * 0.90);
    // Rapid Deploy: -15%
    if (this.activeIds.has('rapid-deploy'))   cost = Math.floor(cost * 0.85);
    // Bulk Discount: -5% per tower of same type already placed (stacks)
    if (this.activeIds.has('bulk-discount') && sameTypeCount > 0) {
      const disc = Math.min(sameTypeCount * 0.05, 0.50); // cap at 50% off
      cost = Math.floor(cost * (1 - disc));
    }
    // Tower Tax: each tower costs 20% more
    if (this.activeIds.has('tower-tax')) cost = Math.floor(cost * 1.20);

    this.towerPlacedThisWave++;
    this.totalTowersPlaced++;

    // Investment: first tower per wave free (up to 100g base cost)
    if (this.activeIds.has('investment') && this.towerPlacedThisWave === 1 && baseCost <= 100) {
      cost = 0;
    }
    // Bulk Order: every 3rd total tower is 50% off
    if (this.activeIds.has('bulk-order') && this.totalTowersPlaced % 3 === 0) {
      cost = Math.floor(cost * 0.50);
    }

    return cost;
  }

  // ── Combat queries ────────────────────────────────────────────────────────

  /**
   * Register a creep kill and return which combat-offer effects should trigger.
   * All active combat offers are checked independently — they compose correctly
   * when multiple are active simultaneously.
   */
  onKill(): { chainReaction: boolean; lifeGain: boolean; shockwave: boolean } {
    this.totalKills++;
    this.shockwaveCounter++;

    const chainReaction = this.activeIds.has('chain-reaction');
    const lifeGain      = this.activeIds.has('lifesteal') && this.totalKills % 50 === 0;
    const shockwave     = this.activeIds.has('shockwave') && this.shockwaveCounter % 10 === 0;

    return { chainReaction, lifeGain, shockwave };
  }

  hasBloodlust(): boolean { return this.activeIds.has('bloodlust');  }
  hasAfterburn(): boolean { return this.activeIds.has('afterburn');  }

  // ── Tower damage multipliers ──────────────────────────────────────────────

  /**
   * Global per-attack damage multiplier from combat offers (Last Stand, Veteran Arms,
   * Iron Barrage, Tower Tax, Marksman).
   * Composes multiplicatively — all active simultaneously means all bonuses apply.
   *
   * @param towerCount Number of towers currently placed (for Tower Tax bonus).
   */
  getGlobalDamageMult(towerCount = 0): number {
    let mult = 1.0;
    if (this.activeIds.has('last-stand') && this.currentLives < 5) {
      mult *= 1.25;
    }
    if (this.activeIds.has('veteran-arms') && this.wavesCompleted >= 5) {
      mult *= 1.0 + Math.floor(this.wavesCompleted / 5) * 0.05;
    }
    // Iron Barrage: +4% per 5 waves (independent of Veteran Arms).
    if (this.activeIds.has('iron-barrage') && this.wavesCompleted >= 5) {
      mult *= 1.0 + Math.floor(this.wavesCompleted / 5) * 0.04;
    }
    // Tower Tax: +15% damage per tower already placed (powerful scaling)
    if (this.activeIds.has('tower-tax') && towerCount > 0) {
      mult *= 1.0 + towerCount * 0.15;
    }
    // Marksman: -10% damage
    if (this.activeIds.has('marksman')) {
      mult *= 0.90;
    }
    return mult;
  }

  /**
   * Heartseeker: +20% damage to targets below 30% HP.
   * Returns 1.0 if not active or target is above threshold.
   */
  getHeartseekerMult(hpRatio: number): number {
    return (this.activeIds.has('heartseeker') && hpRatio < 0.30) ? 1.20 : 1.0;
  }

  /**
   * Critical Strike: 10% chance per attack to roll a 3× damage multiplier.
   * Returns true on a crit roll.
   */
  critRoll(): boolean {
    return this.activeIds.has('critical-strike') && Math.random() < 0.10;
  }

  // ── Synergy multipliers (called per-attack inside Tower) ──────────────────

  /**
   * Venomfrost: Frost slow factor reduced by 30% on Poison-stacked targets.
   * Lower slowFactor = stronger slow (approaching 0 = full stop).
   */
  getVenomfrostSlowFactor(baseFactor: number, hasDotStacks: boolean): number {
    if (!this.activeIds.has('venomfrost') || !hasDotStacks) return baseFactor;
    return baseFactor * 0.70;
  }

  /**
   * Glacial Surge: Frost shots deal +15% damage to already-slowed targets.
   */
  getGlacialSurgeMult(isSlowed: boolean): number {
    return (this.activeIds.has('glacial-surge') && isSlowed) ? 1.15 : 1.0;
  }

  /**
   * Static Field: Tesla chain hits deal +20% damage to slowed targets.
   */
  getStaticFieldMult(isSlowed: boolean): number {
    return (this.activeIds.has('static-field') && isSlowed) ? 1.20 : 1.0;
  }

  /**
   * Grounded: Tesla chain hits deal +30% damage to armored targets.
   */
  getGroundedMult(isArmored: boolean): number {
    return (this.activeIds.has('grounded') && isArmored) ? 1.30 : 1.0;
  }

  /**
   * Overcharge: Tesla chain damage compounds by +15% per bounce.
   * @param bounceIndex 0-based chain bounce index (0 = first chain target).
   */
  getOverchargeMult(bounceIndex: number): number {
    if (!this.activeIds.has('overcharge')) return 1.0;
    return Math.pow(1.15, bounceIndex);
  }

  /**
   * Brittle Ice: Rock Hurler deals +20% damage to frost-slowed targets.
   */
  getBrittleIceMult(isSlowed: boolean): number {
    return (this.activeIds.has('brittle-ice') && isSlowed) ? 1.20 : 1.0;
  }

  /**
   * Lightning Rod: Frost-slowed creeps attract 1 extra Tesla chain hit.
   * Returns the number of extra chains (0 or 1).
   */
  getLightningRodExtra(isSlowed: boolean): number {
    return (this.activeIds.has('lightning-rod') && isSlowed) ? 1 : 0;
  }

  // Boolean helpers used by Tower.fireAt / Tower.fireMortar ─────────────────
  hasToxicShrapnel():    boolean { return this.activeIds.has('toxic-shrapnel');    }
  hasExplosiveResidue(): boolean { return this.activeIds.has('explosive-residue'); }
  hasAcidRain():         boolean { return this.activeIds.has('acid-rain');         }
  hasCryoCannon():       boolean { return this.activeIds.has('cryo-cannon');       }

  // ── Phase 10 offers ────────────────────────────────────────────────────────

  /**
   * Iron Barrage: +4% global damage per 5 waves cleared (stacks with Veteran Arms).
   * Combined into getGlobalDamageMult() alongside existing combat offers.
   */
  getIronBarrageMult(): number {
    if (!this.activeIds.has('iron-barrage') || this.wavesCompleted < 5) return 1.0;
    return 1.0 + Math.floor(this.wavesCompleted / 5) * 0.04;
  }

  /**
   * Reaper's Mark: 5% chance on kill to trigger a 40-damage arc.
   * Returns true when the arc should fire.
   */
  reaperMarkRoll(): boolean {
    return this.activeIds.has('reapers-mark') && Math.random() < 0.05;
  }

  /**
   * Blitz Protocol: permanent +15% attack speed (interval multiplier 0.85).
   * Applied in Tower.step() as an additional interval factor.
   */
  getBlitzProtocolAttackSpeedMult(): number {
    return this.activeIds.has('blitz-protocol') ? 0.85 : 1.0;
  }

  /**
   * Bounty Hunter: kill rewards worth 20% more.
   * Applied in GameScene creep-killed handler.
   */
  getKillRewardMult(): number {
    let mult = 1.0;
    if (this.activeIds.has('bounty-hunter')) mult *= 1.2;
    // War Chest (wave): kill gold reduced by 20%
    if (this.activeIds.has('war-chest-wave')) mult *= 0.80;
    return mult;
  }

  /**
   * Salvage: one-time 100% sell refund on the next sell.
   * Returns true if salvage is available (offer active and not yet consumed).
   */
  isSalvageAvailable(): boolean {
    return this.activeIds.has('salvage') && !this._salvageConsumed;
  }
  consumeSalvage(): void { this._salvageConsumed = true; }

  /**
   * Supply Cache: +10 gold per owned tower at wave start.
   */
  getSupplyCacheBonus(towerCount: number): number {
    return this.activeIds.has('supply-cache') ? towerCount * 10 : 0;
  }

  /**
   * Voltaic Slime: Tesla chains deal +25% damage to Poison-stacked creeps.
   */
  getVoltaicSlimeMult(hasDotStacks: boolean): number {
    return (this.activeIds.has('voltaic-slime') && hasDotStacks) ? 1.25 : 1.0;
  }

  /** Concussion Shell: Rock Hurler shots apply a 15% slow for 600ms. */
  hasConcussionShell(): boolean { return this.activeIds.has('concussion-shell'); }

  /**
   * Overgrowth: Poison towers gain +15% range bonus.
   * @param towerKey tower definition key
   */
  getOvergrowthRangeBonus(towerKey: string): number {
    return (this.activeIds.has('overgrowth') && towerKey === 'poison') ? 0.15 : 0;
  }

  /** Thunder Quake: Tesla chain hits AoE 15 dmg in 30px. */
  hasThunderQuake(): boolean { return this.activeIds.has('thunder-quake'); }

  // ── Phase 14 — Mechanic-changing offer queries ─────────────────────────────

  /** Ricochet Shot: Cannon projectiles bounce to a 2nd target at 50% damage. */
  hasRicochetShot(): boolean { return this.activeIds.has('ricochet-shot'); }

  /**
   * Flash Freeze: Frost no longer slows; frozen creeps take 2× damage for 3s.
   * Returns true when the offer is active — Tower must adapt Frost behavior.
   */
  isFlashFreezeActive(): boolean { return this.activeIds.has('flash-freeze'); }

  /** Chain Reactor: Tesla kills cause an explosion dealing 20% of max HP nearby. */
  hasChainReactor(): boolean { return this.activeIds.has('chain-reactor'); }

  /**
   * Plague Doctor: Poison DoT stacks to a max of 5 (instead of refreshing at a lower cap).
   * GameScene / Tower should check this and override maxDotStacks accordingly.
   */
  isPlagueDoctorActive(): boolean { return this.activeIds.has('plague-doctor'); }
  /** Returns effective max dot stacks: 5 if plague-doctor, otherwise use tower's own cap. */
  getPlagueDoctorMaxStacks(baseCap: number): number {
    return this.activeIds.has('plague-doctor') ? Math.max(5, baseCap) : baseCap;
  }

  /** Aftershock: Mortar shells leave a 2s lingering fire zone on impact. */
  hasAftershock(): boolean { return this.activeIds.has('aftershock'); }

  /**
   * Aura Leech: Aura tower converts 5% of each buffed tower's damage into bonus gold per wave.
   * @param buffedTowerBaseDamage Sum of base damage of all towers currently buffed by Aura.
   * @returns Bonus gold to award at wave end.
   */
  getAuraLeechGold(buffedTowerBaseDamage: number): number {
    if (!this.activeIds.has('aura-leech')) return 0;
    return Math.floor(buffedTowerBaseDamage * 0.05);
  }

  /**
   * Glass Cannon: Cannon towers deal +100% damage but have -50% range.
   * @param towerKey The tower's type key.
   */
  getGlassCannonDamageMult(towerKey: string): number {
    return (this.activeIds.has('glass-cannon') && towerKey === 'cannon') ? 2.0 : 1.0;
  }
  getGlassCannonRangeMult(towerKey: string): number {
    return (this.activeIds.has('glass-cannon') && towerKey === 'cannon') ? 0.5 : 1.0;
  }

  /**
   * Permafrost: Frost slow is permanent (creep never recovers speed).
   * Slow magnitude is halved when Permafrost is active to compensate.
   * Returns the slowFactor and whether the slow should be permanent.
   */
  isPermafrostActive(): boolean { return this.activeIds.has('permafrost'); }
  getPermafrostSlowFactor(baseSlowFactor: number): number {
    // slowFactor approaching 0 = stronger. Halving magnitude means halfway to 1.
    if (!this.activeIds.has('permafrost')) return baseSlowFactor;
    return baseSlowFactor + (1.0 - baseSlowFactor) * 0.5; // midpoint between base and 1.0
  }

  /** Living Poison: Poison clouds drift along the path in creep travel direction. */
  hasLivingPoison(): boolean { return this.activeIds.has('living-poison'); }

  /** Overkill Transfer: excess damage from kills carries over to the next creep. */
  hasOverkillTransfer(): boolean { return this.activeIds.has('overkill-transfer'); }

  /**
   * Shared Pain: when a tower attacks a creep, towers within 2 tiles also deal 25% damage.
   * Returns 0.25 if active, 0 otherwise.
   */
  getSharedPainMult(): number {
    return this.activeIds.has('shared-pain') ? 0.25 : 0;
  }

  /**
   * Tower Tax: each tower costs 20% more; +15% damage per tower placed.
   * Cost side is handled in applyPlacementCost().
   * Damage side: included in getGlobalDamageMult(towerCount).
   */
  hasTowerTax(): boolean { return this.activeIds.has('tower-tax'); }

  // ── Phase 14 — Synergy offer queries ─────────────────────────────────────

  /**
   * Shatter: Frozen creeps take triple damage from Mortar AoE.
   * Returns 3.0 when both conditions are met, 1.0 otherwise.
   */
  getShatterMult(isFrozen: boolean, isMortarHit: boolean): number {
    return (this.activeIds.has('shatter') && isFrozen && isMortarHit) ? 3.0 : 1.0;
  }

  /**
   * Conductor: Poison-debuffed creeps take +50% Tesla chain damage.
   */
  getConductorMult(hasDotStacks: boolean, isTeslaChain: boolean): number {
    return (this.activeIds.has('conductor') && hasDotStacks && isTeslaChain) ? 1.50 : 1.0;
  }

  /**
   * Siege Mode: Cannon towers near an Aura tower have interval×2 (halved speed),
   * damage×3.  Returns modifiers — caller supplies whether conditions are met.
   */
  getSiegeModeModifiers(towerKey: string, nearAura: boolean): { intervalMult: number; damageMult: number } {
    if (!this.activeIds.has('siege-mode') || towerKey !== 'cannon' || !nearAura) {
      return { intervalMult: 1.0, damageMult: 1.0 };
    }
    return { intervalMult: 2.0, damageMult: 3.0 };
  }

  /** Arctic Shrapnel: Mortar hits apply Frost slow for 1s. */
  hasArcticShrapnel(): boolean { return this.activeIds.has('arctic-shrapnel'); }

  /** Voltaic Venom: Tesla kills spread Poison DoT to nearby creeps. */
  hasVoltaicVenom(): boolean { return this.activeIds.has('voltaic-venom'); }

  /** Stone Skin: armored creeps that survive a Mortar hit become immune to Mortar for 3s. */
  hasStoneSkin(): boolean { return this.activeIds.has('stone-skin'); }

  /**
   * Blood Price: selling a tower grants full sell value in gold AND heals 1 life.
   * Returns true when the offer is active — GameScene's sellTower() checks this.
   */
  hasBloodPrice(): boolean { return this.activeIds.has('blood-price'); }

  /**
   * Crowded House: towers deal +5% damage per other tower within 2 tiles (capped at +35%).
   * @param nearbyCount Number of OTHER towers within 2 tile radius.
   */
  getCrowdedHouseMult(nearbyCount: number): number {
    if (!this.activeIds.has('crowded-house')) return 1.0;
    const bonus = Math.min(nearbyCount * 0.05, 0.35);
    return 1.0 + bonus;
  }

  // ── Phase 14 — Economy offer queries ──────────────────────────────────────

  // getSellRefundRate() already handles salvage-rights (0.90).

  /**
   * Bulk Discount: -5% cost per additional tower of the same type already placed.
   * Capped at 50% discount.
   * Already applied in applyPlacementCost(); this is exposed for testing.
   */
  getBulkDiscountRate(sameTypeCount: number): number {
    if (!this.activeIds.has('bulk-discount')) return 0;
    return Math.min(sameTypeCount * 0.05, 0.50);
  }

  /**
   * War Chest (wave): +15 gold at wave start.
   * Kill-gold reduction (20%) is already baked into getKillRewardMult().
   */
  getWarChestWaveBonus(): number {
    return this.activeIds.has('war-chest-wave') ? 15 : 0;
  }

  /**
   * Gambler: every 5 waves, a random tower receives a free upgrade.
   * Returns true on the qualifying wave (wavesCompleted is divisible by 5, >0).
   */
  isGamblerWave(): boolean {
    return this.activeIds.has('gambler') && this.wavesCompleted > 0 && this.wavesCompleted % 5 === 0;
  }

  /**
   * Recycler: selling a tower refunds 50% of its upgrade costs.
   * Returns the fraction to refund (0.5 if active, 0 otherwise).
   */
  getRecyclerRate(): number {
    return this.activeIds.has('recycler') ? 0.50 : 0;
  }

  /**
   * Headstart: one free tower placement before wave 1.
   * Returns true when the offer is active and not yet consumed.
   */
  isHeadstartAvailable(): boolean {
    return this.activeIds.has('headstart') && !this._headstartConsumed;
  }
  consumeHeadstart(): void { this._headstartConsumed = true; }

  /**
   * Bounty (escape): the first creep to escape each wave activates a bounty.
   * On the next kill, the player earns triple gold.
   */
  hasBountyEscape(): boolean { return this.activeIds.has('bounty-escape'); }
  activateBounty(): void   { this._bountyActive = true; }
  isBountyActive(): boolean { return this._bountyActive; }
  consumeBounty(): void    { this._bountyActive = false; }

  /**
   * Insurance: if 2+ lives are lost in a wave, gain 20 gold compensation.
   * @param livesLost Number of lives lost during the wave.
   */
  getInsuranceBonus(livesLost: number): number {
    if (!this.activeIds.has('insurance')) return 0;
    return livesLost >= 2 ? 20 : 0;
  }

  /**
   * Marksman: +15% range bonus for all towers.
   * Range penalty is applied via getGlobalDamageMult() for the damage side.
   */
  getMarksmanRangeBonus(): number {
    return this.activeIds.has('marksman') ? 0.15 : 0;
  }

  /**
   * Focused Fire: towers targeting the same creep as another tower deal +10% extra damage.
   * Caller is responsible for detecting shared-target conditions.
   */
  hasFocusedFire(): boolean { return this.activeIds.has('focused-fire'); }
  getFocusedFireMult(sharedTarget: boolean): number {
    return (this.activeIds.has('focused-fire') && sharedTarget) ? 1.10 : 1.0;
  }

  // ── Session save/restore ───────────────────────────────────────────────────

  /** Return current active offer IDs as an array (for auto-save serialisation). */
  getActiveIds(): string[] {
    return Array.from(this.activeIds);
  }

  /**
   * Return IDs of one-time offers that have already been consumed.
   * Currently 'salvage' and 'headstart' are one-time offers.
   */
  getConsumedOneTimeOfferIds(): string[] {
    const consumed: string[] = [];
    if (this._salvageConsumed)   consumed.push('salvage');
    if (this._headstartConsumed) consumed.push('headstart');
    return consumed;
  }

  /**
   * Restore offer state from a saved ID list.
   * Activates all given offer IDs without going through the draw/select flow.
   * `consumedOfferIds` marks one-time offers that were already used so they
   * are not re-granted to the player.
   */
  restoreFromIds(ids: string[], consumedOfferIds: string[] = []): void {
    for (const id of ids) {
      this.activeIds.add(id);
    }
    if (consumedOfferIds.includes('salvage'))   this._salvageConsumed   = true;
    if (consumedOfferIds.includes('headstart')) this._headstartConsumed = true;
  }
}
