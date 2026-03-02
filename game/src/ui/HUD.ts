import Phaser from 'phaser';
import { MobileManager } from '../systems/MobileManager';
import { PAL } from './palette';
import { CommanderPortrait } from './CommanderPortrait';
import type { CommanderDef, CommanderRunState } from '../data/commanderDefs';

const _IS_MOBILE = MobileManager.getInstance().isMobile();
const HUD_HEIGHT = _IS_MOBILE ? 64 : 48;
const PADDING    = 16;
const DEPTH      = 100;

/**
 * Returns the HUD strip height in Phaser logical pixels.
 * 64 on mobile (larger touch targets), 48 on desktop.
 * Import this in GameScene instead of hard-coding 48.
 */
export function getHudHeight(): number {
  return MobileManager.getInstance().isMobile() ? 64 : 48;
}

type SpeedCallback = (multiplier: number) => void;

/** Wave numbers that are boss waves (every 5th). */
function isBossWaveNumber(n: number): boolean {
  return n > 0 && n % 5 === 0;
}

export class HUD extends Phaser.GameObjects.Container {
  private livesText: Phaser.GameObjects.Text;
  private goldText:  Phaser.GameObjects.Text;
  private waveText:  Phaser.GameObjects.Text;

  // Speed control buttons
  private speedBtns: Array<{ bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }> = [];
  private activeSpeed = 1;

  // Next-wave button (right side of HUD strip)
  private nextWaveBg?:    Phaser.GameObjects.Rectangle;
  private nextWaveLabel?: Phaser.GameObjects.Text;

  // Air wave warning alert (shown between waves when the next wave has air creeps)
  private airWaveAlert?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, lives: number, gold: number) {
    super(scene, 0, 0);

    const { width } = scene.scale;

    const bg = new Phaser.GameObjects.Rectangle(
      scene, width / 2, HUD_HEIGHT / 2, width, HUD_HEIGHT, 0x000000, 0.8,
    );
    bg.setStrokeStyle(1, PAL.borderInactive);

    this.livesText = scene.add.text(PADDING, HUD_HEIGHT / 2, `♥  ${lives}`, {
      fontSize: '20px',
      color: PAL.danger,
      fontFamily: PAL.fontBody,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(DEPTH + 1);

    this.goldText = scene.add.text(width / 2, HUD_HEIGHT / 2, `⬡  ${gold}`, {
      fontSize: '20px',
      color: PAL.gold,
      fontFamily: PAL.fontBody,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);

    this.waveText = scene.add.text(width - PADDING, HUD_HEIGHT / 2, 'Wave 0 / 20', {
      fontSize: '18px',
      color: PAL.textNeutral,
      fontFamily: PAL.fontBody,
    }).setOrigin(1, 0.5).setDepth(DEPTH + 1);

    this.add([bg, this.livesText, this.goldText, this.waveText]);
    this.setDepth(DEPTH);
    scene.add.existing(this);
  }

  setLives(lives: number): void {
    this.livesText.setText(`♥  ${lives}`);
    if (lives <= 5)       this.livesText.setColor(PAL.danger);
    else if (lives <= 10) this.livesText.setColor(PAL.dangerWarm);
  }

  setGold(gold: number): void {
    this.goldText.setText(`⬡  ${gold}`);
  }

  /**
   * Update the wave counter.  Boss waves display a ★ icon and orange colour.
   * In endless mode (isEndless=true, current > 20) the ∞ symbol replaces the
   * total and the text is tinted blue to signal post-campaign play.
   */
  setWave(current: number, total: number, isEndless?: boolean): void {
    if (isEndless && current > 20) {
      const boss  = current % 5 === 0;
      const label = boss ? `★ ∞ Wave ${current}` : `∞ Wave ${current}`;
      this.waveText.setText(label);
      this.waveText.setColor(boss ? PAL.waveWarning : PAL.accentBlue);
      return;
    }
    const boss  = isBossWaveNumber(current);
    const label = boss
      ? `★ Wave ${current} / ${total}`
      : `Wave ${current} / ${total}`;
    this.waveText.setText(label);
    this.waveText.setColor(boss ? PAL.waveWarning : PAL.textNeutral);
  }

  // ── speed controls ────────────────────────────────────────────────────────

  /**
   * Create pause / 1× / 2× speed buttons.
   * Must be called once during scene create().
   * onSpeedChange receives the new multiplier (0 = paused, 1, or 2).
   */
  createSpeedControls(onSpeedChange: SpeedCallback): void {
    // On mobile use larger touch targets (closer to 44px physical on tablets).
    const btnW   = _IS_MOBILE ? 48 : 38;
    const btnH   = _IS_MOBILE ? 44 : 30;
    const gap    = 4;
    const startX = _IS_MOBILE ? 135 : 155; // left edge of first button
    const cy     = HUD_HEIGHT / 2;

    const defs: Array<{ mult: number; label: string; hint: string }> = [
      { mult: 0, label: '⏸', hint: 'Spc' },
      { mult: 1, label: '1×', hint: 'F'   },
      { mult: 2, label: '2×', hint: 'F'   },
    ];

    for (let i = 0; i < defs.length; i++) {
      const { mult, label, hint } = defs[i];
      const cx = startX + i * (btnW + gap) + btnW / 2;
      const isActive = mult === 1; // 1× is default

      const bgColor   = isActive ? PAL.bgSpeedBtnActive : PAL.bgSpeedBtn;
      const textColor = isActive ? PAL.accentGreen : PAL.textInactive;

      const btnBg = this.scene.add.rectangle(cx, cy, btnW, btnH, bgColor)
        .setStrokeStyle(1, isActive ? PAL.borderSpeedActive : PAL.borderNeutral)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 2);

      const btnLabel = this.scene.add.text(cx, cy, label, {
        fontSize: '14px',
        color: textColor,
        fontFamily: PAL.fontBody,
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3);

      // Keyboard shortcut hint — desktop only (top-right corner of button)
      if (!_IS_MOBILE) {
        this.scene.add.text(cx + btnW / 2 - 2, cy - btnH / 2 + 2, hint, {
          fontSize: '8px',
          color: PAL.textDim,
          fontFamily: PAL.fontBody,
        }).setOrigin(1, 0).setDepth(DEPTH + 4);
      }

      btnBg.on('pointerover', () => {
        if (this.activeSpeed !== mult) btnBg.setFillStyle(PAL.bgBtnHover);
      });
      btnBg.on('pointerout', () => {
        if (this.activeSpeed !== mult) btnBg.setFillStyle(PAL.bgSpeedBtn);
      });
      btnBg.on('pointerup', () => {
        this.setActiveSpeed(mult);
        onSpeedChange(mult);
      });

      this.speedBtns.push({ bg: btnBg, label: btnLabel });
    }
  }

  /**
   * Expose `setActiveSpeed` for keyboard shortcuts in GameScene.
   * Syncs the visual state of the speed buttons without triggering the callback.
   */
  syncSpeed(mult: number): void {
    this.setActiveSpeed(mult);
  }

  private setActiveSpeed(mult: number): void {
    this.activeSpeed = mult;
    const palette: Array<{ bg: number; stroke: number; text: string }> = [
      { bg: PAL.bgSpeedBtn,       stroke: PAL.borderNeutral,      text: PAL.textInactive  },
      { bg: PAL.bgSpeedBtnActive, stroke: PAL.borderSpeedActive,  text: PAL.accentGreen  },
      { bg: PAL.bgSpeedBtnFast,   stroke: PAL.borderSpeedFast,    text: PAL.accentBlue   },
    ];
    const mults = [0, 1, 2];
    for (let i = 0; i < this.speedBtns.length; i++) {
      const active = mults[i] === mult;
      const p = active ? palette[i === 2 ? 2 : 1] : palette[0];
      this.speedBtns[i].bg.setFillStyle(p.bg).setStrokeStyle(1, p.stroke);
      this.speedBtns[i].label.setColor(p.text);
    }
  }

  // ── next-wave button ──────────────────────────────────────────────────────

  /**
   * Create the "Next Wave" button in the right portion of the HUD strip.
   * Must be called once during scene create(). onClick is set per-use via setNextWaveVisible.
   */
  createNextWaveButton(onClick: () => void): void {
    const { width } = this.scene.scale;
    const btnW = 220;
    const btnX = width - PADDING - btnW / 2;
    const btnY = HUD_HEIGHT / 2;

    this.nextWaveBg = this.scene.add.rectangle(btnX, btnY, btnW, _IS_MOBILE ? 44 : 36, PAL.bgNextWave)
      .setStrokeStyle(2, PAL.borderNextWave)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 2)
      .setVisible(false);

    this.nextWaveLabel = this.scene.add.text(btnX, btnY, '', {
      fontSize: '14px',
      color: PAL.accentGreen,
      fontFamily: PAL.fontBody,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3).setVisible(false);

    this.nextWaveBg.on('pointerover', () => this.nextWaveBg?.setFillStyle(PAL.bgNextWaveHover));
    this.nextWaveBg.on('pointerout',  () => this.nextWaveBg?.setFillStyle(PAL.bgNextWave));
    this.nextWaveBg.on('pointerup', onClick);
  }

  /**
   * Show/hide the next-wave button.
   * waveNumber is the wave about to start.
   * Boss waves (multiple of 5) display a ★ icon and warm orange colour.
   * In endless mode (isEndless=true, waveNumber > 20) the ∞ symbol is prepended.
   */
  setNextWaveVisible(visible: boolean, waveNumber: number, isEndless?: boolean): void {
    if (!this.nextWaveBg || !this.nextWaveLabel) return;
    this.nextWaveBg.setVisible(visible);
    this.nextWaveLabel.setVisible(visible);

    if (visible) {
      const isEndlessWave = isEndless && waveNumber > 20;
      const boss = isEndlessWave ? (waveNumber % 5 === 0) : isBossWaveNumber(waveNumber);
      let label: string;
      if (waveNumber === 1) {
        label = 'START WAVE 1 ▶';
      } else if (isEndlessWave && boss) {
        label = `★ ∞ BOSS WAVE ${waveNumber} ★`;
      } else if (isEndlessWave) {
        label = `∞ WAVE ${waveNumber} ▶`;
      } else if (boss) {
        label = `★ BOSS WAVE ${waveNumber} ★`;
      } else {
        label = `WAVE ${waveNumber} ▶`;
      }
      this.nextWaveLabel.setText(label);

      const textCol  = boss ? PAL.waveWarning : (isEndlessWave ? PAL.accentBlue : PAL.accentGreen);
      const strokeN  = boss ? PAL.waveWarningN : (isEndlessWave ? PAL.borderNextWaveEnd : PAL.borderNextWave);
      this.nextWaveLabel.setColor(textCol);
      this.nextWaveBg.setStrokeStyle(2, strokeN);

      this.waveText.setVisible(false);
    } else {
      this.waveText.setVisible(true);
    }
  }

  // ── give up button (endless mode) ─────────────────────────────────────────

  /**
   * Create a "GIVE UP" button for endless mode.  Placed between the speed
   * controls and the gold text so it doesn't overlap other HUD elements.
   * Clicking it immediately triggers the provided callback (ends the run).
   */
  createGiveUpButton(onClick: () => void): void {
    const btnW  = _IS_MOBILE ? 110 : 100;
    const btnH  = _IS_MOBILE ? 44  : 30;
    const btnX  = _IS_MOBILE ? 440 : 400;
    const btnY  = HUD_HEIGHT / 2;

    const bg = this.scene.add.rectangle(btnX, btnY, btnW, btnH, PAL.bgGiveUp)
      .setStrokeStyle(1, PAL.borderGiveUp)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 2);

    const label = this.scene.add.text(btnX, btnY, 'GIVE UP', {
      fontSize:   '13px',
      color:      PAL.danger,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3);

    bg.on('pointerover', () => { bg.setFillStyle(PAL.bgGiveUpHover); label.setColor(PAL.dangerLight); });
    bg.on('pointerout',  () => { bg.setFillStyle(PAL.bgGiveUp); label.setColor(PAL.danger); });
    bg.on('pointerup',   onClick);
  }

  // ── commander portrait ──────────────────────────────────────────────────

  /** Full commander portrait widget (replaces the old text-only display). */
  private commanderPortrait?: CommanderPortrait;

  /** Return the portrait so GameScene can trigger visual reactions. */
  getCommanderPortrait(): CommanderPortrait | undefined {
    return this.commanderPortrait;
  }

  /**
   * Create the commander portrait in the top-left area of the HUD.
   * Shows the portrait image with a coloured border, tooltip on hover,
   * and click-to-activate ability support.
   */
  createCommanderPortrait(
    commanderDef: CommanderDef,
    commanderState: CommanderRunState,
    onActivateAbility: () => void,
  ): void {
    const portraitSize = _IS_MOBILE ? 56 : 48;
    const px = PADDING + portraitSize / 2 + 3; // 3px inset from left edge
    const py = HUD_HEIGHT + portraitSize / 2 + 6; // just below the HUD strip

    this.commanderPortrait = new CommanderPortrait({
      scene: this.scene,
      commanderDef,
      commanderState,
      onActivateAbility,
      x: px,
      y: py,
    });
  }

  // ── ability button ─────────────────────────────────────────────────────

  private abilityBtnBg?: Phaser.GameObjects.Rectangle;
  private abilityBtnLabel?: Phaser.GameObjects.Text;

  /**
   * Create a one-shot ability button in the HUD strip (left of gold text).
   * Greys out after activation.
   */
  createAbilityButton(abilityName: string, onActivate: () => void): void {
    const cy = HUD_HEIGHT / 2;
    const btnX = this.scene.scale.width / 2 - 140;
    const btnW = 120;

    this.abilityBtnBg = this.scene.add.rectangle(btnX, cy, btnW, 30, PAL.bgAbilityBtn)
      .setStrokeStyle(1, PAL.borderAbility)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 2);

    this.abilityBtnLabel = this.scene.add.text(btnX, cy, abilityName, {
      fontSize: '10px',
      color: PAL.textAbility,
      fontFamily: PAL.fontBody,
      fontStyle: 'bold',
      wordWrap: { width: btnW - 8 },
      align: 'center',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3);

    this.abilityBtnBg.on('pointerover', () => {
      if (this.abilityBtnBg?.input?.enabled) this.abilityBtnBg.setFillStyle(PAL.bgAbilityBtnHover);
    });
    this.abilityBtnBg.on('pointerout', () => {
      if (this.abilityBtnBg?.input?.enabled) this.abilityBtnBg.setFillStyle(PAL.bgAbilityBtn);
    });
    this.abilityBtnBg.on('pointerup', () => {
      onActivate();
    });
  }

  /** Grey out the ability button after it's been used. */
  disableAbilityButton(): void {
    if (this.abilityBtnBg) {
      this.abilityBtnBg.disableInteractive();
      this.abilityBtnBg.setFillStyle(PAL.bgPanelDark);
      this.abilityBtnBg.setStrokeStyle(1, PAL.borderPanel);
    }
    if (this.abilityBtnLabel) {
      this.abilityBtnLabel.setColor(PAL.textDisabled);
    }
  }

  // ── mute button ───────────────────────────────────────────────────────────

  private muteBtnBg?:    Phaser.GameObjects.Rectangle;
  private muteBtnLabel?: Phaser.GameObjects.Text;

  /**
   * Create a speaker icon mute toggle button in the HUD strip.
   * Must be called once during scene create().
   * `onToggle` is called on click and should return the new muted state
   * (true = muted) so the button icon can update.
   */
  createMuteButton(initialMuted: boolean, onToggle: () => boolean): void {
    // On mobile: wider speed buttons end ~287 (3×48 + 2×4 + start 135) → mute at ~317.
    // On desktop: speed buttons end ~277 (3×38 + 2×4 + start 155) → mute at 305.
    const btnW = _IS_MOBILE ? 44 : 36;
    const btnH = _IS_MOBILE ? 44 : 30;
    const cx   = _IS_MOBILE ? 317 : 305;
    const cy   = HUD_HEIGHT / 2;

    this.muteBtnBg = this.scene.add.rectangle(cx, cy, btnW, btnH, PAL.bgSpeedBtn)
      .setStrokeStyle(1, PAL.borderNeutral)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 2);

    this.muteBtnLabel = this.scene.add.text(cx, cy, initialMuted ? '🔇' : '🔊', {
      fontSize:   '14px',
      fontFamily: PAL.fontBody,
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3);

    this.muteBtnBg.on('pointerover', () => this.muteBtnBg?.setFillStyle(PAL.bgBtnHover));
    this.muteBtnBg.on('pointerout',  () => this.muteBtnBg?.setFillStyle(PAL.bgSpeedBtn));
    this.muteBtnBg.on('pointerup', () => {
      const muted = onToggle();
      this.muteBtnLabel?.setText(muted ? '🔇' : '🔊');
    });
  }

  // ── boss warning ──────────────────────────────────────────────────────────

  /**
   * Show or hide the air wave incoming alert below the HUD strip.
   * Pass a non-empty string to show the alert; pass '' to hide it.
   * Called when revealing the next-wave button to warn players about air waves.
   */
  showAirWaveAlert(message: string): void {
    if (!message) {
      this.airWaveAlert?.setVisible(false);
      return;
    }

    if (!this.airWaveAlert) {
      const { width } = this.scene.scale;
      this.airWaveAlert = this.scene.add.text(
        width / 2, HUD_HEIGHT + 14,
        message,
        {
          fontSize:        '11px',
          color:           '#88ccff',
          fontFamily:      PAL.fontBody,
          fontStyle:       'bold',
          backgroundColor: '#00000099',
          padding:         { x: 8, y: 3 },
        },
      ).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);
      this.add(this.airWaveAlert);
    } else {
      this.airWaveAlert.setText(message).setVisible(true);
    }
  }

  /**
   * Display a large animated "BOSS WAVE" warning text centred on the viewport.
   * The text fades in, holds for ~1.5 s, then fades out.
   *
   * @param bossName Ojibwe animal name to include in the warning
   *                 (e.g. "Makwa", "Migizi", "Waabooz", "Animikiins")
   */
  showBossWarning(bossName: string): void {
    const { width, height } = this.scene.scale;
    const cy = height / 2;

    const warning = this.scene.add.text(
      width / 2, cy,
      `⚠ BOSS WAVE ⚠\n${bossName}`,
      {
        fontSize:        '52px',
        color:           PAL.bossWarning,
        fontFamily:      PAL.fontTitle,
        fontStyle:       'bold',
        align:           'center',
        stroke:          '#000000',
        strokeThickness: 5,
      },
    ).setOrigin(0.5, 0.5).setDepth(DEPTH + 50).setAlpha(0);

    this.scene.tweens.add({
      targets:  warning,
      alpha:    1,
      duration: 300,
      yoyo:     true,
      hold:     1500,
      onComplete: () => warning.destroy(),
    });
  }
}
