---
id: TASK-021
title: Audio System — Sound Effects & Music
status: done
category: backend
phase: 11
openspec_ref: ""
depends_on: ["TASK-11"]
created: 2026-03-01
---

## Description

Add a WebAudio-based sound system to Ojibwe TD. Phase 1 covers procedurally generated
sound effects (no audio assets required) and a simple looping background music track.
All audio is optional — the game must still work perfectly with audio blocked or
on devices where AudioContext is unavailable.

## Acceptance Criteria

- [ ] `src/systems/AudioManager.ts` created — wraps Phaser's `this.sound` with safe init (handles `AudioContext` suspended state on mobile, resumes on first user gesture).
- [ ] `AudioManager` is a singleton accessible from any scene via `AudioManager.getInstance(scene)`.
- [ ] **Sound effects** — the following game events trigger audio feedback:
  - Tower placed: short woody "thunk"
  - Projectile fired (per tower type): cannon = low boom, frost = ice tinkle, tesla = electric zap, mortar = hollow thud, poison = wet splat, aura = soft hum on activation
  - Creep killed: brief creature yelp (one of 3 random variants to avoid repetition)
  - Creep escaped: low negative tone
  - Wave complete: short triumphant sting
  - Boss death: longer impact + echo
  - Run complete (victory): 3-second fanfare sting
  - Game over: low descending tone
  - UI click (buttons, tower selection): crisp tick
- [ ] All SFX are procedurally generated via the WebAudio API (OscillatorNode + GainNode + BiquadFilterNode chains) — **no audio files required**.
- [ ] **Background music**: a simple looping ambient track generated procedurally (pentatonic arpeggio at 72 BPM using OscillatorNodes, ~30-second loop).
- [ ] **Settings**: `AudioManager` exposes `setMasterVolume(0–1)`, `setSfxVolume(0–1)`, `setMusicVolume(0–1)`. Values persisted to `SaveManager`.
- [ ] **Mute toggle** in HUD (speaker icon, top-right corner) — toggles master volume between 0 and last non-zero value.
- [ ] Mobile: AudioContext auto-resumes on first `pointerdown` event (required by browsers).
- [ ] Tests: `AudioManager` instantiation + volume methods covered by Vitest (mock `AudioContext`).
- [ ] TypeScript compiles with no errors; `npm run test` passes.

## Notes

- Phaser's `this.sound.add()` can play WebAudio but requires asset keys. For procedural audio, use the raw `AudioContext` API directly (accessible via `this.sound.context` in Phaser).
- Creep yelp variants: generate 3 slightly different pitch/duration combos, pick randomly on kill.
- The mute button can reuse the existing icon system (add a `speaker` icon to `gen_icons.py` output or draw procedurally like the range circle).
- If `AudioContext` is not available (very old browser, server-side test env), `AudioManager` should no-op silently.
