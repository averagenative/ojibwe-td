/**
 * TASK-084: Gear Icons & Tower Icons for Equipment UI
 *
 * Structural ?raw tests verifying:
 *  - Every GearType has a matching gear icon loaded in BootScene
 *  - InventoryScene shows gear icons in grid cells and detail panel
 *  - TowerEquipScene shows tower icons in cards and gear icons in slots/compat list
 *  - Icon texture key patterns are consistent
 *  - Fallback paths exist when textures are missing
 *  - Detail panel wordWrap adjusts when icon is absent
 */

import { describe, it, expect } from 'vitest';

import bootSceneRaw from '../../scenes/BootScene.ts?raw';
import inventorySceneRaw from '../../scenes/InventoryScene.ts?raw';
import towerEquipSceneRaw from '../../scenes/TowerEquipScene.ts?raw';

import { GearType, GEAR_TYPE_TOWER } from '../../data/gearDefs';
import { ALL_TOWER_DEFS } from '../../data/towerDefs';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract all texture keys loaded via this.load.image('key', ...) in BootScene. */
function bootSceneTextureKeys(): Set<string> {
  const re = /this\.load\.image\(\s*'([^']+)'/g;
  const keys = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(bootSceneRaw)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

/** All GearType string values. */
const ALL_GEAR_TYPES = Object.values(GearType);

// ─────────────────────────────────────────────────────────────────────────────
// 1. BootScene — Gear icon loading
// ─────────────────────────────────────────────────────────────────────────────

describe('BootScene gear icon loading (TASK-084)', () => {
  const textureKeys = bootSceneTextureKeys();

  it('loads a gear icon for every GearType value', () => {
    for (const gearType of ALL_GEAR_TYPES) {
      const expectedKey = `gear-${gearType}`;
      expect(textureKeys.has(expectedKey)).toBe(true);
    }
  });

  it('all gear icon keys follow the gear-{type} naming convention', () => {
    const gearKeys = [...textureKeys].filter(k => k.startsWith('gear-'));
    for (const key of gearKeys) {
      expect(key).toMatch(/^gear-[a-z]+-[a-z]+$/);
    }
  });

  it('loads exactly 8 gear icons (one per gear slot)', () => {
    const gearKeys = [...textureKeys].filter(k => k.startsWith('gear-'));
    expect(gearKeys).toHaveLength(8);
  });

  it('all gear icons are SVG files', () => {
    const gearLoadLines = bootSceneRaw
      .split('\n')
      .filter(l => l.includes("this.load.image('gear-"));
    expect(gearLoadLines.length).toBe(8);
    for (const line of gearLoadLines) {
      expect(line).toContain('.svg');
    }
  });

  it('icon-rock-hurler is loaded as PNG (all tower icons are PNG)', () => {
    const rockHurlerLine = bootSceneRaw
      .split('\n')
      .find(l => l.includes("'icon-rock-hurler'"));
    expect(rockHurlerLine).toBeDefined();
    expect(rockHurlerLine).toContain('.png');
    expect(rockHurlerLine).not.toContain('.svg');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. BootScene — Tower icon loading
// ─────────────────────────────────────────────────────────────────────────────

describe('BootScene tower icon loading (TASK-084)', () => {
  const textureKeys = bootSceneTextureKeys();

  it('loads a tower icon for every tower in ALL_TOWER_DEFS', () => {
    for (const towerDef of ALL_TOWER_DEFS) {
      const expectedKey = `icon-${towerDef.key}`;
      expect(textureKeys.has(expectedKey)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GEAR_TYPE_TOWER mapping completeness
// ─────────────────────────────────────────────────────────────────────────────

describe('GEAR_TYPE_TOWER mapping (TASK-084)', () => {
  it('has an entry for every GearType', () => {
    for (const gearType of ALL_GEAR_TYPES) {
      expect(gearType in GEAR_TYPE_TOWER).toBe(true);
    }
  });

  it('maps to valid tower keys or null', () => {
    const towerKeys = new Set(ALL_TOWER_DEFS.map(d => d.key));
    for (const [, towerKey] of Object.entries(GEAR_TYPE_TOWER)) {
      if (towerKey !== null) {
        expect(towerKeys.has(towerKey)).toBe(true);
      }
    }
  });

  it('universal-charm maps to null', () => {
    expect(GEAR_TYPE_TOWER['universal-charm']).toBeNull();
  });

  it('at least one gear type maps to each tower', () => {
    const towerKeys = new Set(ALL_TOWER_DEFS.map(d => d.key));
    const mappedTowers = new Set(
      Object.values(GEAR_TYPE_TOWER).filter((v): v is string => v !== null),
    );
    for (const tk of towerKeys) {
      expect(mappedTowers.has(tk)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. InventoryScene — gear icon display in grid
// ─────────────────────────────────────────────────────────────────────────────

describe('InventoryScene gear icon grid (TASK-084)', () => {
  const buildGridBody = (): string => {
    const start = inventorySceneRaw.indexOf('private _buildGrid()');
    const end = inventorySceneRaw.indexOf('// ── Detail Panel');
    return inventorySceneRaw.slice(start, end);
  };

  it('constructs gear icon key from def.gearType', () => {
    const body = buildGridBody();
    expect(body).toContain('`gear-${def.gearType}`');
  });

  it('guards gear icon display with textures.exists()', () => {
    const body = buildGridBody();
    expect(body).toContain('this.textures.exists(gearIconKey)');
  });

  it('sets gear icon display size to 28×28', () => {
    const body = buildGridBody();
    expect(body).toContain('.setDisplaySize(28, 28)');
  });

  it('tints gear icon with rarity colour', () => {
    const body = buildGridBody();
    expect(body).toContain('.setTint(rarityCol.num)');
  });

  it('pushes gear icon to gridObjects for cleanup', () => {
    const body = buildGridBody();
    expect(body).toContain('if (gearIcon) this.gridObjects.push(gearIcon)');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. InventoryScene — gear icon display in detail panel
// ─────────────────────────────────────────────────────────────────────────────

describe('InventoryScene gear icon detail panel (TASK-084)', () => {
  const showDetailBody = (): string => {
    const start = inventorySceneRaw.indexOf('private _showDetail(');
    const end = inventorySceneRaw.indexOf('// ── Rune selection');
    return inventorySceneRaw.slice(start, end);
  };

  it('shows a 36×36 gear icon in the detail panel', () => {
    const body = showDetailBody();
    expect(body).toContain('.setDisplaySize(36, 36)');
  });

  it('pushes detail gear icon to detailObjects for cleanup', () => {
    const body = showDetailBody();
    expect(body).toContain('this.detailObjects.push(gearImg)');
  });

  it('adjusts name position when gear icon is present', () => {
    const body = showDetailBody();
    expect(body).toContain('hasDetailGearIcon');
    expect(body).toContain('leftX + iconInset');
  });

  it('adjusts wordWrap width conditionally based on icon presence', () => {
    const body = showDetailBody();
    // wordWrap should subtract iconInset (not hardcoded 42)
    expect(body).toContain('DETAIL_W - DETAIL_X_PAD * 2 - iconInset');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. InventoryScene — tower icon in detail panel
// ─────────────────────────────────────────────────────────────────────────────

describe('InventoryScene tower icon in detail (TASK-084)', () => {
  const showDetailBody = (): string => {
    const start = inventorySceneRaw.indexOf('private _showDetail(');
    const end = inventorySceneRaw.indexOf('// ── Rune selection');
    return inventorySceneRaw.slice(start, end);
  };

  it('constructs tower icon key from GEAR_TYPE_TOWER mapping', () => {
    const body = showDetailBody();
    expect(body).toContain('`icon-${towerKey}`');
  });

  it('guards tower icon with textures.exists()', () => {
    const body = showDetailBody();
    expect(body).toContain('this.textures.exists(towerIconKey)');
  });

  it('displays tower icon at 20×20', () => {
    const body = showDetailBody();
    expect(body).toContain('.setDisplaySize(20, 20)');
  });

  it('offsets text when tower icon is shown', () => {
    const body = showDetailBody();
    expect(body).toContain('towerTextOffsetX = leftX + 24');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. TowerEquipScene — tower icon in cards (replaces color dot)
// ─────────────────────────────────────────────────────────────────────────────

describe('TowerEquipScene tower icon cards (TASK-084)', () => {
  const buildTowerCardsBody = (): string => {
    const start = towerEquipSceneRaw.indexOf('private _buildTowerCards()');
    const end = towerEquipSceneRaw.indexOf('// ── Gear Slots');
    return towerEquipSceneRaw.slice(start, end);
  };

  it('constructs tower icon key from towerDef.key', () => {
    const body = buildTowerCardsBody();
    expect(body).toContain('`icon-${towerDef.key}`');
  });

  it('guards tower icon with textures.exists()', () => {
    const body = buildTowerCardsBody();
    expect(body).toContain('this.textures.exists(towerIconKey)');
  });

  it('displays tower icon at 32×32', () => {
    const body = buildTowerCardsBody();
    expect(body).toContain('.setDisplaySize(32, 32)');
  });

  it('reduces alpha for unselected tower icons', () => {
    const body = buildTowerCardsBody();
    expect(body).toContain('if (!isSelected) tIcon.setAlpha(0.7)');
  });

  it('falls back to color dot when icon is missing', () => {
    const body = buildTowerCardsBody();
    expect(body).toContain('// Fallback color dot if icon missing');
    // The else branch creates a rectangle as fallback
    const elseIdx = body.indexOf('} else {');
    expect(elseIdx).toBeGreaterThan(-1);
    const afterElse = body.slice(elseIdx);
    expect(afterElse).toContain('this.add.rectangle');
  });

  it('pushes tower icon to towerCardObjects for cleanup', () => {
    const body = buildTowerCardsBody();
    expect(body).toContain('this.towerCardObjects.push(tIcon)');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. TowerEquipScene — gear icon in equipped slots
// ─────────────────────────────────────────────────────────────────────────────

describe('TowerEquipScene gear icon in slots (TASK-084)', () => {
  const buildSlotsBody = (): string => {
    const start = towerEquipSceneRaw.indexOf('private _buildSlots()');
    const end = towerEquipSceneRaw.indexOf('// ── Compatible Gear List');
    return towerEquipSceneRaw.slice(start, end);
  };

  it('constructs gear icon key in slot from def.gearType', () => {
    const body = buildSlotsBody();
    expect(body).toContain('`gear-${def!.gearType}`');
  });

  it('guards slot gear icon with textures.exists()', () => {
    const body = buildSlotsBody();
    expect(body).toContain('this.textures.exists(slotGearIconKey)');
  });

  it('displays slot gear icon at 28×28', () => {
    const body = buildSlotsBody();
    expect(body).toContain('.setDisplaySize(28, 28)');
  });

  it('pushes slot gear icon to slotObjects for cleanup', () => {
    const body = buildSlotsBody();
    expect(body).toContain('this.slotObjects.push(gearImg)');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. TowerEquipScene — gear icon in compatible gear list
// ─────────────────────────────────────────────────────────────────────────────

describe('TowerEquipScene gear icon in compat list (TASK-084)', () => {
  const buildCompatListBody = (): string => {
    const start = towerEquipSceneRaw.indexOf('private _buildCompatList()');
    const end = towerEquipSceneRaw.indexOf('// ── Helpers');
    return towerEquipSceneRaw.slice(start, end);
  };

  it('constructs gear icon key in list from def.gearType', () => {
    const body = buildCompatListBody();
    expect(body).toContain('`gear-${def.gearType}`');
  });

  it('computes iconOffset based on whether gear icon exists', () => {
    const body = buildCompatListBody();
    expect(body).toContain('this.textures.exists(listGearIconKey) ? 36 : 0');
  });

  it('displays list gear icon at 26×26', () => {
    const body = buildCompatListBody();
    expect(body).toContain('.setDisplaySize(26, 26)');
  });

  it('offsets name and meta text by iconOffset', () => {
    const body = buildCompatListBody();
    expect(body).toContain('leftX + 10 + iconOffset');
  });

  it('pushes list gear icon to listObjects for cleanup', () => {
    const body = buildCompatListBody();
    expect(body).toContain('this.listObjects.push(gearImg)');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Gear icon key derivation — edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('Gear icon key derivation edge cases (TASK-084)', () => {
  it('GearType values are all non-empty kebab-case strings', () => {
    for (const gearType of ALL_GEAR_TYPES) {
      expect(gearType).toMatch(/^[a-z]+-[a-z]+$/);
    }
  });

  it('gear icon keys are unique across all gear types', () => {
    const keys = ALL_GEAR_TYPES.map(t => `gear-${t}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('no gear type string contains spaces or uppercase', () => {
    for (const gearType of ALL_GEAR_TYPES) {
      expect(gearType).not.toMatch(/[A-Z\s]/);
    }
  });

  it('GearType enum has exactly 8 values', () => {
    expect(ALL_GEAR_TYPES).toHaveLength(8);
  });
});
