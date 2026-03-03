/**
 * AchievementsScene — gallery view of all achievements.
 *
 * Shows all achievements organised by category. Locked achievements with
 * `hidden: true` display as "???" until unlocked.
 *
 * Navigation: back → MainMenuScene.
 * Accepts `{ returnTo?: string }` init data to support returning to
 * MetaMenuScene when launched from there.
 */

import Phaser from 'phaser';
import { MobileManager } from '../systems/MobileManager';
import { AchievementManager } from '../systems/AchievementManager';
import {
  ACHIEVEMENT_CATEGORIES,
  CATEGORY_LABELS,
} from '../data/achievementDefs';
import type { AchievementCategory } from '../data/achievementDefs';
import { PAL } from '../ui/palette';

// ── Layout ───────────────────────────────────────────────────────────────────

const PANEL_W   = 480;
const ROW_H     = 70;
const ROW_GAP   = 8;
const ROW_PAD_X = 16;

// ── Scene ────────────────────────────────────────────────────────────────────

interface AchievementsSceneData {
  returnTo?: string;
  category?: AchievementCategory;
}

export class AchievementsScene extends Phaser.Scene {
  private _isMobile = false;
  private _returnTo = 'MainMenuScene';
  private _activeCategory: AchievementCategory = 'map-clear';

  private _fs(size: number): string {
    const s = this._isMobile ? Math.round(size * 1.35) : size;
    return `${s}px`;
  }

  constructor() {
    super({ key: 'AchievementsScene' });
  }

  create(data?: AchievementsSceneData): void {
    this._isMobile       = MobileManager.getInstance().isMobile();
    this._returnTo       = data?.returnTo ?? 'MainMenuScene';
    this._activeCategory = data?.category ?? 'map-clear';

    const { width, height } = this.scale;
    const cx = width / 2;

    this._createBackground();

    // Title
    this.add.text(cx, 30, 'ACHIEVEMENTS', {
      fontSize:   this._fs(28),
      color:      '#00ff44',
      fontFamily: 'monospace',
      fontStyle:  'bold',
    }).setOrigin(0.5);

    // Stats line: X / Y unlocked
    const am   = AchievementManager.getInstance();
    const all  = am.getAll();
    const done = all.filter(s => s.unlocked).length;
    this.add.text(cx, 62, `${done} / ${all.length} unlocked`, {
      fontSize:   this._fs(14),
      color:      '#557755',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Category tabs
    const TAB_Y        = 90;
    const tabCount     = ACHIEVEMENT_CATEGORIES.length;
    const tabW         = Math.floor((Math.min(width - 40, 700)) / tabCount);
    const tabStartX    = cx - (tabCount * tabW) / 2 + tabW / 2;

    for (let i = 0; i < ACHIEVEMENT_CATEGORIES.length; i++) {
      const cat    = ACHIEVEMENT_CATEGORIES[i];
      const active = cat === this._activeCategory;
      const tx     = tabStartX + i * tabW;
      this._makeTabButton(tx, TAB_Y, tabW - 4, cat, active);
    }

    // Content area
    const contentY = TAB_Y + 30;
    this._renderCategory(cx, contentY, this._activeCategory, height);

    // Back button
    this._makeButton(cx, height - (this._isMobile ? 40 : 34), 'BACK', () => {
      this.scene.start(this._returnTo);
    });
  }

  // ── Background ─────────────────────────────────────────────────────────────

  private _createBackground(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, PAL.bgDark);
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x1a2a1a, 0.25);
    const ts = 40;
    for (let x = 0; x < width; x += ts) { gfx.moveTo(x, 0); gfx.lineTo(x, height); }
    for (let y = 0; y < height; y += ts) { gfx.moveTo(0, y); gfx.lineTo(width, y); }
    gfx.strokePath();
  }

  // ── Tab buttons ───────────────────────────────────────────────────────────

  private _makeTabButton(
    x: number,
    y: number,
    w: number,
    category: AchievementCategory,
    active: boolean,
  ): void {
    const tabH        = this._isMobile ? 40 : 28;
    const fillColor   = active ? 0x003322 : 0x111111;
    const borderColor = active ? 0x00aa44 : 0x335533;
    const textColor   = active ? '#00ff44' : '#44aa44';

    const shortLabels: Record<AchievementCategory, string> = {
      'map-clear':     'Maps',
      'commander':     'Cmdr',
      'region':        'Regions',
      'tower-mastery': 'Towers',
      'economy':       'Economy',
      'combat':        'Combat',
      'misc':          'Misc',
    };

    const bg = this.add.rectangle(x, y, w, tabH, fillColor)
      .setStrokeStyle(active ? 2 : 1, borderColor)
      .setInteractive({ useHandCursor: !active });

    const label = this.add.text(x, y, shortLabels[category], {
      fontSize:   this._fs(11),
      color:      textColor,
      fontFamily: 'monospace',
      fontStyle:  active ? 'bold' : 'normal',
    }).setOrigin(0.5);

    if (!active) {
      bg.on('pointerover', () => { bg.setFillStyle(0x223322); label.setColor('#00ff44'); });
      bg.on('pointerout',  () => { bg.setFillStyle(fillColor); label.setColor(textColor); });
      bg.on('pointerup',   () => {
        this.scene.restart({
          returnTo: this._returnTo,
          category,
        } as AchievementsSceneData);
      });
    }
  }

  // ── Content ───────────────────────────────────────────────────────────────

  private _renderCategory(
    cx: number,
    startY: number,
    category: AchievementCategory,
    sceneHeight: number,
  ): void {
    const am     = AchievementManager.getInstance();
    const states = am.getAll().filter(s => s.def.category === category);

    const catLabel = this.add.text(cx, startY + 2, CATEGORY_LABELS[category], {
      fontSize:   this._fs(13),
      color:      '#557755',
      fontFamily: 'monospace',
      fontStyle:  'bold',
    }).setOrigin(0.5);

    let y = startY + 22;

    const container = this.add.container(0, 0);

    for (const state of states) {
      const { def, unlocked, current } = state;
      const isHidden = def.hidden && !unlocked;

      const bgColor     = unlocked ? 0x004400 : 0x111111;
      const borderColor = unlocked ? 0x00aa44 : 0x333333;

      const row = this.add.rectangle(cx, y + ROW_H / 2, PANEL_W, ROW_H, bgColor)
        .setStrokeStyle(2, borderColor);
      container.add(row);

      // Icon (left side)
      const iconText = isHidden ? '🔒' : def.icon;
      const icon = this.add.text(cx - PANEL_W / 2 + ROW_PAD_X + 12, y + ROW_H / 2, iconText, {
        fontSize: '20px', fontFamily: 'monospace',
      }).setOrigin(0.5);
      container.add(icon);

      // Title
      const titleStr = isHidden ? '???' : def.title;
      const titleColor = unlocked ? '#00ff44' : (isHidden ? '#444444' : '#aaaaaa');
      const titleTxt = this.add.text(cx - PANEL_W / 2 + ROW_PAD_X + 28, y + ROW_H / 2 - 16, titleStr, {
        fontSize:   this._fs(13),
        color:      titleColor,
        fontFamily: 'monospace',
        fontStyle:  'bold',
      }).setOrigin(0, 0.5);
      container.add(titleTxt);

      // Description
      const descStr = isHidden ? '???' : def.description;
      const desc = this.add.text(cx - PANEL_W / 2 + ROW_PAD_X + 28, y + ROW_H / 2 + 16, descStr, {
        fontSize:   this._fs(10),
        color:      '#666666',
        fontFamily: 'monospace',
        wordWrap:   { width: PANEL_W - ROW_PAD_X * 2 - 80 },
        maxLines:   2,
      }).setOrigin(0, 0.5);
      container.add(desc);

      // Right side: status or progress
      const badgeX = cx + PANEL_W / 2 - ROW_PAD_X - 30;
      const badgeY = y + ROW_H / 2;

      if (unlocked) {
        const done = this.add.text(badgeX, badgeY, '✓', {
          fontSize:   this._fs(20),
          color:      '#00ff44',
          fontFamily: 'monospace',
          fontStyle:  'bold',
        }).setOrigin(0.5);
        container.add(done);
      } else if (!isHidden && def.target > 1) {
        // Progress bar
        const barW   = 56;
        const barH   = 6;
        const pct    = Math.min(1, current / def.target);
        const barBg  = this.add.rectangle(badgeX, badgeY - 8, barW, barH, 0x222222);
        const barFg  = this.add.rectangle(badgeX - barW / 2 + (barW * pct) / 2, badgeY - 8, barW * pct, barH, 0x00aa44);
        const barTxt = this.add.text(badgeX, badgeY + 4,
          `${current.toLocaleString()} / ${def.target.toLocaleString()}`, {
            fontSize:   this._fs(9),
            color:      '#557755',
            fontFamily: 'monospace',
          }).setOrigin(0.5, 0);
        container.add([barBg, barFg, barTxt]);
      }

      y += ROW_H + ROW_GAP;
    }

    // Scroll mask if content overflows
    const contentH  = y - startY + 22;
    const visibleH  = sceneHeight - startY - 60;

    if (contentH > visibleH) {
      const maskGfx = this.make.graphics({});
      maskGfx.fillRect(0, startY, this.scale.width, visibleH);
      container.setMask(maskGfx.createGeometryMask());
      catLabel.setMask(maskGfx.createGeometryMask());

      const maxScroll  = contentH - visibleH;
      let scrollOffset = 0;

      const applyScroll = (delta: number): void => {
        scrollOffset = Phaser.Math.Clamp(scrollOffset + delta, 0, maxScroll);
        container.y = -scrollOffset;
        catLabel.y  = startY + 2 - scrollOffset;
      };

      this.input.on('wheel', (
        _p: Phaser.Input.Pointer,
        _over: Phaser.GameObjects.GameObject[],
        _dx: number,
        deltaY: number,
      ) => applyScroll(deltaY * 0.5));

      // Scroll arrows
      const arrowX = cx + PANEL_W / 2 + 22;
      const upA  = this.add.text(arrowX, startY + 10, '▲', { fontSize: this._fs(18), color: '#335533', fontFamily: 'monospace' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const downA = this.add.text(arrowX, startY + visibleH - 10, '▼', { fontSize: this._fs(18), color: '#335533', fontFamily: 'monospace' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      upA.on('pointerup',  () => applyScroll(-(ROW_H + ROW_GAP)));
      downA.on('pointerup', () => applyScroll(ROW_H + ROW_GAP));
      upA.on('pointerover',   () => upA.setColor('#55aa55'));
      upA.on('pointerout',    () => upA.setColor('#335533'));
      downA.on('pointerover', () => downA.setColor('#55aa55'));
      downA.on('pointerout',  () => downA.setColor('#335533'));
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private _makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const btnH = this._isMobile ? 44 : 36;
    const bg   = this.add.rectangle(x, y, 160, btnH, 0x111111)
      .setStrokeStyle(2, 0x335533)
      .setInteractive({ useHandCursor: true });
    const txt  = this.add.text(x, y, label, {
      fontSize:   this._fs(16),
      color:      '#44aa44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    bg.on('pointerover',  () => { bg.setFillStyle(0x223322); txt.setColor('#00ff44'); });
    bg.on('pointerout',   () => { bg.setFillStyle(0x111111); txt.setColor('#44aa44'); });
    bg.on('pointerup',    onClick);
  }
}
