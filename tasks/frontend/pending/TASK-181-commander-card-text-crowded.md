---
id: TASK-181
title: "Fix: commander card text too crowded on mobile"
status: in-progress
category: frontend
phase: release
priority: medium
depends_on: []
created: 2025-03-07
---

## Description

On the Commander Select screen, the card text (especially Nokomis which is unlocked and shows all fields) is crowded. The clan/totem line, aura name, ability name, and "tap for details" hint all overlap or are too close together.

## Screenshots

- See `troubleshoot/nokomis commander sub text too crowded.jpeg`

## Acceptance Criteria

- [ ] Commander card text is readable without overlap on mobile
- [ ] All text fields (role, name, clan/totem, portrait, aura, ability, hint) fit within card bounds
- [ ] Card height increased if needed, or font sizes reduced for mobile
