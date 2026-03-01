---
id: TASK-026
title: Fix Creep Corner-Stuck Pathing
status: done
category: backend
phase: 11
openspec_ref: ""
depends_on: []
created: 2026-03-01
---

## Description

Creeps occasionally get stuck at path corners — they pause briefly before self-correcting
and continuing. The symptom suggests the waypoint arrival check uses a fixed pixel
threshold that is sometimes too tight: a creep overshoots slightly at a corner, fails the
"close enough to advance waypoint" check for one or more frames, then corrects on the
next physics tick when position math catches up.

## Acceptance Criteria

- [ ] Root cause identified and documented in a code comment — specifically whether the
  issue is in the arrival distance threshold, the movement step size outpacing the
  threshold at high speed/low FPS, or something else.
- [ ] Arrival threshold is made speed-aware: a creep should be considered "at" a waypoint
  if its distance is less than `max(ARRIVAL_THRESHOLD, speed * delta)` — so a fast creep
  or a slow frame can never overshoot the threshold in a single tick.
- [ ] Corner turns are smooth: creep immediately begins moving toward the next waypoint on
  the same frame it advances the waypoint index (no one-frame pause at the corner).
- [ ] Fix works for both normal creeps and boss creeps (Waabooz and its mini-copies).
- [ ] Fix works on both Map 1 and Map 2 path geometries.
- [ ] No new stuck cases introduced — verify by running a full 20-wave playthrough in the
  browser without observing any hesitation at corners.
- [ ] `npm run test` passes; `npm run typecheck` clean.

## Notes

- The pathing logic lives in `src/entities/Creep.ts` — look at the `update()` method's
  waypoint advancement section. The key variables are likely named something like
  `waypointIndex`, `targetX/Y`, and a distance check before calling something like
  `advanceWaypoint()`.
- A common fix pattern: after advancing the waypoint index, immediately compute the
  direction vector toward the new target in the same frame (don't wait until the next
  `update()` call). This eliminates the one-frame pause.
- If the threshold is a hardcoded constant (e.g. `8` pixels), replace it with a named
  constant `WAYPOINT_ARRIVAL_PX = 8` and apply the speed-aware formula above.
- Waabooz mini-copies spawn mid-path with a `startWaypointIndex` — make sure the fix
  doesn't break that spawn offset logic.
