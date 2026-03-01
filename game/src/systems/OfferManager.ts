/**
 * OfferManager — roguelike run state for the offer layer.
 *
 * Responsibilities:
 *  - Weighted-random draw of 3 offers (no duplicates within a single draw; unique
 *    offers prioritised over already-active ones as a last resort).
 *  - Tracks which offers are active for the current run.
 *  - Exposes query methods used by GameScene and Tower at runtime to apply effects.
 *
 * Phaser-free — safe for unit tests.
 */

import { ALL_OFFERS } from '../data/offerDefs';
import type { OfferDef } from '../data/offerDefs';

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
   */
  drawOffers(n: number): OfferDef[] {
    const available = ALL_OFFERS.filter(o => !this.activeIds.has(o.id));
    const fallback  = ALL_OFFERS.filter(o =>  this.activeIds.has(o.id));

    const result:  OfferDef[]    = [];
    const usedIds: Set<string>   = new Set();

    const drawOne = (pool: OfferDef[]): boolean => {
      const eligible = pool.filter(o => !usedIds.has(o.id));
      if (eligible.length === 0) return false;

      const total = eligible.reduce((s, o) => s + o.weight, 0);
      let   roll  = Math.random() * total;

      for (const offer of eligible) {
        roll -= offer.weight;
        if (roll <= 0) {
          result.push(offer);
          usedIds.add(offer.id);
          return true;
        }
      }
      // Floating-point safety: pick the last eligible offer.
      const last = eligible[eligible.length - 1];
      result.push(last);
      usedIds.add(last.id);
      return true;
    };

    // Fill from non-active offers first.
    while (result.length < n && available.some(o => !usedIds.has(o.id))) {
      drawOne(available);
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

  /** Scavenger: sell refund rate (0.85 if active, 0.70 otherwise). */
  getSellRefundRate(): number {
    return this.activeIds.has('scavenger') ? 0.85 : 0.70;
  }

  /** Interest: bonus gold = 2% of current gold (min 5). Returns 0 if not active. */
  getInterestBonus(gold: number): number {
    if (!this.activeIds.has('interest')) return 0;
    return Math.max(5, Math.floor(gold * 0.02));
  }

  /** War Chest: +200 gold on boss kill. Returns 0 if not active. */
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
   * @param baseCost Base tower cost before any modifiers.
   * @returns Adjusted gold cost (may be 0 for a free Investment placement).
   */
  applyPlacementCost(baseCost: number): number {
    let cost = baseCost;

    // Merchant's Favor: -10%
    if (this.activeIds.has('merchant-favor')) cost = Math.floor(cost * 0.90);
    // Rapid Deploy: -15%
    if (this.activeIds.has('rapid-deploy'))   cost = Math.floor(cost * 0.85);

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
   * Global per-attack damage multiplier from combat offers (Last Stand, Veteran Arms).
   * Composes multiplicatively — both active simultaneously means both bonuses apply.
   */
  getGlobalDamageMult(): number {
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
   * Brittle Ice: Cannon deals +20% damage to frost-slowed targets.
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
    return this.activeIds.has('bounty-hunter') ? 1.2 : 1.0;
  }

  /**
   * Salvage: one-time 100% sell refund on the next sell.
   * Returns true if salvage is available (offer active and not yet consumed).
   */
  isSalvageAvailable(): boolean {
    return this.activeIds.has('salvage') && !this._salvageConsumed;
  }
  consumeSalvage(): void { this._salvageConsumed = true; }
  private _salvageConsumed = false;

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

  /** Concussion Shell: Cannon shots apply a 15% slow for 600ms. */
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
}
