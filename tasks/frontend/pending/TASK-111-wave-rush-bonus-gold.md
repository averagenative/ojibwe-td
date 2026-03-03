---
id: TASK-111
title: Wave Rush — Force Start Next Wave Early for Bonus Gold
priority: medium
status: pending
type: feature
---

# Wave Rush — Force Start Next Wave Early for Bonus Gold

## Problem
Players who are ahead have no way to speed up the game by pushing waves faster. This removes a core skill expression found in classic TD games.

## Goal
Allow players to force-start the next wave while the current wave is still active, rewarding them with bonus gold for the increased difficulty of overlapping waves.

## Requirements
- **Rush button** — visible during active waves; starts the next wave immediately
- **Bonus gold** — award a gold bonus when rush is triggered (flat amount or % of wave value)
- **One-ahead limit** — can only rush the NEXT wave, not stack multiple rushes; button disabled until the rushed wave becomes the current wave
- **Visual feedback** — flash the gold counter or show "+X RUSH BONUS" text on screen
- **Interaction with between-wave phase** — if wave ends and next wave was rushed, skip the between-wave scene (or queue the offer for later)
- **Cannot rush boss waves** (optional — TBD)
- **Mobile friendly** — rush button must be accessible and not overlap other UI
