---
id: TASK-089
title: Arrow Tower Assets — Icon, Projectile Sprite, Gear Icons
status: in-progress
priority: critical
phase: feature
creative: true
depends_on: [TASK-082]
---

# Arrow Tower Assets — Icon, Projectile Sprite, Gear Icons

## Problem

TASK-082 adds the Arrow tower mechanically, but it needs proper visual assets:
a tower icon for the TowerPanel, a projectile sprite, and gear icons for the
equipment/loot UI.

## Deliverables

### 1. Tower Icon (TowerPanel + Gear Equip UI)

- 64×64 PNG with transparent background
- Ojibwe bow/arrow aesthetic — wooden recurve bow or longbow motif
- Earth-tone palette (birch bark, sinew, flint arrowhead)
- Distinct silhouette from existing tower icons (cannon=circle, frost=crystal, etc.)
- Must be legible at small sizes (TowerPanel renders ~34px on mobile)

### 2. Tower Sprite (in-game placement)

- Match existing tower sprite style and size
- Bow/quiver visual that reads clearly on the map grid
- Should look natural alongside cannon, frost, poison, mortar, tesla, aura towers

### 3. Projectile Sprite

- Arrow projectile — thin, fast-looking
- Visually distinct from cannon (cannonball) and frost (ice shard)
- Could be a simple rotated arrow shape or a small streak
- Needs to look good at the fast travel speed the arrow tower uses

### 4. Gear Icons (Equipment UI)

Under the gear/equipment system, each tower type needs gear slot icons.
Create arrow tower gear icons for each gear slot:
- Weapon gear (better bow/string)
- Armor gear (reinforced quiver)
- Speed gear (lighter arrows)
- Range gear (eagle feather fletching)
- Special gear (enchanted arrowheads)

Each: 64×64 PNG, transparent background, rarity border glow system compatible.

### 5. Upgrade Path Visuals (optional)

If upgrade paths change the tower appearance:
- Path A (rapid fire): multiple arrows / quiver emphasis
- Path B (multi-shot/pierce): spread arrows / broadhead tips
- Path C (utility): glowing/enchanted bow

## Acceptance Criteria

- [ ] Tower icon appears in TowerPanel and gear equip UI (not a colored box)
- [ ] Projectile sprite renders during arrow tower attacks
- [ ] Gear icons display for arrow tower equipment slots
- [ ] All assets match Ojibwe TD art style (earth tones, natural materials)
- [ ] Assets placed in `public/assets/` with consistent naming
- [ ] Assets render correctly on desktop and mobile
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes

## Notes

- Use `scripts/gen_icons.py` SVG→PNG pipeline if possible for consistency
- Check existing tower icon patterns in `converted_assets/` and `public/assets/icons/`
- This task depends on TASK-082 (arrow tower mechanics) — can be worked in parallel
  but final integration needs the tower def to exist
