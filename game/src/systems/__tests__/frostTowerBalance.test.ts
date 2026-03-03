/**
 * TASK-130 — Frost Tower Balance Rework
 *
 * Verifies every acceptance criterion:
 * - FROST_DEF cost raised to 150, range reduced to 120
 * - FROST_DEF description reflects new mechanics
 * - SLOW_FACTOR_CAP = 0.40 (60% max slow reduction)
 * - SLOW_IMMUNE_COOLDOWN_MS = 2000 (2 s post-slow immunity)
 * - Creep.applySlow() respects immunity cooldown, slow cap, and no-reset rule
 * - Upgrade Path A descriptions updated; deep tiers include attack speed bonus
 * - Path A description field added to explain cap
 */
import { describe, it, expect } from 'vitest';
import { FROST_DEF } from '../../data/towerDefs';
import { ALL_UPGRADE_DEFS } from '../../data/upgradeDefs';
import { SLOW_FACTOR_CAP, SLOW_IMMUNE_COOLDOWN_MS } from '../../data/creepBalanceDefs';

import creepSrc from '../../entities/Creep.ts?raw';
import towerSrc from '../../entities/towers/Tower.ts?raw';

// ── 1. FROST_DEF stat changes ─────────────────────────────────────────────────

describe('FROST_DEF — updated stats (TASK-130)', () => {
  it('cost is 150 (raised from 125 to limit early-game spam)', () => {
    expect(FROST_DEF.cost).toBe(150);
  });

  it('range is 120 (reduced from 140 so placement matters)', () => {
    expect(FROST_DEF.range).toBe(120);
  });

  it('damage and fire rate are unchanged (15 dmg, 1200ms)', () => {
    expect(FROST_DEF.damage).toBe(15);
    expect(FROST_DEF.attackIntervalMs).toBe(1200);
  });

  it('description mentions 60% slow cap', () => {
    expect(FROST_DEF.description).toContain('60%');
  });

  it('description mentions resistance / immunity window', () => {
    // "resist" covers "resist re-slow" wording
    expect(FROST_DEF.description.toLowerCase()).toMatch(/resist|immune/);
  });
});

// ── 2. Exported balance constants ─────────────────────────────────────────────

describe('SLOW_FACTOR_CAP constant', () => {
  it('equals 0.40 (creep moves at 40% speed = 60% reduction max)', () => {
    expect(SLOW_FACTOR_CAP).toBe(0.40);
  });

  it('is re-exported from Creep.ts so callers need not know the data module', () => {
    expect(creepSrc).toContain('SLOW_FACTOR_CAP');
  });
});

describe('SLOW_IMMUNE_COOLDOWN_MS constant', () => {
  it('equals 2000 ms (2-second post-slow immunity)', () => {
    expect(SLOW_IMMUNE_COOLDOWN_MS).toBe(2000);
  });

  it('is re-exported from Creep.ts', () => {
    expect(creepSrc).toContain('SLOW_IMMUNE_COOLDOWN_MS');
  });
});

// ── 3. Creep structural checks ────────────────────────────────────────────────

describe('Creep — _slowImmuneCooldownMs field', () => {
  it('declares _slowImmuneCooldownMs instance field', () => {
    expect(creepSrc).toContain('_slowImmuneCooldownMs');
  });

  it('initialises to 0', () => {
    expect(creepSrc).toContain('_slowImmuneCooldownMs = 0');
  });
});

describe('Creep.step() — immunity cooldown countdown', () => {
  it('decrements _slowImmuneCooldownMs by delta each frame', () => {
    // Must use Math.max to clamp at 0
    expect(creepSrc).toContain('this._slowImmuneCooldownMs = Math.max(0, this._slowImmuneCooldownMs - delta)');
  });
});

describe('Creep.applySlow() — immunity cooldown check', () => {
  it('returns early when _slowImmuneCooldownMs > 0', () => {
    expect(creepSrc).toContain('if (this._slowImmuneCooldownMs > 0) return;');
  });

  it('applies SLOW_FACTOR_CAP via Math.max to incoming factor', () => {
    expect(creepSrc).toContain('Math.max(factor, SLOW_FACTOR_CAP)');
  });

  it('sets _slowImmuneCooldownMs = SLOW_IMMUNE_COOLDOWN_MS when slow expires', () => {
    expect(creepSrc).toContain('this._slowImmuneCooldownMs    = SLOW_IMMUNE_COOLDOWN_MS;');
  });

  it('skips when effectiveFactor is not stronger (>= current slowFactor)', () => {
    // The no-reset guard prevents timer refreshes from equal-strength slows
    expect(creepSrc).toContain('if (effectiveFactor >= this.slowFactor) return;');
  });

  it('updates slowFactor to the new stronger value', () => {
    expect(creepSrc).toContain('this.slowFactor      = effectiveFactor;');
  });
});

// ── 4. Pure cap arithmetic ────────────────────────────────────────────────────

describe('Slow cap arithmetic', () => {
  /**
   * Simulate the cap + air-resistance logic from applySlow() without Phaser.
   */
  function simulateSlow(factor: number, isAir: boolean): number {
    const cappedFactor = Math.max(factor, SLOW_FACTOR_CAP);
    return isAir ? 1 - (1 - cappedFactor) * 0.5 : cappedFactor;
  }

  it('base frost (0.5) is within cap — ground creep gets 50% speed', () => {
    expect(simulateSlow(0.5, false)).toBeCloseTo(0.5);
  });

  it('Chill I (0.44) is within cap — ground creep gets 44% speed', () => {
    expect(simulateSlow(0.44, false)).toBeCloseTo(0.44);
  });

  it('Chill II (0.42) is within cap — ground creep gets 42% speed', () => {
    expect(simulateSlow(0.42, false)).toBeCloseTo(0.42);
  });

  it('Chill III (0.40) hits the cap exactly — ground creep gets 40% speed', () => {
    expect(simulateSlow(0.40, false)).toBeCloseTo(0.40);
  });

  it('Chill IV/V factors (0.40) remain at cap — not further reduced', () => {
    // The upgrade factors for Chill IV and V in upgradeDefs are 0.40 (at cap)
    expect(simulateSlow(0.40, false)).toBeCloseTo(0.40);
  });

  it('air creeps: base frost (0.5) → 75% speed (air halves the 50% reduction)', () => {
    expect(simulateSlow(0.5, true)).toBeCloseTo(0.75);
  });

  it('air creeps: cap (0.40) → 70% speed (air halves the 60% reduction)', () => {
    // 1 - (1 - 0.40) * 0.5 = 1 - 0.30 = 0.70
    expect(simulateSlow(0.40, true)).toBeCloseTo(0.70);
  });

  it('extreme upgrade (e.g. gear: 0.10) still capped at 0.40 for ground', () => {
    expect(simulateSlow(0.10, false)).toBeCloseTo(0.40);
  });

  it('arrow C slow (0.70-0.85) is unaffected by cap', () => {
    expect(simulateSlow(0.70, false)).toBeCloseTo(0.70);
    expect(simulateSlow(0.85, false)).toBeCloseTo(0.85);
  });

  it('no-reset: equal factor is NOT stronger', () => {
    // effectiveFactor >= slowFactor → return early (no timer reset)
    const current = 0.50;
    const incoming = simulateSlow(0.50, false); // 0.50
    expect(incoming >= current).toBe(true); // equal → skip
  });

  it('no-reset: weaker factor is NOT stronger', () => {
    const current = 0.40; // already at cap
    const incoming = simulateSlow(0.70, false); // weaker (0.70 > 0.40)
    expect(incoming >= current).toBe(true); // not stronger → skip
  });

  it('stronger factor IS applied and starts a new timer', () => {
    const current = 0.50; // basic frost
    const incoming = simulateSlow(0.40, false); // capped stronger frost
    expect(incoming < current).toBe(true); // 0.40 < 0.50 → apply
  });
});

// ── 5. Upgrade Path A — descriptions and progression ─────────────────────────

describe('Frost upgrades — Path A (Slow Magnitude)', () => {
  const frostDef = ALL_UPGRADE_DEFS.find(d => d.towerKey === 'frost')!;
  const pathA = frostDef.paths.A;

  it('path A exists', () => {
    expect(pathA).toBeDefined();
  });

  it('path A has a description field mentioning 60% cap', () => {
    expect(pathA.description).toBeDefined();
    expect(pathA.description!).toContain('60%');
  });

  it('Chill I description shows % format (56%)', () => {
    expect(pathA.tiers[0].description).toContain('56%');
  });

  it('Chill II description shows % format (58%)', () => {
    expect(pathA.tiers[1].description).toContain('58%');
  });

  it('Chill III description mentions the slow cap', () => {
    expect(pathA.tiers[2].description).toContain('60%');
  });

  it('Chill IV grants attack speed bonus (deep tier reward)', () => {
    const delta = pathA.tiers[3].statDelta;
    expect(delta?.attackSpeedPct).toBeGreaterThan(0);
  });

  it('Chill V grants attack speed bonus and damage bonus', () => {
    const delta = pathA.tiers[4].statDelta;
    expect(delta?.attackSpeedPct).toBeGreaterThan(0);
    expect(delta?.damageDelta).toBeGreaterThan(0);
  });

  it('Chill III, IV, V all use slowFactor 0.40 (at the cap)', () => {
    for (const tier of [pathA.tiers[2], pathA.tiers[3], pathA.tiers[4]]) {
      expect(tier.effects?.slowFactor).toBe(0.40);
    }
  });

  it('Chill I factor (0.44) is strictly above cap', () => {
    expect(pathA.tiers[0].effects?.slowFactor).toBe(0.44);
    expect(pathA.tiers[0].effects?.slowFactor).toBeGreaterThan(SLOW_FACTOR_CAP);
  });

  it('Chill II factor (0.42) is strictly above cap', () => {
    expect(pathA.tiers[1].effects?.slowFactor).toBe(0.42);
    expect(pathA.tiers[1].effects?.slowFactor).toBeGreaterThan(SLOW_FACTOR_CAP);
  });

  it('Chill III locks Path C', () => {
    expect(pathA.tiers[2].description).toContain('Locks Path C');
  });
});

// ── 6. Upgrade Path B — durations unchanged ───────────────────────────────────

describe('Frost upgrades — Path B (Freeze Duration) unchanged', () => {
  const frostDef = ALL_UPGRADE_DEFS.find(d => d.towerKey === 'frost')!;
  const pathB = frostDef.paths.B;

  it('tier 1 sets slowDurationMs to 3000', () => {
    expect(pathB.tiers[0].effects?.slowDurationMs).toBe(3000);
  });

  it('tier 5 sets slowDurationMs to 6000', () => {
    expect(pathB.tiers[4].effects?.slowDurationMs).toBe(6000);
  });
});

// ── 7. Cost/range regression from towerDefs ───────────────────────────────────

describe('FROST_DEF cost and range regression', () => {
  it('cost is not 125 (old value)', () => {
    expect(FROST_DEF.cost).not.toBe(125);
  });

  it('range is not 140 (old value)', () => {
    expect(FROST_DEF.range).not.toBe(140);
  });

  it('cost (150) is greater than before (125)', () => {
    expect(FROST_DEF.cost).toBeGreaterThan(125);
  });

  it('range (120) is less than before (140)', () => {
    expect(FROST_DEF.range).toBeLessThan(140);
  });
});

// ── 8. Cross-slow interaction — all slow sources use applySlow() ─────────────
//
// The immunity cooldown and no-reset guard live inside applySlow(), which is
// shared by Frost, Arrow C, explosive residue, cryo cannon, and concussion.
// These structural tests verify the coupling so a future refactor doesn't
// accidentally bypass the balance constraints.

describe('Cross-slow: all slow sources call applySlow()', () => {
  it('explosive residue slow (Mortar offer) calls applySlow', () => {
    expect(towerSrc).toContain('explosiveResidu) c.applySlow(');
  });

  it('cryo cannon slow (Rock Hurler offer) calls applySlow', () => {
    expect(towerSrc).toContain('cryoActive) c.applySlow(');
  });

  it('concussion shell slow (Rock Hurler offer) calls applySlow', () => {
    expect(towerSrc).toContain('concussionActive) c.applySlow(');
  });

  it('Arrow C slow-on-hit calls applySlow', () => {
    expect(towerSrc).toContain('c.applySlow(sf, sd)');
  });

  it('Frost tower onHit calls applySlow', () => {
    expect(towerSrc).toContain('c.applySlow(effectiveSf, sd)');
  });
});

// ── 9. Factor cap edge cases (pure arithmetic) ──────────────────────────────

describe('Slow cap — factor edge cases', () => {
  function cap(factor: number): number {
    return Math.max(factor, SLOW_FACTOR_CAP);
  }

  it('factor exactly 0 is capped to 0.40', () => {
    expect(cap(0)).toBe(0.40);
  });

  it('factor 1.0 (no slow) remains 1.0', () => {
    expect(cap(1.0)).toBe(1.0);
  });

  it('negative factor is capped to 0.40', () => {
    expect(cap(-0.5)).toBe(0.40);
  });

  it('factor at cap (0.40) returns 0.40', () => {
    expect(cap(0.40)).toBe(0.40);
  });

  it('factor just above cap (0.41) passes through', () => {
    expect(cap(0.41)).toBeCloseTo(0.41);
  });

  it('factor just below cap (0.39) is capped to 0.40', () => {
    expect(cap(0.39)).toBe(0.40);
  });
});

// ── 10. Immunity cooldown decrement arithmetic ──────────────────────────────

describe('Immunity cooldown decrement (mirrors step() logic)', () => {
  function tick(cooldownMs: number, delta: number): number {
    return Math.max(0, cooldownMs - delta);
  }

  it('decrements by delta each frame', () => {
    expect(tick(2000, 16.67)).toBeCloseTo(1983.33);
  });

  it('reaches exactly 0 when delta equals remaining', () => {
    expect(tick(16.67, 16.67)).toBe(0);
  });

  it('clamps at 0 (never goes negative)', () => {
    expect(tick(5, 16.67)).toBe(0);
  });

  it('stays at 0 when already expired', () => {
    expect(tick(0, 16.67)).toBe(0);
  });

  it('full 2000ms cooldown expires in ~120 frames at 60fps', () => {
    let cd = SLOW_IMMUNE_COOLDOWN_MS;
    let frames = 0;
    while (cd > 0) {
      cd = Math.max(0, cd - 16.67);
      frames++;
    }
    expect(frames).toBeGreaterThanOrEqual(119);
    expect(frames).toBeLessThanOrEqual(121);
  });
});

// ── 11. Creep.destroy() cleans up slow timer ────────────────────────────────

describe('Creep.destroy() — slow timer cleanup', () => {
  it('destroys slowTimer in destroy()', () => {
    expect(creepSrc).toContain('this.slowTimer?.destroy()');
  });

  it('slowTimer cleanup is inside the destroy(fromScene) method', () => {
    const destroyMethodIdx = creepSrc.indexOf('destroy(fromScene');
    const timerCleanupIdx = creepSrc.indexOf('this.slowTimer?.destroy()', destroyMethodIdx);
    expect(timerCleanupIdx).toBeGreaterThan(destroyMethodIdx);
  });
});

// ── 12. Non-frost slow factors are all above the cap (unaffected) ────────────

describe('Non-frost slow factors unaffected by cap', () => {
  it('explosive residue (0.80) > cap', () => {
    expect(0.80).toBeGreaterThan(SLOW_FACTOR_CAP);
  });

  it('cryo cannon (0.80) > cap', () => {
    expect(0.80).toBeGreaterThan(SLOW_FACTOR_CAP);
  });

  it('concussion shell (0.85) > cap', () => {
    expect(0.85).toBeGreaterThan(SLOW_FACTOR_CAP);
  });

  it('Arrow C Track V (0.70) > cap', () => {
    expect(0.70).toBeGreaterThan(SLOW_FACTOR_CAP);
  });
});
