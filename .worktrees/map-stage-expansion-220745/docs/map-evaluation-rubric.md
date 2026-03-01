# Map Evaluation Rubric

> A stage MUST pass all rubric checks before its `status` is set to `"ready"`.

Run automated checks with:
```
npm run evaluate-map -- --stage <stageId>
```

---

## 1. Path Validity

**Criterion**: The path must be continuous, have no dead-ends, and must not overlap with any buildable zone.

**Checks**:
- Every waypoint tile is marked as `PATH` (`1`) in the tile grid.
- Each waypoint is reachable from the previous one by a continuous strip of path tiles (horizontal or vertical segment).
- No waypoint falls outside the grid bounds (`col ∈ [0, cols-1]`, `row ∈ [0, rows-1]`), except the final exit waypoint which may have `col === cols` or `col === cols + 1`.
- No path tile (tile value `1`) overlaps a tile that the game would treat as buildable (`TILE.BUILDABLE = 0`).

**Pass threshold**: All waypoint segments traceable; zero missing path tiles.

---

## 2. Difficulty Band (TTK)

**Criterion**: The time-to-kill (TTK) for a standard creep at wave 1 using un-upgraded towers must land in the target range.

**Method**: Use `creepEffectiveHP(creepKey, waveNumber)` and `towerEffectiveDPS(towerDef, upgradeState, waveNumber)` from `BalanceCalc.ts` (TASK-014 utilities).

**Target range**:
- **TTK minimum**: 1.0 s — a creep should survive at least one second of focused fire.
- **TTK maximum**: 8.0 s — no standard creep should require more than 8 seconds of un-upgraded fire.
- Measured with the cheapest tier-0 tower on the map (Cannon by default).

**Pass threshold**: TTK(wave 1 standard creep, Cannon tier-0) in [1.0 s, 8.0 s].

---

## 3. Tower Affinity Spread

**Criterion**: At least 3 of the 6 tower types must have a meaningful role on the map, as declared in `StageDef.towerAffinities`.

**Definition of "meaningful role"**: A tower is considered meaningful if the path geometry gives it at least one 2-second targeting window per wave (i.e. the path spends ≥ 2 s within range of a well-placed tower of that type).

**Checks**:
- `stageDef.towerAffinities.length >= 3`
- No single tower type accounts for more than 60 % of declared affinities in a region's entire stage set (prevents monoculture regions).

**Pass threshold**: `towerAffinities.length >= 3`.

---

## 4. Strategic Chokepoint Count

**Criterion**: The path must have 1–4 natural chokepoints — locations where the path narrows or turns, concentrating creeps for AoE.

**Definition**: A chokepoint is a path tile with ≤ 2 orthogonal path-tile neighbours (i.e. a corner or a segment end).

**Checks**:
- Count path tiles with exactly 1 or 2 orthogonal path-tile neighbours (excluding the first and last tiles which are entry/exit).
- Chokepoint count must be in [1, 4].

**Pass threshold**: `1 <= chokepoints <= 4`.

---

## 5. Boss Wave Fit

**Criterion**: Boss archetypes (from TASK-013 `bossDefs`) must reach at least 60 % of the path before dying in a non-upgraded run.

**Method**:
- For each boss archetype in `StageDef.creepRoster` that includes `"boss"`, simulate the boss's HP against the cumulative damage output of 4 un-upgraded Cannon towers placed at the map's top-N chokepoints.
- Measure the path percentage reached (waypoint progress) when the boss's HP drops to 0.

**Pass threshold**: All boss types reach ≥ 60 % path progress before death.

---

## 6. Creep Variety

**Criterion**: At least 3 distinct creep types must appear across the stage's wave set.

**Declared in**: `StageDef.creepRoster`.

**Valid types**: `standard`, `fast`, `armored`, `swarm`, `boss`.

**Pass threshold**: `creepRoster.length >= 3` with at least one of `standard`, one of `fast`/`armored`/`swarm`, and one `boss`.

---

## Automated Script

`scripts/evaluate-map.ts` implements the automated checks for criteria 1, 3, 4, and 6 (which can be computed from the map JSON and stage definition alone, without a full simulation runtime). Criteria 2 and 5 are flagged as "manual review required" in the output when the balance utility data is unavailable.

### Output format

```
=== Map Evaluation: mashkiig-01 (Wetland Crossing) ===
  Region    : Mashkiig (Wetlands)
  Difficulty: ★★☆☆☆
  Path file : map-02

[PASS] Path validity — 10 waypoints, all reachable, no buildable overlap
[PASS] Tower affinity spread — 3 affinities declared (mortar, poison, aura)
[PASS] Chokepoint count — 4 chokepoints found
[PASS] Creep variety — 5 types declared (standard, fast, armored, swarm, boss)
[NOTE] Difficulty band — manual review required (balance utilities not available in static mode)
[NOTE] Boss wave fit — manual review required (simulation not available in static mode)

Status: 4/4 automated checks PASSED
```

### Running

```bash
npm run evaluate-map -- --stage zaagaiganing-01
npm run evaluate-map -- --stage mashkiig-01
npm run evaluate-map -- --stage mitigomizh-01
npm run evaluate-map -- --stage biboon-aki-01
```
