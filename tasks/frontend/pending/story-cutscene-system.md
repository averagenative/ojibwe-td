---
id: TASK-074
title: Story Cutscene System — Illustrated Dialog & Narrative Moments
status: pending
priority: medium
phase: content
---

# Story Cutscene System — Illustrated Dialog & Narrative Moments

## Problem

The vignette system (VignetteOverlay) shows short text popups, but there's no
proper cutscene or dialog system for telling the story of Ojibwe TD. Players
don't get narrative context for why they're defending these lands, who the
commanders are, or what the bosses represent.

## Goal

Build a flexible cutscene/dialog system that can show illustrated conversations,
narrative moments, and story beats at key points in the game. Think visual novel
style — character portraits, dialog boxes, background scenes.

## Acceptance Criteria

### Cutscene Engine
- [ ] `CutscenePlayer` class that takes a cutscene definition and plays it
- [ ] Cutscene definition format (JSON or TS):
  ```typescript
  interface CutsceneDef {
    id: string;
    scenes: CutsceneFrame[];
  }
  interface CutsceneFrame {
    background?: string;        // bg image key or colour
    speaker?: string;           // character name (shown in nameplate)
    portrait?: string;          // character portrait image key
    portraitSide?: 'left' | 'right';
    text: string;               // dialog text (supports line breaks)
    emotion?: string;           // portrait variant (neutral/angry/sad)
    effect?: 'shake' | 'flash' | 'fade'; // screen effect
    auto?: number;              // auto-advance after N ms (0 = wait for tap)
  }
  ```
- [ ] Dialog text types out letter-by-letter (typewriter effect, ~30ms/char)
- [ ] Tapping/clicking advances to next frame (or completes current typewriter)
- [ ] Skip button in corner to skip entire cutscene
- [ ] Cutscene plays in its own Phaser Scene (launched over current scene)

### Visual Style
- [ ] Semi-transparent dark overlay behind dialog box
- [ ] Dialog box: bottom third of screen, dark panel with slight transparency
- [ ] Speaker nameplate: colored tab above dialog box with character name
- [ ] Character portrait: large (200-300px), positioned left or right of dialog
- [ ] Portrait slides in on entry, slides out on exit or speaker change
- [ ] Background image fills the screen behind the overlay (optional, can be
  solid colour with vignette effect)

### Trigger Points
- [ ] **Pre-region**: first time entering a new region, show a 3-5 frame
  cutscene introducing the land and its significance
- [ ] **Pre-boss**: before a boss wave, show a 2-3 frame cutscene with the
  boss announcing itself
- [ ] **Post-boss**: after defeating a boss, show a 1-2 frame victory moment
- [ ] **Commander select**: when picking a commander, show a brief introduction
- [ ] **First play**: replace or enhance the current first-play vignette with
  a proper cutscene
- [ ] Cutscene trigger data stored in SaveManager (seen/not-seen per cutscene ID)
- [ ] Cutscenes only play once per save (unless player resets)

### Content (initial set)
- [ ] 1 intro cutscene (game's first launch — what is Ojibwe TD, why defend)
- [ ] 1 cutscene per region introduction (4 regions = 4 cutscenes)
- [ ] 1 pre-boss cutscene per boss (placeholder text, can be expanded later)

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Cutscenes can be skipped in < 1 second (never block gameplay)
- [ ] Mobile: dialog text size minimum 16px, tap targets minimum 44px
- [ ] Desktop and mobile layout work correctly

## Notes

- The vignette system already handles short text popups. This is the "big
  sibling" — proper cinematic moments. The two can coexist; vignettes for
  small flavor text, cutscenes for story beats.
- Commander portraits from TASK-058 (commander-portraits) can be reused as
  cutscene speaker portraits.
- Don't need full illustration assets on day one — solid colour backgrounds
  with character portraits and good writing go a long way.
- The typewriter effect is key to pacing — it makes players actually read
  instead of click-dismissing.
