import Phaser from 'phaser';
import type { OfferManager } from '../systems/OfferManager';
import type { OfferDef } from '../data/offerDefs';
import type { WaveAnnouncementInfo } from '../systems/WaveManager';
import { PAL } from '../ui/palette';
import { MobileManager } from '../systems/MobileManager';
import { cbGroundBadgeFill, cbBossBadgeFill } from '../ui/colorblindPalette';

/** Data passed from GameScene when launching this scene. */
interface BetweenWaveData {
  offerManager:      OfferManager;
  waveJustCompleted: number;
  nextWave:          number;
  /** Upcoming wave metadata for the preview strip. Optional — omitted on the last wave. */
  nextWaveInfo?:     WaveAnnouncementInfo;
  /** Reroll tokens available this run. Each click re-draws fresh offer cards. */
  rerollTokens?:     number;
  /**
   * Tower type keys currently placed on the field.  Used to gate synergy
   * offers that require specific tower combinations.
   * e.g. ['frost', 'mortar', 'rock-hurler']
   */
  placedTowerKeys?:  string[];
  /**
   * Number of offer cards to display (default 3).
   * Commanders with aura bonuses (e.g. Oshkaabewis) may increase this to 4.
   */
  offerCount?:       number;
}

// ── Layout ────────────────────────────────────────────────────────────────────
const CARD_W   = 220;
const CARD_H   = 320; // slightly taller (was 300) to accommodate longer descriptions
const DEPTH    = 300;
const SPACING  = CARD_W + 24;

// Category display metadata
const CAT_META: Record<string, { label: string; color: string }> = {
  combat:  { label: 'COMBAT',  color: PAL.bossWarning },
  economy: { label: 'ECONOMY', color: PAL.gold },
  synergy: { label: 'SYNERGY', color: PAL.accentBlue },
};

/**
 * Rarity → border colour (numeric 0x for Phaser setStrokeStyle).
 * common = grey,  rare = lake blue,  epic = autumn gold,  challenge = danger red.
 */
const RARITY_STROKE: Record<string, number> = {
  common:    0x888888,           // neutral grey
  rare:      PAL.accentBlueN,   // lake blue
  epic:      PAL.goldN,         // autumn gold
  challenge: PAL.dangerN,       // ember red (negative/challenge offers)
};

/**
 * BetweenWaveScene — shown after every wave completion (except the final wave).
 *
 * Presents drawn offer cards (count driven by `offerCount` param); the player must click one to proceed.
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
  /** Tower keys currently on the field — used for synergy gating. */
  private _placedTowerKeys: string[] = [];
  /** Number of offer cards to display — set from BetweenWaveData.offerCount. */
  private _offerCount = 3;
  /** Container holding the offer cards — replaced on each reroll. */
  private _cardsContainer?: Phaser.GameObjects.Container;
  /** Reroll button text (updates token count after each use). */
  private _rerollLabel?: Phaser.GameObjects.Text;
  /** Reroll button background (greyed out when tokens exhausted). */
  private _rerollBg?: Phaser.GameObjects.Rectangle;

  /** True when running on a mobile/touch device. Set once in create(). */
  private _isMobile = false;
  /** Active card height — taller on mobile to accommodate scaled fonts. */
  private _cardH = CARD_H;

  /**
   * Returns a CSS font-size string scaled up by 1.35× on mobile.
   */
  private _fs(size: number): string {
    const s = this._isMobile ? Math.round(size * 1.35) : size;
    return `${s}px`;
  }

  constructor() {
    super({ key: 'BetweenWaveScene' });
  }

  // Phaser types the data param as `object | undefined` — we cast internally.
  create(data: object | undefined): void {
    this._isMobile = MobileManager.getInstance().isMobile();
    // On mobile, taller cards accommodate the scaled-up fonts.
    this._cardH = this._isMobile ? 340 : CARD_H;

    const { offerManager, waveJustCompleted, nextWave, nextWaveInfo, rerollTokens = 0, placedTowerKeys = [], offerCount = 3 } =
      data as BetweenWaveData;

    this._offerManager    = offerManager;
    this._placedTowerKeys = placedTowerKeys;
    this._offerCount      = offerCount;
    this._rerollsLeft     = rerollTokens;
    this._rerollsUsed     = 0;

    const { width, height } = this.scale;
    const cx = width  / 2;
    const cy = height / 2;

    // ── Full-screen blocking overlay (intercepts ALL pointer events) ──────────
    this.add.rectangle(cx, cy, width, height, 0x000000, 0.78)
      .setDepth(DEPTH - 1)
      .setInteractive(); // swallows clicks — cannot click through to GameScene

    // ── Header text ───────────────────────────────────────────────────────────
    this.add.text(
      cx, cy - this._cardH / 2 - 60,
      `WAVE  ${waveJustCompleted}  COMPLETE  —  CHOOSE A POWER-UP`,
      {
        fontSize:   this._fs(18),
        color:      PAL.accentBlue,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      },
    ).setOrigin(0.5).setDepth(DEPTH);

    this.add.text(
      cx, cy - this._cardH / 2 - 32,
      `Wave ${nextWave} begins after your choice`,
      {
        fontSize:   this._fs(13),
        color:      PAL.textMuted,
        fontFamily: PAL.fontBody,
      },
    ).setOrigin(0.5).setDepth(DEPTH);

    // ── Upcoming wave preview strip ───────────────────────────────────────────
    if (nextWaveInfo) {
      this.buildWavePreview(cx, cy - this._cardH / 2 - 12, nextWaveInfo);
    }

    // ── Reroll button (shown only when tokens > 0 on entry) ──────────────────
    if (rerollTokens > 0) {
      this.buildRerollButton(cx, cy + this._cardH / 2 + 36);
    }

    // ── Draw 3 offers and build initial cards ─────────────────────────────────
    this._buildCards(offerManager, cx, cy);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * (Re)build the offer card objects into `_cardsContainer`, destroying any
   * previous container first.  Called on create and on each reroll.
   */
  private _buildCards(offerManager: OfferManager, cx: number, cy: number): void {
    this._cardsContainer?.destroy();
    this._cardsContainer = this.add.container(0, 0).setDepth(DEPTH);

    const offers  = offerManager.drawOffers(this._offerCount, this._placedTowerKeys);
    // Centre the card strip: for N cards the first card is offset left by (N-1)/2 slots.
    const startX  = cx - ((this._offerCount - 1) / 2) * SPACING;

    for (let i = 0; i < offers.length; i++) {
      this.buildCard(offers[i], startX + i * SPACING, cy, offerManager, this._cardH);
    }
  }

  /**
   * Build the REROLL button.  Placed below the cards.
   * Disables itself (visually) once tokens are exhausted.
   */
  private buildRerollButton(cx: number, y: number): void {
    const { height } = this.scale;
    const cy = height / 2;
    // Minimum 44px height on mobile for tap target.
    const btnH = this._isMobile ? 44 : 40;

    this._rerollBg = this.add.rectangle(cx, y, 240, btnH, 0x221100)
      .setStrokeStyle(2, 0xaa6600)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH);

    this._rerollLabel = this.add.text(cx, y, this._rerollLabelText(), {
      fontSize:   this._fs(14),
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
    /**
     * Badge labels include shape/icon characters for non-colour identification:
     * ⛰ = ground/terrain  ✈ = air  ☠ = boss skull
     */
    const BADGE_TEXT: Record<WaveAnnouncementInfo['waveType'], string> = {
      ground: '⛰ GROUND',
      air:    '✈ AIR',
      mixed:  '⛰✈ MIXED',
      boss:   '☠ BOSS',
    };

    const badgeW   = info.waveType === 'mixed' ? 72 : 60;
    const badgeH   = 18;
    const badgeX   = cx - badgeW / 2 - 60;

    if (info.waveType === 'mixed') {
      const gfx = this.add.graphics().setDepth(DEPTH);
      gfx.fillStyle(cbGroundBadgeFill(), 1);
      gfx.fillRect(badgeX - badgeW / 2, y - badgeH / 2, badgeW / 2, badgeH);
      gfx.fillStyle(PAL.accentBlueN, 1);
      gfx.fillRect(badgeX, y - badgeH / 2, badgeW / 2, badgeH);
    } else {
      const fillColor = info.waveType === 'ground'
        ? cbGroundBadgeFill()
        : info.waveType === 'boss'
          ? cbBossBadgeFill()
          : PAL.accentBlueN; // air — always lake blue
      this.add.rectangle(badgeX, y, badgeW, badgeH, fillColor)
        .setDepth(DEPTH);
    }

    // Boss badge gets larger text per the colorblind-accessibility spec.
    const badgeFontSize = info.waveType === 'boss' ? this._fs(13) : this._fs(11);
    this.add.text(badgeX, y, BADGE_TEXT[info.waveType], {
      fontSize:   badgeFontSize,
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
      fontSize:   this._fs(11),
      color:      info.isBoss ? PAL.bossWarning : PAL.textMuted,
      fontFamily: PAL.fontBody,
    }).setOrigin(0, 0.5).setDepth(DEPTH + 1);
  }

  private buildCard(
    offer:        OfferDef,
    bx:           number,
    by:           number,
    offerManager: OfferManager,
    cardH:        number = CARD_H,
  ): void {
    const meta   = CAT_META[offer.category] ?? { label: 'OFFER', color: PAL.textNeutral };

    // ── Rarity-based border colour ───────────────────────────────────────────
    // Challenge/negative offers always render with a red border regardless of rarity.
    const rarityKey = offer.isChallenge ? 'challenge' : (offer.rarity ?? 'common');
    const stroke    = RARITY_STROKE[rarityKey] ?? RARITY_STROKE.common;

    // ── Card background ──────────────────────────────────────────────────────
    const bgFill = offer.isChallenge ? 0x1a0808 : PAL.bgCard;
    const card = this.add.rectangle(bx, by, CARD_W, cardH, bgFill)
      .setStrokeStyle(2, stroke, 0.6)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH);

    // Add card to container so it's destroyed on reroll
    this._cardsContainer?.add(card);

    // ── Rarity badge (top-right corner) ─────────────────────────────────────
    const rarityLabel = offer.isChallenge ? '⚠ CHALLENGE'
      : offer.rarity === 'epic'   ? '★ EPIC'
      : offer.rarity === 'rare'   ? '◆ RARE'
      : 'COMMON';
    const rarityColor = offer.isChallenge ? PAL.danger
      : offer.rarity === 'epic'   ? PAL.gold
      : offer.rarity === 'rare'   ? PAL.accentBlue
      : PAL.textNeutral;

    const rarityText = this.add.text(bx + CARD_W / 2 - 6, by - cardH / 2 + 8, rarityLabel, {
      fontSize:   this._fs(11),
      color:      rarityColor,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(1, 0).setDepth(DEPTH + 2);
    this._cardsContainer?.add(rarityText);

    // ── Category badge ───────────────────────────────────────────────────────
    const catText = this.add.text(bx - CARD_W / 2 + 6, by - cardH / 2 + 8, meta.label, {
      fontSize:   this._fs(11),
      color:      meta.color,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0, 0).setDepth(DEPTH + 2);
    this._cardsContainer?.add(catText);

    // ── Decorative separator ─────────────────────────────────────────────────
    const sepGfx = this.add.graphics().setDepth(DEPTH + 1);
    sepGfx.lineStyle(1, stroke, 0.3);
    sepGfx.beginPath();
    sepGfx.moveTo(bx - CARD_W / 2 + 16, by - cardH / 2 + 24);
    sepGfx.lineTo(bx + CARD_W / 2 - 16, by - cardH / 2 + 24);
    sepGfx.strokePath();
    this._cardsContainer?.add(sepGfx);

    // ── Offer name ───────────────────────────────────────────────────────────
    const nameColor = offer.isChallenge ? PAL.danger : '#ffffff';
    const nameText = this.add.text(bx, by - cardH / 2 + 65, offer.name, {
      fontSize:   this._fs(16),
      color:      nameColor,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
      wordWrap:   { width: CARD_W - 24 },
      align:      'center',
    }).setOrigin(0.5).setDepth(DEPTH + 1);
    this._cardsContainer?.add(nameText);

    // ── Description ──────────────────────────────────────────────────────────
    const descText = this.add.text(bx, by + 10, offer.description, {
      fontSize:   this._fs(13),
      color:      PAL.textCardDesc,
      fontFamily: PAL.fontBody,
      wordWrap:   { width: CARD_W - 28 },
      align:      'center',
    }).setOrigin(0.5).setDepth(DEPTH + 1);
    this._cardsContainer?.add(descText);

    // ── "Choose" hint ────────────────────────────────────────────────────────
    const chooseHint = this.add.text(bx, by + cardH / 2 - 22, '▶  CHOOSE', {
      fontSize:   this._fs(11),
      color:      PAL.textDim,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5).setDepth(DEPTH + 1);
    this._cardsContainer?.add(chooseHint);

    // ── Hover / click interactions ───────────────────────────────────────────
    card.on('pointerover', () => {
      const hoverFill = offer.isChallenge ? 0x2a1010 : PAL.bgCardHover;
      card.setFillStyle(hoverFill).setStrokeStyle(2, stroke, 1.0);
    });
    card.on('pointerout', () => {
      card.setFillStyle(bgFill).setStrokeStyle(2, stroke, 0.6);
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

    // Stop this scene BEFORE emitting — the emit handler may synchronously
    // re-launch BetweenWaveScene for the next queued wave, and a subsequent
    // scene.stop() would kill that new instance.
    const rerollsUsed = this._rerollsUsed;
    const gameScene = this.scene.get('GameScene');
    this.scene.stop();

    gameScene?.events.emit('between-wave-offer-picked', {
      offerId:      offer.id,
      instantGold,
      rerollsUsed,
    });
  }

}
