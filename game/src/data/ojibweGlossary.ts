/**
 * Ojibwe word → English translation glossary.
 *
 * Central source of truth for all Ojibwe language translations
 * used in the game UI (tooltips, nameplates, labels).
 *
 * Sources: Ojibwe People's Dictionary (ojibwe.lib.umn.edu),
 * community consultation.
 */

export const OJIBWE_GLOSSARY: Record<string, string> = {
  // ── Commander names ─────────────────────────────────────────────────────────
  'Nokomis':                    'Grandmother',
  'Bizhiw':                     'Lynx',
  'Animikiikaa':                'Thunder',
  'Makoons':                    'Little Bear',
  'Oshkaabewis':                'Helper / Ceremonial Attendant',
  'Waabizii':                   'Swan',

  // ── Aura names ──────────────────────────────────────────────────────────────
  'Gitigaan':                   'Garden',
  'Giiyosewin':                 'The Hunt',
  'Animiki-bimaadiziwin':       'Thunder Life',
  "Makwa-zoongide'e":           'Bear Courage',
  'Adaawewin':                  'The Trade',
  "Zaagi'idiwin":               'Unconditional Love',

  // ── Ability names ───────────────────────────────────────────────────────────
  'Mashkiki Biindaakoojiigan':  'Medicine Bundle',
  'Wiigiwaam Wiindamaagewin':   "Scout's Eye",
  'Gichi-animikiikaa':          'Great Thunder',
  'Makwa-ojiins':               "Bear's Charge",
  'Giizhibaa-bimosewin':        'Swift Walk',
  'Wiisagenimad':               'Tenderness',

  // ── Elder / speaker names ──────────────────────────────────────────────────
  'Mishoomis':                  'Grandfather',
  'Ogichidaa':                  'Warrior / War Chief',

  // ── Region / place names ───────────────────────────────────────────────────
  "Zaaga'iganing":              'At the Lake',
  'Mashkiig':                   'Marsh / Swamp',
  'Mitigomizh':                 'Oak Tree',
  'Biboon-aki':                 'Winter Land',
  'Niizh-miikana':              'Two Paths',

  // ── Stage / map names ──────────────────────────────────────────────────────
  'Bimaadiziwin':               'The Good Life',
};

/**
 * Look up an English translation for an Ojibwe word.
 * Returns undefined if no translation is found.
 */
export function translateOjibwe(word: string): string | undefined {
  return OJIBWE_GLOSSARY[word];
}
