---
id: TASK-068
title: Mobile-Responsive Layout — Detect Mobile, Fix Logo Overlap, Touch-Friendly UI
status: done
priority: critical
phase: polish
---

# Mobile-Responsive Layout — Detect Mobile, Fix Logo Overlap, Touch-Friendly UI

## Problem

On mobile browsers, the game is obscured by the logo at the top of the page.
The HTML layout (index.html + style.css) doesn't adapt to small viewports — the
logo takes up too much vertical space, pushing the Phaser canvas below the fold.
The game canvas itself may not scale properly to fill the mobile viewport. Touch
targets in menus and HUD are too small for finger taps.

## Goal

Detect mobile browsers and serve a layout that works well on phones and tablets.
The logo should shrink or hide, the game canvas should fill the viewport, and
all interactive elements should be touch-friendly (minimum 44×44px tap targets).

## Acceptance Criteria

### Mobile Detection
- [ ] Detect mobile via viewport width + touch capability:
  ```typescript
  const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
  ```
- [ ] Store detection result globally (e.g. `window.__OJIBWE_MOBILE = true`)
  accessible from both HTML layer and Phaser scenes
- [ ] Re-evaluate on orientation change / resize

### HTML Layout Fixes (index.html + style.css)
- [ ] On mobile: logo shrinks to max 120px height (from 320px) or hides entirely
- [ ] On mobile: remove header padding, minimize non-game chrome
- [ ] Game canvas uses `width: 100vw; height: 100vh` on mobile (or 100dvh for
  dynamic viewport height on iOS Safari)
- [ ] No horizontal scroll — viewport meta tag:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0,
    maximum-scale=1.0, user-scalable=no">
  ```
- [ ] On mobile: consider hiding logo entirely and showing "OJIBWE TD" as small
  text above the canvas, or integrating it into the Phaser MainMenuScene

### Phaser Canvas Scaling
- [ ] Phaser game config uses `scale.mode: Phaser.Scale.RESIZE` or `FIT` to
  fill the available space
- [ ] On mobile: canvas fills entire viewport (no letterboxing if possible)
- [ ] Handle notch/safe areas: respect `env(safe-area-inset-top)` etc.
- [ ] Orientation lock to landscape via CSS/meta or show "rotate device" prompt
  if portrait (TD games need horizontal space)

### Touch-Friendly UI
- [ ] All buttons minimum 44×44px tap target (Apple HIG / WCAG standard)
- [ ] Tower panel icons: increase tap area on mobile (current icons may be ~32px)
- [ ] HUD buttons (pause, speed, mute): increase size on mobile
- [ ] Tower placement: long-press to place instead of/in addition to tap
  (prevent accidental placement)
- [ ] Tower selection: tap selects, double-tap or hold opens upgrade panel
- [ ] Pinch-to-zoom: disabled (or handled gracefully — don't break the game)

### Menu Screens
- [ ] MainMenuScene: region/stage cards stack vertically on mobile instead of
  horizontal row (or use horizontal scroll with snap)
- [ ] Buttons scale up on mobile for easier tapping
- [ ] Text sizes increase on mobile (minimum 14px for body, 18px for headers)

### Performance on Mobile
- [ ] Reduce particle count on mobile (50% of desktop particle budgets)
- [ ] Consider lower resolution rendering on mobile (Phaser canvas resolution
  vs display size)
- [ ] Disable non-essential visual effects on low-end mobile
  (terrain decorations, vignette, etc.)

### Testing
- [ ] Test on Chrome Android (most common mobile browser)
- [ ] Test on Safari iOS (WebKit rendering differences)
- [ ] Test on both phone (375×667 portrait, 667×375 landscape) and tablet
  (768×1024 portrait, 1024×768 landscape) viewports
- [ ] Test orientation change mid-game (should not crash or lose state)

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Desktop layout unchanged (mobile changes are gated behind detection)
- [ ] No horizontal overflow on any mobile viewport
- [ ] Game playable end-to-end on mobile Chrome + Safari

## Notes

- TASK mobile-friendly was done earlier but many features have shipped since
  then (20+ tasks). This is a fresh pass focused on the current state.
- The logo overlap is the #1 issue — on a 375px wide phone in landscape
  (375×667 → 667×375), the logo + header eats vertical space the game needs
- iOS Safari has the dynamic toolbar that changes viewport height — use `dvh`
  units not `vh` for full-height layouts
- Consider a PWA manifest + service worker as a bonus — allows "Add to Home
  Screen" which gives fullscreen without browser chrome on mobile
- The Phaser scale manager does most of the heavy lifting — the HTML/CSS
  wrapper just needs to give it the right container size
