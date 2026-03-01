---
id: TASK-039
title: Replace Hacker-Green Palette with Natural Ojibwe Colours
status: pending
priority: high
phase: polish
---

# Replace Hacker-Green Palette with Natural Ojibwe Colours

## Problem

The game UI uses a "90s hacker terminal" aesthetic: electric greens (`#00ff44`,
`#00ff88`), near-black backgrounds (`0x0a0a0a`), and monospace everywhere.
The generated art has a warm, earthy Northern Ontario palette — forest greens,
granite greys, lake blues, marsh tones. The mismatch makes the UI feel
disconnected from the art.

## Goal

Replace the neon/terminal palette with natural tones that complement the
generated Ojibwe artwork. Keep contrast and readability; just swap the
colours and optionally the font family.

## Reference Palette (from `docs/asset-generation.md`)

| Role              | Old colour     | New colour              | Notes                          |
|-------------------|----------------|-------------------------|--------------------------------|
| Primary accent    | `#00ff44`      | `#6B8F3E` marsh green   | Active elements, highlights    |
| Secondary accent  | `#00ff88`      | `#4A7FA5` lake blue     | Wave complete, info banners    |
| Background dark   | `0x0a0a0a`     | `0x0d1208` deep forest  | Main scene background          |
| Panel background  | `0x111111`     | `0x141f0e` forest floor | Cards, panels, HUD             |
| Panel border      | `0x225522`     | `0x2D5016` pine shadow  | Inactive borders               |
| Selected border   | `0x00ff44`     | `0x6B8F3E` marsh        | Selected/active borders        |
| Text primary      | `#00ff44`      | `#a8c070` soft leaf     | Main labels, wave counter      |
| Text secondary    | `#44aa44`      | `#7a9e52` mid leaf      | Subtitles, descriptions        |
| Text dim          | `#446644`      | `#4a6130` moss          | Hints, footnotes               |
| Gold / economy    | `#ffcc00`      | `#c8952a` autumn gold   | Gold counter, rewards          |
| Danger / lives    | `#ff4444`      | `#b84c2a` ember red     | Lives lost, boss warning       |
| Boss warning      | `#ff4422`      | `#c0501e` deep ember    | Boss wave announcement         |
| Endless / info    | `#44aaff`      | `#4A7FA5` lake blue     | Endless mode labels            |
| Medicine Wheel    | keep as-is     | East=`#d4a82a`, South=`#b84c2a`, West=`#2D2D2D`, North=`#e8dcc8` | Aura tower |

## Acceptance Criteria

- [ ] A single `src/ui/palette.ts` (or `src/config/palette.ts`) module exports
  all colour constants so future changes are one-file edits:
  ```ts
  export const PAL = {
    bgDark:        0x0d1208,
    bgPanel:       0x141f0e,
    borderInactive:0x2D5016,
    borderActive:  0x4a6e28,
    accentGreen:   '#6B8F3E',
    accentBlue:    '#4A7FA5',
    textPrimary:   '#a8c070',
    textSecondary: '#7a9e52',
    textDim:       '#4a6130',
    gold:          '#c8952a',
    danger:        '#b84c2a',
    // … etc.
  } as const;
  ```
- [ ] All hard-coded hex colours in the following files replaced with `PAL.*`
  references:
  - `src/scenes/MainMenuScene.ts`
  - `src/scenes/GameScene.ts`
  - `src/scenes/BetweenWaveScene.ts`
  - `src/scenes/GameOverScene.ts`
  - `src/ui/HUD.ts`
  - `src/ui/TowerPanel.ts`
  - `src/ui/VignetteOverlay.ts`
  - `src/ui/BossOfferPanel.ts`
  - `src/ui/UpgradePanel.ts`
- [ ] `fontFamily: 'monospace'` replaced with a warmer alternative — either a
  web-safe serif (`Georgia`) or a single Google Font loaded in `index.html`
  (e.g. `Cinzel` for headers, `Lato` or `Open Sans` for body). If a web font
  is added, it must load before BootScene (add `<link>` in `index.html`)
- [ ] Visual check: game is readable on mobile (375 px wide) with new colours
- [ ] No TypeScript errors (`tsc --noEmit` passes)

## Notes

- The palette above is a starting point — adjust shades if contrast is
  insufficient (aim for ≥ 4.5:1 against panel backgrounds for primary text)
- Keep `#ffffff` / `#000000` for strokes and shadows; those are fine
- Boss warning can keep high-contrast red-orange but should use ember tones,
  not neon
- The Medicine Wheel colours on the Aura tower are culturally specific —
  leave them as designed
