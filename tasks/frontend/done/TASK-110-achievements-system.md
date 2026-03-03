---
id: TASK-110
title: Achievements System — 50-60 Achievements for Progression Milestones
priority: medium
status: done
type: feature
---

# Achievements System — 50-60 Achievements for Progression Milestones

## Problem
No achievement system exists to reward players for milestones and encourage replayability.

## Goal
Implement a full achievements system with 50-60 achievements across multiple categories.

## Achievement Categories

### Map Clearing (~10)
- Clear each region (Mishomis Forest, etc.) on normal
- Clear each region on hard/endless variants
- Clear all regions (completionist)

### Commander Unlocks (~6-8)
- Unlock each commander
- Win a game with each commander
- Win with every commander on the same map

### Region Unlocks (~4-6)
- Discover/unlock each region
- Unlock all regions

### Tower Mastery (~10-12)
- Build N towers of each type
- Max upgrade a tower for the first time
- Max upgrade every tower type
- Full Equipped — all towers in a game have max upgrade slots filled
- Build X total towers across all games

### Economy (~6-8)
- Earn X gold in a single game
- Spend X crystals in the meta shop
- Accumulate X total crystals
- Buy all meta upgrades

### Combat (~10-12)
- Kill X creeps total
- Kill X bosses total
- Kill a boss in under N seconds
- Survive to wave X in endless mode
- Win without losing a life
- Win with only one tower type

### Misc (~5-8)
- Play N total games
- Use every consumable type in one run
- Reroll X times in one run
- Discover all codex entries
- First victory

## Requirements
- `AchievementManager` system — tracks progress, persists via SaveManager
- Achievement notification popup (toast) when unlocked during gameplay
- Achievement gallery/list accessible from main menu or meta screen
- Each achievement: id, title, description, icon, category, progress (current/target), unlocked boolean
- Some achievements are hidden until unlocked (spoiler protection)
- Integrate with existing SaveManager for persistence across sessions
