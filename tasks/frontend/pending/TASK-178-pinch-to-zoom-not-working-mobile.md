---
id: TASK-178
title: "Fix: pinch-to-zoom not working on mobile"
status: in-progress
category: frontend
phase: release
priority: critical
depends_on: []
created: 2025-03-07
---

## Description

Pinch-to-zoom was implemented in TASK-175 but does not work on real iOS devices. The `CameraController` listens for 2+ active pointers, but Phaser's default input config only tracks **1 pointer** (`activePointers: 1`). The game config in `main.ts` does not set `input.activePointers`, so the second finger is never registered.

## Root Cause

`src/main.ts` GameConfig is missing `input: { activePointers: 2 }`. Without this, `this.scene.input.manager.pointers` will never have more than 1 active pointer, so `_startPinch()` is never triggered.

## Fix

Add `input: { activePointers: 2 }` to the Phaser game config in `main.ts`.

## Acceptance Criteria

- [ ] Phaser game config includes `input: { activePointers: 2 }`
- [ ] Pinch-to-zoom works on real iOS device
- [ ] Mouse wheel zoom still works on desktop
- [ ] No regressions in tap/click behavior
