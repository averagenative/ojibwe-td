import Phaser from 'phaser';

const HUD_HEIGHT = 48;
const PADDING    = 16;
const DEPTH      = 100;

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

  constructor(scene: Phaser.Scene, lives: number, gold: number) {
    super(scene, 0, 0);

    const { width } = scene.scale;

    const bg = new Phaser.GameObjects.Rectangle(
      scene, width / 2, HUD_HEIGHT / 2, width, HUD_HEIGHT, 0x000000, 0.8,
    );
    bg.setStrokeStyle(1, 0x224422);

    this.livesText = scene.add.text(PADDING, HUD_HEIGHT / 2, `♥  ${lives}`, {
      fontSize: '20px',
      color: '#ff4444',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(DEPTH + 1);

    this.goldText = scene.add.text(width / 2, HUD_HEIGHT / 2, `⬡  ${gold}`, {
      fontSize: '20px',
      color: '#ffcc00',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 1);

    this.waveText = scene.add.text(width - PADDING, HUD_HEIGHT / 2, 'Wave 0 / 20', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(1, 0.5).setDepth(DEPTH + 1);

    this.add([bg, this.livesText, this.goldText, this.waveText]);
    this.setDepth(DEPTH);
    scene.add.existing(this);
  }

  setLives(lives: number): void {
    this.livesText.setText(`♥  ${lives}`);
    if (lives <= 5)       this.livesText.setColor('#ff0000');
    else if (lives <= 10) this.livesText.setColor('#ff6600');
  }

  setGold(gold: number): void {
    this.goldText.setText(`⬡  ${gold}`);
  }

  /** Update the wave counter.  Boss waves display a ★ icon and orange colour. */
  setWave(current: number, total: number): void {
    const boss  = isBossWaveNumber(current);
    const label = boss
      ? `★ Wave ${current} / ${total}`
      : `Wave ${current} / ${total}`;
    this.waveText.setText(label);
    this.waveText.setColor(boss ? '#ff8844' : '#aaaaaa');
  }

  // ── speed controls ────────────────────────────────────────────────────────

  /**
   * Create pause / 1× / 2× speed buttons.
   * Must be called once during scene create().
   * onSpeedChange receives the new multiplier (0 = paused, 1, or 2).
   */
  createSpeedControls(onSpeedChange: SpeedCallback): void {
    const btnW   = 38;
    const btnH   = 30;
    const gap    = 4;
    const startX = 155; // left edge of first button
    const cy     = HUD_HEIGHT / 2;

    const defs: Array<{ mult: number; label: string }> = [
      { mult: 0, label: '⏸' },
      { mult: 1, label: '1×' },
      { mult: 2, label: '2×' },
    ];

    for (let i = 0; i < defs.length; i++) {
      const { mult, label } = defs[i];
      const cx = startX + i * (btnW + gap) + btnW / 2;
      const isActive = mult === 1; // 1× is default

      const bgColor   = isActive ? 0x005500 : 0x222222;
      const textColor = isActive ? '#00ff44' : '#888888';

      const btnBg = this.scene.add.rectangle(cx, cy, btnW, btnH, bgColor)
        .setStrokeStyle(1, isActive ? 0x00ff44 : 0x444444)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 2);

      const btnLabel = this.scene.add.text(cx, cy, label, {
        fontSize: '14px',
        color: textColor,
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3);

      btnBg.on('pointerover', () => {
        if (this.activeSpeed !== mult) btnBg.setFillStyle(0x333333);
      });
      btnBg.on('pointerout', () => {
        if (this.activeSpeed !== mult) btnBg.setFillStyle(0x222222);
      });
      btnBg.on('pointerup', () => {
        this.setActiveSpeed(mult);
        onSpeedChange(mult);
      });

      this.speedBtns.push({ bg: btnBg, label: btnLabel });
    }
  }

  private setActiveSpeed(mult: number): void {
    this.activeSpeed = mult;
    const palette: Array<{ bg: number; stroke: number; text: string }> = [
      { bg: 0x222222, stroke: 0x444444, text: '#888888' },
      { bg: 0x005500, stroke: 0x00ff44, text: '#00ff44' },
      { bg: 0x004488, stroke: 0x0088ff, text: '#44aaff' },
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

    this.nextWaveBg = this.scene.add.rectangle(btnX, btnY, btnW, 36, 0x004400)
      .setStrokeStyle(2, 0x00ff44)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 2)
      .setVisible(false);

    this.nextWaveLabel = this.scene.add.text(btnX, btnY, '', {
      fontSize: '14px',
      color: '#00ff44',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3).setVisible(false);

    this.nextWaveBg.on('pointerover', () => this.nextWaveBg?.setFillStyle(0x006600));
    this.nextWaveBg.on('pointerout',  () => this.nextWaveBg?.setFillStyle(0x004400));
    this.nextWaveBg.on('pointerup', onClick);
  }

  /**
   * Show/hide the next-wave button.
   * waveNumber is the wave about to start.
   * Boss waves (multiple of 5) display a ★ icon and warm orange colour.
   */
  setNextWaveVisible(visible: boolean, waveNumber: number): void {
    if (!this.nextWaveBg || !this.nextWaveLabel) return;
    this.nextWaveBg.setVisible(visible);
    this.nextWaveLabel.setVisible(visible);

    if (visible) {
      const boss = isBossWaveNumber(waveNumber);
      let label: string;
      if (waveNumber === 1) {
        label = 'START WAVE 1 ▶';
      } else if (boss) {
        label = `★ BOSS WAVE ${waveNumber} ★`;
      } else {
        label = `WAVE ${waveNumber} ▶`;
      }
      this.nextWaveLabel.setText(label);

      const textCol  = boss ? '#ff8844' : '#00ff44';
      const strokeN  = boss ? 0xff8844  : 0x00ff44;
      this.nextWaveLabel.setColor(textCol);
      this.nextWaveBg.setStrokeStyle(2, strokeN);

      this.waveText.setVisible(false);
    } else {
      this.waveText.setVisible(true);
    }
  }

  // ── commander display ───────────────────────────────────────────────────

  /**
   * Show the active commander's name and aura name beside the lives text.
   * Called once during GameScene create() if a commander is active.
   */
  createCommanderDisplay(commanderName: string, auraName: string): void {
    const cy = HUD_HEIGHT / 2;
    // Position after lives text (approx x=100)
    this.scene.add.text(100, cy, `${commanderName} · ${auraName}`, {
      fontSize: '11px',
      color: '#88cc88',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5).setDepth(DEPTH + 1);
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

    this.abilityBtnBg = this.scene.add.rectangle(btnX, cy, btnW, 30, 0x222244)
      .setStrokeStyle(1, 0x6666cc)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH + 2);

    this.abilityBtnLabel = this.scene.add.text(btnX, cy, abilityName, {
      fontSize: '10px',
      color: '#aaaaff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      wordWrap: { width: btnW - 8 },
      align: 'center',
    }).setOrigin(0.5, 0.5).setDepth(DEPTH + 3);

    this.abilityBtnBg.on('pointerover', () => {
      if (this.abilityBtnBg?.input?.enabled) this.abilityBtnBg.setFillStyle(0x333366);
    });
    this.abilityBtnBg.on('pointerout', () => {
      if (this.abilityBtnBg?.input?.enabled) this.abilityBtnBg.setFillStyle(0x222244);
    });
    this.abilityBtnBg.on('pointerup', () => {
      onActivate();
    });
  }

  /** Grey out the ability button after it's been used. */
  disableAbilityButton(): void {
    if (this.abilityBtnBg) {
      this.abilityBtnBg.disableInteractive();
      this.abilityBtnBg.setFillStyle(0x111111);
      this.abilityBtnBg.setStrokeStyle(1, 0x333333);
    }
    if (this.abilityBtnLabel) {
      this.abilityBtnLabel.setColor('#444444');
    }
  }

  // ── boss warning ──────────────────────────────────────────────────────────

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
        color:           '#ff4422',
        fontFamily:      'monospace',
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
