---
id: TASK-075
title: Menu & UI Screen Polish — Animated Backgrounds, Transitions, Life
status: pending
priority: medium
phase: polish
---

# Menu & UI Screen Polish — Animated Backgrounds, Transitions, Life

## Problem

Menu screens (MainMenu, CommanderSelect, GameOver, Codex) feel like flat UI
panels. There's no atmosphere, no movement, no sense of being in a living world.
The transition between screens is an instant cut — jarring and cheap-feeling.

## Goal

Make every screen in the game feel polished and alive through animated
backgrounds, smooth transitions, and ambient details. The player should feel
like they're in a forest camp, not a spreadsheet.

## Acceptance Criteria

### MainMenuScene
- [ ] Animated background: slow parallax layers (distant mountains, midground
  trees, foreground brush) that drift gently
- [ ] Time-of-day tint: warm sunset amber by default, can shift based on
  real clock time or last-played region
- [ ] Floating embers/fireflies particle effect (5-8 particles, warm tones)
- [ ] Logo has a subtle breathing glow or shadow pulse
- [ ] Menu buttons have hover animations (slight scale + glow)
- [ ] Region cards on the map-select show a subtle looping preview (e.g.
  snow falling on winter card, leaves on savanna card)

### CommanderSelectScene
- [ ] Character portraits have idle animation (breathing, blinking, slight sway)
- [ ] Selected commander has a highlight glow or spotlight effect
- [ ] Background matches the selected region's colour palette
- [ ] Transition in: portraits slide in from sides

### GameOverScene
- [ ] Victory: triumphant particle burst (gold sparkles, upward drift)
- [ ] Defeat: somber mood — darkened background, slow ember particles
  drifting down
- [ ] Stats animate in (count up numbers like an arcade score screen)
- [ ] Currency earned has a satisfying "cha-ching" tally animation

### CodexScene
- [ ] Parchment/scroll texture background
- [ ] Entries fade in when scrolled to
- [ ] Category headers have subtle decorative flourishes

### Screen Transitions (all screens)
- [ ] Fade-to-black transition between all scene changes (300-500ms)
- [ ] Optional: crossfade for menu-to-menu transitions
- [ ] Camera or UI elements have slight easing on entry (slide in, not pop in)

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] No performance regression on mobile
- [ ] All interactive elements remain fully clickable/tappable
- [ ] Transitions don't delay gameplay start (keep them short)

## Notes

- This is a "juice" pass — making things that work feel good. None of this
  changes functionality, just feel.
- Can be done incrementally: transitions first (biggest impact), then
  MainMenu polish, then other screens.
- Pairs well with TASK-059 (MetaMenu ambiance) — same philosophy, different
  screens.
- Keep file sizes small: prefer procedural graphics + particles over large
  image assets.
