/**
 * Stage and Region definitions — the map/stage expansion framework.
 *
 * A Stage is a playable map variant with its own wave count, path layout,
 * difficulty rating, and tower affinities.
 *
 * A Region groups 1–3 stages by geographical/seasonal theme. Region names
 * are in Ojibwemowin with an English translation provided.
 *
 * Phaser-free — safe for use in any context.
 */

export type TowerType = 'cannon' | 'frost' | 'mortar' | 'poison' | 'tesla' | 'aura';
export type CreepType = 'standard' | 'fast' | 'armored' | 'swarm' | 'boss';
export type SeasonalTheme = 'spring' | 'summer' | 'autumn' | 'winter';
export type StageStatus = 'ready' | 'draft' | 'disabled';

export interface StageDef {
  id:              string;
  regionId:        string;
  name:            string;
  description:     string;
  waveCount:       number;
  /**
   * Key used to load the map JSON (e.g. 'map-01').
   * Resolves to: public/data/maps/<pathFile>.json
   */
  pathFile:        string;
  /** 1 = easiest, 5 = hardest. */
  difficulty:      1 | 2 | 3 | 4 | 5;
  /** Tower types that are advantaged (natural synergy) on this map. */
  towerAffinities: TowerType[];
  /** Meta-currency cost to unlock; 0 = always available. */
  unlockCost:      number;
  /** Unlock node ID in the meta-progression tree. Null = always available. */
  unlockId:        string | null;
  /** Creep types that appear across the stage's wave set. */
  creepRoster:     CreepType[];
  /** Whether this stage has passed the map evaluation rubric. */
  status:          StageStatus;
}

export interface RegionDef {
  id:            string;
  /** Ojibwemowin name. */
  name:          string;
  /** English translation — shown on first display. */
  nameEn:        string;
  seasonalTheme: SeasonalTheme;
  /** Ordered list of stage IDs in this region. */
  stages:        string[];
  /** 1–2 sentence cultural note shown on the region tile. */
  lore:          string;
}

// ── Stage definitions ─────────────────────────────────────────────────────────

export const ALL_STAGES: StageDef[] = [
  // ── Zaaga'iganing (Lake Country) ──────────────────────────────────────────
  {
    id:              'zaagaiganing-01',
    regionId:        'zaagaiganing',
    name:            'Winding Pass',
    description:     'A winding Z-path through the lake country. Natural chokepoints reward single-target and AoE towers alike.',
    waveCount:       20,
    pathFile:        'map-01',
    difficulty:      1,
    towerAffinities: ['cannon', 'frost', 'tesla'],
    unlockCost:      0,
    unlockId:        null,
    creepRoster:     ['standard', 'fast', 'armored', 'boss'],
    status:          'ready',
  },

  // ── Mashkiig (Wetlands) ───────────────────────────────────────────────────
  {
    id:              'mashkiig-01',
    regionId:        'mashkiig',
    name:            'Wetland Crossing',
    description:     'A serpentine marsh crossing. Creeps clump in tight horizontal strips — AoE towers and poison thrive here.',
    waveCount:       20,
    pathFile:        'map-02',
    difficulty:      2,
    towerAffinities: ['mortar', 'poison', 'aura'],
    unlockCost:      300,
    unlockId:        'unlock-map-02', // backward-compat with existing Phase 10 saves
    creepRoster:     ['standard', 'fast', 'armored', 'swarm', 'boss'],
    status:          'ready',
  },

  // ── Mitigomizh (Oak Savanna) ──────────────────────────────────────────────
  {
    id:              'mitigomizh-01',
    regionId:        'mitigomizh',
    name:            'Open Savanna',
    description:     'Broad open ground with few chokepoints. Creeps travel long uninterrupted stretches — wide coverage and AoE are critical.',
    waveCount:       20,
    pathFile:        'map-03',
    difficulty:      3,
    towerAffinities: ['mortar', 'aura', 'tesla'],
    unlockCost:      500,
    unlockId:        'unlock-mitigomizh',
    creepRoster:     ['standard', 'fast', 'armored', 'swarm', 'boss'],
    status:          'ready',
  },

  // ── Biboon-aki (Winter Lands) ─────────────────────────────────────────────
  {
    id:              'biboon-aki-01',
    regionId:        'biboon-aki',
    name:            'Frozen Tundra',
    description:     'Icy terrain with tight serpentine paths. Frost towers gain bonus range; fire-reliant approaches are penalised by the cold.',
    waveCount:       20,
    pathFile:        'map-04',
    difficulty:      4,
    towerAffinities: ['frost', 'cannon', 'tesla'],
    unlockCost:      700,
    unlockId:        'unlock-biboon-aki',
    creepRoster:     ['standard', 'fast', 'armored', 'boss'],
    status:          'ready',
  },
];

// ── Region definitions ────────────────────────────────────────────────────────

export const ALL_REGIONS: RegionDef[] = [
  {
    id:            'zaagaiganing',
    name:          "Zaaga'iganing",
    nameEn:        'Lake Country',
    seasonalTheme: 'summer',
    stages:        ['zaagaiganing-01'],
    lore:          "The shores of Zaaga'iganing have sheltered the Anishinaabe through generations. These lands know how to defend themselves.",
  },
  {
    id:            'mashkiig',
    name:          'Mashkiig',
    nameEn:        'Wetlands',
    seasonalTheme: 'spring',
    stages:        ['mashkiig-01'],
    lore:          'Mashkiig is the domain of medicine plants and hidden pathways. Those who rush through it are swallowed whole.',
  },
  {
    id:            'mitigomizh',
    name:          'Mitigomizh',
    nameEn:        'Oak Savanna',
    seasonalTheme: 'autumn',
    stages:        ['mitigomizh-01'],
    lore:          'Where the oaks stand apart and the grasses run long, creeps pour through wide with nowhere to crowd. Coverage is everything here.',
  },
  {
    id:            'biboon-aki',
    name:          'Biboon-aki',
    nameEn:        'Winter Lands',
    seasonalTheme: 'winter',
    stages:        ['biboon-aki-01'],
    lore:          "In Biboon-aki, the cold is the first weapon. Frost towers are at home here; flame is smothered by the endless white.",
  },
];

// ── Lookup helpers ────────────────────────────────────────────────────────────

export function getStageDef(stageId: string): StageDef | undefined {
  return ALL_STAGES.find(s => s.id === stageId);
}

export function getRegionDef(regionId: string): RegionDef | undefined {
  return ALL_REGIONS.find(r => r.id === regionId);
}

export function getStagesForRegion(regionId: string): StageDef[] {
  return ALL_STAGES.filter(s => s.regionId === regionId);
}

/** Seasonal theme background colours (fill hex). */
export const SEASON_COLORS: Record<SeasonalTheme, number> = {
  summer: 0x0d2a0d,
  spring: 0x0d1f0a,
  autumn: 0x2a1a08,
  winter: 0x0a1a2a,
};

/** Seasonal theme border colours. */
export const SEASON_BORDER_COLORS: Record<SeasonalTheme, number> = {
  summer: 0x336633,
  spring: 0x44aa44,
  autumn: 0xaa6622,
  winter: 0x4488cc,
};
