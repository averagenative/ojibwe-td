import Phaser from 'phaser';
import { SaveManager } from '../meta/SaveManager';
import { UNLOCK_NODES } from '../meta/unlockDefs';
import {
  ALL_REGIONS,
  ALL_STAGES,
  getStageDef,
  SEASON_PALETTE,
} from '../data/stageDefs';
import type { RegionDef, StageDef } from '../data/stageDefs';

// ── Layout constants ──────────────────────────────────────────────────────────

const REGION_W    = 175;
const REGION_H    = 88;
const REGION_GAP  = 14;

const STAGE_W     = 280;
const STAGE_H     = 130;
const STAGE_GAP   = 20;

// Depth layers
const DEPTH_BG      = 0;
const DEPTH_REGION  = 10;
const DEPTH_STAGE   = 20;
const DEPTH_BUTTONS = 30;

// Tower affinity dot colours (matches TowerDef body colours)
const AFFINITY_COLORS: Record<string, number> = {
  cannon: 0x778888,
  frost:  0x3366aa,
  mortar: 0x996633,
  poison: 0x338844,
  tesla:  0xbbaa22,
  aura:   0xbb9922,
};

/**
 * MainMenuScene — title screen and region / stage selection.
 *
 * Two-level UI:
 *   Level 1 — region tiles (seasonal-themed) displayed in a horizontal row.
 *   Level 2 — when a region is selected its stages appear below the region row.
 *
 * Each stage tile shows: name, difficulty stars, tower affinity dots,
 * locked/unlocked state.
 */
export class MainMenuScene extends Phaser.Scene {
  private selectedRegionId = ALL_REGIONS[0].id;
  private selectedStageId  = ALL_STAGES[0].id;

  // Rendered region rectangles (keyed by regionId)
  private regionBgs: Map<string, Phaser.GameObjects.Rectangle> = new Map();

  // Stage tile container (destroyed & recreated on region change)
  private stageTiles: Phaser.GameObjects.GameObject[] = [];

  // Start-game button (needs to know the selected stage)
  private startBtn!:   Phaser.GameObjects.Rectangle;
  private startLabel!: Phaser.GameObjects.Text;

  // Y-positions (set in create based on screen height)
  private regionRowY = 0;
  private stageRowY  = 0;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Restore last-played stage from save (region + stage), then default if missing
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

    this.regionBgs.clear();
    this.stageTiles = [];

    // Vertical layout: title at top, regions in middle, stages just below regions,
    // then buttons at bottom.
    this.regionRowY = height / 2 - 60;
    this.stageRowY  = this.regionRowY + REGION_H / 2 + STAGE_H / 2 + 24;

    this.createBackground();
    this.createTitle(cx, height / 2);
    this.createRegionRow(cx);
    this.createStageRow(cx);   // initial render for selected region
    this.createButtons(cx, height);
    this.createFooter(cx, height);
  }

  // ── Background ─────────────────────────────────────────────────────────────

  private createBackground(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0a)
      .setDepth(DEPTH_BG);

    const gfx = this.add.graphics().setDepth(DEPTH_BG);
    gfx.lineStyle(1, 0x1a2a1a, 0.3);
    const ts = 40;
    for (let x = 0; x < width; x += ts) { gfx.moveTo(x, 0); gfx.lineTo(x, height); }
    for (let y = 0; y < height; y += ts) { gfx.moveTo(0, y); gfx.lineTo(width, y); }
    gfx.strokePath();
  }

  // ── Title ──────────────────────────────────────────────────────────────────

  private createTitle(cx: number, cy: number): void {
    // Glow shadow
    this.add.text(cx, cy - 260, 'OJIBWE TD', {
      fontSize: '68px', color: '#003300', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.4).setDepth(DEPTH_BG + 1);

    this.add.text(cx, cy - 260, 'OJIBWE TD', {
      fontSize: '68px', color: '#00ff44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_BG + 2);

    this.add.text(cx, cy - 194, 'Tower Defense', {
      fontSize: '22px', color: '#44aa44', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH_BG + 2);

    // Tower icons
    const icons = ['icon-cannon', 'icon-frost', 'icon-mortar', 'icon-poison', 'icon-tesla', 'icon-aura'];
    const iconSpacing = 60;
    const rowW = (icons.length - 1) * iconSpacing;
    icons.forEach((key, i) => {
      this.add.image(cx - rowW / 2 + i * iconSpacing, cy - 152, key)
        .setDisplaySize(36, 36).setAlpha(0.6).setDepth(DEPTH_BG + 2);
    });

    // Section header
    this.add.text(cx, this.regionRowY - REGION_H / 2 - 18, 'SELECT REGION', {
      fontSize: '13px', color: '#446644', fontFamily: 'monospace',
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

    const bg = this.add.rectangle(bx, by, REGION_W, REGION_H, pal.dim)
      .setStrokeStyle(1, pal.border, 0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_REGION);
    this.regionBgs.set(region.id, bg);

    // Ojibwe name (primary)
    this.add.text(bx, by - 22, region.name, {
      fontSize: '14px', color: pal.text, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_REGION + 1);

    // English translation (secondary, smaller)
    const parts = region.displayName.split('(');
    const english = parts[1] ? '(' + parts[1] : '';
    if (english) {
      this.add.text(bx, by - 4, english, {
        fontSize: '10px', color: '#556655', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(DEPTH_REGION + 1);
    }

    // Stage count
    const stageCount = region.stages.length;
    this.add.text(bx, by + 16, `${stageCount} stage${stageCount !== 1 ? 's' : ''}`, {
      fontSize: '10px', color: '#445544', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH_REGION + 1);

    // Season label
    this.add.text(bx, by + 30, region.seasonalTheme.toUpperCase(), {
      fontSize: '9px', color: '#334433', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH_REGION + 1);

    bg.on('pointerover', () => {
      bg.setFillStyle(pal.bg);
    });
    bg.on('pointerout', () => {
      if (this.selectedRegionId !== region.id) bg.setFillStyle(pal.dim);
    });
    bg.on('pointerup', () => {
      this.selectRegion(region.id);
    });
  }

  private highlightRegion(regionId: string): void {
    for (const [id, bg] of this.regionBgs) {
      const region = ALL_REGIONS.find(r => r.id === id)!;
      const pal    = SEASON_PALETTE[region.seasonalTheme];
      if (id === regionId) {
        bg.setFillStyle(pal.bg).setStrokeStyle(2, pal.border, 1.0);
      } else {
        bg.setFillStyle(pal.dim).setStrokeStyle(1, pal.border, 0.4);
      }
    }
  }

  private selectRegion(regionId: string): void {
    if (this.selectedRegionId === regionId) return;
    this.selectedRegionId = regionId;
    this.highlightRegion(regionId);

    // Default to first stage in the newly selected region
    const region = ALL_REGIONS.find(r => r.id === regionId);
    if (region && region.stages.length > 0) {
      this.selectedStageId = region.stages[0];
    }

    this.refreshStageTiles();
  }

  // ── Stage row ──────────────────────────────────────────────────────────────

  private createStageRow(cx: number): void {
    this.refreshStageTiles();

    this.add.text(cx, this.stageRowY - STAGE_H / 2 - 16, 'SELECT STAGE', {
      fontSize: '11px', color: '#446644', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH_STAGE);
  }

  private refreshStageTiles(): void {
    // Destroy previous stage tile objects
    for (const obj of this.stageTiles) {
      if (obj?.active) obj.destroy();
    }
    this.stageTiles = [];

    const { width } = this.scale;
    const cx = width / 2;
    const region = ALL_REGIONS.find(r => r.id === this.selectedRegionId);
    if (!region) return;

    const stages    = region.stages.map(id => ALL_STAGES.find(s => s.id === id)).filter(Boolean) as StageDef[];
    const n         = stages.length;
    const totalW    = n * STAGE_W + (n - 1) * STAGE_GAP;
    const startX    = cx - totalW / 2 + STAGE_W / 2;
    const save      = SaveManager.getInstance();

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const bx = startX + i * (STAGE_W + STAGE_GAP);

      // Determine lock state
      const isLocked = stage.unlockId !== null && !save.isUnlocked(stage.unlockId);

      const objs = this.buildStageTile(stage, bx, this.stageRowY, isLocked);
      this.stageTiles.push(...objs);
    }

    this.highlightStage(this.selectedStageId);
  }

  private buildStageTile(
    stage:    StageDef,
    bx:       number,
    by:       number,
    isLocked: boolean,
  ): Phaser.GameObjects.GameObject[] {
    const created: Phaser.GameObjects.GameObject[] = [];

    const bgColor = isLocked ? 0x0d0d0d : 0x111111;

    const bg = this.add.rectangle(bx, by, STAGE_W, STAGE_H, bgColor)
      .setStrokeStyle(2, isLocked ? 0x333333 : 0x225522)
      .setInteractive({ useHandCursor: !isLocked })
      .setDepth(DEPTH_STAGE)
      .setName('stage-bg');
    created.push(bg);

    // Stage name
    const nameColor = isLocked ? '#444444' : '#ffffff';
    const nameText = this.add.text(bx, by - STAGE_H / 2 + 18, stage.name, {
      fontSize: '16px', color: nameColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_STAGE + 1);
    created.push(nameText);

    // Difficulty stars
    const stars = this.buildDifficultyStars(bx, by - STAGE_H / 2 + 40, stage.difficulty, isLocked);
    created.push(...stars);

    // Description (short)
    const descColor = isLocked ? '#333333' : '#778877';
    const desc = this.add.text(bx, by - 4, stage.description, {
      fontSize: '10px', color: descColor, fontFamily: 'monospace',
      wordWrap: { width: STAGE_W - 24 }, align: 'center',
    }).setOrigin(0.5, 0).setDepth(DEPTH_STAGE + 1);
    created.push(desc);

    if (isLocked) {
      // Unlock cost
      const unlockNode = stage.unlockId
        ? UNLOCK_NODES.find(n => n.id === stage.unlockId)
        : null;
      const cost = unlockNode?.cost ?? stage.unlockCost;

      const lockLabel = this.add.text(bx, by + STAGE_H / 2 - 16,
        `LOCKED  ${cost} crystals`, {
          fontSize: '11px', color: '#664422', fontFamily: 'monospace', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(DEPTH_STAGE + 1);
      created.push(lockLabel);

      bg.on('pointerup', () => this.scene.start('MetaMenuScene'));
    } else {
      // Tower affinity dots (moved up to make room for best-wave record at bottom)
      const dots = this.buildAffinityDots(bx, by + STAGE_H / 2 - 36, stage.towerAffinities);
      created.push(...dots);

      // Best endless-wave record
      const bestWave = SaveManager.getInstance().getEndlessRecord(stage.pathFile);
      if (bestWave > 0) {
        const bestText = this.add.text(bx, by + STAGE_H / 2 - 14, `∞ Best: Wave ${bestWave}`, {
          fontSize: '11px', color: '#44aaff', fontFamily: 'monospace',
        }).setOrigin(0.5).setDepth(DEPTH_STAGE + 1);
        created.push(bestText);
      }

      // ENDLESS button (below the tile)
      const endlessBtnY = by + STAGE_H / 2 + 18;
      const endlessBg = this.add.rectangle(bx, endlessBtnY, 160, 26, 0x001133)
        .setStrokeStyle(1, 0x226688)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH_STAGE + 1);
      const endlessLabel = this.add.text(bx, endlessBtnY, '∞ ENDLESS', {
        fontSize: '12px', color: '#44aaff', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(DEPTH_STAGE + 2);
      created.push(endlessBg, endlessLabel);

      endlessBg.on('pointerover', () => { endlessBg.setFillStyle(0x002255); endlessLabel.setColor('#88ccff'); });
      endlessBg.on('pointerout',  () => { endlessBg.setFillStyle(0x001133); endlessLabel.setColor('#44aaff'); });
      endlessBg.on('pointerup',   () => {
        this.selectedStageId = stage.id;
        this.highlightStage(stage.id);
        this.scene.start('CommanderSelectScene', { stageId: stage.id, isEndless: true });
      });

      bg.on('pointerover', () => bg.setFillStyle(0x1a2a1a));
      bg.on('pointerout', () => {
        if (this.selectedStageId !== stage.id) bg.setFillStyle(0x111111);
      });
      bg.on('pointerup', () => {
        this.selectedStageId = stage.id;
        this.highlightStage(stage.id);
      });
    }

    return created;
  }

  /** Render 1–5 star difficulty rating. */
  private buildDifficultyStars(
    cx: number, cy: number, difficulty: number, isLocked: boolean,
  ): Phaser.GameObjects.Text[] {
    const filled = isLocked ? '#333333' : '#ffcc00';
    const empty  = isLocked ? '#222222' : '#334433';
    const stars: Phaser.GameObjects.Text[] = [];
    const totalW = 5 * 14;
    for (let i = 0; i < 5; i++) {
      const x = cx - totalW / 2 + i * 14 + 7;
      const t = this.add.text(x, cy, i < difficulty ? '★' : '☆', {
        fontSize: '13px', color: i < difficulty ? filled : empty, fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(DEPTH_STAGE + 1);
      stars.push(t);
    }
    return stars;
  }

  /** Render small coloured dots for each tower affinity. */
  private buildAffinityDots(
    cx: number, cy: number, affinities: string[],
  ): Phaser.GameObjects.GameObject[] {
    const objs: Phaser.GameObjects.GameObject[] = [];
    const dotR   = 5;
    const dotGap = 13;
    const totalW = affinities.length * dotGap - dotGap + dotR * 2;
    const label  = this.add.text(cx - totalW / 2 - 32, cy, 'best:', {
      fontSize: '9px', color: '#446644', fontFamily: 'monospace',
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
    const region = ALL_REGIONS.find(r => r.id === this.selectedRegionId);
    if (!region) return;
    const stages = region.stages.map(id => ALL_STAGES.find(s => s.id === id)).filter(Boolean) as StageDef[];

    // Only match Rectangles tagged 'stage-bg' (skips endless-button rects etc.)
    let stageIdx = 0;
    for (const obj of this.stageTiles) {
      if (obj instanceof Phaser.GameObjects.Rectangle && obj.name === 'stage-bg' && stageIdx < stages.length) {
        const stage = stages[stageIdx];
        const isSelected = stage.id === stageId;
        const isLocked = stage.unlockId !== null && !SaveManager.getInstance().isUnlocked(stage.unlockId);
        if (!isLocked) {
          obj.setFillStyle(isSelected ? 0x1a2a1a : 0x111111);
          obj.setStrokeStyle(2, isSelected ? 0x00ff44 : 0x225522);
        }
        stageIdx++;
      }
    }
  }

  // ── Buttons ────────────────────────────────────────────────────────────────

  private createButtons(cx: number, height: number): void {
    const btnY = height - 110;
    const btnW = 240;
    const btnH = 52;

    this.startBtn = this.add.rectangle(cx, btnY, btnW, btnH, 0x005500)
      .setStrokeStyle(2, 0x00ff44)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_BUTTONS);

    this.startLabel = this.add.text(cx, btnY, 'START GAME', {
      fontSize: '22px', color: '#00ff44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_BUTTONS + 1);

    this.startBtn.on('pointerover',  () => { this.startBtn.setFillStyle(0x007700); this.startLabel.setColor('#ffffff'); });
    this.startBtn.on('pointerout',   () => { this.startBtn.setFillStyle(0x005500); this.startLabel.setColor('#00ff44'); });
    this.startBtn.on('pointerdown',  () => this.startBtn.setFillStyle(0x003300));
    this.startBtn.on('pointerup',    () => {
      this.scene.start('CommanderSelectScene', { stageId: this.selectedStageId });
    });

    // Upgrades / meta button
    const metaBtnY = height - 52;
    const metaBg = this.add.rectangle(cx, metaBtnY, btnW, 42, 0x111133)
      .setStrokeStyle(2, 0x335577)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH_BUTTONS);
    const metaLabel = this.add.text(cx, metaBtnY, 'UPGRADES', {
      fontSize: '18px', color: '#5588aa', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH_BUTTONS + 1);

    metaBg.on('pointerover', () => metaLabel.setColor('#88ccff'));
    metaBg.on('pointerout',  () => metaLabel.setColor('#5588aa'));
    metaBg.on('pointerup',   () => this.scene.start('MetaMenuScene'));
  }

  private createFooter(cx: number, height: number): void {
    this.add.text(cx, height - 14, 'Solo Desktop · v0.1.0 · Placeholder Art · Inspired by Green TD', {
      fontSize: '11px', color: '#334433', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(DEPTH_BG + 1);
  }
}
