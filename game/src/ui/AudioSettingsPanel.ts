/**
 * AudioSettingsPanel — modal overlay for independent music/SFX volume control.
 *
 * Manages its own Phaser game objects at depth 200 (above all HUD elements).
 * Reusable from both GameScene (HUD gear button) and MainMenuScene.
 *
 * Controls:
 *   - Music: ON/OFF toggle + volume −/+ buttons
 *   - SFX:   ON/OFF toggle + volume −/+ buttons
 *   - Master: mute-all toggle (preserves per-channel settings)
 *   - Close button
 *
 * All interactive controls have ≥44px hit areas on mobile.
 */

import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';
import { MobileManager, TAP_EVENT } from '../systems/MobileManager';
import { PAL } from './palette';
import { SaveManager } from '../meta/SaveManager';

const DEPTH      = 200;
const _IS_MOBILE = MobileManager.getInstance().isMobile();
const PANEL_W    = _IS_MOBILE ? 500 : 360;
const VOL_STEP   = 10; // % per +/− press

// ── Colours reused across the panel ─────────────────────────────────────────
const C_ON_BG     = 0x163010;   // active/on button fill (same as bgSpeedBtnActive)
const C_OFF_BG    = 0x330a0a;   // muted/off button fill
const C_ON_STROKE = PAL.borderSpeedActive;
const C_OFF_STROKE = PAL.borderGiveUp;

// ── AudioSettingsPanel ───────────────────────────────────────────────────────

export class AudioSettingsPanel {
  private readonly scene: Phaser.Scene;
  private readonly isMobile: boolean;

  private _visible = false;
  private _objects: Phaser.GameObjects.GameObject[] = [];

  // Live-update refs for the master mute row (updated externally via syncMaster)
  private _masterBg?:    Phaser.GameObjects.Rectangle;
  private _masterLabel?: Phaser.GameObjects.Text;

  /** Called after the panel hides itself (close button or backdrop tap). */
  onClose?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene    = scene;
    this.isMobile = MobileManager.getInstance().isMobile();
  }

  isVisible(): boolean { return this._visible; }

  show(): void {
    if (this._visible) return;
    this._visible = true;
    this._build();
  }

  hide(): void {
    if (!this._visible) return;
    this._visible = false;
    this._destroyObjects();
    this.onClose?.();
  }

  destroy(): void {
    this._visible = false;
    this._destroyObjects();
  }

  // ── Private — build ────────────────────────────────────────────────────────

  private _destroyObjects(): void {
    for (const obj of this._objects) {
      if (obj?.active) obj.destroy();
    }
    this._objects     = [];
    this._masterBg    = undefined;
    this._masterLabel = undefined;
  }

  private _reg<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this._objects.push(obj);
    return obj;
  }

  private _build(): void {
    const { width, height } = this.scene.scale;
    const cx = width  / 2;
    const cy = height / 2;
    const m  = this.isMobile;

    const btnH     = m ? 44 : 36;
    const rowGap   = m ? 10 : 8;
    const padV     = 20;

    // Rows: music, sfx, master, colorblind toggle, close
    // Height = padV + titleH + padV + 4*(btnH + rowGap) + btnH + padV
    const titleH = m ? 20 : 16;
    const panelH = padV + titleH + padV + (btnH + rowGap) * 4 + btnH + padV;

    // ── Backdrop (blocks pointer events to the scene behind) ──────────────
    const backdrop = this._reg(
      this.scene.add.rectangle(cx, cy, width, height, 0x000000, 0.55)
        .setDepth(DEPTH - 1)
        .setInteractive(),  // absorbs clicks
    );
    // Tap outside the panel to close
    backdrop.on(TAP_EVENT, () => this.hide());

    // ── Panel background ───────────────────────────────────────────────────
    this._reg(
      this.scene.add.rectangle(cx, cy, PANEL_W, panelH, PAL.bgPanelDark)
        .setStrokeStyle(2, PAL.borderActive)
        .setDepth(DEPTH)
        .setInteractive(), // stops backdrop click from leaking through
    );

    // ── Title ──────────────────────────────────────────────────────────────
    let y = cy - panelH / 2 + padV + titleH / 2;
    this._reg(
      this.scene.add.text(cx, y, '⚙  AUDIO SETTINGS', {
        fontSize:   m ? '22px' : '14px',
        color:      PAL.textPrimary,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1),
    );

    y += titleH / 2 + padV;

    // ── Music row ──────────────────────────────────────────────────────────
    const am = AudioManager.getInstance();
    y = this._buildVolumeRow(
      cx, y, btnH, 'MUSIC ♪',
      am.getMusicVolume(),
      am.isMusicMuted(),
      (nowMuted) => am.setMusicMuted(nowMuted),
      (delta)    => {
        const newV = Math.round(Math.max(0, Math.min(100, am.getMusicVolume() * 100 + delta)));
        am.setMusicVolume(newV / 100);
        return newV;
      },
    );

    y += rowGap;

    // ── SFX row ────────────────────────────────────────────────────────────
    y = this._buildVolumeRow(
      cx, y, btnH, 'SFX 🔊',
      am.getSfxVolume(),
      am.isSfxMuted(),
      (nowMuted) => am.setSfxMuted(nowMuted),
      (delta)    => {
        const newV = Math.round(Math.max(0, Math.min(100, am.getSfxVolume() * 100 + delta)));
        am.setSfxVolume(newV / 100);
        return newV;
      },
    );

    y += rowGap;

    // ── Master mute row ────────────────────────────────────────────────────
    const masterBg = this._reg(
      this.scene.add.rectangle(cx, y + btnH / 2, 220, btnH, am.isMuted() ? C_OFF_BG : C_ON_BG)
        .setStrokeStyle(1, am.isMuted() ? C_OFF_STROKE : C_ON_STROKE)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 2),
    );
    const masterLabel = this._reg(
      this.scene.add.text(cx, y + btnH / 2, this._masterText(am.isMuted()), {
        fontSize:   m ? '18px' : '12px',
        color:      am.isMuted() ? PAL.danger : PAL.accentGreen,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3),
    ) as Phaser.GameObjects.Text;
    this._masterBg    = masterBg as Phaser.GameObjects.Rectangle;
    this._masterLabel = masterLabel;

    masterBg.on('pointerover', () => (masterBg as Phaser.GameObjects.Rectangle).setFillStyle(PAL.bgBtnHover));
    masterBg.on('pointerout',  () => (masterBg as Phaser.GameObjects.Rectangle).setFillStyle(
      AudioManager.getInstance().isMuted() ? C_OFF_BG : C_ON_BG,
    ));
    masterBg.on(TAP_EVENT, () => {
      const a = AudioManager.getInstance();
      a.toggleMute();
      this._syncMasterRow(a.isMuted());
    });

    y += btnH + rowGap;

    // ── Colorblind mode toggle ──────────────────────────────────────────────
    const sm = SaveManager.getInstance();
    const cbInitial = sm.getColorblindMode();

    const cbBg = this._reg(
      this.scene.add.rectangle(cx, y + btnH / 2, 280, btnH,
        cbInitial ? C_ON_BG : PAL.bgSpeedBtn)
        .setStrokeStyle(1, cbInitial ? C_ON_STROKE : PAL.borderNeutral)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 2),
    ) as Phaser.GameObjects.Rectangle;

    const cbLabel = this._reg(
      this.scene.add.text(cx, y + btnH / 2, this._cbText(cbInitial), {
        fontSize:   m ? '18px' : '12px',
        color:      cbInitial ? PAL.accentGreen : PAL.textNeutral,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3),
    ) as Phaser.GameObjects.Text;

    cbBg.on('pointerover', () => cbBg.setFillStyle(PAL.bgBtnHover));
    cbBg.on('pointerout', () => {
      cbBg.setFillStyle(SaveManager.getInstance().getColorblindMode() ? C_ON_BG : PAL.bgSpeedBtn);
    });
    cbBg.on(TAP_EVENT, () => {
      const nowEnabled = !SaveManager.getInstance().getColorblindMode();
      SaveManager.getInstance().setColorblindMode(nowEnabled);
      cbBg.setFillStyle(nowEnabled ? C_ON_BG : PAL.bgSpeedBtn);
      cbBg.setStrokeStyle(1, nowEnabled ? C_ON_STROKE : PAL.borderNeutral);
      cbLabel.setText(this._cbText(nowEnabled));
      cbLabel.setColor(nowEnabled ? PAL.accentGreen : PAL.textNeutral);
    });

    y += btnH + rowGap;

    // ── Close button ────────────────────────────────────────────────────────
    const closeBg = this._reg(
      this.scene.add.rectangle(cx, y + btnH / 2, 140, btnH, PAL.bgSpeedBtn)
        .setStrokeStyle(1, PAL.borderNeutral)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 2),
    );
    this._reg(
      this.scene.add.text(cx, y + btnH / 2, 'CLOSE', {
        fontSize:   m ? '20px' : '12px',
        color:      PAL.textNeutral,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3),
    );

    closeBg.on('pointerover', () => (closeBg as Phaser.GameObjects.Rectangle).setFillStyle(PAL.bgBtnHover));
    closeBg.on('pointerout',  () => (closeBg as Phaser.GameObjects.Rectangle).setFillStyle(PAL.bgSpeedBtn));
    closeBg.on(TAP_EVENT,   () => this.hide());
  }

  /**
   * Build a single volume-control row (label | toggle | − | vol% | +).
   * Returns the y coordinate of the row bottom edge.
   */
  private _buildVolumeRow(
    cx: number,
    rowTopY: number,
    btnH: number,
    label: string,
    initialVol: number,
    initialMuted: boolean,
    onToggle: (muted: boolean) => void,
    onAdjust: (delta: number) => number,
  ): number {
    const m   = this.isMobile;
    const cy  = rowTopY + btnH / 2;

    // Column widths
    const labelW   = 72;
    const toggleW  = m ? 80 : 72;
    const adjBtnW  = 44;          // always ≥44 for touch targets
    const volW     = 52;
    const innerGap = 6;

    // Total row content width:
    // labelW + innerGap + toggleW + innerGap + adjBtnW + innerGap + volW + innerGap + adjBtnW
    const totalRowW = labelW + innerGap + toggleW + innerGap + adjBtnW + innerGap + volW + innerGap + adjBtnW;
    const leftX = cx - totalRowW / 2;

    let col = leftX;

    // ── Channel label ────────────────────────────────────────────────────
    this._reg(
      this.scene.add.text(col + labelW / 2, cy, label, {
        fontSize:   m ? '17px' : '11px',
        color:      PAL.textNeutral,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1),
    );
    col += labelW + innerGap;

    // ── ON/OFF toggle ─────────────────────────────────────────────────────
    const toggleBg = this._reg(
      this.scene.add.rectangle(col + toggleW / 2, cy, toggleW, btnH,
        initialMuted ? C_OFF_BG : C_ON_BG)
        .setStrokeStyle(1, initialMuted ? C_OFF_STROKE : C_ON_STROKE)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 2),
    ) as Phaser.GameObjects.Rectangle;

    const toggleLabel = this._reg(
      this.scene.add.text(col + toggleW / 2, cy, initialMuted ? 'OFF' : 'ON', {
        fontSize:   m ? '17px' : '11px',
        color:      initialMuted ? PAL.danger : PAL.accentGreen,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3),
    ) as Phaser.GameObjects.Text;

    toggleBg.on('pointerover', () => toggleBg.setFillStyle(PAL.bgBtnHover));
    toggleBg.on('pointerout',  () => {
      const muted = toggleLabel.text === 'OFF';
      toggleBg.setFillStyle(muted ? C_OFF_BG : C_ON_BG);
    });
    toggleBg.on(TAP_EVENT, () => {
      const currentlyMuted = toggleLabel.text === 'OFF';
      const nowMuted = !currentlyMuted;
      onToggle(nowMuted);
      this._syncToggle(toggleBg, toggleLabel, nowMuted);
    });

    col += toggleW + innerGap;

    // ── − (decrease) button ────────────────────────────────────────────────
    const minusBg = this._reg(
      this.scene.add.rectangle(col + adjBtnW / 2, cy, adjBtnW, btnH, PAL.bgSpeedBtn)
        .setStrokeStyle(1, PAL.borderNeutral)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 2),
    ) as Phaser.GameObjects.Rectangle;
    this._reg(
      this.scene.add.text(col + adjBtnW / 2, cy, '−', {
        fontSize:   m ? '25px' : '16px',
        color:      PAL.textNeutral,
        fontFamily: PAL.fontBody,
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3),
    );

    minusBg.on('pointerover', () => minusBg.setFillStyle(PAL.bgBtnHover));
    minusBg.on('pointerout',  () => minusBg.setFillStyle(PAL.bgSpeedBtn));
    minusBg.on(TAP_EVENT, () => {
      const v = onAdjust(-VOL_STEP);
      this._updateVolText(volText, v);
    });

    col += adjBtnW + innerGap;

    // ── Volume display ──────────────────────────────────────────────────────
    const volText = this._reg(
      this.scene.add.text(col + volW / 2, cy, `${Math.round(initialVol * 100)}%`, {
        fontSize:   m ? '17px' : '11px',
        color:      PAL.textNeutral,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3),
    ) as Phaser.GameObjects.Text;

    col += volW + innerGap;

    // ── + (increase) button ────────────────────────────────────────────────
    const plusBg = this._reg(
      this.scene.add.rectangle(col + adjBtnW / 2, cy, adjBtnW, btnH, PAL.bgSpeedBtn)
        .setStrokeStyle(1, PAL.borderNeutral)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 2),
    ) as Phaser.GameObjects.Rectangle;
    this._reg(
      this.scene.add.text(col + adjBtnW / 2, cy, '+', {
        fontSize:   m ? '25px' : '16px',
        color:      PAL.textNeutral,
        fontFamily: PAL.fontBody,
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3),
    );

    plusBg.on('pointerover', () => plusBg.setFillStyle(PAL.bgBtnHover));
    plusBg.on('pointerout',  () => plusBg.setFillStyle(PAL.bgSpeedBtn));
    plusBg.on(TAP_EVENT, () => {
      const v = onAdjust(+VOL_STEP);
      this._updateVolText(volText, v);
    });

    return rowTopY + btnH;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _masterText(muted: boolean): string {
    return muted ? '🔇  ALL MUTED' : '🔊  SOUND ON';
  }

  private _cbText(enabled: boolean): string {
    return enabled ? '⬛  COLORBLIND MODE: ON' : '⬜  COLORBLIND MODE: OFF';
  }

  private _syncToggle(
    bg: Phaser.GameObjects.Rectangle,
    label: Phaser.GameObjects.Text,
    muted: boolean,
  ): void {
    bg.setFillStyle(muted ? C_OFF_BG : C_ON_BG);
    bg.setStrokeStyle(1, muted ? C_OFF_STROKE : C_ON_STROKE);
    label.setText(muted ? 'OFF' : 'ON');
    label.setColor(muted ? PAL.danger : PAL.accentGreen);
  }

  private _syncMasterRow(muted: boolean): void {
    if (!this._masterBg || !this._masterLabel) return;
    this._masterBg.setFillStyle(muted ? C_OFF_BG : C_ON_BG);
    this._masterBg.setStrokeStyle(1, muted ? C_OFF_STROKE : C_ON_STROKE);
    this._masterLabel.setText(this._masterText(muted));
    this._masterLabel.setColor(muted ? PAL.danger : PAL.accentGreen);
  }

  private _updateVolText(text: Phaser.GameObjects.Text, pct: number): void {
    text.setText(`${pct}%`);
  }
}
