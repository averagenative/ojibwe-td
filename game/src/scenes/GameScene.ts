import Phaser from 'phaser';
import { Creep } from '../entities/Creep';
import type { CreepDiedPoisonedData } from '../entities/Creep';
import { Tower, ALL_TOWER_DEFS } from '../entities/towers/Tower';
import type { TowerDef } from '../entities/towers/Tower';
import { Projectile } from '../entities/Projectile';
import { WaveManager } from '../systems/WaveManager';
import { UpgradeManager } from '../systems/UpgradeManager';
import { calculateRunCurrency, calculateSellRefund } from '../systems/EconomyManager';
import { towerEffectiveDPS } from '../systems/BalanceCalc';
import { HUD } from '../ui/HUD';
import { TowerPanel, PANEL_HEIGHT } from '../ui/TowerPanel';
import { UpgradePanel, UPGRADE_PANEL_HEIGHT } from '../ui/UpgradePanel';
import type { MapData } from '../types/MapData';
import { TILE } from '../types/MapData';

const TOTAL_WAVES       = 20;
const HUD_HEIGHT        = 48; // must match HUD.ts
const DOT_SPREAD_RADIUS = 80; // px — Poison C spread radius

type GameState = 'pregame' | 'wave' | 'between' | 'over';

interface PixelWaypoint { x: number; y: number; }

export class GameScene extends Phaser.Scene {
  // ── data ──────────────────────────────────────────────────────────────────
  private mapData!: MapData;
  private waypoints: PixelWaypoint[] = [];

  // ── game state ────────────────────────────────────────────────────────────
  private lives       = 20;
  private gold        = 200;
  private currentWave = 0;
  private gameState: GameState = 'pregame';

  // ── speed ─────────────────────────────────────────────────────────────────
  /** 0 = paused, 1 = normal, 2 = double */
  private speedMultiplier = 1;

  // ── entities ──────────────────────────────────────────────────────────────
  private activeCreeps: Set<Creep>      = new Set();
  private towers:       Tower[]         = [];
  private projectiles:  Set<Projectile> = new Set();

  // ── systems ───────────────────────────────────────────────────────────────
  private waveManager!:    WaveManager;
  private upgradeManager!: UpgradeManager;

  // ── ui ────────────────────────────────────────────────────────────────────
  private hud!:          HUD;
  private upgradePanel!: UpgradePanel;

  // ── placement ─────────────────────────────────────────────────────────────
  private placementDef: TowerDef | null = null;
  private rangePreview!:    Phaser.GameObjects.Graphics;
  private placementMarker!: Phaser.GameObjects.Rectangle;

  // ── selection ─────────────────────────────────────────────────────────────
  private selectedTower: Tower | null = null;

  // ── debug overlay (dev builds only) ───────────────────────────────────────
  private debugOverlay: Phaser.GameObjects.Text | null = null;
  private debugVisible = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  preload(): void {
    this.load.json('map-01',       'data/maps/map-01.json');
    this.load.json('creep-types',  'data/creep-types.json');
    this.load.json('wave-defs',    'data/waves.json');
  }

  create(): void {
    this.mapData   = this.cache.json.get('map-01') as MapData;
    this.lives     = this.mapData.startingLives;
    this.gold      = this.mapData.startingGold;
    this.waypoints = this.buildPixelWaypoints();

    this.renderMap();

    // HUD (top strip)
    this.hud = new HUD(this, this.lives, this.gold);
    this.hud.setWave(0, TOTAL_WAVES);
    this.hud.createSpeedControls((mult) => this.onSpeedChange(mult));

    // Upgrade system
    this.upgradeManager = new UpgradeManager(
      () => this.towers,
      () => this.activeCreeps,
    );

    // Wave system
    const creepTypeDefs = this.cache.json.get('creep-types');
    const waveDefs      = this.cache.json.get('wave-defs');
    this.waveManager = new WaveManager(
      this, this.waypoints, this.activeCreeps, creepTypeDefs, waveDefs,
    );
    this.waveManager.on('wave-complete', this.onWaveComplete, this);

    this.events.on('creep-killed', (reward: number) => {
      this.gold += reward;
      this.hud.setGold(this.gold);
      this.upgradePanel?.refresh();
    });
    this.events.on('creep-escaped', () => {
      this.lives = Math.max(0, this.lives - 1);
      this.hud.setLives(this.lives);
      if (this.lives <= 0) this.triggerGameOver();
    });
    this.events.on('wave-bonus', (bonus: number) => {
      this.gold += bonus;
      this.hud.setGold(this.gold);
      this.upgradePanel?.refresh();
    });

    // ── Frost shatter drawback ────────────────────────────────────────────
    // When a creep that has shatterActive dies with DoT stacks, Creep.takeDamage
    // emits 'creep-died-poisoned' with isShattered=true BEFORE calling destroy().
    // The handler below checks that flag to suppress Poison C's spread mechanic.
    // (DoT timers are cleaned up naturally in Creep.destroy(), so no manual
    //  clearDoTs call is needed on death.)

    // ── Poison C: DoT spread on death ────────────────────────────────────
    this.events.on('creep-died-poisoned', (data: CreepDiedPoisonedData) => {
      if (data.isShattered) return; // Frost C prevents the spread
      if (!this.upgradeManager.hasPoisonSpread()) return;

      this.upgradeManager.spreadDot(
        data.x, data.y,
        data.dotDamage, data.dotTickMs, data.dotTicks,
        DOT_SPREAD_RADIUS,
      );
    });

    // Placement preview (follows mouse when in placement mode)
    this.rangePreview  = this.add.graphics().setDepth(9).setVisible(false);
    this.placementMarker = this.add.rectangle(
      0, 0, this.mapData.tileSize, this.mapData.tileSize, 0x00ff00, 0.2,
    ).setStrokeStyle(2, 0x00ff00, 0.8).setDepth(10).setVisible(false);

    // Tower panel (bottom strip — all 6 towers)
    new TowerPanel(this, ALL_TOWER_DEFS, (def) => this.enterPlacementMode(def), () => this.gold);

    // Upgrade panel (above tower panel — shown when a tower is selected)
    this.upgradePanel = new UpgradePanel(this, this.upgradeManager, () => this.gold);
    this.upgradePanel.onBuy = (cost) => {
      this.gold -= cost;
      this.hud.setGold(this.gold);
    };
    this.upgradePanel.onRespec = (refund) => {
      this.gold += refund;
      this.hud.setGold(this.gold);
    };

    // Next-wave button (right portion of HUD strip)
    this.hud.createNextWaveButton(() => this.startNextWave());
    this.hud.setNextWaveVisible(true, 1);

    // Input
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerdown', this.onPointerDown, this);

    // Debug overlay — dev builds only (stripped by Vite's dead-code elimination in prod)
    if (import.meta.env.DEV) {
      this.input.keyboard?.on('keydown-B', this.toggleDebugOverlay, this);
    }
  }

  update(_time: number, delta: number): void {
    if (this.speedMultiplier === 0) return; // paused

    const scaledDelta = delta * this.speedMultiplier;

    for (const creep of this.activeCreeps) {
      if (creep.active) creep.step(scaledDelta);
    }

    for (const tower of this.towers) {
      tower.step(scaledDelta);
    }

    for (const proj of this.projectiles) {
      if (proj.active) {
        proj.step(scaledDelta);
      } else {
        this.projectiles.delete(proj);
      }
    }

    this.updateAuras();

    if (this.placementDef) {
      this.updatePlacementPreview(this.input.activePointer);
    }

    if (import.meta.env.DEV && this.debugVisible) {
      this.refreshDebugOverlay();
    }
  }

  // ── speed ─────────────────────────────────────────────────────────────────

  private onSpeedChange(multiplier: number): void {
    this.speedMultiplier = multiplier;
    // Scale Phaser timers (spawn intervals, status-effect timers, etc.)
    this.time.timeScale = multiplier === 0 ? 0.001 : multiplier;
  }

  // ── map ───────────────────────────────────────────────────────────────────

  private buildPixelWaypoints(): PixelWaypoint[] {
    const ts = this.mapData.tileSize;
    return this.mapData.waypoints.map(wp => ({
      x: wp.col * ts + ts / 2,
      y: wp.row * ts + ts / 2,
    }));
  }

  private renderMap(): void {
    const { tileSize, cols, rows, tiles } = this.mapData;
    const gfx = this.add.graphics();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x    = col * tileSize;
        const y    = row * tileSize;
        const tile = tiles[row][col];

        if (tile === TILE.PATH) {
          gfx.fillStyle(0x2a2010, 1);
          gfx.fillRect(x, y, tileSize, tileSize);
          gfx.lineStyle(1, 0x3a3020, 0.5);
          gfx.strokeRect(x, y, tileSize, tileSize);
        } else {
          gfx.fillStyle(0x0d1a0d, 1);
          gfx.fillRect(x, y, tileSize, tileSize);
          gfx.lineStyle(1, 0x142014, 0.6);
          gfx.strokeRect(x, y, tileSize, tileSize);
        }
      }
    }

    const spawnY = this.waypoints[0].y;
    gfx.fillStyle(0x00ff44, 0.6);
    gfx.fillTriangle(0, spawnY - 8, 0, spawnY + 8, 12, spawnY);

    const exitWp = this.waypoints[this.waypoints.length - 1];
    gfx.fillStyle(0xff2222, 0.6);
    gfx.fillTriangle(
      this.scale.width - 12, exitWp.y - 8,
      this.scale.width - 12, exitWp.y + 8,
      this.scale.width, exitWp.y,
    );
  }

  // ── input ─────────────────────────────────────────────────────────────────

  private onPointerMove(ptr: Phaser.Input.Pointer): void {
    if (!this.placementDef) return;
    this.updatePlacementPreview(ptr);
  }

  private onPointerDown(ptr: Phaser.Input.Pointer): void {
    // Filter clicks in HUD strip (top) and bottom UI panels
    const bottomLimit = this.scale.height
      - PANEL_HEIGHT
      - (this.upgradePanel.isOpen() ? UPGRADE_PANEL_HEIGHT : 0);

    if (ptr.y < HUD_HEIGHT || ptr.y > bottomLimit) return;

    if (ptr.rightButtonDown()) {
      this.handleRightClick(ptr);
      return;
    }

    if (this.placementDef) {
      this.tryPlaceTower(ptr.x, ptr.y);
    } else {
      // Deselect any selected tower if clicking empty space.
      // Tower clicks are handled via tower's own 'pointerup' listener.
      this.deselectTower();
    }
  }

  private handleRightClick(ptr: Phaser.Input.Pointer): void {
    if (this.placementDef) {
      this.exitPlacementMode();
      return;
    }
    const tower = this.findTowerAt(ptr.x, ptr.y);
    if (tower) this.sellTower(tower);
  }

  // ── placement ─────────────────────────────────────────────────────────────

  private enterPlacementMode(def: TowerDef): void {
    this.placementDef = def;
    this.rangePreview.setVisible(true);
    this.placementMarker.setVisible(true);
    this.deselectTower();
  }

  private exitPlacementMode(): void {
    this.placementDef = null;
    this.rangePreview.setVisible(false);
    this.placementMarker.setVisible(false);
  }

  private updatePlacementPreview(ptr: Phaser.Input.Pointer): void {
    if (!this.placementDef) return;
    const { col, row } = this.worldToTile(ptr.x, ptr.y);
    const ts = this.mapData.tileSize;
    const cx = col * ts + ts / 2;
    const cy = row * ts + ts / 2;
    const valid = this.isBuildable(col, row) && !this.isTileOccupied(col, row);

    this.placementMarker.setPosition(cx, cy);
    this.placementMarker.setFillStyle(valid ? 0x00ff00 : 0xff0000, 0.2);
    this.placementMarker.setStrokeStyle(2, valid ? 0x00ff00 : 0xff0000, 0.8);

    this.rangePreview.clear();
    const col32 = valid ? 0x00ff88 : 0xff4444;
    this.rangePreview.lineStyle(1, col32, 0.4);
    this.rangePreview.fillStyle(col32, 0.05);
    this.rangePreview.strokeCircle(cx, cy, this.placementDef.range);
    this.rangePreview.fillCircle(cx, cy, this.placementDef.range);
  }

  private tryPlaceTower(worldX: number, worldY: number): void {
    if (!this.placementDef) return;
    const { col, row } = this.worldToTile(worldX, worldY);
    if (!this.isBuildable(col, row)) return;
    if (this.isTileOccupied(col, row)) return;
    if (this.gold < this.placementDef.cost) return;

    this.gold -= this.placementDef.cost;
    this.hud.setGold(this.gold);

    const tower = new Tower(
      this,
      col,
      row,
      this.mapData.tileSize,
      this.placementDef,
      () => this.activeCreeps,
      (proj) => this.projectiles.add(proj),
    );

    // Register with upgrade manager
    this.upgradeManager.registerTower(tower);

    tower.on('pointerup', () => this.selectTower(tower));
    this.towers.push(tower);
    this.exitPlacementMode();
  }

  // ── tower management ──────────────────────────────────────────────────────

  private selectTower(tower: Tower): void {
    if (this.placementDef) return;
    this.deselectTower();
    this.selectedTower = tower;
    tower.setRangeVisible(true);
    this.upgradePanel.showForTower(tower);
  }

  private deselectTower(): void {
    this.selectedTower?.setRangeVisible(false);
    this.selectedTower = null;
    this.upgradePanel.hide();
  }

  private sellTower(tower: Tower): void {
    // Refund includes base tower cost + upgrade investment, both at the sell rate.
    const upgradeSpent = this.upgradeManager.getState(tower)?.totalSpent ?? 0;
    const refund       = calculateSellRefund(tower.def.cost + upgradeSpent);
    this.gold += refund;
    this.hud.setGold(this.gold);

    if (this.selectedTower === tower) this.deselectTower();
    this.upgradeManager.removeTower(tower);
    this.towers = this.towers.filter(t => t !== tower);
    tower.sell();
  }

  private findTowerAt(worldX: number, worldY: number): Tower | null {
    const half = this.mapData.tileSize / 2;
    return this.towers.find(
      t => Math.abs(t.x - worldX) <= half && Math.abs(t.y - worldY) <= half,
    ) ?? null;
  }

  // ── tile helpers ──────────────────────────────────────────────────────────

  private worldToTile(worldX: number, worldY: number): { col: number; row: number } {
    const ts = this.mapData.tileSize;
    return { col: Math.floor(worldX / ts), row: Math.floor(worldY / ts) };
  }

  private isBuildable(col: number, row: number): boolean {
    const { cols, rows, tiles } = this.mapData;
    if (col < 0 || col >= cols || row < 0 || row >= rows) return false;
    return tiles[row][col] === TILE.BUILDABLE;
  }

  private isTileOccupied(col: number, row: number): boolean {
    return this.towers.some(t => t.tileCol === col && t.tileRow === row);
  }

  // ── wave management ───────────────────────────────────────────────────────

  private startNextWave(): void {
    if (this.gameState === 'over') return;
    this.currentWave++;
    this.gameState = 'wave';
    this.hud.setWave(this.currentWave, TOTAL_WAVES);
    this.hud.setNextWaveVisible(false, 0);
    this.waveManager.startWave(this.currentWave);
  }

  private onWaveComplete(waveNum: number): void {
    if (this.gameState === 'over') return;

    if (waveNum >= TOTAL_WAVES) {
      this.gameState = 'over';
      this.scene.start('GameOverScene', {
        wavesCompleted: TOTAL_WAVES,
        totalWaves:     TOTAL_WAVES,
        won:            true,
        runCurrency:    calculateRunCurrency(TOTAL_WAVES, TOTAL_WAVES, true),
      });
      return;
    }

    this.gameState = 'between';
    this.hud.setNextWaveVisible(true, this.currentWave + 1);
  }

  /**
   * Recalculate aura buffs every frame.
   *
   * Three types of buffs are propagated from Aura towers:
   *   1. Attack speed  (intervalMultiplier — lower = faster)
   *   2. Damage        (auraDamageMult — multiplicative)
   *   3. Range         (auraRangePct   — additive % bonus)
   *
   * Deep aura specialisation drawback (tier ≥ 3 on a path):
   *   - Speed spec:  non-combat towers (isAura) receive only 50% of the speed boost.
   *   - Damage spec: non-combat towers (isAura) receive only 50% of the damage boost.
   *   - Range spec:  aura towers themselves receive 0 range bonus.
   */
  private updateAuras(): void {
    // Per-frame maps: reset to neutral defaults
    const speedMult  = new Map<Tower, number>();
    const damageMult = new Map<Tower, number>();
    const rangePct   = new Map<Tower, number>();

    for (const t of this.towers) {
      speedMult.set(t,  1.0);
      damageMult.set(t, 1.0);
      rangePct.set(t,   0);
    }

    for (const aura of this.towers) {
      if (!aura.def.isAura) continue;

      const stats     = aura.upgStats;
      const auraRange = stats.range; // use upgraded range for aura reach
      const specType  = stats.auraSpecType;

      for (const tower of this.towers) {
        if (tower === aura) continue;

        const dx   = tower.x - aura.x;
        const dy   = tower.y - aura.y;
        if (Math.sqrt(dx * dx + dy * dy) > auraRange) continue;

        const isAuraTower = tower.def.isAura;

        // ── 1. Speed aura ──────────────────────────────────────────────────
        const rawSpeedMult = stats.auraIntervalMult;
        if (rawSpeedMult < 1.0) {
          // Deep speed spec: aura towers only get 50% of the speed bonus
          const effMult = (specType === 'speed' && isAuraTower)
            ? 1.0 - (1.0 - rawSpeedMult) * 0.5
            : rawSpeedMult;
          const cur = speedMult.get(tower) ?? 1.0;
          speedMult.set(tower, Math.min(cur, effMult)); // best = lowest
        }

        // ── 2. Damage aura ─────────────────────────────────────────────────
        const rawDamageMult = stats.auraDamageMult;
        if (rawDamageMult > 1.0) {
          // Deep damage spec: aura towers only get 50% of the damage bonus
          const effMult = (specType === 'damage' && isAuraTower)
            ? 1.0 + (rawDamageMult - 1.0) * 0.5
            : rawDamageMult;
          const cur = damageMult.get(tower) ?? 1.0;
          damageMult.set(tower, Math.max(cur, effMult)); // best = highest
        }

        // ── 3. Range aura ──────────────────────────────────────────────────
        const rawRangePct = stats.auraRangePct;
        if (rawRangePct > 0) {
          // Deep range spec: aura towers themselves receive 0 range bonus
          const effPct = (specType === 'range' && isAuraTower) ? 0 : rawRangePct;
          const cur = rangePct.get(tower) ?? 0;
          rangePct.set(tower, Math.max(cur, effPct)); // best = highest
        }
      }
    }

    // Apply all computed buffs
    for (const tower of this.towers) {
      tower.setIntervalMultiplier(speedMult.get(tower)  ?? 1.0);
      tower.setAuraDamageMult   (damageMult.get(tower)  ?? 1.0);
      tower.setAuraRangePct     (rangePct.get(tower)    ?? 0);
    }
  }

  // ── debug overlay ──────────────────────────────────────────────────────────

  private toggleDebugOverlay(): void {
    this.debugVisible = !this.debugVisible;
    if (this.debugVisible) {
      if (!this.debugOverlay) {
        this.debugOverlay = this.add.text(8, HUD_HEIGHT + 4, '', {
          fontSize:        '12px',
          color:           '#00ff88',
          backgroundColor: '#000000aa',
          padding:         { x: 4, y: 4 },
        }).setDepth(100);
      }
      this.debugOverlay.setVisible(true);
      this.refreshDebugOverlay();
    } else {
      this.debugOverlay?.setVisible(false);
    }
  }

  private refreshDebugOverlay(): void {
    if (!this.debugOverlay) return;

    const tower = this.selectedTower;
    if (!tower) {
      this.debugOverlay.setText('[B] Debug — select a tower to see DPS');
      return;
    }

    const state = this.upgradeManager.getState(tower) ?? {
      tiers: { A: 0, B: 0, C: 0 },
      locked: new Set<'A' | 'B' | 'C'>(),
      totalSpent: 0,
    };

    const dps = towerEffectiveDPS(tower.def, state, this.currentWave);

    // Nearest active creep to the selected tower
    let nearestHpStr = 'none';
    let minDist      = Infinity;
    for (const creep of this.activeCreeps) {
      if (!creep.active) continue;
      const dist = Math.hypot(creep.x - tower.x, creep.y - tower.y);
      if (dist < minDist) {
        minDist = dist;
        const hp = Math.round(creep.getHpRatio() * creep.maxHp);
        nearestHpStr = `${hp} / ${creep.maxHp}`;
      }
    }

    this.debugOverlay.setText(
      `[B] Debug\n` +
      `Tower : ${tower.def.name}\n` +
      `DPS   : ${dps.toFixed(1)}\n` +
      `Nearest creep HP: ${nearestHpStr}`,
    );
  }

  private triggerGameOver(): void {
    if (this.gameState === 'over') return;
    this.gameState = 'over';
    this.waveManager.cleanup();
    this.scene.start('GameOverScene', {
      wavesCompleted: this.currentWave,
      totalWaves:     TOTAL_WAVES,
      won:            false,
      runCurrency:    calculateRunCurrency(this.currentWave, TOTAL_WAVES, false),
    });
  }
}
