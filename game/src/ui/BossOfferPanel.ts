import Phaser from 'phaser';
import { TAP_EVENT } from '../systems/MobileManager';
import { PAL } from './palette';

/** A single selectable reward shown in the boss offer panel. */
export interface BossOffer {
  label:       string;
  description: string;
  onChoose:    () => void;
}

const PANEL_DEPTH = 400;

/**
 * Full-screen offer panel shown after a boss is killed (when rewardOffer is true).
 *
 * Presents three mutually-exclusive reward choices.  The player clicks one;
 * the reward is applied and the panel is destroyed.
 *
 * Usage (GameScene example):
 *   new BossOfferPanel(this, bossData.bossName, [
 *     { label: 'Gold Rush',  description: '+400 Gold',       onChoose: () => addGold(400) },
 *     { label: 'Iron Will',  description: '+5 Lives',        onChoose: () => addLives(5)  },
 *     { label: 'Balanced',   description: '+250 Gold +2 ♥', onChoose: () => { addGold(250); addLives(2) } },
 *   ]);
 */
export class BossOfferPanel {
  private objects: Phaser.GameObjects.GameObject[] = [];

  constructor(
    scene:     Phaser.Scene,
    bossName:  string,
    offers:    BossOffer[],
    /** Called after the player makes a choice and the panel closes. */
    onClosed?: () => void,
  ) {
    const { width, height } = scene.scale;

    // ── Dimmed overlay (blocks map clicks while panel is open) ───────────────
    const overlay = scene.add.rectangle(
      width / 2, height / 2, width, height, 0x000000, 0.65,
    ).setDepth(PANEL_DEPTH - 1).setInteractive(); // intercepts pointer events

    // ── Centred card panel ───────────────────────────────────────────────────
    const cardW = Math.min(680, width - 48);
    const cardH = 260;
    const cardX = width  / 2;
    const cardY = height / 2;

    const card = scene.add.rectangle(cardX, cardY, cardW, cardH, PAL.bgBossPanel)
      .setStrokeStyle(2, PAL.borderBoss)
      .setDepth(PANEL_DEPTH);

    // ── Title ────────────────────────────────────────────────────────────────
    const title = scene.add.text(
      cardX,
      cardY - cardH / 2 + 28,
      `⚔  ${bossName.toUpperCase()}  DEFEATED  —  CHOOSE YOUR REWARD`,
      {
        fontSize:        '16px',
        color:           PAL.bossWarning,
        fontFamily:      PAL.fontBody,
        fontStyle:       'bold',
        stroke:          '#000000',
        strokeThickness: 3,
      },
    ).setOrigin(0.5, 0.5).setDepth(PANEL_DEPTH + 1);

    // ── Offer buttons ────────────────────────────────────────────────────────
    const btnCount = offers.length;
    const btnW     = (cardW - (btnCount + 1) * 14) / btnCount;
    const btnH     = 130;
    const btnY     = cardY + 22;
    const rowStartX = cardX - cardW / 2 + 14 + btnW / 2;

    for (let i = 0; i < btnCount; i++) {
      const offer = offers[i];
      const bx    = rowStartX + i * (btnW + 14);

      const btnBg = scene.add.rectangle(bx, btnY, btnW, btnH, PAL.bgBossCard)
        .setStrokeStyle(1, PAL.borderBossCard)
        .setInteractive({ useHandCursor: true })
        .setDepth(PANEL_DEPTH + 1);

      const btnLabel = scene.add.text(bx, btnY - 26, offer.label, {
        fontSize:  '17px',
        color:     PAL.textBossCardLabel,
        fontFamily: PAL.fontBody,
        fontStyle: 'bold',
        wordWrap:  { width: btnW - 20 },
        align:     'center',
      }).setOrigin(0.5, 0.5).setDepth(PANEL_DEPTH + 2);

      const btnDesc = scene.add.text(bx, btnY + 16, offer.description, {
        fontSize:  '13px',
        color:     PAL.textCardDesc,
        fontFamily: PAL.fontBody,
        wordWrap:  { width: btnW - 20 },
        align:     'center',
      }).setOrigin(0.5, 0.5).setDepth(PANEL_DEPTH + 2);

      btnBg.on('pointerover', () => {
        btnBg.setFillStyle(PAL.bgBossCardHover).setStrokeStyle(2, PAL.goldN);
        btnLabel.setColor(PAL.gold);
      });
      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(PAL.bgBossCard).setStrokeStyle(1, PAL.borderBossCard);
        btnLabel.setColor(PAL.textBossCardLabel);
      });
      btnBg.on(TAP_EVENT, () => {
        offer.onChoose();
        this.close();
        onClosed?.();
      });

      this.objects.push(btnBg, btnLabel, btnDesc);
    }

    this.objects.push(overlay, card, title);
  }

  /** Destroy all panel objects (called automatically when a choice is made). */
  close(): void {
    for (const obj of this.objects) {
      if (obj && obj.active !== false) {
        obj.destroy();
      }
    }
    this.objects = [];
  }

  /** True if the panel has been closed / all objects destroyed. */
  isClosed(): boolean {
    return this.objects.length === 0;
  }
}
