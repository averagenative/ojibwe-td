---
id: TASK-162
title: Reposition Quick Play Button — Move Away From Start/Resume Stack
status: in-progress
priority: high
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

The Quick Play button is currently crammed underneath the Resume/Start Game buttons
in the main menu, making the button stack feel cluttered. Move it to its own
position — off to the right side of the screen, separate from the main action buttons.

## Current Layout

```
      [RESUME GAME]
      [START NEW RUN]
      [QUICK PLAY]      ← too close, visually smashed together
      [Achievements] [Codex]
```

## Desired Layout

Quick Play should be visually separate from the primary start flow. Position it
on the right side of the screen (or another distinct location) so it reads as a
secondary/convenience action, not part of the main button stack.

```
      [RESUME GAME]
      [START NEW RUN]                    [QUICK PLAY] ←  off to the side
      [Achievements] [Codex]
```

Or another layout that gives it breathing room. The key constraint is that it
should NOT be vertically stacked directly under Start Game.

## Files to Change

- `game/src/scenes/MainMenuScene.ts` — `createButtons()` method, quick play
  button positioning

## Acceptance Criteria

- [ ] Quick Play button is visually separated from the Resume/Start stack
- [ ] Positioned on the right side or another distinct area of the screen
- [ ] Still meets 44px touch target on mobile
- [ ] Does not overlap with other UI elements (achievements, codex, etc.)
- [ ] Layout looks clean on both desktop (1280×720) and mobile viewports
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
