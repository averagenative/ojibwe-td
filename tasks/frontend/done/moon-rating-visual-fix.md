---
id: TASK-079
title: Moon Rating Visual Fix — Replace Emoji with Proper Moon Phase Graphics
status: done
priority: medium
phase: polish
---

# Moon Rating Visual Fix — Replace Emoji with Proper Moon Phase Graphics

## Problem

The moon completion rating (1-5 moons) uses emoji characters `🌕` / `🌑` which
render as flat yellow/black circles on most platforms. They don't look like
moons — they look like dots or radio buttons. The thematic connection to
"dibiki-giizis" (Ojibwe moon) is lost.

## Goal

Replace the emoji moon indicators with custom-drawn or sprite-based moon phase
graphics that actually look like crescent/half/gibbous/full moons. Each rating
level should show a distinct moon phase, reinforcing the Ojibwe lunar theme.

## Current Code

- `src/systems/MoonRating.ts` — `moonSymbol()` returns `🌕` or `🌑` emoji
- Used in `GameOverScene.ts` (victory screen moon row) and
  `MainMenuScene.ts` (best rating on stage cards)

## Acceptance Criteria

### Moon Phase Assets or Procedural Graphics
- [ ] 5 distinct moon phase visuals (one per rating level):
  - 1 moon: thin crescent (🌒 shape)
  - 2 moons: quarter/half moon (🌓 shape)
  - 3 moons: half moon (🌗 shape)
  - 4 moons: waxing gibbous (nearly full, small shadow)
  - 5 moons: full moon with subtle glow
- [ ] Unearned slots: dark/empty moon outline (crater texture optional)
- [ ] Either procedural (Graphics arcs/fills — no assets needed) or small
  sprites (32×32px each, save to `public/assets/ui/`)
- [ ] Colour palette: silvery white for earned, dark grey-blue for unearned,
  subtle warm glow on full moon

### Implementation
- [ ] Replace `moonSymbol()` emoji approach with a `MoonRatingDisplay` class
  or helper function that creates Phaser GameObjects
- [ ] `renderMoonRating(scene, x, y, earned, total=5)` → returns a container
  with 5 moon phase icons in a row
- [ ] Each earned moon shows its phase (crescent → full progression)
- [ ] Unearned moons show as dark empty circles with faint outline
- [ ] Optional: earned moons have a subtle shimmer/pulse animation
- [ ] Optional: on the victory screen, moons fill in one by one with a
  satisfying animation (200ms stagger)

### Integration Points
- [ ] GameOverScene: replace emoji text with MoonRatingDisplay
- [ ] MainMenuScene stage cards: replace emoji text with small inline moons
  (may need smaller scale, e.g. 16×16px per moon)
- [ ] Size should adapt: larger on GameOverScene, compact on stage cards

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes — update MoonRating tests if API changes
- [ ] Moon display renders correctly on desktop and mobile
- [ ] Stage card layout not broken by new moon graphics
- [ ] Moons are clearly distinguishable at small sizes (stage cards)
