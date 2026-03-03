---
id: TASK-124
title: Stage Description Text Overlaps Best Turret Suggestion
priority: high
status: done
type: bug
---

# Stage Description Text Overlaps Best Turret Suggestion

## Problem
On the stage selection screen, the text explanation of stages overlaps with the "best turret" suggestion display. These UI elements need proper spacing.

## Goal
Fix layout so stage description and turret suggestion don't overlap.

## Requirements
- Identify where stage description text and turret suggestion are positioned in MainMenuScene
- Add proper spacing/offsets so they don't overlap
- Test with long stage descriptions to ensure no overflow
- Test on both desktop and mobile
