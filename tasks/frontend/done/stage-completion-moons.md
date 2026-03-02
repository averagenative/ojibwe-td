---
id: TASK-045
title: Stage Completion Moons — Performance Rating
status: done
priority: medium
phase: gameplay
---

# Stage Completion Moons — Performance Rating

## Goal

Award a 1–5 moon rating when a player completes a stage, based on how well
they performed (lives remaining, gold efficiency, waves cleared). Moons are
displayed on the run-complete screen and on the stage tile in the main menu
so players can see at a glance which stages they've mastered.

## Why Moons?

Every TD game does stars. We do moons — fits the Ojibwe night-sky / natural
world aesthetic and stands out visually.

## Acceptance Criteria

### Rating Calculation
- [ ] `src/systems/MoonRating.ts` — pure function `calculateMoons(livesLeft,
  maxLives, wavesCleared, totalWaves): number` returning 1–5:
  - 5 moons: full health (all lives remaining) + all waves cleared
  - 4 moons: lost ≤ 20% of lives + all waves cleared
  - 3 moons: lost ≤ 50% of lives + all waves cleared
  - 2 moons: cleared all waves (any lives remaining)
  - 1 moon: cleared at least 75% of waves (survived but didn't finish)
- [ ] Unit tests for each threshold and edge cases (0 lives, partial clear)

### Save & Persistence
- [ ] `SaveManager` stores best moon count per stage:
  `getStageMoons(stageId): number` / `setStageMoons(stageId, moons): void`
- [ ] Only saves if new rating is higher than existing best

### Run Complete Screen
- [ ] Display moon rating prominently: filled moons (🌕) for earned,
  empty moons (🌑) for unearned, in a horizontal row
- [ ] Brief text below: "Full Moon!" (5), "Waxing Gibbous" (4),
  "Half Moon" (3), "Crescent" (2), "New Moon" (1)
- [ ] If this is a new personal best, show "New Best!" indicator

### Main Menu Stage Tile
- [ ] Stage tile shows best moon rating (small moons row) below the
  stage name or near the difficulty stars
- [ ] Stages never played show no moons (blank, not 0)

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] No changes to existing game balance or difficulty

## Notes

- Moon symbols: 🌕 (full), 🌖 (gibbous), 🌗 (half), 🌘 (crescent), 🌑 (new)
  — or use custom drawn circles with Phaser Graphics for consistency
- The Ojibwe word for moon is "dibiki-giizis" (night sun) — could appear
  as flavour text on the rating screen
- Consider a subtle glow/shimmer tween on the moon icons when they appear
- This pairs well with the Ascension system — could gate ascension levels
  behind minimum moon ratings in the future
