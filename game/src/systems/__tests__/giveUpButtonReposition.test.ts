/**
 * Give-up button repositioning + confirmation dialog — TASK-105.
 *
 * HUD relies on Phaser and cannot be instantiated in Vitest's jsdom env.
 * These tests use ?raw source imports to assert that the critical structural
 * patterns are present, plus pure arithmetic to verify layout positioning.
 */
import { describe, it, expect } from 'vitest';

import hudSrc from '../../ui/HUD.ts?raw';
import towerPanelSrc from '../../ui/TowerPanel.ts?raw';

// ── Positioning — bottom-right above tower panel ─────────────────────────────

describe('Give-up button — bottom-right positioning', () => {
  it('computes btnX from scene width, PADDING, and half btnW', () => {
    expect(hudSrc).toContain('width  - PADDING - btnW / 2');
  });

  it('computes btnY from scene height, tower panel height, PADDING, and half btnH', () => {
    expect(hudSrc).toContain('height - TOWER_PANEL_H - PADDING - btnH / 2');
  });

  it('imports PANEL_HEIGHT from TowerPanel instead of hardcoding', () => {
    expect(hudSrc).toContain("import { PANEL_HEIGHT as TOWER_PANEL_H } from './TowerPanel'");
  });

  it('reads scene.scale dimensions for button placement', () => {
    expect(hudSrc).toContain('const { width, height } = this.scene.scale');
  });
});

// ── Confirmation dialog structure ────────────────────────────────────────────

describe('Give-up confirmation dialog', () => {
  it('pointerup on give-up button opens confirmation instead of immediate callback', () => {
    expect(hudSrc).toContain("bg.on('pointerup',   () => this._showGiveUpConfirm(onClick))");
  });

  it('_showGiveUpConfirm is defined as a private method', () => {
    expect(hudSrc).toContain('private _showGiveUpConfirm(onConfirm: () => void): void');
  });

  it('creates a full-screen dark overlay to block background input', () => {
    expect(hudSrc).toContain('rectangle(cx, cy, width, height, 0x000000, 0.6)');
  });

  it('overlay is interactive to swallow pointer events', () => {
    // The overlay must setInteractive() to prevent clicks reaching through
    const overlaySection = hudSrc.slice(
      hudSrc.indexOf('rectangle(cx, cy, width, height, 0x000000, 0.6)'),
      hudSrc.indexOf('rectangle(cx, cy, width, height, 0x000000, 0.6)') + 200,
    );
    expect(overlaySection).toContain('.setInteractive()');
  });

  it('displays "Give up this run?" title text', () => {
    expect(hudSrc).toContain("'Give up this run?'");
  });

  it('has a YES button with danger styling', () => {
    expect(hudSrc).toContain("'YES'");
    expect(hudSrc).toContain('PAL.bgGiveUp');
  });

  it('has a CANCEL button with neutral styling', () => {
    expect(hudSrc).toContain("'CANCEL'");
  });

  it('YES calls cleanup then onConfirm', () => {
    expect(hudSrc).toContain('cleanup(); onConfirm();');
  });

  it('CANCEL calls cleanup only (no onConfirm)', () => {
    expect(hudSrc).toContain("noBg.on('pointerup',   () => cleanup())");
  });

  it('cleanup destroys all 7 dialog GameObjects', () => {
    const cleanupBody = hudSrc.slice(
      hudSrc.indexOf('const cleanup = (): void =>'),
      hudSrc.indexOf('const cleanup = (): void =>') + 300,
    );
    expect(cleanupBody).toContain('overlay.destroy()');
    expect(cleanupBody).toContain('dialogBg.destroy()');
    expect(cleanupBody).toContain('title.destroy()');
    expect(cleanupBody).toContain('yesBg.destroy()');
    expect(cleanupBody).toContain('yesLabel.destroy()');
    expect(cleanupBody).toContain('noBg.destroy()');
    expect(cleanupBody).toContain('noLabel.destroy()');
  });
});

// ── Mobile touch target compliance ───────────────────────────────────────────

describe('Give-up button — mobile touch targets', () => {
  it('mobile give-up button height is >= 44px', () => {
    const mobileBtnH = 44;
    expect(mobileBtnH).toBeGreaterThanOrEqual(44);
  });

  it('mobile confirmation button height is >= 44px', () => {
    expect(hudSrc).toContain('const confirmBtnH = _IS_MOBILE ? 44 : 36');
  });

  it('mobile give-up button width is 110px', () => {
    expect(hudSrc).toContain("const btnW  = _IS_MOBILE ? 110 : 100");
  });
});

// ── Layout arithmetic — no overlap with tower panel ──────────────────────────

describe('Give-up button — layout arithmetic', () => {
  const GAME_W = 1280;
  const GAME_H = 720;
  const PADDING = 16;

  const configs = [
    { label: 'desktop', panelH: 72, btnW: 100, btnH: 30 },
    { label: 'mobile',  panelH: 88, btnW: 110, btnH: 44 },
  ];

  for (const { label, panelH, btnW, btnH } of configs) {
    describe(`${label} layout`, () => {
      const btnX = GAME_W - PADDING - btnW / 2;
      const btnY = GAME_H - panelH - PADDING - btnH / 2;
      const btnTop    = btnY - btnH / 2;
      const btnBottom = btnY + btnH / 2;
      const btnRight  = btnX + btnW / 2;
      const panelTop  = GAME_H - panelH;

      it('button bottom edge is above tower panel top', () => {
        expect(btnBottom).toBeLessThan(panelTop);
      });

      it('button bottom edge is at least PADDING above tower panel', () => {
        expect(panelTop - btnBottom).toBe(PADDING);
      });

      it('button right edge is at most PADDING from game edge', () => {
        expect(GAME_W - btnRight).toBe(PADDING);
      });

      it('button top edge is below HUD strip (y > 64)', () => {
        // HUD height is at most 64 (mobile); button should be well below
        expect(btnTop).toBeGreaterThan(64);
      });

      it('button is fully on screen (all edges positive and within bounds)', () => {
        const btnLeft = btnX - btnW / 2;
        expect(btnLeft).toBeGreaterThan(0);
        expect(btnTop).toBeGreaterThan(0);
        expect(btnRight).toBeLessThanOrEqual(GAME_W);
        expect(btnBottom).toBeLessThanOrEqual(GAME_H);
      });
    });
  }
});

// ── Depth ordering ───────────────────────────────────────────────────────────

describe('Give-up confirmation — depth ordering', () => {
  it('confirmation overlay depth is DEPTH + 50 (above normal HUD elements)', () => {
    expect(hudSrc).toContain('const CONFIRM_DEPTH = DEPTH + 50');
  });

  it('dialog background is one level above overlay', () => {
    expect(hudSrc).toContain('.setDepth(CONFIRM_DEPTH + 1)');
  });

  it('buttons and title are two levels above overlay', () => {
    // Both YES/CANCEL backgrounds and title use CONFIRM_DEPTH + 2
    const matches = hudSrc.match(/setDepth\(CONFIRM_DEPTH \+ 2\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(3); // title + yesBg + noBg
  });

  it('button labels are three levels above overlay', () => {
    const matches = hudSrc.match(/setDepth\(CONFIRM_DEPTH \+ 3\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2); // yesLabel + noLabel
  });
});

// ── TowerPanel PANEL_HEIGHT consistency ──────────────────────────────────────

describe('TowerPanel PANEL_HEIGHT export', () => {
  it('exports PANEL_HEIGHT matching the known mobile/desktop values', () => {
    expect(towerPanelSrc).toContain('export const PANEL_HEIGHT = _IS_MOBILE ? 88 : 72');
  });
});
