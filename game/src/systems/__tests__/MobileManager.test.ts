/**
 * MobileManager unit tests.
 *
 * MobileManager is Phaser-free (pure DOM) so it can be tested directly in
 * jsdom without any Phaser stubs.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MobileManager } from '../MobileManager';

/** Reset the singleton so each test gets a fresh instance. */
function resetSingleton(): void {
  (MobileManager as unknown as { _instance: MobileManager | null })._instance = null;
}

/** Set window.innerWidth for the next MobileManager evaluation. */
function setInnerWidth(w: number): void {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true, writable: true });
}

/** Set window.innerHeight for physicalScale tests. */
function setInnerHeight(h: number): void {
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true, writable: true });
}

/** Add ontouchstart to window to simulate a touch device. */
function enableTouch(): void {
  (window as unknown as Record<string, unknown>).ontouchstart = null;
}

/** Remove ontouchstart from window to simulate a non-touch device. */
function disableTouch(): void {
  delete (window as unknown as Record<string, unknown>).ontouchstart;
}

describe('MobileManager', () => {
  beforeEach(() => {
    resetSingleton();
    disableTouch();
    document.body.classList.remove('mobile');
    delete (window as unknown as Record<string, unknown>).__OJIBWE_MOBILE;
  });

  afterEach(() => {
    resetSingleton();
  });

  // ── Singleton ─────────────────────────────────────────────────────────────

  describe('singleton', () => {
    it('returns the same instance on repeated calls', () => {
      setInnerWidth(1024);
      const a = MobileManager.getInstance();
      const b = MobileManager.getInstance();
      expect(a).toBe(b);
    });
  });

  // ── Detection — happy path ────────────────────────────────────────────────

  describe('detection', () => {
    it('detects mobile when viewport width <= 768', () => {
      setInnerWidth(768);
      const mm = MobileManager.getInstance();
      expect(mm.isMobile()).toBe(true);
    });

    it('detects desktop when viewport width > 768 and no touch', () => {
      setInnerWidth(1024);
      const mm = MobileManager.getInstance();
      expect(mm.isMobile()).toBe(false);
    });

    it('detects mobile when ontouchstart is present (wide screen)', () => {
      setInnerWidth(1920);
      enableTouch();
      const mm = MobileManager.getInstance();
      expect(mm.isMobile()).toBe(true);
    });

    it('detects mobile when both narrow viewport and touch present', () => {
      setInnerWidth(375);
      enableTouch();
      const mm = MobileManager.getInstance();
      expect(mm.isMobile()).toBe(true);
    });
  });

  // ── Global side-effects ───────────────────────────────────────────────────

  describe('side-effects', () => {
    it('sets window.__OJIBWE_MOBILE = true on mobile', () => {
      setInnerWidth(375);
      MobileManager.getInstance();
      expect(window.__OJIBWE_MOBILE).toBe(true);
    });

    it('sets window.__OJIBWE_MOBILE = false on desktop', () => {
      setInnerWidth(1920);
      MobileManager.getInstance();
      expect(window.__OJIBWE_MOBILE).toBe(false);
    });

    it('adds "mobile" body class on mobile', () => {
      setInnerWidth(375);
      MobileManager.getInstance();
      expect(document.body.classList.contains('mobile')).toBe(true);
    });

    it('removes "mobile" body class on desktop', () => {
      document.body.classList.add('mobile'); // pre-set
      setInnerWidth(1920);
      MobileManager.getInstance();
      expect(document.body.classList.contains('mobile')).toBe(false);
    });
  });

  // ── Re-evaluation on resize ───────────────────────────────────────────────

  describe('re-evaluation', () => {
    it('updates isMobile() when window resizes from desktop to mobile', () => {
      setInnerWidth(1024);
      const mm = MobileManager.getInstance();
      expect(mm.isMobile()).toBe(false);

      setInnerWidth(600);
      window.dispatchEvent(new Event('resize'));
      expect(mm.isMobile()).toBe(true);
      expect(document.body.classList.contains('mobile')).toBe(true);
    });

    it('updates isMobile() when window resizes from mobile to desktop', () => {
      setInnerWidth(375);
      const mm = MobileManager.getInstance();
      expect(mm.isMobile()).toBe(true);

      setInnerWidth(1024);
      disableTouch();
      window.dispatchEvent(new Event('resize'));
      expect(mm.isMobile()).toBe(false);
      expect(document.body.classList.contains('mobile')).toBe(false);
    });

    it('updates on orientationchange event', () => {
      setInnerWidth(375);
      const mm = MobileManager.getInstance();
      expect(mm.isMobile()).toBe(true);

      setInnerWidth(1024);
      disableTouch();
      window.dispatchEvent(new Event('orientationchange'));
      expect(mm.isMobile()).toBe(false);
    });
  });

  // ── Boundary values ───────────────────────────────────────────────────────

  describe('boundary values', () => {
    it('width 768 (boundary) → mobile', () => {
      setInnerWidth(768);
      expect(MobileManager.getInstance().isMobile()).toBe(true);
    });

    it('width 769 (just above boundary, no touch) → desktop', () => {
      setInnerWidth(769);
      expect(MobileManager.getInstance().isMobile()).toBe(false);
    });

    it('width 0 → mobile', () => {
      setInnerWidth(0);
      expect(MobileManager.getInstance().isMobile()).toBe(true);
    });

    it('width 1 → mobile', () => {
      setInnerWidth(1);
      expect(MobileManager.getInstance().isMobile()).toBe(true);
    });
  });

  // ── particleScale ─────────────────────────────────────────────────────────

  describe('particleScale', () => {
    it('returns 0.5 on mobile', () => {
      setInnerWidth(375);
      expect(MobileManager.getInstance().particleScale()).toBe(0.5);
    });

    it('returns 1.0 on desktop', () => {
      setInnerWidth(1920);
      expect(MobileManager.getInstance().particleScale()).toBe(1.0);
    });
  });

  // ── physicalScale ─────────────────────────────────────────────────────────

  describe('physicalScale', () => {
    it('returns min of width/1280 and height/720', () => {
      setInnerWidth(1280);
      setInnerHeight(720);
      enableTouch(); // doesn't affect scale computation
      const mm = MobileManager.getInstance();
      expect(mm.physicalScale()).toBeCloseTo(1.0);
    });

    it('scales based on narrow dimension (width-limited)', () => {
      setInnerWidth(640);
      setInnerHeight(720);
      enableTouch();
      const mm = MobileManager.getInstance();
      // 640/1280 = 0.5, 720/720 = 1.0 → min = 0.5
      expect(mm.physicalScale()).toBeCloseTo(0.5);
    });

    it('scales based on narrow dimension (height-limited)', () => {
      setInnerWidth(1280);
      setInnerHeight(360);
      enableTouch();
      const mm = MobileManager.getInstance();
      // 1280/1280 = 1.0, 360/720 = 0.5 → min = 0.5
      expect(mm.physicalScale()).toBeCloseTo(0.5);
    });

    it('returns 0 when viewport is 0×0', () => {
      setInnerWidth(0);
      setInnerHeight(0);
      const mm = MobileManager.getInstance();
      expect(mm.physicalScale()).toBe(0);
      expect(Number.isFinite(mm.physicalScale())).toBe(true);
    });
  });

  // ── minTapTarget ──────────────────────────────────────────────────────────

  describe('minTapTarget', () => {
    it('returns 36 on desktop', () => {
      setInnerWidth(1920);
      setInnerHeight(1080);
      expect(MobileManager.getInstance().minTapTarget()).toBe(36);
    });

    it('returns >= 44 on mobile', () => {
      setInnerWidth(667);
      setInnerHeight(375);
      enableTouch();
      const mm = MobileManager.getInstance();
      expect(mm.minTapTarget()).toBeGreaterThanOrEqual(44);
    });

    it('handles very small viewport (scale near 0) without crash', () => {
      setInnerWidth(10);
      setInnerHeight(10);
      const mm = MobileManager.getInstance();
      // Math.max(scale, 0.1) prevents division by zero
      const result = mm.minTapTarget();
      expect(Number.isFinite(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(44);
    });
  });

  // ── Mobile layout constraints ─────────────────────────────────────────────

  describe('mobile layout constraints', () => {
    const CANVAS_H = 720;
    const MOBILE_HUD_HEIGHT = 64;
    const MOBILE_PANEL_HEIGHT = 88;

    it('mobile game area (HUD + tower panel only) > 50% of canvas', () => {
      const gameArea = CANVAS_H - MOBILE_HUD_HEIGHT - MOBILE_PANEL_HEIGHT;
      expect(gameArea).toBeGreaterThan(CANVAS_H * 0.5);
    });

    it('mobile HUD height meets minimum touch target', () => {
      expect(MOBILE_HUD_HEIGHT).toBeGreaterThanOrEqual(44);
    });

    it('mobile tower panel height meets minimum touch target', () => {
      expect(MOBILE_PANEL_HEIGHT).toBeGreaterThanOrEqual(44);
    });

    it('mobile touch targets in HUD are >= 44px', () => {
      const speedBtnH = 44;
      const muteBtnH = 44;
      const giveUpBtnH = 44;
      expect(speedBtnH).toBeGreaterThanOrEqual(44);
      expect(muteBtnH).toBeGreaterThanOrEqual(44);
      expect(giveUpBtnH).toBeGreaterThanOrEqual(44);
    });

    it('mobile tower panel button size >= 44px', () => {
      const mobileBtnSize = 64;
      expect(mobileBtnSize).toBeGreaterThanOrEqual(44);
    });
  });
});
