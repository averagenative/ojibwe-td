---
id: TASK-114
title: Dialog Character Portraits — Quality Pass & Missing Assets
priority: high
status: pending
type: asset
creative: true
---

# Dialog Character Portraits — Quality Pass & Missing Assets

## Problem
All dialog/cutscene characters need proper, high-quality portrait assets. Some existing portraits may be low-quality placeholders or not match the Pacific Northwest / Ojibwe art aesthetic.

## Current Portrait Files (in `game/public/assets/portraits/`)
Elder portraits (96×96, used in cutscenes):
- `elder-mishoomis.png`, `elder-mishoomis-proud.png`
- `elder-nokomis.png`, `elder-nokomis-teaching.png`
- `elder-ogichidaa.png`, `elder-ogichidaa-fierce.png`

Commander portraits (96×96, used in commander select + HUD):
- `portrait-nokomis.png`, `portrait-makoons.png`, `portrait-waabizii.png`
- `portrait-bizhiw.png`, `portrait-animikiikaa.png`

## Requirements
- **Audit every portrait** referenced in `cutsceneDefs.ts`, `vignetteDefs.ts`, `commanderDefs.ts` — verify a matching file exists
- **Quality check** — open each portrait and verify it looks like a proper character portrait (not a placeholder square or generic icon)
- **Art style consistency** — all portraits should share the same art style (warm earth tones, Pacific Northwest / Ojibwe inspired, consistent line weight and color palette)
- **Regenerate** any portraits that are obviously placeholder or inconsistent quality
- If any cutscene references a portrait key that has no matching file, generate the missing portrait
- All portraits must be 96×96 PNG with transparent or dark background
