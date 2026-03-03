---
id: TASK-109
title: Aura & Upgrade Impact Audit — Verify All Upgrades Have Noticeable Effect
priority: high
status: done
type: balance
---

# Aura & Upgrade Impact Audit — Verify All Upgrades Have Noticeable Effect

## Problem
It's unclear whether all auras and upgrades are actually applying their stat changes correctly and whether the impact is noticeable to the player during gameplay.

## Requirements
- Audit every tower upgrade path — verify the stat delta is applied correctly at each rank
- Audit every aura — verify the buff is applied to nearby towers and stacks/refreshes properly
- Ensure upgrade effects are visually/mechanically noticeable (not just +1% on a stat)
- Check that tower info panel reflects the correct post-upgrade stats
- Log or document any upgrades that are broken, too weak to notice, or redundant
- Fix any that aren't applying correctly
- Bump values on any that are too subtle to feel impactful
