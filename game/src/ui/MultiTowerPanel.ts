import Phaser from 'phaser';
import type { Tower } from '../entities/towers/Tower';
import type { UpgradeManager } from '../systems/UpgradeManager';
import { PAL } from './palette';

// ── Layout constants ──────────────────────────────────────────────────────────

// Occupies the same vertical area as UpgradePanel + BehaviorPanel combined.
// This keeps the bottomLimit calculation in GameScene unchanged: when
// multiTowerPanel.isOpen(), the same UPGRADE_PANEL_HEIGHT + BEHAVIOR_PANEL_HEIGHT
// offset applies.
export const MULTI_TOWER_PANEL_HEIGHT = 176 + 64; // 240px total

const PANEL_HEIGHT_TOWER = 72; // must match TowerPanel.PANEL_HEIGHT
const DEPTH = 112;             // above UpgradePanel (110), below BehaviorPanel (115)

const HEADER_H   = 40;
const COLS_TOP_OFFSET = HEADER_H;
const COLS_H     = 156; // 240 - 40 (header) - 44 (select-all row)
const SELECT_ALL_H = 44;

// ── MultiColumnUI ─────────────────────────────────────────────────────────────

interface MultiColumnUI {
  path:        'A' | 'B' | 'C';
  headerText:  Phaser.GameObjects.Text;
  descText:    Phaser.GameObjects.Text;
  tierText:    Phaser.GameObjects.Text;
  costText:    Phaser.GameObjects.Text;
  buyBg:       Phaser.GameObjects.Rectangle;
  buyLabel:    Phaser.GameObjects.Text;
  sep?:        Phaser.GameObjects.Rectangle;
}

// ── MultiTowerPanel ───────────────────────────────────────────────────────────

/**
 * Panel shown above the TowerPanel strip when 2+ towers are selected.
 * Replaces UpgradePanel + BehaviorPanel for batch upgrade operations.
 *
 * Same-type selection: shows upgrade columns A/B/C with batch total costs.
 * Mixed-type selection: shows an informational message with deselect action.
 */
export class MultiTowerPanel {
  private readonly _manager: UpgradeManager;
  private readonly _getGold: () => number;
  private _open = false;

  private readonly _allObjects:     Phaser.GameObjects.GameObject[] = [];
  private readonly _colObjects:     Phaser.GameObjects.GameObject[] = [];
  private readonly _cols:           MultiColumnUI[] = [];

  private readonly _panelBg:        Phaser.GameObjects.Rectangle;
  private readonly _headerText:     Phaser.GameObjects.Text;
  private readonly _typeText:       Phaser.GameObjects.Text;
  private readonly _deselectBg:     Phaser.GameObjects.Rectangle;
  private readonly _deselectLabel:  Phaser.GameObjects.Text;
  private readonly _selectAllBg:    Phaser.GameObjects.Rectangle;
  private readonly _selectAllLabel: Phaser.GameObjects.Text;
  private readonly _mixedText:      Phaser.GameObjects.Text;

  /** Called when player buys the next upgrade for path X on all eligible selected towers. */
  onBuyBatch?: (path: 'A' | 'B' | 'C') => void;
  /** Called when player clicks "Deselect All". */
  onDeselectAll?: () => void;
  /** Called when player clicks "Select All [Type]". */
  onSelectAllType?: (typeKey: string) => void;

  constructor(
    scene: Phaser.Scene,
    manager: UpgradeManager,
    getGold: () => number,
  ) {
    this._manager = manager;
    this._getGold = getGold;

    const { width, height } = scene.scale;
    const panelTop = height - PANEL_HEIGHT_TOWER - MULTI_TOWER_PANEL_HEIGHT;

    // ── Background ────────────────────────────────────────────────────────
    this._panelBg = scene.add.rectangle(
      width / 2, panelTop + MULTI_TOWER_PANEL_HEIGHT / 2,
      width, MULTI_TOWER_PANEL_HEIGHT,
      0x070e07, 0.96,
    ).setStrokeStyle(1, PAL.borderPanel).setDepth(DEPTH);
    this._allObjects.push(this._panelBg);

    // ── Header row ────────────────────────────────────────────────────────
    const headerCY = panelTop + HEADER_H / 2;

    this._headerText = scene.add.text(14, headerCY, '', {
      fontSize: '14px', color: PAL.textPrimary, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(DEPTH + 1);
    this._allObjects.push(this._headerText);

    this._typeText = scene.add.text(width / 2, headerCY, '', {
      fontSize: '12px', color: PAL.textSecondary, fontFamily: PAL.fontBody,
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);
    this._allObjects.push(this._typeText);

    // Deselect All button (right side of header)
    const deselectW = 130;
    const deselectX = width - 12 - deselectW / 2;
    this._deselectBg = scene.add.rectangle(deselectX, headerCY, deselectW, HEADER_H - 8, 0x200808)
      .setStrokeStyle(1, PAL.borderDanger)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 1);
    this._allObjects.push(this._deselectBg);

    this._deselectLabel = scene.add.text(deselectX, headerCY, 'DESELECT ALL', {
      fontSize: '11px', color: PAL.danger, fontFamily: PAL.fontBody,
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);
    this._allObjects.push(this._deselectLabel);

    this._deselectBg.on('pointerover', () => this._deselectBg.setFillStyle(0x320c0c));
    this._deselectBg.on('pointerout',  () => this._deselectBg.setFillStyle(0x200808));
    this._deselectBg.on('pointerup',   () => this.onDeselectAll?.());

    // ── Three upgrade columns ──────────────────────────────────────────────
    const colsTop = panelTop + COLS_TOP_OFFSET;
    const colW    = Math.floor(width / 3);

    for (let ci = 0; ci < 3; ci++) {
      const pathId = (['A', 'B', 'C'] as const)[ci];
      const colX   = ci * colW;
      const colCx  = colX + colW / 2;

      // Column separator
      let sep: Phaser.GameObjects.Rectangle | undefined;
      if (ci > 0) {
        sep = scene.add.rectangle(colX, colsTop + COLS_H / 2, 1, COLS_H, PAL.borderInactive, 0.6)
          .setDepth(DEPTH);
        this._allObjects.push(sep);
        this._colObjects.push(sep);
      }

      // Path header
      const headerText = scene.add.text(colCx, colsTop + 10, '', {
        fontSize: '11px', color: PAL.textSecondary, fontFamily: PAL.fontBody, fontStyle: 'bold',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);
      this._allObjects.push(headerText);
      this._colObjects.push(headerText);

      // Path description
      const descText = scene.add.text(colCx, colsTop + 26, '', {
        fontSize: '9px', color: PAL.textDim, fontFamily: PAL.fontBody,
        wordWrap: { width: colW - 12 },
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);
      this._allObjects.push(descText);
      this._colObjects.push(descText);

      // Next tier info
      const tierText = scene.add.text(colCx, colsTop + 62, '', {
        fontSize: '10px', color: PAL.textSecondary, fontFamily: PAL.fontBody,
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);
      this._allObjects.push(tierText);
      this._colObjects.push(tierText);

      // Total cost
      const costText = scene.add.text(colCx, colsTop + 80, '', {
        fontSize: '10px', color: PAL.gold, fontFamily: PAL.fontBody,
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);
      this._allObjects.push(costText);
      this._colObjects.push(costText);

      // BUY batch button
      const buyY = colsTop + COLS_H - 20;
      const buyW = colW - 16;
      const buyBg = scene.add.rectangle(colCx, buyY, buyW, 28, PAL.bgUpgradeBuy)
        .setStrokeStyle(1, PAL.borderUpgBuy)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 1);
      this._allObjects.push(buyBg);
      this._colObjects.push(buyBg);

      const buyLabel = scene.add.text(colCx, buyY, 'BUY ALL', {
        fontSize: '11px', color: PAL.textSecondary, fontFamily: PAL.fontBody,
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);
      this._allObjects.push(buyLabel);
      this._colObjects.push(buyLabel);

      buyBg.on('pointerover', () => buyBg.setFillStyle(PAL.bgUpgradeBuyHover));
      buyBg.on('pointerout',  () => buyBg.setFillStyle(PAL.bgUpgradeBuy));
      buyBg.on('pointerup',   () => this.onBuyBatch?.(pathId));

      this._cols.push({ path: pathId, headerText, descText, tierText, costText, buyBg, buyLabel, sep });
    }

    // ── Mixed-type fallback message ───────────────────────────────────────
    this._mixedText = scene.add.text(width / 2, colsTop + COLS_H / 2, '', {
      fontSize: '12px', color: PAL.textDim, fontFamily: PAL.fontBody,
      align: 'center',
      wordWrap: { width: width - 80 },
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);
    this._allObjects.push(this._mixedText);

    // ── "Select All [Type]" bottom row ────────────────────────────────────
    const selectAllY = panelTop + MULTI_TOWER_PANEL_HEIGHT - SELECT_ALL_H / 2;

    this._selectAllBg = scene.add.rectangle(
      width / 2, selectAllY, width - 24, SELECT_ALL_H - 8,
      PAL.bgStartBtn,
    ).setStrokeStyle(1, PAL.borderActive)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 1);
    this._allObjects.push(this._selectAllBg);

    this._selectAllLabel = scene.add.text(width / 2, selectAllY, '', {
      fontSize: '12px', color: PAL.accentGreen, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);
    this._allObjects.push(this._selectAllLabel);

    this._selectAllBg.on('pointerover', () => this._selectAllBg.setFillStyle(PAL.bgStartBtnHover));
    this._selectAllBg.on('pointerout',  () => this._selectAllBg.setFillStyle(PAL.bgStartBtn));
    this._selectAllBg.on('pointerup',   () => {
      // Callback receives type key stored in _currentTypeKey (set during refresh)
      if (this._currentTypeKey) this.onSelectAllType?.(this._currentTypeKey);
    });

    // Start hidden
    this._setVisible(false);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  isOpen(): boolean { return this._open; }

  /** Show the panel for the given set of selected towers (must be 2 or more). */
  show(towers: Tower[]): void {
    this._open = true;
    this._setVisible(true);
    this.refresh(towers);
  }

  hide(): void {
    this._open = false;
    this._setVisible(false);
  }

  /** Re-render all column data after a gold change or upgrade purchase. */
  refresh(towers: Tower[]): void {
    if (!this._open) return;
    const count = towers.length;
    this._headerText.setText(`${count} TOWERS SELECTED`);

    const firstKey    = towers[0]?.def.key ?? '';
    const allSameType = count > 0 && towers.every(t => t.def.key === firstKey);

    if (allSameType && count > 0) {
      const typeName = towers[0].def.name.toUpperCase();
      this._typeText.setText(typeName);
      this._mixedText.setVisible(false);
      this._selectAllBg.setVisible(true);
      this._selectAllLabel.setVisible(true);
      this._selectAllLabel.setText(`+ SELECT ALL ${typeName} TOWERS`);
      this._currentTypeKey = firstKey;

      // Show upgrade columns
      for (const obj of this._colObjects) {
        (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(true);
      }
      this._refreshColumns(towers);
    } else {
      this._typeText.setText('MIXED TYPES');
      this._mixedText
        .setText(
          'Multiple tower types selected.\n' +
          'Select towers of a single type for batch upgrades,\n' +
          'or use "Select All [Type]" from a single-tower selection.',
        )
        .setVisible(true);
      this._selectAllBg.setVisible(false);
      this._selectAllLabel.setVisible(false);
      this._currentTypeKey = '';

      // Hide upgrade columns
      for (const obj of this._colObjects) {
        (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
      }
    }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _currentTypeKey = '';

  private _refreshColumns(towers: Tower[]): void {
    const gold    = this._getGold();
    const mgr     = this._manager;
    const firstDef = mgr.getDef(towers[0].def.key);

    for (const col of this._cols) {
      const pathId    = col.path;
      const pathName  = firstDef?.paths[pathId].name ?? pathId;
      const pathDesc  = firstDef?.paths[pathId].description ?? '';

      col.headerText.setText(`PATH ${pathId}: ${pathName.toUpperCase()}`);
      col.descText.setText(pathDesc);

      // Filter to towers that don't have this path locked — towers on
      // different upgrade paths are simply excluded from the batch, not blocked.
      const unlocked    = towers.filter(t => !mgr.getState(t)?.locked.has(pathId));
      const lockedCount = towers.length - unlocked.length;
      const allLocked   = unlocked.length === 0;

      // Compute eligible towers and total cost (only from unlocked towers)
      const eligibleCosts: number[] = [];
      let   allMaxed = true;

      if (!allLocked) {
        for (const tower of unlocked) {
          const cost = mgr.getUpgradeCost(tower, pathId);
          if (cost > 0) {
            eligibleCosts.push(cost);
            allMaxed = false;
          } else {
            const state = mgr.getState(tower);
            if (state && state.tiers[pathId] < 5) allMaxed = false;
          }
        }
      }

      const totalCost      = eligibleCosts.reduce((s, c) => s + c, 0);
      const eligibleCount  = eligibleCosts.length;
      const canAffordBatch = totalCost > 0 && gold >= eligibleCosts[0]; // afford at least 1

      if (allLocked || eligibleCount === 0) {
        // Nothing purchasable
        const label = allLocked ? 'LOCKED' : allMaxed ? 'MAX TIER' : 'UNAVAILABLE';
        col.tierText.setText('');
        col.costText.setText(allLocked ? '' : lockedCount > 0 ? `${lockedCount} on other path` : '');
        col.buyBg.setFillStyle(PAL.bgPanelDark).setStrokeStyle(1, PAL.borderInactive);
        col.buyLabel.setText(label).setColor(allLocked ? PAL.danger : PAL.textDim);
        col.buyBg.removeInteractive();
      } else {
        // Compute "next tier" label (from unlocked towers only)
        const tiers = unlocked
          .map(t => mgr.getState(t)?.tiers[pathId] ?? 0)
          .filter((_, i) => mgr.getUpgradeCost(unlocked[i], pathId) > 0);
        const minTier  = Math.min(...tiers);
        const maxTier  = Math.max(...tiers);
        const tierLabel = minTier === maxTier
          ? `Tier ${minTier} → ${minTier + 1}`
          : `Tiers ${minTier}–${maxTier} → +1`;

        const perLabel = eligibleCount < unlocked.length
          ? `${eligibleCount}/${unlocked.length} towers`
          : lockedCount > 0
            ? `${eligibleCount}/${towers.length} towers`
            : `${eligibleCount} towers`;

        col.tierText.setText(tierLabel);
        const lockNote = lockedCount > 0 ? `  (${lockedCount} locked)` : '';
        col.costText.setText(`${perLabel}  ·  ${totalCost}g total${lockNote}`);

        // BUY button state
        if (canAffordBatch) {
          col.buyBg.setFillStyle(PAL.bgStartBtnPress).setStrokeStyle(1, PAL.borderActive);
          col.buyLabel.setText(`BUY ALL  ${totalCost}g`).setColor(PAL.accentGreen);
        } else {
          col.buyBg.setFillStyle(PAL.bgUpgradeBuy).setStrokeStyle(1, PAL.borderInactive);
          col.buyLabel.setText(`BUY ALL  ${totalCost}g`).setColor(PAL.textDim);
        }
        col.buyBg.setInteractive({ useHandCursor: canAffordBatch });
      }
    }
  }

  private _setVisible(visible: boolean): void {
    for (const obj of this._allObjects) {
      (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(visible);
    }
  }
}
