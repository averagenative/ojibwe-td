---
id: TASK-165
title: Tower Selector Icons — Regenerate ALL 6 With Consistent DALL-E 3 Style
status: pending
priority: critical
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

TASK-152 and TASK-159 both attempted to fix tower selector icons but the results
are still inconsistent. Some icons got replaced, some didn't, and the ones that
did use different art styles from each other. The worst offenders:
- **Arrow Tower**: crude line-drawn arrow, looks amateur
- **Rock Hurler**: transparent bg catapult, completely different style from others
- **Tesla/Thunder**: basic lightning bolt, too simple

ALL 6 icons need regenerating in a **single batch** with identical prompt parameters
to guarantee visual consistency.

## Current State of Icons

```
game/public/assets/icons/
├── icon-arrow.png       ← crude line drawing, needs redo
├── icon-rock-hurler.png ← different art style, transparent bg, needs redo
├── icon-frost.png       ← flat snowflake, OK but inconsistent with others
├── icon-poison.png      ← spider, decent but style differs
├── icon-tesla.png       ← basic lightning bolt, needs redo
└── icon-aura.png        ← target/radar circles, decent but style differs
```

## Requirements

Generate ALL 6 icons in one batch using the **exact same prompt template** with
only the subject varying. This is the only way to get consistent style.

### Icon Specifications
- **Size**: 96×96px PNG (displayed at 48×48 in selector panel)
- **Background**: dark rounded square (consistent dark bg like frost/poison have)
- **Style**: semi-flat, bold silhouette, 2-3 colours per icon, Ojibwe woodland inspired
- **Must be instantly readable at 48px** — silhouette is everything

### DALL-E 3 Prompt Template (use for ALL 6)

> "Game icon of [subject], Ojibwe woodland art style, bold geometric silhouette,
> [2-3 colours], dark rounded square background, 96x96, clean lines, semi-flat,
> no text, minimal detail, game UI icon"

### Icons to Generate

| Tower | Subject | Colours |
|---|---|---|
| **Arrow** | Bow with arrow nocked, or crossed arrows | Earth brown, tan, dark green |
| **Rock Hurler** | Catapult arm launching a boulder | Stone grey, brown, earth |
| **Frost** | Snowflake or ice crystal | Ice blue, white, light blue |
| **Poison** | Spider (matches current — keep the spider theme) | Green, purple, dark |
| **Tesla/Thunder** | Thunderbird silhouette or lightning bolt with bird shape | Yellow, dark blue/storm |
| **Aura** | Medicine wheel or radial spirit glow | Warm gold, amber, red-orange |

## Acceptance Criteria

- [ ] All 6 icons regenerated via DALL-E 3 in a single batch
- [ ] All use identical prompt parameters (only subject/colours vary)
- [ ] All have matching dark rounded square background
- [ ] All are 96×96px PNG
- [ ] Visually consistent — same line weight, same level of detail, same style
- [ ] Each icon clearly distinguishable from the others at 48px
- [ ] Replace existing files in `game/public/assets/icons/` (same filenames)
- [ ] Rock hurler icon uses PNG (not SVG) — update BootScene if still loading SVG
- [ ] No code changes needed beyond potential BootScene SVG→PNG fix
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes — update `gearAndTowerIcons.test.ts` if it asserts
  SVG for rock-hurler (it should expect PNG now)
