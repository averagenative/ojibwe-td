---
id: TASK-148
title: Rush Wave Only Gives 1 Wave Clear Upgrade Instead of Full Offer Set
status: pending
priority: high
category: backend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

When rushing a wave, the post-wave offer panel only presents 1 upgrade card instead of
the normal set (typically 3, or 4 with Oshkaabewis commander aura). This makes rushing
feel punishing rather than rewarding — players lose offer variety for playing aggressively.

## Expected Behavior

Rushed waves should give the same number of wave clear offers as normally completed waves.

## Likely Cause

The rush path in `GameScene.onWaveComplete()` or the `BetweenWaveScene` / `OfferManager`
may be passing incorrect parameters when the wave was rushed (e.g. fewer offer slots,
skipping the offer roll, or only generating 1 card).

Check:
- `GameScene.onWaveComplete()` — rush block vs normal block offer generation
- `OfferManager` — does it check a rushed flag that limits offers?
- `BetweenWaveScene` — does it receive the correct offer count?
- `WaveManager._onSettledForWave()` — does the wave-complete event carry different data for rushed waves?

## Acceptance Criteria

- [ ] Rushed waves produce the same number of offer cards as non-rushed waves
- [ ] Commander aura bonuses (e.g. Oshkaabewis +1 card) still apply on rushed waves
- [ ] Tests covering rushed vs non-rushed offer count parity
- [ ] `npm run typecheck` clean; `npm run test` passes

## Files to Investigate

- `game/src/scenes/GameScene.ts` — `onWaveComplete()`, `rushNextWave()`
- `game/src/systems/OfferManager.ts` — offer generation
- `game/src/scenes/BetweenWaveScene.ts` — offer display
- `game/src/systems/WaveManager.ts` — wave-complete event data
