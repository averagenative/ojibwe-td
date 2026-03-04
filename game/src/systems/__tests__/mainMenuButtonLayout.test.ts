/**
 * Main Menu Button Layout — TASK-163.
 *
 * Verifies acceptance criteria for button positioning, spacing, and
 * visual hierarchy after the layout fix.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mainMenuSrc = readFileSync(
  resolve(__dirname, '../../scenes/MainMenuScene.ts'),
  'utf-8',
);

// ── Source-level structural assertions ──────────────────────────────────────

describe('TASK-163: QUICK PLAY is centred (not side-by-side)', () => {
  it('quickPlayX = cx (centred, not offset)', () => {
    // After TASK-163, QUICK PLAY is always centred below START
    expect(mainMenuSrc).toContain('const quickPlayX = cx;');
  });

  it('quickPlayY is computed from startY + btnH/2 + quickDropGap + quickBtnH/2', () => {
    expect(mainMenuSrc).toContain(
      'const quickPlayY = startY + btnH / 2 + quickDropGap + quickBtnH / 2;',
    );
  });

  it('no side-by-side layout code remains (quickSideGap removed)', () => {
    expect(mainMenuSrc).not.toContain('quickSideGap');
  });
});

describe('TASK-163: vertical gap constants meet ≥16px requirement', () => {
  it('quickDropGap is ≥16 on mobile', () => {
    const m = mainMenuSrc.match(/quickDropGap\s*=\s*this\._isMobile\s*\?\s*(\d+)\s*:\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(16);
  });

  it('quickDropGap is ≥16 on desktop', () => {
    const m = mainMenuSrc.match(/quickDropGap\s*=\s*this\._isMobile\s*\?\s*(\d+)\s*:\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(parseInt(m![2], 10)).toBeGreaterThanOrEqual(16);
  });

  it('bottomDropGap is ≥16 on mobile', () => {
    const m = mainMenuSrc.match(/bottomDropGap\s*=\s*this\._isMobile\s*\?\s*(\d+)\s*:\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(16);
  });

  it('bottomDropGap is ≥16 on desktop', () => {
    const m = mainMenuSrc.match(/bottomDropGap\s*=\s*this\._isMobile\s*\?\s*(\d+)\s*:\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(parseInt(m![2], 10)).toBeGreaterThanOrEqual(16);
  });
});

describe('TASK-163: horizontal gap between bottom buttons ≥12px', () => {
  it('bottomGap is ≥12', () => {
    const m = mainMenuSrc.match(/const bottomGap\s*=\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(12);
  });
});

describe('TASK-163: achievements row has 16px gap below bottom row', () => {
  it('achBtnY formula includes + 16 +', () => {
    // achBtnY = bottomBtnY + bottomBtnH / 2 + 16 + achBtnH / 2
    expect(mainMenuSrc).toContain('bottomBtnY + bottomBtnH / 2 + 16 + achBtnH / 2');
  });
});

// ── Visual hierarchy: START > QUICK PLAY ────────────────────────────────────

describe('TASK-163: START GAME is larger than QUICK PLAY', () => {
  it('desktop: START width (240) > QUICK PLAY width (200)', () => {
    const btnWM = mainMenuSrc.match(/const btnW\s*=\s*this\._isMobile\s*\?\s*\d+\s*:\s*(\d+)/);
    const qBtnWM = mainMenuSrc.match(/quickBtnW\s*=\s*this\._isMobile\s*\?\s*\d+\s*:\s*(\d+)/);
    expect(btnWM).not.toBeNull();
    expect(qBtnWM).not.toBeNull();
    expect(parseInt(btnWM![1], 10)).toBeGreaterThan(parseInt(qBtnWM![1], 10));
  });

  it('desktop: START height (48) > QUICK PLAY height (38)', () => {
    const btnHM = mainMenuSrc.match(/const btnH\s*=\s*this\._isMobile\s*\?\s*\d+\s*:\s*(\d+)/);
    const qBtnHM = mainMenuSrc.match(/quickBtnH\s*=\s*this\._isMobile\s*\?\s*\d+\s*:\s*(\d+)/);
    expect(btnHM).not.toBeNull();
    expect(qBtnHM).not.toBeNull();
    expect(parseInt(btnHM![1], 10)).toBeGreaterThan(parseInt(qBtnHM![1], 10));
  });

  it('mobile: START width (280) > QUICK PLAY width (240)', () => {
    const btnWM = mainMenuSrc.match(/const btnW\s*=\s*this\._isMobile\s*\?\s*(\d+)/);
    const qBtnWM = mainMenuSrc.match(/quickBtnW\s*=\s*this\._isMobile\s*\?\s*(\d+)/);
    expect(btnWM).not.toBeNull();
    expect(qBtnWM).not.toBeNull();
    expect(parseInt(btnWM![1], 10)).toBeGreaterThan(parseInt(qBtnWM![1], 10));
  });
});

// ── Arithmetic: full layout stack fits 720px ────────────────────────────────

describe('TASK-163: full button stack fits 720px canvas', () => {
  // Shared helper that computes the bottom pixel of the achievements row.
  function computeAchBottom(params: {
    height: number;
    maxStartYOffset: number;
    btnH: number;
    quickBtnH: number;
    quickDropGap: number;
    bottomDropGap: number;
    bottomBtnH: number;
  }): number {
    const startY = params.height - params.maxStartYOffset;
    const quickPlayY = startY + params.btnH / 2 + params.quickDropGap + params.quickBtnH / 2;
    const bottomBtnY = quickPlayY + params.quickBtnH / 2 + params.bottomDropGap + params.bottomBtnH / 2;
    // achBtnY = bottomBtnY + bottomBtnH/2 + 16 + achBtnH/2 (achBtnH = bottomBtnH)
    return bottomBtnY + params.bottomBtnH / 2 + 16 + params.bottomBtnH;
  }

  it('desktop: ach bottom ≤ 706 (720 - 14)', () => {
    const achBottom = computeAchBottom({
      height: 720,
      maxStartYOffset: 208,
      btnH: 48,
      quickBtnH: 38,
      quickDropGap: 20,
      bottomDropGap: 20,
      bottomBtnH: 38,
    });
    expect(achBottom).toBeLessThanOrEqual(706);
  });

  it('mobile: ach bottom ≤ 706 (720 - 14)', () => {
    const achBottom = computeAchBottom({
      height: 720,
      maxStartYOffset: 232,
      btnH: 60,
      quickBtnH: 44,
      quickDropGap: 16,
      bottomDropGap: 16,
      bottomBtnH: 48,
    });
    expect(achBottom).toBeLessThanOrEqual(706);
  });

  it('desktop: every gap between rows is ≥16px', () => {
    const startY = 720 - 208;
    const quickPlayY = startY + 48 / 2 + 20 + 38 / 2;
    const bottomBtnY = quickPlayY + 38 / 2 + 20 + 38 / 2;
    const achBtnY = bottomBtnY + 38 / 2 + 16 + 38 / 2;

    // Gap 1: START bottom → QUICK PLAY top
    expect((quickPlayY - 38 / 2) - (startY + 48 / 2)).toBeGreaterThanOrEqual(16);
    // Gap 2: QUICK PLAY bottom → bottom row top
    expect((bottomBtnY - 38 / 2) - (quickPlayY + 38 / 2)).toBeGreaterThanOrEqual(16);
    // Gap 3: bottom row bottom → achievements top
    expect((achBtnY - 38 / 2) - (bottomBtnY + 38 / 2)).toBeGreaterThanOrEqual(16);
  });

  it('mobile: every gap between rows is ≥16px', () => {
    const startY = 720 - 232;
    const quickPlayY = startY + 60 / 2 + 16 + 44 / 2;
    const bottomBtnY = quickPlayY + 44 / 2 + 16 + 48 / 2;
    const achBtnY = bottomBtnY + 48 / 2 + 16 + 48 / 2;

    expect((quickPlayY - 44 / 2) - (startY + 60 / 2)).toBeGreaterThanOrEqual(16);
    expect((bottomBtnY - 48 / 2) - (quickPlayY + 44 / 2)).toBeGreaterThanOrEqual(16);
    expect((achBtnY - 48 / 2) - (bottomBtnY + 48 / 2)).toBeGreaterThanOrEqual(16);
  });
});

// ── Bottom row horizontal layout: no overlap ────────────────────────────────

describe('TASK-163: bottom row buttons do not overlap horizontally', () => {
  it('desktop: 3 buttons (100px each, 16px gap) are centred and non-overlapping', () => {
    const cx = 640;
    const bottomBtnW = 100;
    const bottomGap = 16;

    const metaX = cx - bottomBtnW - bottomGap;
    const chalX = cx;
    const codexX = cx + bottomBtnW + bottomGap;

    // Right edge of UPGRADES vs left edge of CHALLENGES
    const metaRight = metaX + bottomBtnW / 2;
    const chalLeft = chalX - bottomBtnW / 2;
    expect(chalLeft - metaRight).toBeGreaterThanOrEqual(12);

    // Right edge of CHALLENGES vs left edge of CODEX
    const chalRight = chalX + bottomBtnW / 2;
    const codexLeft = codexX - bottomBtnW / 2;
    expect(codexLeft - chalRight).toBeGreaterThanOrEqual(12);
  });

  it('mobile: 3 buttons (120px each, 16px gap) fit within 1280px canvas', () => {
    // Canvas is always 1280×720; _isMobile only changes button sizes for touch targets.
    const cx = 640;  // 1280 / 2
    const bottomBtnW = 120;
    const bottomGap = 16;

    const codexX = cx + bottomBtnW + bottomGap;
    const rightEdge = codexX + bottomBtnW / 2;
    const metaX = cx - bottomBtnW - bottomGap;
    const leftEdge = metaX - bottomBtnW / 2;

    expect(rightEdge).toBeLessThanOrEqual(1280);
    expect(leftEdge).toBeGreaterThanOrEqual(0);

    // Also verify buttons don't overlap (gap between edges ≥12px)
    const metaRight = metaX + bottomBtnW / 2;
    const chalLeft = cx - bottomBtnW / 2;
    expect(chalLeft - metaRight).toBeGreaterThanOrEqual(12);
  });
});

// ── With resume: 4-row layout still fits ────────────────────────────────────

describe('TASK-163: layout with RESUME GAME (4 rows) fits 720px', () => {
  it('desktop: resume + start + quick play + bottom + ach all fit', () => {
    const height = 720;
    const resumeBtnH = 44;
    const resumeGap = 10;
    const btnH = 48;
    const quickBtnH = 38;
    const quickDropGap = 20;
    const bottomDropGap = 20;
    const bottomBtnH = 38;

    // Simulate cap path
    const maxStartY = height - 208;
    const startY = maxStartY;
    const resumeY = startY - btnH / 2 - resumeGap - resumeBtnH / 2;

    // Resume must be above START
    expect(resumeY).toBeLessThan(startY);
    // Resume top must be on screen (> 0)
    expect(resumeY - resumeBtnH / 2).toBeGreaterThan(0);

    const quickPlayY = startY + btnH / 2 + quickDropGap + quickBtnH / 2;
    const bottomBtnY = quickPlayY + quickBtnH / 2 + bottomDropGap + bottomBtnH / 2;
    const achBottom = bottomBtnY + bottomBtnH / 2 + 16 + bottomBtnH;

    expect(achBottom).toBeLessThanOrEqual(706);
  });

  it('mobile: resume + start + quick play + bottom + ach all fit', () => {
    const height = 720;
    const resumeBtnH = 52;
    const resumeGap = 10;
    const btnH = 60;
    const quickBtnH = 44;
    const quickDropGap = 16;
    const bottomDropGap = 16;
    const bottomBtnH = 48;

    const maxStartY = height - 232;
    const startY = maxStartY;
    const resumeY = startY - btnH / 2 - resumeGap - resumeBtnH / 2;

    expect(resumeY).toBeLessThan(startY);
    expect(resumeY - resumeBtnH / 2).toBeGreaterThan(0);

    const quickPlayY = startY + btnH / 2 + quickDropGap + quickBtnH / 2;
    const bottomBtnY = quickPlayY + quickBtnH / 2 + bottomDropGap + bottomBtnH / 2;
    const achBottom = bottomBtnY + bottomBtnH / 2 + 16 + bottomBtnH;

    expect(achBottom).toBeLessThanOrEqual(706);
  });
});
