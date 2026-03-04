# TASK-144 — Ojibwe Word Translation Tooltips

**Created:** 2026-03-04
**Category:** Frontend (UI/UX)
**Priority:** Medium

## Problem

Ojibwe words appear throughout the game (commander names, ability names, aura names, clan names, elder names, vignette dialogue) with no way for players to see English translations without memorizing them.

## Feature

Add hover tooltips (desktop) and tap-to-toggle popups (mobile) that show English translations of Ojibwe words wherever they appear in the UI.

## Ojibwe Words Needing Translations

### Commander Names
- Nokomis → "Grandmother"
- Bizhiw → "Lynx" (or updated animal if clan-totem fix lands first)
- Animikiikaa → "Thunder"
- Makoons → "Little Bear"
- Oshkaabewis → "Helper / Ceremonial Attendant"
- Giigoonh → "Fish" (if TASK-143 rename lands; otherwise Waabizii → "Swan")

### Aura Names (from commanderDefs.ts)
- Gitigaan → "Garden"
- Bimaadiziwin → "The Good Life"
- Animiki-bimaadiziwin → "Thunder Life"
- Makwa-zoongide'e → "Bear Courage"
- Bimosewin → "The Walk"
- Zaagi'idiwin → "Unconditional Love"

### Ability Names
- Mashkiki Biindaakoojiigan → "Medicine Bundle"
- Wiigiwaam Wiindamaagewin → "Scout's Eye"
- Gichi-animikiikaa → "Great Thunder"
- Makwa-ojiins → "Bear's Charge"
- Giizhibaa-bimosewin → "Swift Walk"
- Wiisagenimad → "Tenderness"

### Elder Names
- Mishoomis → "Grandfather"
- Nokomis → "Grandmother"
- Ogichidaa → "Warrior"

### Map/Region Names (from vignetteDefs/stage names)
- Zaagaiganing → "At the Lake"
- Mashkiig → "Marsh / Swamp"
- Mitigomizh → "Oak Tree"
- Biboon-aki → "Winter Land"

## Acceptance Criteria

### A. Create a reusable OjibweTooltip component
- [ ] New UI utility (e.g. `src/ui/OjibweTooltip.ts`) that wraps any Phaser text
- [ ] Stores a map of Ojibwe word → English translation
- [ ] Data source: a new `src/data/ojibweGlossary.ts` file with all word→translation pairs
- [ ] Tooltip popup: small dark panel with English text, positioned above/below the word

### B. Desktop behavior — hover
- [ ] On `pointerover`: show tooltip after brief delay (~200ms) to avoid flicker
- [ ] On `pointerout`: hide tooltip
- [ ] Tooltip follows cursor or anchors near the word

### C. Mobile behavior — tap to toggle
- [ ] On `pointerup` (single tap): show tooltip popup near the tapped word
- [ ] Tap elsewhere or tap again: dismiss tooltip
- [ ] Only one tooltip visible at a time (dismiss previous when new one opens)
- [ ] Tooltip should not interfere with scrolling or other interactions

### D. Apply tooltips to key UI surfaces
- [ ] **Commander Selection Screen** — commander names, clan names, aura names, ability names
- [ ] **In-game HUD** — commander portrait tooltip (aura/ability Ojibwe names)
- [ ] **Vignette Overlay** — elder names in speaker nameplate
- [ ] **Between-Wave Scene** — any Ojibwe text in offer cards or wave info
- [ ] **Meta/Upgrade screens** — commander names in unlock tree

### E. Visual style
- [ ] Dark semi-transparent background (consistent with existing tooltip style)
- [ ] Subtle underline or dotted-underline on hoverable Ojibwe words to hint interactivity
- [ ] Fade in/out animation (150ms)

## Files to Create
- `game/src/data/ojibweGlossary.ts` — centralized word→translation map
- `game/src/ui/OjibweTooltip.ts` — reusable tooltip component

## Files to Modify
- `game/src/scenes/CommanderSelectScene.ts` — wire tooltips to commander card text
- `game/src/ui/CommanderPortrait.ts` — wire tooltips to HUD tooltip text
- `game/src/ui/VignetteOverlay.ts` — wire tooltips to elder speaker names
- `game/src/scenes/BetweenWaveScene.ts` — wire tooltips if Ojibwe text present
- Various test files for new functionality

## Notes
- The glossary file makes it easy to add new words as content grows
- Translations should come from reliable sources (e.g. Ojibwe People's Dictionary)
- If TASK-143 lands first, use updated commander/totem names
