/**
 * Roguelike offer pool — drawn between waves, one offer chosen per draw.
 * 72 offers across three categories: combat abilities, economy modifiers,
 * and tower-type synergies.
 *
 * Phaser-free — safe for unit tests.
 */

export type OfferCategory = 'combat' | 'economy' | 'synergy';
export type OfferRarity   = 'common' | 'rare' | 'epic';

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
  /**
   * Rarity tier — drives border colour and draw probability tuning.
   * common: ~50% of pool,  rare: ~35%,  epic: ~15% (build-defining).
   */
  rarity:      OfferRarity;
  /**
   * Marks a negative / challenge offer.  The UI renders these with a red
   * border and a ⚠ warning icon so the player knows what they are taking.
   */
  isChallenge?: boolean;
  /**
   * Synergy-gate: the offer only appears in the draw pool when the player
   * already has at least one tower of each listed tower key placed.
   * e.g. ['frost', 'mortar'] means both a Frost AND a Mortar tower must be on
   * the field.  Omit for ungated offers.
   */
  synergyRequires?: string[];
}

export const ALL_OFFERS: OfferDef[] = [
  // ── Combat abilities ──────────────────────────────────────────────────────

  {
    id:          'chain-reaction',
    name:        'Chain Reaction',
    description: 'Kills arc 20 lightning damage to the nearest creep.',
    category:    'combat',
    weight:      8,
    rarity:      'common',
  },
  {
    id:          'lifesteal',
    name:        'Lifesteal',
    description: 'Every 50 kills restores 1 life.',
    category:    'combat',
    weight:      5,
    rarity:      'rare',
  },
  {
    id:          'shockwave',
    name:        'Shockwave',
    description: 'Every 10th kill deals 60 AoE splash damage nearby.',
    category:    'combat',
    weight:      5,
    rarity:      'rare',
  },
  {
    id:          'heartseeker',
    name:        'Heartseeker',
    description: 'Towers deal +20% damage to creeps below 30% HP.',
    category:    'combat',
    weight:      7,
    rarity:      'common',
  },
  {
    id:          'rapid-deploy',
    name:        'Rapid Deploy',
    description: 'Tower placement costs 15% less gold.',
    category:    'combat',
    weight:      8,
    rarity:      'common',
  },
  {
    id:          'last-stand',
    name:        'Last Stand',
    description: 'Below 5 lives, all towers deal +25% damage.',
    category:    'combat',
    weight:      5,
    rarity:      'rare',
  },
  {
    id:          'bloodlust',
    name:        'Bloodlust',
    description: 'Each kill grants towers +10% attack speed for 3s.',
    category:    'combat',
    weight:      7,
    rarity:      'common',
  },
  {
    id:          'critical-strike',
    name:        'Critical Strike',
    description: '10% chance for towers to deal triple damage.',
    category:    'combat',
    weight:      5,
    rarity:      'rare',
  },
  {
    id:          'afterburn',
    name:        'Afterburn',
    description: 'Kills leave a 2s fire DoT on nearby creeps.',
    category:    'combat',
    weight:      7,
    rarity:      'common',
  },
  {
    id:          'veteran-arms',
    name:        'Veteran Arms',
    description: 'Towers gain +5% damage for every 5 waves cleared.',
    category:    'combat',
    weight:      6,
    rarity:      'common',
  },

  // ── Economy modifiers ─────────────────────────────────────────────────────

  {
    id:          'gold-rush',
    name:        'Gold Rush',
    description: 'Wave completion bonus +50%.',
    category:    'economy',
    weight:      8,
    rarity:      'common',
  },
  {
    id:          'scavenger',
    name:        'Scavenger',
    description: 'Tower sell refunds are 85% instead of 70%.',
    category:    'economy',
    weight:      7,
    rarity:      'common',
  },
  {
    id:          'interest',
    name:        'Interest',
    description: 'Earn 2% of your gold as a bonus each wave.',
    category:    'economy',
    weight:      7,
    rarity:      'common',
  },
  {
    id:          'merchant-favor',
    name:        "Merchant's Favor",
    description: 'All tower placement costs 10% cheaper.',
    category:    'economy',
    weight:      7,
    rarity:      'common',
  },
  {
    id:          'war-chest',
    name:        'War Chest',
    description: 'Boss kills grant +200 bonus gold.',
    category:    'economy',
    weight:      6,
    rarity:      'common',
  },
  {
    id:          'tax-collector',
    name:        'Tax Collector',
    description: 'Escaped creeps refund 50% of their gold value.',
    category:    'economy',
    weight:      5,
    rarity:      'rare',
  },
  {
    id:          'investment',
    name:        'Investment',
    description: 'First tower placed each wave is free (up to 100g).',
    category:    'economy',
    weight:      5,
    rarity:      'rare',
  },
  {
    id:          'jackpot',
    name:        'Jackpot',
    description: '20% chance to earn +200 bonus gold each wave.',
    category:    'economy',
    weight:      5,
    rarity:      'rare',
  },
  {
    id:          'windfall',
    name:        'Windfall',
    description: 'Gain 150 gold immediately.',
    category:    'economy',
    weight:      7,
    rarity:      'common',
  },
  {
    id:          'resourceful',
    name:        'Resourceful',
    description: 'Tower respec costs nothing (full refund).',
    category:    'economy',
    weight:      5,
    rarity:      'rare',
  },
  {
    id:          'bulk-order',
    name:        'Bulk Order',
    description: 'Every 3rd tower you place costs 50% less.',
    category:    'economy',
    weight:      5,
    rarity:      'rare',
  },

  // ── Tower-type synergies ──────────────────────────────────────────────────

  {
    id:          'venomfrost',
    name:        'Venomfrost',
    description: 'Frost slow is 30% stronger on Poison-stacked creeps.',
    category:    'synergy',
    weight:      7,
    rarity:      'common',
  },
  {
    id:          'static-field',
    name:        'Static Field',
    description: 'Thunder chains deal +20% damage to slowed targets.',
    category:    'synergy',
    weight:      7,
    rarity:      'common',
  },
  {
    id:          'toxic-shrapnel',
    name:        'Toxic Shrapnel',
    description: 'Rock Hurler hits apply a Poison DoT stack to targets.',
    category:    'synergy',
    weight:      7,
    rarity:      'common',
  },
  {
    id:          'cryo-cannon',
    name:        'Cryo Cannon',
    description: 'Rock Hurler shots slow targets by 20% for 1.5s.',
    category:    'synergy',
    weight:      7,
    rarity:      'common',
  },
  {
    id:          'grounded',
    name:        'Grounded',
    description: 'Thunder chains deal +30% damage to armored creeps.',
    category:    'synergy',
    weight:      6,
    rarity:      'common',
  },
  {
    id:          'brittle-ice',
    name:        'Brittle Ice',
    description: 'Rock Hurler deals +20% damage to frost-slowed targets.',
    category:    'synergy',
    weight:      7,
    rarity:      'common',
  },
  {
    id:          'lightning-rod',
    name:        'Lightning Rod',
    description: 'Frost-slowed creeps attract 1 extra Thunder chain hit.',
    category:    'synergy',
    weight:      5,
    rarity:      'rare',
  },
  {
    id:          'explosive-residue',
    name:        'Explosive Residue',
    description: 'Rock Hurler blasts slow targets by 20% for 2s.',
    category:    'synergy',
    weight:      7,
    rarity:      'common',
  },
  {
    id:          'acid-rain',
    name:        'Acid Rain',
    description: 'Rock Hurler blasts apply a weak Poison stack.',
    category:    'synergy',
    weight:      6,
    rarity:      'common',
  },
  {
    id:          'glacial-surge',
    name:        'Glacial Surge',
    description: 'Frost shots deal +15% damage to already-slowed targets.',
    category:    'synergy',
    weight:      5,
    rarity:      'rare',
  },
  {
    id:          'overcharge',
    name:        'Overcharge',
    description: 'Thunder deals +15% more damage per chain bounce.',
    category:    'synergy',
    weight:      5,
    rarity:      'rare',
  },

  // ── Phase 10: 10 new offers ───────────────────────────────────────────────

  // Combat (3)
  {
    id:          'iron-barrage',
    name:        'Iron Barrage',
    description: 'Towers gain +4% global damage for every 5 waves cleared.',
    category:    'combat',
    weight:      6,
    rarity:      'common',
  },
  {
    id:          'reapers-mark',
    name:        "Reaper's Mark",
    description: '5% chance on kill to arc 40 lightning damage to a nearby creep.',
    category:    'combat',
    weight:      6,
    rarity:      'common',
  },
  {
    id:          'blitz-protocol',
    name:        'Blitz Protocol',
    description: 'All towers permanently fire 15% faster.',
    category:    'combat',
    weight:      5,
    rarity:      'rare',
  },

  // Economy (3)
  {
    id:          'bounty-hunter',
    name:        'Bounty Hunter',
    description: 'Creep kill rewards are worth 20% more gold.',
    category:    'economy',
    weight:      7,
    rarity:      'common',
  },
  {
    id:          'salvage',
    name:        'Salvage',
    description: 'One-time: your next tower sell returns 100% of its cost.',
    category:    'economy',
    weight:      5,
    rarity:      'rare',
  },
  {
    id:          'supply-cache',
    name:        'Supply Cache',
    description: 'Earn +10 gold per tower you own at the start of each wave.',
    category:    'economy',
    weight:      6,
    rarity:      'common',
  },

  // Synergy (4)
  {
    id:          'voltaic-slime',
    name:        'Voltaic Slime',
    description: 'Thunder chain hits deal +25% damage to Poison-stacked creeps.',
    category:    'synergy',
    weight:      6,
    rarity:      'common',
  },
  {
    id:          'concussion-shell',
    name:        'Concussion Shell',
    description: 'Rock Hurler shots slow targets by 15% for 600ms.',
    category:    'synergy',
    weight:      6,
    rarity:      'common',
  },
  {
    id:          'overgrowth',
    name:        'Overgrowth',
    description: 'Poison towers gain +15% range.',
    category:    'synergy',
    weight:      6,
    rarity:      'common',
  },
  {
    id:          'thunder-quake',
    name:        'Thunder Quake',
    description: 'Thunder chain hits deal 15 AoE damage in 30px to nearby creeps.',
    category:    'synergy',
    weight:      5,
    rarity:      'rare',
  },

  // ── Phase 14 — Expanded offer pool (30 new offers) ────────────────────────

  // ── Mechanic-changing offers (12) — rarity: epic ──────────────────────────

  {
    id:          'ricochet-shot',
    name:        'Ricochet Shot',
    description: 'Cannon projectiles bounce to a 2nd nearest creep at 50% damage.',
    category:    'combat',
    weight:      3,
    rarity:      'epic',
  },
  {
    id:          'flash-freeze',
    name:        'Flash Freeze',
    description: 'Frost no longer slows. Frozen creeps take 2× damage from all sources for 3s.',
    category:    'combat',
    weight:      3,
    rarity:      'epic',
  },
  {
    id:          'chain-reactor',
    name:        'Chain Reactor',
    description: 'Thunder kills cause a small explosion dealing 20% of max HP to adjacent creeps.',
    category:    'combat',
    weight:      3,
    rarity:      'epic',
  },
  {
    id:          'plague-doctor',
    name:        'Plague Doctor',
    description: 'Poison DoT stacks up to 5× on the same creep instead of refreshing.',
    category:    'combat',
    weight:      3,
    rarity:      'epic',
  },
  {
    id:          'aftershock',
    name:        'Aftershock',
    description: 'Mortar shells leave a 2s lingering fire zone that damages passing creeps.',
    category:    'combat',
    weight:      3,
    rarity:      'epic',
  },
  {
    id:          'aura-leech',
    name:        'Aura Leech',
    description: 'Aura tower drains 5% of buffed towers\' damage as bonus gold at wave end.',
    category:    'economy',
    weight:      3,
    rarity:      'epic',
  },
  {
    id:          'glass-cannon',
    name:        'Glass Cannon',
    description: 'Cannon towers deal +100% damage but have -50% range.',
    category:    'combat',
    weight:      3,
    rarity:      'epic',
  },
  {
    id:          'permafrost',
    name:        'Permafrost',
    description: 'Frost slow is permanent (creeps never recover speed), but magnitude is halved.',
    category:    'combat',
    weight:      3,
    rarity:      'epic',
  },
  {
    id:          'living-poison',
    name:        'Living Poison',
    description: 'Poison clouds drift slowly along the path in the direction of creep travel.',
    category:    'combat',
    weight:      2,
    rarity:      'epic',
  },
  {
    id:          'overkill-transfer',
    name:        'Overkill Transfer',
    description: 'Excess damage from killing a creep carries over to the next creep in line.',
    category:    'combat',
    weight:      3,
    rarity:      'epic',
  },
  {
    id:          'shared-pain',
    name:        'Shared Pain',
    description: 'Nearby towers deal 25% damage whenever any tower in range attacks.',
    category:    'combat',
    weight:      2,
    rarity:      'epic',
  },
  {
    id:          'tower-tax',
    name:        'Tower Tax',
    description: 'Each tower costs 20% more, but deals +15% damage per tower already placed.',
    category:    'economy',
    weight:      2,
    rarity:      'epic',
    isChallenge: true,
  },

  // ── Synergy offers (8) — rarity: rare / epic ──────────────────────────────

  {
    id:            'shatter',
    name:          'Shatter',
    description:   'Frozen creeps (from Frost) take triple damage from Mortar AoE.',
    category:      'synergy',
    weight:        4,
    rarity:        'rare',
    synergyRequires: ['frost', 'mortar'],
  },
  {
    id:            'conductor',
    name:          'Conductor',
    description:   'Poison-debuffed creeps take +50% Thunder chain damage.',
    category:      'synergy',
    weight:        4,
    rarity:        'rare',
    synergyRequires: ['poison', 'tesla'],
  },
  {
    id:            'siege-mode',
    name:          'Siege Mode',
    description:   'Cannon towers near an Aura tower have attack speed halved but damage tripled.',
    category:      'synergy',
    weight:        3,
    rarity:        'epic',
    synergyRequires: ['cannon', 'aura'],
  },
  {
    id:            'arctic-shrapnel',
    name:          'Arctic Shrapnel',
    description:   'Mortar hits apply Frost slow for 1s.',
    category:      'synergy',
    weight:        5,
    rarity:        'rare',
    synergyRequires: ['mortar'],
  },
  {
    id:            'voltaic-venom',
    name:          'Voltaic Venom',
    description:   'Thunder kills spread Poison DoT to nearby creeps.',
    category:      'synergy',
    weight:        4,
    rarity:        'rare',
    synergyRequires: ['tesla', 'poison'],
  },
  {
    id:            'stone-skin',
    name:          'Stone Skin',
    description:   'Armoured creeps that survive a Mortar hit become immune to Mortar for 3s.',
    category:      'synergy',
    weight:        4,
    rarity:        'rare',
    isChallenge:   true,
    synergyRequires: ['mortar'],
  },
  {
    id:          'blood-price',
    name:        'Blood Price',
    description: 'Selling a tower grants its sell value in gold AND heals 1 life.',
    category:    'synergy',
    weight:      4,
    rarity:      'rare',
  },
  {
    id:            'crowded-house',
    name:          'Crowded House',
    description:   'Towers deal +5% damage per other tower within 2 tiles (up to +35%).',
    category:      'synergy',
    weight:        4,
    rarity:        'rare',
  },

  // ── Economy / build offers (10) ───────────────────────────────────────────

  {
    id:          'salvage-rights',
    name:        'Salvage Rights',
    description: 'Tower sell value increased to 90% for the entire run.',
    category:    'economy',
    weight:      4,
    rarity:      'rare',
  },
  {
    id:          'bulk-discount',
    name:        'Bulk Discount',
    description: 'Each tower of the same type costs 5% less (stacks per additional tower).',
    category:    'economy',
    weight:      6,
    rarity:      'common',
  },
  {
    id:          'war-chest-wave',
    name:        'War Chest',
    description: 'Start each wave with +15 gold but earn 20% less gold from kills.',
    category:    'economy',
    weight:      5,
    rarity:      'common',
    isChallenge: true,
  },
  {
    id:          'gambler',
    name:        'Gambler',
    description: 'Every 5 waves, a random tower on the field receives a free upgrade.',
    category:    'economy',
    weight:      4,
    rarity:      'rare',
  },
  {
    id:          'recycler',
    name:        'Recycler',
    description: 'Selling a tower refunds its upgrade costs at 50%.',
    category:    'economy',
    weight:      6,
    rarity:      'common',
  },
  {
    id:          'headstart',
    name:        'Headstart',
    description: 'Place one free tower of your choice before wave 1 starts.',
    category:    'economy',
    weight:      3,
    rarity:      'epic',
  },
  {
    id:          'bounty-escape',
    name:        'Bounty',
    description: 'The first creep to escape each wave drops triple gold on the next kill.',
    category:    'economy',
    weight:      4,
    rarity:      'rare',
  },
  {
    id:          'insurance',
    name:        'Insurance',
    description: 'If you lose 2 or more lives in a wave, gain 20 gold compensation.',
    category:    'economy',
    weight:      6,
    rarity:      'common',
  },
  {
    id:          'marksman',
    name:        'Marksman',
    description: 'All towers gain +15% range but deal -10% damage.',
    category:    'combat',
    weight:      7,
    rarity:      'common',
  },
  {
    id:          'focused-fire',
    name:        'Focused Fire',
    description: 'Towers targeting the same creep as another tower deal +10% extra damage.',
    category:    'combat',
    weight:      6,
    rarity:      'common',
  },
];
