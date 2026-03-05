/**
 * Vignette definitions — narrative beats shown between waves.
 *
 * Vignettes are brief text overlays (2–4 lines + optional portrait) that fire
 * at specific game moments. They tell the story of a community defender
 * restoring balance to the land.
 *
 * Adding new vignettes: just add entries to ALL_VIGNETTES below — no code
 * changes required.
 *
 * Phaser-free — safe for unit tests.
 *
 * Elder portrait keys:
 *   Mishoomis: 'elder-mishoomis' | 'elder-mishoomis-proud'
 *   Nokomis:   'elder-nokomis'   | 'elder-nokomis-teaching'
 *   Ogichidaa: 'elder-ogichidaa' | 'elder-ogichidaa-fierce'
 */

// ── Trigger Types ────────────────────────────────────────────────────────────

/**
 * TriggerType — const object + type union (NOT enum) because
 * tsconfig has `erasableSyntaxOnly: true`.
 */
export const TriggerType = {
  WAVE_START:          'WAVE_START',
  WAVE_COMPLETE:       'WAVE_COMPLETE',
  BOSS_KILLED:         'BOSS_KILLED',
  BOSS_ESCAPED:        'BOSS_ESCAPED',
  STAGE_COMPLETE:      'STAGE_COMPLETE',
  COMMANDER_UNLOCKED:  'COMMANDER_UNLOCKED',
  FIRST_PLAY:          'FIRST_PLAY',
} as const;

export type TriggerType = (typeof TriggerType)[keyof typeof TriggerType];

// ── VignetteDef schema ───────────────────────────────────────────────────────

export interface VignetteDef {
  id:           string;
  trigger:      TriggerType;
  /** Wave number (WAVE_START / WAVE_COMPLETE), boss key (BOSS_KILLED / BOSS_ESCAPED). */
  triggerValue?: number | string;
  /** Region ID that gates this vignette — only fires when the player is in this region. */
  regionId?:    string;
  portrait?:    string;
  speaker?:     string;
  /** 2–4 lines of dialogue / narration. */
  lines:        string[];
  /** Codex entry ID to unlock when this vignette is first seen. */
  codexUnlock?: string;
  /** Whether the creator has reviewed this text. */
  reviewed:     boolean;
}

// ── Act 1 — The Arrival (Zaaga'iganing) ─────────────────────────────────────
//
// Framing story: something is disturbing the land. The player defends
// the lake-country village. 4 vignettes across 20 waves.
// Speaker: Mishoomis (Grandfather) — story/land narrator.

const ACT1_VIGNETTES: VignetteDef[] = [
  {
    id:           'act1-arrival',
    trigger:      TriggerType.FIRST_PLAY,
    regionId:     'zaagaiganing',
    speaker:      'Mishoomis',
    portrait:     'elder-mishoomis',
    lines: [
      'The waters of Zaaga\'iganing have always been still.',
      'But something stirs beneath — the fish swim in circles,',
      'the loons call at the wrong hour.',
      'You are needed at the crossing.',
    ],
    codexUnlock:  'codex-place-zaagaiganing',
    reviewed:     false,
  },
  {
    id:           'act1-first-wave',
    trigger:      TriggerType.WAVE_COMPLETE,
    triggerValue: 3,
    regionId:     'zaagaiganing',
    speaker:      'Mishoomis',
    portrait:     'elder-mishoomis',
    lines: [
      'These creatures are not enemies — they are lost.',
      'Something has driven them from their homes.',
      'Defend the village, but do not celebrate their fall.',
    ],
    codexUnlock:  'codex-being-displaced-spirits',
    reviewed:     false,
  },
  {
    id:           'act1-makwa-falls',
    trigger:      TriggerType.BOSS_KILLED,
    triggerValue: 'makwa',
    regionId:     'zaagaiganing',
    speaker:      'Mishoomis',
    portrait:     'elder-mishoomis',
    lines: [
      'Makwa, the great bear, wanders far from the den.',
      'In another season this would be a sacred meeting.',
      'What hunger drives even the bear to desperation?',
    ],
    codexUnlock:  'codex-being-makwa',
    reviewed:     false,
  },
  {
    id:           'act1-stage-end',
    trigger:      TriggerType.STAGE_COMPLETE,
    regionId:     'zaagaiganing',
    speaker:      'Mishoomis',
    portrait:     'elder-mishoomis',
    lines: [
      'The crossing holds — for now.',
      'But the disturbance has not ended. It has moved.',
      'Follow the water south, into the marshes.',
      'The land will tell you where to go.',
    ],
    codexUnlock:  'codex-place-mashkiig',
    reviewed:     false,
  },
];

// ── Act 2 — Into the Mashkiig (Wetlands) ───────────────────────────────────
//
// The disturbance spreads. Boss Waabooz (Hare) is revealed as a displaced
// spirit, not malicious. 4 vignettes.
// Speaker: Scout — field narrator for Act 2 (Mashkiig Marsh).

const ACT2_VIGNETTES: VignetteDef[] = [
  {
    id:           'act2-arrival',
    trigger:      TriggerType.WAVE_START,
    triggerValue: 1,
    regionId:     'mashkiig',
    speaker:      'Scout',
    portrait:     'scout',
    lines: [
      'The marsh path twists and doubles back.',
      'Animals flee in every direction — even the herons have gone silent.',
      'Whatever pushed them from the lake is here too.',
    ],
    codexUnlock:  'codex-teaching-balance',
    reviewed:     false,
  },
  {
    id:           'act2-nokomis-medicine',
    trigger:      TriggerType.WAVE_COMPLETE,
    triggerValue: 5,
    regionId:     'mashkiig',
    speaker:      'Nokomis',
    portrait:     'elder-nokomis-teaching',
    lines: [
      'The wiigwaasi-mitig and mashkikiwaaboo grow thick here.',
      'These medicines have fed and healed our people for generations.',
      'When the land is sick, the medicines remember what we forget.',
    ],
    codexUnlock:  'codex-teaching-medicine',
    reviewed:     false,
  },
  {
    id:           'act2-mid',
    trigger:      TriggerType.WAVE_COMPLETE,
    triggerValue: 8,
    regionId:     'mashkiig',
    speaker:      'Scout',
    portrait:     'scout',
    lines: [
      'The swarm thins, but I saw something larger in the reeds.',
      'A pale shape — fast, darting between the cattails.',
      'It did not attack. It ran.',
    ],
    reviewed:     false,
  },
  {
    id:           'act2-waabooz-falls',
    trigger:      TriggerType.BOSS_KILLED,
    triggerValue: 'waabooz',
    regionId:     'mashkiig',
    speaker:      'Scout',
    portrait:     'scout',
    lines: [
      'Waabooz — the hare spirit — split apart when cornered.',
      'Not in anger, but in fear.',
      'This creature was fleeing something greater than us.',
      'We are not the hunters here.',
    ],
    codexUnlock:  'codex-being-waabooz',
    reviewed:     false,
  },
  {
    id:           'act2-stage-end',
    trigger:      TriggerType.STAGE_COMPLETE,
    regionId:     'mashkiig',
    speaker:      'Scout',
    portrait:     'scout',
    lines: [
      'The marsh grows quiet again — but it feels wrong, not peaceful.',
      'The trail leads west, toward the open savanna.',
      'Something burns on the horizon.',
    ],
    codexUnlock:  'codex-place-mitigomizh',
    reviewed:     false,
  },
];

// ── Act 3 — Savanna Burning (Mitigomizh) ───────────────────────────────────
//
// The source approaches. First encounter with Animikiins (Thunderbird) as
// an omen, not an enemy. 4 vignettes.
// Speaker: Ogichidaa (Warrior Elder) — combat strategy and tower lore.

const ACT3_VIGNETTES: VignetteDef[] = [
  {
    id:           'act3-arrival',
    trigger:      TriggerType.WAVE_START,
    triggerValue: 1,
    regionId:     'mitigomizh',
    speaker:      'Ogichidaa',
    portrait:     'elder-ogichidaa',
    lines: [
      'The oaks are scorched but standing.',
      'Fire has swept through here — not natural fire.',
      'The land itself is fevered.',
    ],
    codexUnlock:  'codex-teaching-fire',
    reviewed:     false,
  },
  {
    id:           'act3-mid',
    trigger:      TriggerType.WAVE_COMPLETE,
    triggerValue: 10,
    regionId:     'mitigomizh',
    speaker:      'Ogichidaa',
    portrait:     'elder-ogichidaa',
    lines: [
      'I saw it — high above the smoke.',
      'Animikiins. The little thunderbird.',
      'It circled three times and flew north.',
      'That is not a threat. That is a warning.',
    ],
    codexUnlock:  'codex-being-animikiins',
    reviewed:     false,
  },
  {
    id:           'act3-migizi-falls',
    trigger:      TriggerType.BOSS_KILLED,
    triggerValue: 'migizi',
    regionId:     'mitigomizh',
    speaker:      'Ogichidaa',
    portrait:     'elder-ogichidaa-fierce',
    lines: [
      'Migizi, the eagle, struck like lightning across open ground.',
      'Even in defeat, the golden feathers catch the light.',
      'The sky mourns what the land has lost.',
    ],
    codexUnlock:  'codex-being-migizi',
    reviewed:     false,
  },
  {
    id:           'act3-controlled-burn',
    trigger:      TriggerType.WAVE_COMPLETE,
    triggerValue: 5,
    regionId:     'mitigomizh',
    speaker:      'Ogichidaa',
    portrait:     'elder-ogichidaa',
    lines: [
      'Our ancestors burned the savanna on purpose.',
      'Ishkode — fire — clears the old so the new can grow.',
      'But fire without ceremony is just destruction.',
      'Remember: the tool is only as wise as the hand that holds it.',
    ],
    codexUnlock:  'codex-teaching-controlled-burns',
    reviewed:     false,
  },
  {
    id:           'act3-oak-resilience',
    trigger:      TriggerType.WAVE_COMPLETE,
    triggerValue: 15,
    regionId:     'mitigomizh',
    speaker:      'Ogichidaa',
    portrait:     'elder-ogichidaa-fierce',
    lines: [
      'Look at the oaks — black with soot, but standing.',
      'Mitigomizh has survived fire a hundred times.',
      'The roots run deeper than the flames can reach.',
      'That is the lesson: hold your ground, and survive.',
    ],
    codexUnlock:  'codex-teaching-oak-resilience',
    reviewed:     false,
  },
  {
    id:           'act3-stage-end',
    trigger:      TriggerType.STAGE_COMPLETE,
    regionId:     'mitigomizh',
    speaker:      'Ogichidaa',
    portrait:     'elder-ogichidaa',
    lines: [
      'The savanna cools. But the source is not here.',
      'North — into the winter lands.',
      'Where the cold began, the balance must be restored.',
    ],
    codexUnlock:  'codex-place-biboon-aki',
    reviewed:     false,
  },
];

// ── Act 4 — Biboon-aki (Winter Lands) ──────────────────────────────────────
//
// Final reckoning. Nature out of balance must be restored, not destroyed.
// Two ending variants: clean run (no life lost) vs lives lost.
// Speaker: Mishoomis (Grandfather) — the journey completes where it began.

const ACT4_VIGNETTES: VignetteDef[] = [
  {
    id:           'act4-arrival',
    trigger:      TriggerType.WAVE_START,
    triggerValue: 1,
    regionId:     'biboon-aki',
    speaker:      'Mishoomis',
    portrait:     'elder-mishoomis',
    lines: [
      'Biboon-aki. The world of winter.',
      'The cold here is not cruelty — it is sleep.',
      'But something has woken too early,',
      'and the land cannot rest.',
    ],
    codexUnlock:  'codex-teaching-seasons',
    reviewed:     false,
  },
  {
    id:           'act4-mid',
    trigger:      TriggerType.WAVE_COMPLETE,
    triggerValue: 10,
    regionId:     'biboon-aki',
    speaker:      'Mishoomis',
    portrait:     'elder-mishoomis',
    lines: [
      'The spirits grow more desperate as we approach the heart.',
      'They are not attacking — they are trying to reach it first.',
      'We must be faster, but we must not be cruel.',
    ],
    reviewed:     false,
  },
  {
    id:           'act4-animikiins-falls',
    trigger:      TriggerType.BOSS_KILLED,
    triggerValue: 'animikiins',
    regionId:     'biboon-aki',
    speaker:      'Mishoomis',
    portrait:     'elder-mishoomis',
    lines: [
      'Animikiins falls — and the sky weeps.',
      'The thunderbird was never the enemy.',
      'It was trying to tell us where the wound is.',
      'Listen to the silence that follows.',
    ],
    codexUnlock:  'codex-teaching-listening',
    reviewed:     false,
  },
  {
    id:           'act4-ending-clean',
    trigger:      TriggerType.STAGE_COMPLETE,
    regionId:     'biboon-aki',
    speaker:      'Mishoomis',
    portrait:     'elder-mishoomis-proud',
    lines: [
      'Not a single life was lost.',
      'The balance is restored — not by force, but by care.',
      'The land remembers those who defend without destroying.',
      'Miigwech. The spirits return home.',
    ],
    codexUnlock:  'codex-teaching-harmony',
    reviewed:     false,
  },
  {
    id:           'act4-ending-bittersweet',
    trigger:      TriggerType.STAGE_COMPLETE,
    regionId:     'biboon-aki',
    speaker:      'Mishoomis',
    portrait:     'elder-mishoomis',
    lines: [
      'The balance is restored, but the cost was real.',
      'Some who defended this land did not return.',
      'The spirits go home carrying grief alongside gratitude.',
      'We will remember. That is enough.',
    ],
    codexUnlock:  'codex-teaching-grief',
    reviewed:     false,
  },
];

// ── All vignettes ────────────────────────────────────────────────────────────

export const ALL_VIGNETTES: readonly VignetteDef[] = [
  ...ACT1_VIGNETTES,
  ...ACT2_VIGNETTES,
  ...ACT3_VIGNETTES,
  ...ACT4_VIGNETTES,
];

/**
 * Look up vignettes by trigger type.
 * Optionally filter by triggerValue and regionId.
 */
export function getVignettesForTrigger(
  trigger:      TriggerType,
  triggerValue?: number | string,
  regionId?:    string,
): VignetteDef[] {
  return ALL_VIGNETTES.filter(v => {
    if (v.trigger !== trigger) return false;
    if (triggerValue !== undefined && v.triggerValue !== undefined && v.triggerValue !== triggerValue) return false;
    if (regionId !== undefined && v.regionId !== undefined && v.regionId !== regionId) return false;
    return true;
  });
}

// ── Elder portrait key constants (Phaser-free, importable by tests) ──────────

/** All elder portrait texture keys loaded in BootScene. */
export const ELDER_PORTRAIT_KEYS = [
  'elder-mishoomis',
  'elder-mishoomis-proud',
  'elder-nokomis',
  'elder-nokomis-teaching',
  'elder-ogichidaa',
  'elder-ogichidaa-fierce',
] as const;

export type ElderPortraitKey = (typeof ELDER_PORTRAIT_KEYS)[number];
