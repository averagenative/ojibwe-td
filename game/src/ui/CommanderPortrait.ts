import Phaser from 'phaser';
import { MobileManager } from '../systems/MobileManager';
import { PAL, roleBorderColour } from './palette';
import type { CommanderDef, CommanderRunState } from '../data/commanderDefs';

const _IS_MOBILE = MobileManager.getInstance().isMobile();

/** Portrait size — 48px desktop, 56px mobile for larger touch target. */
const SIZE = _IS_MOBILE ? 56 : 48;
const HALF = SIZE / 2;
const BORDER_WIDTH = 3;
const DEPTH = 105; // above HUD bg (100) and HUD text (101–104)

export interface CommanderPortraitConfig {
  scene: Phaser.Scene;
  commanderDef: CommanderDef;
  commanderState: CommanderRunState;
  onActivateAbility: () => void;
  /** X position (centre). */
  x: number;
  /** Y position (centre). */
  y: number;
}

/**
 * Commander portrait widget shown in the top-left of the game HUD.
 *
 * Displays:
 * - Portrait image with a coloured border matching the commander's role
 * - Radial cooldown overlay (greyed out after ability use)
 * - "READY" pulse glow when ability is available
 * - Tooltip on hover/tap showing commander name, passive summary, ability info
 * - Visual reactions: boss wave shake, victory bounce, game-over dim
 */
export class CommanderPortrait extends Phaser.GameObjects.Container {
  private borderGfx: Phaser.GameObjects.Graphics;
  private portrait: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
  private cooldownGfx: Phaser.GameObjects.Graphics;
  private glowTween?: Phaser.Tweens.Tween;
  private tooltip?: Phaser.GameObjects.Container;

  private borderColour: number;
  private abilityUsed = false;
  private readonly commanderDef: CommanderDef;
  private readonly commanderState: CommanderRunState;
  private readonly onActivateAbility: () => void;

  /** Mobile long-press timer handle. */
  private _longPressTimer?: ReturnType<typeof setTimeout>;
  /** True when the tooltip was shown via long-press (prevents tap-activate). */
  private _longPressTriggered = false;

  constructor(config: CommanderPortraitConfig) {
    super(config.scene, config.x, config.y);

    this.commanderDef = config.commanderDef;
    this.commanderState = config.commanderState;
    this.onActivateAbility = config.onActivateAbility;
    this.borderColour = roleBorderColour(config.commanderDef.role);

    // ── Border ring ──────────────────────────────────────────────────────────
    this.borderGfx = config.scene.add.graphics();
    this.borderGfx.lineStyle(BORDER_WIDTH, this.borderColour, 1);
    this.borderGfx.strokeRoundedRect(
      -HALF - BORDER_WIDTH, -HALF - BORDER_WIDTH,
      SIZE + BORDER_WIDTH * 2, SIZE + BORDER_WIDTH * 2,
      6,
    );
    this.add(this.borderGfx);

    // ── Background fill ──────────────────────────────────────────────────────
    const bgRect = config.scene.add.rectangle(0, 0, SIZE, SIZE, PAL.bgPanelDark)
      .setOrigin(0.5);
    this.add(bgRect);

    // ── Portrait image (or fallback text) ────────────────────────────────────
    const portraitKey = `portrait-${config.commanderDef.id}`;
    if (config.scene.textures.exists(portraitKey)) {
      this.portrait = config.scene.add.image(0, 0, portraitKey)
        .setDisplaySize(SIZE - 4, SIZE - 4)
        .setOrigin(0.5);
    } else {
      // Fallback: show first letter of commander name
      this.portrait = config.scene.add.text(0, 0, config.commanderDef.name[0] ?? '?', {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: PAL.fontBody,
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }
    this.add(this.portrait);

    // ── Cooldown overlay (drawn when ability has been used) ───────────────────
    this.cooldownGfx = config.scene.add.graphics();
    this.add(this.cooldownGfx);

    // ── Interactive hit area ─────────────────────────────────────────────────
    const hitZone = config.scene.add.rectangle(0, 0, SIZE + BORDER_WIDTH * 2, SIZE + BORDER_WIDTH * 2, 0x000000, 0)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.add(hitZone);

    if (_IS_MOBILE) {
      // Mobile: long-press (400ms) shows tooltip; tap activates ability
      hitZone.on('pointerdown', () => {
        this._longPressTriggered = false;
        this._longPressTimer = setTimeout(() => {
          this._longPressTriggered = true;
          this.showTooltip();
        }, 400);
      });
      hitZone.on('pointerup', () => {
        clearTimeout(this._longPressTimer);
        if (this._longPressTriggered) {
          // Long-press just showed tooltip — hide it, don't activate
          this.hideTooltip();
          this._longPressTriggered = false;
        } else if (!this.abilityUsed && !this.commanderState.abilityUsed) {
          this.onActivateAbility();
        }
      });
      hitZone.on('pointerout', () => {
        clearTimeout(this._longPressTimer);
        this.hideTooltip();
        this._longPressTriggered = false;
      });
    } else {
      // Desktop: hover shows tooltip; click activates ability
      hitZone.on('pointerup', () => {
        if (!this.abilityUsed && !this.commanderState.abilityUsed) {
          this.onActivateAbility();
        }
      });
      hitZone.on('pointerover', () => this.showTooltip());
      hitZone.on('pointerout', () => this.hideTooltip());
    }

    // ── Idle border glow pulse ───────────────────────────────────────────────
    this.startReadyGlow();

    this.setDepth(DEPTH);
    config.scene.add.existing(this);
  }

  // ── Ability state ──────────────────────────────────────────────────────────

  /** Called by GameScene after ability activation to show the "used" state. */
  markAbilityUsed(): void {
    this.abilityUsed = true;
    this.stopReadyGlow();
    this.drawCooldownOverlay();
  }

  // ── Ready glow ─────────────────────────────────────────────────────────────

  private startReadyGlow(): void {
    if (this.abilityUsed) return;
    this.glowTween = this.scene.tweens.add({
      targets: this.borderGfx,
      alpha: { from: 1, to: 0.4 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopReadyGlow(): void {
    this.glowTween?.destroy();
    this.glowTween = undefined;
    this.borderGfx.setAlpha(1);
  }

  // ── Cooldown overlay ───────────────────────────────────────────────────────

  private drawCooldownOverlay(): void {
    this.cooldownGfx.clear();
    this.cooldownGfx.fillStyle(0x000000, 0.55);
    this.cooldownGfx.fillRoundedRect(-HALF, -HALF, SIZE, SIZE, 4);

    // Redraw border in muted colour
    this.borderGfx.clear();
    this.borderGfx.lineStyle(BORDER_WIDTH, PAL.borderNeutral, 0.6);
    this.borderGfx.strokeRoundedRect(
      -HALF - BORDER_WIDTH, -HALF - BORDER_WIDTH,
      SIZE + BORDER_WIDTH * 2, SIZE + BORDER_WIDTH * 2,
      6,
    );
  }

  // ── Tooltip ────────────────────────────────────────────────────────────────

  private showTooltip(): void {
    if (this.tooltip) return;

    const def = this.commanderDef;
    const tipW = 210;
    const pad = 8;

    // Build tooltip lines
    const lines: Array<{ text: string; color: string; bold?: boolean; italic?: boolean }> = [
      { text: def.name, color: PAL.textPrimary, bold: true },
      { text: `${def.role} · ${def.clan}`, color: PAL.textMuted },
      { text: '', color: '' }, // spacer
      { text: `Aura: ${def.aura.name}`, color: PAL.accentGreen, bold: true },
      { text: `"${def.aura.nameEnglish}"`, color: PAL.textMuted, italic: true },
      { text: def.aura.description, color: PAL.textSecondary },
    ];

    // Add ability info
    if (def.ability) {
      lines.push({ text: '', color: '' }); // spacer
      const usedLabel = this.abilityUsed ? ' (USED)' : ' (READY)';
      lines.push({ text: `${def.ability.name}${usedLabel}`, color: PAL.textAbility, bold: true });
      lines.push({ text: `"${def.ability.nameEnglish}"`, color: PAL.textMuted, italic: true });
      lines.push({ text: def.ability.description, color: PAL.textSecondary });
    }

    // Calculate height based on wrapped text
    const textObjects: Phaser.GameObjects.Text[] = [];
    let curY = pad;

    this.tooltip = this.scene.add.container(0, 0).setDepth(DEPTH + 10);

    for (const line of lines) {
      if (!line.text) {
        curY += 6; // spacer
        continue;
      }
      const t = this.scene.add.text(pad, curY, line.text, {
        fontSize: line.bold ? '12px' : '11px',
        color: line.color,
        fontFamily: PAL.fontBody,
        fontStyle: line.bold ? 'bold' : (line.italic ? 'italic' : 'normal'),
        wordWrap: { width: tipW - pad * 2 },
      });
      textObjects.push(t);
      this.tooltip.add(t);
      curY += t.height + 2;
    }

    const tipH = curY + pad;

    // Position tooltip below the portrait, clamped to screen
    const worldX = this.x;
    const worldY = this.y + HALF + BORDER_WIDTH + 4;
    const tipX = Math.max(4, Math.min(worldX - tipW / 2, this.scene.scale.width - tipW - 4));
    const tipY = worldY;

    // Background
    const bg = this.scene.add.rectangle(0, 0, tipW, tipH, PAL.bgPanel, 0.95)
      .setStrokeStyle(1, this.borderColour)
      .setOrigin(0);
    this.tooltip.addAt(bg, 0);

    this.tooltip.setPosition(tipX, tipY);
  }

  private hideTooltip(): void {
    this.tooltip?.destroy();
    this.tooltip = undefined;
  }

  // ── Visual reactions ───────────────────────────────────────────────────────

  /** Boss wave: brief shake to acknowledge the threat. */
  reactBossWave(): void {
    this.scene.tweens.add({
      targets: this,
      x: this.x + 4,
      duration: 50,
      yoyo: true,
      repeat: 5,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // Ensure position resets exactly
        this.x = Math.round(this.x);
      },
    });
  }

  /** Victory: brief celebratory scale bounce. */
  reactVictory(): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 200,
      yoyo: true,
      repeat: 2,
      ease: 'Back.easeOut',
    });
  }

  /** Game over: dim the portrait. */
  reactGameOver(): void {
    this.stopReadyGlow();
    this.scene.tweens.add({
      targets: this,
      alpha: 0.35,
      duration: 600,
      ease: 'Power2',
    });
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  destroy(fromScene?: boolean): void {
    this.glowTween?.destroy();
    clearTimeout(this._longPressTimer);
    this.hideTooltip();
    super.destroy(fromScene);
  }
}
