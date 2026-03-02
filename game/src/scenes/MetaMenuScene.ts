import Phaser from 'phaser';
import { SaveManager, CONSUMABLE_COSTS, GOLD_BOOST_AMOUNT } from '../meta/SaveManager';
import type { ConsumablePending } from '../meta/SaveManager';
import { UNLOCK_NODES } from '../meta/unlockDefs';
import type { UnlockNode } from '../meta/unlockDefs';

const BG_COLOR    = 0x0a0a0a;
const PANEL_W     = 420;
const NODE_H          = 90;
const NODE_H_COMPACT  = 60;
const NODE_GAP        = 10;
const NODE_PAD_X  = 20;

/** Tabs available in the meta menu. */
type MetaTab = 'unlocks' | 'shop';

/** Data passed to scene.restart() to preserve tab selection. */
interface MetaMenuData { tab?: MetaTab }

// ── Shop item definitions ────────────────────────────────────────────────────

interface ShopItem {
  key:         keyof ConsumablePending;
  label:       string;
  description: string;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    key:         'rerollTokens',
    label:       'Reroll Token',
    description: `Grants one free offer reroll during a between-wave pick screen. Spend it to see 3 fresh offers. Stacks — multiple tokens carry into the run.`,
  },
  {
    key:         'goldBoostTokens',
    label:       'Gold Boost',
    description: `+${GOLD_BOOST_AMOUNT} starting gold for your next run. Tokens stack — buy several to build a larger gold cushion.`,
  },
  {
    key:         'extraLifeTokens',
    label:       'Extra Life',
    description: `+1 starting life for your next run. Tokens stack — stockpile before a difficult stage.`,
  },
];

export class MetaMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MetaMenuScene' });
  }

  create(data?: object): void {
    const { tab = 'unlocks' } = (data ?? {}) as MetaMenuData;
    const { width, height } = this.scale;
    const cx = width / 2;

    // Background
    this.add.rectangle(cx, height / 2, width, height, BG_COLOR);

    const save = SaveManager.getInstance();

    // Title
    this.add.text(cx, 36, 'META UPGRADES', {
      fontSize:   '32px',
      color:      '#00ff44',
      fontFamily: 'monospace',
      fontStyle:  'bold',
    }).setOrigin(0.5);

    // Crystal balance
    const balanceText = this.add.text(cx, 76, `Crystals: ${save.getCurrency()}`, {
      fontSize:   '20px',
      color:      '#88ccff',
      fontFamily: 'monospace',
      fontStyle:  'bold',
    }).setOrigin(0.5);

    // ── Tab buttons ──────────────────────────────────────────────────────────
    const TAB_Y = 112;
    this.makeTabButton(cx - 110, TAB_Y, 'UNLOCKS', tab === 'unlocks', () => {
      this.scene.restart({ tab: 'unlocks' } as MetaMenuData);
    });
    this.makeTabButton(cx + 110, TAB_Y, 'SHOP', tab === 'shop', () => {
      this.scene.restart({ tab: 'shop' } as MetaMenuData);
    });

    // Separator line below tabs
    const sepGfx = this.add.graphics();
    sepGfx.lineStyle(1, 0x224422, 0.8);
    sepGfx.beginPath();
    sepGfx.moveTo(cx - PANEL_W / 2, TAB_Y + 22);
    sepGfx.lineTo(cx + PANEL_W / 2, TAB_Y + 22);
    sepGfx.strokePath();

    const contentY = TAB_Y + 36;

    // ── Render active tab content ────────────────────────────────────────────
    if (tab === 'unlocks') {
      this.renderUnlocksTab(cx, contentY, save, balanceText);
    } else {
      this.renderShopTab(cx, contentY, save, balanceText);
    }

    // Navigation buttons
    const btnY = height - 50;
    this.makeButton(cx - 220, btnY, 'BACK', () => {
      this.scene.start('MainMenuScene');
    });
    this.makeButton(cx, btnY, 'GEAR', () => {
      this.scene.start('InventoryScene');
    });
    this.makeButton(cx + 220, btnY, 'CHALLENGES', () => {
      this.scene.start('ChallengeSelectScene');
    });
  }

  // ── Tab renderers ─────────────────────────────────────────────────────────

  private renderUnlocksTab(
    cx: number,
    startY: number,
    save: SaveManager,
    balanceText: Phaser.GameObjects.Text,
  ): void {
    const mapNodes       = UNLOCK_NODES.filter(n => n.effect.type === 'map');
    const commanderNodes = UNLOCK_NODES.filter(n => n.effect.type === 'commander');

    let y = startY;

    // Maps section
    if (mapNodes.length > 0) {
      this.add.text(cx - PANEL_W / 2, y, 'Maps', {
        fontSize:   '14px',
        color:      '#557755',
        fontFamily: 'monospace',
        fontStyle:  'bold',
      });
      y += 24;
      for (const node of mapNodes) {
        this.renderNode(cx, y, node, save, balanceText);
        y += NODE_H + NODE_GAP;
      }
    }

    // Commanders section
    if (commanderNodes.length > 0) {
      y += 8;
      this.add.text(cx - PANEL_W / 2, y, 'Commanders', {
        fontSize:   '14px',
        color:      '#557755',
        fontFamily: 'monospace',
        fontStyle:  'bold',
      });
      y += 24;
      for (const node of commanderNodes) {
        this.renderNode(cx, y, node, save, balanceText, NODE_H_COMPACT);
        y += NODE_H_COMPACT + NODE_GAP;
      }
    }
  }

  private renderShopTab(
    cx: number,
    startY: number,
    save: SaveManager,
    balanceText: Phaser.GameObjects.Text,
  ): void {
    const pending = save.getPendingConsumables();

    this.add.text(cx - PANEL_W / 2, startY, 'Repeatable — spend crystals each run', {
      fontSize:   '13px',
      color:      '#557799',
      fontFamily: 'monospace',
    });

    let y = startY + 28;

    for (const item of SHOP_ITEMS) {
      const cost      = CONSUMABLE_COSTS[item.key];
      const count     = pending[item.key];
      const canAfford = save.getCurrency() >= cost;

      const bgColor     = canAfford ? 0x001a33 : 0x1a1a1a;
      const borderColor = canAfford ? 0x0077bb : 0x444444;
      const labelColor  = canAfford ? '#88ccff' : '#888888';

      const panel = this.add.rectangle(cx, y + NODE_H / 2, PANEL_W, NODE_H, bgColor)
        .setStrokeStyle(2, borderColor);

      // Label
      this.add.text(cx - PANEL_W / 2 + NODE_PAD_X, y + 10, item.label, {
        fontSize:   '16px',
        color:      labelColor,
        fontFamily: 'monospace',
        fontStyle:  'bold',
      });

      // Description
      this.add.text(cx - PANEL_W / 2 + NODE_PAD_X, y + 32, item.description, {
        fontSize:   '11px',
        color:      '#888888',
        fontFamily: 'monospace',
        wordWrap:   { width: PANEL_W - NODE_PAD_X * 2 - 110 },
      });

      // Right-side cost + stock badge
      const badgeX = cx + PANEL_W / 2 - NODE_PAD_X - 48;
      const badgeY = y + NODE_H / 2;

      // Cost display
      this.add.text(badgeX, badgeY - 20, `${cost}`, {
        fontSize:   '16px',
        color:      canAfford ? '#88ccff' : '#666666',
        fontFamily: 'monospace',
        fontStyle:  'bold',
      }).setOrigin(0.5);
      this.add.text(badgeX, badgeY - 4, 'crystals', {
        fontSize:   '9px',
        color:      '#557799',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Pending stock count
      const stockColor = count > 0 ? '#44dd88' : '#555555';
      this.add.text(badgeX, badgeY + 14, `held: ${count}`, {
        fontSize:   '11px',
        color:      stockColor,
        fontFamily: 'monospace',
        fontStyle:  count > 0 ? 'bold' : 'normal',
      }).setOrigin(0.5);

      // Make clickable
      if (canAfford) {
        panel.setInteractive({ useHandCursor: true });
        panel.on('pointerover',  () => panel.setFillStyle(0x003355));
        panel.on('pointerout',   () => panel.setFillStyle(bgColor));
        panel.on('pointerup', () => {
          const ok = save.purchaseConsumable(item.key);
          if (ok) {
            balanceText.setText(`Crystals: ${save.getCurrency()}`);
            this.scene.restart({ tab: 'shop' } as MetaMenuData);
          }
        });
      }

      y += NODE_H + NODE_GAP;
    }

    // Info footer
    this.add.text(cx, y + 12,
      'Tokens are consumed at the start of your next run.',
      {
        fontSize:   '12px',
        color:      '#445544',
        fontFamily: 'monospace',
        align:      'center',
        wordWrap:   { width: PANEL_W },
      },
    ).setOrigin(0.5, 0);
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  private renderNode(
    cx: number,
    y:  number,
    node: UnlockNode,
    save: SaveManager,
    balanceText: Phaser.GameObjects.Text,
    nodeHeight: number = NODE_H,
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

    const panel = this.add.rectangle(cx, y + nodeHeight / 2, PANEL_W, nodeHeight, bgColor)
      .setStrokeStyle(2, borderColor);

    // Label
    this.add.text(cx - PANEL_W / 2 + NODE_PAD_X, y + 10, node.label, {
      fontSize:   '16px',
      color:      labelColor,
      fontFamily: 'monospace',
      fontStyle:  'bold',
    });

    // Description
    this.add.text(cx - PANEL_W / 2 + NODE_PAD_X, y + 32, node.description, {
      fontSize:    '12px',
      color:       '#888888',
      fontFamily:  'monospace',
      wordWrap:    { width: PANEL_W - NODE_PAD_X * 2 - 100 },
    });

    // Cost / status badge on the right
    const badgeX = cx + PANEL_W / 2 - NODE_PAD_X - 50;
    const badgeY = y + nodeHeight / 2;

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
      this.add.text(badgeX, badgeY + 16, 'crystals', {
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
          this.scene.restart({ tab: 'unlocks' } as MetaMenuData);
        }
      });
    }
  }

  private makeTabButton(
    x: number,
    y: number,
    label: string,
    active: boolean,
    onClick: () => void,
  ): void {
    const fillColor   = active ? 0x003322 : 0x111111;
    const borderColor = active ? 0x00aa44 : 0x335533;
    const textColor   = active ? '#00ff44' : '#44aa44';

    const bg = this.add.rectangle(x, y, 180, 36, fillColor)
      .setStrokeStyle(2, borderColor)
      .setInteractive({ useHandCursor: !active });

    const text = this.add.text(x, y, label, {
      fontSize:   '16px',
      color:      textColor,
      fontFamily: 'monospace',
      fontStyle:  active ? 'bold' : 'normal',
    }).setOrigin(0.5);

    if (!active) {
      bg.on('pointerover',  () => { bg.setFillStyle(0x223322); text.setColor('#00ff44'); });
      bg.on('pointerout',   () => { bg.setFillStyle(fillColor); text.setColor(textColor); });
      bg.on('pointerup',    onClick);
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
