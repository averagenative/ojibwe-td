/**
 * SaveManager — persistent run-currency and unlock state.
 *
 * Singleton. Reads from / writes to localStorage under key 'ojibwe-td-save'.
 * Degrades gracefully when localStorage is unavailable (private browsing, etc.).
 *
 * Schema version = 1. On version mismatch the data is reset and `lastWarning`
 * is set so callers can surface a one-time notice to the player.
 *
 * Phaser-free — safe for use in any context.
 */

import { MAX_META_TIER, META_TIER_COSTS } from '../data/towerMetaUpgradeDefs';

const SAVE_KEY     = 'ojibwe-td-save';
const SCHEMA_VER   = 1;

/** Maximum plausible currency a legitimate playthrough can accumulate. */
export const MAX_CURRENCY = 999_999;

// ── Achievements ─────────────────────────────────────────────────────────────

/** Persisted achievement state. */
export interface AchievementSaveData {
  /** IDs of achievements that have been fully unlocked. */
  unlocked: string[];
  /**
   * Partial progress counters, keyed by achievement ID.
   * Only stored when the value is > 0.
   * The final unlock writes the achievement to `unlocked` and removes it here.
   */
  progress: Record<string, number>;
  /**
   * Raw lifetime stat counters (e.g. total kills, games played).
   * These are incremented independently of achievement progress so the data
   * is always available, even after the corresponding achievement is unlocked.
   *
   * Known keys:
   *   'kills'            — total creeps killed across all runs
   *   'bosses'           — total bosses killed across all runs
   *   'towersBuilt'      — total towers placed across all runs
   *   'gamesPlayed'      — total game runs started
   *   'crystalsSpent'    — total crystals spent in the meta shop
   *   'rerollsTotal'     — total rerolls used across all runs
   *   'maxUpgradedTypes' — count of distinct tower types ever fully upgraded (a path at tier 5)
   */
  stats: Record<string, number>;
}

// ── Crystal sink consumables ────────────────────────────────────────────────

/** Counts of pending consumable items waiting to be applied at run start. */
export interface ConsumablePending {
  rerollTokens:    number;  // each grants one offer reroll during a between-wave screen
  goldBoostTokens: number;  // each grants +50 starting gold for the run
  extraLifeTokens: number;  // each grants +1 starting life for the run
}

/** Crystal costs for each repeatable consumable purchase. */
export const CONSUMABLE_COSTS: Readonly<Record<keyof ConsumablePending, number>> = {
  rerollTokens:    50,
  goldBoostTokens: 100,
  extraLifeTokens: 150,
} as const;

/** Gold bonus per goldBoostToken. */
export const GOLD_BOOST_AMOUNT = 50;

/** Maximum tokens of any single consumable type that can be held at once. */
const MAX_CONSUMABLE_TOKENS = 99;

/** Serialised gear data stored alongside the save. */
export interface GearSaveData {
  inventory: GearSaveItem[];
  equipped: Record<string, (string | null)[]>;
}

/** Serialised shape of a gear item in the save file. */
export interface GearSaveItem {
  uid:          string;
  defId:        string;
  enhanceLevel: number;
  rune?:        unknown;
  isNew?:       boolean;
}

/** Serialised commander XP data. */
export interface CommanderXpData {
  /** Keyed by commanderId → total XP earned. */
  xp:                Record<string, number>;
  /** Keyed by commanderId → equipped enhancement IDs per slot. */
  enhancementSlots:  Record<string, (string | null)[]>;
}

interface SaveData {
  version:          number;
  currency:         number;
  unlocks:          string[];
  /** ID of the last stage the player started a run on. Used for retry continuity. */
  lastPlayedStage:  string;
  // Audio settings — added additively; back-filled for old saves via defaultSaveData spread.
  audioMaster:     number;
  audioSfx:        number;
  audioMusic:      number;
  audioMuted:      boolean;
  audioMusicMuted: boolean;
  audioSfxMuted:   boolean;
  /**
   * Best endless-mode wave reached per map, keyed by mapId (e.g. 'map-01').
   * Value is the highest wave number the player survived before dying.
   */
  endlessRecords:   Record<string, number>;
  /** Vignette IDs that have been seen across all sessions. */
  seenVignetteIds:  string[];
  /** Codex entry IDs that have been unlocked. */
  unlockedCodexIds: string[];
  /** Codex entry IDs that have been viewed/read by the player. */
  readCodexIds: string[];
  /**
   * Best moon rating (1–5) per stage, keyed by stageId.
   * Stages never played are absent (not stored as 0).
   */
  stageMoons: Record<string, number>;

  // ── Deep progression (additive fields — back-filled) ──────────────────────

  /** Gear inventory and equip state. */
  gearData:       GearSaveData;
  /** Commander XP and enhancement slots. */
  commanderXp:    CommanderXpData;
  /** Challenge map weekly featured ID (rotates weekly). */
  challengeWeek:  string;

  /**
   * Pending consumable items purchased with crystals that will be applied
   * at the start of the next run and cleared once consumed.
   */
  pendingConsumables: ConsumablePending;

  /** When true the UI switches to a colorblind-friendly palette (red→orange, green→blue). */
  colorblindMode: boolean;

  /** Achievement unlock state and progress counters. */
  achievements: AchievementSaveData;

  /**
   * Boss keys that the player has defeated at least once across all runs.
   * Used by the meta-screen ambiance system to display boss trophies.
   * Known keys: 'makwa', 'migizi', 'waabooz', 'animikiins'.
   */
  defeatedBosses: string[];

  /** Cutscene IDs that have been seen across all sessions. */
  seenCutsceneIds: string[];

  /**
   * The highest ascension level the player has ever cleared (-1 = no run cleared).
   * Determines which ascension levels are available for selection.
   * Ascension 1 unlocks after clearing a standard run (ascension 0).
   */
  highestAscensionCleared: number;

  /**
   * The ascension level the player chose at the pre-run screen for the current
   * or most-recent run.  Persisted so the UI defaults to the last choice.
   * Range: 0–10.  Clamped to highestAscensionCleared + 1 on load.
   */
  currentAscension: number;

  /**
   * Permanent meta-upgrade tiers for tower base stats.
   * Outer key = tower type key (e.g. 'arrow', 'frost').
   * Inner key = stat track key (e.g. 'damage', 'range').
   * Value = current tier (0 = not upgraded, max = MAX_META_TIER).
   */
  towerMetaUpgrades: Record<string, Record<string, number>>;

  /**
   * djb2 checksum of the serialised save data (excluding this field).
   * Used to detect casual manual tampering via browser DevTools.
   * Optional so old saves without the field still load gracefully.
   */
  _checksum?: string;
}

function defaultSaveData(): SaveData {
  return {
    version:         SCHEMA_VER,
    currency:        0,
    unlocks:         [],
    lastPlayedStage: 'zaagaiganing-01',
    audioMaster:     1,
    audioSfx:        1,
    audioMusic:      0.3,
    audioMuted:      false,
    audioMusicMuted: false,
    audioSfxMuted:   false,
    endlessRecords:  {},
    seenVignetteIds: [],
    unlockedCodexIds: [],
    readCodexIds: [],
    stageMoons: {},
    gearData:           { inventory: [], equipped: {} },
    commanderXp:        { xp: {}, enhancementSlots: {} },
    challengeWeek:      '',
    pendingConsumables: { rerollTokens: 0, goldBoostTokens: 0, extraLifeTokens: 0 },
    colorblindMode:     false,
    achievements:       { unlocked: [], progress: {}, stats: {} },
    defeatedBosses:     [],
    seenCutsceneIds:    [],
    highestAscensionCleared: -1,
    currentAscension:        0,
    towerMetaUpgrades:       {},
  };
}

export class SaveManager {
  private static _instance: SaveManager | null = null;

  private data:             SaveData;
  private storageAvailable: boolean;

  /** Set when a non-fatal storage issue occurs (version mismatch, quota exceeded). */
  lastWarning: string | null = null;

  private constructor() {
    this.storageAvailable = SaveManager._testStorage();
    this.data             = defaultSaveData();
    this._load();
  }

  static getInstance(): SaveManager {
    if (!SaveManager._instance) SaveManager._instance = new SaveManager();
    return SaveManager._instance;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  getCurrency(): number {
    return this.data.currency;
  }

  addCurrency(amount: number): void {
    if (amount <= 0) return;
    this.data.currency += amount;
    this._save();
  }

  spendCurrency(amount: number): boolean {
    if (this.data.currency < amount) return false;
    this.data.currency -= amount;
    this._save();
    return true;
  }

  isUnlocked(id: string): boolean {
    return this.data.unlocks.includes(id);
  }

  /** Get the ID of the last stage the player started. */
  getLastPlayedStage(): string {
    return this.data.lastPlayedStage;
  }

  // ── Endless mode records ────────────────────────────────────────────────────

  /**
   * Return the best endless-mode wave reached on a given map (0 if never played).
   * @param mapId  The pathFile / mapId key (e.g. 'map-01').
   */
  getEndlessRecord(mapId: string): number {
    return this.data.endlessRecords?.[mapId] ?? 0;
  }

  /**
   * Update the endless record for a map if `wave` exceeds the stored value.
   * Idempotent — no-op when the new wave is not higher than the current record.
   */
  updateEndlessRecord(mapId: string, wave: number): void {
    if (!this.data.endlessRecords) this.data.endlessRecords = {};
    const current = this.data.endlessRecords[mapId] ?? 0;
    if (wave > current) {
      this.data.endlessRecords[mapId] = wave;
      this._save();
    }
  }

  /**
   * Persist the last-played stage ID so retry brings the player back to the same stage.
   */
  setLastPlayedStage(stageId: string): void {
    this.data.lastPlayedStage = stageId;
    this._save();
  }

  /**
   * Purchase an unlock. Idempotent — re-buying returns true without deducting gold.
   * Returns false if the player cannot afford it.
   */
  purchaseUnlock(id: string, cost: number): boolean {
    if (this.isUnlocked(id)) return true;
    if (this.data.currency < cost) return false;
    this.data.currency -= cost;
    this.data.unlocks.push(id);
    this._save();
    return true;
  }

  // ── Audio settings ─────────────────────────────────────────────────────────

  getAudioSettings(): {
    master: number; sfx: number; music: number; muted: boolean;
    musicMuted: boolean; sfxMuted: boolean;
  } {
    return {
      master:     this.data.audioMaster,
      sfx:        this.data.audioSfx,
      music:      this.data.audioMusic,
      muted:      this.data.audioMuted,
      musicMuted: this.data.audioMusicMuted,
      sfxMuted:   this.data.audioSfxMuted,
    };
  }

  setAudioSettings(
    master: number, sfx: number, music: number, muted: boolean,
    musicMuted = false, sfxMuted = false,
  ): void {
    this.data.audioMaster     = master;
    this.data.audioSfx        = sfx;
    this.data.audioMusic      = music;
    this.data.audioMuted      = muted;
    this.data.audioMusicMuted = musicMuted;
    this.data.audioSfxMuted   = sfxMuted;
    this._save();
  }

  // ── Moon ratings ───────────────────────────────────────────────────────────

  /**
   * Return the best moon rating (1–5) for a stage, or 0 if never completed.
   * @param stageId  The stage identifier (e.g. 'zaagaiganing-01').
   */
  getStageMoons(stageId: string): number {
    return this.data.stageMoons?.[stageId] ?? 0;
  }

  /**
   * Persist a moon rating for a stage.  Only updates when the new rating
   * exceeds the existing best (idempotent for equal or lower ratings).
   */
  setStageMoons(stageId: string, moons: number): void {
    if (!this.data.stageMoons) this.data.stageMoons = {};
    const current = this.data.stageMoons[stageId] ?? 0;
    if (moons > current) {
      this.data.stageMoons[stageId] = moons;
      this._save();
    }
  }

  // ── Vignettes & Codex ──────────────────────────────────────────────────────

  /** Returns true if this vignette ID has been seen in any previous session. */
  hasSeenVignette(id: string): boolean {
    return this.data.seenVignetteIds?.includes(id) ?? false;
  }

  /** Return the full list of seen vignette IDs. */
  getSeenVignetteIds(): string[] {
    return this.data.seenVignetteIds ?? [];
  }

  /** Mark a vignette as seen. Idempotent. */
  markVignetteSeen(id: string): void {
    if (!this.data.seenVignetteIds) this.data.seenVignetteIds = [];
    if (this.data.seenVignetteIds.includes(id)) return;
    this.data.seenVignetteIds.push(id);
    this._save();
  }

  /** Returns true if this codex entry ID has been unlocked. */
  isCodexUnlocked(id: string): boolean {
    return this.data.unlockedCodexIds?.includes(id) ?? false;
  }

  /** Unlock a codex entry. Idempotent. */
  unlockCodexEntry(id: string): void {
    if (!this.data.unlockedCodexIds) this.data.unlockedCodexIds = [];
    if (this.data.unlockedCodexIds.includes(id)) return;
    this.data.unlockedCodexIds.push(id);
    this._save();
  }

  /** Return the full list of unlocked codex entry IDs. */
  getUnlockedCodexIds(): string[] {
    return this.data.unlockedCodexIds ?? [];
  }

  /** Return the count of newly unlocked codex entries since last check. */
  getNewCodexCount(lastKnownIds: string[]): number {
    const unlocked = this.data.unlockedCodexIds ?? [];
    return unlocked.filter(id => !lastKnownIds.includes(id)).length;
  }

  /** Returns true if this codex entry has been read/viewed by the player. */
  isCodexRead(id: string): boolean {
    return this.data.readCodexIds?.includes(id) ?? false;
  }

  /** Mark a codex entry as read. Idempotent. */
  markCodexRead(id: string): void {
    if (!this.data.readCodexIds) this.data.readCodexIds = [];
    if (this.data.readCodexIds.includes(id)) return;
    this.data.readCodexIds.push(id);
    this._save();
  }

  /** Mark all unlocked codex entries as read. */
  markAllCodexRead(unlockedIds: string[]): void {
    if (!this.data.readCodexIds) this.data.readCodexIds = [];
    let changed = false;
    for (const id of unlockedIds) {
      if (!this.data.readCodexIds.includes(id)) {
        this.data.readCodexIds.push(id);
        changed = true;
      }
    }
    if (changed) this._save();
  }

  /** Return the full list of read codex entry IDs. */
  getReadCodexIds(): string[] {
    return this.data.readCodexIds ?? [];
  }

  /**
   * Return the number of unlocked-but-unread codex entries.
   * Counts both explicitly unlocked entries and default-unlocked entries
   * that the player has not yet viewed.
   */
  getUnreadCodexCount(allEntries: readonly { id: string; defaultUnlocked?: boolean }[]): number {
    const unlocked = this.data.unlockedCodexIds ?? [];
    const read     = this.data.readCodexIds ?? [];
    const defaultIds = new Set(allEntries.filter(e => e.defaultUnlocked).map(e => e.id));
    let count = 0;
    for (const id of unlocked) {
      if (!read.includes(id)) count++;
    }
    // Also count default-unlocked entries that are not read
    for (const id of defaultIds) {
      if (!unlocked.includes(id) && !read.includes(id)) count++;
    }
    return count;
  }

  // ── Gear inventory ──────────────────────────────────────────────────────────

  /** Get the raw gear save data (inventory + equip map). */
  getGearData(): GearSaveData {
    return this.data.gearData ?? { inventory: [], equipped: {} };
  }

  /** Persist the gear save data. */
  setGearData(gearData: GearSaveData): void {
    this.data.gearData = gearData;
    this._save();
  }

  // ── Commander XP & Enhancements ─────────────────────────────────────────────

  /** Get total XP for a commander. */
  getCommanderXp(commanderId: string): number {
    return this.data.commanderXp?.xp?.[commanderId] ?? 0;
  }

  /** Add XP to a commander. */
  addCommanderXp(commanderId: string, xp: number): void {
    if (xp <= 0) return;
    if (!this.data.commanderXp) this.data.commanderXp = { xp: {}, enhancementSlots: {} };
    if (!this.data.commanderXp.xp) this.data.commanderXp.xp = {};
    this.data.commanderXp.xp[commanderId] = (this.data.commanderXp.xp[commanderId] ?? 0) + xp;
    this._save();
  }

  /** Get equipped enhancement IDs for a commander (up to 3 slots). */
  getCommanderEnhancements(commanderId: string): (string | null)[] {
    return this.data.commanderXp?.enhancementSlots?.[commanderId] ?? [null, null, null];
  }

  /** Set an enhancement in a specific slot for a commander. */
  setCommanderEnhancement(commanderId: string, slot: number, enhancementId: string | null): void {
    if (slot < 0 || slot > 2) return;
    if (!this.data.commanderXp) this.data.commanderXp = { xp: {}, enhancementSlots: {} };
    if (!this.data.commanderXp.enhancementSlots) this.data.commanderXp.enhancementSlots = {};
    if (!this.data.commanderXp.enhancementSlots[commanderId]) {
      this.data.commanderXp.enhancementSlots[commanderId] = [null, null, null];
    }
    this.data.commanderXp.enhancementSlots[commanderId][slot] = enhancementId;
    this._save();
  }

  /** Get the current week's challenge map rotation ID. */
  getChallengeWeek(): string {
    return this.data.challengeWeek ?? '';
  }

  /** Set the current week's challenge map rotation ID. */
  setChallengeWeek(mapId: string): void {
    this.data.challengeWeek = mapId;
    this._save();
  }

  // ── Accessibility settings ──────────────────────────────────────────────────

  /** True when the colorblind-friendly palette is active. */
  getColorblindMode(): boolean {
    return this.data.colorblindMode ?? false;
  }

  /** Persist the colorblind mode preference. */
  setColorblindMode(enabled: boolean): void {
    this.data.colorblindMode = enabled;
    this._save();
  }

  // ── Crystal-sink consumables ────────────────────────────────────────────────

  /** Return the current pending consumable counts. */
  getPendingConsumables(): ConsumablePending {
    return { ...this.data.pendingConsumables };
  }

  /**
   * Purchase one unit of a consumable type, deducting its crystal cost.
   * Returns true on success, false if the player can't afford it or the
   * token cap (99) has already been reached for that type.
   */
  purchaseConsumable(type: keyof ConsumablePending): boolean {
    const cost = CONSUMABLE_COSTS[type];
    if (this.data.currency < cost) return false;
    if ((this.data.pendingConsumables[type] ?? 0) >= MAX_CONSUMABLE_TOKENS) return false;
    this.data.currency -= cost;
    this.data.pendingConsumables[type] = (this.data.pendingConsumables[type] ?? 0) + 1;
    this._save();
    return true;
  }

  /**
   * Consume (and clear) all pending run consumables.
   * Returns a snapshot of the counts before they were cleared.
   * Call at the start of a new run — GameScene applies the bonuses then
   * discards the snapshot.
   */
  consumeAndClearRunConsumables(): ConsumablePending {
    const snapshot = this.getPendingConsumables();
    this.data.pendingConsumables = { rerollTokens: 0, goldBoostTokens: 0, extraLifeTokens: 0 };
    this._save();
    return snapshot;
  }

  // ── Achievements ────────────────────────────────────────────────────────────

  /** Return the full achievement save data. */
  getAchievements(): AchievementSaveData {
    if (!this.data.achievements) {
      this.data.achievements = { unlocked: [], progress: {}, stats: {} };
    }
    return this.data.achievements;
  }

  /** Returns true if an achievement has been fully unlocked. */
  isAchievementUnlocked(id: string): boolean {
    return this.data.achievements?.unlocked?.includes(id) ?? false;
  }

  /** Return the stored progress for an achievement (0 if not started). */
  getAchievementProgress(id: string): number {
    return this.data.achievements?.progress?.[id] ?? 0;
  }

  /**
   * Mark an achievement as fully unlocked.
   * Idempotent — re-unlocking a completed achievement is a no-op.
   * Returns true if this was a NEW unlock (caller can trigger toast).
   */
  unlockAchievement(id: string): boolean {
    if (!this.data.achievements) this.data.achievements = { unlocked: [], progress: {}, stats: {} };
    if (this.data.achievements.unlocked.includes(id)) return false;
    this.data.achievements.unlocked.push(id);
    // Remove from progress once fully unlocked.
    delete this.data.achievements.progress[id];
    this._save();
    return true;
  }

  /**
   * Update the progress counter for an achievement.
   * Clamps to non-negative. Does nothing if already unlocked.
   * Returns the new value.
   */
  setAchievementProgress(id: string, value: number): number {
    if (!this.data.achievements) this.data.achievements = { unlocked: [], progress: {}, stats: {} };
    if (this.data.achievements.unlocked.includes(id)) return value;
    const clamped = Math.max(0, Math.floor(value));
    this.data.achievements.progress[id] = clamped;
    this._save();
    return clamped;
  }

  // ── Lifetime stats ─────────────────────────────────────────────────────────

  /** Return the current value of a raw lifetime stat (0 if not set). */
  getLifetimeStat(key: string): number {
    return this.data.achievements?.stats?.[key] ?? 0;
  }

  /**
   * Add `delta` to a lifetime stat and persist. Returns the new value.
   * A delta of 0 or negative is ignored.
   */
  addLifetimeStat(key: string, delta: number): number {
    if (delta <= 0) return this.getLifetimeStat(key);
    if (!this.data.achievements) this.data.achievements = { unlocked: [], progress: {}, stats: {} };
    if (!this.data.achievements.stats) this.data.achievements.stats = {};
    const next = (this.data.achievements.stats[key] ?? 0) + Math.floor(delta);
    this.data.achievements.stats[key] = next;
    this._save();
    return next;
  }

  // ── Boss defeat tracking ────────────────────────────────────────────────────

  /**
   * Record that a boss has been defeated.  Idempotent — re-marking a boss
   * already in the list is a no-op.
   */
  markBossDefeated(bossKey: string): void {
    if (!this.data.defeatedBosses) this.data.defeatedBosses = [];
    if (this.data.defeatedBosses.includes(bossKey)) return;
    this.data.defeatedBosses.push(bossKey);
    this._save();
  }

  /** Return the list of boss keys the player has defeated at least once. */
  getDefeatedBossKeys(): string[] {
    return this.data.defeatedBosses ?? [];
  }

  // ── Cutscene tracking ─────────────────────────────────────────────────────

  /** Returns true if this cutscene ID has been seen in any previous session. */
  hasSeenCutscene(id: string): boolean {
    return this.data.seenCutsceneIds?.includes(id) ?? false;
  }

  /** Return the full list of seen cutscene IDs. */
  getSeenCutsceneIds(): string[] {
    return this.data.seenCutsceneIds ?? [];
  }

  /** Mark a cutscene as seen. Idempotent. */
  markCutsceneSeen(id: string): void {
    if (!this.data.seenCutsceneIds) this.data.seenCutsceneIds = [];
    if (this.data.seenCutsceneIds.includes(id)) return;
    this.data.seenCutsceneIds.push(id);
    this._save();
  }

  // ── Ascension system ──────────────────────────────────────────────────────

  /**
   * Return the highest ascension level the player has cleared.
   * 0 = no ascension runs completed yet.
   */
  getHighestAscensionCleared(): number {
    return this.data.highestAscensionCleared ?? -1;
  }

  /**
   * Return the highest ascension level currently available to the player.
   * Equals highestAscensionCleared + 1, capped at 10.
   * A player who has cleared ascension 0 (a standard run) may attempt ascension 1.
   */
  getMaxAvailableAscension(): number {
    const highest = this.data.highestAscensionCleared ?? -1;
    return Math.max(0, Math.min(10, highest + 1));
  }

  /**
   * Return the player's last-chosen ascension level (UI default).
   * Always within [0, maxAvailable].
   */
  getCurrentAscension(): number {
    const max = this.getMaxAvailableAscension();
    return Math.min(this.data.currentAscension ?? 0, max);
  }

  /**
   * Persist the player's ascension level selection.
   * Clamped to [0, maxAvailable].
   */
  setCurrentAscension(level: number): void {
    const max   = this.getMaxAvailableAscension();
    const clamped = Math.max(0, Math.min(max, Math.floor(level)));
    this.data.currentAscension = clamped;
    this._save();
  }

  /**
   * Record that a run at ascension `level` was completed successfully.
   * Advances highestAscensionCleared when `level` exceeds the stored value.
   * Also unlocks the next ascension level (level + 1, capped at 10).
   * Returns true if a new ascension was unlocked (caller may trigger a toast).
   */
  recordAscensionClear(level: number): boolean {
    const prev = this.data.highestAscensionCleared ?? -1;
    if (level > prev) {
      this.data.highestAscensionCleared = Math.min(10, level);
      this._save();
      return true;
    }
    return false;
  }

  // ── Tower meta upgrades ────────────────────────────────────────────────────

  /**
   * Return a deep copy of all tower meta upgrade tiers.
   * Keys: outer = towerKey, inner = statKey, value = tier 0–MAX_META_TIER.
   */
  getTowerMetaUpgrades(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    const src = this.data.towerMetaUpgrades ?? {};
    for (const [tKey, statMap] of Object.entries(src)) {
      result[tKey] = { ...statMap };
    }
    return result;
  }

  /**
   * Return the current tier for a specific tower+stat combination.
   * Returns 0 if not upgraded.
   */
  getTowerMetaUpgradeTier(towerKey: string, statKey: string): number {
    return this.data.towerMetaUpgrades?.[towerKey]?.[statKey] ?? 0;
  }

  /**
   * Purchase the next tier of a tower meta upgrade.
   * Deducts the crystal cost and increments the tier.
   * Returns false if:
   *   - already at MAX_META_TIER
   *   - player can't afford the cost
   */
  purchaseTowerMetaUpgrade(towerKey: string, statKey: string): boolean {
    if (!this.data.towerMetaUpgrades) this.data.towerMetaUpgrades = {};
    if (!this.data.towerMetaUpgrades[towerKey]) this.data.towerMetaUpgrades[towerKey] = {};

    const currentTier = this.data.towerMetaUpgrades[towerKey][statKey] ?? 0;
    if (currentTier >= MAX_META_TIER) return false;

    const cost = META_TIER_COSTS[currentTier];
    if (this.data.currency < cost) return false;

    this.data.currency                              -= cost;
    this.data.towerMetaUpgrades[towerKey][statKey]  = currentTier + 1;
    this._save();
    return true;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _load(): void {
    if (!this.storageAvailable) return;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed.version !== SCHEMA_VER) {
        this.lastWarning = 'Save data was from an older version and has been reset.';
        this._save(); // persist the reset
        return;
      }

      // ── Tamper detection ──────────────────────────────────────────────────
      // Verify the djb2 checksum if present (absent in saves written by older
      // code — those load without warning to preserve backward compatibility).
      if (parsed._checksum !== undefined) {
        const { _checksum: storedCs, ...dataFields } = parsed;
        const expectedCs = SaveManager._computeChecksum(JSON.stringify(dataFields));
        if (storedCs !== expectedCs) {
          this.lastWarning = 'Save data appears to have been modified outside the game.';
          // Continue loading — we still apply the clamping pass below.
        }
      }

      // ── Schema validation & sanitization ─────────────────────────────────
      // Back-fill fields added in later schema iterations (same version — no
      // reset needed) then clamp values to plausible ranges.
      const merged: SaveData = { ...defaultSaveData(), ...parsed };
      this.data = SaveManager._sanitize(merged);
    } catch {
      // Malformed JSON — start fresh
      this.data = defaultSaveData();
    }
  }

  private _save(): void {
    if (!this.storageAvailable) return;
    try {
      // Compute checksum over the data fields only (exclude any existing _checksum).
      const { _checksum: _old, ...dataFields } = this.data;
      const cs = SaveManager._computeChecksum(JSON.stringify(dataFields));
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...dataFields, _checksum: cs }));
    } catch {
      this.lastWarning = 'Storage is full — progress may not be saved.';
    }
  }

  /**
   * djb2 hash over an arbitrary string.  Returns an 8-char hex string.
   * Not crypto-grade — intended solely for casual tamper detection.
   */
  private static _computeChecksum(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h, 33) ^ s.charCodeAt(i);
    }
    // Convert to unsigned 32-bit, then hex.
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Clamp / coerce loaded data fields to plausible ranges.
   * Mutates nothing — returns a new object.
   */
  private static _sanitize(d: SaveData): SaveData {
    // Currency must be a finite non-negative integer within the game's maximum.
    const currency = typeof d.currency === 'number' && Number.isFinite(d.currency)
      ? Math.max(0, Math.min(MAX_CURRENCY, Math.floor(d.currency)))
      : 0;

    // Unlocks must be an array of strings; non-strings are discarded.
    const unlocks = Array.isArray(d.unlocks)
      ? (d.unlocks as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];

    // Audio volumes must be finite numbers in [0, 1].
    const clampAudio = (v: unknown, def: number): number =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : def;

    const audioMaster     = clampAudio(d.audioMaster, 1);
    const audioSfx        = clampAudio(d.audioSfx, 1);
    const audioMusic      = clampAudio(d.audioMusic, 0.3);
    const audioMuted      = typeof d.audioMuted      === 'boolean' ? d.audioMuted      : false;
    const audioMusicMuted = typeof d.audioMusicMuted === 'boolean' ? d.audioMusicMuted : false;
    const audioSfxMuted   = typeof d.audioSfxMuted   === 'boolean' ? d.audioSfxMuted   : false;

    // Moon ratings must be integers 1–5.
    const stageMoons: Record<string, number> = {};
    if (d.stageMoons && typeof d.stageMoons === 'object') {
      for (const [k, v] of Object.entries(d.stageMoons)) {
        if (typeof v === 'number' && v >= 1 && v <= 5) {
          stageMoons[k] = Math.floor(v);
        }
      }
    }

    // Endless records must be non-negative integers.
    const endlessRecords: Record<string, number> = {};
    if (d.endlessRecords && typeof d.endlessRecords === 'object') {
      for (const [k, v] of Object.entries(d.endlessRecords)) {
        if (typeof v === 'number' && v >= 0) {
          endlessRecords[k] = Math.floor(v);
        }
      }
    }

    // String-array fields: filter to strings only (same treatment as unlocks).
    const seenVignetteIds = Array.isArray(d.seenVignetteIds)
      ? (d.seenVignetteIds as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];
    const unlockedCodexIds = Array.isArray(d.unlockedCodexIds)
      ? (d.unlockedCodexIds as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];
    const readCodexIds = Array.isArray(d.readCodexIds)
      ? (d.readCodexIds as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];

    // Simple string fields: coerce to string with defaults.
    const lastPlayedStage = typeof d.lastPlayedStage === 'string'
      ? d.lastPlayedStage
      : defaultSaveData().lastPlayedStage;
    const challengeWeek = typeof d.challengeWeek === 'string'
      ? d.challengeWeek
      : '';

    // Pending consumable counts: non-negative integers capped at MAX_CONSUMABLE_TOKENS.
    const clampCount = (v: unknown): number =>
      typeof v === 'number' && Number.isFinite(v)
        ? Math.max(0, Math.min(MAX_CONSUMABLE_TOKENS, Math.floor(v)))
        : 0;
    const rawPc = (d.pendingConsumables as unknown) as Record<string, unknown> | undefined;
    const pendingConsumables: ConsumablePending = {
      rerollTokens:    clampCount(rawPc?.rerollTokens),
      goldBoostTokens: clampCount(rawPc?.goldBoostTokens),
      extraLifeTokens: clampCount(rawPc?.extraLifeTokens),
    };

    const colorblindMode = typeof d.colorblindMode === 'boolean' ? d.colorblindMode : false;

    // Achievements: unlocked must be string[], progress must be Record<string, number>.
    const rawAch = (d.achievements as unknown) as Record<string, unknown> | undefined;
    const achUnlocked = Array.isArray(rawAch?.unlocked)
      ? (rawAch!.unlocked as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];
    const achProgressRaw = (rawAch?.progress as unknown) as Record<string, unknown> | undefined;
    const achProgress: Record<string, number> = {};
    if (achProgressRaw && typeof achProgressRaw === 'object') {
      for (const [k, v] of Object.entries(achProgressRaw)) {
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
          achProgress[k] = Math.floor(v);
        }
      }
    }
    const achStatsRaw = (rawAch?.stats as unknown) as Record<string, unknown> | undefined;
    const achStats: Record<string, number> = {};
    if (achStatsRaw && typeof achStatsRaw === 'object') {
      for (const [k, v] of Object.entries(achStatsRaw)) {
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
          achStats[k] = Math.floor(v);
        }
      }
    }
    const achievements: AchievementSaveData = { unlocked: achUnlocked, progress: achProgress, stats: achStats };

    // Defeated bosses: filter to strings only.
    const defeatedBosses = Array.isArray(d.defeatedBosses)
      ? (d.defeatedBosses as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];

    // Seen cutscene IDs: filter to strings only.
    const seenCutsceneIds = Array.isArray(d.seenCutsceneIds)
      ? (d.seenCutsceneIds as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];

    // Ascension fields.
    // highestAscensionCleared: -1 (no run cleared) through 10.
    const clampHighestAsc = (v: unknown): number =>
      typeof v === 'number' && Number.isFinite(v)
        ? Math.max(-1, Math.min(10, Math.floor(v)))
        : -1;
    const clampAscension = (v: unknown): number =>
      typeof v === 'number' && Number.isFinite(v)
        ? Math.max(0, Math.min(10, Math.floor(v)))
        : 0;
    const highestAscensionCleared = clampHighestAsc(d.highestAscensionCleared);
    const currentAscension        = Math.min(
      clampAscension(d.currentAscension),
      Math.min(10, Math.max(0, highestAscensionCleared + 1)),
    );

    // Tower meta upgrades: nested Record<string, Record<string, number>>.
    // Inner tier values are clamped to [0, MAX_META_TIER].
    const towerMetaUpgrades: Record<string, Record<string, number>> = {};
    const rawTmu = (d.towerMetaUpgrades as unknown) as Record<string, unknown> | undefined;
    if (rawTmu && typeof rawTmu === 'object') {
      for (const [tKey, statMap] of Object.entries(rawTmu)) {
        if (typeof statMap !== 'object' || statMap === null) continue;
        const sanitizedStats: Record<string, number> = {};
        for (const [sKey, v] of Object.entries(statMap as Record<string, unknown>)) {
          if (typeof v === 'number' && Number.isFinite(v)) {
            sanitizedStats[sKey] = Math.max(0, Math.min(MAX_META_TIER, Math.floor(v)));
          }
        }
        towerMetaUpgrades[tKey] = sanitizedStats;
      }
    }

    return {
      ...d,
      currency,
      unlocks,
      audioMaster,
      audioSfx,
      audioMusic,
      audioMuted,
      audioMusicMuted,
      audioSfxMuted,
      stageMoons,
      endlessRecords,
      seenVignetteIds,
      unlockedCodexIds,
      readCodexIds,
      lastPlayedStage,
      challengeWeek,
      pendingConsumables,
      colorblindMode,
      achievements,
      defeatedBosses,
      seenCutsceneIds,
      highestAscensionCleared,
      currentAscension,
      towerMetaUpgrades,
    };
  }

  private static _testStorage(): boolean {
    try {
      const testKey = '__ojibwe_td_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}
