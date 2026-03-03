---
id: TASK-107
title: Multi-Tower Select & Batch Upgrade
priority: medium
status: done
type: feature
---

# Multi-Tower Select & Batch Upgrade

## Problem
Upgrading towers one at a time is tedious, especially late-game when you have many towers of the same type. Players want to quickly upgrade all frost towers (for example) without clicking each one individually.

## Goal
Allow players to select multiple towers and apply upgrades to all of them at once.

## Requirements
- **"Select All of This Type" button** — when a tower is selected, show a button that selects all placed towers of the same type
- **Multi-select visual** — highlight all selected towers (outline, glow, or tint)
- **Batch upgrade panel** — show available upgrades that apply to ALL selected towers; display total cost (per-tower cost × count)
- **Gold check** — only enable upgrade if player can afford the full batch; apply to as many as affordable if partial option desired (TBD)
- **Region select** — drag to draw a selection rectangle over an area; all towers inside are selected
  - **Desktop**: click+drag on empty ground to draw region box; Shift+click to add/remove individual towers
  - **Mobile**: two-finger drag or long-press+drag on empty ground to draw region box (must not conflict with pan/zoom)
- **"Select All [Type]" button** — when a tower is selected, button to select all placed towers of the same type (works great on both desktop and mobile)
- **Deselect** — clicking empty ground or pressing Escape clears multi-selection
- Towers at different upgrade tiers: show upgrade options available to the lowest-tier tower in the selection, or grey out upgrades that not all selected towers can use
