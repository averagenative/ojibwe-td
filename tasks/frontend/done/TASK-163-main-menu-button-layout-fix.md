---
id: TASK-163
title: Main Menu Button Layout — Fix Overlapping and Crowded Buttons
status: done
priority: critical
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

The main menu bottom section has severe layout issues. Buttons are overlapping
and crowded together — START GAME and QUICK PLAY collide, and the secondary
buttons (UPGRADES, CHALLENGES, CODEX, ACHIEVEMENTS) are jammed in a tight row
with no breathing room. See screenshot reference: ~/jumbled.png

TASK-162 attempted to fix this but the result is still broken.

## Current (Broken) Layout

```
      [  START GAME  ][QUICK PLAY]    ← overlapping/touching
      [UPGRADES][CHALLENGES][CODEX]   ← too tight, no spacing
              [ACHIEVEMENTS]          ← cramped
```

## Desired Layout

The bottom section needs clear visual hierarchy and spacing:

```
            [ START GAME ]                 ← primary action, centred, full width emphasis
                                           ← breathing room (20-30px gap)
   [ QUICK PLAY ]                          ← secondary, smaller, left or centred below
                                           ← breathing room (20-30px gap)
   [ UPGRADES ]  [ CHALLENGES ]  [ CODEX ] ← evenly spaced row, smaller buttons
              [ ACHIEVEMENTS ]             ← centred below, subtle
```

### Key requirements:
- **START GAME** is the dominant button — largest, centred, clearly primary
- **QUICK PLAY** should be noticeably smaller/secondary — NOT the same size as START GAME
- **RESUME GAME** (when present) goes above START GAME, same width
- At least **16-20px vertical gap** between each button row
- Secondary buttons (Upgrades/Challenges/Codex) need **12-16px horizontal gaps**
- Achievements button should be subtle (smaller font, dimmer)
- All buttons must fit within the viewport without scrolling on 1280×720
- Mobile: all buttons meet 44px minimum touch target

## Files to Change

- `game/src/scenes/MainMenuScene.ts` — `createButtons()` method
  - Fix Y positioning to add proper gaps between rows
  - Fix X positioning so START GAME and QUICK PLAY don't overlap
  - Make QUICK PLAY visually smaller/secondary
  - Ensure proper spacing for UPGRADES/CHALLENGES/CODEX row
  - Test with and without RESUME GAME button present

## Acceptance Criteria

- [ ] No buttons overlap or touch each other
- [ ] START GAME is clearly the primary/largest button
- [ ] QUICK PLAY is visually secondary (smaller or different style)
- [ ] At least 16px vertical gap between each button row
- [ ] Secondary buttons have at least 12px horizontal gaps
- [ ] Layout fits within 1280×720 without overflow
- [ ] Layout works with RESUME GAME present (4 rows) and absent (3 rows)
- [ ] Mobile layout meets 44px touch targets with adequate spacing
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes — update layout tests if button positions change
