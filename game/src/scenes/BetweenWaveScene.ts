import Phaser from 'phaser';
import type { OfferManager } from '../systems/OfferManager';
import type { OfferDef } from '../data/offerDefs';
import type { WaveAnnouncementInfo } from '../systems/WaveManager';
import { PAL } from '../ui/palette';

/** Data passed from GameScene when launching this scene. */
interface BetweenWaveData {
  offerManager:      OfferManager;
  waveJustCompleted: number;
  nextWave:          number;
  /** Upcoming wave metadata for the preview strip. Optional — omitted on the last wave. */
  nextWaveInfo?:     WaveAnnouncementInfo;
  /** Reroll tokens available this run. Each click re-draws 3 fresh offer cards. */
  rerollTokens?:     number;
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
 *
 * If the player has reroll tokens remaining (from meta consumables) a REROLL
 * button is shown. Each click re-draws 3 new offers and costs 1 token.
 */
export class BetweenWaveScene extends Phaser.Scene {
  /** Reroll tokens remaining for this between-wave screen. */
  private _rerollsLeft  = 0;
  /** Number of rerolls used so far (reported back to GameScene). */
  private _rerollsUsed  = 0;
  /** Saved reference so we can rebuild cards on reroll. */
  private _offerManager?: OfferManager;
  /** Container holding the 3 offer cards — replaced on each reroll. */
  private _cardsContainer?: Phaser.GameObjects.Container;
  /** Reroll button text (updates token count after each use). */
  private _rerollLabel?: Phaser.GameObjects.Text;
  /** Reroll button background (greyed out when tokens exhausted). */
  private _rerollBg?: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'BetweenWaveScene' });
  }

  // Phaser types the data param as `object | undefined` — we cast internally.
  create(data: object | undefined): void {
    const { offerManager, waveJustCompleted, nextWave, nextWaveInfo, rerollTokens = 0 } =
      data as BetweenWaveData;

    this._offerManager = offerManager;
    this._rerollsLeft  = rerollTokens;
    this._rerollsUsed  = 0;

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

    // ── Upcoming wave preview strip ───────────────────────────────────────────
    if (nextWaveInfo) {
      this.buildWavePreview(cx, cy - CARD_H / 2 - 12, nextWaveInfo);
    }

    // ── Reroll button (shown only when tokens > 0 on entry) ──────────────────
    if (rerollTokens > 0) {
      this.buildRerollButton(cx, cy + CARD_H / 2 + 36);
    }

    // ── Draw 3 offers and build initial cards ─────────────────────────────────
    this._buildCards(offerManager, cx, cy);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * (Re)build the 3 offer card objects into `_cardsContainer`, destroying any
   * previous container first.  Called on create and on each reroll.
   */
  private _buildCards(offerManager: OfferManager, cx: number, cy: number): void {
    this._cardsContainer?.destroy();
    this._cardsContainer = this.add.container(0, 0).setDepth(DEPTH);

    const offers  = offerManager.drawOffers(3);
    const startX  = cx - SPACING;

    for (let i = 0; i < offers.length; i++) {
      this.buildCard(offers[i], startX + i * SPACING, cy, offerManager);
    }
  }

  /**
   * Build the REROLL button.  Placed below the cards.
   * Disables itself (visually) once tokens are exhausted.
   */
  private buildRerollButton(cx: number, y: number): void {
    const { height } = this.scale;
    const cy = height / 2;

    this._rerollBg = this.add.rectangle(cx, y, 220, 40, 0x221100)
      .setStrokeStyle(2, 0xaa6600)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH);

    this._rerollLabel = this.add.text(cx, y, this._rerollLabelText(), {
      fontSize:   '14px',
      color:      '#ffaa44',
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5).setDepth(DEPTH + 1);

    this._rerollBg.on('pointerover', () => {
      if (this._rerollsLeft > 0) this._rerollBg?.setFillStyle(0x442200);
    });
    this._rerollBg.on('pointerout', () => {
      if (this._rerollsLeft > 0) this._rerollBg?.setFillStyle(0x221100);
    });
    this._rerollBg.on('pointerup', () => {
      if (this._rerollsLeft <= 0) return;
      this._rerollsLeft--;
      this._rerollsUsed++;
      // Rebuild offers
      this._buildCards(this._offerManager!, cx, cy);
      // Update button label / state
      this._rerollLabel?.setText(this._rerollLabelText());
      if (this._rerollsLeft === 0) {
        this._rerollBg?.setFillStyle(0x1a1a1a).setStrokeStyle(2, 0x444444);
        this._rerollLabel?.setColor('#666666');
        this._rerollBg?.removeInteractive();
      }
    });
  }

  private _rerollLabelText(): string {
    return `REROLL OFFERS  (${this._rerollsLeft} left)`;
  }

  /**
   * Render a compact upcoming-wave info strip.
   * Shows the wave type badge, creep count, and notable traits as a single
   * row below the "Wave N begins after your choice" sub-header.
   */
  private buildWavePreview(cx: number, y: number, info: WaveAnnouncementInfo): void {
    // Wave type badge colours
    const BADGE_FILL: Record<WaveAnnouncementInfo['waveType'], number> = {
      ground: PAL.accentGreenN,
      air:    PAL.accentBlueN,
      mixed:  PAL.accentGreenN,  // drawn as split below
      boss:   PAL.bossWarningN,
    };
    const BADGE_TEXT: Record<WaveAnnouncementInfo['waveType'], string> = {
      ground: 'GROUND',
      air:    '✈ AIR',
      mixed:  'MIXED',
      boss:   'BOSS',
    };

    const badgeW   = info.waveType === 'mixed' ? 64 : 54;
    const badgeH   = 18;
    const badgeX   = cx - badgeW / 2 - 60;

    if (info.waveType === 'mixed') {
      const gfx = this.add.graphics().setDepth(DEPTH);
      gfx.fillStyle(PAL.accentGreenN, 1);
      gfx.fillRect(badgeX - badgeW / 2, y - badgeH / 2, badgeW / 2, badgeH);
      gfx.fillStyle(PAL.accentBlueN, 1);
      gfx.fillRect(badgeX, y - badgeH / 2, badgeW / 2, badgeH);
    } else {
      this.add.rectangle(badgeX, y, badgeW, badgeH, BADGE_FILL[info.waveType])
        .setDepth(DEPTH);
    }

    this.add.text(badgeX, y, BADGE_TEXT[info.waveType], {
      fontSize:   '10px',
      color:      '#ffffff',
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);

    // Count + traits summary to the right of the badge
    const parts: string[] = [];
    if (info.isBoss) {
      parts.push(info.bossName ? `${info.bossName}` : 'Boss');
      if (info.escortCount && info.escortCount > 0) {
        parts.push(`×${info.escortCount} escorts`);
      }
    } else {
      parts.push(`×${info.creepCount} creeps`);
    }
    if (info.traits.length > 0) parts.push(info.traits.join(', '));

    this.add.text(badgeX + badgeW / 2 + 8, y, parts.join('  ·  '), {
      fontSize:   '11px',
      color:      info.isBoss ? PAL.bossWarning : PAL.textMuted,
      fontFamily: PAL.fontBody,
    }).setOrigin(0, 0.5).setDepth(DEPTH + 1);
  }

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

    // Add card to container so it's destroyed on reroll
    this._cardsContainer?.add(card);

    // ── Category badge ───────────────────────────────────────────────────────
    const catText = this.add.text(bx, by - CARD_H / 2 + 18, meta.label, {
      fontSize:   '10px',
      color:      meta.color,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5).setDepth(DEPTH + 1);
    this._cardsContainer?.add(catText);

    // ── Decorative separator ─────────────────────────────────────────────────
    const sepGfx = this.add.graphics().setDepth(DEPTH + 1);
    sepGfx.lineStyle(1, stroke, 0.3);
    sepGfx.beginPath();
    sepGfx.moveTo(bx - CARD_W / 2 + 16, by - CARD_H / 2 + 30);
    sepGfx.lineTo(bx + CARD_W / 2 - 16, by - CARD_H / 2 + 30);
    sepGfx.strokePath();
    this._cardsContainer?.add(sepGfx);

    // ── Offer name ───────────────────────────────────────────────────────────
    const nameText = this.add.text(bx, by - CARD_H / 2 + 65, offer.name, {
      fontSize:   '16px',
      color:      '#ffffff',
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
      wordWrap:   { width: CARD_W - 24 },
      align:      'center',
    }).setOrigin(0.5).setDepth(DEPTH + 1);
    this._cardsContainer?.add(nameText);

    // ── Description ──────────────────────────────────────────────────────────
    const descText = this.add.text(bx, by + 10, offer.description, {
      fontSize:   '13px',
      color:      PAL.textCardDesc,
      fontFamily: PAL.fontBody,
      wordWrap:   { width: CARD_W - 28 },
      align:      'center',
    }).setOrigin(0.5).setDepth(DEPTH + 1);
    this._cardsContainer?.add(descText);

    // ── "Choose" hint ────────────────────────────────────────────────────────
    const chooseHint = this.add.text(bx, by + CARD_H / 2 - 22, '▶  CHOOSE', {
      fontSize:   '11px',
      color:      PAL.textDim,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5).setDepth(DEPTH + 1);
    this._cardsContainer?.add(chooseHint);

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
      offerId:      offer.id,
      instantGold,
      rerollsUsed:  this._rerollsUsed,
    });

    this.scene.stop();
  }

  /** Convert a CSS hex colour string (e.g. '#ff6644') to an integer. */
  private hexStringToInt(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }
}
