import Phaser from 'phaser';
import { Creep } from '../entities/Creep';
import type { CreepDiedPoisonedData, BossKilledData } from '../entities/Creep';
import { Tower, ALL_TOWER_DEFS } from '../entities/towers/Tower';
import type { TowerDef } from '../entities/towers/Tower';
import { Projectile } from '../entities/Projectile';
import { WaveManager, ENDLESS_MAX_WAVE } from '../systems/WaveManager';
import type { CreepKilledData, WaveAnnouncementInfo } from '../systems/WaveManager';
import { UpgradeManager } from '../systems/UpgradeManager';
import { OfferManager } from '../systems/OfferManager';
import { calculateRunCurrency, calculateSellRefund } from '../systems/EconomyManager';
import { towerEffectiveDPS } from '../systems/BalanceCalc';
import { HUD, getHudHeight } from '../ui/HUD';
import { TowerPanel, PANEL_HEIGHT } from '../ui/TowerPanel';
import { MobileManager } from '../systems/MobileManager';
import { UpgradePanel, UPGRADE_PANEL_HEIGHT } from '../ui/UpgradePanel';
import { BossOfferPanel } from '../ui/BossOfferPanel';
import { BehaviorPanel, BEHAVIOR_PANEL_HEIGHT } from '../ui/BehaviorPanel';
import type { MapData, MapWaypoint } from '../types/MapData';
import { TILE, getWaypointPaths, getAirWaypointPaths, isBuildable as tileIsBuildable } from '../types/MapData';
import { getCommanderDef, defaultCommanderRunState } from '../data/commanderDefs';
import type { CommanderDef, CommanderRunState, AbilityContext } from '../data/commanderDefs';
import { getStageDef, getStageByPathFile, getRegionDef } from '../data/stageDefs';
import type { StageDef } from '../data/stageDefs';
import { getRegionDifficulty, applyRegionToWaveDefs } from '../data/regionDifficulty';
import { SaveManager, GOLD_BOOST_AMOUNT } from '../meta/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { WaveBanner } from '../ui/WaveBanner';
import { renderTerrain } from '../systems/TerrainRenderer';
import { VignetteManager } from '../systems/VignetteManager';
import { VignetteOverlay } from '../ui/VignetteOverlay';
import { TriggerType } from '../data/vignetteDefs';
import { PAL } from '../ui/palette';
import {
  cbPlacementValidFill, cbPlacementInvalidFill,
  cbValidAccent, cbInvalidAccent,
} from '../ui/colorblindPalette';
import { SpatialGrid } from '../systems/SpatialGrid';
import { isShortcutBlocked } from '../systems/KeyboardShortcuts';
import type { ShortcutContext } from '../systems/KeyboardShortcuts';
import { TrailPool } from '../systems/TrailPool';
import { resolveGearBonuses, applyGearToStats } from '../systems/GearSystem';
import type { ChallengeModifier } from '../data/challengeDefs';
import { getChallengeDef } from '../data/challengeDefs';
import { SessionManager } from '../systems/SessionManager';
import type { AutoSave, AutoSaveTower } from '../systems/SessionManager';
import { AudioSettingsPanel } from '../ui/AudioSettingsPanel';
import { PostWaveUIQueue } from '../systems/PostWaveUIQueue';
import type { PostWaveEntry } from '../systems/PostWaveUIQueue';
import { MultiTowerPanel } from '../ui/MultiTowerPanel';
import { AchievementManager } from '../systems/AchievementManager';
import type { VictoryData } from '../systems/AchievementManager';
import { AchievementToast } from '../ui/AchievementToast';
import { AmbientVFX } from '../systems/AmbientVFX';
import { CritterManager } from '../systems/CritterManager';
import {
  getCutsceneDef, getRegionIntroCutsceneId,
  getPreBossCutsceneId, getPostBossCutsceneId,
} from '../data/cutsceneDefs';
import { AscensionSystem } from '../systems/AscensionSystem';
import { applyTowerMetaToStats } from '../data/towerMetaUpgradeDefs';
import { Rng } from '../systems/Rng';

const DEFAULT_TOTAL_WAVES = 20;
/** Flat gold bonus awarded when the player rushes the next wave early. */
const RUSH_GOLD_AMOUNT = 150;

type GameState = 'pregame' | 'wave' | 'between' | 'over';

interface PixelWaypoint { x: number; y: number; }

export class GameScene extends Phaser.Scene {
  // ── data ──────────────────────────────────────────────────────────────────
  private mapData!: MapData;
  /** Primary ground path (path A) in pixel coords. */
  private waypoints: PixelWaypoint[] = [];
  /** All ground paths in pixel coords — length 1 for single-path maps. */
  private waypointPaths: PixelWaypoint[][] = [];

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
  /** Speed multiplier saved when Space-pausing, so unpause restores it. */
  private _prePauseSpeed = 1;

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
  /** True while the player is drag-placing a tower from the panel on desktop. */
  private _isDragPlacing = false;
  private rangePreview!:    Phaser.GameObjects.Graphics;
  private placementMarker!: Phaser.GameObjects.Rectangle;
  /** Graphics for non-colour placement indicators: solid/dashed border + ✓ / ✗ mark. */
  private _placementIcon!:  Phaser.GameObjects.Graphics;
  private placementHint: Phaser.GameObjects.Text | null = null;

  // ── selection ─────────────────────────────────────────────────────────────
  private selectedTower: Tower | null = null;
  /** All currently selected towers. Length 0 = nothing, 1 = single-select, ≥2 = multi-select. */
  private _selectedTowers: Tower[] = [];

  // ── region select ─────────────────────────────────────────────────────────
  /** Rubber-band rectangle drawn while a region-drag is in progress. */
  private _regionSelectGfx!: Phaser.GameObjects.Graphics;
  /** World position where the current region-drag began (null when idle). */
  private _regionSelectStart: { x: number; y: number } | null = null;
  /** True once the pointer has moved enough to commit to a drag (vs a click). */
  private _regionDragging = false;

  // ── multi-tower UI ────────────────────────────────────────────────────────
  private _multiTowerPanel!: MultiTowerPanel;

  // ── mobile long-press region select ──────────────────────────────────────
  private _mobileHoldTimer: Phaser.Time.TimerEvent | null = null;
  private _mobileHoldStartX = 0;
  private _mobileHoldStartY = 0;

  // ── boss offer ────────────────────────────────────────────────────────────
  /** Non-null while a boss offer panel is visible (blocks map pointer events). */
  private bossOfferPanel: BossOfferPanel | null = null;

  // ── post-wave UI queue ────────────────────────────────────────────────────
  /** Serialises end-of-wave panels: boss loot → elder dialog → upgrade offers. */
  private readonly _postWaveQueue = new PostWaveUIQueue();
  /** Boss name from a boss-killed event, shown in the post-wave loot panel. */
  private _pendingBossName: string | null = null;
  /**
   * Bounty (escape) offer: tracks whether the first-escape bounty has already
   * been armed this wave.  Prevents a second or third escape from re-arming
   * the bounty after it was consumed by a kill.
   */
  private _bountyEscapeArmedThisWave = false;
  /** Whether the pending boss should display a loot offer panel post-wave. */
  private _pendingBossRewardOffer = false;
  /** Dismiss callback captured by the BetweenWaveScene queue entry. */
  private _betweenWaveDismiss: (() => void) | null = null;

  // ── endless mode ──────────────────────────────────────────────────────────
  /** True when the player chose endless mode for this run. */
  private isEndlessMode = false;

  // ── commander ────────────────────────────────────────────────────────────
  private commanderDef: CommanderDef | null = null;
  private commanderState: CommanderRunState | null = null;
  private selectedCommanderId = 'nokomis';

  // ── audio ─────────────────────────────────────────────────────────────────
  private audioManager?: AudioManager;
  private audioSettingsPanel?: AudioSettingsPanel;

  // ── wave announcement banner ───────────────────────────────────────────────
  private waveBanner!: WaveBanner;
  /** True once an air or mixed wave banner has been shown this run. */
  private firstAirWaveSeen = false;

  // ── narrative ───────────────────────────────────────────────────────────
  private vignetteManager!: VignetteManager;
  private vignetteOverlay!: VignetteOverlay;
  /** Boss key from a boss-killed event, queued for the next between-wave window. */
  private pendingBossKillKey: string | null = null;

  // ── deep progression ─────────────────────────────────────────────────────
  /** Number of bosses killed this run (passed to GameOverScene for XP calculation). */
  private bossesKilled = 0;
  /** True when this run is a challenge map (affects loot, modifiers). */
  private isChallengeRun = false;
  /** Active challenge modifier (null for normal/endless runs). */
  private challengeModifier: ChallengeModifier | null = null;
  /** Challenge def ID for autosave persistence (e.g. 'challenge-01'). */
  private _challengeId: string | null = null;

  // ── debug overlay (dev builds only) ───────────────────────────────────────
  private debugOverlay: Phaser.GameObjects.Text | null = null;
  private debugVisible = false;

  // ── decoration visibility (dev debug toggle) ───────────────────────────────
  /** Reference to terrain decoration Graphics returned by renderTerrain(). */
  private decoGfx: Phaser.GameObjects.Graphics | null = null;
  private decoVisible = true;

  // ── performance systems ───────────────────────────────────────────────────
  /**
   * Spatial hash grid rebuilt every frame before tower steps.
   * Reduces Tower.findTarget() from O(all_creeps) to O(creeps_in_range_cells).
   */
  private spatialGrid!: SpatialGrid<Creep>;
  /**
   * Zero-GC object pool for projectile trail particles.
   * Eliminates the create/tween/destroy cycle (~40 allocs/frame at 2× speed).
   */
  private trailPool!: TrailPool;

  // ── session persistence ────────────────────────────────────────────────────
  /** Creep kills this run — serialised to auto-save. */
  private _totalKills = 0;
  /** Gold earned from kills/waves/bosses this run — serialised to auto-save. */
  private _goldEarned = 0;
  /** Cutscene + vignette IDs shown this run — persisted to auto-save so they don't replay on resume. */
  private _seenDialogIds: Set<string> = new Set();
  /**
   * Reroll tokens remaining this run (consumed from pending consumables at run
   * start). Each token lets the player reroll their between-wave offer cards once.
   */
  private _rerollTokens = 0;
  /** Overlay container shown during WebGL context loss. */
  private _webglOverlay: Phaser.GameObjects.Container | null = null;
  /** Stored to allow removal in shutdown(). */
  private _visibilityHandler?: () => void;
  private _pageHideHandler?: () => void;
  private _webglLostHandler?: (e: Event) => void;
  private _webglRestoredHandler?: () => void;

  // ── achievement tracking ───────────────────────────────────────────────────
  /** Towers built this run — used for run-scoped achievement checks. */
  private _achTowersBuiltRun = 0;
  /** Distinct tower type keys placed this run. */
  private _achTowerTypesRun: Set<string> = new Set();
  /** Consumable type keys applied at the start of this run. */
  private _achConsumablesUsedRun: string[] = [];
  /** Reroll tokens granted at run start (before any were spent). */
  private _achInitialRerolls = 0;
  /** Air creeps killed this run. */
  private _achAirKillsRun = 0;
  /** Towers sold this run. */
  private _achTowersSoldRun = 0;
  /** Waves rushed this run. */
  private _achRushesRun = 0;
  /** Achievement toast notification component (created in create()). */
  private _achToast: AchievementToast | null = null;

  // ── rubble ─────────────────────────────────────────────────────────────────
  /**
   * Cosmetic rubble sprites keyed by "col,row".
   * Placed when a tower is sold; removed when a new tower is built on that tile.
   * Cleared between runs; not persisted.
   */
  private _rubbleSprites: Map<string, Phaser.GameObjects.Image> = new Map();

  // ── resume-from-menu flag ─────────────────────────────────────────────────
  /** When true, skip the YES/NO resume prompt and restore immediately. */
  private _autoResume = false;

  // ── ascension ─────────────────────────────────────────────────────────────
  /** Ascension level chosen at the pre-run screen (0 = standard run). */
  private _ascensionLevel = 0;
  /** Active AscensionSystem instance for this run (null on level 0). */
  private _ascensionSystem: AscensionSystem | null = null;

  // ── tower meta upgrades ───────────────────────────────────────────────────
  /**
   * Permanent meta-upgrade tiers loaded from SaveManager at run start.
   * Applied to each tower's base stats when the tower is placed or restored.
   */
  private _towerMetaUpgrades: Record<string, Record<string, number>> = {};

  // ── ambient VFX ────────────────────────────────────────────────────────────
  /** Continuous ambient particle effects for the current map region. */
  private _ambientVFX: AmbientVFX | null = null;

  // ── wildlife critters ────────────────────────────────────────────────────
  /** Ambient wildlife critters wandering open tiles. */
  private _critterManager: CritterManager | null = null;
  /** Accumulator for periodic creep-proximity checks (ms). */
  private _critterCreepCheckAcc = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  /** Called by Phaser before preload() — captures scene-start data and resets state. */
  init(data?: { commanderId?: string; stageId?: string; mapId?: string; isEndless?: boolean; isChallenge?: boolean; challengeId?: string; ascensionLevel?: number; autoResume?: boolean }): void {
    this.selectedCommanderId = data?.commanderId ?? 'nokomis';
    this.isEndlessMode       = data?.isEndless   ?? false;
    this.isChallengeRun      = data?.isChallenge ?? false;
    this.bossesKilled        = 0;
    this._ascensionLevel     = data?.ascensionLevel ?? 0;
    this._autoResume         = data?.autoResume     ?? false;

    // Resolve challenge modifier if applicable.
    this._challengeId = data?.challengeId ?? null;
    if (this.isChallengeRun && data?.challengeId) {
      const cDef = getChallengeDef(data.challengeId);
      this.challengeModifier = cDef?.modifier ?? null;
    } else {
      this.challengeModifier = null;
    }

    // Resolve stage: prefer stageId, fall back to mapId (backward compat), then default.
    // For challenge runs, always use the explicit mapId (challenge map) rather than
    // deriving from stageId, which would point to a regular story-mode map.
    if (this.isChallengeRun && data?.mapId) {
      const stage = data.stageId ? getStageDef(data.stageId) : null;
      this.activeStageDef    = stage ?? null;
      this.selectedStageId   = data.stageId ?? 'zaagaiganing-01';
      this.selectedMapId     = data.mapId;
    } else if (data?.stageId) {
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

    this.totalWaves = this.challengeModifier?.waveCount
      ?? this.activeStageDef?.waveCount
      ?? DEFAULT_TOTAL_WAVES;

    // Persist last-played stage for retry continuity.
    SaveManager.getInstance().setLastPlayedStage(this.selectedStageId);

    // Reset all mutable state so re-starting with a different map or commander is clean.
    this.activeCreeps    = new Set();
    this.towers          = [];
    this.projectiles     = new Set();
    this.currentWave     = 0;
    this.gameState       = 'pregame';
    this.speedMultiplier = 1;
    this._prePauseSpeed  = 1;
    this.selectedTower      = null;
    this._selectedTowers    = [];
    this._regionSelectStart = null;
    this._regionDragging    = false;
    this._mobileHoldTimer   = null;
    this.placementDef    = null;
    this._isDragPlacing  = false;
    this.bossOfferPanel  = null;
    this.pendingBossKillKey  = null;
    this._postWaveQueue.clear();
    this._pendingBossName        = null;
    this._pendingBossRewardOffer = false;
    this._betweenWaveDismiss     = null;
    this.firstAirWaveSeen    = false;
    this.debugOverlay        = null;
    this.debugVisible        = false;
    this.decoGfx                = null;
    this.decoVisible            = true;
    this._totalKills         = 0;
    this._goldEarned         = 0;
    this._seenDialogIds      = new Set();
    this._rerollTokens       = 0;
    this._webglOverlay       = null;
    this._achTowersBuiltRun    = 0;
    this._achTowerTypesRun     = new Set();
    this._achConsumablesUsedRun = [];
    this._achInitialRerolls    = 0;
    this._achAirKillsRun       = 0;
    this._achTowersSoldRun     = 0;
    this._achRushesRun         = 0;
    this._towerMetaUpgrades    = {};
    this._ambientVFX           = null;
    this._critterManager       = null;
    this._critterCreepCheckAcc = 0;
    this._rubbleSprites        = new Map();
    this._ascensionSystem      = null;
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  preload(): void {
    // Load the correct map JSON by key (same key = reused from cache across runs).
    this.load.json(this.selectedMapId, `data/maps/${this.selectedMapId}.json`);
    this.load.json('creep-types',  'data/creep-types.json');
    this.load.json('wave-defs',    'data/waves.json');
  }

  create(): void {
    this.mapData       = this.cache.json.get(this.selectedMapId) as MapData;
    this.lives         = this.mapData.startingLives;
    this.gold          = this.mapData.startingGold;
    this.waypointPaths = this.buildAllPixelWaypointPaths();
    this.waypoints     = this.waypointPaths[0] ?? [];

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

    // ── Achievement tracking: game started ────────────────────────────────────
    AchievementManager.getInstance().onGameStarted();

    // ── Apply pending crystal-sink consumables ────────────────────────────────
    // Consume once per run; clears the save-side stock.
    {
      const c = SaveManager.getInstance().consumeAndClearRunConsumables();
      if (c.goldBoostTokens > 0) {
        this.gold += c.goldBoostTokens * GOLD_BOOST_AMOUNT;
        this._achConsumablesUsedRun.push('goldBoostTokens');
      }
      if (c.extraLifeTokens > 0) {
        this.lives += c.extraLifeTokens;
        this._achConsumablesUsedRun.push('extraLifeTokens');
      }
      if (c.rerollTokens > 0) {
        this._achConsumablesUsedRun.push('rerollTokens');
      }
      this._rerollTokens = c.rerollTokens;
      this._achInitialRerolls = c.rerollTokens;
    }

    // ── Tower meta upgrades — load permanent stat bonuses for this run ────────
    this._towerMetaUpgrades = SaveManager.getInstance().getTowerMetaUpgrades();

    // ── Ascension system ──────────────────────────────────────────────────────
    // Create before WaveManager so speed/HP mults are available for spawn configs.
    if (this._ascensionLevel > 0) {
      this._ascensionSystem = new AscensionSystem(this, this._ascensionLevel);
      // Speed multiplier on scene.data — read by Creep constructor.
      this.data.set('ascensionSpeedMult', this._ascensionSystem.getSpeedMultiplier());
    } else {
      this.data.set('ascensionSpeedMult', 1);
    }

    // Expose commander state and tile size on scene.data for entity-level reads
    // (Creep reads ignoreArmorAndImmunity; Tower reads tileSize for AoE radius).
    this.data.set('commanderState', this.commanderState);
    this.data.set('tileSize', this.mapData.tileSize);

    this.renderMap();

    // ── Ambient VFX & wildlife critters ─────────────────────────────────
    {
      const regionId = this.activeStageDef?.regionId ?? 'zaagaiganing';
      const mobile   = MobileManager.getInstance().isMobile();

      this._ambientVFX = new AmbientVFX(
        this,
        this.mapData,
        regionId,
        this.selectedStageId,
        mobile,
      );
      this._critterManager = new CritterManager(
        this,
        this.mapData,
        regionId,
        mobile,
      );
    }

    // ── Performance systems ───────────────────────────────────────────────
    // Spatial grid: cell size 80px over the full map canvas.
    const mapW = this.mapData.cols * this.mapData.tileSize;
    const mapH = this.mapData.rows * this.mapData.tileSize;
    this.spatialGrid = new SpatialGrid<Creep>(80, mapW, mapH);

    // Trail pool: shared by all Projectile instances via scene.data.
    this.trailPool = new TrailPool(this, 80);
    this.data.set('trailPool', this.trailPool);

    // Audio system — initialise (or resume) the singleton for this run.
    this.audioManager = AudioManager.getInstance(this);
    this.audioManager.startMusic();

    // Achievement toast notification overlay.
    this._achToast = new AchievementToast(this);

    // Wave announcement banner (shown before each wave start).
    this.waveBanner = new WaveBanner(this);

    // Narrative system — vignettes + codex unlocks.
    const regionId = this.activeStageDef?.regionId ?? 'zaagaiganing';
    this.vignetteManager = new VignetteManager(regionId);
    this.vignetteOverlay = new VignetteOverlay(this);

    // Unlock the selected commander's codex entry.
    SaveManager.getInstance().unlockCodexEntry(`codex-commander-${this.selectedCommanderId}`);

    // Pre-game vignettes — check and queue for display after HUD is built.
    // FIRST_PLAY fires only on the very first session; WAVE_START(1) fires
    // on every stage's first wave (e.g. act2-arrival in mashkiig).
    const firstPlayResult = this.vignetteManager.check(TriggerType.FIRST_PLAY);
    const wave1StartResult = this.vignetteManager.check(TriggerType.WAVE_START, 1);

    // HUD (top strip)
    this.hud = new HUD(this, this.lives, this.gold);
    this.hud.setWave(0, this.totalWaves);
    this.hud.createSpeedControls((mult) => this.onSpeedChange(mult));
    const amForMute = AudioManager.getInstance();
    this.hud.createMuteButton(amForMute.isMuted(), () => {
      amForMute.toggleMute();
      return amForMute.isMuted();
    });

    // Audio settings panel (created lazily on first open)
    this.hud.createAudioSettingsButton(() => {
      if (!this.audioSettingsPanel) {
        this.audioSettingsPanel = new AudioSettingsPanel(this);
      }
      if (this.audioSettingsPanel.isVisible()) {
        this.audioSettingsPanel.hide();
      } else {
        this.audioSettingsPanel.show();
      }
    });

    // Ascension HUD badge — shown when level > 0.
    if (this._ascensionLevel > 0) {
      this.hud.createAscensionBadge(this._ascensionLevel);
    }

    // Active-offers button (★ BUFFS) — shows all offers active in this run.
    this.hud.createOffersButton(() => this.offerManager.getActiveOffers());

    // Commander HUD elements (portrait with tooltip, ability button)
    if (this.commanderDef && this.commanderState) {
      this.hud.createCommanderPortrait(
        this.commanderDef,
        this.commanderState,
        () => this.activateCommanderAbility(),
      );
      this.hud.createAbilityButton(
        this.commanderDef.ability,
        () => this.activateCommanderAbility(),
      );
    }

    // Upgrade system
    this.upgradeManager = new UpgradeManager(
      () => this.towers,
      () => this.activeCreeps,
    );

    // Roguelike offer system
    const runSeed = Date.now();
    this.offerManager = new OfferManager(new Rng(runSeed));
    this.offerManager.setCurrentLives(this.lives);

    // Wave system
    const creepTypeDefs = this.cache.json.get('creep-types');
    let waveDefs = this.cache.json.get('wave-defs');

    // Apply regional difficulty scaling (HP/speed multipliers + creep pool overrides).
    // `regionId` is already declared above (for VignetteManager).
    const regionDifficulty = getRegionDifficulty(regionId);
    waveDefs = applyRegionToWaveDefs(waveDefs, regionDifficulty);

    // Apply challenge modifiers on top of regional scaling (stacks multiplicatively).
    if (this.challengeModifier) {
      const mod = this.challengeModifier;
      waveDefs = waveDefs.map((w: { hpMult: number; speedMult: number }) => ({
        ...w,
        hpMult:    w.hpMult    * (mod.creepHpMult    ?? 1),
        speedMult: w.speedMult * (mod.creepSpeedMult  ?? 1),
      }));
    }

    // Apply Ascension 7 air-bypass modifier to each air lane.
    const rawAirPaths = this.buildAllAirWaypointPaths();
    const airPaths = rawAirPaths.map(rawAirWaypoints =>
      this._ascensionSystem
        ? this._ascensionSystem.modifyAirWaypoints(rawAirWaypoints)
        : rawAirWaypoints
    );

    const ascensionConfig = this._ascensionSystem
      ? {
          hpMult:       this._ascensionSystem.getHpMultiplier(),
          armoredEarly: this._ascensionSystem.getArmoredEarlyWaves(),
          regenPerSec:  this._ascensionSystem.getRegenPerSec(),
          immuneCombo:  this._ascensionSystem.isImmuneSlowAndPoison(),
        }
      : undefined;

    this.waveManager = new WaveManager(
      this, this.waypointPaths, this.activeCreeps, creepTypeDefs, waveDefs, airPaths,
      regionDifficulty, ascensionConfig, new Rng(runSeed + 1),
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
      // Bounty (escape): if a creep escaped this wave, the first kill earns triple gold.
      const bountyMult = this.offerManager.getBountyKillMult();
      if (bountyMult > 1) this.offerManager.consumeBounty();
      // Oshkaabewis: +1 gold per creep kill (stacks with base reward)
      const cmdBonus    = this.commanderState?.killGoldBonus ?? 0;
      const killGold    = Math.round(data.reward * rewardMult * bountyMult * this._getAscGoldMult()) + cmdBonus;
      this.gold += killGold;
      this._totalKills++;
      this._goldEarned += killGold;
      if (data.creepType === 'air') this._achAirKillsRun++;
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

      // Achievement: show any newly unlocked toasts (kills are committed on run end, not per-kill)
    });

    // liveCost: 1 for normal creeps; boss escapes use scaling penalty (5–10 lives).
    this.events.on('creep-escaped', (data: { liveCost: number; reward: number; isBoss?: boolean }) => {
      AudioManager.getInstance().playCreepEscaped();
      const liveCost = data?.liveCost ?? 1;
      const reward   = data?.reward   ?? 0;
      const isBoss   = data?.isBoss   ?? false;

      // Bounty (escape): arm the triple-gold bounty on the first escape each wave.
      if (this.offerManager.hasBountyEscape() && !this._bountyEscapeArmedThisWave) {
        this.offerManager.activateBounty();
        this._bountyEscapeArmedThisWave = true;
      }

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

      // Show prominent visual feedback when a boss escapes.
      if (isBoss && effectiveCost > 0) this._showBossEscapeFeedback(effectiveCost);

      if (this.lives <= 0) this.triggerGameOver();
    });

    this.events.on('wave-bonus', (bonus: number) => {
      // Gold Rush offer: wave completion bonus +50%; challenge gold multiplier.
      const challengeGoldMult = this.challengeModifier?.goldMult ?? 1;
      const adjustedBonus = Math.round(bonus * this.offerManager.getWaveBonusMult() * challengeGoldMult * this._getAscGoldMult());
      this.gold += adjustedBonus;
      this._goldEarned += adjustedBonus;
      this.hud.setGold(this.gold);
      this.upgradePanel?.refresh();
    });

    // ── Boss-wave start: show HUD warning ─────────────────────────────────
    this.events.on('boss-wave-start', (data: { bossKey: string; bossName: string }) => {
      this.hud.showBossWarning(data.bossName);
      // Refresh wave display to show boss indicator (★).
      this.hud.setWave(this.currentWave, this.totalWaves, this.isEndlessMode);
      // Commander portrait reacts to boss wave (brief shake).
      this.hud.getCommanderPortrait()?.reactBossWave();
    });

    // ── Boss killed: award bonus gold, visual effects, offer ─────────────
    this.events.on('boss-killed', (data: BossKilledData) => {
      this.bossesKilled++;
      AudioManager.getInstance().playBossDeath();

      // Bonus gold reward (in addition to normal kill gold from 'creep-killed').
      // War Chest offer: +200 additional gold on boss kills.
      const bossGold = Math.round((data.rewardGold + this.offerManager.getBossKillBonus()) * this._getAscGoldMult());
      this.gold += bossGold;
      this._goldEarned += bossGold;
      this.hud.setGold(this.gold);
      this.upgradePanel?.refresh();

      // Visual effects: screen flash + large particle burst.
      this.triggerBossDeathScreenFlash();
      this.triggerBossDeathParticles(data.x, data.y, data.tint);

      // Persist boss defeat so the meta-screen trophy system can display it.
      SaveManager.getInstance().markBossDefeated(data.bossKey);

      // Defer boss loot panel until ALL creeps from the wave are dead.
      // The post-wave queue (built in onWaveComplete) shows it first,
      // preventing overlap with the elder dialog and upgrade offers.
      this._pendingBossName        = data.bossName;
      this._pendingBossRewardOffer = data.rewardOffer;

      // Queue boss-killed vignette for the next between-wave window.
      this.pendingBossKillKey = data.bossKey;
    });

    // ── Frost shatter drawback ────────────────────────────────────────────
    // When a creep that has shatterActive dies with DoT stacks, Creep.takeDamage
    // emits 'creep-died-poisoned' with isShattered=true BEFORE calling destroy().
    // The handler below checks that flag to suppress Poison C's spread mechanic.

    // ── Poison C: DoT spread on death ────────────────────────────────────
    // Also triggers Ascension 8 poison cloud if active.
    this.events.on('creep-died-poisoned', (data: CreepDiedPoisonedData) => {
      // Ascension 8: poison cloud that debuffs nearby towers.
      this._ascensionSystem?.onCreepDiedPoisoned(data.x, data.y, () => this.towers);

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
      );
    });

    // Placement preview (follows mouse when in placement mode).
    // Depth 5: same level as range circles, above terrain (0-1) and path markers (3),
    // below towers (10). Alpha 0.5 meets the "semi-transparent ghost" spec.
    this.rangePreview  = this.add.graphics().setDepth(5).setVisible(false);
    this.placementMarker = this.add.rectangle(
      0, 0, this.mapData.tileSize, this.mapData.tileSize, PAL.bgPlacementValid, 0.5,
    ).setDepth(5).setVisible(false);  // border drawn by _placementIcon for solid/dashed support
    // Non-colour placement indicators: solid border (valid) / dashed border (invalid)
    // + ✓ checkmark (valid) / ✗ X mark (invalid). Depth 6 — above marker fill.
    this._placementIcon = this.add.graphics().setDepth(6).setVisible(false);

    // Region-select rubber-band rectangle. Depth 8 — above placement preview.
    this._regionSelectGfx = this.add.graphics().setDepth(8).setVisible(false);

    // Mobile placement hint — shown while in placement mode.
    if (MobileManager.getInstance().isMobile()) {
      this.placementHint = this.add.text(
        this.scale.width / 2, getHudHeight() + 12,
        'Drag to map & release to place',
        { fontSize: '14px', color: '#ffffff', fontFamily: 'monospace',
          backgroundColor: '#000000aa', padding: { x: 8, y: 4 } },
      ).setOrigin(0.5, 0).setDepth(200).setVisible(false);
    }

    // Tower panel (bottom strip) — filter out challenge-banned towers.
    const panelDefs = this.challengeModifier
      ? ALL_TOWER_DEFS.filter(d => !(this.challengeModifier!.bannedTowers ?? []).includes(d.key))
      : ALL_TOWER_DEFS;
    new TowerPanel(this, panelDefs, (def, isDrag) => this.enterPlacementMode(def, isDrag), () => this.gold);

    // Upgrade panel (above tower panel — shown when a tower is selected)
    this.upgradePanel = new UpgradePanel(
      this, this.upgradeManager, () => this.gold,
      () => this.offerManager.getSellRefundRate(),
    );
    this.upgradePanel.onBuy = (cost) => {
      this.gold -= cost;
      this.hud.setGold(this.gold);
      // Check if the selected tower has any path at max tier (tier 5).
      if (this.selectedTower) {
        const upgState = this.upgradeManager.getState(this.selectedTower);
        if (upgState) {
          const maxTier = Math.max(upgState.tiers.A, upgState.tiers.B, upgState.tiers.C);
          if (maxTier >= 5) {
            AchievementManager.getInstance().onTowerPathMaxed(this.selectedTower.def.key);
            this._achToast?.showBatch(AchievementManager.getInstance().drainNewlyUnlocked());
          }
        }
      }
    };
    this.upgradePanel.onRespec = (refund: number, fee: number) => {
      // Resourceful offer: respec is free — add back the normally-lost fee.
      const actualRefund = this.offerManager.isRespecFree() ? refund + fee : refund;
      this.gold += actualRefund;
      this.hud.setGold(this.gold);
    };
    this.upgradePanel.onSell = (tower) => this.sellTower(tower);

    // Behavior panel (above upgrade panel — targeting priority + per-tower toggle)
    this.behaviorPanel = new BehaviorPanel(this);

    // Multi-tower panel (replaces UpgradePanel + BehaviorPanel for multi-select)
    this._multiTowerPanel = new MultiTowerPanel(this, this.upgradeManager, () => this.gold);
    this._multiTowerPanel.onBuyBatch     = (path) => this._batchBuyUpgrade(path);
    this._multiTowerPanel.onDeselectAll  = () => this.deselectTower();
    this._multiTowerPanel.onSelectAllType = (key) => this._selectAllOfType(key);

    // Wire "Select All Type" from UpgradePanel back to GameScene
    this.upgradePanel.onSelectAllType = () => {
      if (this.selectedTower) this._selectAllOfType(this.selectedTower.def.key);
    };

    // Next-wave button (right portion of HUD strip)
    this.hud.createNextWaveButton(() => this.startNextWave());
    this.hud.setNextWaveVisible(true, 1);
    // Rush-wave button (shown during active waves to force-start the next wave early)
    this.hud.createRushWaveButton(() => this.rushNextWave(), RUSH_GOLD_AMOUNT);
    // Show wave 1 announcement banner after a brief delay so all UI is built.
    this.time.delayedCall(200, () => this.showWaveBanner(1));

    // Give Up / Quit button — always visible so players can exit a run early.
    this.hud.createGiveUpButton(() => this._quitToMainMenu());

    // Input
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerdown', this.onPointerDown, this);
    // Register pointerup for both mobile drag-to-place and desktop drag-to-place.
    this.input.on('pointerup', this.onPointerUp, this);
    // ── BetweenWaveScene offer-picked event ───────────────────────────────
    // Fired by BetweenWaveScene after the player selects a card.
    // Applies any instant-gold offer effect, advances the post-wave queue,
    // and reveals the next-wave button.
    // NOTE: Elder dialog is shown BEFORE BetweenWaveScene (via the queue),
    // so there is no vignette check here.
    this.events.on('between-wave-offer-picked', (data: { offerId: string; instantGold: number; rerollsUsed?: number }) => {
      if (data.instantGold > 0) {
        this.gold += data.instantGold;
        this.hud.setGold(this.gold);
        this.upgradePanel?.refresh();
      }
      // Track how many reroll tokens were consumed so subsequent between-wave
      // screens launch with the correct remaining count.
      if (data.rerollsUsed && data.rerollsUsed > 0) {
        this._rerollTokens = Math.max(0, this._rerollTokens - data.rerollsUsed);
      }

      // Update BUFFS count badge on the HUD offers button.
      this.hud.updateOffersCount(this.offerManager.getActiveOffers().length);

      // Advance the post-wave queue (the BetweenWaveScene entry is done).
      const dismiss = this._betweenWaveDismiss;
      this._betweenWaveDismiss = null;
      dismiss?.();

      // Only show the next-wave button when the post-wave queue is fully done.
      // If the queue still has items (e.g. a second BetweenWaveScene queued from
      // a concurrent wave completing mid-offer), the next item handles UI.
      if (!this._postWaveQueue.isActive) {
        if (this.waveManager.isActive()) {
          // A concurrent wave is still running (rush scenario) — return to wave
          // state so the game continues.  The next-wave button is intentionally
          // hidden; the rush button is re-evaluated by _updateRushButton().
          this.gameState = 'wave';
          this._updateRushButton();
        } else {
          // All queue items done and no wave running — reveal the next-wave button.
          const nextWave = this.currentWave + 1;
          this.hud.setNextWaveVisible(true, nextWave, this.isEndlessMode);
          this.showWaveBanner(nextWave);
          if (this.waveManager.hasAirCreepsInWave(nextWave)) {
            this.hud.showAirWaveAlert('▲ Air wave incoming! Deploy Thunder/Frost!');
          } else {
            this.hud.showAirWaveAlert('');
          }
        }
      }
    });

    // Debug toggles — dev builds only (stripped by Vite's dead-code elimination in prod)
    if (import.meta.env.DEV) {
      this.input.keyboard?.on('keydown-B', this.toggleDebugOverlay, this);
      // D key: hide/show terrain decorations to verify gameplay layers in isolation.
      this.input.keyboard?.on('keydown-D', () => {
        this.decoVisible = !this.decoVisible;
        this.decoGfx?.setVisible(this.decoVisible);
      }, this);
    }

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    // Space and Esc work even while paused; all others are blocked when paused,
    // game over, or a boss-offer panel is open.
    const kb = this.input.keyboard;
    const ctx = (): ShortcutContext => ({
      gameOver:      this.gameState === 'over',
      bossOfferOpen: !!this.bossOfferPanel && !this.bossOfferPanel.isClosed(),
      paused:        this.speedMultiplier === 0,
    });

    // Space: toggle pause / unpause
    kb?.on('keydown-SPACE', () => {
      if (isShortcutBlocked(ctx(), true)) return;
      if (this.speedMultiplier === 0) {
        const restore = this._prePauseSpeed > 0 ? this._prePauseSpeed : 1;
        this.onSpeedChange(restore);
        this.hud.syncSpeed(restore);
      } else {
        this._prePauseSpeed = this.speedMultiplier;
        this.onSpeedChange(0);
        this.hud.syncSpeed(0);
      }
    });

    // F: cycle speed 1× → 2× → 1× (no-op while paused)
    kb?.on('keydown-F', () => {
      if (isShortcutBlocked(ctx())) return;
      const newMult = this.speedMultiplier === 1 ? 2 : 1;
      this.onSpeedChange(newMult);
      this.hud.syncSpeed(newMult);
    });

    // Escape: exit placement mode, cancel region select, or deselect (works while paused)
    kb?.on('keydown-ESC', () => {
      if (isShortcutBlocked(ctx(), true)) return;
      if (this.placementDef) {
        this.exitPlacementMode();
      } else if (this._regionDragging || this._regionSelectStart) {
        this._cancelRegionSelect();
      } else {
        this.deselectTower();
      }
    });

    // S: sell selected tower(s)
    kb?.on('keydown-S', () => {
      if (isShortcutBlocked(ctx())) return;
      if (this._selectedTowers.length > 1) {
        const toSell = [...this._selectedTowers];
        this.deselectTower();
        for (const t of toSell) this.sellTower(t);
      } else if (this.selectedTower) {
        this.sellTower(this.selectedTower);
      }
    });

    // U: open/close upgrade panel for selected tower
    kb?.on('keydown-U', () => {
      if (isShortcutBlocked(ctx())) return;
      if (!this.selectedTower) return;
      if (this.upgradePanel.isOpen()) {
        this.upgradePanel.hide();
        this.behaviorPanel.hide();
      } else {
        this.upgradePanel.showForTower(this.selectedTower);
        this.behaviorPanel.showForTower(this.selectedTower);
      }
    });

    // 1-6: enter placement mode for towers in panel order
    const numKeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'] as const;
    ALL_TOWER_DEFS.forEach((def, i) => {
      if (i >= numKeys.length) return;
      kb?.on(`keydown-${numKeys[i]}`, () => {
        if (isShortcutBlocked(ctx())) return;
        if (this.gold < def.cost) return;
        if (this.placementDef?.key === def.key) {
          this.exitPlacementMode();
        } else {
          this.enterPlacementMode(def);
        }
      });
    });

    // Register cleanup for scene stop/restart — Phaser emits 'shutdown' but does
    // NOT auto-call a shutdown() method, so we must wire it ourselves.
    this.events.once('shutdown', this.shutdown, this);

    // ── Session persistence event listeners ─────────────────────────────────
    // visibilitychange: fires when the user switches tabs / app goes to background.
    // This is the primary save checkpoint on mobile — fires before the browser
    // may evict the page.
    this._visibilityHandler = () => {
      if (document.hidden && this.gameState === 'between') {
        this._doAutoSave();
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);

    // pagehide: secondary checkpoint for iOS Safari which doesn't always fire
    // visibilitychange reliably before page eviction.
    this._pageHideHandler = () => {
      if (this.gameState === 'between') {
        this._doAutoSave();
      }
    };
    window.addEventListener('pagehide', this._pageHideHandler);

    // ── WebGL context loss handling ──────────────────────────────────────────
    const canvas = this.game.canvas;
    this._webglLostHandler = (e: Event) => {
      e.preventDefault();
      // Pause the game (timeScale=0) and show overlay.
      this.time.timeScale = 0.001;
      this._showWebGlOverlay();
    };
    this._webglRestoredHandler = () => {
      this._hideWebGlOverlay();
      // Attempt to resume from auto-save; if unavailable just reload the scene.
      const saved = SessionManager.getInstance().load();
      if (saved && saved.stageId === this.selectedStageId) {
        // Scene reload — Phaser will re-run init/preload/create.
        this.scene.restart({
          commanderId: saved.commanderId,
          stageId:     saved.stageId,
          mapId:       saved.mapId,
        });
      } else {
        this.scene.restart();
      }
    };
    canvas.addEventListener('webglcontextlost',     this._webglLostHandler);
    canvas.addEventListener('webglcontextrestored', this._webglRestoredHandler);

    // ── Auto-save resume check ──────────────────────────────────────────────
    // Check for a mid-run auto-save matching the current stage.
    // If found and recent, prompt the player to resume.
    const sessionMgr = SessionManager.getInstance();
    const existingSave = sessionMgr.load();
    if (existingSave && existingSave.stageId === this.selectedStageId
        && existingSave.commanderId === this.selectedCommanderId
        && existingSave.currentWave > 0) {
      // Defer slightly so all Phaser scene objects are fully initialised.
      if (this._autoResume) {
        // Player already confirmed resume from the main menu — restore directly.
        this.time.delayedCall(100, () => this._restoreFromAutoSave(existingSave));
      } else {
        this.time.delayedCall(100, () => this._showResumePrompt(existingSave));
      }
    }

    // ── Pre-game cutscenes — deferred so all UI is built ────────────────────
    // Priority: intro cutscene (first ever launch) → region intro → FIRST_PLAY vignette.
    // Only ONE of these fires per create().
    this.time.delayedCall(300, () => {
      const save = SaveManager.getInstance();

      // 1. Intro cutscene (game's first launch).
      if (!save.hasSeenCutscene('cutscene-intro') && !this._seenDialogIds.has('cutscene-intro')) {
        const introDef = getCutsceneDef('cutscene-intro');
        if (introDef) {
          save.markCutsceneSeen(introDef.id);
          this._seenDialogIds.add(introDef.id);
          this.scene.launch('CutsceneScene', { cutscene: introDef });
          return;
        }
      }

      // 2. Region introduction cutscene (first time in this region).
      const regionId = this.activeStageDef?.regionId;
      if (regionId) {
        const regionCutsceneId = getRegionIntroCutsceneId(regionId);
        if (regionCutsceneId && !save.hasSeenCutscene(regionCutsceneId) && !this._seenDialogIds.has(regionCutsceneId)) {
          const regionDef = getCutsceneDef(regionCutsceneId);
          if (regionDef) {
            save.markCutsceneSeen(regionDef.id);
            this._seenDialogIds.add(regionDef.id);
            this.scene.launch('CutsceneScene', { cutscene: regionDef });
            return;
          }
        }
      }

      // 3. FIRST_PLAY vignette (first ever session).
      if (firstPlayResult && !this._seenDialogIds.has(firstPlayResult.vignette.id)) {
        this._seenDialogIds.add(firstPlayResult.vignette.id);
        this.vignetteOverlay.show(firstPlayResult.vignette, firstPlayResult.seenBefore, () => {
          // After FIRST_PLAY dismisses, show wave-1 start vignette if any.
          if (wave1StartResult && !this._seenDialogIds.has(wave1StartResult.vignette.id)) {
            this._seenDialogIds.add(wave1StartResult.vignette.id);
            this.vignetteOverlay.show(wave1StartResult.vignette, wave1StartResult.seenBefore, () => {});
          }
        });
        return;
      }

      // 4. Wave-1 start vignette (e.g. act2-arrival, act3-arrival).
      if (wave1StartResult && !this._seenDialogIds.has(wave1StartResult.vignette.id)) {
        this._seenDialogIds.add(wave1StartResult.vignette.id);
        this.vignetteOverlay.show(wave1StartResult.vignette, wave1StartResult.seenBefore, () => {});
      }
    });
  }

  update(_time: number, delta: number): void {
    if (this.speedMultiplier === 0) return; // paused

    const scaledDelta = delta * this.speedMultiplier;

    // ── Spatial grid rebuild ───────────────────────────────────────────────
    // Must happen before tower steps so findTarget() sees current positions.
    this.spatialGrid.clear();
    for (const creep of this.activeCreeps) {
      if (creep.active) this.spatialGrid.insert(creep);
    }

    for (const creep of this.activeCreeps) {
      if (creep.active) creep.step(scaledDelta);
    }

    for (const tower of this.towers) {
      tower.step(scaledDelta);
    }

    // ── Trail pool update ──────────────────────────────────────────────────
    this.trailPool.update(scaledDelta);

    // ── Ambient VFX update ─────────────────────────────────────────────────
    this._ambientVFX?.update(scaledDelta);

    // ── Wildlife critter update ─────────────────────────────────────────
    if (this._critterManager) {
      this._critterManager.update(scaledDelta);

      // Periodically notify critters of nearby creeps (~every 500ms).
      this._critterCreepCheckAcc += scaledDelta;
      if (this._critterCreepCheckAcc >= 500) {
        this._critterCreepCheckAcc = 0;
        const positions: Array<{ x: number; y: number }> = [];
        for (const creep of this.activeCreeps) {
          if (creep.active) positions.push({ x: creep.x, y: creep.y });
        }
        if (positions.length > 0) {
          this._critterManager.notifyCreepsNear(positions);
        }
      }
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

    // Clear the post-wave queue to prevent stale callbacks after scene shutdown.
    this._postWaveQueue.clear();
    this._betweenWaveDismiss = null;

    // Remove document/window event listeners registered in create().
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = undefined;
    }
    if (this._pageHideHandler) {
      window.removeEventListener('pagehide', this._pageHideHandler);
      this._pageHideHandler = undefined;
    }
    const canvas = this.game?.canvas;
    if (canvas) {
      if (this._webglLostHandler) {
        canvas.removeEventListener('webglcontextlost', this._webglLostHandler);
        this._webglLostHandler = undefined;
      }
      if (this._webglRestoredHandler) {
        canvas.removeEventListener('webglcontextrestored', this._webglRestoredHandler);
        this._webglRestoredHandler = undefined;
      }
    }

    // Cancel any pending mobile long-press timer.
    this._mobileHoldTimer?.remove();
    this._mobileHoldTimer = null;

    // Destroy achievement toast overlay.
    this._achToast?.destroy();
    this._achToast = null;

    // Performance systems cleanup.
    this.trailPool?.destroy();
    this.data.remove('trailPool');

    // Audio settings panel cleanup.
    this.audioSettingsPanel?.destroy();
    this.audioSettingsPanel = undefined;

    // Ascension system cleanup — cancel all scheduled timers.
    this._ascensionSystem?.destroy();
    this._ascensionSystem = null;

    // Audio system cleanup — wired in Phase 21.
    this.audioManager?.destroy();

    // Wave banner cleanup.
    this.waveBanner?.destroy();

    // Vignette overlay cleanup.
    this.vignetteOverlay?.cleanup();

    // Ambient VFX cleanup.
    this._ambientVFX?.destroy();
    this._ambientVFX = null;

    // Wildlife critter cleanup.
    this._critterManager?.destroy();
    this._critterManager = null;

    // Rubble sprite cleanup.
    for (const sprite of this._rubbleSprites.values()) sprite.destroy();
    this._rubbleSprites.clear();

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

  /** Convert all map paths to pixel-space waypoint arrays. */
  private buildAllPixelWaypointPaths(): PixelWaypoint[][] {
    const ts    = this.mapData.tileSize;
    const paths = getWaypointPaths(this.mapData);
    return paths.map(path => path.map(wp => ({
      x: wp.col * ts + ts / 2,
      y: wp.row * ts + ts / 2,
    })));
  }

  /**
   * Build the pixel-space air waypoint paths for the current map.
   *
   * Auto-derives 3 offset lanes per ground-path entrance (rows −2, 0, +2).
   * Multi-entrance maps (map-05+) produce lanes for each entrance, so air
   * creeps spread pressure across the full map width.  Explicit
   * `airWaypointPaths` in the map JSON still take priority when present.
   *
   * Returns an array of lanes each expressed as pixel-space `PixelWaypoint[]`.
   * WaveManager randomly picks one per air creep for visual diversity.
   */
  private buildAllAirWaypointPaths(): PixelWaypoint[][] {
    const ts = this.mapData.tileSize;
    const groundPaths = getWaypointPaths(this.mapData);
    const mapPaths: MapWaypoint[][] = [];
    for (const groundPath of groundPaths) {
      mapPaths.push(...getAirWaypointPaths(this.mapData, groundPath));
    }
    return mapPaths.map(path =>
      path.map(wp => ({ x: wp.col * ts + ts / 2, y: wp.row * ts + ts / 2 }))
    );
  }

  private renderMap(): void {
    // Determine seasonal theme from the active stage's region.
    const regionDef = getRegionDef(this.activeStageDef?.regionId ?? 'zaagaiganing');
    const season = regionDef?.seasonalTheme ?? 'summer';

    // Procedural terrain — base layer (depth 0) + decorative scatter (depth 1).
    // Store decoGfx so the dev debug toggle (D key) can hide decorations.
    const terrainResult = renderTerrain(this, this.mapData, season);
    this.decoGfx = terrainResult.decoGfx;

    // On mobile, hide terrain decorations by default to reduce rendering overhead.
    if (MobileManager.getInstance().isMobile()) {
      this.decoGfx?.setVisible(false);
      this.decoVisible = false;
    }

    // Spawn & exit markers (depth 3 — above decorations at 1, below towers at 10).
    const markerGfx = this.add.graphics();
    markerGfx.setDepth(3);

    // Show a spawn marker at each path's entry point (supports multi-path maps).
    markerGfx.fillStyle(PAL.accentGreenN, 0.6);
    for (const path of this.waypointPaths) {
      if (path.length > 0) {
        const spawnY = path[0].y;
        markerGfx.fillTriangle(0, spawnY - 8, 0, spawnY + 8, 12, spawnY);
      }
    }

    // Exit marker — all paths share the same exit (last waypoint of path A).
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
    // Cancel mobile long-press if the finger moved significantly before the hold fired.
    if (this._mobileHoldTimer && MobileManager.getInstance().isMobile()) {
      const dx = ptr.x - this._mobileHoldStartX;
      const dy = ptr.y - this._mobileHoldStartY;
      if (Math.hypot(dx, dy) > 20) {
        this._mobileHoldTimer.remove();
        this._mobileHoldTimer = null;
        this._regionSelectStart = null;
      }
    }

    // Update region-select rubber-band rectangle while dragging.
    if (this._regionSelectStart) {
      this._updateRegionSelect(ptr.x, ptr.y);
    }

    if (!this.placementDef) return;
    this.updatePlacementPreview(ptr);
  }

  private onPointerDown(ptr: Phaser.Input.Pointer): void {
    // While a boss offer panel is open, block all map interactions.
    if (this.bossOfferPanel && !this.bossOfferPanel.isClosed()) return;

    // Filter clicks in HUD strip (top) and bottom UI panels.
    // UpgradePanel, BehaviorPanel, and MultiTowerPanel are mutually exclusive.
    const hudHeight  = getHudHeight();
    const panelsOpen = this.upgradePanel.isOpen() || this._multiTowerPanel.isOpen();
    const bottomLimit = this.scale.height
      - PANEL_HEIGHT
      - (panelsOpen ? UPGRADE_PANEL_HEIGHT + BEHAVIOR_PANEL_HEIGHT : 0);

    if (ptr.y < hudHeight || ptr.y > bottomLimit) return;

    if (ptr.rightButtonDown()) {
      this.handleRightClick(ptr);
      return;
    }

    const isMobile  = MobileManager.getInstance().isMobile();
    const shiftHeld = !isMobile && ((ptr.event as MouseEvent)?.shiftKey ?? false);

    if (this.placementDef) {
      // On mobile, placement happens on pointerup (drag-to-place).
      if (!isMobile) {
        this.tryPlaceTower(ptr.x, ptr.y);
      }
      return;
    }

    // Check whether the click landed on an existing tower.
    const towerAtPoint = this.findTowerAt(ptr.x, ptr.y);

    if (towerAtPoint) {
      // Tower click: selection is handled by the tower's 'pointerup' listener.
      // For non-shift clicks, deselect immediately so the pointerup handler re-selects
      // cleanly (prevents a stale single-select flash with multi-select rings still on).
      if (!shiftHeld) {
        // Only deselect in single-select mode; in multi-select the tower's pointerup
        // calls selectTower() which will clear multi-select rings itself.
        if (this._selectedTowers.length <= 1) {
          this.deselectTower();
        }
      }
      return;
    }

    // Click landed on empty ground.
    if (shiftHeld) {
      // Shift+click on empty ground: do nothing (don't deselect).
      return;
    }

    // Start region-select tracking.  Deselect happens in onPointerUp if no drag.
    this._regionSelectStart = { x: ptr.x, y: ptr.y };
    this._regionDragging    = false;

    // Mobile: start long-press timer so the player can draw a region box
    // without conflicting with single-tap deselect.
    if (isMobile) {
      this._mobileHoldStartX = ptr.x;
      this._mobileHoldStartY = ptr.y;
      this._mobileHoldTimer  = this.time.delayedCall(500, () => {
        this._mobileHoldTimer = null;
        // Long press: commit to region-select mode immediately.
        this._regionDragging = true;
        this._regionSelectGfx.setVisible(true);
      });
    }
  }

  /**
   * Place tower on pointer-lift — handles both mobile drag-to-place and
   * desktop drag-to-place.  Also finalises region-select drags.
   *
   * Desktop click-to-place is handled in onPointerDown and does NOT reach
   * here (placement mode is exited before this fires, or _isDragPlacing is
   * false and we skip the handler early).
   */
  private onPointerUp(ptr: Phaser.Input.Pointer): void {
    const isMobile = MobileManager.getInstance().isMobile();

    // Cancel any pending mobile long-press timer.
    if (this._mobileHoldTimer) {
      this._mobileHoldTimer.remove();
      this._mobileHoldTimer = null;
    }

    if (this.placementDef) {
      // Desktop click-to-place: handled in onPointerDown; skip here.
      if (!isMobile && !this._isDragPlacing) return;

      const hudHeight  = getHudHeight();
      const panelsOpen = this.upgradePanel.isOpen() || this._multiTowerPanel.isOpen();
      const bottomLimit = this.scale.height
        - PANEL_HEIGHT
        - (panelsOpen ? UPGRADE_PANEL_HEIGHT + BEHAVIOR_PANEL_HEIGHT : 0);

      if (ptr.y >= hudHeight && ptr.y <= bottomLimit) {
        if (this._isDragPlacing) {
          const { col, row } = this.worldToTile(ptr.x, ptr.y);
          if (!this.isBuildable(col, row) || this.isTileOccupied(col, row)) {
            this.exitPlacementMode();
          } else {
            this.tryPlaceTower(ptr.x, ptr.y);
          }
        } else {
          // Mobile: existing behaviour
          this.tryPlaceTower(ptr.x, ptr.y);
        }
      } else {
        this.exitPlacementMode();
      }
      return;
    }

    // ── Region-select finalisation ─────────────────────────────────────────
    if (this._regionSelectStart) {
      if (this._regionDragging) {
        this._finalizeRegionSelect(ptr);
      } else {
        // Tap on empty ground (no drag): deselect all (unless shift on desktop).
        const shiftHeld = !isMobile && ((ptr.event as MouseEvent)?.shiftKey ?? false);
        if (!shiftHeld) this.deselectTower();
        this._regionSelectStart = null;
      }
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

  private enterPlacementMode(def: TowerDef, isDrag = false): void {
    AudioManager.getInstance().playUiClick();
    this.placementDef    = def;
    // Only set drag flag for desktop; mobile placement is always treated as
    // drag by the existing mobile pointerup handler (no cancel-on-invalid).
    this._isDragPlacing  = isDrag && !MobileManager.getInstance().isMobile();
    this.rangePreview.setVisible(true);
    this.placementMarker.setVisible(true);
    this._placementIcon.setVisible(true);
    this.placementHint?.setVisible(true);
    // Clear selection (single + multi) when entering placement mode.
    for (const t of this._selectedTowers) t.setMultiSelected(false);
    this._selectedTowers = [];
    this.selectedTower?.setRangeVisible(false);
    this.selectedTower = null;
    this.upgradePanel.hide();
    this.behaviorPanel.hide();
    this._multiTowerPanel.hide();
    this._cancelRegionSelect();
  }

  private exitPlacementMode(): void {
    this.placementDef    = null;
    this._isDragPlacing  = false;
    this.rangePreview.setVisible(false);
    this.placementMarker.setVisible(false);
    this._placementIcon.setVisible(false);
    this.placementHint?.setVisible(false);
  }

  private updatePlacementPreview(ptr: Phaser.Input.Pointer): void {
    if (!this.placementDef) return;
    const { col, row } = this.worldToTile(ptr.x, ptr.y);
    const ts = this.mapData.tileSize;
    const cx = col * ts + ts / 2;
    const cy = row * ts + ts / 2;
    const valid = this.isBuildable(col, row) && !this.isTileOccupied(col, row);

    this.placementMarker.setPosition(cx, cy);
    // Use colorblind-aware fill colours — alpha 0.5 ghost tile.
    this.placementMarker.setFillStyle(
      valid ? cbPlacementValidFill() : cbPlacementInvalidFill(), 0.5,
    );

    // Non-colour indicators: solid border + ✓ (valid) or dashed border + ✗ (invalid).
    const accentCol = valid ? cbValidAccent() : cbInvalidAccent();
    this._placementIcon.clear();
    if (valid) {
      // Solid border
      this._placementIcon.lineStyle(2, accentCol, 0.9);
      this._placementIcon.strokeRect(cx - ts / 2, cy - ts / 2, ts, ts);
      // ✓ checkmark
      this._drawPlacementCheckmark(cx, cy, ts * 0.28, accentCol);
    } else {
      // Dashed border
      this._drawDashedRect(cx - ts / 2, cy - ts / 2, ts, ts, accentCol, 5, 3);
      // ✗ X mark
      this._drawPlacementXMark(cx, cy, ts * 0.24, accentCol);
    }

    this.rangePreview.clear();
    const col32 = valid ? cbValidAccent() : cbInvalidAccent();
    // Line width 2px so the range preview matches the selected-tower ring style.
    this.rangePreview.lineStyle(2, col32, 0.4);
    this.rangePreview.fillStyle(col32, 0.05);
    this.rangePreview.strokeCircle(cx, cy, this.placementDef.range);
    this.rangePreview.fillCircle(cx, cy, this.placementDef.range);
  }

  // ── Placement icon helpers ─────────────────────────────────────────────────

  /**
   * Draw a dashed rectangle border on `_placementIcon`.
   * Used for the invalid-placement tile to provide a shape cue beyond colour.
   */
  private _drawDashedRect(
    x: number, y: number, w: number, h: number,
    color: number, dashLen: number, gapLen: number,
  ): void {
    this._placementIcon.lineStyle(2, color, 0.9);
    const step = dashLen + gapLen;

    // top edge
    for (let dx = 0; dx < w; dx += step) {
      const ex = Math.min(dx + dashLen, w);
      this._placementIcon.beginPath();
      this._placementIcon.moveTo(x + dx, y);
      this._placementIcon.lineTo(x + ex, y);
      this._placementIcon.strokePath();
    }
    // right edge
    for (let dy = 0; dy < h; dy += step) {
      const ey = Math.min(dy + dashLen, h);
      this._placementIcon.beginPath();
      this._placementIcon.moveTo(x + w, y + dy);
      this._placementIcon.lineTo(x + w, y + ey);
      this._placementIcon.strokePath();
    }
    // bottom edge (right-to-left)
    for (let dx = 0; dx < w; dx += step) {
      const ex = Math.min(dx + dashLen, w);
      this._placementIcon.beginPath();
      this._placementIcon.moveTo(x + w - dx, y + h);
      this._placementIcon.lineTo(x + w - ex, y + h);
      this._placementIcon.strokePath();
    }
    // left edge (bottom-to-top)
    for (let dy = 0; dy < h; dy += step) {
      const ey = Math.min(dy + dashLen, h);
      this._placementIcon.beginPath();
      this._placementIcon.moveTo(x, y + h - dy);
      this._placementIcon.lineTo(x, y + h - ey);
      this._placementIcon.strokePath();
    }
  }

  /** Draw a ✓ checkmark on `_placementIcon` centred at (cx, cy). */
  private _drawPlacementCheckmark(cx: number, cy: number, size: number, color: number): void {
    this._placementIcon.lineStyle(3, color, 1.0);
    this._placementIcon.beginPath();
    // Short left arm of tick
    this._placementIcon.moveTo(cx - size, cy + size * 0.1);
    this._placementIcon.lineTo(cx - size * 0.1, cy + size * 0.7);
    // Long right arm of tick
    this._placementIcon.lineTo(cx + size, cy - size * 0.5);
    this._placementIcon.strokePath();
  }

  /** Draw an ✗ X mark on `_placementIcon` centred at (cx, cy). */
  private _drawPlacementXMark(cx: number, cy: number, size: number, color: number): void {
    this._placementIcon.lineStyle(3, color, 1.0);
    this._placementIcon.beginPath();
    this._placementIcon.moveTo(cx - size, cy - size);
    this._placementIcon.lineTo(cx + size, cy + size);
    this._placementIcon.strokePath();
    this._placementIcon.beginPath();
    this._placementIcon.moveTo(cx + size, cy - size);
    this._placementIcon.lineTo(cx - size, cy + size);
    this._placementIcon.strokePath();
  }

  private tryPlaceTower(worldX: number, worldY: number): void {
    if (!this.placementDef) return;
    const { col, row } = this.worldToTile(worldX, worldY);
    if (!this.isBuildable(col, row)) {
      // Show feedback for TREE / ROCK tiles that block construction.
      const { cols, rows, tiles } = this.mapData;
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        const t = tiles[row][col];
        if (t === TILE.TREE || t === TILE.BIRCH || t === TILE.ROCK) {
          this.showTemporaryMessage("Can't build here", 1200);
        }
      }
      return;
    }
    if (this.isTileOccupied(col, row)) return;

    // Compute actual cost with all active offer modifiers (Merchant's Favor, etc.).
    const actualCost = this.offerManager.applyPlacementCost(this.placementDef.cost);
    if (this.gold < actualCost) return;

    this.gold -= actualCost;
    this.hud.setGold(this.gold);

    // Remove any rubble on this tile before placing the tower.
    this._removeRubble(col, row);

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
      (x, y, r) => this.spatialGrid.queryRadius(x, y, r),
    );

    // Register with upgrade manager
    this.upgradeManager.registerTower(tower);

    // Apply equipped gear bonuses to tower stats.
    const gearBonuses = resolveGearBonuses(this.placementDef.key);
    if (gearBonuses.damagePct || gearBonuses.rangePct || gearBonuses.attackSpeedPct ||
        gearBonuses.chainCountBonus || gearBonuses.slowPctBonus || gearBonuses.auraStrengthPct ||
        gearBonuses.specialEffects.length > 0) {
      applyGearToStats(tower.upgStats, gearBonuses);
    }

    // Apply permanent meta-upgrade bonuses (after gear bonuses).
    this._applyTowerMetaBonuses(tower);

    // Store gear+meta so every future buyUpgrade / respec re-applies them.
    this.upgradeManager.setTowerBonuses(
      tower, gearBonuses, this._towerMetaUpgrades[tower.def.key] ?? {},
    );

    tower.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      const shiftHeld = !MobileManager.getInstance().isMobile() &&
        ((ptr.event as MouseEvent)?.shiftKey ?? false);
      if (shiftHeld) {
        this._toggleTowerInSelection(tower);
      } else {
        this.selectTower(tower);
      }
    });
    this.towers.push(tower);

    // Achievement tracking: tower placed
    this._achTowersBuiltRun++;
    this._achTowerTypesRun.add(tower.def.key);
    const achMgr = AchievementManager.getInstance();
    achMgr.addTowerBuilt(this._achTowersBuiltRun, tower.def.key);
    // Check simultaneous-6-types achievement.
    const distinctTypesOnField = new Set(this.towers.map(t => t.def.key)).size;
    achMgr.checkAllTypesSimultaneous(distinctTypesOnField);
    this._achToast?.showBatch(achMgr.drainNewlyUnlocked());

    // Notify wildlife critters that a tower was placed nearby — they flee.
    this._critterManager?.notifyTowerPlaced(col, row);

    this.exitPlacementMode();
  }

  // ── ascension helpers ─────────────────────────────────────────────────────

  /** Ascension 10: gold income penalty (0.9 = 10% reduction). Returns 1 when inactive. */
  private _getAscGoldMult(): number {
    return this._ascensionSystem?.getGoldIncomeMultiplier() ?? 1;
  }

  // ── tower management ──────────────────────────────────────────────────────

  /**
   * Apply permanent meta-upgrade bonuses to a tower's stats.
   * Must be called after defaultUpgradeStats() and gear bonuses.
   */
  private _applyTowerMetaBonuses(tower: Tower): void {
    const upgrades = this._towerMetaUpgrades[tower.def.key];
    if (!upgrades) return;
    applyTowerMetaToStats(tower.upgStats, tower.def.key, upgrades);
  }

  private selectTower(tower: Tower): void {
    if (this.placementDef) return;
    AudioManager.getInstance().playUiClick();
    // Clear all existing selection (single and multi).
    for (const t of this._selectedTowers) t.setMultiSelected(false);
    this._selectedTowers = [];
    this.selectedTower?.setRangeVisible(false);
    this._multiTowerPanel.hide();
    // Set single selection.
    this.selectedTower     = tower;
    this._selectedTowers   = [tower];
    tower.setRangeVisible(true);
    this.upgradePanel.showForTower(tower);
    this.behaviorPanel.showForTower(tower);
  }

  private deselectTower(): void {
    // Clear single selection.
    this.selectedTower?.setRangeVisible(false);
    this.selectedTower = null;
    // Clear multi selection rings.
    for (const t of this._selectedTowers) t.setMultiSelected(false);
    this._selectedTowers = [];
    // Hide all selection panels.
    this.upgradePanel.hide();
    this.behaviorPanel.hide();
    this._multiTowerPanel.hide();
    // Cancel any active region-select state.
    this._cancelRegionSelect();
  }

  /**
   * Toggle a tower in/out of the multi-select group.
   * If a single tower is already selected, it is absorbed into the multi-group first.
   * Reverts to single-select when the group shrinks to one tower.
   */
  private _toggleTowerInSelection(tower: Tower): void {
    const idx = this._selectedTowers.indexOf(tower);

    if (idx >= 0) {
      // Remove from multi-select.
      this._selectedTowers.splice(idx, 1);
      tower.setMultiSelected(false);
    } else {
      // Absorb current single-select into multi-select if needed.
      if (this.selectedTower && !this._selectedTowers.includes(this.selectedTower)) {
        this._selectedTowers.push(this.selectedTower);
        this.selectedTower.setMultiSelected(true);
      }
      // Clear single-select panels.
      this.selectedTower?.setRangeVisible(false);
      this.selectedTower = null;
      this.upgradePanel.hide();
      this.behaviorPanel.hide();
      // Add the new tower.
      this._selectedTowers.push(tower);
      tower.setMultiSelected(true);
    }

    this._updateSelectionUI();
  }

  /** Sync visible panels to match the current _selectedTowers array. */
  private _updateSelectionUI(): void {
    if (this._selectedTowers.length === 0) {
      this.selectedTower?.setRangeVisible(false);
      this.selectedTower = null;
      this.upgradePanel.hide();
      this.behaviorPanel.hide();
      this._multiTowerPanel.hide();
      return;
    }

    if (this._selectedTowers.length === 1) {
      // Revert to single-select.
      const tower = this._selectedTowers[0];
      tower.setMultiSelected(false);  // use range ring instead
      this.selectedTower?.setRangeVisible(false);
      this.selectedTower = tower;
      tower.setRangeVisible(true);
      this.upgradePanel.showForTower(tower);
      this.behaviorPanel.showForTower(tower);
      this._multiTowerPanel.hide();
      return;
    }

    // Multi-select (2+ towers).
    this.selectedTower?.setRangeVisible(false);
    this.selectedTower = null;
    this.upgradePanel.hide();
    this.behaviorPanel.hide();
    this._multiTowerPanel.show(this._selectedTowers);
  }

  /**
   * Select all placed towers whose type key matches the given key AND share
   * the same upgrade-path commitment as the currently selected tower.
   *
   * "Same commitment" = identical set of locked paths.  E.g. towers that went
   * deep on path A (locking C) are grouped separately from those that went
   * deep on path C (locking A) or uncommitted towers (nothing locked).
   *
   * If only one tower matches, falls back to single selection.
   */
  private _selectAllOfType(typeKey: string): void {
    const allOfType = this.towers.filter(t => t.def.key === typeKey);
    if (allOfType.length === 0) return;

    // Determine the upgrade commitment of the "anchor" tower (the one the
    // player had selected when they hit Select All).
    const anchor = this.selectedTower
      ?? this._selectedTowers[0]
      ?? allOfType[0];
    const anchorLocked = this._lockKey(anchor);

    // Filter to towers with the same locked-path set, plus uncommitted
    // towers (nothing locked yet) which are compatible with any group.
    const matching = allOfType.filter(t => {
      const key = this._lockKey(t);
      return key === anchorLocked || key === '';
    });

    // Clear existing selection.
    this.deselectTower();

    if (matching.length === 1) {
      this.selectTower(matching[0]);
      return;
    }

    // Multi-select all matching towers.
    this._selectedTowers = [...matching];
    for (const t of this._selectedTowers) t.setMultiSelected(true);
    this.selectedTower = null;
    this._multiTowerPanel.show(this._selectedTowers);
  }

  /** Stable string key representing which paths a tower has locked. */
  private _lockKey(tower: Tower): string {
    const state = this.upgradeManager.getState(tower);
    if (!state || state.locked.size === 0) return '';
    return [...state.locked].sort().join(',');
  }

  /**
   * Apply the next upgrade on `path` to every selected tower that can afford it.
   * Deducts gold greedy-order (first tower first) while the player can still afford.
   */
  private _batchBuyUpgrade(path: 'A' | 'B' | 'C'): void {
    if (this._selectedTowers.length < 2) return;

    // Block if ANY tower in the selection has this path locked — the group
    // inherits locks from committed towers so uncommitted ones follow suit.
    if (this._selectedTowers.some(t => this.upgradeManager.getState(t)?.locked.has(path))) return;

    // Sort by tier ascending so lowest-level towers upgrade first,
    // bringing them up to match higher-level ones before advancing further.
    const sorted = [...this._selectedTowers].sort((a, b) => {
      const ta = this.upgradeManager.getState(a)?.tiers[path] ?? 0;
      const tb = this.upgradeManager.getState(b)?.tiers[path] ?? 0;
      return ta - tb;
    });

    let paid = false;
    for (const tower of sorted) {
      const cost = this.upgradeManager.getUpgradeCost(tower, path);
      if (cost > 0 && this.gold >= cost) {
        const spent = this.upgradeManager.buyUpgrade(tower, path);
        if (spent > 0) {
          this.gold -= spent;
          paid = true;
        }
      }
    }

    if (paid) {
      AudioManager.getInstance().playUiClick();
      this.hud.setGold(this.gold);
      this._multiTowerPanel.refresh(this._selectedTowers);
    }
  }

  // ── Region select ──────────────────────────────────────────────────────────

  private _updateRegionSelect(x: number, y: number): void {
    if (!this._regionSelectStart) return;
    const dx = x - this._regionSelectStart.x;
    const dy = y - this._regionSelectStart.y;

    if (!this._regionDragging && Math.hypot(dx, dy) > 8) {
      this._regionDragging = true;
      this._regionSelectGfx.setVisible(true);
    }

    if (this._regionDragging) {
      const rx = Math.min(this._regionSelectStart.x, x);
      const ry = Math.min(this._regionSelectStart.y, y);
      const rw = Math.abs(dx);
      const rh = Math.abs(dy);
      this._regionSelectGfx.clear();
      this._regionSelectGfx.fillStyle(0xc8952a, 0.08);
      this._regionSelectGfx.fillRect(rx, ry, rw, rh);
      this._regionSelectGfx.lineStyle(2, 0xc8952a, 0.85);
      this._regionSelectGfx.strokeRect(rx, ry, rw, rh);
    }
  }

  private _finalizeRegionSelect(ptr: Phaser.Input.Pointer): void {
    if (!this._regionSelectStart) return;

    const start = this._regionSelectStart;
    const rx = Math.min(start.x, ptr.x);
    const ry = Math.min(start.y, ptr.y);
    const rw = Math.abs(ptr.x - start.x);
    const rh = Math.abs(ptr.y - start.y);

    this._cancelRegionSelect();

    const selected = this.towers.filter(
      t => t.x >= rx && t.x <= rx + rw && t.y >= ry && t.y <= ry + rh,
    );

    // Clear existing selection before applying the new region result.
    this.deselectTower();

    if (selected.length === 0) return;

    if (selected.length === 1) {
      this.selectTower(selected[0]);
      return;
    }

    this._selectedTowers = [...selected];
    for (const t of this._selectedTowers) t.setMultiSelected(true);
    this.selectedTower = null;
    this._multiTowerPanel.show(this._selectedTowers);
  }

  private _cancelRegionSelect(): void {
    this._regionSelectGfx?.clear().setVisible(false);
    this._regionSelectStart = null;
    this._regionDragging    = false;
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

    if (this.selectedTower === tower || this._selectedTowers.includes(tower)) {
      this.deselectTower();
    }
    this.upgradeManager.removeTower(tower);
    this.towers = this.towers.filter(t => t !== tower);
    this._achTowersSoldRun++;
    const sellCol = tower.tileCol;
    const sellRow = tower.tileRow;
    tower.sell();
    this._placeRubble(sellCol, sellRow);
  }

  // ── rubble ─────────────────────────────────────────────────────────────────

  private _placeRubble(col: number, row: number): void {
    const key = `${col},${row}`;
    // Remove any existing rubble on this tile first (shouldn't happen, but guard).
    this._removeRubble(col, row);

    const ts      = this.mapData.tileSize;
    const cx      = col * ts + ts / 2;
    const cy      = row * ts + ts / 2;
    const variant = Math.floor(Math.random() * 3) + 1;  // 1, 2, or 3
    const sprite  = this.add
      .image(cx, cy, `rubble-0${variant}`)
      .setDepth(2)
      .setAlpha(0)
      .setRotation((Math.random() - 0.5) * 0.6);  // ±0.3 rad random rotation

    this.tweens.add({ targets: sprite, alpha: 1, duration: 400, ease: 'Sine.easeOut' });

    this._rubbleSprites.set(key, sprite);
  }

  private _removeRubble(col: number, row: number): void {
    const key = `${col},${row}`;
    const sprite = this._rubbleSprites.get(key);
    if (sprite) {
      sprite.destroy();
      this._rubbleSprites.delete(key);
    }
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
    return tileIsBuildable(tiles[row][col]);
  }

  private isTileOccupied(col: number, row: number): boolean {
    return this.towers.some(t => t.tileCol === col && t.tileRow === row);
  }

  // ── wave management ───────────────────────────────────────────────────────

  private startNextWave(): void {
    if (this.gameState === 'over') return;

    // ── Pre-boss cutscene check ──────────────────────────────────────────
    // If the upcoming wave is a boss wave, check for a pre-boss cutscene.
    // The cutscene plays BEFORE the wave starts; wave begins on cutscene complete.
    const nextWaveNum = this.currentWave + 1;
    const waveInfo = this.waveManager.getWaveAnnouncementInfo(nextWaveNum);
    if (waveInfo?.isBoss && waveInfo.bossKey) {
      const cutsceneId = getPreBossCutsceneId(waveInfo.bossKey);
      if (cutsceneId && !SaveManager.getInstance().hasSeenCutscene(cutsceneId) && !this._seenDialogIds.has(cutsceneId)) {
        const cutsceneDef = getCutsceneDef(cutsceneId);
        if (cutsceneDef) {
          SaveManager.getInstance().markCutsceneSeen(cutsceneId);
          this._seenDialogIds.add(cutsceneId);
          this.scene.launch('CutsceneScene', {
            cutscene: cutsceneDef,
            onComplete: () => this._doStartWave(),
          });
          return;
        }
      }
    }

    this._doStartWave();
  }

  /** Internal wave-start logic (called directly or after a pre-boss cutscene). */
  private _doStartWave(): void {
    if (this.gameState === 'over') return;
    this.currentWave++;
    this.gameState = 'wave';
    this.hud.setWave(this.currentWave, this.totalWaves, this.isEndlessMode);
    this.hud.setNextWaveVisible(false, 0);
    this.hud.showAirWaveAlert(''); // clear the air wave alert when the wave begins

    // Snapshot lives at wave start (for Nokomis ability restore).
    if (this.commanderState) {
      this.commanderState.waveStartLives = this.lives;
    }

    // Bounty (escape): reset per-wave tracking at the start of each new wave.
    this._bountyEscapeArmedThisWave = false;
    this.offerManager.consumeBounty(); // clear any stale bounty from previous wave

    // Supply Cache: +10 gold per owned tower at wave start.
    const supplyCacheBonus = this.offerManager.getSupplyCacheBonus(this.towers.length);
    if (supplyCacheBonus > 0) {
      this.gold += supplyCacheBonus;
      this.hud.setGold(this.gold);
      this.upgradePanel?.refresh();
    }

    this.waveManager.startWave(this.currentWave);

    // Ascension active effects — fire after wave manager starts (towers exist).
    if (this._ascensionSystem) {
      this._ascensionSystem.onWaveStart(this.currentWave, () => this.towers);
    }

    // Show or hide the rush button now that a new wave is active.
    this._updateRushButton();
  }

  /**
   * Show the wave announcement banner for the given upcoming wave number.
   * Plays the wave-type audio cue, updates firstAirWaveSeen, and for boss
   * waves triggers a camera shake + screen-edge pulse.
   */
  private showWaveBanner(waveNum: number): void {
    const info = this.waveManager.getWaveAnnouncementInfo(waveNum);
    if (!info) return;

    const isFirstAir = !this.firstAirWaveSeen &&
      (info.waveType === 'air' || info.waveType === 'mixed');
    if (isFirstAir) this.firstAirWaveSeen = true;

    this.waveBanner.show(info, this.speedMultiplier, isFirstAir);
    AudioManager.getInstance().playWaveIncoming(info.waveType);
  }

  // ── rush-wave mechanics ──────────────────────────────────────────────────

  /**
   * Player-triggered: rush the next wave while the current wave is active.
   * Awards bonus gold immediately and starts the next wave at once, stacking
   * it on top of any currently alive creeps.  Multiple consecutive rushes are
   * allowed — each call starts another wave concurrently.
   *
   * Guards:
   *   - Only valid while a wave is in progress (gameState === 'wave').
   *   - Cannot rush into a boss wave (every 5th) or the final wave.
   */
  private rushNextWave(): void {
    if (this.gameState !== 'wave') return;

    // Immediately hide the rush button — only one rush allowed at a time.
    // The button reappears in onWaveComplete once all concurrent waves settle.
    this.hud.setRushWaveVisible(false);

    // Track rush for achievement.
    this._achRushesRun++;

    // Award bonus gold immediately.
    this.gold += RUSH_GOLD_AMOUNT;
    this.hud.setGold(this.gold);
    this.upgradePanel?.refresh();

    // Visual feedback: floating "+N RUSH BONUS" near gold counter.
    this._showRushBonusFeedback(RUSH_GOLD_AMOUNT);

    // If a boss was killed this wave and the loot offer is still pending, show
    // the boss offer panel first — otherwise the pending state would bleed into
    // the next wave's post-wave queue.
    if (this._pendingBossRewardOffer && this._pendingBossName) {
      const name                   = this._pendingBossName;
      this._pendingBossName        = null;
      this._pendingBossRewardOffer = false;
      this.pendingBossKillKey      = null;
      this.openBossOfferPanel(name, () => this.startNextWave());
      return;
    }

    // No boss loot pending — clear any stale kill key to prevent bleed, then rush.
    this.pendingBossKillKey = null;
    this._doStartWave();
  }

  /**
   * Show or hide the rush-wave button based on current game state.
   * Called at the start of each wave (from _doStartWave()).
   *
   * Hidden when:
   *   - Not in 'wave' state.
   *   - The current wave is the final wave (no next wave to rush into).
   *   - The next wave is a boss wave (every 5th).
   * Always shown enabled — multiple consecutive rushes are allowed.
   */
  private _updateRushButton(): void {
    if (this.gameState !== 'wave') {
      this.hud.setRushWaveVisible(false);
      return;
    }
    // Only allow rush when no concurrent waves are running — one rush at a
    // time prevents the wave manager from stacking too many active waves.
    if (this.waveManager.isActive() && this.waveManager.activeWaveCount() > 1) {
      this.hud.setRushWaveVisible(false);
      return;
    }
    const nextWave = this.currentWave + 1;
    // Hide if there's no next wave, at the endless cap, or if it's a boss wave.
    if ((!this.isEndlessMode && nextWave > this.totalWaves) || (this.isEndlessMode && nextWave > ENDLESS_MAX_WAVE) || nextWave % 5 === 0) {
      this.hud.setRushWaveVisible(false);
      return;
    }
    this.hud.setRushWaveVisible(true, true);
  }

  /**
   * Show a floating "+N RUSH BONUS" text near the gold counter that fades out.
   * Pure visual feedback — no game-state side effects.
   */
  private _showRushBonusFeedback(bonus: number): void {
    const { width } = this.scale;
    // Position near the HUD gold counter (centred at width/2, HUD_HEIGHT/2).
    const fx = width / 2;
    const fy = getHudHeight() / 2;

    const feedbackText = this.add.text(fx, fy - 10, `+${bonus} RUSH BONUS`, {
      fontSize:        '16px',
      color:           '#f0c040',
      fontFamily:      'Georgia, serif',
      fontStyle:       'bold',
      stroke:          '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(200);

    this.tweens.add({
      targets:  feedbackText,
      y:        fy - 40,
      alpha:    0,
      duration: 1200,
      ease:     'Quad.easeOut',
      onComplete: () => feedbackText.destroy(),
    });
  }

  /**
   * Show a prominent floating "BOSS ESCAPED! -N ♥" warning near the lives
   * counter when a boss creep reaches the exit.  The larger text and red
   * colour make the heavy life penalty immediately visible.
   */
  private _showBossEscapeFeedback(liveCost: number): void {
    // Lives text is at PADDING=16 from left, HUD_HEIGHT/2 vertically.
    const fx = 80;
    const fy = getHudHeight() / 2;

    const feedbackText = this.add.text(fx, fy - 10, `BOSS ESCAPED!\n-${liveCost} ♥`, {
      fontSize:        '20px',
      color:           '#ff2222',
      fontFamily:      'Georgia, serif',
      fontStyle:       'bold',
      stroke:          '#000000',
      strokeThickness: 4,
      align:           'center',
    }).setOrigin(0.5, 1).setDepth(200);

    this.tweens.add({
      targets:  feedbackText,
      y:        fy - 70,
      alpha:    0,
      duration: 1800,
      ease:     'Quad.easeOut',
      onComplete: () => feedbackText.destroy(),
    });
  }

  private onWaveComplete(waveNum: number): void {
    if (this.gameState === 'over') return;

    // Track whether another wave is still running (rush scenario).
    // If concurrent, we still show the offer panel for this wave, but skip
    // final-wave victory processing (which waits until all waves settle).
    const isConcurrent = this.waveManager.isActive();

    // Re-evaluate the rush button — it may re-appear now that a wave settled.
    this._updateRushButton();

    const endlessComplete = this.isEndlessMode && this.currentWave >= ENDLESS_MAX_WAVE;
    if (!isConcurrent && (endlessComplete || (this.currentWave >= this.totalWaves && !this.isEndlessMode))) {
      // Cancel any remaining spawn timers (boss escorts may still be queued).
      this.waveManager.cleanup();

      // Run complete — clear the auto-save so the player starts fresh next time.
      SessionManager.getInstance().clear();

      // ── Ascension clear record ────────────────────────────────────────────
      // Record the cleared level (0 = standard run) so the next ascension unlocks.
      const ascNewUnlock = SaveManager.getInstance().recordAscensionClear(this._ascensionLevel);

      // Crystal reward scaling: baseCrystals × (1 + 0.15 × ascensionLevel).
      const ascCrystalScale = 1 + 0.15 * this._ascensionLevel;
      const baseCurrency    = calculateRunCurrency(this.totalWaves, this.totalWaves, true);
      const scaledCurrency  = Math.round(baseCurrency * ascCrystalScale);

      // Victory transition: vignette (if any) → GameOverScene.
      const proceedToVictory = () => {
        this._commitRunAchievements(true);
        const stageVignette = this.vignetteManager.check(TriggerType.STAGE_COMPLETE);
        if (stageVignette) {
          this._seenDialogIds.add(stageVignette.vignette.id);
          AudioManager.getInstance().playVictory();
          this.hud.getCommanderPortrait()?.reactVictory();
          this.gameState = 'between';
          this.vignetteOverlay.show(stageVignette.vignette, stageVignette.seenBefore, () => {
            this.gameState = 'over';
            const maxLives = this.mapData.startingLives + (this.commanderState?.startingLivesBonus ?? 0);
            this.scene.start('GameOverScene', {
              wavesCompleted:      this.totalWaves,
              totalWaves:          this.totalWaves,
              won:                 true,
              runCurrency:         scaledCurrency,
              stageId:             this.selectedStageId,
              mapId:               this.selectedMapId,
              commanderId:         this.selectedCommanderId,
              livesLeft:           this.lives,
              maxLives,
              isChallenge:         this.isChallengeRun,
              bossesKilled:        this.bossesKilled,
              ascensionLevel:      this._ascensionLevel,
              ascensionNewUnlock:  ascNewUnlock,
            });
          });
          return;
        }

        // No vignette — go straight to victory screen.
        this.gameState = 'over';
        AudioManager.getInstance().playVictory();
        this.hud.getCommanderPortrait()?.reactVictory();
        const maxLivesNoVig = this.mapData.startingLives + (this.commanderState?.startingLivesBonus ?? 0);
        this.scene.start('GameOverScene', {
          wavesCompleted:      this.totalWaves,
          totalWaves:          this.totalWaves,
          won:                 true,
          runCurrency:         scaledCurrency,
          stageId:             this.selectedStageId,
          mapId:               this.selectedMapId,
          commanderId:         this.selectedCommanderId,
          livesLeft:           this.lives,
          maxLives:            maxLivesNoVig,
          isChallenge:         this.isChallengeRun,
          bossesKilled:        this.bossesKilled,
          ascensionLevel:      this._ascensionLevel,
          ascensionNewUnlock:  ascNewUnlock,
        });
      };

      // If the final wave was a boss wave with a pending reward offer,
      // show the boss loot panel first, then proceed to the victory screen.
      if (this._pendingBossRewardOffer && this._pendingBossName) {
        const name = this._pendingBossName;
        this._pendingBossName        = null;
        this._pendingBossRewardOffer = false;
        this.gameState = 'between';
        this.openBossOfferPanel(name, proceedToVictory);
        return;
      }

      proceedToVictory();
      return;
    }
    // Endless mode: ignore the totalWaves limit and continue generating waves.

    // Achievement tracking: endless wave milestone.
    if (this.isEndlessMode) {
      AchievementManager.getInstance().onEndlessWaveReached(this.currentWave);
      this._achToast?.showBatch(AchievementManager.getInstance().drainNewlyUnlocked());
    }

    // Clear Waabizii's absorb-escapes at wave end (one-wave duration).
    if (this.commanderState) {
      this.commanderState.absorbEscapes = false;
    }

    // Update OfferManager wave state.
    // Use waveNum (the wave that actually completed) rather than currentWave
    // (which may already be incremented by a rush) for accurate tracking.
    this.offerManager.setWavesCompleted(waveNum);
    this.offerManager.resetWavePlacements();

    // Interest: bonus gold = 2% of current gold each wave.
    const interestBonus = Math.round(this.offerManager.getInterestBonus(this.gold) * this._getAscGoldMult());
    if (interestBonus > 0) {
      this.gold += interestBonus;
      this.hud.setGold(this.gold);
    }

    // Jackpot: 20% chance of +200 bonus gold each wave.
    const jackpotBonus = Math.round(this.offerManager.getJackpotBonus() * this._getAscGoldMult());
    if (jackpotBonus > 0) {
      this.gold += jackpotBonus;
      this.hud.setGold(this.gold);
    }

    if (interestBonus > 0 || jackpotBonus > 0) {
      this.upgradePanel?.refresh();
    }

    this.gameState = 'between';
    AudioManager.getInstance().playWaveComplete();

    // ── Auto-save checkpoint — wave complete, between-wave state ────────────
    // This is the cleanest save point: no active creeps, tower state is stable.
    this._doAutoSave();

    // ── Post-wave UI queue — show panels in strict priority order ────────────
    // 1) Boss loot/gear reward → 2) Elder dialog → 3) Between-wave upgrade offers
    // Each panel is fully dismissed before the next appears.
    //
    // When a concurrent wave is still running (rush scenario), don't clobber
    // a currently-showing panel — just append new items to the tail so they
    // display sequentially after the in-progress item finishes.
    if (!this._postWaveQueue.isActive) {
      this._postWaveQueue.clear();
    }

    // 1. Boss loot/gear reward (boss waves only, deferred from boss-killed event).
    if (this._pendingBossRewardOffer && this._pendingBossName) {
      const name = this._pendingBossName;
      this._postWaveQueue.enqueue({
        show: (onDismiss) => this.openBossOfferPanel(name, onDismiss),
      });
    }
    // 1b. Post-boss victory cutscene (after boss loot panel).
    if (this.pendingBossKillKey) {
      const postBossCutsceneId = getPostBossCutsceneId(this.pendingBossKillKey);
      if (postBossCutsceneId && !SaveManager.getInstance().hasSeenCutscene(postBossCutsceneId) && !this._seenDialogIds.has(postBossCutsceneId)) {
        const postBossDef = getCutsceneDef(postBossCutsceneId);
        if (postBossDef) {
          SaveManager.getInstance().markCutsceneSeen(postBossCutsceneId);
          this._seenDialogIds.add(postBossCutsceneId);
          this._postWaveQueue.enqueue({
            show: (onDismiss) => {
              this.scene.launch('CutsceneScene', {
                cutscene: postBossDef,
                onComplete: onDismiss,
              });
            },
          });
        }
      }
    }

    // Always consume the pending boss state (even if no reward offer).
    this._pendingBossName        = null;
    this._pendingBossRewardOffer = false;

    // 2. Elder dialog (vignette — boss-killed, wave-complete, or wave-start).
    const vignetteEntry = this._buildBetweenWaveVignetteEntry();
    if (vignetteEntry) {
      this._postWaveQueue.enqueue(vignetteEntry);
    }

    // 3. Between-wave upgrade offers (BetweenWaveScene).
    // When concurrent (rush scenario), wave waveNum+1 is already running, so
    // display that as the upcoming wave in the panel rather than currentWave+1.
    const nextWaveForDisplay = isConcurrent ? waveNum + 1 : this.currentWave + 1;
    const nextWaveInfo: WaveAnnouncementInfo | null =
      this.waveManager.getWaveAnnouncementInfo(nextWaveForDisplay);
    const offerCount = this.commanderState?.offerCardCount ?? 3;
    this._postWaveQueue.enqueue({
      show: (onDismiss) => {
        this._betweenWaveDismiss = onDismiss;
        this.scene.launch('BetweenWaveScene', {
          offerManager:      this.offerManager,
          waveJustCompleted: waveNum,
          nextWave:          nextWaveForDisplay,
          nextWaveInfo:      nextWaveInfo ?? undefined,
          rerollTokens:      this._rerollTokens,
          placedTowerKeys:   this.towers.map(t => t.def.key),
          offerCount,
        });
      },
    });

    // Start the sequence — panels appear one at a time.
    this._postWaveQueue.flush();
    // NOTE: this.hud.setNextWaveVisible() is called by the 'between-wave-offer-picked'
    // listener after the player makes their selection.
  }

  /**
   * Check for any between-wave vignettes and return a queue entry that will
   * show the vignette when its turn arrives in the post-wave queue.
   *
   * Calling this method IMMEDIATELY marks any found vignette as fired/seen
   * (via VignetteManager.check), so it must be called only once per wave.
   * Returns null if no vignette fires for this wave.
   *
   * Priority order: BOSS_KILLED (queued) → WAVE_COMPLETE → WAVE_START (next).
   */
  private _buildBetweenWaveVignetteEntry(): PostWaveEntry | null {
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

    if (!result) return null;

    this._seenDialogIds.add(result.vignette.id);
    const capturedResult = result;
    return {
      show: (onDismiss) => {
        this.vignetteOverlay.show(capturedResult.vignette, capturedResult.seenBefore, onDismiss);
      },
    };
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
    // Halve particle budget on mobile to reduce GPU load.
    const PARTICLE_COUNT = Math.round(16 * MobileManager.getInstance().particleScale());

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
  private openBossOfferPanel(bossName: string, onClosed: () => void): void {
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
      onClosed,
    );
  }

  // ── debug overlay ──────────────────────────────────────────────────────────

  private toggleDebugOverlay(): void {
    this.debugVisible = !this.debugVisible;
    if (this.debugVisible) {
      if (!this.debugOverlay) {
        this.debugOverlay = this.add.text(8, getHudHeight() + 4, '', {
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

  /**
   * Give Up / Quit — clears autosave and returns immediately to main menu.
   * Used by the Give Up button (all game modes).
   */
  private _quitToMainMenu(): void {
    if (this.gameState === 'over') return;
    this.gameState = 'over';
    SessionManager.getInstance().clear();
    this._commitRunAchievements(false);
    this.waveManager.cleanup();
    this.scene.start('MainMenuScene');
  }

  private triggerGameOver(): void {
    if (this.gameState === 'over') return;
    this.gameState = 'over';
    // Clear auto-save — run is finished (defeat or give-up).
    SessionManager.getInstance().clear();
    // Commit per-run achievement stats (kills, bosses, rerolls) even on defeat.
    this._commitRunAchievements(false);
    // Stop any pending post-wave panels from appearing after game-over.
    this._postWaveQueue.clear();
    this._betweenWaveDismiss     = null;
    this._pendingBossName        = null;
    this._pendingBossRewardOffer = false;
    AudioManager.getInstance().playGameOver();
    this.hud.getCommanderPortrait()?.reactGameOver();
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
      isChallenge:    this.isChallengeRun,
      bossesKilled:   this.bossesKilled,
    });
  }

  // ── commander ability ─────────────────────────────────────────────────────

  private activateCommanderAbility(): void {
    if (!this.commanderDef || !this.commanderState) return;
    if (this.commanderState.abilityUsed) return;

    this.commanderState.abilityUsed = true;
    this.hud.disableAbilityButton();
    this.hud.getCommanderPortrait()?.markAbilityUsed();

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

  // ── Session persistence helpers ───────────────────────────────────────────

  /**
   * Serialise the current run state to sessionStorage.
   * Called at wave-end, visibilitychange, and pagehide checkpoints.
   * Only meaningful between waves (gameState === 'between').
   */
  private _doAutoSave(): void {
    if (this.gameState === 'over') return;
    SessionManager.getInstance().save({
      mapId:           this.selectedMapId,
      stageId:         this.selectedStageId,
      commanderId:     this.selectedCommanderId,
      currentWave:     this.currentWave,
      gold:            this.gold,
      lives:           this.lives,
      totalKills:      this._totalKills,
      goldEarned:      this._goldEarned,
      towers:          this.towers.map(t => {
        const state = this.upgradeManager.getState(t);
        return {
          key:        t.def.key,
          col:        t.tileCol,
          row:        t.tileRow,
          upgrades:   {
            A: state?.tiers.A ?? 0,
            B: state?.tiers.B ?? 0,
            C: state?.tiers.C ?? 0,
          },
          totalSpent: state?.totalSpent ?? 0,
        };
      }),
      offers:          this.offerManager.getActiveIds(),
      consumedOffers:  this.offerManager.getConsumedOneTimeOfferIds(),
      metaStatBonuses: this._towerMetaUpgrades,
      seenDialogs:     Array.from(this._seenDialogIds),
      isChallenge:     this.isChallengeRun || undefined,
      challengeId:     this.isChallengeRun ? (this._challengeId ?? undefined) : undefined,
    });
  }

  /**
   * Show a resume-prompt overlay asking the player if they want to continue
   * a previous mid-run session.
   */
  private _showResumePrompt(autoSave: AutoSave): void {
    const { width, height } = this.scale;
    const cx = width  / 2;
    const cy = height / 2;

    const container = this.add.container(0, 0).setDepth(500);

    // Dark backdrop.
    const backdrop = this.add.rectangle(cx, cy, width, height, 0x000000, 0.75);
    container.add(backdrop);

    // Card background.
    const card = this.add.rectangle(cx, cy, 380, 180, PAL.bgPanel)
      .setStrokeStyle(2, PAL.borderActive);
    container.add(card);

    // Title.
    const title = this.add.text(cx, cy - 56, 'Resume run?', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: PAL.fontBody,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(title);

    // Wave info.
    const info = this.add.text(cx, cy - 24, `Continue from Wave ${autoSave.currentWave + 1}`, {
      fontSize: '16px',
      color: PAL.textNeutral,
      fontFamily: PAL.fontBody,
    }).setOrigin(0.5);
    container.add(info);

    // Stats row.
    const stats = this.add.text(
      cx, cy + 4,
      `Gold: ${autoSave.gold}  |  Lives: ${autoSave.lives}  |  Towers: ${autoSave.towers.length}`,
      { fontSize: '13px', color: PAL.textMuted, fontFamily: PAL.fontBody },
    ).setOrigin(0.5);
    container.add(stats);

    // YES button.
    const yesBg = this.add.rectangle(cx - 80, cy + 50, 120, 40, PAL.accentGreenN, 1)
      .setInteractive({ useHandCursor: true });
    const yesLabel = this.add.text(cx - 80, cy + 50, 'YES', {
      fontSize: '15px', color: '#000000', fontFamily: PAL.fontBody, fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(yesBg);
    container.add(yesLabel);

    yesBg.on('pointerup', () => {
      container.destroy();
      this._restoreFromAutoSave(autoSave);
    });

    // NO button.
    const noBg = this.add.rectangle(cx + 80, cy + 50, 120, 40, PAL.bgGiveUp, 1)
      .setStrokeStyle(1, PAL.dangerN)
      .setInteractive({ useHandCursor: true });
    const noLabel = this.add.text(cx + 80, cy + 50, 'NO — Start Fresh', {
      fontSize: '12px', color: PAL.danger, fontFamily: PAL.fontBody,
    }).setOrigin(0.5);
    container.add(noBg);
    container.add(noLabel);

    noBg.on('pointerup', () => {
      container.destroy();
      // Clear save so the normal wave-1 flow proceeds.
      SessionManager.getInstance().clear();
    });
  }

  /**
   * Restore game state from an auto-save snapshot.
   * Called when the player taps YES on the resume prompt.
   */
  private _restoreFromAutoSave(autoSave: AutoSave): void {
    // ── Restore scalar state ───────────────────────────────────────────────
    this.gold        = autoSave.gold;
    this.lives       = autoSave.lives;
    this.currentWave = autoSave.currentWave;
    this._totalKills = autoSave.totalKills;
    this._goldEarned = autoSave.goldEarned;
    this.gameState   = 'between';

    // ── Restore seen-dialog memory (prevents replaying already-shown dialogs) ──
    if (autoSave.seenDialogs) {
      for (const id of autoSave.seenDialogs) {
        this._seenDialogIds.add(id);
      }
      this.vignetteManager.restoreFiredIds(autoSave.seenDialogs);
    }

    this.hud.setGold(this.gold);
    this.hud.setLives(this.lives);
    this.hud.setWave(this.currentWave, this.totalWaves, this.isEndlessMode);

    // ── Restore offers ────────────────────────────────────────────────────
    this.offerManager.restoreFromIds(
      autoSave.offers,
      autoSave.consumedOffers ?? [],
    );
    this.offerManager.setCurrentLives(this.lives);
    this.offerManager.setWavesCompleted(autoSave.currentWave);

    // ── Restore towers ────────────────────────────────────────────────────
    for (const saved of autoSave.towers) {
      this._placeRestoredTower(saved);
    }

    // ── Show next-wave button for wave N+1 ────────────────────────────────
    this.hud.setNextWaveVisible(true, this.currentWave + 1, this.isEndlessMode);

    // Show banner for the upcoming wave (slightly deferred so HUD is ready).
    this.time.delayedCall(200, () => this.showWaveBanner(this.currentWave + 1));
  }

  /**
   * Re-create a single tower from its saved state and replay its upgrades.
   * Gold is NOT deducted — the saved `gold` field already reflects post-purchase state.
   */
  private _placeRestoredTower(saved: AutoSaveTower): void {
    const def = ALL_TOWER_DEFS.find(d => d.key === saved.key);
    if (!def) return;
    if (this.isTileOccupied(saved.col, saved.row)) return;
    // Clear any rubble that might exist on this tile from a previous sell.
    this._removeRubble(saved.col, saved.row);

    const tower = new Tower(
      this,
      saved.col,
      saved.row,
      this.mapData.tileSize,
      def,
      () => this.activeCreeps,
      (proj) => this.projectiles.add(proj),
      this.offerManager,
      (key) => AudioManager.getInstance().playProjectileFired(key),
      this.commanderState ?? undefined,
      (x, y, r) => this.spatialGrid.queryRadius(x, y, r),
    );

    this.upgradeManager.registerTower(tower);

    // Re-apply upgrades tier by tier — paths in order A, B, C.
    // buyUpgrade returns the cost; we discard it (no gold deduction).
    // IMPORTANT: gear and meta bonuses must be applied AFTER this loop.
    // Each buyUpgrade() call invokes applyStatsToTower() which recomputes
    // upgStats from defaultUpgradeStats + upgrade deltas, erasing any
    // bonuses applied beforehand.
    const tiers = saved.upgrades;
    for (const path of ['A', 'B', 'C'] as const) {
      const targetTier = tiers[path] ?? 0;
      for (let i = 0; i < targetTier; i++) {
        this.upgradeManager.buyUpgrade(tower, path);
      }
    }

    // Apply gear bonuses (same as tryPlaceTower) — must come after buyUpgrade loop.
    const gearBonuses = resolveGearBonuses(def.key);
    if (gearBonuses.damagePct || gearBonuses.rangePct || gearBonuses.attackSpeedPct ||
        gearBonuses.chainCountBonus || gearBonuses.slowPctBonus || gearBonuses.auraStrengthPct ||
        gearBonuses.specialEffects.length > 0) {
      applyGearToStats(tower.upgStats, gearBonuses);
    }

    // Apply permanent meta-upgrade bonuses (after gear bonuses, after buyUpgrade loop).
    this._applyTowerMetaBonuses(tower);

    // Store gear+meta so every future buyUpgrade / respec re-applies them.
    this.upgradeManager.setTowerBonuses(
      tower, gearBonuses, this._towerMetaUpgrades[tower.def.key] ?? {},
    );

    tower.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      const shiftHeld = !MobileManager.getInstance().isMobile() &&
        ((ptr.event as MouseEvent)?.shiftKey ?? false);
      if (shiftHeld) {
        this._toggleTowerInSelection(tower);
      } else {
        this.selectTower(tower);
      }
    });
    this.towers.push(tower);
  }

  /**
   * Show a full-screen "Game paused — tap to resume" overlay.
   * Used during WebGL context loss until context is restored.
   */
  private _showWebGlOverlay(): void {
    if (this._webglOverlay) return; // already showing

    const { width, height } = this.scale;
    const container = this.add.container(0, 0).setDepth(1000);

    container.add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85));
    container.add(this.add.text(width / 2, height / 2, 'Game paused\u2014tap to resume', {
      fontSize:   '24px',
      color:      '#ffffff',
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5));

    this._webglOverlay = container;
  }

  /**
   * Remove the WebGL context-loss overlay.
   */
  private _hideWebGlOverlay(): void {
    this._webglOverlay?.destroy();
    this._webglOverlay = null;
  }

  // ── Achievement helpers ────────────────────────────────────────────────────

  /**
   * Called at end of run (victory or defeat) to commit per-run achievement
   * stats (kills, bosses, rerolls) to the lifetime counters in SaveManager,
   * and to check victory-specific achievements.
   *
   * @param won  True for a normal-mode victory; false for defeat/give-up/endless.
   */
  private _commitRunAchievements(won: boolean): void {
    const am = AchievementManager.getInstance();

    // Commit lifetime stats.
    am.addKills(this._totalKills);
    am.addBosses(this.bossesKilled);
    am.addAirKills(this._achAirKillsRun);
    am.addTowersSold(this._achTowersSoldRun);
    am.addRushes(this._achRushesRun);
    am.addLifetimeGold(this._goldEarned);

    // Rerolls used = tokens granted at run start minus tokens remaining.
    const rerollsUsed = Math.max(0, this._achInitialRerolls - this._rerollTokens);
    am.addRerolls(rerollsUsed);

    if (won && !this.isEndlessMode) {
      am.addWins(1);
      // Compute all-towers-upgraded check: every on-field tower has totalSpent > 0.
      const allUpgraded = this.towers.length > 0 &&
        this.towers.every(t => (this.upgradeManager.getState(t)?.totalSpent ?? 0) > 0);

      const victoryData: VictoryData = {
        stageId:           this.selectedStageId,
        commanderId:       this.selectedCommanderId,
        livesLeft:         this.lives,
        maxLives:          this.mapData.startingLives + (this.commanderState?.startingLivesBonus ?? 0),
        towerTypesUsed:    Array.from(this._achTowerTypesRun),
        allTowersUpgraded: allUpgraded,
        goldEarned:        this._goldEarned,
        consumablesUsed:   this._achConsumablesUsedRun,
      };
      am.onVictory(victoryData);
    }

    // Show toasts for any newly unlocked achievements.
    this._achToast?.showBatch(am.drainNewlyUnlocked());
  }
}
