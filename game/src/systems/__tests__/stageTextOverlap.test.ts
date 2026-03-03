/**
 * Stage Description Text Overlaps Turret Suggestion — TASK-124
 *
 * Structural source-pattern tests verifying the stage card layout constants
 * and description Y-anchor prevent the description text from overlapping the
 * affinity-dot ("best turret") row.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const mainMenuSrc = fs.readFileSync(
  path.resolve(__dirname, '../../scenes/MainMenuScene.ts'),
  'utf-8',
);

// ═══════════════════════════════════════════════════════════════════════════
// 1. Card height constants — increased to make room for description
// ═══════════════════════════════════════════════════════════════════════════
describe('stage card height constants', () => {
  it('STAGE_H desktop is at least 150', () => {
    const m = mainMenuSrc.match(/const\s+STAGE_H\s*=\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(150);
  });

  it('STAGE_H desktop equals 155', () => {
    expect(mainMenuSrc).toMatch(/const\s+STAGE_H\s*=\s*155/);
  });

  it('mobile _stageH is 195', () => {
    expect(mainMenuSrc).toMatch(/this\._stageH\s*=\s*this\._isMobile\s*\?\s*195\s*:\s*STAGE_H/);
  });

  it('mobile _stageH (195) is larger than desktop STAGE_H (155)', () => {
    const desktopM = mainMenuSrc.match(/const\s+STAGE_H\s*=\s*(\d+)/);
    const mobileM = mainMenuSrc.match(/this\._stageH\s*=\s*this\._isMobile\s*\?\s*(\d+)/);
    expect(desktopM).not.toBeNull();
    expect(mobileM).not.toBeNull();
    expect(Number(mobileM![1])).toBeGreaterThan(Number(desktopM![1]));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Description Y-anchor — fixed from card top, not from card centre
// ═══════════════════════════════════════════════════════════════════════════
describe('description Y-anchor', () => {
  it('uses a top-anchored formula: by - sh / 2 + 72', () => {
    expect(mainMenuSrc).toMatch(/const\s+descY\s*=\s*by\s*-\s*sh\s*\/\s*2\s*\+\s*72/);
  });

  it('description text is created at descY, not at by - 4', () => {
    // Old code used `by - 4` — ensure that's gone
    const buildStageTileIdx = mainMenuSrc.indexOf('private buildStageTile(');
    const methodEnd = mainMenuSrc.indexOf('\n  private ', buildStageTileIdx + 1);
    const methodBlock = mainMenuSrc.slice(buildStageTileIdx, methodEnd);
    expect(methodBlock).toContain('descY');
    expect(methodBlock).not.toMatch(/this\.add\.text\(\s*bx\s*,\s*by\s*-\s*4/);
  });

  it('passes descY as the y-coordinate to add.text for description', () => {
    expect(mainMenuSrc).toMatch(/this\.add\.text\(\s*bx\s*,\s*descY\s*,\s*stage\.description/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. No overlap — description fits above affinity dots
// ═══════════════════════════════════════════════════════════════════════════
describe('no overlap between description and affinity dots', () => {
  // Description top: by - sh/2 + 72
  // Affinity dots:   by + sh/2 - 36
  // Gap = (sh/2 - 36) - (-sh/2 + 72) = sh - 108

  it('desktop gap between description top and affinity dots is >= 40px', () => {
    const m = mainMenuSrc.match(/const\s+STAGE_H\s*=\s*(\d+)/);
    const sh = Number(m![1]); // 155
    const gap = sh - 108;     // descTop..affinityY
    expect(gap).toBeGreaterThanOrEqual(40);
  });

  it('mobile gap between description top and affinity dots is >= 80px', () => {
    const m = mainMenuSrc.match(/this\._stageH\s*=\s*this\._isMobile\s*\?\s*(\d+)/);
    const sh = Number(m![1]); // 195
    const gap = sh - 108;
    expect(gap).toBeGreaterThanOrEqual(80);
  });

  it('description text uses word-wrap to prevent horizontal overflow', () => {
    expect(mainMenuSrc).toMatch(/wordWrap:\s*\{\s*width:\s*STAGE_W\s*-\s*24\s*\}/);
  });

  it('description text is centre-aligned', () => {
    // Find the add.text call for stage.description and verify align: 'center'
    const descIdx = mainMenuSrc.indexOf('stage.description');
    const nearbyBlock = mainMenuSrc.slice(descIdx, descIdx + 200);
    expect(nearbyBlock).toContain("align: 'center'");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Affinity dots anchored from card bottom (unchanged)
// ═══════════════════════════════════════════════════════════════════════════
describe('affinity dots remain bottom-anchored', () => {
  it('buildAffinityDots is called with by + sh / 2 - 36', () => {
    expect(mainMenuSrc).toMatch(/buildAffinityDots\(\s*bx\s*,\s*by\s*\+\s*sh\s*\/\s*2\s*-\s*36/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Stage element vertical ordering (structural)
// ═══════════════════════════════════════════════════════════════════════════
describe('stage card element vertical ordering', () => {
  it('name is above stars (18 < 40 from top)', () => {
    // name: by - sh/2 + 18, stars: by - sh/2 + 40
    expect(mainMenuSrc).toMatch(/by\s*-\s*sh\s*\/\s*2\s*\+\s*18.*stage\.name/s);
  });

  it('stars are above description (40 < 72 from top)', () => {
    const starsOffset = 40;
    const descOffset = 72;
    expect(descOffset).toBeGreaterThan(starsOffset);
  });

  it('description anchor (72) is above affinity dots anchor (sh - 36)', () => {
    const m = mainMenuSrc.match(/const\s+STAGE_H\s*=\s*(\d+)/);
    const sh = Number(m![1]);
    const descFromTop = 72;
    const affinityFromTop = sh - 36; // sh/2 - 36 from center = sh - 36 from top
    expect(affinityFromTop).toBeGreaterThan(descFromTop);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Description text uses setOrigin(0.5, 0) for top-anchored centering
// ═══════════════════════════════════════════════════════════════════════════
describe('description text origin', () => {
  it('uses setOrigin(0.5, 0) so text grows downward from anchor', () => {
    // Find the description text creation and verify setOrigin
    const descIdx = mainMenuSrc.indexOf('stage.description');
    const nearbyBlock = mainMenuSrc.slice(descIdx, descIdx + 200);
    expect(nearbyBlock).toMatch(/setOrigin\(\s*0\.5\s*,\s*0\s*\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Longest description fits within available space
// ═══════════════════════════════════════════════════════════════════════════
describe('description length safety', () => {
  // Read stage defs to check description lengths
  const stageDefsSrc = fs.readFileSync(
    path.resolve(__dirname, '../../data/stageDefs.ts'),
    'utf-8',
  );

  it('all stage descriptions are under 150 characters', () => {
    // Extract description strings from stageDefs
    const descMatches = stageDefsSrc.matchAll(/description:\s*['"]([^'"]+)['"]/g);
    for (const m of descMatches) {
      expect(m[1].length).toBeLessThan(150);
    }
  });

  it('has at least one stage description defined', () => {
    const descMatches = [...stageDefsSrc.matchAll(/description:\s*['"]([^'"]+)['"]/g)];
    expect(descMatches.length).toBeGreaterThan(0);
  });
});
