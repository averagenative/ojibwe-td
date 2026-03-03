---
id: TASK-130
title: Frost Tower Balance — Too Easy to Perma-Freeze Non-Boss Creeps
priority: critical
status: done
type: balance
---

# Frost Tower Balance — Perma-Freeze Makes Game Too Easy

## Problem
Everything except fast bosses is too easy to defeat if frost towers are placed strategically. Creeps can be easily killed before completing a single loop because frost slow is too strong. This removes the need to think about tower placement or build diversity.

## Goal
Rebalance frost tower interaction so players need multiple tower types and thoughtful placement, not just frost spam.

## Requirements
- **Analyze current frost mechanics** — slow %, duration, stacking behavior, range, fire rate
- **Options to consider** (implement the best combination):
  - Diminishing returns on frost slow (each additional frost tower affecting same creep has reduced effect)
  - Slow immunity cooldown (creeps become briefly immune to slow after being slowed for X seconds)
  - Frost slow cap (max 60-70% slow, not 90%+)
  - Certain creep types with frost resistance (armored, immune types)
  - Higher frost tower cost to limit early-game spam
  - Reduced frost range so placement matters more
- **Preserve frost identity** — frost should still feel useful for slowing, just not a win-by-itself strategy
- **Test across multiple stages** — ensure the change doesn't make frost useless, just balanced
- Update any related upgrade descriptions if mechanics change
- Run the full test suite after changes
