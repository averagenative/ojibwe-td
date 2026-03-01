# Map Evaluation Rubric

This document defines the criteria a stage must satisfy before its status can be set to `ready`.
Every criterion has a matching automated check in `scripts/evaluate-map.ts`.

Run all checks against a stage with:
```
npm run evaluate-map -- --stage <stageId>
```

List all known stages with:
```
npm run evaluate-map -- --list
```

---

## 1. Path Validity

**Criterion:** All waypoints are reachable, no dead-ends exist, and there is no overlap between path
tiles and explicitly buildable zones.

**Checks:**
- The waypoint array contains at least 2 points (spawn + exit).
- Every waypoint lies within the tile grid bounds (the final exit point may extend at most 2 columns
  beyond the right edge to allow off-screen exits).
- The spawn waypoint's tile value equals `PATH (1)` — confirming tiles match waypoints.

**Why it matters:** A single out-of-bounds waypoint causes creeps to freeze or teleport mid-path,
breaking the run silently.

---

## 2. Difficulty Band

**Criterion:** Time-to-kill (TTK) of a standard grunt creep at wave 1, using a single un-upgraded
Cannon tower, must produce a kill-potential in the range **[1.5, 30]**.

Kill-potential is defined as:
```
kill_potential = (path_traversal_time_sec) / (cannon_ttk_sec)
```

- **< 1.5** → the creep is likely to escape even with a perfectly-positioned cannon. The map may be
  unwinnable at the start.
- **> 30** → a single cannon trivially handles every wave-1 creep; the difficulty curve is broken.

**How it's measured:** Uses `creepEffectiveHP(1, 'grunt')` and `towerEffectiveDPS(CANNON_DEF, unupgraded, 1)`
from `src/systems/BalanceCalc.ts`, combined with the total pixel path length and grunt speed at wave 1.

---

## 3. Tower Affinity Spread

**Criterion:** At least **3 of the 6 tower types** must be listed in `StageDef.towerAffinities`.

A tower type is "advantaged" on a map if:
- Its optimal range covers multiple chokepoints simultaneously (AoE types: Mortar, Tesla).
- Its special mechanic (slow, DoT, chain) synergises with the path geometry (Frost on tight switchbacks,
  Poison on long straight stretches).
- The path spacing allows it to out-perform simpler alternatives by at least 20% in kill efficiency.

**Why it matters:** Maps where only 1 tower type works create degenerate gameplay. At least 3
distinct tower types should have a meaningful reason to be built.

---

## 4. Strategic Chokepoint Count

**Criterion:** The path must have between **1 and 8** natural chokepoints.

A natural chokepoint is an axis-aligned turn in the waypoint sequence (direction change from
horizontal to vertical or vice versa). Towers placed at or near a turn can cover multiple path
segments simultaneously.

- **0 chokepoints** → the path is a single straight line; defenders cannot leverage geometry.
- **> 8 chokepoints** → creeps pass through too many tight zones; any reasonable tower layout becomes
  trivially effective and the map loses challenge.

Note: Mitigomizh (Oak Savanna) intentionally targets 2 chokepoints as part of its "few chokepoints"
design mandate (map-01 has 6, map-02 has 8). Maps may be intentionally challenging in either
direction; this check signals the designer to verify the choice is intentional.

---

## 5. Boss Wave Fit

**Criterion:** At wave 5 (the first boss wave), the boss archetype must reach at least **60% of the
total path length** before dying in an un-upgraded run.

**How it's measured:**
- Boss HP = `creepEffectiveHP(5, 'grunt') × 8` (the `bossHpMultiplier` constant).
- Tower assumed: 1 un-upgraded Cannon.
- Boss movement speed = grunt base speed × wave-5 speed multiplier × 0.5 (bosses move at half normal creep speed).
- Distance covered = bossSpeed × (bossHP / cannonDPS).

**Why it matters:** If the boss dies before reaching mid-path with only 1 tower, the challenge of a
boss wave is negated. The 60% threshold ensures the boss provides genuine tension even at the start
of the game.

---

## 6. Creep Variety

**Criterion:** At least **3 distinct creep types** must appear in `StageDef.creepRoster`.

The minimum set should include one from each of the following archetypes:
- **Tanky / slow** (brute) — tests raw damage output.
- **Fast / fragile** (runner or scout) — tests reaction time and targeting priority.
- **Standard** (grunt) — baseline difficulty calibration.

Including both ground and air creep types is recommended but not enforced by this check.

**Why it matters:** Maps that only spawn one or two creep types reduce build diversity, as players
can fully optimise against a single damage profile.

---

## Passing All Checks

A stage MUST pass all 6 checks before `status` is set to `ready`. Stages with `status: pending` may
be present in `ALL_STAGES` but will remain locked and cannot be started until the check is run and
all criteria pass.

The evaluate-map script exits with code `0` on full pass and code `1` on any failure, making it
suitable for CI integration.

---

## Adding a New Stage

1. Add a `StageDef` entry to `src/data/stageDefs.ts` with a new `id`, `regionId`, `pathFile`,
   `waveCount`, `difficulty`, `towerAffinities`, and `creepRoster`.
2. Author the map JSON at `public/data/maps/<pathFile>.json` following the `MapData` schema in
   `src/types/MapData.ts`.
3. Run `npm run evaluate-map -- --stage <id>` and fix any failing checks.
4. Add an unlock node to `src/meta/unlockDefs.ts` if the stage is not free.
5. Add a `RegionDef` entry (or extend an existing region's `stages` array) in `src/data/stageDefs.ts`.
