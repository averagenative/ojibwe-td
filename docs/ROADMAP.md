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
| 6b | Tower Targeting & Behavior Controls | done |
| 7 | Roguelike Offer Layer | done |
| 8 | Run Loop & Game States | done |
| 9 | Meta-Progression | done |
| 10 | Second Map | review-complete |
| 11 | Polish & Balance | pending |
| 12 | Tower Commanders | review-complete |
| 13 | Mobile Browser Support | pending |
| 14 | Cross-Platform Distribution | pending |

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

### Run Loop & Game States (Phase 8 review)
- **GameOverScene `won` field is dead code**: The `GameOverData.won` boolean and the `"VICTORY!"`
  title branch remain in `GameOverScene.ts` but are never triggered — victories now route to
  `RunCompleteScene`. Remove the `won` field and collapse the title to always show `"GAME OVER"`.
  *(Fixed in this review — `won` removed, title hardcoded.)*
- **`calculateRunCurrency` division by zero**: If `totalWaves = 0` is passed, `(wavesCompleted / 0)`
  produces `NaN`. The parameter defaults to 20 and all callers pass `TOTAL_WAVES = 20`, so this is
  unreachable in practice. Add a guard (`if (totalWaves <= 0) return 0`) if the function is ever
  exposed as a public API.
- **`wavesCompleted` display vs accumulator mismatch**: `GameOverScene` receives
  `wavesCompleted: this.currentWave` (the wave the player was ON when they died), while
  `runCurrencyEarned` is based on the last fully completed wave. E.g. dying on wave 5 shows
  "Waves completed: 5 / 20" but only 4 waves' worth of crystals. Consider passing
  `this.currentWave - 1` as `wavesCompleted` to the display, or renaming the label to "Wave reached".
- **WaveManager.e2e.test.ts `wireGameEvents` was broken**: The mock event handlers expected raw
  numbers for `creep-killed` and `creep-escaped`, but WaveManager emits objects (`{ reward, x, y }`
  and `{ liveCost, reward }`). Fixed: destructure the objects in the mock handlers. This was a
  pre-existing bug affecting 6 tests.

### Meta-Progression (Phase 9 review)
- **SaveManager singleton persists across scene restarts**: `SaveManager._instance` is a module-level
  static. If the game is hot-reloaded during dev (Vite HMR), the singleton survives but localStorage
  may have been cleared externally. Low risk in production but can confuse during development. Consider
  adding a `_resetForTests()` call in dev mode or detecting HMR.
- **MetaMenuScene `UNLOCK_NODES.find()` called on every refresh**: `refreshUnlockNodeUI()` and
  `refreshStatNodeUI()` call `UNLOCK_NODES.find(n => n.id === nodeId)` per node per refresh. With 5
  unlock + 10 stat nodes this is negligible, but if node counts grow significantly, pre-index by ID.
- **Sell refund rate can exceed 1.0**: `sellRate = offerManager.getSellRefundRate() + metaStatBonuses.sellRefundBonus`
  has no upper clamp. If Scavenger (0.85) + meta bonus (0.05) combine, the rate is 0.90 — currently
  fine, but adding more sell-refund nodes or offers could push it above 1.0 (selling for profit).
  Add a `Math.min(1.0, sellRate)` clamp if more sources are added.
- **No "Reset progress" button in MetaMenuScene**: Players have no in-game way to reset their meta
  progression without clearing browser storage. Consider adding a "Reset All" button with a
  confirmation dialog for players who want a fresh start.
- **MetaMenuScene has no resize handler**: If the browser window is resized while on the meta menu,
  UI elements retain their original positions. All other scenes have the same limitation, so this is
  consistent but worth addressing in Phase 11 polish.

### Tower Commanders (Phase 12 review)
**Blocking issues fixed in this review pass:**
- **CommanderSelectScene not registered in main.ts**: Scene was defined but never added to Phaser
  config. Fixed: added import and scene registration.
- **MainMenuScene not wired to CommanderSelectScene**: START GAME went directly to GameScene.
  Fixed: MainMenuScene → CommanderSelectScene → GameScene flow.
- **HUD.createCommanderDisplay() and createAbilityButton() missing**: GameScene called methods
  that didn't exist on HUD. Fixed: implemented both methods plus disableAbilityButton().
- **Duplicate activateCommanderAbility()**: Two copies existed in GameScene. Fixed: removed
  the incomplete duplicate, kept the version using waveManager.getWaveInfo().
- **Double pointerup handler bug in CommanderSelectScene**: Unlocked cards had two separate
  `bg.on('pointerup')` handlers — both fired on every click, making the first click always
  open the character sheet instead of selecting the card. Fixed: merged into single handler
  (first click selects, second click on same card opens sheet).
- **waveStartLives never updated between waves**: Nokomis ability would always restore to
  initial lives, not current-wave-start lives. Fixed: snapshot in startNextWave().
- **absorbEscapes never cleared**: Waabizii's ability had no cleanup — once activated, escape
  absorption persisted for the rest of the run. Fixed: cleared in onWaveComplete().
- **Lifesteal offer max-lives cap inconsistent**: Lifesteal capped at mapData.startingLives,
  ignoring commander's startingLivesBonus (Waabizii +2). Fixed: consistent max across all heal sources.
- **GameOverScene RETRY didn't pass commanderId**: Retrying a run lost the commander selection.
  Fixed: commanderId flows through GameScene → GameOverScene → RETRY → GameScene.

**Non-blocking items remaining:**
- **Codex integration for character sheets**: Acceptance criteria require sheets viewable from Codex
  without being in a run. No Codex system exists yet — defer to Codex task (TASK-017).
- **SaveManager not wired into CommanderSelectScene lock check**: `isLocked` uses
  `def.defaultUnlocked` only. Wire via `SaveManager.getInstance().isUnlocked('unlock-commander-' + id)`
  and add commander unlock nodes to `unlockDefs.ts`.
- **Bizhiw aura: projectile travel speed +25% not wired into Projectile.ts**: The
  `projectileSpeedMult` state field is set but Projectile.ts does not read it.
- **Makoons aura: "towers do not lose target on creep speed burst" not wired**: Tower.ts
  `findTarget()` re-acquires targets each attack cycle. Sticky target retention is a Tower.ts change.
- **Animikiikaa aura: chain AoE on impact not wired into Tower.ts**: `teslaChainAoE` flag set
  but Tesla chain logic doesn't trigger 1-tile AoE on each chain jump.
- **Makoons ability: armor/immunity ignore not wired into damage pipeline**: `ignoreArmorAndImmunity`
  flag set but Tower.ts/Creep.ts doesn't check it to bypass armor or immunity flags.
- **Commander portrait icons need asset generation**: `portraitIcon` fields reference keys with no
  corresponding assets. Needs icon generation (gen_icons.py or manual).
- **Stat tooltip doesn't show commander aura effects**: Acceptance criteria state aura-sourced
  stat modifications should be visible in tower tooltips. Currently no tooltip reflects these.

### Second Map (Phase 10 review)
**Blocking issues fixed in this review pass:**
- **Missing map selection UI on MainMenuScene**: Acceptance criteria required map cards with lock
  state and path thumbnails. MainMenuScene only had START GAME button going directly to
  CommanderSelectScene. Fixed: added two-card map selection UI with path thumbnail previews,
  lock state from SaveManager, and unlock cost display. Clicking a locked map sends the player
  to MetaMenuScene.
- **MapId not flowing through scene chain**: CommanderSelectScene passed only `commanderId` to
  GameScene — `mapId` always defaulted to 'map-01'. Fixed: MainMenuScene passes `mapId` to
  CommanderSelectScene via init data; CommanderSelectScene passes both `commanderId` and `mapId`
  to GameScene.
- **MainMenuScene UPGRADES button dead with TODO**: The button had a TODO comment and no-op click
  handler, despite MetaMenuScene being fully built and registered. Fixed: wired to MetaMenuScene,
  removed TODO comment.
- **CommanderSelectScene TODO comment**: `isLocked` check had `// TODO: check SaveManager when
  available`. SaveManager IS available. Fixed: uses `SaveManager.getInstance().isUnlocked()` with
  fallback to `defaultUnlocked` flag. Removed TODO.

**Non-blocking items remaining:**
- **Commander unlock nodes not yet in unlockDefs.ts**: `SaveManager.isUnlocked('unlock-' + def.id)`
  returns false for all commanders since no commander unlock nodes exist. Currently, only the
  default-unlocked Nokomis is selectable. This is correct until commander unlock nodes are added
  to `unlockDefs.ts` (likely Phase 12 or a dedicated task).
- **`getIronBarrageMult()` is redundant**: The Iron Barrage multiplier is already composed into
  `getGlobalDamageMult()` directly (line 211–213). The standalone `getIronBarrageMult()` method
  (line 301–304) is never called. Remove the dead method or use it in place of the inline code.
- **HUD commander display/ability button not added to HUD Container**: Objects created via
  `this.scene.add.*` rather than added to the container. Consistent with other HUD methods
  (speed controls, next-wave button) — all are direct scene objects. Not a leak (scene restart
  destroys all objects) but makes HUD.destroy() incomplete if called mid-scene.
- **No map selection thumbnail animation**: Map cards show static path lines. Consider adding a
  subtle creep-dot animation along the path to help players visualize movement direction.

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
- **Mobile**: Promoted to Phase 13. See below.
- **Modding / map editor**: Low priority but architecturally possible given JSON-driven wave and map defs.
- **Steam / Electron wrapper**: Promoted to Phase 14. See below.

---

## Phase 13 — Mobile Browser Support

Make the game fully playable on mobile browsers (iOS Safari, Android Chrome) without
degrading the desktop experience.

### Input & Touch
- Replace pointer-based click handlers with touch-aware input (tap to place, tap to select)
- Tower placement: tap grid cell to place; long-press or double-tap to cancel
- Tower selection: tap existing tower to select/deselect; prevent accidental placement on occupied cells
- Drag-to-pan the map (if viewport is larger than screen)
- Pinch-to-zoom support (optional, depends on map size vs screen size)
- Prevent browser default gestures (pull-to-refresh, back-swipe, double-tap-to-zoom)

### Responsive Layout & Scaling
- Auto-detect screen size and orientation; scale the Phaser canvas to fill viewport
- Recalculate tile size or camera zoom so the full map is visible without horizontal scroll
- Handle orientation changes (portrait ↔ landscape) — prefer landscape, show rotate prompt in portrait
- Ensure `PANEL_HEIGHT`, `HUD_HEIGHT`, and `UPGRADE_PANEL_HEIGHT` scale proportionally or use relative units
- Handle notch/safe-area insets (CSS `env(safe-area-inset-*)`)

### UI Panels (HUD, TowerPanel, UpgradePanel, BehaviorPanel)
- Increase touch target sizes to minimum 44×44px (Apple HIG guideline)
- Tower panel icons: enlarge or switch to a scrollable horizontal strip
- Upgrade panel: make tier pips and path buttons finger-friendly
- Behavior panel: enlarge priority buttons and toggle labels
- Speed controls and next-wave button: scale up for touch
- Consider a slide-up drawer pattern for panels instead of fixed bottom bar
- BossOfferPanel / BetweenWaveScene offer cards: ensure readable text size and tappable buttons

### Scenes & Menus
- MainMenuScene: enlarge buttons, ensure map selection cards are tappable
- CommanderSelectScene: character cards and sheet must be scrollable/swipeable on small screens
- MetaMenuScene: unlock/stat node buttons must be touch-friendly; scrollable if content overflows
- GameOverScene / RunCompleteScene: enlarge buttons, ensure all interactive elements are reachable

### Performance
- Profile on mid-range mobile devices (target: 30fps minimum)
- Reduce draw calls if needed (texture atlases, reduce particle effects on mobile)
- Consider lowering resolution on low-DPI devices
- Test memory usage — mobile browsers have stricter limits

### Testing
- Manual testing on iOS Safari (iPhone SE / iPhone 14 size) and Android Chrome (Pixel 5 / Galaxy S21)
- Test with browser DevTools device emulation for rapid iteration
- Verify all six tower types are placeable and selectable via touch
- Verify all panel interactions work (upgrade buy, respec, targeting priority, behavior toggles)
- Verify boss offer panel and between-wave offer panel are usable
- Verify meta menu (unlock/stat purchase) works on touch

---

## Health Check Findings

*Populated automatically by `scripts/health-check.sh`. Do not edit this section manually.*

<!-- HEALTH_CHECK_START -->
Last run: 2026-02-28 22:08:13
Findings: 27 total (27 new task files created, 0 already tracked)
Task files: /home/dmichael/projects/greentd/tasks/health/pending/
<!-- HEALTH_CHECK_END -->
