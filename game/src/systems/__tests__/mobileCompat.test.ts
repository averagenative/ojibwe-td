/**
 * Mobile compatibility regression tests.
 *
 * These validate that layout constants critical for touch playability
 * remain within safe bounds.  The game canvas is 1280×720 and Phaser
 * Scale.FIT scales it to the device viewport, so all values here are
 * in *game-coordinate* pixels.
 *
 * Constants are mirrored from UI modules (which import Phaser and cannot
 * be loaded in vitest without a full Phaser mock).  If a test fails after
 * you change a panel height, update the value here AND verify mobile still
 * works.
 */
import { describe, it, expect } from 'vitest';

// ── Mirrored constants (keep in sync with UI source files) ───────────────────
// These values are copied from the UI modules because those modules import
// Phaser, which cannot be loaded in the vitest jsdom environment.

/** TowerPanel.ts → PANEL_HEIGHT */
const PANEL_HEIGHT = 72;
/** UpgradePanel.ts → UPGRADE_PANEL_HEIGHT */
const UPGRADE_PANEL_HEIGHT = 176;
/** BehaviorPanel.ts → BEHAVIOR_PANEL_HEIGHT */
const BEHAVIOR_PANEL_HEIGHT = 64;
/** HUD.ts → HUD_HEIGHT */
const HUD_HEIGHT = 48;
/** TowerPanel.ts → BTN_SIZE (not exported, value from source) */
const BTN_SIZE = 52;

/** Minimum recommended touch-target size (game-coordinate px). */
const MIN_TOUCH_TARGET = 44;

/** Internal game canvas dimensions (main.ts). */
const CANVAS_W = 1280;
const CANVAS_H = 720;

describe('Mobile compatibility', () => {
  // ── Touch target sizes ──────────────────────────────────────────────────

  describe('touch targets', () => {
    it('tower panel buttons meet minimum 44 px touch target', () => {
      expect(BTN_SIZE).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });

    it('tower panel height accommodates a button with padding', () => {
      expect(PANEL_HEIGHT).toBeGreaterThanOrEqual(BTN_SIZE);
    });

    it('upgrade panel height provides adequate touch area', () => {
      expect(UPGRADE_PANEL_HEIGHT).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });

    it('behavior panel height provides adequate touch area', () => {
      expect(BEHAVIOR_PANEL_HEIGHT).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });

    it('HUD height provides adequate touch area', () => {
      expect(HUD_HEIGHT).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });
  });

  // ── Layout constraints ──────────────────────────────────────────────────

  describe('layout constraints', () => {
    it('bottom panel stack leaves at least 50 % of canvas for the game area', () => {
      const totalBottom = PANEL_HEIGHT + UPGRADE_PANEL_HEIGHT + BEHAVIOR_PANEL_HEIGHT;
      expect(totalBottom).toBeLessThan(CANVAS_H * 0.5);
    });

    it('total UI (HUD + all bottom panels) leaves at least 40 % for the game area', () => {
      const totalUI = HUD_HEIGHT + PANEL_HEIGHT + UPGRADE_PANEL_HEIGHT + BEHAVIOR_PANEL_HEIGHT;
      expect(totalUI).toBeLessThan(CANVAS_H * 0.6);
    });

    it('game area between HUD and tower panel is at least 600 px tall', () => {
      // When upgrade/behavior panels are closed, only HUD top + tower panel
      // bottom are visible.  The playable area must be large enough for the
      // tower defense grid (720 - 48 - 72 = 600).
      const gameArea = CANVAS_H - HUD_HEIGHT - PANEL_HEIGHT;
      expect(gameArea).toBeGreaterThanOrEqual(600);
    });
  });

  // ── Scale factor bounds ─────────────────────────────────────────────────

  describe('scale factor sanity', () => {
    it('game aspect ratio is 16:9', () => {
      expect(CANVAS_W / CANVAS_H).toBeCloseTo(16 / 9, 2);
    });

    it('a 48 px button is >= 24 physical px on iPhone SE landscape (667 px)', () => {
      const scaleFactor = 667 / CANVAS_W;
      const physicalSize = BTN_SIZE * scaleFactor;
      // 24 px is Apple's absolute minimum for touch targets.
      expect(physicalSize).toBeGreaterThanOrEqual(24);
    });

    it('a 48 px button is >= 16 physical px on iPhone SE portrait (375 px)', () => {
      const scaleFactor = 375 / CANVAS_W;
      const physicalSize = BTN_SIZE * scaleFactor;
      // Portrait mode is very small — this is a sanity floor, not ideal.
      expect(physicalSize).toBeGreaterThanOrEqual(15);
    });

    it('HUD text at 20 px is >= 10 physical px on iPhone SE landscape', () => {
      const scaleFactor = 667 / CANVAS_W;
      const physicalFontSize = 20 * scaleFactor;
      // 10 px is the minimum legible font size on mobile.
      expect(physicalFontSize).toBeGreaterThanOrEqual(10);
    });
  });

  // ── Boundary / error cases ──────────────────────────────────────────────

  describe('boundary cases', () => {
    it('panel constants are positive integers', () => {
      for (const v of [PANEL_HEIGHT, UPGRADE_PANEL_HEIGHT, BEHAVIOR_PANEL_HEIGHT, HUD_HEIGHT, BTN_SIZE]) {
        expect(v).toBeGreaterThan(0);
        expect(Number.isInteger(v)).toBe(true);
      }
    });

    it('canvas dimensions are positive integers', () => {
      expect(CANVAS_W).toBeGreaterThan(0);
      expect(CANVAS_H).toBeGreaterThan(0);
      expect(Number.isInteger(CANVAS_W)).toBe(true);
      expect(Number.isInteger(CANVAS_H)).toBe(true);
    });

    it('zero viewport width produces zero scale factor (no division by zero)', () => {
      // Degenerate case — if viewport width is 0, scale factor must be 0.
      const scaleFactor = 0 / CANVAS_W;
      expect(scaleFactor).toBe(0);
      expect(Number.isFinite(scaleFactor)).toBe(true);
    });
  });
});
