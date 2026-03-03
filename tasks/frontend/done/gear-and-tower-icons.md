---
id: TASK-084
title: Gear Icons & Tower Icons for Equipment UI
status: done
priority: medium
phase: feature
creative: true
---

# Gear Icons & Tower Icons for Equipment UI

## Problem

The gear/equipment system (from TASK-065 Deep Progression) currently shows colored
boxes as placeholders for gear items. Players need proper icons to identify gear
at a glance — both the gear pieces themselves and the tower icons in the equip
section so players know which tower a piece of gear applies to.

## Goal

Generate or create icon assets for all gear types and ensure tower icons appear
in the gear equip UI instead of colored placeholder boxes.

## Deliverables

### Gear Item Icons

Create icons for each gear rarity/type. Icons should be:
- 64×64 PNG with transparent background
- Ojibwe-inspired aesthetic (natural materials, earth tones, animal motifs)
- Distinct silhouettes per gear slot so they're identifiable at small sizes
- Rarity indicated by border glow or tint (common=grey, uncommon=green,
  rare=blue, epic=purple, legendary=gold)

Gear slots to cover (check actual implementation in `src/meta/` for exact list):
- [ ] Weapon/damage gear
- [ ] Armor/defense gear
- [ ] Speed/attack speed gear
- [ ] Range gear
- [ ] Special/ability gear
- [ ] Any other gear slots defined in the loot system

### Tower Icons in Equip UI

- [ ] Each tower's existing icon (from TowerPanel) should appear in the gear
  equip screen next to its gear slots
- [ ] Tower icons should be recognizable and match the tower's in-game appearance
- [ ] If tower icons don't exist as standalone assets yet, create them (64×64 PNG)

### Icon Generation

Use the existing procedural SVG→PNG pipeline (`scripts/gen_icons.py`) or create
a new generation script if needed. Icons can be:
- Procedurally generated SVG → PNG (preferred for consistency)
- Hand-drawn pixel art
- AI-generated with consistent style (if using AI, ensure style matches existing
  icon set in `converted_assets/`)

## Acceptance Criteria

- [ ] Every gear item type has a unique icon asset (not a colored box)
- [ ] Tower icons appear in the gear equip UI identifying which tower gear belongs to
- [ ] Icons are loaded and displayed in the gear/equipment screens
- [ ] Icons look cohesive with the existing Ojibwe TD art style
- [ ] Assets placed in `public/assets/` with appropriate naming convention
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Desktop and mobile: icons render correctly at both scales

## Notes

- Check `src/meta/` and `src/scenes/` for the gear equip UI implementation
- Check `src/data/towerDefs.ts` for the full list of towers that need icons
- Existing tower icons may be in `public/assets/icons/` (symlinked from converted_assets)
