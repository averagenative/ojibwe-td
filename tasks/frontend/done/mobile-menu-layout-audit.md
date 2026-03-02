---
id: TASK-080
title: Mobile Menu Layout Audit — Fix Squashed Text & Overlapping Elements
status: done
priority: high
phase: bugfix
---

# Mobile Menu Layout Audit — Fix Squashed Text & Overlapping Elements

## Problem

On mobile browsers, several menu screens have text and visual elements that
are squashed together, overlapping, or clipped. The mobile-responsive pass
(TASK-068) handled canvas scaling and the logo, but the in-game Phaser scene
UIs (MainMenu, GameOver, MetaMenu, CommanderSelect, Codex, BetweenWave) were
not fully audited for tight mobile viewports.

## Goal

Systematically audit every Phaser scene's UI layout at mobile viewport sizes
and fix any elements that overlap, clip, or are unreadable. All text should be
legible and all interactive elements should have adequate spacing.

## Investigation — Check Each Scene

### MainMenuScene
- [ ] Region cards: check text fits within card bounds at mobile scale
- [ ] Stage cards: check moon rating, lock icon, stage name don't overlap
- [ ] Button text: START GAME, CODEX, META — check font size and spacing
- [ ] Endless mode button: check it doesn't overlap with stage cards

### CommanderSelectScene
- [ ] Commander cards: name, ability description, portrait — check spacing
- [ ] Back button: check it's tappable and not overlapping other elements
- [ ] Description text: check word wrap and readability at small sizes

### GameScene HUD
- [ ] Top HUD bar: wave counter, gold, lives, speed buttons, mute — check
  these don't overlap at narrow widths
- [ ] Upgrade panel header: tower name, RESPEC, SELL buttons — check spacing
- [ ] Behavior panel: priority buttons and toggle — check tap targets
- [ ] Placement hint text: check it doesn't overlap with HUD elements

### BetweenWaveScene
- [ ] Offer cards: title, description, icon — check text isn't clipped
- [ ] Card spacing: check cards don't overlap each other
- [ ] Skip/select buttons: check tappable and visible

### GameOverScene
- [ ] Stats display: wave count, kills, gold, currency — check spacing
- [ ] Moon rating row: check moons + label don't overlap stats
- [ ] Loot drops: check gear items display correctly
- [ ] Buttons: RETRY, MENU, META — check spacing and tap targets

### MetaMenuScene
- [ ] Unlock nodes: check labels fit and don't overlap connecting lines
- [ ] Stat bonus panel: check text readability
- [ ] Currency display: check it's visible and not clipped
- [ ] Back button: check tappable

### CodexScene
- [ ] Entry list: check text doesn't clip or overlap
- [ ] Detail view: check readability of lore text at mobile font sizes

## Acceptance Criteria

- [ ] All text on all scenes is readable at 375×667 landscape (phone) and
  768×1024 landscape (tablet) viewports
- [ ] No overlapping UI elements on any screen at any mobile viewport
- [ ] Minimum font size 11px for body text, 14px for headers on mobile
- [ ] Minimum 8px gap between distinct UI elements (buttons, cards, text)
- [ ] All interactive elements have minimum 44×44px tap target on mobile
- [ ] Elements that don't fit horizontally should stack vertically or scroll
  rather than overlap

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Desktop layout unchanged — all fixes gated behind `isMobile()` check
- [ ] Test at minimum: 667×375 (phone landscape), 1024×768 (tablet landscape)
