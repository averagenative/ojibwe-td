/**
 * TowerEquipScene — equip gear onto tower types.
 *
 * Shows 6 tower type cards. Clicking one reveals its 2 gear slots and a list
 * of compatible gear from inventory. Click gear in the list to equip; click
 * an equipped item to unequip.
 *
 * Accepts optional `returnTo` in scene data (defaults to MetaMenuScene).
 */

import Phaser from 'phaser';
import { InventoryManager } from '../meta/InventoryManager';
import { getGearDef, RARITY_COLORS, canEquipOnTower, GEAR_TYPE_TOWER } from '../data/gearDefs';
import { ALL_TOWER_DEFS } from '../data/towerDefs';

import { PAL } from '../ui/palette';

// ── Layout constants ──────────────────────────────────────────────────────────

const TOWER_CARD_W   = 140;
const TOWER_CARD_H   = 80;
const TOWER_CARD_GAP = 18;

const SLOT_W         = 240;
const SLOT_H         = 60;
const SLOT_GAP       = 12;

const COMPAT_ITEM_W  = 500;
const COMPAT_ITEM_H  = 44;
const COMPAT_GAP     = 6;

const SECTION_LEFT   = 80;

// Tower body colours for card accents
const TOWER_COLORS: Record<string, number> = {
  'rock-hurler': 0x886644,
  frost:         0x3366aa,
  poison:        0x338844,
  tesla:         0xbbaa22,
  aura:          0xbb9922,
  arrow:         0x8b6b3d,
};

interface TowerEquipSceneData {
  returnTo?:  string;
  selectUid?: string;   // pre-select a gear item for equipping
}

export class TowerEquipScene extends Phaser.Scene {
  private inv!: InventoryManager;

  private selectedTower: string | null = null;
  private returnTo = 'MetaMenuScene';
  private selectUid: string | null = null;

  private towerCardObjects: Phaser.GameObjects.GameObject[] = [];
  private slotObjects: Phaser.GameObjects.GameObject[] = [];
  private listObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'TowerEquipScene' });
  }

  init(data?: TowerEquipSceneData): void {
    this.returnTo = data?.returnTo ?? 'MetaMenuScene';
    this.selectUid = data?.selectUid ?? null;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.inv = InventoryManager.getInstance();

    // Reset state
    this.selectedTower = null;

    // Background
    this.add.rectangle(cx, height / 2, width, height, PAL.bgDark);

    // Title
    this.add.text(cx, 30, 'EQUIP GEAR', {
      fontSize:   '30px',
      color:      PAL.accentGreen,
      fontFamily: PAL.fontTitle,
      fontStyle:  'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(cx, 62, 'Select a tower type, then equip gear to its slots', {
      fontSize:   '12px',
      color:      PAL.textDim,
      fontFamily: PAL.fontBody,
      fontStyle:  'italic',
    }).setOrigin(0.5);

    // Tower type cards
    this._buildTowerCards();

    // If a gear uid was pre-selected, try to auto-select the matching tower
    if (this.selectUid) {
      const item = this.inv.getItem(this.selectUid);
      if (item) {
        const def = getGearDef(item.defId);
        if (def) {
          const towerKey = GEAR_TYPE_TOWER[def.gearType];
          if (towerKey) {
            this.selectedTower = towerKey;
          } else {
            // Universal — default to cannon
            this.selectedTower = 'cannon';
          }
          this._buildTowerCards();
          this._buildSlots();
          this._buildCompatList();
        }
      }
    }

    // BACK button
    this._makeButton(cx, height - 40, 'BACK', () => {
      this.scene.start(this.returnTo);
    });
  }

  // ── Tower Cards ─────────────────────────────────────────────────────────────

  private _buildTowerCards(): void {
    for (const obj of this.towerCardObjects) obj.destroy();
    this.towerCardObjects = [];

    const { width } = this.scale;
    const totalW = ALL_TOWER_DEFS.length * TOWER_CARD_W + (ALL_TOWER_DEFS.length - 1) * TOWER_CARD_GAP;
    const startX = (width - totalW) / 2 + TOWER_CARD_W / 2;
    const y = 110;

    for (let i = 0; i < ALL_TOWER_DEFS.length; i++) {
      const towerDef = ALL_TOWER_DEFS[i];
      const x = startX + i * (TOWER_CARD_W + TOWER_CARD_GAP);
      const isSelected = towerDef.key === this.selectedTower;

      const tColor = TOWER_COLORS[towerDef.key] ?? PAL.borderInactive;
      const bgColor = isSelected ? PAL.bgCard : PAL.bgPanel;
      const borderCol = isSelected ? tColor : PAL.borderInactive;

      const bg = this.add.rectangle(x, y, TOWER_CARD_W, TOWER_CARD_H, bgColor)
        .setStrokeStyle(isSelected ? 3 : 2, borderCol)
        .setInteractive({ useHandCursor: true });

      // Tower color dot
      const dot = this.add.rectangle(x, y - 16, 14, 14, tColor)
        .setStrokeStyle(1, 0x000000);

      // Tower name
      const nameText = this.add.text(x, y + 8, towerDef.name, {
        fontSize:   '14px',
        color:      isSelected ? PAL.textPrimary : PAL.textMuted,
        fontFamily: PAL.fontBody,
        fontStyle:  isSelected ? 'bold' : 'normal',
      }).setOrigin(0.5);

      // Equipped count
      const equipped = this.inv.getEquipped(towerDef.key);
      const equippedCount = equipped.filter(uid => uid !== null).length;
      const countText = this.add.text(x, y + 26, `${equippedCount}/2 equipped`, {
        fontSize:   '10px',
        color:      equippedCount > 0 ? PAL.textSecondary : PAL.textDim,
        fontFamily: PAL.fontBody,
      }).setOrigin(0.5);

      bg.on('pointerover', () => { if (!isSelected) bg.setFillStyle(PAL.bgCardHover); });
      bg.on('pointerout',  () => { if (!isSelected) bg.setFillStyle(bgColor); });
      bg.on('pointerup', () => {
        this.selectedTower = towerDef.key;
        this._buildTowerCards();
        this._buildSlots();
        this._buildCompatList();
      });

      this.towerCardObjects.push(bg, dot, nameText, countText);
    }
  }

  // ── Gear Slots ──────────────────────────────────────────────────────────────

  private _buildSlots(): void {
    for (const obj of this.slotObjects) obj.destroy();
    this.slotObjects = [];

    if (!this.selectedTower) return;

    const y = 180;
    const leftX = SECTION_LEFT;

    // Section label
    const label = this.add.text(leftX, y, `${this.selectedTower.charAt(0).toUpperCase() + this.selectedTower.slice(1)} Gear Slots`, {
      fontSize:   '16px',
      color:      PAL.textPrimary,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    });
    this.slotObjects.push(label);

    const slots = this.inv.getEquipped(this.selectedTower);

    for (let s = 0; s < 2; s++) {
      const slotY = y + 30 + s * (SLOT_H + SLOT_GAP);
      const uid = slots[s];
      const item = uid ? this.inv.getItem(uid) : undefined;
      const def = item ? getGearDef(item.defId) : undefined;

      const isEmpty = !item || !def;
      const borderColor = !isEmpty ? RARITY_COLORS[def!.rarity].num : PAL.borderInactive;
      const bgColor = !isEmpty ? PAL.bgCard : PAL.bgPanel;

      const slotBg = this.add.rectangle(
        leftX + SLOT_W / 2, slotY + SLOT_H / 2, SLOT_W, SLOT_H, bgColor,
      ).setStrokeStyle(2, borderColor)
       .setInteractive({ useHandCursor: true });

      // Slot label
      const slotLabel = this.add.text(leftX + 8, slotY + 4, `Slot ${s + 1}`, {
        fontSize:   '10px',
        color:      PAL.textDim,
        fontFamily: PAL.fontBody,
      });

      let itemName: Phaser.GameObjects.Text;
      if (!isEmpty) {
        const enhStr = item!.enhanceLevel > 0 ? ` +${item!.enhanceLevel}` : '';
        itemName = this.add.text(leftX + 8, slotY + 20, `${def!.name}${enhStr}`, {
          fontSize:   '13px',
          color:      RARITY_COLORS[def!.rarity].hex,
          fontFamily: PAL.fontBody,
          fontStyle:  'bold',
        });

        // Rarity label
        const rarLabel = def!.rarity.charAt(0).toUpperCase() + def!.rarity.slice(1);
        const rarText = this.add.text(leftX + 8, slotY + 38, rarLabel, {
          fontSize:   '10px',
          color:      RARITY_COLORS[def!.rarity].hex,
          fontFamily: PAL.fontBody,
        });
        this.slotObjects.push(rarText);

        // Click to unequip
        slotBg.on('pointerover', () => slotBg.setFillStyle(PAL.bgCardHover));
        slotBg.on('pointerout',  () => slotBg.setFillStyle(bgColor));
        slotBg.on('pointerup', () => {
          this.inv.unequip(this.selectedTower!, s);
          this._buildSlots();
          this._buildCompatList();
          this._buildTowerCards();
        });

        // Unequip hint
        const hint = this.add.text(leftX + SLOT_W - 12, slotY + SLOT_H / 2, 'Click to unequip', {
          fontSize:   '9px',
          color:      PAL.textDim,
          fontFamily: PAL.fontBody,
          fontStyle:  'italic',
        }).setOrigin(1, 0.5);
        this.slotObjects.push(hint);
      } else {
        itemName = this.add.text(leftX + 8, slotY + 22, 'Empty Slot', {
          fontSize:   '13px',
          color:      PAL.textDim,
          fontFamily: PAL.fontBody,
          fontStyle:  'italic',
        });

        slotBg.on('pointerover', () => slotBg.setFillStyle(PAL.bgPanelHover));
        slotBg.on('pointerout',  () => slotBg.setFillStyle(bgColor));
      }

      this.slotObjects.push(slotBg, slotLabel, itemName);
    }
  }

  // ── Compatible Gear List ────────────────────────────────────────────────────

  private _buildCompatList(): void {
    for (const obj of this.listObjects) obj.destroy();
    this.listObjects = [];

    if (!this.selectedTower) return;

    const startY = 350;
    const leftX = SECTION_LEFT;

    const headerText = this.add.text(leftX, startY, 'Compatible Gear', {
      fontSize:   '14px',
      color:      PAL.textPrimary,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    });
    this.listObjects.push(headerText);

    // Get all non-equipped compatible items
    const allItems = [...this.inv.getInventory()];
    const compatible = allItems.filter(item => {
      // Skip if already equipped somewhere
      if (this.inv.isEquipped(item.uid)) return false;
      const def = getGearDef(item.defId);
      if (!def) return false;
      return canEquipOnTower(def, this.selectedTower!);
    });

    if (compatible.length === 0) {
      const emptyText = this.add.text(leftX, startY + 28, 'No compatible gear in inventory.', {
        fontSize:   '12px',
        color:      PAL.textDim,
        fontFamily: PAL.fontBody,
        fontStyle:  'italic',
      });
      this.listObjects.push(emptyText);
      return;
    }

    // Find available slot
    const slots = this.inv.getEquipped(this.selectedTower);
    const freeSlot = slots[0] === null ? 0 : slots[1] === null ? 1 : -1;

    let y = startY + 28;
    const maxVisible = 8;
    const shown = compatible.slice(0, maxVisible);

    for (const item of shown) {
      const def = getGearDef(item.defId);
      if (!def) continue;

      const rarityCol = RARITY_COLORS[def.rarity];
      const canEquip = freeSlot >= 0;

      const rowBg = this.add.rectangle(
        leftX + COMPAT_ITEM_W / 2, y + COMPAT_ITEM_H / 2, COMPAT_ITEM_W, COMPAT_ITEM_H, PAL.bgPanel,
      ).setStrokeStyle(1, canEquip ? rarityCol.num : PAL.borderInactive);

      if (canEquip) {
        rowBg.setInteractive({ useHandCursor: true });
        rowBg.on('pointerover', () => rowBg.setFillStyle(PAL.bgCardHover));
        rowBg.on('pointerout',  () => rowBg.setFillStyle(PAL.bgPanel));
        rowBg.on('pointerup', () => {
          this.inv.equip(this.selectedTower!, freeSlot, item.uid);
          this._buildSlots();
          this._buildCompatList();
          this._buildTowerCards();
        });
      }

      // Item name
      const enhStr = item.enhanceLevel > 0 ? ` +${item.enhanceLevel}` : '';
      const nameText = this.add.text(leftX + 10, y + 6, `${def.name}${enhStr}`, {
        fontSize:   '12px',
        color:      rarityCol.hex,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      });

      // Type + rarity
      const towerKey = GEAR_TYPE_TOWER[def.gearType];
      const typeStr = towerKey ? towerKey.charAt(0).toUpperCase() + towerKey.slice(1) : 'Universal';
      const rarStr = def.rarity.charAt(0).toUpperCase() + def.rarity.slice(1);
      const metaText = this.add.text(leftX + 10, y + 24, `${rarStr} ${typeStr}`, {
        fontSize:   '10px',
        color:      PAL.textDim,
        fontFamily: PAL.fontBody,
      });

      // Brief stat summary
      const statKeys = Object.keys(def.stats);
      const statSummary = statKeys.slice(0, 3).map(k => {
        const v = (def.stats as Record<string, number>)[k];
        return k.endsWith('Pct') || k.endsWith('Bonus')
          ? `+${Math.round(v * 100)}%`
          : `+${v}`;
      }).join('  ');

      const statsText = this.add.text(leftX + COMPAT_ITEM_W - 16, y + COMPAT_ITEM_H / 2, statSummary, {
        fontSize:   '10px',
        color:      PAL.textSecondary,
        fontFamily: PAL.fontBody,
      }).setOrigin(1, 0.5);

      // Equip hint or "Slots full"
      if (!canEquip) {
        const fullText = this.add.text(leftX + COMPAT_ITEM_W / 2, y + COMPAT_ITEM_H / 2, 'Slots full', {
          fontSize:   '10px',
          color:      PAL.textDim,
          fontFamily: PAL.fontBody,
          fontStyle:  'italic',
        }).setOrigin(0.5).setAlpha(0.6);
        this.listObjects.push(fullText);
      }

      this.listObjects.push(rowBg, nameText, metaText, statsText);
      y += COMPAT_ITEM_H + COMPAT_GAP;
    }

    // Overflow note
    if (compatible.length > maxVisible) {
      const moreText = this.add.text(
        leftX + COMPAT_ITEM_W / 2, y + 8,
        `+${compatible.length - maxVisible} more items (scroll in Inventory)`,
        { fontSize: '11px', color: PAL.textDim, fontFamily: PAL.fontBody, fontStyle: 'italic' },
      ).setOrigin(0.5);
      this.listObjects.push(moreText);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private _makeButton(
    x: number, y: number, label: string, onClick: () => void,
    bgColor = PAL.bgPanel, textColor = PAL.accentGreenN,
  ): void {
    const textColorStr = '#' + textColor.toString(16).padStart(6, '0');
    const bg = this.add.rectangle(x, y, 180, 44, bgColor)
      .setStrokeStyle(2, textColor)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: '15px', color: textColorStr, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(bgColor + 0x111111));
    bg.on('pointerout',  () => bg.setFillStyle(bgColor));
    bg.on('pointerup', onClick);
  }
}
