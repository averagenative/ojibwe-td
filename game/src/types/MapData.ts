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
  tiles: (typeof TILE[keyof typeof TILE])[][];
  /**
   * Path waypoints in tile coords.
   *
   * Single-path (legacy): flat `MapWaypoint[]` where first = spawn, last = exit.
   * Multi-path: `MapWaypoint[][]` — an array of complete spawn-to-exit paths.
   * Use `getWaypointPaths()` to normalise either form into `MapWaypoint[][]`.
   */
  waypoints: MapWaypoint[] | MapWaypoint[][];
  /**
   * Optional custom air route waypoints in tile coords (single path, legacy).
   * Superseded by `airWaypointPaths`; kept for backward compatibility.
   * If absent and `airWaypointPaths` is also absent, air creeps fly directly
   * from spawn to exit (first → last ground waypoint).
   */
  airWaypoints?: MapWaypoint[];
  /**
   * Optional list of 2–3 distinct air lanes (each a sequence of tile-coord
   * waypoints).  When present, each air creep randomly picks one of these
   * lanes, encouraging players to spread anti-air coverage across the map.
   *
   * Each sub-array must have ≥ 2 waypoints (spawn … exit).
   */
  airWaypointPaths?: MapWaypoint[][];
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

/**
 * Normalise a map's air path definitions into an array of paths.
 *
 * Priority order:
 *  1. `airWaypointPaths` — explicit multi-lane definitions (preferred).
 *  2. `airWaypoints`     — single-lane legacy field (wrapped in an array).
 *  3. Fallback           — direct line using the supplied ground waypoints
 *     (first spawn → last exit of path A).
 *
 * Every returned path is guaranteed to have ≥ 2 waypoints.
 */
export function getAirWaypointPaths(
  data: MapData,
  groundPath: MapWaypoint[],
): MapWaypoint[][] {
  if (data.airWaypointPaths && data.airWaypointPaths.length >= 1) {
    const valid = data.airWaypointPaths.filter(p => p.length >= 2);
    if (valid.length >= 1) return valid;
  }
  if (data.airWaypoints && data.airWaypoints.length >= 2) {
    return [data.airWaypoints];
  }
  // Default: spawn-to-exit straight line.
  if (groundPath.length < 2) return [];
  const first = groundPath[0];
  const last  = groundPath[groundPath.length - 1];
  return [[first, last]];
}
