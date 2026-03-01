---
id: TASK-041
title: Logo & Page Layout Redesign
status: done
priority: critical
phase: polish
---

# Logo & Page Layout Redesign

## Goal

Wire the transparent Ojibwe TD logo into the game's HTML shell and redesign
the overall page layout so the logo, game canvas, and any surrounding chrome
feel cohesive and intentional — not just a white page with a Phaser canvas
dropped in.

## Context

- Logo lives at `game/public/assets/ui/logo.png` — fully transparent PNG,
  661×467px (thunderbird shield + "OJIBWE TD" text above it in Cinzel Bold)
- The game currently renders in a Phaser canvas that fills the viewport
- The page `game/index.html` is minimal boilerplate
- Palette reference: `tasks/frontend/pending/natural-color-palette.md`
  (forest green `#0d1208`, lake blue `#4A7FA5`, marsh `#6B8F3E`, cream `#e8dcc8`)

## Acceptance Criteria

### HTML / CSS shell (`game/index.html` + `game/src/style.css` or inline)

- [ ] `<body>` background: dark forest green (`#0d1208`) so the logo's
  transparency shows correctly against a natural colour
- [ ] Logo `<img>` rendered above the Phaser canvas in a centred header:
  ```html
  <header id="game-header">
    <img src="/assets/ui/logo.png" alt="Ojibwe TD" id="logo">
  </header>
  <div id="game-container"><!-- Phaser mounts here --></div>
  ```
- [ ] Logo scales responsively: `max-width: min(520px, 90vw)`, `height: auto`
- [ ] On narrow screens (≤ 480px) logo shrinks gracefully, never clips
- [ ] Header has subtle vertical padding (no logo crammed against top edge)
- [ ] The Phaser canvas fills its container to the available viewport height
  below the header (use `calc(100vh - header height)` or flex column layout)
- [ ] No horizontal scrollbar at any viewport width ≥ 320px

### Phaser config (`game/src/main.ts`)

- [ ] Phaser `parent` points to `'game-container'`
- [ ] Canvas `width` / `height` sized to fill `game-container` dynamically
  (use Phaser's Scale Manager: `mode: Phaser.Scale.FIT`,
  `autoCenter: Phaser.Scale.CENTER_BOTH`)
- [ ] Background colour `0x0d1208` set in Phaser config so there's no
  white flash before the first scene loads

### Loading the logo in-game (BootScene / MainMenuScene)

- [ ] `BootScene.preload()` still loads `logo` texture key for use inside
  Phaser scenes if needed (e.g. a loading screen watermark)
- [ ] `MainMenuScene` hides or removes its current text title ("OJIBWE TD")
  since the HTML header now handles the logo — no double title

## Layout Sketch

```
┌─────────────────────────────────────┐  ← body bg: #0d1208
│         [OJIBWE TD logo]            │  ← <header>, centred, ~80px tall
├─────────────────────────────────────┤
│                                     │
│         Phaser canvas               │  ← fills remaining viewport height
│         (MainMenuScene, etc.)       │
│                                     │
└─────────────────────────────────────┘
```

## Notes

- The logo PNG is transparent — the dark body background shows through,
  making the forest-green feel like the natural backdrop for the logo
- Do NOT add a separate loading spinner — Phaser's BootScene handles that
- Keep the HTML minimal; heavy styling lives in CSS, not inline attributes
- If a `style.css` doesn't already exist, create one and link it in `index.html`
