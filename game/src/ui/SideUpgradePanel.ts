import Phaser from 'phaser';
import type { Tower } from '../entities/towers/Tower';
import type { UpgradeManager } from '../systems/UpgradeManager';
import { calculateSellRefund } from '../systems/EconomyManager';
import { MobileManager, TAP_EVENT, mfs } from '../systems/MobileManager';
import { PANEL_HEIGHT as PANEL_HEIGHT_TOWER } from './TowerPanel';
import { SAFE_INSET } from './HUD';
import { PAL } from './palette';
import { buildStatsLine } from './statsLine';
import {
  TargetingPriority,
  ALL_PRIORITIES,
  PRIORITY_LABEL,
} from '../data/targeting';

// ── Layout constants ──────────────────────────────────────────────────────────

const _IS_MOBILE = MobileManager.getInstance().isMobile();

const HUD_HEIGHT    = _IS_MOBILE ? 72 : 48;
const PANEL_PAD     = 8;
const DEPTH         = 110;
const HEADER_H      = 40;
const BTN_ROW_H     = 44;
const SECTION_GAP   = 10;
const TIER_H        = 24;
const PATH_HEADER_H = 24;
const PATH_DESC_H   = 18;
const BUY_BTN_H     = 44;
const BEHAVIOR_ROW_H = 36;

// ── Toggle label definitions (from BehaviorPanel) ─────────────────────────────

interface ToggleDef { on: string; off: string; }

const TOGGLE_DEFS: Partial<Record<string, ToggleDef>> = {
  'rock-hurler': { on: 'ARMOR FOCUS  ON', off: 'ARMOR FOCUS  OFF' },
  frost:         { on: 'CHILL ONLY   ON', off: 'CHILL ONLY   OFF' },
  poison:        { on: '1-STACK CAP  ON', off: '1-STACK CAP  OFF' },
  tesla:         { on: 'CHAIN→EXIT   ON', off: 'CHAIN→EXIT  OFF'  },
};

// ── Internal structures ───────────────────────────────────────────────────────

interface PathColumnUI {
  path:           'A' | 'B' | 'C';
  headerText:     Phaser.GameObjects.Text;
  descText:       Phaser.GameObjects.Text;
  tierPips:       Phaser.GameObjects.Arc[];
  tierNames:      Phaser.GameObjects.Text[];
  tierCosts:      Phaser.GameObjects.Text[];
  tierSeparators: Phaser.GameObjects.Text[];   // 4 "›" between the 5 tiers
  buyBg:          Phaser.GameObjects.Rectangle;
  buyLabel:       Phaser.GameObjects.Text;
  lockOverlay:    Phaser.GameObjects.Rectangle;
  lockLabel:      Phaser.GameObjects.Text;
  separator:      Phaser.GameObjects.Rectangle;
}

interface PriorityBtn {
  priority: TargetingPriority;
  bg:       Phaser.GameObjects.Rectangle;
  label:    Phaser.GameObjects.Text;
}

// ── SideUpgradePanel ──────────────────────────────────────────────────────────

/**
 * Right-side upgrade + behavior panel. Vertically stacked paths with scrolling.
 * Takes up 50% of screen width on the right.
 */
export class SideUpgradePanel {
  private readonly manager: UpgradeManager;
  private readonly getGold: () => number;
  private readonly getSellRate: () => number;

  private _open = false;
  private currentTower: Tower | null = null;

  // Panel bounds
  private readonly panelX: number;
  private readonly panelY: number;
  private readonly panelW: number;
  private readonly panelH: number;

  // Background (not in scroll container)
  private panelBg: Phaser.GameObjects.Rectangle;

  // Scroll state
  private scrollContainer: Phaser.GameObjects.Container;
  private scrollMask: Phaser.Display.Masks.GeometryMask;
  private _scrollY = 0;
  private _maxScroll = 0;
  private _dragStartY = 0;
  private _dragScrollStart = 0;
  private _isDragging = false;
  private _contentH = 0;

  // Header elements (inside scroll container)
  private nameTxt!:         Phaser.GameObjects.Text;
  private statsTxt!:        Phaser.GameObjects.Text;
  private sellBg!:          Phaser.GameObjects.Rectangle;
  private sellLabel!:       Phaser.GameObjects.Text;
  private respecBg!:        Phaser.GameObjects.Rectangle;
  private respecLabel!:     Phaser.GameObjects.Text;
  private _selectAllBg!:    Phaser.GameObjects.Rectangle;
  private _selectAllLabel!: Phaser.GameObjects.Text;

  // Behavior elements
  private readonly priorityBtns: PriorityBtn[] = [];
  private readonly row1Objects: Phaser.GameObjects.GameObject[] = [];
  private toggleBg!:  Phaser.GameObjects.Rectangle;
  private toggleTxt!: Phaser.GameObjects.Text;
  private readonly row2Objects: Phaser.GameObjects.GameObject[] = [];
  private passiveLbl!: Phaser.GameObjects.Text;

  // Upgrade path columns
  private columns: PathColumnUI[] = [];
  private _pathsStartY = 0;
  private _behaviorStartY = 0;  // y where behavior section begins

  // Multi-tower batch mode
  private _isMultiMode = false;

  // Callbacks (same interface as UpgradePanel)
  onSell?: (tower: Tower) => void;
  onBuy?:  (cost: number) => void;
  onSelectAllType?: () => void;
  onRespec?: (refund: number, fee: number) => void;
  onBuyBatch?: (path: 'A' | 'B' | 'C') => void;
  onDeselectAll?: () => void;

  constructor(
    scene: Phaser.Scene,
    manager: UpgradeManager,
    getGold: () => number,
    getSellRate: () => number = () => 0.7,
  ) {
    this.manager = manager;
    this.getGold = getGold;
    this.getSellRate = getSellRate;

    const { width, height } = scene.scale;

    // Panel occupies right 50% of screen, from HUD to tower bar
    this.panelW = Math.floor(width * 0.28);
    this.panelX = width - this.panelW - SAFE_INSET;
    this.panelY = HUD_HEIGHT;
    this.panelH = height - HUD_HEIGHT - PANEL_HEIGHT_TOWER;

    // ── Background (fixed, not scrolled) ──────────────────────────────────
    this.panelBg = scene.add.rectangle(
      this.panelX + this.panelW / 2,
      this.panelY + this.panelH / 2,
      this.panelW,
      this.panelH,
      PAL.bgPanelDark, 0.95,
    ).setStrokeStyle(1, PAL.borderPanel).setDepth(DEPTH);

    // ── Scroll container ──────────────────────────────────────────────────
    this.scrollContainer = scene.add.container(this.panelX, this.panelY);
    this.scrollContainer.setDepth(DEPTH + 1);

    // Geometry mask to clip scroll content to panel bounds
    const maskShape = scene.add.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(this.panelX, this.panelY, this.panelW, this.panelH);
    maskShape.setVisible(false);
    this.scrollMask = new Phaser.Display.Masks.GeometryMask(scene, maskShape);
    this.scrollContainer.setMask(this.scrollMask);

    // Build all content inside the scroll container
    let cy = PANEL_PAD; // current y cursor within container

    // ── Header ────────────────────────────────────────────────────────────
    cy = this._buildHeader(scene, cy);

    // ── Action buttons row ────────────────────────────────────────────────
    cy = this._buildActionButtons(scene, cy);

    cy += SECTION_GAP;

    // ── Behavior section ──────────────────────────────────────────────────
    this._behaviorStartY = cy;
    cy = this._buildBehaviorSection(scene, cy);

    cy += SECTION_GAP;

    // ── Three upgrade paths (horizontal tier flow with wrapping) ──────────
    this._pathsStartY = cy;
    for (let ci = 0; ci < 3; ci++) {
      cy = this._buildPathSection(scene, cy, ci);
      if (ci < 2) cy += SECTION_GAP;
    }

    cy += PANEL_PAD;
    this._contentH = cy;

    // ── Scroll interaction (on the background) ────────────────────────────
    this.panelBg.setInteractive({ draggable: false, useHandCursor: false });
    this.panelBg.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this._isDragging = true;
      this._dragStartY = ptr.y;
      this._dragScrollStart = this._scrollY;
    });
    scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!this._isDragging || !this._open) return;
      const dy = ptr.y - this._dragStartY;
      this._setScroll(this._dragScrollStart - dy);
    });
    scene.input.on('pointerup', () => { this._isDragging = false; });

    // Mouse wheel scroll within panel
    scene.input.on('wheel', (_ptr: Phaser.Input.Pointer, _gos: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      if (!this._open) return;
      const ptr = scene.input.activePointer;
      if (ptr.x >= this.panelX && ptr.x <= this.panelX + this.panelW &&
          ptr.y >= this.panelY && ptr.y <= this.panelY + this.panelH) {
        this._setScroll(this._scrollY + dy * 0.5);
      }
    });

    // Start hidden
    this.setVisible(false);
  }

  // ── Public API (matches UpgradePanel + BehaviorPanel interface) ──────────

  isOpen(): boolean { return this._open; }

  showForTower(tower: Tower): void {
    this.currentTower = tower;
    this._isMultiMode = false;
    this._open = true;
    this._selectAllLabel.setText('SELECT ALL').setColor(PAL.accentGreen);
    this._selectAllBg.setFillStyle(PAL.bgStartBtn).setStrokeStyle(1, PAL.borderActive);
    this._scrollY = 0;
    this.scrollContainer.setPosition(this.panelX, this.panelY);
    this.setVisible(true);
    this.refresh();
  }

  hide(): void {
    this.currentTower = null;
    this._isMultiMode = false;
    this._open = false;
    this.setVisible(false);
  }

  /** Show multi-tower batch upgrade mode (same type, 2+ towers). */
  showMulti(towers: Tower[]): void {
    this._isMultiMode = true;
    this.currentTower = towers[0] ?? null;
    this._open = true;
    this._scrollY = 0;
    this.scrollContainer.setPosition(this.panelX, this.panelY);
    this.setVisible(true);
    this.refreshMulti(towers);
  }

  /** Re-render multi-tower batch data (called after gold change or batch buy). */
  refreshMulti(towers: Tower[]): void {
    if (!this._open || !this._isMultiMode) return;
    this.currentTower = towers[0] ?? null;
    const tower = this.currentTower;
    if (!tower) return;

    const count = towers.length;
    const typeName = tower.def.name.toUpperCase();

    // ── Header ──────────────────────────────────────────────────────────
    this.nameTxt.setText(`${count} ${typeName} TOWERS`);
    this.statsTxt.setText('Batch upgrade — select a path to buy for all');

    // SELECT ALL → DESELECT ALL
    this._selectAllLabel.setText('DESELECT');
    this._selectAllBg.setFillStyle(0x200808).setStrokeStyle(1, PAL.borderDanger);
    this._selectAllLabel.setColor(PAL.danger);

    // Hide sell/respec (not applicable in batch mode)
    this.respecBg.setVisible(false);
    this.respecLabel.setVisible(false);
    this.sellBg.setVisible(false);
    this.sellLabel.setVisible(false);

    // Hide behavior section entirely
    this.passiveLbl.setVisible(false);
    for (const obj of this.row1Objects) {
      (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
    }
    for (const obj of this.row2Objects) {
      (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
    }

    // ── Upgrade paths (batch costs) ─────────────────────────────────────
    const def = this.manager.getDef(tower.def.key);
    if (!def) return;
    const gold = this.getGold();

    this.columns.forEach((col, ci) => {
      const pathId  = (['A', 'B', 'C'] as const)[ci];
      const pathDef = def.paths[pathId];

      // Check if ANY tower has this path locked
      const anyLocked = towers.some(t =>
        this.manager.getState(t)?.locked.has(pathId) ?? false,
      );

      col.headerText.setText(`PATH ${pathId}: ${pathDef.name.toUpperCase()}`);
      col.descText.setText('');

      // Compute batch: how many can upgrade, total cost
      let totalCost = 0;
      let eligibleCount = 0;
      for (const t of towers) {
        const cost = this.manager.getUpgradeCost(t, pathId);
        if (cost > 0 && !anyLocked) {
          totalCost += cost;
          eligibleCount++;
        }
      }

      // Show tier status — find min and max tiers across selection
      const tiers = towers.map(t => this.manager.getState(t)?.tiers[pathId] ?? 0);
      const minTier = Math.min(...tiers);
      const maxTier = Math.max(...tiers);

      for (let ti = 0; ti < 5; ti++) {
        const tierDef = pathDef.tiers[ti];
        const allOwned = ti < minTier;
        const someOwned = ti < maxTier;

        const pipColor = anyLocked ? PAL.lockedPipN
          : allOwned   ? PAL.accentGreenN
          : someOwned  ? PAL.borderActive
          :              PAL.borderPanel;
        col.tierPips[ti].setFillStyle(pipColor, 1);

        const nameColor = anyLocked ? PAL.textLockedDim
          : allOwned    ? PAL.textPrimary
          : someOwned   ? PAL.textSecondary
          :               PAL.textDim;
        col.tierNames[ti].setText(tierDef.name).setColor(nameColor);
        col.tierCosts[ti].setText(allOwned ? '✓' : '');
      }

      // Buy button — show total batch cost
      if (anyLocked) {
        col.buyBg.setFillStyle(PAL.bgLockedBtn).setStrokeStyle(1, PAL.borderLockedBtn);
        col.buyLabel.setText('LOCKED').setColor(PAL.danger);
      } else if (eligibleCount === 0) {
        col.buyBg.setFillStyle(PAL.bgPanelDark).setStrokeStyle(1, PAL.borderInactive);
        col.buyLabel.setText('ALL MAXED').setColor(PAL.textSecondary);
      } else {
        const canAfford = gold >= totalCost;
        const bgColor = canAfford ? PAL.bgStartBtnPress : PAL.bgPanelDark;
        const stroke  = canAfford ? PAL.borderActive     : PAL.borderNeutral;
        const color   = canAfford ? PAL.accentGreen      : PAL.textInactive;
        col.buyBg.setFillStyle(bgColor).setStrokeStyle(1, stroke);
        col.buyLabel.setText(`BUY ALL  ${totalCost}g`).setColor(color);
      }

      col.lockOverlay.setVisible(anyLocked);
      col.lockLabel.setVisible(anyLocked);
    });

    this._reflowPaths();
  }

  refresh(): void {
    if (!this._open || !this.currentTower) return;

    const tower = this.currentTower;

    // ── Header ────────────────────────────────────────────────────────────
    this.nameTxt.setText(`${tower.def.name.toUpperCase()} UPGRADES`);

    const us  = tower.upgStats;
    const spd = (us.attackIntervalMs / 1000).toFixed(2);
    this.statsTxt.setText(buildStatsLine(tower.def.key, tower.def.isAura ?? false, us, spd));

    // Restore sell/respec visibility (hidden in multi mode)
    this.sellBg.setVisible(true);
    this.sellLabel.setVisible(true);
    this.respecBg.setVisible(true);
    this.respecLabel.setVisible(true);

    // Sell button
    const state = this.manager.getState(tower);
    const upgradeSpent = state?.totalSpent ?? 0;
    const sellRefund = calculateSellRefund(tower.def.cost + upgradeSpent, this.getSellRate());
    this.sellLabel.setText(`SELL  +${sellRefund}g`);

    // Respec button
    if (state && state.totalSpent > 0) {
      const fee    = this.manager.getRespecCost(tower);
      const refund = this.manager.getRespecRefund(tower);
      this.respecLabel.setText(`RESPEC  -${fee}g / +${refund}g`);
      this.respecBg.setStrokeStyle(1, PAL.borderDanger);
    } else {
      this.respecLabel.setText('RESPEC  (none)');
      this.respecBg.setFillStyle(PAL.bgPanelDark).setStrokeStyle(1, PAL.borderPanel);
    }

    // ── Behavior ──────────────────────────────────────────────────────────
    this._refreshBehavior();

    // ── Upgrade paths ─────────────────────────────────────────────────────
    if (!state) return;
    const def = this.manager.getDef(tower.def.key);
    if (!def) return;
    const gold = this.getGold();

    this.columns.forEach((col, ci) => {
      const pathId    = (['A', 'B', 'C'] as const)[ci];
      const pathDef   = def.paths[pathId];
      const purchased = state.tiers[pathId];
      const isLocked  = state.locked.has(pathId);
      const nextCost  = this.manager.getUpgradeCost(tower, pathId);
      const canAfford = !isLocked && nextCost > 0 && gold >= nextCost;

      col.headerText.setText(`PATH ${pathId}: ${pathDef.name.toUpperCase()}`);
      col.descText.setText(pathDef.description ?? '');

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
        const stroke  = canAfford ? PAL.borderActive     : PAL.borderNeutral;
        const color   = canAfford ? PAL.accentGreen      : PAL.textInactive;
        col.buyBg.setFillStyle(bgColor).setStrokeStyle(1, stroke);
        col.buyLabel.setText(`BUY  ${nextCost}g`).setColor(color);
      }

      col.lockOverlay.setVisible(isLocked);
      col.lockLabel.setVisible(isLocked);
    });

    // Reflow tier chips horizontally and recompute content height
    this._reflowPaths();
  }

  // ── Build helpers (called once in constructor) ──────────────────────────

  private _buildHeader(scene: Phaser.Scene, y: number): number {

    this.nameTxt = scene.add.text(PANEL_PAD, y, '', {
      fontSize: mfs(14), color: PAL.textPrimary, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0, 0);
    this.scrollContainer.add(this.nameTxt);

    this.statsTxt = scene.add.text(PANEL_PAD, y + 20, '', {
      fontSize: mfs(10), color: PAL.textSecondary, fontFamily: PAL.fontBody,
    }).setOrigin(0, 0);
    this.scrollContainer.add(this.statsTxt);

    return y + HEADER_H;
  }

  private _buildActionButtons(scene: Phaser.Scene, y: number): number {
    const w = this.panelW;
    const btnH = BTN_ROW_H - 4;
    const gap = 6;

    // Three buttons in a row: SELECT ALL | RESPEC | SELL
    const totalGap = gap * 2;
    const btnW = Math.floor((w - PANEL_PAD * 2 - totalGap) / 3);

    let bx = PANEL_PAD;

    // Select All
    this._selectAllBg = scene.add.rectangle(bx + btnW / 2, y + btnH / 2, btnW, btnH, PAL.bgStartBtn)
      .setStrokeStyle(1, PAL.borderActive)
      .setInteractive({ useHandCursor: true });
    this.scrollContainer.add(this._selectAllBg);

    this._selectAllLabel = scene.add.text(bx + btnW / 2, y + btnH / 2, 'SELECT ALL', {
      fontSize: mfs(10), color: PAL.accentGreen, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    this.scrollContainer.add(this._selectAllLabel);

    this._selectAllBg.on(TAP_EVENT, () => {
      if (this._isMultiMode) {
        this.onDeselectAll?.();
      } else {
        this.onSelectAllType?.();
      }
    });

    bx += btnW + gap;

    // Respec
    this.respecBg = scene.add.rectangle(bx + btnW / 2, y + btnH / 2, btnW, btnH, PAL.bgGiveUp)
      .setStrokeStyle(1, PAL.borderDanger)
      .setInteractive({ useHandCursor: true });
    this.scrollContainer.add(this.respecBg);

    this.respecLabel = scene.add.text(bx + btnW / 2, y + btnH / 2, 'RESPEC', {
      fontSize: mfs(10), color: PAL.danger, fontFamily: PAL.fontBody,
    }).setOrigin(0.5, 0.5);
    this.scrollContainer.add(this.respecLabel);

    this.respecBg.on(TAP_EVENT, () => this._handleRespec());

    bx += btnW + gap;

    // Sell
    this.sellBg = scene.add.rectangle(bx + btnW / 2, y + btnH / 2, btnW, btnH, 0x3a2a00)
      .setStrokeStyle(2, 0xdaa520)
      .setInteractive({ useHandCursor: true });
    this.scrollContainer.add(this.sellBg);

    this.sellLabel = scene.add.text(bx + btnW / 2, y + btnH / 2, 'SELL', {
      fontSize: mfs(11), color: PAL.gold, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    this.scrollContainer.add(this.sellLabel);

    this.sellBg.on(TAP_EVENT, () => {
      if (this.currentTower) this.onSell?.(this.currentTower);
    });

    return y + BTN_ROW_H;
  }

  private _buildBehaviorSection(scene: Phaser.Scene, y: number): number {
    const w = this.panelW;
    const gap = 4;
    const COLS = 3; // 3 buttons per row

    // ── Header row: "TARGET"
    const headerLbl = scene.add.text(PANEL_PAD, y + PATH_HEADER_H / 2, 'TARGET', {
      fontSize: mfs(12), color: PAL.textSecondary, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.scrollContainer.add(headerLbl);
    this.row1Objects.push(headerLbl);
    y += PATH_HEADER_H;

    // Buttons span full width (no label column)
    const btnAreaW = w - PANEL_PAD * 2;
    const btnW = Math.floor((btnAreaW - gap * (COLS - 1)) / COLS);

    // ── Row 1: first 3 priorities (FIRST | LAST | STRONG)
    const row1Y = y;

    for (let i = 0; i < COLS; i++) {
      const priority = ALL_PRIORITIES[i];
      const bx = PANEL_PAD + i * (btnW + gap) + btnW / 2;

      const btnBg = scene.add.rectangle(bx, row1Y + BEHAVIOR_ROW_H / 2, btnW, BEHAVIOR_ROW_H - 4, 0x0a1a08)
        .setStrokeStyle(1, PAL.borderInactive)
        .setInteractive({ useHandCursor: true });
      this.scrollContainer.add(btnBg);
      this.row1Objects.push(btnBg);

      const btnTxt = scene.add.text(bx, row1Y + BEHAVIOR_ROW_H / 2, PRIORITY_LABEL[priority], {
        fontSize: mfs(10), color: PAL.textDim, fontFamily: PAL.fontBody, fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);
      this.scrollContainer.add(btnTxt);
      this.row1Objects.push(btnTxt);

      this.priorityBtns.push({ priority, bg: btnBg, label: btnTxt });
      btnBg.on(TAP_EVENT, () => this._handlePrioritySelect(priority));
    }

    y += BEHAVIOR_ROW_H;

    // ── Row 2: remaining 3 priorities (WEAK | NEAR | BUFFED)
    const row2Y = y;

    for (let i = 0; i < COLS && i + COLS < ALL_PRIORITIES.length; i++) {
      const priority = ALL_PRIORITIES[i + COLS];
      const bx = PANEL_PAD + i * (btnW + gap) + btnW / 2;

      const btnBg = scene.add.rectangle(bx, row2Y + BEHAVIOR_ROW_H / 2, btnW, BEHAVIOR_ROW_H - 4, 0x0a1a08)
        .setStrokeStyle(1, PAL.borderInactive)
        .setInteractive({ useHandCursor: true });
      this.scrollContainer.add(btnBg);
      this.row1Objects.push(btnBg);

      const btnTxt = scene.add.text(bx, row2Y + BEHAVIOR_ROW_H / 2, PRIORITY_LABEL[priority], {
        fontSize: mfs(10), color: PAL.textDim, fontFamily: PAL.fontBody, fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);
      this.scrollContainer.add(btnTxt);
      this.row1Objects.push(btnTxt);

      this.priorityBtns.push({ priority, bg: btnBg, label: btnTxt });
      btnBg.on(TAP_EVENT, () => this._handlePrioritySelect(priority));
    }

    y += BEHAVIOR_ROW_H;

    // ── Row 3: tower-type behavioral toggle ──────────────────────────────
    const row3Y = y;

    const row3Lbl = scene.add.text(PANEL_PAD, row3Y + BEHAVIOR_ROW_H / 2, 'TOGGLE:', {
      fontSize: mfs(11), color: PAL.textSecondary, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.scrollContainer.add(row3Lbl);
    this.row2Objects.push(row3Lbl);

    const toggleW = Math.floor(w - PANEL_PAD * 2);
    const toggleX = PANEL_PAD + toggleW / 2;

    this.toggleBg = scene.add.rectangle(toggleX, row3Y + BEHAVIOR_ROW_H / 2, toggleW, BEHAVIOR_ROW_H - 4, 0x0a1a14)
      .setStrokeStyle(1, PAL.borderInactive)
      .setInteractive({ useHandCursor: true });
    this.scrollContainer.add(this.toggleBg);
    this.row2Objects.push(this.toggleBg);

    this.toggleTxt = scene.add.text(toggleX, row3Y + BEHAVIOR_ROW_H / 2, '', {
      fontSize: mfs(11), color: PAL.textSecondary, fontFamily: PAL.fontBody,
    }).setOrigin(0.5, 0.5);
    this.scrollContainer.add(this.toggleTxt);
    this.row2Objects.push(this.toggleTxt);

    this.toggleBg.on(TAP_EVENT, () => this._handleToggle());

    y += BEHAVIOR_ROW_H;

    // ── Passive label (Aura towers) ────────────────────────────────────
    this.passiveLbl = scene.add.text(w / 2, row1Y + BEHAVIOR_ROW_H, 'Passive — no targeting', {
      fontSize: mfs(11), color: PAL.textDim, fontFamily: PAL.fontBody, fontStyle: 'italic',
    }).setOrigin(0.5, 0.5);
    this.scrollContainer.add(this.passiveLbl);

    return y;
  }

  private _buildPathSection(scene: Phaser.Scene, y: number, ci: number): number {
    const w = this.panelW;
    const pathId = (['A', 'B', 'C'] as const)[ci];

    // Separator line
    const sep = scene.add.rectangle(w / 2, y, w - PANEL_PAD * 2, 1, PAL.borderInactive, 0.6);
    this.scrollContainer.add(sep);
    y += 4;

    // Path header
    const headerText = scene.add.text(PANEL_PAD, y + PATH_HEADER_H / 2, '', {
      fontSize: mfs(12), color: PAL.textSecondary, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.scrollContainer.add(headerText);
    y += PATH_HEADER_H;

    // Path description
    const descText = scene.add.text(PANEL_PAD, y, '', {
      fontSize: mfs(9), color: PAL.textDim, fontFamily: PAL.fontBody,
      wordWrap: { width: w - PANEL_PAD * 2 },
    }).setOrigin(0, 0);
    this.scrollContainer.add(descText);
    y += PATH_DESC_H;

    // 5 tier chips (placeholder positions — _reflowPaths repositions them)
    const tierPips:       Phaser.GameObjects.Arc[]  = [];
    const tierNames:      Phaser.GameObjects.Text[] = [];
    const tierCosts:      Phaser.GameObjects.Text[] = [];
    const tierSeparators: Phaser.GameObjects.Text[] = [];

    for (let ti = 0; ti < 5; ti++) {
      const pip = scene.add.arc(0, 0, 4, 0, 360, false, PAL.borderPanel, 1);
      this.scrollContainer.add(pip);

      const nameText = scene.add.text(0, 0, '', {
        fontSize: mfs(10), color: PAL.textDim, fontFamily: PAL.fontBody,
      }).setOrigin(0, 0.5);
      this.scrollContainer.add(nameText);

      const costText = scene.add.text(0, 0, '', {
        fontSize: mfs(9), color: PAL.gold, fontFamily: PAL.fontBody,
      }).setOrigin(0, 0.5);
      this.scrollContainer.add(costText);

      tierPips.push(pip);
      tierNames.push(nameText);
      tierCosts.push(costText);

      if (ti < 4) {
        const sepTxt = scene.add.text(0, 0, '›', {
          fontSize: mfs(10), color: PAL.textDim, fontFamily: PAL.fontBody,
        }).setOrigin(0, 0.5);
        this.scrollContainer.add(sepTxt);
        tierSeparators.push(sepTxt);
      }
    }

    // Reserve rough space for tiers (2 rows estimate)
    y += TIER_H * 2;

    // Buy button — half-width, right-aligned (left half = safe scroll area)
    const buyW = Math.floor((w - PANEL_PAD * 2) / 2);
    const buyX = w - PANEL_PAD - buyW / 2;
    const buyBg = scene.add.rectangle(buyX, y + BUY_BTN_H / 2, buyW, BUY_BTN_H - 4, PAL.bgUpgradeBuy)
      .setStrokeStyle(1, PAL.borderUpgBuy)
      .setInteractive({ useHandCursor: true });
    this.scrollContainer.add(buyBg);

    const buyLabel = scene.add.text(buyX, y + BUY_BTN_H / 2, 'BUY', {
      fontSize: mfs(12), color: PAL.textSecondary, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    this.scrollContainer.add(buyLabel);

    buyBg.on(TAP_EVENT, () => this._handleBuy(pathId));
    y += BUY_BTN_H;

    // Locked overlay (placeholder — _reflowPaths repositions & resizes)
    const lockOverlay = scene.add.rectangle(
      w / 2, y / 2, w - PANEL_PAD * 2, y, PAL.bgLockedOverlay, 0.78,
    );
    this.scrollContainer.add(lockOverlay);

    const lockLabel = scene.add.text(w / 2, y / 2, 'LOCKED', {
      fontSize: mfs(16), color: PAL.danger, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    this.scrollContainer.add(lockLabel);

    this.columns.push({
      path: pathId, headerText, descText, tierPips, tierNames, tierCosts,
      tierSeparators, buyBg, buyLabel, lockOverlay, lockLabel, separator: sep,
    });

    return y;
  }

  // ── Scroll ──────────────────────────────────────────────────────────────

  private _setScroll(val: number): void {
    this._scrollY = Phaser.Math.Clamp(val, 0, this._maxScroll);
    this.scrollContainer.setPosition(this.panelX, this.panelY - this._scrollY);
  }

  // ── Reflow paths (horizontal tier layout with wrapping) ─────────────────

  private _reflowPaths(): void {
    const w = this.panelW;
    const maxX = w - PANEL_PAD;

    // When behavior rows are hidden (aura passive or multi-tower mode),
    // start paths right after the header instead of after the full behavior block.
    const isAura = this.currentTower?.def.isAura ?? false;
    let cy: number;
    if (this._isMultiMode) {
      // Multi mode: no behavior section at all — start right after action buttons
      cy = this._behaviorStartY + SECTION_GAP;
    } else if (isAura) {
      const lblY = this._behaviorStartY + BEHAVIOR_ROW_H / 2;
      this.passiveLbl.setPosition(this.passiveLbl.x, lblY);
      cy = this._behaviorStartY + BEHAVIOR_ROW_H + SECTION_GAP;
    } else {
      cy = this._pathsStartY;
    }

    const PIP_R   = 4;
    const PIP_GAP = 4;   // gap after pip
    const COST_GAP = 3;  // gap between name and cost
    const SEP_GAP = 5;   // gap around "›" separator
    const CHIP_GAP = 4;  // gap after each chip

    for (let ci = 0; ci < this.columns.length; ci++) {
      const col = this.columns[ci];
      if (ci > 0) cy += SECTION_GAP;

      const sectionTop = cy;

      // Separator line
      col.separator.setPosition(w / 2, cy);
      cy += 4;

      // Header
      col.headerText.setPosition(PANEL_PAD, cy + PATH_HEADER_H / 2);
      cy += PATH_HEADER_H;

      // Description — use actual rendered height (may be multi-line)
      col.descText.setPosition(PANEL_PAD, cy);
      const descH = col.descText.text ? Math.max(PATH_DESC_H, col.descText.height + 4) : 0;
      cy += descH;

      // Tiers: flow horizontally with wrapping
      let x = PANEL_PAD;
      let rowY = cy + TIER_H / 2;

      for (let ti = 0; ti < 5; ti++) {
        // Measure this chip: pip + gap + name + (gap + cost if present)
        const nameW = col.tierNames[ti].width;
        const costW = col.tierCosts[ti].text ? col.tierCosts[ti].width : 0;
        const chipW = PIP_R * 2 + PIP_GAP + nameW + (costW > 0 ? COST_GAP + costW : 0);

        if (ti > 0) {
          // Check if separator + chip fits on current line
          const sepTxt = col.tierSeparators[ti - 1];
          const sepW = sepTxt.width;
          const needed = SEP_GAP + sepW + SEP_GAP + chipW;

          if (x + needed > maxX) {
            // Wrap to next line
            x = PANEL_PAD;
            rowY += TIER_H;
          }

          // Position separator
          sepTxt.setPosition(x + SEP_GAP, rowY);
          x += SEP_GAP + sepW + SEP_GAP;
        } else if (x + chipW > maxX) {
          x = PANEL_PAD;
          rowY += TIER_H;
        }

        // Position pip
        col.tierPips[ti].setPosition(x + PIP_R, rowY);
        x += PIP_R * 2 + PIP_GAP;

        // Position name
        col.tierNames[ti].setPosition(x, rowY);
        x += nameW;

        // Position cost
        if (costW > 0) {
          x += COST_GAP;
          col.tierCosts[ti].setPosition(x, rowY);
          x += costW;
        } else {
          col.tierCosts[ti].setPosition(x, rowY);
        }

        x += CHIP_GAP;
      }

      cy = rowY + TIER_H / 2 + 6; // bottom of tier rows + 6px buffer

      // Buy button — half-width, right-aligned
      const buyW = Math.floor((w - PANEL_PAD * 2) / 2);
      const buyX = w - PANEL_PAD - buyW / 2;
      const buyY = cy + BUY_BTN_H / 2;
      col.buyBg.setPosition(buyX, buyY);
      col.buyBg.setSize(buyW, BUY_BTN_H - 4);
      col.buyLabel.setPosition(buyX, buyY);
      cy += BUY_BTN_H;

      // Lock overlay — spans from section top to bottom
      const sectionH = cy - sectionTop;
      col.lockOverlay.setPosition(w / 2, sectionTop + sectionH / 2);
      col.lockOverlay.setSize(w - PANEL_PAD * 2, sectionH);
      col.lockLabel.setPosition(w / 2, sectionTop + sectionH / 2);
    }

    cy += PANEL_PAD;
    this._contentH = cy;
    this._maxScroll = Math.max(0, this._contentH - this.panelH);
  }

  // ── Behavior refresh ────────────────────────────────────────────────────

  private _refreshBehavior(): void {
    if (!this.currentTower) return;
    const tower = this.currentTower;
    const isAura    = tower.def.isAura ?? false;
    const toggleDef = TOGGLE_DEFS[tower.def.key];
    const hasToggle = !isAura && toggleDef !== undefined;

    this.passiveLbl.setVisible(isAura);

    for (const obj of this.row1Objects) {
      (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(!isAura);
    }
    for (const obj of this.row2Objects) {
      (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(hasToggle);
    }

    if (isAura) return;

    // Priority buttons
    for (const btn of this.priorityBtns) {
      const active = btn.priority === tower.priority;
      btn.bg.setFillStyle(active ? PAL.bgStartBtn : 0x0a1a08);
      btn.bg.setStrokeStyle(1, active ? PAL.borderActive : PAL.borderInactive);
      btn.label.setColor(active ? PAL.accentGreen : PAL.textDim);
    }

    // Toggle button
    if (!hasToggle || !toggleDef) return;
    const on    = this._getToggleValue(tower);
    const text  = on ? toggleDef.on : toggleDef.off;
    const color = on ? PAL.accentGreen : PAL.textDim;

    this.toggleTxt.setText(text).setColor(color);
    this.toggleBg
      .setFillStyle(on ? PAL.bgStartBtn : 0x0a1a14)
      .setStrokeStyle(1, on ? PAL.borderActive : PAL.borderInactive);
  }

  // ── Handlers ────────────────────────────────────────────────────────────

  private _handleBuy(path: 'A' | 'B' | 'C'): void {
    if (this._isMultiMode) {
      this.onBuyBatch?.(path);
      return;
    }
    if (!this.currentTower) return;
    const cost = this.manager.getUpgradeCost(this.currentTower, path);
    if (cost === 0 || this.getGold() < cost) return;
    const paid = this.manager.buyUpgrade(this.currentTower, path);
    if (paid > 0) {
      this.onBuy?.(paid);
      this.refresh();
    }
  }

  private _handleRespec(): void {
    if (!this.currentTower) return;
    const state = this.manager.getState(this.currentTower);
    if (!state || state.totalSpent === 0) return;
    const fee    = this.manager.getRespecCost(this.currentTower);
    const refund = this.manager.respec(this.currentTower);
    if (refund > 0) {
      this.onRespec?.(refund, fee);
      this.refresh();
    }
  }

  private _handlePrioritySelect(priority: TargetingPriority): void {
    if (!this.currentTower) return;
    this.currentTower.priority = priority;
    this.refresh();
  }

  private _handleToggle(): void {
    if (!this.currentTower) return;
    const bt = this.currentTower.behaviorToggles;
    switch (this.currentTower.def.key) {
      case 'rock-hurler': bt.armorFocus       = !bt.armorFocus;       break;
      case 'frost':       bt.chillOnly        = !bt.chillOnly;        break;
      case 'poison':      bt.maintainOneStack = !bt.maintainOneStack; break;
      case 'tesla':       bt.chainToExit      = !bt.chainToExit;      break;
    }
    this.refresh();
  }

  private _getToggleValue(tower: Tower): boolean {
    switch (tower.def.key) {
      case 'rock-hurler': return tower.behaviorToggles.armorFocus;
      case 'frost':       return tower.behaviorToggles.chillOnly;
      case 'poison':      return tower.behaviorToggles.maintainOneStack;
      case 'tesla':       return tower.behaviorToggles.chainToExit;
      default:            return false;
    }
  }

  destroy(): void {
    this.scrollContainer.destroy(true);
    this.panelBg.destroy();
  }

  // ── Visibility ──────────────────────────────────────────────────────────

  private setVisible(visible: boolean): void {
    this.panelBg.setVisible(visible);
    this.scrollContainer.setVisible(visible);

    // Ensure interactivity matches visibility
    if (visible) {
      this.panelBg.setInteractive();
    } else {
      this.panelBg.disableInteractive();
    }
  }
}
