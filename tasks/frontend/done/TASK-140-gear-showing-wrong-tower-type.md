---
id: TASK-140
title: Gear Showing Under Wrong Tower Type — Flint Charm Bug
status: done
category: frontend
phase: bug
depends_on: []
created: 2026-03-03
---

## Description

Flint Charm is equipped to the Frost Tower but is showing up under the Arrow
Tower in the gear selection UI. This is a display/filter bug in the gear panel —
equipped gear should show under the tower it's actually assigned to.

## Acceptance Criteria

- [ ] Audit gear panel filtering logic — how does it determine which tower to show gear under?
- [ ] Fix the filter so equipped gear shows under the correct tower type
- [ ] Verify with Flint Charm equipped to Frost Tower → shows under Frost Tower
- [ ] Check all other gear items for similar misassignment issues
- [ ] Add test coverage for gear-tower type association in the UI
