import Phaser from 'phaser';
import { ALL_COMMANDERS } from '../data/commanderDefs';
import type { CommanderDef } from '../data/commanderDefs';
import { SaveManager } from '../meta/SaveManager';
import { getCommanderUnlockNode } from '../meta/unlockDefs';

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
  private cardBgs: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private confirmBtn!:   Phaser.GameObjects.Rectangle;
  private confirmLabel!: Phaser.GameObjects.Text;

  // Character sheet overlay elements (created on demand)
  private sheetContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'CommanderSelectScene' });
  }

  init(data?: { mapId?: string; stageId?: string }): void {
    this.selectedStageId = data?.stageId;
    this.selectedMapId   = data?.mapId ?? 'map-01';
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Background
    this.add.rectangle(cx, height / 2, width, height, 0x0a0a0a);

    // Title
    this.add.text(cx, 36, 'CHOOSE YOUR COMMANDER', {
      fontSize: '24px',
      color: '#00ff44',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_BASE);

    this.add.text(cx, 64, 'Select a commander to accompany your run', {
      fontSize: '13px',
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
    const btnY = height - 60;
    this.confirmBtn = this.add.rectangle(cx, btnY, 260, 52, 0x005500)
      .setStrokeStyle(2, 0x00ff44)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_BASE + 10);

    this.confirmLabel = this.add.text(cx, btnY, 'BEGIN RUN', {
      fontSize: '20px',
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
      this.scene.start('GameScene', {
        commanderId: this.selectedId,
        stageId:     this.selectedStageId,
        mapId:       this.selectedMapId,
      });
    });

    // Back button
    const backBg = this.add.rectangle(80, btnY, 120, 42, 0x222222)
      .setStrokeStyle(1, 0x444444)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_BASE + 10);

    const backLabel = this.add.text(80, btnY, 'BACK', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH_BASE + 11);

    backBg.on('pointerover', () => backLabel.setColor('#cccccc'));
    backBg.on('pointerout', () => backLabel.setColor('#888888'));
    backBg.on('pointerup', () => this.scene.start('MainMenuScene'));

    // Select default
    this.highlightCard(this.selectedId);
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
      fontSize: '10px',
      color: '#' + roleColor.toString(16).padStart(6, '0'),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_BASE + 1);

    // Name
    this.add.text(bx, by - CARD_H / 2 + 40, def.name, {
      fontSize: '16px',
      color: isLocked ? '#555555' : '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_BASE + 1);

    // Clan + Totem
    this.add.text(bx, by - CARD_H / 2 + 60, `${def.clan} · ${def.totem}`, {
      fontSize: '10px',
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH_BASE + 1);

    if (isLocked) {
      // Locked overlay
      this.add.text(bx, by + 10, '???', {
        fontSize: '28px',
        color: '#333333',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(DEPTH_BASE + 2);

      this.add.text(bx, by + 50, 'Unlock in\nMeta Tree', {
        fontSize: '11px',
        color: '#444444',
        fontFamily: 'monospace',
        align: 'center',
      }).setOrigin(0.5).setDepth(DEPTH_BASE + 2);

      const costLabel = unlockNode
        ? `Cost: ${unlockNode.cost} crystals`
        : 'Coming soon';
      this.add.text(bx, by + CARD_H / 2 - 16, costLabel, {
        fontSize: '10px',
        color: '#557799',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(DEPTH_BASE + 2);
    } else {
      // Aura summary
      this.add.text(bx, by - 10, def.aura.name, {
        fontSize: '11px',
        color: '#88cc88',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(DEPTH_BASE + 1);

      this.add.text(bx, by + 15, def.aura.description, {
        fontSize: '10px',
        color: '#999999',
        fontFamily: 'monospace',
        wordWrap: { width: CARD_W - 20 },
        align: 'center',
      }).setOrigin(0.5, 0).setDepth(DEPTH_BASE + 1);

      // Ability name
      this.add.text(bx, by + CARD_H / 2 - 30, def.ability.name, {
        fontSize: '10px',
        color: '#aaaacc',
        fontFamily: 'monospace',
        wordWrap: { width: CARD_W - 16 },
        align: 'center',
      }).setOrigin(0.5).setDepth(DEPTH_BASE + 1);

      // "Click for details" hint
      this.add.text(bx, by + CARD_H / 2 - 12, 'click for details', {
        fontSize: '9px',
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
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(nameText);

    yOff += 28;

    // Clan + Totem
    const clanText = this.add.text(leftX, yOff, `${def.clan} · Totem: ${def.totem}`, {
      fontSize: '12px',
      color: roleHex,
      fontFamily: 'monospace',
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(clanText);

    yOff += 28;

    // Lore
    const loreText = this.add.text(leftX, yOff, def.lore, {
      fontSize: '12px',
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
      fontSize: '13px',
      color: '#88cc88',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(auraTitle);
    yOff += 20;

    const auraDesc = this.add.text(leftX, yOff, def.aura.description, {
      fontSize: '12px',
      color: '#cccccc',
      fontFamily: 'monospace',
      wordWrap: { width: contentW },
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(auraDesc);
    yOff += auraDesc.height + 16;

    // Ability
    const abilTitle = this.add.text(leftX, yOff, `ABILITY — ${def.ability.name}`, {
      fontSize: '13px',
      color: '#aaaaff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(abilTitle);
    yOff += 20;

    const abilDesc = this.add.text(leftX, yOff, def.ability.description, {
      fontSize: '12px',
      color: '#cccccc',
      fontFamily: 'monospace',
      wordWrap: { width: contentW },
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(abilDesc);
    yOff += abilDesc.height + 6;

    const abilCooldown = this.add.text(leftX, yOff, 'Cooldown: once per run', {
      fontSize: '10px',
      color: '#666688',
      fontFamily: 'monospace',
    }).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(abilCooldown);

    // Close button
    const closeBg = this.add.rectangle(cx, cy + SHEET_H / 2 - 30, 120, 36, 0x333333)
      .setStrokeStyle(1, 0x00ff44)
      .setInteractive({ useHandCursor: true })
      .setDepth(SHEET_DEPTH + 2);
    const closeLabel = this.add.text(cx, cy + SHEET_H / 2 - 30, 'CLOSE', {
      fontSize: '14px',
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
        fontSize: '14px',
        color: '#88ccff',
        fontFamily: 'monospace',
        wordWrap: { width: popupW - 40 },
        align: 'center',
      }).setOrigin(0.5).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(msg);

    // "GO TO UPGRADES" confirm button
    const confirmBg = this.add.rectangle(cx - 80, cy + 30, 160, 36, 0x003355)
      .setStrokeStyle(1, 0x0088cc)
      .setInteractive({ useHandCursor: true })
      .setDepth(SHEET_DEPTH + 2);
    const confirmLabel = this.add.text(cx - 80, cy + 30, 'GO TO UPGRADES', {
      fontSize: '13px',
      color: '#88ccff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(SHEET_DEPTH + 3);
    this.sheetContainer.add([confirmBg, confirmLabel]);

    confirmBg.on('pointerover', () => confirmBg.setFillStyle(0x004466));
    confirmBg.on('pointerout', () => confirmBg.setFillStyle(0x003355));
    confirmBg.on('pointerup', () => {
      this.scene.start('MetaMenuScene');
    });

    // Cancel button
    const cancelBg = this.add.rectangle(cx + 80, cy + 30, 100, 36, 0x222222)
      .setStrokeStyle(1, 0x444444)
      .setInteractive({ useHandCursor: true })
      .setDepth(SHEET_DEPTH + 2);
    const cancelLabel = this.add.text(cx + 80, cy + 30, 'CANCEL', {
      fontSize: '13px',
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
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(SHEET_DEPTH + 1);
    this.sheetContainer.add(msg);

    const dismissBg = this.add.rectangle(cx, cy + 28, 80, 30, 0x222222)
      .setStrokeStyle(1, 0x444444)
      .setInteractive({ useHandCursor: true })
      .setDepth(SHEET_DEPTH + 2);
    const dismissLabel = this.add.text(cx, cy + 28, 'OK', {
      fontSize: '13px',
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
}
