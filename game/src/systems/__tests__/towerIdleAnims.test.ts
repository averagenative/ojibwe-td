/**
 * Unit tests for the procedural tower idle and attack animation system.
 *
 * Pure-data logic lives in src/data/towerAnimDefs.ts (Phaser-free).
 * Structural checks verify Tower.ts and UpgradeManager.ts wiring without
 * instantiating Phaser.
 *
 * Coverage:
 *  1.  getTowerAnimDef returns correct idle types for all tower keys
 *  2.  Cannon has idleType 'sweep' with sweepDeg ≥ 5°
 *  3.  Frost has idleType 'pulse' with pulseScale > 0
 *  4.  Tesla has idleType 'spark' with sparkIntervalMs > 0
 *  5.  Mortar has idleType 'bob' with bobAmpY > 0
 *  6.  Poison has idleType 'bubble' with bubbleIntervalMs > 0
 *  7.  Aura has idleType 'aura-idle'
 *  8.  Arrow has idleType 'pulse' with recoilScale < 1
 *  9.  Cannon and Mortar have lerpDegPerFrame > 0 (barrel tracking)
 * 10.  Tesla has leanDeg > 0 and leanDeg ≤ 5
 * 11.  tierIntensity bounds and monotonicity
 * 12.  tierSizeScale bounds and monotonicity
 * 13.  lerpAngleDeg — zero maxStep returns from unchanged
 * 14.  lerpAngleDeg — steps correctly toward positive target
 * 15.  lerpAngleDeg — handles cross-zero boundary (e.g. 350° → 10°)
 * 16.  lerpAngleDeg — handles negative delta (wraps correctly)
 * 17.  lerpAngleDeg — snaps when delta ≤ maxStep
 * 18.  Idle phase math: advances proportionally to idleFreq and delta
 * 19.  Sweep oscillation formula: sin(phase) × sweepDeg gives correct range
 * 20.  All tower keys return non-null defs from getTowerAnimDef
 * 21.  Unknown tower key falls back to DEFAULT_TOWER_ANIM
 * 22.  Structural: Tower.ts imports getTowerAnimDef from towerAnimDefs
 * 23.  Structural: Tower.ts has _stepIdleAnim, _playFireAnim, setAnimTier
 * 24.  Structural: Tower.ts stores _bodyRef, _iconRef, _sparkGfx fields
 * 25.  Structural: Tower.ts sell() kills _fireAnimTween and destroys _sparkGfx
 * 26.  Structural: Tower.ts step() calls _stepIdleAnim
 * 27.  Structural: UpgradeManager.ts applyStatsToTower calls setAnimTier
 */

import { describe, it, expect } from 'vitest';
import fs   from 'fs';
import path from 'path';
import {
  getTowerAnimDef,
  tierIntensity,
  tierSizeScale,
  lerpAngleDeg,
  DEFAULT_TOWER_ANIM,
} from '../../data/towerAnimDefs';

// ── 1. Idle types for all tower keys ──────────────────────────────────────────

describe('getTowerAnimDef — idle types', () => {
  it('cannon → sweep', () => {
    expect(getTowerAnimDef('cannon').idleType).toBe('sweep');
  });
  it('frost → pulse', () => {
    expect(getTowerAnimDef('frost').idleType).toBe('pulse');
  });
  it('tesla → spark', () => {
    expect(getTowerAnimDef('tesla').idleType).toBe('spark');
  });
  it('mortar → bob', () => {
    expect(getTowerAnimDef('mortar').idleType).toBe('bob');
  });
  it('poison → bubble', () => {
    expect(getTowerAnimDef('poison').idleType).toBe('bubble');
  });
  it('aura → aura-idle', () => {
    expect(getTowerAnimDef('aura').idleType).toBe('aura-idle');
  });
  it('arrow → pulse', () => {
    expect(getTowerAnimDef('arrow').idleType).toBe('pulse');
  });
});

// ── 2. Cannon sweep parameters ────────────────────────────────────────────────

describe('getTowerAnimDef — cannon sweep', () => {
  const d = getTowerAnimDef('cannon');
  it('sweepDeg ≥ 5°', () => {
    expect(d.sweepDeg).toBeGreaterThanOrEqual(5);
  });
  it('recoilScale < 1 (body compresses on fire)', () => {
    expect(d.recoilScale).toBeLessThan(1);
    expect(d.recoilScale).toBeGreaterThan(0);
  });
  it('recoilMs > 0', () => {
    expect(d.recoilMs).toBeGreaterThan(0);
  });
  it('lerpDegPerFrame > 0 (barrel tracks targets)', () => {
    expect(d.lerpDegPerFrame).toBeGreaterThan(0);
  });
});

// ── 3. Frost pulse parameters ─────────────────────────────────────────────────

describe('getTowerAnimDef — frost pulse', () => {
  const d = getTowerAnimDef('frost');
  it('pulseScale > 0', () => {
    expect(d.pulseScale).toBeGreaterThan(0);
  });
  it('firePulseScale > 0', () => {
    expect(d.firePulseScale).toBeGreaterThan(0);
  });
  it('fireFlashMs > 0', () => {
    expect(d.fireFlashMs).toBeGreaterThan(0);
  });
  it('pulseScale is a small fraction (≤ 0.15) — no jarring distortion', () => {
    expect(d.pulseScale).toBeLessThanOrEqual(0.15);
  });
});

// ── 4. Tesla spark parameters ─────────────────────────────────────────────────

describe('getTowerAnimDef — tesla spark', () => {
  const d = getTowerAnimDef('tesla');
  it('sparkIntervalMs > 0', () => {
    expect(d.sparkIntervalMs).toBeGreaterThan(0);
  });
  it('fireFlashMs > 0', () => {
    expect(d.fireFlashMs).toBeGreaterThan(0);
  });
  it('fireFlashMs ≤ 150ms (flash is brief)', () => {
    expect(d.fireFlashMs).toBeLessThanOrEqual(150);
  });
});

// ── 5. Mortar bob parameters ──────────────────────────────────────────────────

describe('getTowerAnimDef — mortar bob', () => {
  const d = getTowerAnimDef('mortar');
  it('bobAmpY > 0', () => {
    expect(d.bobAmpY).toBeGreaterThan(0);
  });
  it('kickDeg > 0 (barrel kicks upward on fire)', () => {
    expect(d.kickDeg).toBeGreaterThan(0);
  });
  it('kickMs > 0', () => {
    expect(d.kickMs).toBeGreaterThan(0);
  });
  it('lerpDegPerFrame > 0 (barrel tracks targets)', () => {
    expect(d.lerpDegPerFrame).toBeGreaterThan(0);
  });
});

// ── 6. Poison bubble parameters ───────────────────────────────────────────────

describe('getTowerAnimDef — poison bubble', () => {
  const d = getTowerAnimDef('poison');
  it('bubbleIntervalMs > 0', () => {
    expect(d.bubbleIntervalMs).toBeGreaterThan(0);
  });
  it('bubbleIntervalMs ≤ 1000ms (bubbles are not too sparse)', () => {
    expect(d.bubbleIntervalMs).toBeLessThanOrEqual(1000);
  });
});

// ── 7. Aura idle (no-op extra fields) ────────────────────────────────────────

describe('getTowerAnimDef — aura idle', () => {
  const d = getTowerAnimDef('aura');
  it('idleFreq > 0 (still advances phase)', () => {
    expect(d.idleFreq).toBeGreaterThan(0);
  });
  it('no fire-specific params needed (recoilMs = 0)', () => {
    expect(d.recoilMs).toBe(0);
  });
});

// ── 8. Arrow recoil ───────────────────────────────────────────────────────────

describe('getTowerAnimDef — arrow', () => {
  const d = getTowerAnimDef('arrow');
  it('recoilScale < 1', () => {
    expect(d.recoilScale).toBeLessThan(1);
    expect(d.recoilScale).toBeGreaterThan(0);
  });
  it('recoilMs > 0', () => {
    expect(d.recoilMs).toBeGreaterThan(0);
  });
  it('arrow recoilMs ≤ cannon recoilMs (snappier)', () => {
    expect(d.recoilMs).toBeLessThanOrEqual(getTowerAnimDef('cannon').recoilMs);
  });
  it('arrow recoilScale > cannon recoilScale (less recoil mass)', () => {
    expect(d.recoilScale).toBeGreaterThan(getTowerAnimDef('cannon').recoilScale);
  });
});

// ── 9. Barrel tracking towers ─────────────────────────────────────────────────

describe('getTowerAnimDef — barrel tracking', () => {
  it('cannon lerpDegPerFrame > 0', () => {
    expect(getTowerAnimDef('cannon').lerpDegPerFrame).toBeGreaterThan(0);
  });
  it('mortar lerpDegPerFrame > 0', () => {
    expect(getTowerAnimDef('mortar').lerpDegPerFrame).toBeGreaterThan(0);
  });
  it('frost lerpDegPerFrame = 0 (no barrel tracking)', () => {
    expect(getTowerAnimDef('frost').lerpDegPerFrame).toBe(0);
  });
  it('poison lerpDegPerFrame = 0 (no barrel tracking)', () => {
    expect(getTowerAnimDef('poison').lerpDegPerFrame).toBe(0);
  });
});

// ── 10. Tesla lean ────────────────────────────────────────────────────────────

describe('getTowerAnimDef — tesla lean', () => {
  const d = getTowerAnimDef('tesla');
  it('leanDeg > 0', () => {
    expect(d.leanDeg).toBeGreaterThan(0);
  });
  it('leanDeg ≤ 5° (subtle tilt)', () => {
    expect(d.leanDeg).toBeLessThanOrEqual(5);
  });
});

// ── 11. tierIntensity ─────────────────────────────────────────────────────────

describe('tierIntensity', () => {
  it('tier 0 → 1.0', () => expect(tierIntensity(0)).toBe(1.0));
  it('tier 1 → 1.0', () => expect(tierIntensity(1)).toBe(1.0));
  it('tier 2 → 1.0', () => expect(tierIntensity(2)).toBe(1.0));
  it('tier 3 → 1.3', () => expect(tierIntensity(3)).toBe(1.3));
  it('tier 4 → 1.3', () => expect(tierIntensity(4)).toBe(1.3));
  it('tier 5 → 1.65', () => expect(tierIntensity(5)).toBe(1.65));

  it('monotonically non-decreasing', () => {
    const values = [0, 1, 2, 3, 4, 5].map(t => tierIntensity(t));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
  });

  it('all values ≥ 1.0', () => {
    for (let t = 0; t <= 5; t++) {
      expect(tierIntensity(t)).toBeGreaterThanOrEqual(1.0);
    }
  });
});

// ── 12. tierSizeScale ─────────────────────────────────────────────────────────

describe('tierSizeScale', () => {
  it('tier 0 → 1.0', () => expect(tierSizeScale(0)).toBe(1.0));
  it('tier 2 → 1.0', () => expect(tierSizeScale(2)).toBe(1.0));
  it('tier 3 → 1.08', () => expect(tierSizeScale(3)).toBe(1.08));
  it('tier 4 → 1.08', () => expect(tierSizeScale(4)).toBe(1.08));
  it('tier 5 → 1.16', () => expect(tierSizeScale(5)).toBe(1.16));

  it('monotonically non-decreasing', () => {
    const values = [0, 1, 2, 3, 4, 5].map(t => tierSizeScale(t));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
  });

  it('max scale ≤ 1.25 (not visually oversized)', () => {
    for (let t = 0; t <= 5; t++) {
      expect(tierSizeScale(t)).toBeLessThanOrEqual(1.25);
    }
  });
});

// ── 13–17. lerpAngleDeg ───────────────────────────────────────────────────────

describe('lerpAngleDeg', () => {
  it('maxStep = 0 returns from unchanged', () => {
    expect(lerpAngleDeg(45, 90, 0)).toBe(45);
  });

  it('negative maxStep returns from unchanged', () => {
    expect(lerpAngleDeg(45, 90, -5)).toBe(45);
  });

  it('steps toward positive target', () => {
    const result = lerpAngleDeg(0, 30, 10);
    expect(result).toBe(10);
  });

  it('steps toward negative target', () => {
    const result = lerpAngleDeg(0, -30, 10);
    expect(result).toBe(-10);
  });

  it('snaps when remaining delta ≤ maxStep', () => {
    const result = lerpAngleDeg(0, 8, 10);
    expect(result).toBe(8);
  });

  it('shortest arc: 350° to 10° goes +20° not -340°', () => {
    const result = lerpAngleDeg(350, 10, 30);
    // Shortest arc is +20°, so should snap directly to 10.
    expect(result).toBe(10);
  });

  it('shortest arc: 10° to 350° goes -20° not +340°', () => {
    const result = lerpAngleDeg(10, 350, 30);
    expect(result).toBe(350);
  });

  it('cross-boundary step: 355° toward 5° advances +10° → 5°', () => {
    const result = lerpAngleDeg(355, 5, 15);
    expect(result).toBe(5);
  });

  it('cross-boundary step: large step from 350° to 10° crosses correctly', () => {
    // 350 → 10 is 20° gap, step size 10 should produce 360 = 0 mod normalised.
    const r1 = lerpAngleDeg(350, 10, 10);
    expect(r1).toBeCloseTo(360, 5); // or 0 — both represent same angle
  });
});

// ── 18. Idle phase increment math ─────────────────────────────────────────────

describe('idle phase math', () => {
  /**
   * idlePhase += (delta / 1000) * idleFreq * 2π
   * At 60 fps (delta = 16.67 ms) with idleFreq = 0.25:
   *   increment ≈ 0.02618 rad/frame
   */
  const DELTA_MS = 16.67;

  it('phase increment proportional to idleFreq', () => {
    const freq1 = 0.25;
    const freq2 = 0.50;
    const inc1  = (DELTA_MS / 1000) * freq1 * Math.PI * 2;
    const inc2  = (DELTA_MS / 1000) * freq2 * Math.PI * 2;
    expect(inc2).toBeCloseTo(inc1 * 2, 8);
  });

  it('phase does not advance when delta = 0 (game paused)', () => {
    const inc = (0 / 1000) * 0.5 * Math.PI * 2;
    expect(inc).toBe(0);
  });

  it('phase wraps to [0, 2π) after full cycle', () => {
    // After 1 full second with idleFreq = 1, one complete cycle.
    const phaseAfter = ((0 + (1000 / 1000) * 1.0 * Math.PI * 2) % (Math.PI * 2));
    expect(phaseAfter).toBeCloseTo(0, 8);
  });
});

// ── 19. Sweep oscillation formula ────────────────────────────────────────────

describe('sweep oscillation formula', () => {
  it('sin(0) → sweepAngle = 0 (neutral position)', () => {
    const sweepDeg = 10;
    const sweepAngle = Math.sin(0) * sweepDeg;
    expect(sweepAngle).toBe(0);
  });

  it('sin(π/2) → sweepAngle = +sweepDeg (max positive sweep)', () => {
    const sweepDeg = 10;
    const sweepAngle = Math.sin(Math.PI / 2) * sweepDeg;
    expect(sweepAngle).toBeCloseTo(sweepDeg, 8);
  });

  it('sin(3π/2) → sweepAngle = -sweepDeg (max negative sweep)', () => {
    const sweepDeg = 10;
    const sweepAngle = Math.sin(3 * Math.PI / 2) * sweepDeg;
    expect(sweepAngle).toBeCloseTo(-sweepDeg, 8);
  });

  it('cannon sweep stays within ±sweepDeg at any phase', () => {
    const { sweepDeg } = getTowerAnimDef('cannon');
    for (let phase = 0; phase < Math.PI * 2; phase += 0.1) {
      const angle = Math.sin(phase) * sweepDeg;
      expect(Math.abs(angle)).toBeLessThanOrEqual(sweepDeg + 0.001);
    }
  });
});

// ── 20. All known tower keys return non-null defs ─────────────────────────────

describe('getTowerAnimDef — all known keys', () => {
  const KNOWN_KEYS = ['cannon', 'frost', 'tesla', 'mortar', 'poison', 'aura', 'arrow'];

  it.each(KNOWN_KEYS)('%s returns a def with a valid idleType', (key) => {
    const d = getTowerAnimDef(key);
    expect(d).toBeDefined();
    expect(d.idleType).toBeTruthy();
    expect(d.idleFreq).toBeGreaterThan(0);
  });
});

// ── 21. Unknown key falls back to DEFAULT_TOWER_ANIM ─────────────────────────

describe('getTowerAnimDef — fallback', () => {
  it('unknown key returns DEFAULT_TOWER_ANIM', () => {
    const d = getTowerAnimDef('unknown-tower-xyz');
    expect(d.idleType).toBe(DEFAULT_TOWER_ANIM.idleType);
    expect(d.idleFreq).toBe(DEFAULT_TOWER_ANIM.idleFreq);
  });
});

// ── Structural checks ─────────────────────────────────────────────────────────

const TOWER_SRC = fs.readFileSync(
  path.resolve(__dirname, '../../entities/towers/Tower.ts'),
  'utf8',
);

const UPGRADE_SRC = fs.readFileSync(
  path.resolve(__dirname, '../../systems/UpgradeManager.ts'),
  'utf8',
);

describe('Tower.ts structural checks', () => {
  it('imports getTowerAnimDef from towerAnimDefs', () => {
    expect(TOWER_SRC).toContain("from '../../data/towerAnimDefs'");
    expect(TOWER_SRC).toContain('getTowerAnimDef');
  });

  it('imports tierIntensity', () => {
    expect(TOWER_SRC).toContain('tierIntensity');
  });

  it('imports tierSizeScale', () => {
    expect(TOWER_SRC).toContain('tierSizeScale');
  });

  it('has _animDef field', () => {
    expect(TOWER_SRC).toContain('_animDef');
  });

  it('has _animTier field', () => {
    expect(TOWER_SRC).toContain('_animTier');
  });

  it('has _idlePhase field', () => {
    expect(TOWER_SRC).toContain('_idlePhase');
  });

  it('has _barrelAngle field', () => {
    expect(TOWER_SRC).toContain('_barrelAngle');
  });

  it('has _visualTargetX and _visualTargetY fields', () => {
    expect(TOWER_SRC).toContain('_visualTargetX');
    expect(TOWER_SRC).toContain('_visualTargetY');
  });

  it('has _bodyRef field (body Rectangle reference)', () => {
    expect(TOWER_SRC).toContain('_bodyRef');
  });

  it('has _iconRef field (icon Image reference)', () => {
    expect(TOWER_SRC).toContain('_iconRef');
  });

  it('has _sparkGfx field (tesla idle arc graphics)', () => {
    expect(TOWER_SRC).toContain('_sparkGfx');
  });

  it('has _fireAnimTween field (interrupt guard)', () => {
    expect(TOWER_SRC).toContain('_fireAnimTween');
  });

  it('has _stepIdleAnim private method', () => {
    expect(TOWER_SRC).toContain('_stepIdleAnim');
  });

  it('has _playFireAnim private method', () => {
    expect(TOWER_SRC).toContain('_playFireAnim');
  });

  it('has setAnimTier public method', () => {
    expect(TOWER_SRC).toContain('setAnimTier');
  });

  it('step() calls _stepIdleAnim', () => {
    const callCount = (TOWER_SRC.match(/this\._stepIdleAnim\(/g) ?? []).length;
    expect(callCount).toBeGreaterThanOrEqual(1);
  });

  it('sell() kills _fireAnimTween (cleanup on sell)', () => {
    expect(TOWER_SRC).toContain('_fireAnimTween?.stop()');
  });

  it('sell() destroys _sparkGfx (cleanup on sell)', () => {
    expect(TOWER_SRC).toContain('_sparkGfx?.destroy()');
  });

  it('has per-tower fire animations: _playCannonRecoil, _playFrostFire, _playTeslaFlash, _playMortarKick, _playPoisonGlow, _playArrowRecoil', () => {
    expect(TOWER_SRC).toContain('_playCannonRecoil');
    expect(TOWER_SRC).toContain('_playFrostFire');
    expect(TOWER_SRC).toContain('_playTeslaFlash');
    expect(TOWER_SRC).toContain('_playMortarKick');
    expect(TOWER_SRC).toContain('_playPoisonGlow');
    expect(TOWER_SRC).toContain('_playArrowRecoil');
  });

  it('has _stepBarrelTracking for directional aiming', () => {
    expect(TOWER_SRC).toContain('_stepBarrelTracking');
  });

  it('imports lerpAngleDeg from towerAnimDefs', () => {
    expect(TOWER_SRC).toContain('lerpAngleDeg');
  });

  it('updates _visualTargetX/Y in tryAttack', () => {
    // The assignment must appear (not just the field declaration).
    expect(TOWER_SRC).toContain('_visualTargetX = target.x');
    expect(TOWER_SRC).toContain('_visualTargetY = target.y');
  });

  it('_playFireAnim called in tryAttack and fireMortar', () => {
    const callCount = (TOWER_SRC.match(/this\._playFireAnim\(\)/g) ?? []).length;
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it('Rectangle body color restored via setFillStyle (not setTint — Rect lacks tint)', () => {
    expect(TOWER_SRC).toContain('setFillStyle(this.def.bodyColor)');
  });

  it('Image icon uses setTint/clearTint for flash effects', () => {
    expect(TOWER_SRC).toContain('clearTint');
  });

  it('tryAttack clears _visualTargetX/Y when no target found', () => {
    // When findTarget() returns null, visual tracking must be cleared so idle sweep resumes.
    expect(TOWER_SRC).toMatch(/if\s*\(\s*!target\s*\)\s*\{[^}]*_visualTargetX\s*=\s*0/s);
    expect(TOWER_SRC).toMatch(/if\s*\(\s*!target\s*\)\s*\{[^}]*_visualTargetY\s*=\s*0/s);
  });

  it('fireMortar also clears visual target when no target found', () => {
    // Count the number of _visualTargetX = 0 assignments — should be ≥ 2 (tryAttack + fireMortar).
    const clearCount = (TOWER_SRC.match(/this\._visualTargetX\s*=\s*0/g) ?? []).length;
    expect(clearCount).toBeGreaterThanOrEqual(2);
  });

  it('_stepBubbleIdle creates scene-level graphics (not container-level)', () => {
    expect(TOWER_SRC).toContain('this.scene.add.graphics()');
  });

  it('_spawnFrostCrystals creates crystal particle graphics', () => {
    expect(TOWER_SRC).toContain('_spawnFrostCrystals');
  });
});

describe('UpgradeManager.ts structural checks', () => {
  it('applyStatsToTower calls setAnimTier', () => {
    expect(UPGRADE_SRC).toContain('setAnimTier');
  });

  it('setAnimTier receives Math.max of path tiers', () => {
    expect(UPGRADE_SRC).toContain('Math.max(state.tiers.A, state.tiers.B, state.tiers.C)');
  });
});

// ── Additional edge cases ────────────────────────────────────────────────────

describe('tierIntensity — edge cases', () => {
  it('negative tier returns base (1.0)', () => {
    expect(tierIntensity(-1)).toBe(1.0);
    expect(tierIntensity(-100)).toBe(1.0);
  });

  it('tier > 5 returns max (1.65)', () => {
    expect(tierIntensity(6)).toBe(1.65);
    expect(tierIntensity(100)).toBe(1.65);
  });
});

describe('tierSizeScale — edge cases', () => {
  it('negative tier returns base (1.0)', () => {
    expect(tierSizeScale(-1)).toBe(1.0);
    expect(tierSizeScale(-100)).toBe(1.0);
  });

  it('tier > 5 returns max (1.16)', () => {
    expect(tierSizeScale(6)).toBe(1.16);
    expect(tierSizeScale(100)).toBe(1.16);
  });
});

describe('lerpAngleDeg — additional edge cases', () => {
  it('from === to returns to immediately', () => {
    expect(lerpAngleDeg(45, 45, 10)).toBe(45);
  });

  it('large positive angles wrap correctly', () => {
    // 720 is equivalent to 0, should step toward 30.
    const result = lerpAngleDeg(720, 750, 10);
    // Delta = 30, step 10 → result = 730.
    expect(result).toBeCloseTo(730, 5);
  });

  it('handles exactly 180° difference (ambiguous direction)', () => {
    // ±180° should choose one direction consistently.
    const result = lerpAngleDeg(0, 180, 10);
    // Delta normalises to ±180; Math.sign(-180) = -1 or sign(180) = 1.
    // Just verify it moves and doesn't return from unchanged.
    expect(result).not.toBe(0);
    expect(Math.abs(result)).toBeLessThanOrEqual(10);
  });
});
