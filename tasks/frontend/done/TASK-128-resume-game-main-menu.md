---
id: TASK-128
title: Resume Game Button on Main Menu with New Run Option
priority: high
status: done
type: feature
---

# Resume Game Button on Main Menu

## Problem
When a saved game is detected (via SessionManager autosave), there's no obvious way to resume from the main menu. The resume prompt only appears after starting a new game and entering GameScene.

## Goal
Show a "Resume Game" button on the main menu when a save exists, while still allowing players to start a new run.

## Requirements
- **Main menu check** — on MainMenuScene create(), check `SessionManager.getInstance().load()` for a valid autosave
- **Resume Game button** — if save exists, show a prominent "RESUME GAME" button (above or beside "START GAME")
- **Start New Run** — the existing start flow still works; if player starts a new run with a save present, show a brief confirmation ("This will overwrite your saved run. Continue?")
- **Resume flow** — clicking Resume should go directly to GameScene with the saved mapId/stageId/commanderId, which then restores from autosave
- **No save** — if no autosave exists, don't show the Resume button
- Mobile: Resume button meets 44px touch target minimum
