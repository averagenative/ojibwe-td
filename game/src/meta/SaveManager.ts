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

const SAVE_KEY     = 'ojibwe-td-save';
const SCHEMA_VER   = 1;

/** Maximum plausible currency a legitimate playthrough can accumulate. */
export const MAX_CURRENCY = 999_999;

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
  audioMaster: number;
  audioSfx:    number;
  audioMusic:  number;
  audioMuted:  boolean;
  /**
   * Best endless-mode wave reached per map, keyed by mapId (e.g. 'map-01').
   * Value is the highest wave number the player survived before dying.
   */
  endlessRecords:   Record<string, number>;
  /** Vignette IDs that have been seen across all sessions. */
  seenVignetteIds:  string[];
  /** Codex entry IDs that have been unlocked. */
  unlockedCodexIds: string[];
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
    endlessRecords:  {},
    seenVignetteIds: [],
    unlockedCodexIds: [],
    stageMoons: {},
    gearData:       { inventory: [], equipped: {} },
    commanderXp:    { xp: {}, enhancementSlots: {} },
    challengeWeek:  '',
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

  getAudioSettings(): { master: number; sfx: number; music: number; muted: boolean } {
    return {
      master: this.data.audioMaster,
      sfx:    this.data.audioSfx,
      music:  this.data.audioMusic,
      muted:  this.data.audioMuted,
    };
  }

  setAudioSettings(master: number, sfx: number, music: number, muted: boolean): void {
    this.data.audioMaster = master;
    this.data.audioSfx    = sfx;
    this.data.audioMusic  = music;
    this.data.audioMuted  = muted;
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

    const audioMaster = clampAudio(d.audioMaster, 1);
    const audioSfx    = clampAudio(d.audioSfx, 1);
    const audioMusic  = clampAudio(d.audioMusic, 0.3);
    const audioMuted  = typeof d.audioMuted === 'boolean' ? d.audioMuted : false;

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

    // Simple string fields: coerce to string with defaults.
    const lastPlayedStage = typeof d.lastPlayedStage === 'string'
      ? d.lastPlayedStage
      : defaultSaveData().lastPlayedStage;
    const challengeWeek = typeof d.challengeWeek === 'string'
      ? d.challengeWeek
      : '';

    return {
      ...d,
      currency,
      unlocks,
      audioMaster,
      audioSfx,
      audioMusic,
      audioMuted,
      stageMoons,
      endlessRecords,
      seenVignetteIds,
      unlockedCodexIds,
      lastPlayedStage,
      challengeWeek,
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
