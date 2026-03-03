---
id: TASK-127
title: Rush Wave Should Send Next Wave Immediately Without Waiting
priority: critical
status: in-progress
type: bug
---

# Rush Wave — Send Next Wave Immediately

## Problem
The rush/force wave feature waits for the current wave to finish before sending the next wave. It should send the next wave of creeps immediately, overlapping with any remaining creeps from the current wave.

## Goal
Rush wave sends the next wave immediately, stacking on top of any currently alive creeps.

## Requirements
- When rush is activated, immediately start spawning the next wave's creeps even if current wave creeps are still alive
- Multiple rushes should stack (rush 3 times = 3 waves of creeps on screen simultaneously)
- Wave completion should still trigger when ALL spawned creeps from a wave are dead or escaped
- The gold bonus for rushing should still apply
- Ensure WaveManager handles overlapping waves correctly (no crashes, no missed wave-complete events)
- Test edge cases: rushing during boss waves, rushing the final wave, rapid consecutive rushes
