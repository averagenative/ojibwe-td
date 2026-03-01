import Phaser from 'phaser';
import { SaveManager } from '../meta/SaveManager';
import { ALL_REGIONS, ALL_STAGES, getStagesForRegion, SEASON_COLORS, SEASON_BORDER_COLORS } from '../data/stageDefs';
import type { RegionDef, StageDef } from '../data/stageDefs';
import { getStageUnlockNode } from '../meta/unlockDefs';

// ── Layout constants ──────────────────────────────────────────────────────────

const REGION_CARD_W  = 240;
const REGION_CARD_H  = 100;
const REGION_CARD_GAP = 16;

const STAGE_CARD_W  = 260;
const STAGE_CARD_H  = 150;
const STAGE_CARD_GAP = 16;

// Path thumbnail waypoints for each stage (mirrors public/data/maps JSON waypoints)
const STAGE_WAYPOINTS: Record<string, Array<{ col: number; row: number }>> = {
  'zaagaiganing-01': [
    { col: 0, row: 4 }, { col: 8, row: 4 }, { col: 8, row: 13 },
    { col: 16, row: 13 }, { col: 16, row: 4 }, { col: 24, row: 4 },
    { col: 24, row: 13 }, { col: 33, row: 13 },
  ],
  'mashkiig-01': [
    { col: 0, row: 2 }, { col: 26, row: 2 }, { col: 26, row: 6 },
    { col: 6, row: 6 }, { col: 6, row: 10 }, { col: 26, row: 10 },
    { col: 26, row: 14 }, { col: 6, row: 14 }, { col: 6, row: 16 },
    { col: 33, row: 16 },
  ],
  'mitigomizh-01': [
    { col: 0, row: 6 }, { col: 30, row: 6 }, { col: 30, row: 12 },
    { col: 2, row: 12 }, { col: 2, row: 16 }, { col: 33, row: 16 },
  ],
  'biboon-aki-01': [
    { col: 0, row: 3 }, { col: 24, row: 3 }, { col: 24, row: 9 },
    { col: 8, row: 9 }, { col: 8, row: 15 }, { col: 33, row: 15 },
  ],
};

const TOWER_ABBREV: Record<string, string> = {
  cannon: 'CN', frost: 'FR', mortar: 'MT',
  poison: 'PO', tesla: 'TE', aura: 'AU',
};

const TOWER_COLORS: Record<string, number> = {
  cannon: 0xdd6622, frost: 0x44aaff, mortar: 0xaaaa22,
  poison: 0x44cc44, tesla: 0xcc88ff, aura: 0xffcc44,
};

export class MainMenuScene extends Phaser.Scene {
  private selectedRegionId = 'zaagaiganing';
  private selectedStageId  = 'zaagaiganing-01';
  private regionCardBgs: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private stageAreaObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Restore last played stage from save
    const lastStage = SaveManager.getInstance().getLastPlayedStage();
    if (lastStage) {
      const stage = ALL_STAGES.find(s => s.id === lastStage);
      if (stage) {
        this.selectedStageId  = lastStage;
        this.selectedRegionId = stage.regionId;
      }
    }

    this.createBackground();
    this.createTitle(cx);
    this.createRegionRow(cx);
    this.buildStageArea(cx);
    this.createButtons(cx, height);
    this.createFooter(cx, height);
  }

  // ── Background ───────────────────────────────────────────────────────────

  private createBackground(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0a);
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x1a2a1a, 0.4);
    const ts = 40;
    for (let x = 0; x < width; x += ts) { gfx.moveTo(x, 0); gfx.lineTo(x, height); }
    for (let y = 0; y < height; y += ts) { gfx.moveTo(0, y); gfx.lineTo(width, y); }
    gfx.strokePath();
  }

  // ── Title ────────────────────────────────────────────────────────────────

  private createTitle(cx: number): void {
    this.add.text(cx, 44, 'OJIBWE TD', {
      fontSize: '64px', color: '#005500', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.4);
    this.add.text(cx, 44, 'OJIBWE TD', {
      fontSize: '64px', color: '#00ff44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(cx, 96, 'Tower Defense', {
      fontSize: '20px', color: '#44aa44', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const icons = ['icon-cannon','icon-frost','icon-mortar','icon-poison','icon-tesla','icon-aura'];
    const spacing = 56;
    const rowW = (icons.length - 1) * spacing;
    icons.forEach((key, i) => {
      this.add.image(cx - rowW / 2 + i * spacing, 128, key).setDisplaySize(34, 34).setAlpha(0.65);
    });
  }

  // ── Region row ───────────────────────────────────────────────────────────

  private createRegionRow(cx: number): void {
    const save   = SaveManager.getInstance();
    const totalW = ALL_REGIONS.length * REGION_CARD_W + (ALL_REGIONS.length - 1) * REGION_CARD_GAP;
    const startX = cx - totalW / 2 + REGION_CARD_W / 2;
    const rowY   = 218;

    this.add.text(cx, rowY - REGION_CARD_H / 2 - 14, 'SELECT REGION', {
      fontSize: '12px', color: '#445544', fontFamily: 'monospace',
    }).setOrigin(0.5);

    for (let i = 0; i < ALL_REGIONS.length; i++) {
      const region = ALL_REGIONS[i];
      const bx = startX + i * (REGION_CARD_W + REGION_CARD_GAP);
      const stages     = getStagesForRegion(region.id);
      const allLocked  = stages.length > 0 && stages.every(s => !!s.unlockId && !save.isUnlocked(s.unlockId));
      this.buildRegionCard(region, bx, rowY, allLocked);
    }

    this.highlightRegionCard(this.selectedRegionId);
  }

  private buildRegionCard(region: RegionDef, bx: number, by: number, allLocked: boolean): void {
    const theme  = region.seasonalTheme;
    const bgCol  = SEASON_COLORS[theme];
    const borCol = SEASON_BORDER_COLORS[theme];

    const bg = this.add.rectangle(bx, by, REGION_CARD_W, REGION_CARD_H, bgCol)
      .setStrokeStyle(2, borCol)
      .setInteractive({ useHandCursor: true });
    this.regionCardBgs.set(region.id, bg);

    // Ojibwe name (English translation on first line)
    this.add.text(bx, by - 24, `${region.name}`, {
      fontSize: '15px', color: allLocked ? '#555555' : '#ffffff',
      fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(bx, by - 5, `(${region.nameEn})`, {
      fontSize: '11px', color: allLocked ? '#333333' : '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const seasonLabels: Record<string, string> = {
      summer: '#44aa44', spring: '#66cc66', autumn: '#cc8844', winter: '#88aacc',
    };
    this.add.text(bx, by + 16, region.seasonalTheme.toUpperCase(), {
      fontSize: '10px', fontStyle: 'bold',
      color: allLocked ? '#333333' : (seasonLabels[region.seasonalTheme] ?? '#888888'),
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    if (allLocked) {
      this.add.text(bx, by + 34, 'LOCKED', {
        fontSize: '10px', color: '#553322', fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    bg.on('pointerover', () => bg.setStrokeStyle(3, allLocked ? 0x664422 : 0xffffff));
    bg.on('pointerout',  () => this.highlightRegionCard(this.selectedRegionId));
    bg.on('pointerup',   () => {
      if (allLocked) { this.scene.start('MetaMenuScene'); return; }
      this.selectedRegionId = region.id;
      this.highlightRegionCard(region.id);
      // Default to first unlocked stage in the region
      const stages = getStagesForRegion(region.id);
      const save   = SaveManager.getInstance();
      const first  = stages.find(s => !s.unlockId || save.isUnlocked(s.unlockId)) ?? stages[0];
      this.selectedStageId = first.id;
      this.rebuildStageArea();
    });
  }

  private highlightRegionCard(selectedId: string): void {
    for (const [id, bg] of this.regionCardBgs) {
      const sel    = id === selectedId;
      const region = ALL_REGIONS.find(r => r.id === id)!;
      bg.setStrokeStyle(sel ? 3 : 2, sel ? SEASON_BORDER_COLORS[region.seasonalTheme] : 0x333333);
      bg.setFillStyle(sel ? SEASON_COLORS[region.seasonalTheme] : 0x0d0d0d);
    }
  }

  // ── Stage area ───────────────────────────────────────────────────────────

  private rebuildStageArea(): void {
    for (const obj of this.stageAreaObjects) obj.destroy();
    this.stageAreaObjects = [];
    this.buildStageArea(this.scale.width / 2);
  }

  private buildStageArea(cx: number): void {
    const stages = getStagesForRegion(this.selectedRegionId);
    const save   = SaveManager.getInstance();
    const totalW = stages.length * STAGE_CARD_W + (stages.length - 1) * STAGE_CARD_GAP;
    const startX = cx - totalW / 2 + STAGE_CARD_W / 2;
    const cardY  = 410;

    const lbl = this.add.text(cx, cardY - STAGE_CARD_H / 2 - 14, 'SELECT STAGE', {
      fontSize: '12px', color: '#445544', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.stageAreaObjects.push(lbl);

    for (let i = 0; i < stages.length; i++) {
      const stage    = stages[i];
      const bx       = startX + i * (STAGE_CARD_W + STAGE_CARD_GAP);
      const isLocked = !!stage.unlockId && !save.isUnlocked(stage.unlockId);
      this.buildStageCard(stage, bx, cardY, isLocked);
    }
  }

  private buildStageCard(stage: StageDef, bx: number, by: number, isLocked: boolean): void {
    const region  = ALL_REGIONS.find(r => r.id === stage.regionId)!;
    const isSelected = stage.id === this.selectedStageId;
    const bgCol   = isLocked ? 0x111111 : SEASON_COLORS[region.seasonalTheme];
    const borBase = isLocked ? 0x333333 : SEASON_BORDER_COLORS[region.seasonalTheme];
    const borCol  = isSelected && !isLocked ? 0x00ff44 : borBase;

    const bg = this.add.rectangle(bx, by, STAGE_CARD_W, STAGE_CARD_H, bgCol)
      .setStrokeStyle(isSelected && !isLocked ? 3 : 2, borCol)
      .setInteractive({ useHandCursor: true });
    this.stageAreaObjects.push(bg);

    // Stage name
    const nameT = this.add.text(bx, by - STAGE_CARD_H / 2 + 14, stage.name, {
      fontSize: '15px', color: isLocked ? '#555555' : '#ffffff',
      fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.stageAreaObjects.push(nameT);

    // Difficulty stars
    const stars  = '★'.repeat(stage.difficulty) + '☆'.repeat(5 - stage.difficulty);
    const starT  = this.add.text(bx, by - STAGE_CARD_H / 2 + 31, stars, {
      fontSize: '12px', color: isLocked ? '#333333' : '#ffcc44', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.stageAreaObjects.push(starT);

    // Path thumbnail
    const waypoints = STAGE_WAYPOINTS[stage.id] ?? [];
    if (waypoints.length > 1) {
      const thumbW  = STAGE_CARD_W - 24;
      const thumbH  = 46;
      const thumbCY = by - 4;
      const gfx     = this.add.graphics();
      gfx.lineStyle(2, isLocked ? 0x333322 : SEASON_BORDER_COLORS[region.seasonalTheme], isLocked ? 0.3 : 0.7);
      gfx.beginPath();
      const scX = thumbW / (32 * 40);
      const scY = thumbH / (18 * 40);
      for (let j = 0; j < waypoints.length; j++) {
        const wp = waypoints[j];
        const px = bx - thumbW / 2 + wp.col * 40 * scX;
        const py = thumbCY - thumbH / 2 + wp.row * 40 * scY;
        if (j === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py);
      }
      gfx.strokePath();
      const fw = waypoints[0];
      gfx.fillStyle(0x00ff44, isLocked ? 0.3 : 0.8);
      gfx.fillCircle(
        bx - thumbW / 2 + fw.col * 40 * scX,
        thumbCY - thumbH / 2 + fw.row * 40 * scY,
        3,
      );
      this.stageAreaObjects.push(gfx);
    }

    // Tower affinity badges
    const affinities = stage.towerAffinities;
    const badgeW     = 26;
    const badgeGap   = 4;
    const totalBadge = affinities.length * badgeW + (affinities.length - 1) * badgeGap;
    const affRowY    = by + STAGE_CARD_H / 2 - 24;
    for (let j = 0; j < affinities.length; j++) {
      const type = affinities[j];
      const bx2  = bx - totalBadge / 2 + j * (badgeW + badgeGap) + badgeW / 2;
      const col  = isLocked ? 0x333333 : (TOWER_COLORS[type] ?? 0x888888);
      const badge = this.add.rectangle(bx2, affRowY, badgeW, 16, col, isLocked ? 0.3 : 1)
        .setStrokeStyle(1, isLocked ? 0x444444 : col);
      const abbr = this.add.text(bx2, affRowY,
        TOWER_ABBREV[type] ?? type.slice(0, 2).toUpperCase(), {
          fontSize: '9px', color: isLocked ? '#444444' : '#ffffff', fontFamily: 'monospace',
        }).setOrigin(0.5);
      this.stageAreaObjects.push(badge, abbr);
    }

    if (isLocked) {
      const unlockNode = getStageUnlockNode(stage.id);
      const cost = unlockNode?.cost ?? stage.unlockCost;
      const lockT = this.add.text(bx, by + STAGE_CARD_H / 2 - 10, `LOCKED — ${cost} crystals`, {
        fontSize: '10px', color: '#664422', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.stageAreaObjects.push(lockT);
      bg.on('pointerup', () => this.scene.start('MetaMenuScene'));
    } else {
      bg.on('pointerover', () => bg.setStrokeStyle(3, 0xffffff));
      bg.on('pointerout',  () => bg.setStrokeStyle(isSelected ? 3 : 2, isSelected ? 0x00ff44 : borBase));
      bg.on('pointerup', () => {
        this.selectedStageId = stage.id;
        this.rebuildStageArea();
      });
    }
  }

  // ── Buttons ──────────────────────────────────────────────────────────────

  private createButtons(cx: number, height: number): void {
    const btnY = height - 96;

    const startBg = this.add.rectangle(cx, btnY, 260, 52, 0x005500)
      .setStrokeStyle(2, 0x00ff44)
      .setInteractive({ useHandCursor: true });
    const startLabel = this.add.text(cx, btnY, 'START GAME', {
      fontSize: '22px', color: '#00ff44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    startBg.on('pointerover',  () => { startBg.setFillStyle(0x007700); startLabel.setColor('#ffffff'); });
    startBg.on('pointerout',   () => { startBg.setFillStyle(0x005500); startLabel.setColor('#00ff44'); });
    startBg.on('pointerdown',  () => startBg.setFillStyle(0x003300));
    startBg.on('pointerup',    () => {
      this.scene.start('CommanderSelectScene', { stageId: this.selectedStageId });
    });

    const metaBg = this.add.rectangle(cx, btnY + 64, 260, 46, 0x111133)
      .setStrokeStyle(2, 0x335577)
      .setInteractive({ useHandCursor: true });
    const metaLabel = this.add.text(cx, btnY + 64, 'UPGRADES', {
      fontSize: '18px', color: '#5588aa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    metaBg.on('pointerover',  () => metaLabel.setColor('#88ccff'));
    metaBg.on('pointerout',   () => metaLabel.setColor('#5588aa'));
    metaBg.on('pointerup',    () => this.scene.start('MetaMenuScene'));
  }

  private createFooter(cx: number, height: number): void {
    this.add.text(cx, height - 20, 'Solo Desktop · v0.1.0 · Placeholder Art · Inspired by Green TD', {
      fontSize: '12px', color: '#334433', fontFamily: 'monospace',
    }).setOrigin(0.5);
  }
}
