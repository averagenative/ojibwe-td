---
id: TASK-063
title: Browser Performance Analysis — Profiling, Bottlenecks, Optimization
status: in-progress
priority: high
phase: polish
---

# Browser Performance Analysis — Profiling, Bottlenecks, Optimization

## Problem

The game has grown significantly — 45+ shipped features including procedural
terrain, air/ground combat, wave banners, directional sprites, particle effects,
and multiple animated systems. No systematic performance profiling has been done.
We don't know where the frame budget is being spent or where the ceiling is for
creep count, tower count, and particle density before frame drops begin.

## Goal

Profile the game across browsers and devices, identify bottlenecks, and optimize
the critical path to maintain 60fps with 30+ creeps, 20+ towers, and all visual
effects active simultaneously.

## Acceptance Criteria

### Profiling
- [ ] Run Chrome DevTools Performance profile on a full 20-wave game:
  - Capture flame chart, identify top 5 hottest functions
  - Measure frame time distribution (p50, p95, p99)
  - Identify GC pauses and their triggers
  - Memory heap snapshots at wave 1, 10, 20 — check for leaks
- [ ] Profile on Firefox and Safari (or WebKit) for cross-browser comparison
- [ ] Profile on a low-end device (throttle CPU 4× in DevTools) to simulate
  mobile performance
- [ ] Document findings in `docs/PERFORMANCE.md`

### Key Metrics to Establish
- [ ] Max creeps on screen before frame drops below 30fps
- [ ] Max towers before frame drops
- [ ] Memory usage baseline and growth rate per wave
- [ ] Render time vs logic time breakdown (is GPU or CPU the bottleneck?)
- [ ] Audio system overhead (WebAudio node count)

### Known Areas to Investigate
- [ ] `TerrainRenderer` — 576 tiles with per-tile colour noise. Is it cached
  properly or re-rendering each frame?
- [ ] `Creep.step()` — called for every creep every frame. Direction calc,
  bobbing, DoT ticks, progress scoring
- [ ] `Tower.findTarget()` — iterates all creeps per tower per frame. O(towers × creeps)
- [ ] `updateAuras()` — nested loop: for each aura tower, check all other towers
  in range. O(auras × towers)
- [ ] Projectile rendering — each projectile is a Graphics object. Many active
  projectiles = many draw calls
- [ ] `WaveBanner` animations — tweens and alpha fades during wave transitions
- [ ] Particle effects — poison aura, muzzle flash, creep death bursts

### Optimization Targets (implement fixes found)
- [ ] Object pooling for projectiles and particle effects (avoid GC pressure)
- [ ] Spatial hash or grid for target finding (replace O(n) creep iteration)
- [ ] Batch Graphics calls where possible (one Graphics object for all
  projectiles of same type)
- [ ] Ensure TerrainRenderer only draws once (not per frame)
- [ ] Texture atlas for sprites (reduce draw calls via batching)
- [ ] Offscreen culling for creeps/projectiles outside viewport (if viewport
  is smaller than map)
- [ ] requestAnimationFrame throttling on hidden/background tabs

### Bundle Size Analysis
- [ ] Run `npx vite-bundle-visualizer` or equivalent
- [ ] Identify large dependencies or dead code in the production bundle
- [ ] Target: < 500KB gzipped for initial load (excluding audio assets)
- [ ] Lazy-load audio files after game scene starts

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] No regression in visual quality from optimizations
- [ ] 60fps maintained with: 30 creeps + 15 towers + all effects on Chrome desktop
- [ ] 30fps maintained with: 20 creeps + 10 towers on mobile Chrome (throttled)

## Notes

- This should run BEFORE adding more animations (TASK-055, 056, 058) so we
  know our current budget and where we can spend frames
- The findTarget() O(n²) is the classic TD bottleneck — a spatial grid would
  give the biggest single improvement
- Phaser 3's WebGL renderer batches sprites automatically but Graphics objects
  break batches — audit how many Graphics objects we're creating
- Consider using Phaser's built-in FPS display during development:
  `game.config.fps.target = 60; game.config.fps.forceSetTimeOut = false`
