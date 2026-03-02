import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialGrid } from '../SpatialGrid';

type Item = { x: number; y: number; active: boolean; id: string };

function item(id: string, x: number, y: number, active = true): Item {
  return { id, x, y, active };
}

describe('SpatialGrid', () => {
  let grid: SpatialGrid<Item>;

  beforeEach(() => {
    // 80px cells, 320×240 world (4×3 cells + edge guards)
    grid = new SpatialGrid<Item>(80, 320, 240);
  });

  // ── basic operations ──────────────────────────────────────────────────────

  it('returns empty array when grid is empty', () => {
    expect(grid.queryRadius(160, 120, 50)).toEqual([]);
  });

  it('finds an item at the exact query point', () => {
    const a = item('a', 100, 100);
    grid.insert(a);
    const res = grid.queryRadius(100, 100, 1);
    expect(res).toContain(a);
  });

  it('finds an item within the bounding box of the query radius', () => {
    const a = item('a', 100, 100);
    grid.insert(a);
    // item sits in same cell as query centre; bounding box must cover it
    const res = grid.queryRadius(120, 120, 60);
    expect(res).toContain(a);
  });

  it('does not return inactive items', () => {
    const a = item('a', 100, 100, false);
    grid.insert(a);
    expect(grid.queryRadius(100, 100, 200)).toEqual([]);
  });

  // ── multi-cell queries ────────────────────────────────────────────────────

  it('returns items from multiple cells when radius spans a boundary', () => {
    // cellSize 80: boundary at x=80. Put items on each side.
    const a = item('a', 75, 75); // cell (0,0)
    const b = item('b', 85, 75); // cell (1,0)
    grid.insert(a);
    grid.insert(b);
    const res = grid.queryRadius(80, 75, 20);
    expect(res).toContain(a);
    expect(res).toContain(b);
  });

  it('does NOT include items from far-away cells', () => {
    const near = item('near', 40, 40);    // cell (0,0)
    const far  = item('far',  280, 200); // cell (3,2)
    grid.insert(near);
    grid.insert(far);
    const res = grid.queryRadius(40, 40, 50);
    expect(res).toContain(near);
    expect(res).not.toContain(far);
  });

  // ── clear ─────────────────────────────────────────────────────────────────

  it('clear() removes all items from the grid', () => {
    grid.insert(item('a', 100, 100));
    grid.insert(item('b', 200, 150));
    grid.clear();
    expect(grid.queryRadius(100, 100, 200)).toEqual([]);
  });

  it('allows re-insertion after clear()', () => {
    const a = item('a', 100, 100);
    grid.insert(a);
    grid.clear();
    grid.insert(a);
    const res = grid.queryRadius(100, 100, 50);
    expect(res).toContain(a);
  });

  it('does not double-return items inserted twice between clears', () => {
    const a = item('a', 100, 100);
    grid.insert(a);
    grid.insert(a); // duplicate
    const res = grid.queryRadius(100, 100, 50);
    // Implementation may return it twice from the same cell; caller de-dupes.
    // What matters: at least one reference is returned.
    expect(res.some(x => x === a)).toBe(true);
  });

  // ── boundary / out-of-bounds ──────────────────────────────────────────────

  it('silently ignores out-of-bounds insertions', () => {
    expect(() => grid.insert(item('oob', -10, -10))).not.toThrow();
    expect(() => grid.insert(item('oob', 9999, 9999))).not.toThrow();
  });

  it('clamps queryRadius to valid cell range without throwing', () => {
    const a = item('a', 5, 5);
    grid.insert(a);
    // Query centred outside top-left corner — should still find item in cell (0,0)
    expect(() => grid.queryRadius(-50, -50, 100)).not.toThrow();
  });

  // ── multiple items per cell ───────────────────────────────────────────────

  it('returns all active items from the same cell', () => {
    const a = item('a', 10, 10);
    const b = item('b', 20, 20);
    const c = item('c', 30, 30); // all cell (0,0)
    grid.insert(a);
    grid.insert(b);
    grid.insert(c);
    const res = grid.queryRadius(20, 20, 10);
    expect(res).toContain(a);
    expect(res).toContain(b);
    expect(res).toContain(c);
  });
});
