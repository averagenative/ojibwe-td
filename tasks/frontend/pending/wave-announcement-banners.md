---
id: TASK-052
title: Wave Announcement Banners — Pre-Wave Intel & Warnings
status: pending
priority: high
phase: gameplay
---

# Wave Announcement Banners — Pre-Wave Intel & Warnings

## Problem

Players have no advance warning about what's coming next. Waves just start and
you react. Good TD games give you a 2-3 second heads-up so you can adjust tower
placement, sell/rebuild, or brace for impact. This is especially critical once
we have air creeps, armoured waves, boss waves, and mixed compositions.

## Goal

Show a brief announcement banner at the start of each wave (or during the
between-wave pause) that tells the player what's incoming — creep type, special
traits, air/ground, boss warning. The banner should be dramatic but not block
gameplay.

## Acceptance Criteria

### Banner Display
- [ ] Large centred banner appears 2-3 seconds before wave spawns (or during
  between-wave countdown)
- [ ] Banner slides in from top or fades in, holds for 1.5-2s, then fades out
- [ ] Banner shows:
  - **Wave number**: "WAVE 7" in large text
  - **Wave type tag**: "GROUND", "AIR", "MIXED", "BOSS" in a coloured badge
  - **Creep trait icons/text**: "Armoured", "Fast", "Regenerating", "Immune" etc.
  - **Creep count**: "×15 creeps" or "×1 BOSS + ×8 escorts"
- [ ] Banner depth above all gameplay elements but below pause/menu overlays

### Wave Type Colours
- [ ] Ground waves: earthy brown/green badge
- [ ] Air waves: sky blue badge with wing icon or "✈" indicator
- [ ] Mixed waves: split badge (half brown, half blue)
- [ ] Boss waves: red/ember badge, larger text, optional screen-edge pulse

### Special Wave Callouts
- [ ] Boss wave: "BOSS INCOMING" with boss name if available, ember red styling,
  brief screen shake or border flash
- [ ] First air wave in a run: extra callout "NEW: AIR WAVE — Tesla & Frost only!"
  (tutorial hint, shown once per run)
- [ ] Ascension modifier waves: show the active modifier (e.g. "Ascension 4:
  Regenerating creeps heal 1%/s")

### Between-Wave Panel Integration
- [ ] If the game uses a between-wave screen (BetweenWaveScene), show the
  upcoming wave info there too — more detailed breakdown:
  - Creep type breakdown (e.g. "10 normal + 3 armoured + 2 fast")
  - Suggested tower types (subtle hint, not mandatory)
- [ ] If waves auto-start (no between-wave pause), the banner is the only warning

### Data Requirements
- [ ] Wave definitions need metadata for announcement:
  - `waveType: 'ground' | 'air' | 'mixed'`
  - `traits: string[]` (e.g. ['armoured', 'fast', 'regenerating'])
  - `isBoss: boolean`
  - `bossName?: string`
- [ ] If metadata not present, infer from creep composition in the wave def

### Audio Integration
- [ ] Play a distinct sound cue per wave type:
  - Normal wave: subtle drum beat
  - Air wave: wind/swoosh sound
  - Boss wave: deep horn/thunder
- [ ] Hooks into AudioManager (TASK-021) if available

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Banner doesn't block tower placement or selection during its display
- [ ] Banner respects game speed (2× = faster animation)
- [ ] Works correctly when waves are manually started vs auto-started

## Notes

- The Ojibwe language could appear in boss names or wave flavour text
  (e.g. "Makwa the Armoured" — makwa = bear)
- Keep banners punchy — players don't want to read a paragraph between waves
- Consider a small persistent "NEXT WAVE" indicator in the HUD that always
  shows what's coming (like a miniature preview), separate from the big banner
- The banner system should be reusable for other announcements (victory,
  game over, ascension level-up)
