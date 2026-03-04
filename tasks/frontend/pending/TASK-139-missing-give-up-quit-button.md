---
id: TASK-139
title: Restore Give Up / Quit Button in Game HUD
status: in-progress
priority: high
category: frontend
phase: polish
depends_on: []
created: 2026-03-03
---

## Description

The "Give Up" / "Quit" button is missing from the bottom of the game HUD.
Players have no way to exit a run early without refreshing the browser.
This button should return the player to the main menu.

## Acceptance Criteria

- [ ] Add a Give Up / Quit button to the bottom-right of the game HUD
- [ ] Button should show a confirmation dialog before quitting
- [ ] Quitting clears the current session (autosave) and returns to main menu
- [ ] Button should be styled consistently with other HUD elements
- [ ] Works on both mobile and desktop layouts
