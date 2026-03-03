---
id: TASK-032
title: Health Check Triage — Fix Real Issues
status: in-progress
priority: high
category: backend
phase: 13
openspec_ref: ""
depends_on: []
created: 2026-03-01
---

## Description

The health scanner created 27 task files in `tasks/health/pending/`. Many are false
positives (stale scans predating recent cleanup work). This task triages all 27, discards
the false positives, and fixes the genuine issues in one focused pass.

## Acceptance Criteria

- [ ] Read every file in `tasks/health/pending/` and categorise each as:
  - **Already fixed** — issue was resolved by TASK-022 or subsequent phases (mark done, move to health/done/)
  - **False positive** — health scanner misidentified valid code (delete the file)
  - **Real issue** — genuine bug or dead code (fix it)
- [ ] **Known real issues to fix** (confirmed from ROADMAP and code review):
  - `WaveManager.cleanup()` not called on victory path → call it in `RunCompleteScene` or
    `GameScene` on run-complete event
  - `Creep.clearDoTs()` defined but never called → call on creep death / scene restart, or
    remove if superseded by the shutdown cleanup task
  - `Creep.isSlowed()` defined but never called → wire into creep speed display in HUD or remove
  - `Tower.getSellValue()` dead code contradicting actual sell logic → reconcile: either use
    `getSellValue()` consistently or remove it and use the inline formula everywhere
  - `MapData.tiles` typed as `number[][]` instead of a `TILE` union type → fix the type
  - `Scene restart never resets gameState / currentWave / speed` → verify TASK-022 shutdown()
    handles this; add missing resets if not
  - `WaveManager.isActive()` and `getWaveNumber()` never called → remove dead methods or wire them
    into HUD display
- [ ] After fixes: re-run `scripts/health-check.sh --dry-run` and confirm the addressed
  issues no longer appear in output.
- [ ] All 27 health task files resolved (moved to done/ or deleted).
- [ ] `npm run typecheck` clean; `npm run test` passes.

## Notes

- Health task files are in `tasks/health/pending/` — they don't flow through the normal
  orchestrator pipeline (overnight runner only watches backend/pending and frontend/pending).
  This task consolidates all of them into one orchestrator-managed fix pass.
- Be conservative: if a "suspicious placeholder return value" is actually valid code
  (e.g. returning 0 as a default), mark it as false positive and delete the health file.
- After this task ships, run the health check again to get a clean baseline for the
  current codebase.
