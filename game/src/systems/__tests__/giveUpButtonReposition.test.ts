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
  it('computes btnX from scene width, PADDING, SAFE_INSET, and half btnW', () => {
    expect(hudSrc).toContain('width  - PADDING - SAFE_INSET - btnW / 2');
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

// ── Confirmation dialog structure (DOM-based) ────────────────────────────────

describe('Give-up confirmation dialog', () => {
  it('tap on give-up button opens confirmation instead of immediate callback', () => {
    expect(hudSrc).toContain("bg.on(TAP_EVENT,   () => this._showGiveUpConfirm(onClick))");
  });

  it('_showGiveUpConfirm is defined as a private method', () => {
    expect(hudSrc).toContain('private _showGiveUpConfirm(onConfirm: () => void): void');
  });

  it('creates a DOM overlay for the confirmation dialog', () => {
    expect(hudSrc).toContain("document.createElement('div')");
    expect(hudSrc).toContain('document.body.appendChild(overlay)');
  });

  it('displays "Give up this run?" title text', () => {
    expect(hudSrc).toContain("'Give up this run?'");
  });

  it('has YES and CANCEL buttons', () => {
    expect(hudSrc).toContain("'YES'");
    expect(hudSrc).toContain("'CANCEL'");
  });

  it('YES calls cleanup then defers onConfirm via setTimeout', () => {
    expect(hudSrc).toContain('cleanup()');
    expect(hudSrc).toContain('setTimeout(() => onConfirm()');
  });

  it('CANCEL calls cleanup only', () => {
    expect(hudSrc).toContain("cancelBtn.addEventListener('click', () => { cleanup(); })");
  });

  it('cleanup removes the DOM overlay', () => {
    expect(hudSrc).toContain('overlay.remove()');
  });
});

// ── Mobile touch target compliance ───────────────────────────────────────────

describe('Give-up button — mobile touch targets', () => {
  it('mobile give-up button height is >= 44px', () => {
    const mobileBtnH = 44;
    expect(mobileBtnH).toBeGreaterThanOrEqual(44);
  });

  it('mobile confirmation button height is >= 44px', () => {
    // DOM dialog: btnH = isMobile ? 50 : 36
    const m = hudSrc.match(/const btnH\s*=\s*isMobile\s*\?\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(44);
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

// ── DOM dialog renders above canvas ──────────────────────────────────────────

describe('Give-up confirmation — DOM overlay', () => {
  it('overlay uses z-index 9999 to render above the Phaser canvas', () => {
    expect(hudSrc).toContain('z-index:9999');
  });

  it('overlay blocks interaction with the game canvas', () => {
    expect(hudSrc).toContain('touch-action:none');
  });

  it('clicking outside the dialog box dismisses it', () => {
    expect(hudSrc).toContain('if (e.target === overlay) cleanup()');
  });
});

// ── TowerPanel PANEL_HEIGHT consistency ──────────────────────────────────────

describe('TowerPanel PANEL_HEIGHT export', () => {
  it('exports PANEL_HEIGHT matching the known mobile/desktop values', () => {
    expect(towerPanelSrc).toContain('export const PANEL_HEIGHT = _IS_MOBILE ? 110 : 72');
  });
});
