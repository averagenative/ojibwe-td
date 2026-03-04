---
id: TASK-137
title: Remove Ascension Feature Temporarily
status: pending
priority: critical
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
- [ ] Update `src/systems/__tests__/ascensionSystem.test.ts`: the "CommanderSelectScene — ascension picker" describe block (lines 567-595) has 7 structural `?raw` tests that assert ascension patterns exist in `CommanderSelectScene.ts` source. These tests MUST be updated to reflect the hidden/disabled state — either skip them with `it.skip`, delete them, or rewrite assertions to match the new gated code. DO NOT leave them failing.
