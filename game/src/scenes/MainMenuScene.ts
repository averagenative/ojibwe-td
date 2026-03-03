import Phaser from 'phaser';
import { SaveManager } from '../meta/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { MobileManager } from '../systems/MobileManager';
import { UNLOCK_NODES } from '../meta/unlockDefs';
import { AudioSettingsPanel } from '../ui/AudioSettingsPanel';
import { ALL_CODEX_ENTRIES } from '../data/codexDefs';
import {
  ALL_REGIONS,
  ALL_STAGES,
  getStageDef,
  SEASON_PALETTE,
} from '../data/stageDefs';
import type { RegionDef, StageDef } from '../data/stageDefs';
import { PAL } from '../ui/palette';
import { moonSymbol } from '../systems/MoonRating';

// ── Layout constants ──────────────────────────────────────────────────────────

const REGION_W    = 175;
const REGION_H    = 88;
const REGION_GAP  = 14;

const STAGE_W     = 280;
const STAGE_H     = 130;
const STAGE_GAP   = 20;

const R           = 8;    // corner radius for all panels
const TOP_PAD     = 30;   // breathing room at top of canvas

// Depth layers
const DEPTH_BG      = 0;
const DEPTH_REGION  = 10;
const DEPTH_STAGE   = 20;
const DEPTH_BUTTONS = 30;

// Tower affinity dot colours (matches TowerDef body colours)
const AFFINITY_COLORS: Record<string, number> = {
  'rock-hurler': 0x886644,
  frost:         0x3366aa,
  poison:        0x338844,
  tesla:         0xbbaa22,
  aura:          0xbb9922,
  arrow:         0x8b6b3d,
};

// ── Rounded-panel helper ────────────────────────────────────────────────────

interface Panel {
  gfx: Phaser.GameObjects.Graphics;
  zone: Phaser.GameObjects.Zone;
  x: number; y: number; w: number; h: number;
}

function makePanel(
  scene: Phaser.Scene,
  x: number, y: number, w: number, h: number,
  depth: number, cursor = true,
): Panel {
  const gfx  = scene.add.graphics().setDepth(depth);
  const zone = scene.add.zone(x, y, w, h)
    .setInteractive({ useHandCursor: cursor })
    .setDepth(depth + 0.5);
  return { gfx, zone, x, y, w, h };
}

function fillPanel(
  p: Panel, r: number,
  fill: number, stroke: number, strokeW: number, strokeA = 1,
): void {
  p.gfx.clear();
  p.gfx.fillStyle(fill, 1);
  p.gfx.fillRoundedRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, r);
  if (strokeW > 0) {
    p.gfx.lineStyle(strokeW, stroke, strokeA);
    p.gfx.strokeRoundedRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, r);
  }
}

// ──────────────────────────────────────────────────────────────────────────────

/**
 * MainMenuScene — title screen and region / stage selection.
 */
export class MainMenuScene extends Phaser.Scene {
  private selectedRegionId = ALL_REGIONS[0].id;
  private selectedStageId  = ALL_STAGES[0].id;

  private regionPanels: Map<string, Panel> = new Map();
  private stagePanels:  Map<string, Panel> = new Map();
  private stageTiles:   Phaser.GameObjects.GameObject[] = [];

  private _audioPanel: AudioSettingsPanel | null = null;

  private regionRowY = 0;
  private stageRowY  = 0;

  // ── Mobile layout state ────────────────────────────────────────────────────
  private _isMobile   = false;
  /** Active region card height (scaled for mobile). */
  private _regionH    = REGION_H;
  /** Active stage card height (scaled for mobile). */
  private _stageH     = STAGE_H;

  /**
   * Returns a CSS font-size string scaled up by 1.35× on mobile.
   * Example: _fs(11) → '11px' on desktop, '15px' on mobile.
   */
  private _fs(size: number): string {
    const s = this._isMobile ? Math.round(size * 1.35) : size;
    return `${s}px`;
  }

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    // Start menu music (no-op if the file buffer isn't loaded yet).
    AudioManager.getInstance().startMusicTrack('music-menu');

    // Mobile layout sizing — resolved once per scene create().
    this._isMobile = MobileManager.getInstance().isMobile();
    this._regionH  = this._isMobile ? 108 : REGION_H;
    this._stageH   = this._isMobile ? 160 : STAGE_H;

    const { width, height } = this.scale;
    const cx = width / 2;

    // Restore last-played stage
    const save        = SaveManager.getInstance();
    const lastStage   = save.getLastPlayedStage();
    const lastStageDef = getStageDef(lastStage);
    if (lastStageDef) {
      this.selectedStageId  = lastStageDef.id;
      this.selectedRegionId = lastStageDef.regionId;
    } else {
      this.selectedRegionId = ALL_REGIONS[0].id;
      this.selectedStageId  = ALL_STAGES[0].id;
    }

    this.regionPanels.clear();
    this.stagePanels.clear();
    this.stageTiles = [];

    // Vertical flow: icons → label → regions → label → stage → buttons → footer
    const iconY  = TOP_PAD;
    const labelY = iconY + 28;
    this.regionRowY = labelY + 16 + this._regionH / 2;
    this.stageRowY  = this.regionRowY + this._regionH / 2 + 28 + this._stageH / 2;

    this._audioPanel = null;

    this.createBackground();
    this.createHeader(cx, iconY, labelY);
    this.createRegionRow(cx);
    this.createStageRow(cx);
    this.createButtons(cx, height);
    this.createFooter(cx, height);
    this.createAudioButton(width, height);
  }

  // ── Background ─────────────────────────────────────────────────────────────

  private createBackground(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, PAL.bgDark)
      .setDepth(DEPTH_BG);

    const gfx = this.add.graphics().setDepth(DEPTH_BG);
    gfx.lineStyle(1, 0x1a2a1a, 0.3);
    const ts = 40;
    for (let x = 0; x < width; x += ts) { gfx.moveTo(x, 0); gfx.lineTo(x, height); }
    for (let y = 0; y < height; y += ts) { gfx.moveTo(0, y); gfx.lineTo(width, y); }
    gfx.strokePath();
  }

  // ── Header (icons + label) ────────────────────────────────────────────────

  private createHeader(cx: number, iconY: number, labelY: number): void {
    const icons = ['icon-rock-hurler', 'icon-frost', 'icon-poison', 'icon-tesla', 'icon-aura', 'icon-arrow'];
    const iconSpacing = 52;
    const rowW = (icons.length - 1) * iconSpacing;
    icons.forEach((key, i) => {
      this.add.image(cx - rowW / 2 + i * iconSpacing, iconY, key)
        .setDisplaySize(28, 28).setAlpha(0.5).setDepth(DEPTH_BG + 2);
    });

    this.add.text(cx, labelY, 'SELECT REGION', {
      fontSize: this._fs(12), color: PAL.textMuted, fontFamily: PAL.fontBody,
    }).setOrigin(0.5).setDepth(DEPTH_REGION);
  }

  // ── Region row ─────────────────────────────────────────────────────────────

  private createRegionRow(cx: number): void {
    const n      = ALL_REGIONS.length;
    const totalW = n * REGION_W + (n - 1) * REGION_GAP;
    const startX = cx - totalW / 2 + REGION_W / 2;

    for (let i = 0; i < n; i++) {
      const region = ALL_REGIONS[i];
      const bx = startX + i * (REGION_W + REGION_GAP);
      this.buildRegionTile(region, bx, this.regionRowY);
    }

    this.highlightRegion(this.selectedRegionId);
  }

  private buildRegionTile(region: RegionDef, bx: number, by: number): void {
    const pal = SEASON_PALETTE[region.seasonalTheme];

    const rh = this._regionH;
    const panel = makePanel(this, bx, by, REGION_W, rh, DEPTH_REGION);
    fillPanel(panel, R, pal.dim, pal.border, 1, 0.5);
    this.regionPanels.set(region.id, panel);

    this.add.text(bx, by - rh * 0.25, region.name, {
      fontSize: this._fs(15), color: pal.text, fontFamily: PAL.fontBody, fontStyle: 'bold',
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true, stroke: false },
    }).setOrigin(0.5).setDepth(DEPTH_REGION + 1);

    const parts = region.displayName.split('(');
    const english = parts[1] ? '(' + parts[1] : '';
    if (english) {
      this.add.text(bx, by - rh * 0.04, english, {
        fontSize: this._fs(11), color: PAL.textSecondary, fontFamily: PAL.fontBody,
        shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true, stroke: false },
      }).setOrigin(0.5).setDepth(DEPTH_REGION + 1);
    }

    const stageCount = region.stages.length;
    this.add.text(bx, by + rh * 0.18, `${stageCount} stage${stageCount !== 1 ? 's' : ''}`, {
      fontSize: this._fs(11), color: PAL.textMuted, fontFamily: PAL.fontBody,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true, stroke: false },
    }).setOrigin(0.5).setDepth(DEPTH_REGION + 1);

    this.add.text(bx, by + rh * 0.34, region.seasonalTheme.toUpperCase(), {
      fontSize: this._fs(10), color: PAL.textMuted, fontFamily: PAL.fontBody,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true, stroke: false },
    }).setOrigin(0.5).setDepth(DEPTH_REGION + 1);

    panel.zone.on('pointerover', () => {
      const sel = this.selectedRegionId === region.id;
      fillPanel(panel, R, pal.bg, pal.border, sel ? 2 : 1, sel ? 1.0 : 0.6);
    });
    panel.zone.on('pointerout', () => {
      const sel = this.selectedRegionId === region.id;
      fillPanel(panel, R, sel ? pal.bg : pal.dim, pal.border, sel ? 2 : 1, sel ? 1.0 : 0.4);
    });
    panel.zone.on('pointerup', () => {
      this.selectRegion(region.id);
    });
  }

  private highlightRegion(regionId: string): void {
    for (const [id, panel] of this.regionPanels) {
      const region = ALL_REGIONS.find(r => r.id === id)!;
      const pal    = SEASON_PALETTE[region.seasonalTheme];
      // Rebuild panel dimensions to match current mobile height.
      panel.h = this._regionH;
      if (id === regionId) {
        fillPanel(panel, R, pal.bg, pal.border, 2, 1.0);
      } else {
        fillPanel(panel, R, pal.dim, pal.border, 1, 0.4);
      }
    }
  }

  private selectRegion(regionId: string): void {
    if (this.selectedRegionId === regionId) return;
    this.selectedRegionId = regionId;
    this.highlightRegion(regionId);

    const region = ALL_REGIONS.find(r => r.id === regionId);
    if (region && region.stages.length > 0) {
      this.selectedStageId = region.stages[0];
    }

    this.refreshStageTiles();
  }

  // ── Stage row ──────────────────────────────────────────────────────────────

  private createStageRow(cx: number): void {
    this.refreshStageTiles();

    this.add.text(cx, this.stageRowY - this._stageH / 2 - 16, 'SELECT STAGE', {
      fontSize: this._fs(12), color: PAL.textMuted, fontFamily: PAL.fontBody,
    }).setOrigin(0.5).setDepth(DEPTH_STAGE);
  }

  private refreshStageTiles(): void {
    for (const obj of this.stageTiles) {
      if (obj?.active) obj.destroy();
    }
    this.stageTiles = [];

    for (const panel of this.stagePanels.values()) {
      panel.gfx.destroy();
      panel.zone.destroy();
    }
    this.stagePanels.clear();

    const { width } = this.scale;
    const cx = width / 2;
    const region = ALL_REGIONS.find(r => r.id === this.selectedRegionId);
    if (!region) return;

    const stages = region.stages.map(id => ALL_STAGES.find(s => s.id === id)).filter(Boolean) as StageDef[];
    const n      = stages.length;
    const totalW = n * STAGE_W + (n - 1) * STAGE_GAP;
    const startX = cx - totalW / 2 + STAGE_W / 2;
    const save   = SaveManager.getInstance();

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const bx = startX + i * (STAGE_W + STAGE_GAP);
      const isLocked = stage.unlockId !== null && !save.isUnlocked(stage.unlockId);
      const objs = this.buildStageTile(stage, bx, this.stageRowY, isLocked);
      this.stageTiles.push(...objs);
    }

    this.highlightStage(this.selectedStageId);
  }

  private buildStageTile(
    stage: StageDef, bx: number, by: number, isLocked: boolean,
  ): Phaser.GameObjects.GameObject[] {
    const created: Phaser.GameObjects.GameObject[] = [];

    const bgColor = isLocked ? PAL.bgPanelLocked : PAL.bgPanel;
    const border  = isLocked ? PAL.borderLocked   : PAL.borderInactive;

    const sh = this._stageH;
    const panel = makePanel(this, bx, by, STAGE_W, sh, DEPTH_STAGE, !isLocked);
    fillPanel(panel, R, bgColor, border, 2);
    this.stagePanels.set(stage.id, panel);
    // don't push gfx/zone to created — handled by stagePanels cleanup

    const nameColor = isLocked ? PAL.textLocked : '#ffffff';
    const nameText = this.add.text(bx, by - sh / 2 + 18, stage.name, {
      fontSize: this._fs(16), color: nameColor, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_STAGE + 1);
    created.push(nameText);

    const stars = this.buildDifficultyStars(bx, by - sh / 2 + 40, stage.difficulty, isLocked);
    created.push(...stars);

    // Best moon rating row — only shown for unlocked stages that have been completed.
    if (!isLocked) {
      const bestMoons = SaveManager.getInstance().getStageMoons(stage.id);
      if (bestMoons > 0) {
        const moonRow = Array.from({ length: 5 }, (_, i) => moonSymbol(i, bestMoons)).join('');
        const moonText = this.add.text(bx, by - sh / 2 + 53, moonRow, {
          fontSize: this._fs(10),
          fontFamily: PAL.fontBody,
        }).setOrigin(0.5).setDepth(DEPTH_STAGE + 1);
        created.push(moonText);
      }
    }

    const descColor = isLocked ? PAL.textLockedDim : PAL.textDesc;
    const desc = this.add.text(bx, by - 4, stage.description, {
      fontSize: this._fs(10), color: descColor, fontFamily: PAL.fontBody,
      wordWrap: { width: STAGE_W - 24 }, align: 'center',
    }).setOrigin(0.5, 0).setDepth(DEPTH_STAGE + 1);
    created.push(desc);

    if (isLocked) {
      const unlockNode = stage.unlockId
        ? UNLOCK_NODES.find(n => n.id === stage.unlockId)
        : null;
      const cost = unlockNode?.cost ?? stage.unlockCost;

      const lockLabel = this.add.text(bx, by + sh / 2 - 16,
        `LOCKED  ${cost} crystals`, {
          fontSize: this._fs(11), color: PAL.textLockWarning, fontFamily: PAL.fontBody, fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(DEPTH_STAGE + 1);
      created.push(lockLabel);

      panel.zone.on('pointerup', () => this.scene.start('MetaMenuScene'));
    } else {
      const dots = this.buildAffinityDots(bx, by + sh / 2 - 36, stage.towerAffinities);
      created.push(...dots);

      const bestWave = SaveManager.getInstance().getEndlessRecord(stage.pathFile);
      if (bestWave > 0) {
        const bestText = this.add.text(bx, by + sh / 2 - 14, `∞ Best: Wave ${bestWave}`, {
          fontSize: this._fs(11), color: PAL.accentBlue, fontFamily: PAL.fontBody,
        }).setOrigin(0.5).setDepth(DEPTH_STAGE + 1);
        created.push(bestText);
      }

      // ENDLESS button — taller on mobile for better touch target
      const eBtnH = this._isMobile ? 36 : 26;
      const eBtnY = by + sh / 2 + (this._isMobile ? 22 : 18);
      const ePanel = makePanel(this, bx, eBtnY, 160, eBtnH, DEPTH_STAGE + 1);
      fillPanel(ePanel, R, PAL.bgEndlessBtn, PAL.borderEndless, 1);
      const eLabel = this.add.text(bx, eBtnY, '∞ ENDLESS', {
        fontSize: this._fs(12), color: PAL.accentBlue, fontFamily: PAL.fontBody, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(DEPTH_STAGE + 2);
      created.push(ePanel.gfx, ePanel.zone, eLabel);

      ePanel.zone.on('pointerover', () => { fillPanel(ePanel, R, PAL.bgEndlessBtnHover, PAL.borderEndless, 1); eLabel.setColor(PAL.accentBlueLight); });
      ePanel.zone.on('pointerout',  () => { fillPanel(ePanel, R, PAL.bgEndlessBtn, PAL.borderEndless, 1); eLabel.setColor(PAL.accentBlue); });
      ePanel.zone.on('pointerup',   () => {
        this.selectedStageId = stage.id;
        this.highlightStage(stage.id);
        this.scene.start('CommanderSelectScene', { stageId: stage.id, isEndless: true });
      });

      panel.zone.on('pointerover', () => fillPanel(panel, R, PAL.bgPanelHover, PAL.borderInactive, 2));
      panel.zone.on('pointerout', () => {
        if (this.selectedStageId !== stage.id) fillPanel(panel, R, PAL.bgPanel, PAL.borderInactive, 2);
      });
      panel.zone.on('pointerup', () => {
        this.selectedStageId = stage.id;
        this.highlightStage(stage.id);
      });
    }

    return created;
  }

  private buildDifficultyStars(
    cx: number, cy: number, difficulty: number, isLocked: boolean,
  ): Phaser.GameObjects.Text[] {
    const filled = isLocked ? PAL.textLockedDim : PAL.gold;
    const empty  = isLocked ? PAL.textLockedDim : PAL.textFaint;
    const stars: Phaser.GameObjects.Text[] = [];
    const starSize = this._isMobile ? 18 : 14;
    const totalW = 5 * starSize;
    for (let i = 0; i < 5; i++) {
      const x = cx - totalW / 2 + i * starSize + starSize / 2;
      const t = this.add.text(x, cy, i < difficulty ? '★' : '☆', {
        fontSize: this._fs(13), color: i < difficulty ? filled : empty, fontFamily: PAL.fontBody,
      }).setOrigin(0.5).setDepth(DEPTH_STAGE + 1);
      stars.push(t);
    }
    return stars;
  }

  private buildAffinityDots(
    cx: number, cy: number, affinities: string[],
  ): Phaser.GameObjects.GameObject[] {
    const objs: Phaser.GameObjects.GameObject[] = [];
    const dotR   = 5;
    const dotGap = 13;
    const totalW = affinities.length * dotGap - dotGap + dotR * 2;
    const label  = this.add.text(cx - totalW / 2 - 32, cy, 'best:', {
      fontSize: '9px', color: PAL.textDim, fontFamily: PAL.fontBody,
    }).setOrigin(0, 0.5).setDepth(DEPTH_STAGE + 1);
    objs.push(label);

    const gfx = this.add.graphics().setDepth(DEPTH_STAGE + 1);
    for (let i = 0; i < affinities.length; i++) {
      const color = AFFINITY_COLORS[affinities[i]] ?? 0x888888;
      const x = cx - totalW / 2 + i * dotGap + dotR;
      gfx.fillStyle(color, 0.8);
      gfx.fillCircle(x, cy, dotR);
    }
    objs.push(gfx);
    return objs;
  }

  private highlightStage(stageId: string): void {
    for (const [id, panel] of this.stagePanels) {
      const stage = ALL_STAGES.find(s => s.id === id);
      if (!stage) continue;
      const isLocked = stage.unlockId !== null && !SaveManager.getInstance().isUnlocked(stage.unlockId);
      if (!isLocked) {
        // Keep panel height in sync with current mobile state.
        panel.h = this._stageH;
        const sel = id === stageId;
        fillPanel(panel, R, sel ? PAL.bgPanelHover : PAL.bgPanel, sel ? PAL.borderActive : PAL.borderInactive, 2);
      }
    }
  }

  // ── Buttons ────────────────────────────────────────────────────────────────

  private createButtons(cx: number, height: number): void {
    const stageBottom = this.stageRowY + this._stageH / 2 + 36;
    // On mobile the stage cards are taller, so ensure the button fits.
    const btnY = Math.min(stageBottom + 44, height - (this._isMobile ? 130 : 110));
    const btnW = this._isMobile ? 280 : 240;
    const btnH = this._isMobile ? 60  : 48;

    // START GAME
    const startP = makePanel(this, cx, btnY, btnW, btnH, DEPTH_BUTTONS);
    fillPanel(startP, R, PAL.bgStartBtn, PAL.borderActive, 2);
    const startLabel = this.add.text(cx, btnY, 'START GAME', {
      fontSize: this._fs(22), color: PAL.accentGreen, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_BUTTONS + 1);

    startP.zone.on('pointerover',  () => { fillPanel(startP, R, PAL.bgStartBtnHover, PAL.borderActive, 2); startLabel.setColor('#ffffff'); });
    startP.zone.on('pointerout',   () => { fillPanel(startP, R, PAL.bgStartBtn, PAL.borderActive, 2); startLabel.setColor(PAL.accentGreen); });
    startP.zone.on('pointerdown',  () => fillPanel(startP, R, PAL.bgStartBtnPress, PAL.borderActive, 2));
    startP.zone.on('pointerup',    () => {
      this.scene.start('CommanderSelectScene', { stageId: this.selectedStageId });
    });

    // Bottom row: UPGRADES | CHALLENGES | CODEX
    const bottomBtnW = this._isMobile ? 120 : 100;
    const bottomBtnH = this._isMobile ? 48  : 38;
    const bottomBtnY = btnY + btnH / 2 + (this._isMobile ? 32 : 26);
    const bottomGap  = 8;

    // UPGRADES
    const metaX = cx - bottomBtnW - bottomGap;
    const metaP = makePanel(this, metaX, bottomBtnY, bottomBtnW, bottomBtnH, DEPTH_BUTTONS);
    fillPanel(metaP, R, PAL.bgMetaBtn, PAL.borderMeta, 2);
    const metaLabel = this.add.text(metaX, bottomBtnY, 'UPGRADES', {
      fontSize: this._fs(15), color: PAL.accentBlue, fontFamily: PAL.fontBody,
    }).setOrigin(0.5).setDepth(DEPTH_BUTTONS + 1);

    metaP.zone.on('pointerover', () => metaLabel.setColor(PAL.accentBlueLight));
    metaP.zone.on('pointerout',  () => metaLabel.setColor(PAL.accentBlue));
    metaP.zone.on('pointerup',   () => this.scene.start('MetaMenuScene'));

    // CHALLENGES
    const chalX = cx;
    const chalP = makePanel(this, chalX, bottomBtnY, bottomBtnW, bottomBtnH, DEPTH_BUTTONS);
    fillPanel(chalP, R, PAL.bgEndlessBtn, PAL.borderEndless, 2);
    const chalLabel = this.add.text(chalX, bottomBtnY, 'CHALLENGES', {
      fontSize: this._fs(13), color: PAL.accentBlue, fontFamily: PAL.fontBody,
    }).setOrigin(0.5).setDepth(DEPTH_BUTTONS + 1);

    chalP.zone.on('pointerover', () => chalLabel.setColor(PAL.accentBlueLight));
    chalP.zone.on('pointerout',  () => chalLabel.setColor(PAL.accentBlue));
    chalP.zone.on('pointerup',   () => this.scene.start('ChallengeSelectScene'));

    // CODEX
    const codexX = cx + bottomBtnW + bottomGap;
    const codexP = makePanel(this, codexX, bottomBtnY, bottomBtnW, bottomBtnH, DEPTH_BUTTONS);
    fillPanel(codexP, R, PAL.bgPanel, PAL.borderCodex, 2);
    const codexLabel = this.add.text(codexX, bottomBtnY, 'CODEX', {
      fontSize: this._fs(15), color: PAL.textSecondary, fontFamily: PAL.fontBody,
    }).setOrigin(0.5).setDepth(DEPTH_BUTTONS + 1);

    codexP.zone.on('pointerover', () => codexLabel.setColor(PAL.textPrimary));
    codexP.zone.on('pointerout',  () => codexLabel.setColor(PAL.textSecondary));
    codexP.zone.on('pointerup',   () => this.scene.start('CodexScene', { returnTo: 'MainMenuScene' }));

    // Notification badge — shows count of unlocked-but-unread codex entries
    const save = SaveManager.getInstance();
    const unreadCount = save.getUnreadCodexCount(ALL_CODEX_ENTRIES);
    if (unreadCount > 0) {
      const badgeX = codexX + bottomBtnW / 2 - 6;
      const badgeY = bottomBtnY - bottomBtnH / 2 + 6;
      this.add.circle(badgeX, badgeY, 10, PAL.dangerN).setDepth(DEPTH_BUTTONS + 2);
      this.add.text(badgeX, badgeY, `${unreadCount}`, {
        fontSize: '10px', color: '#ffffff', fontFamily: PAL.fontBody, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(DEPTH_BUTTONS + 3);
    }
  }

  private createAudioButton(width: number, height: number): void {
    const btnSize = this._isMobile ? 48 : 40;
    const pad     = 12;
    const bx      = width  - pad - btnSize / 2;
    const by      = height - pad - btnSize / 2;

    const bg = this.add.rectangle(bx, by, btnSize, btnSize, 0x222222)
      .setStrokeStyle(1, PAL.borderNeutral)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_BUTTONS);

    this.add.text(bx, by, '⚙', {
      fontSize:   this._isMobile ? '20px' : '16px',
      fontFamily: PAL.fontBody,
    }).setOrigin(0.5, 0.5).setDepth(DEPTH_BUTTONS + 1);

    bg.on('pointerover', () => bg.setFillStyle(0x333333));
    bg.on('pointerout',  () => bg.setFillStyle(0x222222));
    bg.on('pointerup',   () => {
      if (!this._audioPanel) {
        this._audioPanel = new AudioSettingsPanel(this);
      }
      if (this._audioPanel.isVisible()) {
        this._audioPanel.hide();
      } else {
        this._audioPanel.show();
      }
    });
  }

  private createFooter(cx: number, height: number): void {
    this.add.text(cx, height - 14, 'v0.1.0 · Inspired by Green TD', {
      fontSize: this._fs(11), color: PAL.textFaint, fontFamily: PAL.fontBody,
    }).setOrigin(0.5).setDepth(DEPTH_BG + 1);
  }
}
