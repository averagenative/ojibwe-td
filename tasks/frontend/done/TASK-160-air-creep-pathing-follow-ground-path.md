---
id: TASK-160
title: Air Creeps Should Roughly Follow Ground Path Instead of Random Screen Lanes
status: done
priority: high
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

Air creeps currently pick from 3 fixed lanes (top, middle, bottom of screen) at
random, which makes them feel disconnected from the ground path. They should instead
roughly follow the ground path with some lateral spread — flying "above" the ground
path rather than across completely different areas of the map.

## Current Behaviour

Each map defines `airWaypointPaths` with 3 independent lanes:
```json
"airWaypointPaths": [
  [row 1 waypoints...],    // top of screen
  [row 7-8 waypoints...],  // middle
  [row 13-16 waypoints...] // bottom of screen
]
```

`WaveManager._pickAirPath()` randomly selects a lane per creep. This spreads air
creeps across the full screen height regardless of where the ground path goes.

## Desired Behaviour

Air lanes should **shadow the ground path** with slight vertical offset:
- 2-3 air lanes that follow the same general route as the ground path
- Each lane offset ±1-3 rows above/below the ground path centerline
- Air creeps still randomly pick a lane, but all lanes stay near the path
- The spread should be enough for visual variety but not send creeps to
  far corners of the screen

## Implementation

### Option A: Auto-generate air paths from ground path (recommended)
In `GameScene.buildAllAirWaypointPaths()` or `WaveManager`, derive air lanes
from the ground waypoints by applying row offsets:

```typescript
// For each ground waypoint, create 2-3 air variants with Y offset
const OFFSETS = [-2, 0, 2]; // rows above, on, below ground path
airWaypointPaths = OFFSETS.map(offset =>
  groundWaypoints.map(wp => ({
    col: wp.col,
    row: clamp(wp.row + offset, 0, maxRow)
  }))
);
```

This automatically works for all maps and any future maps.

### Option B: Manually update map JSON files
Rewrite `airWaypointPaths` in each map JSON to trace near the ground path.
Simpler but requires manual updates per map.

### Recommendation
Option A is preferred — it's automatic, works for all maps, and makes air paths
always stay relevant to the ground path.

## Files to Change

- `game/src/scenes/GameScene.ts` — `buildAllAirWaypointPaths()` to derive from ground path
- OR `game/src/systems/WaveManager.ts` — modify how air paths are loaded/generated
- `game/public/data/maps/map-01.json` through `map-05.json` — update or remove
  `airWaypointPaths` if auto-generating from ground paths
- `game/src/types/MapData.ts` — `getAirWaypointPaths()` may need updates

## Edge Cases

- If ground path turns sharply, air paths should smooth the turn (air creeps
  don't need to follow tight corners — they can cut across)
- Clamp air waypoint rows to stay within map bounds
- Multi-entrance maps (map-03+): each ground path entrance should have its own
  air lane set
- Air paths should still enter from off-screen left and exit off-screen right

## Acceptance Criteria

- [ ] Air creeps fly roughly along the ground path, not to random screen edges
- [ ] 2-3 air lanes provide visual variety (slight vertical spread around path)
- [ ] Air lanes auto-derived from ground path (works for all maps automatically)
- [ ] Air creeps still enter from left edge and exit from right edge
- [ ] Multi-entrance maps handle air lanes per entrance correctly
- [ ] Air creep lane selection still uses seeded RNG for reproducibility
- [ ] No regression in ground creep pathing
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes — update pathing tests and any air waypoint assertions
