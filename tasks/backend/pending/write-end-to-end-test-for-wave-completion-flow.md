---
id: TASK-012
title: Write end-to-end test for wave completion flow
status: pending
category: backend
phase: 5
openspec_ref: "Phase 5"
depends_on: ["TASK-05"]
created: 2026-02-28
---

## Description

Write an automated end-to-end test that exercises the full wave completion flow: last creep killed → `wave-complete` event emitted → gold awarded to player → `BetweenWaveScene` (or next-wave trigger) activated. This validates that WaveManager, GameScene event wiring, and gold/lives accounting remain correct as the codebase evolves.

## Acceptance Criteria

- [ ] Test spawns a wave with a known creep count and simulates all creeps being killed
- [ ] Test asserts `wave-complete` event fires exactly once per wave
- [ ] Test asserts player gold increases by the correct wave-completion bonus amount
- [ ] Test asserts no lives are lost when all creeps are killed before reaching the exit
- [ ] Test asserts that `creep-escaped` correctly decrements lives
- [ ] Test asserts that `wave-complete` is NOT emitted while any creep is still alive
- [ ] Tests run headlessly via `npm test` with no browser required (use Phaser headless/mock or plain unit test)
- [ ] All assertions pass on a clean checkout with no prior game state

## Notes

WaveManager emits on `scene.events`: `creep-killed`, `creep-escaped`, `wave-complete`. GameScene subscribes to these for gold/lives updates. The test MUST cover the boundary case where the last creep dies and one already escaped (lives > 0 but < max).
