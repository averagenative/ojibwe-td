import Phaser from 'phaser';
import type { Tower } from '../entities/towers/Tower';
import {
  TargetingPriority,
  ALL_PRIORITIES,
  PRIORITY_LABEL,
} from '../data/targeting';

// ── Layout constants ──────────────────────────────────────────────────────────

export const BEHAVIOR_PANEL_HEIGHT = 64;

// Match the sibling panels (must stay in sync).
const PANEL_HEIGHT_TOWER   = 72;   // TowerPanel.PANEL_HEIGHT
const PANEL_HEIGHT_UPGRADE = 160;  // UpgradePanel.UPGRADE_PANEL_HEIGHT

const ROW_H = 22;  // height of each button row
const ROW1_OFFSET = 14;
const ROW2_OFFSET = 42;
const DEPTH = 115;  // above UpgradePanel (110)

// ── Toggle label definitions ──────────────────────────────────────────────────

interface ToggleDef { on: string; off: string; }

const TOGGLE_DEFS: Partial<Record<string, ToggleDef>> = {
  'rock-hurler': { on: 'ARMOR FOCUS  ON', off: 'ARMOR FOCUS  OFF' },
  frost:         { on: 'CHILL ONLY   ON', off: 'CHILL ONLY   OFF' },
  poison:        { on: '1-STACK CAP  ON', off: '1-STACK CAP  OFF' },
  tesla:         { on: 'CHAIN→EXIT   ON', off: 'CHAIN→EXIT  OFF'  },
};

// ── PriorityBtn ───────────────────────────────────────────────────────────────

interface PriorityBtn {
  priority: TargetingPriority;
  bg:       Phaser.GameObjects.Rectangle;
  label:    Phaser.GameObjects.Text;
}

// ── BehaviorPanel ─────────────────────────────────────────────────────────────

/**
 * Panel shown above the UpgradePanel when a tower is selected.
 * Row 1 — targeting priority buttons (6 modes, active one highlighted).
 * Row 2 — tower-type behavioral toggle OR "Passive — no targeting" for Aura.
 */
export class BehaviorPanel {
  private _open         = false;
  private currentTower: Tower | null = null;

  private readonly allObjects: Phaser.GameObjects.GameObject[] = [];

  // ── priority row objects ──────────────────────────────────────────────────
  private readonly priorityBtns: PriorityBtn[] = [];
  // All row-1 objects (excluding panel bg) — hidden for Aura.
  private readonly row1Objects: Phaser.GameObjects.GameObject[] = [];

  // ── toggle row objects ────────────────────────────────────────────────────
  private readonly toggleBg:  Phaser.GameObjects.Rectangle;
  private readonly toggleTxt: Phaser.GameObjects.Text;
  // All row-2 objects — hidden for Aura and for Aura-like towers with no toggle.
  private readonly row2Objects: Phaser.GameObjects.GameObject[] = [];

  // ── passive label (Aura only) ─────────────────────────────────────────────
  private readonly passiveLbl: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    const panelTop = height - PANEL_HEIGHT_TOWER - PANEL_HEIGHT_UPGRADE - BEHAVIOR_PANEL_HEIGHT;
    const panelCy  = panelTop + BEHAVIOR_PANEL_HEIGHT / 2;

    // ── Background ─────────────────────────────────────────────────────────
    const bg = scene.add.rectangle(
      width / 2, panelCy,
      width, BEHAVIOR_PANEL_HEIGHT,
      0x060d06, 0.95,
    ).setStrokeStyle(1, 0x223322).setDepth(DEPTH);
    this.allObjects.push(bg);

    const row1Y = panelTop + ROW1_OFFSET;
    const row2Y = panelTop + ROW2_OFFSET;
    const labelW = 72; // width reserved for the row label on the left

    // ── Row 1: targeting priority ─────────────────────────────────────────
    const row1Lbl = scene.add.text(8, row1Y, 'TARGET:', {
      fontSize: '10px', color: '#778877', fontFamily: 'monospace',
    }).setOrigin(0, 0.5).setDepth(DEPTH + 1);
    this.allObjects.push(row1Lbl);
    this.row1Objects.push(row1Lbl);

    const btnAreaW = width - labelW - 8;
    const gap      = 4;
    const btnW     = Math.floor((btnAreaW - gap * (ALL_PRIORITIES.length - 1)) / ALL_PRIORITIES.length);

    for (let i = 0; i < ALL_PRIORITIES.length; i++) {
      const priority = ALL_PRIORITIES[i];
      const bx = labelW + 8 + i * (btnW + gap) + btnW / 2;

      const btnBg = scene.add.rectangle(bx, row1Y, btnW, ROW_H, 0x001100)
        .setStrokeStyle(1, 0x224422)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 1);
      this.allObjects.push(btnBg);
      this.row1Objects.push(btnBg);

      const btnTxt = scene.add.text(bx, row1Y, PRIORITY_LABEL[priority], {
        fontSize: '10px', color: '#446644', fontFamily: 'monospace',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);
      this.allObjects.push(btnTxt);
      this.row1Objects.push(btnTxt);

      const btn: PriorityBtn = { priority, bg: btnBg, label: btnTxt };
      this.priorityBtns.push(btn);

      btnBg.on('pointerup', () => this.handlePrioritySelect(priority));
      btnBg.on('pointerover', () => {
        if (this.currentTower?.priority !== priority) btnBg.setFillStyle(0x002200);
      });
      btnBg.on('pointerout', () => {
        if (this.currentTower?.priority !== priority) btnBg.setFillStyle(0x001100);
      });
    }

    // ── Row 2: tower-type behavioral toggle ──────────────────────────────
    const row2Lbl = scene.add.text(8, row2Y, 'TOGGLE:', {
      fontSize: '10px', color: '#778877', fontFamily: 'monospace',
    }).setOrigin(0, 0.5).setDepth(DEPTH + 1);
    this.allObjects.push(row2Lbl);
    this.row2Objects.push(row2Lbl);

    const toggleW = Math.floor(width * 0.45);
    const toggleX = labelW + 8 + toggleW / 2;

    this.toggleBg = scene.add.rectangle(toggleX, row2Y, toggleW, ROW_H, 0x001111)
      .setStrokeStyle(1, 0x224444)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 1);
    this.allObjects.push(this.toggleBg);
    this.row2Objects.push(this.toggleBg);

    this.toggleTxt = scene.add.text(toggleX, row2Y, '', {
      fontSize: '10px', color: '#44cccc', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);
    this.allObjects.push(this.toggleTxt);
    this.row2Objects.push(this.toggleTxt);

    this.toggleBg.on('pointerup',   () => this.handleToggle());
    this.toggleBg.on('pointerover', () => this.toggleBg.setFillStyle(0x002222));
    this.toggleBg.on('pointerout',  () => this.toggleBg.setFillStyle(0x001111));

    // ── Passive label (Aura) ─────────────────────────────────────────────
    this.passiveLbl = scene.add.text(width / 2, panelCy, 'Passive — no targeting', {
      fontSize: '12px', color: '#886644', fontFamily: 'monospace', fontStyle: 'italic',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);
    this.allObjects.push(this.passiveLbl);

    // Start hidden
    this.setAllVisible(false);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  isOpen(): boolean { return this._open; }

  showForTower(tower: Tower): void {
    this.currentTower = tower;
    this._open        = true;
    this.setAllVisible(true);
    this.refresh();
  }

  hide(): void {
    this.currentTower = null;
    this._open        = false;
    this.setAllVisible(false);
  }

  /** Refresh after priority/toggle change. Does not open or close the panel. */
  refresh(): void {
    if (!this._open || !this.currentTower) return;

    const tower      = this.currentTower;
    const isAura     = tower.def.isAura ?? false;
    const toggleDef  = TOGGLE_DEFS[tower.def.key];
    const hasToggle  = !isAura && toggleDef !== undefined;

    // ── Visibility ──────────────────────────────────────────────────────
    this.passiveLbl.setVisible(isAura);

    for (const obj of this.row1Objects) {
      (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(!isAura);
    }
    for (const obj of this.row2Objects) {
      (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(hasToggle);
    }

    if (isAura) return;

    // ── Priority buttons ────────────────────────────────────────────────
    for (const btn of this.priorityBtns) {
      const active = btn.priority === tower.priority;
      btn.bg.setFillStyle(active ? 0x004400 : 0x001100);
      btn.bg.setStrokeStyle(1, active ? 0x44cc44 : 0x224422);
      btn.label.setColor(active ? '#88ff88' : '#446644');
    }

    // ── Toggle button ───────────────────────────────────────────────────
    if (!hasToggle || !toggleDef) return;

    const on    = this.getToggleValue(tower);
    const text  = on ? toggleDef.on : toggleDef.off;
    const color = on ? '#44ffcc' : '#448888';

    this.toggleTxt.setText(text).setColor(color);
    this.toggleBg
      .setFillStyle(on ? 0x003322 : 0x001111)
      .setStrokeStyle(1, on ? 0x22aa88 : 0x224444);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private handlePrioritySelect(priority: TargetingPriority): void {
    if (!this.currentTower) return;
    this.currentTower.priority = priority;
    this.refresh();
  }

  private handleToggle(): void {
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

  private getToggleValue(tower: Tower): boolean {
    switch (tower.def.key) {
      case 'rock-hurler': return tower.behaviorToggles.armorFocus;
      case 'frost':       return tower.behaviorToggles.chillOnly;
      case 'poison':      return tower.behaviorToggles.maintainOneStack;
      case 'tesla':       return tower.behaviorToggles.chainToExit;
      default:            return false;
    }
  }

  private setAllVisible(visible: boolean): void {
    for (const obj of this.allObjects) {
      (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(visible);
    }
  }
}
