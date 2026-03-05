/**
 * SessionManager — mid-run auto-save to sessionStorage.
 *
 * Saves game state at checkpoints (wave-end, visibilitychange, pagehide) so
 * the player can resume after a browser page eviction on mobile.
 *
 * Uses sessionStorage (not localStorage) — auto-cleared when the browser tab
 * is closed, so stale saves don't linger across sessions.
 *
 * Phaser-free — safe for unit tests.
 */

const AUTOSAVE_KEY     = 'ojibwe-td-autosave';
const AUTOSAVE_VERSION = 1;
/** 30-minute expiry — prevent bizarre resume from a forgotten old session. */
export const AUTOSAVE_EXPIRY_MS = 30 * 60 * 1000;

// ── AutoSave shape ─────────────────────────────────────────────────────────────

export interface AutoSaveTower {
  key:        string;                  // tower def key (e.g. 'rock-hurler')
  col:        number;                  // grid column
  row:        number;                  // grid row
  upgrades:   Record<string, number>;  // path → tier (e.g. { A: 2, B: 1, C: 0 })
  totalSpent: number;
}

export interface AutoSave {
  version:         number;
  timestamp:       number;
  mapId:           string;
  stageId:         string;
  commanderId:     string;
  currentWave:     number;
  gold:            number;
  lives:           number;
  totalKills:      number;
  goldEarned:      number;
  towers:          AutoSaveTower[];
  offers:          string[];   // IDs of taken (active) offers
  consumedOffers:  string[];   // one-time offer IDs already consumed (e.g. 'salvage')
  metaStatBonuses: object;     // pre-computed stat bonuses snapshot (informational)
  seenDialogs:     string[];   // cutscene + vignette IDs shown during this run
  isChallenge?:    boolean;    // true when this save is from a challenge run
  challengeId?:    string;     // challenge def ID (e.g. 'challenge-01')
}

// ── SessionManager ─────────────────────────────────────────────────────────────

export class SessionManager {
  private static _instance: SessionManager | null = null;
  private readonly _available: boolean;

  private constructor() {
    this._available = SessionManager._testStorage();
  }

  static getInstance(): SessionManager {
    if (!SessionManager._instance) SessionManager._instance = new SessionManager();
    return SessionManager._instance;
  }

  /** True when sessionStorage is accessible (false in private-browsing edge cases). */
  isAvailable(): boolean {
    return this._available;
  }

  /**
   * Write the auto-save state to sessionStorage.
   * Stamps `version` and `timestamp` automatically.
   * Silent no-op when storage is unavailable or quota is exceeded.
   */
  save(state: Omit<AutoSave, 'version' | 'timestamp'>): void {
    if (!this._available) return;
    const data: AutoSave = {
      version:   AUTOSAVE_VERSION,
      timestamp: Date.now(),
      ...state,
    };
    try {
      sessionStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
    } catch {
      // Quota exceeded — silently ignore; auto-save is best-effort.
    }
  }

  /**
   * Load the auto-save from sessionStorage.
   * Returns `null` when:
   *  - Storage is unavailable
   *  - No save exists
   *  - Saved version doesn't match current
   *  - Save is older than AUTOSAVE_EXPIRY_MS
   *  - JSON is malformed
   */
  load(): AutoSave | null {
    if (!this._available) return null;
    try {
      const raw = sessionStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as AutoSave;

      if (parsed.version !== AUTOSAVE_VERSION) {
        this.clear();
        return null;
      }
      if (Date.now() - parsed.timestamp > AUTOSAVE_EXPIRY_MS) {
        this.clear();
        return null;
      }
      // Migrate legacy tower keys: cannon/mortar → rock-hurler (TASK-098).
      if (parsed.towers) {
        for (const t of parsed.towers) {
          if (t.key === 'cannon' || t.key === 'mortar') {
            t.key = 'rock-hurler';
          }
        }
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /** Delete the auto-save from sessionStorage. */
  clear(): void {
    if (!this._available) return;
    try {
      sessionStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      // ignore
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private static _testStorage(): boolean {
    try {
      const key = '__ojibwe_td_session_test__';
      sessionStorage.setItem(key, '1');
      sessionStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
}
