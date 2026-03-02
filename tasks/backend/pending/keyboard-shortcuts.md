---
id: TASK-060
title: Keyboard Shortcuts — Pause, Speed, Deselect, Tower Hotkeys
status: pending
priority: high
phase: gameplay
---

# Keyboard Shortcuts — Pause, Speed, Deselect, Tower Hotkeys

## Problem

Desktop players have no keyboard controls. Everything requires mouse clicks —
pause, speed toggle, tower deselection, tower placement. Phase 11 notes mention
Space/F/Esc shortcuts but the audit found they're not wired in GameScene.

## Goal

Add keyboard shortcuts for common gameplay actions. Desktop TD players expect
keyboard control for speed and efficiency.

## Acceptance Criteria

### Core Shortcuts
- [ ] **Space** — toggle pause (same as clicking pause button)
- [ ] **F** — cycle game speed: 1× → 2× → 1× (same as speed buttons)
- [ ] **Escape** — deselect current tower / exit placement mode
- [ ] **S** — sell selected tower (with confirmation if we have one)
- [ ] **U** — open/close upgrade panel for selected tower

### Tower Placement Hotkeys
- [ ] **1-6** — enter placement mode for tower types (in panel order):
  1=Cannon, 2=Frost, 3=Tesla, 4=Mortar, 5=Poison, 6=Aura
- [ ] Only works if player can afford the tower and it's unlocked
- [ ] Number key while already in that tower's placement mode → cancel

### HUD Integration
- [ ] Shortcut hints shown on tower panel buttons (small "1", "2" etc. in corner)
- [ ] Speed button shows "(F)" hint
- [ ] Pause area shows "(Space)" hint
- [ ] Hints shown only on desktop (hidden on touch devices)

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Shortcuts don't fire when typing in any text input (if we add search etc.)
- [ ] Shortcuts disabled during scene transitions and boss offer panels
- [ ] Works correctly when game is paused (only Space/Esc should work while paused)

## Notes

- Use `this.input.keyboard?.on('keydown-SPACE', ...)` pattern (Phaser captures
  these by default, no browser conflicts)
- Phase 11 already added `prePauseSpeed` for storing speed before pause — reuse
- The HUD sync pattern exists: `hud.syncSpeed(mult)` exposes `setActiveSpeed()`
