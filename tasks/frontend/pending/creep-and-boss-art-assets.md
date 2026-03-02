---
id: TASK-054
title: Creep & Boss Art Assets — Flying Variants, Boss Animal Portraits
status: pending
priority: high
phase: polish
interactive: true
---

# Creep & Boss Art Assets — Flying Variants, Boss Animal Portraits

## Problem

All creeps use generic placeholder sprites — a single `creep-flying.png` for
every air unit and a single `creep-boss.png` for every boss regardless of their
Ojibwe animal identity. Makwa (Bear) looks identical to Migizi (Eagle) except
for a tint colour. Players should be able to identify creep types and bosses
at a glance from their art, and the bosses should visually represent their
namesake animals.

## Current State

### Existing sprites (`game/public/assets/sprites/`)
- `creep-normal.png` — generic ground creep
- `creep-fast.png` — fast variant
- `creep-armored.png` — armoured variant
- `creep-immune.png` — immune variant
- `creep-regen.png` — regenerating variant
- `creep-flying.png` — single generic flying creep (used for ALL air units)
- `creep-boss.png` — single generic boss (used for ALL bosses)
- `creep-boss-mini.png` — Waabooz split copies

### Boss definitions (`bossDefs.ts`)
| Boss | Ojibwe Name | Animal | Ability | Current Sprite |
|------|-------------|--------|---------|----------------|
| Makwa | Bear | Ground, armored | 30% damage resist | Generic boss, amber tint |
| Migizi | Eagle | Ground (!), slow-immune | Ignores frost/slow | Generic boss, gold tint |
| Waabooz | Hare/Rabbit | Ground, splits | 3 mini-copies on death | Generic boss, pale blue tint |
| Animikiins | Little Thunderbird | Ground, regen | 1%/s HP regen, poison-immune | Generic boss, electric blue tint |

### Air creep types (from TASK-051 air/ground combat system)
The air combat system introduces `domain: 'air'` creeps but they all share
one `creep-flying.png` sprite. Air creeps need distinct art for:
- Basic flier (default air creep)
- Fast flier (scout / swift variant)
- Armoured flier (heavy air unit)
- Air boss (Migizi should arguably be an air boss)

## Goal

Generate distinct art assets for every creep variant and boss, with bosses
visually matching their Ojibwe animal namesakes. Art style should be
consistent: top-down perspective, stylized but recognizable, fitting the
natural Northern Ontario aesthetic.

## Acceptance Criteria

### Boss Art (Priority 1)
Each boss needs a unique sprite that clearly represents its animal:

- [ ] **Makwa (Bear)** — large, stocky silhouette viewed from above. Brown/amber
  fur, broad shoulders, visible claws or paw prints. Should look heavy and
  armoured. Size: ~48×48px (larger than normal creeps)
- [ ] **Migizi (Eagle)** — wingspan visible from above, spread wings, white head
  detail (bald eagle reference). Golden-brown body. Should look fast and
  majestic. Consider making this an air-type boss (flies over the path).
  Size: ~56×48px (wide wingspan)
- [ ] **Waabooz (Hare)** — compact body, long ears visible from above, white/pale
  fur. Should look agile and tricky (it splits). Mini-copies should be
  recognizably smaller versions. Size: ~32×32px (smaller but nimble)
- [ ] **Animikiins (Thunderbird)** — mythic bird silhouette, spread wings with
  lightning/energy motif, electric blue/purple accents. Larger than Migizi.
  Should look powerful and supernatural. Size: ~64×48px

- [ ] `creep-boss-mini.png` updated to look like a small Waabooz (baby hare)
  instead of a generic mini-boss

### Flying Creep Art (Priority 2)
Distinct sprites for air domain creeps:

- [ ] **Basic flier** — bird silhouette (generic), wings spread, neutral colour.
  Replaces current `creep-flying.png`. Should read as "airborne" at small size.
- [ ] **Fast flier (scout)** — sleeker, more aerodynamic shape. Lighter colour,
  swept-back wings (falcon/hawk silhouette)
- [ ] **Armoured flier** — heavier bird shape, darker colour, visible bulk.
  Could reference a raven or crow (sturdy, dark)
- [ ] **Boss flier** — see Migizi above (reuse boss art for air boss waves)

All air creep sprites should:
- Have a consistent "shadow below" effect (slight offset + grey circle beneath)
- Be visually distinct from ground creeps at gameplay zoom level
- Use bird-inspired shapes (Ojibwe land = eagles, hawks, ravens, cranes, owls)

### Ground Creep Art Refresh (Priority 3)
Existing ground sprites may need a style refresh to match the new boss/flier
art quality:

- [ ] **Normal** — woodland creature silhouette (deer? chipmunk?) rather than
  generic blob
- [ ] **Fast** — runner shape (fox? hare legs extended?)
- [ ] **Armoured** — turtle or porcupine shape (natural armour reference)
- [ ] **Immune** — spirit/ghost form with translucent overlay (immune to effects)
- [ ] **Regenerating** — salamander or plant-like form (natural regen reference)

### Technical Integration
- [ ] All sprites saved to `game/public/assets/sprites/` with naming convention:
  - Bosses: `boss-makwa.png`, `boss-migizi.png`, `boss-waabooz.png`,
    `boss-animikiins.png`, `boss-waabooz-mini.png`
  - Air: `creep-air-basic.png`, `creep-air-scout.png`, `creep-air-armored.png`
  - Ground: update existing filenames or add new ones
- [ ] `BootScene.loadAssets()` updated to load new sprites
- [ ] `Creep.ts` rendering updated to select sprite based on creep type + domain:
  - Boss creeps: use `boss-{key}.png` instead of generic `creep-boss.png`
  - Air creeps: select from air sprite set based on creep subtype
  - Ground creeps: select from ground sprite set
- [ ] BossDef extended with optional `spriteKey` field for explicit sprite mapping
- [ ] Sprites look correct at 1× and 2× game speed
- [ ] Sprites don't obscure health bars or status effect indicators

### Art Style Guidelines
- **Perspective**: Top-down / slightly angled (bird's-eye view, consistent with
  tower and terrain perspective)
- **Size**: 32×32px base, bosses up to 64×64px. Crisp at native resolution,
  no subpixel blur
- **Palette**: Natural colours — earth tones for ground, sky/blue tones for air,
  each boss has its own colour identity matching `bossDefs.ts` tint values
- **Style**: Stylized silhouettes with enough detail to identify the animal at
  small scale. Not photorealistic — think nature field guide illustrations
  meets pixel art. Clean outlines.
- **Cultural respect**: Animal representations should be naturalistic and
  respectful. Thunderbird (Animikiins) can be more stylized/mythic but should
  draw from Anishinaabe artistic traditions rather than generic fantasy

### Generation Method
- [ ] Use DALL-E, Midjourney, or similar AI art generation with carefully
  crafted prompts for consistency
- [ ] Generate multiple candidates per sprite, pick best match
- [ ] Post-process: resize to target px, remove backgrounds, ensure transparency
- [ ] Document prompts in `game/assets/ART-PROMPTS.md` for reproducibility

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] All new sprites have transparent backgrounds (PNG with alpha)
- [ ] Total sprite payload < 2 MB
- [ ] No visual regression on existing gameplay (health bars, effects still visible)

## Notes

- This task is **interactive** — art generation requires human review of
  candidates and style direction decisions
- TASK-028 (Creep Visual Variety) covers procedural Graphics-based rendering
  as a fallback. This task generates actual image assets that override those
  procedural shapes when available.
- Consider whether Migizi (Eagle) should be reclassified as an air-type boss
  in `bossDefs.ts` — thematically an eagle should fly. This would be the
  game's first air boss and would require Tesla/Frost coverage.
- Waabooz mini-copies should be recognizable as baby hares, not just scaled-down
  generic creeps
- The Ojibwe bird names from TASK-051 notes could label air creep tiers:
  migizi (eagle), ajijaak (crane), zhiishiib (duck) — ascending difficulty
