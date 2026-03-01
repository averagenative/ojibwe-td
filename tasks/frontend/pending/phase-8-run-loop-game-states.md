---
id: TASK-08
title: Run Loop & Game States
status: pending
category: frontend
phase: 8
openspec_ref: "Phase 8"
depends_on: ["TASK-07"]
created: 2026-02-28
---

## Description

Wire together the complete run state machine: MainMenu → Game ↔ BetweenWave → GameOver or RunComplete. Introduce run currency earned during play, displayed live in the HUD and summarised on end screens, which feeds into the meta-progression system (Phase 9). A full 20-wave run SHOULD complete within 15–20 minutes.

## Acceptance Criteria

- [ ] Build `GameOverScene` (lives hit 0; show wave reached, run currency earned, Retry / Menu)
- [ ] Build `RunCompleteScene` (all 20 waves cleared; show stats, currency earned, Go to Meta)
- [ ] Wire full run flow (MainMenu → Game → BetweenWave ↔ Game → GameOver or RunComplete)
- [ ] Award run currency on exit to GameOver or RunComplete (pass to meta system)
- [ ] Display run currency earned in both end screens
- [ ] Add run currency accumulator to HUD (shows current-run earnings in real time)
- [ ] Playtest full 20-wave run; verify session lands in 15-20 minute window
- [ ] Run currency formula MUST be documented (e.g. base per wave + kill bonus) and implemented consistently
- [ ] Refreshing the browser mid-run MUST return to MainMenu, not a broken game state
- [ ] GameOverScene and RunCompleteScene MUST both correctly display currency earned even if value is 0
- [ ] Retry from GameOverScene MUST start a fresh run (no carry-over of towers, offers, or gold)

## Notes

See openspec/changes/greentd-project/tasks.md Phase 8 for the full task list.
