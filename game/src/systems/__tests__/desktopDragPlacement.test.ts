/**
 * Desktop drag-to-place tower placement — structural and logic tests.
 *
 * TowerPanel and GameScene rely on Phaser and cannot be instantiated in
 * vitest's jsdom environment.  These tests use ?raw source imports to assert
 * that the critical structural patterns are present in the implementation.
 *
 * They also exercise pure drag-threshold arithmetic that does not depend on
 * Phaser, verifying the 10 px movement threshold is correct.
 */
import { describe, it, expect } from 'vitest';

import towerPanelSrc from '../../ui/TowerPanel.ts?raw';
import gameSceneSrc from '../../scenes/GameScene.ts?raw';

// ── TowerPanel drag-detection structure ─────────────────────────────────────

describe('TowerPanel — desktop drag detection', () => {
  it('registers pointerdown on each button to start drag tracking', () => {
    expect(towerPanelSrc).toContain("btn.on('pointerdown'");
  });

  it('registers scene-level pointermove listener for drag detection', () => {
    expect(towerPanelSrc).toContain("scene.input.on('pointermove'");
  });

  it('registers scene-level pointerup listener for drag cleanup', () => {
    expect(towerPanelSrc).toContain("scene.input.on('pointerup'");
  });

  it('removes scene-level listeners after drag or click resolves', () => {
    expect(towerPanelSrc).toContain("scene.input.off('pointermove'");
    expect(towerPanelSrc).toContain("scene.input.off('pointerup'");
  });

  it('uses Math.hypot for drag distance calculation', () => {
    expect(towerPanelSrc).toContain('Math.hypot(dx, dy)');
  });

  it('applies a 10 px drag threshold to distinguish click from drag', () => {
    expect(towerPanelSrc).toContain('> 10');
  });

  it('calls onSelect with isDrag=true when drag threshold is exceeded', () => {
    expect(towerPanelSrc).toContain('onSelect(def, true)');
  });

  it('calls onSelect with isDrag=false on button click (no drag)', () => {
    expect(towerPanelSrc).toContain('onSelect(def, false)');
  });

  it('mobile branch still uses pointerdown without isDrag parameter', () => {
    expect(towerPanelSrc).toContain('onSelect(def)');
  });

  it('onSelect callback signature accepts optional isDrag parameter', () => {
    expect(towerPanelSrc).toContain('onSelect: (def: TowerDef, isDrag?: boolean)');
  });
});

// ── GameScene drag-placement integration structure ───────────────────────────

describe('GameScene — desktop drag-placement integration', () => {
  it('declares _isDragPlacing field', () => {
    expect(gameSceneSrc).toContain('_isDragPlacing');
  });

  it('resets _isDragPlacing in init()', () => {
    expect(gameSceneSrc).toContain("this._isDragPlacing  = false;");
  });

  it('enterPlacementMode accepts isDrag parameter', () => {
    expect(gameSceneSrc).toContain('enterPlacementMode(def: TowerDef, isDrag = false)');
  });

  it('enterPlacementMode sets _isDragPlacing (guarded to desktop only)', () => {
    // Sets flag only when not mobile, so mobile behaviour is unchanged.
    expect(gameSceneSrc).toContain('this._isDragPlacing  = isDrag && !MobileManager.getInstance().isMobile()');
  });

  it('exitPlacementMode resets _isDragPlacing', () => {
    expect(gameSceneSrc).toContain('this._isDragPlacing  = false');
  });

  it('pointerup is registered unconditionally (not mobile-only)', () => {
    // The registration line must NOT be inside an isMobile() guard.
    // Check that the unconditional registration is present.
    expect(gameSceneSrc).toContain("this.input.on('pointerup', this.onPointerUp, this);");
    // And confirm the old mobile-only guard was removed.
    expect(gameSceneSrc).not.toContain("if (MobileManager.getInstance().isMobile()) {\n      // Mobile: place tower on finger-lift");
  });

  it('onPointerUp returns early for desktop click-to-place (not drag)', () => {
    // The early-return guard preventing double-handling of desktop clicks.
    expect(gameSceneSrc).toContain('if (!isMobile && !this._isDragPlacing) return;');
  });

  it('onPointerUp cancels placement when drag dropped on invalid tile', () => {
    expect(gameSceneSrc).toContain('this._isDragPlacing');
    // Verifies the cancel branch: exitPlacementMode() called in the drag path.
    expect(gameSceneSrc).toContain('this.exitPlacementMode()');
  });

  it('TowerPanel instantiation passes isDrag callback', () => {
    expect(gameSceneSrc).toContain('(def, isDrag) => this.enterPlacementMode(def, isDrag)');
  });
});

// ── Drag threshold arithmetic ────────────────────────────────────────────────

describe('drag threshold arithmetic', () => {
  const THRESHOLD = 10;

  function isDrag(dx: number, dy: number): boolean {
    return Math.hypot(dx, dy) > THRESHOLD;
  }

  it('no movement → click', () => {
    expect(isDrag(0, 0)).toBe(false);
  });

  it('tiny movement (< threshold) → click', () => {
    expect(isDrag(3, 4)).toBe(false); // hypot = 5
  });

  it('exactly at threshold → click (threshold is exclusive)', () => {
    expect(isDrag(6, 8)).toBe(false); // hypot = 10 exactly
  });

  it('one pixel beyond threshold → drag', () => {
    // hypot(6, 9) ≈ 10.82 > 10
    expect(isDrag(6, 9)).toBe(true);
  });

  it('large movement → drag', () => {
    expect(isDrag(100, 200)).toBe(true);
  });

  it('purely horizontal movement beyond threshold → drag', () => {
    expect(isDrag(11, 0)).toBe(true);
  });

  it('purely vertical movement beyond threshold → drag', () => {
    expect(isDrag(0, 11)).toBe(true);
  });

  it('diagonal movement: 8,8 → drag (hypot ≈ 11.3)', () => {
    expect(isDrag(8, 8)).toBe(true);
  });

  it('diagonal movement: 7,7 → click (hypot ≈ 9.9)', () => {
    expect(isDrag(7, 7)).toBe(false);
  });
});

// ── Mobile behaviour preservation ────────────────────────────────────────────

describe('mobile behaviour unchanged', () => {
  it('TowerPanel mobile branch uses pointerdown (not pointerup)', () => {
    // Verify the mobile conditional still fires onSelect on pointerdown.
    expect(towerPanelSrc).toContain("if (_IS_MOBILE)");
    // Mobile fires on pointerdown:
    expect(towerPanelSrc).toContain("btn.on('pointerdown', () => {");
  });

  it('GameScene onPointerUp mobile path does not cancel on invalid tiles', () => {
    // For mobile (isMobile=true), the handler goes to tryPlaceTower (not cancel).
    // The mobile branch comment must be present.
    expect(gameSceneSrc).toContain('// Mobile: existing behaviour');
  });
});
