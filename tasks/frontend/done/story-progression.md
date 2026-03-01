---
id: TASK-017
title: Story Progression & Lore System
status: done
category: frontend
phase: 13
openspec_ref: "Phase 13"
depends_on: ["TASK-016", "TASK-018"]
created: 2026-02-28
---

## Description

Add a narrative layer that gives the game a reason to exist beyond the mechanics. The story is told through brief **inter-wave vignettes** (2–4 lines of text + a portrait/icon) and a persistent **Codex** that unlocks entries as the player encounters bosses, completes stages, and unlocks commanders. The tone is grounded in Ojibwe oral tradition — events are described as things that *happened*, not cutscenes. The player is a community defender, not a lone hero.

Story beats do not block gameplay. Every vignette can be dismissed in one click and is replayable from the Codex.

## Acceptance Criteria

### Narrative Framework
- [ ] Define `VignetteDef` schema: `id`, `trigger: TriggerType`, `portrait?: string`, `speaker?: string`, `lines: string[]` (max 4), `codexUnlock?: CodexEntryId`
- [ ] `TriggerType` enum: `WAVE_START`, `WAVE_COMPLETE`, `BOSS_KILLED`, `BOSS_ESCAPED`, `STAGE_COMPLETE`, `COMMANDER_UNLOCKED`, `FIRST_PLAY`
- [ ] Vignettes are authored in `src/data/vignettes.ts` — no code changes required to add new story beats
- [ ] Vignettes fire at most once per run per trigger (no repeat spam on retry)
- [ ] Vignettes that have already been seen are skippable with a single click; first-time vignettes show a brief "hold to skip" delay (1.5s) to discourage accidental dismissal

### Codex
- [ ] Build `CodexScene` accessible from MainMenu and between-wave screens
- [ ] Codex has sections: **Beings** (boss/creep lore), **Places** (region/stage descriptions), **Commanders** (character backstories — see TASK-018), **Teachings** (short Ojibwe cultural notes authored by the creator)
- [ ] Each entry has: title, 1 illustration placeholder (icon or coloured tile), 2–6 lines of lore text
- [ ] Entries unlock progressively — a locked entry shows its title but not its contents until triggered
- [ ] Total authored entries at ship: ≥ 20 (across all sections)

### Campaign Arc (Stage-Gated)
- [ ] Act 1 — **The Arrival** (Zaaga'iganing): framing story — something is disturbing the land; player defends the lake-country village; 4 vignettes across 20 waves
- [ ] Act 2 — **Into the Mashkiig** (Wetlands): the disturbance spreads; player follows signs through the swamp; boss Waabooz (Hare) is revealed as a spirit displaced, not malicious; 4 vignettes
- [ ] Act 3 — **Savanna Burning** (Mitigomizh): the source approaches; first encounter with Animikiins (Thunderbird) not as enemy but as an omen; 4 vignettes
- [ ] Act 4 — **Biboon-aki** (Winter Lands): the final reckoning; nature out of balance must be restored, not destroyed; 4 vignettes; ending reflects whether the player completed all stages without losing a life (two ending variants)
- [ ] Each act's vignettes are gated behind the corresponding region being unlocked and started (TASK-016)

### UI
- [ ] Vignette overlay renders in the between-wave phase — bottom third of screen, semi-transparent dark panel, portrait left, text right
- [ ] Vignette text animates in one character at a time (typewriter effect, ~30ms/char); click skips to full reveal
- [ ] Codex button appears in MainMenu and `RunCompleteScene`
- [ ] New unlocked codex entries show a notification badge on the Codex button

### Correctness
- [ ] Vignettes do not delay wave start — they fire during the existing between-wave window (offer screen is still shown first)
- [ ] Codex is fully readable offline (no external fetches)
- [ ] SaveManager persists: seen vignette IDs, unlocked codex entry IDs

## Notes

The narrative deliberately avoids framing Indigenous peoples or nature as obstacles. Creeps are displaced spirits / animals out of balance — the player is restoring harmony, not conquering. Bosses should be pitied, not triumphant kills. This framing should be reflected consistently in all authored text.

The creator (who is Ojibwe) should review all vignette text and codex teachings before they ship. Mark unreviewed entries with a `reviewed: false` flag in the data file.

The two ending variants in Act 4 reward a "clean" run (no life lost) with a hopeful resolution. A run where lives were lost ends on a more ambiguous, bittersweet note — both are valid, neither is "bad ending" framing.
