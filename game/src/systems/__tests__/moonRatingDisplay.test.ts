/**
 * Structural tests for MoonRatingDisplay.ts and its integration into
 * GameOverScene and MainMenuScene.
 *
 * MoonRatingDisplay requires Phaser (browser context) and cannot be
 * instantiated in a unit-test environment.  We verify correctness via
 * source-code structural checks using ?raw imports.
 */

import { describe, it, expect } from 'vitest';
import displaySrc     from '../../ui/MoonRatingDisplay.ts?raw';
import gameOverSrc    from '../../scenes/GameOverScene.ts?raw';
import mainMenuSrc    from '../../scenes/MainMenuScene.ts?raw';

// ── MoonRatingDisplay module ───────────────────────────────────────────────

describe('MoonRatingDisplay — exports', () => {
  it('exports renderMoonRating function', () => {
    expect(displaySrc).toContain('export function renderMoonRating');
  });

  it('exports MoonRatingOpts interface', () => {
    expect(displaySrc).toContain('export interface MoonRatingOpts');
  });
});

describe('MoonRatingDisplay — phase rendering', () => {
  it('has a drawing helper for empty/unearned slots (_drawEmpty)', () => {
    expect(displaySrc).toContain('_drawEmpty');
  });

  it('has a drawing helper for earned phases (_drawPhase)', () => {
    expect(displaySrc).toContain('_drawPhase');
  });

  it('handles all 5 phase indices (0-4)', () => {
    expect(displaySrc).toContain('case 0');
    expect(displaySrc).toContain('case 1');
    expect(displaySrc).toContain('case 2');
    expect(displaySrc).toContain('case 3');
    // Full moon is handled with phaseIndex === 4 guard
    expect(displaySrc).toContain('phaseIndex === 4');
  });

  it('draws crescent using a narrow ellipse on the left limb (phase 0)', () => {
    expect(displaySrc).toContain('fillEllipse');
  });

  it('draws half-moon using arc path (phase 2)', () => {
    expect(displaySrc).toContain('beginPath');
    expect(displaySrc).toContain('closePath');
    expect(displaySrc).toContain('fillPath');
    // Left semicircle: arc from 270° to 90° counterclockwise
    expect(displaySrc).toContain('Math.PI * 1.5');
    expect(displaySrc).toContain('Math.PI * 0.5');
  });

  it('draws full moon with warm colour (phase 4)', () => {
    // Warm white-gold constant
    expect(displaySrc).toContain('0xfff8e0');
  });

  it('draws gibbous as lit disc with dark shadow strip on right (phase 3)', () => {
    // Phase 3 must have case 3, fill a full circle, then overlay shadow
    const case3Block = displaySrc.slice(displaySrc.indexOf('case 3'));
    expect(case3Block).toContain('fillCircle');
    expect(case3Block).toContain('fillEllipse');
  });
});

describe('MoonRatingDisplay — options', () => {
  it('supports radius option', () => {
    expect(displaySrc).toContain('opts.radius');
  });

  it('supports gap option', () => {
    expect(displaySrc).toContain('opts.gap');
  });

  it('supports animate option for shimmer pulse', () => {
    expect(displaySrc).toContain('opts.animate');
    expect(displaySrc).toContain('Sine.easeInOut');
  });

  it('supports stagger option for fill-in animation', () => {
    expect(displaySrc).toContain('opts.stagger');
    // Stagger uses 200 ms between moons
    expect(displaySrc).toContain('200');
  });

  it('supports depth option', () => {
    expect(displaySrc).toContain('opts.depth');
    expect(displaySrc).toContain('setDepth');
  });

  it('full-moon glow is rendered when earned >= 5', () => {
    expect(displaySrc).toContain('earned >= 5');
  });

  it('pulse delay accounts for stagger completing before starting', () => {
    expect(displaySrc).toContain('pulseDelay');
  });
});

describe('MoonRatingDisplay — colour palette', () => {
  it('uses silvery white for earned slots', () => {
    expect(displaySrc).toContain('0xdde8f0');
  });

  it('uses dark blue-grey for shadow region', () => {
    expect(displaySrc).toContain('0x162535');
  });

  it('uses dark grey-blue for unearned slots', () => {
    expect(displaySrc).toContain('0x1e2c3c');
  });

  it('uses warm white for full moon', () => {
    expect(displaySrc).toContain('0xfff8e0');
  });
});

// ── GameOverScene integration ──────────────────────────────────────────────

describe('GameOverScene — moon rating integration', () => {
  it('imports renderMoonRating from MoonRatingDisplay', () => {
    expect(gameOverSrc).toContain("from '../ui/MoonRatingDisplay'");
    expect(gameOverSrc).toContain('renderMoonRating');
  });

  it('no longer imports moonSymbol', () => {
    expect(gameOverSrc).not.toContain('moonSymbol');
  });

  it('calls renderMoonRating with stagger:true for reveal animation', () => {
    expect(gameOverSrc).toContain('stagger: true');
  });

  it('calls renderMoonRating with animate:true for shimmer', () => {
    expect(gameOverSrc).toContain('animate: true');
  });

  it('passes earned moon count to renderMoonRating', () => {
    expect(gameOverSrc).toContain('renderMoonRating(this, cx');
    expect(gameOverSrc).toContain('moonsEarned');
  });

  it('still shows the moonRatingLabel text beneath the icons', () => {
    expect(gameOverSrc).toContain('moonRatingLabel');
  });
});

// ── MainMenuScene integration ──────────────────────────────────────────────

describe('MainMenuScene — stage card moon integration', () => {
  it('imports renderMoonRating from MoonRatingDisplay', () => {
    expect(mainMenuSrc).toContain("from '../ui/MoonRatingDisplay'");
    expect(mainMenuSrc).toContain('renderMoonRating');
  });

  it('no longer imports moonSymbol', () => {
    expect(mainMenuSrc).not.toContain('moonSymbol');
  });

  it('renders moons only when bestMoons > 0', () => {
    expect(mainMenuSrc).toContain('bestMoons > 0');
  });

  it('adds the moon Container to the created array for cleanup', () => {
    expect(mainMenuSrc).toContain('moonContainer');
    expect(mainMenuSrc).toContain('created.push(moonContainer)');
  });

  it('uses a smaller radius on stage cards than GameOverScene', () => {
    // Stage cards use radius 5/6; GameOverScene uses 9/11
    expect(mainMenuSrc).toContain('moonR');
    // Verify both radii are small (5 or 6)
    expect(mainMenuSrc).toMatch(/moonR\s*=\s*this\._isMobile\s*\?\s*6\s*:\s*5/);
  });

  it('passes gap option for compact spacing', () => {
    expect(mainMenuSrc).toContain('moonGap');
    expect(mainMenuSrc).toContain('gap: moonGap');
  });

  it('passes depth so moons sit above stage card background', () => {
    expect(mainMenuSrc).toContain('DEPTH_STAGE + 1');
  });
});

// ── Edge cases & boundary conditions ──────────────────────────────────────

describe('MoonRatingDisplay — edge cases', () => {
  it('earned=0 draws no lit graphics (all slots empty)', () => {
    // When earned is 0, isEarned is always false → litGraphics stays empty
    // The stagger and animate blocks both guard on litGraphics.length > 0
    expect(displaySrc).toContain('const isEarned = i < earned');
    expect(displaySrc).toContain('litGraphics.length > 0');
  });

  it('earned >= total draws all slots as lit (no empty moons)', () => {
    // For i=0..4 with earned=5: isEarned = (i < 5) = true for all
    expect(displaySrc).toContain('i < earned');
  });

  it('full-moon glow only appears when earned >= 5', () => {
    // Glow guard is strict: earned >= 5 (not earned >= total)
    expect(displaySrc).toContain('earned >= 5');
    expect(displaySrc).toContain('fillCircle(fullCx, 0, r + Math.round(r * 0.6))');
  });

  it('stagger sets initial alpha to 0 before tween reveal', () => {
    // Stagger moons start invisible and fade in
    expect(displaySrc).toContain('stagger ? 0 : 1');
  });

  it('stagger delay starts at 400ms with 200ms between moons', () => {
    expect(displaySrc).toContain('delay:    400 + idx * 200');
  });

  it('shimmer pulse waits for stagger to complete before starting', () => {
    // pulseDelay = stagger ? 400 + litGraphics.length * 200 + 300 : 0
    expect(displaySrc).toContain('400 + litGraphics.length * 200 + 300');
  });

  it('shimmer pulse uses yoyo for continuous oscillation', () => {
    expect(displaySrc).toContain('yoyo:     true');
    expect(displaySrc).toContain('repeat:   -1');
  });
});

describe('MoonRatingDisplay — defaults', () => {
  it('default radius is 8', () => {
    expect(displaySrc).toContain('opts.radius  ?? 8');
  });

  it('default gap is computed from radius (r * 2.8)', () => {
    expect(displaySrc).toContain('opts.gap     ?? Math.round(r * 2.8)');
  });

  it('default total is 5', () => {
    // Function signature: total = 5
    expect(displaySrc).toMatch(/total\s*=\s*5/);
  });

  it('default animate is false', () => {
    expect(displaySrc).toContain('opts.animate ?? false');
  });

  it('default stagger is false', () => {
    expect(displaySrc).toContain('opts.stagger ?? false');
  });
});

describe('MoonRatingDisplay — layout geometry', () => {
  it('centres the row horizontally (startX = -totalW / 2)', () => {
    expect(displaySrc).toContain('const startX = -totalW / 2');
  });

  it('totalW spans (total - 1) gaps', () => {
    expect(displaySrc).toContain('(total - 1) * gap');
  });

  it('creates a Phaser Container at the specified (x, y) position', () => {
    expect(displaySrc).toContain('scene.add.container(x, y)');
  });

  it('returns the container for caller to manage', () => {
    expect(displaySrc).toContain('return container');
  });
});

describe('MoonRatingDisplay — phase drawing correctness', () => {
  it('phases 0–3 draw shadow base disc before lit overlay', () => {
    // Shadow base is drawn before the switch block
    const phaseSection = displaySrc.slice(displaySrc.indexOf('Shadow base disc'));
    expect(phaseSection).toContain('COLOR_SHADOW');
    expect(phaseSection).toContain('fillCircle');
  });

  it('all phases 0–3 finish with an earned outline ring', () => {
    // After the switch block in _drawPhase, OUTLINE_EARNED + strokeCircle is drawn
    // Find the section between "case 3" (last case) and the end of _drawPhase
    const case3Idx = displaySrc.indexOf('case 3');
    const afterCase3 = displaySrc.slice(case3Idx);
    expect(afterCase3).toContain('OUTLINE_EARNED');
    expect(afterCase3).toContain('strokeCircle');
  });

  it('empty slot draws fill circle + faint outline stroke', () => {
    expect(displaySrc).toContain('COLOR_EMPTY');
    expect(displaySrc).toContain('OUTLINE_EMPTY');
  });

  it('full moon (phase 4) returns early without shadow base', () => {
    // Phase 4 branch has its own fillCircle + strokeCircle + return
    const fullBlock = displaySrc.slice(
      displaySrc.indexOf('phaseIndex === 4'),
      displaySrc.indexOf('Shadow base disc'),
    );
    expect(fullBlock).toContain('COLOR_FULL');
    expect(fullBlock).toContain('return');
  });

  it('quarter moon (phase 1) uses a wider ellipse than crescent', () => {
    // Case 0 uses r * 0.68 width; case 1 uses r * 1.4 width
    expect(displaySrc).toContain('r * 0.68');
    expect(displaySrc).toContain('r * 1.4');
  });
});
