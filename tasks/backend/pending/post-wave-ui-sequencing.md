---
id: TASK-081
title: Boss Loot Timing & Post-Wave UI Sequencing
status: pending
priority: high
phase: bugfix
category: backend
depends_on: []
created: 2026-03-02
---

## Problem

Multiple overlapping UI panels appear simultaneously at the end of boss waves:
- Boss kill loot/upgrade offer
- Elder dialog
- Post-wave between-wave upgrade offers

These overlap each other and are unusable. Additionally, the boss loot/upgrade option currently appears when the boss dies, but it should wait until ALL creeps from the boss round are killed first.

## Goal

Create a post-wave UI queue system that shows these panels sequentially, one at a time, each dismissing before the next appears.

## Implementation Plan

### 1. PostWaveUIQueue system

Create a queue manager that controls the order and timing of end-of-wave UI panels:
- Maintains an ordered queue of panel display requests
- Each entry specifies: panel type, data payload, dismiss callback
- Only one panel visible at a time
- When a panel is dismissed (button click or animation complete), the next panel in the queue is shown

### 2. Boss loot timing fix

Boss loot/upgrade panel must NOT appear until all creeps from the boss wave are dead:
- Track remaining creeps in the boss wave
- Only enqueue the boss loot panel after the wave is fully cleared (zero active creeps)
- This prevents the loot panel from appearing while escort creeps are still alive

### 3. Display priority order

When multiple panels are queued for the same post-wave moment:
1. Boss loot/gear reward (boss waves only)
2. Elder dialog (if any for this wave)
3. Between-wave upgrade offers

Non-boss waves skip step 1 and go straight to elder dialog (if any) or upgrade offers.

## Acceptance Criteria

- [ ] Boss loot/upgrade panel does NOT appear until all creeps from the boss wave are dead (wave fully cleared)
- [ ] A PostWaveUIQueue system manages the order of end-of-wave panels
- [ ] Display priority order: 1) Boss loot/gear reward -> 2) Elder dialog -> 3) Between-wave upgrade offers
- [ ] Each panel must be fully dismissed (button click or animation complete) before the next appears
- [ ] Non-boss waves skip step 1 and go straight to elder dialog (if any) or upgrade offers
- [ ] No overlapping UI panels at any point during the post-wave sequence
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Existing upgrade offer and elder dialog functionality unchanged -- only timing/sequencing changes

## Notes

- The WaveManager already emits `wave-complete` on scene.events -- the queue system should hook into this
- Boss death events (`boss-killed`) currently trigger the loot panel immediately -- this needs to be deferred
- Consider edge case: player loses all lives during boss wave while loot is queued (should skip loot display)
