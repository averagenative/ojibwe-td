---
id: TASK-016
title: Map & Stage Expansion Framework
status: done
category: frontend
phase: 12
openspec_ref: "Phase 12"
depends_on: ["TASK-10"]
created: 2026-02-28
---

## Description

Extend the map system beyond two maps into a structured stage framework. Rather than treating each map as a standalone unlock, this task organises maps into named **regions** (territories of Ojibwe homelands / seasonal landscapes) each with 1–3 stage variants. A stage is a named map with its own wave count, creep roster, path layout, and difficulty rating. The meta-progression unlock tree (TASK-09) gates regions, giving long-term players a clear progression target.

This task also defines the **map evaluation rubric** — the criteria used to assess whether a new stage is balanced and ready to ship — so future maps can be authored and validated consistently.

## Acceptance Criteria

### Stage Data Schema
- [ ] Define `StageDef` schema: `id`, `regionId`, `name`, `description`, `waveCount`, `pathFile`, `difficulty: 1–5`, `towerAffinities: TowerType[]` (which tower types are advantaged on this map), `unlockCost: number`, `creepRoster: CreepType[]` (which creep types appear)
- [ ] Define `RegionDef` schema: `id`, `name`, `seasonalTheme` (spring/summer/autumn/winter), `stages: StageId[]`, `lore: string` (1–2 sentence cultural note)
- [ ] Author 4 regions with placeholder or real stage entries:
  - **Zaaga'iganing** (Lake Country) — Map 1 already; long straight path, balanced
  - **Mashkiig** (Wetlands/Swamp) — twisting path, poison/slow synergy
  - **Mitigomizh** (Oak Savanna) — open ground, few chokepoints, AoE-heavy challenge
  - **Biboon-aki** (Winter Lands) — ice map, frost towers amplified, creeps faster

### Map Evaluation Rubric
- [ ] Document rubric in `docs/map-evaluation-rubric.md` covering:
  - **Path validity**: no dead-ends, all waypoints reachable, no buildable-zone overlap
  - **Difficulty band**: TTK of standard creep at wave 1 using un-upgraded towers lands in target range (use TASK-014's `creepEffectiveHP` / `towerEffectiveDPS` utilities)
  - **Tower affinity spread**: at least 3 of the 6 tower types have a meaningful role (no map where only 1 tower type works)
  - **Strategic chokepoint count**: 1–4 natural chokepoints visible in the path (too few → uninteresting, too many → trivial)
  - **Boss wave fit**: boss archetypes from TASK-013 reach at least 60% of the path before dying in a non-upgraded run
  - **Creep variety**: at least 3 creep types used across the wave set (standard, fast, armored, boss)
- [ ] A new stage MUST pass all rubric checks before its status is set to `ready`
- [ ] Add an `npm run evaluate-map -- --stage <id>` script that runs the automated checks from the rubric and prints a pass/fail report

### UI
- [ ] Replace the 2-map selection screen (TASK-10) with a **region/stage map screen**: top level shows regions, clicking a region reveals its stages
- [ ] Each stage tile shows: name, difficulty (1–5 stars), tower affinity icons, locked/unlocked state
- [ ] Locked stages show unlock cost and which region currency (or meta-currency) unlocks them
- [ ] Seasonal theme is reflected in the region tile background (colour palette only; no new art required at this phase)

### Integration
- [ ] `GameScene` loads a `StageDef` instead of a raw map file; all wave and path data is derived from the stage
- [ ] Stage selection persists in `SaveManager` as `lastPlayedStage` so the player returns to the same stage on retry
- [ ] All stages pass the TASK-012 wave-completion flow test with their own wave data

## Notes

Region names are in Ojibwemowin (Ojibwe language). They should appear in-game with their English translation in parentheses on first display, then abbreviate to the Ojibwe name alone. This is a language-revitalisation gesture, not a translation burden — keep it lightweight.

Biboon-aki (Winter Lands) is intentionally thematic with the Frost tower — it could serve as a challenge stage where Frost towers are cheap/discounted but fire towers are penalised.
