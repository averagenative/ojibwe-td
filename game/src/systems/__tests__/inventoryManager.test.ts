import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryManager } from '../../meta/InventoryManager';
import { SaveManager } from '../../meta/SaveManager';
import {
  createGearInstance,
  getGearDef,
  ALL_RUNES,
  SALVAGE_VALUES,
  ENHANCE_COSTS,
} from '../../data/gearDefs';

// ── Mock localStorage for SaveManager ────────────────────────────────────────

const mockStorage: Record<string, string> = {};

vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
});

/** Reset singletons between tests. */
function resetSingletons(): void {
  (SaveManager as unknown as { _instance: null })._instance = null;
  (InventoryManager as unknown as { _instance: null })._instance = null;
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('InventoryManager', () => {
  let inv: InventoryManager;
  let save: SaveManager;

  beforeEach(() => {
    resetSingletons();
    save = SaveManager.getInstance();
    inv = InventoryManager.getInstance();
  });

  // ── Add / Remove ─────────────────────────────────────────────────────────

  describe('addItem / removeItem', () => {
    it('adds an item to inventory', () => {
      const item = createGearInstance('barrel-iron-sight');
      expect(inv.addItem(item)).toBe(true);
      expect(inv.getInventoryCount()).toBe(1);
      expect(inv.getItem(item.uid)).toBeDefined();
    });

    it('removes an item from inventory', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      expect(inv.removeItem(item.uid)).toBe(true);
      expect(inv.getInventoryCount()).toBe(0);
      expect(inv.getItem(item.uid)).toBeUndefined();
    });

    it('returns false when removing nonexistent item', () => {
      expect(inv.removeItem('nonexistent-uid')).toBe(false);
    });

    it('enforces max inventory (50)', () => {
      for (let i = 0; i < 50; i++) {
        expect(inv.addItem(createGearInstance('charm-flint'))).toBe(true);
      }
      expect(inv.isFull()).toBe(true);
      expect(inv.addItem(createGearInstance('charm-flint'))).toBe(false);
      expect(inv.getInventoryCount()).toBe(50);
    });

    it('addItems returns overflow when full', () => {
      // Fill to 49
      for (let i = 0; i < 49; i++) {
        inv.addItem(createGearInstance('charm-flint'));
      }

      const items = [
        createGearInstance('barrel-iron-sight'),
        createGearInstance('barrel-long-range'),
        createGearInstance('barrel-rapid-loader'),
      ];
      const overflow = inv.addItems(items);

      expect(inv.getInventoryCount()).toBe(50);
      expect(overflow).toHaveLength(2);
      expect(overflow[0].defId).toBe('barrel-long-range');
      expect(overflow[1].defId).toBe('barrel-rapid-loader');
    });
  });

  // ── New item tracking ───────────────────────────────────────────────────

  describe('new item tracking', () => {
    it('new items have isNew flag', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      expect(inv.getNewItemCount()).toBe(1);
    });

    it('markSeen clears isNew on specific item', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      inv.markSeen(item.uid);
      expect(inv.getNewItemCount()).toBe(0);
      expect(inv.getItem(item.uid)?.isNew).toBe(false);
    });

    it('markAllSeen clears isNew on all items', () => {
      inv.addItem(createGearInstance('barrel-iron-sight'));
      inv.addItem(createGearInstance('charm-flint'));
      expect(inv.getNewItemCount()).toBe(2);
      inv.markAllSeen();
      expect(inv.getNewItemCount()).toBe(0);
    });

    it('markSeen is a no-op for nonexistent item', () => {
      inv.markSeen('nonexistent');
      expect(inv.getNewItemCount()).toBe(0);
    });
  });

  // ── Equip / Unequip ───────────────────────────────────────────────────

  describe('equip / unequip', () => {
    it('equips a compatible item to a tower slot', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);

      expect(inv.equip('rock-hurler', 0, item.uid)).toBe(true);
      expect(inv.getEquipped('rock-hurler')[0]).toBe(item.uid);
      expect(inv.isEquipped(item.uid)).toBe(true);
    });

    it('equips a universal charm to any tower', () => {
      const item = createGearInstance('charm-flint');
      inv.addItem(item);
      expect(inv.equip('frost', 0, item.uid)).toBe(true);
      expect(inv.getEquipped('frost')[0]).toBe(item.uid);
    });

    it('rejects equipping barrel-mod on frost tower', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      expect(inv.equip('frost', 0, item.uid)).toBe(false);
      expect(inv.isEquipped(item.uid)).toBe(false);
    });

    it('rejects invalid slot numbers', () => {
      const item = createGearInstance('charm-flint');
      inv.addItem(item);
      expect(inv.equip('rock-hurler', -1, item.uid)).toBe(false);
      expect(inv.equip('rock-hurler', 2, item.uid)).toBe(false);
    });

    it('rejects equipping nonexistent item', () => {
      expect(inv.equip('rock-hurler', 0, 'nonexistent')).toBe(false);
    });

    it('unequip clears the slot', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      inv.equip('rock-hurler', 0, item.uid);

      expect(inv.unequip('rock-hurler', 0)).toBe(true);
      expect(inv.getEquipped('rock-hurler')[0]).toBeNull();
      expect(inv.isEquipped(item.uid)).toBe(false);
    });

    it('unequip returns false for empty slot', () => {
      expect(inv.unequip('rock-hurler', 0)).toBe(false);
    });

    it('unequip returns false for invalid slot', () => {
      expect(inv.unequip('rock-hurler', -1)).toBe(false);
      expect(inv.unequip('rock-hurler', 2)).toBe(false);
    });

    it('re-equipping moves item from previous slot', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      inv.equip('rock-hurler', 0, item.uid);
      inv.equip('rock-hurler', 1, item.uid);

      expect(inv.getEquipped('rock-hurler')[0]).toBeNull();
      expect(inv.getEquipped('rock-hurler')[1]).toBe(item.uid);
    });

    it('removeItem also unequips', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      inv.equip('rock-hurler', 0, item.uid);

      inv.removeItem(item.uid);
      expect(inv.getEquipped('rock-hurler')[0]).toBeNull();
      expect(inv.isEquipped(item.uid)).toBe(false);
    });

    it('getEquippedInstances returns gear data', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      inv.equip('rock-hurler', 0, item.uid);

      const instances = inv.getEquippedInstances('rock-hurler');
      expect(instances[0]?.defId).toBe('barrel-iron-sight');
      expect(instances[1]).toBeUndefined();
    });

    it('getEquipMap returns full map', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      inv.equip('rock-hurler', 0, item.uid);

      const map = inv.getEquipMap();
      expect(map['rock-hurler'][0]).toBe(item.uid);
    });

    it('getEquippedLocation returns the owning tower and slot', () => {
      const item = createGearInstance('charm-flint');
      inv.addItem(item);
      inv.equip('frost', 1, item.uid);

      expect(inv.getEquippedLocation(item.uid)).toEqual({ towerKey: 'frost', slot: 1 });
    });

    it('getEquippedLocation returns null for unequipped items', () => {
      const item = createGearInstance('charm-flint');
      inv.addItem(item);

      expect(inv.getEquippedLocation(item.uid)).toBeNull();
    });
  });

  // ── Salvage ──────────────────────────────────────────────────────────────

  describe('salvage', () => {
    it('salvages an item for correct crystal value', () => {
      const item = createGearInstance('barrel-iron-sight'); // common
      inv.addItem(item);
      const prevCurrency = save.getCurrency();

      const value = inv.salvage(item.uid);

      expect(value).toBe(SALVAGE_VALUES.common);
      expect(inv.getInventoryCount()).toBe(0);
      expect(save.getCurrency()).toBe(prevCurrency + SALVAGE_VALUES.common);
    });

    it('salvaging an equipped item also unequips it', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      inv.equip('rock-hurler', 0, item.uid);

      inv.salvage(item.uid);
      expect(inv.getEquipped('rock-hurler')[0]).toBeNull();
    });

    it('returns 0 for nonexistent item', () => {
      expect(inv.salvage('nonexistent')).toBe(0);
    });

    it('salvage value scales with rarity', () => {
      // Frozen Lakebed Barrel is rare
      const rareItem = createGearInstance('barrel-frozen-lakebed');
      inv.addItem(rareItem);

      const value = inv.salvage(rareItem.uid);
      expect(value).toBe(SALVAGE_VALUES.rare);
    });
  });

  // ── Enhancement ──────────────────────────────────────────────────────────

  describe('enhance', () => {
    it('enhances item from +0 to +1', () => {
      save.addCurrency(1000);
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);

      expect(inv.enhance(item.uid)).toBe(true);
      expect(inv.getItem(item.uid)?.enhanceLevel).toBe(1);
    });

    it('deducts correct crystal cost', () => {
      save.addCurrency(1000);
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      const before = save.getCurrency();

      inv.enhance(item.uid);
      expect(save.getCurrency()).toBe(before - ENHANCE_COSTS[0]);
    });

    it('fails when cannot afford', () => {
      // No currency added
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);

      expect(inv.enhance(item.uid)).toBe(false);
      expect(inv.getItem(item.uid)?.enhanceLevel).toBe(0);
    });

    it('fails when already at +5', () => {
      save.addCurrency(10000);
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);

      // Enhance to +5
      for (let i = 0; i < 5; i++) inv.enhance(item.uid);
      expect(inv.getItem(item.uid)?.enhanceLevel).toBe(5);

      // Try +6 — should fail
      expect(inv.enhance(item.uid)).toBe(false);
      expect(inv.getItem(item.uid)?.enhanceLevel).toBe(5);
    });

    it('getEnhanceCost returns correct cost for each level', () => {
      save.addCurrency(10000);
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);

      for (let i = 0; i < 5; i++) {
        expect(inv.getEnhanceCost(item.uid)).toBe(ENHANCE_COSTS[i]);
        inv.enhance(item.uid);
      }
      // Maxed — returns -1
      expect(inv.getEnhanceCost(item.uid)).toBe(-1);
    });

    it('returns -1 for nonexistent item', () => {
      expect(inv.getEnhanceCost('nonexistent')).toBe(-1);
    });

    it('fails for nonexistent item', () => {
      expect(inv.enhance('nonexistent')).toBe(false);
    });
  });

  // ── Rarity Evolution ─────────────────────────────────────────────────────

  describe('evolve', () => {
    it('evolves a +5 item to next rarity', () => {
      save.addCurrency(10000);
      const item = createGearInstance('barrel-iron-sight'); // common
      inv.addItem(item);

      // Enhance to +5
      for (let i = 0; i < 5; i++) inv.enhance(item.uid);

      expect(inv.evolve(item.uid)).toBe(true);

      const evolved = inv.getItem(item.uid)!;
      const evolvedDef = getGearDef(evolved.defId);
      // Should be uncommon barrel-mod now
      expect(evolvedDef?.gearType).toBe('barrel-mod');
      expect(evolved.enhanceLevel).toBe(0); // reset
    });

    it('fails if not at +5', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      expect(inv.evolve(item.uid)).toBe(false);
    });

    it('fails for legendary items', () => {
      save.addCurrency(50000);
      const item = createGearInstance('barrel-makwas-claw'); // legendary
      inv.addItem(item);
      // Force enhance to +5 (manually set since it's expensive)
      const inst = inv.getItem(item.uid)!;
      inst.enhanceLevel = 5;

      expect(inv.evolve(item.uid)).toBe(false);
    });

    it('fails for nonexistent item', () => {
      expect(inv.evolve('nonexistent')).toBe(false);
    });

    it('clears rune on evolution', () => {
      save.addCurrency(50000);
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);

      // Force to +5 and add rune
      const inst = inv.getItem(item.uid)!;
      inst.enhanceLevel = 5;
      inv.socketRune(item.uid, ALL_RUNES[0]);

      inv.evolve(item.uid);
      const evolved = inv.getItem(item.uid)!;
      expect(evolved.rune).toBeUndefined();
    });
  });

  // ── Rune Sockets ──────────────────────────────────────────────────────────

  describe('rune sockets', () => {
    it('canSocketRune returns true for +3 item without rune', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      const inst = inv.getItem(item.uid)!;
      inst.enhanceLevel = 3;

      expect(inv.canSocketRune(item.uid)).toBe(true);
    });

    it('canSocketRune returns false for +2 item', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      const inst = inv.getItem(item.uid)!;
      inst.enhanceLevel = 2;

      expect(inv.canSocketRune(item.uid)).toBe(false);
    });

    it('canSocketRune returns false when rune already socketed', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      const inst = inv.getItem(item.uid)!;
      inst.enhanceLevel = 3;

      inv.socketRune(item.uid, ALL_RUNES[0]);
      expect(inv.canSocketRune(item.uid)).toBe(false);
    });

    it('socketRune inserts rune into item', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      const inst = inv.getItem(item.uid)!;
      inst.enhanceLevel = 3;

      const rune = ALL_RUNES[0];
      expect(inv.socketRune(item.uid, rune)).toBe(true);
      expect(inv.getItem(item.uid)?.rune?.id).toBe(rune.id);
    });

    it('socketRune fails if below +3', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);

      expect(inv.socketRune(item.uid, ALL_RUNES[0])).toBe(false);
    });

    it('socketRune fails if rune already present', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      const inst = inv.getItem(item.uid)!;
      inst.enhanceLevel = 3;

      inv.socketRune(item.uid, ALL_RUNES[0]);
      expect(inv.socketRune(item.uid, ALL_RUNES[1])).toBe(false);
    });

    it('unsocketRune removes and returns the rune', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      const inst = inv.getItem(item.uid)!;
      inst.enhanceLevel = 3;

      const rune = ALL_RUNES[0];
      inv.socketRune(item.uid, rune);

      const removed = inv.unsocketRune(item.uid);
      expect(removed?.id).toBe(rune.id);
      expect(inv.getItem(item.uid)?.rune).toBeUndefined();
    });

    it('unsocketRune returns undefined if no rune', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      expect(inv.unsocketRune(item.uid)).toBeUndefined();
    });

    it('canSocketRune returns false for nonexistent item', () => {
      expect(inv.canSocketRune('nonexistent')).toBe(false);
    });
  });

  // ── Persistence ───────────────────────────────────────────────────────────

  describe('persistence', () => {
    it('inventory survives singleton reset', () => {
      const item = createGearInstance('barrel-iron-sight');
      inv.addItem(item);
      inv.equip('rock-hurler', 0, item.uid);

      // Reset singleton — reload from storage
      (InventoryManager as unknown as { _instance: null })._instance = null;
      const inv2 = InventoryManager.getInstance();

      expect(inv2.getInventoryCount()).toBe(1);
      expect(inv2.getItem(item.uid)).toBeDefined();
      expect(inv2.getEquipped('rock-hurler')[0]).toBe(item.uid);
    });
  });
});

// ── SaveManager commander XP ──────────────────────────────────────────────────

describe('SaveManager commander XP', () => {
  beforeEach(() => {
    (SaveManager as unknown as { _instance: null })._instance = null;
    (InventoryManager as unknown as { _instance: null })._instance = null;
    for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  });

  it('addCommanderXp accumulates XP', () => {
    const save = SaveManager.getInstance();
    save.addCommanderXp('nokomis', 100);
    save.addCommanderXp('nokomis', 50);
    expect(save.getCommanderXp('nokomis')).toBe(150);
  });

  it('addCommanderXp ignores non-positive values', () => {
    const save = SaveManager.getInstance();
    save.addCommanderXp('nokomis', 0);
    save.addCommanderXp('nokomis', -10);
    expect(save.getCommanderXp('nokomis')).toBe(0);
  });

  it('getCommanderXp returns 0 for unknown commander', () => {
    const save = SaveManager.getInstance();
    expect(save.getCommanderXp('unknown')).toBe(0);
  });

  it('setCommanderEnhancement sets and gets slot', () => {
    const save = SaveManager.getInstance();
    save.setCommanderEnhancement('nokomis', 0, 'enh-war-paint');
    expect(save.getCommanderEnhancements('nokomis')[0]).toBe('enh-war-paint');
    expect(save.getCommanderEnhancements('nokomis')[1]).toBeNull();
  });

  it('setCommanderEnhancement ignores invalid slot', () => {
    const save = SaveManager.getInstance();
    save.setCommanderEnhancement('nokomis', 3, 'enh-war-paint');
    save.setCommanderEnhancement('nokomis', -1, 'enh-war-paint');
    expect(save.getCommanderEnhancements('nokomis')).toEqual([null, null, null]);
  });

  it('getChallengeWeek returns empty string by default', () => {
    const save = SaveManager.getInstance();
    expect(save.getChallengeWeek()).toBe('');
  });

  it('setChallengeWeek persists', () => {
    const save = SaveManager.getInstance();
    save.setChallengeWeek('challenge-makwas-den');
    expect(save.getChallengeWeek()).toBe('challenge-makwas-den');
  });
});
