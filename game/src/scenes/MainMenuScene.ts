import Phaser from 'phaser';
import { SaveManager } from '../meta/SaveManager';
import { getMapUnlockNode } from '../meta/unlockDefs';

// ── Map card data (hardcoded waypoints for thumbnail previews) ──────────────

interface MapCardInfo {
  id: string;
  name: string;
  description: string;
  /** Unlock node ID, or null if always available. */
  unlockId: string | null;
  unlockCost: number;
  waypoints: Array<{ col: number; row: number }>;
  cols: number;
  rows: number;
}

const MAP_CARDS: MapCardInfo[] = [
  {
    id: 'map-01',
    name: 'Winding Pass',
    description: 'Z-path. Favours single-target towers.',
    unlockId: null,
    unlockCost: 0,
    waypoints: [
      { col: 0, row: 4 }, { col: 8, row: 4 }, { col: 8, row: 13 },
      { col: 16, row: 13 }, { col: 16, row: 4 }, { col: 24, row: 4 },
      { col: 24, row: 13 }, { col: 33, row: 13 },
    ],
    cols: 32,
    rows: 18,
  },
  {
    id: 'map-02',
    name: 'Wetland Crossing',
    description: 'Serpentine marsh. Favours AoE towers.',
    unlockId: 'unlock-map-02',
    unlockCost: 300,
    waypoints: [
      { col: 0, row: 2 }, { col: 26, row: 2 }, { col: 26, row: 6 },
      { col: 6, row: 6 }, { col: 6, row: 10 }, { col: 26, row: 10 },
      { col: 26, row: 14 }, { col: 6, row: 14 }, { col: 6, row: 16 },
      { col: 33, row: 16 },
    ],
    cols: 32,
    rows: 18,
  },
];

const CARD_W = 240;
const CARD_H = 160;
const CARD_GAP = 24;

export class MainMenuScene extends Phaser.Scene {
  private selectedMapId = 'map-01';
  private cardBgs: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private startBtn!: Phaser.GameObjects.Rectangle;
  private startLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.selectedMapId = 'map-01';

    this.createBackground();
    this.createTitle(cx, cy);
    this.createMapCards(cx, cy);
    this.createStartButton(cx, cy);
    this.createFooter(cx, height);
  }

  private createBackground(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0a);

    // Subtle grid overlay for that TD map feel
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x1a2a1a, 0.4);
    const tileSize = 40;
    for (let x = 0; x < width; x += tileSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, height);
    }
    for (let y = 0; y < height; y += tileSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(width, y);
    }
    graphics.strokePath();
  }

  private createTitle(cx: number, cy: number): void {
    // Glow effect using a slightly larger blurred copy
    this.add.text(cx, cy - 220, 'OJIBWE TD', {
      fontSize: '72px',
      color: '#005500',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.4);

    this.add.text(cx, cy - 220, 'OJIBWE TD', {
      fontSize: '72px',
      color: '#00ff44',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 150, 'Tower Defense', {
      fontSize: '24px',
      color: '#44aa44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Tower icons row
    const icons = [
      'icon-cannon', 'icon-frost', 'icon-mortar',
      'icon-poison', 'icon-tesla', 'icon-aura',
    ];
    const iconSpacing = 64;
    const rowWidth = (icons.length - 1) * iconSpacing;
    icons.forEach((key, i) => {
      const x = cx - rowWidth / 2 + i * iconSpacing;
      this.add.image(x, cy - 100, key)
        .setDisplaySize(40, 40)
        .setAlpha(0.7);
    });
  }

  // ── map selection cards ──────────────────────────────────────────────────

  private createMapCards(cx: number, cy: number): void {
    const save = SaveManager.getInstance();
    const totalW = MAP_CARDS.length * CARD_W + (MAP_CARDS.length - 1) * CARD_GAP;
    const startX = cx - totalW / 2 + CARD_W / 2;
    const cardY = cy - 10;

    this.add.text(cx, cardY - CARD_H / 2 - 22, 'SELECT MAP', {
      fontSize: '14px',
      color: '#556655',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    for (let i = 0; i < MAP_CARDS.length; i++) {
      const info = MAP_CARDS[i];
      const bx = startX + i * (CARD_W + CARD_GAP);
      const isLocked = info.unlockId !== null && !save.isUnlocked(info.unlockId);

      this.buildMapCard(info, bx, cardY, isLocked);
    }

    this.highlightMapCard(this.selectedMapId);
  }

  private buildMapCard(info: MapCardInfo, bx: number, by: number, isLocked: boolean): void {
    const bg = this.add.rectangle(bx, by, CARD_W, CARD_H, 0x111111)
      .setStrokeStyle(2, 0x333333)
      .setInteractive({ useHandCursor: !isLocked });
    this.cardBgs.set(info.id, bg);

    // Map name
    this.add.text(bx, by - CARD_H / 2 + 16, info.name, {
      fontSize: '16px',
      color: isLocked ? '#555555' : '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Description
    this.add.text(bx, by - CARD_H / 2 + 36, info.description, {
      fontSize: '11px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Path thumbnail
    this.drawPathThumbnail(bx, by + 10, info, isLocked);

    if (isLocked) {
      // Lock overlay
      const unlockNode = getMapUnlockNode(info.id);
      const cost = unlockNode?.cost ?? info.unlockCost;
      this.add.text(bx, by + CARD_H / 2 - 16, `LOCKED  ${cost} crystals`, {
        fontSize: '11px',
        color: '#664422',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      bg.on('pointerup', () => {
        this.scene.start('MetaMenuScene');
      });
    } else {
      bg.on('pointerup', () => {
        this.selectedMapId = info.id;
        this.highlightMapCard(info.id);
      });
    }
  }

  private drawPathThumbnail(
    cx: number, cy: number,
    info: MapCardInfo, isLocked: boolean,
  ): void {
    const thumbW = CARD_W - 32;
    const thumbH = 60;
    const scaleX = thumbW / (info.cols * 40);
    const scaleY = thumbH / (info.rows * 40);

    const gfx = this.add.graphics();
    const color = isLocked ? 0x333322 : 0x44aa44;
    gfx.lineStyle(2, color, isLocked ? 0.3 : 0.7);
    gfx.beginPath();

    for (let i = 0; i < info.waypoints.length; i++) {
      const wp = info.waypoints[i];
      const px = cx - thumbW / 2 + wp.col * 40 * scaleX;
      const py = cy - thumbH / 2 + wp.row * 40 * scaleY;
      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.strokePath();

    // Entry dot
    const first = info.waypoints[0];
    const fx = cx - thumbW / 2 + first.col * 40 * scaleX;
    const fy = cy - thumbH / 2 + first.row * 40 * scaleY;
    gfx.fillStyle(0x00ff44, isLocked ? 0.3 : 0.8);
    gfx.fillCircle(fx, fy, 3);
  }

  private highlightMapCard(selectedId: string): void {
    for (const [id, bg] of this.cardBgs) {
      const isSelected = id === selectedId;
      bg.setStrokeStyle(2, isSelected ? 0x00ff44 : 0x333333);
      bg.setFillStyle(isSelected ? 0x1a2a1a : 0x111111);
    }
  }

  // ── buttons ──────────────────────────────────────────────────────────────

  private createStartButton(cx: number, cy: number): void {
    const btnWidth = 240;
    const btnHeight = 56;

    this.startBtn = this.add.rectangle(cx, cy + 110, btnWidth, btnHeight, 0x005500, 1)
      .setStrokeStyle(2, 0x00ff44)
      .setInteractive({ useHandCursor: true });

    this.startLabel = this.add.text(cx, cy + 110, 'START GAME', {
      fontSize: '22px',
      color: '#00ff44',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Hover state
    this.startBtn.on('pointerover', () => {
      this.startBtn.setFillStyle(0x007700);
      this.startLabel.setColor('#ffffff');
    });
    this.startBtn.on('pointerout', () => {
      this.startBtn.setFillStyle(0x005500);
      this.startLabel.setColor('#00ff44');
    });
    this.startBtn.on('pointerdown', () => {
      this.startBtn.setFillStyle(0x003300);
    });
    this.startBtn.on('pointerup', () => {
      this.scene.start('CommanderSelectScene', { mapId: this.selectedMapId });
    });

    // Upgrades button — opens meta-progression tree
    const metaBg = this.add.rectangle(cx, cy + 186, btnWidth, btnHeight, 0x111133, 1)
      .setStrokeStyle(2, 0x335577)
      .setInteractive({ useHandCursor: true });

    const metaLabel = this.add.text(cx, cy + 186, 'UPGRADES', {
      fontSize: '20px',
      color: '#5588aa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    metaBg.on('pointerover', () => metaLabel.setColor('#88ccff'));
    metaBg.on('pointerout', () => metaLabel.setColor('#5588aa'));
    metaBg.on('pointerup', () => {
      this.scene.start('MetaMenuScene');
    });
  }

  private createFooter(cx: number, height: number): void {
    this.add.text(cx, height - 24, 'Solo Desktop · v0.1.0 · Placeholder Art · Inspired by Green TD', {
      fontSize: '13px',
      color: '#334433',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }
}
