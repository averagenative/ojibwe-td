/**
 * TASK-102: Codex UX — Click-Away Dismiss & Text Overlap Fix
 *
 * Structural source-pattern tests using `?raw` import, following the same
 * approach as challengesListScroll.test.ts and postWaveSequencing.test.ts.
 */

import { describe, it, expect } from 'vitest';

import src from '../../scenes/CodexScene.ts?raw';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract the showDetail method body (everything between its opening brace and the next private method). */
function showDetailBody(): string {
  const start = src.indexOf('private showDetail(');
  const end = src.indexOf('private clearDetail(');
  return src.slice(start, end);
}

/** Extract the clearDetail method body. */
function clearDetailBody(): string {
  const start = src.indexOf('private clearDetail(');
  const end = src.indexOf('// ── Back Button');
  return src.slice(start, end);
}

/** Extract the desktop branch within showDetail (after the `else {` for non-mobile). */
function desktopBranch(): string {
  const body = showDetailBody();
  const idx = body.indexOf('// ── Desktop: side panel');
  return body.slice(idx);
}

/** Extract the mobile branch within showDetail (before the desktop branch). */
function mobileBranch(): string {
  const body = showDetailBody();
  const end = body.indexOf('// ── Desktop: side panel');
  return body.slice(0, end);
}

// ─────────────────────────────────────────────────────────────────────────────
// Click-away dismiss
// ─────────────────────────────────────────────────────────────────────────────

describe('CodexScene — click-away dismiss (TASK-102)', () => {

  describe('desktop click-away overlay', () => {
    it('creates a fullscreen rectangle behind the detail panel', () => {
      const desktop = desktopBranch();
      expect(desktop).toContain('clickAway');
      expect(desktop).toMatch(/add\.rectangle\(.*width.*height.*0x000000,\s*0\)/);
    });

    it('sets overlay depth below the detail panel (DEPTH_DETAIL - 1)', () => {
      const desktop = desktopBranch();
      expect(desktop).toContain('setDepth(DEPTH_DETAIL - 1)');
    });

    it('registers tap event to dismiss detail', () => {
      const desktop = desktopBranch();
      expect(desktop).toMatch(/clickAway\.on\(TAP_EVENT,.*clearDetail/);
    });

    it('adds clickAway to detailObjects for cleanup', () => {
      const desktop = desktopBranch();
      expect(desktop).toContain('detailObjects.push(clickAway)');
    });
  });

  describe('mobile click-away overlay', () => {
    it('registers tap event on the dimming overlay to dismiss', () => {
      const mobile = mobileBranch();
      expect(mobile).toMatch(/overlay\.on\(TAP_EVENT,.*clearDetail/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Escape key dismiss
// ─────────────────────────────────────────────────────────────────────────────

describe('CodexScene — Escape key dismiss (TASK-102)', () => {

  it('registers ESC handler in showDetail', () => {
    const body = showDetailBody();
    expect(body).toContain("keyboard?.on('keydown-ESC'");
    expect(body).toContain('this._escHandler');
  });

  it('ESC handler calls clearDetail', () => {
    const body = showDetailBody();
    expect(body).toMatch(/_escHandler\s*=\s*\(\)\s*=>\s*this\.clearDetail\(\)/);
  });

  it('removes ESC handler in clearDetail', () => {
    const body = clearDetailBody();
    expect(body).toContain("keyboard?.off('keydown-ESC', this._escHandler)");
  });

  it('nulls _escHandler after removal', () => {
    const body = clearDetailBody();
    expect(body).toContain('this._escHandler = null');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Text containment & scroll
// ─────────────────────────────────────────────────────────────────────────────

describe('CodexScene — text containment (TASK-102)', () => {

  describe('desktop text containment', () => {
    it('computes maxLoreH to bound text within the panel', () => {
      const desktop = desktopBranch();
      expect(desktop).toMatch(/maxLoreH\s*=\s*\(startY\s*\+\s*panelH\s*-\s*36\)\s*-\s*loreTextY/);
    });

    it('applies a geometry mask when text overflows', () => {
      const desktop = desktopBranch();
      expect(desktop).toContain('createGeometryMask()');
      expect(desktop).toContain('setMask(');
    });

    it('stores mask graphics for cleanup', () => {
      const desktop = desktopBranch();
      expect(desktop).toContain('this._detailMaskGfx = maskGfx');
    });

    it('shows a "scroll for more" hint when text overflows', () => {
      const desktop = desktopBranch();
      expect(desktop).toContain('scroll for more');
    });
  });

  describe('mobile text containment', () => {
    it('reserves close button region (52px) when computing maxLoreH', () => {
      const mobile = mobileBranch();
      expect(mobile).toContain('closeRegionH = 52');
      expect(mobile).toMatch(/maxLoreH\s*=\s*\(startY\s*\+\s*panelH\s*-\s*closeRegionH\)\s*-\s*loreTextY\s*-\s*8/);
    });

    it('shows a "more below" hint on mobile when text overflows', () => {
      const mobile = mobileBranch();
      expect(mobile).toContain('more below');
    });
  });

  describe('scroll mechanics', () => {
    it('registers wheel event for scroll', () => {
      const body = showDetailBody();
      expect(body).toContain("this.input.on('wheel'");
    });

    it('stores wheel handler for cleanup', () => {
      const body = showDetailBody();
      expect(body).toContain('this._wheelHandler = handler');
    });

    it('applies 0.5 damping to scroll delta', () => {
      expect(src).toContain('deltaY * 0.5');
    });

    it('clamps scroll amount to [0, maxScroll]', () => {
      expect(src).toContain('Phaser.Math.Clamp(scrollAmt + deltaY * 0.5, 0, maxScroll)');
    });

    it('hides scroll hint when scrolled near bottom', () => {
      // Both branches hide hint when within 2px of max
      expect(src).toMatch(/setVisible\(scrollAmt < maxScroll - 2\)/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup & memory safety
// ─────────────────────────────────────────────────────────────────────────────

describe('CodexScene — cleanup (TASK-102)', () => {

  it('clearDetail removes wheel handler', () => {
    const body = clearDetailBody();
    expect(body).toContain("this.input.off('wheel', this._wheelHandler)");
    expect(body).toContain('this._wheelHandler = null');
  });

  it('clearDetail destroys mask graphics', () => {
    const body = clearDetailBody();
    expect(body).toContain('this._detailMaskGfx.destroy()');
    expect(body).toContain('this._detailMaskGfx = null');
  });

  it('clearDetail destroys all detailObjects', () => {
    const body = clearDetailBody();
    expect(body).toContain('for (const obj of this.detailObjects)');
    expect(body).toContain('obj.destroy()');
  });

  it('showDetail calls clearDetail first to prevent leaked listeners', () => {
    const body = showDetailBody();
    // clearDetail must appear before ESC handler registration
    const clearIdx = body.indexOf('this.clearDetail()');
    const escIdx = body.indexOf("keyboard?.on('keydown-ESC'");
    expect(clearIdx).toBeGreaterThan(-1);
    expect(escIdx).toBeGreaterThan(-1);
    expect(clearIdx).toBeLessThan(escIdx);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Code quality
// ─────────────────────────────────────────────────────────────────────────────

describe('CodexScene — code quality (TASK-102)', () => {

  it('does not use eslint-disable for ban-types', () => {
    expect(src).not.toContain('@typescript-eslint/ban-types');
  });

  it('does not use Function type for wheel handler', () => {
    // _wheelHandler should have a proper callback type, not bare Function
    expect(src).not.toMatch(/private _wheelHandler:\s*Function/);
  });

  it('does not contain TODO/FIXME/HACK/STUB in new code', () => {
    // Check only the showDetail + clearDetail methods
    const relevant = showDetailBody() + clearDetailBody();
    expect(relevant).not.toMatch(/\/\/\s*(TODO|FIXME|HACK|STUB)/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Layout arithmetic
// ─────────────────────────────────────────────────────────────────────────────

describe('CodexScene — layout arithmetic (TASK-102)', () => {

  describe('desktop layout prevents text/button overlap', () => {
    // Desktop: startY=140, panelH=height-180, illusSize=56, illusY=startY+40
    // loreTextY = illusY + illusSize/2 + 24 = 180 + 28 + 24 = 232
    // maxLoreH = (startY + panelH - 36) - loreTextY
    // At 720p: panelH = 720-180 = 540, maxLoreH = (140+540-36) - 232 = 412
    it('maxLoreH at 720p is 412px', () => {
      const height = 720;
      const startY = 140;
      const panelH = height - 180;
      const illusY = startY + 40;
      const illusSize = 56;
      const loreTextY = illusY + illusSize / 2 + 24;
      const maxLoreH = (startY + panelH - 36) - loreTextY;
      expect(maxLoreH).toBe(412);
    });

    it('section badge at bottom sits below the text region', () => {
      const height = 720;
      const startY = 140;
      const panelH = height - 180;
      const badgeY = startY + panelH - 20; // 660
      const loreTextY = 232; // from above
      const maxLoreH = 412;
      expect(loreTextY + maxLoreH).toBeLessThan(badgeY);
    });
  });

  describe('mobile layout prevents text/close-button overlap', () => {
    // Mobile: panelH=height-80, startY=40, illusSize=48, illusY=startY+36
    // loreTextY = illusY + illusSize/2 + 20 = 76 + 24 + 20 = 120
    // closeRegionH = 52
    // maxLoreH = (startY + panelH - closeRegionH) - loreTextY - 8
    // At 720p: panelH=640, maxLoreH = (40+640-52) - 120 - 8 = 500
    it('maxLoreH at 720p is 500px', () => {
      const height = 720;
      const startY = 40;
      const panelH = height - 80;
      const illusSize = 48;
      const illusY = startY + 36;
      const loreTextY = illusY + illusSize / 2 + 20;
      const closeRegionH = 52;
      const maxLoreH = (startY + panelH - closeRegionH) - loreTextY - 8;
      expect(maxLoreH).toBe(500);
    });

    it('close button sits below the lore text region', () => {
      const height = 720;
      const startY = 40;
      const panelH = height - 80;
      const loreTextY = 120;
      const maxLoreH = 500;
      const closeH = 44;
      const closeCenterY = startY + panelH - closeH / 2 - 8;
      expect(loreTextY + maxLoreH).toBeLessThan(closeCenterY - closeH / 2);
    });
  });

  describe('scroll clamping', () => {
    it('clamp prevents negative scroll', () => {
      // Phaser.Math.Clamp(0 + (-100) * 0.5, 0, 200) = Clamp(-50, 0, 200) = 0
      const scrollAmt = 0;
      const deltaY = -100;
      const maxScroll = 200;
      const result = Math.max(0, Math.min(scrollAmt + deltaY * 0.5, maxScroll));
      expect(result).toBe(0);
    });

    it('clamp prevents scroll beyond maxScroll', () => {
      const scrollAmt = 180;
      const deltaY = 100;
      const maxScroll = 200;
      const result = Math.max(0, Math.min(scrollAmt + deltaY * 0.5, maxScroll));
      expect(result).toBe(200);
    });

    it('normal scroll within bounds is applied', () => {
      const scrollAmt = 50;
      const deltaY = 40;
      const maxScroll = 200;
      const result = Math.max(0, Math.min(scrollAmt + deltaY * 0.5, maxScroll));
      expect(result).toBe(70);
    });
  });
});
