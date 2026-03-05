import Phaser from 'phaser';
import { MobileManager, TAP_EVENT } from '../systems/MobileManager';
import { PAL } from './palette';
import { PANEL_HEIGHT as TOWER_PANEL_H } from './TowerPanel';
import { CommanderPortrait } from './CommanderPortrait';
import type { AbilityDef, CommanderDef, CommanderRunState } from '../data/commanderDefs';
import type { OfferDef } from '../data/offerDefs';

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

  // Rush-wave button (shown during active waves)
  private rushWaveBg?:    Phaser.GameObjects.Rectangle;
  private rushWaveLabel?: Phaser.GameObjects.Text;

  // Air wave warning alert (shown between waves when the next wave has air creeps)
  private airWaveAlert?: Phaser.GameObjects.Text;

  // Ascension level badge (shown when ascension > 0)
  private _ascensionBadge?: Phaser.GameObjects.Text;

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
      btnBg.on(TAP_EVENT, () => {
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
    this.nextWaveBg.on(TAP_EVENT, onClick);
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
   * Create a "GIVE UP" button for endless mode.  Positioned in the
   * bottom-right corner of the game area, above the tower panel, so it
   * cannot be accidentally clicked while managing towers or triggering
   * the next wave.  Clicking shows a confirmation dialog before invoking
   * the callback.
   */
  createGiveUpButton(onClick: () => void): void {
    const { width, height } = this.scene.scale;
    const btnW  = _IS_MOBILE ? 110 : 100;
    const btnH  = _IS_MOBILE ? 44  : 30;
    const btnX  = width  - PADDING - btnW / 2;
    const btnY  = height - TOWER_PANEL_H - PADDING - btnH / 2;

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
    bg.on(TAP_EVENT,   () => this._showGiveUpConfirm(onClick));
  }

  /**
   * Show a modal confirmation dialog before giving up.
   * Creates a darkened overlay, a dialog box with YES / CANCEL buttons,
   * and destroys them all when either button is pressed.
   */
  private _showGiveUpConfirm(onConfirm: () => void): void {
    const { width, height } = this.scene.scale;
    const cx = width  / 2;
    const cy = height / 2;
    const CONFIRM_DEPTH = DEPTH + 50;

    // Darken the whole screen and swallow pointer input.
    const overlay = this.scene.add.rectangle(cx, cy, width, height, 0x000000, 0.6)
      .setDepth(CONFIRM_DEPTH)
      .setInteractive();

    const dialogBg = this.scene.add.rectangle(cx, cy, 280, 160, PAL.bgPanel)
      .setStrokeStyle(2, PAL.borderGiveUp)
      .setDepth(CONFIRM_DEPTH + 1);

    const title = this.scene.add.text(cx, cy - 42, 'Give up this run?', {
      fontSize:   '16px',
      color:      PAL.textNeutral,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5).setDepth(CONFIRM_DEPTH + 2);

    const subtitle = this.scene.add.text(cx, cy - 22, 'You will forfeit all crystal rewards.', {
      fontSize:   '11px',
      color:      PAL.danger,
      fontFamily: PAL.fontBody,
    }).setOrigin(0.5).setDepth(CONFIRM_DEPTH + 2);

    const confirmBtnH = _IS_MOBILE ? 44 : 36;

    // YES — confirm give-up (danger styling)
    const yesBg = this.scene.add.rectangle(cx - 65, cy + 24, 100, confirmBtnH, PAL.bgGiveUp)
      .setStrokeStyle(1, PAL.borderGiveUp)
      .setInteractive({ useHandCursor: true })
      .setDepth(CONFIRM_DEPTH + 2);
    const yesLabel = this.scene.add.text(cx - 65, cy + 24, 'YES', {
      fontSize:   '14px',
      color:      PAL.danger,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5).setDepth(CONFIRM_DEPTH + 3);

    // CANCEL — neutral styling
    const noBg = this.scene.add.rectangle(cx + 65, cy + 24, 100, confirmBtnH, 0x222222)
      .setStrokeStyle(1, PAL.borderNeutral)
      .setInteractive({ useHandCursor: true })
      .setDepth(CONFIRM_DEPTH + 2);
    const noLabel = this.scene.add.text(cx + 65, cy + 24, 'CANCEL', {
      fontSize:   '13px',
      color:      PAL.textNeutral,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5).setDepth(CONFIRM_DEPTH + 3);

    const cleanup = (): void => {
      overlay.destroy();
      dialogBg.destroy();
      title.destroy();
      subtitle.destroy();
      yesBg.destroy();
      yesLabel.destroy();
      noBg.destroy();
      noLabel.destroy();
    };

    yesBg.on('pointerover', () => yesBg.setFillStyle(PAL.bgGiveUpHover));
    yesBg.on('pointerout',  () => yesBg.setFillStyle(PAL.bgGiveUp));
    yesBg.on(TAP_EVENT,   () => { cleanup(); onConfirm(); });

    noBg.on('pointerover', () => noBg.setFillStyle(0x333333));
    noBg.on('pointerout',  () => noBg.setFillStyle(0x222222));
    noBg.on(TAP_EVENT,   () => cleanup());
  }

  // ── rush-wave button ──────────────────────────────────────────────────────

  /**
   * Create the "Rush Next Wave" button in the HUD strip (centred at x=960).
   * Visible only during active waves; clicking triggers rush while the wave
   * is still in progress, awarding bonus gold and immediately starting the
   * next wave once the current one ends.
   * Must be called once during scene create().
   */
  createRushWaveButton(onClick: () => void, rushGold: number): void {
    const btnW = 180;
    const cx   = 960;
    const btnY = HUD_HEIGHT / 2;
    const btnH = _IS_MOBILE ? 44 : 36;

    this.rushWaveBg = this.scene.add.rectangle(cx, btnY, btnW, btnH, 0x1a1200)
      .setStrokeStyle(2, PAL.goldN)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 2)
      .setVisible(false);

    this.rushWaveLabel = this.scene.add.text(cx, btnY, `RUSH +${rushGold}G ▶`, {
      fontSize:   '13px',
      color:      PAL.gold,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3).setVisible(false);

    this.rushWaveBg.on('pointerover', () => {
      if (this.rushWaveBg?.input?.enabled) this.rushWaveBg.setFillStyle(0x2a1e00);
    });
    this.rushWaveBg.on('pointerout', () => {
      if (this.rushWaveBg?.input?.enabled) this.rushWaveBg.setFillStyle(0x1a1200);
    });
    this.rushWaveBg.on(TAP_EVENT, onClick);
  }

  /**
   * Show or hide the rush-wave button.
   * Pass `enabled=false` to keep it visible but greyed out (already rushed).
   */
  setRushWaveVisible(visible: boolean, enabled = true): void {
    if (!this.rushWaveBg || !this.rushWaveLabel) return;
    this.rushWaveBg.setVisible(visible);
    this.rushWaveLabel.setVisible(visible);
    if (visible) {
      if (enabled) {
        this.rushWaveBg.setFillStyle(0x1a1200).setStrokeStyle(2, PAL.goldN);
        this.rushWaveBg.setInteractive({ useHandCursor: true });
        this.rushWaveLabel.setColor(PAL.gold);
      } else {
        this.rushWaveBg.setFillStyle(PAL.bgSpeedBtn).setStrokeStyle(2, PAL.borderNeutral);
        this.rushWaveBg.disableInteractive();
        this.rushWaveLabel.setColor(PAL.textDisabled);
      }
    }
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
  private abilityTooltip?: Phaser.GameObjects.Container;
  private _abilityDef?: AbilityDef;
  private _abilityLongPressTimer?: ReturnType<typeof setTimeout>;
  private _abilityLongPressTriggered = false;

  /**
   * Create a one-shot ability button in the HUD strip (left of gold text).
   * Greys out after activation. Shows tooltip on hover (desktop) or
   * long-press (mobile) with the English translation of the Ojibwe name.
   */
  createAbilityButton(ability: AbilityDef, onActivate: () => void): void {
    const cy = HUD_HEIGHT / 2;
    const btnX = this.scene.scale.width / 2 - 140;
    const btnW = 120;
    this._abilityDef = ability;

    this.abilityBtnBg = this.scene.add.rectangle(btnX, cy, btnW, 30, PAL.bgAbilityBtn)
      .setStrokeStyle(1, PAL.borderAbility)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 2);

    this.abilityBtnLabel = this.scene.add.text(btnX, cy, ability.name, {
      fontSize: '10px',
      color: PAL.textAbility,
      fontFamily: PAL.fontBody,
      fontStyle: 'bold',
      wordWrap: { width: btnW - 8 },
      align: 'center',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3);

    if (_IS_MOBILE) {
      // Mobile: long-press (400ms) shows tooltip; tap activates ability
      this.abilityBtnBg.on('pointerdown', () => {
        this._abilityLongPressTriggered = false;
        this._abilityLongPressTimer = setTimeout(() => {
          this._abilityLongPressTriggered = true;
          this._showAbilityTooltip(btnX, cy);
        }, 400);
      });
      this.abilityBtnBg.on(TAP_EVENT, () => {
        clearTimeout(this._abilityLongPressTimer);
        if (this._abilityLongPressTriggered) {
          this._hideAbilityTooltip();
          this._abilityLongPressTriggered = false;
        } else {
          onActivate();
        }
      });
      this.abilityBtnBg.on('pointerout', () => {
        clearTimeout(this._abilityLongPressTimer);
        this._hideAbilityTooltip();
        this._abilityLongPressTriggered = false;
      });
    } else {
      // Desktop: hover shows tooltip; click activates ability
      this.abilityBtnBg.on('pointerover', () => {
        if (this.abilityBtnBg?.input?.enabled) {
          this.abilityBtnBg.setFillStyle(PAL.bgAbilityBtnHover);
          this._showAbilityTooltip(btnX, cy);
        }
      });
      this.abilityBtnBg.on('pointerout', () => {
        if (this.abilityBtnBg?.input?.enabled) this.abilityBtnBg.setFillStyle(PAL.bgAbilityBtn);
        this._hideAbilityTooltip();
      });
      this.abilityBtnBg.on(TAP_EVENT, () => {
        onActivate();
      });
    }
  }

  // ── ability tooltip ────────────────────────────────────────────────────

  private _showAbilityTooltip(btnX: number, btnY: number): void {
    if (this.abilityTooltip || !this._abilityDef) return;

    const ab = this._abilityDef;
    const tipW = 210;
    const pad = 8;

    const lines: Array<{ text: string; color: string; bold?: boolean; italic?: boolean }> = [
      { text: ab.name, color: PAL.textAbility, bold: true },
      { text: `"${ab.nameEnglish}"`, color: PAL.textMuted, italic: true },
      { text: '', color: '' }, // spacer
      { text: ab.description, color: PAL.textSecondary },
      { text: '', color: '' }, // spacer
      { text: 'Once per run', color: PAL.textDim },
    ];

    this.abilityTooltip = this.scene.add.container(0, 0).setDepth(DEPTH + 20);
    let curY = pad;

    for (const line of lines) {
      if (!line.text) { curY += 6; continue; }
      const t = this.scene.add.text(pad, curY, line.text, {
        fontSize: line.bold ? '12px' : '11px',
        color: line.color,
        fontFamily: PAL.fontBody,
        fontStyle: line.bold ? 'bold' : (line.italic ? 'italic' : 'normal'),
        wordWrap: { width: tipW - pad * 2 },
      });
      this.abilityTooltip.add(t);
      curY += t.height + 2;
    }

    const tipH = curY + pad;

    // Position below the button, clamped to screen edges
    const tipX = Math.max(4, Math.min(btnX - tipW / 2, this.scene.scale.width - tipW - 4));
    const tipY = btnY + 15 + 4; // half button height + gap

    const bg = this.scene.add.rectangle(0, 0, tipW, tipH, PAL.bgPanel, 0.95)
      .setStrokeStyle(1, PAL.borderAbility)
      .setOrigin(0);
    this.abilityTooltip.addAt(bg, 0);
    this.abilityTooltip.setPosition(tipX, tipY);
  }

  private _hideAbilityTooltip(): void {
    this.abilityTooltip?.destroy();
    this.abilityTooltip = undefined;
  }

  /** Grey out the ability button after it's been used. */
  disableAbilityButton(): void {
    clearTimeout(this._abilityLongPressTimer);
    this._hideAbilityTooltip();
    if (this.abilityBtnBg) {
      this.abilityBtnBg.disableInteractive();
      this.abilityBtnBg.setFillStyle(PAL.bgPanelDark);
      this.abilityBtnBg.setStrokeStyle(1, PAL.borderPanel);
    }
    if (this.abilityBtnLabel) {
      this.abilityBtnLabel.setColor(PAL.textDisabled);
    }
  }

  // ── mute button + audio settings gear ─────────────────────────────────────

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
    this.muteBtnBg.on(TAP_EVENT, () => {
      const muted = onToggle();
      this.muteBtnLabel?.setText(muted ? '🔇' : '🔊');
    });
  }

  /**
   * Sync the mute button icon to the current muted state.
   * Call this after restoring audio settings (e.g. from resume prompt).
   */
  syncMuteButton(muted: boolean): void {
    this.muteBtnLabel?.setText(muted ? '🔇' : '🔊');
  }

  /**
   * Create a gear icon (⚙) button in the HUD strip that opens the audio
   * settings panel.  Placed immediately to the right of the mute button.
   * Must be called once during scene create(), after createMuteButton().
   *
   * @param onOpen Called when the player taps the gear button.
   */
  createAudioSettingsButton(onOpen: () => void): void {
    const btnW = _IS_MOBILE ? 44 : 36;
    const btnH = _IS_MOBILE ? 44 : 30;
    // Mute btn cx:  mobile=317, desktop=305.  Place gear immediately to the right.
    // Left edge = muteCx + muteWidth/2 + gap
    const cx   = _IS_MOBILE ? 317 + 22 + 4 : 305 + 18 + 4;
    const cy   = HUD_HEIGHT / 2;

    const bg = this.scene.add.rectangle(cx + btnW / 2, cy, btnW, btnH, PAL.bgSpeedBtn)
      .setStrokeStyle(1, PAL.borderNeutral)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 2);

    this.scene.add.text(cx + btnW / 2, cy, '⚙', {
      fontSize:   '16px',
      fontFamily: PAL.fontBody,
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3);

    bg.on('pointerover', () => bg.setFillStyle(PAL.bgBtnHover));
    bg.on('pointerout',  () => bg.setFillStyle(PAL.bgSpeedBtn));
    bg.on(TAP_EVENT,   onOpen);
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
   * Create a small ascension level badge in the HUD strip.
   * Positioned just left of the wave counter.
   * Only call when ascensionLevel > 0.
   */
  createAscensionBadge(ascensionLevel: number): void {
    const { width } = this.scene.scale;
    const cy = HUD_HEIGHT / 2;
    // Position to the left of the wave text (wave text is right-aligned near width-PADDING).
    const bx = width - PADDING - 110;

    const bg = this.scene.add.rectangle(bx, cy, 36, 22, 0x331111)
      .setStrokeStyle(1, 0xff4444)
      .setDepth(DEPTH + 1);
    this.add(bg);

    this._ascensionBadge = this.scene.add.text(bx, cy, `A${ascensionLevel}`, {
      fontSize:   '13px',
      color:      '#ff6644',
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);
    this.add(this._ascensionBadge);
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

  // ── active offers button + panel ──────────────────────────────────────────

  private _offersBtnBg?: Phaser.GameObjects.Rectangle;
  /** Count badge showing number of active offers. */
  private _offersCountBadge?: Phaser.GameObjects.Text;
  /** Floating panel shown when the button is clicked. */
  private _offersPanel?: Phaser.GameObjects.Container;

  /**
   * Create a small "BUFFS" button in the HUD strip between the gold counter
   * and the rush-wave button.  Clicking it opens a panel listing all currently
   * active offers for this run.
   *
   * `getActiveOffers` is a callback invoked each time the panel opens — so it
   * always reflects the current run state.
   *
   * Must be called once during scene create().
   */
  createOffersButton(getActiveOffers: () => OfferDef[]): void {
    const btnW = _IS_MOBILE ? 84 : 76;
    const btnH = _IS_MOBILE ? 44 : 30;
    // Centred between gold counter (x~640) and the rush-wave button (x=870 left edge).
    const cx   = _IS_MOBILE ? 760 : 775;
    const cy   = HUD_HEIGHT / 2;

    this._offersBtnBg = this.scene.add.rectangle(cx, cy, btnW, btnH, 0x0e1e0e)
      .setStrokeStyle(1, PAL.accentGreenN)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 2);

    this.scene.add.text(cx, cy, '★ BUFFS', {
      fontSize:   '11px',
      color:      PAL.accentGreen,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3);

    // Count badge (top-right corner of button) — updated via updateOffersCount()
    this._offersCountBadge = this.scene.add.text(cx + btnW / 2 - 2, cy - btnH / 2 + 1, '', {
      fontSize:   '9px',
      color:      PAL.gold,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(1, 0).setDepth(DEPTH + 4);

    this._offersBtnBg.on('pointerover', () => this._offersBtnBg?.setFillStyle(0x162a16));
    this._offersBtnBg.on('pointerout',  () => this._offersBtnBg?.setFillStyle(0x0e1e0e));
    this._offersBtnBg.on(TAP_EVENT, () => {
      if (this._offersPanel) {
        this._closeOffersPanel();
      } else {
        this._openOffersPanel(getActiveOffers());
      }
    });
  }

  /** Update the count badge on the OFFERS button to reflect active offer count. */
  updateOffersCount(count: number): void {
    if (!this._offersCountBadge) return;
    this._offersCountBadge.setText(count > 0 ? `${count}` : '');
  }

  private _openOffersPanel(offers: OfferDef[]): void {
    if (this._offersPanel) return;

    const { width } = this.scene.scale;
    const panelW  = Math.min(340, width - 32);
    const cx      = width / 2;
    const panelY  = HUD_HEIGHT + 12;

    // Rarity colour lookup
    const rarityColor = (o: OfferDef): string => {
      if (o.isChallenge)            return PAL.danger;
      if (o.rarity === 'epic')      return PAL.gold;
      if (o.rarity === 'rare')      return PAL.accentBlue;
      return PAL.textNeutral;
    };

    this._offersPanel = this.scene.add.container(0, 0).setDepth(DEPTH + 30);

    const lineH    = 26;
    const padY     = 8;
    const headerH  = 28;
    const panelH   = headerH + padY * 2 + Math.max(1, offers.length) * lineH + 4;

    // Panel background
    const bg = this.scene.add.rectangle(cx, panelY + panelH / 2, panelW, panelH, PAL.bgPanel)
      .setStrokeStyle(1, PAL.accentGreenN)
      .setDepth(DEPTH + 30);
    this._offersPanel.add(bg);

    // Header
    const header = this.scene.add.text(cx, panelY + padY, 'ACTIVE BUFFS', {
      fontSize:   '12px',
      color:      PAL.textPrimary,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5, 0).setDepth(DEPTH + 31);
    this._offersPanel.add(header);

    // Close button (×)
    const closeBg = this.scene.add.rectangle(cx + panelW / 2 - 12, panelY + 12, 20, 20, 0x330000)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 31);
    const closeLabel = this.scene.add.text(cx + panelW / 2 - 12, panelY + 12, '×', {
      fontSize:   '14px',
      color:      PAL.danger,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 32);
    closeBg.on(TAP_EVENT, () => this._closeOffersPanel());
    this._offersPanel.add(closeBg);
    this._offersPanel.add(closeLabel);

    if (offers.length === 0) {
      const empty = this.scene.add.text(cx, panelY + headerH + padY + 4, 'No active buffs yet.', {
        fontSize:   '11px',
        color:      PAL.textMuted,
        fontFamily: PAL.fontBody,
      }).setOrigin(0.5, 0).setDepth(DEPTH + 31);
      this._offersPanel.add(empty);
    } else {
      for (let i = 0; i < offers.length; i++) {
        const o    = offers[i];
        const oy   = panelY + headerH + padY + i * lineH + 4;
        const col  = rarityColor(o);

        const rowBg = this.scene.add.rectangle(cx, oy + lineH / 2 - 1, panelW - 8, lineH - 2,
          i % 2 === 0 ? 0x0a1a0a : PAL.bgPanel)
          .setDepth(DEPTH + 30);
        this._offersPanel.add(rowBg);

        // Rarity indicator dot
        const dot = this.scene.add.text(cx - panelW / 2 + 10, oy + lineH / 2, '●', {
          fontSize:   '8px',
          color:      col,
          fontFamily: PAL.fontBody,
        }).setOrigin(0, 0.5).setDepth(DEPTH + 31);
        this._offersPanel.add(dot);

        // Offer name
        const nameT = this.scene.add.text(cx - panelW / 2 + 22, oy + lineH / 2, o.name, {
          fontSize:   '11px',
          color:      o.isChallenge ? PAL.danger : '#ffffff',
          fontFamily: PAL.fontBody,
          fontStyle:  'bold',
        }).setOrigin(0, 0.5).setDepth(DEPTH + 31);
        this._offersPanel.add(nameT);
      }
    }
  }

  private _closeOffersPanel(): void {
    this._offersPanel?.destroy();
    this._offersPanel = undefined;
  }

  destroy(fromScene?: boolean): void {
    clearTimeout(this._abilityLongPressTimer);
    this._hideAbilityTooltip();
    this._closeOffersPanel();
    super.destroy(fromScene);
  }
}
