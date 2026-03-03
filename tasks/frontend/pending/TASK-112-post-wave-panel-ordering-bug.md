---
id: TASK-112
title: Post-Wave Panel Ordering Bug — Elder Dialog, Boss Loot & Offers Overlap
priority: high
status: in-progress
type: bug
---

# Post-Wave Panel Ordering Bug — Elder Dialog, Boss Loot & Offers Overlap

## Problem
The end-of-wave panels (boss kill loot, elder dialog vignettes, and between-wave upgrade offers) are not rendering in the correct order. They appear to overlap or show out of sequence instead of appearing one at a time.

The PostWaveUIQueue implementation looks correct (enqueue → flush → serial show/dismiss chain), so the issue is likely:
1. One of the `show()` callbacks not waiting for player dismissal before the next panel appears
2. A depth/z-order issue where BetweenWaveScene renders on top of the vignette overlay
3. The `onDismiss` callback not being called (or called too early) in the boss offer panel or vignette overlay

## Requirements
- Verify boss loot panel calls `onDismiss` only after the player dismisses it
- Verify VignetteOverlay calls `onDismiss` only after the player dismisses the elder dialog
- Verify BetweenWaveScene renders at the correct depth and doesn't cover other panels
- Panels must appear strictly in order: boss loot → elder dialog → upgrade offers
- Each panel must be fully dismissed before the next appears
- Test on both boss and non-boss waves to confirm sequencing
