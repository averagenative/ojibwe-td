/**
 * InventoryScene — gear inventory grid with item detail panel.
 *
 * Accessible from MetaMenuScene. Shows all owned gear items in a scrollable
 * 6-column grid. Clicking an item reveals a detail panel with EQUIP, ENHANCE,
 * EVOLVE, SALVAGE, and SOCKET RUNE actions.
 *
 * Filter buttons narrow the grid by tower type (or "All").
 */

import Phaser from 'phaser';
import { InventoryManager } from '../meta/InventoryManager';
import { getGearDef, RARITY_COLORS, ALL_RUNES, GEAR_TYPE_TOWER, SALVAGE_VALUES, getEnhancedStatMult } from '../data/gearDefs';
import type { GearInstance, GearRarity } from '../data/gearDefs';
import { SaveManager } from '../meta/SaveManager';
import { matchesGearInventoryFilter, resolveGearDisplayTowerKey, UNIVERSAL_GEAR_FILTER } from '../ui/gearTowerAssociation';
import { PAL } from '../ui/palette';

// ── Layout constants ──────────────────────────────────────────────────────────

const GRID_COLS     = 6;
const CELL_SIZE     = 80;
const CELL_GAP      = 8;
const GRID_LEFT     = 40;
const GRID_TOP      = 140;
const GRID_ROWS_VIS = 5;       // visible rows before scrolling

const DETAIL_W      = 320;
const DETAIL_X_PAD  = 24;

const FILTER_BTN_W  = 90;
const FILTER_BTN_H  = 30;
const FILTER_GAP    = 6;

// Gear type → display label for filter buttons
const FILTER_OPTIONS: { label: string; towerKey: string | null }[] = [
  { label: 'All',          towerKey: null },
  { label: 'Rock Hurler',  towerKey: 'rock-hurler' },
  { label: 'Frost',        towerKey: 'frost' },
  { label: 'Thunder',      towerKey: 'tesla' },
  { label: 'Poison',       towerKey: 'poison' },
  { label: 'Aura',         towerKey: 'aura' },
  { label: 'Arrow',        towerKey: 'arrow' },
  { label: 'Universal',    towerKey: UNIVERSAL_GEAR_FILTER },
];

export class InventoryScene extends Phaser.Scene {
  private inv!: InventoryManager;
  private save!: SaveManager;

  private gridObjects: Phaser.GameObjects.GameObject[] = [];
  private detailObjects: Phaser.GameObjects.GameObject[] = [];
  private filterObjects: Phaser.GameObjects.GameObject[] = [];

  private selectedUid: string | null = null;
  private activeFilter: string | null = null;   // null = All
  private scrollOffset = 0;

  private balanceText!: Phaser.GameObjects.Text;
  private countText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'InventoryScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.inv  = InventoryManager.getInstance();
    this.save = SaveManager.getInstance();

    // Mark all items seen
    this.inv.markAllSeen();

    // Background
    this.add.rectangle(cx, height / 2, width, height, PAL.bgDark);

    // Title
    this.add.text(cx, 30, 'GEAR INVENTORY', {
      fontSize:   '30px',
      color:      PAL.accentGreen,
      fontFamily: PAL.fontTitle,
      fontStyle:  'bold',
    }).setOrigin(0.5);

    // Crystal balance
    this.balanceText = this.add.text(cx, 68, '', {
      fontSize:   '18px',
      color:      PAL.gold,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5);
    this._refreshBalance();

    // Item count
    this.countText = this.add.text(width - 40, 68, '', {
      fontSize:   '14px',
      color:      PAL.textMuted,
      fontFamily: PAL.fontBody,
    }).setOrigin(1, 0.5);
    this._refreshCount();

    // Filter buttons
    this._buildFilters();

    // Build grid
    this._buildGrid();

    // Scroll support (mouse wheel)
    this.input.on('wheel', (_ptr: Phaser.Input.Pointer, _gx: number[], _gy: number[], _gz: number[], dy: number) => {
      const maxRows = Math.ceil(this._getFilteredItems().length / GRID_COLS);
      const maxOffset = Math.max(0, maxRows - GRID_ROWS_VIS);
      if (dy > 0 && this.scrollOffset < maxOffset) {
        this.scrollOffset++;
        this._buildGrid();
      } else if (dy < 0 && this.scrollOffset > 0) {
        this.scrollOffset--;
        this._buildGrid();
      }
    });

    // BACK button
    this._makeButton(cx, height - 40, 'BACK', () => {
      this.scene.start('MetaMenuScene');
    });
  }

  // ── Filters ─────────────────────────────────────────────────────────────────

  private _buildFilters(): void {
    for (const obj of this.filterObjects) obj.destroy();
    this.filterObjects = [];

    const startX = GRID_LEFT;
    const y = GRID_TOP - 42;

    for (let i = 0; i < FILTER_OPTIONS.length; i++) {
      const opt = FILTER_OPTIONS[i];
      const x = startX + i * (FILTER_BTN_W + FILTER_GAP) + FILTER_BTN_W / 2;
      const isActive = this.activeFilter === opt.towerKey;

      const bg = this.add.rectangle(x, y, FILTER_BTN_W, FILTER_BTN_H,
        isActive ? PAL.bgCard : PAL.bgPanel,
      ).setStrokeStyle(1, isActive ? PAL.accentGreenN : PAL.borderInactive)
       .setInteractive({ useHandCursor: true });

      const label = this.add.text(x, y, opt.label, {
        fontSize:   '12px',
        color:      isActive ? PAL.accentGreen : PAL.textMuted,
        fontFamily: PAL.fontBody,
        fontStyle:  isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);

      bg.on('pointerover', () => { if (!isActive) bg.setFillStyle(PAL.bgCardHover); });
      bg.on('pointerout',  () => { if (!isActive) bg.setFillStyle(PAL.bgPanel); });
      bg.on('pointerup', () => {
        this.activeFilter = opt.towerKey;
        this.scrollOffset = 0;
        this.selectedUid = null;
        this._clearDetail();
        this._buildFilters();
        this._buildGrid();
      });

      this.filterObjects.push(bg, label);
    }
  }

  // ── Grid ────────────────────────────────────────────────────────────────────

  private _getFilteredItems(): GearInstance[] {
    const all = [...this.inv.getInventory()];
    if (this.activeFilter === null) return all;

    return all.filter(item => {
      const def = getGearDef(item.defId);
      if (!def) return false;
      const towerKey = GEAR_TYPE_TOWER[def.gearType];
      const equippedTowerKey = this.inv.getEquippedLocation(item.uid)?.towerKey ?? null;
      return matchesGearInventoryFilter(this.activeFilter, towerKey, equippedTowerKey);
    });
  }

  private _buildGrid(): void {
    for (const obj of this.gridObjects) obj.destroy();
    this.gridObjects = [];

    const items = this._getFilteredItems();
    const startIdx = this.scrollOffset * GRID_COLS;
    const endIdx = startIdx + GRID_COLS * GRID_ROWS_VIS;
    const visible = items.slice(startIdx, endIdx);

    for (let i = 0; i < visible.length; i++) {
      const item = visible[i];
      const def = getGearDef(item.defId);
      if (!def) continue;

      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = GRID_LEFT + col * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
      const y = GRID_TOP + row * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;

      const rarityCol = RARITY_COLORS[def.rarity];
      const isSelected = item.uid === this.selectedUid;

      // Cell background
      const bg = this.add.rectangle(x, y, CELL_SIZE, CELL_SIZE,
        isSelected ? PAL.bgCardHover : PAL.bgPanel,
      ).setStrokeStyle(2, isSelected ? rarityCol.num : PAL.borderInactive)
       .setInteractive({ useHandCursor: true });

      // Rarity stripe at top
      const stripe = this.add.rectangle(x, y - CELL_SIZE / 2 + 3, CELL_SIZE - 4, 4, rarityCol.num);

      // Gear type icon
      const gearIconKey = `gear-${def.gearType}`;
      let gearIcon: Phaser.GameObjects.Image | undefined;
      if (this.textures.exists(gearIconKey)) {
        gearIcon = this.add.image(x, y - 12, gearIconKey)
          .setDisplaySize(28, 28)
          .setTint(rarityCol.num);
      }

      // Item name (truncated)
      const nameStr = def.name.length > 10 ? def.name.slice(0, 9) + '...' : def.name;
      const name = this.add.text(x, y + 12, nameStr, {
        fontSize:   '11px',
        color:      rarityCol.hex,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0.5);

      // Enhance badge
      let badge: Phaser.GameObjects.Text | undefined;
      if (item.enhanceLevel > 0) {
        badge = this.add.text(x + CELL_SIZE / 2 - 6, y - CELL_SIZE / 2 + 6, `+${item.enhanceLevel}`, {
          fontSize:   '10px',
          color:      PAL.gold,
          fontFamily: PAL.fontBody,
          fontStyle:  'bold',
        }).setOrigin(1, 0);
      }

      // Equipped indicator
      let equippedDot: Phaser.GameObjects.Rectangle | undefined;
      if (this.inv.isEquipped(item.uid)) {
        equippedDot = this.add.rectangle(x - CELL_SIZE / 2 + 8, y + CELL_SIZE / 2 - 8, 6, 6, PAL.accentGreenN);
      }

      // Rune indicator
      let runeDot: Phaser.GameObjects.Rectangle | undefined;
      if (item.rune) {
        runeDot = this.add.rectangle(x + CELL_SIZE / 2 - 8, y + CELL_SIZE / 2 - 8, 6, 6, PAL.accentBlueN);
      }

      // Tower type label
      const towerKey = resolveGearDisplayTowerKey(
        GEAR_TYPE_TOWER[def.gearType],
        this.inv.getEquippedLocation(item.uid)?.towerKey ?? null,
      );
      const typeLabel = towerKey ? towerKey.charAt(0).toUpperCase() + towerKey.slice(1) : 'Uni';
      const typeText = this.add.text(x, y + 26, typeLabel, {
        fontSize:   '9px',
        color:      PAL.textDim,
        fontFamily: PAL.fontBody,
      }).setOrigin(0.5);

      // Click handler
      bg.on('pointerup', () => {
        this.selectedUid = item.uid;
        this._buildGrid();
        this._showDetail(item);
      });

      bg.on('pointerover', () => { if (!isSelected) bg.setFillStyle(PAL.bgCardHover); });
      bg.on('pointerout',  () => { if (!isSelected) bg.setFillStyle(PAL.bgPanel); });

      this.gridObjects.push(bg, stripe, name, typeText);
      if (gearIcon) this.gridObjects.push(gearIcon);
      if (badge) this.gridObjects.push(badge);
      if (equippedDot) this.gridObjects.push(equippedDot);
      if (runeDot) this.gridObjects.push(runeDot);
    }

    // Scroll indicator
    const totalRows = Math.ceil(items.length / GRID_COLS);
    if (totalRows > GRID_ROWS_VIS) {
      const indicatorY = GRID_TOP + GRID_ROWS_VIS * (CELL_SIZE + CELL_GAP) + 10;
      const scrollText = this.add.text(
        GRID_LEFT + (GRID_COLS * (CELL_SIZE + CELL_GAP)) / 2,
        indicatorY,
        `Rows ${this.scrollOffset + 1}-${Math.min(this.scrollOffset + GRID_ROWS_VIS, totalRows)} of ${totalRows}`,
        { fontSize: '11px', color: PAL.textDim, fontFamily: PAL.fontBody },
      ).setOrigin(0.5);
      this.gridObjects.push(scrollText);
    }
  }

  // ── Detail Panel ────────────────────────────────────────────────────────────

  private _clearDetail(): void {
    for (const obj of this.detailObjects) obj.destroy();
    this.detailObjects = [];
  }

  private _showDetail(item: GearInstance): void {
    this._clearDetail();

    const def = getGearDef(item.defId);
    if (!def) return;

    const { width, height } = this.scale;
    const panelX = width - DETAIL_W / 2 - 20;
    const panelY = GRID_TOP + 20;
    const panelH = height - GRID_TOP - 80;

    // Panel background
    const panelBg = this.add.rectangle(panelX, panelY + panelH / 2, DETAIL_W, panelH, PAL.bgCard)
      .setStrokeStyle(2, RARITY_COLORS[def.rarity].num);
    this.detailObjects.push(panelBg);

    let y = panelY + 16;
    const leftX = panelX - DETAIL_W / 2 + DETAIL_X_PAD;

    // Gear type icon (top of detail panel)
    const detailGearIconKey = `gear-${def.gearType}`;
    const hasDetailGearIcon = this.textures.exists(detailGearIconKey);
    if (hasDetailGearIcon) {
      const gearImg = this.add.image(leftX + 18, y + 18, detailGearIconKey)
        .setDisplaySize(36, 36)
        .setTint(RARITY_COLORS[def.rarity].num);
      this.detailObjects.push(gearImg);
    }

    // Name (offset right to sit beside gear icon)
    const iconInset = hasDetailGearIcon ? 42 : 0;
    const nameText = this.add.text(leftX + iconInset, y, def.name, {
      fontSize:   '18px',
      color:      RARITY_COLORS[def.rarity].hex,
      fontFamily: PAL.fontTitle,
      fontStyle:  'bold',
      wordWrap:   { width: DETAIL_W - DETAIL_X_PAD * 2 - iconInset },
    });
    this.detailObjects.push(nameText);
    y += 28;

    // Rarity + enhance level (always show X/5 so player knows the cap)
    const rarityLabel = def.rarity.charAt(0).toUpperCase() + def.rarity.slice(1);
    const enhLevelDisplay = `  +${item.enhanceLevel}/5`;
    const rarityText = this.add.text(leftX, y, `${rarityLabel}${enhLevelDisplay}`, {
      fontSize:   '13px',
      color:      RARITY_COLORS[def.rarity].hex,
      fontFamily: PAL.fontBody,
    });
    this.detailObjects.push(rarityText);
    y += 22;

    // MAX LEVEL badge (criterion: indicate max clearly)
    if (item.enhanceLevel >= 5) {
      const maxBadge = this.add.text(leftX, y, 'MAX LEVEL', {
        fontSize:   '12px',
        color:      PAL.gold,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      });
      this.detailObjects.push(maxBadge);
      y += 18;
    }

    // Tower type with tower icon
    const equippedTowerKey = this.inv.getEquippedLocation(item.uid)?.towerKey ?? null;
    const towerKey = resolveGearDisplayTowerKey(GEAR_TYPE_TOWER[def.gearType], equippedTowerKey);
    const towerLabel = towerKey ? towerKey.charAt(0).toUpperCase() + towerKey.slice(1) : 'Universal';
    const towerIconKey = towerKey ? `icon-${towerKey}` : null;
    let towerTextOffsetX = leftX;
    if (towerIconKey && this.textures.exists(towerIconKey)) {
      const towerImg = this.add.image(leftX + 10, y + 6, towerIconKey)
        .setDisplaySize(20, 20);
      this.detailObjects.push(towerImg);
      towerTextOffsetX = leftX + 24;
    }
    const typePrefix = equippedTowerKey ? 'Equipped To' : 'Type';
    const typeText = this.add.text(towerTextOffsetX, y, `${typePrefix}: ${towerLabel}`, {
      fontSize:   '12px',
      color:      PAL.textSecondary,
      fontFamily: PAL.fontBody,
    });
    this.detailObjects.push(typeText);
    y += 22;

    // Description
    const descText = this.add.text(leftX, y, def.description, {
      fontSize:   '12px',
      color:      PAL.textDesc,
      fontFamily: PAL.fontBody,
      wordWrap:   { width: DETAIL_W - DETAIL_X_PAD * 2 },
    });
    this.detailObjects.push(descText);
    y += descText.height + 14;

    // Stats
    const statEntries = Object.entries(def.stats).filter(([, v]) => v !== 0 && v !== undefined);
    if (statEntries.length > 0) {
      const statsHeader = this.add.text(leftX, y, 'Stats:', {
        fontSize:   '12px',
        color:      PAL.textPrimary,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      });
      this.detailObjects.push(statsHeader);
      y += 18;

      // Show current effective value and, if not maxed, what the next enhance will give
      const currentMult = getEnhancedStatMult(item.enhanceLevel);
      const nextMult    = item.enhanceLevel < 5 ? getEnhancedStatMult(item.enhanceLevel + 1) : null;

      for (const [key, val] of statEntries) {
        const statLabel  = this._formatStatName(key);
        const isPct      = this._isPercentStat(key);
        const currentStr = this._formatStatVal((val as number) * currentMult, isPct);
        let lineStr: string;
        if (nextMult !== null) {
          const nextStr = this._formatStatVal((val as number) * nextMult, isPct);
          lineStr = `${statLabel}: ${currentStr} → ${nextStr}`;
        } else {
          lineStr = `${statLabel}: ${currentStr}`;
        }
        const statText = this.add.text(leftX + 8, y, lineStr, {
          fontSize:   '11px',
          color:      PAL.textSecondary,
          fontFamily: PAL.fontBody,
        });
        this.detailObjects.push(statText);
        y += 16;
      }
      y += 6;
    }

    // Special effect
    if (def.specialEffect) {
      const effectText = this.add.text(leftX, y, `Special: ${def.specialEffect.description}`, {
        fontSize:   '11px',
        color:      PAL.accentBlue,
        fontFamily: PAL.fontBody,
        fontStyle:  'italic',
        wordWrap:   { width: DETAIL_W - DETAIL_X_PAD * 2 },
      });
      this.detailObjects.push(effectText);
      y += effectText.height + 10;
    }

    // Rune info
    if (item.rune) {
      const runeText = this.add.text(leftX, y, `Rune: ${item.rune.name} - ${item.rune.description}`, {
        fontSize:   '11px',
        color:      PAL.accentBlue,
        fontFamily: PAL.fontBody,
        wordWrap:   { width: DETAIL_W - DETAIL_X_PAD * 2 },
      });
      this.detailObjects.push(runeText);
      y += runeText.height + 10;
    }

    // ── Action Buttons ──────────────────────────────────────────────────────

    const btnX = panelX;
    const btnGap = 46;
    y = panelY + panelH - 200;

    // EQUIP
    this._makeDetailButton(btnX, y, 'EQUIP', () => {
      this.scene.start('TowerEquipScene', { returnTo: 'InventoryScene', selectUid: item.uid });
    }, PAL.bgPanel, PAL.accentGreenN);
    y += btnGap;

    // ENHANCE — label shows target level and crystal cost for clarity
    const enhCost = this.inv.getEnhanceCost(item.uid);
    const canEnhance = enhCost >= 0 && this.save.getCurrency() >= enhCost;
    const enhLabel2 = enhCost >= 0
      ? `ENHANCE → +${item.enhanceLevel + 1}/5  (${enhCost} crystals)`
      : 'ENHANCE (MAX LEVEL)';
    this._makeDetailButton(btnX, y, enhLabel2, () => {
      if (canEnhance) {
        this.inv.enhance(item.uid);
        this._refreshBalance();
        this._refreshCount();
        this._buildGrid();
        const updated = this.inv.getItem(item.uid);
        if (updated) this._showDetail(updated);
      }
    }, PAL.bgPanel, canEnhance ? PAL.accentBlueN : PAL.borderInactive);
    y += btnGap;

    // EVOLVE (only if +5 and not legendary)
    const canEvolve = item.enhanceLevel >= 5 && def.rarity !== 'legendary';
    if (canEvolve) {
      const evolveCost = SALVAGE_VALUES[def.rarity as GearRarity] * 2;
      const canAffordEvolve = this.save.getCurrency() >= evolveCost;
      this._makeDetailButton(btnX, y, `EVOLVE (${evolveCost})`, () => {
        if (canAffordEvolve) {
          this.inv.evolve(item.uid);
          this._refreshBalance();
          this._refreshCount();
          this.selectedUid = null;
          this._clearDetail();
          this._buildGrid();
        }
      }, PAL.bgPanel, canAffordEvolve ? PAL.goldN : PAL.borderInactive);
      y += btnGap;
    }

    // SALVAGE
    const salvageVal = SALVAGE_VALUES[def.rarity as GearRarity];
    this._makeDetailButton(btnX, y, `SALVAGE (+${salvageVal})`, () => {
      this.inv.salvage(item.uid);
      this._refreshBalance();
      this._refreshCount();
      this.selectedUid = null;
      this._clearDetail();
      this._buildGrid();
    }, PAL.bgPanel, PAL.dangerN);
    y += btnGap;

    // SOCKET RUNE (if +3 or higher and no rune)
    if (item.enhanceLevel >= 3 && !item.rune) {
      this._makeDetailButton(btnX, y, 'SOCKET RUNE', () => {
        this._showRuneSelect(item);
      }, PAL.bgPanel, PAL.accentBlueN);
    }
  }

  // ── Rune selection sub-panel ────────────────────────────────────────────────

  private _showRuneSelect(item: GearInstance): void {
    this._clearDetail();

    const { width, height } = this.scale;
    const panelX = width - DETAIL_W / 2 - 20;
    const panelY = GRID_TOP + 20;
    const panelH = height - GRID_TOP - 80;

    const panelBg = this.add.rectangle(panelX, panelY + panelH / 2, DETAIL_W, panelH, PAL.bgCard)
      .setStrokeStyle(2, PAL.accentBlueN);
    this.detailObjects.push(panelBg);

    let y = panelY + 16;
    const leftX = panelX - DETAIL_W / 2 + DETAIL_X_PAD;

    const title = this.add.text(leftX, y, 'Select a Rune', {
      fontSize:   '16px',
      color:      PAL.accentBlue,
      fontFamily: PAL.fontTitle,
      fontStyle:  'bold',
    });
    this.detailObjects.push(title);
    y += 30;

    for (const rune of ALL_RUNES) {
      const runeBg = this.add.rectangle(panelX, y + 16, DETAIL_W - 30, 36, PAL.bgPanel)
        .setStrokeStyle(1, PAL.borderInactive)
        .setInteractive({ useHandCursor: true });

      const runeName = this.add.text(leftX + 4, y + 6, rune.name, {
        fontSize:   '12px',
        color:      PAL.textPrimary,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      });

      const runeDesc = this.add.text(leftX + 4, y + 22, rune.description, {
        fontSize:   '10px',
        color:      PAL.textDim,
        fontFamily: PAL.fontBody,
      });

      runeBg.on('pointerover', () => runeBg.setFillStyle(PAL.bgCardHover));
      runeBg.on('pointerout',  () => runeBg.setFillStyle(PAL.bgPanel));
      runeBg.on('pointerup', () => {
        this.inv.socketRune(item.uid, rune);
        const updated = this.inv.getItem(item.uid);
        if (updated) {
          this._showDetail(updated);
          this._buildGrid();
        }
      });

      this.detailObjects.push(runeBg, runeName, runeDesc);
      y += 42;
    }

    // Cancel button
    this._makeDetailButton(panelX, y + 20, 'CANCEL', () => {
      const current = this.inv.getItem(item.uid);
      if (current) this._showDetail(current);
      else this._clearDetail();
    }, PAL.bgPanel, PAL.dangerN);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private _refreshBalance(): void {
    this.balanceText.setText(`Crystals: ${this.save.getCurrency()}`);
  }

  private _refreshCount(): void {
    this.countText.setText(`${this.inv.getInventoryCount()} / ${this.inv.getMaxInventory()} items`);
  }

  private _formatStatName(key: string): string {
    const map: Record<string, string> = {
      damagePct:         'Damage',
      rangePct:          'Range',
      attackSpeedPct:    'Attack Speed',
      splashRadiusPct:   'Splash Radius',
      chainCountBonus:   'Chain Count',
      chainRangePct:     'Chain Range',
      slowPctBonus:      'Slow Strength',
      freezeDurationPct: 'Freeze Duration',
      dotDamagePct:      'DoT Damage',
      dotStackBonus:     'Max DoT Stacks',
      auraRadiusPct:     'Aura Radius',
      auraStrengthPct:   'Aura Strength',
      armorPenPct:       'Armor Penetration',
      stunDurationMs:    'Stun Duration',
    };
    return map[key] ?? key;
  }

  private _isPercentStat(key: string): boolean {
    return key.includes('Pct');
  }

  /**
   * Format an effective stat value for display.
   * Percent stats are shown as "+8.4%" (one decimal when needed).
   * Flat stats are shown as "+1.1" (one decimal when needed).
   */
  private _formatStatVal(val: number, isPct: boolean): string {
    if (isPct) {
      const pct = Math.round(val * 1000) / 10;
      const sign = pct > 0 ? '+' : '';
      const pctStr = pct % 1 === 0 ? String(Math.round(pct)) : pct.toFixed(1);
      return `${sign}${pctStr}%`;
    } else {
      const rounded = Math.round(val * 10) / 10;
      const sign = rounded > 0 ? '+' : '';
      const numStr = rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1);
      return `${sign}${numStr}`;
    }
  }

  private _makeButton(
    x: number, y: number, label: string, onClick: () => void,
    bgColor: number = PAL.bgPanel, textColor: number = PAL.accentGreenN,
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

  private _makeDetailButton(
    x: number, y: number, label: string, onClick: () => void,
    bgColor: number = PAL.bgPanel, textColor: number = PAL.accentGreenN,
  ): void {
    const textColorStr = '#' + textColor.toString(16).padStart(6, '0');
    const bg = this.add.rectangle(x, y, DETAIL_W - 40, 38, bgColor)
      .setStrokeStyle(1, textColor)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontSize: '13px', color: textColorStr, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(bgColor + 0x111111));
    bg.on('pointerout',  () => bg.setFillStyle(bgColor));
    bg.on('pointerup', onClick);
    this.detailObjects.push(bg, txt);
  }
}
