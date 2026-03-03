/**
 * AchievementToast — in-game notification popup when an achievement is unlocked.
 *
 * Usage:
 *   const toast = new AchievementToast(scene);
 *   toast.show('first-victory');
 *
 * Toasts queue automatically — only one is shown at a time.
 * Slides in from the right, auto-dismisses after 3.5 s.
 */

import Phaser from 'phaser';
import { getAchievementDef } from '../data/achievementDefs';

const TOAST_W       = 280;
const TOAST_H       = 64;
const TOAST_MARGIN  = 12;
const SHOW_DURATION = 3500;
const SLIDE_MS      = 300;
const DEPTH         = 900;

export class AchievementToast {
  private readonly scene: Phaser.Scene;
  private queue:   string[] = [];
  private active   = false;

  /** Root container — repositioned during slide animations. */
  private container: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Queue an achievement ID for display. */
  show(achievementId: string): void {
    this.queue.push(achievementId);
    if (!this.active) this._showNext();
  }

  /** Queue multiple achievement IDs (e.g. from drainNewlyUnlocked()). */
  showBatch(ids: string[]): void {
    for (const id of ids) this.show(id);
  }

  private _showNext(): void {
    if (this.queue.length === 0) { this.active = false; return; }
    this.active = true;
    const id = this.queue.shift()!;
    this._display(id);
  }

  private _display(id: string): void {
    const def = getAchievementDef(id);
    if (!def) { this._showNext(); return; }

    const { width } = this.scene.scale;

    const hiddenX   = width + TOAST_W / 2 + 10;
    const visibleX  = width - TOAST_W / 2 - TOAST_MARGIN;
    const y         = TOAST_MARGIN + TOAST_H / 2 + 60; // below HUD strip

    // Container
    const c = this.scene.add.container(hiddenX, y).setDepth(DEPTH);

    // Background panel
    const bg = this.scene.add.rectangle(0, 0, TOAST_W, TOAST_H, 0x001a00)
      .setStrokeStyle(2, 0x00cc44);
    c.add(bg);

    // Header text: "Achievement Unlocked!"
    const header = this.scene.add.text(
      -TOAST_W / 2 + 12, -TOAST_H / 2 + 8,
      'Achievement Unlocked!',
      { fontSize: '11px', color: '#00ff44', fontFamily: 'monospace', fontStyle: 'bold' },
    ).setOrigin(0, 0);
    c.add(header);

    // Icon + title
    const icon = this.scene.add.text(
      -TOAST_W / 2 + 12, -2,
      def.icon,
      { fontSize: '18px', fontFamily: 'monospace' },
    ).setOrigin(0, 0.5);
    c.add(icon);

    const title = this.scene.add.text(
      -TOAST_W / 2 + 38, -2,
      def.title,
      { fontSize: '13px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
        wordWrap: { width: TOAST_W - 50 } },
    ).setOrigin(0, 0.5);
    c.add(title);

    this.container = c;

    // Slide in
    this.scene.tweens.add({
      targets:  c,
      x:        visibleX,
      duration: SLIDE_MS,
      ease:     'Back.easeOut',
      onComplete: () => {
        // Hold, then slide out
        this.scene.time.delayedCall(SHOW_DURATION, () => {
          if (!c.scene) { this._showNext(); return; } // scene destroyed
          this.scene.tweens.add({
            targets:  c,
            x:        hiddenX,
            duration: SLIDE_MS,
            ease:     'Back.easeIn',
            onComplete: () => {
              c.destroy();
              this.container = null;
              this._showNext();
            },
          });
        });
      },
    });
  }

  /** Immediately destroy any active toast (call on scene shutdown). */
  destroy(): void {
    this.container?.destroy();
    this.container = null;
    this.queue = [];
    this.active = false;
  }
}
