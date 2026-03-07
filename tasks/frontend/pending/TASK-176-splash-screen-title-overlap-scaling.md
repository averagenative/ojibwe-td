---
id: TASK-176
title: "Splash screen: title/crest overlap + relative scaling"
status: pending
category: frontend
phase: release
depends_on: []
created: 2025-03-07
---

## Description

On the first splash/title screen:

1. **"Ojibwe TD" text overlaps the crest/emblem** — the title text is positioned too high and bleeds into the bottom of the crest image.
2. **No relative scaling** — on smaller devices (iPhone SE, older iPads), the crest + title + PLAY button stack doesn't scale down, causing overlap and clipping.

## Screenshots

- See `troubleshoot/A5ACBA2D-C583-444A-8475-E67F14B2E961.png` — title overlapping crest

## Acceptance Criteria

- [ ] "Ojibwe TD" title text has clear spacing below the crest (no overlap)
- [ ] "A Tower Defense Game" subtitle also properly spaced
- [ ] PLAY button has clear spacing below subtitle
- [ ] All elements use relative positioning/scaling based on screen dimensions
- [ ] Works on small screens (iPhone SE 3rd gen — 667pt width in landscape) through large screens (iPad Pro)
- [ ] Crest scales down proportionally on smaller viewports

## Notes

- The splash is likely in `MainMenuScene.ts` or a separate TitleScene.
- Use Phaser's scale manager dimensions rather than hardcoded pixel positions.
