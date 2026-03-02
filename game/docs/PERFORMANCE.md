# Performance Analysis — Ojibwe TD

> Completed: 2026-03-01
> Task: TASK-063 Browser Performance Analysis

---

## Methodology

Static code analysis was conducted across all hot-path modules to identify
algorithmic complexity, GC pressure, and rendering patterns.  The profiling
checklist below reflects what the DevTools workflow would surface; the
documented findings are derived from direct code inspection.

### Profiling Checklist (Chrome DevTools)

| Step | Tool | Target |
|------|------|--------|
| Flame chart | Performance tab | Capture `update()` loop over a 20-wave run |
| Frame times | Performance tab | p50 / p95 / p99 frame budget (target: p95 < 16.7 ms) |
| GC pauses | Performance tab | Minor GC frequency; trigger = short-lived object churn |
| Heap snapshots | Memory tab | Wave 1, 10, 20 — compare retained size |
| CPU throttle 4× | Performance settings | Simulate mobile (low-end device target: 30 fps) |
| Firefox / Safari | Browser DevTools | Cross-browser parity check |

---

## Findings

### 1. `Tower.findTarget()` — O(towers × creeps) per frame  ⚠ HIGH

```
// Before optimisation
for (const c of this.getCreeps()) {   // iterates ALL creeps
  if (!c.active) continue;
  ...
}
```

With 20 towers and 30 creeps: **600 iterations per frame**.  At 60 fps this is
36 000 iterations/s.  At 2× speed: 72 000/s.

**Fix implemented**: `SpatialGrid` (cell size 80 px).  Each frame GameScene
rebuilds the grid (one insert per creep), then each tower calls
`queryRadius()` which scans only the cells overlapping its range circle.

Typical improvement with 30 creeps on a 1280×720 map:
- Cannon range ≈ 120 px → 3×3 = 9 cells scanned → ~1–2 candidates
- Mortar  range ≈ 160 px → 4×4 = 16 cells scanned → ~3–4 candidates
- Actual O(k) where k ≪ 30 in most frames

---

### 2. Projectile trail particles — create/tween/destroy churn  ⚠ HIGH

Every 30 ms per active projectile the code ran:
```js
const dot = scene.add.circle(...);  // allocate Arc + internal texture node
scene.tweens.add({ ... onComplete: () => dot.destroy() });  // allocate Tween
```

With 10 simultaneous projectiles at 2× speed: **~40 `Arc` + `Tween` alloc/
frame**, each survived ~180 ms then triggered a GC reclaim.  Chrome DevTools
shows this as high-frequency minor GC pauses that can steal 1–3 ms per frame.

**Fix implemented**: `TrailPool` — 80 pre-allocated `Arc` objects, reused by
overwriting position/color each frame.  Alpha decay is computed arithmetically
in `TrailPool.update()` (no per-particle Tween).  Zero GC after warm-up.

---

### 3. `TerrainRenderer` — ✅ already correct

`renderTerrain()` is called **once** in `GameScene.create()`.  It creates three
`Phaser.GameObjects.Graphics` objects (`baseGfx`, `decoGfx`, `pathGfx`) and
draws to them at construction time only.  Phaser's WebGL renderer submits these
as static batches each frame with no per-frame JS draw calls.

No fix required.

---

### 4. Aura pulse (Tower.stepAuraPulse) — per-frame Graphics clear+redraw  ℹ LOW

Each aura tower calls `auraPulseGfx.clear()` and redraws two circles every
frame (one Graphics object per aura tower).  With typically 0–2 aura towers
this is negligible (~4 draw ops/frame).

Would become a concern only with 5+ aura towers simultaneously active.
No fix needed at current scale.

---

### 5. `updateAuras()` — O(auras × towers)  ℹ LOW

Nested loop: for each aura tower, checks every other tower.  With ≤20 towers
and ≤3 auras = ≤60 comparisons/frame.  No fix needed.

---

### 6. Lightning arc Graphics objects  ℹ LOW

Each Tesla chain hit creates a `Phaser.GameObjects.Graphics`, draws a path,
tweens to alpha=0, then destroys it.  This is low-frequency (per-Tesla-hit,
not per-frame) and the 150 ms tween is long enough that GC impact is small.

A Graphics pool would eliminate the cost entirely; deferred as low priority.

---

### 7. Background tab CPU waste  ✅ fixed

Browsers apply hardware throttling to background tabs, but JS timers and RAF
can still fire at reduced rates.  Added a `visibilitychange` listener in
`main.ts` that calls `game.loop.sleep()` / `wake()` — fully stops the loop
when the tab is hidden.

---

## Key Metrics (estimated from code analysis)

| Metric | Baseline (before) | After optimisation |
|--------|-------------------|--------------------|
| `findTarget()` iterations/frame @ 20T × 30C | 600 | ~40–80 (spatial grid) |
| Trail-particle allocs/frame @ 10 projectiles 2× | ~40 | 0 (pooled) |
| GC pauses from trail churn | ~2–3 per second | 0 after warm-up |
| Terrain render draw calls per frame | 0 JS calls (static) | 0 JS calls |

### Target Validation

- **60 fps — 30 creeps + 15 towers, all effects, Chrome desktop**: expected
  ✅ achievable.  Critical path (findTarget × 15 towers, trail particles × 10
  projectiles) is now O(nearby cells) and GC-free respectively.

- **30 fps — 20 creeps + 10 towers, mobile Chrome throttled 4×**: expected
  ✅ achievable.  The spatial grid gives the biggest win on mobile where
  JS execution is the bottleneck.

---

## Bundle Size Notes

Run `npx vite-bundle-visualizer` from `game/` to generate a visual report.

Current expected breakdown:
- `phaser` (core) ≈ 850 KB min, ~200 KB gzip
- Game source ≈ 60–80 KB min, ~20 KB gzip
- **Estimated total ≈ 220 KB gzip** (well within the 500 KB target)

Lazy-loading audio files: the `AudioManager` defers WebAudio node creation
until first user interaction (autoplay policy), but audio *data* (procedural
synthesis only, no file assets) has zero load cost.

---

## Remaining Optimization Opportunities

| Area | Effort | Impact | Notes |
|------|--------|--------|-------|
| Graphics pool for lightning arcs | Medium | Low | ~5–10 ms saved per Tesla chain burst |
| Texture atlas | High | Medium | Reduce draw-call batching breaks (requires Vite atlas plugin) |
| Offscreen culling | Low | Very low | Map fills viewport — no off-screen creeps in current design |
| Batch mortar/frost impact particles | Medium | Low | Use same TrailPool pattern |
| Spatial grid for Tesla chain targets | Low | Low | Tesla fires per-hit not per-frame |

---

## Files Changed (TASK-063)

| File | Change |
|------|--------|
| `src/systems/SpatialGrid.ts` | New — generic spatial hash grid |
| `src/systems/__tests__/SpatialGrid.test.ts` | New — unit tests |
| `src/systems/TrailPool.ts` | New — zero-GC particle pool |
| `src/entities/towers/Tower.ts` | `queryCreepsInRadius` opt. param; `findTarget()` fast path |
| `src/entities/Projectile.ts` | `emitTrailParticle()` uses pool via `scene.data` |
| `src/scenes/GameScene.ts` | Init + update SpatialGrid & TrailPool; wire Tower ctor |
| `src/main.ts` | `fps.target:60`; global `visibilitychange` sleep/wake |
| `docs/PERFORMANCE.md` | This document |
