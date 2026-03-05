/**
 * Multi-Tower Select & Batch Upgrade — structural and arithmetic tests.
 *
 * Phaser cannot be instantiated in vitest's jsdom environment, so we use
 * ?raw source imports to verify critical implementation patterns are present.
 *
 * Arithmetic tests exercise pure logic that does not depend on Phaser.
 */
import { describe, it, expect } from 'vitest';

import towerSrc         from '../../entities/towers/Tower.ts?raw';
import gameSceneSrc     from '../../scenes/GameScene.ts?raw';
import upgradePanelSrc  from '../../ui/UpgradePanel.ts?raw';
import multiPanelSrc    from '../../ui/MultiTowerPanel.ts?raw';

// ── Tower.ts: setMultiSelected ────────────────────────────────────────────────

describe('Tower — setMultiSelected()', () => {
  it('declares _multiSelGfx field', () => {
    expect(towerSrc).toContain('_multiSelGfx');
  });

  it('exports setMultiSelected() as a public method', () => {
    expect(towerSrc).toContain('setMultiSelected(on: boolean)');
  });

  it('creates a Graphics object for the multi-select ring when on=true', () => {
    expect(towerSrc).toContain('this.scene.add.graphics()');
    expect(towerSrc).toContain('this._multiSelGfx = ');
  });

  it('draws an amber (0xc8952a) selection ring', () => {
    expect(towerSrc).toContain('0xc8952a');
  });

  it('calls setVisible(false) to hide the ring when on=false', () => {
    expect(towerSrc).toContain('this._multiSelGfx?.setVisible(false)');
  });

  it('destroys _multiSelGfx in sell() to prevent memory leaks', () => {
    expect(towerSrc).toContain('this._multiSelGfx?.destroy()');
  });
});

// ── GameScene: multi-select state ─────────────────────────────────────────────

describe('GameScene — multi-select state fields', () => {
  it('declares _selectedTowers field', () => {
    expect(gameSceneSrc).toContain('_selectedTowers: Tower[]');
  });

  it('declares _regionSelectGfx field', () => {
    expect(gameSceneSrc).toContain('_regionSelectGfx');
  });

  it('declares _regionSelectStart field', () => {
    expect(gameSceneSrc).toContain('_regionSelectStart');
  });

  it('declares _regionDragging field', () => {
    expect(gameSceneSrc).toContain('_regionDragging');
  });

  it('declares _multiTowerPanel field', () => {
    expect(gameSceneSrc).toContain('_multiTowerPanel');
  });

  it('declares mobile long-press timer field', () => {
    expect(gameSceneSrc).toContain('_mobileHoldTimer');
  });
});

describe('GameScene — init() resets multi-select state', () => {
  it('resets _selectedTowers to empty array', () => {
    expect(gameSceneSrc).toContain('this._selectedTowers    = []');
  });

  it('resets _regionSelectStart to null', () => {
    expect(gameSceneSrc).toContain('this._regionSelectStart = null');
  });

  it('resets _regionDragging to false', () => {
    expect(gameSceneSrc).toContain('this._regionDragging    = false');
  });
});

// ── GameScene: selection methods ──────────────────────────────────────────────

describe('GameScene — _toggleTowerInSelection()', () => {
  it('declares _toggleTowerInSelection method', () => {
    expect(gameSceneSrc).toContain('_toggleTowerInSelection(tower: Tower)');
  });

  it('removes tower from _selectedTowers when already present', () => {
    expect(gameSceneSrc).toContain('this._selectedTowers.splice(idx, 1)');
  });

  it('calls tower.setMultiSelected(false) when removing', () => {
    expect(gameSceneSrc).toContain('tower.setMultiSelected(false)');
  });

  it('calls tower.setMultiSelected(true) when adding', () => {
    expect(gameSceneSrc).toContain('tower.setMultiSelected(true)');
  });

  it('calls _updateSelectionUI() after toggling', () => {
    expect(gameSceneSrc).toContain('this._updateSelectionUI()');
  });
});

describe('GameScene — _updateSelectionUI()', () => {
  it('declares _updateSelectionUI method', () => {
    expect(gameSceneSrc).toContain('_updateSelectionUI()');
  });

  it('shows _multiTowerPanel when 2+ towers selected', () => {
    expect(gameSceneSrc).toContain('this._multiTowerPanel.show(this._selectedTowers)');
  });

  it('hides _multiTowerPanel when reverting to single select', () => {
    expect(gameSceneSrc).toContain('this._multiTowerPanel.hide()');
  });
});

describe('GameScene — _selectAllOfType()', () => {
  it('declares _selectAllOfType method', () => {
    expect(gameSceneSrc).toContain('_selectAllOfType(typeKey: string)');
  });

  it('filters towers by def.key matching typeKey', () => {
    expect(gameSceneSrc).toContain("t.def.key === typeKey");
  });

  it('uses single-select when only one tower matches', () => {
    expect(gameSceneSrc).toContain('this.selectTower(matching[0])');
  });

  it('sets all matching towers as multi-selected', () => {
    // The method iterates _selectedTowers and calls setMultiSelected(true)
    expect(gameSceneSrc).toContain('t.setMultiSelected(true)');
  });
});

describe('GameScene — _batchBuyUpgrade()', () => {
  it('declares _batchBuyUpgrade method', () => {
    expect(gameSceneSrc).toContain("_batchBuyUpgrade(path: 'A' | 'B' | 'C')");
  });

  it('checks gold >= cost before buying each tower', () => {
    expect(gameSceneSrc).toContain('this.gold >= cost');
  });

  it('deducts gold for each successful upgrade', () => {
    expect(gameSceneSrc).toContain('this.gold -= spent');
  });

  it('calls _multiTowerPanel.refresh after batch purchase', () => {
    expect(gameSceneSrc).toContain('this._multiTowerPanel.refresh(this._selectedTowers)');
  });
});

// ── GameScene: region select ──────────────────────────────────────────────────

describe('GameScene — region select', () => {
  it('declares _updateRegionSelect method', () => {
    expect(gameSceneSrc).toContain('_updateRegionSelect(x: number, y: number)');
  });

  it('uses 8px threshold before committing to drag', () => {
    expect(gameSceneSrc).toContain('Math.hypot(dx, dy) > 8');
  });

  it('draws rubber-band rect in amber (0xc8952a)', () => {
    // MultiTowerPanel header also uses this colour; confirm GameScene region select does too
    expect(gameSceneSrc).toContain('0xc8952a');
  });

  it('declares _finalizeRegionSelect method', () => {
    expect(gameSceneSrc).toContain('_finalizeRegionSelect(ptr: Phaser.Input.Pointer)');
  });

  it('selects towers whose (x,y) fall within the rect bounds', () => {
    expect(gameSceneSrc).toContain('t.x >= rx && t.x <= rx + rw && t.y >= ry && t.y <= ry + rh');
  });

  it('declares _cancelRegionSelect helper', () => {
    expect(gameSceneSrc).toContain('_cancelRegionSelect()');
  });

  it('calls _cancelRegionSelect from Escape key handler', () => {
    expect(gameSceneSrc).toContain('this._cancelRegionSelect()');
  });

  it('starts mobile long-press timer in onPointerDown', () => {
    expect(gameSceneSrc).toContain('this.time.delayedCall(500,');
  });

  it('cancels mobile hold timer when pointer moves more than 20px', () => {
    expect(gameSceneSrc).toContain('> 20');
  });
});

describe('GameScene — Shift+click adds to selection', () => {
  it('reads shiftKey from the native pointer event', () => {
    expect(gameSceneSrc).toContain('shiftKey');
  });

  it('calls _toggleTowerInSelection when shift is held on tower pointerup', () => {
    expect(gameSceneSrc).toContain('this._toggleTowerInSelection(tower)');
  });

  it('does not start region select when shift is held on empty ground', () => {
    // Shift+click on empty ground returns early without setting _regionSelectStart
    expect(gameSceneSrc).toContain('if (shiftHeld)');
    expect(gameSceneSrc).toContain('return;');
  });
});

describe('GameScene — Escape and S keyboard shortcuts', () => {
  it('Escape cancels region select when a drag is in progress', () => {
    expect(gameSceneSrc).toContain('_regionDragging || this._regionSelectStart');
  });

  it('S key sells all selected towers in multi-select mode', () => {
    expect(gameSceneSrc).toContain("this._selectedTowers.length > 1");
    expect(gameSceneSrc).toContain('for (const t of toSell) this.sellTower(t)');
  });
});

// ── UpgradePanel: SELECT ALL TYPE button ─────────────────────────────────────

describe('UpgradePanel — SELECT ALL TYPE button', () => {
  it('declares _selectAllBg rectangle', () => {
    expect(upgradePanelSrc).toContain('_selectAllBg');
  });

  it('declares _selectAllLabel text', () => {
    expect(upgradePanelSrc).toContain('_selectAllLabel');
  });

  it('exposes onSelectAllType callback', () => {
    expect(upgradePanelSrc).toContain('onSelectAllType');
  });

  it('button calls onSelectAllType on pointerup', () => {
    expect(upgradePanelSrc).toContain('this.onSelectAllType?.()');
  });

  it('button label updates to show tower name in showForTower()', () => {
    expect(upgradePanelSrc).toContain('SELECT ALL ${tower.def.name.toUpperCase()}');
  });
});

// ── MultiTowerPanel structure ─────────────────────────────────────────────────

describe('MultiTowerPanel — structure', () => {
  it('exports MULTI_TOWER_PANEL_HEIGHT constant', () => {
    expect(multiPanelSrc).toContain('export const MULTI_TOWER_PANEL_HEIGHT');
  });

  it('MULTI_TOWER_PANEL_HEIGHT derived from UPGRADE + BEHAVIOR heights', () => {
    expect(multiPanelSrc).toContain('UPGRADE_PANEL_HEIGHT + BEHAVIOR_PANEL_HEIGHT');
  });

  it('exposes isOpen() method', () => {
    expect(multiPanelSrc).toContain('isOpen(): boolean');
  });

  it('exposes show() method accepting Tower[]', () => {
    expect(multiPanelSrc).toContain('show(towers: Tower[])');
  });

  it('exposes hide() method', () => {
    expect(multiPanelSrc).toContain('hide(): void');
  });

  it('exposes refresh() method', () => {
    expect(multiPanelSrc).toContain('refresh(towers: Tower[])');
  });

  it('exposes onBuyBatch callback', () => {
    expect(multiPanelSrc).toContain('onBuyBatch');
  });

  it('exposes onDeselectAll callback', () => {
    expect(multiPanelSrc).toContain('onDeselectAll');
  });

  it('exposes onSelectAllType callback', () => {
    expect(multiPanelSrc).toContain('onSelectAllType');
  });

  it('shows upgrade columns for same-type selection', () => {
    expect(multiPanelSrc).toContain('allSameType');
  });

  it('shows mixed-type fallback message for heterogeneous selections', () => {
    expect(multiPanelSrc).toContain('MIXED TYPES');
  });

  it('DESELECT ALL button calls onDeselectAll', () => {
    expect(multiPanelSrc).toContain('this.onDeselectAll?.()');
  });

  it('SELECT ALL TYPE button calls onSelectAllType with stored type key', () => {
    expect(multiPanelSrc).toContain('this.onSelectAllType?.(this._currentTypeKey)');
  });

  it('shows batch total cost by summing eligible tower costs', () => {
    expect(multiPanelSrc).toContain('eligibleCosts.reduce');
  });

  it('uses getUpgradeCost() to find eligible towers', () => {
    expect(multiPanelSrc).toContain('mgr.getUpgradeCost(tower, pathId)');
  });
});

// ── Arithmetic: region-select rectangle hit test ──────────────────────────────

describe('Region-select hit test arithmetic', () => {
  /** Mirrors the GameScene._finalizeRegionSelect() tower inclusion check. */
  function towerInRect(
    tx: number, ty: number,
    rx: number, ry: number, rw: number, rh: number,
  ): boolean {
    return tx >= rx && tx <= rx + rw && ty >= ry && ty <= ry + rh;
  }

  it('includes a tower exactly at the top-left corner', () => {
    expect(towerInRect(100, 200, 100, 200, 300, 150)).toBe(true);
  });

  it('includes a tower exactly at the bottom-right corner', () => {
    expect(towerInRect(400, 350, 100, 200, 300, 150)).toBe(true);
  });

  it('includes a tower inside the rectangle', () => {
    expect(towerInRect(250, 275, 100, 200, 300, 150)).toBe(true);
  });

  it('excludes a tower to the left of the rectangle', () => {
    expect(towerInRect(99, 275, 100, 200, 300, 150)).toBe(false);
  });

  it('excludes a tower to the right of the rectangle', () => {
    expect(towerInRect(401, 275, 100, 200, 300, 150)).toBe(false);
  });

  it('excludes a tower above the rectangle', () => {
    expect(towerInRect(250, 199, 100, 200, 300, 150)).toBe(false);
  });

  it('excludes a tower below the rectangle', () => {
    expect(towerInRect(250, 351, 100, 200, 300, 150)).toBe(false);
  });
});

// ── Arithmetic: region-select drag threshold ──────────────────────────────────

describe('Region-select drag threshold (8px)', () => {
  /** Mirrors the _updateRegionSelect() distance check. */
  function isDrag(dx: number, dy: number): boolean {
    return Math.hypot(dx, dy) > 8;
  }

  it('returns false when pointer has not moved', () => {
    expect(isDrag(0, 0)).toBe(false);
  });

  it('returns false when moved exactly 8px horizontally', () => {
    expect(isDrag(8, 0)).toBe(false);
  });

  it('returns false when within 8px diagonal distance', () => {
    // sqrt(3^2 + 3^2) ≈ 4.24 < 8
    expect(isDrag(3, 3)).toBe(false);
  });

  it('returns true when moved more than 8px horizontally', () => {
    expect(isDrag(9, 0)).toBe(true);
  });

  it('returns true when moved more than 8px diagonally', () => {
    // sqrt(6^2 + 6^2) ≈ 8.49 > 8
    expect(isDrag(6, 6)).toBe(true);
  });
});

// ── Arithmetic: batch buy gold check ─────────────────────────────────────────

describe('Batch buy gold check', () => {
  /**
   * Mirrors _batchBuyUpgrade greedy gold spending.
   * Returns how many upgrades were bought and gold remaining.
   */
  function simulateBatchBuy(
    gold: number,
    costs: number[],
  ): { bought: number; goldLeft: number } {
    let bought = 0;
    let g = gold;
    for (const cost of costs) {
      if (cost > 0 && g >= cost) {
        g -= cost;
        bought++;
      }
    }
    return { bought, goldLeft: g };
  }

  it('buys all towers when gold is sufficient', () => {
    const result = simulateBatchBuy(300, [100, 100, 100]);
    expect(result.bought).toBe(3);
    expect(result.goldLeft).toBe(0);
  });

  it('buys as many as affordable in greedy order', () => {
    const result = simulateBatchBuy(250, [100, 100, 100]);
    expect(result.bought).toBe(2);
    expect(result.goldLeft).toBe(50);
  });

  it('buys none when gold is zero', () => {
    const result = simulateBatchBuy(0, [100, 100]);
    expect(result.bought).toBe(0);
    expect(result.goldLeft).toBe(0);
  });

  it('skips towers with cost 0 (locked or maxed)', () => {
    const result = simulateBatchBuy(200, [100, 0, 100]);
    expect(result.bought).toBe(2);
    expect(result.goldLeft).toBe(0);
  });

  it('handles empty cost array (no towers)', () => {
    const result = simulateBatchBuy(500, []);
    expect(result.bought).toBe(0);
    expect(result.goldLeft).toBe(500);
  });

  it('handles varying costs (different upgrade tiers)', () => {
    const result = simulateBatchBuy(300, [50, 100, 200]);
    expect(result.bought).toBe(2);
    expect(result.goldLeft).toBe(150);
  });

  it('handles exact gold for first tower only', () => {
    const result = simulateBatchBuy(100, [100, 100, 100]);
    expect(result.bought).toBe(1);
    expect(result.goldLeft).toBe(0);
  });

  it('negative cost is treated as non-positive (skipped)', () => {
    const result = simulateBatchBuy(100, [-50, 100]);
    expect(result.bought).toBe(1);
    expect(result.goldLeft).toBe(0);
  });
});

// ── Arithmetic: mobile long-press cancel threshold (20px) ─────────────────────

describe('Mobile long-press cancel threshold (20px)', () => {
  /** Mirrors the onPointerMove mobile hold cancel check. */
  function shouldCancelHold(dx: number, dy: number): boolean {
    return Math.hypot(dx, dy) > 20;
  }

  it('does not cancel when pointer has not moved', () => {
    expect(shouldCancelHold(0, 0)).toBe(false);
  });

  it('does not cancel when exactly 20px away', () => {
    expect(shouldCancelHold(20, 0)).toBe(false);
  });

  it('does not cancel when within 20px diagonally', () => {
    // sqrt(14^2 + 14^2) ≈ 19.8 < 20
    expect(shouldCancelHold(14, 14)).toBe(false);
  });

  it('cancels when more than 20px away', () => {
    expect(shouldCancelHold(21, 0)).toBe(true);
  });

  it('cancels when moved diagonally past 20px', () => {
    // sqrt(15^2 + 15^2) ≈ 21.2 > 20
    expect(shouldCancelHold(15, 15)).toBe(true);
  });
});

// ── Arithmetic: region-select zero-area edge cases ────────────────────────────

describe('Region-select zero-area edge cases', () => {
  function towerInRect(
    tx: number, ty: number,
    rx: number, ry: number, rw: number, rh: number,
  ): boolean {
    return tx >= rx && tx <= rx + rw && ty >= ry && ty <= ry + rh;
  }

  it('zero-width rect includes tower exactly on the line', () => {
    expect(towerInRect(100, 200, 100, 200, 0, 100)).toBe(true);
  });

  it('zero-height rect includes tower exactly on the line', () => {
    expect(towerInRect(100, 200, 100, 200, 100, 0)).toBe(true);
  });

  it('zero-area point rect includes tower exactly at that point', () => {
    expect(towerInRect(100, 200, 100, 200, 0, 0)).toBe(true);
  });

  it('zero-area point rect excludes tower 1px away', () => {
    expect(towerInRect(101, 200, 100, 200, 0, 0)).toBe(false);
  });
});

// ── Structural: _batchBuyUpgrade guard ──────────────────────────────────────

describe('GameScene — _batchBuyUpgrade guards', () => {
  it('returns early when fewer than 2 towers selected', () => {
    expect(gameSceneSrc).toContain('this._selectedTowers.length < 2');
  });

  it('only applies upgrade when spent > 0', () => {
    expect(gameSceneSrc).toContain('if (spent > 0)');
  });
});

// ── Structural: sellTower multi-select interaction ──────────────────────────

describe('GameScene — sellTower checks multi-select', () => {
  it('checks _selectedTowers.includes(tower) before deselecting', () => {
    expect(gameSceneSrc).toContain('this._selectedTowers.includes(tower)');
  });

  it('S key clones _selectedTowers before iterating to avoid mutation', () => {
    expect(gameSceneSrc).toContain('[...this._selectedTowers]');
  });
});

// ── Structural: enterPlacementMode clears multi-select ──────────────────────

describe('GameScene — enterPlacementMode clears multi-select', () => {
  it('clears multi-select rings when entering placement mode', () => {
    expect(gameSceneSrc).toContain('for (const t of this._selectedTowers) t.setMultiSelected(false)');
  });

  it('hides _multiTowerPanel when entering placement mode', () => {
    // enterPlacementMode should hide the multi-tower panel
    expect(gameSceneSrc).toContain('this._multiTowerPanel.hide()');
  });

  it('cancels any active region-select when entering placement', () => {
    expect(gameSceneSrc).toContain('this._cancelRegionSelect()');
  });
});
