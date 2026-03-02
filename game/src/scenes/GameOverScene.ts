import Phaser from 'phaser';
import { SaveManager } from '../meta/SaveManager';
import { calculateMoons, moonRatingLabel, moonSymbol } from '../systems/MoonRating';
import { PAL } from '../ui/palette';

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
  /** Lives remaining at end of run (used for moon rating). */
  livesLeft?:     number;
  /** Maximum lives the run started with (used for moon rating). */
  maxLives?:      number;
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
    const livesLeft   = data?.livesLeft     ?? 0;
    const maxLives    = data?.maxLives      ?? 20;

    // Persist run currency to meta-progression save.
    if (currency > 0) {
      SaveManager.getInstance().addCurrency(currency);
    }

    // ── Moon rating (non-endless won runs only) ───────────────────────────────
    let moonsEarned = 0;
    let isNewBest   = false;

    if (won && !isEndless && stageId) {
      moonsEarned = calculateMoons(livesLeft, maxLives, waves, total);
      const save  = SaveManager.getInstance();
      const prev  = save.getStageMoons(stageId);
      isNewBest   = moonsEarned > prev;
      save.setStageMoons(stageId, moonsEarned);
    }

    this.add.rectangle(cx, cy, width, height, PAL.bgDark);

    // Title — endless runs always end in game-over (no victory possible)
    const titleText  = won ? 'VICTORY!'   : 'GAME OVER';
    const titleColor = won ? PAL.accentGreen : PAL.danger;
    this.add.text(cx, cy - 140, titleText, {
      fontSize: '64px',
      color: titleColor,
      fontFamily: PAL.fontTitle,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Waves label — endless shows "Endless — Wave Reached: N"
    const wavesLabel = isEndless
      ? `Endless \u2014 Wave Reached: ${waves}`
      : `Waves completed: ${waves} / ${total}`;
    this.add.text(cx, cy - 55, wavesLabel, {
      fontSize: '24px',
      color: PAL.textNeutral,
      fontFamily: PAL.fontBody,
    }).setOrigin(0.5);

    // Run currency earned
    this.add.text(cx, cy - 15, `Crystals earned: ${currency}`, {
      fontSize: '22px',
      color: PAL.accentBlue,
      fontFamily: PAL.fontBody,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Total crystals banked
    const totalCrystals = SaveManager.getInstance().getCurrency();
    this.add.text(cx, cy + 22, `Total crystals: ${totalCrystals}`, {
      fontSize: '16px',
      color: PAL.textMuted,
      fontFamily: PAL.fontBody,
    }).setOrigin(0.5);

    // ── Moon rating display (won non-endless runs only) ───────────────────────
    if (won && !isEndless && moonsEarned > 0) {
      // Moon row: 5 symbols, filled for earned, empty for unearned
      const moonRow = Array.from({ length: 5 }, (_, i) => moonSymbol(i, moonsEarned)).join(' ');
      this.add.text(cx, cy + 55, moonRow, {
        fontSize: '28px',
        fontFamily: PAL.fontBody,
      }).setOrigin(0.5);

      // Moon label (e.g. "Full Moon!", "Waxing Gibbous")
      const label = moonRatingLabel(moonsEarned);
      this.add.text(cx, cy + 83, label, {
        fontSize: '15px',
        color: PAL.gold,
        fontFamily: PAL.fontBody,
        fontStyle: 'italic',
      }).setOrigin(0.5);

      // "New Best!" indicator
      if (isNewBest) {
        this.add.text(cx, cy + 101, 'New Best!', {
          fontSize: '12px',
          color: PAL.accentGreen,
          fontFamily: PAL.fontBody,
          fontStyle: 'bold',
        }).setOrigin(0.5);
      }
    }

    // Buttons: RETRY | UPGRADES | CODEX | MENU (shifted down to make room for moons)
    const btnY = cy + 128;
    const btnSpacing = 145;
    const btnStartX = cx - btnSpacing * 1.5;
    this.makeButton(btnStartX, btnY, 'RETRY', () => {
      this.scene.start('GameScene', { stageId, mapId, commanderId, isEndless });
    });
    this.makeButton(btnStartX + btnSpacing, btnY, 'UPGRADES', () => {
      this.scene.start('MetaMenuScene');
    });
    this.makeButton(btnStartX + btnSpacing * 2, btnY, 'CODEX', () => {
      this.scene.start('CodexScene', { returnTo: 'GameOverScene', returnData: data });
    }, PAL.bgPanel, PAL.accentGreenN);
    this.makeButton(btnStartX + btnSpacing * 3, btnY, 'MENU', () => {
      this.scene.start('MainMenuScene');
    });
  }

  private makeButton(
    x: number, y: number, label: string, onClick: () => void,
    bgColor: number = PAL.bgGiveUp, textColor: number = PAL.dangerN,
  ): void {
    const textColorStr = '#' + textColor.toString(16).padStart(6, '0');
    const hoverBg = bgColor + 0x191919; // slightly lighter
    const bg = this.add.rectangle(x, y, 130, 52, bgColor)
      .setStrokeStyle(2, textColor)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontSize: '16px',
      color: textColorStr,
      fontFamily: PAL.fontBody,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    bg.on('pointerover',  () => { bg.setFillStyle(hoverBg); text.setColor('#ffffff'); });
    bg.on('pointerout',   () => { bg.setFillStyle(bgColor); text.setColor(textColorStr); });
    bg.on('pointerdown',  () => bg.setFillStyle(bgColor - 0x0a0000));
    bg.on('pointerup',    onClick);
  }
}
