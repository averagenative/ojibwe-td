---
id: TASK-146
title: Quick Play / "Just Play" Button — Auto-Select and Go
status: pending
priority: medium
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

Add a "QUICK PLAY" button to the main menu that skips commander and map
selection, auto-picks, and drops the player straight into a run. Reduces friction for
players who just want to jump in.

## Acceptance Criteria

### A. Main menu button
- [ ] New button on MainMenuScene — prominent placement below START GAME / RESUME GAME
- [ ] Label: "QUICK PLAY"
- [ ] Distinct visual style (different color from start/resume) so it's clearly a separate mode
- [ ] Meets 44px minimum touch target for mobile

### B. Auto-selection logic
- [ ] Commander: random from unlocked commanders (weighted toward less-played if stats available,
  otherwise uniform random)
- [ ] Map: random from unlocked maps
- [ ] If only one commander/map is unlocked, just use that one
- [ ] Show a brief "splash" (0.5-1s) showing what was picked: "Commander: Nokomis / Map: Zaagaiganing"
  so the player knows what they got — or skip straight in (user preference)

### C. Skip selection scenes
- [ ] Bypass CommanderSelectScene and stage select entirely
- [ ] Go directly to GameScene with the auto-selected parameters
- [ ] If a resume save exists, quick play should start a NEW run (not resume)
  - Show the same overwrite confirmation if a save exists

### D. Tests
- [ ] Unit tests for auto-selection logic (handles single unlock, multiple unlocks, randomness)
- [ ] Structural tests: button exists, launches GameScene with valid params
- [ ] `npm run typecheck` clean; `npm run test` passes

## Notes

- This pairs well with seeded random maps (TASK-147) — quick play + random map = endless variety
- Could evolve into a "daily run" mode later (fixed seed per day)
- Keep it simple for now — random pick, go
