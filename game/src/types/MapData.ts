export interface MapWaypoint {
  col: number;
  row: number;
}

/** tile value constants */
export const TILE = {
  BUILDABLE: 0,
  PATH: 1,
  SCENERY: 2,
  /** Dense tree/conifer cluster — blocks tower placement. */
  TREE: 3,
  /** Low brush / marsh grass — allows tower placement. */
  BRUSH: 4,
  /** Granite rock outcrop — blocks tower placement. */
  ROCK: 5,
  /** Water / lake tile — allows tower placement. */
  WATER: 6,
  /** Birch grove — blocks tower placement. */
  BIRCH: 7,
  /** Cattail marsh — allows tower placement. */
  CATTAIL: 8,
} as const;

/**
 * Returns true if a tower can be placed on a tile of the given type.
 *
 * PATH is the creep trail. SCENERY, TREE, BIRCH, and ROCK are impassable
 * terrain that blocks construction. All other types allow building.
 */
export function isBuildable(tileType: number): boolean {
  return (
    tileType !== TILE.PATH &&
    tileType !== TILE.SCENERY &&
    tileType !== TILE.TREE &&
    tileType !== TILE.BIRCH &&
    tileType !== TILE.ROCK
  );
}

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
 * Row offsets applied to each ground-path waypoint to create air lanes.
 * Produces 3 lanes: 2 rows above the path, on the path, and 2 rows below.
 */
export const AIR_LANE_OFFSETS = [-2, 0, 2] as const;

/**
 * Auto-derive 3 air lanes from a ground path by applying row offsets.
 * Each lane is a copy of the ground path with every row shifted by the offset,
 * clamped to [0, maxRow].  Returns an empty array if the ground path has fewer
 * than 2 waypoints.
 */
export function deriveAirPathsFromGround(
  groundPath: MapWaypoint[],
  maxRow: number,
): MapWaypoint[][] {
  if (groundPath.length < 2) return [];
  return AIR_LANE_OFFSETS.map(offset =>
    groundPath.map(wp => ({
      col: wp.col,
      row: Math.max(0, Math.min(maxRow, wp.row + offset)),
    }))
  );
}

/**
 * Normalise a map's air path definitions into an array of paths.
 *
 * Priority order:
 *  1. `airWaypointPaths` — explicit multi-lane definitions (preferred).
 *  2. `airWaypoints`     — single-lane legacy field (wrapped in an array).
 *  3. Fallback           — auto-derive 3 lanes from the ground path using
 *     row offsets [-2, 0, +2] (shadows the ground path with vertical spread).
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
  // Auto-derive 3 lanes shadowing the ground path with ±2 row offsets.
  return deriveAirPathsFromGround(groundPath, data.rows - 1);
}
