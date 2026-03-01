/**
 * VignetteOverlay — bottom-third semi-transparent panel for narrative vignettes.
 *
 * Renders a dark panel in the bottom third of the screen with:
 *   - Portrait placeholder (coloured tile) on the left
 *   - Speaker name above the text
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

const DEPTH          = 400;
const CHAR_DELAY_MS  = 30;
const HOLD_SKIP_MS   = 1500;

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

    // ── Portrait placeholder (coloured tile) ────────────────────────────
    const portraitSize = 64;
    const portraitX = 48 + portraitSize / 2;
    const portraitY = panelY + panelH / 2;
    const portraitColor = vignette.portrait ? 0x446644 : 0x334433;

    const portrait = this.scene.add.rectangle(
      portraitX, portraitY,
      portraitSize, portraitSize,
      portraitColor,
    ).setStrokeStyle(2, 0x556655).setDepth(DEPTH + 1);
    this.objects.push(portrait);

    // Portrait icon letter (first char of speaker, or "?").
    const iconChar = vignette.speaker?.[0] ?? '?';
    const iconText = this.scene.add.text(portraitX, portraitY, iconChar, {
      fontSize:   '28px',
      color:      '#aaccaa',
      fontFamily: 'monospace',
      fontStyle:  'bold',
    }).setOrigin(0.5).setDepth(DEPTH + 2);
    this.objects.push(iconText);

    // ── Speaker name ────────────────────────────────────────────────────
    const textX = portraitX + portraitSize / 2 + 24;
    const textMaxW = width - textX - 48;

    if (vignette.speaker) {
      const speakerText = this.scene.add.text(
        textX, panelY + 20,
        vignette.speaker,
        {
          fontSize:   '14px',
          color:      '#88cc88',
          fontFamily: 'monospace',
          fontStyle:  'bold',
        },
      ).setDepth(DEPTH + 2);
      this.objects.push(speakerText);
    }

    // ── Body text (typewriter animated) ─────────────────────────────────
    this.fullText = vignette.lines.join('\n');
    this.bodyText = this.scene.add.text(
      textX, panelY + 46,
      '',
      {
        fontSize:   '15px',
        color:      '#ccddcc',
        fontFamily: 'monospace',
        lineSpacing: 6,
        wordWrap:   { width: textMaxW },
      },
    ).setDepth(DEPTH + 2);
    this.objects.push(this.bodyText);

    // ── Skip hint ───────────────────────────────────────────────────────
    const skipHint = seenBefore ? 'click to dismiss' : 'click to advance';
    const hint = this.scene.add.text(
      width - 24, panelY + panelH - 16,
      skipHint,
      {
        fontSize:   '10px',
        color:      '#445544',
        fontFamily: 'monospace',
      },
    ).setOrigin(1, 1).setDepth(DEPTH + 2);
    this.objects.push(hint);

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
