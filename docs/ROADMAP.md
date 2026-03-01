# Ojibwe TD — Roadmap & Technical Recommendations

Planned work beyond the current phase pipeline, known technical debt, and items
surfaced by code review or the automated health-check. New entries are added here
rather than disappearing into git history.

---

## Implementation Phases (current pipeline)

| Phase | Title | Status |
|-------|-------|--------|
| 1 | Project Scaffold | done |
| 2 | Walking Skeleton | done |
| 3 | Core TD Loop | done |
| 4 | Tower Archetypes (all 6) | done |
| 5 | Wave System | done |
| 6 | Tower Upgrade Trees | done |
| 6b | Tower Targeting & Behavior Controls | pending |
| 7 | Roguelike Offer Layer | pending |
| 8 | Run Loop & Game States | pending |
| 9 | Meta-Progression | pending |
| 10 | Second Map | pending |
| 11 | Polish & Balance | pending |

---

## Code Review Recommendations

Items identified during Opus review passes that don't warrant a full task but
should be addressed during the next relevant phase or in a dedicated polish pass.

### Architecture
- **UpgradeManager ↔ GameScene coupling**: `GameScene.updateAuras()` reaches directly
  into upgrade state. Consider an `AuraSystem` that owns this logic and subscribes to
  upgrade events rather than being called imperatively from the scene.
- **Event naming convention**: Mix of `creep-killed`, `creep-died-poisoned`, and
  `wave-complete` — standardise on kebab-case with a namespace prefix (e.g. `td:creep:killed`).
- **Tower callback pattern**: `onProjectileFired` and `onChainFired` passed as constructor
  args creates tight coupling. Consider a typed event bus on the scene.

### Boss Rounds (Phase 6 addendum)
- **Waabooz split at path end**: If Waabooz dies at or near the last waypoint,
  `getCurrentWaypointIndex()` may return an index past `waypoints.length`, causing
  `slice(parentWpIdx)` to produce an empty array. Mini-copies would spawn at the death
  position with no remaining waypoints, immediately triggering `reached-exit`. Low
  probability in gameplay but worth a guard.
- **Boss offer panel pauses gameplay**: While the `BossOfferPanel` is open, creeps continue
  moving (game is not paused). Consider auto-pausing during the offer panel or making
  it appear between waves rather than immediately on boss death.
- **Regen object allocation in step()**: `tickRegen` returns a new `{ hp, regenCooldownMs }`
  object each frame for regen bosses. Negligible with 1 boss, but if regen becomes a
  general creep mechanic, mutate state in place instead.

### Correctness Risks
- **Frost shatter + Tesla overload interaction**: If a frozen creep is killed by a Tesla
  chain in overload mode, both shatter (destroys Poison stacks) and the Tesla debuff fire.
  The order of resolution is undefined — add an explicit precedence rule.
- **Respec during wave**: Currently allowed. Confirm that resetting upgrade stats mid-wave
  doesn't leave Projectile instances with stale cached stat snapshots.
- **Path lock is one-way**: Once path C is locked by advancing A to tier 3, selling and
  re-placing the tower still reads the lock state. Verify lock clears on sell.

### Performance
- **`updateAuras()` O(n²)**: Iterates all aura towers × all towers in range every frame.
  Fine for current map sizes; profile before Phase 10 (second map, higher tower counts).
- **Projectile target chase**: Each projectile calls `Phaser.Math.Distance.Between` every
  frame. Pool projectile objects rather than creating/destroying per shot.

### Targeting & Behavior (TASK-06b review)
- **BehaviorPanel `as unknown as Visible` casts**: Three casts in `setAllVisible()` and `refresh()`
  work around `Phaser.GameObjects.GameObject` not declaring the `Visible` mixin. Correct at
  runtime but fragile if Phaser drops the mixin from a concrete type. Consider storing objects
  typed as `Phaser.GameObjects.Components.Visible` or using a union type.
- **ESLint warnings in Tower.ts callbacks**: 5 `explicit-function-return-type` warnings on inline
  arrow functions inside `fireTesla` / `fireAt` closures. Harmless (return types inferred) but
  silencing them with explicit annotations would be cleaner.
- **`findTarget()` creates a `candidates` array per attack**: Fine at current tower counts and
  attack intervals (1000-2500ms), but if tower count grows significantly or attack intervals
  shrink via aura stacking, consider a shared pre-filtered candidate list updated once per frame.
- **Aura tower `defaultPriority` is unused**: `AURA_DEF.defaultPriority` is set to `FIRST` but
  never read since aura towers don't attack. The value exists only to satisfy the required field;
  consider making `defaultPriority` optional on TowerDef and defaulting to FIRST in the Tower
  constructor, so isAura defs don't carry a misleading value.

### Ojibwe Base (TASK-015 review)
- **Celebration animation races scene transition**: The original implementation called
  `playCelebration()` then immediately `scene.start('GameOverScene')`, destroying the scene
  before any celebration tweens could render. Fixed in this review with a 1200ms `delayedCall`,
  but a callback-based approach (like `playCollapse`) would be more robust if celebration
  timing changes.
- **No `life-lost` event — uses `creep-escaped` instead**: The acceptance criteria reference
  subscribing to a `life-lost` event. The implementation piggybacks on `creep-escaped`, which
  is functionally equivalent but diverges from the spec's naming. If a dedicated `life-lost`
  event is introduced later, the base should subscribe to that instead.
- **Map 2 untested**: The base reads position from the final waypoint, which should work on
  any map, but no Map 2 exists yet (TASK-10). Verify OjibweBase renders correctly once Map 2
  lands — particularly tile sizes, exit position, and whether the 2×2 scale looks right.
- **No pixel-art sprite path**: The task notes mention upgrading from procedural graphics to
  a sprite in TASK-11's polish pass. When that happens, the `drawWigwam`/`drawMedicineWheel`
  code becomes dead code — either remove it or make the render mode configurable.

### Roguelike Offer Layer (Phase 7 review)
- **OfferManager not reset between runs**: `OfferManager` is created in `GameScene.create()`, but
  if the scene is restarted for a new run, `activeIds`, `totalKills`, `totalTowersPlaced`, etc.
  carry over. Either construct a fresh `OfferManager` per `create()` call (current behaviour is
  correct since `create()` re-runs), or add an explicit `reset()` method and call it on new-run
  to make the lifecycle unambiguous.
- **`getJackpotBonus()` non-deterministic in tests**: Uses `Math.random()` inline, making it
  impossible to test deterministically. Consider injecting a random source or exposing a
  `setRng(fn)` method for test seeding.
- **`critRoll()` similarly non-deterministic**: Same `Math.random()` concern. Both should share
  a seeded RNG when Phase 11 adds replays or balance regression testing.
- **BetweenWaveScene cleanup on scene restart**: If `GameScene` is stopped/restarted while
  `BetweenWaveScene` is active, the overlay persists. Add a `shutdown()` handler or listen for
  `GameScene`'s `shutdown` event to stop `BetweenWaveScene`.
- **`drawLightningArc` duplicated**: `GameScene` introduces its own `drawLightningArc` private
  method while `Tower.ts` has a module-level `drawLightningArc` function. Extract to a shared
  utility (e.g. `src/utils/vfx.ts`) to avoid drift.
- **Mortar onHit not gated by tower type**: `mortarOnHit` is built inside `fireMortar()` which
  is only called for mortar towers, so this is safe. But the `onHit` callback on ProjectileOptions
  is generic — if a future tower type reuses `fireMortar`-like code, the mortar-synergy offers
  (Toxic Shrapnel, Explosive Residue, Acid Rain) could bleed into non-mortar projectiles.
  Consider guarding with a `towerType` check if more projectile types are added.
- **`applyPlacementCost` has side effects**: Increments `towerPlacedThisWave` and
  `totalTowersPlaced` even when called for cost-checking (e.g. UI display). Currently only called
  at actual placement, but the method name ("apply") correctly signals mutation. Document this or
  split into `getPlacementCost` (pure) + `recordPlacement` (mutation) if needed later.
- **No visual indicator for active offers**: Players have no way to see which offers they've
  already chosen during a run. Consider adding an offers-active HUD icon row or a popup list.

### UX / Feel
- Upgrade panel should animate open/close (slide up) rather than snapping — low effort, high feel.
- Selected tower range circle should pulse when the tower fires, giving audio-visual feedback.
- "Chill Only" toggle (Frost targeting task) should have a tooltip explaining the Poison synergy.
- **BehaviorPanel toggle labels**: "ARMOR FOCUS OFF" / "HOLD FIRE OFF" could be confusing — the
  word "OFF" looks like a button to turn something off. Consider "ARMOR FOCUS: ON" / "ARMOR FOCUS: OFF"
  with a colon, or use a visual on/off indicator (filled vs hollow square) instead of text.

### Balance Calc (TASK-014 review)
- **`computeStatsForBalance` duplicates `UpgradeManager.computeEffectiveStats`**: Both functions
  implement identical upgrade stat accumulation logic. If upgrade tier effects change, both must
  be updated in lockstep. Consider extracting a shared `computeUpgradeStats(towerDef, tierState, upgDef)`
  pure function that both callsites consume.
- **`esbuild` not in explicit devDependencies**: The `npm run balance` script relies on esbuild,
  which is currently available only as a transitive dependency of Vite. If Vite drops esbuild
  (e.g. switching to Rolldown), the balance script will break. Add `esbuild` to devDependencies.
- **Balance table Tesla DPS_PATH = 'B' shows no single-target improvement**: Tesla path B
  (Arc Damage) only increases `chainDamageRatio`, which affects multi-target chain damage but
  not the single-target DPS formula. The balance table will show identical kill times across
  all Tesla B tiers. Consider switching Tesla's DPS_PATH to 'C' (Overload, which adds damageDelta)
  or documenting that Tesla B is a multi-target path and the table is single-target only.
- **Debug overlay `getHpRatio() * maxHp` for current HP**: This reconstructs current HP from
  ratio × max. If Creep ever exposes a `getCurrentHp()` directly (already present per TASK-06b
  memory notes), prefer using that to avoid floating-point round-trip drift.

### Wave E2E Tests (TASK-012 review)
- **No boss-wave e2e coverage**: The wave completion e2e test only covers normal (non-boss) waves.
  Boss wave flow (spawnBoss → boss-killed event → split mechanic → wave-complete) should be
  exercised in a dedicated boss-wave e2e test. Deferred because it requires mocking `BOSS_DEFS`
  and `computeWaaboozSplitConfig`, which adds significant mock surface area.
- **WaveManager.startWave silently no-ops on invalid wave**: `startWave(999)` returns early without
  warning. Consider emitting a `wave-error` event or logging a warning for debugging purposes.
- **`wave-bonus` event naming inconsistency**: The task acceptance criteria reference `wave-complete`
  as the gold-awarding event, but the implementation uses a separate `wave-bonus` scene event for
  gold and `wave-complete` (on WaveManager's own EventEmitter) for flow control. Document this
  split clearly — it's correct but non-obvious.

---

## Known Technical Debt

- `UpgradeManager.ts` stub was present from Phase 3 scaffold — fully replaced in Phase 6,
  but verify no Phase 3 era import paths still reference the old stub interface.
- `converted_assets/` icons are placeholder PNGs. Original animal-themed icon redesign
  (Tasks #4 → #5 in original plan) is deferred but needed before any public release.
- No audio system. Sound effects and music are deferred to Phase 11 polish.
- No accessibility pass has been done. Tab navigation, contrast ratios, and screen reader
  labels are all out of scope for MVP but should be tracked.
- **GameScene missing `shutdown()` cleanup**: All `scene.events.on(...)` listeners registered
  in `create()` (creep-killed, creep-escaped, wave-bonus, boss-wave-start, boss-killed,
  creep-died-poisoned) have no corresponding `off()` calls. If the scene is restarted,
  listeners accumulate. Add a `shutdown()` method that removes all scene event subscriptions.

---

## Future Considerations (post Phase 11)

- **Endless mode**: Wave count uncapped, enemy stats scale logarithmically, leaderboard by wave reached.
- **Multiplayer**: Deferred by design decision (Session 2). Revisit after solo loop is polished.
- **Mobile**: Primary target is desktop browser. Responsive layout work deferred to post-MVP.
- **Modding / map editor**: Low priority but architecturally possible given JSON-driven wave and map defs.
- **Steam / Electron wrapper**: If the game gains traction, desktop distribution via Electron is straightforward.

---

## Health Check Findings

*Populated automatically by `scripts/health-check.sh`. Do not edit this section manually.*

<!-- HEALTH_CHECK_START -->
Last run: 2026-02-28 22:08:13
Findings: 27 total (27 new task files created, 0 already tracked)
Task files: /home/dmichael/projects/greentd/tasks/health/pending/
<!-- HEALTH_CHECK_END -->
