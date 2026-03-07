/**
 * OjibweTooltip — reusable hover/tap tooltip for Ojibwe word translations.
 *
 * Desktop: shows on pointerover after a brief delay, hides on pointerout.
 * Mobile: shows on tap, dismissed by tapping elsewhere or tapping again.
 *
 * Usage:
 *   OjibweTooltip.attach(scene, textObject, 'Mishoomis');
 *   // Adds a subtle dotted underline and wires up tooltip events.
 *
 *   OjibweTooltip.destroyAll(scene);
 *   // Cleanup — call in scene shutdown.
 */

import Phaser from 'phaser';
import { translateOjibwe } from '../data/ojibweGlossary';
import { MobileManager, TAP_EVENT } from '../systems/MobileManager';
import { PAL } from './palette';

const TOOLTIP_DEPTH  = 500;
const HOVER_DELAY_MS = 200;
const FADE_MS        = 150;

/** Scene-level registry of active tooltip instances for cleanup. */
const sceneTooltips = new WeakMap<Phaser.Scene, OjibweTooltip[]>();

export class OjibweTooltip {
  private scene: Phaser.Scene;
  private target: Phaser.GameObjects.Text;
  private translation: string;
  private container: Phaser.GameObjects.Container | null = null;
  private hoverTimer?: ReturnType<typeof setTimeout>;
  private underline: Phaser.GameObjects.Graphics | null = null;

  private constructor(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Text,
    translation: string,
  ) {
    this.scene = scene;
    this.target = target;
    this.translation = translation;

    this.addUnderline();
    this.wireEvents();
  }

  /**
   * Attach a translation tooltip to a Phaser text object.
   * No-op if the word has no translation in the glossary.
   */
  static attach(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Text,
    word: string,
  ): OjibweTooltip | null {
    const translation = translateOjibwe(word);
    if (!translation) return null;

    const tip = new OjibweTooltip(scene, target, translation);

    // Register for bulk cleanup
    let list = sceneTooltips.get(scene);
    if (!list) {
      list = [];
      sceneTooltips.set(scene, list);
    }
    list.push(tip);

    return tip;
  }

  /** Destroy all tooltips attached in a given scene. */
  static destroyAll(scene: Phaser.Scene): void {
    const list = sceneTooltips.get(scene);
    if (!list) return;
    for (const tip of list) tip.destroy();
    list.length = 0;
  }

  // ── Underline hint ────────────────────────────────────────────────────────

  private addUnderline(): void {
    const t = this.target;
    const gfx = this.scene.add.graphics();
    gfx.setDepth(t.depth);

    // Dotted underline beneath the text
    const worldMatrix = t.getWorldTransformMatrix();
    const x = worldMatrix.tx;
    const y = worldMatrix.ty + t.height * (1 - t.originY) + 1;
    const w = t.width * (1 - t.originX);

    gfx.lineStyle(1, PAL.accentGreenN, 0.4);
    const dashLen = 3;
    const gapLen = 3;
    let dx = 0;
    gfx.beginPath();
    while (dx < w) {
      gfx.moveTo(x + dx, y);
      gfx.lineTo(x + Math.min(dx + dashLen, w), y);
      dx += dashLen + gapLen;
    }
    gfx.strokePath();

    this.underline = gfx;
  }

  // ── Event wiring ─────────────────────────────────────────────────────────

  private wireEvents(): void {
    const t = this.target;
    if (!t.input) t.setInteractive({ useHandCursor: true });

    const isMobile = MobileManager.getInstance().isMobile();

    if (isMobile) {
      t.on(TAP_EVENT, () => {
        if (this.container) {
          this.hide();
        } else {
          // Dismiss any other visible tooltip in the scene first
          const list = sceneTooltips.get(this.scene);
          if (list) {
            for (const tip of list) {
              if (tip !== this) tip.hide();
            }
          }
          this.show();
        }
      });
    } else {
      t.on('pointerover', () => {
        this.hoverTimer = setTimeout(() => this.show(), HOVER_DELAY_MS);
      });
      t.on('pointerout', () => {
        clearTimeout(this.hoverTimer);
        this.hide();
      });
    }
  }

  // ── Show / hide ──────────────────────────────────────────────────────────

  private show(): void {
    if (this.container) return;

    const t = this.target;
    const pad = 6;
    const label = `"${this.translation}"`;

    const isMobile = MobileManager.getInstance().isMobile();
    const fontSize = isMobile ? '14px' : '12px';

    // Measure text
    const textObj = this.scene.add.text(0, pad, label, {
      fontSize,
      color: PAL.textPrimary,
      fontFamily: PAL.fontBody,
      fontStyle: 'italic',
    });
    const tipW = textObj.width + pad * 2;
    const tipH = textObj.height + pad * 2;

    // Background
    const bg = this.scene.add.rectangle(0, 0, tipW, tipH, PAL.bgPanel, 0.92)
      .setStrokeStyle(1, PAL.borderActive)
      .setOrigin(0);

    this.container = this.scene.add.container(0, 0, [bg, textObj])
      .setDepth(TOOLTIP_DEPTH)
      .setAlpha(0);

    // Position above the target text
    const worldMatrix = t.getWorldTransformMatrix();
    const tx = worldMatrix.tx;
    const ty = worldMatrix.ty - t.height * t.originY;
    let tipX = tx;
    let tipY = ty - tipH - 4;

    // Clamp to screen
    const sw = this.scene.scale.width;
    if (tipX + tipW > sw - 4) tipX = sw - tipW - 4;
    if (tipX < 4) tipX = 4;
    if (tipY < 4) tipY = ty + t.height + 4; // flip below if no room above

    this.container.setPosition(tipX, tipY);

    // Fade in
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: FADE_MS,
    });
  }

  private hide(): void {
    if (!this.container) return;
    const c = this.container;
    this.container = null;
    this.scene.tweens.add({
      targets: c,
      alpha: 0,
      duration: FADE_MS,
      onComplete: () => c.destroy(),
    });
  }

  destroy(): void {
    clearTimeout(this.hoverTimer);
    this.hide();
    if (this.underline?.active) this.underline.destroy();
    this.underline = null;
  }
}
