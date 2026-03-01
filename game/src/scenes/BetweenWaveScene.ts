import Phaser from 'phaser';
import type { OfferManager } from '../systems/OfferManager';
import type { OfferDef } from '../data/offerDefs';
import { PAL } from '../ui/palette';

/** Data passed from GameScene when launching this scene. */
interface BetweenWaveData {
  offerManager:      OfferManager;
  waveJustCompleted: number;
  nextWave:          number;
}

// ── Layout ────────────────────────────────────────────────────────────────────
const CARD_W   = 220;
const CARD_H   = 300;
const DEPTH    = 300;
const SPACING  = CARD_W + 24;

// Category display metadata
const CAT_META: Record<string, { label: string; color: string }> = {
  combat:  { label: 'COMBAT',  color: PAL.bossWarning },
  economy: { label: 'ECONOMY', color: PAL.gold },
  synergy: { label: 'SYNERGY', color: PAL.accentBlue },
};

/**
 * BetweenWaveScene — shown after every wave completion (except the final wave).
 *
 * Presents 3 drawn offer cards; the player must click one to proceed.
 * The scene is NOT skippable: it has no dismiss button and intercepts all
 * pointer events below it via a full-screen blocking overlay.
 *
 * After a card is selected the scene emits 'between-wave-offer-picked' on the
 * GameScene event bus, then stops itself.
 */
export class BetweenWaveScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BetweenWaveScene' });
  }

  // Phaser types the data param as `object | undefined` — we cast internally.
  create(data: object | undefined): void {
    const { offerManager, waveJustCompleted, nextWave } = data as BetweenWaveData;
    const { width, height } = this.scale;
    const cx = width  / 2;
    const cy = height / 2;

    // ── Full-screen blocking overlay (intercepts ALL pointer events) ──────────
    this.add.rectangle(cx, cy, width, height, 0x000000, 0.78)
      .setDepth(DEPTH - 1)
      .setInteractive(); // swallows clicks — cannot click through to GameScene

    // ── Header text ───────────────────────────────────────────────────────────
    this.add.text(
      cx, cy - CARD_H / 2 - 60,
      `WAVE  ${waveJustCompleted}  COMPLETE  —  CHOOSE A POWER-UP`,
      {
        fontSize:   '18px',
        color:      PAL.accentBlue,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      },
    ).setOrigin(0.5).setDepth(DEPTH);

    this.add.text(
      cx, cy - CARD_H / 2 - 32,
      `Wave ${nextWave} begins after your choice`,
      {
        fontSize:   '13px',
        color:      PAL.textMuted,
        fontFamily: PAL.fontBody,
      },
    ).setOrigin(0.5).setDepth(DEPTH);

    // ── Draw 3 offers and build cards ─────────────────────────────────────────
    const offers = offerManager.drawOffers(3);
    const startX = cx - SPACING;   // left edge of first card centre

    for (let i = 0; i < offers.length; i++) {
      this.buildCard(offers[i], startX + i * SPACING, cy, offerManager);
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private buildCard(
    offer:        OfferDef,
    bx:           number,
    by:           number,
    offerManager: OfferManager,
  ): void {
    const meta   = CAT_META[offer.category] ?? { label: 'OFFER', color: PAL.textNeutral };
    const stroke = this.hexStringToInt(meta.color);

    // ── Card background ──────────────────────────────────────────────────────
    const card = this.add.rectangle(bx, by, CARD_W, CARD_H, PAL.bgCard)
      .setStrokeStyle(2, stroke, 0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH);

    // ── Category badge ───────────────────────────────────────────────────────
    this.add.text(bx, by - CARD_H / 2 + 18, meta.label, {
      fontSize:   '10px',
      color:      meta.color,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5).setDepth(DEPTH + 1);

    // ── Decorative separator ─────────────────────────────────────────────────
    const sepGfx = this.add.graphics().setDepth(DEPTH + 1);
    sepGfx.lineStyle(1, stroke, 0.3);
    sepGfx.beginPath();
    sepGfx.moveTo(bx - CARD_W / 2 + 16, by - CARD_H / 2 + 30);
    sepGfx.lineTo(bx + CARD_W / 2 - 16, by - CARD_H / 2 + 30);
    sepGfx.strokePath();

    // ── Offer name ───────────────────────────────────────────────────────────
    this.add.text(bx, by - CARD_H / 2 + 65, offer.name, {
      fontSize:   '16px',
      color:      '#ffffff',
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
      wordWrap:   { width: CARD_W - 24 },
      align:      'center',
    }).setOrigin(0.5).setDepth(DEPTH + 1);

    // ── Description ──────────────────────────────────────────────────────────
    this.add.text(bx, by + 10, offer.description, {
      fontSize:   '13px',
      color:      PAL.textCardDesc,
      fontFamily: PAL.fontBody,
      wordWrap:   { width: CARD_W - 28 },
      align:      'center',
    }).setOrigin(0.5).setDepth(DEPTH + 1);

    // ── "Choose" hint ────────────────────────────────────────────────────────
    this.add.text(bx, by + CARD_H / 2 - 22, '▶  CHOOSE', {
      fontSize:   '11px',
      color:      PAL.textDim,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5).setDepth(DEPTH + 1);

    // ── Hover / click interactions ───────────────────────────────────────────
    card.on('pointerover', () => {
      card.setFillStyle(PAL.bgCardHover).setStrokeStyle(2, stroke, 1.0);
    });
    card.on('pointerout', () => {
      card.setFillStyle(PAL.bgCard).setStrokeStyle(2, stroke, 0.5);
    });
    card.on('pointerup', () => this.pickOffer(offer, offerManager));
  }

  /**
   * Called when the player clicks a card.
   * Applies the offer, signals GameScene, then stops this scene.
   */
  private pickOffer(offer: OfferDef, offerManager: OfferManager): void {
    offerManager.applyOffer(offer.id);

    // Windfall: 150 instant gold applied via the GameScene callback.
    const instantGold = offer.id === 'windfall' ? 150 : 0;

    // Signal GameScene so it can apply instant effects and show the next-wave button.
    const gameScene = this.scene.get('GameScene');
    gameScene?.events.emit('between-wave-offer-picked', {
      offerId:     offer.id,
      instantGold,
    });

    this.scene.stop();
  }

  /** Convert a CSS hex colour string (e.g. '#ff6644') to an integer. */
  private hexStringToInt(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }
}
