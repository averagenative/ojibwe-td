/**
 * CodexScene — full-screen lore encyclopaedia.
 *
 * Accessible from MainMenuScene and GameOverScene.
 * Four tabs: Beings, Places, Commanders, Teachings.
 * Each entry shows title (always visible) and lore text (only if unlocked).
 * Locked entries show title with a "???" placeholder for content.
 *
 * Fully offline — no external fetches.
 */

import Phaser from 'phaser';
import { SaveManager } from '../meta/SaveManager';
import {
  ALL_CODEX_ENTRIES,
  CODEX_SECTIONS,
  CODEX_SECTION_ICONS,
  CODEX_SECTION_LABELS,
  getCodexEntriesBySection,
} from '../data/codexDefs';
import type { CodexEntryDef, CodexSection } from '../data/codexDefs';
import { MobileManager, TAP_EVENT } from '../systems/MobileManager';
import { PAL } from '../ui/palette';

// ── Layout constants ──────────────────────────────────────────────────────────

const DEPTH_BG      = 0;
const DEPTH_UI      = 10;
const DEPTH_DETAIL  = 20;

const TAB_W   = 150;
const TAB_H   = 36;
const TAB_GAP = 8;

const ENTRY_W = 260;
const ENTRY_H = 50;
const ENTRY_GAP = 6;

const COL_GAP = 16;

interface CodexSceneData {
  /** Scene to return to ('MainMenuScene' or 'GameOverScene'). */
  returnTo?: string;
  /** Data to pass back (for GameOverScene retry etc.). */
  returnData?: Record<string, unknown>;
}

export class CodexScene extends Phaser.Scene {
  private activeSection: CodexSection = 'beings';
  private tabBgs: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private tabLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private entryObjects: Phaser.GameObjects.GameObject[] = [];
  private detailObjects: Phaser.GameObjects.GameObject[] = [];
  private _escHandler: (() => void) | null = null;
  private _wheelHandler: ((
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[],
    dx: number,
    dy: number,
  ) => void) | null = null;
  private _detailMaskGfx: Phaser.GameObjects.Graphics | null = null;

  /** Entry list scroll offset (mobile touch-drag). */
  private _entryScrollY = 0;
  private _entryScrollMax = 0;
  private _entryMaskGfx: Phaser.GameObjects.Graphics | null = null;

  private returnTo = 'MainMenuScene';
  private returnData: Record<string, unknown> = {};

  /** Transition guard — prevents double-navigation. */
  private _fading = false;

  /** True when running on a mobile/touch device. Set once in create(). */
  private _isMobile = false;

  /**
   * Returns a CSS font-size string scaled up by 1.35× on mobile.
   */
  private _fs(size: number): string {
    const s = this._isMobile ? Math.round(size * 1.35) : size;
    return `${s}px`;
  }

  constructor() {
    super({ key: 'CodexScene' });
  }

  init(data?: CodexSceneData): void {
    this.returnTo = data?.returnTo ?? 'MainMenuScene';
    this.returnData = data?.returnData ?? {};
  }

  create(): void {
    this._fading = false;
    this.cameras.main.fadeIn(350, 0, 0, 0);
    this._isMobile = MobileManager.getInstance().isMobile();

    const { width, height } = this.scale;
    const cx = width / 2;

    // Background — deep forest
    this.add.rectangle(cx, height / 2, width, height, PAL.bgDark).setDepth(DEPTH_BG);

    // Grid overlay
    const gfx = this.add.graphics().setDepth(DEPTH_BG);
    gfx.lineStyle(1, 0x1c2e12, 0.15);
    for (let x = 0; x < width; x += 40) { gfx.moveTo(x, 0); gfx.lineTo(x, height); }
    for (let y = 0; y < height; y += 40) { gfx.moveTo(0, y); gfx.lineTo(width, y); }
    gfx.strokePath();

    // Grain overlay — sparse random dots for texture
    const grainGfx = this.add.graphics().setDepth(DEPTH_BG);
    grainGfx.fillStyle(0x6B8F3E, 0.03);
    for (let i = 0; i < 180; i++) {
      grainGfx.fillRect(
        Math.random() * width, Math.random() * height,
        1 + Math.random(), 1 + Math.random(),
      );
    }

    // Title with decorative flourish
    const flourishGfx = this.add.graphics().setDepth(DEPTH_UI);
    flourishGfx.lineStyle(1, PAL.borderActive, 0.6);
    const flourishY = 32;
    const flourishHalfW = 120;
    flourishGfx.beginPath();
    flourishGfx.moveTo(cx - flourishHalfW, flourishY);
    flourishGfx.lineTo(cx - 60, flourishY);
    flourishGfx.moveTo(cx + 60, flourishY);
    flourishGfx.lineTo(cx + flourishHalfW, flourishY);
    flourishGfx.strokePath();
    flourishGfx.fillStyle(PAL.borderActive, 0.6);
    flourishGfx.fillCircle(cx - flourishHalfW, flourishY, 2);
    flourishGfx.fillCircle(cx + flourishHalfW, flourishY, 2);

    this.add.text(cx, 32, 'CODEX', {
      fontSize: this._fs(32), color: PAL.accentGreen, fontFamily: PAL.fontTitle, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_UI);

    // Unlock counter
    const save = SaveManager.getInstance();
    const unlocked = ALL_CODEX_ENTRIES.filter(
      e => e.defaultUnlocked || save.isCodexUnlocked(e.id),
    ).length;
    this.add.text(cx, 60, `${unlocked} / ${ALL_CODEX_ENTRIES.length} entries unlocked`, {
      fontSize: this._fs(12), color: PAL.textDim, fontFamily: PAL.fontBody,
    }).setOrigin(0.5).setDepth(DEPTH_UI);

    // Section tabs
    this.createTabs(cx);

    // Entry list (initial section)
    this.refreshEntries();

    // Back button
    this.createBackButton(cx, height);

    // Swipe-right to go back (mobile only)
    if (this._isMobile) {
      let swipeStartX = 0;
      let swipeStartY = 0;
      this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        swipeStartX = ptr.x;
        swipeStartY = ptr.y;
      });
      this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        const dx = ptr.x - swipeStartX;
        const dy = ptr.y - swipeStartY;
        if (dx > 100 && Math.abs(dy) < 50) {
          this._go(this.returnTo, this.returnData);
        }
      });
    }
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  private createTabs(cx: number): void {
    const n = CODEX_SECTIONS.length;
    const totalW = n * TAB_W + (n - 1) * TAB_GAP;
    const startX = cx - totalW / 2 + TAB_W / 2;
    const tabY = 96;
    // Ensure 44px minimum height on mobile for tap target.
    const tabH = this._isMobile ? 44 : TAB_H;

    for (let i = 0; i < n; i++) {
      const section = CODEX_SECTIONS[i];
      const bx = startX + i * (TAB_W + TAB_GAP);

      const bg = this.add.rectangle(bx, tabY, TAB_W, tabH, PAL.bgPanel)
        .setStrokeStyle(1, PAL.borderInactive)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH_UI);
      this.tabBgs.set(section, bg);

      const label = this.add.text(bx, tabY, CODEX_SECTION_LABELS[section], {
        fontSize: this._fs(13), color: PAL.textSecondary, fontFamily: PAL.fontBody, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(DEPTH_UI + 1);
      this.tabLabels.set(section, label);

      // Section icon — small icon to the left of the label
      const sectionIconKey = CODEX_SECTION_ICONS[section];
      if (this.textures.exists(sectionIconKey)) {
        const iconSz = this._isMobile ? 20 : 16;
        const iconGap = 4;
        const labelW = label.width;
        const iconLabelW = iconSz + iconGap + labelW;
        const iconX = bx - iconLabelW / 2 + iconSz / 2;
        const labelX = bx - iconLabelW / 2 + iconSz + iconGap + labelW / 2;

        this.add.image(iconX, tabY, sectionIconKey)
          .setDisplaySize(iconSz, iconSz)
          .setDepth(DEPTH_UI + 2);
        label.setX(labelX);
      }

      // Count unlocked for this section
      const save = SaveManager.getInstance();
      const entries = getCodexEntriesBySection(section);
      const sectionUnlocked = entries.filter(
        e => e.defaultUnlocked || save.isCodexUnlocked(e.id),
      ).length;

      // Badge — minimum 11px
      this.add.text(bx + TAB_W / 2 - 8, tabY - tabH / 2 + 4,
        `${sectionUnlocked}`,
        { fontSize: this._fs(11), color: PAL.textDim, fontFamily: PAL.fontBody },
      ).setOrigin(1, 0).setDepth(DEPTH_UI + 1);

      bg.on('pointerover', () => bg.setFillStyle(PAL.bgPanelHover));
      bg.on('pointerout', () => {
        bg.setFillStyle(this.activeSection === section ? PAL.bgPanelHover : PAL.bgPanel);
      });
      bg.on(TAP_EVENT, () => this.selectSection(section));
    }

    this.highlightTab(this.activeSection);
  }

  private highlightTab(section: CodexSection): void {
    for (const [s, bg] of this.tabBgs) {
      if (s === section) {
        bg.setFillStyle(PAL.bgPanelHover).setStrokeStyle(2, PAL.borderActive);
        this.tabLabels.get(s)?.setColor(PAL.accentGreen);
      } else {
        bg.setFillStyle(PAL.bgPanel).setStrokeStyle(1, PAL.borderInactive);
        this.tabLabels.get(s)?.setColor(PAL.textSecondary);
      }
    }
  }

  private selectSection(section: CodexSection): void {
    if (this.activeSection === section) return;
    this.activeSection = section;
    this.highlightTab(section);
    this.clearDetail();
    this.refreshEntries();
  }

  // ── Entry List ────────────────────────────────────────────────────────────

  private refreshEntries(): void {
    for (const obj of this.entryObjects) {
      if (obj?.active) {
        this.tweens.killTweensOf(obj);
        obj.destroy();
      }
    }
    this.entryObjects = [];
    this._entryScrollY = 0;
    if (this._entryMaskGfx) { this._entryMaskGfx.destroy(); this._entryMaskGfx = null; }

    const entries = getCodexEntriesBySection(this.activeSection);
    const save = SaveManager.getInstance();
    const startY = 130;
    const { height } = this.scale;
    // On mobile: single column to avoid overlapping the detail panel.
    const entryH = this._isMobile ? Math.max(ENTRY_H, 56) : ENTRY_H;

    // Cap entries per column so they don't overlap the bottom buttons.
    const btnAreaH = 60; // reserve space for BACK + MARK ALL READ buttons
    const availableH = height - startY - btnAreaH;
    const maxPerCol = Math.max(1, Math.floor(availableH / (entryH + ENTRY_GAP)));

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      let col: number;
      let row: number;

      if (this._isMobile) {
        // Single column — all entries stacked vertically
        col = 0;
        row = i;
      } else {
        col = Math.floor(i / maxPerCol);
        row = i % maxPerCol;
      }

      const bx = 160 + col * (ENTRY_W + COL_GAP);
      const by = startY + row * (entryH + ENTRY_GAP);

      const isUnlocked = entry.defaultUnlocked || save.isCodexUnlocked(entry.id);
      const objs = this.buildEntryTile(entry, bx, by, isUnlocked, entryH);
      // Staggered fade-in
      for (const obj of objs) {
        if ('setAlpha' in obj) {
          (obj as unknown as { setAlpha: (v: number) => void }).setAlpha(0);
          this.tweens.add({
            targets: obj,
            alpha: 1,
            duration: 200,
            delay: i * 30,
            ease: 'Sine.easeOut',
          });
        }
      }
      this.entryObjects.push(...objs);
    }

    // ── Touch-drag scrolling for entry list on mobile ──────────────────────
    if (this._isMobile && entries.length > maxPerCol) {
      const totalContentH = entries.length * (entryH + ENTRY_GAP);
      this._entryScrollMax = Math.max(0, totalContentH - availableH);

      // Mask to clip entries within the available area
      const maskGfx = this.add.graphics().setVisible(false);
      maskGfx.fillRect(0, startY, this.scale.width, availableH);
      const mask = maskGfx.createGeometryMask();
      for (const obj of this.entryObjects) {
        if ('setMask' in obj) (obj as Phaser.GameObjects.Components.Mask & Phaser.GameObjects.GameObject).setMask(mask);
      }
      this._entryMaskGfx = maskGfx;

      // Touch-drag handler
      let dragLastY = 0;
      const dragZone = this.add.zone(160 + ENTRY_W / 2, startY + availableH / 2, ENTRY_W + 40, availableH)
        .setInteractive()
        .setDepth(DEPTH_UI - 1);
      this.entryObjects.push(dragZone);

      dragZone.on('pointerdown', (p: Phaser.Input.Pointer) => { dragLastY = p.y; });
      dragZone.on('pointermove', (p: Phaser.Input.Pointer) => {
        if (!p.isDown) return;
        const delta = dragLastY - p.y;
        dragLastY = p.y;
        this._entryScrollY = Phaser.Math.Clamp(this._entryScrollY + delta, 0, this._entryScrollMax);
        this._applyEntryScroll();
      });
    }
  }

  private _applyEntryScroll(): void {
    for (const obj of this.entryObjects) {
      if ('y' in obj && 'getData' in obj) {
        const go = obj as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;
        if (!go.getData('_origY')) go.setData('_origY', go.y);
        go.y = (go.getData('_origY') as number) - this._entryScrollY;
      }
    }
  }

  private buildEntryTile(
    entry: CodexEntryDef,
    bx: number,
    by: number,
    isUnlocked: boolean,
    entryH: number = ENTRY_H,
  ): Phaser.GameObjects.GameObject[] {
    const created: Phaser.GameObjects.GameObject[] = [];
    const save = SaveManager.getInstance();
    const isRead = save.isCodexRead(entry.id);

    const bgColor = isUnlocked ? PAL.bgPanel : PAL.bgPanelLocked;
    const bg = this.add.rectangle(bx + ENTRY_W / 2, by + entryH / 2, ENTRY_W, entryH, bgColor)
      .setStrokeStyle(1, isUnlocked ? PAL.borderInactive : 0x222222)
      .setInteractive({ useHandCursor: isUnlocked })
      .setDepth(DEPTH_UI);
    created.push(bg);

    // Icon or colour tile (small square)
    const tileSize = 28;
    const tileX = bx + 20;
    const tileY = by + entryH / 2;

    if (isUnlocked && entry.iconKey && this.textures.exists(entry.iconKey)) {
      const icon = this.add.image(tileX, tileY, entry.iconKey)
        .setDisplaySize(tileSize, tileSize)
        .setDepth(DEPTH_UI + 1);
      created.push(icon);
    } else {
      const tileColor = isUnlocked ? entry.tileColor : 0x222222;
      const tile = this.add.rectangle(tileX, tileY, tileSize, tileSize, tileColor)
        .setStrokeStyle(1, 0x333333).setDepth(DEPTH_UI + 1);
      created.push(tile);
    }

    // Title — bold for unread unlocked entries, normal for read entries
    const titleColor = isUnlocked
      ? (isRead ? PAL.textSecondary : PAL.textPrimary)
      : '#555555';
    const titleStyle = isUnlocked && !isRead ? 'bold' : 'normal';
    const title = this.add.text(bx + 42, by + entryH / 2, entry.title, {
      fontSize: this._fs(12), color: titleColor, fontFamily: PAL.fontBody,
      fontStyle: titleStyle,
    }).setOrigin(0, 0.5).setDepth(DEPTH_UI + 1);
    created.push(title);

    // Unread dot indicator
    if (isUnlocked && !isRead) {
      const dot = this.add.circle(bx + ENTRY_W - 14, by + entryH / 2, 4, PAL.accentGreenN)
        .setDepth(DEPTH_UI + 1);
      created.push(dot);
    }

    // Lock icon
    if (!isUnlocked) {
      const lockIcon = this.add.text(bx + ENTRY_W - 12, by + entryH / 2, '?', {
        fontSize: this._fs(14), color: '#333333', fontFamily: PAL.fontBody,
      }).setOrigin(0.5).setDepth(DEPTH_UI + 1);
      created.push(lockIcon);
    }

    // Click interaction
    if (isUnlocked) {
      bg.on('pointerover', () => bg.setFillStyle(PAL.bgPanelHover));
      bg.on('pointerout', () => bg.setFillStyle(PAL.bgPanel));
      bg.on(TAP_EVENT, () => this.showDetail(entry));
    }

    return created;
  }

  // ── Detail View ──────────────────────────────────────────────────────────

  private showDetail(entry: CodexEntryDef): void {
    // Mark as read when viewed
    const save = SaveManager.getInstance();
    if (!save.isCodexRead(entry.id)) {
      save.markCodexRead(entry.id);
      // Refresh entry tiles to update read/unread styling
      this.refreshEntries();
    }

    this.clearDetail();

    const { width, height } = this.scale;

    // ── Escape key dismiss ────────────────────────────────────────────────
    this._escHandler = () => this.clearDetail();
    this.input.keyboard?.on('keydown-ESC', this._escHandler);

    if (this._isMobile) {
      // ── Mobile: full-screen overlay ──────────────────────────────────────
      // Dim the whole screen and render detail centred.
      const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
        .setInteractive() // block click-through
        .setDepth(DEPTH_DETAIL);
      this.detailObjects.push(overlay);

      const panelW = Math.min(560, width - 40);
      const panelH = height - 80;
      const cx = width / 2;
      const startY = 40;

      const bg = this.add.rectangle(cx, startY + panelH / 2, panelW, panelH, PAL.bgPanelDark)
        .setStrokeStyle(2, PAL.borderActive)
        .setInteractive() // block taps from reaching overlay
        .setDepth(DEPTH_DETAIL + 1);
      this.detailObjects.push(bg);

      // Illustration — icon image or coloured tile fallback
      const illusSize = 48;
      const illusX = cx - panelW / 2 + 36;
      const illusY = startY + 36;

      if (entry.iconKey && this.textures.exists(entry.iconKey)) {
        const illusIcon = this.add.image(illusX, illusY, entry.iconKey)
          .setDisplaySize(illusSize, illusSize)
          .setDepth(DEPTH_DETAIL + 2);
        this.detailObjects.push(illusIcon);
      } else {
        const illus = this.add.rectangle(illusX, illusY, illusSize, illusSize, entry.tileColor)
          .setStrokeStyle(2, PAL.borderInactive)
          .setDepth(DEPTH_DETAIL + 2);
        this.detailObjects.push(illus);

        const illusChar = this.add.text(illusX, illusY, entry.title[0], {
          fontSize: this._fs(22), color: PAL.textPrimary, fontFamily: PAL.fontBody, fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(DEPTH_DETAIL + 3);
        this.detailObjects.push(illusChar);
      }

      const titleText = this.add.text(illusX + illusSize / 2 + 12, illusY, entry.title, {
        fontSize: this._fs(18), color: PAL.accentGreen, fontFamily: PAL.fontTitle, fontStyle: 'bold',
        wordWrap: { width: panelW - illusSize - 60 },
      }).setOrigin(0, 0.5).setDepth(DEPTH_DETAIL + 2);
      this.detailObjects.push(titleText);

      const loreText = entry.lines.join('\n');
      const loreDisplay = this.add.text(
        cx - panelW / 2 + 20, illusY + illusSize / 2 + 20,
        loreText,
        {
          fontSize:    this._fs(13),
          color:       PAL.textSecondary,
          fontFamily:  PAL.fontBody,
          lineSpacing: 8,
          wordWrap:    { width: panelW - 40 },
        },
      ).setDepth(DEPTH_DETAIL + 2);
      this.detailObjects.push(loreDisplay);

      // ── Text containment + touch/wheel scroll (mobile) ─────────────────
      const loreTextY = illusY + illusSize / 2 + 20;
      const closeRegionH = 52;
      const maxLoreH = (startY + panelH - closeRegionH) - loreTextY - 8;
      if (maxLoreH > 0 && loreDisplay.height > maxLoreH) {
        const maskGfx = this.add.graphics().setVisible(false);
        maskGfx.fillRect(cx - panelW / 2, loreTextY, panelW, maxLoreH);
        loreDisplay.setMask(maskGfx.createGeometryMask());
        this._detailMaskGfx = maskGfx;

        const moreHint = this.add.text(
          cx, loreTextY + maxLoreH + 2, '... more below',
          { fontSize: this._fs(11), color: PAL.textDim, fontFamily: PAL.fontBody },
        ).setOrigin(0.5, 0).setDepth(DEPTH_DETAIL + 2);
        this.detailObjects.push(moreHint);

        const maxScroll = loreDisplay.height - maxLoreH;
        let scrollAmt = 0;
        const origLoreY = loreDisplay.y;
        const applyScroll = (delta: number) => {
          scrollAmt = Phaser.Math.Clamp(scrollAmt + delta, 0, maxScroll);
          loreDisplay.y = origLoreY - scrollAmt;
          moreHint.setVisible(scrollAmt < maxScroll - 2);
        };

        // Wheel scroll (desktop)
        const handler = (
          _p: Phaser.Input.Pointer,
          _go: Phaser.GameObjects.GameObject[],
          _dx: number,
          deltaY: number,
        ) => { applyScroll(deltaY * 0.5); };
        this._wheelHandler = handler;
        this.input.on('wheel', handler);

        // Touch-drag scroll (mobile)
        let dragLastY = 0;
        bg.on('pointerdown', (p: Phaser.Input.Pointer) => { dragLastY = p.y; });
        bg.on('pointermove', (p: Phaser.Input.Pointer) => {
          if (!p.isDown) return;
          applyScroll(dragLastY - p.y);
          dragLastY = p.y;
        });
      }

      // Close button — 44px minimum height, centred at bottom
      const closeH = 44;
      const closeBg = this.add.rectangle(cx, startY + panelH - closeH / 2 - 8, 160, closeH, PAL.bgPanelDark)
        .setStrokeStyle(2, PAL.dangerN)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH_DETAIL + 2);
      const closeLabel = this.add.text(cx, startY + panelH - closeH / 2 - 8, 'CLOSE', {
        fontSize: this._fs(16), color: PAL.danger, fontFamily: PAL.fontBody, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(DEPTH_DETAIL + 3);

      closeBg.on('pointerover', () => { closeBg.setFillStyle(0x330000); closeLabel.setColor('#ffffff'); });
      closeBg.on('pointerout',  () => { closeBg.setFillStyle(PAL.bgPanelDark); closeLabel.setColor(PAL.danger); });
      closeBg.on(TAP_EVENT, () => this.clearDetail());
      // Tapping overlay (outside panel) also closes — but taps on the panel bg are blocked.
      overlay.on(TAP_EVENT, () => this.clearDetail());

      this.detailObjects.push(closeBg, closeLabel);
    } else {
      // ── Desktop: side panel ───────────────────────────────────────────────

      // Click-away overlay — dismiss detail when clicking outside the panel
      const clickAway = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
        .setInteractive()
        .setDepth(DEPTH_DETAIL - 1);
      clickAway.on(TAP_EVENT, () => this.clearDetail());
      this.detailObjects.push(clickAway);

      const cx = width / 2 + 120;
      const startY = 140;

      // Detail panel background
      const panelW = 420;
      const panelH = height - 180;
      const bg = this.add.rectangle(cx, startY + panelH / 2, panelW, panelH, PAL.bgPanelDark)
        .setStrokeStyle(2, PAL.borderActive)
        .setDepth(DEPTH_DETAIL);
      this.detailObjects.push(bg);

      // Illustration — icon image or coloured tile fallback
      const illusSize = 56;
      const illusX = cx - panelW / 2 + 40;
      const illusY = startY + 40;

      if (entry.iconKey && this.textures.exists(entry.iconKey)) {
        const illusIcon = this.add.image(illusX, illusY, entry.iconKey)
          .setDisplaySize(illusSize, illusSize)
          .setDepth(DEPTH_DETAIL + 1);
        this.detailObjects.push(illusIcon);
      } else {
        const illus = this.add.rectangle(illusX, illusY, illusSize, illusSize, entry.tileColor)
          .setStrokeStyle(2, PAL.borderInactive)
          .setDepth(DEPTH_DETAIL + 1);
        this.detailObjects.push(illus);

        const illusChar = this.add.text(illusX, illusY, entry.title[0], {
          fontSize: this._fs(24), color: PAL.textPrimary, fontFamily: PAL.fontBody, fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(DEPTH_DETAIL + 2);
        this.detailObjects.push(illusChar);
      }

      // Title
      const titleText = this.add.text(illusX + illusSize / 2 + 16, illusY, entry.title, {
        fontSize: this._fs(18), color: PAL.accentGreen, fontFamily: PAL.fontTitle, fontStyle: 'bold',
      }).setOrigin(0, 0.5).setDepth(DEPTH_DETAIL + 1);
      this.detailObjects.push(titleText);

      // Lore text
      const loreText = entry.lines.join('\n');
      const loreDisplay = this.add.text(
        cx - panelW / 2 + 24, illusY + illusSize / 2 + 24,
        loreText,
        {
          fontSize:    this._fs(13),
          color:       PAL.textSecondary,
          fontFamily:  PAL.fontBody,
          lineSpacing: 8,
          wordWrap:    { width: panelW - 48 },
        },
      ).setDepth(DEPTH_DETAIL + 1);
      this.detailObjects.push(loreDisplay);

      // ── Text containment & scroll ──────────────────────────────────────
      const loreTextY = illusY + illusSize / 2 + 24;
      const maxLoreH = (startY + panelH - 36) - loreTextY;
      if (maxLoreH > 0 && loreDisplay.height > maxLoreH) {
        const maskGfx = this.add.graphics().setVisible(false);
        maskGfx.fillRect(cx - panelW / 2, loreTextY, panelW, maxLoreH);
        loreDisplay.setMask(maskGfx.createGeometryMask());
        this._detailMaskGfx = maskGfx;

        const scrollHint = this.add.text(
          cx, startY + panelH - 32, '... scroll for more',
          { fontSize: this._fs(11), color: PAL.textDim, fontFamily: PAL.fontBody },
        ).setOrigin(0.5).setDepth(DEPTH_DETAIL + 2);
        this.detailObjects.push(scrollHint);

        const maxScroll = loreDisplay.height - maxLoreH;
        let scrollAmt = 0;
        const origLoreY = loreDisplay.y;
        const handler = (
          _p: Phaser.Input.Pointer,
          _go: Phaser.GameObjects.GameObject[],
          _dx: number,
          deltaY: number,
        ) => {
          scrollAmt = Phaser.Math.Clamp(scrollAmt + deltaY * 0.5, 0, maxScroll);
          loreDisplay.y = origLoreY - scrollAmt;
          scrollHint.setVisible(scrollAmt < maxScroll - 2);
        };
        this._wheelHandler = handler;
        this.input.on('wheel', handler);
      }

      // Section badge
      const sectionLabel = CODEX_SECTION_LABELS[entry.section];
      const badge = this.add.text(
        cx + panelW / 2 - 16, startY + panelH - 20,
        sectionLabel.toUpperCase(),
        {
          fontSize: this._fs(11), color: PAL.textDim, fontFamily: PAL.fontBody,
        },
      ).setOrigin(1, 1).setDepth(DEPTH_DETAIL + 1);
      this.detailObjects.push(badge);
    }
  }

  private clearDetail(): void {
    if (this._escHandler) {
      this.input.keyboard?.off('keydown-ESC', this._escHandler);
      this._escHandler = null;
    }
    if (this._wheelHandler) {
      this.input.off('wheel', this._wheelHandler);
      this._wheelHandler = null;
    }
    if (this._detailMaskGfx) {
      this._detailMaskGfx.destroy();
      this._detailMaskGfx = null;
    }
    for (const obj of this.detailObjects) {
      if (obj?.active) obj.destroy();
    }
    this.detailObjects = [];
  }

  // ── Back Button ──────────────────────────────────────────────────────────

  private createBackButton(cx: number, height: number): void {
    // Ensure 44px minimum tap target on mobile.
    const btnH = this._isMobile ? 44 : 40;
    const btnY = height - (this._isMobile ? btnH / 2 + 20 : 46);

    // MARK ALL READ button (left of center)
    const markBg = this.add.rectangle(cx - 120, btnY, 190, btnH, PAL.bgPanel)
      .setStrokeStyle(1, PAL.borderInactive)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_UI);
    const markLabel = this.add.text(cx - 120, btnY, 'MARK ALL READ', {
      fontSize: this._fs(12), color: PAL.textSecondary, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_UI + 1);

    markBg.on('pointerover', () => { markBg.setFillStyle(PAL.bgPanelHover); markLabel.setColor(PAL.accentGreen); });
    markBg.on('pointerout',  () => { markBg.setFillStyle(PAL.bgPanel); markLabel.setColor(PAL.textSecondary); });
    markBg.on(TAP_EVENT,   () => {
      const save = SaveManager.getInstance();
      const allUnlockedIds = ALL_CODEX_ENTRIES
        .filter(e => e.defaultUnlocked || save.isCodexUnlocked(e.id))
        .map(e => e.id);
      save.markAllCodexRead(allUnlockedIds);
      this.refreshEntries();
    });

    // BACK button (right of center)
    const bg = this.add.rectangle(cx + 120, btnY, 160, btnH, PAL.bgPanelDark)
      .setStrokeStyle(2, PAL.dangerN)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_UI);

    const label = this.add.text(cx + 120, btnY, 'BACK', {
      fontSize: this._fs(16), color: PAL.danger, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_UI + 1);

    bg.on('pointerover', () => { bg.setFillStyle(0x330000); label.setColor('#ffffff'); });
    bg.on('pointerout',  () => { bg.setFillStyle(PAL.bgPanelDark); label.setColor(PAL.danger); });
    bg.on(TAP_EVENT,   () => {
      this._go(this.returnTo, this.returnData);
    });
  }

  private _go(key: string, data?: object): void {
    if (this._fading) return;
    this._fading = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(key, data);
    });
  }
}
