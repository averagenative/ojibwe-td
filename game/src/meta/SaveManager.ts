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

interface SaveData {
  version:  number;
  currency: number;
  unlocks:  string[];
}

function defaultSaveData(): SaveData {
  return { version: SCHEMA_VER, currency: 0, unlocks: [] };
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
      this.data = parsed;
    } catch {
      // Malformed JSON — start fresh
      this.data = defaultSaveData();
    }
  }

  private _save(): void {
    if (!this.storageAvailable) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      this.lastWarning = 'Storage is full — progress may not be saved.';
    }
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
