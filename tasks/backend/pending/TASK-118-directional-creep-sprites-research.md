---
id: TASK-118
title: "Backlog: Directional Creep Sprites — Research & Implementation Options"
priority: low
status: pending
type: research
---

# Backlog: Directional Creep Sprites — Research & Implementation Options

## Problem
Currently creeps use a single sprite that gets flipped horizontally for left/right movement. There's no distinct up/down view, which looks unnatural when creeps walk vertically on the path.

## Goal
Research and document implementation options for directional creep sprites (left-right + up-down views). This is a higher-effort feature — this task is research only.

## Deliverable
Create a document at `docs/directional-sprites-research.md` covering:

1. **Current state** — how creep sprites and flipping currently work (Creep.ts `updateDirectionalVisual`)
2. **Option A: 2-frame approach** — side view + front/back view; flip for left vs right; separate sprite for up vs down
3. **Option B: 4-direction spritesheets** — left, right, up, down as separate frames or spritesheet rows
4. **Option C: Procedural rotation** — slight rotation/skew of the single sprite based on movement direction
5. **Wireframe/asset pipeline changes** — what asset generation workflow changes are needed; how many new PNGs per creep type
6. **Effort estimate** — rough scope for each option (small/medium/large)
7. **Recommendation** — which option balances quality vs effort best

Do NOT implement anything — research and document only.
