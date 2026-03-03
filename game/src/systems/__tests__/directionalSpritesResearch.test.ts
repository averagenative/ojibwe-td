/**
 * TASK-118: Directional Creep Sprites — Research & Implementation Options
 *
 * Structural tests verifying the research document covers all acceptance
 * criteria from the task file, and that key factual claims match the codebase.
 */

import { describe, it, expect } from 'vitest';

// ── Raw imports ──────────────────────────────────────────────────────────────

import docRaw from '../../../docs/directional-sprites-research.md?raw';
import creepRaw from '../../entities/Creep.ts?raw';
import pathingRaw from '../../data/pathing.ts?raw';
import bootSceneRaw from '../../scenes/BootScene.ts?raw';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Check if text contains a markdown heading (## level) with the given content. */
function hasSection(text: string, heading: string): boolean {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^##\\s+.*${escaped}`, 'm').test(text);
}

/** Extract all sprite keys loaded via this.load.image('key', ...) in BootScene. */
function bootSceneTextureKeys(): string[] {
  const re = /this\.load\.image\(\s*'([^']+)'/g;
  const keys: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(bootSceneRaw)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Required sections present (acceptance criteria 1–7)
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-118: research doc — required sections', () => {
  it('has section 1: Current State', () => {
    expect(hasSection(docRaw, 'Current State')).toBe(true);
  });

  it('has section 2: Option A (2-frame approach)', () => {
    expect(hasSection(docRaw, 'Option A')).toBe(true);
  });

  it('has section 3: Option B (4-direction spritesheets)', () => {
    expect(hasSection(docRaw, 'Option B')).toBe(true);
  });

  it('has section 4: Option C (procedural rotation)', () => {
    expect(hasSection(docRaw, 'Option C')).toBe(true);
  });

  it('has section 5: Asset Pipeline Changes', () => {
    expect(hasSection(docRaw, 'Asset Pipeline')).toBe(true);
  });

  it('has section 6: Effort Estimates', () => {
    expect(hasSection(docRaw, 'Effort Estimate')).toBe(true);
  });

  it('has section 7: Recommendation', () => {
    expect(hasSection(docRaw, 'Recommendation')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Current state accuracy
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-118: research doc — current state accuracy', () => {
  it('references CreepDirection type', () => {
    expect(docRaw).toContain('CreepDirection');
  });

  it('references computeDirection from pathing.ts', () => {
    expect(docRaw).toContain('computeDirection');
    expect(docRaw).toContain('pathing.ts');
  });

  it('references updateDirectionalVisual method', () => {
    expect(docRaw).toContain('updateDirectionalVisual');
  });

  it('codebase exports CreepDirection type from pathing.ts', () => {
    expect(pathingRaw).toMatch(/export\s+type\s+CreepDirection/);
  });

  it('codebase exports computeDirection function from pathing.ts', () => {
    expect(pathingRaw).toMatch(/export\s+function\s+computeDirection/);
  });

  it('Creep.ts defines updateDirectionalVisual method', () => {
    expect(creepRaw).toContain('updateDirectionalVisual');
  });

  it('documents correct BODY_HORIZ dimensions (30×18)', () => {
    expect(docRaw).toContain('BODY_HORIZ_W = 30');
    expect(docRaw).toContain('BODY_HORIZ_H = 18');
  });

  it('documents correct BODY_VERT dimensions (18×30)', () => {
    expect(docRaw).toContain('BODY_VERT_W');
    expect(docRaw).toContain('BODY_VERT_H');
  });

  it('codebase has matching BODY dimension constants', () => {
    expect(creepRaw).toMatch(/BODY_HORIZ_W\s*=\s*30/);
    expect(creepRaw).toMatch(/BODY_HORIZ_H\s*=\s*18/);
    expect(creepRaw).toMatch(/BODY_VERT_W\s*=\s*18/);
    expect(creepRaw).toMatch(/BODY_VERT_H\s*=\s*30/);
  });

  it('documents the rotation values (π/2 for down, -π/2 for up)', () => {
    expect(docRaw).toContain('+π/2');
    expect(docRaw).toContain('-π/2');
  });

  it('codebase uses Math.PI / 2 rotation for vertical directions', () => {
    expect(creepRaw).toContain('Math.PI / 2');
    expect(creepRaw).toContain('-Math.PI / 2');
  });

  it('documents flipX = true for left direction', () => {
    expect(docRaw).toMatch(/LEFT:\s+flipX\s*=\s*true/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Sprite inventory accuracy
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-118: research doc — sprite inventory', () => {
  const preloadedKeys = bootSceneTextureKeys().filter(
    k => k.startsWith('creep-') || k.startsWith('boss-'),
  );

  it('document sprite count matches BootScene preloaded creep/boss keys', () => {
    // Document says 13 are preloaded
    expect(docRaw).toContain('13 are preloaded in BootScene');
    expect(preloadedKeys.length).toBe(13);
  });

  it('document lists all preloaded sprite keys', () => {
    for (const key of preloadedKeys) {
      expect(docRaw).toContain(`\`${key}\``);
    }
  });

  it('document notes unloaded sprites (creep-boss, creep-boss-mini, creep-flying)', () => {
    expect(docRaw).toContain('creep-boss');
    expect(docRaw).toContain('creep-boss-mini');
    expect(docRaw).toContain('creep-flying');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Option A — key claims
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-118: research doc — Option A details', () => {
  it('describes the -vert texture key convention', () => {
    expect(docRaw).toContain('{key}-vert');
  });

  it('describes graceful fallback when -vert texture is absent', () => {
    expect(docRaw).toMatch(/fall\s*back/i);
  });

  it('mentions BootScene preload changes', () => {
    expect(docRaw).toContain('BootScene');
    expect(docRaw).toMatch(/preload.*-vert/is);
  });

  it('effort estimate is Small-Medium', () => {
    const optionASection = docRaw.split('## 3.')[0].split('## 2.')[1] || '';
    expect(optionASection).toContain('Small–Medium');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Option B — key claims
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-118: research doc — Option B details', () => {
  it('describes B1 (static per-direction frames) and B2 (animated) variants', () => {
    expect(docRaw).toContain('B1');
    expect(docRaw).toContain('B2');
  });

  it('describes spritesheet frame layout', () => {
    expect(docRaw).toMatch(/setFrame|spritesheet/i);
  });

  it('mentions buildVisuals change from Image to Sprite', () => {
    expect(docRaw).toContain('buildVisuals');
    expect(docRaw).toContain('Phaser.GameObjects.Sprite');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Option C — key claims
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-118: research doc — Option C details', () => {
  it('describes X-compression / narrow silhouette approach', () => {
    expect(docRaw).toMatch(/X-compression|scaleX|narrow silhouette/i);
  });

  it('mentions the 0.35 compression factor', () => {
    expect(docRaw).toContain('0.35');
  });

  it('mentions zero art requirement', () => {
    expect(docRaw).toMatch(/zero.*art|no.*new.*assets/i);
  });

  it('effort estimate is Small', () => {
    const optionCSection = docRaw.split('## 5.')[0].split('## 4.')[1] || '';
    expect(optionCSection).toContain('**Small**');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Asset pipeline section
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-118: research doc — asset pipeline', () => {
  it('describes current pipeline (PNGs in public/assets/sprites/)', () => {
    expect(docRaw).toContain('public/assets/sprites/');
  });

  it('lists pipeline additions per option in a table', () => {
    expect(docRaw).toContain('| Option | Pipeline additions |');
  });

  it('describes generation script considerations', () => {
    expect(docRaw).toMatch(/gen_creep|generation script/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Effort estimates section
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-118: research doc — effort estimates', () => {
  it('has a comparison table with Art, Code, Tests, Total columns', () => {
    expect(docRaw).toContain('| Option | Art | Code | Tests | Total |');
  });

  it('covers all four options (A, B1, B2, C)', () => {
    const effortSection = docRaw.split('## 7.')[0].split('## 6.')[1] || '';
    expect(effortSection).toContain('A (2-frame');
    expect(effortSection).toContain('B1 (static');
    expect(effortSection).toContain('B2 (animated');
    expect(effortSection).toContain('C (procedural');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Recommendation section
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-118: research doc — recommendation', () => {
  const recoSection = docRaw.split('## 7.')[1] || '';

  it('recommends Option C as short-term', () => {
    expect(recoSection).toContain('Option C');
    expect(recoSection).toMatch(/short.term/i);
  });

  it('recommends Option A as medium-term', () => {
    expect(recoSection).toContain('Option A');
    expect(recoSection).toMatch(/medium.term/i);
  });

  it('includes an ordered implementation plan', () => {
    expect(recoSection).toContain('implementation order');
    expect(recoSection).toMatch(/1\.\s+Ship/);
  });

  it('advises against Option B2 without a dedicated artist', () => {
    expect(recoSection).toMatch(/Do not pursue Option B2|not pursue.*B2/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. No implementation (research only)
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-118: research doc — no implementation', () => {
  it('document states no implementation yet', () => {
    expect(docRaw).toMatch(/no implementation/i);
  });

  it('Creep.ts does not contain -vert texture logic (not yet implemented)', () => {
    // Option A has not been implemented — just researched
    expect(creepRaw).not.toContain("'-vert'");
    expect(creepRaw).not.toMatch(/spriteKey.*-vert/);
  });
});
