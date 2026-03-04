/**
 * InventoryManager — persistent gear inventory, equip/unequip, salvage.
 *
 * Singleton. Stores gear in SaveManager under the 'gearInventory' and
 * 'gearEquipped' fields. Max 50 items in inventory.
 *
 * Phaser-free — safe for use in any context.
 */

import type { GearInstance, RuneDef } from '../data/gearDefs';
import {
  getGearDef,
  canEquipOnTower,
  SALVAGE_VALUES,
  ENHANCE_COSTS,
  getNextRarity,
  ALL_GEAR_DEFS,
} from '../data/gearDefs';
import { SaveManager } from './SaveManager';
import type { GearSaveItem } from './SaveManager';
import { Rng } from '../systems/Rng';

const MAX_INVENTORY = 50;

/**
 * Equip map: towerKey → slot index → gear UID.
 * Each tower type has up to 2 gear slots.
 */
export type EquipMap = Record<string, (string | null)[]>;

export class InventoryManager {
  private static _instance: InventoryManager | null = null;

  private inventory: GearInstance[] = [];
  private equipped: EquipMap = {};
  private readonly _rng = new Rng(Date.now());

  private constructor() {
    this._load();
  }

  static getInstance(): InventoryManager {
    if (!InventoryManager._instance) InventoryManager._instance = new InventoryManager();
    return InventoryManager._instance;
  }

  // ── Inventory queries ───────────────────────────────────────────────────────

  getInventory(): readonly GearInstance[] {
    return this.inventory;
  }

  getInventoryCount(): number {
    return this.inventory.length;
  }

  getMaxInventory(): number {
    return MAX_INVENTORY;
  }

  isFull(): boolean {
    return this.inventory.length >= MAX_INVENTORY;
  }

  getItem(uid: string): GearInstance | undefined {
    return this.inventory.find(g => g.uid === uid);
  }

  /** Add a gear item to inventory. Returns false if full. */
  addItem(item: GearInstance): boolean {
    if (this.inventory.length >= MAX_INVENTORY) return false;
    this.inventory.push(item);
    this._save();
    return true;
  }

  /** Add multiple items. Returns items that couldn't fit. */
  addItems(items: GearInstance[]): GearInstance[] {
    const overflow: GearInstance[] = [];
    for (const item of items) {
      if (!this.addItem(item)) {
        overflow.push(item);
      }
    }
    return overflow;
  }

  /** Remove an item from inventory (and unequip if equipped). */
  removeItem(uid: string): boolean {
    const idx = this.inventory.findIndex(g => g.uid === uid);
    if (idx < 0) return false;

    // Unequip if equipped
    this._unequipByUid(uid);

    this.inventory.splice(idx, 1);
    this._save();
    return true;
  }

  /** Mark an item as no longer "new". */
  markSeen(uid: string): void {
    const item = this.getItem(uid);
    if (item && item.isNew) {
      item.isNew = false;
      this._save();
    }
  }

  /** Mark all items as seen. */
  markAllSeen(): void {
    let changed = false;
    for (const item of this.inventory) {
      if (item.isNew) { item.isNew = false; changed = true; }
    }
    if (changed) this._save();
  }

  /** Get count of new (unseen) items. */
  getNewItemCount(): number {
    return this.inventory.filter(g => g.isNew).length;
  }

  // ── Equip / Unequip ─────────────────────────────────────────────────────────

  /** Get equipped gear UIDs for a tower type. Returns [slot0, slot1]. */
  getEquipped(towerKey: string): (string | null)[] {
    return this.equipped[towerKey] ?? [null, null];
  }

  /** Get all equipped gear instances for a tower type. */
  getEquippedInstances(towerKey: string): (GearInstance | undefined)[] {
    const slots = this.getEquipped(towerKey);
    return slots.map(uid => uid ? this.getItem(uid) : undefined);
  }

  /** Get the full equip map. */
  getEquipMap(): Readonly<EquipMap> {
    return this.equipped;
  }

  /** Find the tower slot currently holding a gear item, if any. */
  getEquippedLocation(uid: string): { towerKey: string; slot: number } | null {
    for (const [towerKey, slots] of Object.entries(this.equipped)) {
      for (let slot = 0; slot < slots.length; slot++) {
        if (slots[slot] === uid) {
          return { towerKey, slot };
        }
      }
    }
    return null;
  }

  /**
   * Equip a gear item to a tower slot. Returns true on success.
   * Fails if item doesn't exist, can't fit the tower, or slot is invalid.
   */
  equip(towerKey: string, slot: number, uid: string): boolean {
    if (slot < 0 || slot > 1) return false;

    const item = this.getItem(uid);
    if (!item) return false;

    const def = getGearDef(item.defId);
    if (!def) return false;
    if (!canEquipOnTower(def, towerKey)) return false;

    // Unequip from any previous slot
    this._unequipByUid(uid);

    // Initialize tower slots if needed
    if (!this.equipped[towerKey]) {
      this.equipped[towerKey] = [null, null];
    }

    // Unequip whatever was in this slot
    const prevUid = this.equipped[towerKey][slot];
    if (prevUid) {
      // Previous item goes back to inventory (already there — just clearing slot)
    }

    this.equipped[towerKey][slot] = uid;
    this._save();
    return true;
  }

  /** Unequip a gear item from its current slot. */
  unequip(towerKey: string, slot: number): boolean {
    if (!this.equipped[towerKey]) return false;
    if (slot < 0 || slot > 1) return false;
    if (this.equipped[towerKey][slot] === null) return false;

    this.equipped[towerKey][slot] = null;
    this._save();
    return true;
  }

  /** Check if a specific gear item is equipped anywhere. */
  isEquipped(uid: string): boolean {
    for (const slots of Object.values(this.equipped)) {
      if (slots.includes(uid)) return true;
    }
    return false;
  }

  // ── Salvage ────────────────────────────────────────────────────────────────

  /**
   * Salvage a gear item for crystal shards.
   * Returns the shard value, or 0 if item not found.
   * Removes the item from inventory and unequips if needed.
   */
  salvage(uid: string): number {
    const item = this.getItem(uid);
    if (!item) return 0;

    const def = getGearDef(item.defId);
    if (!def) return 0;

    const value = SALVAGE_VALUES[def.rarity];
    this.removeItem(uid);

    // Add shards as currency
    SaveManager.getInstance().addCurrency(value);
    return value;
  }

  // ── Enhancement ────────────────────────────────────────────────────────────

  /**
   * Enhance a gear item (+1 to +5).
   * Costs crystals based on ENHANCE_COSTS[currentLevel].
   * Returns false if can't afford or already maxed.
   */
  enhance(uid: string): boolean {
    const item = this.getItem(uid);
    if (!item) return false;
    if (item.enhanceLevel >= 5) return false;

    const cost = ENHANCE_COSTS[item.enhanceLevel];
    const save = SaveManager.getInstance();
    if (!save.spendCurrency(cost)) return false;

    item.enhanceLevel += 1;
    this._save();
    return true;
  }

  /** Get the crystal cost for the next enhancement level. Returns -1 if maxed. */
  getEnhanceCost(uid: string): number {
    const item = this.getItem(uid);
    if (!item || item.enhanceLevel >= 5) return -1;
    return ENHANCE_COSTS[item.enhanceLevel];
  }

  // ── Rarity Evolution ───────────────────────────────────────────────────────

  /**
   * Evolve a +5 gear item to the next rarity tier.
   * Requires: enhanceLevel === 5, not already legendary.
   * Cost: 2× the item's current rarity salvage value in crystals.
   * Resets enhanceLevel to 0.
   */
  evolve(uid: string): boolean {
    const item = this.getItem(uid);
    if (!item) return false;
    if (item.enhanceLevel < 5) return false;

    const def = getGearDef(item.defId);
    if (!def) return false;

    const nextRarity = getNextRarity(def.rarity);
    if (!nextRarity) return false;

    const cost = SALVAGE_VALUES[def.rarity] * 2;
    const save = SaveManager.getInstance();
    if (!save.spendCurrency(cost)) return false;

    // Find a gear def of the same type at the next rarity
    const candidates = ALL_GEAR_DEFS
      .filter(d => d.gearType === def.gearType && d.rarity === nextRarity);

    if (candidates.length === 0) return false;

    // Evolve: change defId to next-rarity version, reset enhancement
    const evolved = this._rng.nextItem(candidates);
    item.defId = evolved.id;
    item.enhanceLevel = 0;
    item.rune = undefined; // rune is lost on evolution
    this._save();
    return true;
  }

  // ── Rune Sockets ───────────────────────────────────────────────────────────

  /** Check if a gear item can accept a rune socket (+3 or higher). */
  canSocketRune(uid: string): boolean {
    const item = this.getItem(uid);
    if (!item) return false;
    return item.enhanceLevel >= 3 && !item.rune;
  }

  /** Socket a rune into a gear item. */
  socketRune(uid: string, rune: RuneDef): boolean {
    const item = this.getItem(uid);
    if (!item) return false;
    if (item.enhanceLevel < 3) return false;
    if (item.rune) return false;

    item.rune = rune;
    this._save();
    return true;
  }

  /** Remove a rune from a gear item. Returns the removed rune or undefined. */
  unsocketRune(uid: string): RuneDef | undefined {
    const item = this.getItem(uid);
    if (!item || !item.rune) return undefined;

    const rune = item.rune;
    item.rune = undefined;
    this._save();
    return rune;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /** Remove a gear UID from any equip slot. */
  private _unequipByUid(uid: string): void {
    for (const towerKey of Object.keys(this.equipped)) {
      const slots = this.equipped[towerKey];
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] === uid) {
          slots[i] = null;
        }
      }
    }
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  private _load(): void {
    const save = SaveManager.getInstance();
    const raw = save.getGearData();
    if (raw) {
      // Save data is deserialised from JSON — cast is safe here.
      this.inventory = (raw.inventory ?? []) as GearInstance[];
      this.equipped = raw.equipped ?? {};
    }
  }

  private _save(): void {
    const save = SaveManager.getInstance();
    save.setGearData({
      inventory: this.inventory as GearSaveItem[],
      equipped:  this.equipped,
    });
  }
}
