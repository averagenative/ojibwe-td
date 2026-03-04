import Phaser from 'phaser';
import { SaveManager } from '../meta/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { MobileManager } from '../systems/MobileManager';
import { SessionManager } from '../systems/SessionManager';
import type { AutoSave } from '../systems/SessionManager';
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
import { renderMoonRating } from '../ui/MoonRatingDisplay';
import { pickQuickPlay } from '../systems/QuickPlay';
import type { QuickPlaySelection } from '../systems/QuickPlay';

// ── Layout constants ──────────────────────────────────────────────────────────

const REGION_W    = 175;
const REGION_H    = 88;
const REGION_GAP  = 14;

const STAGE_W     = 280;
const STAGE_H     = 155;
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

// ── Seasonal card particle colours per theme ──────────────────────────────────
const SEASON_PARTICLE_COLORS: Record<string, number> = {
  winter: 0xd8eeff,
  autumn: 0xcc6600,
  spring: 0x88dd44,
  summer: 0xffcc44,
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

// ── Particle types ────────────────────────────────────────────────────────────

interface EmberParticle {
  gfx: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface CardParticle {
  gfx: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  cx: number;
  cy: number;
  hw: number;
  hh: number;
}

interface ParallaxLayer {
  gfx: Phaser.GameObjects.Graphics;
  freq: number;
  amp: number;
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
  /** Detected autosave on enter — drives Resume Game button visibility. */
  private _autoSave: AutoSave | null = null;

  private regionRowY = 0;
  private stageRowY  = 0;

  // ── Mobile layout state ────────────────────────────────────────────────────
  private _isMobile   = false;
  /** Active region card height (scaled for mobile). */
  private _regionH    = REGION_H;
  /** Active stage card height (scaled for mobile). */
  private _stageH     = STAGE_H;

  // ── Animated background state ──────────────────────────────────────────────
  private _parallaxLayers: ParallaxLayer[] = [];
  private _embers: EmberParticle[] = [];
  private _cardParticles: CardParticle[] = [];

  // ── Transition guard ───────────────────────────────────────────────────────
  private _fading = false;

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
    this._fading = false;
    // Fade in from black for smooth scene transition
    this.cameras.main.fadeIn(350, 0, 0, 0);

    // Start menu music (no-op if the file buffer isn't loaded yet).
    AudioManager.getInstance().startMusicTrack('music-menu');

    // Mobile layout sizing — resolved once per scene create().
    this._isMobile = MobileManager.getInstance().isMobile();
    this._regionH  = this._isMobile ? 108 : REGION_H;
    this._stageH   = this._isMobile ? 195 : STAGE_H;

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
    this._parallaxLayers = [];
    this._embers = [];
    this._cardParticles = [];

    // Vertical flow: [logo] → label → regions → label → stage → buttons → footer
    // Reserve extra vertical space at top when logo image is available.
    const hasLogo   = this.textures.exists('logo');
    const logoMaxH  = this._isMobile ? 70 : 120;
    const logoAreaH = hasLogo ? logoMaxH + (this._isMobile ? 10 : 15) : 0;

    const labelY = TOP_PAD + logoAreaH;
    this.regionRowY = labelY + 16 + this._regionH / 2;
    this.stageRowY  = this.regionRowY + this._regionH / 2 + 28 + this._stageH / 2;

    // Logo centre y: middle of logo area, or original text position when no logo.
    const logoTitleY = hasLogo ? TOP_PAD + logoAreaH / 2 : labelY - 14;

    this._audioPanel = null;

    // Detect mid-run autosave so Resume button can be shown.
    this._autoSave = SessionManager.getInstance().load();

    this.createBackground();
    this._buildParallaxLayers();
    this._buildTimeOfDayTint();
    this._buildLogoTitle(cx, logoTitleY);
    this._buildEmbers();
    this.createHeader(cx, labelY);
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

  // ── Animated parallax layers ───────────────────────────────────────────────

  private _buildParallaxLayers(): void {
    const { width, height } = this.scale;

    // Layer 0: distant mountains — slow, large amplitude
    const mtn = this.add.graphics().setDepth(DEPTH_BG + 1);
    mtn.fillStyle(0x071109, 1);
    mtn.beginPath();
    mtn.moveTo(-60, height);
    for (let i = 0; i <= 10; i++) {
      const x = -60 + (width + 120) * i / 10;
      const isPeak = i % 2 === 1;
      const peakVar = isPeak ? Math.sin(i * 1.7) * 38 : 0;
      const y = isPeak ? height * 0.42 + peakVar : height * 0.57;
      mtn.lineTo(x, y);
    }
    mtn.lineTo(width + 60, height);
    mtn.closePath();
    mtn.fillPath();
    this._parallaxLayers.push({ gfx: mtn, freq: 0.00007, amp: 25 });

    // Layer 1: midground treeline — medium speed
    const trees = this.add.graphics().setDepth(DEPTH_BG + 2);
    trees.fillStyle(0x091509, 1);
    trees.beginPath();
    trees.moveTo(-60, height);
    for (let i = 0; i <= 14; i++) {
      const x = -60 + (width + 120) * i / 14;
      const isPeak = i % 2 === 0;
      const treeH = isPeak ? height * 0.49 + Math.sin(i * 2.3) * 22 : height * 0.60;
      trees.lineTo(x, treeH);
    }
    trees.lineTo(width + 60, height);
    trees.closePath();
    trees.fillPath();
    this._parallaxLayers.push({ gfx: trees, freq: 0.00010, amp: 18 });

    // Layer 2: foreground brush — faster, smallest amplitude
    const brush = this.add.graphics().setDepth(DEPTH_BG + 3);
    brush.fillStyle(0x0b1a09, 1);
    brush.beginPath();
    brush.moveTo(-60, height);
    for (let i = 0; i <= 18; i++) {
      const x = -60 + (width + 120) * i / 18;
      const isPeak = i % 3 !== 0;
      const bH = isPeak ? height * 0.57 + Math.sin(i * 1.1) * 14 : height * 0.64;
      brush.lineTo(x, bH);
    }
    brush.lineTo(width + 60, height);
    brush.closePath();
    brush.fillPath();
    this._parallaxLayers.push({ gfx: brush, freq: 0.00013, amp: 12 });
  }

  // ── Time-of-day tint ──────────────────────────────────────────────────────

  private _buildTimeOfDayTint(): void {
    const { width, height } = this.scale;
    const hour = new Date().getHours();

    let color: number;
    let alpha: number;

    if (hour >= 6 && hour < 9) {
      // Morning: cool blue-pink
      color = 0x0d1a2a;
      alpha = 0.07;
    } else if (hour >= 9 && hour < 17) {
      // Daytime: no tint (bright)
      return;
    } else if (hour >= 17 && hour < 20) {
      // Sunset: warm amber (default look)
      color = 0x2a1205;
      alpha = 0.10;
    } else {
      // Night: deep blue
      color = 0x050818;
      alpha = 0.12;
    }

    this.add.rectangle(width / 2, height / 2, width, height, color)
      .setAlpha(alpha)
      .setDepth(DEPTH_BG + 0.5);
  }

  // ── Logo title with breathing glow ────────────────────────────────────────

  private _buildLogoTitle(cx: number, y: number): void {
    const glowGfx = this.add.graphics().setDepth(DEPTH_BG + 4);
    glowGfx.fillStyle(0x2a1205, 0.45);

    if (this.textures.exists('logo')) {
      // ── Logo image ─────────────────────────────────────────────────────────
      const logoImg = this.add.image(cx, y, 'logo')
        .setOrigin(0.5)
        .setDepth(DEPTH_BG + 5);

      // Scale: respect Math.min(width * 0.7, 512) formula but cap height so
      // the layout isn't disrupted.
      const { width } = this.scale;
      const aspect   = logoImg.width / logoImg.height;          // natural texture ratio
      const maxH     = this._isMobile ? 70 : 120;
      const desiredW = Math.min(width * 0.7, 512);
      const finalH   = Math.min(desiredW / aspect, maxH);
      const finalW   = finalH * aspect;
      logoImg.setDisplaySize(finalW, finalH);

      // Subtle warm glow behind the logo
      glowGfx.fillEllipse(cx, y, finalW + 60, finalH * 0.45);

      // Breathing pulse
      this.tweens.add({
        targets:  [logoImg, glowGfx],
        alpha:    { from: 0.85, to: 1.0 },
        duration: 2800,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });
    } else {
      // ── Fallback: text title (shown when logo.png is missing) ──────────────
      glowGfx.fillEllipse(cx, y, 300, 24);

      const logoText = this.add.text(cx, y, 'OJIBWE TD', {
        fontSize:   this._fs(14),
        color:      PAL.gold,
        fontFamily: PAL.fontTitle,
        fontStyle:  'bold',
      }).setOrigin(0.5).setDepth(DEPTH_BG + 5);

      this.tweens.add({
        targets:  [logoText, glowGfx],
        alpha:    { from: 0.7, to: 1.0 },
        duration: 2800,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });
    }
  }

  // ── Floating embers / fireflies ───────────────────────────────────────────

  private _buildEmbers(): void {
    const { width, height } = this.scale;
    const count = this._isMobile ? 4 : 6;

    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(20, width - 20);
      const y = Phaser.Math.Between(Math.round(height * 0.3), height - 40);
      const radius = 1 + Math.random() * 2;
      // Alternate between warm ember and cool firefly
      const color = i % 2 === 0 ? 0xff8822 : 0x88ee44;
      const initAlpha = 0.25 + Math.random() * 0.35;

      const gfx = this.add.circle(x, y, radius, color)
        .setAlpha(initAlpha)
        .setDepth(DEPTH_BG + 4);

      const speed = 0.014 + Math.random() * 0.018;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;

      this._embers.push({
        gfx,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * 3000,
        maxLife: 3500 + Math.random() * 2500,
      });
    }
  }

  // ── Header (label) ────────────────────────────────────────────────────────

  private createHeader(cx: number, labelY: number): void {
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
      this._spawnCardSeasonParticles(region, bx, this.regionRowY);
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

  // ── Seasonal card particles ────────────────────────────────────────────────

  private _spawnCardSeasonParticles(region: RegionDef, cx: number, cy: number): void {
    const hw = REGION_W / 2 - 4;
    const hh = this._regionH / 2 - 4;
    const count = this._isMobile ? 2 : 3;
    const color = SEASON_PARTICLE_COLORS[region.seasonalTheme] ?? 0xffffff;

    let baseVx = 0;
    let baseVy = 0;
    switch (region.seasonalTheme) {
      case 'winter': baseVy =  0.018; break;  // snow drifts down
      case 'autumn': baseVx =  0.015; baseVy = 0.012; break;  // leaves fall sideways
      case 'spring': baseVy = -0.015; break;  // pollen rises
      case 'summer': baseVy = -0.012; break;  // fireflies drift up
    }

    for (let i = 0; i < count; i++) {
      const startX = cx + (Math.random() - 0.5) * hw * 1.6;
      const startY = cy + (Math.random() - 0.5) * hh * 1.6;
      const radius = 0.8 + Math.random() * 0.8;

      const gfx = this.add.circle(startX, startY, radius, color)
        .setAlpha(0.5 + Math.random() * 0.25)
        .setDepth(DEPTH_REGION - 0.5);

      this._cardParticles.push({
        gfx,
        vx: baseVx + (Math.random() - 0.5) * 0.005,
        vy: baseVy + (Math.random() - 0.5) * 0.005,
        life: Math.random() * 2000,
        maxLife: 2200 + Math.random() * 1500,
        cx, cy, hw, hh,
      });
    }
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
        const moonR   = this._isMobile ? 6 : 5;
        const moonGap = this._isMobile ? 16 : 13;
        const moonContainer = renderMoonRating(
          this, bx, by - sh / 2 + 53, bestMoons, 5,
          { radius: moonR, gap: moonGap, depth: DEPTH_STAGE + 1 },
        );
        created.push(moonContainer);
      }
    }

    const descColor = isLocked ? PAL.textLockedDim : PAL.textDesc;
    // Anchor description to a fixed distance from card top (just below stars/moons).
    // This prevents it from growing down into the affinity-dot row.
    const descY = by - sh / 2 + 72;
    const desc = this.add.text(bx, descY, stage.description, {
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

      panel.zone.on('pointerup', () => this._go('MetaMenuScene'));
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
        this._go('CommanderSelectScene', { stageId: stage.id, isEndless: true });
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
    const btnW = this._isMobile ? 280 : 240;
    const btnH = this._isMobile ? 60  : 48;

    // ── Quick Play button sizing ────────────────────────────────────────────
    // These constants drive both the layout math and the button rendering.
    const quickBtnH   = this._isMobile ? 44  : 38;  // meets 44px touch target on mobile
    const quickBtnW   = this._isMobile ? 240 : 200;
    const quickGap    = 6;   // px between START GAME bottom edge and QUICK PLAY top
    const quickPostGap = this._isMobile ? 10 : 8;   // px between QUICK PLAY and bottom row

    // ── Resume Game button (only shown when a save exists) ──────────────────
    const hasResume   = !!this._autoSave && this._autoSave.currentWave > 0;
    const resumeBtnH  = this._isMobile ? 52 : 44;  // meets 44 px touch target
    const resumeGap   = 10;

    // Calculate vertical positions — when a resume button is present the
    // two-button block is positioned together so neither overlaps stage cards.
    // maxStartY is tightened to leave room for quick play + bottom rows.
    let startY: number;
    let resumeY = 0;

    if (hasResume) {
      const blockTopGap = this._isMobile ? 20 : 28; // gap from stageBottom to top of first button
      const blockTopY   = stageBottom + blockTopGap;
      resumeY = blockTopY + resumeBtnH / 2;
      startY  = resumeY + resumeBtnH / 2 + resumeGap + btnH / 2;
      // Cap to ensure quick play + bottom rows still fit.
      const maxStartY = height - (this._isMobile ? 174 : 148);
      if (startY > maxStartY) {
        startY  = maxStartY;
        resumeY = startY - btnH / 2 - resumeGap - resumeBtnH / 2;
      }
    } else {
      // Tightened cap: quick play + bottom rows must fit below startY.
      startY = Math.min(stageBottom + 44, height - (this._isMobile ? 174 : 148));
    }

    if (hasResume && this._autoSave) {
      const save = this._autoSave;
      const resumeW = this._isMobile ? 280 : 240;
      const resumeP = makePanel(this, cx, resumeY, resumeW, resumeBtnH, DEPTH_BUTTONS);
      fillPanel(resumeP, R, 0x0a2a10, PAL.borderActive, 2);

      this.add.text(cx, resumeY - 8, 'RESUME GAME', {
        fontSize: this._fs(18), color: '#aee86c', fontFamily: PAL.fontBody, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(DEPTH_BUTTONS + 1);

      this.add.text(cx, resumeY + 10, `Wave ${save.currentWave + 1}  ·  ${save.towers.length} towers`, {
        fontSize: this._fs(10), color: PAL.textMuted, fontFamily: PAL.fontBody,
      }).setOrigin(0.5).setDepth(DEPTH_BUTTONS + 1);

      resumeP.zone.on('pointerover', () => fillPanel(resumeP, R, 0x143a18, PAL.borderActive, 2));
      resumeP.zone.on('pointerout',  () => fillPanel(resumeP, R, 0x0a2a10, PAL.borderActive, 2));
      resumeP.zone.on('pointerdown', () => fillPanel(resumeP, R, 0x061a0a, PAL.borderActive, 2));
      resumeP.zone.on('pointerup',   () => {
        this._go('GameScene', {
          stageId:     save.stageId,
          commanderId: save.commanderId,
          mapId:       save.mapId,
          autoResume:  true,
        });
      });
    }

    // START GAME
    const startP = makePanel(this, cx, startY, btnW, btnH, DEPTH_BUTTONS);
    fillPanel(startP, R, PAL.bgStartBtn, PAL.borderActive, 2);
    const startLabel = this.add.text(cx, startY, hasResume ? 'START NEW RUN' : 'START GAME', {
      fontSize: this._fs(hasResume ? 18 : 22), color: PAL.accentGreen, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_BUTTONS + 1);

    startP.zone.on('pointerover',  () => {
      fillPanel(startP, R, PAL.bgStartBtnHover, PAL.borderActive, 2);
      startLabel.setColor('#ffffff');
      this.tweens.add({ targets: startLabel, scaleX: 1.06, scaleY: 1.06, duration: 100, ease: 'Back.easeOut' });
    });
    startP.zone.on('pointerout',   () => {
      fillPanel(startP, R, PAL.bgStartBtn, PAL.borderActive, 2);
      startLabel.setColor(PAL.accentGreen);
      this.tweens.add({ targets: startLabel, scaleX: 1.0, scaleY: 1.0, duration: 100, ease: 'Sine.easeOut' });
    });
    startP.zone.on('pointerdown',  () => fillPanel(startP, R, PAL.bgStartBtnPress, PAL.borderActive, 2));
    startP.zone.on('pointerup',    () => {
      if (hasResume) {
        this._showOverwriteConfirm(() => this._go('CommanderSelectScene', { stageId: this.selectedStageId }));
      } else {
        this._go('CommanderSelectScene', { stageId: this.selectedStageId });
      }
    });

    // ── QUICK PLAY button ──────────────────────────────────────────────────
    const quickPlayY = startY + btnH / 2 + quickGap + quickBtnH / 2;
    const quickP = makePanel(this, cx, quickPlayY, quickBtnW, quickBtnH, DEPTH_BUTTONS);
    fillPanel(quickP, R, 0x1a1100, PAL.goldN, 2);
    const quickLabel = this.add.text(cx, quickPlayY, 'QUICK PLAY', {
      fontSize: this._fs(this._isMobile ? 16 : 17),
      color: '#d4a840',
      fontFamily: PAL.fontBody,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH_BUTTONS + 1);

    quickP.zone.on('pointerover',  () => {
      fillPanel(quickP, R, 0x2a1c00, PAL.goldN, 2);
      quickLabel.setColor('#f0c060');
      this.tweens.add({ targets: quickLabel, scaleX: 1.06, scaleY: 1.06, duration: 100, ease: 'Back.easeOut' });
    });
    quickP.zone.on('pointerout',   () => {
      fillPanel(quickP, R, 0x1a1100, PAL.goldN, 2);
      quickLabel.setColor('#d4a840');
      this.tweens.add({ targets: quickLabel, scaleX: 1.0, scaleY: 1.0, duration: 100, ease: 'Sine.easeOut' });
    });
    quickP.zone.on('pointerdown',  () => fillPanel(quickP, R, 0x0f0900, PAL.goldN, 2));
    quickP.zone.on('pointerup',    () => {
      const sel = pickQuickPlay(SaveManager.getInstance());
      if (hasResume) {
        this._showOverwriteConfirm(() => {
          this._showQuickPlaySplash(sel, () => {
            this._go('GameScene', {
              commanderId: sel.commanderId,
              stageId:     sel.stageId,
              mapId:       sel.mapId,
            });
          });
        });
      } else {
        this._showQuickPlaySplash(sel, () => {
          this._go('GameScene', {
            commanderId: sel.commanderId,
            stageId:     sel.stageId,
            mapId:       sel.mapId,
          });
        });
      }
    });

    // Bottom row: UPGRADES | CHALLENGES | CODEX
    const bottomBtnW = this._isMobile ? 120 : 100;
    const bottomBtnH = this._isMobile ? 48  : 38;
    const bottomBtnY = quickPlayY + quickBtnH / 2 + quickPostGap;
    const bottomGap  = 8;

    // UPGRADES
    const metaX = cx - bottomBtnW - bottomGap;
    const metaP = makePanel(this, metaX, bottomBtnY, bottomBtnW, bottomBtnH, DEPTH_BUTTONS);
    fillPanel(metaP, R, PAL.bgMetaBtn, PAL.borderMeta, 2);
    const metaLabel = this.add.text(metaX, bottomBtnY, 'UPGRADES', {
      fontSize: this._fs(15), color: PAL.accentBlue, fontFamily: PAL.fontBody,
    }).setOrigin(0.5).setDepth(DEPTH_BUTTONS + 1);

    metaP.zone.on('pointerover', () => {
      metaLabel.setColor(PAL.accentBlueLight);
      this.tweens.add({ targets: metaLabel, scaleX: 1.05, scaleY: 1.05, duration: 80, ease: 'Back.easeOut' });
    });
    metaP.zone.on('pointerout',  () => {
      metaLabel.setColor(PAL.accentBlue);
      this.tweens.add({ targets: metaLabel, scaleX: 1.0, scaleY: 1.0, duration: 80, ease: 'Sine.easeOut' });
    });
    metaP.zone.on('pointerup',   () => this._go('MetaMenuScene'));

    // CHALLENGES
    const chalX = cx;
    const chalP = makePanel(this, chalX, bottomBtnY, bottomBtnW, bottomBtnH, DEPTH_BUTTONS);
    fillPanel(chalP, R, PAL.bgEndlessBtn, PAL.borderEndless, 2);
    const chalLabel = this.add.text(chalX, bottomBtnY, 'CHALLENGES', {
      fontSize: this._fs(11), color: PAL.accentBlue, fontFamily: PAL.fontBody,
    }).setOrigin(0.5).setDepth(DEPTH_BUTTONS + 1);

    chalP.zone.on('pointerover', () => {
      chalLabel.setColor(PAL.accentBlueLight);
      this.tweens.add({ targets: chalLabel, scaleX: 1.05, scaleY: 1.05, duration: 80, ease: 'Back.easeOut' });
    });
    chalP.zone.on('pointerout',  () => {
      chalLabel.setColor(PAL.accentBlue);
      this.tweens.add({ targets: chalLabel, scaleX: 1.0, scaleY: 1.0, duration: 80, ease: 'Sine.easeOut' });
    });
    chalP.zone.on('pointerup',   () => this._go('ChallengeSelectScene'));

    // CODEX
    const codexX = cx + bottomBtnW + bottomGap;
    const codexP = makePanel(this, codexX, bottomBtnY, bottomBtnW, bottomBtnH, DEPTH_BUTTONS);
    fillPanel(codexP, R, PAL.bgPanel, PAL.borderCodex, 2);
    const codexLabel = this.add.text(codexX, bottomBtnY, 'CODEX', {
      fontSize: this._fs(15), color: PAL.textSecondary, fontFamily: PAL.fontBody,
    }).setOrigin(0.5).setDepth(DEPTH_BUTTONS + 1);

    codexP.zone.on('pointerover', () => {
      codexLabel.setColor(PAL.textPrimary);
      this.tweens.add({ targets: codexLabel, scaleX: 1.05, scaleY: 1.05, duration: 80, ease: 'Back.easeOut' });
    });
    codexP.zone.on('pointerout',  () => {
      codexLabel.setColor(PAL.textSecondary);
      this.tweens.add({ targets: codexLabel, scaleX: 1.0, scaleY: 1.0, duration: 80, ease: 'Sine.easeOut' });
    });
    codexP.zone.on('pointerup',   () => this._go('CodexScene', { returnTo: 'MainMenuScene' }));

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

    // ACHIEVEMENTS — third row, centered
    const achBtnY = bottomBtnY + bottomBtnH / 2 + (this._isMobile ? 16 : 14);
    const achBtnW = this._isMobile ? 140 : 120;
    const achBtnH = bottomBtnH;
    const achP = makePanel(this, cx, achBtnY, achBtnW, achBtnH, DEPTH_BUTTONS);
    fillPanel(achP, R, 0x001a00, 0x336633, 2);
    const achLabel = this.add.text(cx, achBtnY, '🏆 ACHIEVEMENTS', {
      fontSize: this._fs(10), color: '#55aa55', fontFamily: PAL.fontBody,
    }).setOrigin(0.5).setDepth(DEPTH_BUTTONS + 1);

    achP.zone.on('pointerover', () => {
      achLabel.setColor('#00ff44');
      achP.gfx.setAlpha(1.2);
      this.tweens.add({ targets: achLabel, scaleX: 1.05, scaleY: 1.05, duration: 80, ease: 'Back.easeOut' });
    });
    achP.zone.on('pointerout',  () => {
      achLabel.setColor('#55aa55');
      achP.gfx.setAlpha(1);
      this.tweens.add({ targets: achLabel, scaleX: 1.0, scaleY: 1.0, duration: 80, ease: 'Sine.easeOut' });
    });
    achP.zone.on('pointerup',   () => this._go('AchievementsScene', { returnTo: 'MainMenuScene' }));
  }

  // ── Overwrite confirmation dialog ──────────────────────────────────────────

  /**
   * Show a brief modal asking the player to confirm starting a new run when
   * a previous autosave exists. onConfirm is called if they choose to proceed.
   */
  private _showOverwriteConfirm(onConfirm: () => void): void {
    const { width, height } = this.scale;
    const cx = width  / 2;
    const cy = height / 2;

    const container = this.add.container(0, 0).setDepth(200);

    // Dark backdrop — clicking it dismisses.
    const backdrop = this.add.rectangle(cx, cy, width, height, 0x000000, 0.65)
      .setInteractive();
    container.add(backdrop);

    // Card.
    const cardW = this._isMobile ? 340 : 360;
    const cardH = this._isMobile ? 170 : 160;
    const card  = this.add.rectangle(cx, cy, cardW, cardH, PAL.bgPanel)
      .setStrokeStyle(2, PAL.borderDanger);
    container.add(card);

    // Title.
    const title = this.add.text(cx, cy - cardH / 2 + 28, 'Start a new run?', {
      fontSize: this._fs(18), color: '#ffffff',
      fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(title);

    // Sub-text.
    const sub = this.add.text(cx, cy - 8, 'Your saved run will be lost.', {
      fontSize: this._fs(12), color: PAL.textMuted, fontFamily: PAL.fontBody,
    }).setOrigin(0.5);
    container.add(sub);

    // CONTINUE button.
    const contBtnH = this._isMobile ? 48 : 40;
    const contBg = this.add.rectangle(cx - 70, cy + cardH / 2 - contBtnH / 2 - 10, 120, contBtnH, PAL.bgGiveUp)
      .setStrokeStyle(1, PAL.dangerN)
      .setInteractive({ useHandCursor: true });
    const contLabel = this.add.text(contBg.x, contBg.y, 'START FRESH', {
      fontSize: this._fs(11), color: PAL.danger, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(contBg);
    container.add(contLabel);

    contBg.on('pointerover', () => contBg.setFillStyle(PAL.bgGiveUpHover));
    contBg.on('pointerout',  () => contBg.setFillStyle(PAL.bgGiveUp));
    contBg.on('pointerup',   () => {
      container.destroy();
      SessionManager.getInstance().clear();
      onConfirm();
    });

    // CANCEL button.
    const cancelBtnH = this._isMobile ? 48 : 40;
    const cancelBg = this.add.rectangle(cx + 70, cy + cardH / 2 - cancelBtnH / 2 - 10, 120, cancelBtnH, PAL.bgPanel)
      .setStrokeStyle(1, PAL.borderNeutral)
      .setInteractive({ useHandCursor: true });
    const cancelLabel = this.add.text(cancelBg.x, cancelBg.y, 'CANCEL', {
      fontSize: this._fs(13), color: PAL.textSecondary, fontFamily: PAL.fontBody,
    }).setOrigin(0.5);
    container.add(cancelBg);
    container.add(cancelLabel);

    cancelBg.on('pointerover', () => cancelBg.setFillStyle(0x1a1a1a));
    cancelBg.on('pointerout',  () => cancelBg.setFillStyle(PAL.bgPanel));
    cancelBg.on('pointerup',   () => container.destroy());
    backdrop.on('pointerup',   () => container.destroy());
  }

  // ── Quick Play splash ──────────────────────────────────────────────────────

  /**
   * Show a brief auto-dismissing splash (750 ms) revealing which commander
   * and map were auto-selected, then call onDone to navigate.
   */
  private _showQuickPlaySplash(sel: QuickPlaySelection, onDone: () => void): void {
    const { width, height } = this.scale;
    const cx = width  / 2;
    const cy = height / 2;

    const container = this.add.container(0, 0).setDepth(250);

    // Semi-transparent backdrop.
    const backdrop = this.add.rectangle(cx, cy, width, height, 0x000000, 0.5)
      .setInteractive();
    container.add(backdrop);

    // Card.
    const cardW = this._isMobile ? 340 : 380;
    const cardH = this._isMobile ? 130 : 120;
    const card  = this.add.rectangle(cx, cy, cardW, cardH, 0x100d00)
      .setStrokeStyle(2, PAL.goldN);
    container.add(card);

    // Header label.
    const header = this.add.text(cx, cy - cardH / 2 + 20, 'QUICK PLAY', {
      fontSize: this._fs(13), color: '#d4a840', fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(header);

    // Commander line.
    const cmdLine = this.add.text(cx, cy - 8, `Commander: ${sel.commanderName}`, {
      fontSize: this._fs(16), color: PAL.textPrimary, fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(cmdLine);

    // Stage line.
    const mapLine = this.add.text(cx, cy + 20, `Map: ${sel.stageName}`, {
      fontSize: this._fs(13), color: PAL.textSecondary, fontFamily: PAL.fontBody,
    }).setOrigin(0.5);
    container.add(mapLine);

    // Auto-dismiss after 750 ms.
    this.time.delayedCall(750, () => {
      if (container.active) container.destroy();
      onDone();
    });
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

  // ── Frame update ────────────────────────────────────────────────────────────

  update(time: number, _delta: number): void {
    this._stepParallax(time);
    this._stepEmbers(_delta);
    this._stepCardParticles(_delta);
  }

  private _stepParallax(time: number): void {
    for (const layer of this._parallaxLayers) {
      layer.gfx.setX(Math.sin(time * layer.freq) * layer.amp);
    }
  }

  private _stepEmbers(delta: number): void {
    const { width, height } = this.scale;
    for (const e of this._embers) {
      if (!e.gfx.active) continue;
      e.gfx.x += e.vx * delta;
      e.gfx.y += e.vy * delta;
      e.life += delta;

      // Fade in → hold → fade out over lifetime
      const t = e.life / e.maxLife;
      const fadeAlpha = t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1.0;
      e.gfx.setAlpha(fadeAlpha * 0.55);

      // Reset when lifetime expires or drifts off-screen
      if (e.life >= e.maxLife || e.gfx.y < -10 || e.gfx.x < -20 || e.gfx.x > width + 20) {
        e.gfx.setPosition(
          Phaser.Math.Between(20, width - 20),
          height - Phaser.Math.Between(10, 60),
        );
        e.life = 0;
        e.maxLife = 3500 + Math.random() * 2500;
      }
    }
  }

  private _stepCardParticles(delta: number): void {
    for (const p of this._cardParticles) {
      if (!p.gfx.active) continue;
      p.gfx.x += p.vx * delta;
      p.gfx.y += p.vy * delta;
      p.life += delta;

      // Fade in → hold → fade out
      const t = p.life / p.maxLife;
      const fadeAlpha = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1.0;
      p.gfx.setAlpha(fadeAlpha * 0.55);

      // Respawn within card bounds when expired
      if (p.life >= p.maxLife) {
        p.gfx.setPosition(
          p.cx + (Math.random() - 0.5) * p.hw * 1.6,
          p.cy + (Math.random() - 0.5) * p.hh * 1.6,
        );
        p.life = 0;
        p.maxLife = 2200 + Math.random() * 1500;
      }
    }
  }

  // ── Transition helper ──────────────────────────────────────────────────────

  private _go(key: string, data?: object): void {
    if (this._fading) return;
    this._fading = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(key, data);
    });
  }

  // ── Lifecycle cleanup ────────────────────────────────────────────────────

  shutdown(): void {
    for (const layer of this._parallaxLayers) {
      if (layer.gfx.active) layer.gfx.destroy();
    }
    this._parallaxLayers = [];

    for (const e of this._embers) {
      if (e.gfx.active) e.gfx.destroy();
    }
    this._embers = [];

    for (const p of this._cardParticles) {
      if (p.gfx.active) p.gfx.destroy();
    }
    this._cardParticles = [];
  }
}
