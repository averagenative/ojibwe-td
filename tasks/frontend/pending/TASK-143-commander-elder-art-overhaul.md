# TASK-143 — Commander & Elder Art Overhaul + Clan-Totem Fix

**Created:** 2026-03-04
**Category:** Frontend (art + data)
**Priority:** High

## Problem

1. **Elder portraits look bad** — current pixel-art elder portraits (`elder-mishoomis.png`, `elder-nokomis.png`, `elder-ogichidaa.png` + expression variants) are low quality and need to be regenerated.

2. **Commander portraits need improvement** — current commander portraits (`portrait-*.png`) should be regenerated to look better and visually represent their clan animal.

3. **Clan-totem pairings are contradictory** — In Ojibwe tradition, your clan (doodem) IS your totem animal. Having mismatched clan/totem pairs makes no cultural sense:
   - Nokomis: Marten Clan but Turtle totem → should be Marten
   - Bizhiw: Crane Clan but Lynx totem → should be Crane
   - Oshkaabewis: Loon Clan but Deer totem → should be Loon
   - Waabizii: Fish Clan but Swan totem → rename to **Giigoonh** (Ojibwe for "fish"), totem = Fish
   - (Makoons: Bear/Bear ✓, Animikiikaa: Eagle/Eagle ✓ — already correct)

4. **Nokomis card mispositioned** — In the commander selection screen, Nokomis's card appears shifted/misaligned compared to other commander cards (see ~/projects/nokomis_moved.png).

## Acceptance Criteria

### A. Fix clan-totem data
- [ ] In `commanderDefs.ts`, make each commander's totem match their clan animal (or remove the redundant `totem` field entirely)
- [ ] Rename Waabizii → **Giigoonh** (Fish Clan - Fish totem). Update name, totem, lore, portrait filename (`portrait-giigoonh.png`), ability/aura names if they reference swan imagery
- [ ] Update any UI text, lore strings, or test assertions that reference the old pairings
- [ ] Update `commanderAnimDefs.ts` if totem changes affect elemental alignment or personality

### B. Regenerate elder portraits with DALL-E 3
- [ ] Generate new portraits for all 3 elders (base + expression variants = 6 images total):
  - `elder-mishoomis.png` + `elder-mishoomis-proud.png`
  - `elder-nokomis.png` + `elder-nokomis-teaching.png`
  - `elder-ogichidaa.png` + `elder-ogichidaa-fierce.png`
- [ ] Style: semi-realistic painterly style, consistent art direction across all elders
- [ ] Sized appropriately for vignette overlay display (current ~128px portrait area)
- [ ] Replace existing files in `game/public/assets/portraits/`

### C. Regenerate commander portraits with DALL-E 3
- [ ] Generate new portraits for all 6 commanders:
  - `portrait-nokomis.png`, `portrait-bizhiw.png`, `portrait-animikiikaa.png`
  - `portrait-makoons.png`, `portrait-oshkaabewis.png`, `portrait-giigoonh.png` (renamed from waabizii)
- [ ] Each commander's portrait should visually reflect their clan animal
- [ ] Style: consistent with new elder art direction
- [ ] Sized for both commander selection cards (64×64 display) and HUD widget (48-56px)
- [ ] Replace existing files in `game/public/assets/portraits/`

### D. Fix Nokomis positioning bug
- [ ] Investigate and fix the misalignment of Nokomis's card in `CommanderSelectScene.ts`
- [ ] Ensure all 6 commander cards are evenly spaced and aligned

## Files to Modify
- `game/src/data/commanderDefs.ts` — clan/totem pairings, rename waabizii→giigoonh, update lore
- `game/src/data/commanderAnimDefs.ts` — rename waabizii key, update if totem changes affect animations
- `game/src/scenes/CommanderSelectScene.ts` — Nokomis positioning fix
- `game/src/scenes/GameScene.ts` — any waabizii references
- `game/src/ui/CommanderPortrait.ts` — any waabizii references
- `game/src/meta/unlockDefs.ts` — waabizii unlock node rename
- `game/src/scenes/BootScene.ts` — portrait preload key (waabizii→giigoonh)
- `game/public/assets/portraits/` — all 12 portrait image files + rename waabizii→giigoonh
- All test files referencing waabizii or old totem values

## Notes
- DALL-E 3 generation requires OpenAI API access — may need manual generation or a script
- Keep filenames identical so no BootScene loading changes needed
- Elder Nokomis (vignette narrator) and Commander Nokomis are the same character but use different portrait files (`elder-nokomis.png` vs `portrait-nokomis.png`)
