---
id: TASK-137
title: Remove Ascension Feature Temporarily
status: pending
priority: high
category: frontend
phase: polish
depends_on: []
created: 2026-03-03
---

## Description

There is an ascension slider underneath the commander select on the main menu,
but the mechanic is unclear to players — there's no trigger for ascension and
no clear explanation of what it resets or rewards. The feature should be removed
from the UI for now and revisited in a future design pass.

## Acceptance Criteria

- [ ] Remove ascension slider/UI from commander select screen
- [ ] Remove or gate any ascension-related logic so it doesn't affect gameplay
- [ ] Do NOT delete the ascension system code — just hide/disable it
- [ ] Ensure meta-progression (unlocks, stats) still works without ascension
- [ ] No visual artifacts or layout issues after removal
