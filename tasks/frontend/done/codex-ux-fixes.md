---
id: TASK-102
title: Codex UX — Click-Away Dismiss & Text Overlap Fix
status: done
category: frontend
priority: high
depends_on: []
created: 2026-03-02
---

## Description

Two UX issues in the codex entry detail view:

1. **No dismiss interaction**: When clicking on an entry to read about it, there's no way to
   dismiss/close it by clicking elsewhere on the screen or pressing Escape. Must add click-away
   and Escape key dismiss.
2. **Text overlap**: The description text box overlaps the "Mark All Read" and "Back" buttons.
   The content area should be properly contained and not overflow into the button area.

## Acceptance Criteria

- [ ] Clicking outside the entry detail panel dismisses/closes it
- [ ] Pressing Escape closes the entry detail panel
- [ ] Description text is contained within its panel — no overlap with navigation buttons
- [ ] "Mark All Read" and "Back" buttons are always visible and clickable
- [ ] Long descriptions scroll or are properly contained (not clipped without indication)
- [ ] `npm run typecheck` clean

## Notes

- File: `src/scenes/CodexScene.ts`
- For click-away: add a fullscreen transparent hit zone behind the detail panel
- For Escape: `this.input.keyboard?.on('keydown-ESC', ...)`
- For text overlap: the detail panel needs proper bounds — use Phaser text `wordWrap` + explicit max height, or a masked container
- Buttons should be positioned outside/below the scrollable content area
