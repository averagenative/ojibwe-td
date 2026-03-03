/**
 * Cutscene definitions — illustrated dialog & narrative moments.
 *
 * Cutscenes are multi-frame dialog sequences (visual novel style) shown at
 * key story beats: region introductions, boss encounters, commander picks,
 * and the game's first launch.
 *
 * Phaser-free — safe for unit tests.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface CutsceneFrame {
  /** Background image key or CSS hex colour (e.g. '#1a0f2e'). */
  background?: string;
  /** Character name shown in the nameplate above the dialog box. */
  speaker?: string;
  /** Texture key for the character portrait image. */
  portrait?: string;
  /** Which side the portrait appears on ('left' by default). */
  portraitSide?: 'left' | 'right';
  /** Dialog text. Supports '\n' for line breaks. */
  text: string;
  /** Portrait variant / expression suffix (e.g. 'proud', 'fierce'). */
  emotion?: string;
  /** Screen effect to play when this frame appears. */
  effect?: 'shake' | 'flash' | 'fade';
  /** Auto-advance after N ms (0 or undefined = wait for tap). */
  auto?: number;
}

export interface CutsceneDef {
  id: string;
  frames: CutsceneFrame[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Look up a cutscene by ID. */
export function getCutsceneDef(id: string): CutsceneDef | undefined {
  return ALL_CUTSCENES.find(c => c.id === id);
}

/** Return the cutscene ID for a region introduction, or undefined. */
export function getRegionIntroCutsceneId(regionId: string): string | undefined {
  const id = `cutscene-region-${regionId}`;
  return ALL_CUTSCENES.some(c => c.id === id) ? id : undefined;
}

/** Return the cutscene ID for a pre-boss encounter, or undefined. */
export function getPreBossCutsceneId(bossKey: string): string | undefined {
  const id = `cutscene-boss-${bossKey}`;
  return ALL_CUTSCENES.some(c => c.id === id) ? id : undefined;
}

/** Return the cutscene ID for a post-boss victory, or undefined. */
export function getPostBossCutsceneId(bossKey: string): string | undefined {
  const id = `cutscene-boss-${bossKey}-victory`;
  return ALL_CUTSCENES.some(c => c.id === id) ? id : undefined;
}

/** Return the cutscene ID for a commander introduction, or undefined. */
export function getCommanderIntroCutsceneId(commanderId: string): string | undefined {
  const id = `cutscene-commander-${commanderId}`;
  return ALL_CUTSCENES.some(c => c.id === id) ? id : undefined;
}

// ── Intro cutscene (first launch) ────────────────────────────────────────────

const INTRO_CUTSCENE: CutsceneDef = {
  id: 'cutscene-intro',
  frames: [
    {
      background: '#0a1810',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'Listen well, noozhis. The land speaks to those who are still enough to hear.',
      effect: 'fade',
    },
    {
      background: '#0a1810',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'For generations, the waters, the forests, and the creatures have lived in balance.\nBut something has changed. The spirits are restless.',
    },
    {
      background: '#0a1810',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'Animals flee their homes. The wind carries a sound like weeping.\nThe land itself is wounded.',
    },
    {
      background: '#0a1810',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'You must defend the crossings — not with hatred, but with courage.\nThese lost spirits must be turned back, gently, until balance returns.',
    },
    {
      background: '#0a1810',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'Place your towers where the path is narrow.\nWatch the land — it will tell you where to stand.',
    },
  ],
};

// ── Region introduction cutscenes ────────────────────────────────────────────

const REGION_ZAAGAIGANING: CutsceneDef = {
  id: 'cutscene-region-zaagaiganing',
  frames: [
    {
      background: '#0a1810',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'Zaaga\'iganing — the lake country. Our people have gathered here since before memory.',
      effect: 'fade',
    },
    {
      background: '#0a1810',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'The loons call at the wrong hour now. The fish swim in circles.\nSomething stirs beneath the still water.',
    },
    {
      background: '#0a1810',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'Defend the crossing, noozhis. Let nothing reach the village.\nThe elders will watch and guide you.',
    },
  ],
};

const REGION_MASHKIIG: CutsceneDef = {
  id: 'cutscene-region-mashkiig',
  frames: [
    {
      background: '#071520',
      speaker: 'Nokomis',
      portrait: 'elder-nokomis',
      portraitSide: 'left',
      text: 'Mashkiig — the wetlands. A place of abundant life and hidden danger.',
      effect: 'fade',
    },
    {
      background: '#071520',
      speaker: 'Nokomis',
      portrait: 'elder-nokomis-teaching',
      portraitSide: 'left',
      text: 'The birch bark and medicines grow thick here.\nWhen the land is sick, the medicines remember what we forget.',
    },
    {
      background: '#071520',
      speaker: 'Nokomis',
      portrait: 'elder-nokomis',
      portraitSide: 'left',
      text: 'The marsh path twists and doubles back.\nUse this to your advantage — slow them where the water is deep.',
    },
  ],
};

const REGION_MITIGOMIZH: CutsceneDef = {
  id: 'cutscene-region-mitigomizh',
  frames: [
    {
      background: '#1f1005',
      speaker: 'Ogichidaa',
      portrait: 'elder-ogichidaa',
      portraitSide: 'left',
      text: 'Mitigomizh — the oak savanna. Open ground, few hiding places.',
      effect: 'fade',
    },
    {
      background: '#1f1005',
      speaker: 'Ogichidaa',
      portrait: 'elder-ogichidaa',
      portraitSide: 'left',
      text: 'The oaks are scorched but standing. Fire has swept through — not natural fire.\nThe land itself is fevered.',
    },
    {
      background: '#1f1005',
      speaker: 'Ogichidaa',
      portrait: 'elder-ogichidaa-fierce',
      portraitSide: 'left',
      text: 'There is no cover here. You must be strong where the land is weak.\nRaw firepower will hold the line.',
    },
  ],
};

const REGION_BIBOON_AKI: CutsceneDef = {
  id: 'cutscene-region-biboon-aki',
  frames: [
    {
      background: '#101824',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'Biboon-aki — the world of winter. The cold here is not cruelty. It is sleep.',
      effect: 'fade',
    },
    {
      background: '#101824',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'But something has woken too early, and the land cannot rest.\nThe spirits move with desperate urgency.',
    },
    {
      background: '#101824',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'This is where the cold began. Where the balance must be restored.\nFrost is your ally here — use it well.',
    },
    {
      background: '#101824',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'Be swift, but do not be cruel.\nWe heal the wound — we do not widen it.',
    },
  ],
};

// ── Pre-boss cutscenes ───────────────────────────────────────────────────────

const BOSS_MAKWA: CutsceneDef = {
  id: 'cutscene-boss-makwa',
  frames: [
    {
      background: '#1a0f05',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'The ground trembles. Something large approaches the crossing.',
      effect: 'shake',
    },
    {
      background: '#1a0f05',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'Makwa — the great bear. Armored in thick fur and fury.\nIn another season this would be a sacred meeting.',
    },
    {
      background: '#1a0f05',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'The bear is slow but mighty. Arrows bounce from its hide.\nFind the weakness — strike where the armor is thin.',
    },
  ],
};

const BOSS_MIGIZI: CutsceneDef = {
  id: 'cutscene-boss-migizi',
  frames: [
    {
      background: '#0f1520',
      speaker: 'Ogichidaa',
      portrait: 'elder-ogichidaa',
      portraitSide: 'left',
      text: 'A shadow crosses the sun. Look up.',
      effect: 'flash',
    },
    {
      background: '#0f1520',
      speaker: 'Ogichidaa',
      portrait: 'elder-ogichidaa-fierce',
      portraitSide: 'left',
      text: 'Migizi — the eagle — strikes like lightning across open ground.\nNo frost or poison can slow those golden wings.',
    },
    {
      background: '#0f1520',
      speaker: 'Ogichidaa',
      portrait: 'elder-ogichidaa',
      portraitSide: 'left',
      text: 'Speed is the eagle\'s weapon. You must answer with raw power.\nDo not try to slow what cannot be caught.',
    },
  ],
};

const BOSS_WAABOOZ: CutsceneDef = {
  id: 'cutscene-boss-waabooz',
  frames: [
    {
      background: '#0a1520',
      speaker: 'Nokomis',
      portrait: 'elder-nokomis',
      portraitSide: 'left',
      text: 'Something pale flickers in the reeds. Fast. Darting.',
    },
    {
      background: '#0a1520',
      speaker: 'Nokomis',
      portrait: 'elder-nokomis-teaching',
      portraitSide: 'left',
      text: 'Waabooz — the hare spirit. Do not be fooled by its size.\nWhen cornered, the hare becomes many.',
    },
    {
      background: '#0a1520',
      speaker: 'Nokomis',
      portrait: 'elder-nokomis',
      portraitSide: 'left',
      text: 'Poison and lasting damage are your friends here.\nWhat splits apart still carries the wound.',
    },
  ],
};

const BOSS_ANIMIKIINS: CutsceneDef = {
  id: 'cutscene-boss-animikiins',
  frames: [
    {
      background: '#0a0a1e',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'The sky darkens. Thunder without rain.',
      effect: 'shake',
    },
    {
      background: '#0a0a1e',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'Animikiins — the little thunderbird. A being of storm and renewal.\nIts wounds close even as you watch.',
    },
    {
      background: '#0a0a1e',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'Poison cannot touch the thunderbird — it burns away in the lightning.\nOnly relentless, sustained damage can overcome its healing.',
    },
  ],
};

// ── Post-boss victory cutscenes ──────────────────────────────────────────────

const BOSS_MAKWA_VICTORY: CutsceneDef = {
  id: 'cutscene-boss-makwa-victory',
  frames: [
    {
      background: '#1a0f05',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'Makwa falls, breathing heavy, then still.\nWhat hunger drove even the bear to desperation?',
    },
    {
      background: '#1a0f05',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'We did not seek this fight. Remember that.\nThe crossing holds — for now.',
    },
  ],
};

const BOSS_MIGIZI_VICTORY: CutsceneDef = {
  id: 'cutscene-boss-migizi-victory',
  frames: [
    {
      background: '#0f1520',
      speaker: 'Ogichidaa',
      portrait: 'elder-ogichidaa',
      portraitSide: 'left',
      text: 'Even in defeat, the golden feathers catch the light.\nThe sky mourns what the land has lost.',
    },
  ],
};

const BOSS_WAABOOZ_VICTORY: CutsceneDef = {
  id: 'cutscene-boss-waabooz-victory',
  frames: [
    {
      background: '#0a1520',
      speaker: 'Nokomis',
      portrait: 'elder-nokomis',
      portraitSide: 'left',
      text: 'The hare spirit split apart not in anger, but in fear.\nThis creature was fleeing something greater than us.',
    },
  ],
};

const BOSS_ANIMIKIINS_VICTORY: CutsceneDef = {
  id: 'cutscene-boss-animikiins-victory',
  frames: [
    {
      background: '#0a0a1e',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'Animikiins falls — and the sky weeps.\nThe thunderbird was never the enemy. It was trying to tell us where the wound is.',
    },
    {
      background: '#0a0a1e',
      speaker: 'Mishoomis',
      portrait: 'elder-mishoomis',
      portraitSide: 'left',
      text: 'Listen to the silence that follows.',
    },
  ],
};

// ── Commander introduction cutscenes ─────────────────────────────────────────

const COMMANDER_NOKOMIS: CutsceneDef = {
  id: 'cutscene-commander-nokomis',
  frames: [
    {
      speaker: 'Nokomis',
      portrait: 'portrait-nokomis',
      portraitSide: 'left',
      text: 'I am Nokomis — grandmother to the village, keeper of the healing ways.',
    },
    {
      speaker: 'Nokomis',
      portrait: 'portrait-nokomis',
      portraitSide: 'left',
      text: 'My towers heal the land even as they defend it.\nStay close to my aura and your defences will endure.',
    },
  ],
};

const COMMANDER_MAKOONS: CutsceneDef = {
  id: 'cutscene-commander-makoons',
  frames: [
    {
      speaker: 'Makoons',
      portrait: 'portrait-makoons',
      portraitSide: 'left',
      text: 'Makoons — bear cub of the warrior lodge. I fight so others don\'t have to.',
    },
    {
      speaker: 'Makoons',
      portrait: 'portrait-makoons',
      portraitSide: 'left',
      text: 'My presence sharpens every tower\'s aim.\nWhen the time is right, I can break through any armor.',
    },
  ],
};

const COMMANDER_WAABIZII: CutsceneDef = {
  id: 'cutscene-commander-waabizii',
  frames: [
    {
      speaker: 'Waabizii',
      portrait: 'portrait-waabizii',
      portraitSide: 'left',
      text: 'Waabizii — the swan. Swift and watchful. I see what others miss.',
    },
    {
      speaker: 'Waabizii',
      portrait: 'portrait-waabizii',
      portraitSide: 'left',
      text: 'The land provides for those who are patient.\nWith me, your gold flows deeper and your choices are richer.',
    },
  ],
};

const COMMANDER_BIZHIW: CutsceneDef = {
  id: 'cutscene-commander-bizhiw',
  frames: [
    {
      speaker: 'Bizhiw',
      portrait: 'portrait-bizhiw',
      portraitSide: 'left',
      text: 'Bizhiw — the lynx. Patient. Precise. I strike only when the moment is right.',
    },
    {
      speaker: 'Bizhiw',
      portrait: 'portrait-bizhiw',
      portraitSide: 'left',
      text: 'My focus sharpens your targeting and steadies your aim.\nNo life is lost carelessly under my watch.',
    },
  ],
};

const COMMANDER_ANIMIKIIKAA: CutsceneDef = {
  id: 'cutscene-commander-animikiikaa',
  frames: [
    {
      speaker: 'Animikiikaa',
      portrait: 'portrait-animikiikaa',
      portraitSide: 'left',
      text: 'Animikiikaa — thunder of the sky people. The storm answers when I call.',
    },
    {
      speaker: 'Animikiikaa',
      portrait: 'portrait-animikiikaa',
      portraitSide: 'left',
      text: 'Lightning leaps between my towers, chaining from one to the next.\nWhen I unleash my full power, nothing survives the storm.',
    },
  ],
};

// ── All cutscenes ────────────────────────────────────────────────────────────

export const ALL_CUTSCENES: readonly CutsceneDef[] = [
  // Intro
  INTRO_CUTSCENE,
  // Region introductions
  REGION_ZAAGAIGANING,
  REGION_MASHKIIG,
  REGION_MITIGOMIZH,
  REGION_BIBOON_AKI,
  // Pre-boss encounters
  BOSS_MAKWA,
  BOSS_MIGIZI,
  BOSS_WAABOOZ,
  BOSS_ANIMIKIINS,
  // Post-boss victories
  BOSS_MAKWA_VICTORY,
  BOSS_MIGIZI_VICTORY,
  BOSS_WAABOOZ_VICTORY,
  BOSS_ANIMIKIINS_VICTORY,
  // Commander introductions
  COMMANDER_NOKOMIS,
  COMMANDER_MAKOONS,
  COMMANDER_WAABIZII,
  COMMANDER_BIZHIW,
  COMMANDER_ANIMIKIIKAA,
];
