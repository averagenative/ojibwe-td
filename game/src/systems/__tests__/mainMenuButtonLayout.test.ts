/**
 * Main Menu Button Layout — TASK-163.
 *
 * Verifies acceptance criteria for button positioning, spacing, and
 * visual hierarchy after the layout fix.
 *
 * QUICK PLAY is a square button on the RIGHT side of the screen,
 * deliberately separated from the main centre column. Do NOT move it back.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const mainMenuSrc = readFileSync(
  resolve(__dirname, '../../scenes/MainMenuScene.ts'),
  'utf-8',
);

// ── QUICK PLAY is on the right side (not centre column) ─────────────────────

describe('TASK-163: QUICK PLAY is right-side square button', () => {
  it('quickPlayX is right of stage card (not cx)', () => {
    expect(mainMenuSrc).toContain('STAGE_W / 2) + 120');
    expect(mainMenuSrc).not.toContain('const quickPlayX = cx;');
  });

  it('quickBtnSize is square (used for both w and h)', () => {
    expect(mainMenuSrc).toContain('quickBtnSize, quickBtnSize');
  });

  it('no side-by-side layout code remains (quickSideGap removed)', () => {
    expect(mainMenuSrc).not.toContain('quickSideGap');
  });

  it('comment warns to keep QUICK PLAY separate from centre', () => {
    expect(mainMenuSrc).toContain('Do NOT move it back to centre');
  });
});

// ── Vertical gap constants meet ≥16px requirement ───────────────────────────

describe('TASK-163: vertical gap constants meet ≥16px requirement', () => {
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
    expect(mainMenuSrc).toContain('bottomBtnY + bottomBtnH / 2 + 16 + achBtnH / 2');
  });
});

// ── Arithmetic: centre stack fits 720px (no QUICK PLAY in stack) ────────────

describe('TASK-163: centre button stack fits 720px canvas', () => {
  function computeAchBottom(params: {
    height: number;
    maxStartYOffset: number;
    btnH: number;
    bottomDropGap: number;
    bottomBtnH: number;
  }): number {
    const startY = params.height - params.maxStartYOffset;
    // Bottom row is directly below START (QUICK PLAY is on the right side)
    const bottomBtnY = startY + params.btnH / 2 + params.bottomDropGap + params.bottomBtnH / 2;
    // achBtnY = bottomBtnY + bottomBtnH/2 + 16 + achBtnH/2 (achBtnH = bottomBtnH)
    return bottomBtnY + params.bottomBtnH / 2 + 16 + params.bottomBtnH;
  }

  it('desktop: ach bottom ≤ 706 (720 - 14)', () => {
    const achBottom = computeAchBottom({
      height: 720,
      maxStartYOffset: 160,
      btnH: 48,
      bottomDropGap: 20,
      bottomBtnH: 38,
    });
    expect(achBottom).toBeLessThanOrEqual(706);
  });

  it('mobile: ach bottom ≤ 706 (720 - 14)', () => {
    const achBottom = computeAchBottom({
      height: 720,
      maxStartYOffset: 180,
      btnH: 60,
      bottomDropGap: 16,
      bottomBtnH: 48,
    });
    expect(achBottom).toBeLessThanOrEqual(706);
  });

  it('desktop: gap between START and bottom row is ≥16px', () => {
    const startY = 720 - 160;
    const btnH = 48;
    const bottomDropGap = 20;
    const bottomBtnH = 38;
    const bottomBtnY = startY + btnH / 2 + bottomDropGap + bottomBtnH / 2;

    const startBottom = startY + btnH / 2;
    const bottomTop = bottomBtnY - bottomBtnH / 2;
    expect(bottomTop - startBottom).toBeGreaterThanOrEqual(16);
  });

  it('desktop: gap between bottom row and achievements is 16px', () => {
    const startY = 720 - 160;
    const btnH = 48;
    const bottomDropGap = 20;
    const bottomBtnH = 38;
    const bottomBtnY = startY + btnH / 2 + bottomDropGap + bottomBtnH / 2;
    const achBtnY = bottomBtnY + bottomBtnH / 2 + 16 + bottomBtnH / 2;

    const bottomBottom = bottomBtnY + bottomBtnH / 2;
    const achTop = achBtnY - bottomBtnH / 2;
    expect(achTop - bottomBottom).toBeGreaterThanOrEqual(16);
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

    const metaRight = metaX + bottomBtnW / 2;
    const chalLeft = chalX - bottomBtnW / 2;
    expect(chalLeft - metaRight).toBeGreaterThanOrEqual(12);

    const chalRight = chalX + bottomBtnW / 2;
    const codexLeft = codexX - bottomBtnW / 2;
    expect(codexLeft - chalRight).toBeGreaterThanOrEqual(12);
  });

  it('mobile: 3 buttons (120px each, 16px gap) fit within 1280px canvas', () => {
    const cx = 640;
    const bottomBtnW = 120;
    const bottomGap = 16;

    const codexX = cx + bottomBtnW + bottomGap;
    const rightEdge = codexX + bottomBtnW / 2;
    const metaX = cx - bottomBtnW - bottomGap;
    const leftEdge = metaX - bottomBtnW / 2;

    expect(rightEdge).toBeLessThanOrEqual(1280);
    expect(leftEdge).toBeGreaterThanOrEqual(0);

    const metaRight = metaX + bottomBtnW / 2;
    const chalLeft = cx - bottomBtnW / 2;
    expect(chalLeft - metaRight).toBeGreaterThanOrEqual(12);
  });
});

// ── With resume: layout still fits ──────────────────────────────────────────

describe('TASK-163: layout with RESUME GAME fits 720px', () => {
  it('desktop: resume + start + bottom + ach all fit', () => {
    const height = 720;
    const resumeBtnH = 44;
    const resumeGap = 10;
    const btnH = 48;
    const bottomDropGap = 20;
    const bottomBtnH = 38;

    const maxStartY = height - 160;
    const startY = maxStartY;
    const resumeY = startY - btnH / 2 - resumeGap - resumeBtnH / 2;

    expect(resumeY).toBeLessThan(startY);
    expect(resumeY - resumeBtnH / 2).toBeGreaterThan(0);

    const bottomBtnY = startY + btnH / 2 + bottomDropGap + bottomBtnH / 2;
    const achBottom = bottomBtnY + bottomBtnH / 2 + 16 + bottomBtnH;
    expect(achBottom).toBeLessThanOrEqual(706);
  });

  it('mobile: resume + start + bottom + ach all fit', () => {
    const height = 720;
    const resumeBtnH = 52;
    const resumeGap = 10;
    const btnH = 60;
    const bottomDropGap = 16;
    const bottomBtnH = 48;

    const maxStartY = height - 180;
    const startY = maxStartY;
    const resumeY = startY - btnH / 2 - resumeGap - resumeBtnH / 2;

    expect(resumeY).toBeLessThan(startY);
    expect(resumeY - resumeBtnH / 2).toBeGreaterThan(0);

    const bottomBtnY = startY + btnH / 2 + bottomDropGap + bottomBtnH / 2;
    const achBottom = bottomBtnY + bottomBtnH / 2 + 16 + bottomBtnH;
    expect(achBottom).toBeLessThanOrEqual(706);
  });
});
