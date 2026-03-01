import Phaser from 'phaser';

interface GameOverData {
  wavesCompleted: number;
  totalWaves:     number;
  won?:           boolean;
  runCurrency?:   number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    const waves    = data?.wavesCompleted ?? 0;
    const total    = data?.totalWaves    ?? 20;
    const won      = data?.won           ?? false;
    const currency = data?.runCurrency   ?? 0;

    this.add.rectangle(cx, cy, width, height, 0x0a0a0a);

    // Title
    const titleText  = won ? 'VICTORY!'   : 'GAME OVER';
    const titleColor = won ? '#00ff44'    : '#ff2222';
    this.add.text(cx, cy - 140, titleText, {
      fontSize: '64px',
      color: titleColor,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Waves survived
    this.add.text(cx, cy - 55, `Waves completed: ${waves} / ${total}`, {
      fontSize: '24px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Run currency earned
    this.add.text(cx, cy - 15, `Crystals earned: ${currency}`, {
      fontSize: '22px',
      color: '#88ccff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.makeButton(cx - 130, cy + 75, 'RETRY', () => {
      this.scene.start('GameScene');
    });

    this.makeButton(cx + 130, cy + 75, 'MENU', () => {
      this.scene.start('MainMenuScene');
    });
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 200, 52, 0x1a0000)
      .setStrokeStyle(2, 0xff2222)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontSize: '20px',
      color: '#ff4444',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    bg.on('pointerover',  () => { bg.setFillStyle(0x330000); text.setColor('#ffffff'); });
    bg.on('pointerout',   () => { bg.setFillStyle(0x1a0000); text.setColor('#ff4444'); });
    bg.on('pointerdown',  () => bg.setFillStyle(0x0a0000));
    bg.on('pointerup',    onClick);
  }
}
