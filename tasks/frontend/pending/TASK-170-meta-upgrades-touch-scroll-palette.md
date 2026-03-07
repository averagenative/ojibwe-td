---
id: TASK-170
title: "Meta Upgrades: touch scrolling + palette update"
status: in-progress
category: frontend
phase: release
depends_on: []
created: 2025-03-07
---

## Description

The Meta Upgrades screen (`MetaMenuScene.ts`) has two issues:

1. **Touch scrolling broken** — the unlocks/upgrades list doesn't scroll with finger drag on mobile. Must support touch-drag scrolling.
2. **Wrong color scheme** — uses "hacker green" monochrome palette. Should match the main menu screen's earthy/natural color palette (dark forest greens, warm tans, muted golds — not neon `#00ff00` terminal green).

## Screenshots

- See `troubleshoot/56F2BBE5-1BAC-4182-BE0F-4C595BBC94A5.png` — hacker green Meta Upgrades
- Compare with `troubleshoot/1313254E-7134-48FA-B86D-74F1EC18EAFC_1_201_a.jpeg` — main menu palette reference

## Acceptance Criteria

- [ ] Unlocks/Upgrades lists scroll via finger drag on mobile (touch events)
- [ ] Color palette updated to match MainMenuScene (backgrounds, borders, text, buttons)
- [ ] Gear Inventory screen (accessed from Meta Upgrades) also matches the new palette
- [ ] Arrow indicators for scroll still visible and functional

## Notes

- The Gear Inventory screen should be unified with Meta Upgrades in style/design — see TASK-171.
- Reference `MainMenuScene.ts` for the correct color values.
