import Phaser from 'phaser';
import { SaveManager } from '../meta/SaveManager';

interface GameOverData {
  wavesCompleted: number;
  totalWaves:     number;
  won?:           boolean;
  runCurrency?:   number;
  /** Stage ID (preferred for retry). */
  stageId?:       string;
  mapId?:         string;
  commanderId?:   string;
  /** True when the run was played in endless mode. */
  isEndless?:     boolean;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    const waves       = data?.wavesCompleted ?? 0;
    const total       = data?.totalWaves    ?? 20;
    const won         = data?.won           ?? false;
    const currency    = data?.runCurrency   ?? 0;
    const stageId     = data?.stageId       ?? undefined;
    const mapId       = data?.mapId         ?? 'map-01';
    const commanderId = data?.commanderId   ?? 'nokomis';
    const isEndless   = data?.isEndless     ?? false;

    // Persist run currency to meta-progression save.
    if (currency > 0) {
      SaveManager.getInstance().addCurrency(currency);
    }

    this.add.rectangle(cx, cy, width, height, 0x0a0a0a);

    // Title — endless runs always end in game-over (no victory possible)
    const titleText  = won ? 'VICTORY!'   : 'GAME OVER';
    const titleColor = won ? '#00ff44'    : '#ff2222';
    this.add.text(cx, cy - 140, titleText, {
      fontSize: '64px',
      color: titleColor,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Waves label — endless shows "Endless — Wave Reached: N"
    const wavesLabel = isEndless
      ? `Endless \u2014 Wave Reached: ${waves}`
      : `Waves completed: ${waves} / ${total}`;
    this.add.text(cx, cy - 55, wavesLabel, {
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

    // Total crystals banked
    const totalCrystals = SaveManager.getInstance().getCurrency();
    this.add.text(cx, cy + 22, `Total crystals: ${totalCrystals}`, {
      fontSize: '16px',
      color: '#557799',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Buttons: RETRY | UPGRADES | MENU (three equal-width buttons)
    const btnY = cy + 90;
    this.makeButton(cx - 180, btnY, 'RETRY', () => {
      this.scene.start('GameScene', { stageId, mapId, commanderId, isEndless });
    });
    this.makeButton(cx, btnY, 'UPGRADES', () => {
      this.scene.start('MetaMenuScene');
    });
    this.makeButton(cx + 180, btnY, 'MENU', () => {
      this.scene.start('MainMenuScene');
    });
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 160, 52, 0x1a0000)
      .setStrokeStyle(2, 0xff2222)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontSize: '18px',
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
