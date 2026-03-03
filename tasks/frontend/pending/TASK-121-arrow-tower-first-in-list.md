---
id: TASK-121
title: Arrow Tower First in Tower Selection List
priority: high
status: pending
type: bug
---

# Arrow Tower First in Tower Selection List

## Problem
Arrow towers should be the first tower option shown in both the main menu tower list and the in-game tower selection panel, but they currently appear in a different position.

## Goal
Reorder tower lists so arrow tower is always first.

## Requirements
- **Main menu** — if there's a tower list/showcase on the main menu, arrow tower should be listed first
- **In-game TowerPanel** — arrow tower should be the leftmost/first option in the build panel
- Check the tower definition ordering in `data/towerDefs.ts` or wherever tower order is determined
- The order should be: Arrow → Rock Hurler → Frost → Poison → Thunder → Aura (or similar logical progression from basic to specialized)
- Do not change tower stats or behavior — only display order
