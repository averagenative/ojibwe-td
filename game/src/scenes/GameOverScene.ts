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

    // Title — endless runs always end in game-over (no victory possible)
    const titleText  = won ? 'VICTORY!'   : 'GAME OVER';
    const titleColor = won ? PAL.accentGreen : PAL.danger;
    this.add.text(cx, cy - 180, titleText, {
      fontSize: this._fs(52),
      color: titleColor,
      fontFamily: PAL.fontTitle,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Waves label — endless shows "Endless — Wave Reached: N"
    const wavesLabel = isEndless
      ? `Endless \u2014 Wave Reached: ${waves}`
      : `Waves completed: ${waves} / ${total}`;
    this.add.text(cx, cy - 120, wavesLabel, {
      fontSize: this._fs(20),
      color: PAL.textNeutral,
      fontFamily: PAL.fontBody,
    }).setOrigin(0.5);

    // Run currency + XP earned (side by side)
    this.add.text(cx - 100, cy - 88, `Crystals: +${currency}`, {
      fontSize: this._fs(18),
      color: PAL.accentBlue,
      fontFamily: PAL.fontBody,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx + 100, cy - 88, `XP: +${runXp}`, {
      fontSize: this._fs(18),
      color: PAL.gold,
      fontFamily: PAL.fontBody,
      fontStyle: 'bold',
    }).setOrigin(0.5);

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
        this.scene.start('GameScene', { stageId, mapId, commanderId, isEndless });
      });
      this.makeButton(row1StartX + btnSpacing,   row1Y, btnH, 'UPGRADES', () => {
        this.scene.start('MetaMenuScene');
      });
      this.makeButton(row1StartX + btnSpacing * 2, row1Y, btnH, 'GEAR', () => {
        this.scene.start('InventoryScene');
      }, PAL.bgPanel, PAL.accentBlueN);
      const row2StartX = cx - btnSpacing / 2;
      this.makeButton(row2StartX,              row2Y, btnH, 'CODEX', () => {
        this.scene.start('CodexScene', { returnTo: 'GameOverScene', returnData: data });
      }, PAL.bgPanel, PAL.accentGreenN);
      this.makeButton(row2StartX + btnSpacing, row2Y, btnH, 'MENU', () => {
        this.scene.start('MainMenuScene');
      });
    } else {
      const btnY = height - 50;
      const btnSpacing = 135;
      const btnCount = 5;
      const btnStartX = cx - btnSpacing * (btnCount - 1) / 2;
      this.makeButton(btnStartX,                   btnY, btnH, 'RETRY', () => {
        this.scene.start('GameScene', { stageId, mapId, commanderId, isEndless });
      });
      this.makeButton(btnStartX + btnSpacing,       btnY, btnH, 'UPGRADES', () => {
        this.scene.start('MetaMenuScene');
      });
      this.makeButton(btnStartX + btnSpacing * 2,   btnY, btnH, 'GEAR', () => {
        this.scene.start('InventoryScene');
      }, PAL.bgPanel, PAL.accentBlueN);
      this.makeButton(btnStartX + btnSpacing * 3,   btnY, btnH, 'CODEX', () => {
        this.scene.start('CodexScene', { returnTo: 'GameOverScene', returnData: data });
      }, PAL.bgPanel, PAL.accentGreenN);
      this.makeButton(btnStartX + btnSpacing * 4,   btnY, btnH, 'MENU', () => {
        this.scene.start('MainMenuScene');
      });
    }
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
