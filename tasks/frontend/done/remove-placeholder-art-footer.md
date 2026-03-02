---
id: TASK-043
title: Remove "Placeholder Art" from Main Menu Footer
status: done
priority: high
phase: polish
---

# Remove "Placeholder Art" from Main Menu Footer

## Problem

`MainMenuScene.createFooter()` renders this line at the bottom of the screen:

> Solo Desktop · v0.1.0 · **Placeholder Art** · Inspired by Green TD

The game now has real Ojibwe-themed art generated via DALL-E — the
"Placeholder Art" label is stale and embarrassing in a live build.

## Fix

In `game/src/scenes/MainMenuScene.ts`, `createFooter()` (around line 512):

Remove `· Placeholder Art` from the footer string:

```ts
// Before
'Solo Desktop · v0.1.0 · Placeholder Art · Inspired by Green TD'

// After
'Solo Desktop · v0.1.0 · Inspired by Green TD'
```

## Acceptance Criteria

- [ ] Footer no longer contains the words "Placeholder Art"
- [ ] Rest of the footer text is unchanged
- [ ] `tsc --noEmit` passes
