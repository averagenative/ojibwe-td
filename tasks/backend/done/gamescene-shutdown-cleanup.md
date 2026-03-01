---
id: TASK-022
title: GameScene Event Listener Cleanup (shutdown)
status: done
category: backend
phase: 11
openspec_ref: ""
depends_on: []
created: 2026-03-01
---

## Description

`GameScene` registers multiple `scene.events.on(...)` listeners in `create()` but never
removes them. On scene restart (new run, retry from game over), listeners accumulate —
each restart doubles the handler count. This causes duplicate gold awards, double life
deductions, and other hard-to-reproduce bugs in subsequent runs. Fix by adding a proper
`shutdown()` lifecycle method.

## Acceptance Criteria

- [ ] `GameScene` has a `shutdown()` method that calls `this.events.off(...)` (or `removeAllListeners()` scoped to the scene) for every listener registered in `create()`:
  - `creep-killed`
  - `creep-escaped`
  - `wave-bonus`
  - `boss-wave-start`
  - `boss-killed`
  - `creep-died-poisoned`
  - Any others added since Phase 3
- [ ] `shutdown()` also calls `this.waveManager.destroy()` (if it exists) and `this.audioManager?.destroy()` (Phase 21 audio system).
- [ ] `shutdown()` clears the creep Set and projectile array to prevent stale references holding memory after scene restart.
- [ ] Verified: starting a run, reaching game over, retrying, and completing wave 1 results in exactly one gold credit (not two or more).
- [ ] Existing tests pass (`npm run test`).
- [ ] TypeScript compiles cleanly.

## Notes

- Phaser calls `shutdown()` automatically when a scene is stopped/restarted — it's the correct hook for cleanup (not `destroy()`, which only runs when the scene is fully removed from the game).
- Use `this.events.off('event-name', handler, this)` (same args as `on`) — or store listeners as named methods/arrow functions assigned in `create()` so they can be referenced in `shutdown()`.
- The simpler approach `this.events.removeAllListeners()` in `shutdown()` is acceptable if all listeners are scene-scoped (they are, since `GameScene` only subscribes to its own events emitter).
- ROADMAP.md "Known Technical Debt" section documents this issue — update it to "fixed" after shipping.
