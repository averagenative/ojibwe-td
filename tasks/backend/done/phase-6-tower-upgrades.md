---
id: TASK-06
title: Tower Upgrade Trees
status: done
category: backend
phase: 6
openspec_ref: "Phase 6"
depends_on: ["TASK-05"]
created: 2026-02-28
---

## Description

Add per-tower upgrade trees to provide in-run progression depth. Each of the 6 tower types has 3 upgrade paths × 5 tiers. Advancing a path to tier 3+ locks out the third path, creating meaningful specialisation choices. A respec option lets the player reset and rebuild, at a gold cost. The upgrade panel opens when a placed tower is selected.

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
- [ ] Sell a tower with active upgrades: refund MUST include upgrade investment at configured rate
- [ ] Attempting to upgrade during an active wave MUST either be allowed or blocked consistently (define which)
- [ ] Upgrade panel renders correctly at all supported viewport widths (≥ 800 px)
- [ ] Unit tests cover: apply-tier, path-lock, respec gold calculation, invalid-upgrade guard

## Notes

See openspec/changes/greentd-project/tasks.md Phase 6 for the full task list.
