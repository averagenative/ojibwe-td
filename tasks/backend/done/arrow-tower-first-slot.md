---
id: TASK-091
title: Reorder Arrow Tower to First Slot in Tower Panel
status: done
category: backend
priority: high
depends_on: [TASK-082]
created: 2026-03-02
---

## Description

Move the Arrow tower to be the first tower in the TowerPanel strip (leftmost position).
Arrow is the cheapest tower and the natural first purchase — it should be the first option players see.

## Acceptance Criteria

- [ ] Arrow tower appears as the first (leftmost) button in the TowerPanel
- [ ] Tower ordering in `ALL_TOWER_DEFS` (or wherever the panel reads its definitions) places Arrow before Cannon
- [ ] Keyboard shortcut `1` maps to Arrow (since it's now first)
- [ ] All other towers shift right accordingly (Cannon becomes `2`, etc.)
- [ ] TypeScript compiles clean (`npm run typecheck`)
- [ ] No regressions in tower placement, tooltips, or upgrade panels

## Notes

- The tower order is likely defined in `src/data/towerDefs.ts` via `ALL_TOWER_DEFS` array
- TowerPanel iterates this array to create buttons, so reordering the array should be sufficient
- Keyboard shortcut hints (1-6) are based on array index in TowerPanel, so they'll auto-update
