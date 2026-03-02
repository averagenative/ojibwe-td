---
id: TASK-085
title: Challenges List Scrollable — Fix Overflow on Long Lists
status: done
priority: high
phase: bugfix
---

# Challenges List Scrollable — Fix Overflow on Long Lists

## Problem

The challenges list UI does not scroll. When there are more challenges than fit
on screen, the extra entries are clipped/hidden and inaccessible. Players cannot
see or interact with challenges below the visible area.

## Goal

Make the challenges list scrollable so all challenges are accessible regardless
of how many exist.

## Acceptance Criteria

- [ ] Challenges list scrolls vertically when content exceeds visible area
- [ ] Scroll works on desktop (mouse wheel + click-drag scrollbar)
- [ ] Scroll works on mobile (touch swipe)
- [ ] Scroll position resets to top when opening the challenges panel
- [ ] Visual scroll indicator (scrollbar or fade gradient) shows when list is scrollable
- [ ] No layout breakage — challenges at top and bottom of list render correctly
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes

## Implementation Hints

- Phaser doesn't have native scroll containers — common patterns:
  - Masked container with pointer drag / wheel input to offset children
  - Or a camera-based scroll zone (Phaser `ScrollablePanel` pattern)
- Check how other scrollable lists in the game are implemented (if any)
- Minimum touch scroll velocity / momentum for mobile feel
