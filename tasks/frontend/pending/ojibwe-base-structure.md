---
id: TASK-015
title: Ojibwe Base Structure (Home Target)
status: in-progress
category: frontend
phase: 5
openspec_ref: "Phase 5 (addendum)"
depends_on: ["TASK-05"]
created: 2026-02-28
---

## Description

Add a visible Ojibwe-inspired home base at the end of the creep path — the structure that creeps are trying to reach and the player is defending. This grounds the game in its cultural identity and makes the "lives" mechanic tangible: each escaped creep visibly damages or shakes the base. The structure should be a **wigwam** (domed birch-bark dwelling) as the primary design, with a **medicine wheel** motif woven into its decoration or as a surrounding ground element.

Design notes from the creator (who is Ojibwe): the base should be respectful and accurate, not stereotypical. A birch-bark wigwam with four-direction colour accents (medicine wheel: east/yellow, south/red, west/black, north/white) is the target aesthetic.

## Acceptance Criteria

### Visual Design
- [ ] Render a wigwam sprite or procedural shape at the map's exit waypoint (final path tile)
- [ ] Wigwam has four directional colour accents representing the medicine wheel quadrants
- [ ] A medicine wheel symbol is visible on or near the base (ground ring, door motif, or etched decoration)
- [ ] Base renders at a scale appropriate to the tile grid (roughly 2×2 tiles)
- [ ] Base has a resting idle animation (gentle sway, smoke from top, or candle-flicker inside light)

### Damage Feedback
- [ ] Each creep that escapes (reaches the exit) triggers a brief shake/flash on the base structure
- [ ] At ≤ 3 lives remaining, the base shows a "damaged" visual state (cracks, embers, darker palette)
- [ ] At 1 life remaining, the base shows a "critical" state (fire particles, heavy shake on hits)
- [ ] On game over (0 lives), the base plays a collapse or extinguish animation before the GameOverScene loads
- [ ] On run complete (all waves cleared), the base plays a celebration animation (light burst, sparks upward)

### Integration
- [ ] Base position is read from the map's final waypoint (not hard-coded)
- [ ] Base visual state is driven by `GameScene.lives` (subscribe to the `life-lost` event)
- [ ] Base renders at depth below HUD but above path tiles (depth 3 is appropriate)
- [ ] Works on both Map 1 and Map 2 (TASK-10) — position and scale adapt to each map's final waypoint

### Accessibility
- [ ] Base shake does not rely solely on colour change for damage feedback (combine with motion)
- [ ] Collapse animation completes within 2 seconds (does not block GameOverScene transition)

## Notes

The medicine wheel is a sacred symbol in many Indigenous traditions. Representation here should be tasteful and understated — an architectural/decorative element on the wigwam, not a gameplay mechanic. Consult the creator's preferences before finalising colours or placement.

If a pixel-art wigwam sprite is authored, it should live in `converted_assets/` alongside the tower icons and be referenced by a symlink in `game/public/assets/`.

Alternative: the base can be fully procedural (Phaser Graphics + Geom shapes) to avoid any asset-pipeline work, and upgraded to a sprite in TASK-11's polish pass.
