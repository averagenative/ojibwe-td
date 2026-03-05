import Phaser from 'phaser';
import type { Tower } from '../entities/towers/Tower';
import type { UpgradeManager } from '../systems/UpgradeManager';
import { calculateSellRefund } from '../systems/EconomyManager';
import { MobileManager, TAP_EVENT, mfs } from '../systems/MobileManager';
import { PANEL_HEIGHT as PANEL_HEIGHT_TOWER } from './TowerPanel';
import { SAFE_INSET } from './HUD';
import { PAL } from './palette';
import { buildStatsLine } from './statsLine';

// ── Layout constants ──────────────────────────────────────────────────────────

const _IS_MOBILE = MobileManager.getInstance().isMobile();

export const UPGRADE_PANEL_HEIGHT = _IS_MOBILE ? 210 : 176;

const HEADER_H      = _IS_MOBILE ? 28 : 22;
const COL_DESC_ROW_H = _IS_MOBILE ? 18 : 16;
const TIER_H        = _IS_MOBILE ? 22 : 18;
const BUY_BTN_H     = _IS_MOBILE ? 34 : 28;
const DEPTH         = 110;  // above TowerPanel (100)

// ── Internal structures ───────────────────────────────────────────────────────

interface PathColumnUI {
  path:        'A' | 'B' | 'C';
  headerText:  Phaser.GameObjects.Text;
  descText:    Phaser.GameObjects.Text;
  tierPips:    Phaser.GameObjects.Arc[];
  tierNames:   Phaser.GameObjects.Text[];
  tierCosts:   Phaser.GameObjects.Text[];
  buyBg:       Phaser.GameObjects.Rectangle;
  buyLabel:    Phaser.GameObjects.Text;
  lockOverlay: Phaser.GameObjects.Rectangle;
  lockLabel:   Phaser.GameObjects.Text;
}

// ── UpgradePanel ──────────────────────────────────────────────────────────────

/**
 * Three-column upgrade panel shown above the TowerPanel when a tower is selected.
 * Columns A / B / C each show 5 tier pips, tier names, costs, a buy button,
 * and a locked overlay when the path is blocked.
 */
export class UpgradePanel {
  private readonly manager: UpgradeManager;
  private readonly getGold: () => number;
  private readonly getSellRate: () => number;

  private _open         = false;
  private currentTower: Tower | null = null;

  private allObjects:       Phaser.GameObjects.GameObject[] = [];
  private panelBg:          Phaser.GameObjects.Rectangle;
  private nameTxt:          Phaser.GameObjects.Text;
  private statsTxt:         Phaser.GameObjects.Text;
  private sellBg:           Phaser.GameObjects.Rectangle;
  private sellLabel:        Phaser.GameObjects.Text;
  private respecBg:         Phaser.GameObjects.Rectangle;
  private respecLabel:      Phaser.GameObjects.Text;
  private _selectAllBg:     Phaser.GameObjects.Rectangle;
  private _selectAllLabel:  Phaser.GameObjects.Text;
  private columns:          PathColumnUI[] = [];

  /** GameScene sets this so selling a tower refunds gold. */
  onSell?: (tower: Tower) => void;
  /** GameScene sets this so buying deducts gold and refreshes HUD. */
  onBuy?:    (cost: number) => void;
  /**
   * GameScene sets this to implement "Select All of This Type" — selects all
   * placed towers with the same tower key as the currently-shown tower.
   */
  onSelectAllType?: () => void;
  /**
   * GameScene sets this so respec adds back the refund gold.
   * @param refund     Gold returned to the player after the respec fee.
   * @param fee        Gold lost as the respec penalty (0.25 × totalSpent by default).
   *                   The Resourceful offer uses this to grant a full refund.
   */
  onRespec?: (refund: number, fee: number) => void;

  constructor(
    scene:   Phaser.Scene,
    manager: UpgradeManager,
    getGold: () => number,
    getSellRate: () => number = () => 0.7,
  ) {
    this.manager = manager;
    this.getGold = getGold;
    this.getSellRate = getSellRate;

    const { width, height } = scene.scale;

    // Panel occupies y ∈ [py, py + UPGRADE_PANEL_HEIGHT]
    // sitting directly above the tower-selection panel.
    const py = height - PANEL_HEIGHT_TOWER - UPGRADE_PANEL_HEIGHT;

    // ── Background ─────────────────────────────────────────────────────────
    this.panelBg = scene.add.rectangle(
      width / 2,
      py + UPGRADE_PANEL_HEIGHT / 2,
      width,
      UPGRADE_PANEL_HEIGHT,
      PAL.bgPanelDark, 0.95,
    ).setStrokeStyle(1, PAL.borderPanel).setDepth(DEPTH);

    this.allObjects.push(this.panelBg);

    // ── Header row ─────────────────────────────────────────────────────────
    const headerCY = py + HEADER_H / 2;

    this.nameTxt = scene.add.text(16 + SAFE_INSET, headerCY, '', {
      fontSize: mfs(14), color: PAL.textPrimary, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(DEPTH + 1);
    this.allObjects.push(this.nameTxt);

    // Current tower stats — shown centered in the header, updates on each refresh
    this.statsTxt = scene.add.text(width / 2, headerCY, '', {
      fontSize: mfs(11), color: PAL.textSecondary, fontFamily: PAL.fontBody,
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);
    this.allObjects.push(this.statsTxt);

    // Sell button (gold text, prominent)
    const sellW  = 120;
    const sellX  = width - 12 - SAFE_INSET - sellW / 2;

    this.sellBg = scene.add.rectangle(sellX, headerCY, sellW, HEADER_H - 4, 0x3a2a00)
      .setStrokeStyle(2, 0xdaa520)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 1);
    this.allObjects.push(this.sellBg);

    this.sellLabel = scene.add.text(sellX, headerCY, 'SELL', {
      fontSize: mfs(12), color: PAL.gold, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);
    this.allObjects.push(this.sellLabel);

    this.sellBg.on('pointerover', () => this.sellBg.setFillStyle(0x4a3a10));
    this.sellBg.on('pointerout',  () => this.sellBg.setFillStyle(0x3a2a00));
    this.sellBg.on(TAP_EVENT,   () => {
      if (this.currentTower) this.onSell?.(this.currentTower);
    });

    // Respec button
    const respecW = 160;
    const respecX = sellX - sellW / 2 - 8 - respecW / 2;

    this.respecBg = scene.add.rectangle(respecX, headerCY, respecW, HEADER_H - 4, PAL.bgGiveUp)
      .setStrokeStyle(1, PAL.borderDanger)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 1);
    this.allObjects.push(this.respecBg);

    this.respecLabel = scene.add.text(respecX, headerCY, 'RESPEC', {
      fontSize: mfs(11), color: PAL.danger, fontFamily: PAL.fontBody,
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);
    this.allObjects.push(this.respecLabel);

    this.respecBg.on('pointerover', () => this.respecBg.setFillStyle(PAL.bgGiveUpHover));
    this.respecBg.on('pointerout',  () => this.respecBg.setFillStyle(PAL.bgGiveUp));
    this.respecBg.on(TAP_EVENT,   () => this.handleRespec());

    // "Select All [Type]" button — placed left of Respec
    const selectAllW = 180;
    const selectAllX = respecX - respecW / 2 - 8 - selectAllW / 2;

    this._selectAllBg = scene.add.rectangle(selectAllX, headerCY, selectAllW, HEADER_H - 4, PAL.bgStartBtn)
      .setStrokeStyle(1, PAL.borderActive)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 1);
    this.allObjects.push(this._selectAllBg);

    this._selectAllLabel = scene.add.text(selectAllX, headerCY, 'SELECT ALL TYPE', {
      fontSize: mfs(10), color: PAL.accentGreen, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);
    this.allObjects.push(this._selectAllLabel);

    this._selectAllBg.on('pointerover', () => this._selectAllBg.setFillStyle(PAL.bgStartBtnHover));
    this._selectAllBg.on('pointerout',  () => this._selectAllBg.setFillStyle(PAL.bgStartBtn));
    this._selectAllBg.on(TAP_EVENT,   () => this.onSelectAllType?.());

    // ── Three path columns ─────────────────────────────────────────────────
    const colsTop  = py + HEADER_H;
    const colsH    = UPGRADE_PANEL_HEIGHT - HEADER_H;
    const colW     = Math.floor(width / 3);

    for (let ci = 0; ci < 3; ci++) {
      const pathId = (['A', 'B', 'C'] as const)[ci];
      const colX   = ci * colW;
      const colCx  = colX + colW / 2;

      // Column separator line (only between columns)
      if (ci > 0) {
        const sep = scene.add.rectangle(colX, colsTop + colsH / 2, 1, colsH, PAL.borderInactive, 0.8)
          .setDepth(DEPTH);
        this.allObjects.push(sep);
      }

      // Path header — shifted up slightly to make room for the description row below
      const headerText = scene.add.text(colCx, colsTop + 8, '', {
        fontSize: mfs(11), color: PAL.textSecondary, fontFamily: PAL.fontBody, fontStyle: 'bold',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);
      this.allObjects.push(headerText);

      // Path description — one-line summary shown below the path name
      const descText = scene.add.text(colCx, colsTop + 20, '', {
        fontSize: mfs(9), color: PAL.textDim, fontFamily: PAL.fontBody,
        wordWrap: { width: colW - 8 },
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);
      this.allObjects.push(descText);

      // Tier rows — shifted down by COL_DESC_ROW_H to sit below the description row
      const tierPips:  Phaser.GameObjects.Arc[]  = [];
      const tierNames: Phaser.GameObjects.Text[] = [];
      const tierCosts: Phaser.GameObjects.Text[] = [];

      for (let ti = 0; ti < 5; ti++) {
        const rowY = colsTop + HEADER_H + COL_DESC_ROW_H + ti * TIER_H + TIER_H / 2;

        const pip = scene.add.arc(colX + 14, rowY, 5, 0, 360, false, PAL.borderPanel, 1)
          .setDepth(DEPTH + 2);
        this.allObjects.push(pip);

        const nameText = scene.add.text(colX + 28, rowY, '', {
          fontSize: mfs(11), color: PAL.textDim, fontFamily: PAL.fontBody,
        }).setOrigin(0, 0.5).setDepth(DEPTH + 2);
        this.allObjects.push(nameText);

        const costText = scene.add.text(colX + colW - 8, rowY, '', {
          fontSize: mfs(10), color: PAL.gold, fontFamily: PAL.fontBody,
        }).setOrigin(1, 0.5).setDepth(DEPTH + 2);
        this.allObjects.push(costText);

        tierPips.push(pip);
        tierNames.push(nameText);
        tierCosts.push(costText);
      }

      // Buy button — shifted down by COL_DESC_ROW_H along with tier rows
      const buyY  = colsTop + HEADER_H + COL_DESC_ROW_H + 5 * TIER_H + BUY_BTN_H / 2;
      const buyW  = colW - 16;

      const buyBg = scene.add.rectangle(colCx, buyY, buyW, BUY_BTN_H - 4, PAL.bgUpgradeBuy)
        .setStrokeStyle(1, PAL.borderUpgBuy)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 1);
      this.allObjects.push(buyBg);

      const buyLabel = scene.add.text(colCx, buyY, 'BUY', {
        fontSize: mfs(11), color: PAL.textSecondary, fontFamily: PAL.fontBody, fontStyle: 'bold',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);
      this.allObjects.push(buyLabel);

      buyBg.on('pointerover', () => buyBg.setFillStyle(PAL.bgUpgradeBuyHover));
      buyBg.on('pointerout',  () => buyBg.setFillStyle(PAL.bgUpgradeBuy));
      buyBg.on(TAP_EVENT,   () => this.handleBuy(pathId));

      // Locked overlay
      const lockOverlay = scene.add.rectangle(
        colCx, colsTop + colsH / 2,
        colW, colsH,
        PAL.bgLockedOverlay, 0.78,
      ).setDepth(DEPTH + 3);
      this.allObjects.push(lockOverlay);

      const lockLabel = scene.add.text(colCx, colsTop + colsH / 2, 'LOCKED', {
        fontSize: mfs(18), color: PAL.danger, fontFamily: PAL.fontBody, fontStyle: 'bold',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 4);
      this.allObjects.push(lockLabel);

      this.columns.push({
        path: pathId,
        headerText,
        descText,
        tierPips,
        tierNames,
        tierCosts,
        buyBg,
        buyLabel,
        lockOverlay,
        lockLabel,
      });
    }

    // Start hidden
    this.setVisible(false);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  isOpen(): boolean { return this._open; }

  showForTower(tower: Tower): void {
    this.currentTower = tower;
    this._open        = true;
    this._selectAllLabel.setText(`SELECT ALL ${tower.def.name.toUpperCase()}`);
    this.setVisible(true);
    this.refresh();
  }

  hide(): void {
    this.currentTower = null;
    this._open        = false;
    this.setVisible(false);
  }

  /** Refresh after a gold change or upgrade/respec. */
  refresh(): void {
    if (!this._open || !this.currentTower) return;

    const tower = this.currentTower;
    const state = this.manager.getState(tower);
    const def   = this.manager.getDef(tower.def.key);
    const gold  = this.getGold();

    this.nameTxt.setText(`${tower.def.name.toUpperCase()} UPGRADES`);

    // Current tower stats — shown in the panel header, tailored per tower type.
    const us  = tower.upgStats;
    const spd = (us.attackIntervalMs / 1000).toFixed(2);
    this.statsTxt.setText(buildStatsLine(tower.def.key, tower.def.isAura ?? false, us, spd));

    // Sell button — show refund amount
    const upgradeSpent = state?.totalSpent ?? 0;
    const sellRefund = calculateSellRefund(tower.def.cost + upgradeSpent, this.getSellRate());
    this.sellLabel.setText(`SELL  +${sellRefund}g`);

    // Respec button label
    if (state && state.totalSpent > 0) {
      const fee    = this.manager.getRespecCost(tower);
      const refund = this.manager.getRespecRefund(tower);
      this.respecLabel.setText(`RESPEC  -${fee}g / +${refund}g`);
      this.respecBg.setStrokeStyle(1, PAL.borderDanger);
    } else {
      this.respecLabel.setText('RESPEC  (none)');
      this.respecBg.setFillStyle(PAL.bgPanelDark).setStrokeStyle(1, PAL.borderPanel);
    }

    if (!state || !def) return;

    this.columns.forEach((col, ci) => {
      const pathId    = (['A', 'B', 'C'] as const)[ci];
      const pathDef   = def.paths[pathId];
      const purchased = state.tiers[pathId];
      const isLocked  = state.locked.has(pathId);
      const nextCost  = this.manager.getUpgradeCost(tower, pathId);
      const canAfford = !isLocked && nextCost > 0 && gold >= nextCost;

      // Path header
      col.headerText.setText(`PATH ${pathId}: ${pathDef.name.toUpperCase()}`);

      // Path description — only shown if the path def has one
      col.descText.setText(pathDef.description ?? '');

      // Tier rows
      for (let ti = 0; ti < 5; ti++) {
        const tierDef = pathDef.tiers[ti];
        const owned   = ti < purchased;
        const isNext  = ti === purchased && !isLocked;

        const pipColor = isLocked ? PAL.lockedPipN
          : owned      ? PAL.accentGreenN
          : isNext     ? PAL.borderActive
          :               PAL.borderPanel;
        col.tierPips[ti].setFillStyle(pipColor, 1);

        const nameColor = isLocked ? PAL.textLockedDim
          : owned       ? PAL.textPrimary
          : isNext      ? PAL.textSecondary
          :                PAL.textDim;
        col.tierNames[ti].setText(tierDef.name).setColor(nameColor);

        if (isNext) {
          col.tierCosts[ti].setText(`${tierDef.cost}g`);
        } else if (owned) {
          col.tierCosts[ti].setText('✓');
        } else {
          col.tierCosts[ti].setText('');
        }
      }

      // Buy button
      if (isLocked) {
        col.buyBg.setFillStyle(PAL.bgLockedBtn).setStrokeStyle(1, PAL.borderLockedBtn);
        col.buyLabel.setText('LOCKED').setColor(PAL.danger);
      } else if (purchased >= 5) {
        col.buyBg.setFillStyle(PAL.bgPanelDark).setStrokeStyle(1, PAL.borderInactive);
        col.buyLabel.setText('MAX TIER').setColor(PAL.textSecondary);
      } else {
        const bgColor = canAfford ? PAL.bgStartBtnPress : PAL.bgPanelDark;
        const stroke  = canAfford ? PAL.borderActive    : PAL.borderNeutral;
        const color   = canAfford ? PAL.accentGreen     : PAL.textInactive;
        col.buyBg.setFillStyle(bgColor).setStrokeStyle(1, stroke);
        col.buyLabel.setText(`BUY  ${nextCost}g`).setColor(color);
      }

      // Locked overlay visibility
      col.lockOverlay.setVisible(isLocked);
      col.lockLabel.setVisible(isLocked);
    });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private handleBuy(path: 'A' | 'B' | 'C'): void {
    // Upgrades are ALLOWED during active waves — no wave-state restriction is imposed.
    // This is a deliberate design decision: players may spend gold on upgrades at any
    // point in the run, including while creeps are in play.
    if (!this.currentTower) return;
    const tower = this.currentTower;
    const cost  = this.manager.getUpgradeCost(tower, path);
    if (cost === 0 || this.getGold() < cost) return;

    const paid = this.manager.buyUpgrade(tower, path);
    if (paid > 0) {
      this.onBuy?.(paid);
      this.refresh();
    }
  }

  private handleRespec(): void {
    if (!this.currentTower) return;
    const state = this.manager.getState(this.currentTower);
    if (!state || state.totalSpent === 0) return;

    // Capture the fee BEFORE respec resets totalSpent to 0.
    const fee    = this.manager.getRespecCost(this.currentTower);
    const refund = this.manager.respec(this.currentTower);
    if (refund > 0) {
      this.onRespec?.(refund, fee);
      this.refresh();
    }
  }

  private setVisible(visible: boolean): void {
    for (const obj of this.allObjects) {
      if ('setVisible' in obj) {
        (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(visible);
      }
    }
    // Lock overlays: only show when panel is open AND path is locked
    if (visible) {
      for (const col of this.columns) {
        const locked = this.isPathLocked(col.path);
        col.lockOverlay.setVisible(locked);
        col.lockLabel.setVisible(locked);
      }
    }
  }

  private isPathLocked(path: 'A' | 'B' | 'C'): boolean {
    return this.manager.getState(this.currentTower!)?.locked.has(path) ?? false;
  }
}
