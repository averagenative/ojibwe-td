---
id: TASK-08
title: Run Loop & Game States
status: pending
category: frontend
phase: 8
openspec_ref: "Phase 8"
depends_on: []
created: 2026-02-28
---

## Description

Phase 8 of the GreenTD implementation. See proposal.md for full context.

## Acceptance Criteria

- [ ] Build `GameOverScene` (lives hit 0; show wave reached, run currency earned, Retry / Menu)
- [ ] Build `RunCompleteScene` (all 20 waves cleared; show stats, currency earned, Go to Meta)
- [ ] Wire full run flow (MainMenu → Game → BetweenWave ↔ Game → GameOver or RunComplete)
- [ ] Award run currency on exit to GameOver or RunComplete (pass to meta system)
- [ ] Display run currency earned in both end screens
- [ ] Add run currency accumulator to HUD (shows current-run earnings in real time)
- [ ] Playtest full 20-wave run; verify session lands in 15-20 minute window

## Notes

See openspec/changes/greentd-project/tasks.md Phase 8 for the full task list.
