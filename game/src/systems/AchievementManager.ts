/**
 * AchievementManager — singleton that tracks and unlocks achievements.
 *
 * Phaser-free. All persistence is delegated to SaveManager.
 *
 * Usage pattern:
 *   const am = AchievementManager.getInstance();
 *   am.addKills(runKills);           // add kills from the completed run
 *   const newIds = am.drainNewlyUnlocked();  // show toasts for these
 */

import { SaveManager } from '../meta/SaveManager';
import {
  ALL_ACHIEVEMENTS,
  getAchievementDef,
} from '../data/achievementDefs';
import type { AchievementDef } from '../data/achievementDefs';
import { ALL_STAGES } from '../data/stageDefs';
import { ALL_COMMANDERS } from '../data/commanderDefs';
import { UNLOCK_NODES } from '../meta/unlockDefs';

// ── Public types ─────────────────────────────────────────────────────────────

/** Live achievement state for a single achievement entry. */
export interface AchievementState {
  def:      AchievementDef;
  unlocked: boolean;
  current:  number;  // progress toward target (or target value once unlocked)
}

/** Data passed to onVictory(). */
export interface VictoryData {
  stageId:      string;
  commanderId:  string;
  livesLeft:    number;
  maxLives:     number;
  /** All distinct tower type keys placed during the run. */
  towerTypesUsed: string[];
  /** True when all on-field towers have at least 1 upgrade bought. */
  allTowersUpgraded: boolean;
  /** Gold earned this run. */
  goldEarned:    number;
  /** Consumable types that were applied at run start (non-zero count only). */
  consumablesUsed: string[];
}

// ── Manager ──────────────────────────────────────────────────────────────────

export class AchievementManager {
  private static _instance: AchievementManager | null = null;

  /** Queue of achievement IDs unlocked since the last drainNewlyUnlocked() call. */
  private _newlyUnlocked: string[] = [];

  private constructor() {}

  static getInstance(): AchievementManager {
    if (!AchievementManager._instance) {
      AchievementManager._instance = new AchievementManager();
    }
    return AchievementManager._instance;
  }

  // ── Drain queue ─────────────────────────────────────────────────────────────

  /**
   * Returns all newly-unlocked achievement IDs since the last call,
   * then clears the queue. Use this to display toast notifications.
   */
  drainNewlyUnlocked(): string[] {
    const ids = this._newlyUnlocked.slice();
    this._newlyUnlocked = [];
    return ids;
  }

  // ── State accessors ─────────────────────────────────────────────────────────

  /** Return live state for all achievements (for gallery display). */
  getAll(): AchievementState[] {
    const save = SaveManager.getInstance();
    return ALL_ACHIEVEMENTS.map(def => {
      const unlocked = save.isAchievementUnlocked(def.id);
      return {
        def,
        unlocked,
        current: unlocked ? def.target : save.getAchievementProgress(def.id),
      };
    });
  }

  isUnlocked(id: string): boolean {
    return SaveManager.getInstance().isAchievementUnlocked(id);
  }

  getProgress(id: string): number {
    return SaveManager.getInstance().getAchievementProgress(id);
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────

  /**
   * Unlock a binary achievement (target = 1).
   * Returns true if newly unlocked.
   */
  private _unlock(id: string): boolean {
    const save = SaveManager.getInstance();
    if (save.isAchievementUnlocked(id)) return false;
    const isNew = save.unlockAchievement(id);
    if (isNew) this._newlyUnlocked.push(id);
    return isNew;
  }

  /**
   * Set achievement progress to an absolute value.
   * Unlocks when value >= target.
   * Returns true if newly unlocked this call.
   */
  private _setProgress(id: string, value: number): boolean {
    const save = SaveManager.getInstance();
    if (save.isAchievementUnlocked(id)) return false;
    const def = getAchievementDef(id);
    if (!def) return false;
    save.setAchievementProgress(id, value);
    if (value >= def.target) {
      return this._unlock(id);
    }
    return false;
  }

  // ── Lifetime stat helpers ────────────────────────────────────────────────────

  private _addStat(key: string, delta: number): number {
    return SaveManager.getInstance().addLifetimeStat(key, delta);
  }

  // ── Event hooks ─────────────────────────────────────────────────────────────

  /**
   * Called at the end of a run to record the kills earned this run.
   * @param runKills  Creeps killed during the run (added to lifetime total).
   */
  addKills(runKills: number): void {
    if (runKills <= 0) return;
    const total = this._addStat('kills', runKills);
    this._setProgress('kill-100-creeps',    total);
    this._setProgress('kill-500-creeps',    total);
    this._setProgress('kill-2000-creeps',   total);
    this._setProgress('kill-5000-creeps',   total);
    this._setProgress('kill-25000-creeps',  total);
    this._setProgress('kill-100000-creeps', total);
  }

  /**
   * Called at the end of a run to record bosses killed this run.
   * @param runBosses  Bosses killed during the run (added to lifetime total).
   */
  addBosses(runBosses: number): void {
    if (runBosses <= 0) return;
    const total = this._addStat('bosses', runBosses);
    this._setProgress('kill-5-bosses',  total);
    this._setProgress('kill-20-bosses', total);
    this._setProgress('kill-50-bosses', total);
  }

  /**
   * Called when the endless mode wave counter advances.
   * Pass the current wave number reached (e.g. 30 when wave 30 completes).
   */
  onEndlessWaveReached(wave: number): void {
    this._setProgress('endless-wave-30',  wave);
    this._setProgress('endless-wave-50',  wave);
    this._setProgress('endless-wave-100', wave);
  }

  /**
   * Called when a tower is placed during a run.
   * @param runTotal   Towers built so far this run.
   * @param towerKey   The key of the placed tower type.
   */
  addTowerBuilt(runTotal: number, towerKey: string): void {
    void towerKey;
    const lifeTotal = this._addStat('towersBuilt', 1);
    this._setProgress('build-25-towers-run', runTotal);
    this._setProgress('build-50-towers-run', runTotal);
    this._setProgress('build-500-towers-total',  lifeTotal);
    this._setProgress('build-2000-towers-total', lifeTotal);
    this._setProgress('place-50-towers-total',   lifeTotal);
    this._setProgress('place-200-towers-total',  lifeTotal);
    this._setProgress('place-1000-towers-total', lifeTotal);
  }

  /**
   * Called when a tower achieves tier 5 on any upgrade path for the first time.
   * @param towerKey  The key of the tower type that was maxed.
   */
  onTowerPathMaxed(towerKey: string): void {
    this._unlock('max-upgrade-first');

    // Track distinct tower types ever maxed.
    const save = SaveManager.getInstance();
    const seenKey  = `_maxUpgraded_${towerKey}`;
    const alreadySeen = save.getLifetimeStat(seenKey) > 0;
    if (!alreadySeen) {
      save.addLifetimeStat(seenKey, 1);
      const total = this._addStat('maxUpgradedTypes', 1);
      this._setProgress('max-upgrade-3-types', total);
      // 8 tower types: cannon, frost, mortar, poison, tesla, aura, arrow, rock-hurler
      if (total >= 8) this._unlock('max-upgrade-every-type');
    }
  }

  /**
   * Called when the meta shop (unlock purchase or consumable purchase) is used.
   * Checks region/commander unlock achievements.
   */
  onMetaUnlockPurchased(): void {
    const save = SaveManager.getInstance();

    // Commander unlocks
    const commanderUnlockNodes = UNLOCK_NODES.filter(n => n.effect.type === 'commander');
    const anyCommanderUnlocked = commanderUnlockNodes.some(n => save.isUnlocked(n.id));
    if (anyCommanderUnlocked) this._unlock('unlock-any-commander');

    const allCommandersUnlocked = ALL_COMMANDERS.every(
      c => c.defaultUnlocked || save.isUnlocked(`unlock-commander-${c.id}`),
    );
    if (allCommandersUnlocked) this._unlock('unlock-all-commanders');

    // Region/stage unlocks
    if (save.isUnlocked('unlock-map-02')) this._unlock('unlock-mashkiig');
    if (save.isUnlocked('unlock-stage-mitigomizh-01')) this._unlock('unlock-mitigomizh');
    if (save.isUnlocked('unlock-stage-biboon-aki-01')) this._unlock('unlock-biboon-aki');

    const allRegionsUnlocked =
      save.isUnlocked('unlock-map-02') &&
      save.isUnlocked('unlock-stage-mitigomizh-01') &&
      save.isUnlocked('unlock-stage-biboon-aki-01');
    if (allRegionsUnlocked) this._unlock('unlock-all-regions');

    // All meta upgrades purchased?
    const allMetaUnlocked = UNLOCK_NODES.every(n => save.isUnlocked(n.id));
    if (allMetaUnlocked) this._unlock('unlock-all-meta');
  }

  /**
   * Called when crystals are spent (meta unlock or consumable purchase).
   * @param amount  Crystals spent in this transaction.
   */
  addCrystalsSpent(amount: number): void {
    if (amount <= 0) return;
    const total = this._addStat('crystalsSpent', amount);
    this._setProgress('spend-250-crystals',  total);
    this._setProgress('spend-500-crystals',  total);
    this._setProgress('spend-1000-crystals', total);
  }

  /**
   * Called when the player's crystal balance changes.
   * @param currentBalance  Current held crystals.
   */
  onCurrencyChanged(currentBalance: number): void {
    if (currentBalance >= 500) this._unlock('accumulate-500-crystals');
  }

  /**
   * Call when a new run begins. Increments the lifetime games-played counter.
   */
  onGameStarted(): void {
    const total = this._addStat('gamesPlayed', 1);
    this._setProgress('play-10-games',  total);
    this._setProgress('play-50-games',  total);
    this._setProgress('play-200-games', total);
  }

  /**
   * Called when a victory is achieved.
   */
  onVictory(data: VictoryData): void {
    const save = SaveManager.getInstance();

    // First victory
    this._unlock('first-victory');

    // Per-stage clear achievements
    const stageClears: Record<string, string> = {
      'zaagaiganing-01':  'clear-zaagaiganing',
      'mashkiig-01':      'clear-mashkiig',
      'niizh-miikana-01': 'clear-niizh-miikana',
      'mitigomizh-01':    'clear-mitigomizh',
      'biboon-aki-01':    'clear-biboon-aki',
    };
    const clearId = stageClears[data.stageId];
    if (clearId) this._unlock(clearId);

    // Completionist: all stages cleared?
    const allStageIds: string[] = ALL_STAGES.map(s => s.id);
    const allCleared = allStageIds.every(
      sid => save.isAchievementUnlocked(stageClears[sid] ?? '__none__'),
    );
    if (allCleared) this._unlock('clear-all-stages');

    // Per-commander win achievements
    const cmdWins: Record<string, string> = {
      nokomis:     'win-nokomis',
      bizhiw:      'win-bizhiw',
      animikiikaa: 'win-animikiikaa',
      makoons:     'win-makoons',
      oshkaabewis: 'win-oshkaabewis',
      waabizii:    'win-waabizii',
    };
    const winId = cmdWins[data.commanderId];
    if (winId) this._unlock(winId);

    // All commanders won?
    const allCmdWon = ALL_COMMANDERS.every(
      c => save.isAchievementUnlocked(cmdWins[c.id] ?? '__none__'),
    );
    if (allCmdWon) this._unlock('win-all-commanders');

    // Life-based achievements
    const maxLives = data.maxLives > 0 ? data.maxLives : 20;
    if (data.livesLeft >= maxLives) this._unlock('flawless-victory');
    if (data.livesLeft >= 15)      this._unlock('iron-defense');
    if (data.livesLeft === 1)      this._unlock('comeback-kid');

    // Tower diversity achievements
    if (data.towerTypesUsed.length === 1) this._unlock('mono-tower');

    const allTowerTypes = ['cannon', 'frost', 'mortar', 'poison', 'tesla', 'aura', 'arrow', 'rock-hurler'];
    const hasAllTypes = allTowerTypes.every(k => data.towerTypesUsed.includes(k));
    if (hasAllTypes) this._unlock('all-tower-types-in-run');

    // Full arsenal (all on-field towers have at least 1 upgrade)
    if (data.allTowersUpgraded) this._unlock('full-equipped');

    // Gold earned achievements (checked against run total, not lifetime)
    if (data.goldEarned >= 2000) this._unlock('earn-2000-gold');
    if (data.goldEarned >= 5000) this._unlock('earn-5000-gold');

    // All consumables used in one run
    const consumableTypes = ['rerollTokens', 'goldBoostTokens', 'extraLifeTokens'];
    const usedAll = consumableTypes.every(t => data.consumablesUsed.includes(t));
    if (usedAll) this._unlock('use-all-consumables');

    // Re-check meta/region unlock achievements in case they were purchased this session.
    this.onMetaUnlockPurchased();
  }

  /**
   * Called when the end-of-run rerolls are being summarised (also on defeat).
   * Increments the lifetime reroll counter regardless of win/loss.
   */
  addRerolls(runRerolls: number): void {
    if (runRerolls <= 0) return;
    const total = this._addStat('rerollsTotal', runRerolls);
    this._setProgress('reroll-30-times-total', total);
    if (runRerolls >= 5) this._unlock('reroll-5-times-run');
  }

  /**
   * Called when all codex entries have been checked and the player has read all of them.
   * @param allRead  True if the player has read every codex entry.
   */
  onCodexAllRead(allRead: boolean): void {
    if (allRead) this._unlock('codex-scholar');
  }

  // ── New lifetime-stat methods (TASK-131) ─────────────────────────────────

  /**
   * Called at end of run to record air-creep kills.
   * @param runAirKills  Air creeps killed during the run (added to lifetime total).
   */
  addAirKills(runAirKills: number): void {
    if (runAirKills <= 0) return;
    const total = this._addStat('airKills', runAirKills);
    this._setProgress('kill-50-air-creeps',  total);
    this._setProgress('kill-200-air-creeps', total);
  }

  /**
   * Called at end of run to record towers sold.
   * @param runSells  Towers sold during the run (added to lifetime total).
   */
  addTowersSold(runSells: number): void {
    if (runSells <= 0) return;
    const total = this._addStat('towersSold', runSells);
    this._setProgress('sell-10-towers',  total);
    this._setProgress('sell-50-towers',  total);
    this._setProgress('sell-200-towers', total);
  }

  /**
   * Called at end of run to record waves rushed.
   * @param runRushes  Waves rushed during the run (added to lifetime total).
   */
  addRushes(runRushes: number): void {
    if (runRushes <= 0) return;
    const total = this._addStat('rushesTotal', runRushes);
    this._setProgress('rush-10-waves',  total);
    this._setProgress('rush-50-waves',  total);
    this._setProgress('rush-200-waves', total);
  }

  /**
   * Called at end of run to record gold earned.
   * @param runGold  Gold earned during the run (added to lifetime total).
   */
  addLifetimeGold(runGold: number): void {
    if (runGold <= 0) return;
    const total = this._addStat('goldEarnedTotal', runGold);
    this._setProgress('earn-gold-5000-total',  total);
    this._setProgress('earn-gold-25000-total', total);
  }

  /**
   * Called at end of a winning run (normal mode only).
   * Increments the lifetime wins counter and checks run-milestone achievements.
   */
  addWins(count: number): void {
    if (count <= 0) return;
    const total = this._addStat('winsTotal', count);
    this._setProgress('win-5-runs',   total);
    this._setProgress('win-20-runs',  total);
    this._setProgress('win-50-runs',  total);
    this._setProgress('win-100-runs', total);
  }

  /**
   * Called whenever a tower is placed. Checks if 6 or more distinct tower
   * types are simultaneously present on the field.
   * @param typeCount  Number of distinct tower-type keys currently on the field.
   */
  checkAllTypesSimultaneous(typeCount: number): void {
    if (typeCount >= 6) this._unlock('all-6-types-simultaneous');
  }

}
