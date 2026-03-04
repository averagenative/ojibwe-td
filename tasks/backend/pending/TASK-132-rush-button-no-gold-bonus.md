---
id: TASK-132
title: Rush Button Not Awarding Additional Gold
status: pending
priority: high
category: backend
phase: polish
depends_on: []
created: 2026-03-03
---

## Description

Pressing the rush button during gameplay is not awarding the expected bonus gold.
TASK-127 (rush wave immediate send) and TASK-111 (wave rush bonus gold) implemented
a RUSH_GOLD_AMOUNT = 25 flat bonus with floating "+N RUSH BONUS" feedback text.
Something is broken — either the gold isn't being added or the feedback isn't showing.

## Acceptance Criteria

- [ ] Pressing rush button awards RUSH_GOLD_AMOUNT bonus gold
- [ ] Floating "+25 RUSH BONUS" feedback text appears near gold counter
- [ ] Gold total updates immediately on rush
- [ ] Verify with a test that rushNextWave() adds gold before calling _doStartWave()
