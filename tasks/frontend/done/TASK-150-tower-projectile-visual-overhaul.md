---
id: TASK-150
title: Tower Projectile Visual Overhaul — Distinct Attack Visuals Per Tower Type
status: done
priority: high
category: frontend
phase: polish
depends_on: []
created: 2026-03-04
---

## Description

Tower attacks currently all look like generic small bubbles/circles. Each tower type
should have a visually distinct projectile that matches its theme. This is a major
visual polish item — attacks are the most frequently seen effect in the game.

## Acceptance Criteria

### A. Per-tower projectile art
- [ ] **Rock Hurler** — throws a tumbling rock/boulder sprite (grey/brown, slight rotation
  during flight, maybe 2-3 size variants for visual variety)
- [ ] **Frost Tower** — icy shard or snowflake projectile (light blue, slight shimmer/sparkle
  trail, no random bubbles flying off-screen — see TASK-116)
- [ ] **Poison Tower** — toxic glob or venom droplet (green, leaves a faint drip trail,
  slight wobble animation)
- [ ] **Arrow Tower** — actual arrow sprite (thin, pointed, rotates to face travel direction,
  maybe with slight feather/fletching detail)
- [ ] **Thunder Tower** — lightning bolt or electric arc (bright yellow/white, could be a
  chain-lightning visual connecting tower→target→chain targets)
- [ ] **Aura Tower** — pulse ring or radial wave (since aura doesn't fire projectiles,
  show a periodic pulse emanating from tower, matching aura color)

### B. Projectile assets
- [ ] New sprite assets in `game/public/assets/projectiles/` (or similar)
- [ ] Each projectile: 16-24px base size, clean pixel art or simple vector style
- [ ] Consistent art style across all projectile types
- [ ] Could be generated programmatically (Phaser graphics) or as PNG sprites

### C. Flight behavior
- [ ] Projectiles rotate to face direction of travel (especially arrows, rocks)
- [ ] Optional: slight arc trajectory for rock hurler (parabolic rather than straight line)
- [ ] Impact effect on hit: small burst/splash matching the damage type
  - Rock: dust puff
  - Frost: ice shatter particles
  - Poison: green splatter
  - Arrow: small thud
  - Thunder: electric crackle

### D. Integration
- [ ] `Projectile.ts` updated to use tower-type-specific sprites and behaviors
- [ ] `towerDefs.ts` or similar: projectile visual config per tower type
- [ ] Existing projectile pooling/recycling still works with new visuals
- [ ] Performance: no frame drops with 20+ projectiles on screen simultaneously

### E. Tests
- [ ] Structural tests: each tower type references a valid projectile sprite/config
- [ ] Projectile rotation math tests (face direction of travel)
- [ ] `npm run typecheck` clean; `npm run test` passes

## Notes

- This is one of the most impactful visual improvements possible — players stare at
  projectiles the entire game
- Keep projectiles readable at game speed — too much detail gets lost, silhouette matters most
- Thunder tower may not use a traditional projectile (chain lightning could be drawn as
  line segments with glow effect)
- Aura tower "projectile" is really just a visual pulse — no actual projectile entity needed
