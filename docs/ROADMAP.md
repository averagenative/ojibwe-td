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

### UX / Feel
- Upgrade panel should animate open/close (slide up) rather than snapping — low effort, high feel.
- Selected tower range circle should pulse when the tower fires, giving audio-visual feedback.
- "Chill Only" toggle (Frost targeting task) should have a tooltip explaining the Poison synergy.

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
