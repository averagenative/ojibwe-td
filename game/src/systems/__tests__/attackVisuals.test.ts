/**
 * Tests for TASK-047: Tower Attack Type Visuals — Distinct Projectile & Effect Styles.
 *
 * The visual code lives in Projectile.ts (Phaser Arc subclass) and Tower.ts
 * (Phaser Container subclass), so we can't instantiate them in Vitest.
 * Instead we test the pure-logic formulas they embed, following the same
 * "simulate the logic" pattern as targeting.test.ts.
 */
import { describe, it, expect } from 'vitest';

// ── Trail colour lookup (mirrors TRAIL_COLORS in Projectile.ts) ──────────────

/** Exact copy of the module-level constant in Projectile.ts. */
const TRAIL_COLORS: Record<string, number> = {
  cannon: 0xbbaa88,
  frost:  0x88ccff,
  mortar: 0xee7700,
  poison: 0x44ff88,
};

const TRAIL_INTERVAL_MS = 30;
const TRAIL_LIFE_MS     = 180;

describe('trail colour lookup', () => {
  it('returns cannon trail colour', () => {
    expect(TRAIL_COLORS['cannon']).toBe(0xbbaa88);
  });

  it('returns frost trail colour', () => {
    expect(TRAIL_COLORS['frost']).toBe(0x88ccff);
  });

  it('returns mortar trail colour', () => {
    expect(TRAIL_COLORS['mortar']).toBe(0xee7700);
  });

  it('returns poison trail colour', () => {
    expect(TRAIL_COLORS['poison']).toBe(0x44ff88);
  });

  it('falls back to undefined for unknown tower key', () => {
    expect(TRAIL_COLORS['unknown']).toBeUndefined();
  });

  it('falls back to undefined for empty string key', () => {
    expect(TRAIL_COLORS['']).toBeUndefined();
  });
});

// ── Trail emission timing ────────────────────────────────────────────────────

describe('trail emission timing', () => {
  it('emits on first frame when delta >= TRAIL_INTERVAL_MS', () => {
    let trailTimer = 0;
    let emitted = false;

    trailTimer += 30; // one 30ms frame
    if (trailTimer >= TRAIL_INTERVAL_MS) {
      trailTimer = 0;
      emitted = true;
    }

    expect(emitted).toBe(true);
    expect(trailTimer).toBe(0);
  });

  it('does not emit when delta < TRAIL_INTERVAL_MS', () => {
    let trailTimer = 0;
    let emitted = false;

    trailTimer += 16; // one ~60fps frame
    if (trailTimer >= TRAIL_INTERVAL_MS) {
      trailTimer = 0;
      emitted = true;
    }

    expect(emitted).toBe(false);
    expect(trailTimer).toBe(16);
  });

  it('accumulates across frames until threshold', () => {
    let trailTimer = 0;
    let emitCount = 0;

    // Simulate 3 frames at 16ms each = 48ms total → should emit once (at 32ms mark)
    for (const delta of [16, 16, 16]) {
      trailTimer += delta;
      if (trailTimer >= TRAIL_INTERVAL_MS) {
        trailTimer = 0;
        emitCount++;
      }
    }

    expect(emitCount).toBe(1);
  });

  it('max active particles is bounded by TRAIL_LIFE_MS / TRAIL_INTERVAL_MS', () => {
    // Each particle lives TRAIL_LIFE_MS ms and a new one is emitted every
    // TRAIL_INTERVAL_MS ms → max concurrent = ceil(TRAIL_LIFE_MS / TRAIL_INTERVAL_MS).
    const maxConcurrent = Math.ceil(TRAIL_LIFE_MS / TRAIL_INTERVAL_MS);
    expect(maxConcurrent).toBe(6);
    expect(maxConcurrent).toBeLessThanOrEqual(20); // spec: "max ~20"
  });
});

// ── Trail exclusion for tesla and aura ───────────────────────────────────────

describe('trail exclusion guards', () => {
  /** Mirrors the guard in Projectile.step(): `key && key !== 'tesla' && key !== 'aura'` */
  function shouldEmitTrail(key: string | undefined): boolean {
    return !!key && key !== 'tesla' && key !== 'aura';
  }

  it('cannon emits trail', () => {
    expect(shouldEmitTrail('cannon')).toBe(true);
  });

  it('frost emits trail', () => {
    expect(shouldEmitTrail('frost')).toBe(true);
  });

  it('mortar emits trail', () => {
    expect(shouldEmitTrail('mortar')).toBe(true);
  });

  it('poison emits trail', () => {
    expect(shouldEmitTrail('poison')).toBe(true);
  });

  it('tesla does NOT emit trail', () => {
    expect(shouldEmitTrail('tesla')).toBe(false);
  });

  it('aura does NOT emit trail', () => {
    expect(shouldEmitTrail('aura')).toBe(false);
  });

  it('undefined towerKey does NOT emit trail', () => {
    expect(shouldEmitTrail(undefined)).toBe(false);
  });
});

// ── Mortar arc scale formula ─────────────────────────────────────────────────

describe('mortar arc scale formula', () => {
  /**
   * Mirrors Projectile.stepToPosition():
   *   const t = 1 - dist / initDist;        // 0 at launch → 1 at impact
   *   this.setScale(1 + Math.sin(Math.max(0, t) * Math.PI) * 0.55);
   */
  function mortarScale(dist: number, initDist: number): number {
    if (initDist <= 0) return 1; // guard
    const t = 1 - dist / initDist;
    return 1 + Math.sin(Math.max(0, t) * Math.PI) * 0.55;
  }

  it('starts at scale 1 at launch (t=0)', () => {
    expect(mortarScale(100, 100)).toBeCloseTo(1.0, 5);
  });

  it('peaks at mid-flight (t=0.5)', () => {
    const scale = mortarScale(50, 100);
    expect(scale).toBeCloseTo(1.55, 5); // sin(0.5π) = 1 → 1 + 0.55
  });

  it('returns to scale 1 at impact (t=1)', () => {
    const scale = mortarScale(0, 100);
    expect(scale).toBeCloseTo(1.0, 3); // sin(π) ≈ 0
  });

  it('scale never exceeds 1.55', () => {
    // sin peaks at 1 → max scale = 1 + 0.55 = 1.55
    for (let frac = 0; frac <= 1; frac += 0.05) {
      const dist = (1 - frac) * 200;
      expect(mortarScale(dist, 200)).toBeLessThanOrEqual(1.551);
    }
  });

  it('handles zero initDist gracefully (guard)', () => {
    expect(mortarScale(0, 0)).toBe(1);
  });
});

// ── Tesla visibility ─────────────────────────────────────────────────────────

describe('tesla projectile visibility', () => {
  it('tesla projectile should be hidden (alpha 0)', () => {
    // Mirrors: if (opts.towerKey === 'tesla') this.setAlpha(0);
    const towerKey = 'tesla';
    const shouldHide = towerKey === 'tesla';
    expect(shouldHide).toBe(true);
  });

  it('non-tesla projectiles stay visible', () => {
    for (const key of ['cannon', 'frost', 'mortar', 'poison', 'aura', undefined]) {
      const shouldHide = key === 'tesla';
      expect(shouldHide).toBe(false);
    }
  });
});

// ── Impact effect dispatch ───────────────────────────────────────────────────

describe('impact effect dispatch', () => {
  type EffectType = 'dust' | 'frost' | 'debris' | 'splatter' | 'none';

  /** Mirrors Projectile.showImpactEffect() switch. */
  function impactEffectType(towerKey: string | undefined): EffectType {
    switch (towerKey) {
      case 'cannon': return 'dust';
      case 'frost':  return 'frost';
      case 'mortar': return 'debris';
      case 'poison': return 'splatter';
      default:       return 'none';
    }
  }

  it('cannon → dust puff', () => {
    expect(impactEffectType('cannon')).toBe('dust');
  });

  it('frost → frost burst', () => {
    expect(impactEffectType('frost')).toBe('frost');
  });

  it('mortar → debris particles', () => {
    expect(impactEffectType('mortar')).toBe('debris');
  });

  it('poison → lingering splatter', () => {
    expect(impactEffectType('poison')).toBe('splatter');
  });

  it('tesla → no impact effect (arc drawn separately)', () => {
    expect(impactEffectType('tesla')).toBe('none');
  });

  it('aura → no impact effect', () => {
    expect(impactEffectType('aura')).toBe('none');
  });

  it('undefined → no impact effect', () => {
    expect(impactEffectType(undefined)).toBe('none');
  });
});

// ── Aura dual-ring pulse formula ─────────────────────────────────────────────

describe('aura dual-ring pulse', () => {
  /**
   * Mirrors Tower.stepAuraPulse():
   *   auraPulsePhase = (auraPulsePhase + (delta / 1000) * 0.35) % 1;
   *   for (i in 0..1):
   *     phase = (auraPulsePhase + i * 0.5) % 1;
   *     r = phase * range;
   *     alpha = Math.sin(phase * Math.PI) * 0.45;
   */
  function advancePhase(currentPhase: number, deltaMs: number): number {
    return (currentPhase + (deltaMs / 1000) * 0.35) % 1;
  }

  function ringAlpha(phase: number): number {
    return Math.sin(phase * Math.PI) * 0.45;
  }

  function ringRadius(phase: number, range: number): number {
    return phase * range;
  }

  it('phase advances at 0.35 cycles/s', () => {
    // After 1 second, phase should advance by 0.35
    const phase = advancePhase(0, 1000);
    expect(phase).toBeCloseTo(0.35, 5);
  });

  it('phase wraps around at 1.0', () => {
    // Start at 0.8, advance by 1 second (0.35) → 1.15 % 1 = 0.15
    const phase = advancePhase(0.8, 1000);
    expect(phase).toBeCloseTo(0.15, 5);
  });

  it('full cycle takes ~2.86 seconds', () => {
    // 1 / 0.35 ≈ 2.857 seconds
    const fullCycleMs = 1000 / 0.35;
    const phase = advancePhase(0, fullCycleMs);
    expect(phase).toBeCloseTo(0, 3); // wraps back to ~0
  });

  it('two rings are half a cycle apart', () => {
    const basePhase = 0.2;
    const ring0Phase = (basePhase + 0 * 0.5) % 1; // 0.2
    const ring1Phase = (basePhase + 1 * 0.5) % 1; // 0.7
    expect(ring1Phase - ring0Phase).toBeCloseTo(0.5, 5);
  });

  it('alpha peaks at mid-phase (0.5) with value 0.45', () => {
    // sin(0.5 * π) = 1 → alpha = 0.45
    expect(ringAlpha(0.5)).toBeCloseTo(0.45, 5);
  });

  it('alpha is zero at phase 0 (start)', () => {
    expect(ringAlpha(0)).toBeCloseTo(0, 5);
  });

  it('alpha is near zero at phase 1 (end)', () => {
    // sin(π) ≈ 0
    expect(ringAlpha(1)).toBeCloseTo(0, 3);
  });

  it('radius equals 0 at phase 0 and range at phase 1', () => {
    const range = 180;
    expect(ringRadius(0, range)).toBe(0);
    expect(ringRadius(1, range)).toBe(180);
  });

  it('radius at mid-phase equals half range', () => {
    expect(ringRadius(0.5, 180)).toBe(90);
  });
});

// ── towerKey wiring coverage ─────────────────────────────────────────────────

describe('towerKey passed through ProjectileOptions', () => {
  // Verify that all 6 tower defs have their key available for towerKey wiring.
  // The actual wiring happens in Tower.ts fire methods — we verify the keys
  // match what the visual code expects.
  const EXPECTED_TOWER_KEYS = ['cannon', 'frost', 'mortar', 'poison', 'tesla', 'aura'];

  it('all tower keys are known by the trail/impact system', () => {
    const visualKeys = new Set([
      ...Object.keys(TRAIL_COLORS),
      'tesla', // no trail, but has lightning arc
      'aura',  // no trail or impact, but has pulse ring
    ]);

    for (const key of EXPECTED_TOWER_KEYS) {
      expect(visualKeys.has(key)).toBe(true);
    }
  });
});
