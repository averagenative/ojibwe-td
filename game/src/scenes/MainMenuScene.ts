import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.createBackground();
    this.createTitle(cx, cy);
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
    this.add.text(cx, cy - 180, 'OJIBWE TD', {
      fontSize: '72px',
      color: '#005500',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.4);

    this.add.text(cx, cy - 180, 'OJIBWE TD', {
      fontSize: '72px',
      color: '#00ff44',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 110, 'Tower Defense', {
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
      this.add.image(x, cy - 48, key)
        .setDisplaySize(40, 40)
        .setAlpha(0.7);
    });
  }

  private createStartButton(cx: number, cy: number): void {
    const btnWidth = 240;
    const btnHeight = 56;

    const bg = this.add.rectangle(cx, cy + 40, btnWidth, btnHeight, 0x005500, 1)
      .setStrokeStyle(2, 0x00ff44)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(cx, cy + 40, 'START GAME', {
      fontSize: '22px',
      color: '#00ff44',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Hover state
    bg.on('pointerover', () => {
      bg.setFillStyle(0x007700);
      label.setColor('#ffffff');
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x005500);
      label.setColor('#00ff44');
    });
    bg.on('pointerdown', () => {
      bg.setFillStyle(0x003300);
    });
    bg.on('pointerup', () => {
      this.scene.start('GameScene');
    });

    // Meta button (disabled placeholder)
    const metaBg = this.add.rectangle(cx, cy + 116, btnWidth, btnHeight, 0x111111, 1)
      .setStrokeStyle(2, 0x335533)
      .setInteractive({ useHandCursor: true });

    const metaLabel = this.add.text(cx, cy + 116, 'UPGRADES  🔒', {
      fontSize: '20px',
      color: '#335533',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    metaBg.on('pointerover', () => metaLabel.setColor('#44aa44'));
    metaBg.on('pointerout', () => metaLabel.setColor('#335533'));
    metaBg.on('pointerup', () => {
      // TODO: scene.start('MetaMenuScene') when built
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
