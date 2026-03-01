import Phaser from 'phaser';
import type { Tower } from '../entities/towers/Tower';
import type { UpgradeManager } from '../systems/UpgradeManager';

// ── Layout constants ──────────────────────────────────────────────────────────

export const UPGRADE_PANEL_HEIGHT = 160;
const PANEL_HEIGHT_TOWER = 72;  // must match TowerPanel.PANEL_HEIGHT

const HEADER_H  = 22;
const TIER_H    = 18;
const BUY_BTN_H = 28;
const DEPTH     = 110;  // above TowerPanel (100)

// ── Internal structures ───────────────────────────────────────────────────────

interface PathColumnUI {
  path:        'A' | 'B' | 'C';
  headerText:  Phaser.GameObjects.Text;
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

  private _open         = false;
  private currentTower: Tower | null = null;

  private allObjects:  Phaser.GameObjects.GameObject[] = [];
  private panelBg:     Phaser.GameObjects.Rectangle;
  private nameTxt:     Phaser.GameObjects.Text;
  private respecBg:    Phaser.GameObjects.Rectangle;
  private respecLabel: Phaser.GameObjects.Text;
  private columns:     PathColumnUI[] = [];

  /** GameScene sets this so buying deducts gold and refreshes HUD. */
  onBuy?:    (cost: number) => void;
  /** GameScene sets this so respec adds back the refund gold. */
  onRespec?: (refund: number) => void;

  constructor(
    scene:   Phaser.Scene,
    manager: UpgradeManager,
    getGold: () => number,
  ) {
    this.manager = manager;
    this.getGold = getGold;

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
      0x080f08, 0.95,
    ).setStrokeStyle(1, 0x334433).setDepth(DEPTH);

    this.allObjects.push(this.panelBg);

    // ── Header row ─────────────────────────────────────────────────────────
    const headerCY = py + HEADER_H / 2;

    this.nameTxt = scene.add.text(16, headerCY, '', {
      fontSize: '14px', color: '#aaccaa', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(DEPTH + 1);
    this.allObjects.push(this.nameTxt);

    const respecW = 160;
    const respecX = width - 12 - respecW / 2;

    this.respecBg = scene.add.rectangle(respecX, headerCY, respecW, HEADER_H - 4, 0x221111)
      .setStrokeStyle(1, 0x884444)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 1);
    this.allObjects.push(this.respecBg);

    this.respecLabel = scene.add.text(respecX, headerCY, 'RESPEC', {
      fontSize: '11px', color: '#ff8888', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);
    this.allObjects.push(this.respecLabel);

    this.respecBg.on('pointerover', () => this.respecBg.setFillStyle(0x441111));
    this.respecBg.on('pointerout',  () => this.respecBg.setFillStyle(0x221111));
    this.respecBg.on('pointerup',   () => this.handleRespec());

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
        const sep = scene.add.rectangle(colX, colsTop + colsH / 2, 1, colsH, 0x224422, 0.8)
          .setDepth(DEPTH);
        this.allObjects.push(sep);
      }

      // Path header
      const headerText = scene.add.text(colCx, colsTop + 10, '', {
        fontSize: '11px', color: '#88cc88', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);
      this.allObjects.push(headerText);

      // Tier rows
      const tierPips:  Phaser.GameObjects.Arc[]  = [];
      const tierNames: Phaser.GameObjects.Text[] = [];
      const tierCosts: Phaser.GameObjects.Text[] = [];

      for (let ti = 0; ti < 5; ti++) {
        const rowY = colsTop + HEADER_H + ti * TIER_H + TIER_H / 2;

        const pip = scene.add.arc(colX + 14, rowY, 5, 0, 360, false, 0x334433, 1)
          .setDepth(DEPTH + 2);
        this.allObjects.push(pip);

        const nameText = scene.add.text(colX + 28, rowY, '', {
          fontSize: '11px', color: '#668866', fontFamily: 'monospace',
        }).setOrigin(0, 0.5).setDepth(DEPTH + 2);
        this.allObjects.push(nameText);

        const costText = scene.add.text(colX + colW - 8, rowY, '', {
          fontSize: '10px', color: '#ffcc44', fontFamily: 'monospace',
        }).setOrigin(1, 0.5).setDepth(DEPTH + 2);
        this.allObjects.push(costText);

        tierPips.push(pip);
        tierNames.push(nameText);
        tierCosts.push(costText);
      }

      // Buy button
      const buyY  = colsTop + HEADER_H + 5 * TIER_H + BUY_BTN_H / 2;
      const buyW  = colW - 16;

      const buyBg = scene.add.rectangle(colCx, buyY, buyW, BUY_BTN_H - 4, 0x002200)
        .setStrokeStyle(1, 0x226622)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 1);
      this.allObjects.push(buyBg);

      const buyLabel = scene.add.text(colCx, buyY, 'BUY', {
        fontSize: '11px', color: '#44cc44', fontFamily: 'monospace',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);
      this.allObjects.push(buyLabel);

      buyBg.on('pointerover', () => buyBg.setFillStyle(0x004400));
      buyBg.on('pointerout',  () => buyBg.setFillStyle(0x002200));
      buyBg.on('pointerup',   () => this.handleBuy(pathId));

      // Locked overlay
      const lockOverlay = scene.add.rectangle(
        colCx, colsTop + colsH / 2,
        colW, colsH,
        0x220000, 0.78,
      ).setDepth(DEPTH + 3);
      this.allObjects.push(lockOverlay);

      const lockLabel = scene.add.text(colCx, colsTop + colsH / 2, 'LOCKED', {
        fontSize: '18px', color: '#ff4444', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 4);
      this.allObjects.push(lockLabel);

      this.columns.push({
        path: pathId,
        headerText,
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

    // Respec button label
    if (state && state.totalSpent > 0) {
      const fee    = this.manager.getRespecCost(tower);
      const refund = this.manager.getRespecRefund(tower);
      this.respecLabel.setText(`RESPEC  -${fee}g / +${refund}g`);
      this.respecBg.setStrokeStyle(1, 0x884444);
    } else {
      this.respecLabel.setText('RESPEC  (none)');
      this.respecBg.setFillStyle(0x111111).setStrokeStyle(1, 0x333333);
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

      // Tier rows
      for (let ti = 0; ti < 5; ti++) {
        const tierDef = pathDef.tiers[ti];
        const owned   = ti < purchased;
        const isNext  = ti === purchased && !isLocked;

        const pipColor = isLocked ? 0x441111
          : owned      ? 0x44ee44
          : isNext     ? 0x88aa88
          :               0x223322;
        col.tierPips[ti].setFillStyle(pipColor, 1);

        const nameColor = isLocked ? '#663333'
          : owned       ? '#88dd88'
          : isNext      ? '#aaccaa'
          :                '#446644';
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
        col.buyBg.setFillStyle(0x1a0000).setStrokeStyle(1, 0x442222);
        col.buyLabel.setText('LOCKED').setColor('#884444');
      } else if (purchased >= 5) {
        col.buyBg.setFillStyle(0x001100).setStrokeStyle(1, 0x224422);
        col.buyLabel.setText('MAX TIER').setColor('#448844');
      } else {
        const bgColor = canAfford ? 0x003300 : 0x001100;
        const stroke  = canAfford ? 0x22aa22 : 0x224422;
        const color   = canAfford ? '#44ff44' : '#446644';
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

    const refund = this.manager.respec(this.currentTower);
    if (refund > 0) {
      this.onRespec?.(refund);
      this.refresh();
    }
  }

  private setVisible(visible: boolean): void {
    for (const obj of this.allObjects) {
      (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(visible);
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

/** Combined bottom UI height when upgrade panel is open/closed. */
export function getBottomUIHeight(upgradePanelOpen: boolean): number {
  return PANEL_HEIGHT_TOWER + (upgradePanelOpen ? UPGRADE_PANEL_HEIGHT : 0);
}
