/**
 * SpatialGrid — axis-aligned uniform-grid spatial hash.
 *
 * Divides world space into fixed-size cells. On each frame GameScene calls
 * clear() then insert() for every active creep. Tower.findTarget() then calls
 * queryRadius() to get only the candidates near the tower, reducing target
 * search from O(all_creeps) to O(creeps_in_nearby_cells).
 *
 * With 30 creeps spread across a 1280×720 map and cellSize=80:
 *  - Grid dimensions: 17 cols × 10 rows = 170 cells
 *  - Average occupancy: ~0.18 creeps/cell
 *  - queryRadius for range=120 scans 3×3=9 cells → typically 1–2 candidates
 *    vs. iterating all 30 — an ~15× reduction in comparisons per tower.
 *
 * All cell arrays are pre-allocated and cleared in-place (no per-frame GC).
 */

export interface Positional {
  x: number;
  y: number;
  active: boolean;
}

export class SpatialGrid<T extends Positional> {
  private readonly cellSize: number;
  private readonly gridCols: number;
  private readonly gridRows: number;
  /** Pre-allocated flat array of per-cell item lists. */
  private readonly cells: T[][];
  /** Indices of cells that have at least one item — used for fast clear(). */
  private readonly occupied: number[] = [];

  /**
   * @param cellSize  World-pixel size of each grid cell (default 80).
   * @param mapWidth  World width in pixels — determines column count.
   * @param mapHeight World height in pixels — determines row count.
   */
  constructor(cellSize = 80, mapWidth = 1280, mapHeight = 720) {
    this.cellSize  = cellSize;
    this.gridCols  = Math.ceil(mapWidth  / cellSize) + 1;
    this.gridRows  = Math.ceil(mapHeight / cellSize) + 1;
    // Pre-allocate one empty array per cell.
    const totalCells = this.gridCols * this.gridRows;
    this.cells = new Array<T[]>(totalCells);
    for (let i = 0; i < totalCells; i++) this.cells[i] = [];
  }

  // ── public ────────────────────────────────────────────────────────────────

  /**
   * Remove all items from the grid. Resets only occupied cells (O(occupied),
   * not O(all cells)) and reuses the underlying arrays — no GC.
   */
  clear(): void {
    for (const idx of this.occupied) {
      this.cells[idx].length = 0;
    }
    this.occupied.length = 0;
  }

  /**
   * Insert an item at its current world position.
   * Out-of-bounds positions are silently ignored.
   */
  insert(item: T): void {
    const col = Math.floor(item.x / this.cellSize);
    const row = Math.floor(item.y / this.cellSize);
    if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows) return;
    const idx = row * this.gridCols + col;
    if (this.cells[idx].length === 0) this.occupied.push(idx);
    this.cells[idx].push(item);
  }

  /**
   * Return all *active* items whose cell overlaps the axis-aligned bounding
   * box of the query circle (x ± radius, y ± radius).
   *
   * NOTE: Results may include items outside the exact circle. The caller is
   * responsible for exact-distance filtering when needed.
   */
  queryRadius(x: number, y: number, radius: number): T[] {
    const minCol = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const maxCol = Math.min(this.gridCols - 1, Math.floor((x + radius) / this.cellSize));
    const minRow = Math.max(0, Math.floor((y - radius) / this.cellSize));
    const maxRow = Math.min(this.gridRows - 1, Math.floor((y + radius) / this.cellSize));

    const result: T[] = [];
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const cell = this.cells[row * this.gridCols + col];
        for (const item of cell) {
          if (item.active) result.push(item);
        }
      }
    }
    return result;
  }
}
