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

    // Parchment/scroll background — warm dark tone
    this.add.rectangle(cx, height / 2, width, height, 0x100c05).setDepth(DEPTH_BG);

    // Warm grid overlay
    const gfx = this.add.graphics().setDepth(DEPTH_BG);
    gfx.lineStyle(1, 0x2a2010, 0.18);
    for (let x = 0; x < width; x += 40) { gfx.moveTo(x, 0); gfx.lineTo(x, height); }
    for (let y = 0; y < height; y += 40) { gfx.moveTo(0, y); gfx.lineTo(width, y); }
    gfx.strokePath();

    // Grain overlay — sparse random dots for parchment texture
    const grainGfx = this.add.graphics().setDepth(DEPTH_BG);
    grainGfx.fillStyle(0xc8a050, 0.04);
    for (let i = 0; i < 180; i++) {
      grainGfx.fillRect(
        Math.random() * width, Math.random() * height,
        1 + Math.random(), 1 + Math.random(),
      );
    }

    // Title with decorative flourish
    const flourishGfx = this.add.graphics().setDepth(DEPTH_UI);
    flourishGfx.lineStyle(1, 0x446644, 0.6);
    const flourishY = 32;
    const flourishHalfW = 120;
    flourishGfx.beginPath();
    flourishGfx.moveTo(cx - flourishHalfW, flourishY);
    flourishGfx.lineTo(cx - 60, flourishY);
    flourishGfx.moveTo(cx + 60, flourishY);
    flourishGfx.lineTo(cx + flourishHalfW, flourishY);
    flourishGfx.strokePath();
    flourishGfx.fillStyle(0x446644, 0.6);
    flourishGfx.fillCircle(cx - flourishHalfW, flourishY, 2);
    flourishGfx.fillCircle(cx + flourishHalfW, flourishY, 2);

    this.add.text(cx, 32, 'CODEX', {
      fontSize: this._fs(32), color: '#00ff44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_UI);

    // Unlock counter
    const save = SaveManager.getInstance();
    const unlocked = ALL_CODEX_ENTRIES.filter(
      e => e.defaultUnlocked || save.isCodexUnlocked(e.id),
    ).length;
    this.add.text(cx, 60, `${unlocked} / ${ALL_CODEX_ENTRIES.length} entries unlocked`, {
      fontSize: this._fs(12), color: '#446644', fontFamily: 'monospace',
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

      const bg = this.add.rectangle(bx, tabY, TAB_W, tabH, 0x111111)
        .setStrokeStyle(1, 0x335533)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH_UI);
      this.tabBgs.set(section, bg);

      const label = this.add.text(bx, tabY, CODEX_SECTION_LABELS[section], {
        fontSize: this._fs(13), color: '#668866', fontFamily: 'monospace', fontStyle: 'bold',
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
        { fontSize: this._fs(11), color: '#445544', fontFamily: 'monospace' },
      ).setOrigin(1, 0).setDepth(DEPTH_UI + 1);

      bg.on('pointerover', () => bg.setFillStyle(0x1a2a1a));
      bg.on('pointerout', () => {
        bg.setFillStyle(this.activeSection === section ? 0x1a2a1a : 0x111111);
      });
      bg.on(TAP_EVENT, () => this.selectSection(section));
    }

    this.highlightTab(this.activeSection);
  }

  private highlightTab(section: CodexSection): void {
    for (const [s, bg] of this.tabBgs) {
      if (s === section) {
        bg.setFillStyle(0x1a2a1a).setStrokeStyle(2, 0x00ff44);
        this.tabLabels.get(s)?.setColor('#00ff44');
      } else {
        bg.setFillStyle(0x111111).setStrokeStyle(1, 0x335533);
        this.tabLabels.get(s)?.setColor('#668866');
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
      // Staggered fade-in for a parchment-scroll reveal feel
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

    const bgColor = isUnlocked ? 0x111a11 : 0x0d0d0d;
    const bg = this.add.rectangle(bx + ENTRY_W / 2, by + entryH / 2, ENTRY_W, entryH, bgColor)
      .setStrokeStyle(1, isUnlocked ? 0x335533 : 0x222222)
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
      ? (isRead ? '#99aa99' : '#ccddcc')
      : '#555555';
    const titleStyle = isUnlocked && !isRead ? 'bold' : 'normal';
    const title = this.add.text(bx + 42, by + entryH / 2, entry.title, {
      fontSize: this._fs(12), color: titleColor, fontFamily: 'monospace',
      fontStyle: titleStyle,
    }).setOrigin(0, 0.5).setDepth(DEPTH_UI + 1);
    created.push(title);

    // Unread dot indicator
    if (isUnlocked && !isRead) {
      const dot = this.add.circle(bx + ENTRY_W - 14, by + entryH / 2, 4, 0x00ff44)
        .setDepth(DEPTH_UI + 1);
      created.push(dot);
    }

    // Lock icon
    if (!isUnlocked) {
      const lockIcon = this.add.text(bx + ENTRY_W - 12, by + entryH / 2, '?', {
        fontSize: this._fs(14), color: '#333333', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(DEPTH_UI + 1);
      created.push(lockIcon);
    }

    // Click interaction
    if (isUnlocked) {
      bg.on('pointerover', () => bg.setFillStyle(0x1a2a1a));
      bg.on('pointerout', () => bg.setFillStyle(0x111a11));
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

      const bg = this.add.rectangle(cx, startY + panelH / 2, panelW, panelH, 0x0d1a0d)
        .setStrokeStyle(2, 0x335533)
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
          .setStrokeStyle(2, 0x556655)
          .setDepth(DEPTH_DETAIL + 2);
        this.detailObjects.push(illus);

        const illusChar = this.add.text(illusX, illusY, entry.title[0], {
          fontSize: this._fs(22), color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(DEPTH_DETAIL + 3);
        this.detailObjects.push(illusChar);
      }

      const titleText = this.add.text(illusX + illusSize / 2 + 12, illusY, entry.title, {
        fontSize: this._fs(18), color: '#00ff44', fontFamily: 'monospace', fontStyle: 'bold',
        wordWrap: { width: panelW - illusSize - 60 },
      }).setOrigin(0, 0.5).setDepth(DEPTH_DETAIL + 2);
      this.detailObjects.push(titleText);

      const loreText = entry.lines.join('\n');
      const loreDisplay = this.add.text(
        cx - panelW / 2 + 20, illusY + illusSize / 2 + 20,
        loreText,
        {
          fontSize:    this._fs(13),
          color:       '#aabbaa',
          fontFamily:  'monospace',
          lineSpacing: 8,
          wordWrap:    { width: panelW - 40 },
        },
      ).setDepth(DEPTH_DETAIL + 2);
      this.detailObjects.push(loreDisplay);

      // ── Text containment (mobile) ──────────────────────────────────────
      const loreTextY = illusY + illusSize / 2 + 20;
      const closeRegionH = 52; // 44px button + 8px padding
      const maxLoreH = (startY + panelH - closeRegionH) - loreTextY - 8;
      if (maxLoreH > 0 && loreDisplay.height > maxLoreH) {
        const maskGfx = this.add.graphics().setVisible(false);
        maskGfx.fillRect(cx - panelW / 2, loreTextY, panelW, maxLoreH);
        loreDisplay.setMask(maskGfx.createGeometryMask());
        this._detailMaskGfx = maskGfx;

        const moreHint = this.add.text(
          cx, loreTextY + maxLoreH + 2, '⋯ more below',
          { fontSize: this._fs(11), color: '#446644', fontFamily: 'monospace' },
        ).setOrigin(0.5, 0).setDepth(DEPTH_DETAIL + 2);
        this.detailObjects.push(moreHint);

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
          moreHint.setVisible(scrollAmt < maxScroll - 2);
        };
        this._wheelHandler = handler;
        this.input.on('wheel', handler);
      }

      // Close button — 44px minimum height, centred at bottom
      const closeH = 44;
      const closeBg = this.add.rectangle(cx, startY + panelH - closeH / 2 - 8, 160, closeH, 0x1a0000)
        .setStrokeStyle(2, 0xff4444)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH_DETAIL + 2);
      const closeLabel = this.add.text(cx, startY + panelH - closeH / 2 - 8, 'CLOSE', {
        fontSize: this._fs(16), color: '#ff4444', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(DEPTH_DETAIL + 3);

      closeBg.on('pointerover', () => { closeBg.setFillStyle(0x330000); closeLabel.setColor('#ffffff'); });
      closeBg.on('pointerout',  () => { closeBg.setFillStyle(0x1a0000); closeLabel.setColor('#ff4444'); });
      closeBg.on(TAP_EVENT, () => this.clearDetail());
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
      const bg = this.add.rectangle(cx, startY + panelH / 2, panelW, panelH, 0x0d1a0d)
        .setStrokeStyle(2, 0x335533)
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
          .setStrokeStyle(2, 0x556655)
          .setDepth(DEPTH_DETAIL + 1);
        this.detailObjects.push(illus);

        const illusChar = this.add.text(illusX, illusY, entry.title[0], {
          fontSize: this._fs(24), color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(DEPTH_DETAIL + 2);
        this.detailObjects.push(illusChar);
      }

      // Title
      const titleText = this.add.text(illusX + illusSize / 2 + 16, illusY, entry.title, {
        fontSize: this._fs(18), color: '#00ff44', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0, 0.5).setDepth(DEPTH_DETAIL + 1);
      this.detailObjects.push(titleText);

      // Lore text
      const loreText = entry.lines.join('\n');
      const loreDisplay = this.add.text(
        cx - panelW / 2 + 24, illusY + illusSize / 2 + 24,
        loreText,
        {
          fontSize:    this._fs(13),
          color:       '#aabbaa',
          fontFamily:  'monospace',
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
          cx, startY + panelH - 32, '▼ scroll for more',
          { fontSize: this._fs(11), color: '#446644', fontFamily: 'monospace' },
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

      // Section badge — minimum 11px
      const sectionLabel = CODEX_SECTION_LABELS[entry.section];
      const badge = this.add.text(
        cx + panelW / 2 - 16, startY + panelH - 20,
        sectionLabel.toUpperCase(),
        {
          fontSize: this._fs(11), color: '#334433', fontFamily: 'monospace',
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
    const markBg = this.add.rectangle(cx - 120, btnY, 190, btnH, 0x0a1a0a)
      .setStrokeStyle(1, 0x335533)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_UI);
    const markLabel = this.add.text(cx - 120, btnY, 'MARK ALL READ', {
      fontSize: this._fs(12), color: '#668866', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_UI + 1);

    markBg.on('pointerover', () => { markBg.setFillStyle(0x1a2a1a); markLabel.setColor('#00ff44'); });
    markBg.on('pointerout',  () => { markBg.setFillStyle(0x0a1a0a); markLabel.setColor('#668866'); });
    markBg.on(TAP_EVENT,   () => {
      const save = SaveManager.getInstance();
      const allUnlockedIds = ALL_CODEX_ENTRIES
        .filter(e => e.defaultUnlocked || save.isCodexUnlocked(e.id))
        .map(e => e.id);
      save.markAllCodexRead(allUnlockedIds);
      this.refreshEntries();
    });

    // BACK button (right of center)
    const bg = this.add.rectangle(cx + 120, btnY, 160, btnH, 0x1a0000)
      .setStrokeStyle(2, 0xff4444)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_UI);

    const label = this.add.text(cx + 120, btnY, 'BACK', {
      fontSize: this._fs(16), color: '#ff4444', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_UI + 1);

    bg.on('pointerover', () => { bg.setFillStyle(0x330000); label.setColor('#ffffff'); });
    bg.on('pointerout',  () => { bg.setFillStyle(0x1a0000); label.setColor('#ff4444'); });
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
