/**
 * VignetteOverlay — bottom-third semi-transparent panel for narrative vignettes.
 *
 * Renders a dark panel in the bottom third of the screen with:
 *   - Portrait (real image or coloured fallback) on the left, slides in 200ms ease-out
 *   - Speaker name in a coloured nameplate above the dialog text
 *   - Text that animates in one character at a time (typewriter, ~30ms/char)
 *   - Click-to-skip: if text is mid-reveal, click completes it instantly.
 *     If text is fully revealed, click dismisses the overlay.
 *
 * First-time vignettes: a brief "hold to skip" delay (1.5s) before
 * the dismiss click is accepted. Previously-seen vignettes can be
 * dismissed with a single click at any time.
 */

import Phaser from 'phaser';
import type { VignetteDef } from '../data/vignetteDefs';
import { MobileManager } from '../systems/MobileManager';
import { PAL } from './palette';

const DEPTH          = 400;
const CHAR_DELAY_MS  = 30;
const HOLD_SKIP_MS   = 1500;

/** Duration of the portrait slide-in tween (ms). */
const PORTRAIT_SLIDE_MS = 200;
/** How far off-screen the portrait starts before sliding in (px). */
const PORTRAIT_SLIDE_OFFSET = 80;

/**
 * Nameplate background colour per speaker family.
 * Falls back to a neutral dark if the speaker is unrecognised.
 */
function nameplateColour(speaker: string | undefined): number {
  if (!speaker) return PAL.bgPanelDark as number;
  const s = speaker.toLowerCase();
  if (s.includes('mishoomis'))  return 0x5C3A1E; // warm brown
  if (s.includes('nokomis'))    return 0x2A3D2A; // forest green
  if (s.includes('ogichidaa'))  return 0x4A1810; // deep red
  if (s.includes('elder'))      return 0x3D2B10; // generic elder — muted amber
  if (s.includes('scout'))      return 0x1A2E1A; // scout — dark green
  if (s.includes('war chief') || s.includes('war_chief')) return 0x2E1A1A; // war chief — dark red
  return 0x1A1A2E; // default dark blue-grey
}

export class VignetteOverlay {
  private scene:    Phaser.Scene;
  private objects:  Phaser.GameObjects.GameObject[] = [];
  private bodyText!: Phaser.GameObjects.Text;

  /** Full combined text of all lines. */
  private fullText     = '';
  /** Characters revealed so far. */
  private revealedLen  = 0;
  /** Whether the full text has been revealed. */
  private fullyRevealed = false;
  /** Timer event driving the typewriter effect. */
  private typeTimer:   Phaser.Time.TimerEvent | null = null;

  /** Whether the overlay is visible. */
  private visible = false;

  /** Callback invoked when the overlay is dismissed. */
  private onDismiss: (() => void) | null = null;

  /** Whether the vignette can be instantly dismissed (seen before). */
  private canInstantDismiss = false;

  /** Timestamp when the overlay appeared. */
  private shownAt = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show a vignette.
   * @param vignette    The vignette definition to display.
   * @param seenBefore  True if this vignette was seen in a previous session.
   * @param onDismiss   Called when the player dismisses the overlay.
   */
  show(vignette: VignetteDef, seenBefore: boolean, onDismiss: () => void): void {
    this.cleanup();

    this.onDismiss = onDismiss;
    this.canInstantDismiss = seenBefore;
    this.visible = true;
    this.shownAt = Date.now();
    this.fullyRevealed = false;
    this.revealedLen = 0;

    const { width, height } = this.scene.scale;
    const panelH = Math.floor(height / 3);
    const panelY = height - panelH;

    // ── Dark panel background ───────────────────────────────────────────
    const bg = this.scene.add.rectangle(
      width / 2, panelY + panelH / 2,
      width, panelH,
      0x000000, 0.82,
    ).setDepth(DEPTH).setInteractive();
    this.objects.push(bg);

    // Intercept clicks on the panel.
    bg.on('pointerup', () => this.handleClick());

    // ── Portrait: real image when available, coloured placeholder otherwise ──
    const portraitSize = 64;
    const portraitFinalX = 48 + portraitSize / 2;
    const portraitStartX = portraitFinalX - PORTRAIT_SLIDE_OFFSET;
    const portraitY = panelY + panelH / 2;

    const portraitKey = vignette.portrait ?? '';
    const hasPortrait = portraitKey !== '' && this.scene.textures.exists(portraitKey);

    if (hasPortrait) {
      const portraitImg = this.scene.add.image(portraitStartX, portraitY, portraitKey)
        .setDisplaySize(portraitSize, portraitSize)
        .setAlpha(0)
        .setDepth(DEPTH + 1);
      this.objects.push(portraitImg);

      // Slide in from left + fade in
      this.scene.tweens.add({
        targets:  portraitImg,
        x:        portraitFinalX,
        alpha:    1,
        duration: PORTRAIT_SLIDE_MS,
        ease:     'Cubic.easeOut',
      });
    } else {
      // Fallback: coloured rectangle + first-letter icon, also slides in.
      const portraitColor = vignette.portrait ? PAL.borderInactive : PAL.borderPanel;
      const portrait = this.scene.add.rectangle(
        portraitStartX, portraitY,
        portraitSize, portraitSize,
        portraitColor,
      ).setStrokeStyle(2, PAL.borderInactive).setAlpha(0).setDepth(DEPTH + 1);
      this.objects.push(portrait);

      const iconChar = vignette.speaker?.[0] ?? '?';
      const iconText = this.scene.add.text(portraitStartX, portraitY, iconChar, {
        fontSize:   '28px',
        color:      PAL.textPrimary,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0.5).setAlpha(0).setDepth(DEPTH + 2);
      this.objects.push(iconText);

      this.scene.tweens.add({
        targets:  [portrait, iconText],
        x:        portraitFinalX,
        alpha:    1,
        duration: PORTRAIT_SLIDE_MS,
        ease:     'Cubic.easeOut',
      });
    }

    // ── Speaker nameplate ───────────────────────────────────────────────
    const textX = portraitFinalX + portraitSize / 2 + 24;
    const textMaxW = width - textX - 48;

    if (vignette.speaker) {
      const nameColor = nameplateColour(vignette.speaker);

      // Measure how wide the name text will be for the nameplate background
      const tmpText = this.scene.add.text(0, -999, vignette.speaker, {
        fontSize:   '13px',
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setVisible(false);
      const nameW = tmpText.width + 16;
      const nameH = 20;
      tmpText.destroy();

      const nameplateY = panelY + 18;

      const nameplateBg = this.scene.add.rectangle(
        textX + nameW / 2 - 8, nameplateY,
        nameW, nameH,
        nameColor, 0.9,
      ).setDepth(DEPTH + 1);
      this.objects.push(nameplateBg);

      const speakerText = this.scene.add.text(
        textX, nameplateY,
        vignette.speaker,
        {
          fontSize:   '13px',
          color:      PAL.textPrimary,
          fontFamily: PAL.fontBody,
          fontStyle:  'bold',
        },
      ).setOrigin(0, 0.5).setDepth(DEPTH + 2);
      this.objects.push(speakerText);
    }

    // ── Body text (typewriter animated) ─────────────────────────────────
    const bodyY = vignette.speaker ? panelY + 36 : panelY + 24;
    this.fullText = vignette.lines.join('\n');
    this.bodyText = this.scene.add.text(
      textX, bodyY,
      '',
      {
        fontSize:   '15px',
        color:      PAL.textPrimary,
        fontFamily: PAL.fontBody,
        lineSpacing: 6,
        wordWrap:   { width: textMaxW },
      },
    ).setDepth(DEPTH + 2);
    this.objects.push(this.bodyText);

    // ── Skip button (bottom-right) ─────────────────────────────────────
    const isMobile = MobileManager.getInstance().isMobile();
    const skipW = isMobile ? 80 : 70;
    const skipH = isMobile ? 44 : 28;
    const skipX = width - skipW / 2 - 12;
    const skipY = panelY + panelH - skipH / 2 - 8;

    const skipBg = this.scene.add.rectangle(skipX, skipY, skipW, skipH, 0x000000, 0.5)
      .setStrokeStyle(1, 0x555555)
      .setDepth(DEPTH + 3)
      .setInteractive({ useHandCursor: true });
    this.objects.push(skipBg);

    const skipLabel = this.scene.add.text(skipX, skipY, 'Skip \u25B6', {
      fontSize:   isMobile ? '14px' : '11px',
      color:      '#999999',
      fontFamily: PAL.fontBody,
    }).setOrigin(0.5).setDepth(DEPTH + 4);
    this.objects.push(skipLabel);

    skipBg.on('pointerover', () => skipLabel.setColor('#ffffff'));
    skipBg.on('pointerout',  () => skipLabel.setColor('#999999'));
    skipBg.on('pointerup',   () => this.dismiss());

    // ── Start typewriter ────────────────────────────────────────────────
    this.typeTimer = this.scene.time.addEvent({
      delay:    CHAR_DELAY_MS,
      repeat:   this.fullText.length - 1,
      callback: () => this.revealNextChar(),
    });
  }

  /** Whether the overlay is currently visible. */
  isVisible(): boolean {
    return this.visible;
  }

  /** Clean up all game objects and timers. */
  cleanup(): void {
    if (this.typeTimer) {
      this.typeTimer.destroy();
      this.typeTimer = null;
    }
    for (const obj of this.objects) {
      if (obj?.active) obj.destroy();
    }
    this.objects = [];
    this.visible = false;
    this.onDismiss = null;
  }

  // ── Private ───────────────────────────────────────────────────────────

  private revealNextChar(): void {
    this.revealedLen++;
    if (this.revealedLen >= this.fullText.length) {
      this.revealedLen = this.fullText.length;
      this.fullyRevealed = true;

      if (this.typeTimer) {
        this.typeTimer.destroy();
        this.typeTimer = null;
      }
    }
    this.bodyText.setText(this.fullText.slice(0, this.revealedLen));
  }

  private handleClick(): void {
    if (!this.visible) return;

    // If text is mid-reveal, complete it instantly.
    if (!this.fullyRevealed) {
      this.revealedLen = this.fullText.length;
      this.fullyRevealed = true;

      this.bodyText.setText(this.fullText);
      if (this.typeTimer) {
        this.typeTimer.destroy();
        this.typeTimer = null;
      }
      return;
    }

    // Text fully revealed — check dismiss conditions.
    if (this.canInstantDismiss) {
      this.dismiss();
      return;
    }

    // First-time vignette: enforce hold-to-skip delay from when overlay appeared.
    const elapsed = Date.now() - this.shownAt;
    if (elapsed >= HOLD_SKIP_MS) {
      this.dismiss();
    }
    // else: silently ignore — player needs to wait a bit longer.
  }

  private dismiss(): void {
    const callback = this.onDismiss;
    this.cleanup();
    callback?.();
  }
}
