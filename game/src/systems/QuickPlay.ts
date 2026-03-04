/**
 * Quick Play — auto-select an unlocked commander and stage for a one-click run.
 *
 * Phaser-free — safe for unit tests and Node.js scripts.
 *
 * Selection logic:
 *   - Commander: random from unlocked commanders, weighted toward less-played
 *     (uses commanderXp as a proxy; lower XP = higher probability).
 *   - Stage: uniform random from unlocked stages.
 *   - If only one option exists, that option is always picked.
 *   - Falls back gracefully when nothing is unlocked (shouldn't happen in practice).
 */

import { ALL_COMMANDERS } from '../data/commanderDefs';
import type { CommanderDef } from '../data/commanderDefs';
import { ALL_STAGES } from '../data/stageDefs';
import type { StageDef } from '../data/stageDefs';
import type { SaveManager } from '../meta/SaveManager';
import { getCommanderUnlockNode } from '../meta/unlockDefs';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuickPlaySelection {
  commanderId:   string;
  commanderName: string;
  stageId:       string;
  stageName:     string;
  mapId:         string;
}

// ── Unlock helpers ────────────────────────────────────────────────────────────

/**
 * Return all commanders that are currently accessible to the player.
 * Includes default-unlocked commanders and those unlocked via the meta tree.
 */
export function getUnlockedCommanders(save: SaveManager): CommanderDef[] {
  return ALL_COMMANDERS.filter(def => {
    if (def.defaultUnlocked) return true;
    const node = getCommanderUnlockNode(def.id);
    return node ? save.isUnlocked(node.id) : false;
  });
}

/**
 * Return all stages that are currently accessible to the player.
 * A stage is unlocked when its unlockId is null (always accessible) or the
 * corresponding unlock node has been purchased.
 */
export function getUnlockedStages(save: SaveManager): StageDef[] {
  return ALL_STAGES.filter(def => {
    if (def.unlockId === null) return true;
    return save.isUnlocked(def.unlockId);
  });
}

// ── Weighted random selection ─────────────────────────────────────────────────

/**
 * Pick a random commander from the unlocked pool, weighted toward those with
 * less accumulated XP (i.e. less-played commanders are favoured).
 *
 * Weight formula: w_i = maxXP − xp_i + 1
 * This ensures every commander has weight ≥ 1, and the one with the least
 * XP has the highest probability.
 *
 * Falls back to the first available commander if the list is empty.
 */
export function pickWeightedCommander(
  unlocked: CommanderDef[],
  save: SaveManager,
): CommanderDef {
  if (unlocked.length === 0) return ALL_COMMANDERS[0];
  if (unlocked.length === 1) return unlocked[0];

  const xpValues = unlocked.map(def => save.getCommanderXp(def.id));
  const maxXp    = Math.max(...xpValues);
  const weights  = xpValues.map(xp => maxXp - xp + 1);
  const total    = weights.reduce((a, b) => a + b, 0);

  let r = Math.random() * total;
  for (let i = 0; i < unlocked.length; i++) {
    r -= weights[i];
    if (r <= 0) return unlocked[i];
  }
  return unlocked[unlocked.length - 1];
}

/**
 * Pick a uniformly random stage from the unlocked pool.
 * Falls back to the first available stage if the list is empty.
 */
export function pickRandomStage(unlocked: StageDef[]): StageDef {
  if (unlocked.length === 0) return ALL_STAGES[0];
  if (unlocked.length === 1) return unlocked[0];
  return unlocked[Math.floor(Math.random() * unlocked.length)];
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Auto-select a commander and stage for a Quick Play run.
 * Returns all parameters needed to start GameScene directly.
 */
export function pickQuickPlay(save: SaveManager): QuickPlaySelection {
  const commanders = getUnlockedCommanders(save);
  const stages     = getUnlockedStages(save);

  const commander = pickWeightedCommander(commanders, save);
  const stage     = pickRandomStage(stages);

  return {
    commanderId:   commander.id,
    commanderName: commander.name,
    stageId:       stage.id,
    stageName:     stage.name,
    mapId:         stage.pathFile,
  };
}
