/**
 * Commander definitions — data + logic for the Commander system.
 *
 * Each commander has:
 *   - Pure data (name, clan, totem, role, lore, icons)
 *   - An aura that sets persistent effects on CommanderRunState
 *   - A once-per-run ability that modifies state + calls AbilityContext methods
 *
 * NO Phaser import — safe for unit tests.
 * Adding a new commander = adding an entry to ALL_COMMANDERS below.
 */

// ── Commander Run State ──────────────────────────────────────────────────────
//
// Mutable state object stored in GameScene; read by Tower, Creep, and HUD
// each frame. Aura effects are applied once in create(); ability effects
// toggle flags that clear after their duration.

export interface CommanderRunState {
  commanderId: string;
  abilityUsed: boolean;

  // ── Aura effects (set by applyAura, read by game systems) ────────────────

  /** Multiplicative damage bonus for all towers (1.0 = none). */
  globalDamageMult: number;
  /** Per-tower-key attack interval multiplier (<1 = faster). */
  attackSpeedMultByKey: Record<string, number>;
  /** Projectile travel speed multiplier (>1 = faster). */
  projectileSpeedMult: number;
  /** Extra Tesla chain targets (+N). */
  teslaChainBonus: number;
  /** Whether Tesla chain jumps emit 1-tile AoE. */
  teslaChainAoE: boolean;
  /** Bonus gold per creep kill. */
  killGoldBonus: number;
  /** How many offer cards to draw between waves. */
  offerCardCount: number;
  /** Bonus starting lives added at run start. */
  startingLivesBonus: number;
  /** Heal 1 life every N kills; 0 = disabled. */
  healEveryNKills: number;
  /** Chance (0–1) to heal 1 life when a poisoned creep dies. */
  poisonKillHealChance: number;

  // ── Runtime counters (modified by GameScene) ─────────────────────────────

  killsSinceLastHeal: number;
  /** Lives at the start of the current wave (for Nokomis ability). */
  waveStartLives: number;

  // ── Ability effect flags (set by activateAbility, cleared by timers) ─────

  /** When true, all damage ignores armor and status immunities. */
  ignoreArmorAndImmunity: boolean;
  /** Tesla attack interval divisor (1.0 = normal, 3.0 = 3× speed). */
  teslaSpeedBoostDivisor: number;
  /** When true, Tesla chain count is effectively unlimited. */
  teslaUnlimitedChains: boolean;
  /** When true, creep escapes cost 0 lives for the remainder of the wave. */
  absorbEscapes: boolean;
}

export function defaultCommanderRunState(commanderId: string): CommanderRunState {
  return {
    commanderId,
    abilityUsed: false,

    globalDamageMult: 1.0,
    attackSpeedMultByKey: {},
    projectileSpeedMult: 1.0,
    teslaChainBonus: 0,
    teslaChainAoE: false,
    killGoldBonus: 0,
    offerCardCount: 3,
    startingLivesBonus: 0,
    healEveryNKills: 0,
    poisonKillHealChance: 0,

    killsSinceLastHeal: 0,
    waveStartLives: 0,

    ignoreArmorAndImmunity: false,
    teslaSpeedBoostDivisor: 1.0,
    teslaUnlimitedChains: false,
    absorbEscapes: false,
  };
}

// ── Ability Context ──────────────────────────────────────────────────────────
//
// Provided by GameScene when the player activates an ability.
// Lets the ability function perform side effects (add gold, set lives, etc.)
// without importing GameScene.

export interface AbilityContext {
  currentWave: number;
  currentLives: number;
  waveStartLives: number;
  startingLives: number;
  currentGold: number;
  addGold(amount: number): void;
  setLives(lives: number): void;
  /** Schedule a callback after `durationMs`. */
  addTimedEffect(durationMs: number, onEnd: () => void): void;
  /** Show a temporary text message on screen. */
  showMessage(text: string, durationMs: number): void;
  /** Get info about a specific wave (for Scout's Eye / Swift Walk). Null if wave doesn't exist. */
  getWaveCreepInfo(waveNum: number): { count: number; types: string[]; totalRewardGold: number } | null;
}

// ── Commander Def Schema ─────────────────────────────────────────────────────

export interface AuraDef {
  name: string;
  description: string;
  /** Called once at run start; mutates state to set persistent aura effects. */
  apply(state: CommanderRunState): void;
}

export interface AbilityDef {
  name: string;
  description: string;
  cooldown: 'once-per-run';
  uiIcon: string;
  /** Called when the player presses the ability button. */
  activate(state: CommanderRunState, ctx: AbilityContext): void;
}

export interface CommanderDef {
  id: string;
  name: string;
  clan: string;
  totem: string;
  role: string;
  /** 3–5 sentences of character lore. */
  lore: string;
  portraitIcon: string;
  aura: AuraDef;
  ability: AbilityDef;
  unlockCost: number;
  defaultUnlocked: boolean;
}

// ── Commander Definitions ────────────────────────────────────────────────────

const NOKOMIS: CommanderDef = {
  id: 'nokomis',
  name: 'Nokomis',
  clan: 'Marten Clan',
  totem: 'Turtle',
  role: 'Sustain',
  lore: 'A keeper of medicine knowledge and oral tradition. She knows the land and what grows where. Nokomis has walked these paths longer than any other, and her wisdom runs deep as the roots of the oldest cedar. Her garden sustains all who defend it.',
  portraitIcon: 'commander-nokomis',
  aura: {
    name: 'Gitigaan',
    description: 'All towers regenerate 1 life collectively per 40 creep kills.',
    apply(state) {
      state.healEveryNKills = 40;
    },
  },
  ability: {
    name: 'Mashkiki Biindaakoojiigan',
    description: 'Fully restore lives to their wave-start value.',
    cooldown: 'once-per-run',
    uiIcon: 'ability-medicine-bundle',
    activate(state, ctx) {
      ctx.setLives(state.waveStartLives);
    },
  },
  unlockCost: 0,
  defaultUnlocked: true,
};

const BIZHIW: CommanderDef = {
  id: 'bizhiw',
  name: 'Bizhiw',
  clan: 'Crane Clan',
  totem: 'Lynx',
  role: 'Precision',
  lore: 'The lynx sees what others cannot. Bizhiw moves through the forest without sound, and their arrows find their mark before the prey knows it has been seen. Patience and precision are their weapons, honed across a lifetime of silent observation.',
  portraitIcon: 'commander-bizhiw',
  aura: {
    name: 'Bimaadiziwin',
    description: 'Cannon and Frost tower attack speed +20%; projectile travel speed +25%.',
    apply(state) {
      state.attackSpeedMultByKey['cannon'] = 0.80;
      state.attackSpeedMultByKey['frost'] = 0.80;
      state.projectileSpeedMult = 1.25;
    },
  },
  ability: {
    name: 'Wiigiwaam Wiindamaagewin',
    description: "Reveals the next wave's creep composition and count 15 seconds early.",
    cooldown: 'once-per-run',
    uiIcon: 'ability-scouts-eye',
    activate(_state, ctx) {
      const info = ctx.getWaveCreepInfo(ctx.currentWave + 1);
      if (info) {
        const msg = `Next wave: ${info.count} creeps (${info.types.join(', ')})`;
        ctx.showMessage(msg, 15000);
      } else {
        ctx.showMessage('No further waves to scout.', 3000);
      }
    },
  },
  unlockCost: 200,
  defaultUnlocked: false,
};

const ANIMIKIIKAA: CommanderDef = {
  id: 'animikiikaa',
  name: 'Animikiikaa',
  clan: 'Eagle Clan',
  totem: 'Eagle',
  role: 'Burst',
  lore: 'When Animikiikaa speaks, the sky splits open and the earth trembles. They are the voice of the thunderstorm, and their fury is matched only by their devotion to protecting the people. Lightning bows to their will.',
  portraitIcon: 'commander-animikiikaa',
  aura: {
    name: 'Animiki-bimaadiziwin',
    description: 'Tesla chain count +1 globally; chain jumps emit a 1-tile AoE on impact.',
    apply(state) {
      state.teslaChainBonus = 1;
      state.teslaChainAoE = true;
    },
  },
  ability: {
    name: 'Gichi-animikiikaa',
    description: 'For 8 seconds all Tesla towers fire at 3x speed and chains ignore target limits.',
    cooldown: 'once-per-run',
    uiIcon: 'ability-great-thunder',
    activate(state, ctx) {
      state.teslaSpeedBoostDivisor = 3.0;
      state.teslaUnlimitedChains = true;
      ctx.addTimedEffect(8000, () => {
        state.teslaSpeedBoostDivisor = 1.0;
        state.teslaUnlimitedChains = false;
      });
    },
  },
  unlockCost: 400,
  defaultUnlocked: false,
};

const MAKOONS: CommanderDef = {
  id: 'makoons',
  name: 'Makoons',
  clan: 'Bear Clan',
  totem: 'Bear',
  role: 'Damage',
  lore: "The bear cub grows into the warrior. Makoons carries the strength of their ancestors in every step. Where others see an obstacle, Makoons sees something to charge through. Their presence alone makes every defender hit harder.",
  portraitIcon: 'commander-makoons',
  aura: {
    name: 'Makwa-zoongide\'e',
    description: 'All tower base damage +12%; towers do not lose target on creep speed burst.',
    apply(state) {
      state.globalDamageMult = 1.12;
    },
  },
  ability: {
    name: 'Makwa-ojiins',
    description: 'For 6 seconds all towers ignore armor and immunity flags.',
    cooldown: 'once-per-run',
    uiIcon: 'ability-bears-charge',
    activate(state, ctx) {
      state.ignoreArmorAndImmunity = true;
      ctx.addTimedEffect(6000, () => {
        state.ignoreArmorAndImmunity = false;
      });
    },
  },
  unlockCost: 300,
  defaultUnlocked: false,
};

const OSHKAABEWIS: CommanderDef = {
  id: 'oshkaabewis',
  name: 'Oshkaabewis',
  clan: 'Loon Clan',
  totem: 'Deer',
  role: 'Economy',
  lore: 'The messenger runs between worlds, carrying words and wealth in equal measure. Oshkaabewis knows every trail and every shortcut, and their keen eye for opportunity turns every encounter into profit. Resources flow where they walk.',
  portraitIcon: 'commander-oshkaabewis',
  aura: {
    name: 'Bimosewin',
    description: '+1 gold per creep kill; between-wave offer draws show 4 cards instead of 3.',
    apply(state) {
      state.killGoldBonus = 1;
      state.offerCardCount = 4;
    },
  },
  ability: {
    name: 'Giizhibaa-bimosewin',
    description: 'Immediately receive gold equal to 30% of current wave\'s total creep kill gold.',
    cooldown: 'once-per-run',
    uiIcon: 'ability-swift-walk',
    activate(_state, ctx) {
      const info = ctx.getWaveCreepInfo(ctx.currentWave);
      if (info) {
        const bonus = Math.round(info.totalRewardGold * 0.30);
        if (bonus > 0) ctx.addGold(bonus);
      }
    },
  },
  unlockCost: 250,
  defaultUnlocked: false,
};

const WAABIZII: CommanderDef = {
  id: 'waabizii',
  name: 'Waabizii',
  clan: 'Fish Clan',
  totem: 'Swan',
  role: 'Resilience',
  lore: 'The swan glides above the chaos, serene and untouchable. Waabizii embodies unconditional love — their presence mends wounds and shields the vulnerable. Even in the darkest wave, their tenderness keeps hope alive.',
  portraitIcon: 'commander-waabizii',
  aura: {
    name: "Zaagi'idiwin",
    description: 'Poison DoT kills have a 25% chance to heal 1 life; starting life count +2.',
    apply(state) {
      state.poisonKillHealChance = 0.25;
      state.startingLivesBonus = 2;
    },
  },
  ability: {
    name: 'Wiisagenimad',
    description: 'For the next wave, any creep that escapes costs 0 lives.',
    cooldown: 'once-per-run',
    uiIcon: 'ability-tenderness',
    activate(state, _ctx) {
      state.absorbEscapes = true;
      // Cleared by GameScene at the end of the next wave.
    },
  },
  unlockCost: 350,
  defaultUnlocked: false,
};

// ── Exports ──────────────────────────────────────────────────────────────────

export const ALL_COMMANDERS: CommanderDef[] = [
  NOKOMIS,
  BIZHIW,
  ANIMIKIIKAA,
  MAKOONS,
  OSHKAABEWIS,
  WAABIZII,
];

/** IDs of commanders that require meta-progression unlocks. */
export const LOCKED_COMMANDER_IDS: string[] =
  ALL_COMMANDERS.filter(c => !c.defaultUnlocked).map(c => c.id);

/** Look up a commander by ID. Returns undefined if not found. */
export function getCommanderDef(id: string): CommanderDef | undefined {
  return ALL_COMMANDERS.find(c => c.id === id);
}
