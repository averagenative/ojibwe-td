---
id: TASK-172
title: "Main Menu: move Quick Play, center Start Game"
status: done
category: frontend
phase: release
priority: high
depends_on: []
created: 2025-03-07
---

## Description

Two layout fixes on the main menu (`MainMenuScene.ts`):

1. **Quick Play button** — move to the right side, roughly mirroring the Ojibwe TD crest's distance from the edge (crest is left, Quick Play goes right, similar offset).
2. **Start Game button** — should be centered horizontally and positioned directly below the map/stage select area, not side-by-side with Quick Play.

## Screenshots

- See `troubleshoot/1313254E-7134-48FA-B86D-74F1EC18EAFC_1_201_a.jpeg` — annotated with desired Quick Play position

## Acceptance Criteria

- [ ] Quick Play button positioned on the right side, similar distance from edge as the crest is on the left
- [ ] Start Game button centered below the region/stage select area
- [ ] Layout works on both desktop and mobile screen sizes
- [ ] Prefer relative offsets (e.g. `width * 0.85`) over hardcoded pixel values for positioning
