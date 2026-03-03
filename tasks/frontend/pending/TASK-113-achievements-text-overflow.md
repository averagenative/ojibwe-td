---
id: TASK-113
title: Achievements & Challenges Box Text Overflow on Main Menu
priority: high
status: pending
type: bug
---

# Achievements & Challenges Box Text Overflow on Main Menu

## Problem
On the main menu page, the achievements box has text that overflows outside its container. The challenges box nearly overflows as well.

## Goal
Fix text layout so all content fits within its bounding box without overflow or clipping.

## Requirements
- **Achievements box** — text must not overflow the container; use word-wrap, font-size reduction, or scrollable overflow as needed
- **Challenges box** — ensure text fits with comfortable margin; same treatment as achievements
- Test on both desktop (1280×720) and mobile viewports
- Do not change the box size unless absolutely necessary — prefer text layout fixes
