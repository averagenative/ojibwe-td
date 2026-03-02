---
id: TASK-044
title: Medicine Wheel Favicon & Game Asset Integration
status: done
priority: high
phase: polish
---

# Medicine Wheel Favicon & Game Asset Integration

## Goal

Use the medicine wheel SVG (`game/public/assets/ui/medicine-wheel.svg`) as
the browser favicon and integrate it as a game asset (e.g. aura tower base
graphic or loading screen element).

## Context

- SVG is a clean 64×64 medicine wheel with four directional colours:
  white (NE/North), red (SE/South), black (SW/West), yellow (NW/East)
- Gold rim and center circle (`#c8a96e`)
- Already copied to `game/public/assets/ui/medicine-wheel.svg`

## Acceptance Criteria

### Favicon
- [ ] `game/index.html` updated with `<link rel="icon" type="image/svg+xml" href="/assets/ui/medicine-wheel.svg">`
- [ ] Remove or replace any existing favicon reference
- [ ] Verify favicon displays in browser tab

### Game Asset (optional, low priority)
- [ ] Consider using the medicine wheel as the aura tower base texture
  (currently uses the 4-colour Medicine Wheel drawn procedurally in Tower.ts)
- [ ] If used in-game, load via `BootScene.preload()` as a texture key

### Guards
- [ ] No TypeScript errors (`tsc --noEmit` passes)
- [ ] No existing tests broken (`npm run test` passes)

## Notes

- The SVG works directly as a favicon — no PNG conversion needed
- The procedural Medicine Wheel drawing in Tower.ts for the aura tower
  could potentially be replaced with this SVG, but that's a stretch goal
