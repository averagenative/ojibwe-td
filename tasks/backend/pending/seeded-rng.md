---
id: TASK-030
title: Seeded RNG — Replace Math.random()
status: pending
priority: medium
category: backend
phase: 13
openspec_ref: ""
depends_on: []
created: 2026-03-01
---

## Description

Several systems use `Math.random()` directly, making them non-deterministic and untestable:
`OfferManager.getJackpotBonus()`, `OfferManager.critRoll()`, and creep variant selection.
Replace with an injectable seeded RNG so tests can be deterministic and replays are possible.

## Acceptance Criteria

- [ ] `src/utils/rng.ts` created — exports a `Rng` class wrapping a mulberry32 or xorshift32
  PRNG: `constructor(seed: number)`, `next(): number` (0–1 range, same API as `Math.random()`),
  `nextInt(min, max): number`, `nextItem<T>(arr: T[]): T`.
- [ ] `OfferManager` accepts an optional `rng: Rng` constructor parameter; defaults to a
  `new Rng(Date.now())` if not supplied (preserves existing random behaviour in-game).
- [ ] `OfferManager.getJackpotBonus()` and `critRoll()` use `this.rng.next()` instead of
  `Math.random()`.
- [ ] Any other direct `Math.random()` calls in game systems (not scenes/rendering)
  replaced with `rng.next()` from an injected instance.
- [ ] Tests for `OfferManager` updated to pass a fixed-seed `Rng` — verify deterministic
  output (same seed → same sequence every time).
- [ ] `Rng` class itself has unit tests: verify sequence reproducibility, distribution
  uniformity (1000 samples, mean within 0.05 of 0.5), and `nextItem` coverage.
- [ ] `Math.random()` calls in rendering/VFX code (particle scatter, icon shimmer etc.)
  are fine to leave as-is — only game logic systems need deterministic RNG.
- [ ] `npm run typecheck` clean; `npm run test` passes.

## Notes

- Mulberry32 is a simple, fast, high-quality 32-bit PRNG suitable for games:
  ```ts
  function mulberry32(seed: number) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  ```
- `GameScene` creates `OfferManager` in `create()` — pass `new Rng(Date.now())` there so
  each run gets a different seed (same as current random behaviour) but the seed could
  be logged/saved for future replay support.
- ROADMAP notes this as a known issue under "Roguelike Offer Layer" review findings.
