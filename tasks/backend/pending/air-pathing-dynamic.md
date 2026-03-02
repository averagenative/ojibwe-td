# Dynamic Air Creep Pathing

- id: TASK-070
- status: pending
- priority: high
- tags: gameplay, air-creeps, pathing

## Problem

Air creeps fly in a straight line from spawn to exit with zero curves, drift, or altitude variation. They feel robotic and static compared to ground creeps that follow interesting paths.

## Current State

- Air creeps use the same `Creep.step()` linear waypoint lerp as ground creeps
- Default `buildAirWaypoints()` returns just `[spawnPoint, exitPoint]` — a single straight segment
- No maps define custom `airWaypoints` in their JSON
- No air-specific movement physics (no drift, bob, banking, altitude)
- `pathing.ts` has no air-specific logic

## Implementation Plan

### 1. Define custom airWaypoints per map

Add `airWaypoints` arrays to each map JSON (map-01 through map-05) with gentle curved routes:
- 4–6 waypoints per map creating sweeping arcs over the terrain
- Routes should cross over ground path at interesting angles (gives players tower placement decisions)
- Different maps should have distinct air lanes (not just copies of ground path)

### 2. Add air movement dynamics to Creep.step()

When `creepType === 'air'`, enhance the base waypoint movement with:

**Sine-wave drift** — lateral oscillation perpendicular to movement direction:
```typescript
// ~8–12px amplitude, period varies by creep speed
const drift = Math.sin(this.aliveTime * driftFreq) * driftAmplitude;
// Apply perpendicular to movement vector
```

**Altitude bob** — Y-offset oscillation (visual only, not affecting hitbox center):
```typescript
// Gentle 3–5px bob at different frequency than drift
const altBob = Math.sin(this.aliveTime * bobFreq) * bobAmplitude;
```

**Banking** — slight rotation toward movement direction changes:
```typescript
// Tilt sprite 5–15 degrees when turning between waypoints
this.body.setRotation(turnAngle * 0.15);
```

### 3. Add formation variety

- Solo air creeps: full drift amplitude
- Air creep groups (3+): offset drift phase per creep so they form a loose V or staggered line
- Boss air creeps: slower drift, larger amplitude, more imposing movement

### 4. Per-creep variation

Use creep spawn index or ID to seed slight randomness:
- `driftAmplitude`: base ± 20%
- `driftFreq`: base ± 15%
- `bobFreq`: offset by spawn order to prevent synchronized bobbing

## Files to Modify

- `game/public/data/maps/map-01.json` through `map-05.json` — add airWaypoints
- `game/src/entities/Creep.ts` — air movement dynamics in step()
- `game/src/data/pathing.ts` — optional air-specific utility functions

## Acceptance Criteria

- [ ] Air creeps follow curved multi-waypoint routes (not straight lines)
- [ ] Air creeps have visible sine-wave drift during flight
- [ ] Air creeps bob gently in altitude
- [ ] Each air creep has slightly different movement timing (no synchronized swarm)
- [ ] Air creep movement looks natural and distinct from ground creep movement
- [ ] All existing air mechanics preserved (50% slow resistance, tower targeting, etc.)
- [ ] No performance regression with 20+ air creeps on screen
