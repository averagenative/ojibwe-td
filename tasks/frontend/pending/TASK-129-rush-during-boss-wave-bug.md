---
id: TASK-129
title: Rush During Boss Wave May Break Completion Bonus or Loot
priority: critical
status: in-progress
type: bug
---

# Rush During Boss Wave — Completion Bonus / Loot Bug

## Problem
Pressing rush (force next wave) during a boss wave might break the wave completion bonus calculation or boss loot drops. The interaction between rushing and boss-specific rewards needs investigation.

## Goal
Ensure rushing during boss waves doesn't skip or duplicate boss loot/completion bonuses.

## Requirements
- Investigate what happens when rush is pressed during a boss wave:
  - Does the boss kill reward still fire?
  - Does the wave completion bonus calculate correctly?
  - Does the between-wave offer screen appear at the right time?
- Fix any issues found:
  - Boss loot should always drop when the boss is killed, regardless of rush state
  - Wave completion bonus should be based on the wave that just completed
  - If multiple waves are active (from rushing), each wave's completion should be handled independently
- Add test coverage for rush-during-boss scenarios
