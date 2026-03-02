---
id: TASK-050
title: Dual Entrance Map — Multi-Spawn Path Convergence
status: done
priority: medium
phase: gameplay
---

# Dual Entrance Map — Multi-Spawn Path Convergence

## Problem

All current maps have a single spawn point and single exit. This makes tower
placement predictable — just stack towers along the one corridor. A map with
two entrances forces players to split their defences and think about coverage
across multiple lanes.

## Goal

Create a new map where creeps enter from two different spawn points along
separate paths that converge into a shared corridor before reaching the exit.
This introduces lane-splitting strategy without requiring a complete rework of
the wave system.

## Acceptance Criteria

### Map Data
- [ ] New map JSON: `game/public/data/maps/map-05.json`
  - Grid: 32×18, tileSize: 40
  - Two distinct entry points (e.g. top-left and bottom-left)
  - Paths converge into a shared lane roughly mid-map
  - Single exit point (right side)
  - Convergence zone is a chokepoint — reward for AoE/tesla placement
  - Each lane has 1-2 turns before merging for individual tower coverage
- [ ] Map registered in `stageDefs.ts` as a new stage in an appropriate region

### WaveManager Multi-Spawn Support
- [ ] `WaveManager` updated to support multiple spawn points per map
- [ ] Map JSON extended with `waypoints` as an array of paths:
  ```json
  "waypoints": [
    [[0, 4], [8, 4], [16, 9], [24, 9], [31, 9]],
    [[0, 14], [8, 14], [16, 9], [24, 9], [31, 9]]
  ]
  ```
  (Array of waypoint arrays — each sub-array is a complete spawn-to-exit path)
- [ ] Backward compatible: if `waypoints` is a flat array of `[x,y]` pairs
  (existing maps), treat it as a single path
- [ ] Creeps alternate between paths or split evenly per wave (e.g. odd creeps
  take path A, even take path B)

### Creep Path Assignment
- [ ] Each creep is assigned a path at spawn time
- [ ] `Creep.ts` already follows waypoints — just needs to accept different
  waypoint arrays per instance
- [ ] Boss creeps: always spawn on path A (top lane) for predictability
- [ ] Visual: spawn markers shown at both entry points

### Balance
- [ ] Wave HP/count balanced for split-lane — same total creeps, distributed
  across both entrances
- [ ] Starting gold slightly higher (+25-50) to compensate for needing to
  cover two lanes
- [ ] Difficulty rating: 3-4 stars (intermediate — requires strategic placement)

### Stage Integration
- [ ] Stage tile on main menu shows a forked path thumbnail
- [ ] Tower affinity suggestion: tesla + mortar (AoE at convergence)
- [ ] Unlock cost: 200-300 crystals (mid-tier unlock)

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Existing single-path maps unaffected by WaveManager changes
- [ ] Creep pathfinding works correctly on both lanes
- [ ] All creeps reach the exit if not killed (no stuck creeps)

## Notes

- The convergence zone is the key strategic feature — it's where AoE towers
  shine and where the player should focus their strongest defences
- Consider making one lane slightly longer than the other so waves don't arrive
  at the convergence at exactly the same time (staggered pressure)
- Ojibwe name suggestion: "Niizh-miikana" (Two Paths) or similar
- This pairs well with the Ascension system — could be a late-game unlock that
  tests mastery of tower coverage
