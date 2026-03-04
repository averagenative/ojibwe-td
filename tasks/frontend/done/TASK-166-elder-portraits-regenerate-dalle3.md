---
id: TASK-166
title: Elder Portraits — Regenerate ALL via DALL-E 3 Consistent Style
status: done
priority: critical
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

The 3 elder portraits (Mishoomis, Nokomis elder, Ogichidaa) and their expression
variants are crude cartoon-style circular faces that look like "bad South Park art".
They are wildly inconsistent with the game's Ojibwe woodland art direction and the
new commander portraits being generated in TASK-157.

All 6 elder portrait files need regenerating via DALL-E 3 with a consistent style
that matches the commander portraits.

## Current Files

```
game/public/assets/portraits/
├── elder-mishoomis.png          ← crude cartoon face with headband
├── elder-mishoomis-proud.png    ← expression variant, same crude style
├── elder-nokomis.png            ← crude cartoon face with green shawl
├── elder-nokomis-teaching.png   ← expression variant, same crude style
├── elder-ogichidaa.png          ← crude cartoon face with feather
└── elder-ogichidaa-fierce.png   ← expression variant, same crude style
```

## Elder Character Descriptions

| Elder | Role | Description | Expression Variant |
|---|---|---|---|
| **Mishoomis** | Grandfather / primary narrator | Wise elder man, long grey-white hair, headband with medicine wheel, warm weathered face, traditional woodland clothing | **Proud**: slight smile, chin up, eyes bright with pride |
| **Nokomis (elder)** | Grandmother / teacher | Elder woman, silver-white hair in braids, green shawl/blanket, gentle nurturing face, beaded accessories | **Teaching**: one hand raised in gesture, focused attentive expression |
| **Ogichidaa** | War chief / challenge master | Stern warrior elder, eagle feather in hair, face paint (subtle), strong jaw, intense eyes, warrior's bearing | **Fierce**: narrowed eyes, war paint more visible, battle-ready expression |

## DALL-E 3 Prompt Template

Use identical base prompt for all 6, varying only subject/expression:

> "Portrait of [character description], Ojibwe woodland art style, bold geometric
> shapes, warm earth tones, dark background, semi-flat digital painting, indigenous
> elder, northern Ontario, no text, bust portrait, game dialogue portrait, 256x256"

The base and expression variant for each elder should use nearly identical prompts
so the character is clearly the same person — only the facial expression changes.

## Specifications

- **Size**: 256×256px PNG (or whatever the current portraits are — match existing dimensions)
- **Background**: Dark, consistent across all portraits
- **Style**: Semi-flat Ojibwe woodland art, bold shapes, warm earth tones
- **Must match**: Commander portrait style from TASK-157
- **Expression variants**: Same character, different facial expression — must be
  recognizably the same person in both base and variant

## Where Portraits Are Used

- `cutsceneDefs.ts` — dialogue sequences (heavily used, especially Mishoomis)
- `vignetteDefs.ts` — vignette overlays
- `BootScene.ts` — asset preloading
- Tests: `elderPortraits.test.ts`, `wireAssets.test.ts`

## Acceptance Criteria

- [ ] All 6 elder portrait PNGs regenerated via DALL-E 3
- [ ] All use consistent prompt style (only character/expression varies)
- [ ] Each elder is visually distinct from the others
- [ ] Expression variants are clearly the same character as their base portrait
- [ ] Art style matches commander portraits (TASK-157) and game's Ojibwe woodland theme
- [ ] Portraits replace existing files (same filenames) in `game/public/assets/portraits/`
- [ ] No code changes needed — same preload keys, same rendering pipeline
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes — update `elderPortraits.test.ts` if it asserts on image content
