import { describe, it, expect, vi } from 'vitest';

// Mock Phaser to avoid resolution error in test env.
vi.mock('phaser', () => ({ default: {} }));

// Raw source for structural tests
import creepRaw from '../../entities/Creep.ts?raw';
import waveManagerRaw from '../WaveManager.ts?raw';

// ── CreepVisualStyle type ─────────────────────────────────────────────────────

describe('CreepVisualStyle type', () => {
  const REQUIRED_STYLES = [
    'normal', 'fast', 'armored', 'immune', 'regen',
    'flying', 'boss-waabooz', 'boss-waabooz-mini', 'boss-generic',
  ];

  it('declares a CreepVisualStyle union with all required members', () => {
    for (const s of REQUIRED_STYLES) {
      expect(creepRaw).toContain(`'${s}'`);
    }
  });
});

// ── STYLE_COLORS ──────────────────────────────────────────────────────────────

describe('STYLE_COLORS', () => {
  it('defines warm tan/brown for normal (0xd4a56a)', () => {
    expect(creepRaw).toMatch(/normal:\s+0xd4a56a/);
  });

  it('defines bright yellow-orange for fast (0xffaa22)', () => {
    expect(creepRaw).toMatch(/fast:\s+0xffaa22/);
  });

  it('defines silver-grey for armored (0xaaaaaa)', () => {
    expect(creepRaw).toMatch(/armored:\s+0xaaaaaa/);
  });

  it('defines lavender for immune (0xcc99ee)', () => {
    expect(creepRaw).toMatch(/immune:\s+0xcc99ee/);
  });

  it('defines green for regen (0x22aa44)', () => {
    expect(creepRaw).toMatch(/regen:\s+0x22aa44/);
  });

  it('defines light blue for flying (0x88ccff)', () => {
    expect(creepRaw).toMatch(/flying:\s+0x88ccff/);
  });

  it('defines deep red for boss-waabooz (0xcc2222)', () => {
    expect(creepRaw).toMatch(/'boss-waabooz':\s+0xcc2222/);
  });

  it('defines deep red for boss-waabooz-mini (0xcc2222)', () => {
    expect(creepRaw).toMatch(/'boss-waabooz-mini':\s+0xcc2222/);
  });
});

// ── _deriveVisualStyle ────────────────────────────────────────────────────────

describe('_deriveVisualStyle (structural)', () => {
  // Extract function body using the static keyword + function name.
  const fnStart = creepRaw.indexOf('static _deriveVisualStyle(');
  const fnEnd   = creepRaw.indexOf('static _computeWaveSizeScale(');
  const fnBody  = creepRaw.slice(fnStart, fnEnd);

  it('checks air type first (highest priority)', () => {
    const airIdx = fnBody.indexOf("config.type === 'air'");
    const bossIdx = fnBody.indexOf('config.isBoss');
    expect(airIdx).toBeGreaterThan(-1);
    expect(bossIdx).toBeGreaterThan(-1);
    expect(airIdx).toBeLessThan(bossIdx);
  });

  it('returns flying for air type', () => {
    expect(fnBody).toContain("return 'flying'");
  });

  it('returns boss-waabooz for waabooz boss', () => {
    expect(fnBody).toContain("'boss-waabooz' : 'boss-generic'");
  });

  it('returns boss-waabooz-mini for mini sprite key', () => {
    expect(fnBody).toContain("config.spriteKey === 'boss-waabooz-mini'");
  });

  it('checks armored before immune (priority order)', () => {
    const armorIdx = fnBody.indexOf("return 'armored'");
    const immuneIdx = fnBody.indexOf("return 'immune'");
    expect(armorIdx).toBeGreaterThan(-1);
    expect(immuneIdx).toBeGreaterThan(-1);
    expect(armorIdx).toBeLessThan(immuneIdx);
  });

  it('checks regen via regenPercentPerSec', () => {
    expect(fnBody).toContain("(config.regenPercentPerSec ?? 0) > 0");
  });

  it('detects fast via spriteKey', () => {
    expect(fnBody).toContain("config.spriteKey === 'creep-fast'");
  });

  it('defaults to normal', () => {
    expect(fnBody).toContain("return 'normal'");
  });
});

// ── _computeWaveSizeScale ─────────────────────────────────────────────────────

describe('_computeWaveSizeScale (structural)', () => {
  it('returns 1.0 for undefined/falsy waveNumber', () => {
    expect(creepRaw).toContain('if (!waveNumber) return 1.0');
  });

  it('clamps wave to [1, 20]', () => {
    expect(creepRaw).toContain('Math.max(1, Math.min(20, waveNumber))');
  });

  it('computes linear interpolation from 0.85 to 1.15 over 19 steps', () => {
    expect(creepRaw).toContain('0.85 + (n - 1) / 19 * 0.30');
  });
});

// ── Arithmetic verification of _computeWaveSizeScale formula ──────────────────

describe('_computeWaveSizeScale arithmetic', () => {
  // Re-implement the formula to verify expected output.
  const computeWaveSizeScale = (waveNumber: number | undefined): number => {
    if (!waveNumber) return 1.0;
    const n = Math.max(1, Math.min(20, waveNumber));
    return 0.85 + (n - 1) / 19 * 0.30;
  };

  it('wave 1 → 0.85', () => {
    expect(computeWaveSizeScale(1)).toBeCloseTo(0.85, 5);
  });

  it('wave 10 → ~1.0 (midpoint)', () => {
    // (10-1)/19 * 0.30 + 0.85 = 9/19 * 0.30 + 0.85 ≈ 0.992
    expect(computeWaveSizeScale(10)).toBeCloseTo(0.85 + 9 / 19 * 0.30, 5);
  });

  it('wave 20 → 1.15', () => {
    expect(computeWaveSizeScale(20)).toBeCloseTo(1.15, 5);
  });

  it('undefined → 1.0 (default)', () => {
    expect(computeWaveSizeScale(undefined)).toBe(1.0);
  });

  it('wave 0 → 1.0 (falsy guard)', () => {
    expect(computeWaveSizeScale(0)).toBe(1.0);
  });

  it('wave -5 → same as wave 1 (clamped)', () => {
    expect(computeWaveSizeScale(-5)).toBeCloseTo(0.85, 5);
  });

  it('wave 100 → same as wave 20 (clamped)', () => {
    expect(computeWaveSizeScale(100)).toBeCloseTo(1.15, 5);
  });

  it('boss creeps always use 1.0 (constructor guard)', () => {
    // The constructor: `this.isBossCreep ? 1.0 : _computeWaveSizeScale(...)`
    expect(creepRaw).toContain('this.isBossCreep ? 1.0 : Creep._computeWaveSizeScale');
  });
});

// ── Body shape per style (structural) ─────────────────────────────────────────

describe('Body shape rendering', () => {
  it('fast + flying use Graphics body (diamond)', () => {
    expect(creepRaw).toMatch(
      /useGfxBody\s*=\s*!useSprite\s*&&\s*\(style\s*===\s*'fast'\s*\|\|\s*style\s*===\s*'flying'\s*\|\|\s*style\s*===\s*'immune'\)/,
    );
  });

  it('immune style renders a filled circle (not diamond)', () => {
    expect(creepRaw).toContain("this._visualStyle === 'immune'");
    expect(creepRaw).toContain('gfx.fillCircle(0, 0, radius)');
  });

  it('fast/flying render a 4-point diamond via fillPoints', () => {
    expect(creepRaw).toContain('gfx.fillPoints(');
  });

  it('armored style has a dark border overlay (_detailGfx)', () => {
    const armoredSwitch = creepRaw.slice(
      creepRaw.indexOf("case 'armored':"),
      creepRaw.indexOf("case 'immune':"),
    );
    expect(armoredSwitch).toContain('_detailGfx');
    expect(armoredSwitch).toContain('strokeRect');
  });

  it('regen style draws green "+" crosses', () => {
    const regenSwitch = creepRaw.slice(
      creepRaw.indexOf("case 'regen': {"),
      creepRaw.indexOf("case 'boss-waabooz':"),
    );
    expect(regenSwitch).toContain('fillRect');
    expect(regenSwitch).toContain('0x6B8F3E');
  });

  it('boss-waabooz has white stripe pattern', () => {
    const bossSwitch = creepRaw.slice(
      creepRaw.indexOf("case 'boss-waabooz':"),
      creepRaw.indexOf('default:'),
    );
    expect(bossSwitch).toContain('0xffffff');
    expect(bossSwitch).toContain('fillRect');
  });
});

// ── Immune outline pulsing ────────────────────────────────────────────────────

describe('Immune outline pulsing', () => {
  it('creates _immuneOutlineGfx for immune style', () => {
    expect(creepRaw).toContain("case 'immune':");
    expect(creepRaw).toContain('this._immuneOutlineGfx = new Phaser.GameObjects.Graphics');
  });

  it('pulse alpha range matches AC (0.4 → 1.0)', () => {
    expect(creepRaw).toContain('alpha:    { from: 0.4, to: 1.0 }');
  });

  it('pulse yoyos infinitely', () => {
    expect(creepRaw).toContain('yoyo:     true');
    expect(creepRaw).toContain('repeat:   -1');
  });

  it('draws two concentric circles (white + lavender)', () => {
    const outlineSection = creepRaw.slice(
      creepRaw.indexOf('Immune circle outline'),
      creepRaw.indexOf('if (!this._detailGfx)'),
    );
    expect(outlineSection).toContain('strokeCircle(0, 0, radius)');
    expect(outlineSection).toContain('strokeCircle(0, 0, radius + 3)');
    expect(outlineSection).toContain('0xffffff');
    expect(outlineSection).toContain('0xddbbff');
  });
});

// ── Flying creep depth + shadow ───────────────────────────────────────────────

describe('Flying creep visuals', () => {
  it('sets container depth to CREEP_DEPTH + 2 for air type', () => {
    expect(creepRaw).toContain(
      "this.creepType === 'air' ? CREEP_DEPTH + 2 : CREEP_DEPTH",
    );
  });

  it('creates a scene-level shadow Ellipse at CREEP_DEPTH - 1', () => {
    expect(creepRaw).toContain('this._sceneShadow = new Phaser.GameObjects.Ellipse');
    expect(creepRaw).toContain('this._sceneShadow.setDepth(CREEP_DEPTH - 1)');
  });

  it('updates scene shadow position in update loop', () => {
    expect(creepRaw).toContain('this._sceneShadow.setPosition(this.x, this.y + 2)');
  });

  it('hides scene shadow on reached-exit', () => {
    // Both exit paths hide the shadow.
    const matches = creepRaw.match(/this\._sceneShadow\?\.setVisible\(false\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it('creates wing rectangles for air creeps', () => {
    expect(creepRaw).toContain('this._leftWing  = leftWing');
    expect(creepRaw).toContain('this._rightWing = rightWing');
  });
});

// ── Cleanup / memory ──────────────────────────────────────────────────────────

describe('Visual variety cleanup', () => {
  it('stops and clears _immuneOutlineTween in destroy()', () => {
    expect(creepRaw).toContain('this._immuneOutlineTween?.stop()');
    expect(creepRaw).toContain('this._immuneOutlineTween = undefined');
  });

  it('destroys _immuneOutlineGfx in destroy()', () => {
    expect(creepRaw).toContain('this._immuneOutlineGfx?.destroy()');
  });

  it('destroys _detailGfx in destroy()', () => {
    expect(creepRaw).toContain('this._detailGfx?.destroy()');
  });

  it('destroys _bodyGfx in destroy()', () => {
    expect(creepRaw).toContain('this._bodyGfx?.destroy()');
  });

  it('destroys and nulls _sceneShadow in destroy()', () => {
    expect(creepRaw).toContain('this._sceneShadow?.destroy()');
    expect(creepRaw).toContain('this._sceneShadow = undefined');
  });
});

// ── WaveManager integration: waveNumber propagation ───────────────────────────

describe('WaveManager waveNumber propagation', () => {
  it('buildSpawnQueue accepts waveNumber parameter', () => {
    expect(waveManagerRaw).toMatch(
      /buildSpawnQueue\(waveDef:\s*WaveDef,\s*waveNumber:\s*number\)/,
    );
  });

  it('buildSpawnQueue sets waveNumber on each CreepConfig', () => {
    // Find the private buildSpawnQueue method definition and its body.
    const fnStart = waveManagerRaw.indexOf('private buildSpawnQueue(');
    const fnEnd   = waveManagerRaw.indexOf('private buildEscortQueue(');
    const fnBody  = waveManagerRaw.slice(fnStart, fnEnd);
    expect(fnBody).toContain('waveNumber,');
  });

  it('buildEscortQueue accepts waveNumber parameter', () => {
    const fnStart = waveManagerRaw.indexOf('private buildEscortQueue(');
    const fnBody  = waveManagerRaw.slice(fnStart, fnStart + 200);
    expect(fnBody).toContain('waveNumber: number');
  });

  it('buildEscortQueue sets waveNumber on escort configs', () => {
    const fnStart = waveManagerRaw.indexOf('private buildEscortQueue(');
    // Grab enough of the function body to include the CreepConfig literal.
    const fnBody  = waveManagerRaw.slice(fnStart, fnStart + 1000);
    expect(fnBody).toContain('waveNumber,');
  });

  it('boss spawn includes waveNumber', () => {
    // Boss config literal in _spawnBossForWave / startWave boss branch
    // should include waveNumber: wave.waveNumber
    expect(waveManagerRaw).toContain('waveNumber:         wave.waveNumber');
  });

  it('passes waveNumber to buildSpawnQueue call site', () => {
    expect(waveManagerRaw).toContain('this.buildSpawnQueue(waveDef, waveNumber)');
  });

  it('passes waveNumber to buildEscortQueue call site', () => {
    expect(waveManagerRaw).toContain(
      'this.buildEscortQueue(waveDef, waveDef.escorts, waveNumber)',
    );
  });
});

// ── Status effect colour overrides ────────────────────────────────────────────

describe('Status effect colour overrides for Graphics body', () => {
  it('handles slowed + poisoned combo for _bodyGfx', () => {
    expect(creepRaw).toMatch(/if\s*\(slowed\s*&&\s*poisoned\)\s*color\s*=\s*0x4A7FA5/);
  });

  it('handles slowed-only for _bodyGfx', () => {
    expect(creepRaw).toMatch(/else if\s*\(slowed\)\s+color\s*=/);
  });

  it('handles poisoned-only for _bodyGfx', () => {
    expect(creepRaw).toMatch(/else if\s*\(poisoned\)\s+color\s*=\s*0x6B8F3E/);
  });

  it('handles burning for _bodyGfx', () => {
    expect(creepRaw).toMatch(/else if\s*\(burning\)\s+color\s*=\s*0xff8833/);
  });

  it('restores original style colour when no effects active', () => {
    expect(creepRaw).toContain('color = this._bodyGfxColor');
  });
});

// ── Wave size scale application ───────────────────────────────────────────────

describe('Wave size scale in body rendering', () => {
  it('applies scale to rectangle body size', () => {
    expect(creepRaw).toContain('Math.round(24 * scale)');
  });

  it('applies scale to sprite body display size', () => {
    expect(creepRaw).toContain('Math.round(BODY_HORIZ_W * sc)');
    expect(creepRaw).toContain('Math.round(BODY_HORIZ_H * sc)');
  });

  it('does not scale boss body sizes', () => {
    // Boss sizes use absolute constants (BOSS_HORIZ_W etc), not scaled.
    expect(creepRaw).toContain('this.isBossCreep ? BOSS_HORIZ_W :');
  });
});
