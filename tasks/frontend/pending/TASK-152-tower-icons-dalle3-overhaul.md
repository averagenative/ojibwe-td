---
id: TASK-152
title: Tower Icons Overhaul — Regenerate All With DALL-E 3
status: pending
priority: high
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

Regenerate all tower/turret icons using DALL-E 3. Current icons are low-quality.
New icons should be clean, recognizable at small sizes, not overly complex, and
maintain a consistent art style across all tower types.

Supersedes TASK-027 (Ojibwe-Themed Tower Icons).

## Art Direction

- Style: flat or semi-flat icon art, bold silhouettes, 2-4 colours per icon
- Inspired by Ojibwe / Woodland art geometry — clean shapes, symmetry, natural colours
- Must be **instantly readable at 48-64px** — silhouette is more important than detail
- Avoid photorealism or too much shading/texture — they compress poorly at small sizes
- Transparent background, square canvas

## Tower Icons to Generate

| Tower | Theme | Key Visual |
|---|---|---|
| **Rock Hurler** | Earth / stone | A rounded boulder or throwing arm + rock |
| **Frost Tower** | Ice / winter | Snowflake or ice crystal, blue tones |
| **Poison Tower** | Spider / venom | Spider or toxic drip, green/purple tones |
| **Arrow Tower** | Crane / precision | Arrow or bow, earthy tones |
| **Thunder Tower** | Thunderbird / lightning | Lightning bolt or bird silhouette, yellow/dark |
| **Aura Tower** | Spirit / medicine wheel | Radial glow or medicine wheel, warm tones |

## Acceptance Criteria

- [ ] 6 new tower icon PNGs generated via DALL-E 3
- [ ] Each at 96×96px minimum (downscaled to 48×48 for HUD use)
- [ ] Saved to `game/public/assets/icons/` replacing existing tower icons
- [ ] Consistent visual style across all 6 icons (same prompt style parameters)
- [ ] Recognizable in greyscale (good silhouette, not just colour-dependent)
- [ ] BootScene preload keys unchanged — just replace the image files
- [ ] Visual check: icons look correct in tower selection UI, upgrade panel, and HUD
- [ ] `npm run typecheck` clean

## Prompt Strategy

Use a consistent base prompt style for all icons, e.g.:
> "Flat icon of [subject], Ojibwe woodland art style, bold geometric shapes, [2-3 colours],
> transparent background, 96x96, clean silhouette, no text, simple"

Vary only the subject and colours per tower. This ensures visual consistency.

## Notes

- DALL-E 3 requires OpenAI API access — may need manual generation or a generation script
- Keep filenames identical to existing icon files so no code changes needed
- If DALL-E output is too photorealistic/complex, add "flat design, icon style, minimal detail" to prompt
