---
id: TASK-057
title: Commander Portrait in Game HUD — Active Commander Display
status: pending
priority: high
phase: gameplay
---

# Commander Portrait in Game HUD — Active Commander Display

## Problem

Players select a commander before each run but once gameplay starts, there's
no visual reminder of who they picked or what bonuses are active. The commander
feels forgotten the moment the game begins.

## Goal

Show the selected commander's portrait in the game HUD with their active
ability status, cooldown indicators, and a way to trigger their active ability
(if applicable). The commander should feel like a present companion throughout
the run.

## Acceptance Criteria

### Portrait Display
- [ ] Small commander portrait (48×48px or 56×56px) displayed in the top-left
  corner of the HUD, next to the wave/gold/lives info
- [ ] Portrait has a styled border matching the commander's element colour
- [ ] Commander name shown on hover/tap (tooltip, not always visible)
- [ ] Portrait uses the same image from `CommanderSelectScene`

### Active Ability Indicator
- [ ] If the commander has an active ability (cooldown-based), show:
  - Radial cooldown overlay on the portrait (clock-wipe fill from grey→clear)
  - "READY" glow/pulse when ability is available
  - Click/tap on portrait activates the ability (if it has an active component)
- [ ] If the commander is passive-only, portrait just sits there with no
  cooldown indicator — but still shows passive bonus on hover

### Passive Bonus Reminder
- [ ] Hover/tap the portrait shows a compact tooltip with active bonuses:
  - Commander name
  - 1-2 line passive summary (e.g. "+15% Frost damage, Slow duration +20%")
  - Active ability name + cooldown if applicable
- [ ] Tooltip doesn't overlap with tower placement or selection panels

### Integration with Commander System
- [ ] Read selected commander from `GameScene.init(data)` — commander ID passed
  from `CommanderSelectScene`
- [ ] Commander bonuses already applied via the commander system (TASK wired
  previously) — this task only adds the visual HUD element
- [ ] If no commander selected (legacy saves, direct scene launch), show a
  generic placeholder or hide the portrait slot

### Visual Polish
- [ ] Portrait has a subtle idle animation (breathing from TASK-056 if available,
  otherwise just a gentle border glow pulse)
- [ ] Boss wave: commander portrait reacts — brief shake or flash to acknowledge
  the threat
- [ ] Victory: commander portrait does a brief celebration (scale bounce)
- [ ] Game over: portrait dims/saddens

### Layout
- [ ] Portrait positioned to not overlap with existing HUD elements:
  - Wave counter, gold, lives are at top-center
  - Speed/mute buttons are at top-right area
  - Commander portrait fits top-left, below the HUD bar or integrated into it
- [ ] Responsive: works on both 1280×720 and smaller viewports

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Portrait click doesn't conflict with tower placement mode
- [ ] Portrait doesn't block map interaction in the top-left corner area
- [ ] Works correctly when game is paused

## Notes

- This pairs with the commander idle animations (TASK-056) — reuse the same
  breathing/expression system at smaller scale
- The portrait serves double duty: visual reminder + ability activation button
- Consider showing a brief commander dialogue line during boss waves:
  "Makwa approaches... stay strong!" (stretch goal, ties into story system)
- If the active ability concept isn't fully designed yet, just show the passive
  bonus display — the ability activation can be added later
