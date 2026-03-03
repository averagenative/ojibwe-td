---
id: TASK-119
title: Remove Visual Box from Tower Turrets
priority: high
status: done
type: bug
---

# Remove Visual Box from Tower Turrets

## Problem
Tower turrets have a visible rectangular box/outline that looks weird when the towers rotate to face creeps. The box rotates with the turret, making it obvious and jarring.

## Goal
Remove the visual box from tower turret rendering so only the turret sprite/shape is visible.

## Requirements
- Find where the turret bounding box / debug rectangle is rendered (likely in tower entity code or turret visual setup)
- Remove or hide the rectangular outline — only the turret graphic itself should be visible
- Ensure turret rotation still works correctly after removing the box
- Test with all tower types (arrow, frost, poison, tesla/thunder, aura, rock hurler)
- Verify on both desktop and mobile
