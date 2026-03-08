---
id: TASK-179
title: "Fix: Give Up dialog YES/CANCEL buttons don't respond to taps"
status: in-progress
category: frontend
phase: release
priority: high
depends_on: []
created: 2025-03-07
---

## Description

In gameplay (endless mode), tapping the "Give Up" button shows the confirmation dialog, but the YES and CANCEL buttons inside the dialog don't respond to taps on mobile.

## Screenshots

- See `troubleshoot/give up buttons dont do anything.jpeg`

## Root Cause

The Give Up confirmation dialog creates objects at depth 150 (DEPTH + 50), which is >= UI_DEPTH_THRESHOLD (90). The `_reconcileCameras()` method in GameScene routes these to the UI camera only and makes the world camera ignore them. However, Phaser's input system may be processing the pointer events through the world camera first. The overlay at depth 150 is on the UI camera, but the world camera's `onPointerDown` handler intercepts the event and returns before the dialog buttons get a chance to process it.

The likely fix is ensuring the dialog buttons use `pointerup` (TAP_EVENT) which should work, but we need to verify the camera controller isn't swallowing the events. The CameraController registers on `scene.input` global events which fire before per-object events, potentially blocking them.

## Acceptance Criteria

- [ ] YES button in Give Up dialog works on mobile tap
- [ ] CANCEL button in Give Up dialog works on mobile tap
- [ ] Dialog overlay click/tap dismisses the dialog
- [ ] No regressions in other button interactions
