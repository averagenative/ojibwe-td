---
id: TASK-157
title: Commander Clan Realignment — Traditional Ojibwe Clans + DALL-E 3 Portraits
status: done
priority: critical
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

Commander clan assignments don't align with traditional Ojibwe clan roles. Reassign
all 6 commanders to the correct clans based on the traditional 7 Ojibwe clan system,
update totems, review abilities for thematic fit, generate new DALL-E 3 portraits,
and ensure consistency across all game screens.

## New Clan Assignments

| Commander    | Spirit Animal | Role       | New Clan        | Old Clan     | Rationale                        |
|-------------|---------------|------------|-----------------|--------------|----------------------------------|
| Nokomis     | Turtle        | Sustain    | **Crane Clan**  | Marten Clan  | Elder wisdom, chieftainship      |
| Bizhiw      | Lynx          | Precision  | **Marten Clan** | Crane Clan   | Hunters, warriors, stealth       |
| Animikiikaa | Thunderbird   | Burst      | **Bird Clan**   | Eagle Clan   | Spiritual power, sky beings      |
| Makoons     | Bear          | Damage     | **Bear Clan**   | Bear Clan    | Protection through strength (OK) |
| Oshkaabewis | Deer          | Economy    | **Deer Clan**   | Loon Clan    | Gentleness, diplomacy, trade     |
| Waabizii    | Swan          | Resilience | **Loon Clan**   | Fish Clan    | Internal caretaking, nurturing   |

### Traditional Ojibwe Clan Roles Reference
- **Crane Clan (Ajijaak)** — external leadership, chieftainship, speakers
- **Loon Clan (Maang)** — internal leadership, caretaking, community
- **Bear Clan (Makwa)** — protection, policing, medicine, warriors
- **Marten Clan (Waabizheshi)** — hunters, warriors, strategy
- **Deer Clan (Waawaashkeshi)** — gentleness, poetry, peacemaking, diplomacy
- **Bird Clan (Binesi)** — spiritual leaders, sky beings, knowledge keepers
- **Fish Clan (Giigoonh)** — scholars, teachers, mediators (unused in this mapping)

## Part 1: Data Changes

### `game/src/data/commanderDefs.ts`
Update the `clan` field for each commander:
```
Nokomis:     clan: 'Crane Clan'    (was 'Marten Clan')
Bizhiw:      clan: 'Marten Clan'   (was 'Crane Clan')
Animikiikaa: clan: 'Bird Clan'     (was 'Eagle Clan')
Makoons:     clan: 'Bear Clan'     (unchanged)
Oshkaabewis: clan: 'Deer Clan'     (was 'Loon Clan')
Waabizii:    clan: 'Loon Clan'     (was 'Fish Clan')
```

### Ability / Aura Thematic Review
Review each commander's aura name, ability name, and descriptions to ensure they
thematically fit the new clan identity. Update if needed — especially:
- Bizhiw's aura "Bimaadiziwin" (The Good Life) — may want something more hunter/stealth themed
- Oshkaabewis's aura "Bimosewin" (The Walk) — consider trade/diplomacy flavor
- Waabizii's aura "Zaagi'idiwin" (Unconditional Love) — fits Loon's internal caretaking, likely OK

Do NOT change mechanical effects (damage numbers, timers, multipliers) — only
rename/re-describe for thematic alignment.

### `game/src/data/codexDefs.ts`
Update any codex entries that reference clan names.

## Part 2: DALL-E 3 Commander Portraits

Generate new commander portrait art for all 6 commanders. Each portrait should
reflect the commander's spirit animal AND their clan identity.

### Portrait Style
- **Semi-realistic portrait**, bust/shoulders visible, facing forward or 3/4 view
- Ojibwe woodland art influences — clean lines, natural colours, geometric patterns
- Each portrait should incorporate subtle clan iconography (e.g. crane feather motif
  for Nokomis, marten pelt markings for Bizhiw)
- Dark background or transparent, suitable for display on dark game UI
- Must be recognizable at small sizes (commander cards are ~170px wide)

### Portrait Specifications
- **Size**: 256×256px (downscaled to fit cards in-game)
- **Format**: PNG with transparency or dark background
- **Consistent style** across all 6 — same prompt base, same artistic approach

### Prompt Strategy
Base prompt for all:
> "[Spirit animal] spirit warrior portrait, Ojibwe woodland art style, [clan] motifs,
> semi-realistic, bust portrait, dark background, bold geometric patterns, natural
> earth colours, 256x256, detailed face, no text"

| Commander    | Subject | Colours | Clan Motif |
|-------------|---------|---------|------------|
| Nokomis     | Wise elder woman with turtle shell elements | Earth browns, sage green | Crane feathers in hair/shoulders |
| Bizhiw      | Fierce lynx-featured hunter | Tawny gold, forest green | Marten pelt patterns |
| Animikiikaa | Thunderbird warrior with eagle features | Storm blue, lightning gold | Bird/feather cape or headdress |
| Makoons     | Young bear warrior, powerful build | Dark brown, copper | Bear claw necklace/markings |
| Oshkaabewis | Gentle deer-featured messenger | Soft tan, white, green | Deer antler crown/antler staff |
| Waabizii    | Graceful swan spirit, serene | White, silver, lake blue | Loon feather patterns |

### File Deliverables
```
game/public/assets/portraits/
├── portrait-nokomis.png
├── portrait-bizhiw.png
├── portrait-animikiikaa.png
├── portrait-makoons.png
├── portrait-oshkaabewis.png
└── portrait-waabizii.png
```

## Part 3: Code Integration

### BootScene.ts
- Preload all 6 portrait PNGs from `assets/portraits/`

### CommanderSelectScene.ts
- Use portrait sprites instead of current `portraitIcon` rendering
- Each card should display: role label, name, clan + totem subtitle, portrait image
- Verify clan text renders correctly on all cards

### CommanderDefs `portraitIcon` field
- Update to point to new portrait asset keys (e.g. `'portrait-nokomis'`)

### Other screens to verify
- **GameScene HUD** — commander portrait/icon in HUD
- **MetaMenuScene** — any commander references
- **GameOverScene** — commander display on game over
- **MainMenuScene** — if commander is shown on resume button
- **Codex** — commander entries with portraits

## Acceptance Criteria

- [ ] All 6 commander `clan` fields updated to correct traditional Ojibwe clans
- [ ] Aura/ability names and descriptions reviewed for thematic fit with new clans
- [ ] 6 new DALL-E 3 portraits generated (256×256px PNG, consistent style)
- [ ] BootScene preloads all 6 portrait assets
- [ ] CommanderSelectScene displays new portraits with correct clan subtitles
- [ ] All other screens (HUD, GameOver, Codex, Meta) show updated clan info and portraits
- [ ] No mechanical gameplay changes — only visual/text updates
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes — update any tests that assert clan names or portrait keys
  - Known tests to update: `src/systems/__tests__/commanderUnlocks.test.ts` (if it checks clan text)
  - `src/systems/__tests__/commanderIdleAnims.test.ts` (if portrait keys change)
  - `src/systems/__tests__/elderPortraits.test.ts` (portrait asset assertions)
  - Any codex tests referencing clan names
