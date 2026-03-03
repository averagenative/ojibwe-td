import Phaser from 'phaser';
import { SaveManager } from '../meta/SaveManager';
import { calculateMoons, moonRatingLabel, moonSymbol } from '../systems/MoonRating';
import { PAL } from '../ui/palette';
import { rollLoot, getGearDef, RARITY_COLORS } from '../data/gearDefs';
import { InventoryManager } from '../meta/InventoryManager';
import { calculateRunXp, levelFromXp } from '../data/enhancementDefs';
import { MobileManager } from '../systems/MobileManager';
import { AudioManager } from '../systems/AudioManager';
import { AchievementManager } from '../systems/AchievementManager';
import { AchievementToast } from '../ui/AchievementToast';

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
  /** True when the run was a challenge map. */
  isChallenge?:   boolean;
  /** Number of bosses killed in this run. */
  bossesKilled?:  number;
}

export class GameOverScene extends Phaser.Scene {
  /** True when running on a mobile/touch device. Set once in create(). */
  private _isMobile = false;

  /** Transition guard — prevents double-navigation. */
  private _fading = false;

  /**
   * Returns a CSS font-size string scaled up by 1.35× on mobile.
   */
  private _fs(size: number): string {
    const s = this._isMobile ? Math.round(size * 1.35) : size;
    return `${s}px`;
  }

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    this._fading = false;
    this.cameras.main.fadeIn(350, 0, 0, 0);
    this._isMobile = MobileManager.getInstance().isMobile();

    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    const waves       = data?.wavesCompleted ?? 0;
    const total       = data?.totalWaves    ?? 20;
    const won         = data?.won           ?? false;

    // Start the appropriate Suno music track for this screen.
    // 'music-victory' / 'music-gameover' were pre-loaded by BootScene.
    // startMusicTrackWithFallback() plays the file-based track when the buffer
    // is registered, and restarts the procedural arpeggio as a fallback when
    // the file is absent (e.g. mp3 missing, decode failure, or Safari quirk).
    AudioManager.getInstance().startMusicTrackWithFallback(won ? 'music-victory' : 'music-gameover');
    const currency    = data?.runCurrency   ?? 0;
    const stageId     = data?.stageId       ?? undefined;
    const mapId       = data?.mapId         ?? 'map-01';
    const commanderId = data?.commanderId   ?? 'nokomis';
    const isEndless   = data?.isEndless     ?? false;
    const livesLeft   = data?.livesLeft     ?? 0;
    const maxLives    = data?.maxLives      ?? 20;
    const isChallenge = data?.isChallenge   ?? false;
    const bossesKilled = data?.bossesKilled ?? 0;

    // Persist run currency to meta-progression save.
    if (currency > 0) {
      SaveManager.getInstance().addCurrency(currency);
      // Currency balance may now trigger the crystal-hoard achievement.
      AchievementManager.getInstance().onCurrencyChanged(SaveManager.getInstance().getCurrency());
    }

    // Show any achievement toasts that were queued by the GameScene commit
    // (e.g. currency accumulation). Drain happens here after the currency add.
    {
      const toast = new AchievementToast(this);
      const newIds = AchievementManager.getInstance().drainNewlyUnlocked();
      if (newIds.length > 0) toast.showBatch(newIds);
    }

    // ── Commander XP ────────────────────────────────────────────────────────
    const runXp = calculateRunXp(waves, total, bossesKilled, 0, won);
    const save = SaveManager.getInstance();
    const prevXp = save.getCommanderXp(commanderId);
    const prevLevel = levelFromXp(prevXp);
    save.addCommanderXp(commanderId, runXp);
    const newLevel = levelFromXp(prevXp + runXp);
    const leveledUp = newLevel > prevLevel;

    // ── Moon rating (non-endless won runs only) ───────────────────────────────
    let moonsEarned = 0;
    let isNewBest   = false;

    if (won && !isEndless && stageId) {
      moonsEarned = calculateMoons(livesLeft, maxLives, waves, total);
      const prev  = save.getStageMoons(stageId);
      isNewBest   = moonsEarned > prev;
      save.setStageMoons(stageId, moonsEarned);
    }

    // ── Loot roll ─────────────────────────────────────────────────────────────
    const lootDrops = rollLoot(0, moonsEarned, isChallenge);
    const inv = InventoryManager.getInstance();
    const overflow = inv.addItems(lootDrops);

    this.add.rectangle(cx, cy, width, height, PAL.bgDark);

    // Victory sparkle burst / defeat ember drift
    if (won) {
      for (let i = 0; i < 25; i++) {
        const sx = cx - 220 + Math.random() * 440;
        const sy = cy - 210 + Math.random() * 80;
        const circ = this.add.circle(sx, sy, 2 + Math.random() * 3, 0xffcc44, 1.0);
        this.tweens.add({
          targets: circ,
          x: sx + (Math.random() - 0.5) * 300,
          y: sy - 80 - Math.random() * 120,
          alpha: 0,
          duration: 800 + Math.random() * 600,
          delay: Math.random() * 400,
          ease: 'Quad.easeOut',
        });
      }
    } else {
      this.add.rectangle(cx, cy, width, height, 0x000000, 0.20);
      for (let i = 0; i < 18; i++) {
        const ex = Math.random() * width;
        const ey = -10 - Math.random() * 50;
        const ember = this.add.circle(ex, ey, 1 + Math.random() * 2, 0x881100, 0.7);
        this.tweens.add({
          targets: ember,
          y: ey + height + 50,
          x: ex + (Math.random() - 0.5) * 50,
          alpha: { from: 0.7, to: 0 },
          duration: 4000 + Math.random() * 3000,
          delay: Math.random() * 2000,
          ease: 'Linear',
        });
      }
    }

    // Title — endless runs always end in game-over (no victory possible)
    const titleText  = won ? 'VICTORY!'   : 'GAME OVER';
    const titleColor = won ? PAL.accentGreen : PAL.danger;
    this.add.text(cx, cy - 180, titleText, {
      fontSize: this._fs(52),
      color: titleColor,
      fontFamily: PAL.fontTitle,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Waves label (count-up) — endless shows "Endless — Wave Reached: N"
    const wavesText = this.add.text(cx, cy - 120,
      isEndless ? `Endless \u2014 Wave Reached: 0` : `Waves completed: 0 / ${total}`,
      { fontSize: this._fs(20), color: PAL.textNeutral, fontFamily: PAL.fontBody },
    ).setOrigin(0.5);
    const wavesObj = { v: 0 };
    this.tweens.add({
      targets: wavesObj, v: waves, duration: 800, delay: 300, ease: 'Quad.easeOut',
      onUpdate: () => {
        const w = Math.floor(wavesObj.v);
        wavesText.setText(isEndless ? `Endless \u2014 Wave Reached: ${w}` : `Waves completed: ${w} / ${total}`);
      },
    });

    // Run currency + XP earned (side by side, count-up)
    const currText = this.add.text(cx - 100, cy - 88, `Crystals: +0`, {
      fontSize: this._fs(18), color: PAL.accentBlue, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5);
    const currObj = { v: 0 };
    this.tweens.add({
      targets: currObj, v: currency, duration: 1000, delay: 400, ease: 'Quad.easeOut',
      onUpdate: () => { currText.setText(`Crystals: +${Math.floor(currObj.v)}`); },
    });

    const xpText = this.add.text(cx + 100, cy - 88, `XP: +0`, {
      fontSize: this._fs(18), color: PAL.gold, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5);
    const xpObj = { v: 0 };
    this.tweens.add({
      targets: xpObj, v: runXp, duration: 1000, delay: 400, ease: 'Quad.easeOut',
      onUpdate: () => { xpText.setText(`XP: +${Math.floor(xpObj.v)}`); },
    });

    // Commander level display
    const levelText = leveledUp
      ? `${commanderId} Level ${prevLevel} \u2192 ${newLevel}!`
      : `${commanderId} Level ${newLevel}`;
    const levelColor = leveledUp ? PAL.accentGreen : PAL.textMuted;
    this.add.text(cx, cy - 62, levelText, {
      fontSize: this._fs(14),
      color: levelColor,
      fontFamily: PAL.fontBody,
      fontStyle: leveledUp ? 'bold' : 'normal',
    }).setOrigin(0.5);

    // ── Moon rating display (won non-endless runs only) ───────────────────────
    let moonSectionBottom = cy - 42;
    if (won && !isEndless && moonsEarned > 0) {
      const moonRow = Array.from({ length: 5 }, (_, i) => moonSymbol(i, moonsEarned)).join(' ');
      this.add.text(cx, cy - 38, moonRow, {
        fontSize: this._fs(22),
        fontFamily: PAL.fontBody,
      }).setOrigin(0.5);

      const label = moonRatingLabel(moonsEarned);
      this.add.text(cx, cy - 14, label, {
        fontSize: this._fs(13),
        color: PAL.gold,
        fontFamily: PAL.fontBody,
        fontStyle: 'italic',
      }).setOrigin(0.5);

      if (isNewBest) {
        this.add.text(cx, cy + 2, 'New Best!', {
          fontSize: this._fs(11),
          color: PAL.accentGreen,
          fontFamily: PAL.fontBody,
          fontStyle: 'bold',
        }).setOrigin(0.5);
      }
      moonSectionBottom = cy + 16;
    }

    // ── Loot display ──────────────────────────────────────────────────────────
    const lootY = moonSectionBottom + 18;
    if (lootDrops.length > 0) {
      this.add.text(cx, lootY, 'LOOT DROPS', {
        fontSize: this._fs(16),
        color: PAL.gold,
        fontFamily: PAL.fontBody,
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const cardW = 200;
      const cardH = 60;
      const cardGap = 12;
      const totalW = lootDrops.length * (cardW + cardGap) - cardGap;
      const startX = cx - totalW / 2 + cardW / 2;

      for (let i = 0; i < lootDrops.length; i++) {
        const drop = lootDrops[i];
        const def = getGearDef(drop.defId);
        if (!def) continue;

        const cardX = startX + i * (cardW + cardGap);
        const cardY = lootY + 24 + cardH / 2;
        const rarityColor = RARITY_COLORS[def.rarity];

        // Card background
        this.add.rectangle(cardX, cardY, cardW, cardH, PAL.bgCard)
          .setStrokeStyle(2, rarityColor.num);

        // Rarity stripe
        this.add.rectangle(cardX - cardW / 2 + 3, cardY, 4, cardH - 4, rarityColor.num);

        // Item name
        this.add.text(cardX + 4, cardY - 14, def.name, {
          fontSize: this._fs(13),
          color: rarityColor.hex,
          fontFamily: PAL.fontBody,
          fontStyle: 'bold',
        }).setOrigin(0.5);

        // Rarity label — minimum 11px
        this.add.text(cardX + 4, cardY + 6, def.rarity.toUpperCase(), {
          fontSize: this._fs(11),
          color: rarityColor.hex,
          fontFamily: PAL.fontBody,
        }).setOrigin(0.5);

        // NEW badge — minimum 11px on mobile
        if (drop.isNew) {
          this.add.text(cardX + cardW / 2 - 10, cardY - cardH / 2 + 4, 'NEW', {
            fontSize: this._fs(11),
            color: '#ffffff',
            fontFamily: PAL.fontBody,
            fontStyle: 'bold',
            backgroundColor: '#ff6600',
            padding: { x: 3, y: 1 },
          }).setOrigin(1, 0);
        }
      }

      // Overflow warning
      if (overflow.length > 0) {
        this.add.text(cx, lootY + 24 + cardH + 12, `Inventory full! ${overflow.length} item(s) lost.`, {
          fontSize: this._fs(12),
          color: PAL.danger,
          fontFamily: PAL.fontBody,
        }).setOrigin(0.5);
      }
    } else {
      this.add.text(cx, lootY, 'No loot dropped', {
        fontSize: this._fs(13),
        color: PAL.textMuted,
        fontFamily: PAL.fontBody,
        fontStyle: 'italic',
      }).setOrigin(0.5);
    }

    // Buttons — on mobile stack into two rows (3 top + 2 bottom) to ensure
    // adequate spacing and tap target at any viewport width.
    const btnH = this._isMobile ? 52 : 48;
    if (this._isMobile) {
      const row1Y = height - 76;
      const row2Y = height - 22;
      const btnSpacing = 160;
      const row1StartX = cx - btnSpacing;
      this.makeButton(row1StartX,                row1Y, btnH, 'RETRY', () => {
        this._go('GameScene', { stageId, mapId, commanderId, isEndless });
      });
      this.makeButton(row1StartX + btnSpacing,   row1Y, btnH, 'UPGRADES', () => {
        this._go('MetaMenuScene');
      });
      this.makeButton(row1StartX + btnSpacing * 2, row1Y, btnH, 'GEAR', () => {
        this._go('InventoryScene');
      }, PAL.bgPanel, PAL.accentBlueN);
      const row2StartX = cx - btnSpacing / 2;
      this.makeButton(row2StartX,              row2Y, btnH, 'CODEX', () => {
        this._go('CodexScene', { returnTo: 'GameOverScene', returnData: data });
      }, PAL.bgPanel, PAL.accentGreenN);
      this.makeButton(row2StartX + btnSpacing, row2Y, btnH, 'MENU', () => {
        this._go('MainMenuScene');
      });
    } else {
      const btnY = height - 50;
      const btnSpacing = 135;
      const btnCount = 5;
      const btnStartX = cx - btnSpacing * (btnCount - 1) / 2;
      this.makeButton(btnStartX,                   btnY, btnH, 'RETRY', () => {
        this._go('GameScene', { stageId, mapId, commanderId, isEndless });
      });
      this.makeButton(btnStartX + btnSpacing,       btnY, btnH, 'UPGRADES', () => {
        this._go('MetaMenuScene');
      });
      this.makeButton(btnStartX + btnSpacing * 2,   btnY, btnH, 'GEAR', () => {
        this._go('InventoryScene');
      }, PAL.bgPanel, PAL.accentBlueN);
      this.makeButton(btnStartX + btnSpacing * 3,   btnY, btnH, 'CODEX', () => {
        this._go('CodexScene', { returnTo: 'GameOverScene', returnData: data });
      }, PAL.bgPanel, PAL.accentGreenN);
      this.makeButton(btnStartX + btnSpacing * 4,   btnY, btnH, 'MENU', () => {
        this._go('MainMenuScene');
      });
    }
  }

  private _go(key: string, data?: object): void {
    if (this._fading) return;
    this._fading = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(key, data);
    });
  }

  private makeButton(
    x: number, y: number, btnH: number, label: string, onClick: () => void,
    bgColor: number = PAL.bgGiveUp, textColor: number = PAL.dangerN,
  ): void {
    const textColorStr = '#' + textColor.toString(16).padStart(6, '0');
    const hoverBg = bgColor + 0x191919; // slightly lighter
    const bg = this.add.rectangle(x, y, 120, btnH, bgColor)
      .setStrokeStyle(2, textColor)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontSize: this._fs(14),
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
