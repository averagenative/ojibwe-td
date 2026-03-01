---
id: TASK-06b
title: Tower Targeting & Behavior Controls
status: in-progress
category: backend
phase: 6
openspec_ref: "Phase 6 (addendum)"
depends_on: ["TASK-06"]
created: 2026-02-28
---

## Description

When a placed tower is selected, give the player per-tower behavior controls: target priority (which creep to focus) and tower-specific behavioral toggles. This turns tower placement from a set-and-forget decision into an active micromanagement layer — the right priority on the right tower compounds with upgrade synergies and roguelike offers.

Target priority and behavioral settings persist on each tower instance across waves and survive a respec.

## Acceptance Criteria

### Targeting Priority
- [ ] Define targeting priority enum: `FIRST` (furthest along path), `LAST` (closest to spawn), `STRONGEST` (highest current HP), `WEAKEST` (lowest current HP), `CLOSEST` (nearest to tower), `MOST_BUFFED` (most active DoT stacks / debuffs)
- [ ] Tower targeting logic reads the instance's active priority when selecting a new target each attack cycle
- [ ] Default priority for each tower type is defined in its TowerDef (e.g. Cannon → FIRST, Frost → STRONGEST, Poison → WEAKEST)
- [ ] Priority selector renders in the tower selection panel as a segmented button row or dropdown
- [ ] Changing priority takes effect immediately (within the same attack cycle, no cooldown required)
- [ ] Priority selection persists on the tower instance for the rest of the run

### Behavioral Toggles (per tower type)
- [ ] **Cannon** — "Armor Focus" toggle: when on, prioritizes armored creep subtypes over default priority
- [ ] **Frost** — "Chill Only" toggle: when on, tower applies slow but never triggers a full freeze (preserves Poison DoT stacks)
- [ ] **Mortar** — "Hold Fire" toggle: when on, tower pauses firing (useful to prevent disrupting Frost slow zones manually)
- [ ] **Poison** — "Stack Cap" toggle: choose between stack-to-max (default) or maintain-one-stack (for spread efficiency)
- [ ] **Tesla** — "Chain Direction" toggle: prefer chaining toward enemies closer to the exit vs. spreading to fresh targets
- [ ] **Aura** — no behavioral toggle (its effect is passive and range-based; priority has no meaning); UI shows a "Passive — no targeting" label instead

### UI
- [ ] Targeting controls appear in the same panel as upgrades (TASK-06) when a tower is selected
- [ ] Tower-type-specific toggle is only shown for the relevant tower type; hidden for others
- [ ] All controls are reachable without scrolling at viewport widths ≥ 800 px
- [ ] Toggling a behavior or changing priority does not close or reset the selection panel

### Correctness
- [ ] A tower whose current target dies or leaves range re-evaluates priority immediately when acquiring a new target
- [ ] `MOST_BUFFED` priority correctly counts active Poison stacks and Frost chill as separate buff contributions
- [ ] Unit tests cover: priority comparator for each mode, Frost chill-only guard, target re-acquisition on death

## Notes

- "Armor Focus" for Cannon should use a creep subtype flag (`isArmored: boolean`) already present or added to the Creep entity.
- Frost "Chill Only" is the mechanical counter to the Frost-shatter / Poison-DoT conflict introduced in TASK-06; it gives the player an explicit way to opt out.
- Mortar "Hold Fire" replaces the need for players to sell and re-place a Mortar during a combo setup.
- Behavioral toggles are distinct from upgrades — they have no gold cost and can be flipped freely.
