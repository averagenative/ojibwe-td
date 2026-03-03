---
id: TASK-034
title: Ascension System
status: pending
category: backend
phase: 14
openspec_ref: ""
depends_on: ["TASK-11"]
created: 2026-03-01
---

## Description

Add a post-campaign Ascension ladder so clearing wave 20 is the beginning of the game,
not the end. Each Ascension level (0–10) adds a curated global modifier that changes
how the game plays — not just harder numbers, but new mechanical challenges. Players
unlock Ascension 1 by completing a standard run, and each subsequent level by completing
the previous one. Ascension level is saved in meta-progression and persists between sessions.

## Acceptance Criteria

### Data & Save
- [ ] `src/data/ascensionDefs.ts` created — exports `ASCENSION_DEFS: AscensionDef[]`, one
  entry per level (1–10):
  ```ts
  interface AscensionDef {
    level: number;
    name: string;           // short name, e.g. "Gichi-bitoosiwin" (Great Difficulty)
    description: string;    // one sentence shown on the pre-run screen
    modifiers: AscensionModifier[];
  }
  ```
- [ ] The 10 ascension levels with distinct modifiers (accumulating — level 3 includes
  levels 1 and 2 modifiers too):
  1. **Nimaajiidaa** — Creeps have +20% HP
  2. **Waabishkizi** — Creep move speed +10%
  3. **Mashkawizid** — Armoured creeps appear 3 waves earlier
  4. **Moozhitaad** — Regenerating creeps heal 1% max HP per second
  5. **Ozhaawashkwaa** — Immune creeps are immune to slowing AND poison
  6. **Bizhiw-mitig** — A random tower is disabled (greyed out, 0 DPS) for 20s each wave
  7. **Ajijaak** — Flying creeps bypass the last 3 path tiles (appear near the exit)
  8. **Miigaazid** — Creeps killed by poison release a toxic cloud that slows nearby towers 15%
  9. **Animikiikaa** — Every 5th wave, 3 lightning strikes disable random towers for 5s
  10. **Michi-gami** — All of the above. Gold income reduced 10%.
- [ ] `SaveManager` stores `currentAscension: number` (0 = not yet unlocked, default).
  After each successful wave-20 clear at level N, `SaveManager` records that level N is
  cleared and level N+1 is available.

### UI
- [ ] Pre-run screen (between `CommanderSelectScene` and `GameScene`) or on the map
  selection card shows current available ascension level with a brief modifier list.
- [ ] Player can choose to start at any ascension level they have unlocked or lower
  (e.g. choose Ascension 3 even if they have cleared up to 5).
- [ ] HUD shows current ascension level (small "A3" badge or similar) during the run.
- [ ] On `RunCompleteScene`: if the run was at Ascension N and player has never cleared N
  before, show "Ascension {N} Complete! Ascension {N+1} unlocked." with the next level's
  modifier preview.

### Game Integration
- [ ] `GameScene` receives `ascensionLevel: number` in its init data.
- [ ] `AscensionSystem` (new `src/systems/AscensionSystem.ts`) applies modifiers to the
  game at runtime:
  - HP multiplier applied in `WaveManager` when spawning creeps
  - Speed multiplier applied in `Creep` constructor
  - Tower disable (level 6): random tower selection at wave start, tween to grey, restore after 20s
  - Lightning strikes (level 9): `delayedCall` every 5 waves, random tower target
- [ ] Modifiers are additive/composable — level 5 applies all level 1–5 effects simultaneously.
- [ ] `AscensionSystem` has a `destroy()` method that clears all scheduled events on shutdown.
- [ ] `npm run test` passes; `npm run typecheck` clean.

## Notes

- The Ojibwe names for each level are intentional — each represents a concept of growing
  difficulty or natural power. They should appear in the UI alongside the English description.
- "Ascension 0" is just a normal run — no badge needed, no special UI.
- The tower-disable and lightning-strike modifiers should feel dramatic but fair. A disabled
  tower shows a visual indicator (dim + "⚡" icon or grey overlay), and the player should
  always have at least 3s warning before a strike.
- Crystal rewards should scale with ascension level: `baseCrystals × (1 + 0.15 × ascensionLevel)`.
