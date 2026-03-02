---
id: TASK-090
title: Audio Settings UI — Independent Music/SFX Volume & Toggle
status: done
priority: high
phase: feature
---

# Audio Settings UI — Independent Music/SFX Volume & Toggle

## Problem

Currently there is only a single mute toggle button (🔊/🔇) in the HUD. Players
cannot independently control music vs SFX volume, and there is no way to disable
music while keeping sound effects on (or vice versa).

## Goal

Add an audio settings panel with independent music and SFX controls:
- Music on/off toggle (independent of SFX)
- SFX on/off toggle (independent of music)
- Music volume slider
- SFX volume slider
- Master volume slider (optional)
- All settings persist across sessions via SaveManager

## Design

### In-Game HUD
- Replace or augment the current mute button with a small gear/settings icon
- Tapping it opens an audio settings popup/overlay
- Or: keep mute button as master mute, add a settings gear that opens full panel

### Audio Settings Panel
- Music: toggle on/off + volume slider (0-100%)
- SFX: toggle on/off + volume slider (0-100%)
- Master: toggle mute all + volume slider (optional, existing behavior)
- Close button to dismiss panel

### Main Menu
- Add a Settings/Options button that opens the same audio panel
- Or integrate into an existing settings area if one exists

## Acceptance Criteria

- [ ] Music can be muted independently without affecting SFX
- [ ] SFX can be muted independently without affecting music
- [ ] Music volume adjustable via slider or +/- buttons
- [ ] SFX volume adjustable via slider or +/- buttons
- [ ] Settings persist across sessions (SaveManager already has audioMusic,
  audioSfx, audioMaster, audioMuted fields)
- [ ] Settings accessible from both in-game HUD and main menu
- [ ] Visual feedback when adjusting (icon changes, slider position updates)
- [ ] Minimum 44px tap targets on mobile for all controls
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes

## Implementation Hints

- AudioManager already has `setMusicVolume()`, `setSfxVolume()`, `setMasterVolume()`
- SaveManager already persists audioMusic, audioSfx, audioMaster, audioMuted
- HUD.ts has `createMuteButton()` — extend or replace with settings panel
- Could use a Phaser container overlay similar to UpgradePanel pattern
