---
id: TASK-078
title: Elder Portraits — Create Visual Assets & Add to Dialog Box
status: in-progress
priority: medium
phase: content
---

# Elder Portraits — Create Visual Assets & Add to Dialog Box

## Problem

The game's narrative moments (vignettes, cutscenes, codex entries) reference
Ojibwe elders and storytellers but there are no visual representations of them.
Dialog boxes show text without a face — it feels like reading a book instead of
being told a story by a person.

## Goal

Create portrait assets for elder/storyteller characters and display them in
dialog boxes, vignettes, and the cutscene system. Elders are the narrative
voice of Ojibwe TD — they introduce regions, explain the significance of the
land, and guide the player.

## Elder Characters

### Mishoomis (Grandfather)
- Wise elder, primary narrator and guide
- Warm weathered face, long grey-white braids, kind eyes
- Wears traditional ribbon shirt, bone choker
- Expression variants: neutral, smiling, serious, proud

### Nokomis (Grandmother)
- Knowledge keeper, explains medicines and plants (ties to poison/nature towers)
- Round gentle face, silver hair in a bun, beaded earrings
- Wears floral-pattern shawl, birchbark basket nearby
- Expression variants: neutral, laughing, concerned, teaching

### Ogichidaa (Warrior Elder)
- Veteran defender, introduces combat strategies and tower lore
- Strong angular features, scarred brow, single eagle feather
- Wears a breastplate with bear claws
- Expression variants: neutral, fierce, approving, warning

## Acceptance Criteria

### Asset Creation
- [ ] 3 elder portrait illustrations (bust/shoulder-up, ~256×256px)
- [ ] Each elder has 2-4 expression variants (same base, different
  mouth/eyes/brow — can be achieved with overlay layers)
- [ ] Art style: painterly/illustrated, warm earth tones, consistent with
  the game's visual language
- [ ] Respectful and dignified representation — these are honoured community
  members, not caricatures
- [ ] Save to `public/assets/portraits/elder-mishoomis.png`,
  `elder-nokomis.png`, `elder-ogichidaa.png` (and variants like
  `elder-mishoomis-proud.png`)
- [ ] Preload in BootScene

### Dialog Box Integration
- [ ] VignetteOverlay: add portrait display — portrait appears left-side of
  the text box when a vignette specifies a speaker
- [ ] Vignette defs (`vignetteDefs.ts`): add `speaker?` and `portrait?`
  fields to VignetteDef
- [ ] Portrait slides in with a subtle animation (200ms ease-out from left)
- [ ] Speaker name displayed in a colored nameplate above the dialog text
- [ ] When no portrait is specified, dialog box renders as before (text only)

### Cutscene Integration (if TASK-074 is implemented)
- [ ] Elder portraits work as speaker portraits in the cutscene system
- [ ] CutsceneFrame `portrait` field accepts elder portrait keys

### Usage Points
- [ ] Mishoomis: game intro, region introductions, first-play vignette
- [ ] Nokomis: poison/nature tower lore, healing/medicine references
- [ ] Ogichidaa: boss introductions, combat strategy tips, tower unlock lore
- [ ] Update existing vignette defs to include appropriate elder speakers

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Portraits render correctly on both desktop and mobile
- [ ] Dialog box layout doesn't break when portrait is present or absent
- [ ] Portraits are culturally respectful — no stereotypical imagery

## Notes

- The three elders map to the three pillars of the game: Mishoomis (story/land),
  Nokomis (nature/strategy), Ogichidaa (combat/defense).
- Expression variants add a lot of life for minimal extra asset cost — a
  smiling Mishoomis when you win vs a serious one when a boss appears.
- If AI-generated portraits are used, they should be reviewed for cultural
  sensitivity and accuracy. Reference real Ojibwe regalia and style, not
  generic "Native American" stereotypes.
- Long-term: elders could appear as animated sprites in the meta camp screen
  (TASK-059), sitting by the fire or tending the trophy display.
