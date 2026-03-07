---
id: TASK-174
title: "Achievements: palette update + touch scrolling"
status: done
category: frontend
phase: release
priority: medium
depends_on: []
created: 2025-03-07
---

## Description

The Achievements screen (`AchievementsScene.ts`) has the same issues as other menu screens:

1. **Hacker green palette** — needs earthy color scheme matching the main menu.
2. **Touch scrolling broken** — the achievement list (e.g. Maps category) can't be scrolled with finger drag on mobile. The arrow indicators exist but finger drag doesn't work.

## Screenshots

- See `troubleshoot/31B97782-2488-4F2C-94C2-96DCA1728B2B.png` — Achievements with green palette, list cut off at bottom

## Acceptance Criteria

- [x] Color palette updated to match MainMenuScene
- [x] Achievement list scrollable via finger drag on mobile
- [x] All achievement entries reachable by scrolling in each category
- [x] Category tab buttons remain accessible (not scrolled away)
