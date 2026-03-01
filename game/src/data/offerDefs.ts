/**
 * Roguelike offer pool — drawn between waves, one offer chosen per draw.
 * 32 offers across three categories: combat abilities, economy modifiers,
 * and tower-type synergies.
 *
 * Phaser-free — safe for unit tests.
 */

export type OfferCategory = 'combat' | 'economy' | 'synergy';

export interface OfferDef {
  /** Unique identifier used for active-offer tracking throughout a run. */
  id:          string;
  name:        string;
  /**
   * Single-sentence description shown on the offer card.
   * Kept short so it fits within CARD_W (220px) at 13px monospace with wordWrap.
   */
  description: string;
  category:    OfferCategory;
  /** Relative draw weight; higher = more likely to appear. */
  weight:      number;
}

export const ALL_OFFERS: OfferDef[] = [
  // ── Combat abilities (10) ─────────────────────────────────────────────────
  {
    id:          'chain-reaction',
    name:        'Chain Reaction',
    description: 'Kills arc 20 lightning damage to the nearest creep.',
    category:    'combat',
    weight:      8,
  },
  {
    id:          'lifesteal',
    name:        'Lifesteal',
    description: 'Every 50 kills restores 1 life.',
    category:    'combat',
    weight:      6,
  },
  {
    id:          'shockwave',
    name:        'Shockwave',
    description: 'Every 10th kill deals 60 AoE splash damage nearby.',
    category:    'combat',
    weight:      6,
  },
  {
    id:          'heartseeker',
    name:        'Heartseeker',
    description: 'Towers deal +20% damage to creeps below 30% HP.',
    category:    'combat',
    weight:      7,
  },
  {
    id:          'rapid-deploy',
    name:        'Rapid Deploy',
    description: 'Tower placement costs 15% less gold.',
    category:    'combat',
    weight:      8,
  },
  {
    id:          'last-stand',
    name:        'Last Stand',
    description: 'Below 5 lives, all towers deal +25% damage.',
    category:    'combat',
    weight:      5,
  },
  {
    id:          'bloodlust',
    name:        'Bloodlust',
    description: 'Each kill grants towers +10% attack speed for 3s.',
    category:    'combat',
    weight:      6,
  },
  {
    id:          'critical-strike',
    name:        'Critical Strike',
    description: '10% chance for towers to deal triple damage.',
    category:    'combat',
    weight:      5,
  },
  {
    id:          'afterburn',
    name:        'Afterburn',
    description: 'Kills leave a 2s fire DoT on nearby creeps.',
    category:    'combat',
    weight:      7,
  },
  {
    id:          'veteran-arms',
    name:        'Veteran Arms',
    description: 'Towers gain +5% damage for every 5 waves cleared.',
    category:    'combat',
    weight:      5,
  },

  // ── Economy modifiers (11) ────────────────────────────────────────────────
  {
    id:          'gold-rush',
    name:        'Gold Rush',
    description: 'Wave completion bonus +50%.',
    category:    'economy',
    weight:      8,
  },
  {
    id:          'scavenger',
    name:        'Scavenger',
    description: 'Tower sell refunds are 85% instead of 70%.',
    category:    'economy',
    weight:      7,
  },
  {
    id:          'interest',
    name:        'Interest',
    description: 'Earn 2% of your gold as a bonus each wave.',
    category:    'economy',
    weight:      7,
  },
  {
    id:          'merchant-favor',
    name:        "Merchant's Favor",
    description: 'All tower placement costs 10% cheaper.',
    category:    'economy',
    weight:      7,
  },
  {
    id:          'war-chest',
    name:        'War Chest',
    description: 'Boss kills grant +200 bonus gold.',
    category:    'economy',
    weight:      6,
  },
  {
    id:          'tax-collector',
    name:        'Tax Collector',
    description: 'Escaped creeps refund 50% of their gold value.',
    category:    'economy',
    weight:      5,
  },
  {
    id:          'investment',
    name:        'Investment',
    description: 'First tower placed each wave is free (up to 100g).',
    category:    'economy',
    weight:      5,
  },
  {
    id:          'jackpot',
    name:        'Jackpot',
    description: '20% chance to earn +200 bonus gold each wave.',
    category:    'economy',
    weight:      5,
  },
  {
    id:          'windfall',
    name:        'Windfall',
    description: 'Gain 150 gold immediately.',
    category:    'economy',
    weight:      7,
  },
  {
    id:          'resourceful',
    name:        'Resourceful',
    description: 'Tower respec costs nothing (full refund).',
    category:    'economy',
    weight:      5,
  },
  {
    id:          'bulk-order',
    name:        'Bulk Order',
    description: 'Every 3rd tower you place costs 50% less.',
    category:    'economy',
    weight:      5,
  },

  // ── Tower-type synergies (11) ─────────────────────────────────────────────
  {
    id:          'venomfrost',
    name:        'Venomfrost',
    description: 'Frost slow is 30% stronger on Poison-stacked creeps.',
    category:    'synergy',
    weight:      7,
  },
  {
    id:          'static-field',
    name:        'Static Field',
    description: 'Tesla chains deal +20% damage to slowed targets.',
    category:    'synergy',
    weight:      7,
  },
  {
    id:          'toxic-shrapnel',
    name:        'Toxic Shrapnel',
    description: 'Mortar hits apply a Poison DoT stack to targets.',
    category:    'synergy',
    weight:      7,
  },
  {
    id:          'cryo-cannon',
    name:        'Cryo Cannon',
    description: 'Cannon shots slow targets by 20% for 1.5s.',
    category:    'synergy',
    weight:      7,
  },
  {
    id:          'grounded',
    name:        'Grounded',
    description: 'Tesla chains deal +30% damage to armored creeps.',
    category:    'synergy',
    weight:      6,
  },
  {
    id:          'brittle-ice',
    name:        'Brittle Ice',
    description: 'Cannon deals +20% damage to frost-slowed targets.',
    category:    'synergy',
    weight:      7,
  },
  {
    id:          'lightning-rod',
    name:        'Lightning Rod',
    description: 'Frost-slowed creeps attract 1 extra Tesla chain hit.',
    category:    'synergy',
    weight:      5,
  },
  {
    id:          'explosive-residue',
    name:        'Explosive Residue',
    description: 'Mortar blasts slow targets by 20% for 2s.',
    category:    'synergy',
    weight:      7,
  },
  {
    id:          'acid-rain',
    name:        'Acid Rain',
    description: 'Mortar blasts apply a weak Poison stack.',
    category:    'synergy',
    weight:      6,
  },
  {
    id:          'glacial-surge',
    name:        'Glacial Surge',
    description: 'Frost shots deal +15% damage to already-slowed targets.',
    category:    'synergy',
    weight:      5,
  },
  {
    id:          'overcharge',
    name:        'Overcharge',
    description: 'Tesla deals +15% more damage per chain bounce.',
    category:    'synergy',
    weight:      6,
  },
];
