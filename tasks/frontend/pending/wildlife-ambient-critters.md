---
id: TASK-072
title: Ambient Wildlife Critters — Region-Appropriate Animals on Maps
status: in-progress
priority: low
phase: polish
---

# Ambient Wildlife Critters — Region-Appropriate Animals on Maps

## Problem

Maps feel static and lifeless between waves. There are no ambient creatures to
bring the Ojibwe woodland setting to life.

## Goal

Add tiny sprite animals that scurry around the map edges and open spaces. Each
region gets its own set of critters appropriate to that biome/habitat, adding
charm and reinforcing the Ojibwe connection to the natural world.

## Region Critter Sets

### Zaaga'iganing (Lakeside)
- Squirrels, chipmunks, loons (near water edges), frogs

### Mashkiig (Wetland/Marsh)
- Frogs, turtles, muskrats, herons (standing still near water)

### Mitigomizh (Oak Savanna)
- Rabbits, porcupines, deer mice, wild turkeys

### Biboon-aki (Winter/Frozen)
- Snowshoe hares, pine martens, foxes, snowy owls (perched)

### Niizh-miikana (Two Paths)
- Raccoons, skunks, beavers, woodpeckers (on trees)

## Acceptance Criteria

### Asset Creation
- [ ] Create 8-12 tiny critter sprites (16×16px or smaller, top-down view)
- [ ] 2-3 frame walk/idle animation per critter (spritesheet)
- [ ] Colour palette matches the region terrain tones
- [ ] Save to `public/assets/critters/` (e.g. `squirrel.png`, `frog.png`)
- [ ] Preload in BootScene

### Implementation
- [ ] `CritterManager` system or lightweight spawner in GameScene
- [ ] On map load, spawn 3-6 critters from the region's critter pool
- [ ] Critters wander randomly in buildable/open tiles (NOT on the creep path)
- [ ] Movement: pick a nearby tile, walk slowly to it, idle for 1-3 seconds,
  repeat
- [ ] Critters flee (speed up briefly) when a tower is placed near them or
  when creeps pass nearby
- [ ] Critters stay at a low depth (above terrain, below towers/creeps/UI)
- [ ] Critters do NOT interact with gameplay — purely cosmetic
- [ ] On mobile: reduce critter count by 50% for performance

### Polish
- [ ] Critters face their movement direction (flip sprite horizontally)
- [ ] Optional: subtle idle animation (bobbing, pecking, tail flick)
- [ ] Optional: critters avoid the creep path entirely
- [ ] Optional: flying critters (loons, owls) move in gentle arcs above ground

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] No performance regression — critters use lightweight sprites, not
  physics bodies
- [ ] Desktop and mobile layout unaffected
