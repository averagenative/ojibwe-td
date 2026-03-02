/**
 * Tests for commander idle animation definitions and the CommanderSelectScene
 * animation logic (structural + data validation).
 */
import { describe, it, expect } from 'vitest';
import {
  getCommanderAnimDef,
  pickExpression,
  DEFAULT_COMMANDER_ANIM,
  EXPRESSION_MIN_INTERVAL,
  EXPRESSION_MAX_INTERVAL,
} from '../../data/commanderAnimDefs';
import type {
  ExpressionType,
  CommanderElement,
  CommanderPersonality,
} from '../../data/commanderAnimDefs';
import { ALL_COMMANDERS } from '../../data/commanderDefs';
import * as fs from 'fs';
import * as path from 'path';

const SCENE_SRC = fs.readFileSync(
  path.resolve(__dirname, '../../scenes/CommanderSelectScene.ts'),
  'utf-8',
);

const ANIM_DEFS_SRC = fs.readFileSync(
  path.resolve(__dirname, '../../data/commanderAnimDefs.ts'),
  'utf-8',
);

// ── Data validation tests ────────────────────────────────────────────────────

describe('commanderAnimDefs – per-commander definitions', () => {
  for (const cmd of ALL_COMMANDERS) {
    describe(`commander: ${cmd.id}`, () => {
      const def = getCommanderAnimDef(cmd.id);

      it('returns a valid animation def', () => {
        expect(def).toBeDefined();
        expect(def.breathRateMs).toBeGreaterThan(0);
      });

      it('has reasonable breathing amplitude', () => {
        expect(def.breathAmpY).toBeGreaterThan(0);
        expect(def.breathAmpY).toBeLessThanOrEqual(0.02);
        expect(def.breathAmpX).toBeGreaterThan(0);
        expect(def.breathAmpX).toBeLessThanOrEqual(0.01);
      });

      it('has breathing rate in the ~2-4 second range', () => {
        expect(def.breathRateMs).toBeGreaterThanOrEqual(2000);
        expect(def.breathRateMs).toBeLessThanOrEqual(4000);
      });

      it('has a non-empty expression pool', () => {
        expect(def.expressionPool.length).toBeGreaterThan(0);
      });

      it('has a valid element', () => {
        const validElements: CommanderElement[] = ['fire', 'ice', 'lightning', 'nature', 'spirit'];
        expect(validElements).toContain(def.element);
      });

      it('has a valid personality', () => {
        const validPersonalities: CommanderPersonality[] = ['wise', 'aggressive', 'trickster'];
        expect(validPersonalities).toContain(def.personality);
      });

      it('expression pool weights are all positive', () => {
        for (const [, weight] of def.expressionPool) {
          expect(weight).toBeGreaterThan(0);
        }
      });
    });
  }
});

describe('commanderAnimDefs – fallback default', () => {
  it('returns default for unknown commander ID', () => {
    const def = getCommanderAnimDef('unknown-commander');
    expect(def).toBe(DEFAULT_COMMANDER_ANIM);
  });

  it('default has valid values', () => {
    expect(DEFAULT_COMMANDER_ANIM.breathRateMs).toBe(3000);
    expect(DEFAULT_COMMANDER_ANIM.breathAmpY).toBe(0.01);
    expect(DEFAULT_COMMANDER_ANIM.breathAmpX).toBe(0.005);
    expect(DEFAULT_COMMANDER_ANIM.expressionPool.length).toBeGreaterThan(0);
  });
});

// ── Expression picker tests ──────────────────────────────────────────────────

describe('pickExpression', () => {
  it('returns a valid expression type', () => {
    const validTypes: ExpressionType[] = ['blink', 'smirk', 'brow-furrow', 'glance'];
    for (let i = 0; i < 100; i++) {
      const expr = pickExpression(DEFAULT_COMMANDER_ANIM.expressionPool);
      expect(validTypes).toContain(expr);
    }
  });

  it('respects weighting (heavily weighted expression appears more often)', () => {
    const heavyPool: [ExpressionType, number][] = [
      ['blink', 100],
      ['smirk', 1],
    ];
    const counts = { blink: 0, smirk: 0 };
    for (let i = 0; i < 1000; i++) {
      const expr = pickExpression(heavyPool);
      counts[expr as 'blink' | 'smirk']++;
    }
    // blink should dominate
    expect(counts.blink).toBeGreaterThan(counts.smirk * 5);
  });

  it('returns fallback (first entry) when pool has single item', () => {
    const pool: [ExpressionType, number][] = [['glance', 1]];
    expect(pickExpression(pool)).toBe('glance');
  });

  it('returns first item when Math.random returns 0', () => {
    const orig = Math.random;
    Math.random = () => 0;
    try {
      const pool: [ExpressionType, number][] = [
        ['blink', 3],
        ['smirk', 7],
      ];
      // roll = 0 * 10 = 0; roll - 3 = -3 ≤ 0 → 'blink'
      expect(pickExpression(pool)).toBe('blink');
    } finally {
      Math.random = orig;
    }
  });

  it('returns last item when Math.random is near 1', () => {
    const orig = Math.random;
    Math.random = () => 0.999;
    try {
      const pool: [ExpressionType, number][] = [
        ['blink', 3],
        ['smirk', 7],
      ];
      // roll ≈ 9.99; roll - 3 = 6.99; roll - 7 = -0.01 ≤ 0 → 'smirk'
      expect(pickExpression(pool)).toBe('smirk');
    } finally {
      Math.random = orig;
    }
  });

  it('distributes evenly for equal-weight pool', () => {
    const pool: [ExpressionType, number][] = [
      ['blink', 1],
      ['smirk', 1],
      ['brow-furrow', 1],
      ['glance', 1],
    ];
    const counts: Record<string, number> = { blink: 0, smirk: 0, 'brow-furrow': 0, glance: 0 };
    for (let i = 0; i < 4000; i++) {
      counts[pickExpression(pool)]++;
    }
    // Each should appear roughly 1000 times (±300 for random variance)
    for (const key of Object.keys(counts)) {
      expect(counts[key]).toBeGreaterThan(500);
      expect(counts[key]).toBeLessThan(1500);
    }
  });
});

// ── Expression timing constants ──────────────────────────────────────────────

describe('expression timing', () => {
  it('min interval is 5 seconds', () => {
    expect(EXPRESSION_MIN_INTERVAL).toBe(5000);
  });

  it('max interval is 10 seconds', () => {
    expect(EXPRESSION_MAX_INTERVAL).toBe(10000);
  });

  it('min < max', () => {
    expect(EXPRESSION_MIN_INTERVAL).toBeLessThan(EXPRESSION_MAX_INTERVAL);
  });
});

// ── Personality → expression weight tests ────────────────────────────────────

describe('personality expression weighting', () => {
  it('aggressive commanders weight brow-furrow and glance higher', () => {
    const makoons = getCommanderAnimDef('makoons');
    expect(makoons.personality).toBe('aggressive');
    const browWeight = makoons.expressionPool.find(([e]) => e === 'brow-furrow')?.[1] ?? 0;
    const glanceWeight = makoons.expressionPool.find(([e]) => e === 'glance')?.[1] ?? 0;
    const smirkWeight = makoons.expressionPool.find(([e]) => e === 'smirk')?.[1] ?? 0;
    expect(browWeight).toBeGreaterThan(smirkWeight);
    expect(glanceWeight).toBeGreaterThan(smirkWeight);
  });

  it('wise commanders weight blink and smirk higher', () => {
    const nokomis = getCommanderAnimDef('nokomis');
    expect(nokomis.personality).toBe('wise');
    const blinkWeight = nokomis.expressionPool.find(([e]) => e === 'blink')?.[1] ?? 0;
    const smirkWeight = nokomis.expressionPool.find(([e]) => e === 'smirk')?.[1] ?? 0;
    const browWeight = nokomis.expressionPool.find(([e]) => e === 'brow-furrow')?.[1] ?? 0;
    expect(blinkWeight).toBeGreaterThan(browWeight);
    expect(smirkWeight).toBeGreaterThan(browWeight);
  });

  it('trickster commanders weight smirk and glance higher', () => {
    const oshkaabewis = getCommanderAnimDef('oshkaabewis');
    expect(oshkaabewis.personality).toBe('trickster');
    const smirkWeight = oshkaabewis.expressionPool.find(([e]) => e === 'smirk')?.[1] ?? 0;
    const glanceWeight = oshkaabewis.expressionPool.find(([e]) => e === 'glance')?.[1] ?? 0;
    const browWeight = oshkaabewis.expressionPool.find(([e]) => e === 'brow-furrow')?.[1] ?? 0;
    expect(smirkWeight).toBeGreaterThan(browWeight);
    expect(glanceWeight).toBeGreaterThan(browWeight);
  });
});

// ── Breathing rate variation tests ───────────────────────────────────────────

describe('breathing rate variation by personality', () => {
  it('calm commanders breathe slower than aggressive ones', () => {
    const nokomis = getCommanderAnimDef('nokomis');      // wise/calm
    const makoons = getCommanderAnimDef('makoons');       // aggressive
    expect(nokomis.breathRateMs).toBeGreaterThan(makoons.breathRateMs);
  });

  it('all commanders have unique breathing rates', () => {
    const rates = ALL_COMMANDERS.map(c => getCommanderAnimDef(c.id).breathRateMs);
    // At least some variation (not all the same)
    const unique = new Set(rates);
    expect(unique.size).toBeGreaterThan(1);
  });
});

// ── Element assignment tests ─────────────────────────────────────────────────

describe('per-commander element assignments', () => {
  const expected: Record<string, CommanderElement> = {
    nokomis: 'nature',
    bizhiw: 'ice',
    animikiikaa: 'lightning',
    makoons: 'fire',
    oshkaabewis: 'spirit',
    waabizii: 'spirit',
  };

  for (const [id, element] of Object.entries(expected)) {
    it(`${id} is ${element}-aligned`, () => {
      expect(getCommanderAnimDef(id).element).toBe(element);
    });
  }
});

// ── Structural tests (CommanderSelectScene source) ───────────────────────────

describe('CommanderSelectScene structural checks', () => {
  it('imports commanderAnimDefs', () => {
    expect(SCENE_SRC).toContain("from '../data/commanderAnimDefs'");
  });

  it('has update() method for frame-by-frame animation', () => {
    expect(SCENE_SRC).toMatch(/update\s*\(\s*time\s*:\s*number\s*,\s*delta\s*:\s*number\s*\)/);
  });

  it('has shutdown() method for cleanup', () => {
    expect(SCENE_SRC).toMatch(/shutdown\s*\(\s*\)/);
  });

  it('has _stepBreathing method', () => {
    expect(SCENE_SRC).toContain('_stepBreathing');
  });

  it('has _stepExpressions method', () => {
    expect(SCENE_SRC).toContain('_stepExpressions');
  });

  it('has _stepAmbientParticles method', () => {
    expect(SCENE_SRC).toContain('_stepAmbientParticles');
  });

  it('has _stepBorderGlow method', () => {
    expect(SCENE_SRC).toContain('_stepBorderGlow');
  });

  it('implements breathing as scaleY/scaleX oscillation', () => {
    expect(SCENE_SRC).toContain('breathAmpY');
    expect(SCENE_SRC).toContain('breathAmpX');
    expect(SCENE_SRC).toContain('Math.sin');
  });

  it('implements all 4 expression types', () => {
    expect(SCENE_SRC).toContain("case 'blink':");
    expect(SCENE_SRC).toContain("case 'smirk':");
    expect(SCENE_SRC).toContain("case 'brow-furrow':");
    expect(SCENE_SRC).toContain("case 'glance':");
  });

  it('selection feedback uses tween for power-up flash', () => {
    expect(SCENE_SRC).toContain('1.05');
    expect(SCENE_SRC).toContain('1.02');
  });

  it('unselected commanders get dimmed (alpha via tween)', () => {
    expect(SCENE_SRC).toContain('alpha: 0.7');
  });

  it('hovered state speeds up breathing', () => {
    expect(SCENE_SRC).toContain('state.hovered');
    expect(SCENE_SRC).toContain('rateMultiplier');
  });

  it('hover intensifies ambient particle spawn rate', () => {
    expect(SCENE_SRC).toContain('state.hovered ? 400');
  });

  it('portraits track hover via pointerover/pointerout', () => {
    expect(SCENE_SRC).toContain("'pointerover'");
    expect(SCENE_SRC).toContain("'pointerout'");
    expect(SCENE_SRC).toContain('state.hovered = true');
    expect(SCENE_SRC).toContain('state.hovered = false');
  });

  it('shutdown destroys particles', () => {
    expect(SCENE_SRC).toContain('state.particles');
    expect(SCENE_SRC).toContain('p.destroy()');
  });
});

// ── Selection flash guard (flashUntil) ──────────────────────────────────────

describe('selection flash breathing guard', () => {
  it('CardAnimState includes flashUntil field', () => {
    expect(SCENE_SRC).toContain('flashUntil');
  });

  it('_stepBreathing skips when time < flashUntil', () => {
    expect(SCENE_SRC).toContain('time < state.flashUntil');
  });

  it('highlightCard sets flashUntil on selected commander', () => {
    expect(SCENE_SRC).toContain('state.flashUntil = this.time.now');
  });

  it('unselected dim uses tween (no redundant immediate setAlpha)', () => {
    // The else branch should have a tween to 0.7 but NOT an immediate setAlpha(0.7)
    // before the tween.  Count setAlpha(0.7) calls — should be exactly 0 in the
    // unselected branch (only the "Restore full alpha" at the end uses setAlpha).
    const highlightMatch = SCENE_SRC.match(
      /highlightCard[\s\S]*?\/\/ Restore full alpha/,
    );
    expect(highlightMatch).not.toBeNull();
    const section = highlightMatch![0];
    // The unselected branch should NOT have setAlpha(0.7) — only the tween
    const alphaSetCalls = section.match(/setAlpha\(0\.7\)/g);
    expect(alphaSetCalls).toBeNull();
  });
});

// ── Phaser-free module check ─────────────────────────────────────────────────

describe('commanderAnimDefs is Phaser-free', () => {
  it('does not import Phaser', () => {
    expect(ANIM_DEFS_SRC).not.toContain("import Phaser");
    expect(ANIM_DEFS_SRC).not.toContain("from 'phaser'");
  });
});

// ── Amplitude bounds (subtle animations) ─────────────────────────────────────

describe('animation amplitudes are subtle', () => {
  for (const cmd of ALL_COMMANDERS) {
    const def = getCommanderAnimDef(cmd.id);

    it(`${cmd.id} breathAmpY ≤ 1.5% (0.015)`, () => {
      expect(def.breathAmpY).toBeLessThanOrEqual(0.015);
    });

    it(`${cmd.id} breathAmpX ≤ 0.8% (0.008)`, () => {
      expect(def.breathAmpX).toBeLessThanOrEqual(0.008);
    });
  }
});
