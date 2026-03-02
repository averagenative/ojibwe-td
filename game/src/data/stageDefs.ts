/**
 * Stage and Region definitions for the map framework.
 *
 * Organises maps into named regions (territories of Ojibwe homelands /
 * seasonal landscapes) each with 1–3 stage variants.
 *
 * Phaser-free — safe for use in unit tests and Node.js scripts.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** Tower type keys used in towerAffinities. */
export type TowerKey = 'cannon' | 'frost' | 'mortar' | 'poison' | 'tesla' | 'aura';

/** Creep type keys used in creepRoster. */
export type CreepTypeKey = 'grunt' | 'runner' | 'brute' | 'swarm' | 'scout' | 'flier';

/** Seasonal theme affecting visual palette. */
export type SeasonalTheme = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * A single playable stage — one map / wave set variant within a region.
 *
 * A stage references a `pathFile` (the map JSON) and declares the number of
 * waves, its difficulty rating, which tower types are advantaged, and which
 * creep types appear.
 */
export interface StageDef {
  id:              string;
  regionId:        string;
  name:            string;
  description:     string;
  /** Number of waves in this stage's run. */
  waveCount:       number;
  /**
   * Base filename of the map JSON (e.g. 'map-01' → loads data/maps/map-01.json).
   * Stored without the .json extension.
   */
  pathFile:        string;
  /** Difficulty rating 1–5. */
  difficulty:      1 | 2 | 3 | 4 | 5;
  /** Tower types that have a meaningful advantage on this map. */
  towerAffinities: TowerKey[];
  /** Unlock node ID, or null if always accessible. */
  unlockId:        string | null;
  /** Crystal cost to unlock (0 if always accessible). */
  unlockCost:      number;
  /** Creep types that appear in this stage's waves. */
  creepRoster:     CreepTypeKey[];
}

/** A named region containing 1–3 stages. */
export interface RegionDef {
  id:            string;
  name:          string;
  /** Ojibwe name with English translation for first display. */
  displayName:   string;
  seasonalTheme: SeasonalTheme;
  /** Ordered list of stage IDs belonging to this region. */
  stages:        string[];
  /** 1–2 sentence cultural note (shown on region card). */
  lore:          string;
}

// ── Stage definitions ─────────────────────────────────────────────────────────

export const ALL_STAGES: StageDef[] = [
  {
    id:              'zaagaiganing-01',
    regionId:        'zaagaiganing',
    name:            'Winding Pass',
    description:     'A Z-shaped path through open lake country. Balanced for all tower types.',
    waveCount:       20,
    pathFile:        'map-01',
    difficulty:      2,
    towerAffinities: ['cannon', 'frost', 'tesla'],
    unlockId:        null,
    unlockCost:      0,
    creepRoster:     ['grunt', 'runner', 'brute', 'swarm', 'scout', 'flier'],
  },
  {
    id:              'mashkiig-01',
    regionId:        'mashkiig',
    name:            'Wetland Crossing',
    description:     'A serpentine marsh path that rewards AoE coverage and terrain denial.',
    waveCount:       20,
    pathFile:        'map-02',
    difficulty:      3,
    towerAffinities: ['mortar', 'poison', 'aura'],
    unlockId:        'unlock-map-02',
    unlockCost:      300,
    creepRoster:     ['grunt', 'runner', 'brute', 'swarm', 'scout', 'flier'],
  },
  {
    id:              'mitigomizh-01',
    regionId:        'mitigomizh',
    name:            'Oak Savanna Run',
    description:     'Open savanna with few chokepoints. Heavy AoE pressure required to hold the line.',
    waveCount:       20,
    pathFile:        'map-03',
    difficulty:      4,
    towerAffinities: ['mortar', 'tesla', 'cannon'],
    unlockId:        'unlock-stage-mitigomizh-01',
    unlockCost:      500,
    creepRoster:     ['grunt', 'runner', 'brute', 'swarm', 'scout', 'flier'],
  },
  {
    id:              'biboon-aki-01',
    regionId:        'biboon-aki',
    name:            'Frozen Crossing',
    description:     'Winter lands where frost towers are amplified — but creeps move with desperate speed.',
    waveCount:       20,
    pathFile:        'map-04',
    difficulty:      5,
    towerAffinities: ['frost', 'poison', 'tesla'],
    unlockId:        'unlock-stage-biboon-aki-01',
    unlockCost:      700,
    creepRoster:     ['grunt', 'runner', 'brute', 'swarm', 'scout', 'flier'],
  },
];

// ── Region definitions ────────────────────────────────────────────────────────

export const ALL_REGIONS: RegionDef[] = [
  {
    id:            'zaagaiganing',
    name:          'Zaaga\'iganing',
    displayName:   'Zaaga\'iganing (Lake Country)',
    seasonalTheme: 'summer',
    stages:        ['zaagaiganing-01'],
    lore:          'The shimmering lake shores of Zaaga\'iganing have long been a gathering place of peoples. Defend the crossing before the waters rise.',
  },
  {
    id:            'mashkiig',
    name:          'Mashkiig',
    displayName:   'Mashkiig (Wetlands)',
    seasonalTheme: 'spring',
    stages:        ['mashkiig-01'],
    lore:          'Mashkiig — the marsh — is a place of abundant life and hidden danger. The twisting waterways slow invaders and reward patient defenders.',
  },
  {
    id:            'mitigomizh',
    name:          'Mitigomizh',
    displayName:   'Mitigomizh (Oak Savanna)',
    seasonalTheme: 'autumn',
    stages:        ['mitigomizh-01'],
    lore:          'Mitigomizh, the oak savanna, stretches wide and open. Without natural cover, defenders must rely on raw firepower to hold every stretch of ground.',
  },
  {
    id:            'biboon-aki',
    name:          'Biboon-aki',
    displayName:   'Biboon-aki (Winter Lands)',
    seasonalTheme: 'winter',
    stages:        ['biboon-aki-01'],
    lore:          'In Biboon-aki the world grows still and cold grants frost towers unnatural power — yet the same cold drives the enemy to advance with desperate urgency.',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Look up a stage definition by its ID. */
export function getStageDef(stageId: string): StageDef | undefined {
  return ALL_STAGES.find(s => s.id === stageId);
}

/** Look up a region definition by its ID. */
export function getRegionDef(regionId: string): RegionDef | undefined {
  return ALL_REGIONS.find(r => r.id === regionId);
}

/** Find the first stage that uses a given pathFile (for backward-compat mapId lookups). */
export function getStageByPathFile(pathFile: string): StageDef | undefined {
  return ALL_STAGES.find(s => s.pathFile === pathFile);
}

/**
 * Colour palette for each seasonal theme.
 * Used to tint region tiles in the map-selection UI.
 */
export const SEASON_PALETTE: Readonly<Record<SeasonalTheme, {
  bg:     number;
  border: number;
  text:   string;
  dim:    number;
}>> = {
  summer: { bg: 0x0a1810, border: 0x2a9a7a, text: '#5ac8a0', dim: 0x061008 },
  spring: { bg: 0x071520, border: 0x1188bb, text: '#44bbdd', dim: 0x030a10 },
  autumn: { bg: 0x1f1005, border: 0xbb6600, text: '#ee9922', dim: 0x100800 },
  winter: { bg: 0x101824, border: 0x8899aa, text: '#c8d8e8', dim: 0x0a1018 },
};
