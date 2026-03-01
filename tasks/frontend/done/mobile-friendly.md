---
id: TASK-019
title: Mobile-Friendly Browser Game
status: done
category: frontend
phase: 12
openspec_ref: ""
depends_on: ["TASK-11"]
created: 2026-03-01
---

## Description

Make the Ojibwe TD browser game fully playable on mobile devices (iOS/Android).
The game must work with touch input, scale correctly to phone screen sizes,
and feel native — no pinch-zoom, no overflow, no tiny tap targets.

## Acceptance Criteria

- [ ] Phaser scale mode set to `Phaser.Scale.FIT` with `autoCenter: Phaser.Scale.CENTER_BOTH` so the canvas fills the viewport on any screen size
- [ ] Viewport meta tag in `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">`
- [ ] Tower placement works with touch (`pointerdown` already handles touch via Phaser — verify no mouse-only guards)
- [ ] Tower panel tap targets (tower select buttons) are at minimum 48×48px, with adequate spacing for thumb use
- [ ] HUD elements (gold, lives, wave counter) remain legible at 375px viewport width (iPhone SE baseline)
- [ ] Roguelike offer cards are tappable — full-card tap area, not just a small button
- [ ] Range circle appears on tower tap (same as click), dismissed on tap-elsewhere
- [ ] No horizontal scroll / overflow on any game screen at 375–430px width
- [ ] Pinch-zoom disabled (CSS `touch-action: none` on canvas + viewport meta)
- [ ] On-screen "Start Wave" button visible and tappable on mobile (no keyboard dependency)
- [ ] Pause / menu accessible via touch — no keyboard-only escape hatch
- [ ] Tested on iPhone (Safari) and Android Chrome at 390×844 and 375×667 resolutions

## Notes

- Phaser canvas is inside `#game-container` div — apply `width: 100%; height: 100vh` to container and `touch-action: none` to canvas
- Existing `host: '0.0.0.0'` in vite.config.ts already allows LAN dev testing from phone
- If upgrade panel or offer modal uses DOM overlay elements, those also need responsive sizing
- `TASK-11` is Phase 11 (Polish & Balance) — depends on that shipping first so UI is stable before mobile pass
