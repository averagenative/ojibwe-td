/**
 * Pure pathing helpers — Phaser-free so they can be unit-tested without a
 * canvas/DOM environment.
 *
 * Used by Creep.step() to decide when a waypoint has been "reached" and to
 * advance past multiple waypoints in a single frame.
 */

/**
 * Minimum pixel distance at which a creep is considered to have "arrived" at
 * a waypoint.  The actual runtime threshold is:
 *   max(WAYPOINT_ARRIVAL_PX, stepDist)
 * — making it speed-aware so a fast creep on a slow frame can never overshoot
 * the check in a single tick (root cause of the corner-stuck bug).
 */
export const WAYPOINT_ARRIVAL_PX = 8;

export interface PathPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Compute the speed-aware arrival threshold for a single frame.
 * @param stepDist  Pixels the creep will travel this frame (speed * delta / 1000)
 */
export function computeArrivalThreshold(stepDist: number): number {
  return Math.max(WAYPOINT_ARRIVAL_PX, stepDist);
}

/**
 * Starting from `currentIndex`, advance past every waypoint that falls within
 * `arrivalThreshold` of the creep's current position `(cx, cy)`.
 *
 * Returns the new waypoint index (may equal `waypoints.length` if the creep
 * has passed the final waypoint — caller should treat this as "reached exit").
 */
export function advanceWaypointIndex(
  cx: number,
  cy: number,
  waypoints: ReadonlyArray<PathPoint>,
  currentIndex: number,
  arrivalThreshold: number,
): number {
  let idx = currentIndex;
  while (
    idx < waypoints.length &&
    Math.hypot(waypoints[idx].x - cx, waypoints[idx].y - cy) < arrivalThreshold
  ) {
    idx++;
  }
  return idx;
}
