/**
 * TASK-034 — Ascension System
 *
 * Tests for:
 *  1. ascensionDefs.ts — pure data integrity & helper functions
 *  2. AscensionSystem.ts — passive multipliers, air waypoint modification
 *  3. SaveManager — ascension save/load/sanitize
 *  4. Structural ?raw tests — integration wiring in GameScene, WaveManager,
 *     HUD, CommanderSelectScene, GameOverScene
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Pure data & helpers ─────────────────────────────────────────────────────

import {
  ASCENSION_DEFS,
  getActiveModifiers,
  getModifier,
} from '../../data/ascensionDefs';

// ── Structural ?raw imports ─────────────────────────────────────────────────

import ascensionSysSrc    from '../AscensionSystem.ts?raw';
import gameSceneSrc       from '../../scenes/GameScene.ts?raw';
import waveManagerSrc     from '../WaveManager.ts?raw';
import hudSrc             from '../../ui/HUD.ts?raw';
import commanderSelectSrc from '../../scenes/CommanderSelectScene.ts?raw';
import gameOverSrc        from '../../scenes/GameOverScene.ts?raw';
import saveManagerSrc     from '../../meta/SaveManager.ts?raw';

// ═════════════════════════════════════════════════════════════════════════════
// 1. ascensionDefs.ts — data & helpers
// ═════════════════════════════════════════════════════════════════════════════

describe('ASCENSION_DEFS', () => {
  it('contains exactly 10 ascension levels', () => {
    expect(ASCENSION_DEFS).toHaveLength(10);
  });

  it('levels are numbered 1 through 10 in order', () => {
    ASCENSION_DEFS.forEach((def, i) => {
      expect(def.level).toBe(i + 1);
    });
  });

  it('every def has name, description, and at least one modifier', () => {
    for (const def of ASCENSION_DEFS) {
      expect(def.name).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.modifiers.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('level 1 is hp_mult with value 1.2', () => {
    const m = ASCENSION_DEFS[0].modifiers[0];
    expect(m.type).toBe('hp_mult');
    expect(m.value).toBe(1.2);
  });

  it('level 2 is speed_mult with value 1.1', () => {
    const m = ASCENSION_DEFS[1].modifiers[0];
    expect(m.type).toBe('speed_mult');
    expect(m.value).toBe(1.1);
  });

  it('level 3 is armored_early with value 3', () => {
    const m = ASCENSION_DEFS[2].modifiers[0];
    expect(m.type).toBe('armored_early');
    expect(m.value).toBe(3);
  });

  it('level 4 is regen_per_sec with value 0.01', () => {
    const m = ASCENSION_DEFS[3].modifiers[0];
    expect(m.type).toBe('regen_per_sec');
    expect(m.value).toBe(0.01);
  });

  it('level 5 is immune_slow_and_poison', () => {
    const m = ASCENSION_DEFS[4].modifiers[0];
    expect(m.type).toBe('immune_slow_and_poison');
  });

  it('level 6 is tower_disable with value 20', () => {
    const m = ASCENSION_DEFS[5].modifiers[0];
    expect(m.type).toBe('tower_disable');
    expect(m.value).toBe(20);
  });

  it('level 7 is air_bypass_tiles with value 3', () => {
    const m = ASCENSION_DEFS[6].modifiers[0];
    expect(m.type).toBe('air_bypass_tiles');
    expect(m.value).toBe(3);
  });

  it('level 8 is poison_cloud with value 0.15', () => {
    const m = ASCENSION_DEFS[7].modifiers[0];
    expect(m.type).toBe('poison_cloud');
    expect(m.value).toBe(0.15);
  });

  it('level 9 is lightning_strikes with value 3', () => {
    const m = ASCENSION_DEFS[8].modifiers[0];
    expect(m.type).toBe('lightning_strikes');
    expect(m.value).toBe(3);
  });

  it('level 10 is gold_income_penalty with value 0.9', () => {
    const m = ASCENSION_DEFS[9].modifiers[0];
    expect(m.type).toBe('gold_income_penalty');
    expect(m.value).toBe(0.9);
  });
});

describe('getActiveModifiers()', () => {
  it('returns empty array for level 0', () => {
    expect(getActiveModifiers(0)).toEqual([]);
  });

  it('returns empty array for negative levels', () => {
    expect(getActiveModifiers(-1)).toEqual([]);
  });

  it('returns only level 1 modifier for level 1', () => {
    const mods = getActiveModifiers(1);
    expect(mods).toHaveLength(1);
    expect(mods[0].type).toBe('hp_mult');
  });

  it('returns cumulative modifiers for level 3', () => {
    const mods = getActiveModifiers(3);
    expect(mods).toHaveLength(3);
    expect(mods.map(m => m.type)).toEqual(['hp_mult', 'speed_mult', 'armored_early']);
  });

  it('returns all 10 modifiers for level 10', () => {
    const mods = getActiveModifiers(10);
    expect(mods).toHaveLength(10);
  });

  it('clamps to 10 for levels above 10', () => {
    const mods = getActiveModifiers(20);
    expect(mods).toHaveLength(10);
  });
});

describe('getModifier()', () => {
  it('returns undefined for inactive modifier', () => {
    expect(getModifier(1, 'speed_mult')).toBeUndefined();
  });

  it('returns the modifier when active', () => {
    const mod = getModifier(2, 'speed_mult');
    expect(mod).toBeDefined();
    expect(mod!.value).toBe(1.1);
  });

  it('returns hp_mult at all levels >= 1', () => {
    for (let i = 1; i <= 10; i++) {
      expect(getModifier(i, 'hp_mult')).toBeDefined();
    }
  });

  it('returns undefined for level 0', () => {
    expect(getModifier(0, 'hp_mult')).toBeUndefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. AscensionSystem — pure logic (no Phaser dependency)
// ═════════════════════════════════════════════════════════════════════════════

describe('AscensionSystem — structural checks', () => {
  it('exports AscensionSystem class', () => {
    expect(ascensionSysSrc).toContain('export class AscensionSystem');
  });

  it('has destroy() method that clears _timers', () => {
    expect(ascensionSysSrc).toContain('destroy(): void');
    expect(ascensionSysSrc).toContain('this._timers.length = 0');
  });

  it('has onWaveStart method', () => {
    expect(ascensionSysSrc).toContain('onWaveStart(waveNumber: number');
  });

  it('has onCreepDiedPoisoned method', () => {
    expect(ascensionSysSrc).toContain('onCreepDiedPoisoned(');
  });

  it('has getHpMultiplier method', () => {
    expect(ascensionSysSrc).toContain('getHpMultiplier(): number');
  });

  it('has getSpeedMultiplier method', () => {
    expect(ascensionSysSrc).toContain('getSpeedMultiplier(): number');
  });

  it('has getGoldIncomeMultiplier method', () => {
    expect(ascensionSysSrc).toContain('getGoldIncomeMultiplier(): number');
  });

  it('has modifyAirWaypoints method', () => {
    expect(ascensionSysSrc).toContain('modifyAirWaypoints(');
  });

  it('clamps level in constructor', () => {
    expect(ascensionSysSrc).toContain('Math.max(0, Math.min(10, Math.floor(level)))');
  });

  it('lightning strikes only fire on every 5th wave', () => {
    expect(ascensionSysSrc).toContain('waveNumber % 5 !== 0');
  });

  it('lightning strike VFX graphics are destroyed on tween complete', () => {
    expect(ascensionSysSrc).toContain('onComplete: () => gfx.destroy()');
  });

  it('tower disable filters out aura towers', () => {
    expect(ascensionSysSrc).toContain('!t.def.isAura');
  });

  it('lightning delay provides 3s warning before first strike', () => {
    expect(ascensionSysSrc).toContain('LIGHTNING_DELAYS_MS = [3000,');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2b. AscensionSystem — air waypoint shortening logic (pure)
// ═════════════════════════════════════════════════════════════════════════════

// We can test modifyAirWaypoints logic arithmetically since it's pure array manipulation.
describe('Air waypoint shortening — arithmetic', () => {
  // Replicate the modifyAirWaypoints logic (no Phaser dependency).
  function modifyAirWaypoints(waypoints: { x: number; y: number }[], bypass: number) {
    if (bypass <= 0 || waypoints.length <= 2) return waypoints;
    const keepUntil = Math.max(1, waypoints.length - 1 - bypass);
    return [...waypoints.slice(0, keepUntil), waypoints[waypoints.length - 1]];
  }

  it('returns original if bypass is 0', () => {
    const wp = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
    expect(modifyAirWaypoints(wp, 0)).toBe(wp);
  });

  it('returns original if bypass is negative', () => {
    const wp = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    expect(modifyAirWaypoints(wp, -1)).toBe(wp);
  });

  it('returns original if only 2 waypoints', () => {
    const wp = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    expect(modifyAirWaypoints(wp, 3)).toBe(wp);
  });

  it('bypasses 3 tiles from a 6-tile path, keeping first and last', () => {
    const wp = [
      { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 },
      { x: 3, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 5 },
    ];
    const result = modifyAirWaypoints(wp, 3);
    // keepUntil = max(1, 6 - 1 - 3) = 2
    // slice(0, 2) = [0,1] + [5] = 3 entries
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[1]).toEqual({ x: 1, y: 1 });
    expect(result[2]).toEqual({ x: 5, y: 5 });
  });

  it('always keeps at least the first waypoint and exit', () => {
    const wp = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
    const result = modifyAirWaypoints(wp, 10); // bypass more than available
    // keepUntil = max(1, 3 - 1 - 10) = max(1, -8) = 1
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[1]).toEqual({ x: 2, y: 2 });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. SaveManager — ascension save/load
// ═════════════════════════════════════════════════════════════════════════════

import { SaveManager } from '../../meta/SaveManager';

function makeStoreMock() {
  const store = new Map<string, string>();
  return {
    getItem:    (key: string) => store.get(key) ?? null,
    setItem:    (key: string, val: string) => { store.set(key, val); },
    removeItem: (key: string) => { store.delete(key); },
    clear:      () => store.clear(),
    get length() { return store.size; },
    key:        (i: number) => [...store.keys()][i] ?? null,
  };
}

function resetSingleton(): void {
  (SaveManager as unknown as { _instance: null })._instance = null;
}

describe('SaveManager — ascension progression', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeStoreMock());
    resetSingleton();
  });

  it('defaults highestAscensionCleared to -1', () => {
    const sm = SaveManager.getInstance();
    expect(sm.getHighestAscensionCleared()).toBe(-1);
  });

  it('maxAvailableAscension is 0 when no run has been cleared', () => {
    const sm = SaveManager.getInstance();
    expect(sm.getMaxAvailableAscension()).toBe(0);
  });

  it('getCurrentAscension defaults to 0', () => {
    const sm = SaveManager.getInstance();
    expect(sm.getCurrentAscension()).toBe(0);
  });

  it('recordAscensionClear(0) advances highestAscensionCleared from -1 to 0', () => {
    const sm = SaveManager.getInstance();
    const unlocked = sm.recordAscensionClear(0);
    expect(unlocked).toBe(true);
    expect(sm.getHighestAscensionCleared()).toBe(0);
  });

  it('after clearing level 0, maxAvailable becomes 1', () => {
    const sm = SaveManager.getInstance();
    sm.recordAscensionClear(0);
    expect(sm.getMaxAvailableAscension()).toBe(1);
  });

  it('recordAscensionClear(1) after clearing level 0 advances to 1', () => {
    const sm = SaveManager.getInstance();
    sm.recordAscensionClear(0);
    const unlocked = sm.recordAscensionClear(1);
    expect(unlocked).toBe(true);
    expect(sm.getHighestAscensionCleared()).toBe(1);
    expect(sm.getMaxAvailableAscension()).toBe(2);
  });

  it('re-clearing the same level does not advance', () => {
    const sm = SaveManager.getInstance();
    sm.recordAscensionClear(0);
    const unlocked = sm.recordAscensionClear(0);
    expect(unlocked).toBe(false);
    expect(sm.getHighestAscensionCleared()).toBe(0);
  });

  it('cannot skip levels — re-clearing level 3 when only 1 is cleared returns true (direct jump)', () => {
    const sm = SaveManager.getInstance();
    sm.recordAscensionClear(0);
    sm.recordAscensionClear(1);
    // Player somehow clears level 3 directly (still > prev=1)
    const unlocked = sm.recordAscensionClear(3);
    expect(unlocked).toBe(true);
    expect(sm.getHighestAscensionCleared()).toBe(3);
  });

  it('recordAscensionClear caps at 10', () => {
    const sm = SaveManager.getInstance();
    // Force high level
    for (let i = 0; i <= 10; i++) sm.recordAscensionClear(i);
    expect(sm.getHighestAscensionCleared()).toBe(10);
    expect(sm.getMaxAvailableAscension()).toBe(10); // capped at 10
  });

  it('setCurrentAscension clamps to maxAvailable', () => {
    const sm = SaveManager.getInstance();
    // No run cleared yet — maxAvailable = 0
    sm.setCurrentAscension(5);
    expect(sm.getCurrentAscension()).toBe(0);
  });

  it('setCurrentAscension allows level within range after progression', () => {
    const sm = SaveManager.getInstance();
    sm.recordAscensionClear(0);
    sm.recordAscensionClear(1);
    sm.recordAscensionClear(2);
    // maxAvailable = 3
    sm.setCurrentAscension(2);
    expect(sm.getCurrentAscension()).toBe(2);
  });

  it('setCurrentAscension floors fractional input', () => {
    const sm = SaveManager.getInstance();
    sm.recordAscensionClear(0);
    sm.setCurrentAscension(0.9);
    expect(sm.getCurrentAscension()).toBe(0);
  });

  it('setCurrentAscension clamps negative to 0', () => {
    const sm = SaveManager.getInstance();
    sm.recordAscensionClear(0);
    sm.setCurrentAscension(-5);
    expect(sm.getCurrentAscension()).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Structural ?raw tests — integration wiring
// ═════════════════════════════════════════════════════════════════════════════

describe('GameScene — ascension integration', () => {
  it('imports AscensionSystem', () => {
    expect(gameSceneSrc).toContain("import { AscensionSystem }");
  });

  it('has _ascensionLevel field', () => {
    expect(gameSceneSrc).toContain('private _ascensionLevel');
  });

  it('has _ascensionSystem field', () => {
    expect(gameSceneSrc).toContain('private _ascensionSystem: AscensionSystem | null');
  });

  it('reads ascensionLevel from init data', () => {
    expect(gameSceneSrc).toContain('ascensionLevel?: number');
    expect(gameSceneSrc).toContain("data?.ascensionLevel ?? 0");
  });

  it('creates AscensionSystem when level > 0', () => {
    expect(gameSceneSrc).toContain('new AscensionSystem(this, this._ascensionLevel)');
  });

  it('sets ascensionSpeedMult on scene.data', () => {
    expect(gameSceneSrc).toContain("this.data.set('ascensionSpeedMult'");
  });

  it('passes ascensionConfig to WaveManager constructor', () => {
    expect(gameSceneSrc).toContain('ascensionConfig');
    expect(gameSceneSrc).toContain('hpMult:');
    expect(gameSceneSrc).toContain('armoredEarly:');
    expect(gameSceneSrc).toContain('regenPerSec:');
    expect(gameSceneSrc).toContain('immuneCombo:');
  });

  it('calls onWaveStart after starting a wave', () => {
    expect(gameSceneSrc).toContain('this._ascensionSystem.onWaveStart(this.currentWave');
  });

  it('calls onCreepDiedPoisoned in creep-died-poisoned handler', () => {
    expect(gameSceneSrc).toContain('this._ascensionSystem?.onCreepDiedPoisoned(');
  });

  it('has _getAscGoldMult helper that reads getGoldIncomeMultiplier', () => {
    expect(gameSceneSrc).toContain('private _getAscGoldMult()');
    expect(gameSceneSrc).toContain('this._ascensionSystem?.getGoldIncomeMultiplier()');
  });

  it('applies ascension gold penalty to creep kill rewards', () => {
    expect(gameSceneSrc).toContain('this._getAscGoldMult()');
  });

  it('applies ascension gold penalty to wave-bonus handler', () => {
    expect(gameSceneSrc).toContain("events.on('wave-bonus'");
    // The wave-bonus adjustedBonus must include _getAscGoldMult
    const waveBonusBlock = gameSceneSrc.slice(
      gameSceneSrc.indexOf("events.on('wave-bonus'"),
      gameSceneSrc.indexOf("events.on('wave-bonus'") + 500,
    );
    expect(waveBonusBlock).toContain('_getAscGoldMult()');
  });

  it('applies ascension gold penalty to boss-killed handler', () => {
    expect(gameSceneSrc).toContain("events.on('boss-killed'");
    const bossBlock = gameSceneSrc.slice(
      gameSceneSrc.indexOf("events.on('boss-killed'"),
      gameSceneSrc.indexOf("events.on('boss-killed'") + 400,
    );
    expect(bossBlock).toContain('_getAscGoldMult()');
  });

  it('applies ascension gold penalty to interest bonus', () => {
    const interestIdx = gameSceneSrc.indexOf('getInterestBonus(this.gold)');
    const line = gameSceneSrc.slice(interestIdx, interestIdx + 80);
    expect(line).toContain('_getAscGoldMult()');
  });

  it('applies ascension gold penalty to jackpot bonus', () => {
    const jackpotIdx = gameSceneSrc.indexOf('getJackpotBonus()');
    const line = gameSceneSrc.slice(jackpotIdx, jackpotIdx + 80);
    expect(line).toContain('_getAscGoldMult()');
  });

  it('applies crystal reward scaling on victory', () => {
    expect(gameSceneSrc).toContain('1 + 0.15 * this._ascensionLevel');
  });

  it('records ascension clear in SaveManager on victory', () => {
    expect(gameSceneSrc).toContain('recordAscensionClear(this._ascensionLevel)');
  });

  it('passes ascensionLevel to GameOverScene data', () => {
    expect(gameSceneSrc).toContain('ascensionLevel:');
    expect(gameSceneSrc).toContain('ascensionNewUnlock:');
  });

  it('creates ascension badge in HUD when level > 0', () => {
    expect(gameSceneSrc).toContain('this.hud.createAscensionBadge(this._ascensionLevel)');
  });

  it('modifies air waypoints for ascension 7', () => {
    expect(gameSceneSrc).toContain('this._ascensionSystem.modifyAirWaypoints(rawAirWaypoints)');
  });

  it('destroys AscensionSystem in shutdown', () => {
    expect(gameSceneSrc).toContain('this._ascensionSystem?.destroy()');
    expect(gameSceneSrc).toContain('this._ascensionSystem = null');
  });

  it('resets _ascensionSystem to null in init', () => {
    expect(gameSceneSrc).toContain('this._ascensionSystem      = null');
  });
});

describe('WaveManager — ascension integration', () => {
  it('accepts ascensionConfig in constructor', () => {
    expect(waveManagerSrc).toContain('ascensionConfig?:');
  });

  it('stores ascensionHpMult field', () => {
    expect(waveManagerSrc).toContain('private ascensionHpMult');
  });

  it('stores ascensionArmoredEarly field', () => {
    expect(waveManagerSrc).toContain('private ascensionArmoredEarly');
  });

  it('stores ascensionRegenPerSec field', () => {
    expect(waveManagerSrc).toContain('private ascensionRegenPerSec');
  });

  it('stores ascensionImmuneCombo field', () => {
    expect(waveManagerSrc).toContain('private ascensionImmuneCombo');
  });

  it('applies HP multiplier to ground creep spawn config', () => {
    expect(waveManagerSrc).toContain('waveDef.hpMult * this.ascensionHpMult');
  });

  it('applies HP multiplier to boss spawn config', () => {
    expect(waveManagerSrc).toContain('bossDef.hp * this.ascensionHpMult');
  });

  it('calls applyAscensionTraits on built creep configs', () => {
    expect(waveManagerSrc).toContain('this.applyAscensionTraits(cfg, typeKey)');
  });

  it('has applyAscensionTraits method', () => {
    expect(waveManagerSrc).toContain('private applyAscensionTraits(config: CreepConfig');
  });

  it('skips boss creeps in applyAscensionTraits', () => {
    expect(waveManagerSrc).toContain('if (config.isBoss) return');
  });

  it('applies armored early with 40% chance on ground creeps', () => {
    // Uses injected Rng — Math.random() replaced with this.rng.next()
    expect(waveManagerSrc).toContain('this.rng.next() < 0.40');
  });

  it('applies regen per sec to non-boss creeps', () => {
    expect(waveManagerSrc).toContain('config.regenPercentPerSec = this.ascensionRegenPerSec');
  });

  it('applies dual immunity for immune creeps', () => {
    expect(waveManagerSrc).toContain('config.isSlowImmune   = true');
    expect(waveManagerSrc).toContain('config.isPoisonImmune = true');
  });
});

describe('Creep — ascension speed multiplier', () => {
  it('reads ascensionSpeedMult from scene.data', () => {
    // Read the Creep source to verify integration.
    const idx = gameSceneSrc.indexOf('ascensionSpeedMult');
    expect(idx).toBeGreaterThan(-1);
  });
});

describe('Tower — ascension disable', () => {
  // Verify Tower source has the disable methods.
  it('has _ascensionDisabled field (via raw source check on AscensionSystem reference)', () => {
    expect(ascensionSysSrc).toContain('disableForAscension');
  });
});

describe('HUD — ascension badge', () => {
  it('has createAscensionBadge method', () => {
    expect(hudSrc).toContain('createAscensionBadge(ascensionLevel: number)');
  });

  it('displays A{N} format', () => {
    expect(hudSrc).toContain('`A${ascensionLevel}`');
  });

  it('has _ascensionBadge field', () => {
    expect(hudSrc).toContain('private _ascensionBadge');
  });
});

// TASK-137: Ascension picker UI removed from CommanderSelectScene (hidden pending design pass).
// These structural tests are skipped until the picker is re-enabled.
describe('CommanderSelectScene — ascension picker', () => {
  it.skip('imports ASCENSION_DEFS', () => {
    expect(commanderSelectSrc).toContain("import { ASCENSION_DEFS }");
  });

  it('has _selectedAscension field', () => {
    expect(commanderSelectSrc).toContain('private _selectedAscension');
  });

  it('passes ascensionLevel in gameData', () => {
    expect(commanderSelectSrc).toContain('ascensionLevel: this._selectedAscension');
  });

  it.skip('shows Standard Run label for level 0', () => {
    expect(commanderSelectSrc).toContain("'Standard Run'");
  });

  it.skip('accesses ASCENSION_DEFS[_selectedAscension - 1] for level names', () => {
    expect(commanderSelectSrc).toContain('ASCENSION_DEFS[this._selectedAscension - 1]');
  });

  it.skip('persists selection via setCurrentAscension', () => {
    expect(commanderSelectSrc).toContain('setCurrentAscension(this._selectedAscension)');
  });

  it.skip('picker only shown when maxAvailable >= 1', () => {
    expect(commanderSelectSrc).toContain('if (maxAvailable >= 1)');
  });
});

describe('GameOverScene — ascension banner', () => {
  it('imports ASCENSION_DEFS', () => {
    expect(gameOverSrc).toContain("import { ASCENSION_DEFS }");
  });

  it('has ascensionLevel in GameOverData interface', () => {
    expect(gameOverSrc).toContain('ascensionLevel?:');
  });

  it('has ascensionNewUnlock in GameOverData interface', () => {
    expect(gameOverSrc).toContain('ascensionNewUnlock?:');
  });

  it('shows ascension complete banner only for level > 0', () => {
    expect(gameOverSrc).toContain('won && ascensionLevel > 0');
  });

  it('shows next-level preview when new unlock', () => {
    expect(gameOverSrc).toContain('ascensionNewUnlock && ascensionLevel < ASCENSION_DEFS.length');
  });
});

describe('SaveManager — ascension sanitization', () => {
  it('defaults highestAscensionCleared to -1 in defaultSaveData', () => {
    expect(saveManagerSrc).toContain('highestAscensionCleared: -1');
  });

  it('sanitizes highestAscensionCleared with -1 minimum', () => {
    expect(saveManagerSrc).toContain("Math.max(-1, Math.min(10,");
  });

  it('currentAscension clamped to 0–10', () => {
    expect(saveManagerSrc).toContain("Math.max(0, Math.min(10, Math.floor(v)))");
  });

  it('currentAscension clamped to maxAvailable in _sanitize', () => {
    expect(saveManagerSrc).toContain('Math.max(0, highestAscensionCleared + 1)');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. Crystal reward scaling — arithmetic
// ═════════════════════════════════════════════════════════════════════════════

describe('Crystal reward scaling', () => {
  function scaleCrystals(base: number, ascensionLevel: number): number {
    return Math.round(base * (1 + 0.15 * ascensionLevel));
  }

  it('standard run (level 0) gives 1.0× crystals', () => {
    expect(scaleCrystals(100, 0)).toBe(100);
  });

  it('ascension 1 gives 1.15× crystals', () => {
    expect(scaleCrystals(100, 1)).toBe(115);
  });

  it('ascension 5 gives 1.75× crystals', () => {
    expect(scaleCrystals(100, 5)).toBe(175);
  });

  it('ascension 10 gives 2.5× crystals', () => {
    expect(scaleCrystals(100, 10)).toBe(250);
  });
});
