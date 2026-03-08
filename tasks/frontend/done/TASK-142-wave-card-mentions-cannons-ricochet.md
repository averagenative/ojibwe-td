---
id: TASK-142
title: Wave Clear Card Still Mentions "Cannons" (Ricochet)
status: done
priority: low
category: frontend
phase: bug
depends_on: []
created: 2026-03-03
---

## Description

One of the wave clear reward cards references "cannons" in its description
(the Ricochet card). The game doesn't have cannons — this is likely leftover
text from an earlier tower naming scheme. Update to match current tower names.

## Acceptance Criteria

- [ ] Find the Ricochet card text in offer/card data definitions
- [ ] Replace "cannons" with the correct tower name or generic term
- [ ] Audit all other wave clear cards for outdated tower references
- [ ] Ensure card descriptions match current game terminology

## Resolution
Superseded by TASK-161 (Remove All Cannon Tower References) which covers a full
codebase audit of all cannon mentions including offer card text.
