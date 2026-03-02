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
  /**
   * Path waypoints in tile coords.
   *
   * Single-path (legacy): flat `MapWaypoint[]` where first = spawn, last = exit.
   * Multi-path: `MapWaypoint[][]` — an array of complete spawn-to-exit paths.
   * Use `getWaypointPaths()` to normalise either form into `MapWaypoint[][]`.
   */
  waypoints: MapWaypoint[] | MapWaypoint[][];
  /**
   * Optional custom air route waypoints in tile coords.
   * If absent, air creeps fly directly from spawn to exit (first → last ground waypoint).
   * Map designers can define a gentle arc or specific air lane here.
   */
  airWaypoints?: MapWaypoint[];
  startingLives: number;
  startingGold: number;
}

/**
 * Normalise a map's `waypoints` field into an array of paths.
 * Single-path maps (flat `MapWaypoint[]`) become `[waypoints]`.
 * Multi-path maps (`MapWaypoint[][]`) are returned as-is.
 */
export function getWaypointPaths(data: MapData): MapWaypoint[][] {
  if (data.waypoints.length === 0) return [[]];
  // Multi-path: first element is itself an array of waypoints.
  if (Array.isArray(data.waypoints[0])) {
    return data.waypoints as MapWaypoint[][];
  }
  // Single-path (legacy).
  return [data.waypoints as MapWaypoint[]];
}
