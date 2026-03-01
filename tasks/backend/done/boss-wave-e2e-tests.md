---
id: TASK-025
title: Boss Wave E2E Tests
status: done
category: backend
phase: 11
openspec_ref: ""
depends_on: ["TASK-013"]
created: 2026-03-01
---

## Description

The wave completion E2E test (TASK-012) only covers normal waves. The boss wave flow —
spawn boss → boss takes damage → Waabooz split mechanic → mini-copies reach exit →
wave-complete event — is untested. A bug in the split path calculation or the
wave-complete trigger would be invisible until manual playtest. This task adds
comprehensive boss wave E2E coverage.

## Acceptance Criteria

- [ ] `src/systems/__tests__/WaveManager.boss.e2e.test.ts` created (separate file from normal wave e2e test).
- [ ] **Test: boss spawns on boss wave**: `WaveManager.startWave(5)` (first boss wave) spawns exactly one boss creep with the correct `bossType` (Waabooz).
- [ ] **Test: boss-wave-start event fires**: `boss-wave-start` scene event fires with correct boss data when boss wave begins.
- [ ] **Test: boss takes damage and dies**: Calling `boss.takeDamage(boss.maxHp)` triggers `boss-killed` scene event.
- [ ] **Test: Waabooz split spawns mini-copies**: On Waabooz death, two mini-copies are created at the correct remaining waypoint index (verified: `miniCopy.getCurrentWaypointIndex() === parentWpIdx`).
- [ ] **Test: mini-copies reaching exit triggers wave-complete**: Both mini-copies call `reachExit()` → `wave-complete` fires after both escape (not after just one).
- [ ] **Test: mini-copies killed triggers wave-complete**: Both mini-copies are killed → `wave-complete` fires.
- [ ] **Test: Waabooz death at final waypoint**: Boss dies at last waypoint — mini-copies spawn at last position with 0 remaining waypoints, immediately trigger `reached-exit`. No array-out-of-bounds error (guards the ROADMAP-noted risk).
- [ ] All tests use the same mock scene / mock creep factory pattern as the existing E2E tests.
- [ ] `npm run test` passes (all tests, not just boss tests).

## Notes

- Read `src/systems/__tests__/WaveManager.e2e.test.ts` before writing to match existing mock patterns.
- The ROADMAP documents a known risk: "If Waabooz dies at or near the last waypoint, `getCurrentWaypointIndex()` may return an index past `waypoints.length`" — the death-at-final-waypoint test specifically exercises this guard.
- Boss wave numbers: wave 5, 10, 15, 20 — use wave 5 for simplest test setup.
- Mock `BOSS_DEFS` and `computeWaaboozSplitConfig` at the module level using Vitest `vi.mock`.
