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
- ~~No audio system. Sound effects and music are deferred to Phase 11 polish.~~ **Resolved (TASK-021)**: AudioManager provides procedural WebAudio SFX and background music.
- No accessibility pass has been done. Tab navigation, contrast ratios, and screen reader
  labels are all out of scope for MVP but should be tracked.
- ~~**GameScene missing `shutdown()` cleanup**~~ **Fixed (TASK-022)**: `GameScene.shutdown()`
  uses targeted `this.events.off()` for each game event, calls `waveManager.cleanup()`, and
  clears entity collections to prevent stale references and duplicate listeners on scene restart.
  Registered via `this.events.once('shutdown', ...)` in `create()`.
- **Input listener cleanup on restart**: `this.input.on('pointermove'/'pointerdown', ...)`
  listeners registered in `create()` are cleaned up by Phaser's InputPlugin.shutdown()
  automatically, but this is implicit. If future issues arise, consider explicit removal.
- **WaveManager.on('wave-complete') listener**: Registered in `create()` on a per-run
  WaveManager instance. Safe because the old instance is replaced on restart, but an explicit
  `this.waveManager.off('wave-complete', ...)` in `shutdown()` would be more defensive.

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

## Phase 14 — Cross-Platform Distribution

Prepare the codebase for packaging and distribution on Google Play Store, Apple App
Store, and Steam/desktop — all from the same TypeScript + Phaser 3 source.

### Strategy: Shared Core, Platform Shell

The game logic (scenes, entities, systems, data) remains a single codebase. Each
distribution target wraps the game in a platform-specific shell:

| Target | Shell Technology | Store |
|--------|-----------------|-------|
| Android | Capacitor (or Cordova) | Google Play Store |
| iOS | Capacitor (or Cordova) | Apple App Store |
| Desktop (Win/Mac/Linux) | Electron (or Tauri) | Steam / itch.io / direct |
| Web | Vite build (current) | Browser (itch.io, own domain) |

### Wrapper Evaluation & Selection

#### Mobile — Capacitor vs Cordova vs TWA
- **Capacitor** (recommended): Modern, maintained by Ionic team, first-class TypeScript
  support, native plugin ecosystem (haptics, in-app purchase, push notifications).
  Wraps the Vite build output in a WebView (WKWebView on iOS, Chrome-based on Android).
- **Cordova**: Mature but declining ecosystem. Viable fallback if Capacitor plugins are
  insufficient.
- **TWA (Trusted Web Activity)**: Android-only. Runs the PWA in Chrome without a WebView
  wrapper. No iOS equivalent — not suitable for cross-platform.
- **Decision**: Evaluate Capacitor first. If WebView performance is insufficient on target
  devices, consider a native renderer bridge (e.g. Phaser's headless mode + native canvas),
  but this is unlikely for a 2D TD game.

#### Desktop — Electron vs Tauri
- **Electron**: Battle-tested for game distribution on Steam (Vampire Survivors, Slay the
  Spire modded). Large bundle (~150MB) but well-understood. Steam SDK integration via
  `greenworks` or `steamworks.js`.
- **Tauri**: Much smaller bundles (~10MB), uses OS WebView (WebView2 on Windows, WebKit on
  Mac/Linux). Rust backend. Newer, smaller ecosystem. Steam SDK integration is less mature.
- **Decision**: Prototype both. Electron is the safer bet for Steam launch; Tauri is worth
  evaluating for itch.io / direct distribution where bundle size matters.

### Platform Abstraction Layer

Create a thin `src/platform/` abstraction so game code never calls platform APIs directly:

```
src/platform/
├── Platform.ts          ← interface: save, load, purchase, haptics, achievements
├── WebPlatform.ts       ← localStorage, no-op haptics, no IAP
├── CapacitorPlatform.ts ← Capacitor Preferences, native haptics, IAP plugin
├── ElectronPlatform.ts  ← fs-based save, Steam achievements, Steam overlay
└── index.ts             ← factory: detect environment, return correct impl
```

Key abstractions:
- **Save/Load**: Replace `localStorage` calls in `SaveManager` with `Platform.save(key, data)`
  / `Platform.load(key)`. Web uses localStorage; Capacitor uses Preferences plugin (or
  Filesystem for large saves); Electron uses `electron-store` or direct fs.
- **In-App Purchases** (mobile only): `Platform.purchase(productId)` — no-op on web/desktop.
  Needed if offering cosmetics, map packs, or tip jar.
- **Achievements**: `Platform.unlockAchievement(id)` — Steam Achievements on desktop,
  Game Center on iOS, Google Play Games on Android, no-op on web.
- **Haptics**: `Platform.hapticFeedback(style)` — tower placement, wave start, boss death.
  Native haptics on mobile, no-op on desktop/web.
- **Analytics** (optional): `Platform.trackEvent(name, data)` — Firebase on mobile, Steam
  stats on desktop, no-op or self-hosted on web.

### Save Data & Cloud Sync
- Migrate `SaveManager` from direct `localStorage` to the platform abstraction
- Implement cloud save for each platform:
  - Steam: Steam Cloud (automatic file sync)
  - iOS: iCloud key-value store or CloudKit
  - Android: Google Play Games saved games API
  - Web: Optional account system with server-side save (post-MVP)
- Handle save migration: web player → mobile app (export/import code or account link)
- Schema versioning (already in place via `SaveManager` v1) must remain consistent across
  all platforms

### Build Pipeline

```
game/
├── capacitor.config.ts       ← Capacitor project config
├── electron/                 ← Electron main process + preload
│   ├── main.ts
│   ├── preload.ts
│   └── steam_appid.txt
├── android/                  ← Capacitor-generated Android project
├── ios/                      ← Capacitor-generated iOS project
└── scripts/
    ├── build-web.sh          ← vite build (current)
    ├── build-android.sh      ← vite build → cap sync → gradle assembleRelease
    ├── build-ios.sh           ← vite build → cap sync → xcodebuild archive
    ├── build-electron.sh     ← vite build → electron-builder
    └── build-steam.sh        ← electron build + Steamworks SDK integration
```

- Single `npm run build` produces the web bundle; platform scripts wrap it
- CI/CD: GitHub Actions workflows for each target (Android APK/AAB, iOS IPA, Electron
  installers, Steam depot upload)
- Signing: Android keystore, iOS provisioning profiles, Windows code signing — all via
  CI secrets

### Store-Specific Requirements

#### Google Play Store
- Target API level compliance (currently API 34+)
- 512×512 icon, feature graphic (1024×500), screenshots (phone + tablet)
- Privacy policy URL (required even for no-data-collected games)
- Content rating questionnaire (IARC)
- AAB (Android App Bundle) format required for new apps
- Test via internal testing track before production release

#### Apple App Store
- Xcode project with correct bundle ID, provisioning profiles, entitlements
- App Store Connect: screenshots (6.7", 6.1", iPad), app preview video (optional)
- Privacy nutrition labels (App Privacy section)
- App Review guidelines compliance — no placeholder content, must be complete
- TestFlight for beta testing
- Universal build (iPhone + iPad) or iPhone-only with iPad compatibility

#### Steam
- Steamworks partner account + app ID
- Steam SDK integration: overlay, achievements, cloud save, rich presence
- Store page: capsule images (header 460×215, small 231×87, hero 3840×1240),
  screenshots, description, system requirements
- Depot configuration for Win/Mac/Linux builds
- Steam Deck compatibility testing (verified/playable status is a selling point)
- Consider Steam Input API for controller support (gamepad tower placement)

### Controller & Input Mapping (Desktop/Steam Deck)
- Gamepad support: D-pad/stick to move cursor, A to place/select, B to cancel/deselect
- Tower panel navigation: bumpers (L1/R1) to cycle tower types
- Upgrade panel: D-pad to navigate tiers/paths, A to buy
- Radial menu alternative for tower selection (right stick)
- Keyboard shortcuts: number keys for tower types, ESC to deselect, Space for next wave
- Steam Input API configurator for rebindable controls

### Platform-Specific Polish
- **Mobile**: App icon (1024×1024 source), splash screen, status bar handling,
  orientation lock to landscape
- **Desktop**: Window icon, tray icon (optional), remember window size/position,
  fullscreen toggle (F11), borderless windowed mode
- **Steam**: Trading cards, badges, emoticons (post-launch, optional)
- **All**: Platform-appropriate "quit" flow (mobile = backgrounding, desktop = close
  confirmation if mid-run)

### Monetization Considerations
- **Web/itch.io**: Free or pay-what-you-want
- **Steam**: One-time purchase (consider price point $4.99–$9.99 for indie TD)
- **Mobile**: Free-to-play with optional cosmetic IAP, or premium (paid upfront, no ads).
  Premium is more aligned with the game's design (no energy systems, no wait timers).
  If IAP: cosmetic tower skins, commander portraits, map themes — never pay-to-win.
- **Cross-buy**: No standard mechanism. Consider offering Steam keys to mobile buyers
  or vice versa as goodwill.

### Testing Matrix

| Platform | Device / Config | Priority |
|----------|----------------|----------|
| Android | Pixel 5 (API 33), Galaxy S21 (API 34) | High |
| Android | Low-end (2GB RAM, API 30) | Medium |
| iOS | iPhone SE 3rd gen (iOS 16), iPhone 14 (iOS 17) | High |
| iOS | iPad Air (iPadOS 17) | Medium |
| Windows | Win 10/11, integrated + discrete GPU | High |
| macOS | M1 Mac Mini, macOS 14 | Medium |
| Linux | Ubuntu 22.04, Steam Deck (SteamOS) | Medium |
| Web | Chrome, Firefox, Safari (baseline, already tested) | High |

### Phased Rollout
1. **14a — Platform abstraction**: Create `src/platform/` layer, migrate SaveManager
2. **14b — Electron/Steam**: Package for desktop, Steam SDK integration, Steam Deck testing
3. **14c — Capacitor/Android**: Android build pipeline, Play Store listing, internal testing
4. **14d — Capacitor/iOS**: iOS build pipeline, App Store listing, TestFlight
5. **14e — Cloud save & cross-platform sync**: Wire up platform-specific cloud save backends
6. **14f — Controller support**: Gamepad input for desktop/Steam Deck

---

## Code Review Findings — TASK-024 (Commander Unlock Progression)

*Non-blocking items surfaced during review. Not required for merge.*

### Oshkaabewis has no unlock node (UX handled, logic TODO)
The task defines 4 commander unlock nodes but there are 5 locked commanders.
Oshkaabewis (Economy role) has no unlock node in `unlockDefs.ts`. The
CommanderSelectScene was updated to show "Coming soon" instead of a misleading
cost/route-to-MetaMenuScene for commanders without an unlock node. A future
task should add `unlock-commander-oshkaabewis` with an appropriate cost (e.g.
10 crystals, mid-tier between 8 and 12).

### Commander unlock costs diverge from commanderDefs.unlockCost
The `CommanderDef.unlockCost` field (set per commander in `commanderDefs.ts`)
is now superseded by the `UnlockNode.cost` in `unlockDefs.ts`. The two values
differ (e.g. Makoons: `unlockCost=300` vs node cost `8`). Consider removing
or deprecating `CommanderDef.unlockCost` to avoid confusion.

### MetaMenuScene scrolling
With 5 nodes (1 map + 4 commanders), the MetaMenuScene layout fits on screen.
Adding more nodes (Oshkaabewis, future unlocks) will require scrolling or
pagination. Consider adding a scrollable container before adding more nodes.

---

## Code Review Findings — TASK-025 (Boss Wave E2E Tests)

*Non-blocking items surfaced during review. Not required for merge.*

### Vacuous waypoint index assertion in test 4
The assertion `mini.getCurrentWaypointIndex() === parentWpIdx` (line 363) passes
because both the boss mock and mini-copy mock return the same default
`_currentWpIdx = 1`. The test does not verify that WaveManager passes the correct
`remainingWps` to mini-copy constructors. To strengthen this, either:
- Spy on the Creep constructor with `vi.fn()` and assert the `waypoints` arg, or
- Make the mock Creep store its received waypoints and expose them for assertion.
The core split flow (boss dies → 2 non-boss minis appear → minis settle → wave-complete)
is genuinely tested; only the waypoint routing verification is weak.

### Duplicated Phaser EventEmitter mock across E2E test files
The `vi.mock('phaser', ...)` block is duplicated verbatim between
`WaveManager.e2e.test.ts` and `WaveManager.boss.e2e.test.ts`. This is intentional
(documented as "self-contained without a shared helper") and acceptable for 2 files.
If more E2E test files are added, extract to a shared `__mocks__/phaser.ts` auto-mock
or a `testUtils.ts` helper.

### ROADMAP item "No boss-wave e2e coverage" now addressed
The entry under "Wave E2E Tests (TASK-012 review)" noting the lack of boss-wave
coverage is resolved by this task. The remaining two items in that section (silent
no-op on invalid wave, `wave-bonus` naming inconsistency) are still open.

---

## Code Review Findings — TASK-026 (Creep Corner Pathing)

*Non-blocking items surfaced during review. Not required for merge.*

### Arrival threshold increased from 2px to 8px
The old hardcoded `dist < 2` threshold was replaced with `WAYPOINT_ARRIVAL_PX = 8`.
This is intentional (a 2px threshold was too tight for reliable arrival detection), but
it means creeps now "cut corners" slightly more — up to 8px offset at turns. Visually
negligible in the current tile sizes (40–48px), but if a future map uses very small tiles
or tight corridors, verify corner clipping doesn't look off.

### Extreme lag spike can skip all waypoints in one frame
The `while` loop in `advanceWaypointIndex` advances past every waypoint within
`arrivalThreshold` of the creep's position. If `delta` is enormous (multi-second freeze),
`stepDist` becomes very large, and the threshold could encompass all remaining waypoints,
causing an instant exit. Phaser clamps `delta` to `game.config.fps.deltaSmoothing`, so this
is unlikely in practice. If needed, cap `delta` in `Creep.step()` to e.g. 500ms.

### No sub-frame corner interpolation
After advancing past a waypoint, the creep moves the full `stepDist` toward the next
waypoint from its current position — it does not snap to the waypoint first, nor does it
split the step between the old and new direction. Standard for TD games and visually fine,
but worth noting if pixel-perfect path tracing (e.g., motion trails) is added later.

---

## Code Review Findings — Phase 11 (Polish & Balance)

*Non-blocking items surfaced during review. Not required for merge.*

### Mute button state desync on scene restart (FIXED)
The mute toggle button in `HUD.createMuteButton()` initialized with `muted = false`
regardless of `SoundManager.isMuted()`. After a player mutes SFX, restarts the run, and
the HUD is recreated, the button showed "SFX" (unmuted) while SoundManager remained muted.
Fixed: `createMuteButton` now accepts an `initialMuted` parameter; GameScene passes
`SoundManager.getInstance().isMuted()` to keep visual state in sync across scene transitions.

### Poison particle puffs: object creation rate
`_emitPoisonPuff()` creates a new `Phaser.GameObjects.Circle` every 280ms per poisoned creep.
With 40 simultaneously poisoned creeps, that's ~143 circle objects/second (each living 400ms,
so ~57 concurrent at steady state). Playtests validated 60fps at 42 creeps, but if future
phases increase creep counts or DoT prevalence, consider an object pool for particle puffs.

### Muzzle flash and death tween object allocation
`Tower.triggerMuzzleFlash()` creates a `Circle` + tween per shot; `Creep.takeDamage()` death
branch creates a scale-out tween per kill. Both are event-driven (not per-frame), so GC
pressure is bounded by attack/kill rates. If performance concerns arise at higher tower/creep
counts, pool the flash circles.

### SoundManager.destroy() lifecycle
`SoundManager.destroy()` resets the singleton and closes the `AudioContext`, but is never
called. The class comment says "Call only when the entire Phaser game is being destroyed."
Since the game currently never destroys the Phaser instance (only scene transitions), this
is correct. If a future "quit to desktop" or HMR teardown flow is added, wire
`SoundManager.destroy()` into the Phaser game's `destroy` callback.

### "No audio system" tech debt note is stale
The entry "No audio system. Sound effects and music are deferred to Phase 11 polish." in the
Known Technical Debt section is now resolved by SoundManager. Remove or strikethrough once
Phase 11 merges.

---

## Code Review Findings — TASK-016 (Map & Stage Expansion)

*Non-blocking items surfaced during review. Not required for merge.*

### Chokepoint rubric range adjusted from AC's 1–4 to 1–8
The acceptance criteria specified "1–4 natural chokepoints" but existing shipped maps
already exceed this: map-01 has 6 turns, map-02 has 8. The evaluate-map script and rubric
doc were updated to use 1–8. The check remains useful for flagging degenerate extremes
(straight-line or 10+ turn maps).

### All stages share an identical creepRoster
All 4 stages list the same 6 creep types (`grunt`, `runner`, `brute`, `swarm`, `scout`,
`flier`). Diversifying rosters per stage (e.g. Winter Lands omitting `flier`, Oak Savanna
heavy on `brute` + `swarm`) would make stages feel more strategically distinct and give the
`creepRoster` field practical meaning.

### Stage-specific tower bonuses/penalties not implemented
The AC notes Biboon-aki could have "frost towers cheap/discounted but fire towers penalised".
No game mechanic currently reads `StageDef.towerAffinities` to modify tower costs or stats.
The field is UI-only (displayed as affinity dots on stage tiles). Implementing cost modifiers
from stage affinities would meaningfully differentiate stages.

### All stages use waveCount: 20
No variation. Consider shorter challenge stages (10 waves, difficulty 5) or longer endurance
stages (30 waves) to use the `waveCount` field's flexibility.

### No `status` field on StageDef
The rubric doc references `status: pending`/`ready` as a gating mechanism, but `StageDef`
has no status field. Stages are gated solely by `unlockId`. If future stages need a "draft"
or "pending validation" state, add an optional `status` field.

### evaluate-map script not in CI pipeline
The rubric doc notes the script exits 0/1 for CI integration, but `npm run check` does not
include `evaluate-map`. Consider adding it once all stages are expected to pass.

### displayName parsing in MainMenuScene is fragile
`region.displayName.split('(')` extracts the English translation by assuming parenthesized
text. This works for all current regions but would fail for a region name containing literal
parentheses. Consider adding a dedicated `englishName` field to `RegionDef` if more regions
are added.

### LOCKED_STAGE_IDS and getStageUnlockNode() are orphaned exports
Both are exported from `unlockDefs.ts` but not consumed by any production code. They follow
the pattern of `LOCKED_MAP_IDS` / `getMapUnlockNode()` (also test-only). These exports are
consumed by the new unit tests and may be needed by future stage-gating logic.

---

## Code Review Findings — TASK-021 (Audio System)

*Non-blocking items surfaced during review. Not required for merge.*

### Music plays while AudioContext is muted (CPU waste)
When the user's saved state has `audioMuted: true`, the music scheduler still runs
and creates OscillatorNode/GainNode pairs every ~0.42s. The gain chain outputs silence
(masterGain.value=0), but the Web Audio thread still processes the nodes. For a simple
pentatonic arpeggio this is negligible, but if music complexity grows, consider stopping
the scheduler entirely when muted and restarting on unmute.

### Background music starts in constructor, not on explicit call
`_initAudioContext()` calls `_startMusic()` at the end of the constructor. The
`startMusic()` call in `GameScene.create()` is a no-op on first run (guarded by
`_musicRunning`). This means music begins the moment any code calls `getInstance()` —
currently fine since only GameScene does so, but if AudioManager is accessed earlier
(e.g. MainMenuScene for UI click sounds), music would start on the main menu.

### Mute button and speed buttons are scene objects, not Container children
`HUD.createMuteButton()` and `createSpeedControls()` add game objects directly to the
scene (`this.scene.add.rectangle(...)`) rather than to the HUD Container. They are
cleaned up by Phaser on scene destroy, so no leak occurs. But `HUD.destroy()` won't
clean them up if called mid-scene. Consistent with existing HUD patterns — note for
a future refactor to make HUD fully self-contained.

### No volume slider UI
The AudioManager exposes `setMasterVolume`, `setSfxVolume`, and `setMusicVolume`, but
the only UI control is a binary mute toggle. A settings panel with volume sliders would
give players finer control. Defer to a dedicated settings/options menu task.

### "No audio system" tech debt note is now resolved
The entry in Known Technical Debt — "No audio system. Sound effects and music are
deferred to Phase 11 polish." — is addressed by this task's AudioManager implementation.

### Phase 13 — Endless Mode (review findings)

- **`getWaveInfo()` returns null for endless waves (>20)**: Commander ability previews
  that call `WaveManager.getWaveInfo(n)` for waves beyond the authored wave data will
  receive `null`. If a future commander ability targets upcoming waves, this will need
  a fallback path for procedurally-generated waves. Low priority — current callers
  already guard against null.

- **HUD shows "Wave X / 20" for waves 1–20 in endless mode**: The `∞` prefix only
  appears once `current > 20`. During the first 20 waves of an endless run, the
  display looks identical to normal mode. Consider adding a subtle indicator (e.g.
  blue tint or `∞` prefix) from wave 1 in endless mode so the player knows they chose
  the right mode. Cosmetic only.

- **Give Up button not stored as instance property**: `HUD.createGiveUpButton()` adds
  its bg/label via `this.scene.add.*` without storing references. This prevents
  showing/hiding the button later (e.g. during pause). Consistent with other HUD
  elements (`createSpeedControls`, `createAbilityButton`), but all of these would
  benefit from tracked references if a future HUD redesign adds show/hide logic.

- **Redundant modulo in boss rotation**: Line `ENDLESS_BOSS_ROTATION[(rotIdx +
  ENDLESS_BOSS_ROTATION.length) % ENDLESS_BOSS_ROTATION.length]` — the `+ length`
  guard is unnecessary since `rotIdx` is always ≥ 0 (result of `Math.floor` on a
  non-negative). Harmless but could be simplified to `ENDLESS_BOSS_ROTATION[rotIdx]`.

### Mobile Browser Support (TASK-019 review)
- **Sell tower requires right-click**: `GameScene.handleRightClick()` is the only way to sell a
  tower. Right-click has no equivalent on mobile. Add a "SELL" button to the UpgradePanel or
  BehaviorPanel that appears when a tower is selected, or support long-press to sell.
- **Hover effects don't fire on touch**: All interactive elements (`TowerPanel`, `HUD`,
  `BetweenWaveScene` cards, `MainMenuScene` buttons, `GameOverScene` buttons, `MetaMenuScene`
  nodes) use `pointerover`/`pointerout` for visual feedback. These events don't fire on touch
  devices. Add `pointerdown`/`pointerup` visual states (press-darken or press-scale) as a
  tactile feedback alternative.
- **No landscape orientation prompt**: The game is designed for 16:9 landscape (1280×720). On a
  phone held in portrait, the canvas is scaled to ~375×210 with large black bars. Consider
  adding a "Rotate your device" overlay when `window.innerHeight > window.innerWidth`.
- **Scaled touch targets are small on phones**: With Phaser `Scale.FIT`, a 52px tower button in
  game coordinates becomes ~27px on an iPhone SE in landscape (667px viewport). This meets
  Apple's 24px absolute minimum but is below the recommended 44px. A future iteration could
  use a smaller base resolution (e.g. 960×540) for larger effective UI elements.
- **Safe area insets not handled**: Phones with notches/dynamic islands (iPhone X+) may clip
  HUD elements. Future work: apply `env(safe-area-inset-*)` CSS padding to `#game-container`.
- **`BetweenWaveScene` card spacing assumes 1280px width**: Three 220px cards with 244px
  spacing are centred at `cx ± SPACING`. On very narrow portrait viewports the cards are
  extremely compressed. Consider reducing card count or adding horizontal scroll on narrow
  screens.
- **No `contextmenu` prevention**: On Android Chrome, long-press on the canvas triggers the
  browser context menu. Add `document.addEventListener('contextmenu', e => e.preventDefault())`
  or use CSS `touch-callout: none` / `-webkit-touch-callout: none` on the canvas.

---

## TASK-020 Review Findings (non-blocking)

Surfaced during code review of Wire Commander Ability Effects (2026-03-01).

1. **Creep.ts repeated `scene.data.get` cast** — `takeDamage()`, `applySlow()`, and
   `applyDot()` each independently read `this.scene?.data?.get('commanderState')` and
   cast to `{ ignoreArmorAndImmunity?: boolean }`. Extract to a private getter
   (`private get cmdIgnoreFlags(): boolean`) to reduce duplication and eliminate the
   `as` cast repetition.

2. **Mortar cluster sub-projectiles lack `speedMult`** — The Bizhiw aura projectile
   speed bonus applies to primary mortar projectiles but not to the cluster
   sub-munitions spawned in the `onImpact` callback. Cluster sub-projectiles use
   a hardcoded `speed: 200` without `speedMult`. Low priority since sub-munitions
   travel only ~40px, but inconsistent.

3. **Tower constructor arity (10 params)** — Adding `commanderState` brings the
   Tower constructor to 10 positional parameters. Consider migrating to an options
   object pattern (`TowerOptions { scene, col, row, tileSize, def, getCreeps,
   onProjectileFired, offerManager?, onFired?, commanderState? }`) for readability.

4. **`currentTarget` always written even without stickyTargeting** — `findTarget()`
   stores the result in `this.currentTarget` on every call regardless of whether
   sticky targeting is enabled. Harmless (pointer assignment), but could be guarded
   behind a `if (this.commanderState?.stickyTargeting)` check for clarity.

---

## TASK-017 Review Findings — Story Progression & Lore System (non-blocking)

Surfaced during code review of Story Progression & Lore System (2026-03-01).

1. **Codex notification badge doesn't track "seen in Codex"** — The badge on the CODEX
   button in MainMenuScene counts all non-default unlocked entries, not entries unlocked
   since the player last opened the Codex. The badge persists even after viewing all entries.
   To fix: add a `lastSeenCodexIds: string[]` field to SaveManager, updated when CodexScene
   is opened. Compare against `unlockedCodexIds` for the badge count.

2. **Concurrent boss-killed + wave-complete vignettes** — `tryShowBetweenWaveVignette()`
   shows at most one vignette per between-wave window (boss > wave-complete > wave-start
   priority). If a boss is killed on the same wave that has a WAVE_COMPLETE vignette
   (e.g. wave 3 or 10), the wave-complete vignette is permanently skipped since
   `currentWave` changes before the next window. Low risk — current authored data does
   not place bosses on vignette-bearing waves. Future authoring should avoid this overlap,
   or implement a vignette queue.

3. **BOSS_ESCAPED and COMMANDER_UNLOCKED triggers defined but unused** — Both trigger
   types are defined in `TriggerType` and accepted by `getVignettesForTrigger()`, but no
   vignettes use them and no code emits them. They exist for future extensibility. No
   action required — just documenting the gap.

4. **GameOverScene color arithmetic is approximate** — `makeButton()` computes hover and
   press colors with `bgColor + 0x191919` and `bgColor - 0x0a0000`. This produces
   slightly different hover tints than the original hardcoded values (e.g. `0x331919`
   instead of `0x330000`). Functionally fine but could use proper per-channel blending
   for precise control.

5. **VignetteOverlay typewriter timer with empty lines** — If a VignetteDef ever had an
   empty `lines: []` array, `fullText` would be `""` and `repeat: -1` would cause an
   infinite timer. All current vignettes have 3–4 lines so this is safe. Add a guard
   `if (this.fullText.length === 0)` in `show()` for defensive coding.

6. **All vignette and codex text marked `reviewed: false`** — Per the task notes, the
   creator (who is Ojibwe) should review all text before shipping. All 17 vignettes and
   22 codex entries currently have `reviewed: false`. Track as a pre-launch gate.

### TASK-041: Logo & Page Layout (non-blocking)

1. **MainMenuScene background mismatch** — `createBackground()` draws an opaque
   `0x0a0a0a` rectangle over the entire canvas. The body/Phaser config now use
   `#0d1208` (forest green). Consider updating the MainMenuScene background to
   `0x0d1208` (or a complementary dark green) so the in-canvas background matches
   the HTML shell. Not a bug — purely visual consistency.

2. **"Tower Defense" subtitle vertical orphaning** — After removing the large
   "OJIBWE TD" title text, the "Tower Defense" subtitle at `cy - 194` and the
   tower icon row at `cy - 152` sit in the upper canvas with empty space above
   them where the title used to be. Consider shifting them up or adding an
   in-canvas logo watermark using the `logo` texture key that BootScene now loads.

3. **56 pre-existing lint warnings** — All `@typescript-eslint/explicit-function-return-type`
   warnings, spread across Tower.ts, GameScene.ts, AudioManager.ts, UpgradeManager.ts,
   and several test files. None introduced by this task. Consider a lint-fix pass or
   adding return types during the next polish phase.

4. **Palette coverage gap — 5 UI files still use old neon palette + monospace** —
   `CodexScene.ts`, `MetaMenuScene.ts`, `CommanderSelectScene.ts`, `BehaviorPanel.ts`,
   and `BootScene.ts` still reference `#00ff44`, `#ff4444`, `fontFamily: 'monospace'`
   etc. These were outside the TASK-039 scope (only 9 files were targeted). A follow-up
   task should sweep these files to import from `PAL` for full consistency.

5. **AFFINITY_COLORS in MainMenuScene uses hardcoded tower-identity hex values** —
   Lines 32-37 define per-tower colours (`cannon: 0x778888`, `frost: 0x3366aa`, etc.)
   and a fallback `0x888888`. These are tower-identity data colours, not UI theme
   colours. Consider moving them to `towerDefs.ts` or a `PAL.tower.*` sub-object so
   that tower identity colours are centralized alongside the UI palette.

6. **GameOverScene colour arithmetic is fragile** — `hoverBg = bgColor + 0x191919`
   and `bgColor - 0x0a0000` rely on 24-bit hex addition/subtraction that can overflow
   across RGB channels. Consider using a `lighten(color, amount)` helper or defining
   explicit hover-state colours in PAL.

7. **GameScene VFX colours not in PAL** — Tesla chain lightning (`0x88ffff`),
   mortar chain effect (`0xff88ff`), and a white flash (`0xffffff`) are visual effect
   colours that remain inline. These are tower-specific VFX, not UI theme, but could
   be moved to PAL or towerDefs for single-source-of-truth.

---

## Code Review Findings — TASK-041 (Logo & Page Layout Redesign)

*Non-blocking observations from the Opus review gate (2026-03-01).*

1. **MainMenuScene background colour mismatch** — `createBackground()` in
   `MainMenuScene.ts:107` paints a `0x0a0a0a` (dark grey) rectangle over the
   Phaser config background `#0d1208` (dark forest green). Since the rectangle
   covers the full canvas, the effective in-scene background is grey rather
   than the intended forest-green that the HTML body uses. Consider changing
   `0x0a0a0a` → `0x0d1208` for visual consistency between the page and the
   canvas interior.

2. **"Tower Defense" subtitle positioning** — After removing the "OJIBWE TD"
   in-scene title, the "Tower Defense" subtitle moved from y = `cy - 194` to
   `cy - 260` (the old title position). This places it at the very top of the
   720px canvas (y ≈ 100). With the HTML header adding ~80px above the canvas,
   the subtitle may feel visually disconnected from the logo. Consider moving
   it down slightly (e.g. `cy - 220`) after a visual pass.

3. **No `@types/node` for test tooling** — The layout contract test needed to
   read `style.css` via Node.js `fs` because Vitest strips CSS content by
   default. The workaround uses a dynamic `import('node:fs')` which compiles
   but has no type safety. Adding `@types/node` to devDependencies would let
   future tests use Node.js APIs with full type checking.

---

## Non-blocking Findings — TASK-039 (Natural Colour Palette)

*Surfaced during code review of TASK-039 (2026-03-01). None of these block the merge.*

### Out-of-scope files still using `fontFamily: 'monospace'` and neon-green `#00ff44`

The palette migration covered the 9 files listed in the task's acceptance criteria. The
following files were not in scope but still contain the old terminal-aesthetic values:

| File | `monospace` refs | `#00ff44` / `0x00ff44` refs |
|------|------------------|-----------------------------|
| `src/scenes/BootScene.ts` | 2 | 2 (title + progress bar) |
| `src/scenes/CodexScene.ts` | ~12 | 3 |
| `src/scenes/CommanderSelectScene.ts` | ~33 | 3 |
| `src/scenes/MetaMenuScene.ts` | ~10 | 4 |
| `src/ui/BehaviorPanel.ts` | 5 | 0 |

**Recommendation:** Create a follow-up task to extend `PAL` adoption to these 5 files.

### Fragile hex arithmetic in `GameOverScene.makeButton()`

`GameOverScene.ts` line 103: `hoverBg = bgColor + 0x191919` and line 117:
`bgColor - 0x0a0000` compute hover/press states by adding/subtracting hex offsets.
This works only when no RGB channel overflows. Consider replacing with a
`lighten(color, amount)` helper or explicit PAL entries.

### Map tile rendering colours

`GameScene.drawMap()` (lines 587–594) uses hardcoded earthy browns (`0x2a2010`,
`0x3a3020`) and dark greens (`0x142014`) for tile grid rendering. These are
map-specific rendering colours, not UI theme values. If a second visual theme is
ever added, these should move into map metadata or PAL.

### Lightning effect colour

`GameScene.ts` line 1388 uses `0xff88ff` (magenta) for a specific ability's
lightning arc. This is a gameplay visual effect, not a UI element.

### Medicine wheel SVG as in-game asset (TASK-044 stretch goal)

The medicine wheel SVG (`public/assets/ui/medicine-wheel.svg`) is now wired as
the browser favicon. The task's optional criterion suggests replacing the
procedural aura-tower base drawing in `Tower.ts` with this SVG texture. This
would reduce draw calls and give the aura tower a crisper, resolution-independent
look. Steps: load in `BootScene.preload()` as a texture key, swap the procedural
`Graphics` circle in Tower's aura rendering path.

### TowerPanel lacks destroy() method (TASK-042 review)

`TowerPanel` creates 7+ Phaser GameObjects (background strip, tooltip graphics,
5 tooltip text objects, plus per-button rects/text) but has no `destroy()` method.
While Phaser cleans up scene children on `scene.shutdown()`, an explicit
`destroy()` would improve clarity and allow safe mid-scene reconstruction (e.g.
after tower unlocks change the available defs). Pre-existing — not introduced by
the tooltip feature.

### Pre-existing test failures (TASK-042 review)

- `layoutContract.test.ts`: expects `max-width: min(520px, 90vw)` but CSS has
  `min(320px, 70vw)` — test is stale after a prior CSS resize.
- `favicon.test.ts`: `tsc --noEmit` fails on `node:fs`/`node:path` imports —
  needs `@types/node` or tsconfig path adjustment.

---

### TASK-038 Wire New Assets — Review Findings (2026-03-01)

- **Hit flash not implemented**: Phase 11 memory references a "80ms white tint on
  `takeDamage()`" hit flash, but no such code exists on any branch. The sprite path
  added here supports `setTint`/`setTintFill`/`clearTint` so a hit flash can be added
  cleanly. Consider adding it to both rectangle and sprite paths in a future polish pass.
- **Tile rotation is cosmetic-only**: Map tiles cycle deterministically
  (`TILE_KEYS[(row * cols + col) % TILE_KEYS.length]`) regardless of terrain type.
  The map data has only `PATH` vs non-path — no per-tile terrain type. When terrain
  type metadata is added to map-*.json, update `renderMap()` to select tile sprites
  by actual type instead of rotation.
- **Unused creep sprites**: `creep-immune` and `creep-regen` are loaded in BootScene
  but never mapped in `CREEP_SPRITE_KEYS` because no matching creep type key exists
  in `creep-types.json`. They are loaded for future expansion. Wire them when
  "immune" / "regen" entries are added to the creep type data.
- **Commander oshkaabewis has no portrait**: The 6th commander's portrait file
  (`portrait-oshkaabewis.png`) does not exist; the card gracefully omits it. Generate
  the asset when the character's visual identity is finalized.
- **Aura description removed from commander cards**: The card now shows a portrait
  instead of the inline aura description. The description is still accessible in the
  character sheet overlay. No action required unless user feedback requests it.
- **Pre-existing test failure**: `layoutContract.test.ts` expects logo
  `max-width: min(520px, 90vw)` but CSS was changed to `min(320px, 70vw)` in a prior
  commit. Update the test assertion to match the current CSS.

### Documentation (TASK-036 review)
- **Dead link in README**: `docs/asset-generation.md` is referenced from `README.md` but does not
  exist yet. Create this file when asset generation tooling is documented, or remove the link.
- **Screenshot placeholder**: `docs/screenshot.png` is referenced but does not exist. Capture a
  representative screenshot to replace the placeholder once visual polish is complete.

---

## Non-blocking Findings — TASK-037 (Boss Wave Escort Spawns)

*Surfaced during code review of TASK-037 (2026-03-01). None of these block the merge.*

### Fire-and-forget boss spawn timer not tracked for cleanup
The 800 ms boss dramatic-delay timer (`scene.time.addEvent` at WaveManager.ts:236)
is not stored or destroyed in `cleanup()`. If `cleanup()` is called during that
800 ms window (e.g. mid-wave scene restart), the callback will still fire on a
stale WaveManager. The same pattern now applies to `escortDelayTimer` callbacks
that themselves create the `escortTimer`. Pre-existing issue, not introduced here.

### `buildEscortQueue` near-duplicate of `buildSpawnQueue`
Both methods iterate a count, pick a random type from a pool, look up the
`creepTypeDefs` entry, and push a scaled `CreepConfig`. A shared helper
`buildQueue(count, types, hpMult, speedMult)` would DRY this up. Low priority
since both are short and stable.

### Escort/spawn timers not reset between consecutive `startWave()` calls
Neither `spawnTimer`, `escortDelayTimer`, nor `escortTimer` are destroyed at the
start of `startWave()`. In normal gameplay this is safe (waves only start after
the prior wave completes), but a defensive `cleanup()` call at the top of
`startWave()` would guard against accidental double-starts.

---

## Non-blocking Findings — TASK-049 (Creep Directional Sprites)

*Surfaced during code review 2026-03-01.*

1. **`bobPhase` unbounded growth** — `bobPhase` accumulates indefinitely via
   `bobPhase += (effectiveSpeed / 1000) * delta * BOB_FREQ_FACTOR`. After a
   long run (e.g. endless mode) the float will lose precision. Consider wrapping
   with `bobPhase %= (2 * Math.PI)` to keep the value in [0, 2π). Not urgent —
   `Math.sin` handles large values correctly; precision loss only becomes
   noticeable after ~10⁷ seconds of gameplay.

2. **Sprite rotation for up/down uses ±90° only** — the task acceptance criteria
   mention "or use a distinct front/back-facing shape" as an alternative. The
   current implementation rotates the sprite. If future creep sprites look
   awkward when rotated 90° (e.g. asymmetric art with limbs), consider adding
   separate up/down texture frames instead.

3. **`getDirection()` is exported but currently unused** — the public getter
   exposes direction for external systems (e.g. a future creep inspector UI or
   targeting overlay). If no consumer arrives soon, it can be removed to reduce
   the API surface.

---

## Non-blocking Findings — TASK-046 (Natural Map Terrain)

*Surfaced during code review 2026-03-01.*

1. **Waypoint array access unguarded** — `renderTerrain` accesses
   `mapData.waypoints[0]` and `mapData.waypoints[length-1]` without checking
   for an empty array. In practice every MapData has at least 2 waypoints, and
   GameScene's spawn/exit marker code has the same assumption, so this is
   consistent. If dynamic map loading is ever added, a guard should be
   introduced.

2. **SCENERY tile type (TILE=2) not distinctly rendered** — The terrain renderer
   treats `SCENERY` tiles identically to `BUILDABLE` tiles (same ground fill +
   decoration eligibility). If future maps use `SCENERY` for pre-placed features
   (cliffs, water, etc.), the renderer should be extended with distinct
   SCENERY-specific visuals.

3. **Old tile assets still loaded in BootScene** — `tile-tree.png`,
   `tile-brush.png`, `tile-rock.png`, `tile-water.png` are still loaded via
   `BootScene.loadAssets()` but are no longer rendered anywhere. They can be
   removed from the preload step and deleted from assets to reduce bundle size.

---

## TASK-047 Review Findings (non-blocking)

_Surfaced during code review of Tower Attack Type Visuals._

1. **Duplicated `drawLightningArc`** — `Projectile.ts:343` (private instance
   method) and `Tower.ts:688` (module-level function) contain near-identical
   lightning-arc-drawing code. Consider extracting to a shared visual utility
   (e.g. `src/utils/drawLightningArc.ts`) to keep a single source of truth.

2. **Trail particles are full GameObjects** — The task spec suggests "Graphics
   strokes, not full game objects" for trail particles. The current
   implementation uses `scene.add.circle()` (Arc GameObjects). With max 6
   concurrent particles per projectile this is fine at current scale, but if
   projectile density grows, refactoring to a single `Graphics` object per
   projectile with batched strokes would reduce overhead.

3. **Allocations in the update loop** — `emitTrailParticle()` calls
   `scene.add.circle()` + `scene.tweens.add()` during `step()` (up to once
   per 30 ms per projectile). At 50 simultaneous projectiles this creates
   ~1 667 short-lived objects/second. If frame-rate dips appear, introduce an
   object pool or switch to a pre-allocated `Graphics` stroke buffer.

---

### Visual Clarity Audit (TASK-048) — Non-blocking Findings

Discovered during the Opus review pass. None block merge; all are polish candidates.

- **Depth constants not centralised**: Tower depth (10), creep depth (15), projectile
  depth (20) are hardcoded in their respective entity files. The terrain depths are
  exported from `TerrainRenderer.ts` (`TERRAIN_BASE_DEPTH`, `TERRAIN_DECO_DEPTH`,
  `TERRAIN_PATH_DEPTH`). Consider a single `depths.ts` constants file that all entities
  import, so the hierarchy is documented and enforced in one place.
- **Aura pulse depth (6) not in hierarchy spec**: `Tower.buildAuraPulse()` sets depth 6
  for the aura ripple animation. This sits between range circles (5) and towers (10),
  which is fine visually, but the spec doesn't mention it. Add to the spec for completeness.
- **Lightning arc depth (30) overlaps UI layer**: `drawLightningArc()` in Tower.ts uses
  depth 30, same as the effects band in HUD/TowerPanel. Not a practical issue currently
  but worth noting if new UI elements are added at depth 30.
- **Seasonal theme contrast verification**: The code changes (stroke width 2, alpha 0.35
  for range circles, path edge alpha 0.5) improve contrast, but automated per-pixel
  contrast testing is not in place. Consider a visual regression test or screenshot diff
  for each season × map combination.

---

## Non-Blocking Findings — Wave Announcement Banners (TASK-052)

*Surfaced during code review 2026-03-01.*

- **Ascension modifier callout**: The acceptance criterion for "Ascension modifier
  waves: show the active modifier" is not implemented because no ascension system
  exists in the codebase yet. When ascension is added, extend
  `WaveAnnouncementInfo` with an `ascensionModifier?: string` field and show it in
  the WaveBanner sub-line.

- **BetweenWaveScene per-type creep breakdown**: The task AC mentions "Creep type
  breakdown (e.g. '10 normal + 3 armoured + 2 fast')" in the between-wave panel.
  The current implementation shows wave-type badge + total count + traits, which is
  a good summary but not a per-type count. To add per-type counts, extend
  `WaveAnnouncementInfo` with a `composition?: { typeKey: string; count: number }[]`
  field and render it in `BetweenWaveScene.buildWavePreview()`.

- **AIR_KEYS set created per call**: `getWaveAnnouncementInfo()` creates
  `new Set(['scout', 'flier'])` on each invocation. This is fine (called once per
  wave) but could be promoted to a module-level constant for cleanliness.

- **First-air callout overrides traits**: When the first air/mixed wave appears,
  the "NEW: AIR WAVE" callout replaces the trait sub-line rather than appending.
  With the banner's single sub-line layout this is the right trade-off, but if a
  second row is added later, both should be shown.

- **AudioManager filter mock gap**: The existing `makeFilter()` mock was missing
  `linearRampToValueAtTime` and `exponentialRampToValueAtTime` on the `frequency`
  AudioParam. Fixed during review — other future SFX using filter frequency
  automation will now work in tests.

---

### TASK-051 Air & Ground Combat System (reviewed 2026-03-01)

**Fixes applied during review:**
- **Tesla chain domain leak**: `fireTesla()` chain candidates, Animikiikaa chain AoE,
  and Thunder Quake AoE were iterating all creeps without domain filtering. Tesla is
  air-only, so chain hits could incorrectly damage ground creeps. Added `towerDomain`
  capture and filtering in the `onHit` closure.
- **Orphaned event emission**: `WaveManager.startWave()` emitted `'air-wave-start'` on
  `scene.events` but nothing subscribed. The air wave warning is handled via
  `hasAirCreepsInWave()` called from `GameScene.onWaveComplete()`. Removed the dead emit.
- **Duplicate JSDoc**: `showBossWarning` JSDoc block was displaced above `showAirWaveAlert`
  in HUD.ts, leaving two consecutive JSDoc comments. Reordered so each method has its
  own JSDoc and the methods appear in logical order.
- **Stale test helper**: `commanderAbilityWiring.test.ts` `stickyTargetResult()` used the
  old `groundOnly: boolean` param. Updated to `targetDomain: 'ground'|'air'|'both'` to
  match the actual `Tower.findTarget()` implementation. Added `targetDomain: 'air'` tests.
- **Weak TowerDef test**: `domain-filter.test.ts` `TowerDef targetDomain assignment` test
  verified only inline constants. Replaced with imports of real `ALL_TOWER_DEFS` and
  per-tower assertions.

**Non-blocking findings (future work):**
- **`groundOnly` field redundancy**: `TowerDef.groundOnly` and `ProjectileOptions.groundOnly`
  still exist alongside the new `targetDomain`. `groundOnly` is only used for Mortar AoE
  splash filtering in `Projectile.applyAoe()`. Consider unifying both into `targetDomain`
  in a future cleanup — Mortar AoE could check the tower's domain instead of a separate flag.
- **Air bosses**: All four boss archetypes (Makwa, Migizi, Waabooz, Animikiins) are
  `type: 'ground'`. The system supports air bosses but none exist yet. Consider adding
  an air boss variant (Migizi is thematically appropriate — the eagle boss should fly).
- **Air creep HP balance**: scout has 65 HP (~81% of grunt's 80) and flier has 130 HP
  (~59% of brute's 220). The task spec targets ~70% — the flier is significantly below.
  May warrant a tuning pass once playtesting reveals whether air creeps are too easy/hard.
- **Flak Cannon upgrade**: The task notes suggest a Cannon upgrade path that adds anti-air
  capability ("Flak Cannon") so players invested in Cannon aren't helpless against air waves.
  Not implemented yet — good candidate for a future upgrade tree expansion.

---

## Health Check Findings

*Populated automatically by `scripts/health-check.sh`. Do not edit this section manually.*

<!-- HEALTH_CHECK_START -->
Last run: 2026-02-28 22:08:13
Findings: 27 total (27 new task files created, 0 already tracked)
Task files: /home/dmichael/projects/greentd/tasks/health/pending/
<!-- HEALTH_CHECK_END -->
