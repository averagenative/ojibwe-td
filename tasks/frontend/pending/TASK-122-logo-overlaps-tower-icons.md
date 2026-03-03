---
id: TASK-122
title: Main Menu Logo Overlaps Tower Icons — Hide Icons on Region/Stage Select
priority: high
status: pending
type: bug
---

# Main Menu Logo Overlaps Tower Icons

## Problem
The in-game logo is now displayed on the main menu, but it overlaps with the tower icons shown during region/stage selection. The tower icons aren't needed on the main screen.

## Goal
Remove or hide tower icons from the main menu / region-stage selection screens so the logo displays cleanly.

## Requirements
- Remove tower icon display from the main menu scene (MainMenuScene) when selecting regions/stages
- The logo should be visible without overlap
- Tower icons should still appear in the in-game TowerPanel during gameplay
- Test on both desktop and mobile layouts
