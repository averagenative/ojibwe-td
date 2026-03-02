---
id: TASK-059
title: Meta Screen Ambiance — Living Backgrounds with Nature Elements
status: pending
priority: medium
phase: polish
---

# Meta Screen Ambiance — Living Backgrounds with Nature Elements

## Problem

The MetaMenuScene (upgrades/stat bonuses) and other menu screens feel flat and
lifeless — just panels on a dark background. There's no atmosphere, no sense of
being in the world of Ojibwe TD. Players should feel like they're in a forest
clearing, examining their tools and trophies by firelight.

## Goal

Add ambient background elements and subtle animations to the meta/stat screens
so they feel alive and immersive. Twinkling lights, swaying trees, creeping
vines, scattered bones from defeated bosses, rustling bushes.

## Acceptance Criteria

### Background Nature Layer
- [ ] Behind all UI panels, render a subtle nature scene:
  - **Trees**: silhouette conifers along left/right edges, slight parallax sway
  - **Bushes**: low brush clusters at bottom corners, gentle wind rustle
  - **Vines**: decorative vine tendrils creeping along panel borders (drawn with
    Graphics bezier curves, subtle growth animation on scene entry)
  - **Ground**: mossy/root texture at the very bottom edge (dark, atmospheric)
- [ ] Nature elements use seasonal colours matching the player's last-played
  region (or default to summer palette)

### Ambient Particle Effects
- [ ] **Fireflies/twinkles**: small glowing dots that drift slowly across the
  screen, fading in and out (5-10 active at a time, warm yellow-green)
- [ ] **Dust motes**: tiny particles in a slow drift pattern, catching light
  (barely visible, adds depth)
- [ ] **Falling leaves**: occasional leaf particle (1-2 on screen at a time)
  drifting down with gentle sine-wave horizontal motion (seasonal: green in
  summer, orange in autumn, snowflakes in winter)

### Trophy/Achievement Elements
- [ ] Scattered visual elements that reflect player progress:
  - **Boss bones/trophies**: after defeating each boss, a small trophy appears
    in the background (bear skull for Makwa, eagle feather for Migizi, etc.)
  - Trophies fade in subtly, positioned along the bottom or sides
  - Only shown for bosses the player has actually defeated (check SaveManager)
- [ ] Crystal currency: small crystal clusters near the currency display that
  sparkle occasionally

### Panel Enhancement
- [ ] Stat bonus nodes and unlock nodes have a subtle glow pulse when owned
- [ ] Available-to-purchase nodes have a gentle "come hither" shimmer
- [ ] Lines between prerequisite nodes could have a flowing energy effect
  (moving dashes or particle trail along the line)

### Screen Transitions
- [ ] On scene entry: nature elements fade in over 500ms, vines "grow" into
  position (animated path drawing)
- [ ] On scene exit: gentle fade out
- [ ] Particles continue seamlessly (no pop-in/pop-out)

### Implementation
- [ ] All background elements rendered at depth 0 (behind UI panels)
- [ ] Use `Phaser.GameObjects.Graphics` for trees, bushes, vines (no images)
- [ ] Use `Phaser.GameObjects.Particles.ParticleEmitter` for fireflies, dust,
  leaves
- [ ] Nature positions seeded by screen dimensions (deterministic layout)
- [ ] Config object for easy seasonal/theme swapping

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Background elements don't interfere with UI panel clicks or scrolling
- [ ] Performance: particles capped, no frame drops on low-end devices
- [ ] Elements scale with screen size (no fixed pixel positions)

## Notes

- The vibe is "forest clearing at dusk" — warm but mysterious, inviting players
  to linger and explore their upgrades
- Boss trophies are a nice touch that rewards exploration ("what's that new
  thing in the background? Oh, I beat Makwa!")
- This treatment could extend to other screens: MainMenuScene (already has the
  logo scene), CommanderSelectScene, CodexScene
- Keep the nature layer dark/muted so it doesn't compete with the UI panels
  for visual attention — it's ambiance, not a painting
- The bones/trophies element connects the meta screen to the gameplay — your
  victories leave a mark on your camp
