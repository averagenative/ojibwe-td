---
id: TASK-095
title: Meta Upgrades Menu — Text Overflow & Background Mismatch
status: pending
category: frontend
priority: high
depends_on: []
created: 2026-03-02
---

## Description

Two issues on the Meta Upgrades / Unlocks screen:

1. **Text overflow**: The description text under "Biboon-Aki" (and possibly other nodes) overflows
   its containing box. Text should be clipped or the box should expand to fit.
2. **Background mismatch**: The meta menu background is black/dark and doesn't match the rest of
   the game's palette (should use PAL.bgDark with the grid pattern or similar treatment as other menus).

## Acceptance Criteria

- [ ] No text overflows its containing box on any unlock/stat node
- [ ] Long node descriptions wrap properly or are truncated with ellipsis
- [ ] Background matches the game's visual style (PAL.bgDark + subtle grid or similar)
- [ ] Consistent look with MainMenuScene and other menu screens
- [ ] Test with all unlock nodes visible (various text lengths)
- [ ] `npm run typecheck` clean

## Notes

- File: `src/scenes/MetaMenuScene.ts`
- The background should use the same pattern as MainMenuScene: `PAL.bgDark` rectangle + grid overlay
- Node description text may need `wordWrap` with a max width matching the node box
- Check all UNLOCK_NODES and STAT_NODES for long text that could overflow
