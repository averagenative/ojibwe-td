---
id: TASK-136
title: Boss Escape Should Cost More Lives
status: done
priority: medium
category: backend
phase: balance
depends_on: []
created: 2026-03-03
---

## Description

When a boss creep escapes (reaches the end), the life penalty is too low.
Letting a boss through should be a significant setback — potentially game-ending
if it happens more than once. This makes boss waves feel high-stakes and rewards
players who build proper defenses.

## Acceptance Criteria

- [ ] Audit current life cost for boss creep escape vs normal creep escape
- [ ] Increase boss escape penalty (e.g. 5-10 lives per boss, scaling with wave)
- [ ] Ensure the penalty is visible in the HUD (life loss feedback)
- [ ] Test that players can still recover from ONE boss escape but not multiple
- [ ] Document the new penalty values
