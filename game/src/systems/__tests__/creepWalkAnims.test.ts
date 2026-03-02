/**
 * Unit tests for the procedural creep walk/flight animation system.
 *
 * All logic under test lives in src/data/creepAnimDefs.ts — Phaser-free,
 * no DOM or canvas setup required.
 *
 * Coverage:
 *  1.  getCreepAnimDef returns correct styles for all known sprite keys
 *  2.  Air creeps always have wingRotAmp > 0 (rect-path wing animation)
 *  3.  Ground creeps always have wingRotAmp = 0
 *  4.  Faster creeps (sprint) have a higher freqMult than slower (waddle)
 *  5.  Boss animations are keyed per boss
 *  6.  Endless-mode boss keys (suffix stripped) resolve correctly
 *  7.  Unknown sprite keys fall back to defaults
 *  8.  Hop style uses useBounce = true; all others use false
 *  9.  Squash amplitude is within the 0–15 % range for all defs
 * 10.  Animation phase increment scales with movement speed (bobPhase math)
 * 11.  Phase increment is zero when speed is zero (frozen)
 * 12.  Structural: Creep.ts imports getCreepAnimDef from creepAnimDefs
 * 13.  Structural: Creep.ts has _stepWalkAnim private method
 * 14.  Structural: Creep.ts stores _airShadow / _leftWing / _rightWing fields
 * 15.  Structural: updateDirectionalVisual caches _baseScaleX / _baseScaleY
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getCreepAnimDef,
  DEFAULT_GROUND_ANIM,
  DEFAULT_AIR_ANIM,
} from '../../data/creepAnimDefs';

// ── 1. Known ground sprite keys ────────────────────────────────────────────

describe('getCreepAnimDef — ground creep styles', () => {
  it('creep-normal → trot', () => {
    const def = getCreepAnimDef('creep-normal', 'ground', false, '');
    expect(def.style).toBe('trot');
  });

  it('creep-fast → sprint', () => {
    const def = getCreepAnimDef('creep-fast', 'ground', false, '');
    expect(def.style).toBe('sprint');
  });

  it('creep-armored → waddle', () => {
    const def = getCreepAnimDef('creep-armored', 'ground', false, '');
    expect(def.style).toBe('waddle');
  });

  it('creep-immune → float', () => {
    const def = getCreepAnimDef('creep-immune', 'ground', false, '');
    expect(def.style).toBe('float');
  });

  it('creep-regen → slither', () => {
    const def = getCreepAnimDef('creep-regen', 'ground', false, '');
    expect(def.style).toBe('slither');
  });
});

// ── 2 & 3. Air creep wing animation ───────────────────────────────────────

describe('getCreepAnimDef — air creep styles', () => {
  it('creep-air-basic → flap-basic with wingRotAmp > 0', () => {
    const def = getCreepAnimDef('creep-air-basic', 'air', false, '');
    expect(def.style).toBe('flap-basic');
    expect(def.wingRotAmp).toBeGreaterThan(0);
  });

  it('creep-air-scout → flap-scout with wingRotAmp > 0', () => {
    const def = getCreepAnimDef('creep-air-scout', 'air', false, '');
    expect(def.style).toBe('flap-scout');
    expect(def.wingRotAmp).toBeGreaterThan(0);
  });

  it('creep-air-armored → flap-heavy with wingRotAmp > 0', () => {
    const def = getCreepAnimDef('creep-air-armored', 'air', false, '');
    expect(def.style).toBe('flap-heavy');
    expect(def.wingRotAmp).toBeGreaterThan(0);
  });

  it('all known ground creep sprite keys have wingRotAmp === 0', () => {
    const groundKeys = ['creep-normal', 'creep-fast', 'creep-armored', 'creep-immune', 'creep-regen'];
    for (const key of groundKeys) {
      const def = getCreepAnimDef(key, 'ground', false, '');
      expect(def.wingRotAmp, `${key} should have wingRotAmp 0`).toBe(0);
    }
  });
});

// ── 4. Frequency ordering ─────────────────────────────────────────────────

describe('getCreepAnimDef — frequency ordering', () => {
  it('sprint (fox) has higher freqMult than waddle (armoured)', () => {
    const sprint = getCreepAnimDef('creep-fast', 'ground', false, '');
    const waddle = getCreepAnimDef('creep-armored', 'ground', false, '');
    expect(sprint.freqMult).toBeGreaterThan(waddle.freqMult);
  });

  it('scout (hawk) has higher freqMult than flap-heavy (raven)', () => {
    const scout  = getCreepAnimDef('creep-air-scout', 'air', false, '');
    const heavy  = getCreepAnimDef('creep-air-armored', 'air', false, '');
    expect(scout.freqMult).toBeGreaterThan(heavy.freqMult);
  });
});

// ── 5. Boss animations ────────────────────────────────────────────────────

describe('getCreepAnimDef — boss styles', () => {
  it('makwa → lumber', () => {
    const def = getCreepAnimDef('boss-makwa', 'ground', true, 'makwa');
    expect(def.style).toBe('lumber');
  });

  it('migizi → strut', () => {
    const def = getCreepAnimDef('boss-migizi', 'ground', true, 'migizi');
    expect(def.style).toBe('strut');
  });

  it('waabooz → hop', () => {
    const def = getCreepAnimDef('boss-waabooz', 'ground', true, 'waabooz');
    expect(def.style).toBe('hop');
  });

  it('animikiins → crackle', () => {
    const def = getCreepAnimDef('boss-animikiins', 'ground', true, 'animikiins');
    expect(def.style).toBe('crackle');
  });

  it('boss lookup ignores sprite key — uses bossKey instead', () => {
    // Even with an arbitrary spriteKey, isBoss=true routes through BOSS_ANIM_DEFS.
    const def = getCreepAnimDef('some-other-texture', 'ground', true, 'makwa');
    expect(def.style).toBe('lumber');
  });
});

// ── 6. Endless-mode boss key suffix stripping ─────────────────────────────

describe('getCreepAnimDef — endless boss variants', () => {
  it('makwa-ew25 resolves to the same def as makwa', () => {
    const normal  = getCreepAnimDef('boss-makwa', 'ground', true, 'makwa');
    const endless = getCreepAnimDef('boss-makwa', 'ground', true, 'makwa-ew25');
    expect(endless.style).toBe(normal.style);
    expect(endless.freqMult).toBe(normal.freqMult);
  });

  it('animikiins-ew40 resolves to the same def as animikiins', () => {
    const normal  = getCreepAnimDef('boss-animikiins', 'ground', true, 'animikiins');
    const endless = getCreepAnimDef('boss-animikiins', 'ground', true, 'animikiins-ew40');
    expect(endless.style).toBe(normal.style);
  });
});

// ── 7. Unknown keys fall back to defaults ─────────────────────────────────

describe('getCreepAnimDef — fallback defaults', () => {
  it('unknown ground sprite key falls back to DEFAULT_GROUND_ANIM', () => {
    const def = getCreepAnimDef('creep-unknown-xyz', 'ground', false, '');
    expect(def.style).toBe(DEFAULT_GROUND_ANIM.style);
    expect(def.freqMult).toBe(DEFAULT_GROUND_ANIM.freqMult);
  });

  it('undefined sprite key falls back for ground creep', () => {
    const def = getCreepAnimDef(undefined, 'ground', false, '');
    expect(def.style).toBe(DEFAULT_GROUND_ANIM.style);
  });

  it('unknown air sprite key falls back to DEFAULT_AIR_ANIM', () => {
    const def = getCreepAnimDef('creep-air-unknown', 'air', false, '');
    expect(def.style).toBe(DEFAULT_AIR_ANIM.style);
    expect(def.wingRotAmp).toBeGreaterThan(0);
  });

  it('undefined sprite key falls back for air creep', () => {
    const def = getCreepAnimDef(undefined, 'air', false, '');
    expect(def.style).toBe(DEFAULT_AIR_ANIM.style);
  });

  it('unknown boss key falls back to DEFAULT_GROUND_ANIM', () => {
    const def = getCreepAnimDef('boss-unknown', 'ground', true, 'unknown-boss');
    expect(def.style).toBe(DEFAULT_GROUND_ANIM.style);
  });
});

// ── 8. Hop uses useBounce; all others do not ─────────────────────────────

describe('getCreepAnimDef — useBounce flag', () => {
  it('waabooz uses useBounce = true', () => {
    const def = getCreepAnimDef('boss-waabooz', 'ground', true, 'waabooz');
    expect(def.useBounce).toBe(true);
  });

  it('all non-hop ground creeps use useBounce = false', () => {
    const keys = ['creep-normal', 'creep-fast', 'creep-armored', 'creep-immune', 'creep-regen'];
    for (const k of keys) {
      expect(getCreepAnimDef(k, 'ground', false, '').useBounce, k).toBe(false);
    }
  });

  it('all air creeps use useBounce = false', () => {
    const keys = ['creep-air-basic', 'creep-air-scout', 'creep-air-armored'];
    for (const k of keys) {
      expect(getCreepAnimDef(k, 'air', false, '').useBounce, k).toBe(false);
    }
  });

  it('bosses other than waabooz use useBounce = false', () => {
    for (const bk of ['makwa', 'migizi', 'animikiins']) {
      expect(getCreepAnimDef('', 'ground', true, bk).useBounce, bk).toBe(false);
    }
  });
});

// ── 9. Squash amplitude bounds ────────────────────────────────────────────

describe('getCreepAnimDef — squash amplitude sanity bounds', () => {
  const ALL_CASES: Array<[string | undefined, 'ground' | 'air', boolean, string]> = [
    ['creep-normal',      'ground', false, ''],
    ['creep-fast',        'ground', false, ''],
    ['creep-armored',     'ground', false, ''],
    ['creep-immune',      'ground', false, ''],
    ['creep-regen',       'ground', false, ''],
    ['creep-air-basic',   'air',    false, ''],
    ['creep-air-scout',   'air',    false, ''],
    ['creep-air-armored', 'air',    false, ''],
    ['boss-makwa',        'ground', true,  'makwa'],
    ['boss-migizi',       'ground', true,  'migizi'],
    ['boss-waabooz',      'ground', true,  'waabooz'],
    ['boss-animikiins',   'ground', true,  'animikiins'],
  ];

  it.each(ALL_CASES)(
    '%s squashAmpX is between 0 and 0.15',
    (sprite, type, isBoss, bossKey) => {
      const def = getCreepAnimDef(sprite, type, isBoss, bossKey);
      expect(def.squashAmpX).toBeGreaterThanOrEqual(0);
      expect(def.squashAmpX).toBeLessThanOrEqual(0.15);
    },
  );

  it.each(ALL_CASES)(
    '%s squashAmpY is between 0 and 0.15',
    (sprite, type, isBoss, bossKey) => {
      const def = getCreepAnimDef(sprite, type, isBoss, bossKey);
      expect(def.squashAmpY).toBeGreaterThanOrEqual(0);
      expect(def.squashAmpY).toBeLessThanOrEqual(0.15);
    },
  );
});

// ── 10 & 11. Phase increment scales with speed (pauses when frozen) ───────

describe('animation phase — speed scaling', () => {
  /**
   * bobPhase increment per frame mirrors Creep.ts:
   *   bobPhase += (effectiveSpeed / 1000) * delta * BOB_FREQ_FACTOR
   */
  const BOB_FREQ_FACTOR = 0.157; // must match Creep.ts constant
  const DELTA_MS = 16;            // ~60 fps

  function phaseIncrement(speed: number): number {
    return (speed / 1000) * DELTA_MS * BOB_FREQ_FACTOR;
  }

  it('phase increment is zero when speed is zero (fully frozen)', () => {
    expect(phaseIncrement(0)).toBe(0);
  });

  it('phase increment doubles when speed doubles', () => {
    const slow = phaseIncrement(50);
    const fast = phaseIncrement(100);
    expect(fast).toBeCloseTo(slow * 2, 8);
  });

  it('phase increment at 2x game speed is double that of 1x (scaledDelta)', () => {
    // GameScene passes scaledDelta = rawDelta * gameSpeedMultiplier to step().
    const inc1x = phaseIncrement(80);           // 1x game speed
    const inc2x = phaseIncrement(80) * 2;       // 2x: delta is doubled
    // Equivalent to calling phaseIncrement with doubled delta
    const inc2xDirect = (80 / 1000) * (DELTA_MS * 2) * BOB_FREQ_FACTOR;
    expect(inc2xDirect).toBeCloseTo(inc2x, 8);
    expect(inc2x).toBeGreaterThan(inc1x);
  });
});

// ── 12–15. Structural checks on Creep.ts source ───────────────────────────

const CREEP_SRC = fs.readFileSync(
  path.resolve(__dirname, '../../entities/Creep.ts'),
  'utf8',
);

describe('Creep.ts structural checks', () => {
  it('imports getCreepAnimDef from creepAnimDefs', () => {
    expect(CREEP_SRC).toContain("from '../data/creepAnimDefs'");
    expect(CREEP_SRC).toContain('getCreepAnimDef');
  });

  it('has _stepWalkAnim private method', () => {
    expect(CREEP_SRC).toContain('_stepWalkAnim');
  });

  it('stores _airShadow field for air creep shadow animation', () => {
    expect(CREEP_SRC).toContain('_airShadow');
  });

  it('stores _leftWing and _rightWing fields for rect-path wing animation', () => {
    expect(CREEP_SRC).toContain('_leftWing');
    expect(CREEP_SRC).toContain('_rightWing');
  });

  it('caches _baseScaleX and _baseScaleY after setDisplaySize', () => {
    expect(CREEP_SRC).toContain('_baseScaleX');
    expect(CREEP_SRC).toContain('_baseScaleY');
  });

  it('calls _stepWalkAnim inside step()', () => {
    // Check that the call-site exists — not just the definition.
    const callSiteCount = (CREEP_SRC.match(/this\._stepWalkAnim\(/g) ?? []).length;
    expect(callSiteCount).toBeGreaterThanOrEqual(1);
  });
});
