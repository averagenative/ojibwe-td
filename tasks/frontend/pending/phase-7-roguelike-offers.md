---
id: TASK-07
title: Roguelike Offer Layer
status: pending
category: frontend
phase: 7
openspec_ref: "Phase 7"
depends_on: ["TASK-06"]
created: 2026-02-28
---

## Description

Add a roguelike offer layer that appears between waves. After each wave the player is presented with 3 randomly-drawn power-up cards (combat abilities, economy modifiers, or tower-type synergies) and chooses one. Active offers persist for the rest of the run and stack with each other, making each run feel distinct.

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
- [ ] If the offer pool has fewer than 3 remaining unique offers, the draw MUST not show duplicates (pad with already-seen offers only as last resort)
- [ ] Offer effects MUST compose correctly when multiple synergistic offers are active simultaneously
- [ ] BetweenWaveScene MUST not be skippable (no accidental back-navigation to game mid-offer)
- [ ] All offer descriptions fit within the card UI without overflow at standard font size

## Notes

See openspec/changes/greentd-project/tasks.md Phase 7 for the full task list.
