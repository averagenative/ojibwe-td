---
id: TASK-147
title: Seeded Random Map & Path Generation (Binding of Isaac Style)
status: done
priority: medium
category: backend
phase: replayability
depends_on:
  - TASK-030
created: 2026-03-04
---

## Description

Create a framework for procedurally generating TD maps from a seed, similar to how
Binding of Isaac generates floor layouts. Same seed = same map every time. This is a
significant feature that adds massive replayability — every run can have a unique layout.

This is a research-heavy task. The initial deliverable should be a working prototype
and design doc, not necessarily a polished final system.

## Research Questions

Before implementation, investigate and document:
- [ ] What makes a "good" TD map? (choke points, path length, tower placement variety)
- [ ] How to ensure generated paths are always valid (no dead ends, reasonable length)
- [ ] Grid-based vs. waypoint-based generation — which fits our existing path system?
- [ ] How to guarantee difficulty fairness across seeds (some seeds shouldn't be trivially easy
  or impossibly hard)
- [ ] How many buildable tiles is the sweet spot? (current hand-crafted maps as baseline)
- [ ] Multi-path generation — some seeds could have split paths or converging paths

## Acceptance Criteria

### Phase 1: Framework & Prototype
- [ ] Depends on TASK-030 (seeded RNG) — use the `Rng` class for all randomness
- [ ] New `src/systems/MapGenerator.ts`:
  - `generateMap(seed: number, config: MapGenConfig): GeneratedMap`
  - `MapGenConfig`: grid size, min/max path length, num entry/exit points, difficulty tier
  - `GeneratedMap`: tile grid, waypoint paths, buildable tile positions, spawn/exit points
- [ ] Algorithm generates a valid creep path through the grid:
  - Path starts at edge, winds through grid, exits at opposite/adjacent edge
  - Path has minimum length requirement (prevents trivially short maps)
  - Buildable tiles placed adjacent to path segments
  - Optional: branching paths at higher difficulty tiers
- [ ] Seed reproducibility: same seed + same config = identical map every time
- [ ] Generated maps compatible with existing WaveManager and creep pathfinding

### Phase 2: Integration
- [ ] "Random Map" option in stage select (or auto-used by Quick Play)
- [ ] Seed display on HUD or pause screen (so players can share good seeds)
- [ ] Seed input field — let players type a seed to replay a specific layout
- [ ] Generated maps use the same tile rendering as hand-crafted maps

### Phase 3: Polish (future)
- [ ] Biome theming per seed range (forest, marsh, savanna visual variants)
- [ ] Difficulty scaling: later seeds / higher ascension = more complex paths
- [ ] "Daily seed" — same seed for all players each day (leaderboard potential)
- [ ] Seed history — save last N seeds played with win/loss record

## Algorithm Sketch

One approach (wave function collapse lite):
1. Place entry point on grid edge
2. Random walk with constraints (no backtracking, min distance from edges, bias toward center)
3. Place exit point when path reaches target length
4. Flood-fill buildable tiles adjacent to path (within N tiles)
5. Validate: path length ≥ minimum, buildable tiles ≥ minimum, no isolated sections
6. If invalid, retry with same seed + offset (deterministic retry)

Alternative: constraint-based generation
1. Define path as a series of waypoints
2. Generate waypoints using Perlin noise seeded by the run seed
3. Connect waypoints with smooth paths
4. Place buildable tiles using distance-from-path heuristic

## Tests
- [ ] Seed reproducibility: generate same map twice from same seed, assert identical
- [ ] Path validity: generated path has no gaps, reaches exit
- [ ] Buildable tile count within expected range
- [ ] Edge cases: minimum grid size, maximum path length
- [ ] Performance: generation completes in < 100ms for standard grid sizes
- [ ] `npm run typecheck` clean; `npm run test` passes

## Notes

- TASK-030 (seeded RNG) is a prerequisite — should land first
- This is the highest-effort task in the queue but also the highest-impact for replayability
- Start with Phase 1 as a standalone prototype, don't try to ship all 3 phases at once
- Binding of Isaac reference: they use a seed string (displayed as 8 characters) that players share
  — we could do similar (e.g. "BEAR-MOON-1234")
- The existing hand-crafted maps (Zaagaiganing, Mashkiig, Mitigomizh) stay as "story mode" maps;
  random generation is for "endless" / "quick play" mode
