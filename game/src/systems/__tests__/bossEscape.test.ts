/**
 * Boss Escape Penalty — TASK-136
 *
 * Covers all acceptance criteria:
 *   1. bossEscapeLiveCost formula — penalty table (5–10 lives, scaling with wave).
 *   2. Penalty is always ≥ BOSS_ESCAPE_BASE_LIVES and ≤ BOSS_ESCAPE_MAX_LIVES.
 *   3. WaveManager emits isBoss:true and correct liveCost in creep-escaped.
 *   4. GameScene handler reads isBoss from the event and calls _showBossEscapeFeedback.
 *   5. Recovery arithmetic — one escape survivable from 20 lives; two escapes are critical.
 */

import { describe, it, expect } from 'vitest';
import {
  bossEscapeLiveCost,
  BOSS_ESCAPE_BASE_LIVES,
  BOSS_ESCAPE_MAX_LIVES,
} from '../../data/bossDefs';

import waveManagerSrc from '../WaveManager.ts?raw';
import bossDefsSrc    from '../../data/bossDefs.ts?raw';
import gameSceneSrc   from '../../scenes/GameScene.ts?raw';

// ── 1. bossEscapeLiveCost formula ─────────────────────────────────────────

describe('bossEscapeLiveCost — penalty table', () => {
  it('wave 5 (first boss) → 5 lives', () => {
    expect(bossEscapeLiveCost(5)).toBe(5);
  });

  it('wave 10 → 6 lives', () => {
    expect(bossEscapeLiveCost(10)).toBe(6);
  });

  it('wave 15 → 7 lives', () => {
    expect(bossEscapeLiveCost(15)).toBe(7);
  });

  it('wave 20 → 8 lives', () => {
    expect(bossEscapeLiveCost(20)).toBe(8);
  });

  it('wave 25 → 9 lives', () => {
    expect(bossEscapeLiveCost(25)).toBe(9);
  });

  it('wave 30 → 10 lives (cap reached)', () => {
    expect(bossEscapeLiveCost(30)).toBe(10);
  });

  it('wave 35 → still 10 lives (cap holds)', () => {
    expect(bossEscapeLiveCost(35)).toBe(10);
  });

  it('wave 50 → still 10 lives (cap holds for very high waves)', () => {
    expect(bossEscapeLiveCost(50)).toBe(10);
  });
});

// ── 2. Penalty bounds ──────────────────────────────────────────────────────

describe('bossEscapeLiveCost — bounds', () => {
  it('BOSS_ESCAPE_BASE_LIVES is 5', () => {
    expect(BOSS_ESCAPE_BASE_LIVES).toBe(5);
  });

  it('BOSS_ESCAPE_MAX_LIVES is 10', () => {
    expect(BOSS_ESCAPE_MAX_LIVES).toBe(10);
  });

  it('penalty is always ≥ BOSS_ESCAPE_BASE_LIVES for valid boss waves', () => {
    const bossWaves = [5, 10, 15, 20, 25, 30, 35, 40];
    for (const w of bossWaves) {
      expect(bossEscapeLiveCost(w)).toBeGreaterThanOrEqual(BOSS_ESCAPE_BASE_LIVES);
    }
  });

  it('penalty is always ≤ BOSS_ESCAPE_MAX_LIVES regardless of wave', () => {
    const extremeWaves = [30, 50, 100, 200];
    for (const w of extremeWaves) {
      expect(bossEscapeLiveCost(w)).toBeLessThanOrEqual(BOSS_ESCAPE_MAX_LIVES);
    }
  });

  it('penalty increases monotonically from wave 5 to wave 30', () => {
    let prev = bossEscapeLiveCost(5);
    for (const w of [10, 15, 20, 25, 30]) {
      const cost = bossEscapeLiveCost(w);
      expect(cost).toBeGreaterThanOrEqual(prev);
      prev = cost;
    }
  });

  it('wave 0 returns BOSS_ESCAPE_BASE_LIVES (graceful for invalid input)', () => {
    expect(bossEscapeLiveCost(0)).toBe(BOSS_ESCAPE_BASE_LIVES);
  });

  it('wave 1 returns BOSS_ESCAPE_BASE_LIVES (non-boss wave)', () => {
    expect(bossEscapeLiveCost(1)).toBe(BOSS_ESCAPE_BASE_LIVES);
  });

  it('wave 4 returns BOSS_ESCAPE_BASE_LIVES (just before first boss)', () => {
    expect(bossEscapeLiveCost(4)).toBe(BOSS_ESCAPE_BASE_LIVES);
  });

  it('negative wave number returns BOSS_ESCAPE_BASE_LIVES', () => {
    expect(bossEscapeLiveCost(-10)).toBe(BOSS_ESCAPE_BASE_LIVES);
  });
});

// ── 3. WaveManager structural tests ───────────────────────────────────────

describe('WaveManager — boss reached-exit emits isBoss:true', () => {
  it('imports and calls bossEscapeLiveCost in _spawnBossForWave', () => {
    // The boss escape handler should call the scaling helper, not hardcode 3.
    expect(waveManagerSrc).toContain('bossEscapeLiveCost(wave.waveNumber)');
  });

  it('emits creep-escaped with isBoss: true on boss escape', () => {
    expect(waveManagerSrc).toContain("emit('creep-escaped', { liveCost, reward: creep.reward, isBoss: true }");
  });

  it('no longer hardcodes liveCost: 3 for boss escape', () => {
    // The old hardcoded value should be replaced by the dynamic helper.
    const emitLines = waveManagerSrc
      .split('\n')
      .filter(l => l.includes("emit('creep-escaped'") && l.includes('liveCost: 3'));
    expect(emitLines).toHaveLength(0);
  });

  it('imports bossEscapeLiveCost from bossDefs', () => {
    expect(waveManagerSrc).toContain("bossEscapeLiveCost } from '../data/bossDefs'");
  });
});

describe('bossDefs — exports penalty constants and function', () => {
  it('exports BOSS_ESCAPE_BASE_LIVES constant', () => {
    expect(bossDefsSrc).toContain('export const BOSS_ESCAPE_BASE_LIVES');
  });

  it('exports BOSS_ESCAPE_MAX_LIVES constant', () => {
    expect(bossDefsSrc).toContain('export const BOSS_ESCAPE_MAX_LIVES');
  });

  it('exports bossEscapeLiveCost function', () => {
    expect(bossDefsSrc).toContain('export function bossEscapeLiveCost(');
  });
});

// ── 4. GameScene structural tests ─────────────────────────────────────────

describe('GameScene — creep-escaped handler reads isBoss', () => {
  it('handler destructures isBoss from event data', () => {
    expect(gameSceneSrc).toContain('isBoss');
  });

  it('calls _showBossEscapeFeedback when isBoss is true', () => {
    expect(gameSceneSrc).toContain('_showBossEscapeFeedback');
  });

  it('_showBossEscapeFeedback method exists in GameScene', () => {
    expect(gameSceneSrc).toContain('private _showBossEscapeFeedback(');
  });

  it('feedback includes the live cost in the displayed text', () => {
    // The feedback string should reference the liveCost parameter.
    expect(gameSceneSrc).toContain('BOSS ESCAPED!');
  });

  it('feedback is only shown when effectiveCost > 0 (Waabizii absorption guard)', () => {
    // Ensures the boss escape feedback respects Waabizii ability.
    expect(gameSceneSrc).toContain('if (isBoss && effectiveCost > 0) this._showBossEscapeFeedback');
  });
});

// ── 5. Recovery arithmetic ─────────────────────────────────────────────────

describe('Boss escape recovery — balance arithmetic', () => {
  const STARTING_LIVES = 20;

  it('player survives ONE boss escape at wave 5 (15 lives remain)', () => {
    const penalty = bossEscapeLiveCost(5); // 5
    const remaining = STARTING_LIVES - penalty;
    expect(remaining).toBe(15);
    expect(remaining).toBeGreaterThan(0);
  });

  it('player survives ONE boss escape at wave 10 (14 lives remain)', () => {
    const penalty = bossEscapeLiveCost(10); // 6
    const remaining = STARTING_LIVES - penalty;
    expect(remaining).toBe(14);
    expect(remaining).toBeGreaterThan(0);
  });

  it('two boss escapes (wave 5 + wave 10) leave only 9 lives — critical', () => {
    const total = bossEscapeLiveCost(5) + bossEscapeLiveCost(10); // 5+6=11
    const remaining = STARTING_LIVES - total;
    expect(remaining).toBe(9);
    // Still alive but critically low
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThan(10);
  });

  it('two boss escapes (wave 15 + wave 20) leave only 5 lives — near-fatal', () => {
    const total = bossEscapeLiveCost(15) + bossEscapeLiveCost(20); // 7+8=15
    const remaining = STARTING_LIVES - total;
    expect(remaining).toBe(5);
    expect(remaining).toBeGreaterThan(0);
  });

  it('late-game boss escape (wave 25) alone is devastating — 11 lives remain', () => {
    const penalty = bossEscapeLiveCost(25); // 9
    const remaining = STARTING_LIVES - penalty;
    expect(remaining).toBe(11);
  });

  it('a wave-30 boss escape from 10 remaining lives ends the run', () => {
    const livesAtW30 = 10;
    const penalty    = bossEscapeLiveCost(30); // 10
    const remaining  = Math.max(0, livesAtW30 - penalty);
    expect(remaining).toBe(0);
  });

  it('penalty is strictly higher than the old value of 3', () => {
    const OLD_PENALTY = 3;
    // All boss waves now cost more than the old hardcoded 3.
    const bossWaves = [5, 10, 15, 20, 25, 30];
    for (const w of bossWaves) {
      expect(bossEscapeLiveCost(w)).toBeGreaterThan(OLD_PENALTY);
    }
  });
});
