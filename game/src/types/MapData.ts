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
  /**
   * Optional custom air route waypoints in tile coords.
   * If absent, air creeps fly directly from spawn to exit (first → last ground waypoint).
   * Map designers can define a gentle arc or specific air lane here.
   */
  airWaypoints?: MapWaypoint[];
  startingLives: number;
  startingGold: number;
}
