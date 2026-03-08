---
id: TASK-182
title: "Fix: gear inventory layout needs mobile refinement"
status: in-progress
category: frontend
phase: release
priority: medium
depends_on: []
created: 2025-03-07
---

## Description

The Gear Inventory screen has layout issues on mobile:
1. The filter button row is cramped and highlighted with a jarring orange border (likely a debug artifact or misplaced focus indicator)
2. The "0 / 50 items" count is cut off on the right edge
3. Overall vertical spacing wastes space — the filter row and grid area could be more compact

## Screenshots

- See `troubleshoot/gear sub menu needs to be refactored to fit space more.jpeg`

## Acceptance Criteria

- [ ] Filter buttons fit within screen bounds on mobile
- [ ] Item count text fully visible
- [ ] No debug-style orange border around filter area
- [ ] Layout uses available space efficiently on mobile
