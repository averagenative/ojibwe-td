/**
 * ChallengeSelectScene — challenge map selection screen.
 *
 * Shows all challenge maps with lock/unlock state, modifier descriptions,
 * guaranteed drop rarity badges, and a weekly featured highlight.
 * Accessible from MainMenuScene.
 */

import Phaser from 'phaser';
import { ALL_CHALLENGES, getFeaturedChallengeId, getUnlockedChallenges } from '../data/challengeDefs';
import type { ChallengeDef } from '../data/challengeDefs';
import { SaveManager } from '../meta/SaveManager';
import { PAL } from '../ui/palette';

// ── Layout constants ──────────────────────────────────────────────────────────

const CARD_W      = 560;
const CARD_H      = 130;
const CARD_GAP    = 16;
const CARD_PAD_X  = 20;
const CARD_TOP    = 110;

const RARITY_BADGE_COLORS: Record<string, { hex: string; num: number }> = {
  rare:      { hex: '#4488ff', num: 0x4488ff },
  epic:      { hex: '#aa44ff', num: 0xaa44ff },
  legendary: { hex: '#ff8800', num: 0xff8800 },
};

export class ChallengeSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ChallengeSelectScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const save = SaveManager.getInstance();

    // Background
    this.add.rectangle(cx, height / 2, width, height, PAL.bgDark);

    // Title
    this.add.text(cx, 30, 'CHALLENGE MAPS', {
      fontSize:   '30px',
      color:      PAL.accentGreen,
      fontFamily: PAL.fontTitle,
      fontStyle:  'bold',
    }).setOrigin(0.5);

    // Crystal balance
    this.add.text(cx, 70, `Crystals: ${save.getCurrency()}`, {
      fontSize:   '16px',
      color:      PAL.gold,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(cx, 92, 'Complete challenges for guaranteed gear drops', {
      fontSize:   '12px',
      color:      PAL.textDim,
      fontFamily: PAL.fontBody,
      fontStyle:  'italic',
    }).setOrigin(0.5);

    // Determine featured and unlocked
    const featuredId = getFeaturedChallengeId();
    const totalSpent = this._estimateTotalSpent(save);
    const unlocked = getUnlockedChallenges(totalSpent);
    const unlockedIds = new Set(unlocked.map(c => c.id));

    // Render challenge cards
    let y = CARD_TOP;
    for (const challenge of ALL_CHALLENGES) {
      const isUnlocked = unlockedIds.has(challenge.id);
      const isFeatured = challenge.id === featuredId;

      this._renderCard(cx, y, challenge, isUnlocked, isFeatured);
      y += CARD_H + CARD_GAP;
    }

    // Scrollable area note if cards overflow
    if (y > height - 60) {
      // Content extends below fold — user can scroll via Phaser camera
      this.cameras.main.setBounds(0, 0, width, y + 60);
      this.input.on('wheel', (_ptr: Phaser.Input.Pointer, _gx: number[], _gy: number[], _gz: number[], dy: number) => {
        this.cameras.main.scrollY = Phaser.Math.Clamp(
          this.cameras.main.scrollY + dy * 0.5,
          0,
          y + 60 - height,
        );
      });
    }

    // BACK button (fixed to screen via depth trick — placed last)
    this._makeButton(cx, height - 40, 'BACK', () => {
      this.scene.start('MainMenuScene');
    });
  }

  // ── Card renderer ───────────────────────────────────────────────────────────

  private _renderCard(
    cx: number, y: number,
    challenge: ChallengeDef,
    isUnlocked: boolean,
    isFeatured: boolean,
  ): void {
    const leftX = cx - CARD_W / 2 + CARD_PAD_X;

    // Border color
    let borderColor: number = PAL.borderInactive;
    let bgColor: number = PAL.bgPanel;
    if (isFeatured && isUnlocked) {
      borderColor = PAL.goldN;
      bgColor = PAL.bgCard;
    } else if (isUnlocked) {
      borderColor = PAL.accentGreenN;
    } else {
      borderColor = PAL.borderLocked;
      bgColor = PAL.bgPanelLocked;
    }

    const cardBg = this.add.rectangle(cx, y + CARD_H / 2, CARD_W, CARD_H, bgColor)
      .setStrokeStyle(isFeatured && isUnlocked ? 3 : 2, borderColor);

    // Name
    const nameColor = isUnlocked ? PAL.textPrimary : PAL.textLocked;
    this.add.text(leftX, y + 12, challenge.name, {
      fontSize:   '18px',
      color:      nameColor,
      fontFamily: PAL.fontTitle,
      fontStyle:  'bold',
    });

    // Description
    const descColor = isUnlocked ? PAL.textDesc : PAL.textLockedDim;
    this.add.text(leftX, y + 36, challenge.description, {
      fontSize:   '12px',
      color:      descColor,
      fontFamily: PAL.fontBody,
      wordWrap:   { width: CARD_W - CARD_PAD_X * 2 - 140 },
    });

    // Modifier text
    this.add.text(leftX, y + 58, challenge.modifier.description, {
      fontSize:   '10px',
      color:      isUnlocked ? PAL.textDim : PAL.textLockedDim,
      fontFamily: PAL.fontBody,
      fontStyle:  'italic',
      wordWrap:   { width: CARD_W - CARD_PAD_X * 2 - 140 },
    });

    // Wave count
    this.add.text(leftX, y + CARD_H - 26, `${challenge.modifier.waveCount} waves`, {
      fontSize:   '10px',
      color:      isUnlocked ? PAL.textMuted : PAL.textLockedDim,
      fontFamily: PAL.fontBody,
    });

    // ── Right side badges ───────────────────────────────────────────────────

    const rightX = cx + CARD_W / 2 - CARD_PAD_X;

    // Guaranteed rarity badge
    const rarityBadge = RARITY_BADGE_COLORS[challenge.guaranteedRarity];
    if (rarityBadge) {
      const badgeLabel = challenge.guaranteedRarity.charAt(0).toUpperCase() + challenge.guaranteedRarity.slice(1);
      this.add.rectangle(rightX - 50, y + 18, 96, 22, 0x000000)
        .setStrokeStyle(1, rarityBadge.num)
        .setAlpha(0.8);
      this.add.text(rightX - 50, y + 18, `${badgeLabel}+`, {
        fontSize:   '11px',
        color:      rarityBadge.hex,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0.5);
    }

    // Featured badge
    if (isFeatured) {
      this.add.rectangle(rightX - 50, y + 46, 120, 22, PAL.goldN)
        .setAlpha(0.15);
      this.add.rectangle(rightX - 50, y + 46, 120, 22, 0x000000)
        .setAlpha(0)
        .setStrokeStyle(1, PAL.goldN);
      this.add.text(rightX - 50, y + 46, 'FEATURED THIS WEEK', {
        fontSize:   '9px',
        color:      PAL.gold,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0.5);
    }

    // Lock / unlock state
    if (!isUnlocked) {
      // Lock overlay
      this.add.rectangle(cx, y + CARD_H / 2, CARD_W, CARD_H, 0x000000)
        .setAlpha(0.4);

      this.add.text(rightX - 50, y + CARD_H - 30, `Requires ${challenge.unlockThreshold} crystals`, {
        fontSize:   '11px',
        color:      PAL.textLocked,
        fontFamily: PAL.fontBody,
      }).setOrigin(0.5);
    } else {
      // Make clickable
      cardBg.setInteractive({ useHandCursor: true });
      cardBg.on('pointerover', () => cardBg.setFillStyle(PAL.bgCardHover));
      cardBg.on('pointerout',  () => cardBg.setFillStyle(bgColor));
      cardBg.on('pointerup', () => {
        this.scene.start('GameScene', {
          stageId:     undefined,
          mapId:       challenge.pathFile,
          isChallenge: true,
          challengeId: challenge.id,
        });
      });
    }

    // Gold multiplier
    if (challenge.modifier.goldMult !== 1.0) {
      this.add.text(leftX + 80, y + CARD_H - 26, `Gold x${challenge.modifier.goldMult}`, {
        fontSize:   '10px',
        color:      isUnlocked ? PAL.gold : PAL.textLockedDim,
        fontFamily: PAL.fontBody,
      });
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Estimate total crystals spent by summing currency + cost of all unlocked nodes.
   * This is an approximation — getUnlockedChallenges uses a threshold check.
   */
  private _estimateTotalSpent(save: SaveManager): number {
    // For simplicity, use current currency as a proxy for total earned
    // The challenge system uses unlockThreshold against total crystals spent,
    // but we approximate with current balance + a rough spent estimate.
    return save.getCurrency();
  }

  private _makeButton(
    x: number, y: number, label: string, onClick: () => void,
    bgColor: number = PAL.bgPanel, textColor: number = PAL.accentGreenN,
  ): void {
    const textColorStr = '#' + textColor.toString(16).padStart(6, '0');
    const bg = this.add.rectangle(x, y, 180, 44, bgColor)
      .setStrokeStyle(2, textColor)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: '15px', color: textColorStr, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(bgColor + 0x111111));
    bg.on('pointerout',  () => bg.setFillStyle(bgColor));
    bg.on('pointerup', onClick);
  }
}
