---
id: TASK-116
title: Frost Tower Projectile Bug — Stray Bubble Flies Across Screen
priority: critical
status: pending
type: bug
---

# Frost Tower Projectile Bug — Stray Bubble Flies Across Screen

## Problem
After a frost tower projectile hits a creep, a random bubble/particle flies off all the way across the screen. This looks broken and unintentional.

## Goal
Fix the frost tower hit effect so all particles stay near the impact point.

## Requirements
- Investigate the frost tower hit/impact particle effect in the projectile or tower attack code
- Ensure all frost particles are bounded to a small radius around the impact point (e.g., 30-50px max travel)
- Particles should dissipate/fade, not fly across the screen
- Check both desktop and mobile (mobile uses reduced particle scale via MobileManager)
- Do NOT change the frost sound (already redesigned in TASK-103)
