---
id: TASK-062
title: Colorblind Accessibility — Non-Color Indicators & Palette Options
status: done
priority: medium
phase: polish
---

# Colorblind Accessibility — Non-Color Indicators & Palette Options

## Problem

The game uses green/red for placement validity, colour-coded wave type badges,
and colour-only tower domain indicators. ~8% of male players have red-green
color vision deficiency and can't distinguish these cues.

## Goal

Add non-colour indicators (icons, patterns, shapes) alongside colour cues so
all information is accessible without relying solely on colour perception.

## Acceptance Criteria

### Tower Placement
- [ ] Valid placement: green highlight + checkmark icon or solid border
- [ ] Invalid placement: red highlight + X icon or dashed border
- [ ] Shape/pattern difference is sufficient even in greyscale

### Wave Type Badges
- [ ] Ground badge: brown + mountain/ground icon
- [ ] Air badge: blue + wing icon
- [ ] Mixed badge: split + both icons
- [ ] Boss badge: red + skull icon + larger text
- [ ] Icons readable at badge size without colour

### Tower Domain Indicators
- [ ] Ground-only: downward arrow or ground icon
- [ ] Air-only: upward arrow or wing icon
- [ ] Both: double arrow or combined icon
- [ ] Shown in tower tooltip and panel

### Optional: Colorblind Palette Mode
- [ ] Settings toggle for colorblind-friendly palette
- [ ] Shifts red→orange, green→blue for key gameplay indicators
- [ ] Saved to SaveManager settings

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] All gameplay-critical information conveyed through shape+colour, not colour alone
