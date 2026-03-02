---
id: TASK-083
title: Desktop Drag-to-Place Tower Placement
status: pending
priority: high
phase: bugfix
category: backend
depends_on: []
created: 2026-03-02
---

## Problem

Mobile has drag-to-place from the tower panel (tap tower button, drag to map, release to place). Desktop still uses click-to-select then click-to-place. Users expect the same drag behavior on desktop.

## Goal

Add drag-to-place tower placement on desktop, matching the mobile UX. Keep click-to-place as well for users who prefer it.

## Implementation Plan

### 1. Distinguish click vs drag in TowerPanel

TowerPanel.ts currently uses `pointerup` on desktop for selection. Add drag detection:

- On `pointerdown` on a tower button: record start position, set `dragCandidate = true`
- On `pointermove`: if pointer has moved > threshold (e.g., 10px) from start, transition to drag mode
- If drag mode: enter placement mode immediately, tower ghost follows cursor
- If `pointerup` without exceeding threshold: treat as click (existing behavior -- select tower for click-to-place)

### 2. Drag state in GameScene

- GameScene needs to know when a drag-placement is active vs click-placement
- During drag: tower preview/ghost follows pointer position continuously
- Range circle shown during drag preview (same as current placement preview)
- On `pointerup` during drag:
  - If over valid map tile: place the tower
  - If over invalid area (HUD, panel, occupied tile): cancel placement

### 3. Click-to-place preserved

Existing click-to-select then click-to-place flow must continue to work:
- Click tower button (no drag) -> enter placement mode -> click map to place
- This is the existing behavior and must not break

### 4. Edge cases

- Dragging back onto the panel or HUD: cancel placement
- Dragging off-screen: cancel placement
- Right-click during drag: cancel placement
- Escape key during drag: cancel placement (already handled by existing keyboard shortcut)

## Acceptance Criteria

- [ ] Desktop: dragging from tower panel button to map and releasing places the tower at release point
- [ ] Desktop: clicking tower panel button then clicking map still works (existing behavior preserved)
- [ ] Tower preview/ghost follows cursor during drag
- [ ] Releasing drag on invalid area (HUD, panel, occupied tile) cancels placement
- [ ] Releasing drag on valid map tile places the tower
- [ ] Range circle shown during drag preview
- [ ] Mobile behavior unchanged -- already has drag-to-place
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Test at desktop resolution (1280x720+)

## Implementation Hints

- TowerPanel.ts currently uses `pointerup` on desktop for selection
- Add `pointerdown` + track drag state; if pointer moves > threshold, treat as drag
- GameScene.ts `onPointerUp` already handles mobile placement -- extend for desktop drag
- Need to distinguish "click to select" vs "drag to place" -- use a distance threshold (e.g., 10px movement = drag)
- The drag threshold prevents accidental drags from normal clicks (slight mouse movement during click)

## Notes

- This is primarily a UX improvement for desktop players
- The 10px drag threshold is important -- without it, even small mouse movements during a click would trigger drag mode
- Consider touch-screen laptops: they may fire both touch and mouse events -- ensure no double-placement
