---
id: TASK-06
title: Tower Upgrade Trees
status: pending
category: backend
phase: 6
openspec_ref: "Phase 6"
depends_on: []
created: 2026-02-28
---

## Description

Phase 6 of the GreenTD implementation. See proposal.md for full context.

## Acceptance Criteria

- [ ] Define upgrade tree JSON schema (3 paths × 5 tiers, stat deltas, cost, path lock threshold)
- [ ] Implement upgrade application engine (apply tier effects to tower instance stats)
- [ ] Implement path advancement lock (advancing path A to tier 3 locks out path C)
- [ ] Implement respec (reset tower upgrades, refund at configured cost, re-enable locked paths)
- [ ] Build upgrade panel UI (3 columns, tier pips, locked overlay, buy/respec buttons)
- [ ] Define Cannon upgrade trees (Path A: armor shred; Path B: execute threshold; Path C: range/speed)
- [ ] Define Frost upgrade trees (Path A: slow magnitude; Path B: freeze duration; Path C: shatter on death)
- [ ] Define Mortar upgrade trees (Path A: splash radius; Path B: raw damage; Path C: cluster submunitions)
- [ ] Define Poison upgrade trees (Path A: DoT damage per tick; Path B: max stack count; Path C: DoT spread on death)
- [ ] Define Tesla upgrade trees (Path A: chain count; Path B: arc damage; Path C: overload mode)
- [ ] Define Aura upgrade trees (Path A: attack speed aura; Path B: damage aura; Path C: range aura)
- [ ] Implement Frost shatter drawback (deep freeze path destroys Poison DoT stacks on frozen creep death)
- [ ] Implement Tesla overload drawback (deep overload path applies brief debuff to allied towers hit by chain)
- [ ] Implement Aura specialization drawback (deep spec on one path reduces aura bonus for non-matching tower types in range)

## Notes

See openspec/changes/greentd-project/tasks.md Phase 6 for the full task list.
