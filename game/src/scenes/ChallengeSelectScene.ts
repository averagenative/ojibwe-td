/**
 * ChallengeSelectScene — challenge map selection screen.
 *
 * Shows all challenge maps with lock/unlock state, modifier descriptions,
 * guaranteed drop rarity badges, and a weekly featured highlight.
 * Accessible from MainMenuScene.
 *
 * Scrolling: camera-bounds + mouse-wheel + pointer-drag (touch) with momentum
 * deceleration.  Fixed BACK button, scrollbar thumb, and bottom-fade gradient
 * all use setScrollFactor(0) so they stay pinned to the screen.
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

/** Height reserved at the bottom of the screen for the BACK button strip. */
const BACK_AREA_H = 64;

// ── Scroll constants ──────────────────────────────────────────────────────────

/** Velocity multiplier applied each frame (lower = more friction). */
const SCROLL_FRICTION = 0.88;
/** Minimum velocity (px/frame) below which momentum is zeroed. */
const MIN_VELOCITY    = 0.5;
/** Width of the scrollbar track and thumb. */
const SCROLLBAR_W     = 8;
/** Horizontal gap between scrollbar and the right edge of the canvas. */
const SCROLLBAR_RPAD  = 6;
/** Height of the bottom-fade gradient overlay. */
const FADE_HEIGHT     = 60;
/** Number of gradient bands used to draw the fade. */
const FADE_STEPS      = 8;

// ── Rarity colours ────────────────────────────────────────────────────────────

const RARITY_BADGE_COLORS: Record<string, { hex: string; num: number }> = {
  rare:      { hex: '#4488ff', num: 0x4488ff },
  epic:      { hex: '#aa44ff', num: 0xaa44ff },
  legendary: { hex: '#ff8800', num: 0xff8800 },
};

// ── Scene ─────────────────────────────────────────────────────────────────────

export class ChallengeSelectScene extends Phaser.Scene {
  // ── Scroll state ──────────────────────────────────────────────────────────
  private _isDragging       = false;
  private _dragStartY       = 0;
  private _dragStartScrollY = 0;
  private _scrollVelocity   = 0;
  private _maxScrollY       = 0;

  // ── Visual scroll indicators ──────────────────────────────────────────────
  private _scrollThumb: Phaser.GameObjects.Rectangle | null = null;
  private _fadeGfx:     Phaser.GameObjects.Graphics  | null = null;
  private _scrollTrackTop = 0;
  private _scrollTrackH   = 0;
  private _thumbH         = 0;

  constructor() {
    super({ key: 'ChallengeSelectScene' });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const save = SaveManager.getInstance();

    // ── Reset scroll state and camera position on every open ────────────────
    this._isDragging       = false;
    this._scrollVelocity   = 0;
    this._maxScrollY       = 0;
    this._scrollThumb      = null;
    this._fadeGfx          = null;
    this.cameras.main.setScroll(0, 0);

    // ── Background (covers full content height) ──────────────────────────────
    const contentHeight =
      CARD_TOP + ALL_CHALLENGES.length * (CARD_H + CARD_GAP) + 60;
    this.add.rectangle(cx, contentHeight / 2, width, contentHeight, PAL.bgDark);

    // ── Header (scrolls with content — acceptable for long lists) ────────────
    this.add.text(cx, 30, 'CHALLENGE MAPS', {
      fontSize:   '30px',
      color:      PAL.accentGreen,
      fontFamily: PAL.fontTitle,
      fontStyle:  'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 70, `Crystals: ${save.getCurrency()}`, {
      fontSize:   '16px',
      color:      PAL.gold,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 92, 'Complete challenges for guaranteed gear drops', {
      fontSize:   '12px',
      color:      PAL.textDim,
      fontFamily: PAL.fontBody,
      fontStyle:  'italic',
    }).setOrigin(0.5);

    // ── Challenge cards ───────────────────────────────────────────────────────
    const featuredId  = getFeaturedChallengeId();
    const totalSpent  = this._estimateTotalSpent(save);
    const unlocked    = getUnlockedChallenges(totalSpent);
    const unlockedIds = new Set(unlocked.map(c => c.id));

    let y = CARD_TOP;
    for (const challenge of ALL_CHALLENGES) {
      const isUnlocked = unlockedIds.has(challenge.id);
      const isFeatured = challenge.id === featuredId;
      this._renderCard(cx, y, challenge, isUnlocked, isFeatured);
      y += CARD_H + CARD_GAP;
    }

    // ── Scrollable area setup ─────────────────────────────────────────────────
    const scrollAreaH = height - BACK_AREA_H;
    if (contentHeight > scrollAreaH) {
      this._maxScrollY = contentHeight - scrollAreaH;
      // Extend bounds by BACK_AREA_H so Phaser's own clamp lets us scroll
      // far enough to bring the last card above the fixed BACK button.
      this.cameras.main.setBounds(0, 0, width, contentHeight + BACK_AREA_H);
      this._setupScrollInput();
      this._createScrollbar(width, CARD_TOP, scrollAreaH);
      this._createFadeGradient(width, height);
    }

    // ── Fixed BACK button (always visible, pinned to screen bottom) ───────────
    // Solid background strip to mask content scrolling underneath the button.
    this.add.rectangle(cx, height - BACK_AREA_H / 2, width, BACK_AREA_H, PAL.bgDark)
      .setScrollFactor(0)
      .setDepth(202);
    this._makeFixedButton(cx, height - BACK_AREA_H / 2, 'BACK', () => {
      this.scene.start('MainMenuScene');
    });
  }

  // ── Phaser update — momentum deceleration ────────────────────────────────

  update(): void {
    if (this._isDragging || this._maxScrollY <= 0) return;
    if (Math.abs(this._scrollVelocity) <= MIN_VELOCITY) {
      this._scrollVelocity = 0;
      return;
    }
    this.cameras.main.scrollY = Phaser.Math.Clamp(
      this.cameras.main.scrollY + this._scrollVelocity,
      0,
      this._maxScrollY,
    );
    this._scrollVelocity *= SCROLL_FRICTION;
    this._updateScrollbarThumb();
    this._updateFadeVisibility();
  }

  // ── Scroll input setup ────────────────────────────────────────────────────

  private _setupScrollInput(): void {
    // Desktop: mouse wheel — immediate scroll, reset momentum
    this.input.on(
      'wheel',
      (
        _ptr: Phaser.Input.Pointer,
        _gx: Phaser.GameObjects.GameObject[],
        _gy: number,
        dy: number,
      ) => {
        this._scrollVelocity = 0;
        this.cameras.main.scrollY = Phaser.Math.Clamp(
          this.cameras.main.scrollY + dy * 0.5,
          0,
          this._maxScrollY,
        );
        this._updateScrollbarThumb();
        this._updateFadeVisibility();
      },
    );

    // Begin drag — record anchor point
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this._isDragging       = true;
      this._dragStartY       = ptr.y;
      this._dragStartScrollY = this.cameras.main.scrollY;
      this._scrollVelocity   = 0;
    });

    // Drag move — update scroll and capture per-frame delta for momentum
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!this._isDragging || !ptr.isDown) {
        this._isDragging = false;
        return;
      }
      const delta     = this._dragStartY - ptr.y;
      const newScroll = Phaser.Math.Clamp(
        this._dragStartScrollY + delta,
        0,
        this._maxScrollY,
      );
      // Delta between this move and last frame — seeds momentum on release
      this._scrollVelocity      = newScroll - this.cameras.main.scrollY;
      this.cameras.main.scrollY = newScroll;
      this._updateScrollbarThumb();
      this._updateFadeVisibility();
    });

    // Release — keep momentum; update() applies it frame-by-frame
    this.input.on('pointerup', () => {
      this._isDragging = false;
    });
  }

  // ── Scrollbar ─────────────────────────────────────────────────────────────

  private _createScrollbar(
    width: number,
    trackTop: number,
    trackBottom: number,
  ): void {
    const trackH   = trackBottom - trackTop;
    // Visible area height == trackBottom; total content == maxScrollY + trackBottom
    const thumbH   = Math.max(20, (trackBottom / (this._maxScrollY + trackBottom)) * trackH);
    this._scrollTrackTop = trackTop;
    this._scrollTrackH   = trackH;
    this._thumbH         = thumbH;

    const trackX = width - SCROLLBAR_RPAD - SCROLLBAR_W / 2;

    // Track background
    this.add.rectangle(trackX, trackTop + trackH / 2, SCROLLBAR_W, trackH, 0x222222)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0.6);

    // Thumb — starts at top
    this._scrollThumb = this.add.rectangle(
      trackX,
      trackTop + thumbH / 2,
      SCROLLBAR_W,
      thumbH,
      PAL.accentGreenN,
    ).setScrollFactor(0).setDepth(201).setAlpha(0.9);
  }

  // ── Bottom-fade gradient ──────────────────────────────────────────────────

  private _createFadeGradient(width: number, height: number): void {
    const gfx = this.add.graphics().setScrollFactor(0).setDepth(199);
    this._fadeGfx = gfx;
    this._buildFade(gfx, width, height);
  }

  private _buildFade(gfx: Phaser.GameObjects.Graphics, width: number, height: number): void {
    gfx.clear();
    const fadeY = height - BACK_AREA_H - FADE_HEIGHT;
    for (let i = 0; i < FADE_STEPS; i++) {
      const alpha = ((i + 1) / FADE_STEPS) * 0.95;
      gfx.fillStyle(PAL.bgDark, alpha);
      gfx.fillRect(
        0,
        fadeY + i * (FADE_HEIGHT / FADE_STEPS),
        width,
        FADE_HEIGHT / FADE_STEPS + 1,
      );
    }
  }

  // ── Scroll indicator updates ──────────────────────────────────────────────

  private _updateScrollbarThumb(): void {
    if (!this._scrollThumb || this._maxScrollY <= 0) return;
    const frac   = this.cameras.main.scrollY / this._maxScrollY;
    const travel = this._scrollTrackH - this._thumbH;
    const thumbY = this._scrollTrackTop + frac * travel + this._thumbH / 2;
    this._scrollThumb.setY(thumbY);
  }

  private _updateFadeVisibility(): void {
    if (!this._fadeGfx) return;
    this._fadeGfx.setVisible(this.cameras.main.scrollY < this._maxScrollY - 1);
  }

  // ── Card renderer ─────────────────────────────────────────────────────────

  private _renderCard(
    cx: number, y: number,
    challenge: ChallengeDef,
    isUnlocked: boolean,
    isFeatured: boolean,
  ): void {
    const leftX = cx - CARD_W / 2 + CARD_PAD_X;

    // Border / bg colour
    let borderColor: number = PAL.borderInactive;
    let bgColor: number     = PAL.bgPanel;
    if (isFeatured && isUnlocked) {
      borderColor = PAL.goldN;
      bgColor     = PAL.bgCard;
    } else if (isUnlocked) {
      borderColor = PAL.accentGreenN;
    } else {
      borderColor = PAL.borderLocked;
      bgColor     = PAL.bgPanelLocked;
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
      fontSize:  '12px',
      color:     descColor,
      fontFamily: PAL.fontBody,
      wordWrap:  { width: CARD_W - CARD_PAD_X * 2 - 140 },
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

    // ── Right-side badges ────────────────────────────────────────────────────

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
      this.add.rectangle(cx, y + CARD_H / 2, CARD_W, CARD_H, 0x000000)
        .setAlpha(0.4);
      this.add.text(rightX - 50, y + CARD_H - 30, `Requires ${challenge.unlockThreshold} crystals`, {
        fontSize:   '11px',
        color:      PAL.textLocked,
        fontFamily: PAL.fontBody,
      }).setOrigin(0.5);
    } else {
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

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Approximate total crystals spent — used to determine which challenges
   * are unlocked.  Uses current balance as a proxy.
   */
  private _estimateTotalSpent(save: SaveManager): number {
    return save.getCurrency();
  }

  /**
   * Create a button that stays fixed to the screen regardless of camera scroll.
   * All child objects use setScrollFactor(0) and are placed at depth 203+.
   */
  private _makeFixedButton(
    x: number, y: number, label: string, onClick: () => void,
    bgColor: number = PAL.bgPanel, textColor: number = PAL.accentGreenN,
  ): void {
    const textColorStr = '#' + textColor.toString(16).padStart(6, '0');
    const bg = this.add.rectangle(x, y, 180, 44, bgColor)
      .setStrokeStyle(2, textColor)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(203);
    this.add.text(x, y, label, {
      fontSize: '15px', color: textColorStr, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(204);
    bg.on('pointerover', () => bg.setFillStyle(bgColor + 0x111111));
    bg.on('pointerout',  () => bg.setFillStyle(bgColor));
    bg.on('pointerup', onClick);
  }
}
