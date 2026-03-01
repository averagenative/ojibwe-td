---
id: TASK-033
title: Commander Portrait Icons & Character Art
status: pending
category: frontend
phase: 13
openspec_ref: ""
depends_on: []
created: 2026-03-01
---

## Description

The five commanders (Nokomis, Makoons, Waabizii, Bizhiw, Animikiikaa) currently have
no visual representation — their portrait icon keys reference assets that don't exist.
Design and generate portrait icons for each commander that capture their character,
animal spirit, and cultural role. These appear on the commander select screen and in
the HUD ability button.

## Acceptance Criteria

- [ ] Five commander portrait SVGs designed and added to `scripts/gen_icons.py`:
  - **Nokomis** (Grandmother / Elder) — an elder woman's face in profile, geometric style;
    warm earth tones; small medicine bag or birchbark design element
  - **Makoons** (Bear Cub / Bear Spirit) — bear head silhouette, geometric; dark brown
    with warm amber highlights; claw mark accent
  - **Waabizii** (Swan) — swan in flight, minimal geometric form; white with blue-grey wing
    tips; water ripple below
  - **Bizhiw** (Lynx) — lynx face, forward-facing; spotted tawny coat pattern;
    sharp angular ears
  - **Animikiikaa** (Thunderbird) — thunderbird facing forward with wings spread;
    dark blue/black with lightning bolt eyes; geometric feather pattern
- [ ] Each portrait generated at 96×96px (select screen) and 48×48px (HUD button),
  saved to `converted_assets/`:
  - `portrait-nokomis.png`, `portrait-makoons.png`, `portrait-waabizii.png`,
    `portrait-bizhiw.png`, `portrait-animikiikaa.png`
  - `portrait-nokomis-sm.png` … (48px variants)
- [ ] `CommanderSelectScene` loads and displays the 96px portrait on each commander card
  (replacing any placeholder or missing-texture rendering).
- [ ] HUD ability button displays the 48px portrait when a commander is active in-game.
- [ ] Locked commanders show their portrait desaturated/darkened (CSS filter or alpha tint).
- [ ] All five portraits use a consistent visual style: geometric line art, 3–4 colours,
  readable at small sizes, respectful of the cultural figures represented.
- [ ] `npm run typecheck` clean; portraits visible in browser.

## Notes

- This task is flagged for the **Opus model** (creative/cultural design work).
- The art style should be inspired by Woodland art / Anishinaabe beadwork geometry —
  clean bold shapes, symmetry, use of natural colours. Avoid stereotypical "war paint"
  or generic "Native American" tropes.
- Nokomis is the most important character (default commander, mentor figure) — her portrait
  should feel warm and authoritative.
- Animikiikaa should feel powerful and slightly intimidating — they are the final/most
  expensive unlock.
- If ImageMagick SVG rendering is too limited for facial features, use symbolic
  representations (animal silhouettes, cultural objects) rather than faces.
- ROADMAP notes: "Commander portrait icons need asset generation — `portraitIcon` fields
  reference keys with no corresponding assets."
