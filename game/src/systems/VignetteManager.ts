/**
 * VignetteManager — evaluates vignette triggers and manages per-run state.
 *
 * Created once per GameScene run. Tracks which vignettes have already fired
 * this run (no repeat spam on retry) and which have been seen in previous
 * sessions (via SaveManager).
 *
 * Phaser-free — safe for unit tests.
 */

import { SaveManager } from '../meta/SaveManager';
import { getVignettesForTrigger, TriggerType } from '../data/vignetteDefs';
import type { VignetteDef } from '../data/vignetteDefs';

export interface VignetteResult {
  vignette:     VignetteDef;
  /** True if this vignette was seen in a previous session (allows instant skip). */
  seenBefore:   boolean;
}

export class VignetteManager {
  /** Vignettes that have already fired during this run. */
  private firedThisRun = new Set<string>();

  /** IDs that were in SaveManager when this run started (snapshot). */
  private previouslySeenIds: ReadonlySet<string>;

  /** Region ID for act-gating. */
  private regionId: string;

  /** Whether this is the player's first ever play session. */
  private isFirstPlay: boolean;

  /** Whether the player has lost any lives this run (for ending variants). */
  private hasLostLife = false;

  constructor(regionId: string) {
    this.regionId = regionId;

    const save = SaveManager.getInstance();
    this.previouslySeenIds = new Set(save.getSeenVignetteIds());
    this.isFirstPlay = !this.previouslySeenIds.has('act1-arrival');
  }

  /** Call when the player loses a life — used for Act 4 ending variant. */
  recordLifeLost(): void {
    this.hasLostLife = true;
  }

  /**
   * Pre-populate firedThisRun from a list of IDs (e.g. restored from auto-save).
   * Prevents already-shown vignettes from replaying on session resume.
   */
  restoreFiredIds(ids: readonly string[]): void {
    for (const id of ids) {
      this.firedThisRun.add(id);
    }
  }

  /**
   * Check for vignettes matching a trigger.
   * Returns at most one vignette result (the first matching, unshown one),
   * or null if nothing should fire.
   */
  check(
    trigger: TriggerType,
    triggerValue?: number | string,
  ): VignetteResult | null {
    const candidates = getVignettesForTrigger(trigger, triggerValue, this.regionId);

    for (const v of candidates) {
      // Already fired this run — skip.
      if (this.firedThisRun.has(v.id)) continue;

      // FIRST_PLAY: only fire if this is truly the first session.
      if (v.trigger === TriggerType.FIRST_PLAY && !this.isFirstPlay) continue;

      // Act 4 ending variants: pick the right one based on life loss.
      if (v.id === 'act4-ending-clean' && this.hasLostLife) continue;
      if (v.id === 'act4-ending-bittersweet' && !this.hasLostLife) continue;

      // Was this vignette seen in a previous session?
      const seenBefore = this.previouslySeenIds.has(v.id);

      // Mark as fired for this run.
      this.firedThisRun.add(v.id);

      // Persist to save: mark seen + unlock codex entry.
      const save = SaveManager.getInstance();
      save.markVignetteSeen(v.id);
      if (v.codexUnlock) {
        save.unlockCodexEntry(v.codexUnlock);
      }

      return { vignette: v, seenBefore };
    }

    return null;
  }
}
