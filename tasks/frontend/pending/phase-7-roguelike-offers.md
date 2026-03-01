---
id: TASK-07
title: Roguelike Offer Layer
status: pending
category: frontend
phase: 7
openspec_ref: "Phase 7"
depends_on: []
created: 2026-02-28
---

## Description

Phase 7 of the GreenTD implementation. See proposal.md for full context.

## Acceptance Criteria

- [ ] Define offer pool JSON (30+ offers across: combat abilities, economy, tower-type synergies)
- [ ] Implement offer draw system (weighted random draw, no duplicate active offers per run)
- [ ] Build `BetweenWaveScene` (display 3 offer cards, pick 1, advance to next wave)
- [ ] Build offer card component (icon, name, 1-line description, hover highlight, click to select)
- [ ] Implement run offer state (track active offers; apply their effects globally during the run)
- [ ] Implement combat ability offers (e.g. "Chain Reaction": kills trigger lightning to nearest creep; "Lifesteal": towers heal 1 life per 50 kills)
- [ ] Implement economy modifier offers (e.g. "Gold Rush": wave bonus +50%; "Scavenger": sell refund 85%)
- [ ] Implement tower-type synergy offers (e.g. "Venomfrost": Frost slow is 30% stronger on Poison-stacked creeps; "Static Field": Tesla chains deal +20% to slowed targets)
- [ ] Wire BetweenWaveScene into run loop (after wave complete → offers → next wave)

## Notes

See openspec/changes/greentd-project/tasks.md Phase 7 for the full task list.
