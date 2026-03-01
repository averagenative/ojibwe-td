/**
 * Unit tests for the pure pathing helpers in src/data/pathing.ts.
 *
 * Covers:
 *   1. computeArrivalThreshold  — speed-aware floor, zero/negative stepDist
 *   2. advanceWaypointIndex     — happy path, multi-skip, boundary, empty waypoints
 *   3. WAYPOINT_ARRIVAL_PX      — constant sanity
 */

import { describe, it, expect } from 'vitest';
import {
  WAYPOINT_ARRIVAL_PX,
  computeArrivalThreshold,
  advanceWaypointIndex,
  type PathPoint,
} from '../../data/pathing';

// ── helpers ────────────────────────────────────────────────────────────────

/** Build a simple right-angle path for testing. */
function straightPath(count: number, spacing: number): PathPoint[] {
  return Array.from({ length: count }, (_, i) => ({ x: i * spacing, y: 0 }));
}

// ── 1. computeArrivalThreshold ─────────────────────────────────────────────

describe('computeArrivalThreshold', () => {
  it('returns WAYPOINT_ARRIVAL_PX when stepDist is smaller', () => {
    expect(computeArrivalThreshold(2)).toBe(WAYPOINT_ARRIVAL_PX);
  });

  it('returns stepDist when it exceeds WAYPOINT_ARRIVAL_PX', () => {
    const bigStep = WAYPOINT_ARRIVAL_PX + 10;
    expect(computeArrivalThreshold(bigStep)).toBe(bigStep);
  });

  it('returns WAYPOINT_ARRIVAL_PX when stepDist is exactly equal', () => {
    // max(8, 8) = 8
    expect(computeArrivalThreshold(WAYPOINT_ARRIVAL_PX)).toBe(WAYPOINT_ARRIVAL_PX);
  });

  it('handles zero stepDist', () => {
    expect(computeArrivalThreshold(0)).toBe(WAYPOINT_ARRIVAL_PX);
  });

  it('handles negative stepDist gracefully', () => {
    expect(computeArrivalThreshold(-5)).toBe(WAYPOINT_ARRIVAL_PX);
  });
});

// ── 2. advanceWaypointIndex ────────────────────────────────────────────────

describe('advanceWaypointIndex', () => {
  // ── happy path ──

  it('does not advance when creep is far from all waypoints', () => {
    const wps = straightPath(5, 100); // 0,100,200,300,400
    // Creep at (50, 0), targeting wp[1] at (100,0) — dist=50, threshold=8
    const result = advanceWaypointIndex(50, 0, wps, 1, 8);
    expect(result).toBe(1);
  });

  it('advances past one waypoint when within threshold', () => {
    const wps = straightPath(5, 100);
    // Creep at (97, 0), targeting wp[1] at (100,0) — dist=3, threshold=8
    const result = advanceWaypointIndex(97, 0, wps, 1, 8);
    expect(result).toBe(2);
  });

  it('advances past multiple waypoints in a single call (lag spike)', () => {
    // Waypoints every 10px apart, creep near wp[1], threshold=50 (huge step)
    const wps = straightPath(6, 10); // 0,10,20,30,40,50
    // Creep at (5, 0), threshold=50 → within range of wp[1](10), wp[2](20), wp[3](30), wp[4](40)
    const result = advanceWaypointIndex(5, 0, wps, 1, 50);
    // wp[5] at 50 is exactly 45 away from (5,0) → 45 < 50 → should also advance
    expect(result).toBe(6); // past all remaining
  });

  it('advances to waypoints.length when creep passes the final waypoint', () => {
    const wps = straightPath(3, 10); // 0,10,20
    // Creep at (19, 0), targeting wp[2] at (20,0) — dist=1, threshold=8
    const result = advanceWaypointIndex(19, 0, wps, 2, 8);
    expect(result).toBe(3); // past the end → "reached exit"
  });

  // ── boundary / edge cases ──

  it('returns currentIndex unchanged when already past the end', () => {
    const wps = straightPath(3, 10);
    const result = advanceWaypointIndex(0, 0, wps, 3, 8);
    expect(result).toBe(3);
  });

  it('handles empty waypoints array', () => {
    const result = advanceWaypointIndex(0, 0, [], 0, 8);
    expect(result).toBe(0);
  });

  it('handles single-waypoint array at index 0', () => {
    const wps: PathPoint[] = [{ x: 0, y: 0 }];
    // Creep at (0,0), exactly on the waypoint → dist=0 < 8 → advance
    const result = advanceWaypointIndex(0, 0, wps, 0, 8);
    expect(result).toBe(1);
  });

  it('does not advance when distance equals threshold (strict < comparison)', () => {
    const wps: PathPoint[] = [{ x: 0, y: 0 }, { x: 8, y: 0 }];
    // Creep at (0,0), targeting wp[1] at (8,0) — dist=8, threshold=8
    // 8 < 8 is false → should NOT advance
    const result = advanceWaypointIndex(0, 0, wps, 1, 8);
    expect(result).toBe(1);
  });

  it('advances when distance is just under threshold', () => {
    const wps: PathPoint[] = [{ x: 0, y: 0 }, { x: 7.9, y: 0 }];
    // Creep at (0,0), targeting wp[1] at (7.9,0) — dist=7.9, threshold=8
    const result = advanceWaypointIndex(0, 0, wps, 1, 8);
    expect(result).toBe(2);
  });

  // ── diagonal path ──

  it('handles diagonal waypoints correctly (Pythagorean distance)', () => {
    const wps: PathPoint[] = [
      { x: 0, y: 0 },
      { x: 3, y: 4 }, // dist from origin = 5
      { x: 100, y: 100 },
    ];
    // Creep at origin, threshold=6 → wp[1] at dist 5 → advance; wp[2] at ~141 → stop
    const result = advanceWaypointIndex(0, 0, wps, 1, 6);
    expect(result).toBe(2);
  });

  // ── Waabooz split compatibility ──

  it('works with split-copy waypoints (starting index 1, first wp is spawn pos)', () => {
    // Simulates WaveManager creating remainingWps = [bossPos, ...remaining]
    const bossDeathPos = { x: 200, y: 150 };
    const remaining: PathPoint[] = [
      bossDeathPos,          // index 0 = spawn position (boss death pos)
      { x: 250, y: 150 },   // index 1 = first real target
      { x: 300, y: 200 },
    ];
    // Mini-copy spawns at bossDeathPos, waypointIndex=1 (targeting wp[1])
    // Dist from (200,150) to (250,150) = 50, threshold=8 → should NOT advance
    const result = advanceWaypointIndex(200, 150, remaining, 1, 8);
    expect(result).toBe(1);
  });
});

// ── 3. WAYPOINT_ARRIVAL_PX constant ────────────────────────────────────────

describe('WAYPOINT_ARRIVAL_PX', () => {
  it('is a positive number', () => {
    expect(WAYPOINT_ARRIVAL_PX).toBeGreaterThan(0);
  });

  it('equals 8', () => {
    expect(WAYPOINT_ARRIVAL_PX).toBe(8);
  });
});
