/**
 * Codex entry definitions — lore encyclopedia unlocked through gameplay.
 *
 * Entries are organised into four sections:
 *   - Beings:     boss and creep lore
 *   - Places:     region and stage descriptions
 *   - Commanders: character backstories
 *   - Teachings:  short Ojibwe cultural notes
 *
 * Phaser-free — safe for unit tests.
 */

// ── Section types ────────────────────────────────────────────────────────────

export const CodexSection = {
  BEINGS:     'beings',
  PLACES:     'places',
  COMMANDERS: 'commanders',
  TEACHINGS:  'teachings',
} as const;

export type CodexSection = (typeof CodexSection)[keyof typeof CodexSection];

export const CODEX_SECTION_LABELS: Record<CodexSection, string> = {
  [CodexSection.BEINGS]:     'Beings',
  [CodexSection.PLACES]:     'Places',
  [CodexSection.COMMANDERS]: 'Commanders',
  [CodexSection.TEACHINGS]:  'Teachings',
};

// ── CodexEntryDef schema ─────────────────────────────────────────────────────

export interface CodexEntryDef {
  id:       string;
  section:  CodexSection;
  title:    string;
  /** Hex colour for the placeholder illustration tile. */
  tileColor: number;
  /** Texture key for the entry icon (portrait, boss sprite, tile, etc.). Falls back to tileColor tile when missing or not loaded. */
  iconKey?:  string;
  /** 2–6 lines of lore text. */
  lines:    string[];
  /** Whether the creator has reviewed this entry. */
  reviewed: boolean;
  /** If true, this entry is unlocked from the start. */
  defaultUnlocked?: boolean;
}

// ── Beings ───────────────────────────────────────────────────────────────────

const BEINGS: CodexEntryDef[] = [
  {
    id:        'codex-being-displaced-spirits',
    section:   CodexSection.BEINGS,
    title:     'Displaced Spirits',
    tileColor: 0x667788,
    iconKey:   'creep-normal',
    lines: [
      'The creatures that swarm across the land are not invaders.',
      'They are spirits of animals and small beings, driven from their homes',
      'by a disturbance deep in the frozen north.',
      'They run not with malice, but with fear.',
      'To defend against them is necessary — but to pity them is wisdom.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-being-makwa',
    section:   CodexSection.BEINGS,
    title:     'Makwa — The Bear',
    tileColor: 0xcc6600,
    iconKey:   'boss-makwa',
    lines: [
      'Makwa is the great bear, keeper of medicine knowledge.',
      'Thick-furred and slow to anger, the bear walks alone',
      'through the deepest forest. Its hide turns aside all but the sharpest blow.',
      'When Makwa wanders far from the den, something is deeply wrong.',
      'The bear does not seek conflict — it seeks home.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-being-migizi',
    section:   CodexSection.BEINGS,
    title:     'Migizi — The Eagle',
    tileColor: 0xffd700,
    iconKey:   'boss-migizi',
    lines: [
      'Migizi flies above the world, seeing all.',
      'The golden eagle is a messenger between the earth and the sky.',
      'No frost can touch its wings; no poison can cloud its sight.',
      'When Migizi descends to the ground, the sky itself is troubled.',
      'Even in defeat, the eagle\'s feathers catch the last light.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-being-waabooz',
    section:   CodexSection.BEINGS,
    title:     'Waabooz — The Hare',
    tileColor: 0xaaddff,
    iconKey:   'boss-waabooz',
    lines: [
      'Waabooz, the hare, is the trickster\'s companion.',
      'Quick and elusive, it splits into copies when cornered —',
      'not from strength, but from pure, desperate fear.',
      'The hare spirit was never meant to fight.',
      'It was fleeing something far greater than any tower.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-being-animikiins',
    section:   CodexSection.BEINGS,
    title:     'Animikiins — Little Thunderbird',
    tileColor: 0x4466ff,
    iconKey:   'boss-animikiins',
    lines: [
      'Animikiins is the youngest of the thunder beings.',
      'Its wings crackle with lightning; its body heals as fast as it is wounded.',
      'Poison cannot touch the thunderbird — it is too close to the sky.',
      'Animikiins appeared not as a destroyer, but as a warning:',
      'the imbalance has reached the highest places.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-being-creep-swarm',
    section:   CodexSection.BEINGS,
    title:     'The Swarm',
    tileColor: 0x556655,
    iconKey:   'creep-fast',
    lines: [
      'Small spirits travel in groups — strength in numbers.',
      'Individually fragile, collectively overwhelming.',
      'The swarm moves like water finding the path of least resistance.',
      'Each one was once a part of the land\'s harmony.',
    ],
    reviewed: false,
    defaultUnlocked: true,
  },
];

// ── Places ───────────────────────────────────────────────────────────────────

const PLACES: CodexEntryDef[] = [
  {
    id:        'codex-place-zaagaiganing',
    section:   CodexSection.PLACES,
    title:     'Zaaga\'iganing — Lake Country',
    tileColor: 0x0a6a3a,
    iconKey:   'tile-tree',
    lines: [
      'Zaaga\'iganing, the lake country, lies at the heart of the homeland.',
      'Its shores have been gathering places since time before memory.',
      'The winding pass through the lakes is the first line of defence —',
      'and the first place the disturbance was felt.',
      'The waters here still remember stillness.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-place-mashkiig',
    section:   CodexSection.PLACES,
    title:     'Mashkiig — The Wetlands',
    tileColor: 0x1188bb,
    iconKey:   'tile-water',
    lines: [
      'Mashkiig is a place of hidden paths and abundant life.',
      'The twisting waterways slow all who pass through,',
      'and the marsh reeds conceal both danger and sanctuary.',
      'Defenders who know the wetlands use their terrain wisely —',
      'the marsh rewards patience over brute force.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-place-mitigomizh',
    section:   CodexSection.PLACES,
    title:     'Mitigomizh — Oak Savanna',
    tileColor: 0xbb6600,
    iconKey:   'tile-brush',
    lines: [
      'Mitigomizh stretches wide and golden under the autumn sky.',
      'The oaks here are ancient — they have survived a hundred fires.',
      'But this fire was different. It left scorch marks',
      'that do not fade with rain.',
      'Without natural chokepoints, defenders must hold every stretch of open ground.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-place-biboon-aki',
    section:   CodexSection.PLACES,
    title:     'Biboon-aki — Winter Lands',
    tileColor: 0x3377bb,
    iconKey:   'tile-rock',
    lines: [
      'In Biboon-aki, the world holds its breath.',
      'The cold is not cruelty — it is the earth\'s rest.',
      'But something has disturbed that rest, and now',
      'the frost carries an unnatural edge.',
      'Here, at the source, the balance must be restored.',
    ],
    reviewed: false,
  },
];

// ── Commanders ───────────────────────────────────────────────────────────────

const COMMANDERS: CodexEntryDef[] = [
  {
    id:        'codex-commander-nokomis',
    section:   CodexSection.COMMANDERS,
    title:     'Nokomis — Grandmother',
    tileColor: 0x4a8848,
    iconKey:   'portrait-nokomis',
    lines: [
      'Nokomis of the Crane Clan carries the turtle totem.',
      'A keeper of medicine knowledge and oral tradition,',
      'she has walked these paths longer than any other.',
      'Her garden sustains all who defend it.',
      'Under her care, the land heals itself.',
    ],
    reviewed: false,
    defaultUnlocked: true,
  },
  {
    id:        'codex-commander-bizhiw',
    section:   CodexSection.COMMANDERS,
    title:     'Bizhiw — The Lynx',
    tileColor: 0x888866,
    iconKey:   'portrait-bizhiw',
    lines: [
      'Bizhiw of the Marten Clan carries the lynx totem.',
      'The lynx sees what others cannot.',
      'Moving through the forest without sound,',
      'their arrows find their mark before the prey knows it has been seen.',
      'Patience and precision are their weapons.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-commander-animikiikaa',
    section:   CodexSection.COMMANDERS,
    title:     'Animikiikaa — Thunder Voice',
    tileColor: 0x6644cc,
    iconKey:   'portrait-animikiikaa',
    lines: [
      'Animikiikaa of the Bird Clan carries the thunderbird totem.',
      'When they speak, the sky splits open and the earth trembles.',
      'They are the voice of the thunderstorm,',
      'and their fury is matched only by their devotion',
      'to protecting the people. Lightning bows to their will.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-commander-makoons',
    section:   CodexSection.COMMANDERS,
    title:     'Makoons — Bear Cub',
    tileColor: 0xaa5533,
    iconKey:   'portrait-makoons',
    lines: [
      'Makoons of the Bear Clan carries the bear totem.',
      'The bear cub grows into the warrior.',
      'Where others see an obstacle, Makoons sees something to charge through.',
      'Their presence alone makes every defender hit harder.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-commander-oshkaabewis',
    section:   CodexSection.COMMANDERS,
    title:     'Oshkaabewis — The Messenger',
    tileColor: 0xaaaa44,
    iconKey:   'portrait-oshkaabewis',
    lines: [
      'Oshkaabewis of the Deer Clan carries the deer totem.',
      'The messenger runs between worlds,',
      'carrying words and wealth in equal measure.',
      'Their keen eye for opportunity turns every encounter into profit.',
      'Resources flow where they walk.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-commander-waabizii',
    section:   CodexSection.COMMANDERS,
    title:     'Waabizii — The Swan',
    tileColor: 0xeeddff,
    iconKey:   'portrait-waabizii',
    lines: [
      'Waabizii of the Loon Clan carries the swan totem.',
      'The swan glides above the chaos, serene and untouchable.',
      'Their presence mends wounds and shields the vulnerable.',
      'Even in the darkest wave, their tenderness keeps hope alive.',
    ],
    reviewed: false,
  },
];

// ── Teachings ────────────────────────────────────────────────────────────────

const TEACHINGS: CodexEntryDef[] = [
  {
    id:        'codex-teaching-balance',
    section:   CodexSection.TEACHINGS,
    title:     'On Balance',
    tileColor: 0x4A7FA5,
    iconKey:   'teaching-balance',
    lines: [
      'In Anishinaabe teaching, the world exists in balance.',
      'When one part is disturbed, all parts feel it.',
      'The defender\'s role is not to conquer, but to restore —',
      'to hold the line until harmony returns on its own.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-teaching-fire',
    section:   CodexSection.TEACHINGS,
    title:     'On Fire',
    tileColor: 0xff6633,
    iconKey:   'teaching-fire',
    lines: [
      'Fire is not the enemy of the forest.',
      'For generations, controlled burns renewed the land —',
      'clearing old growth so new life could emerge.',
      'But fire without intention is destruction.',
      'The difference is care.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-teaching-seasons',
    section:   CodexSection.TEACHINGS,
    title:     'On the Seasons',
    tileColor: 0x77bbee,
    iconKey:   'teaching-seasons',
    lines: [
      'Each season carries a teaching.',
      'Spring is renewal. Summer is growth.',
      'Autumn is gratitude. Winter is rest.',
      'When the seasons are disrupted,',
      'the land cannot complete its cycle of healing.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-teaching-listening',
    section:   CodexSection.TEACHINGS,
    title:     'On Listening',
    tileColor: 0x88aa88,
    iconKey:   'teaching-listening',
    lines: [
      'The Anishinaabe way begins with listening.',
      'Before you speak, listen. Before you act, observe.',
      'The land speaks to those who are still enough to hear.',
      'The thunderbird circled three times before it flew.',
      'That was enough — for those who were listening.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-teaching-medicine',
    section:   CodexSection.TEACHINGS,
    title:     'On Medicine',
    tileColor: 0x448844,
    iconKey:   'teaching-medicine',
    lines: [
      'Mashkiki — medicine — is more than what heals the body.',
      'It is the relationship between the plant, the land, and the one who gathers.',
      'Birch bark, sweetgrass, cedar — each has a purpose and a protocol.',
      'When the land is sick, the medicines grow thin.',
      'To restore the garden is to restore the people.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-teaching-harmony',
    section:   CodexSection.TEACHINGS,
    title:     'On Harmony',
    tileColor: 0x66cc66,
    iconKey:   'teaching-harmony',
    lines: [
      'Harmony is not the absence of conflict.',
      'It is the willingness to restore what was broken.',
      'The defender who loses nothing has walked the gentlest path —',
      'and the land remembers.',
      'Miigwech — thank you — to those who defend without destroying.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-teaching-controlled-burns',
    section:   CodexSection.TEACHINGS,
    title:     'On Controlled Burns',
    tileColor: 0xcc4400,
    iconKey:   'teaching-controlled-burns',
    lines: [
      'Ishkode — fire — is one of the oldest tools of the Anishinaabe.',
      'Controlled burns renewed the oak savanna for generations,',
      'clearing deadwood so that new growth could emerge.',
      'Fire used with ceremony feeds the land.',
      'Fire used carelessly leaves only ash.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-teaching-oak-resilience',
    section:   CodexSection.TEACHINGS,
    title:     'On Oak Resilience',
    tileColor: 0x886622,
    iconKey:   'teaching-oak-resilience',
    lines: [
      'The mitigomizh — the oak — grows slowly but endures.',
      'Its bark is thick enough to survive wildfire.',
      'Its roots run deep enough to find water in drought.',
      'The oak does not flee from hardship.',
      'It stands, and it survives.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-teaching-grief',
    section:   CodexSection.TEACHINGS,
    title:     'On Grief',
    tileColor: 0x556688,
    iconKey:   'teaching-grief',
    lines: [
      'To grieve is not weakness — it is love.',
      'The Anishinaabe carry their losses openly,',
      'because to forget would dishonour those who were lost.',
      'The balance was restored, but the cost was real.',
      'We remember. That is enough.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-teaching-ice-fishing',
    section:   CodexSection.TEACHINGS,
    title:     'On Ice Fishing',
    tileColor: 0x88bbdd,
    iconKey:   'teaching-ice-fishing',
    lines: [
      'When the lakes freeze, the Anishinaabe do not despair.',
      'They cut holes in the ice and wait with patience.',
      'The fish are still there — beneath the surface,',
      'moving slowly in the cold dark water.',
      'Patience feeds the people when urgency cannot.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-teaching-winter-rest',
    section:   CodexSection.TEACHINGS,
    title:     'On Winter Rest',
    tileColor: 0x99aacc,
    iconKey:   'teaching-winter-rest',
    lines: [
      'Biboon — winter — is the season of rest.',
      'The bear sleeps in its den. The trees pull inward.',
      'Even the rivers slow beneath their ice.',
      'Rest is not idleness. It is preparation.',
      'Without winter, spring has nothing to awaken.',
    ],
    reviewed: false,
  },
  {
    id:        'codex-teaching-earth-wound',
    section:   CodexSection.TEACHINGS,
    title:     'On the Wounded Earth',
    tileColor: 0x667799,
    iconKey:   'teaching-earth-wound',
    lines: [
      'The earth carries wounds just as people do.',
      'When the land is cut, when the balance is broken,',
      'the sickness spreads outward like ripples on water.',
      'To heal the wound, you must go to the source.',
      'The land does not ask for vengeance. It asks for care.',
    ],
    reviewed: false,
  },
];

// ── All entries ──────────────────────────────────────────────────────────────

export const ALL_CODEX_ENTRIES: readonly CodexEntryDef[] = [
  ...BEINGS,
  ...PLACES,
  ...COMMANDERS,
  ...TEACHINGS,
];

/** Representative icon texture key for each codex section tab. */
export const CODEX_SECTION_ICONS: Record<CodexSection, string> = {
  [CodexSection.BEINGS]:     'boss-makwa',
  [CodexSection.PLACES]:     'tile-tree',
  [CodexSection.COMMANDERS]: 'portrait-nokomis',
  [CodexSection.TEACHINGS]:  'icon-mystery',
};

/** Ordered sections for display. */
export const CODEX_SECTIONS: readonly CodexSection[] = [
  CodexSection.BEINGS,
  CodexSection.PLACES,
  CodexSection.COMMANDERS,
  CodexSection.TEACHINGS,
];

/** Get entries for a given section. */
export function getCodexEntriesBySection(section: CodexSection): CodexEntryDef[] {
  return ALL_CODEX_ENTRIES.filter(e => e.section === section);
}

/** Look up a single codex entry by ID. */
export function getCodexEntry(id: string): CodexEntryDef | undefined {
  return ALL_CODEX_ENTRIES.find(e => e.id === id);
}
