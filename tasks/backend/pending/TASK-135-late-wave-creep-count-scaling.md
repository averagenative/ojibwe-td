---
id: TASK-135
title: Increase Creep Count on Later Waves — Overwhelm Weak Defenses
status: pending
priority: medium
category: backend
phase: balance
depends_on: []
created: 2026-03-03
---

## Description

Later waves should have significantly more creeps to overwhelm weak/incomplete
tower placements. Currently the count scaling may be too flat, allowing players
to coast with minimal towers. The difficulty curve should punish under-investment
in tower coverage.

## Acceptance Criteria

- [ ] Audit current wave creep count progression in wave data
- [ ] Increase creep counts for waves 10+ (escalating further at 15, 20, etc.)
- [ ] Ensure the scaling creates pressure to build more towers, not just upgrade existing ones
- [ ] Test that the scaling doesn't make early waves too easy by comparison
- [ ] Balance with gold income so players CAN afford enough towers if they play well
