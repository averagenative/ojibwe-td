---
id: TASK-184
title: "Sweep remaining hacker green colors from gameplay VFX"
status: pending
category: frontend
phase: release
priority: medium
depends_on: []
created: 2025-03-07
---

## Description

Several gameplay visual effects still use bright neon green colors (#00ff44, 0x44ff66, 0x44ff88, etc.) that clash with the earthy palette (PAL). These are mostly in-game VFX rather than menu chrome, but they're noticeable.

## Locations to Update

### Creep tints (`src/entities/Creep.ts`)
- Line 977: `0x44ff88` — regen status effect visual
- Line 1263: `0x44aaaa` — slowed+poisoned tint
- Line 1267: `0x44ff66` — poisoned tint
- Lines 1284, 1286, 1292, 1296 — corresponding graphics body colors

### Tower VFX (`src/entities/towers/Tower.ts`)
- Line 1057: `0x44ff44` — poison bubble VFX
- Line 1214: `0x88ff44` — poison turret firing glow

### Projectile effects (`src/entities/Projectile.ts`)
- Line 48: `0x44ff88` — poison projectile trail
- Line 638: `0x88ffbb` — frost impact fill
- Line 652: `0x88ffbb` — frost impact sparkle

### Ambient/Terrain
- `src/systems/AmbientVFX.ts` line 543: `0x44ff88` — aurora shimmer
- `src/systems/MetaAmbiance.ts` line 78: `0x66cc33` — summer leaf color (too bright)
- `src/systems/TerrainRenderer.ts` line 111: `0x44aa30` — spring grass

### Data definitions
- `src/data/codexDefs.ts` lines 216, 310: `0x44aa44`, `0x44aa88` — codex tile colors
- `src/scenes/CommanderSelectScene.ts` line 33: `0x44aa44` — Sustain role color (should use `PAL.cmdSustain`)

## Acceptance Criteria

- [ ] All neon green VFX colors replaced with earthy PAL equivalents
- [ ] Poison effects use a muted/natural poison color (e.g., dark amber-green)
- [ ] Frost effects use palette blue tones, not cyan-green
- [ ] No #00ff44, #00ff88, 0x44ff44, 0x44ff66, 0x44ff88 remain outside test files
- [ ] Visual effects still read clearly during gameplay
