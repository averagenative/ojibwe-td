export interface MapWaypoint {
  col: number;
  row: number;
}

/** tile value constants */
export const TILE = {
  BUILDABLE: 0,
  PATH: 1,
  SCENERY: 2,
} as const;

export interface MapData {
  id: string;
  name: string;
  description: string;
  tileSize: number;
  cols: number;
  rows: number;
  /** 2D array [row][col] of tile values */
  tiles: number[][];
  /** Ordered path waypoints in tile coords. First = spawn, last = exit. */
  waypoints: MapWaypoint[];
  startingLives: number;
  startingGold: number;
}
