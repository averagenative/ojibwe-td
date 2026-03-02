---
id: TASK-037
title: Boss Waves — Escort Creep Spawns
status: done
priority: medium
phase: gameplay
---

# Boss Waves — Escort Creep Spawns

## Problem

Boss waves currently spawn only the boss (`totalToSpawn = 1`). There are no
regular creeps, so the player gets no creep-kill gold or bonus interactions
(e.g. Poison spread, Waabizii heal proc, Supply Cache count) during the most
dramatic waves.

## Goal

Add a configurable escort pack to each boss wave so the boss arrives with
a wave of normal creeps. The player earns regular kill rewards and all
offer/commander synergies fire naturally.

## Acceptance Criteria

- [ ] `WaveDef` gains an optional `escorts` field:
  ```ts
  escorts?: {
    count:      number;    // how many escort creeps
    types:      CreepType[]; // pool to draw from (weighted uniform)
    intervalMs: number;    // spawn interval between escorts
    delayMs?:   number;    // delay before first escort (default 0)
  };
  ```
- [ ] When `waveDef.escorts` is present, `WaveManager.startWave()` spawns the
  escort pack alongside the boss:
  - `totalToSpawn` = `1 (boss) + escorts.count`
  - Boss spawns after its existing 800 ms dramatic delay
  - Escorts begin spawning after `escorts.delayMs` (default: 1200 ms, just
    after the boss appears) at `escorts.intervalMs` spacing
  - Each escort creep uses the same stat scaling as a normal creep of that
    type on this wave number (reuse existing `buildSpawnQueue` / scale logic)
- [ ] The wave does not complete until BOTH the boss AND all escort creeps are
  settled (killed or escaped) — `settled` counter already handles this if
  `totalToSpawn` is set correctly
- [ ] Update the four named boss waves (waves 5, 10, 15, 20) in the wave data
  source with escort packs:

  | Wave | Boss        | Escort pack                                 |
  |------|-------------|---------------------------------------------|
  | 5    | Makwa       | 6× normal, intervalMs 1400                  |
  | 10   | Migizi      | 8× fast, intervalMs 1000                    |
  | 15   | Waabooz     | 6× armored + 4× normal, intervalMs 1200     |
  | 20   | Animikiins  | 4× immune + 4× fast, intervalMs 1000        |

- [ ] Endless boss waves (wave 25+) auto-generate an escort pack: `count =
  4 + floor((waveNum - 25) / 5)`, types drawn from `ENDLESS_BOSS_ROTATION`
  companion pool (fast + armored), `intervalMs = 1000`
- [ ] Existing E2E tests still pass (`WaveManager.boss.e2e.test.ts`); add at
  least one test asserting that a boss wave with escorts fires `wave-complete`
  only after all escorts are settled

## Key File

`game/src/systems/WaveManager.ts` — `WaveDef` interface + `startWave()` +
`generateEndlessWave()`

Wave data lives in the `waveDefs` array passed into the `WaveManager`
constructor — find its source via `grep -rn "boss.*makwa\|boss.*migizi"
game/src/`.
