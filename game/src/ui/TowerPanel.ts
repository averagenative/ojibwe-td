import Phaser from 'phaser';
import type { TowerDef } from '../entities/towers/Tower';
import { PAL } from './palette';
import { formatDmgLine, clampTooltipX } from './tooltipFormat';

export const PANEL_HEIGHT = 72;
const BTN_SIZE = 52;
const BTN_PADDING = 10;
const DEPTH = 100;

const TOOLTIP_DEPTH = DEPTH + 20;
const TOOLTIP_W = 190;
const TOOLTIP_PAD = 8;

/**
 * Bottom HUD strip for selecting towers to place.
 * Buttons are disabled (visually) when the player can't afford the tower.
 * Hovering a button shows a tooltip above the panel with stats and description.
 */
export class TowerPanel {
  private _scene: Phaser.Scene;
  private _tooltipBg: Phaser.GameObjects.Graphics;
  private _tooltipName: Phaser.GameObjects.Text;
  private _tooltipCost: Phaser.GameObjects.Text;
  private _tooltipDmg: Phaser.GameObjects.Text;
  private _tooltipRange: Phaser.GameObjects.Text;
  private _tooltipDesc: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    defs: TowerDef[],
    onSelect: (def: TowerDef) => void,
    getGold: () => number,
  ) {
    this._scene = scene;
    const { width, height } = scene.scale;
    const panelY = height - PANEL_HEIGHT / 2;

    // Background strip
    scene.add.rectangle(width / 2, panelY, width, PANEL_HEIGHT, 0x000000, 0.85)
      .setStrokeStyle(1, PAL.borderInactive)
      .setDepth(DEPTH);

    // ── Shared tooltip objects (hidden until hover) ────────────────────────────
    this._tooltipBg = scene.add.graphics()
      .setDepth(TOOLTIP_DEPTH)
      .setVisible(false);

    this._tooltipName = scene.add.text(0, 0, '', {
      fontSize: '13px',
      color: PAL.textPrimary,
      fontFamily: PAL.fontBody,
      fontStyle: 'bold',
    }).setDepth(TOOLTIP_DEPTH + 1).setVisible(false);

    this._tooltipCost = scene.add.text(0, 0, '', {
      fontSize: '11px',
      color: PAL.gold,
      fontFamily: PAL.fontBody,
    }).setDepth(TOOLTIP_DEPTH + 1).setVisible(false);

    this._tooltipDmg = scene.add.text(0, 0, '', {
      fontSize: '11px',
      color: PAL.textSecondary,
      fontFamily: PAL.fontBody,
    }).setDepth(TOOLTIP_DEPTH + 1).setVisible(false);

    this._tooltipRange = scene.add.text(0, 0, '', {
      fontSize: '11px',
      color: PAL.textSecondary,
      fontFamily: PAL.fontBody,
    }).setDepth(TOOLTIP_DEPTH + 1).setVisible(false);

    this._tooltipDesc = scene.add.text(0, 0, '', {
      fontSize: '10px',
      color: PAL.textDim,
      fontFamily: PAL.fontBody,
      wordWrap: { width: TOOLTIP_W - TOOLTIP_PAD * 2 },
    }).setDepth(TOOLTIP_DEPTH + 1).setVisible(false);

    // ── Tower buttons ──────────────────────────────────────────────────────────
    defs.forEach((def, i) => {
      const bx = BTN_PADDING + BTN_SIZE / 2 + i * (BTN_SIZE + BTN_PADDING);
      const by = panelY;

      const btn = scene.add.rectangle(bx, by, BTN_SIZE, BTN_SIZE, PAL.bgCard)
        .setStrokeStyle(2, PAL.borderInactive)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 1);

      const iconKey = `icon-${def.key}`;
      if (scene.textures.exists(iconKey)) {
        scene.add.image(bx, by - 10, iconKey)
          .setDisplaySize(26, 26)
          .setDepth(DEPTH + 2);
      }

      scene.add.text(bx, by + 14, `${def.cost}g`, {
        fontSize: '11px', color: PAL.gold, fontFamily: PAL.fontBody,
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);

      scene.add.text(bx, by + 26, def.name.toUpperCase(), {
        fontSize: '9px', color: PAL.textDesc, fontFamily: PAL.fontBody,
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);

      btn.on('pointerover', () => {
        const canAfford = getGold() >= def.cost;
        btn.setFillStyle(canAfford ? PAL.bgPanelHover : PAL.bgCantAfford);
        this._showTooltip(def, bx, panelY);
      });
      btn.on('pointerout', () => {
        btn.setFillStyle(PAL.bgCard);
        this._hideTooltip();
      });
      btn.on('pointerup', () => {
        if (getGold() >= def.cost) onSelect(def);
      });
    });
  }

  // ── Tooltip helpers ──────────────────────────────────────────────────────────

  private _showTooltip(def: TowerDef, bx: number, panelY: number): void {
    const { width } = this._scene.scale;

    const tx = clampTooltipX(bx, TOOLTIP_W, width);

    // Bottom of tooltip sits just above the panel top edge
    const panelTop = panelY - PANEL_HEIGHT / 2;
    const bottomY = panelTop - 6;

    const dmgLine = formatDmgLine(def);
    const rangeLine = `range ${def.range}`;

    // Measure description height (may wrap)
    this._tooltipDesc.setText(def.description);
    const descHeight = this._tooltipDesc.height;

    // Compute dynamic tooltip height
    const LINE_GAP = 3;
    const contentH = 14 + LINE_GAP   // name (13px)
      + 12 + LINE_GAP                // cost (11px)
      + 12 + LINE_GAP                // dmg/interval (11px)
      + 12 + LINE_GAP                // range (11px)
      + descHeight;                  // description (may wrap)
    const tooltipH = TOOLTIP_PAD + contentH + TOOLTIP_PAD;

    const ty = bottomY - tooltipH;
    const textX = tx + TOOLTIP_PAD;

    // Draw background
    this._tooltipBg
      .clear()
      .setVisible(true);
    this._tooltipBg.fillStyle(PAL.bgPanel, 0.97);
    this._tooltipBg.fillRect(tx, ty, TOOLTIP_W, tooltipH);
    this._tooltipBg.lineStyle(1, PAL.borderInactive, 1.0);
    this._tooltipBg.strokeRect(tx, ty, TOOLTIP_W, tooltipH);

    // Position and update text objects
    let cursor = ty + TOOLTIP_PAD;

    this._tooltipName
      .setPosition(textX, cursor)
      .setText(def.name.toUpperCase())
      .setVisible(true);
    cursor += 14 + LINE_GAP;

    this._tooltipCost
      .setPosition(textX, cursor)
      .setText(`${def.cost}g`)
      .setVisible(true);
    cursor += 12 + LINE_GAP;

    this._tooltipDmg
      .setPosition(textX, cursor)
      .setText(dmgLine)
      .setVisible(true);
    cursor += 12 + LINE_GAP;

    this._tooltipRange
      .setPosition(textX, cursor)
      .setText(rangeLine)
      .setVisible(true);
    cursor += 12 + LINE_GAP;

    this._tooltipDesc
      .setPosition(textX, cursor)
      .setVisible(true);
    // setText already called above for height measurement
  }

  private _hideTooltip(): void {
    this._tooltipBg.setVisible(false);
    this._tooltipName.setVisible(false);
    this._tooltipCost.setVisible(false);
    this._tooltipDmg.setVisible(false);
    this._tooltipRange.setVisible(false);
    this._tooltipDesc.setVisible(false);
  }
}
