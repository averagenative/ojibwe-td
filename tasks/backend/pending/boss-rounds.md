---
id: TASK-013
title: Boss Rounds
status: pending
category: backend
phase: 6
openspec_ref: "Phase 6 (addendum)"
depends_on: ["TASK-06"]
created: 2026-02-28
---

## Description

Introduce boss rounds at regular intervals (every 5th wave: waves 5, 10, 15, 20) where a single powerful boss creep enters the path instead of the normal creep pack. Bosses have dramatically more HP, unique movement speeds, resistances, and a special mechanic that distinguishes them from regular creeps. Killing a boss awards a large gold bonus and a guaranteed roguelike offer draw (in addition to the normal between-wave offer). Boss rounds give the run its major tension spikes and reward players for investing in high-damage tower synergies.

## Acceptance Criteria

### Boss Creep Data
- [ ] Define `BossDef` schema extending `CreepDef` with: `isBoss: true`, `bossAbility` enum, `rewardGold: number`, `rewardOffer: boolean`
- [ ] Define 4 boss archetypes (one per boss wave):
  - **Wave 5 — Makwa (Bear)**: high HP, slow movement, armored (physical resist 30%)
  - **Wave 10 — Migizi (Eagle)**: moderate HP, fast movement, immune to slow/freeze effects
  - **Wave 15 — Waabooz (Hare)**: low HP but splits into 3 smaller copies on first death (each copy has 20% of original HP)
  - **Wave 20 — Animikiins (Thunderbird)**: very high HP, regenerates 1% max HP/sec, immune to poison DoT
- [ ] Boss HP values are derived from the wave's normal creep HP total (boss HP ≈ sum of all creeps that wave would have spawned)

### Wave Integration
- [ ] WaveManager detects boss wave index (wave % 5 === 0) and spawns boss creep instead of normal pack
- [ ] Boss wave has no other creeps — one boss entry only
- [ ] Boss waves are clearly flagged in wave data JSON so they can be authored explicitly rather than inferred

### Boss Mechanics
- [ ] Makwa: armor flag on creep instance; Cannon's armor-shred upgrade reduces this resistance
- [ ] Migizi: `isSlowImmune: true` flag; Frost and related slow/freeze effects skip this creep
- [ ] Waabooz: on HP reaching 0, spawns 3 mini-Waabooz creeps at same map position with 20% HP each
- [ ] Animikiins: passive HP regen tick (1% max HP per second); regen is cancelled for 3s after taking damage

### Rewards
- [ ] Killing a boss awards `BossDef.rewardGold` immediately (in addition to normal kill gold)
- [ ] If `rewardOffer: true`, a bonus roguelike offer screen is shown after the boss dies (before the normal between-wave offers)
- [ ] Boss escape (reaching exit) costs 3 lives instead of 1

### UI / Feedback
- [ ] Boss creep renders at 2× the normal creep scale with a distinct color tint per archetype
- [ ] Boss HP bar renders above the creep (large, visible across the map)
- [ ] HUD shows "BOSS WAVE" warning text when a boss wave begins
- [ ] Boss death triggers a distinct visual effect (larger particle burst, screen flash)
- [ ] Wave counter in HUD indicates boss waves with a special icon

### Correctness
- [ ] A mini-Waabooz that escapes costs 1 life (standard escape cost, not 3)
- [ ] Waabooz split does NOT trigger `wave-complete`; all 3 mini-copies must also die or escape
- [ ] Boss immune flags do not interfere with non-immune towers (e.g. Cannon still damages Migizi)
- [ ] Unit tests cover: boss HP calculation from wave data, Waabooz split spawn logic, regen tick cancellation

## Notes

Boss archetypes are named using Ojibwe animal names:
- Makwa = Bear, Migizi = Eagle, Waabooz = Hare/Rabbit, Animikiins = Little Thunderbird/Thunder-being
These names should appear in the HUD warning and in any future bestiary/codex.

The Waabooz split mechanic intentionally punishes burst-damage builds (Cannon/Mortar) and rewards DoT towers (Poison) since DoT persists onto the split copies.
