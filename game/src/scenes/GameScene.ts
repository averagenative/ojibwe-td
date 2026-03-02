import Phaser from 'phaser';
import { Creep } from '../entities/Creep';
import type { CreepDiedPoisonedData, BossKilledData } from '../entities/Creep';
import { Tower, ALL_TOWER_DEFS } from '../entities/towers/Tower';
import type { TowerDef } from '../entities/towers/Tower';
import { Projectile } from '../entities/Projectile';
import { WaveManager } from '../systems/WaveManager';
import type { CreepKilledData } from '../systems/WaveManager';
import { UpgradeManager } from '../systems/UpgradeManager';
import { OfferManager } from '../systems/OfferManager';
import { calculateRunCurrency, calculateSellRefund } from '../systems/EconomyManager';
import { towerEffectiveDPS } from '../systems/BalanceCalc';
import { HUD } from '../ui/HUD';
import { TowerPanel, PANEL_HEIGHT } from '../ui/TowerPanel';
import { UpgradePanel, UPGRADE_PANEL_HEIGHT } from '../ui/UpgradePanel';
import { BossOfferPanel } from '../ui/BossOfferPanel';
import { BehaviorPanel, BEHAVIOR_PANEL_HEIGHT } from '../ui/BehaviorPanel';
import type { MapData } from '../types/MapData';
import { TILE } from '../types/MapData';
import { getCommanderDef, defaultCommanderRunState } from '../data/commanderDefs';
import type { CommanderDef, CommanderRunState, AbilityContext } from '../data/commanderDefs';
import { getStageDef, getStageByPathFile, getRegionDef } from '../data/stageDefs';
import type { StageDef } from '../data/stageDefs';
import { SaveManager } from '../meta/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { renderTerrain } from '../systems/TerrainRenderer';
import { VignetteManager } from '../systems/VignetteManager';
import { VignetteOverlay } from '../ui/VignetteOverlay';
import { TriggerType } from '../data/vignetteDefs';
import { PAL } from '../ui/palette';

const DEFAULT_TOTAL_WAVES = 20;
const HUD_HEIGHT          = 48; // must match HUD.ts
const DOT_SPREAD_RADIUS   = 80; // px — Poison C spread radius

type GameState = 'pregame' | 'wave' | 'between' | 'over';

interface PixelWaypoint { x: number; y: number; }

export class GameScene extends Phaser.Scene {
  // ── data ──────────────────────────────────────────────────────────────────
  private mapData!: MapData;
  private waypoints: PixelWaypoint[] = [];

  // ── selected stage / map (set via init()) ────────────────────────────────
  private selectedStageId = 'zaagaiganing-01';
  private selectedMapId   = 'map-01';
  /** Resolved StageDef for the current run (null if stage unknown). */
  private activeStageDef: StageDef | null = null;
  /** Total wave count for this run — derived from StageDef.waveCount. */
  private totalWaves = DEFAULT_TOTAL_WAVES;

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
  private offerManager!:   OfferManager;

  // ── ui ────────────────────────────────────────────────────────────────────
  private hud!:            HUD;
  private upgradePanel!:   UpgradePanel;
  private behaviorPanel!:  BehaviorPanel;

  // ── placement ─────────────────────────────────────────────────────────────
  private placementDef: TowerDef | null = null;
  private rangePreview!:    Phaser.GameObjects.Graphics;
  private placementMarker!: Phaser.GameObjects.Rectangle;

  // ── selection ─────────────────────────────────────────────────────────────
  private selectedTower: Tower | null = null;

  // ── boss offer ────────────────────────────────────────────────────────────
  /** Non-null while a boss offer panel is visible (blocks map pointer events). */
  private bossOfferPanel: BossOfferPanel | null = null;

  // ── endless mode ──────────────────────────────────────────────────────────
  /** True when the player chose endless mode for this run. */
  private isEndlessMode = false;

  // ── commander ────────────────────────────────────────────────────────────
  private commanderDef: CommanderDef | null = null;
  private commanderState: CommanderRunState | null = null;
  private selectedCommanderId = 'nokomis';

  // ── audio ─────────────────────────────────────────────────────────────────
  private audioManager?: AudioManager;

  // ── narrative ───────────────────────────────────────────────────────────
  private vignetteManager!: VignetteManager;
  private vignetteOverlay!: VignetteOverlay;
  /** Boss key from a boss-killed event, queued for the next between-wave window. */
  private pendingBossKillKey: string | null = null;

  // ── debug overlay (dev builds only) ───────────────────────────────────────
  private debugOverlay: Phaser.GameObjects.Text | null = null;
  private debugVisible = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  /** Called by Phaser before preload() — captures scene-start data and resets state. */
  init(data?: { commanderId?: string; stageId?: string; mapId?: string; isEndless?: boolean }): void {
    this.selectedCommanderId = data?.commanderId ?? 'nokomis';
    this.isEndlessMode       = data?.isEndless   ?? false;

    // Resolve stage: prefer stageId, fall back to mapId (backward compat), then default.
    if (data?.stageId) {
      const stage = getStageDef(data.stageId);
      this.activeStageDef    = stage ?? null;
      this.selectedStageId   = data.stageId;
      this.selectedMapId     = stage?.pathFile ?? data.mapId ?? 'map-01';
    } else if (data?.mapId) {
      const stage = getStageByPathFile(data.mapId);
      this.activeStageDef    = stage ?? null;
      this.selectedStageId   = stage?.id ?? 'zaagaiganing-01';
      this.selectedMapId     = data.mapId;
    } else {
      this.activeStageDef    = getStageDef('zaagaiganing-01') ?? null;
      this.selectedStageId   = 'zaagaiganing-01';
      this.selectedMapId     = 'map-01';
    }

    this.totalWaves = this.activeStageDef?.waveCount ?? DEFAULT_TOTAL_WAVES;

    // Persist last-played stage for retry continuity.
    SaveManager.getInstance().setLastPlayedStage(this.selectedStageId);

    // Reset all mutable state so re-starting with a different map or commander is clean.
    this.activeCreeps    = new Set();
    this.towers          = [];
    this.projectiles     = new Set();
    this.currentWave     = 0;
    this.gameState       = 'pregame';
    this.speedMultiplier = 1;
    this.selectedTower   = null;
    this.placementDef    = null;
    this.bossOfferPanel  = null;
    this.pendingBossKillKey = null;
    this.debugOverlay    = null;
    this.debugVisible    = false;
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  preload(): void {
    // Load the correct map JSON by key (same key = reused from cache across runs).
    this.load.json(this.selectedMapId, `data/maps/${this.selectedMapId}.json`);
    this.load.json('creep-types',  'data/creep-types.json');
    this.load.json('wave-defs',    'data/waves.json');
  }

  create(): void {
    this.mapData   = this.cache.json.get(this.selectedMapId) as MapData;
    this.lives     = this.mapData.startingLives;
    this.gold      = this.mapData.startingGold;
    this.waypoints = this.buildPixelWaypoints();

    // ── Commander system ─────────────────────────────────────────────────────
    this.commanderDef   = getCommanderDef(this.selectedCommanderId) ?? null;
    this.commanderState = this.commanderDef
      ? defaultCommanderRunState(this.commanderDef.id)
      : null;

    if (this.commanderDef && this.commanderState) {
      // Apply the commander's aura (sets persistent state values).
      this.commanderDef.aura.apply(this.commanderState);

      // Waabizii: +2 starting lives
      if (this.commanderState.startingLivesBonus > 0) {
        this.lives += this.commanderState.startingLivesBonus;
      }
    }

    // Store wave-start lives for Nokomis ability
    if (this.commanderState) {
      this.commanderState.waveStartLives = this.lives;
    }

    // Expose commander state and tile size on scene.data for entity-level reads
    // (Creep reads ignoreArmorAndImmunity; Tower reads tileSize for AoE radius).
    this.data.set('commanderState', this.commanderState);
    this.data.set('tileSize', this.mapData.tileSize);

    this.renderMap();

    // Audio system — initialise (or resume) the singleton for this run.
    this.audioManager = AudioManager.getInstance(this);
    this.audioManager.startMusic();

    // Narrative system — vignettes + codex unlocks.
    const regionId = this.activeStageDef?.regionId ?? 'zaagaiganing';
    this.vignetteManager = new VignetteManager(regionId);
    this.vignetteOverlay = new VignetteOverlay(this);

    // Unlock the selected commander's codex entry.
    SaveManager.getInstance().unlockCodexEntry(`codex-commander-${this.selectedCommanderId}`);

    // FIRST_PLAY vignette — check and queue for display after HUD is built.
    const firstPlayResult = this.vignetteManager.check(TriggerType.FIRST_PLAY);

    // HUD (top strip)
    this.hud = new HUD(this, this.lives, this.gold);
    this.hud.setWave(0, this.totalWaves);
    this.hud.createSpeedControls((mult) => this.onSpeedChange(mult));
    const amForMute = AudioManager.getInstance();
    this.hud.createMuteButton(amForMute.isMuted(), () => {
      amForMute.toggleMute();
      return amForMute.isMuted();
    });

    // Commander HUD elements (name, portrait, ability button)
    if (this.commanderDef && this.commanderState) {
      this.hud.createCommanderDisplay(
        this.commanderDef.name,
        this.commanderDef.aura.name,
        `portrait-${this.commanderDef.id}`,
      );
      this.hud.createAbilityButton(
        this.commanderDef.ability.name,
        () => this.activateCommanderAbility(),
      );
    }

    // Upgrade system
    this.upgradeManager = new UpgradeManager(
      () => this.towers,
      () => this.activeCreeps,
    );

    // Roguelike offer system
    this.offerManager = new OfferManager();
    this.offerManager.setCurrentLives(this.lives);

    // Wave system
    const creepTypeDefs = this.cache.json.get('creep-types');
    const waveDefs      = this.cache.json.get('wave-defs');
    this.waveManager = new WaveManager(
      this, this.waypoints, this.activeCreeps, creepTypeDefs, waveDefs,
    );
    this.waveManager.on('wave-complete', this.onWaveComplete, this);

    if (this.isEndlessMode) {
      this.waveManager.enableEndless();
    }

    // ── Scene event listeners ──────────────────────────────────────────────

    this.events.on('creep-killed', (data: CreepKilledData) => {
      AudioManager.getInstance().playCreepKilled();

      // Bounty Hunter: kill rewards worth 20% more.
      const rewardMult = this.offerManager.getKillRewardMult();
      // Oshkaabewis: +1 gold per creep kill (stacks with base reward)
      const cmdBonus   = this.commanderState?.killGoldBonus ?? 0;
      this.gold += Math.round(data.reward * rewardMult) + cmdBonus;
      this.hud.setGold(this.gold);
      this.upgradePanel?.refresh();

      // Nokomis: heal 1 life per N kills (kills across all towers)
      if (this.commanderState && this.commanderState.healEveryNKills > 0) {
        this.commanderState.killsSinceLastHeal++;
        if (this.commanderState.killsSinceLastHeal >= this.commanderState.healEveryNKills) {
          this.commanderState.killsSinceLastHeal = 0;
          const maxLives = this.mapData.startingLives + (this.commanderState.startingLivesBonus);
          this.lives = Math.min(this.lives + 1, maxLives);
          this.hud.setLives(this.lives);
          this.offerManager.setCurrentLives(this.lives);
        }
      }

      // ── Combat offer effects triggered on kill ─────────────────────────
      const killEffects = this.offerManager.onKill();

      // Chain Reaction: arc 20 lightning damage to nearest active creep.
      if (killEffects.chainReaction) {
        this.triggerChainReaction(data.x, data.y);
      }

      // Reaper's Mark: 5% chance to arc 40 lightning damage.
      if (this.offerManager.reaperMarkRoll()) {
        this.triggerReapersMark(data.x, data.y);
      }

      // Shockwave: every 10th kill deals 60 AoE damage in 80px radius.
      if (killEffects.shockwave) {
        this.triggerShockwave(data.x, data.y);
      }

      // Lifesteal: heal 1 life every 50 kills.
      if (killEffects.lifeGain) {
        const maxLives = this.mapData.startingLives + (this.commanderState?.startingLivesBonus ?? 0);
        this.lives = Math.min(this.lives + 1, maxLives);
        this.hud.setLives(this.lives);
        this.offerManager.setCurrentLives(this.lives);
      }

      // Bloodlust: +10% attack speed on all towers for 3 s.
      if (this.offerManager.hasBloodlust()) {
        for (const t of this.towers) t.applyBloodlust(3000);
      }

      // Afterburn: brief fire DoT on nearby creeps.
      if (this.offerManager.hasAfterburn()) {
        this.triggerAfterburn(data.x, data.y);
      }
    });

    // liveCost is 1 for normal creeps; boss escape emits 3.
    this.events.on('creep-escaped', (data: { liveCost: number; reward: number }) => {
      AudioManager.getInstance().playCreepEscaped();
      const liveCost = data?.liveCost ?? 1;
      const reward   = data?.reward   ?? 0;

      // Tax Collector: escaped creeps refund 50% of their gold value.
      const taxRefund = this.offerManager.getEscapeRefund(reward);
      if (taxRefund > 0) {
        this.gold += taxRefund;
        this.hud.setGold(this.gold);
        this.upgradePanel?.refresh();
      }

      // Waabizii ability: absorb escapes — creep-escaped event still fires,
      // but the life-decrement is intercepted.
      const absorbed = this.commanderState?.absorbEscapes ?? false;
      const effectiveCost = absorbed ? 0 : liveCost;

      this.lives = Math.max(0, this.lives - effectiveCost);
      this.hud.setLives(this.lives);
      this.offerManager.setCurrentLives(this.lives);

      // Track life loss for Act 4 ending variant.
      if (effectiveCost > 0) this.vignetteManager.recordLifeLost();

      if (this.lives <= 0) this.triggerGameOver();
    });

    this.events.on('wave-bonus', (bonus: number) => {
      // Gold Rush offer: wave completion bonus +50%.
      const adjustedBonus = Math.round(bonus * this.offerManager.getWaveBonusMult());
      this.gold += adjustedBonus;
      this.hud.setGold(this.gold);
      this.upgradePanel?.refresh();
    });

    // ── Boss-wave start: show HUD warning ─────────────────────────────────
    this.events.on('boss-wave-start', (data: { bossKey: string; bossName: string }) => {
      this.hud.showBossWarning(data.bossName);
      // Refresh wave display to show boss indicator (★).
      this.hud.setWave(this.currentWave, this.totalWaves, this.isEndlessMode);
    });

    // ── Boss killed: award bonus gold, visual effects, offer ─────────────
    this.events.on('boss-killed', (data: BossKilledData) => {
      AudioManager.getInstance().playBossDeath();

      // Bonus gold reward (in addition to normal kill gold from 'creep-killed').
      // War Chest offer: +200 additional gold on boss kills.
      this.gold += data.rewardGold + this.offerManager.getBossKillBonus();
      this.hud.setGold(this.gold);
      this.upgradePanel?.refresh();

      // Visual effects: screen flash + large particle burst.
      this.triggerBossDeathScreenFlash();
      this.triggerBossDeathParticles(data.x, data.y, data.tint);

      // Bonus roguelike offer: show a choice panel where the player
      // picks one of three rewards.
      if (data.rewardOffer) {
        this.openBossOfferPanel(data.bossName);
      }

      // Queue boss-killed vignette for the next between-wave window.
      this.pendingBossKillKey = data.bossKey;
    });

    // ── Frost shatter drawback ────────────────────────────────────────────
    // When a creep that has shatterActive dies with DoT stacks, Creep.takeDamage
    // emits 'creep-died-poisoned' with isShattered=true BEFORE calling destroy().
    // The handler below checks that flag to suppress Poison C's spread mechanic.

    // ── Poison C: DoT spread on death ────────────────────────────────────
    this.events.on('creep-died-poisoned', (data: CreepDiedPoisonedData) => {
      // Waabizii aura: 25% chance to heal 1 life when a poisoned creep dies
      const healChance = this.commanderState?.poisonKillHealChance ?? 0;
      if (healChance > 0 && Math.random() < healChance) {
        const maxLives = this.mapData.startingLives + (this.commanderState?.startingLivesBonus ?? 0);
        this.lives = Math.min(this.lives + 1, maxLives);
        this.hud.setLives(this.lives);
        this.offerManager.setCurrentLives(this.lives);
      }

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
      0, 0, this.mapData.tileSize, this.mapData.tileSize, PAL.bgPlacementValid, 0.2,
    ).setStrokeStyle(2, PAL.bgPlacementValid, 0.8).setDepth(10).setVisible(false);

    // Tower panel (bottom strip — all 6 towers)
    new TowerPanel(this, ALL_TOWER_DEFS, (def) => this.enterPlacementMode(def), () => this.gold);

    // Upgrade panel (above tower panel — shown when a tower is selected)
    this.upgradePanel = new UpgradePanel(this, this.upgradeManager, () => this.gold);
    this.upgradePanel.onBuy = (cost) => {
      this.gold -= cost;
      this.hud.setGold(this.gold);
    };
    this.upgradePanel.onRespec = (refund: number, fee: number) => {
      // Resourceful offer: respec is free — add back the normally-lost fee.
      const actualRefund = this.offerManager.isRespecFree() ? refund + fee : refund;
      this.gold += actualRefund;
      this.hud.setGold(this.gold);
    };

    // Behavior panel (above upgrade panel — targeting priority + per-tower toggle)
    this.behaviorPanel = new BehaviorPanel(this);

    // Next-wave button (right portion of HUD strip)
    this.hud.createNextWaveButton(() => this.startNextWave());
    this.hud.setNextWaveVisible(true, 1);

    // Endless-mode: Give Up button so players can end the session gracefully.
    if (this.isEndlessMode) {
      this.hud.createGiveUpButton(() => this.triggerGameOver());
    }

    // Input
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerdown', this.onPointerDown, this);

    // ── BetweenWaveScene offer-picked event ───────────────────────────────
    // Fired by BetweenWaveScene after the player selects a card.
    // Applies any instant-gold offer effect and reveals the next-wave button.
    this.events.on('between-wave-offer-picked', (data: { offerId: string; instantGold: number }) => {
      if (data.instantGold > 0) {
        this.gold += data.instantGold;
        this.hud.setGold(this.gold);
        this.upgradePanel?.refresh();
      }

      // Show any between-wave vignette first; reveal the next-wave button only
      // after it's dismissed (or immediately if there's no vignette to show).
      // This prevents the boss-wave warning / commander messages from overlapping
      // with the story panel.
      const revealNextWave = () => {
        this.hud.setNextWaveVisible(true, this.currentWave + 1, this.isEndlessMode);
      };
      const hadVignette = this.tryShowBetweenWaveVignette(revealNextWave);
      if (!hadVignette) revealNextWave();
    });

    // Debug overlay — dev builds only (stripped by Vite's dead-code elimination in prod)
    if (import.meta.env.DEV) {
      this.input.keyboard?.on('keydown-B', this.toggleDebugOverlay, this);
    }

    // Register cleanup for scene stop/restart — Phaser emits 'shutdown' but does
    // NOT auto-call a shutdown() method, so we must wire it ourselves.
    this.events.once('shutdown', this.shutdown, this);

    // Show FIRST_PLAY vignette if one was queued (deferred so all UI is built).
    if (firstPlayResult) {
      this.time.delayedCall(300, () => {
        this.vignetteOverlay.show(firstPlayResult.vignette, firstPlayResult.seenBefore, () => {
          // Vignette dismissed — no further action needed.
        });
      });
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

  /**
   * Called automatically by Phaser when the scene is stopped or restarted.
   * Removes all scene-event listeners to prevent duplicate handlers accumulating
   * across runs (each restart without cleanup would double the handler count,
   * causing duplicate gold awards, double life deductions, etc.).
   */
  shutdown(): void {
    // Remove game-specific listeners registered in create().
    // Do NOT use removeAllListeners() — that would strip Phaser's internal
    // plugin listeners (TweenManager, TimerManager, InputPlugin, etc.) and
    // break the scene on restart.
    this.events.off('creep-killed');
    this.events.off('creep-escaped');
    this.events.off('wave-bonus');
    this.events.off('boss-wave-start');
    this.events.off('boss-killed');
    this.events.off('creep-died-poisoned');
    this.events.off('between-wave-offer-picked');

    // Cancel any active wave-spawn timers.
    this.waveManager?.cleanup();

    // Audio system cleanup — wired in Phase 21.
    this.audioManager?.destroy();

    // Vignette overlay cleanup.
    this.vignetteOverlay?.cleanup();

    // Drop entity references so GC can reclaim memory after restart.
    this.activeCreeps?.clear();
    this.projectiles?.clear();
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
    // Determine seasonal theme from the active stage's region.
    const regionDef = getRegionDef(this.activeStageDef?.regionId ?? 'zaagaiganing');
    const season = regionDef?.seasonalTheme ?? 'summer';

    // Procedural terrain — base layer + decorative scatter (all Graphics-based).
    renderTerrain(this, this.mapData, season);

    // Spawn & exit markers (drawn on top of terrain).
    const markerGfx = this.add.graphics();
    markerGfx.setDepth(1);

    const spawnY = this.waypoints[0].y;
    markerGfx.fillStyle(PAL.accentGreenN, 0.6);
    markerGfx.fillTriangle(0, spawnY - 8, 0, spawnY + 8, 12, spawnY);

    const exitWp = this.waypoints[this.waypoints.length - 1];
    markerGfx.fillStyle(PAL.dangerN, 0.6);
    markerGfx.fillTriangle(
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
    // While a boss offer panel is open, block all map interactions.
    if (this.bossOfferPanel && !this.bossOfferPanel.isClosed()) return;

    // Filter clicks in HUD strip (top) and bottom UI panels.
    // BehaviorPanel and UpgradePanel are always open/closed together.
    const panelsOpen  = this.upgradePanel.isOpen();
    const bottomLimit = this.scale.height
      - PANEL_HEIGHT
      - (panelsOpen ? UPGRADE_PANEL_HEIGHT + BEHAVIOR_PANEL_HEIGHT : 0);

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
    AudioManager.getInstance().playUiClick();
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
    this.placementMarker.setFillStyle(valid ? PAL.bgPlacementValid : PAL.bgPlacementInvalid, 0.2);
    this.placementMarker.setStrokeStyle(2, valid ? PAL.bgPlacementValid : PAL.bgPlacementInvalid, 0.8);

    this.rangePreview.clear();
    const col32 = valid ? PAL.accentGreenN : PAL.dangerN;
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

    // Compute actual cost with all active offer modifiers (Merchant's Favor, etc.).
    const actualCost = this.offerManager.applyPlacementCost(this.placementDef.cost);
    if (this.gold < actualCost) return;

    this.gold -= actualCost;
    this.hud.setGold(this.gold);

    // Play placement sound: woody thunk for combat towers, soft hum for aura.
    const am = AudioManager.getInstance();
    if (this.placementDef.isAura) {
      am.playProjectileFired('aura');
    } else {
      am.playTowerPlaced();
    }

    const tower = new Tower(
      this,
      col,
      row,
      this.mapData.tileSize,
      this.placementDef,
      () => this.activeCreeps,
      (proj) => this.projectiles.add(proj),
      this.offerManager,
      (key) => AudioManager.getInstance().playProjectileFired(key),
      this.commanderState ?? undefined,
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
    AudioManager.getInstance().playUiClick();
    this.deselectTower();
    this.selectedTower = tower;
    tower.setRangeVisible(true);
    this.upgradePanel.showForTower(tower);
    this.behaviorPanel.showForTower(tower);
  }

  private deselectTower(): void {
    this.selectedTower?.setRangeVisible(false);
    this.selectedTower = null;
    this.upgradePanel.hide();
    this.behaviorPanel.hide();
  }

  private sellTower(tower: Tower): void {
    // Refund includes base tower cost + upgrade investment, both at the sell rate.
    // Scavenger offer raises the refund rate to 85%.
    // Salvage offer: one-time full (100%) refund on next sell.
    const upgradeSpent = this.upgradeManager.getState(tower)?.totalSpent ?? 0;
    let refund: number;
    if (this.offerManager.isSalvageAvailable()) {
      refund = tower.def.cost + upgradeSpent; // 100% refund
      this.offerManager.consumeSalvage();
    } else {
      refund = calculateSellRefund(
        tower.def.cost + upgradeSpent,
        this.offerManager.getSellRefundRate(),
      );
    }
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
    this.hud.setWave(this.currentWave, this.totalWaves, this.isEndlessMode);
    this.hud.setNextWaveVisible(false, 0);

    // Snapshot lives at wave start (for Nokomis ability restore).
    if (this.commanderState) {
      this.commanderState.waveStartLives = this.lives;
    }

    // Supply Cache: +10 gold per owned tower at wave start.
    const supplyCacheBonus = this.offerManager.getSupplyCacheBonus(this.towers.length);
    if (supplyCacheBonus > 0) {
      this.gold += supplyCacheBonus;
      this.hud.setGold(this.gold);
      this.upgradePanel?.refresh();
    }

    this.waveManager.startWave(this.currentWave);
  }

  private onWaveComplete(waveNum: number): void {
    if (this.gameState === 'over') return;

    if (waveNum >= this.totalWaves && !this.isEndlessMode) {
      // Normal mode: all waves cleared — check for STAGE_COMPLETE vignette.
      const stageVignette = this.vignetteManager.check(TriggerType.STAGE_COMPLETE);
      if (stageVignette) {
        // Show the vignette before transitioning to the victory screen.
        AudioManager.getInstance().playVictory();
        this.gameState = 'between';
        this.vignetteOverlay.show(stageVignette.vignette, stageVignette.seenBefore, () => {
          this.gameState = 'over';
          this.scene.start('GameOverScene', {
            wavesCompleted: this.totalWaves,
            totalWaves:     this.totalWaves,
            won:            true,
            runCurrency:    calculateRunCurrency(this.totalWaves, this.totalWaves, true),
            stageId:        this.selectedStageId,
            mapId:          this.selectedMapId,
            commanderId:    this.selectedCommanderId,
          });
        });
        return;
      }

      // No vignette — go straight to victory screen.
      this.gameState = 'over';
      AudioManager.getInstance().playVictory();
      this.scene.start('GameOverScene', {
        wavesCompleted: this.totalWaves,
        totalWaves:     this.totalWaves,
        won:            true,
        runCurrency:    calculateRunCurrency(this.totalWaves, this.totalWaves, true),
        stageId:        this.selectedStageId,
        mapId:          this.selectedMapId,
        commanderId:    this.selectedCommanderId,
      });
      return;
    }
    // Endless mode: ignore the totalWaves limit and continue generating waves.

    // Clear Waabizii's absorb-escapes at wave end (one-wave duration).
    if (this.commanderState) {
      this.commanderState.absorbEscapes = false;
    }

    // Update OfferManager wave state.
    this.offerManager.setWavesCompleted(waveNum);
    this.offerManager.resetWavePlacements();

    // Interest: bonus gold = 2% of current gold each wave.
    const interestBonus = this.offerManager.getInterestBonus(this.gold);
    if (interestBonus > 0) {
      this.gold += interestBonus;
      this.hud.setGold(this.gold);
    }

    // Jackpot: 20% chance of +200 bonus gold each wave.
    const jackpotBonus = this.offerManager.getJackpotBonus();
    if (jackpotBonus > 0) {
      this.gold += jackpotBonus;
      this.hud.setGold(this.gold);
    }

    if (interestBonus > 0 || jackpotBonus > 0) {
      this.upgradePanel?.refresh();
    }

    this.gameState = 'between';
    AudioManager.getInstance().playWaveComplete();

    // Launch the roguelike offer selection scene (runs on top of GameScene).
    // The next-wave button is hidden until the player picks an offer.
    this.scene.launch('BetweenWaveScene', {
      offerManager:      this.offerManager,
      waveJustCompleted: waveNum,
      nextWave:          this.currentWave + 1,
    });
    // NOTE: this.hud.setNextWaveVisible() is called by the 'between-wave-offer-picked'
    // listener after the player makes their selection.
  }

  /**
   * After the offer is picked, check for any between-wave vignettes to show.
   * Checks in priority order: BOSS_KILLED (queued), WAVE_COMPLETE, WAVE_START (next).
   *
   * @param onDismiss  Called when the vignette is dismissed (or not called if no
   *                   vignette fires). The caller is responsible for showing the
   *                   next-wave button in this callback.
   * @returns  true if a vignette was shown, false if none matched.
   */
  private tryShowBetweenWaveVignette(onDismiss?: () => void): boolean {
    let result = null;

    // 1. Boss-killed vignette (queued from the boss-killed event).
    if (this.pendingBossKillKey) {
      result = this.vignetteManager.check(TriggerType.BOSS_KILLED, this.pendingBossKillKey);
      this.pendingBossKillKey = null;
    }

    // 2. Wave-complete vignette for the wave that just ended.
    if (!result) {
      result = this.vignetteManager.check(TriggerType.WAVE_COMPLETE, this.currentWave);
    }

    // 3. Wave-start vignette for the upcoming wave.
    if (!result) {
      result = this.vignetteManager.check(TriggerType.WAVE_START, this.currentWave + 1);
    }

    if (result) {
      this.vignetteOverlay.show(result.vignette, result.seenBefore, () => {
        onDismiss?.();
      });
      return true;
    }
    return false;
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

  // ── combat offer effects ──────────────────────────────────────────────────

  /**
   * Chain Reaction: arc 20 lightning damage to the nearest creep from kill position.
   */
  private triggerChainReaction(x: number, y: number): void {
    let nearest: Creep | null = null;
    let minDist               = Infinity;

    for (const c of this.activeCreeps) {
      if (!c.active) continue;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < minDist) { minDist = d; nearest = c; }
    }

    if (!nearest) return;

    nearest.takeDamage(20);
    this.drawLightningArc(x, y, nearest.x, nearest.y, PAL.accentBlueN);
  }

  /**
   * Shockwave: every 10th kill deals 60 AoE damage to creeps within 80 px.
   */
  private triggerShockwave(x: number, y: number): void {
    const RADIUS = 80;
    const DAMAGE = 60;

    for (const c of this.activeCreeps) {
      if (!c.active) continue;
      if (Math.hypot(c.x - x, c.y - y) <= RADIUS) {
        c.takeDamage(DAMAGE);
      }
    }

    // Expanding ring visual.
    const ring = this.add.graphics().setDepth(30);
    ring.lineStyle(3, 0xffffff, 0.9);
    ring.strokeCircle(x, y, 10);
    this.tweens.add({
      targets:  ring,
      scaleX:   RADIUS / 10,
      scaleY:   RADIUS / 10,
      alpha:    0,
      duration: 300,
      onComplete: () => ring.destroy(),
    });
  }

  /**
   * Afterburn: apply a brief fire DoT to creeps within 60 px of the kill position.
   */
  private triggerAfterburn(x: number, y: number): void {
    const RADIUS = 60;

    for (const c of this.activeCreeps) {
      if (!c.active) continue;
      if (Math.hypot(c.x - x, c.y - y) <= RADIUS) {
        c.applyDot(12, 500, 4); // 12 dmg × 4 ticks = 48 total over 2 s
      }
    }
  }

  /**
   * Draw a brief jagged lightning arc between two world points.
   */
  private drawLightningArc(
    x1: number, y1: number,
    x2: number, y2: number,
    color = 0xffffff,
  ): void {
    const gfx = this.add.graphics();
    gfx.setDepth(30);
    gfx.lineStyle(2, color, 0.9);
    gfx.beginPath();
    gfx.moveTo(x1, y1);

    const mx1 = x1 + (x2 - x1) * 0.33 + (Math.random() - 0.5) * 18;
    const my1 = y1 + (y2 - y1) * 0.33 + (Math.random() - 0.5) * 18;
    const mx2 = x1 + (x2 - x1) * 0.66 + (Math.random() - 0.5) * 18;
    const my2 = y1 + (y2 - y1) * 0.66 + (Math.random() - 0.5) * 18;

    gfx.lineTo(mx1, my1);
    gfx.lineTo(mx2, my2);
    gfx.lineTo(x2, y2);
    gfx.strokePath();

    this.tweens.add({
      targets:  gfx,
      alpha:    0,
      duration: 150,
      onComplete: () => gfx.destroy(),
    });
  }

  // ── boss visual effects ───────────────────────────────────────────────────

  /**
   * Brief full-screen white flash on boss death.
   * The rectangle fades from 0.7 alpha → 0 over 350 ms.
   */
  private triggerBossDeathScreenFlash(): void {
    const { width, height } = this.scale;
    const flash = this.add.rectangle(
      width / 2, height / 2, width, height, 0xffffff, 0.7,
    ).setDepth(500);

    this.tweens.add({
      targets:  flash,
      alpha:    0,
      duration: 350,
      ease:     'Power1',
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * Spawn a burst of animated circles emanating from the boss's death position.
   * Uses 16 particles in varying directions for a dramatic visual.
   *
   * @param x     World X of the boss at death
   * @param y     World Y of the boss at death
   * @param tint  Boss colour tint for particle colours
   */
  private triggerBossDeathParticles(x: number, y: number, tint: number): void {
    const PARTICLE_COUNT = 16;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle  = (i / PARTICLE_COUNT) * Math.PI * 2;
      const speed  = Phaser.Math.Between(80, 200);
      const radius = Phaser.Math.Between(4, 10);

      const circle = this.add.circle(x, y, radius, tint, 1).setDepth(490);

      const targetX = x + Math.cos(angle) * speed;
      const targetY = y + Math.sin(angle) * speed;

      this.tweens.add({
        targets:  circle,
        x:        targetX,
        y:        targetY,
        alpha:    0,
        scaleX:   0,
        scaleY:   0,
        duration: Phaser.Math.Between(500, 800),
        ease:     'Power2',
        onComplete: () => circle.destroy(),
      });
    }
  }

  /**
   * Open the roguelike boss-reward offer panel.
   * The player picks one of three rewards; the panel then closes.
   * While the panel is visible, map pointer events are blocked.
   *
   * @param bossName Ojibwe name of the slain boss (used in the panel title)
   */
  private openBossOfferPanel(bossName: string): void {
    // Dismiss any lingering panel before opening a new one.
    this.bossOfferPanel?.close();

    this.bossOfferPanel = new BossOfferPanel(
      this,
      bossName,
      [
        {
          label:       'Gold Rush',
          description: '+400 Gold\n\nFuel your next\ntower investments.',
          onChoose: () => {
            this.gold += 400;
            this.hud.setGold(this.gold);
            this.upgradePanel?.refresh();
          },
        },
        {
          label:       'Iron Will',
          description: '+5 Lives\n\nForgive a few\nfuture mistakes.',
          onChoose: () => {
            this.lives += 5;
            this.hud.setLives(this.lives);
          },
        },
        {
          label:       'Balanced',
          description: '+250 Gold\n+2 Lives\n\nA steady hand\nin victory.',
          onChoose: () => {
            this.gold  += 250;
            this.lives += 2;
            this.hud.setGold(this.gold);
            this.hud.setLives(this.lives);
            this.upgradePanel?.refresh();
          },
        },
      ],
    );
  }

  // ── debug overlay ──────────────────────────────────────────────────────────

  private toggleDebugOverlay(): void {
    this.debugVisible = !this.debugVisible;
    if (this.debugVisible) {
      if (!this.debugOverlay) {
        this.debugOverlay = this.add.text(8, HUD_HEIGHT + 4, '', {
          fontSize:        '12px',
          color:           PAL.accentBlue,
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
    AudioManager.getInstance().playGameOver();
    this.waveManager.cleanup();

    let runCurrency: number;
    if (this.isEndlessMode) {
      // Endless currency: floor(wavesCompleted / 5).
      runCurrency = Math.floor(this.currentWave / 5);
      // Persist the best wave reached for this map.
      SaveManager.getInstance().updateEndlessRecord(this.selectedMapId, this.currentWave);
    } else {
      runCurrency = calculateRunCurrency(this.currentWave, this.totalWaves, false);
    }

    this.scene.start('GameOverScene', {
      wavesCompleted: this.currentWave,
      totalWaves:     this.totalWaves,
      won:            false,
      runCurrency,
      stageId:        this.selectedStageId,
      mapId:          this.selectedMapId,
      commanderId:    this.selectedCommanderId,
      isEndless:      this.isEndlessMode,
    });
  }

  // ── commander ability ─────────────────────────────────────────────────────

  private activateCommanderAbility(): void {
    if (!this.commanderDef || !this.commanderState) return;
    if (this.commanderState.abilityUsed) return;

    this.commanderState.abilityUsed = true;
    this.hud.disableAbilityButton();

    const ctx: AbilityContext = {
      currentWave:    this.currentWave,
      currentLives:   this.lives,
      waveStartLives: this.commanderState.waveStartLives,
      startingLives:  this.mapData.startingLives,
      currentGold:    this.gold,
      addGold: (amount) => {
        this.gold += amount;
        this.hud.setGold(this.gold);
        this.upgradePanel?.refresh();
      },
      setLives: (lives) => {
        this.lives = lives;
        this.hud.setLives(this.lives);
        this.offerManager.setCurrentLives(this.lives);
      },
      addTimedEffect: (durationMs, onEnd) => {
        this.time.delayedCall(durationMs, onEnd);
      },
      showMessage: (text, durationMs) => {
        this.showTemporaryMessage(text, durationMs);
      },
      getWaveCreepInfo: (waveNum) => {
        return this.waveManager.getWaveInfo(waveNum);
      },
    };

    this.commanderDef.ability.activate(this.commanderState, ctx);
  }

  private showTemporaryMessage(text: string, durationMs: number): void {
    const { width, height } = this.scale;
    const msg = this.add.text(width / 2, height / 2 - 80, text, {
      fontSize:        '18px',
      color:           '#ffffff',
      fontFamily:      PAL.fontBody,
      backgroundColor: '#000000cc',
      padding:         { x: 12, y: 8 },
      align:           'center',
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets:  msg,
      alpha:    0,
      delay:    Math.max(0, durationMs - 600),
      duration: 600,
      onComplete: () => msg.destroy(),
    });
  }

  // ── Reaper's Mark ─────────────────────────────────────────────────────────

  /**
   * Reaper's Mark: arc 40 lightning damage to the nearest creep from kill position.
   */
  private triggerReapersMark(x: number, y: number): void {
    let nearest: Creep | null = null;
    let minDist               = Infinity;

    for (const c of this.activeCreeps) {
      if (!c.active) continue;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < minDist) { minDist = d; nearest = c; }
    }

    if (!nearest) return;

    nearest.takeDamage(40);
    this.drawLightningArc(x, y, nearest.x, nearest.y, 0xff88ff);
  }
}
