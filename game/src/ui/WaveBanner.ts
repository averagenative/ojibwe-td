/**
 * WaveBanner — centred announcement banner shown before each wave.
 *
 * Slides in from the top of the screen, holds for ~1.8 s, then slides back out.
 * Boss waves receive larger text, ember-red styling, and trigger a brief camera
 * shake + screen-edge pulse.
 *
 * Depth 200: above HUD (100) and vignette overlays (150), below BetweenWaveScene
 * overlay (299) so it remains visible while the game is active but not during
 * the between-wave offer screen.
 *
 * The banner respects the current game speed multiplier: faster game speed
 * shortens the hold duration proportionally.
 */

import Phaser from 'phaser';
import type { WaveAnnouncementInfo } from '../systems/WaveManager';
import { PAL } from './palette';

// ── Layout constants ──────────────────────────────────────────────────────────
const DEPTH      = 200;
const BANNER_W   = 540;
const BANNER_H   = 84;
const HUD_HEIGHT = 48;   // must match HUD.ts
const ANIM_MS    = 280;  // slide-in / slide-out duration
const HOLD_MS    = 1800; // how long the banner stays fully visible

// ── Wave-type badge config ────────────────────────────────────────────────────
const BADGE_FILL: Record<WaveAnnouncementInfo['waveType'], number> = {
  ground: PAL.accentGreenN,
  air:    PAL.accentBlueN,
  mixed:  PAL.accentGreenN, // drawn specially as a split badge
  boss:   PAL.bossWarningN,
};

const BADGE_LABEL: Record<WaveAnnouncementInfo['waveType'], string> = {
  ground: 'GROUND',
  air:    '✈ AIR',
  mixed:  'MIXED',
  boss:   'BOSS',
};

// ── Suggested tower hints by wave type ───────────────────────────────────────
// Boss waves use _buildBossContent (separate branch), so no hint entry needed.
const TOWER_HINTS: Partial<Record<WaveAnnouncementInfo['waveType'], string>> = {
  air:   'Tesla & Frost effective',
  mixed: 'Multi-target towers recommended',
};

// ── WaveBanner class ─────────────────────────────────────────────────────────

export class WaveBanner {
  private readonly scene:      Phaser.Scene;
  private container:           Phaser.GameObjects.Container | null = null;
  private activeTween:         Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Display the banner for the given wave.
   *
   * @param info        Wave metadata produced by WaveManager.getWaveAnnouncementInfo()
   * @param speedMult   Current game speed (0 = paused → treated as 1 for timing)
   * @param firstAir    True when this is the first air/mixed wave of the run
   */
  show(info: WaveAnnouncementInfo, speedMult: number, firstAir: boolean): void {
    this.destroy();

    const { width, height } = this.scene.scale;
    const cx      = width  / 2;
    const targetY = HUD_HEIGHT + 4 + BANNER_H / 2;  // sits just below HUD strip
    const startY  = -BANNER_H;                        // above the viewport

    const container = this.scene.add.container(cx, startY)
      .setDepth(DEPTH)
      .setAlpha(0);
    this.container = container;

    // ── Background panel ──────────────────────────────────────────────────────
    const strokeColor = info.isBoss ? PAL.bossWarningN : PAL.borderPanel;
    const bg = this.scene.add.rectangle(0, 0, BANNER_W, BANNER_H, PAL.bgPanel, 0.94)
      .setStrokeStyle(2, strokeColor);
    container.add(bg);

    if (info.isBoss) {
      this._buildBossContent(container, info, width);
    } else {
      this._buildNormalContent(container, info, firstAir);
    }

    // ── Boss-specific effects ─────────────────────────────────────────────────
    if (info.isBoss) {
      this.scene.cameras.main.shake(280, 0.004);
      this._triggerEdgePulse(width, height);
    }

    // ── Slide-in → hold → slide-out tween ────────────────────────────────────
    const effectiveMult = speedMult <= 0 ? 1 : speedMult;
    const animDur = Math.round(ANIM_MS / effectiveMult);
    const holdDur = Math.round(HOLD_MS / effectiveMult);

    this.activeTween = this.scene.tweens.add({
      targets:    container,
      y:          targetY,
      alpha:      1,
      duration:   animDur,
      ease:       'Cubic.Out',
      hold:       holdDur,
      yoyo:       true,
      onComplete: () => {
        container.destroy();
        if (this.container === container) this.container = null;
      },
    });
  }

  /** Immediately stop and remove any active banner. */
  destroy(): void {
    this.activeTween?.stop();
    this.activeTween = null;
    this.container?.destroy();
    this.container = null;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /** Normal (non-boss) banner layout: wave number, type badge, count, traits. */
  private _buildNormalContent(
    container: Phaser.GameObjects.Container,
    info:      WaveAnnouncementInfo,
    firstAir:  boolean,
  ): void {
    const left  = -BANNER_W / 2 + 20;
    const right =  BANNER_W / 2 - 20;

    // ── "WAVE N" heading (left-aligned, row 1) ─────────────────────────────
    container.add(this.scene.add.text(left, -16, `WAVE ${info.waveNumber}`, {
      fontSize:   '28px',
      color:      PAL.textPrimary,
      fontFamily: PAL.fontTitle,
      fontStyle:  'bold',
    }).setOrigin(0, 0.5));

    // ── Creep count (right-aligned, row 2) ───────────────────────────────────
    container.add(this.scene.add.text(right, 14, `×${info.creepCount} creeps`, {
      fontSize:   '12px',
      color:      PAL.textNeutral,
      fontFamily: PAL.fontBody,
    }).setOrigin(1, 0.5));

    // ── Wave-type badge (upper-right area) ───────────────────────────────────
    const badgeW = info.waveType === 'mixed' ? 88 : 72;
    const badgeH = 22;
    const badgeX = right - badgeW / 2;
    const badgeY = -16;

    if (info.waveType === 'mixed') {
      // Split badge: left half earthy green, right half sky blue
      const gfx = this.scene.add.graphics();
      gfx.fillStyle(PAL.accentGreenN, 1);
      gfx.fillRect(badgeX - badgeW / 2, badgeY - badgeH / 2, badgeW / 2, badgeH);
      gfx.fillStyle(PAL.accentBlueN, 1);
      gfx.fillRect(badgeX, badgeY - badgeH / 2, badgeW / 2, badgeH);
      container.add(gfx);
    } else {
      container.add(
        this.scene.add.rectangle(badgeX, badgeY, badgeW, badgeH, BADGE_FILL[info.waveType]),
      );
    }

    container.add(this.scene.add.text(badgeX, badgeY, BADGE_LABEL[info.waveType], {
      fontSize:   '11px',
      color:      '#ffffff',
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5, 0.5));

    // ── Sub-line: traits OR first-air callout (row 2, left-aligned) ──────────
    let subLine  = info.traits.length > 0 ? info.traits.join('  ·  ') : '';
    let subColor: string = PAL.textDim;

    if (firstAir && (info.waveType === 'air' || info.waveType === 'mixed')) {
      subLine  = 'NEW: AIR WAVE — Tesla & Frost only!';
      subColor = PAL.accentBlue;
    } else {
      const hint = TOWER_HINTS[info.waveType];
      if (hint && !subLine) subLine = hint;
    }

    if (subLine) {
      container.add(this.scene.add.text(left, 14, subLine, {
        fontSize:   '11px',
        color:      subColor,
        fontFamily: PAL.fontBody,
      }).setOrigin(0, 0.5));
    }
  }

  /** Boss-wave banner layout: dramatic centred heading, trait list, escort count. */
  private _buildBossContent(
    container: Phaser.GameObjects.Container,
    info:      WaveAnnouncementInfo,
    _width:    number,
  ): void {
    // ── Boss heading ──────────────────────────────────────────────────────────
    const bossLine = info.bossName
      ? `⚠  BOSS INCOMING — ${info.bossName.toUpperCase()}  ⚠`
      : '⚠  BOSS INCOMING  ⚠';

    container.add(this.scene.add.text(0, -16, bossLine, {
      fontSize:        '21px',
      color:           PAL.bossWarning,
      fontFamily:      PAL.fontTitle,
      fontStyle:       'bold',
      stroke:          '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5));

    // ── Sub-line: traits + escort count ──────────────────────────────────────
    const parts: string[] = [...info.traits];
    if (info.escortCount && info.escortCount > 0) {
      parts.push(`×${info.escortCount} escort${info.escortCount > 1 ? 's' : ''}`);
    }

    if (parts.length > 0) {
      container.add(this.scene.add.text(0, 14, parts.join('  ·  '), {
        fontSize:   '12px',
        color:      PAL.textMuted,
        fontFamily: PAL.fontBody,
      }).setOrigin(0.5, 0.5));
    }

    // ── Wave number label (top-left corner, small) ────────────────────────────
    container.add(this.scene.add.text(-BANNER_W / 2 + 12, -BANNER_H / 2 + 10,
      `WAVE ${info.waveNumber}`, {
        fontSize:   '10px',
        color:      PAL.waveWarning,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0, 0.5),
    );
  }

  /**
   * Brief pulsing red border around the screen edges — played on boss waves.
   * The Graphics lives at depth 190 (below the banner itself).
   */
  private _triggerEdgePulse(width: number, height: number): void {
    const lw  = 10;
    const gfx = this.scene.add.graphics().setDepth(190).setAlpha(0);
    gfx.lineStyle(lw, PAL.bossWarningN, 1);
    gfx.strokeRect(lw / 2, lw / 2, width - lw, height - lw);

    this.scene.tweens.add({
      targets:  gfx,
      alpha:    0.75,
      duration: 140,
      yoyo:     true,
      repeat:   3,
      onComplete: () => gfx.destroy(),
    });
  }
}
