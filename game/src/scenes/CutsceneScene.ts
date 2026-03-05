/**
 * CutsceneScene — visual-novel-style dialog overlaid on the current scene.
 *
 * Launched via `scene.launch('CutsceneScene', { cutscene, onComplete })`.
 * Plays frame-by-frame with typewriter text, character portraits, optional
 * screen effects, then calls `onComplete` and self-stops.
 *
 * Visual layout:
 *   - Full-screen semi-transparent dark overlay
 *   - Optional background image or solid colour with vignette
 *   - Character portrait (200–300px) positioned left or right
 *   - Dialog box in the bottom third with speaker nameplate
 *   - Skip button in top-right corner
 *
 * Mobile: text >= 16px, tap targets >= 44px.
 */

import Phaser from 'phaser';
import type { CutsceneDef } from '../data/cutsceneDefs';
import { PAL } from '../ui/palette';
import { MobileManager, TAP_EVENT } from '../systems/MobileManager';

// ── Constants ────────────────────────────────────────────────────────────────

const DEPTH            = 500;
const CHAR_DELAY_MS    = 30;
const PORTRAIT_SIZE    = 240;
const PORTRAIT_SLIDE   = 100;   // px offset for slide-in
const PORTRAIT_SLIDE_MS = 250;

/** Nameplate colour per speaker (matches VignetteOverlay). */
function nameplateColour(speaker: string | undefined): number {
  if (!speaker) return 0x1a1a2e;
  const s = speaker.toLowerCase();
  if (s.includes('mishoomis'))    return 0x5C3A1E;
  if (s.includes('nokomis'))      return 0x2A3D2A;
  if (s.includes('ogichidaa'))    return 0x4A1810;
  if (s.includes('makoons'))      return 0x3a1a10;
  if (s.includes('waabizii'))     return 0x2a2040;
  if (s.includes('bizhiw'))       return 0x1a2a3a;
  if (s.includes('animikiikaa'))  return 0x2a2210;
  if (s.includes('scout'))        return 0x1A2E1A;
  return 0x1a1a2e;
}

// ── Scene ────────────────────────────────────────────────────────────────────

interface CutsceneInitData {
  cutscene:    CutsceneDef;
  onComplete?: () => void;
}

export class CutsceneScene extends Phaser.Scene {
  private cutscene!: CutsceneDef;
  private onComplete: (() => void) | null = null;

  private frameIndex = 0;

  // ── UI objects (destroyed on each frame change) ──────────────────────────
  private objects: Phaser.GameObjects.GameObject[] = [];

  // ── Typewriter state ─────────────────────────────────────────────────────
  private bodyText!: Phaser.GameObjects.Text;
  private fullText  = '';
  private revealedLen  = 0;
  private fullyRevealed = false;
  private typeTimer: Phaser.Time.TimerEvent | null = null;

  // ── Auto-advance timer ──────────────────────────────────────────────────
  private autoTimer: Phaser.Time.TimerEvent | null = null;

  // ── Portrait tracking ────────────────────────────────────────────────────
  private currentPortraitKey: string | null = null;
  private currentPortraitSide: 'left' | 'right' = 'left';

  // ── Persistent elements (kept across frames) ────────────────────────────
  private overlay!: Phaser.GameObjects.Rectangle;
  private bgRect: Phaser.GameObjects.Rectangle | null = null;
  private skipBtn!: Phaser.GameObjects.Rectangle;
  private skipLabel!: Phaser.GameObjects.Text;

  // ── Mobile ──────────────────────────────────────────────────────────────
  private _isMobile = false;

  constructor() {
    super({ key: 'CutsceneScene' });
  }

  init(data: CutsceneInitData): void {
    this.cutscene    = data.cutscene;
    this.onComplete  = data.onComplete ?? null;
    this.frameIndex  = 0;
    this.currentPortraitKey  = null;
    this.currentPortraitSide = 'left';
    this.objects     = [];
    this.bgRect      = null;
  }

  create(): void {
    this._isMobile = MobileManager.getInstance().isMobile();

    const { width, height } = this.scale;

    // ── Full-screen dark overlay ──────────────────────────────────────────
    this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setDepth(DEPTH)
      .setInteractive();
    this.overlay.on(TAP_EVENT, () => this.handleTap());

    // ── Skip button (top-right) ───────────────────────────────────────────
    const skipW = this._isMobile ? 90 : 80;
    const skipH = this._isMobile ? 44 : 32;
    const skipX = width - skipW / 2 - 16;
    const skipY = skipH / 2 + 16;

    this.skipBtn = this.add.rectangle(skipX, skipY, skipW, skipH, 0x000000, 0.6)
      .setStrokeStyle(1, 0x666666)
      .setDepth(DEPTH + 10)
      .setInteractive({ useHandCursor: true });

    this.skipLabel = this.add.text(skipX, skipY, 'SKIP', {
      fontSize:   this._fs(14),
      color:      '#aaaaaa',
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5).setDepth(DEPTH + 11);

    this.skipBtn.on('pointerover', () => this.skipLabel.setColor('#ffffff'));
    this.skipBtn.on('pointerout',  () => this.skipLabel.setColor('#aaaaaa'));
    this.skipBtn.on(TAP_EVENT,   () => this.finish());

    // ── Show first frame ──────────────────────────────────────────────────
    this.showFrame(0);
  }

  // ── Frame rendering ────────────────────────────────────────────────────────

  private showFrame(index: number): void {
    if (index >= this.cutscene.frames.length) {
      this.finish();
      return;
    }

    this.frameIndex = index;
    const frame = this.cutscene.frames[index];

    // Clean up previous frame objects.
    this.cleanupFrame();

    const { width, height } = this.scale;

    // ── Background colour ────────────────────────────────────────────────
    if (frame.background) {
      const bgColor = this.parseColor(frame.background);
      if (!this.bgRect) {
        this.bgRect = this.add.rectangle(width / 2, height / 2, width, height, bgColor, 0.85)
          .setDepth(DEPTH + 1);
      } else {
        this.bgRect.setFillStyle(bgColor, 0.85);
      }
    }

    // ── Screen effect ────────────────────────────────────────────────────
    if (frame.effect === 'shake') {
      this.cameras.main.shake(300, 0.005);
    } else if (frame.effect === 'flash') {
      this.cameras.main.flash(400, 255, 255, 255);
    } else if (frame.effect === 'fade') {
      // Brief fade-from-black
      this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    // ── Dialog box layout ────────────────────────────────────────────────
    const panelH = Math.floor(height / 3);
    const panelY = height - panelH;

    // Dark dialog panel background
    const dialogBg = this.add.rectangle(
      width / 2, panelY + panelH / 2,
      width, panelH,
      0x000000, 0.85,
    ).setDepth(DEPTH + 2);
    this.objects.push(dialogBg);

    // Top border line on the dialog panel
    const borderLine = this.add.rectangle(
      width / 2, panelY,
      width, 2,
      0x444444, 0.6,
    ).setDepth(DEPTH + 3);
    this.objects.push(borderLine);

    // ── Portrait ─────────────────────────────────────────────────────────
    const side = frame.portraitSide ?? 'left';
    const portraitKey = frame.portrait ?? '';
    const hasPortrait = portraitKey !== '' && this.textures.exists(portraitKey);

    // Portrait position
    const portraitPad = 40;
    const portraitCenterY = panelY - PORTRAIT_SIZE / 2 + 40;
    const portraitFinalX = side === 'left'
      ? portraitPad + PORTRAIT_SIZE / 2
      : width - portraitPad - PORTRAIT_SIZE / 2;
    const portraitStartX = side === 'left'
      ? portraitFinalX - PORTRAIT_SLIDE
      : portraitFinalX + PORTRAIT_SLIDE;

    const needsSlide = portraitKey !== this.currentPortraitKey ||
                       side !== this.currentPortraitSide;

    if (hasPortrait) {
      const img = this.add.image(
        needsSlide ? portraitStartX : portraitFinalX,
        portraitCenterY,
        portraitKey,
      )
        .setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE)
        .setAlpha(needsSlide ? 0 : 1)
        .setDepth(DEPTH + 4);
      this.objects.push(img);

      if (needsSlide) {
        this.tweens.add({
          targets:  img,
          x:        portraitFinalX,
          alpha:    1,
          duration: PORTRAIT_SLIDE_MS,
          ease:     'Cubic.easeOut',
        });
      }
    } else if (portraitKey !== '') {
      // Fallback: coloured rectangle with first letter
      const fallbackColor = nameplateColour(frame.speaker);
      const rect = this.add.rectangle(
        needsSlide ? portraitStartX : portraitFinalX,
        portraitCenterY,
        PORTRAIT_SIZE, PORTRAIT_SIZE,
        fallbackColor,
      ).setStrokeStyle(2, 0x444444).setAlpha(needsSlide ? 0 : 1).setDepth(DEPTH + 4);
      this.objects.push(rect);

      const letter = this.add.text(
        needsSlide ? portraitStartX : portraitFinalX,
        portraitCenterY,
        frame.speaker?.[0] ?? '?',
        {
          fontSize:   '48px',
          color:      PAL.textPrimary,
          fontFamily: PAL.fontTitle,
          fontStyle:  'bold',
        },
      ).setOrigin(0.5).setAlpha(needsSlide ? 0 : 1).setDepth(DEPTH + 5);
      this.objects.push(letter);

      if (needsSlide) {
        this.tweens.add({
          targets:  [rect, letter],
          x:        portraitFinalX,
          alpha:    1,
          duration: PORTRAIT_SLIDE_MS,
          ease:     'Cubic.easeOut',
        });
      }
    }

    this.currentPortraitKey  = portraitKey;
    this.currentPortraitSide = side;

    // ── Text area layout (next to portrait) ──────────────────────────────
    const textPad = 24;
    let textX: number;
    let textMaxW: number;

    if (portraitKey) {
      if (side === 'left') {
        textX    = portraitPad + PORTRAIT_SIZE + textPad;
        textMaxW = width - textX - textPad;
      } else {
        textX    = textPad;
        textMaxW = width - portraitPad - PORTRAIT_SIZE - textPad * 2;
      }
    } else {
      textX    = textPad * 2;
      textMaxW = width - textPad * 4;
    }

    // ── Speaker nameplate ────────────────────────────────────────────────
    let nameBottom = panelY + 24;
    if (frame.speaker) {
      const nameColor = nameplateColour(frame.speaker);

      // Measure name width
      const tmpText = this.add.text(0, -999, frame.speaker, {
        fontSize:   this._fs(14),
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setVisible(false);
      const nameW = tmpText.width + 20;
      const nameH = this._isMobile ? 28 : 24;
      tmpText.destroy();

      const nameplateY = panelY + nameH / 2 + 8;
      nameBottom = nameplateY + nameH / 2 + 8;

      const nameplateBg = this.add.rectangle(
        textX + nameW / 2, nameplateY,
        nameW, nameH,
        nameColor, 0.9,
      ).setDepth(DEPTH + 5);
      this.objects.push(nameplateBg);

      const speakerText = this.add.text(textX + 10, nameplateY, frame.speaker, {
        fontSize:   this._fs(14),
        color:      PAL.textPrimary,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0, 0.5).setDepth(DEPTH + 6);
      this.objects.push(speakerText);
    }

    // ── Body text (typewriter) ───────────────────────────────────────────
    const bodyFontSize = this._isMobile ? 18 : 16;
    this.fullText    = frame.text;
    this.revealedLen = 0;
    this.fullyRevealed = false;

    this.bodyText = this.add.text(textX, nameBottom, '', {
      fontSize:    `${bodyFontSize}px`,
      color:       PAL.textPrimary,
      fontFamily:  PAL.fontBody,
      lineSpacing: 8,
      wordWrap:    { width: textMaxW },
    }).setDepth(DEPTH + 6);
    this.objects.push(this.bodyText);

    // ── Frame indicator (e.g. "2 / 5") ───────────────────────────────────
    const total = this.cutscene.frames.length;
    const indicator = this.add.text(
      width - 20, panelY + panelH - 16,
      `${index + 1} / ${total}`,
      {
        fontSize:   this._fs(10),
        color:      PAL.textDim,
        fontFamily: PAL.fontBody,
      },
    ).setOrigin(1, 1).setDepth(DEPTH + 6);
    this.objects.push(indicator);

    // ── Advance hint ─────────────────────────────────────────────────────
    const hintText = index < total - 1 ? 'tap to continue' : 'tap to close';
    const hint = this.add.text(
      width / 2, panelY + panelH - 16,
      hintText,
      {
        fontSize:   this._fs(12),
        color:      PAL.textMuted,
        fontFamily: PAL.fontBody,
      },
    ).setOrigin(0.5, 1).setDepth(DEPTH + 6);
    this.objects.push(hint);

    // ── Start typewriter ─────────────────────────────────────────────────
    this.typeTimer = this.time.addEvent({
      delay:    CHAR_DELAY_MS,
      repeat:   this.fullText.length - 1,
      callback: () => this.revealNextChar(),
    });
  }

  // ── Typewriter ─────────────────────────────────────────────────────────────

  private revealNextChar(): void {
    this.revealedLen++;
    if (this.revealedLen >= this.fullText.length) {
      this.revealedLen = this.fullText.length;
      this.fullyRevealed = true;
      if (this.typeTimer) {
        this.typeTimer.destroy();
        this.typeTimer = null;
      }
      this.onTextFullyRevealed();
    }
    this.bodyText.setText(this.fullText.slice(0, this.revealedLen));
  }

  private completeTypewriter(): void {
    this.revealedLen   = this.fullText.length;
    this.fullyRevealed = true;
    this.bodyText.setText(this.fullText);
    if (this.typeTimer) {
      this.typeTimer.destroy();
      this.typeTimer = null;
    }
    this.onTextFullyRevealed();
  }

  /** Called when text is fully revealed — start auto-advance if configured. */
  private onTextFullyRevealed(): void {
    const frame = this.cutscene.frames[this.frameIndex];
    if (frame?.auto && frame.auto > 0) {
      this.autoTimer = this.time.delayedCall(frame.auto, () => {
        this.advanceFrame();
      });
    }
  }

  // ── Input handling ─────────────────────────────────────────────────────────

  private handleTap(): void {
    if (!this.fullyRevealed) {
      this.completeTypewriter();
      return;
    }
    this.advanceFrame();
  }

  private advanceFrame(): void {
    if (this.autoTimer) {
      this.autoTimer.destroy();
      this.autoTimer = null;
    }
    this.showFrame(this.frameIndex + 1);
  }

  // ── Finish ─────────────────────────────────────────────────────────────────

  private finish(): void {
    this.cleanupFrame();
    this._destroyPersistent();

    const callback = this.onComplete;
    this.onComplete = null;
    this.scene.stop();
    callback?.();
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  private cleanupFrame(): void {
    if (this.typeTimer) {
      this.typeTimer.destroy();
      this.typeTimer = null;
    }
    if (this.autoTimer) {
      this.autoTimer.destroy();
      this.autoTimer = null;
    }
    for (const obj of this.objects) {
      if (obj?.active) obj.destroy();
    }
    this.objects = [];
  }

  shutdown(): void {
    this.cleanupFrame();
    this._destroyPersistent();
  }

  /** Destroy persistent UI objects (overlay, skip button, background). */
  private _destroyPersistent(): void {
    if (this.bgRect?.active) this.bgRect.destroy();
    this.bgRect = null;
    if (this.overlay?.active) this.overlay.destroy();
    if (this.skipBtn?.active) this.skipBtn.destroy();
    if (this.skipLabel?.active) this.skipLabel.destroy();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Scale font size for mobile (matches other scenes). */
  private _fs(size: number): string {
    const s = this._isMobile ? Math.round(size * 1.35) : size;
    return `${s}px`;
  }

  /** Parse a CSS hex colour string to a numeric value. */
  private parseColor(str: string): number {
    if (str.startsWith('#')) {
      return parseInt(str.slice(1), 16);
    }
    // Fallback: try parsing as-is
    return parseInt(str, 16) || 0x0a1810;
  }
}
