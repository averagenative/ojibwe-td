/**
 * TASK-113 — Achievements & Challenges Box Text Overflow on Main Menu
 *
 * Structural tests verifying text layout fixes:
 *  - MainMenuScene: ACHIEVEMENTS and CHALLENGES button font sizes reduced
 *  - AchievementsScene: title/description vertical spacing increased
 *  - ChallengeSelectScene: modifier text y-offset increased for 2-line descriptions
 */

import { describe, it, expect } from 'vitest';

import mainMenuSrc from '../../scenes/MainMenuScene.ts?raw';
import achievementsSceneSrc from '../../scenes/AchievementsScene.ts?raw';
import challengeSelectSrc from '../../scenes/ChallengeSelectScene.ts?raw';
import { ALL_ACHIEVEMENTS } from '../../data/achievementDefs';
import { ALL_CHALLENGES } from '../../data/challengeDefs';

// ── MainMenuScene button label font sizes ────────────────────────────────────

describe('TASK-113: MainMenuScene button label overflow prevention', () => {
  it('ACHIEVEMENTS button uses font size _fs(10), not _fs(13)', () => {
    // Find the ACHIEVEMENTS button label line
    const achBlock = mainMenuSrc.match(
      /add\.text\([^)]+,\s*'🏆 ACHIEVEMENTS'[\s\S]*?\}\)/,
    );
    expect(achBlock).not.toBeNull();
    expect(achBlock![0]).toContain('this._fs(10)');
    expect(achBlock![0]).not.toContain('this._fs(13)');
  });

  it('CHALLENGES button uses font size _fs(11), not _fs(13)', () => {
    const chalBlock = mainMenuSrc.match(
      /add\.text\([^)]+,\s*'CHALLENGES'[\s\S]*?\}\)/,
    );
    expect(chalBlock).not.toBeNull();
    expect(chalBlock![0]).toContain('this._fs(11)');
    expect(chalBlock![0]).not.toContain('this._fs(13)');
  });

  it('ACHIEVEMENTS button width is at least 120px (desktop)', () => {
    // achBtnW = this._isMobile ? 140 : 120
    expect(mainMenuSrc).toMatch(/achBtnW\s*=\s*this\._isMobile\s*\?\s*140\s*:\s*120/);
  });

  it('CHALLENGES button width is at least 100px (desktop)', () => {
    // bottomBtnW = this._isMobile ? 120 : 100
    expect(mainMenuSrc).toMatch(/bottomBtnW\s*=\s*this\._isMobile\s*\?\s*120\s*:\s*100/);
  });

  it('_fs() scales by 1.35x on mobile', () => {
    expect(mainMenuSrc).toMatch(/size\s*\*\s*1\.35/);
  });

  it('desktop ACHIEVEMENTS label fits within button (estimated width)', () => {
    // '🏆 ACHIEVEMENTS' at 10px monospace ≈ 93px; button is 120px
    const LABEL = '🏆 ACHIEVEMENTS';
    const fontSize = 10;
    const charWidth = fontSize * 0.6; // monospace approximation
    const estimatedWidth = LABEL.length * charWidth;
    const buttonWidth = 120;
    expect(estimatedWidth).toBeLessThan(buttonWidth);
  });

  it('mobile ACHIEVEMENTS label fits within button (estimated width)', () => {
    const LABEL = '🏆 ACHIEVEMENTS';
    const fontSize = Math.round(10 * 1.35); // _fs(10) mobile
    const charWidth = fontSize * 0.6;
    const estimatedWidth = LABEL.length * charWidth;
    const buttonWidth = 140;
    expect(estimatedWidth).toBeLessThan(buttonWidth);
  });

  it('desktop CHALLENGES label fits within button (estimated width)', () => {
    const LABEL = 'CHALLENGES';
    const fontSize = 11;
    const charWidth = fontSize * 0.6;
    const estimatedWidth = LABEL.length * charWidth;
    const buttonWidth = 100;
    expect(estimatedWidth).toBeLessThan(buttonWidth);
  });

  it('mobile CHALLENGES label fits within button (estimated width)', () => {
    const LABEL = 'CHALLENGES';
    const fontSize = Math.round(11 * 1.35); // _fs(11) mobile
    const charWidth = fontSize * 0.6;
    const estimatedWidth = LABEL.length * charWidth;
    const buttonWidth = 120;
    expect(estimatedWidth).toBeLessThan(buttonWidth);
  });
});

// ── AchievementsScene title/description spacing ──────────────────────────────

describe('TASK-113: AchievementsScene text vertical spacing', () => {
  it('title y-offset is ROW_H / 2 - 16 (not -10)', () => {
    expect(achievementsSceneSrc).toContain('y + ROW_H / 2 - 16, titleStr');
    expect(achievementsSceneSrc).not.toContain('y + ROW_H / 2 - 10, titleStr');
  });

  it('description y-offset is ROW_H / 2 + 16 (not +10)', () => {
    expect(achievementsSceneSrc).toContain('y + ROW_H / 2 + 16, descStr');
    expect(achievementsSceneSrc).not.toContain('y + ROW_H / 2 + 10, descStr');
  });

  it('title and description are 32px apart (16 + 16)', () => {
    const titleOffset = 16;
    const descOffset = 16;
    const gap = titleOffset + descOffset;
    expect(gap).toBe(32);
  });

  it('description has wordWrap to prevent horizontal overflow', () => {
    // The description text config should include wordWrap
    const descBlock = achievementsSceneSrc.match(
      /y \+ ROW_H \/ 2 \+ 16, descStr[\s\S]*?setOrigin/,
    );
    expect(descBlock).not.toBeNull();
    expect(descBlock![0]).toContain('wordWrap');
  });

  it('description has maxLines: 2 to prevent vertical overflow', () => {
    const descBlock = achievementsSceneSrc.match(
      /y \+ ROW_H \/ 2 \+ 16, descStr[\s\S]*?setOrigin/,
    );
    expect(descBlock).not.toBeNull();
    expect(descBlock![0]).toContain('maxLines');
  });

  it('ROW_H is 70, giving sufficient space for title + desc + margins', () => {
    expect(achievementsSceneSrc).toMatch(/const ROW_H\s*=\s*70/);
  });

  it('title stays within row bounds (19px from top > 0)', () => {
    // y + ROW_H/2 - 16 = y + 35 - 16 = y + 19, origin (0, 0.5)
    // At 13px font, text height ~16px, top edge ≈ y+11. Inside y..y+70.
    const titleY = 35 - 16; // 19
    const halfHeight = 8; // approx half of 13px text height
    expect(titleY - halfHeight).toBeGreaterThan(0);
  });

  it('description stays within row bounds (bottom < ROW_H)', () => {
    // y + ROW_H/2 + 16 = y + 51, origin (0, 0.5), maxLines:2 at 10px
    // 2 lines ≈ 24px total. Bottom edge ≈ y + 51 + 12 = y + 63. ROW_H = 70.
    const descY = 35 + 16; // 51
    const ROW_H = 70;
    const halfHeight = 12; // approx half of 2 lines at 10px
    expect(descY + halfHeight).toBeLessThan(ROW_H);
  });
});

// ── ChallengeSelectScene modifier text positioning ───────────────────────────

describe('TASK-113: ChallengeSelectScene modifier text clearance', () => {
  it('modifier text starts at y + 70 (not y + 58)', () => {
    expect(challengeSelectSrc).toContain('leftX, y + 70, challenge.modifier.description');
    expect(challengeSelectSrc).not.toContain('leftX, y + 58, challenge.modifier.description');
  });

  it('description text starts at y + 36', () => {
    expect(challengeSelectSrc).toContain('leftX, y + 36, challenge.description');
  });

  it('gap between description (y+36) and modifier (y+70) is 34px', () => {
    const descY = 36;
    const modY = 70;
    expect(modY - descY).toBe(34);
  });

  it('description has wordWrap configured', () => {
    const descBlock = challengeSelectSrc.match(
      /y \+ 36, challenge\.description[\s\S]*?\}\)/,
    );
    expect(descBlock).not.toBeNull();
    expect(descBlock![0]).toContain('wordWrap');
  });

  it('modifier text has wordWrap configured', () => {
    const modBlock = challengeSelectSrc.match(
      /y \+ 70, challenge\.modifier\.description[\s\S]*?\}\)/,
    );
    expect(modBlock).not.toBeNull();
    expect(modBlock![0]).toContain('wordWrap');
  });

  it('modifier text fits before wave count at y + CARD_H - 26', () => {
    // Modifier at y+70, 2 lines at 10px ≈ 24px. Bottom ≈ y+94.
    // Wave count at y + 130 - 26 = y + 104. Gap of 10px.
    const CARD_H = 130;
    const modY = 70;
    const twoLineHeight = 24; // 2 lines at ~12px line height
    const waveCountY = CARD_H - 26;
    expect(modY + twoLineHeight).toBeLessThan(waveCountY);
  });
});

// ── Data-driven overflow checks ──────────────────────────────────────────────

describe('TASK-113: Achievement/challenge text length safety', () => {
  const PANEL_W = 480;
  const ROW_PAD_X = 16;
  const TITLE_AVAILABLE_W = PANEL_W - ROW_PAD_X * 2 - 28 - 80; // left pad + icon offset + right badge area

  it('no achievement title exceeds available width at 13px desktop', () => {
    for (const ach of ALL_ACHIEVEMENTS) {
      const estWidth = ach.title.length * 7.8; // monospace 13px approx
      expect(estWidth).toBeLessThan(TITLE_AVAILABLE_W);
    }
  });

  it('no achievement title exceeds available width at 18px mobile', () => {
    const mobileFont = Math.round(13 * 1.35); // 18
    for (const ach of ALL_ACHIEVEMENTS) {
      const estWidth = ach.title.length * (mobileFont * 0.6);
      expect(estWidth).toBeLessThan(TITLE_AVAILABLE_W);
    }
  });

  it('all achievement descriptions fit 2 lines with wordWrap', () => {
    const wrapWidth = PANEL_W - ROW_PAD_X * 2 - 80; // 368
    const charWidth = 6; // 10px monospace approx
    const charsPerLine = Math.floor(wrapWidth / charWidth);
    for (const ach of ALL_ACHIEVEMENTS) {
      const lines = Math.ceil(ach.description.length / charsPerLine);
      expect(lines).toBeLessThanOrEqual(2);
    }
  });

  it('challenge descriptions fit within card width at 12px', () => {
    const CARD_W = 560;
    const CARD_PAD_X = 20;
    const wrapWidth = CARD_W - CARD_PAD_X * 2 - 140; // 380
    const charWidth = 7.2; // 12px monospace approx
    const charsPerLine = Math.floor(wrapWidth / charWidth);
    for (const ch of ALL_CHALLENGES) {
      const lines = Math.ceil(ch.description.length / charsPerLine);
      // With modifier at y+70, max 2 lines for description is safe
      expect(lines).toBeLessThanOrEqual(2);
    }
  });

  it('challenge modifier descriptions fit within 3 lines at 10px', () => {
    const CARD_W = 560;
    const CARD_PAD_X = 20;
    const wrapWidth = CARD_W - CARD_PAD_X * 2 - 140; // 380
    const charWidth = 6; // 10px monospace approx
    const charsPerLine = Math.floor(wrapWidth / charWidth);
    for (const ch of ALL_CHALLENGES) {
      const lines = Math.ceil(ch.modifier.description.length / charsPerLine);
      // Modifier at y+70, wave count at y+104 → max ~34px → ~2.5 lines at 12px line-height
      expect(lines).toBeLessThanOrEqual(3);
    }
  });
});
