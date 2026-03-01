---
id: TASK-023
title: Endless Mode
status: pending
category: frontend
phase: 13
openspec_ref: ""
depends_on: ["TASK-11"]
created: 2026-03-01
---

## Description

Add an Endless Mode where waves continue indefinitely beyond wave 20, with logarithmically
scaling enemy stats. Players compete for highest wave reached. Score is displayed on the
run-complete screen and saved to meta-progression. This is the primary replayability driver
post-campaign.

## Acceptance Criteria

- [ ] Map selection cards (MainMenuScene) show a mode toggle or separate "ENDLESS" button per map.
- [ ] When Endless Mode is selected, `WaveManager` does not emit `run-complete` after wave 20 — instead generates wave 21, 22, … indefinitely.
- [ ] Endless wave generation formula: for wave `n > 20`, creep HP = `baseHp × (1 + 0.12 × (n - 20))`, speed = `baseSpeed × (1 + 0.03 × (n - 20))`. Boss waves occur every 5 waves (25, 30, 35 …).
- [ ] HUD wave counter shows "∞ Wave 21" (infinity symbol) once endless starts.
- [ ] On game over in endless mode, `GameOverScene` shows "Endless — Wave Reached: N" instead of "Waves: N / 20".
- [ ] `RunCompleteScene` is unreachable in endless mode (waves never "complete" the run).
- [ ] Best endless wave is saved per map via `SaveManager` (`endlessRecord-map-01`, `endlessRecord-map-02`).
- [ ] Best wave record displayed on the map selection card (e.g. "Best: Wave 34").
- [ ] Meta-currency (crystals) awarded on game over in endless: `floor(wavesCompleted / 5)` crystals, same as normal mode formula scaled to wave count.
- [ ] TypeScript compiles cleanly; `npm run test` passes.

## Notes

- The endless wave generator should live in `WaveManager` as a method `generateEndlessWave(n: number): WaveDef` — keeps all wave logic in one place.
- Pentatonic difficulty: Don't add new creep types for endless — just scale existing stats. New creep types can come in a future content patch.
- Map 2 should also support endless mode (same formula, different path).
- Consider adding a "Give Up" button in the HUD for endless mode so players can end a session gracefully rather than waiting to lose.
