import Phaser from 'phaser';
import { SaveManager } from '../meta/SaveManager';
import { UNLOCK_NODES } from '../meta/unlockDefs';
import type { UnlockNode } from '../meta/unlockDefs';

const BG_COLOR    = 0x0a0a0a;
const PANEL_W     = 420;
const NODE_H      = 90;
const NODE_GAP    = 12;
const NODE_PAD_X  = 20;

export class MetaMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MetaMenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Background
    this.add.rectangle(cx, height / 2, width, height, BG_COLOR);

    const save = SaveManager.getInstance();

    // Title
    this.add.text(cx, 40, 'META UPGRADES', {
      fontSize:   '36px',
      color:      '#00ff44',
      fontFamily: 'monospace',
      fontStyle:  'bold',
    }).setOrigin(0.5);

    // Crystal balance
    const balanceText = this.add.text(cx, 90, `Crystals: ${save.getCurrency()}`, {
      fontSize:   '22px',
      color:      '#88ccff',
      fontFamily: 'monospace',
      fontStyle:  'bold',
    }).setOrigin(0.5);

    // Unlock nodes
    let y = 140;
    for (const node of UNLOCK_NODES) {
      this.renderNode(cx, y, node, save, balanceText);
      y += NODE_H + NODE_GAP;
    }

    // Back button
    this.makeButton(cx, height - 50, 'BACK', () => {
      this.scene.start('MainMenuScene');
    });
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  private renderNode(
    cx: number,
    y:  number,
    node: UnlockNode,
    save: SaveManager,
    balanceText: Phaser.GameObjects.Text,
  ): void {
    const owned      = save.isUnlocked(node.id);
    const affordable = !owned && save.getCurrency() >= node.cost;
    const canBuy     = affordable;

    const prereqsMet = node.prereqs.every(id => save.isUnlocked(id));
    const locked     = !owned && !prereqsMet;

    let bgColor: number;
    let borderColor: number;
    let labelColor: string;

    if (owned) {
      bgColor = 0x004400;
      borderColor = 0x00aa44;
      labelColor = '#00ff44';
    } else if (locked) {
      bgColor = 0x111111;
      borderColor = 0x333333;
      labelColor = '#444444';
    } else if (affordable) {
      bgColor = 0x002233;
      borderColor = 0x0088cc;
      labelColor = '#88ccff';
    } else {
      bgColor = 0x1a1a1a;
      borderColor = 0x444444;
      labelColor = '#888888';
    }

    const panel = this.add.rectangle(cx, y + NODE_H / 2, PANEL_W, NODE_H, bgColor)
      .setStrokeStyle(2, borderColor);

    // Label
    this.add.text(cx - PANEL_W / 2 + NODE_PAD_X, y + 14, node.label, {
      fontSize:   '18px',
      color:      labelColor,
      fontFamily: 'monospace',
      fontStyle:  'bold',
    });

    // Description
    this.add.text(cx - PANEL_W / 2 + NODE_PAD_X, y + 40, node.description, {
      fontSize:    '12px',
      color:       '#888888',
      fontFamily:  'monospace',
      wordWrap:    { width: PANEL_W - NODE_PAD_X * 2 - 100 },
    });

    // Cost / status badge on the right
    const badgeX = cx + PANEL_W / 2 - NODE_PAD_X - 50;
    const badgeY = y + NODE_H / 2;

    if (owned) {
      this.add.text(badgeX, badgeY, 'OWNED', {
        fontSize:   '14px',
        color:      '#00ff44',
        fontFamily: 'monospace',
        fontStyle:  'bold',
      }).setOrigin(0.5);
    } else if (locked) {
      this.add.text(badgeX, badgeY, 'LOCKED', {
        fontSize:   '13px',
        color:      '#555555',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    } else {
      this.add.text(badgeX, badgeY, `${node.cost}`, {
        fontSize:   '18px',
        color:      affordable ? '#88ccff' : '#666666',
        fontFamily: 'monospace',
        fontStyle:  'bold',
      }).setOrigin(0.5);
      this.add.text(badgeX, badgeY + 20, 'crystals', {
        fontSize:   '10px',
        color:      '#557799',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    // Make clickable when purchasable
    if (canBuy) {
      panel.setInteractive({ useHandCursor: true });
      panel.on('pointerover',  () => panel.setFillStyle(0x003355));
      panel.on('pointerout',   () => panel.setFillStyle(bgColor));
      panel.on('pointerup', () => {
        const purchased = save.purchaseUnlock(node.id, node.cost);
        if (purchased) {
          // Refresh the scene to reflect new state
          balanceText.setText(`Crystals: ${save.getCurrency()}`);
          this.scene.restart();
        }
      });
    }
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 200, 48, 0x111111)
      .setStrokeStyle(2, 0x335533)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontSize:   '18px',
      color:      '#44aa44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerover',  () => { bg.setFillStyle(0x223322); text.setColor('#00ff44'); });
    bg.on('pointerout',   () => { bg.setFillStyle(0x111111); text.setColor('#44aa44'); });
    bg.on('pointerup',    onClick);
  }
}
