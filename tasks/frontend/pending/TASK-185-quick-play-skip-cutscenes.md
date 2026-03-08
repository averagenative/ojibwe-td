---
id: TASK-185
title: "Quick Play should skip scout/narrator cutscenes and vignettes"
status: pending
category: frontend
phase: polish
priority: medium
depends_on: []
created: 2025-03-07
---

## Description

Quick Play is meant to be a fast path into gameplay, but it currently runs through the same `_initCutscenes()` priority cascade as normal play. On a first launch or first visit to a region, quick play triggers:

1. **Intro cutscene** (`cutscene-intro`) — Mishoomis greeting on absolute first launch
2. **Region intro cutscene** — first visit to a region
3. **FIRST_PLAY vignette** — first-session VignetteOverlay
4. **Wave-1 vignettes** (act2-arrival, act3-arrival)

These are appropriate for the normal play flow (where the player deliberately chose a stage), but disruptive for quick play which should drop the player straight into wave 1.

## Locations

- `src/scenes/GameScene.ts` — `_initCutscenes()` (~line 1149): the priority cascade that checks for unseen cutscenes
- `src/scenes/GameScene.ts` — `init()` receives data from MainMenuScene including the selected stage/commander
- `src/scenes/MainMenuScene.ts` — Quick Play button passes data via `_go('GameScene', ...)`

## Proposed Fix

1. Add a `quickPlay: boolean` flag to the GameScene init data (set by MainMenuScene quick play flow)
2. In `_initCutscenes()`, if `this.quickPlay` is true, skip the entire cascade and go straight to wave setup
3. Cutscenes should still be marked as "seen" — OR left unseen so they trigger on the player's first normal play of that stage/region (preferred, since the player hasn't actually seen them)

## Acceptance Criteria

- [ ] Quick Play launches directly into wave 1 with no cutscene or vignette overlay
- [ ] Normal play still shows cutscenes on first visit as before
- [ ] Cutscenes remain unseen so they play on the player's first normal visit
- [ ] Commander intro cutscene (in CommanderSelectScene) is already skipped since quick play bypasses that scene — verify no regression
