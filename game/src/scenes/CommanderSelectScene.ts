import Phaser from 'phaser';
import { ALL_COMMANDERS } from '../data/commanderDefs';
import type { CommanderDef } from '../data/commanderDefs';
import {
  getCommanderAnimDef,
  pickExpression,
  EXPRESSION_MIN_INTERVAL,
  EXPRESSION_MAX_INTERVAL,
} from '../data/commanderAnimDefs';
import type { CommanderAnimDef, CommanderElement } from '../data/commanderAnimDefs';
import { SaveManager } from '../meta/SaveManager';
import { getCommanderUnlockNode } from '../meta/unlockDefs';
import { MobileManager } from '../systems/MobileManager';
import { getStageDef, getRegionDef, SEASON_PALETTE } from '../data/stageDefs';
import { getCommanderIntroCutsceneId, getCutsceneDef } from '../data/cutsceneDefs';

// ── Layout constants ────────────────────────────────────────────────────────

const CARD_W       = 170;
const CARD_H       = 210;
const CARD_GAP     = 14;
const DEPTH_BASE   = 100;

// Sheet (character detail overlay)
const SHEET_W = 500;
const SHEET_H = 420;
const SHEET_DEPTH = 300;

// Role tag colours
const ROLE_COLORS: Record<string, number> = {
  Sustain:    0x44aa44,
  Precision:  0x4488ff,
  Burst:      0xff6644,
  Damage:     0xff4444,
  Economy:    0xffcc22,
  Resilience: 0x88ccff,
};

// ── Ambient particle colours by element ─────────────────────────────────────

const ELEMENT_COLORS: Record<CommanderElement, number> = {
  fire:      0xff6622,
  ice:       0x88ddff,
  lightning: 0xffff44,
  nature:    0x44cc44,
  spirit:    0xccaaff,
};

// ── Per-card animation state ────────────────────────────────────────────────

interface CardAnimState {
  commanderId: string;
  animDef: CommanderAnimDef;
  portrait: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  baseScaleX: number;
  baseScaleY: number;
  /** Next scheduled expression time (ms game clock). */
  nextExpressionAt: number;
  /** True when this commander's card is hovered. */
  hovered: boolean;
  /** Ambient particle graphics objects (recycled pool per card). */
  particles: Phaser.GameObjects.Graphics[];
  /** Frame border graphics for elemental glow. */
  borderGfx: Phaser.GameObjects.Graphics;
  /** Card background rectangle (for highlight sync). */
  cardBg: Phaser.GameObjects.Rectangle;
  /** Card center X (for border drawing). */
  cardCx: number;
  /** Card center Y (for border drawing). */
  cardCy: number;
  /** Game clock time (ms) until which breathing is suppressed (selection flash). */
  flashUntil: number;
}

/**
 * CommanderSelectScene — shown between MainMenu and GameScene.
 *
 * Displays all commanders as cards. Locked ones show name/role only.
 * The player selects a commander, optionally views the character sheet,
 * then confirms to start the run.
 */
export class CommanderSelectScene extends Phaser.Scene {
  private selectedId      = 'nokomis';
  private selectedMapId   = 'map-01';
  /** Stage ID passed from MainMenuScene (preferred over mapId for new flow). */
  private selectedStageId: string | undefined;
  /** Endless mode flag — passed from MainMenuScene, forwarded to GameScene. */
  private isEndless       = false;
  /** Selected ascension level for this run — locked to 0 while picker UI is hidden. */
  private _selectedAscension = 0;
  private cardBgs: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private confirmBtn!:   Phaser.GameObjects.Rectangle;
  private confirmLabel!: Phaser.GameObjects.Text;

  /** True when running on a mobile/touch device. Set once in create(). */
  private _isMobile = false;

  /** Transition guard — prevents double-navigation. */
  private _fading = false;

  /** Per-card animation state for unlocked commanders. */
  private _animStates: CardAnimState[] = [];
  /** Max ambient particles per card (keep light for performance). */
  private static readonly MAX_PARTICLES_PER_CARD = 6;

  /**
   * Returns a CSS font-size string scaled up by 1.35× on mobile.
   */
  private _fs(size: number): string {
    const s = this._isMobile ? Math.round(size * 1.35) : size;
    return `${s}px`;
  }

  // Character sheet overlay elements (created on demand)
  private sheetContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'CommanderSelectScene' });
  }

  init(data?: { mapId?: string; stageId?: string; isEndless?: boolean }): void {
    this.selectedStageId = data?.stageId;
    this.selectedMapId   = data?.mapId    ?? 'map-01';
    this.isEndless       = data?.isEndless ?? false;
  }

  create(): void {
    this._fading = false;
    // Fade in from black for smooth scene transition
    this.cameras.main.fadeIn(350, 0, 0, 0);

    this._isMobile = MobileManager.getInstance().isMobile();

    const { width, height } = this.scale;
    const cx = width / 2;

    // Background — tinted by selected region's seasonal palette
    const stageDef = this.selectedStageId ? getStageDef(this.selectedStageId) : null;
    const regionDef = stageDef ? getRegionDef(stageDef.regionId) : null;
    const palette = regionDef ? SEASON_PALETTE[regionDef.seasonalTheme] : null;
    const bgColor = palette ? palette.bg : 0x0a0a0a;
    this.add.rectangle(cx, height / 2, width, height, bgColor);
    // Subtle dark vignette at top and bottom edges
    const vigGfx = this.add.graphics();
    vigGfx.fillStyle(0x000000, 0.30);
    vigGfx.fillRect(0, 0, width, height * 0.18);
    vigGfx.fillRect(0, height * 0.82, width, height * 0.18);

    // Title
    this.add.text(cx, 36, 'CHOOSE YOUR COMMANDER', {
      fontSize: this._fs(24),
      color: '#00ff44',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_BASE);

    this.add.text(cx, this._isMobile ? 68 : 64, 'Select a commander to accompany your run', {
      fontSize: this._fs(13),
      color: '#556655',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH_BASE);

    // Commander cards — centred row
    const totalW = ALL_COMMANDERS.length * CARD_W + (ALL_COMMANDERS.length - 1) * CARD_GAP;
    const startX = cx - totalW / 2 + CARD_W / 2;
    const cardY = height / 2 - 30;

    for (let i = 0; i < ALL_COMMANDERS.length; i++) {
      const def = ALL_COMMANDERS[i];
      const bx = startX + i * (CARD_W + CARD_GAP);
      this.buildCard(def, bx, cardY);
    }

    // Confirm button
    const btnW  = this._isMobile ? 280 : 260;
    const btnH  = this._isMobile ? 56  : 52;
    const btnY  = height - (this._isMobile ? 64 : 60);
    this.confirmBtn = this.add.rectangle(cx, btnY, btnW, btnH, 0x005500)
      .setStrokeStyle(2, 0x00ff44)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_BASE + 10);

    this.confirmLabel = this.add.text(cx, btnY, 'BEGIN RUN', {
      fontSize: this._fs(20),
      color: '#00ff44',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_BASE + 11);

    this.confirmBtn.on('pointerover', () => {
      this.confirmBtn.setFillStyle(0x007700);
      this.confirmLabel.setColor('#ffffff');
    });
    this.confirmBtn.on('pointerout', () => {
      this.confirmBtn.setFillStyle(0x005500);
      this.confirmLabel.setColor('#00ff44');
    });
    this.confirmBtn.on('pointerup', () => {
      const gameData = {
        commanderId:    this.selectedId,
        stageId:        this.selectedStageId,
        mapId:          this.selectedMapId,
        isEndless:      this.isEndless,
        ascensionLevel: this._selectedAscension,
      };

      // Commander intro cutscene — plays once per commander.
      const cutsceneId = getCommanderIntroCutsceneId(this.selectedId);
      if (cutsceneId && !SaveManager.getInstance().hasSeenCutscene(cutsceneId)) {
        const cutsceneDef = getCutsceneDef(cutsceneId);
        if (cutsceneDef) {
          SaveManager.getInstance().markCutsceneSeen(cutsceneId);
          this.scene.launch('CutsceneScene', {
            cutscene: cutsceneDef,
            onComplete: () => this._go('GameScene', gameData),
          });
          return;
        }
      }

      this._go('GameScene', gameData);
    });

    // Back button — minimum 44px height for mobile tap target
    const backW = this._isMobile ? 130 : 120;
    const backH = this._isMobile ? 44  : 42;
    const backBg = this.add.rectangle(80, btnY, backW, backH, 0x222222)
      .setStrokeStyle(1, 0x444444)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_BASE + 10);

    const backLabel = this.add.text(80, btnY, 'BACK', {
      fontSize: this._fs(16),
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH_BASE + 11);

    backBg.on('pointerover', () => backLabel.setColor('#cccccc'));
    backBg.on('pointerout', () => backLabel.setColor('#888888'));
    backBg.on('pointerup', () => this._go('MainMenuScene'));

    // Ascension picker is hidden pending a design pass (TASK-137).
    // _selectedAscension stays at 0 (standard run).

    // Select default
    this.highlightCard(this.selectedId);

    // Portrait slide-in from sides
    const n = this._animStates.length;
    const screenCx = this.scale.width / 2;
    for (let i = 0; i < n; i++) {
      const state = this._animStates[i];
      // Direction based on card position relative to screen centre;
      // cards left of centre fly in from the left, right from the right.
      const offsetDir = state.baseX < screenCx ? -1 : 1;
      const startX = state.baseX + offsetDir * 280;
      state.portrait.x = startX;
      this.tweens.add({
        targets: state.portrait,
        x: state.baseX,
        duration: 380,
        delay: i * 60,
        ease: 'Back.easeOut',
        onComplete: () => { state.portrait.x = state.baseX; },
      });
    }
  }

  // ── Card builder ──────────────────────────────────────────────────────────

  private buildCard(def: CommanderDef, bx: number, by: number): void {
    const save = SaveManager.getInstance();
    const unlockNode = getCommanderUnlockNode(def.id);
    const isLocked = !def.defaultUnlocked &&
      !(unlockNode ? save.isUnlocked(unlockNode.id) : false);
    const roleColor = ROLE_COLORS[def.role] ?? 0xaaaaaa;

    // Card background
    const bg = this.add.rectangle(bx, by, CARD_W, CARD_H, 0x111111)
      .setStrokeStyle(2, 0x333333)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_BASE);

    this.cardBgs.set(def.id, bg);

    // Role tag
    this.add.text(bx, by - CARD_H / 2 + 16, def.role.toUpperCase(), {
      fontSize: this._fs(11),
      color: '#' + roleColor.toString(16).padStart(6, '0'),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_BASE + 1);

    // Name
    this.add.text(bx, by - CARD_H / 2 + 40, def.name, {
      fontSize: this._fs(16),
      color: isLocked ? '#555555' : '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_BASE + 1);

    // Clan + Totem
    this.add.text(bx, by - CARD_H / 2 + 60, `${def.clan} · ${def.totem}`, {
      fontSize: this._fs(11),
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH_BASE + 1);

    // ── Portrait ─────────────────────────────────────────────────────────────
    // Center the portrait between the clan/totem line and the aura area.
    const portraitKey = `portrait-${def.id}`;
    const portraitCenterY = by - CARD_H / 2 + 112; // ~midpoint of remaining card space
    const hasPortrait = this.textures.exists(portraitKey);

    if (hasPortrait && !isLocked) {
      const portrait = this.add.image(bx, portraitCenterY, portraitKey)
        .setDisplaySize(64, 64)
        .setDepth(DEPTH_BASE + 1);

      // Set up idle animation state for this portrait
      const animDef = getCommanderAnimDef(def.id);
      const borderGfx = this.add.graphics().setDepth(DEPTH_BASE + 2);
      const state: CardAnimState = {
        commanderId: def.id,
        animDef,
        portrait,
        baseX: bx,
        baseY: portraitCenterY,
        baseScaleX: portrait.scaleX,
        baseScaleY: portrait.scaleY,
        nextExpressionAt: this.time.now + EXPRESSION_MIN_INTERVAL
          + Math.random() * (EXPRESSION_MAX_INTERVAL - EXPRESSION_MIN_INTERVAL),
        hovered: false,
        particles: [],
        borderGfx,
        cardBg: bg,
        cardCx: bx,
        cardCy: by,
        flashUntil: 0,
      };
      this._animStates.push(state);

      // Hover detection for animation intensify
      bg.on('pointerover', () => { state.hovered = true; });
      bg.on('pointerout', () => { state.hovered = false; });
    } else if (isLocked && hasPortrait) {
      // Show portrait but darkened for locked commanders.
      this.add.image(bx, portraitCenterY, portraitKey)
        .setDisplaySize(64, 64)
        .setTint(0x333333)
        .setDepth(DEPTH_BASE + 1);
    }

    if (isLocked) {
      if (!hasPortrait) {
        // Locked overlay text when no portrait is available.
        this.add.text(bx, by + 10, '???', {
          fontSize: this._fs(28),
          color: '#333333',
          fontFamily: 'monospace',
          fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(DEPTH_BASE + 2);
      }

      this.add.text(bx, by + 50, 'Unlock in\nMeta Tree', {
        fontSize: this._fs(11),
        color: '#444444',
        fontFamily: 'monospace',
        align: 'center',
      }).setOrigin(0.5).setDepth(DEPTH_BASE + 2);

      const costLabel = unlockNode
        ? `Cost: ${unlockNode.cost} crystals`
        : 'Coming soon';
      this.add.text(bx, by + CARD_H / 2 - 16, costLabel, {
        fontSize: this._fs(11),
        color: '#557799',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(DEPTH_BASE + 2);
    } else {
      // Aura name (below portrait) with English translation
      this.add.text(bx, by + 46, def.aura.name, {
        fontSize: this._fs(11),
        color: '#88cc88',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(DEPTH_BASE + 1);

      this.add.text(bx, by + 58, `"${def.aura.nameEnglish}"`, {
        fontSize: this._fs(11),
        color: '#7a9a70',
        fontFamily: 'monospace',
        fontStyle: 'italic',
      }).setOrigin(0.5).setDepth(DEPTH_BASE + 1);

      // Ability name with English translation
      this.add.text(bx, by + CARD_H / 2 - 34, def.ability.name, {
        fontSize: this._fs(11),
        color: '#aaaacc',
        fontFamily: 'monospace',
        wordWrap: { width: CARD_W - 16 },
        align: 'center',
      }).setOrigin(0.5).setDepth(DEPTH_BASE + 1);

      this.add.text(bx, by + CARD_H / 2 - 22, `"${def.ability.nameEnglish}"`, {
        fontSize: this._fs(11),
        color: '#7a9a70',
        fontFamily: 'monospace',
        fontStyle: 'italic',
      }).setOrigin(0.5).setDepth(DEPTH_BASE + 1);

      // "tap/click for details" hint — minimum 11px on mobile
      const detailsHint = this._isMobile ? 'tap for details' : 'click for details';
      this.add.text(bx, by + CARD_H / 2 - 12, detailsHint, {
        fontSize: this._fs(11),
        color: '#334433',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(DEPTH_BASE + 1);
    }

    // Click handler — first click selects; second click on the same card opens the sheet.
    bg.on('pointerup', () => {
      if (isLocked) {
        if (unlockNode) {
          this.showLockedPopup(unlockNode.cost);
        } else {
          this.showComingSoonPopup();
        }
        return;
      }
      if (this.selectedId === def.id && !this.sheetContainer) {
        this.openCharacterSheet(def);
      } else {
        this.selectedId = def.id;
        this.highlightCard(def.id);
      }
    });
  }

  private highlightCard(selectedId: string): void {
    for (const [id, bg] of this.cardBgs) {
      const isSelected = id === selectedId;
      bg.setStrokeStyle(2, isSelected ? 0x00ff44 : 0x333333);
      bg.setFillStyle(isSelected ? 0x1a2a1a : 0x111111);
    }

    // Selection feedback animations on portraits
    for (const state of this._animStates) {
      const isSelected = state.commanderId === selectedId;
      if (isSelected) {
        // Suppress breathing during the flash so the tween is visible
        state.flashUntil = this.time.now + 500;
        // "Power up" flash then settle into confident pose
        this.tweens.add({
          targets: state.portrait,
          scaleX: state.baseScaleX * 1.05,
          scaleY: state.baseScaleY * 1.05,
          duration: 150,
          ease: 'Quad.easeOut',
          yoyo: true,
          onComplete: () => {
            // Settle at slightly zoomed confident pose
            this.tweens.add({
              targets: state.portrait,
              scaleX: state.baseScaleX * 1.02,
              scaleY: state.baseScaleY * 1.02,
              duration: 200,
              ease: 'Sine.easeOut',
            });
          },
        });
        // Brief white flash tint
        state.portrait.setTint(0xffffff);
        this.time.delayedCall(100, () => {
          if (state.portrait.active) state.portrait.clearTint();
        });
      } else {
        // Unselected: dim slightly (tween for smooth transition)
        this.tweens.add({
          targets: state.portrait,
          alpha: 0.7,
          duration: 200,
        });
      }
    }
    // Restore full alpha on the selected one
    const selState = this._animStates.find(s => s.commanderId === selectedId);
    if (selState) {
      selState.portrait.setAlpha(1.0);
    }
  }

  // ── Character Sheet ─────────────────────────────────────────────────────

  private openCharacterSheet(def: CommanderDef): void {
    if (this.sheetContainer) return;

    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.sheetContainer = this.add.container(0, 0).setDepth(SHEET_DEPTH);

    // Dim overlay
    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.75)
      .setInteractive(); // block clicks
    this.sheetContainer.add(overlay);

    // Sheet background
    const sheet = this.add.rectangle(cx, cy, SHEET_W, SHEET_H, 0x0d1520)
      .setStrokeStyle(2, 0x00ff44, 0.6);
    this.sheetContainer.add(sheet);

    let yOff = cy - SHEET_H / 2 + 24;
    const leftX = cx - SHEET_W / 2 + 24;
    const contentW = SHEET_W - 48;

    // Header: Name + Role
    const roleColor = ROLE_COLORS[def.role] ?? 0xaaaaaa;
    const roleHex = '#' + roleColor.toString(16).padStart(6, '0');
    const nameText = this.add.text(leftX, yOff, `${def.name}  —  ${def.role}`, {
      fontSize: this._fs(20),
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(nameText);

    yOff += 28;

    // Clan + Totem
    const clanText = this.add.text(leftX, yOff, `${def.clan} · Totem: ${def.totem}`, {
      fontSize: this._fs(12),
      color: roleHex,
      fontFamily: 'monospace',
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(clanText);

    yOff += 28;

    // Lore
    const loreText = this.add.text(leftX, yOff, def.lore, {
      fontSize: this._fs(12),
      color: '#aabbcc',
      fontFamily: 'monospace',
      wordWrap: { width: contentW },
      lineSpacing: 4,
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(loreText);

    yOff += loreText.height + 20;

    // Separator
    const sepGfx = this.add.graphics().setDepth(SHEET_DEPTH + 1);
    sepGfx.lineStyle(1, 0x334433, 0.5);
    sepGfx.beginPath();
    sepGfx.moveTo(leftX, yOff);
    sepGfx.lineTo(cx + SHEET_W / 2 - 24, yOff);
    sepGfx.strokePath();
    this.sheetContainer.add(sepGfx);
    yOff += 14;

    // Aura
    const auraTitle = this.add.text(leftX, yOff, `AURA — ${def.aura.name}`, {
      fontSize: this._fs(13),
      color: '#88cc88',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(auraTitle);
    yOff += 18;

    const auraEnglish = this.add.text(leftX, yOff, `"${def.aura.nameEnglish}"`, {
      fontSize: this._fs(11),
      color: '#7a9a70',
      fontFamily: 'monospace',
      fontStyle: 'italic',
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(auraEnglish);
    yOff += 16;

    const auraDesc = this.add.text(leftX, yOff, def.aura.description, {
      fontSize: this._fs(12),
      color: '#cccccc',
      fontFamily: 'monospace',
      wordWrap: { width: contentW },
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(auraDesc);
    yOff += auraDesc.height + 16;

    // Ability
    const abilTitle = this.add.text(leftX, yOff, `ABILITY — ${def.ability.name}`, {
      fontSize: this._fs(13),
      color: '#aaaaff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(abilTitle);
    yOff += 18;

    const abilEnglish = this.add.text(leftX, yOff, `"${def.ability.nameEnglish}"`, {
      fontSize: this._fs(11),
      color: '#7a9a70',
      fontFamily: 'monospace',
      fontStyle: 'italic',
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(abilEnglish);
    yOff += 16;

    const abilDesc = this.add.text(leftX, yOff, def.ability.description, {
      fontSize: this._fs(12),
      color: '#cccccc',
      fontFamily: 'monospace',
      wordWrap: { width: contentW },
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(abilDesc);
    yOff += abilDesc.height + 6;

    const abilCooldown = this.add.text(leftX, yOff, 'Cooldown: once per run', {
      fontSize: this._fs(11),
      color: '#666688',
      fontFamily: 'monospace',
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(abilCooldown);

    // Close button — 44px minimum height on mobile
    const closeH = this._isMobile ? 44 : 36;
    const closeBg = this.add.rectangle(cx, cy + SHEET_H / 2 - 30, 140, closeH, 0x333333)
      .setStrokeStyle(1, 0x00ff44)
      .setInteractive({ useHandCursor: true })
      .setDepth(SHEET_DEPTH + 2);
    const closeLabel = this.add.text(cx, cy + SHEET_H / 2 - 30, 'CLOSE', {
      fontSize: this._fs(14),
      color: '#00ff44',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(SHEET_DEPTH + 3);

    this.sheetContainer.add([closeBg, closeLabel]);

    closeBg.on('pointerover', () => closeBg.setFillStyle(0x444444));
    closeBg.on('pointerout', () => closeBg.setFillStyle(0x333333));
    closeBg.on('pointerup', () => this.closeCharacterSheet());

    // Also close on overlay click
    overlay.on('pointerup', () => this.closeCharacterSheet());
  }

  // ── Locked Commander Popup ──────────────────────────────────────────────

  private showLockedPopup(cost: number): void {
    if (this.sheetContainer) return;

    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.sheetContainer = this.add.container(0, 0).setDepth(SHEET_DEPTH);

    // Dim overlay
    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.6)
      .setInteractive();
    this.sheetContainer.add(overlay);

    // Popup background
    const popupW = 400;
    const popupH = 130;
    const popup = this.add.rectangle(cx, cy, popupW, popupH, 0x0d1520)
      .setStrokeStyle(2, 0x0088cc);
    this.sheetContainer.add(popup);

    // Message text
    const msg = this.add.text(cx, cy - 24,
      `Unlock in the Upgrades menu for ${cost} crystals`, {
        fontSize: this._fs(14),
        color: '#88ccff',
        fontFamily: 'monospace',
        wordWrap: { width: popupW - 40 },
        align: 'center',
      }).setOrigin(0.5).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(msg);

    // "GO TO UPGRADES" confirm button — 44px minimum height on mobile
    const popupBtnH = this._isMobile ? 44 : 36;
    const confirmBg = this.add.rectangle(cx - 80, cy + 30, 180, popupBtnH, 0x003355)
      .setStrokeStyle(1, 0x0088cc)
      .setInteractive({ useHandCursor: true })
      .setDepth(SHEET_DEPTH + 2);
    const confirmLabel = this.add.text(cx - 80, cy + 30, 'GO TO UPGRADES', {
      fontSize: this._fs(13),
      color: '#88ccff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(SHEET_DEPTH + 3);
    this.sheetContainer.add([confirmBg, confirmLabel]);

    confirmBg.on('pointerover', () => confirmBg.setFillStyle(0x004466));
    confirmBg.on('pointerout', () => confirmBg.setFillStyle(0x003355));
    confirmBg.on('pointerup', () => {
      this._go('MetaMenuScene');
    });

    // Cancel button
    const cancelBg = this.add.rectangle(cx + 90, cy + 30, 110, popupBtnH, 0x222222)
      .setStrokeStyle(1, 0x444444)
      .setInteractive({ useHandCursor: true })
      .setDepth(SHEET_DEPTH + 2);
    const cancelLabel = this.add.text(cx + 90, cy + 30, 'CANCEL', {
      fontSize: this._fs(13),
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(SHEET_DEPTH + 3);
    this.sheetContainer.add([cancelBg, cancelLabel]);

    cancelBg.on('pointerover', () => cancelLabel.setColor('#cccccc'));
    cancelBg.on('pointerout', () => cancelLabel.setColor('#888888'));
    cancelBg.on('pointerup', () => this.closeCharacterSheet());

    // Close on overlay click
    overlay.on('pointerup', () => this.closeCharacterSheet());
  }

  private showComingSoonPopup(): void {
    if (this.sheetContainer) return;

    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.sheetContainer = this.add.container(0, 0).setDepth(SHEET_DEPTH);

    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.6)
      .setInteractive();
    this.sheetContainer.add(overlay);

    const popupW = 300;
    const popupH = 100;
    const popup = this.add.rectangle(cx, cy, popupW, popupH, 0x0d1520)
      .setStrokeStyle(2, 0x444444);
    this.sheetContainer.add(popup);

    const msg = this.add.text(cx, cy - 12, 'Coming soon', {
      fontSize: this._fs(16),
      color: '#888888',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(msg);

    // Dismiss button — 44px minimum height on mobile
    const dismissH = this._isMobile ? 44 : 30;
    const dismissBg = this.add.rectangle(cx, cy + 28, 100, dismissH, 0x222222)
      .setStrokeStyle(1, 0x444444)
      .setInteractive({ useHandCursor: true })
      .setDepth(SHEET_DEPTH + 2);
    const dismissLabel = this.add.text(cx, cy + 28, 'OK', {
      fontSize: this._fs(13),
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(SHEET_DEPTH + 3);
    this.sheetContainer.add([dismissBg, dismissLabel]);

    dismissBg.on('pointerup', () => this.closeCharacterSheet());
    overlay.on('pointerup', () => this.closeCharacterSheet());
  }

  private closeCharacterSheet(): void {
    if (this.sheetContainer) {
      this.sheetContainer.destroy(true);
      this.sheetContainer = null;
    }
  }

  // ── Frame update — drives all idle animations ─────────────────────────────

  update(time: number, delta: number): void {
    for (const state of this._animStates) {
      if (!state.portrait.active) continue;
      this._stepBreathing(state, time);
      this._stepExpressions(state, time);
      this._stepAmbientParticles(state, time, delta);
      this._stepBorderGlow(state, time);
    }
  }

  // ── Breathing animation ───────────────────────────────────────────────────

  private _stepBreathing(state: CardAnimState, time: number): void {
    // Skip breathing while the selection flash tween is playing
    if (time < state.flashUntil) return;

    const { animDef, portrait, baseScaleX, baseScaleY } = state;
    const isSelected = state.commanderId === this.selectedId;

    // Hovered: speed up breathing by 1.5×; unselected: slow by 0.7×
    let rateMultiplier = 1.0;
    if (state.hovered) rateMultiplier = 0.67;         // faster cycle
    else if (!isSelected) rateMultiplier = 1.4;       // slower cycle

    const period = animDef.breathRateMs * rateMultiplier;
    const phase = ((time % period) / period) * Math.PI * 2;
    const sin = Math.sin(phase);

    // Hover intensifies amplitude by 1.5×
    const ampMult = state.hovered ? 1.5 : 1.0;
    const scaleXOff = -animDef.breathAmpX * sin * ampMult;   // inverse: contracts on inhale
    const scaleYOff = animDef.breathAmpY * sin * ampMult;

    // Selected commanders get the confident 1.02× base; unselected get dimmed 1.0×
    const selectedScale = isSelected ? 1.02 : 1.0;
    portrait.setScale(
      baseScaleX * selectedScale + scaleXOff,
      baseScaleY * selectedScale + scaleYOff,
    );
  }

  // ── Expression micro-animations ───────────────────────────────────────────

  private _stepExpressions(state: CardAnimState, time: number): void {
    if (time < state.nextExpressionAt) return;

    // Schedule next expression
    state.nextExpressionAt = time + EXPRESSION_MIN_INTERVAL
      + Math.random() * (EXPRESSION_MAX_INTERVAL - EXPRESSION_MIN_INTERVAL);

    const expr = pickExpression(state.animDef.expressionPool);
    const { portrait } = state;

    // Kill any in-flight expression tweens and snap back to base position
    // to prevent cumulative drift from stacking yoyo tweens.
    this.tweens.killTweensOf(portrait);
    portrait.x = state.baseX;
    portrait.y = state.baseY;

    switch (expr) {
      case 'blink':
        // Quick scaleY squish (100ms)
        this.tweens.add({
          targets: portrait,
          scaleY: portrait.scaleY * 0.95,
          duration: 50,
          yoyo: true,
          ease: 'Sine.easeInOut',
        });
        break;

      case 'smirk':
        // Slight horizontal shift of portrait (1-2px, 200ms)
        this.tweens.add({
          targets: portrait,
          x: state.baseX + 1.5,
          duration: 100,
          yoyo: true,
          ease: 'Sine.easeInOut',
        });
        break;

      case 'brow-furrow':
        // Slight downward shift of portrait (1px, 300ms)
        this.tweens.add({
          targets: portrait,
          y: state.baseY + 1,
          duration: 150,
          yoyo: true,
          ease: 'Sine.easeInOut',
        });
        break;

      case 'glance':
        // Subtle horizontal shift (±2px, 400ms ease)
        this.tweens.add({
          targets: portrait,
          x: state.baseX + (Math.random() > 0.5 ? 2 : -2),
          duration: 200,
          yoyo: true,
          ease: 'Quad.easeInOut',
        });
        break;
    }
  }

  // ── Ambient elemental particles ───────────────────────────────────────────

  private _stepAmbientParticles(state: CardAnimState, _time: number, delta: number): void {
    const { animDef } = state;
    const color = ELEMENT_COLORS[animDef.element];
    const isSelected = state.commanderId === this.selectedId;

    // Spawn rate: one particle every ~800ms (faster when hovered/selected)
    const spawnInterval = state.hovered ? 400 : (isSelected ? 600 : 800);
    const shouldSpawn = state.particles.length < CommanderSelectScene.MAX_PARTICLES_PER_CARD
      && Math.random() < (delta / spawnInterval);

    if (shouldSpawn) {
      this._spawnAmbientParticle(state, color);
    }

    // Update existing particles (simple upward drift + fade)
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      if (!p.active) {
        state.particles.splice(i, 1);
        continue;
      }
      p.y -= delta * 0.02;   // drift up
      p.alpha -= delta * 0.001;
      if (p.alpha <= 0) {
        p.destroy();
        state.particles.splice(i, 1);
      }
    }
  }

  private _spawnAmbientParticle(state: CardAnimState, color: number): void {
    const { cardCx, cardCy, animDef } = state;
    const halfW = CARD_W / 2;
    const halfH = CARD_H / 2;

    // Position varies by element
    let px: number;
    let py: number;
    const radius = 1.5 + Math.random() * 1.5;

    switch (animDef.element) {
      case 'fire':
        // Embers from bottom
        px = cardCx + (Math.random() - 0.5) * CARD_W * 0.6;
        py = cardCy + halfH - 4;
        break;
      case 'ice':
        // Frost sparkle at edges
        px = cardCx + (Math.random() > 0.5 ? halfW - 4 : -halfW + 4);
        py = cardCy + (Math.random() - 0.5) * CARD_H * 0.6;
        break;
      case 'lightning':
        // Arc flicker on frame border (random edge)
        px = cardCx + (Math.random() - 0.5) * CARD_W * 0.9;
        py = cardCy + (Math.random() > 0.5 ? halfH - 2 : -halfH + 2);
        break;
      case 'nature':
        // Leaf drift from top
        px = cardCx + (Math.random() - 0.5) * CARD_W * 0.6;
        py = cardCy - halfH + 4;
        break;
      case 'spirit':
      default:
        // Soft glow pulse near portrait
        px = cardCx + (Math.random() - 0.5) * 40;
        py = cardCy - 30 + (Math.random() - 0.5) * 40;
        break;
    }

    const gfx = this.add.graphics().setDepth(DEPTH_BASE + 3);
    gfx.fillStyle(color, 0.6);
    gfx.fillCircle(0, 0, radius);
    gfx.setPosition(px, py);
    gfx.setAlpha(0.6 + Math.random() * 0.3);
    state.particles.push(gfx);
  }

  // ── Elemental border glow ─────────────────────────────────────────────────

  private _stepBorderGlow(state: CardAnimState, time: number): void {
    const { animDef, borderGfx, cardCx, cardCy } = state;
    const isSelected = state.commanderId === this.selectedId;

    borderGfx.clear();

    // Only draw elemental glow for selected or hovered
    if (!isSelected && !state.hovered) return;

    const color = ELEMENT_COLORS[animDef.element];
    // Gentle pulse alpha
    const pulse = 0.15 + Math.sin(time * 0.003) * 0.1;
    const alpha = state.hovered ? pulse + 0.1 : pulse;
    const lineW = state.hovered ? 2 : 1;

    borderGfx.lineStyle(lineW, color, alpha);
    borderGfx.strokeRect(
      cardCx - CARD_W / 2 - 1,
      cardCy - CARD_H / 2 - 1,
      CARD_W + 2,
      CARD_H + 2,
    );
  }

  // ── Fade transition ───────────────────────────────────────────────────────

  private _go(key: string, data?: object): void {
    if (this._fading) return;
    this._fading = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(key, data);
    });
  }

  // ── Lifecycle cleanup ─────────────────────────────────────────────────────

  shutdown(): void {
    // Destroy all ambient particle graphics
    for (const state of this._animStates) {
      for (const p of state.particles) {
        if (p.active) p.destroy();
      }
      state.particles.length = 0;
      if (state.borderGfx.active) state.borderGfx.destroy();
    }
    this._animStates.length = 0;
  }
}
