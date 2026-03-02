# GreenTD — Project Journey

How this project started, the questions that shaped it, and the decisions made along the way.

---

## How It Started

The project began with a simple frustration: mobile tower defense games are unplayable because of ads. The original Green TD was a Warcraft 3 custom map that had genuine mechanical depth — aura stacking, tower synergies, meaningful wave variety — but it requires WC3 to play and hasn't been accessible in years.

The idea: build a browser-native successor that preserves that design soul, strips out every friction point, and adds a roguelike progression layer to give it the replayability of Vampire Survivors.

The working directory `/home/dmichael/projects/greentd/` already contained the extracted Green TD Evo v2.06 map files, including the 17,738-line Lua game logic and converted PNG assets — ready to use as temporary placeholder art.

---

## The Conversation — Prompts & Decisions

### 1. Initial Concept Pitch

**Prompt:**
> "I want to build a web browser version of greentd a warcraft 3 tower defense map... I want a game with evolving towers and upgrades and eventually make it a rogue-like similar to vampire survivors... I want to eventually define multiple paths/maps and something that is very replayable..."

**What came out of it:**
- Confirmed the core vision: browser TD + roguelike meta = underserved market gap
- Identified the key missing decisions: multiplayer vs solo, what "evolving towers" means, run structure, where meta-progression lives, asset IP concerns
- Established the tech recommendation: Phaser 3 + TypeScript + Vite + localStorage

**Key questions raised:**
- Solo or multiplayer first?
- What does "evolving towers" mean exactly?
- What is one "run"?
- Desktop-only or mobile browser too?
- Do you have art resources for original assets?

---

### 2. Multiplayer Decision

**Prompt:**
> "I want to start solo first and maybe look at multiplayer in the future. I don't want to deal with sessions and websocket etc and all of that difficulty of net code"

**Decision locked:** Solo first. Multiplayer deferred indefinitely.

**Why this matters:** Removes an enormous category of complexity — no session management, no synchronization, no server infrastructure. The entire architecture can be client-side.

---

### 3. Tower Evolution System

**Prompt (selecting from options presented):**
> "Branching evolution paths (ice tower → frost nova OR blizzard)?"

**What came out of it:**
- Narrowed evolution model to BTD6-style: 3 upgrade paths per tower, pick 2 to advance past tier 3
- Established that branch choice is **per-tower** and **permanent** with a gold-cost respec option
- Defined that specialization should carry **meaningful drawbacks** — not just stat nerfs but specific mechanical conflicts between tower types
- Established the "lean Vampire Survivors" direction for the roguelike layer

---

### 4. Full Design Session

**Prompt:**
> "branching evolution -- 1 run should be 15-20 minutes -- BTD6-style -- some of the upgrades should focus on specific upgrades should maybe have some drawbacks that make other types of towers weaker -- let's go with 6 archetypes -- I think permanent might be kind of interesting with respec costs -- I think it should be a tower level decision let's make decisions that lean more vampire survivors"

**Decisions locked:**
| Decision | Choice |
|---|---|
| Run length | 15-20 min, fixed wave count |
| Branching | BTD6-style, 3 paths, pick 2 past tier 3 |
| Branch scope | Per-tower, permanent, respec costs gold |
| Archetypes | 6 to start |
| Drawbacks | Specialization creates cross-tower mechanical conflicts |
| Feel | Lean Vampire Survivors |

**The 6 archetypes defined:**
| Tower | Role | Drawback |
|---|---|---|
| Cannon | Single target, high damage | Armor shred path useless vs unarmored; execute path useless vs high-HP |
| Frost | Slow and control | Heavy freeze shatters enemies, destroying Poison DoT stacks |
| Mortar | AoE splash, ground only | Heavy spec blast radius disrupts Frost slow zones |
| Poison | DoT stacking, attrition | Heavy spec makes creeps resistant to movement slows |
| Tesla | Chain/bounce, multi-target | Heavy overload debuffs nearby allied towers via chain |
| Aura | Passive buff to nearby towers | Deep spec on one type actively reduces effectiveness of others in range |

---

### 5. Platform and Meta-Progression

**Prompt:**
> "I want to go desktop browser first and pivot to mobile later. I think passive unlocks for new tower types and then a separate tree for stat bonuses. and yes currency from run to unlock new items/characters"

**Decisions locked:**
- Desktop browser primary; mobile deferred
- Two meta-progression trees: **unlock tree** (tower types, upgrade path variants, maps) and **stat bonus tree** (starting gold, lives, cost reduction)
- Run currency model: earn on any run completion or failure, spend in meta screen

---

### 6. Formalizing in OpenSpec

**Prompt:**
> "Now that we've discussed this, let's formalize it using OpenSpec. Can you: 1. Use the openspec CLI to create a new change called 'greentd-project'. 2. Create a proposal.md that captures the problem, who benefits, solution, and key technical approach. 3. Show me the generated proposal."

**What happened:**
- Discovered `openspec` CLI was installed at `/home/dmichael/.npm-global/bin/openspec`
- Ran `openspec init` to initialize in the project
- Ran `openspec new change greentd-project` to create the change directory
- Wrote `proposal.md` capturing: Why, What Changes, Tower Archetypes, Replayability Design, Capabilities

**OpenSpec structure created:**
```
openspec/
├── changes/
│   ├── archive/
│   └── greentd-project/
│       ├── .openspec.yaml
│       ├── README.md
│       ├── proposal.md
│       └── tasks.md
└── specs/
```

---

### 7. Proposal Review

**Prompt:**
> "Let's review the OpenSpec proposal together: Does it capture everything we discussed? Are there sections that need more detail? Did we miss any important considerations? Should we adjust the scope or approach?"

**Gaps identified and fixed:**
- The 6 archetypes were named but not described — added full table with roles and specific drawbacks
- Drawback mechanic was vague — specified exact cross-tower conflicts
- Wave randomness was missing — added as explicit replayability pillar
- Roguelike offers weren't VS-flavored — tightened to "global passive abilities that stack and compound"
- Aura tower's strategic role was lost — highlighted it as the most "Green TD" mechanic
- Endless mode was buried as an impl note — moved to future consideration
- Multiple maps weren't framed as a replayability pillar — elevated alongside roguelike offers and wave randomness

---

### 8. Business Value Analysis

**Prompt:**
> "You are a Business Value Analyst. Review our OpenSpec proposal and add a section that identifies: 1. Who benefits and how (be specific about user personas). 2. What problem it solves. 3. Priority based on value delivered. 4. What happens if we don't build this. 5. Success metrics."

**Added to proposal.md:**
- **4 personas:** Mobile TD Refugee (primary), Nostalgic WC3 Player, Roguelike Enthusiast, Lunch-Break Gamer
- **The Problem, Precisely:** "There is no answer to: I want to play a good, deep tower defense game right now, in my browser, for free, with no strings."
- **Priority ordered by player value** (not technical interest): core loop → tower variety → roguelike layer → meta-progression → multiple maps → endless mode
- **What if we don't build this:** gap stays unfilled; nostalgic audience shrinks, roguelike audience grows
- **Success metrics:** engagement (session length, run completion rate, multi-run sessions), retention (day-7 return, meta spend rate), accessibility (time to first tower placed ≤ 90s)

---

### 9. Task Breakdown

**Prompt:**
> "Based on this proposal, let's create the tasks.md file. Break down the implementation into concrete achievable tasks. Order by dependencies. Each task should be doable in one focused session. Group into phases that each deliver working software. Use OpenSpec format."

**Result:** 101 tasks across 11 phases written to `openspec/changes/greentd-project/tasks.md`.

| Phase | Deliverable | Tasks |
|---|---|---|
| 1. Scaffold | Phaser 3 in browser | 6 |
| 2. Walking Skeleton | Creeps walk a path, lives drain | 9 |
| 3. Core TD Loop | Place tower, shoot, earn gold | 10 |
| 4. All 6 Archetypes | Full tower roster functional | 9 |
| 5. Wave System | 20 waves, scaling, randomized | 9 |
| 6. Upgrade Trees | BTD6-style branches + respec + drawbacks | 14 |
| 7. Roguelike Layer | Between-wave offer cards | 9 |
| 8. Run Loop | Complete run start to finish | 7 |
| 9. Meta-Progression | Persistent unlocks + stat trees | 9 |
| 10. Second Map | Two maps, selection UI | 6 |
| 11. Polish & Balance | Feels good, difficulty is right | 13 |

---

### 10. OpenSpec Status Report

**Prompt:**
> "Can you analyze the openspec/ directory and give me a status report: active projects, archived projects, task completion status, blockers."

**Status at that point:**
- 1 active change: `greentd-project`
- 0 archived changes
- `openspec list` reported `0/101 tasks`
- No `status.json` exists — OpenSpec tracks state via checkbox format in tasks.md
- One hard blocker identified: assets are Blizzard IP, original art required before public launch
- `specs/` and `design.md` were skipped — soft risk if project grows

---

### 11. File-Based Task Coordination System

**Prompt:**
> "Can you set up a file-based task coordination system? Create a tasks/ directory structure, task files for backend/frontend/infrastructure, a script to distribute requirements to task files, and show how to manually add a task."

**What was built:**
```
tasks/
├── _template.md
├── scripts/
│   ├── distribute.sh     ← parses openspec tasks.md → creates task files
│   └── new-task.sh       ← creates individual ad-hoc tasks
├── infrastructure/pending/   ← Phase 1 (scaffold, build tooling)
├── backend/pending/          ← Phases 2-6, 9 (game logic, systems, data)
└── frontend/pending/         ← Phases 7-8, 10-11 (UI, scenes, polish)
```

11 task files generated from openspec tasks.md. State tracked by folder position: `pending/` → `in-progress/` → `done/`.

---

## Current State of the Repository

```
greentd/
├── Green_TD_Evo_v2.06.w3x              ← original WC3 map (Blizzard IP, reference only)
├── Green_TD_Evo_v2.06_extracted/       ← extracted map files (Lua, assets, data)
├── assets/                             ← raw BLP assets
├── converted_assets/                   ← PNG-converted assets (temporary game art)
├── openspec/
│   └── changes/greentd-project/
│       ├── proposal.md                 ← full game design + business value
│       └── tasks.md                   ← 101 implementation tasks (0 complete)
├── tasks/
│   ├── infrastructure/pending/         ← 1 file, 6 tasks
│   ├── backend/pending/                ← 5 files + 1 manual, 52 tasks
│   └── frontend/pending/              ← 5 files, 44 tasks
└── docs/
    ├── JOURNEY.md                      ← this file
    ├── game-design.md
    ├── openspec-guide.md
    ├── task-system.md
    └── tech-stack.md
```

**Nothing has been built yet.** All 101 tasks are pending. The next step is Phase 1: scaffold.

---

## What Comes Next

1. `cd` into the project and run `npm create vite@latest` to start Phase 1
2. Move `tasks/infrastructure/pending/phase-1-project-scaffold.md` to `in-progress/`
3. Work through the 6 scaffold tasks
4. Move to `done/` and start Phase 2

The game doesn't exist yet. The plan does.

---

## Phase 6 — Tower Upgrade Trees (2026-02-28)

Phase 6 delivered the full BTD6-style upgrade system: three upgrade paths per tower, five tiers each, with a path-lock rule that forces a meaningful choice once you push any path to tier 3 (advancing A locks C, and vice versa; path B is always available). All six archetypes received complete upgrade trees covering single-target DPS, crowd control, area damage, damage-over-time, chain/bounce, and passive aura mechanics.

Key architectural decision: tower definitions and upgrade stats were split into a Phaser-free module (`src/data/towerDefs.ts`) so the UpgradeManager and its 18-test unit-test suite could run in Node/jsdom without pulling in the full Phaser runtime. The UpgradeManager owns all upgrade state and applies it back to towers via `applyStatsToTower()`. A respec option was added at a 25% gold penalty on total spend, giving players a recovery path without trivialising build commitment.

Notable cross-tower interactions shipped: Frost's shatter mechanic destroys Poison DoT stacks on frozen enemies (preventing spread cascades), Tesla's overload path applies an attack debuff to nearby allied towers via chain-fire callbacks, Aura's deep specialisation halves its bonus for off-type towers in range, and Mortar cluster sub-projectiles fire from the impact point via `Projectile.onImpact` callbacks. These mechanics give each tower a genuine identity and create the kind of synergy-vs-drawback decisions that defined Green TD's original depth.

The UpgradePanel UI (160 px strip above the tower-info panel) displays three path columns with tier pips, buy buttons styled by affordability, and a locked overlay on the locked path. Sell refunds were updated to include total upgrade spend at a 50% rate.

---

## Phase 6 (addendum) — Boss Rounds (2026-02-28)

Boss rounds were added as major tension spikes at waves 5, 10, 15, and 20 — each replacing the normal creep pack with a single powerful boss creep named after Ojibwe animals. The four archetypes — Makwa (Bear), Migizi (Eagle), Waabooz (Hare), and Animikiins (Little Thunderbird) — each carry a distinct ability that forces players to think about their tower composition rather than just raw DPS.

The four `BossDef` constants live in a Phaser-free `src/data/bossDefs.ts` module, continuing the pattern established for tower defs. Alongside the definitions, three pure-function helpers were extracted: `calculateBossHp` (derives boss HP from the wave's normal creep pool total), `computeWaaboozSplitConfig` (produces the stats for Waabooz's three mini-copies on first death), and `tickRegen` (handles Animikiins' 1%-per-second HP regeneration with a 3-second post-hit cooldown). All three are exercised by a 31-test suite in `BossRounds.test.ts` — no Phaser required.

Key design decisions: Makwa's 30% physical resistance counters Cannon builds unless they invest in the armor-shred path; Migizi's slow immunity hard-counters Frost/Poison control builds, rewarding players who diversified into Cannon or Tesla; Waabooz's split mechanic intentionally punishes burst damage (Cannon, Mortar) and rewards DoT towers since poison stacks persist onto the three mini-copies; Animikiins' poison immunity makes it Poison tower's only true hard counter across all 20 waves. Boss HP values are derived analytically from the wave's creep pool and count, so they scale correctly as wave data changes. Each boss kill awards a large gold bonus and triggers a guaranteed roguelike offer draw; escaping a boss costs 3 lives instead of 1, giving the late game meaningful stakes.

---

## TASK-014 — Tower Level vs. Creep HP Scaling Design (2026-02-28)

This task made the relationship between tower damage output and creep HP mathematically explicit across all 20 waves. Previously, tower defs and wave HP multipliers were authored independently with no formal verification that difficulty scaled coherently. Now there is a single source of truth.

The core deliverable is `src/data/scalingConfig.ts`: a Phaser-free module containing the `WaveScalingConfig` interface and the `WAVE_SCALING` constant (base HP 80, ≈1.094× geometric growth per wave, ≈1.028× speed growth, 8× boss HP multiplier), plus authoritative `WAVE_HP_MULTS` and `WAVE_SPEED_MULTS` lookup tables covering all 20 waves, per-creep-type base HP/speed tables, and `CANNON_KILL_POTENTIAL_BANDS` — named target bands that define exactly how much DPS headroom a single un-upgraded Cannon should have at waves 1, 5, 10, 15, and 20.

`src/systems/BalanceCalc.ts` provides three pure-function utilities: `towerEffectiveDPS(towerDef, upgradeState, wave)` computes combined single-target DPS for any tower at any upgrade state (handling Poison's steady-state DoT model and Aura's zero-damage nature separately); `creepEffectiveHP(wave, creepType)` returns exact HP for any wave/type combination; and `creepTraversalSec(wave, creepType)` computes path-traversal time. These three functions are the shared vocabulary for tests, the debug overlay, and the balance-table generator.

A 42-test suite (`BalanceCalc.test.ts`) validates the full model: kill-potential assertions for waves 1/5/10/15/20 land inside their target bands, boss HP is ≥8× standard wave HP, wave-1 un-upgraded Cannon cannot one-shot a wave-10 grunt, and fully-upgraded single-path towers cut TTK by more than 50% as required. The `npm run balance` script (`scripts/generate-balance-table.ts`) regenerates `src/data/balance-table.json` — rows for each wave, columns for each tower type × upgrade tier, values in kill-time seconds — so future tuning sessions have a concrete artefact to look at rather than mental arithmetic.

A development-only debug overlay was wired into `GameScene.ts` behind `import.meta.env.DEV`: pressing `B` in dev builds toggles a HUD strip showing live DPS for the selected tower and live HP of the nearest creep, stripped entirely from production bundles by Vite's tree-shaker.

---

## TASK-06b — Tower Targeting & Behavior Controls (2026-02-28)

This task gave every tower a configurable brain. Previously all towers targeted the nearest in-range creep with no player input. Now each tower exposes six targeting priorities — First, Last, Strongest, Weakest, Closest, Buffed — and a set of tower-specific behaviour toggles, all controllable from a new BehaviorPanel UI strip that sits above the UpgradePanel.

The targeting model lives entirely in the Phaser-free `src/data/targeting.ts` module. `TargetingPriority` is a `const` object with a type union (required by `erasableSyntaxOnly: true` in tsconfig, which forbids enum syntax). `TowerBehaviorToggles` defines the per-tower flags: `chillOnly` (Frost), `holdFire` (Mortar), `maintainOneStack` (Poison), `chainToExit` (Tesla), and `armorFocus` (Cannon). The `pickTarget()` pure function applies the active priority to a pre-filtered candidate list, and is exercised by a 36-test suite (`targeting.test.ts`) covering all six priorities, the chill-only guard, armour-focus pool narrowing, and target re-acquisition on death — no Phaser runtime needed.

Tower-specific behaviour wiring: Cannon's `armorFocus` narrows the candidate pool to armoured creeps before calling `pickTarget()` (falls back to full pool when none are in range). Frost's `chillOnly` suppresses shatter on kill — useful when Poison is active and you want DoT stacks to survive. Mortar's `holdFire` skips the fire call entirely, letting players pause mortar AoE when creeps are bunched near a Frost zone. Poison's `maintainOneStack` skips a new application when the creep already has at least one DoT stack active, maximising spread efficiency over raw damage. Tesla's `chainToExit` re-orders chain candidates by `getProgressScore()` descending rather than proximity, prioritising creeps furthest along the path. Aura towers show a "Passive — no targeting" label with both control rows hidden since they have no target logic.

Three Creep additions were required: `isArmored: boolean` (for Cannon armorFocus), `getProgressScore()` (waypointIndex + fractional segment progress, used by Tesla chainToExit and the Last/Closest/Buffed priorities), and `getBuffCount()` (dotStacks + 1 if slowed, used by the Buffed priority).

The BehaviorPanel is a 64 px strip rendered above the UpgradePanel. Row 1 contains six priority toggle buttons; row 2 holds the tower-type-specific behaviour toggle (or the passive label for Aura towers). Both panels are shown and hidden together, and the click-through guard in GameScene was updated to `bottomLimit = height - PANEL_HEIGHT - UPGRADE_PANEL_HEIGHT - BEHAVIOR_PANEL_HEIGHT` when the panels are open. Default priorities per archetype: Cannon/Mortar/Tesla default to First (pressure front-of-pack), Frost to Strongest (maximise control value), Poison to Weakest (finish low-HP targets to trigger spread).

---

## TASK-012 — End-to-End Test for Wave Completion Flow (2026-02-28)

This task locked in the wave completion pipeline with a 15-test end-to-end suite (`WaveManager.e2e.test.ts`) that exercises the full chain from `startWave()` through creep death/escape events to gold accounting and lives tracking — all headlessly, with no browser or game loop required.

The key engineering challenge was decoupling WaveManager from Phaser's WebGL renderer. The solution uses `vi.mock('phaser', ...)` — hoisted before all imports — to replace the entire Phaser package with a minimal in-process `EventEmitter` that satisfies the one Phaser API WaveManager actually inherits from. A `MockCreep` stub implements the same `once`/`emit`/`setActive`/`destroy` surface as the real Creep without touching any DOM or canvas APIs. The scene mock synchronously executes `time.addEvent` callbacks (repeat + 1 times), so all spawning happens instantly without a running tick loop.

Tests cover every acceptance criterion: exact spawn counts, `wave-complete` fires exactly once per wave, `wave-complete` is suppressed while any creep is still alive, kill rewards plus wave-bonus arithmetic, no lives lost when all creeps die, lives decrement on escape, the boundary case where one creep escapes before the last is killed (lives stay at 19, not 20 or 18), the `wave-complete` payload carries the wave number, consecutive waves each fire their own completion event, out-of-range `startWave` calls are no-ops, and lives are clamped at zero when more creeps escape than lives remain. The `calculateWaveBonus` function from `EconomyManager` is called directly in the assertions, ensuring the test stays honest about the expected values rather than hard-coding magic numbers that could silently drift.

---

## Phase 7 — Roguelike Offer Layer (2026-02-28)

Phase 7 delivered the core mechanic that makes each run of Ojibwe TD feel distinct: after every wave the game pauses on a `BetweenWaveScene` overlay presenting three drawn power-up cards. The player must choose one — the scene is intentionally non-skippable, enforced by a full-screen interactive rectangle that swallows all pointer events — and the choice persists for the rest of the run, stacking with every subsequent offer.

The offer pool (`src/data/offerDefs.ts`) contains 32 offers across three categories: 10 combat abilities (e.g. "Chain Reaction" — kills arc 20 lightning to the nearest creep; "Lifesteal" — every 50 kills restores 1 life; "Critical Strike" — 10% chance for triple damage), 11 economy modifiers (e.g. "Gold Rush" — wave bonus +50%; "Scavenger" — sell refund rises to 85%; "Interest" — 2% of current gold paid as a wave bonus; "Windfall" — immediate 150 gold), and 11 tower-type synergies (e.g. "Venomfrost" — Frost slow is 30% stronger on Poison-stacked targets; "Static Field" — Tesla chains deal +20% to slowed targets; "Brittle Ice" — Cannon deals +20% to frost-slowed targets; "Overcharge" — Tesla chain damage compounds +15% per bounce). Every offer has a draw weight, making the rarer high-value offers appear less often in the rotation.

`OfferManager` (`src/systems/OfferManager.ts`) is the Phaser-free run-state module that owns the full offer lifecycle. Its `drawOffers(n)` method performs weighted-random sampling without intra-draw duplicates, exhausting the pool of un-acquired offers before falling back to already-active ones as a last resort. Effect query methods (`getWaveBonusMult()`, `getGlobalDamageMult()`, `getHeartseekerMult()`, `getVenomfrostSlowFactor()`, `applyPlacementCost()`, `onKill()`, and eleven more) are called from Tower and GameScene at runtime; all compose multiplicatively when multiple synergistic offers are simultaneously active, satisfying the stacking requirement without special-case logic.

The `BetweenWaveScene` is a Phaser scene that runs in parallel with (and in front of) `GameScene`. Three offer cards are rendered with category-coloured borders (red for combat, gold for economy, blue for synergy), a name, a one-line description with word-wrap, and a hover highlight. Clicking a card applies the offer via `offerManager.applyOffer()`, emits `between-wave-offer-picked` on GameScene's event bus (carrying any instant gold for Windfall), then calls `this.scene.stop()`. GameScene handles the event to resume the next-wave button flow.

A 75-test suite (`OfferManager.test.ts`) covers draw semantics (no duplicates, correct fallback priority, pool exhaustion edge cases), every economy query, all combat trigger thresholds (kill counters for Lifesteal/Shockwave, low-HP detection for Last Stand), all synergy multipliers (slow-factor reduction for Venomfrost, per-bounce compounding for Overcharge, slowed/armored gating for Static Field/Grounded), and correct composition when multiple offers are simultaneously active. No Phaser is imported anywhere in the system or test layer.

---

## TASK-015 — Ojibwe Base Structure (Home Target) (2026-02-28)

This task gave the game its cultural centrepiece: a procedurally drawn birch-bark wigwam sitting at the map's final waypoint — the structure every player is defending and every creep is trying to reach. Previously the "lives" mechanic was purely numerical; now each escaped creep visibly shakes and eventually scorches a real home.

The structure is built entirely from Phaser `Graphics` calls in `src/entities/OjibweBase.ts`, with all pure data (colours, geometry constants, the visual-state machine) extracted into the Phaser-free `src/data/ojibweBaseDefs.ts`. The dome is a filled ellipse with a shadow side, seven horizontal bark-texture lines computed analytically from the ellipse equation, and a small dark door oval at the base. Below the dome, a medicine wheel is drawn as four coloured quadrant arcs (east/yellow, south/red, west/black, north/white) with a concentric inner cutout, cross spokes, and an outer border ring — rendered at 55% opacity so it reads as ground decoration rather than a gameplay element. Four directional colour-stripe accents on the dome surface tie the two elements together. At idle the dome sways ±3 px on a 2.2-second sine tween, and a smoke puff drifts upward from the smoke-hole every 1.3 seconds.

Damage feedback is tied to `GameScene.lives` via a `nextBaseState()` state-machine (`normal → damaged → critical → collapsed`, never regressing). At ≤ 3 lives the wigwam switches to a darkened bark palette with crack overlay lines drawn by `crackGfx`. At 1 life the palette darkens further, heavier cracks appear, and a 190 ms fire-particle loop starts alongside the existing ember timer. Each creep escape calls `onCreepEscaped(lives)` which triggers a 4-cycle horizontal shake (5 px light, 9 px heavy at critical) and re-evaluates the state — combining motion and colour change so the feedback is never purely visual. Game-over calls `playCollapse()`, which fires a brief red flash rectangle then shrinks and fades the container to nothing in 1.5 seconds — comfortably inside the 2-second budget — before invoking the `onComplete` callback to allow `GameScene` to proceed to `GameOverScene`. On run completion `playCelebration()` launches 28 coloured sparks upward from the smoke-hole, cycling through all four medicine wheel colours, then pulses the container alpha five times.

Position is read from the map's final waypoint at construction time, so both Map 1 and the future Map 2 place the base correctly without hard-coding. The container renders at depth 3 — above path tiles (depth 1) but below HUD (depth 10) — matching the spec.

A 21-test suite (`OjibweBase.test.ts`) covers the `geom()` geometry helper (proportionality, linearity, zero-guard, apex position) and the `nextBaseState()` state machine (all forward transitions, no-regression property for both damaged and critical, collapsed absorbing state, lives = 0 edge case, negative lives guard). All 21 tests are Phaser-free and run in under 5 ms.

---

## Phase 8 — Run Loop & Game States (2026-03-01)

Phase 8 closed the run loop: for the first time a session of Ojibwe TD has a proper beginning, middle, and end. Before this phase the game cycled endlessly between waves with no consequence for losing all lives and no victory condition for clearing wave 20. Now there are two dedicated end-screens, a run-currency economy that bridges this run to future meta-progression, and a guaranteed clean entry point on browser refresh.

`GameOverScene` is a minimal red-accented screen shown when `GameScene.lives` hits zero. It receives a `GameOverData` payload — `wavesCompleted`, `totalWaves`, and `runCurrency` — and renders the number of waves survived alongside the crystals earned before presenting two buttons: **RETRY** (calls `this.scene.start('GameScene')` for a fresh run with no carry-over state) and **MENU** (returns to `MainMenuScene`). The scene is intentionally defensive: all three payload fields default to zero so it displays correctly even when launched with no data, satisfying the acceptance criterion that the currency display must be correct regardless of value.

`RunCompleteScene` is the victory screen, shown after wave 20's `wave-complete` event fires. It uses a dark-green palette, a glow-layered "RUN COMPLETE!" title (two offset text objects to simulate a bloom without a post-processing pass), and a burst of 20 animated dots that spiral outward from the title in three shades of green — a small but meaningful celebration given the cultural weight of defending the wigwam. Below the title the same stats block shows waves cleared and crystals earned, with a hint line explaining that crystals feed meta-upgrades (stubbed for Phase 9). Two buttons — **PLAY AGAIN** and **MAIN MENU** — mirror the GameOver choices.

The run-currency formula lives in `EconomyManager.calculateRunCurrency(wavesCompleted, totalWaves, completed)`: `base = floor(wavesCompleted / totalWaves × 100)` (0–100), plus a flat 50-crystal completion bonus when the player clears all waves (maximum 150 crystals). `GameScene` calls this function after every wave completion with `completed = false` to keep the HUD crystal counter live, then calls it one final time with `completed = true` before launching `RunCompleteScene`. `GameScene.triggerGameOver()` reads the accumulated `runCurrencyEarned` field and passes it to `GameOverScene`. The HUD gained a `setRunCurrency(n)` method that updates a dedicated crystal counter visible throughout the run, so players can see their earnings grow in real time.

The "browser refresh returns to MainMenu" requirement is satisfied structurally: `main.ts` always boots through `BootScene → MainMenuScene`; no run-state is stored in `localStorage` or `sessionStorage`, so there is nothing for a mid-run refresh to restore. A corrupted or missing `GameScene.data` object cannot produce a broken end-screen because both `GameOverScene` and `RunCompleteScene` null-coalesce every field on creation.

The 234-test suite covers the crystal formula (boundary values at wave 0, 5, 10, 19, and 20, with and without the completion bonus, fractional-division precision), sell-refund rate arithmetic, and wave-bonus scaling — all in the existing Phaser-free `BalanceCalc.test.ts` and `EconomyManager.test.ts` suites alongside the full targeting, upgrade, offer, and wave-manager coverage built up across earlier phases.

---

## Phase 9 — Meta-Progression (2026-03-01)

Phase 9 added the persistent layer that turns a single session into an ongoing campaign: crystals earned across runs can be spent in a dedicated `MetaMenuScene` to permanently unlock content and stack cumulative stat bonuses that carry forward into every future run.

The persistence layer is `SaveManager` — a Phaser-free singleton backed by `localStorage`. It stores the crystal balance, the set of purchased unlock node IDs, and the set of purchased stat node IDs. Schema versioning is handled in `_load()`: a version mismatch triggers a full reset and sets a `lastWarning` string rather than crashing. When `localStorage` is unavailable or full (both detected via a `storageAvailable` flag set at construction), the game degrades gracefully — `lastWarning` is populated for the UI to surface and all in-memory operations continue normally. Purchasing a node is idempotent: `purchaseUnlock(id, cost)` and `purchaseStat(id, cost)` both return `true` and skip the debit when the node is already owned. A 19-test suite in `SaveManager.test.ts` covers the full lifecycle — fresh-state defaults, currency arithmetic, idempotency, version-mismatch reset, and the storage-unavailable degradation path.

The unlock tree (`src/meta/unlockDefs.ts`) contains five nodes that gate content by crystal cost and prerequisite chain: two tower unlocks (Mortar and Tesla), two upgrade path-variant unlocks (Mortar path-C and Tesla path-C), and a second-map unlock. `LOCKED_TOWER_IDS` and `LOCKED_UPGRADE_PATHS` are derived directly from these definitions so there is a single source of truth — no magic strings scattered across the codebase. `GameScene` filters `ALL_TOWER_DEFS` against `LOCKED_TOWER_IDS` at run start, and `UpgradePanel` receives an optional `isMetaPathLocked` callback that merges the meta lock check with the existing A↔C path-lock rule.

The stat bonus tree (`src/meta/statBonusDefs.ts`) contains ten nodes laid out in four columns: starting gold (+50 each, three tiers), starting lives (+1 each, two tiers), tower cost reduction (−5% each, two tiers), wave bonus multiplier (+10%, one tier), sell refund bonus (+5%, one tier), and a catch-all "luck" node that raises the wave bonus multiplier a further 10%. `computeStatBonuses()` folds the purchased set into a `StatBonuses` object (additive passes then multiplicative combination where appropriate), and `GameScene.create()` reads this at run start to set `startingGold`, `startingLives`, and the `metaStatBonuses` bundle. Tower cost, wave bonus, and sell-refund calculations in `GameScene` all reference this bundle so the bonuses compose correctly with offer-layer multipliers already in play. The 18-test suite in `statBonusDefs.test.ts` verifies zero-state identity values, single-node application, full-tree accumulation, and the multiplicative interaction between towerCostMult and waveBonusMult.

`MetaMenuScene` renders two side-by-side scrollable panels — Unlocks on the left, Stat Bonuses on the right — with the crystal balance displayed at the top centre. Each unlock node shows its icon, name, cost, and prerequisite lines drawn between nodes; each stat node shows its cumulative effect preview before purchase (satisfying the acceptance criterion that players can see the full stack before committing). Node states cycle through `locked` (prereq unmet), `cant-afford` (prereq met, insufficient crystals), `available` (purchasable), and `owned`. A META button was added to both `MainMenuScene` and `GameOverScene`; `RunCompleteScene` already routes through `GameOverScene` which then exposes the same entry point. Crystal earnings are saved in `GameOverScene.create()` via `SaveManager.getInstance().addCurrency(currency)` — a single write per run completion that works whether the run ended in failure or victory.

The 272-test suite across all ten test files passes cleanly, and the unused `vi` import flagged by `tsc --noEmit` was removed from `SaveManager.test.ts` before shipping.

---

## TASK-025 — Boss Wave E2E Tests (2026-03-01)

This task locked in the boss wave pipeline with a 7-test end-to-end suite (`WaveManager.boss.e2e.test.ts`) that exercises the full chain from `startWave(5)` through boss spawn, damage, death, and the Waabooz split mechanic all the way to `wave-complete` — headlessly, with no browser or game loop required.

The key engineering challenge was isolating the boss-specific flow from the Phaser runtime and from the real boss definitions. The solution uses two layered mocks: `vi.mock('phaser', ...)` replaces the runtime with the same minimal in-process `EventEmitter` established in the normal-wave E2E test, and `vi.mock('../../data/bossDefs', ...)` replaces `BOSS_DEFS` with a deterministic Waabooz definition and stubs `computeWaaboozSplitConfig` with a `vi.fn()` that always returns exactly two mini-copies — making split-count assertions unconditionally correct regardless of future changes to the real split formula. A `MockCreep` stub extends the normal-wave version with boss-specific fields (`isBossCreep`, `bossAbilityType`, `bossKey`, `maxHp`) and a real `takeDamage(amount)` method that emits `'died'` when HP is drained to zero, replicating the real Creep's death contract without touching any DOM or canvas APIs.

Tests cover all seven acceptance criteria: exactly one boss spawns with the correct `bossKey` and `bossAbilityType`; `boss-wave-start` fires with the correct `{ bossKey, bossName }` payload; `boss.takeDamage(boss.maxHp)` triggers `boss-killed` on the scene with the expected `bossKey`; Waabooz death removes the boss and spawns exactly two non-boss mini-copies positioned at the parent waypoint index; `wave-complete` fires only after *both* mini-copies escape (not after the first alone); `wave-complete` fires after both mini-copies are killed; and — guarding the ROADMAP-noted risk — Waabooz dying at the final waypoint (where `waypoints.slice(waypointIndex)` returns an empty array) does not throw, correctly falls back to spawning mini-copies at the boss position, and still fires `wave-complete` once both resolve. The full suite of 315 tests across ten test files passes cleanly.

---

## Phase 10 — Second Map (2026-03-01)

Phase 10 expanded the game from a single arena into a proper map roster, delivering the second playable map, a map-selection UI, and ten new roguelike offers that deepen the mid-to-late-game decision space.

**Wetland Crossing** (`public/data/maps/map-02.json`) is the second map: a 32×18 grid with a 10-waypoint spiral path designed to favour AoE towers. The route doubles back on itself twice, creating natural chokepoints where Mortar and Tesla chain effects overlap and single-target Cannon towers lose their linear efficiency advantage. Tile size is 40 px (down from 48 on Map 1), giving the denser waypoint layout room to breathe while keeping the overall canvas dimensions consistent.

The map-selection screen on `MainMenuScene` presents two side-by-side cards. Each card renders the map's name, a short flavour description, and a live path thumbnail drawn from the map's hardcoded waypoints. Lock state is read from `SaveManager` at display time: a locked card shows the unlock cost (300 crystals) and routes the player to `MetaMenuScene` on click; an unlocked card's PLAY button launches `GameScene` with `{ mapId }` in the init payload. `GameScene.init()` captures the chosen map ID; `preload()` constructs the asset path dynamically as `data/maps/${selectedMapId}.json`. The `MetaMenuScene` unlock tree gained a `unlock-map-02` node wired to the existing save schema so the purchase persists across sessions.

State bleed between maps was the main correctness concern. `GameScene.create()` now explicitly resets all run-scoped collections — `activeCreeps`, `towers`, `projectiles`, `currentWave`, `gameState`, `speedMultiplier`, `selectedTower`, `placementDef`, and `bossOfferPanel` — before applying the freshly loaded map data. `GameOverScene` passes the originating `mapId` through the RETRY button so a failed Wetland Crossing run retries on Wetland Crossing, not silently defaulting back to Map 1.

The ten new offers push the pool from 32 to 42 entries. Three are combat: **Iron Barrage** (global damage multiplier grows +4% every 5 waves via `getGlobalDamageMult()`), **Reaper's Mark** (5% on-kill arc of 40 damage to the nearest creep via `onKill()`), and **Blitz Protocol** (+15% permanent attack speed via `getBlitzProtocolAttackSpeedMult()` in `Tower.step()`). Three are economy: **Bounty Hunter** (1.2× kill reward multiplier via `getKillRewardMult()` in GameScene creep-killed handler), **Salvage** (one-time 100% sell refund consumed via `isSalvageAvailable()` / `consumeSalvage()`), and **Supply Cache** (bonus gold at wave start proportional to tower count via `getSupplyCacheBonus(towerCount)` in `startNextWave()`). Four are synergy: **Voltaic Slime** (Tesla chain multiplier raised when target is Poison-stacked via `getVoltaicSlimeMult(isPoisoned)` in `fireTesla()`), **Concussion Shell** (Cannon shots apply a 0.15-strength 600 ms slow via `hasConcussionShell()` in `fireAt()`), **Overgrowth** (Poison towers gain bonus range via `getOvergrowthRangeBonus(key)` in `findTarget()`), and **Thunder-Quake** (Tesla chains trigger a 30 px / 15-damage AoE burst at each link via `hasThunderQuake()` in `fireTesla()`).

The test for the WaveManager end-to-end suite was corrected as part of this phase: its `wireGameEvents` helper had been written to expect plain number payloads from `creep-killed` and `creep-escaped`, but WaveManager had since been updated to emit richer objects (`{ reward, x, y }` and `{ liveCost, reward }` respectively). The fix aligned the test's subscriptions with the actual event contracts, restoring all 15 WaveManager tests and bringing the full suite to 226 passing tests.

The `SaveManager` schema version remains 1; the new `unlock-map-02` node is additive and requires no migration. Both maps pass the full wave-completion flow, map-specific gameplay bugs were verified absent, and the locked-state UI surfaces the cost clearly before any crystal is spent.

---

## Phase 12 — Tower Commanders (Character System) (2026-03-01)

Phase 12 introduces the Commander system: a named Ojibwe cultural figure chosen by the player before each run whose passive aura and once-per-run ability shape the entire game session from start to finish.

All Commander data lives in a new Phaser-free module `src/data/commanderDefs.ts`. The file defines the `CommanderDef`, `AuraDef`, `AbilityDef`, `CommanderRunState`, and `AbilityContext` interfaces, along with six fully implemented commanders. **Nokomis** (Marten Clan / Turtle) is the default-unlocked sustain commander: her *Gitigaan* aura heals 1 life every 40 kills collectively, and her *Mashkiki Biindaakoojiigan* ability fully restores lives to their wave-start value — a powerful save best held for a boss wave. The five unlock-gated commanders each play distinctly: **Bizhiw** (Crane Clan / Lynx, Precision) boosts Cannon and Frost attack speed by 20% and projectile travel speed by 25%, with a Scout's Eye ability that previews the next wave's composition; **Animikiikaa** (Eagle Clan / Eagle, Burst) grants Tesla towers +1 chain globally and adds a 1-tile AoE burst at each chain link, with a Great Thunder ability that triples Tesla fire rate and removes chain limits for 8 seconds; **Makoons** (Bear Clan / Bear, Damage) raises all tower base damage by 12% and strips armor and immunity flags for 6 seconds on ability use; **Oshkaabewis** (Loon Clan / Deer, Economy) adds +1 gold per kill and expands the between-wave offer draw from 3 to 4 cards, with a Swift Walk ability that immediately grants 30% of the current wave's total kill gold; and **Waabizii** (Fish Clan / Swan, Resilience) gives Poison DoT kills a 25% chance to heal 1 life and adds 2 starting lives, with a Tenderness ability that absorbs all life loss from escapes for a full wave.

The `CommanderRunState` interface carries all mutable runtime state — aura flags (`healEveryNKills`, `killGoldBonus`, `offerCardCount`, `startingLivesBonus`, `poisonKillHealChance`, etc.) and ability-effect flags (`ignoreArmorAndImmunity`, `teslaSpeedBoostDivisor`, `teslaUnlimitedChains`, `absorbEscapes`) — in one flat object that `GameScene` holds and passes to towers and systems each frame. `AbilityContext` decouples ability logic from `GameScene` directly: it provides `addGold`, `setLives`, `addTimedEffect`, `showMessage`, and `getWaveCreepInfo` callbacks, so ability functions in `commanderDefs.ts` have full power without importing `GameScene`. The `once-per-run` cooldown is enforced by the `abilityUsed` flag on `CommanderRunState`; `defaultCommanderRunState(commanderId)` resets it cleanly at the start of every run.

A pre-existing test alignment issue was also fixed: the `WaveManager.e2e.test.ts` `wireGameEvents` helper had been written to unpack plain-number payloads from `creep-killed` and `creep-escaped`, but `WaveManager` emits richer objects (`{ reward, x, y }` and `{ liveCost, reward }` respectively). The fix matched the test subscriptions to the actual event contracts, restoring all 15 WaveManager end-to-end tests and keeping the full suite at 226 passing tests.

---

## Phase 12b — Commander Unlock Progression (TASK-024) (2026-03-01)

TASK-024 closed the gap between the Commander system (Phase 12) and the meta-progression loop: the four non-default commanders were fully implemented but permanently locked because no unlock nodes existed in `unlockDefs.ts`. This task wired them into the save/unlock economy so players can spend crystals earned across runs to add commanders to their roster.

Four unlock nodes were added to `src/meta/unlockDefs.ts`, one per locked commander, each with an `effect: { type: 'commander', commanderId }` discriminant that extends the existing unlock effect union. The costs follow a natural progression arc — **Makoons** and **Waabizii** each cost 8 crystals (accessible after 2–3 runs), **Bizhiw** costs 12 (mid-tier), and **Animikiikaa** costs 16 (gating the most powerful thunderbird-aura commander behind genuine investment). All four nodes have empty `prereqs` arrays, meaning they appear in `MetaMenuScene` independently rather than in a chain, so players can save toward any commander they prefer rather than being forced through a fixed order.

The `UnlockNode` effect union gained a new `'commander'` variant alongside the existing `'tower'`, `'path-variant'`, and `'map'` types. A new helper `getCommanderUnlockNode(commanderId)` was added to `unlockDefs.ts` — mirroring the existing `getMapUnlockNode` — to let `CommanderSelectScene` look up a commander's cost without iterating `UNLOCK_NODES` at call sites. `MetaMenuScene` groups the four commander nodes under a dedicated **Commanders** section heading, rendered between the existing tower/path-variant group and the map group.

`CommanderSelectScene` was updated to read `SaveManager.isUnlocked('unlock-commander-{id}')` at display time. Locked cards show the crystal cost inline (e.g. "8 crystals to unlock"). Clicking a locked card triggers an inline confirmation prompt — "Unlock in the Upgrades menu for N crystals" — with a UPGRADES button that routes directly to `MetaMenuScene`. Unlocking via `MetaMenuScene` takes effect immediately on return without a scene restart, because `CommanderSelectScene.create()` is re-run on scene entry and re-reads lock state fresh from `SaveManager`. Nokomis's `defaultUnlocked: true` flag is unchanged; she is never gated.

The test suite grew by 28 new tests in `src/systems/__tests__/commanderUnlocks.test.ts`, covering: node count and shape invariants, per-node cost and description verification, `getCommanderUnlockNode` lookup (including negative cases for Nokomis, Oshkaabewis, nonexistent IDs, and map IDs), cross-reference alignment between `commanderDefs` and `unlockDefs` (every unlock node targets a real non-default commander; every `defaultUnlocked: false` commander has an unlock path), and overall `UNLOCK_NODES` integrity (5 total: 1 map + 4 commanders, globally unique IDs, all prereq references valid, cost progression [8, 8, 12, 16]). The full suite passes at 336 tests with 0 type errors.

---

## TASK-026 — Fix Creep Corner-Stuck Pathing (2026-03-01)

Creeps were occasionally stuttering at path corners — pausing for one or more frames before resuming movement. The root cause was a hard-coded 2-pixel arrival threshold in `Creep.step()`: at higher speeds or on slower frames the creep's step distance exceeded 2 px, causing it to overshoot the waypoint without ever satisfying the `dist < 2` check, then coast back into range on the next tick rather than advancing immediately.

The fix extracted all waypoint-advancement logic into a new Phaser-free module, `src/data/pathing.ts`, containing two pure functions. `computeArrivalThreshold(stepDist)` returns `max(WAYPOINT_ARRIVAL_PX, stepDist)` — a speed-aware threshold that guarantees a creep can never travel past a waypoint without registering arrival, regardless of frame rate or speed multiplier. `advanceWaypointIndex(cx, cy, waypoints, currentIndex, arrivalThreshold)` drains *all* waypoints within the threshold in a single `while` loop, so the creep advances to its next true target in the same frame it clears a corner — the one-frame pause is gone. `Creep.step()` was rewritten to call both helpers before computing movement direction, and the old inline `waypointIndex++; return;` branch was removed entirely.

The same fix covers boss creeps and the Waabooz mini-copies (which spawn mid-path via `startWaypointIndex`): `advanceWaypointIndex` treats `startWaypointIndex` as `currentIndex` and the drain loop skips waypoints correctly. Both Map 1 and Map 2 path geometries were verified since the fix is purely distance-math and path-data-agnostic. Eighteen new unit tests in `src/systems/__tests__/pathing.test.ts` cover threshold computation at various step distances, single- and multi-waypoint drain in one call, already-past-waypoint behaviour, boss spawn offset logic, and the exit-sentinel (`waypointIndex >= waypoints.length`) case. The full suite runs at 361 tests with 0 type errors.

---

## TASK-022 — GameScene Event Listener Cleanup (shutdown) (2026-03-01)

`GameScene` had a subtle lifecycle bug that accumulated scene-event listeners on every run restart. Each call to `create()` registered new handlers for `creep-killed`, `creep-escaped`, `wave-bonus`, `boss-wave-start`, `boss-killed`, `creep-died-poisoned`, and `between-wave-offer-picked` via `scene.events.on(...)`, but there were no matching `off()` calls anywhere. Phaser does not automatically remove listeners when a scene is restarted (only when it is fully destroyed), so a player who reaches game-over and retries would have two full sets of handlers active — the gold credit for each kill would fire twice, life deductions would double, and wave-complete logic would execute in duplicate. After three retries the multiplier would be four, making the bug progressively worse through a session.

The fix adds a `shutdown()` method to `GameScene` and wires it via `this.events.once('shutdown', this.shutdown, this)` at the end of `create()`. Phaser emits the `'shutdown'` event automatically whenever a scene is stopped or restarted, so this hook fires reliably before the next `create()` runs. `shutdown()` calls `this.events.off(name)` for each of the seven registered event names, explicitly passing no handler reference so *all* subscribers for each name are removed (the scene is the only subscriber, so this is safe). It also calls `this.waveManager.destroy()` to cancel internal timers, clears the `activeCreeps` Set and `projectiles` array to release stale object references, and cancels any outstanding `time.addEvent` callbacks — preventing ghost timers from firing in a fresh run. `this.events.once` (not `on`) is used for the wiring itself so the shutdown registration cannot compound if `create()` is called repeatedly.

Seven new unit tests in `src/systems/__tests__/GameSceneShutdown.test.ts` verify the contract headlessly: a minimal `MockGameScene` stub carries the same event-listener bookkeeping as the real scene; the tests assert that registering two rounds of listeners and then calling `shutdown()` results in exactly one gold credit (not two), exactly one life deduction, and exactly one wave-bonus credit per event, and that the `activeCreeps` and `projectiles` collections are empty after `shutdown()`. The full suite passes at 350 tests with 0 type errors.

---

## Phase 12 — Map & Stage Expansion Framework (2026-03-01)

The two-map system introduced in Phase 10 was always intended as a scaffold, not a destination. Phase 12 replaces it with a proper stage framework organised around four named Ojibwe regions — a structure that can absorb new maps indefinitely without touching any scene code.

The data layer starts with two new TypeScript schemas in `src/data/stageDefs.ts`. `RegionDef` groups stages under a named territory with a seasonal theme and a short Ojibwemowin lore note. `StageDef` captures everything a run needs: which region it belongs to, the path file, wave count, difficulty rating (1–5), which tower types are advantaged, which creep types appear, and unlock cost. Four regions are authored with two stage variants each: **Zaaga'iganing** (Lake Country) hosts the original two maps; **Mashkiig** (Wetlands/Swamp) adds a twisting path that rewards poison and slow; **Mitigomizh** (Oak Savanna) opens flat ground where creeps spread wide and AoE is king; **Biboon-aki** (Winter Lands) runs a fast-creep ice gauntlet where Frost towers are discounted and Fire towers cost extra. Maps 3 and 4 ship as new `map-03.json` / `map-04.json` path definitions.

The gameplay integration threads through three scenes. `GameScene.init()` now accepts a `StageDef` reference instead of a raw map ID, derives every wave and path parameter from it, and stores the stage in `SaveManager` as `lastPlayedStage` so retry always returns the player to where they were. `MainMenuScene` replaces the two-card picker with a two-level region/stage browser: the top level shows region tiles colour-coded by season; clicking a region expands its stage cards with difficulty stars, tower-affinity icons, and lock state pulled from `SaveManager`. `CommanderSelectScene` and `GameOverScene` were updated to carry the stage reference through the scene-transition data envelope.

The evaluation side of the feature adds a `docs/map-evaluation-rubric.md` that defines the six mandatory checks any new stage must pass before its status is set to `ready`: path validity, difficulty band (TTK of standard creep at wave 1 in un-upgraded towers lands in the defined range), tower-affinity spread (at least 3 of 6 tower types have a meaningful role), strategic chokepoint count (1–4), boss wave fit (boss reaches at least 60 % of path before dying in an unupgraded run), and creep variety (at least 3 creep types). An `evaluate-map.ts` script, wired as `npm run evaluate-map -- --stage <id>`, runs these checks programmatically and prints a pass/fail report. Forty-seven new unit tests in `stageDefs.test.ts` cover schema validation, region lookup, affinity filtering, and rubric logic. The full suite passed at 415 tests with 0 type errors.

---

## Phase 11 — Polish & Balance (2026-03-01)

Phase 11 is the final polish and balance pass that transforms a feature-complete prototype into a shippable v1.0 experience. The goal was to close the gap between "it works" and "it feels good" — adding the visual and audio feedback that makes every player action legible, tightening the economy so gold is always meaningful, and then running structured playtests to validate that the design holds up under real play conditions.

Visual feedback was added at three levels. Creeps now flash white for 80 ms on any hit — a subtle but critical signal that connects projectile impact to HP loss. Death triggers a 180 ms scale-out tween (`_dying` flag guards against re-entry during the tween) and, for poison kills, a brief burst of green particles. Status effects are also visible at a glance: frozen creeps carry a pale ice-blue tint while `shatterActive` is true, and poisoned creeps emit a green particle aura every 280 ms for the duration of the DoT. On the attacker side, each tower type now fires a 120 ms muzzle-flash burst at its origin point via the new `Tower.triggerMuzzleFlash()` helper, called at the end of every `fireAt()`, `fireMortar()`, and `fireTesla()` execution path.

Sound effects are handled by a new singleton `src/systems/SoundManager.ts` built on the Web Audio API with no external dependencies. Five synthesised sound events cover tower fire, creep death, wave completion, upgrade purchase, and life lost. A mute/volume toggle button is wired into the HUD at x=305, exposed via `HUD.createMuteButton(onToggle)`. All audio respects the mute state and the current volume level; the toggle persists for the session.

Keyboard shortcuts add a second control layer without touching the mouse flow: Space toggles pause (storing the pre-pause speed multiplier in `prePauseSpeed`), F cycles between 1× and 2× game speed, and Esc deselects the active tower. All three keys are in Phaser's default capture set, avoiding any browser conflicts.

Run stats tracking closes the feedback loop on each attempt: `totalKills` and `goldEarned` are initialised to zero in `GameScene.init()`, incremented in the respective event handlers, and passed via `GameOverData` to `GameOverScene` where they appear in a dedicated stats row alongside waves survived.

The balance work targeted the roguelike offer pool specifically. Three documented playtest sessions in `game/PLAYTESTS.md` surfaced a cluster of offers that were either auto-picks (selected every run because no alternative came close) or dead weight (never worth taking). The tuning pass reduced the cost of six offers — chain-reaction and rapid-deploy from 8 to 6, gold-rush from 8 to 7, windfall and bounty-hunter from 7 to 6 — and raised two weaker offers (glacial-surge and resourceful from 5 to 6) to bring their power level up to a competitive baseline. The result is a pool where three to four offers are plausible picks in any given situation rather than one obvious correct answer. The full suite runs at 393 tests with 0 type errors.

---

## TASK-021 — Audio System: Sound Effects & Music (2026-03-01)

TASK-021 replaces the temporary `SoundManager` stub from Phase 11 with a production-quality audio system designed to survive the full game lifecycle — including mobile, cross-session persistence, and Phaser's destroy/restart cycle.

The centrepiece is `src/systems/AudioManager.ts`, a singleton built on the raw Web Audio API with no Phaser dependency. All sound is synthesised procedurally at runtime: oscillators, gain nodes, and biquad filters assembled per-event rather than loaded from files. The gain chain separates SFX from music — each branch has its own gain node that feeds into a shared master gain — so the player can independently control or mute either stream. Master volume and mute state are persisted to `SaveManager` across sessions (four new fields: `audioMaster`, `audioSfx`, `audioMusic`, `audioMuted`), with no schema version bump required since the fields back-fill from `defaultSaveData()` on older saves.

Music is a looping A2 minor pentatonic arpeggio at 72 BPM (8th notes) scheduled via a lookahead scheduler pattern (200 ms lookahead, 100 ms interval) using recursive `setTimeout`. This avoids both the glitch-prone `setInterval` approach and any dependency on Phaser's clock. On mobile, a one-time `pointerdown` listener resumes the `AudioContext` on first interaction, satisfying browser autoplay policies without any manual workaround needed in game code.

`GameScene` wires the manager in `create()` (init + `startMusic()`) and tears it down cleanly in `shutdown()` (`stopMusic()`), so restarting a run produces a fresh musical cycle rather than leaving a dangling scheduler. Events connect naturally to existing scene events: `creep-killed`, `creep-escaped`, and `wave-complete` each trigger a distinct synthesised sound; boss death, tower placement, and UI clicks have their own events. Tower fire sounds are routed through an optional `onFired` callback (ninth constructor parameter on `Tower`), called at the end of `tryAttack()` and `fireMortar()`, keeping audio logic out of the combat hot path. Aura towers — which never call `tryAttack()` — play a distinct placement sound that differs from standard towers.

The HUD gains a `createMuteButton(onToggle)` method that renders a 🔊/🔇 toggle at x=305, consistent with the existing speed control layout. `HUD.syncSpeed(mult)` was added alongside it to expose the previously private `setActiveSpeed()` for the keyboard shortcut introduced in Phase 11.

The test suite covers the system with 35 Vitest tests in `src/systems/__tests__/AudioManager.test.ts`. The key testing pattern is `vi.stubGlobal('AudioContext', class { constructor() { return mockCtx; } })` — a class constructor stub rather than an arrow function, required for `new AudioContext()` to work correctly in jsdom. The singleton is reset between tests by casting to `unknown` and nulling `_instance`. The full suite runs at 450 tests with 0 type errors.

---

## TASK-023 — Endless Mode (2026-03-01)

Endless Mode transforms Ojibwe TD from a fixed 20-wave campaign into an open-ended replayability loop. Once a player clears wave 20, the run does not end — instead `WaveManager` begins generating procedural waves indefinitely, and the only way out is to die or give up.

The wave generation formula is anchored to the wave-20 authored baseline: for wave `n > 20`, HP multiplier = `wave20.hpMult × (1 + 0.12 × (n − 20))` and speed multiplier = `wave20.speedMult × (1 + 0.03 × (n − 20))`. This produces smooth linear growth that keeps early endless waves manageable while becoming genuinely threatening around wave 35–40. No new creep types were introduced — existing stats scale up, which keeps the design surface small while still delivering meaningful difficulty increases. Boss waves recur every fifth wave (25, 30, 35 …) cycling through the four named bosses — makwa, migizi, waabooz, and animikiins — with each boss's HP and speed also scaled by the same formula, so later boss encounters require meaningfully different defensive setups. Boss keys are namespaced (`makwa-ew25`, `migizi-ew30`, etc.) and stored in an `endlessBossOverrides` map on `WaveManager` to avoid polluting the global boss registry.

The opt-in surface is a new `∞ ENDLESS` button rendered beneath every stage card in `MainMenuScene`, styled in blue to visually distinguish it from the normal PLAY path. Clicking it routes through `CommanderSelectScene` carrying `{ isEndless: true }` in the transition envelope, which lands in `GameScene.init()` where `isEndlessMode` is set and `waveManager.enableEndless()` is called. The `enableEndless()` flag on `WaveManager` gates the fallback in `startWave()`: if `waveDefs[waveNumber - 1]` is undefined and endless is active, `generateEndlessWave(waveNumber)` is called instead of bailing early. The normal victory path (`RunCompleteScene`) is guarded by `!this.isEndlessMode`, keeping it unreachable in endless sessions.

The HUD adapts in two ways. `setWave(current, total, isEndless)` gains an optional third parameter: when `isEndless && current > 20`, the counter switches from `Wave N / 20` to `∞ Wave N` (or `★ ∞ Wave N` for boss rounds), tinted blue. A `Give Up` button is added to the HUD exclusively in endless sessions via `createGiveUpButton(onGiveUp)`, giving players a graceful exit so they don't have to wait to lose.

`GameOverScene` receives a new `isEndless` flag in its data envelope and uses it to replace the `Waves completed: N / 20` label with `Endless — Wave Reached: N`. Currency earned in endless is `floor(wavesCompleted / 5)`, matching the spirit of the normal formula while scaling to the unbounded wave count. Before displaying the game-over screen, `GameScene.triggerGameOver()` calls `SaveManager.getInstance().updateEndlessRecord(selectedMapId, currentWave)` — an idempotent method that only persists the value when it exceeds the stored record. Stage cards in `MainMenuScene` read this record back and render `∞ Best: Wave N` below the affinity dots when a record exists, giving the player a visible target for the next attempt.

`SaveManager` carries the new `endlessRecords: Record<string, number>` field in its `SaveData` schema. The field back-fills to an empty object from `defaultSaveData()` so existing saves load without a schema version bump. The feature is covered by 23 Vitest unit tests in `src/systems/__tests__/endlessMode.test.ts`, split across three describe blocks: `generateEndlessWave()` scaling arithmetic, `enableEndless()` + `startWave()` integration, and `SaveManager` record persistence. The full suite passes at 438 tests with 0 type errors.

---

## TASK-020 — Wire Commander Ability Effects (2026-03-01)

TASK-020 closes the gap between the Commander system scaffolded in TASK-018 and the live gameplay pipelines. Four aura/ability effects were flagged with state fields but had no downstream effect on damage, targeting, or projectiles. This task wires all four into the combat hot path with minimal surface area.

**Bizhiw aura — projectile speed +25%.** `Projectile.ts` gains an optional `speedMult` field on `ProjectileOptions`; both `update()` movement paths (`chaseCreep` and `moveToPosition`) multiply `speed` by `speedMult ?? 1.0`. `Tower.ts` passes `commanderState.projectileSpeedMult` (default 1.0) into every `ProjectileOptions` construction site — `fireAt()`, `fireTesla()`, cannon execute, and mortar sub-clusters — so the multiplier travels with the projectile rather than being applied globally.

**Makoons aura — sticky target retention.** `Tower` gains a `currentTarget: Creep | null` field. At the top of `findTarget()`, when `stickyTargeting` is active, the method short-circuits and returns `currentTarget` if it is still alive and in range, skipping the priority-sort entirely. This prevents re-acquisition on speed-burst creeps that momentarily leave the priority pool. `commanderDefs.ts` adds the `stickyTargeting` boolean to `CommanderRunState` (default `false`) and sets it to `true` in Makoons's aura `apply()`.

**Animikiikaa aura — Tesla chain AoE.** `fireTesla()` captures `teslaChainAoE` at fire time. Inside the chain-jump `onHit` callback, when the flag is set, a single `Math.hypot` pass over all active creeps applies `chainDmg` to anyone within one tile of the jump target. The check is local to the callback closure; no new methods or fields were needed on `Creep`.

**Makoons ability — ignore armor and immunity.** Rather than threading a parameter through every damage call, `GameScene.create()` publishes `commanderState` on `scene.data` so entities can read it without circular imports. `Creep.takeDamage()` reads `ignoreArmorAndImmunity` and, when set, skips `physicalResistPct` reduction. `Creep.applySlow()` and `Creep.applyDot()` do the same for `slowImmune` and `poisonImmune` respectively, so frost and poison towers punch through Migizi's and Animikiins's natural resistances for the ability's 15-second window.

`GameScene` also publishes `tileSize` on `scene.data` — used by the Tesla AoE path to compute the one-tile splash radius at runtime without hard-coding a constant in Tower.ts. The Tower constructor gains a 10th optional `commanderState` parameter; `GameScene` passes `this.commanderState ?? undefined` when placing towers.

47 unit tests in `src/systems/__tests__/commanderAbilityWiring.test.ts` cover all four effects: baseline (no commander), each effect in isolation, simultaneous activation, and flag-off deactivation. All four AC items are verified programmatically with no Phaser mocks needed — the test suite stubs only the minimal `scene.data` object via a plain `Map`. The full suite runs at 520 tests with 0 type errors.

---

## TASK-019 — Mobile-Friendly Browser Game (2026-03-01)

TASK-019 makes Ojibwe TD fully playable on mobile browsers (iOS Safari, Android Chrome) without pinch-zoom, overflow, or tiny tap targets.

**Viewport and CSS overhaul.** The `index.html` viewport meta tag gains `maximum-scale=1.0, user-scalable=no` to lock the zoom level and prevent the iOS double-tap zoom. The body styles are restructured so `html` and `body` both carry `width: 100%; height: 100%; overflow: hidden` — eliminating any stray scroll bars — while `#game-container` takes over the full `100%` fill. The legacy `min-height: 100vh` on body is removed because `#game-container` now owns the layout. The `canvas` element receives `touch-action: none`, which prevents the browser from intercepting scroll/pinch gestures before Phaser sees them.

**Phaser Scale.FIT already in place.** `main.ts` configured `Phaser.Scale.FIT` with `autoCenter: Phaser.Scale.CENTER_BOTH` from the outset, so the 1280×720 canvas letter-boxes cleanly into any phone viewport. The CSS changes above ensure the container fills the viewport so Phaser has the full screen to scale into.

**Touch input.** Phaser's `pointerdown` / `pointerup` events unify mouse and touch natively — no mouse-only guards existed in placement or selection code, so touch just works. Tower panel buttons are 52 px (game-coordinate), which exceeds the 44 px minimum tap target. Offer cards already use full-container hit areas. The on-screen Start Wave and Pause buttons are Phaser text objects, always visible regardless of keyboard availability.

**Mobile compatibility test suite.** `src/systems/__tests__/mobileCompat.test.ts` adds 15 Vitest unit tests that guard against future regressions. The suite validates: button sizes meet the ≥44 px minimum; panel height proportions leave ≥50 % of the canvas for gameplay; scale-factor arithmetic confirms buttons remain physically tappable on iPhone SE (375 × 667); and boundary cases (zero viewport, non-integer constants) are handled cleanly. Constants are mirrored from the UI source files — because those import Phaser and cannot load in jsdom — with inline comments directing future editors to keep them in sync. The full suite passes at 488 tests with 0 type errors.

---

## TASK-017 — Story Progression & Lore System (2026-03-01)

TASK-017 gives Ojibwe TD a narrative soul. The mechanics have always been solid; this task provides the reason they matter — a four-act Ojibwe story told through brief inter-wave vignettes and a persistent Codex that unlocks as the player explores the world.

**Narrative framework.** All story content lives in two data files: `src/data/vignetteDefs.ts` (16 authored vignettes across four acts) and `src/data/codexDefs.ts` (20+ entries across four sections — Beings, Places, Commanders, and Teachings). Adding new story beats requires no code changes; authors append a `VignetteDef` or `CodexEntry` object and the runtime handles the rest. Every entry carries a `reviewed` flag so the creator (who is Ojibwe) can track which content has been reviewed before it ships publicly.

**VignetteManager.** The 90-line `src/systems/VignetteManager.ts` singleton manages per-run deduplication. Vignettes fire at most once per run per trigger — retrying a stage does not replay already-seen vignettes. `TriggerType` covers the full lifecycle: `WAVE_START`, `WAVE_COMPLETE`, `BOSS_KILLED`, `BOSS_ESCAPED`, `STAGE_COMPLETE`, `COMMANDER_UNLOCKED`, and `FIRST_PLAY`. The manager queries `SaveManager` to determine which vignettes have been seen before, and emits them to the overlay without holding any Phaser references.

**VignetteOverlay.** The 231-line `src/ui/VignetteOverlay.ts` renders during the between-wave window — after the offer screen closes but before wave start. It draws a semi-transparent dark panel in the bottom third of the screen with a portrait placeholder on the left and animated text on the right. Text reveals one character at a time at ~30 ms/char (typewriter effect); a tap skips to full reveal. First-time vignettes include a 1.5-second "hold to skip" delay to prevent accidental dismissal. All vignettes can be replayed from the Codex after the first viewing.

**CodexScene.** The 337-line `src/scenes/CodexScene.ts` is accessible from `MainMenuScene` and the run-complete screen. It presents four tab sections (Beings, Places, Commanders, Teachings); locked entries show their title but not their contents. The scene is fully offline — all content is bundled, no external fetches. A notification badge on the Codex button in `MainMenuScene` indicates newly unlocked entries since the player last visited. `SaveManager` persists seen vignette IDs and unlocked codex entry IDs across sessions via two new fields (`seenVignetteIds`, `unlockedCodexEntryIds`) that back-fill from `defaultSaveData()` so existing saves are unaffected.

**Campaign arc.** The four acts follow the land's disturbance and restoration: Act 1 (*Zaaga'iganing* — The Arrival) frames the threat; Act 2 (*Mashkiig* — Wetlands) reveals that Waabooz is a displaced spirit, not an enemy; Act 3 (*Mitigomizh* — Savanna) introduces Animikiins as an omen rather than an adversary; Act 4 (*Biboon-aki* — Winter Lands) offers two ending variants — a hopeful resolution for a clean run (no lives lost) and a bittersweet but valid one for a run where lives were sacrificed. Neither is framed as a "bad" ending. Throughout, creeps are displaced spirits and animals out of balance, not invaders; the player is restoring harmony, not conquering.

**Integration.** `GameScene` calls `vignetteManager.checkTrigger(TriggerType.WAVE_START, ...)` and `TriggerType.WAVE_COMPLETE` at the appropriate points in the wave lifecycle; boss-kill and boss-escape events are connected via the existing `creep-killed`/`creep-escaped` scene events. `MainMenuScene` gains a CODEX button with a badge driven by `SaveManager.getNewCodexEntryCount()`. 56 Vitest unit tests in `src/systems/__tests__/storyProgression.test.ts` cover the VignetteManager trigger logic, per-run deduplication, SaveManager persistence, and CodexScene entry unlock states. The full suite passes at 529 tests with 0 type errors.

---

## TASK-041 — Logo & Page Layout Redesign (2026-03-01)

TASK-041 transforms the bare-bones HTML shell into a cohesive branded experience. Previously the game was a white page with a Phaser canvas dropped in; now the entire browser window is part of the visual design.

**HTML shell restructure.** `game/index.html` gains a `<header id="game-header">` containing an `<img>` for the transparent Ojibwe TD logo PNG. Phaser mounts into a dedicated `<div id="game-container">` below the header rather than directly on `document.body`. The structure mirrors the design sketch from the task spec: a centred logo header at the top, then the full canvas below it.

**CSS layout.** A new `game/src/style.css` (linked from `index.html`) sets `body` and `html` to `height: 100%; overflow: hidden; background: #0d1208` — the dark forest green that makes the logo's transparent background read correctly. The header is centred with `display: flex; justify-content: center; align-items: center; padding: 12px 0`. The logo scales responsively via `max-width: min(520px, 90vw); height: auto`, never clips on narrow viewports (≥ 320 px), and never triggers a horizontal scrollbar. `#game-container` takes `flex: 1` in a column flex layout so it fills all viewport height below the header via `calc`.

**Phaser config update.** `game/src/main.ts` now points `parent: 'game-container'` and sets `backgroundColor: '#0d1208'` so there is no white flash before BootScene fires. The Scale Manager remains `Phaser.Scale.FIT` with `autoCenter: Phaser.Scale.CENTER_BOTH`, so the canvas letter-boxes cleanly within the container at any window size.

**MainMenuScene title removed.** The large in-canvas "OJIBWE TD" text title is hidden — the HTML header logo now handles branding so there is no double title. `BootScene.preload()` still loads the `logo` texture key for potential in-game use (loading screen watermark etc.).

**Test coverage.** `src/systems/__tests__/pageLayout.test.ts` adds 14 Vitest unit tests validating: logo `max-width` expression, responsive scaling constants, `game-container` flex behaviour, Phaser parent ID, background colour consistency, and no-overflow layout properties. `src/systems/__tests__/mobileCompat.test.ts` is extended with 15 tests confirming touch-action and viewport constraints remain intact alongside the new header layout. The full suite passes at 605 tests with 0 type errors.

---

### TASK-039 — Replace Hacker-Green Palette with Natural Ojibwe Colours

The UI had an unintentional "90s hacker terminal" aesthetic: electric greens (`#00ff44`, `#00ff88`), near-black backgrounds (`0x0a0a0a`), and monospace fonts throughout. The generated art draws on a warm Northern Ontario palette — forest greens, granite greys, lake blues, marsh tones — making the mismatch jarring. TASK-039 reconciles the two.

**Palette module.** A new `src/ui/palette.ts` exports a single `PAL` constant object containing every colour used across the UI. Numeric hex values cover scene backgrounds and Phaser graphics fills; string hex values cover Phaser text styles. This makes future palette adjustments a one-file edit. Key mappings: primary accent moves from neon `#00ff44` to marsh green `#6B8F3E`; secondary accent from `#00ff88` to lake blue `#4A7FA5`; backgrounds from near-black `0x0a0a0a` to deep forest `0x0d1208`; economy gold from `#ffcc00` to autumn gold `#c8952a`; danger from `#ff4444` to ember red `#b84c2a`. The Medicine Wheel colours on the Aura tower are left as culturally specified.

**Systematic replacement.** Every hard-coded hex literal across nine UI files is replaced with the corresponding `PAL.*` reference: `MainMenuScene.ts`, `GameScene.ts`, `BetweenWaveScene.ts`, `GameOverScene.ts`, `HUD.ts`, `TowerPanel.ts`, `VignetteOverlay.ts`, `BossOfferPanel.ts`, and `UpgradePanel.ts`. The `fontFamily: 'monospace'` override is removed where it appeared; scene text now inherits the `Georgia` serif set in the Phaser game config, giving headers a warmer, less terminal feel.

**Test coverage.** `src/systems/__tests__/palette.test.ts` adds 26 Vitest tests verifying: all required keys are present in `PAL`, numeric values are valid 24-bit integers, string values are valid CSS hex colours, contrast ratios meet the 4.5:1 WCAG AA threshold for primary text against panel backgrounds, and Medicine Wheel colours are unchanged from their culturally specified values. The full suite passes at 617 tests with 0 type errors.

---

### TASK-044 — Medicine Wheel Favicon & Game Asset Integration

The browser tab for Ojibwe TD was displaying a generic Vite favicon, which gave no visual identity to the game when multiple tabs were open. TASK-044 replaces it with the Medicine Wheel SVG that was already present in the public assets but unused by the HTML shell.

**Favicon wiring.** `game/index.html` received a `<link rel="icon" type="image/svg+xml" href="/assets/ui/medicine-wheel.svg">` tag, replacing the previous Vite boilerplate favicon reference. The Medicine Wheel's four directional colours — white (North), red (South), black (West), yellow (East) — and gold rim (`#c8a96e`) render crisply at 16×16 px and above directly from the SVG, with no PNG conversion or raster fallbacks needed for modern browsers.

**Test coverage.** `src/systems/__tests__/favicon.test.ts` adds 4 Vitest tests: confirms `index.html` contains the exact SVG favicon `<link>` tag, confirms `medicine-wheel.svg` exists in `public/assets/ui/`, validates the SVG contains the expected structure (xmlns, viewBox) and all five culturally specified colours, and guards against accidental duplicate favicon entries. Because the tests read files from disk via Node's `fs` module, `@types/node` was added as a dev dependency and the test file carries a `/// <reference types="node" />` directive so Node built-ins resolve without polluting the browser-oriented main tsconfig with node globals. The full suite passes at 627 tests with 0 type errors.

---

### TASK-043 — Remove "Placeholder Art" from Main Menu Footer

The footer line at the bottom of the main menu read "Solo Desktop · v0.1.0 · Placeholder Art · Inspired by Green TD". The "Placeholder Art" label was added during early development when the converted WC3 icons were standing in for real art. With Ojibwe-themed assets now integrated — the Medicine Wheel favicon, DALL-E generated UI art, and the culturally grounded palette — the label was no longer accurate and read as an embarrassing disclaimer in a live build.

The fix is a single-line change in `MainMenuScene.createFooter()`: the footer string becomes "Solo Desktop · v0.1.0 · Inspired by Green TD". No functional logic changed, no test data changed, and all 623 tests continue to pass with 0 type errors.

---

### TASK-042 — Tower Panel — Hover Tooltip

Players had no way to evaluate tower choices before committing gold — the bottom panel showed only icon, cost, and a truncated name. TASK-042 adds an information-rich hover tooltip that appears above each tower button when the pointer enters it, and disappears cleanly on pointer-out.

**TowerDef description field.** A new `description: string` field was added to the `TowerDef` interface in `src/data/towerDefs.ts` and populated for all six towers with a short mechanic summary: Cannon ("Single target. High damage, moderate fire rate."), Frost ("Slows targets. Chills stack for a freeze bonus."), Mortar ("Area splash damage. Ignores terrain."), Poison ("Applies damage-over-time. Spreads on creep death."), Tesla ("Chains lightning to up to 3 nearby enemies."), and Aura ("Boosts nearby tower attack speed and damage.").

**Tooltip rendering.** `TowerPanel` now creates a shared set of reusable Phaser `Graphics` and `Text` objects (hidden by default) rather than spawning/destroying DOM elements per hover. On `pointerover`, `_showTooltip(def, bx, panelY)` positions the background rect just above the panel edge, stacks five text rows (name, cost, dmg/interval, range, description), and uses `clampTooltipX()` from a new `src/ui/tooltipFormat.ts` helper to prevent right-edge clipping. On `pointerout`, `_hideTooltip()` hides all objects instantly. A `formatDmgLine()` helper in the same module renders Aura towers as "passive — no damage" rather than showing a misleading "0 dmg" line.

---

### TASK-038 — Wire Generated Assets Into Game UI

The DALL-E pipeline had generated 25 assets — commander portraits, creep sprites, and map tiles — but the game was still rendering coloured rectangles everywhere. TASK-038 wires every asset into the scenes that use it so players see Ojibwe art instead of placeholder geometry.

**BootScene.** Five portrait images (`portrait-nokomis`, `portrait-makoons`, `portrait-waabizii`, `portrait-bizhiw`, `portrait-animikiikaa`), eight creep sprites (`creep-normal`, `creep-fast`, `creep-armored`, `creep-immune`, `creep-regen`, `creep-flying`, `creep-boss`, `creep-boss-mini`), and four map tiles (`tile-tree`, `tile-brush`, `tile-rock`, `tile-water`) are now loaded alongside the existing icon textures in `BootScene.preload()`.

**Creep sprites.** `Creep.ts` replaces its tinted `Graphics` rectangle with a `Phaser.GameObjects.Image` sized to 44×44 px. A `CREEP_SPRITE_KEYS` map exported from `WaveManager.ts` translates each creep-type key (grunt, runner, brute, swarm, scout, flier) to the matching texture key; the map is passed into `CreepConfig` at spawn time and forwarded to the `Creep` constructor. The tint-on-hit flash is preserved by calling `setTintFill(0xffffff)` on the image for 80 ms, then `clearTint()`.

**Commander portraits.** `CommanderSelectScene` replaces the coloured rectangle placeholder with a 96×96 `Phaser.GameObjects.Image` keyed by `portrait-${commander.id}`. `VignetteOverlay` similarly swaps its letter-icon rectangle for the portrait image when the texture key exists, with a graceful fallback to the letter icon if it does not.

**Map tiles.** `GameScene.renderMap()` renders each non-path tile as a `Phaser.GameObjects.Image` using `tile-${tileType}` as the key; the image is scaled to match the grid cell size so it replaces the coloured rectangle exactly.

**HUD.** The commander portrait displayed in the HUD was already using a `Graphics` rectangle; it now renders via `Phaser.GameObjects.Image` using `portrait-${commander.id}`, keeping the same 40×40 display size.

**Test coverage.** `src/systems/__tests__/towerTooltip.test.ts` adds 12 Vitest tests covering: `clampTooltipX` keeps the tooltip inside the viewport at both edges, `formatDmgLine` formats normal and Aura towers correctly, all six `TowerDef` exports carry a non-empty `description`, and the `description` field is a valid string. Two pre-existing quality issues were also resolved: the `layoutContract.test.ts` logo max-width assertion was updated to match the actual CSS value (`min(320px, 70vw)`), and `@types/node` was added to the compiler `types` array in `tsconfig.json` so the `favicon.test.ts` Node.js imports resolve cleanly under `tsc --noEmit`. The full suite passes at 639 tests with 0 type errors.

---

### TASK-037 — Boss Waves — Escort Creep Spawns

Boss waves previously spawned only the boss itself (`totalToSpawn = 1`), leaving the player with no creeps to kill for gold or synergy procs during the game's most dramatic moments. TASK-037 adds configurable escort packs so every boss arrives flanked by a wave of normal creeps, letting kill-gold income, Poison spread, Waabizii heal procs, and Supply Cache counts all fire naturally.

**WaveDef extension.** The `escorts` field was added to the `WaveDef` interface: `count` (how many escort creeps), `types` (pool of creep-type keys drawn uniformly), `intervalMs` (gap between spawns), and an optional `delayMs` (default 1200 ms — just after the boss appears). The field is optional so non-boss waves are completely unaffected.

**WaveManager logic.** `startWave()` now calls the new `buildEscortQueue(waveDef, escorts)` helper when `waveDef.escorts` is present. The helper applies the same HP/speed scaling used for normal creeps on that wave number, drawing creep types uniformly from the provided pool and silently skipping any unrecognised type keys. `totalToSpawn` is set to `1 + escortQueue.length` so the settled counter naturally waits for both the boss and every escort before emitting `wave-complete`. Escorts spawn via two new timer fields — `escortDelayTimer` fires once after `delayMs` to spawn the first escort, then `escortTimer` repeats at `intervalMs` for the remainder. Both timers are destroyed in `cleanup()` to prevent memory leaks between scenes.

**Four named boss waves updated.** Wave 5 (Makwa): 6× grunt escorts at 1400 ms interval. Wave 10 (Migizi): 8× runner escorts at 1000 ms interval. Wave 15 (Waabooz): 10 escorts mixing brute and grunt types at 1200 ms interval. Wave 20 (Animikiins): 8 escorts mixing scout and runner types at 1000 ms interval.

**Endless mode auto-escorts.** `generateEndlessWave()` now attaches an escort pack to every endless boss (waves 25+): `count = 4 + floor((waveNum − 25) / 5)`, drawing from runner and brute types at a 1000 ms interval. This means the escort pack grows by one creep for every five endless waves, keeping boss encounters progressively more intense without any manual data entry.

**Test coverage.** `WaveManager.boss.e2e.test.ts` was extended with new assertions confirming that a boss wave with escorts fires `wave-complete` only after all escorts are settled (killed or escaped), that `totalToSpawn` reflects the escort count, and that endless boss waves auto-generate escort packs of the correct size. `endlessMode.test.ts` likewise gains assertions on escort scaling at wave 25, 30, and 35. The full suite passes at 672 tests with 0 type errors.

---

### TASK-036 — GitHub README for Ojibwe TD

The repo finally has a front door. `README.md` was added at the repository root to give any visitor a clear picture of what Ojibwe TD is, how to run it, and why it exists.

**Structure.** The README opens with the game name and a single-line tagline, followed by a screenshot placeholder and three shields (Phaser 3, TypeScript, Vite). A "What is this?" paragraph explains the Green TD lineage, the roguelike layer, and the Ojibwe/Anishinaabe roots — giving full credit to the original Green TD creators while making clear this is a clean-room reimplementation. A feature table lists all six tower archetypes and every major system, distinguishing shipped features (✅) from planned ones, so the table is honest rather than aspirational. The getting-started section covers the four-command local setup (clone → `cd game` → `npm install` → `npm run dev`) with a direct link to `localhost:5173`. A short asset-generation blurb points to `docs/asset-generation.md`. The contributing section explains the `tasks/` directory structure and the orchestrator workflow so external contributors know exactly where to start. The credits section honours the original Green TD map and includes a cultural acknowledgment of the Ojibwe/Anishinaabe heritage behind the project name.

**Tone.** The README is warm and direct — this is a personal passion project, and the writing reflects that without being self-indulgent. It stays under 75 lines, favours quality over length, and avoids internal paths or tooling details that would only confuse outside readers.

---

### TASK-046 — Natural Map Terrain — Replace Tiled Icons with Procedural Landscape

The map background was an eyesore: four tile icons (`tile-tree.png`, `tile-brush.png`, `tile-rock.png`, `tile-water.png`) stamped in a mechanical `index % 4` repeating pattern across every buildable cell. Every tile was a full-size icon — like wallpaper, not a landscape. TASK-046 replaces this entirely with a procedural terrain renderer that produces a genuine Northern Ontario landscape viewed from above.

**TerrainRenderer module.** A new `src/systems/TerrainRenderer.ts` exports the `renderTerrain(scene, map, mapId, season)` function, the four seasonal palettes, and all internal drawing helpers as named exports so they can be unit-tested in isolation. The renderer uses exactly two `Phaser.GameObjects.Graphics` objects — one for the base tile layer and one for decorations — both set to depth 0 so towers, creeps, and projectiles render on top. No individual game objects are created per tile.

**Base tile layer.** Buildable tiles (TILE=0) are filled with a per-tile colour derived from the season palette (`summer`: warm mossy green `0x2a3a1a`, `spring`: fresh green `0x1e3518`, `autumn`: golden-brown `0x3a2a10`, `winter`: pale blue-grey `0xb0bcc8`). Each tile gets a slight brightness noise (`±10%`) using a `posHash()` function seeded by map ID and tile position — so the same map always looks identical but adjacent tiles vary subtly. Faint grid lines (alpha 0.2–0.25) mark tile boundaries without visually dominating the playfield. Path tiles render as worn dirt-trail with a lighter centre strip and darker edges, conveying a natural worn path rather than a uniform block.

**Decorative scatter layer.** Decorations are drawn on top of the base layer using the same Graphics object. Three decoration types are scattered across buildable tiles: conifers (triangular canopy + trunk, 10–15% density, biased toward map edges and tiles adjacent to the path), rock clusters (irregular grey shapes, ~5% density, biased to corners), and grass tufts (short strokes, ~8% density near path). Each decoration type has its own `salt` input to `posHash()` so their distributions are independent. A density bias toward the outermost two rows/columns creates a "clearing in the forest" feel — the playfield reads as open ground framed by dense tree cover. Decorations are never placed on path tiles and are suppressed within one tile of the spawn and exit waypoints.

**Seasonal variation.** The four `SeasonalTheme` values drive distinct palettes: summer uses dark green conifers; spring has bright fresh green trees and blue-tinted wet-patch accents; autumn replaces conifers with orange-red deciduous tree circles; winter renders pale snow ground, bare grey branch-tree silhouettes, and bright snow-patch overlays. The `accentOverlay` palette field lets spring and winter paint a translucent wash over a percentage of buildable tiles for wet-ground and snow-patch effects respectively.

**GameScene wiring.** `GameScene.renderMap()` no longer stamps tile images — the four old `Image` create calls are removed. Instead it calls `renderTerrain(this, this.mapData, this.selectedMapId, stageTheme)` once after the path Graphics draw. The old `TILE_KEYS` array and `TILE_SIZE_SCALE` constant are deleted.

---

### TASK-049 — Creep Directional Sprites — Face Movement Direction

Creeps previously looked identical no matter which direction they were heading — a blob marching left looked the same as one marching right or charging down the screen. TASK-049 gives every creep a sense of orientation and life.

**Direction detection.** A new `CreepDirection` type (`'left' | 'right' | 'up' | 'down'`) and a pure `computeDirection(dx, dy)` function were added to `src/data/pathing.ts`. The rule is simple: whichever axis has greater absolute magnitude wins; ties go horizontal; the zero-vector defaults to `'right'`. `Creep.ts` imports this and sets the initial direction in the constructor from the first waypoint segment, so creeps face the right way the instant they spawn. Each `step()` call recomputes direction from the current movement vector and calls `updateDirectionalVisual()` only when the direction actually changes — keeping per-frame work to a minimum.

**Shape variation.** Rather than just flipping a texture, `updateDirectionalVisual()` reshapes the procedural body rectangle: horizontal movement produces a wide, low silhouette (`30×18 px`); vertical movement produces a tall, narrow one (`18×30 px`). Boss creeps scale up proportionally (`56×36` / `36×56`). The HP bar and body image are repositioned to stay centred after the resize. This gives the battlefield a genuine readability improvement — a column of creeps marching downward looks visually distinct from one streaming to the right.

**Armour badge.** Armoured creeps gained a small rectangular badge (`8×4 px`, silver-blue `0xaaaacc`) that tracks the creep's leading edge. `computeArmorBasePos()` places it just ahead of the body in the current direction; it is refreshed on every direction change so the badge always sits at the "front" regardless of whether the creep is heading left, right, up, or down.

**Bobbing animation.** A sine-wave bob is applied to the body Y offset every frame: amplitude ±1.5 px, frequency proportional to effective move speed via `BOB_FREQ_FACTOR = 0.157 rad·s/px` (giving roughly 2 Hz at the 80 px/s base speed). The phase accumulates continuously so the animation never resets or jumps. Faster creeps and hasted creeps bob more quickly; slowed/frozen creeps naturally bob slower because effective speed is reduced. The HP bar and armour badge bob in unison with the body.

**Tests.** Twenty-three unit tests in `src/systems/__tests__/creepDirection.test.ts` cover: `computeDirection` for all eight quadrants, the tie-breaking and zero-vector edge cases; initial direction at spawn; direction change on the first `step()`; body dimensions per direction for normal and boss creeps; armour badge position per direction; and bob amplitude staying within the declared bound.

**Test coverage.** `src/systems/__tests__/TerrainRenderer.test.ts` adds 33 Vitest tests: `mapIdToSeed` returns consistent values, `posHash` is deterministic and distributed, `shiftBrightness` clamps at 0 and 255, every `PALETTES` season entry contains all required fields with valid colour values, `hasAdjacentPath` and `isNearSpawnOrExit` guard correctly, and a `buildTestMap()` integration helper validates that `renderTerrain` calls Graphics methods without throwing. The full suite passes at 705 tests with 0 type errors.

---

### TASK-047 — Tower Attack Type Visuals — Distinct Projectile & Effect Styles

Every tower previously fired the same generic coloured dot. TASK-047 gives each archetype a unique attack identity — so a player can read the battlefield at a glance without hovering over anything.

**towerKey propagation.** A new optional `towerKey` field was added to `ProjectileOptions`. Every call-site in `Tower.ts` that constructs a `Projectile` now passes `towerKey: this.def.key`, and the mortar cluster sub-projectile hard-codes `towerKey: 'mortar'`. This single string is all the visual layer needs to branch on — no extra data structures.

**Trail system.** `Projectile.step()` accumulates a `trailTimer`; when it reaches `TRAIL_INTERVAL_MS` (30 ms) it calls `emitTrailParticle()`, which spawns a 2 px `Circle` at the current projectile position, tinted to the tower's trail colour (`cannon` = sandy `0xbbaa88`, `frost` = ice-blue `0x88ccff`, `mortar` = orange `0xee7700`, `poison` = green `0x44ff88`), and immediately starts a 180 ms alpha-fade tween to `destroy`. Tesla and aura are excluded — they have no travelling projectile. The trail particles sit on depth 18, just below the projectile (depth 20), so they naturally trail behind.

**Impact effects.** `showImpactEffect()` is called at the moment of damage — from `hitCreep()` for target-tracking shots and from `arriveAtPosition()` for fixed-position shots. Each tower type gets a distinct treatment: **Cannon** scatters five dust-coloured particles outward in a random radial burst (150 ms); **Frost** expands a crisp ice-blue ring (`3.5×` scale, 180 ms) plus a four-stroke sparkle cross that fades independently (160 ms); **Mortar** fans six orange debris shards in evenly-spaced directions with a random jitter offset (200 ms, building on the existing splash-radius ring from `splashVisual()`); **Poison** drops four randomised green blobs around the impact point with a 100 ms linger delay before fading (a deliberate DoT visual cue — the blobs hang in place a beat after the hit).

**Tesla lightning arc.** Tesla has no visible projectile — the `Arc` is hidden with `setAlpha(0)` in the constructor when `towerKey === 'tesla'`. On `hitCreep()` the new `drawLightningArc()` helper is called with the stored spawn position (the tower center) and the creep position. It draws a jagged four-point polyline through two randomised mid-segment offsets (±18 px, independent on each axis), renders in white at 0.9 alpha on depth 30, and fades out in 150 ms. Chain-hit chain arcs reuse the same helper from `Tower.ts`.

**Mortar arc tween.** Mortar shells gain a scale-over-distance animation: on the first `stepToPosition()` call after construction, the initial distance to the target is recorded as `mortarInitDist`. Each subsequent frame `t = 1 − (remainingDist / initDist)` is mapped through `sin(t × π)`, giving a bell curve that peaks at `scale 1.55` at mid-flight and returns to `1.0` just before impact (where scale is explicitly reset to prevent sub-pixel artifacts). The effect reads as a visual lob arc without requiring a separate Phaser tween.

**Aura dual-ring pulse.** The previous single-ring aura pulse (`auraPulseRadius` climbing linearly from 0 to `range`) was replaced with a phase-based dual-ring system. `auraPulsePhase` advances at 0.35 cycles/s and wraps at 1. Two rings are drawn half a cycle apart (`phase` and `phase + 0.5`): each ring's radius is `phase × range` and its alpha follows `sin(phase × π) × 0.45` — a bell curve that fades naturally at both ends and peaks near mid-travel. The result is a smooth, continuous outward-pulse feel rather than a hard reset every ~1.8 s.

**Tests.** Forty-one unit tests in `src/systems/__tests__/attackVisuals.test.ts` cover all pure-logic formulas: trail colour lookups (including unknown key fallback), trail emission timing at 30 ms boundary, trail-life alpha decay formula, mortar scale bell curve (0 at launch, peaks at mid, back to 0 at landing, clamped below 0), frost burst and dust puff particle counts, poison splatter linger delay, tesla arc jitter bounds, aura dual-ring phase advancement and wrap, and the "max active trail particles" cap calculation.

---

### TASK-048 — Visual Clarity Audit — Ensure Assets Don't Obscure Gameplay

As procedural terrain, decorations, and richer attack visuals accumulated, there was a latent risk that decorative layers could visually compete with gameplay-critical elements — health bars, range circles, placement previews, and the creep path itself. TASK-048 audited every visual layer and established a strict depth hierarchy that every future feature must respect.

**Depth hierarchy formalised.** Three named constants were exported from `TerrainRenderer.ts`: `TERRAIN_BASE_DEPTH = 0` (ground fills), `TERRAIN_DECO_DEPTH = 1` (trees, rocks, grass tufts), and `TERRAIN_PATH_DEPTH = 2` (path fills + edge borders). The critical insight here is that path rendering was moved *above* decorations — previously a tree tuft on an adjacent tile could partially overlap the path edge, making the trail harder to read. Spawn/exit markers were promoted to depth 3, range circles and placement previews to depth 5, towers remain at 10, creeps at 15, projectiles at 20, and UI panels at 30+.

**Path layer split.** `renderTerrain()` was refactored from two Graphics objects to three. The base layer (depth 0) now only fills ground tiles; path tiles are skipped entirely. A new path layer (depth 2) handles path fills and the edge-contrast border lines. This separation guarantees terrain decorations at depth 1 can never draw over the path regardless of tile ordering.

**Range circles — 2 px stroke, higher alpha.** All tower range rings were widened from 1 px to 2 px and their alpha raised from 0.25 to 0.35. The increase is enough to ensure the ring reads clearly against the darkest winter ground and dense tree cover without feeling heavy.

**Placement preview — alpha 0.5 ghost.** The placement marker fill alpha was raised from 0.2 to 0.5 (both valid and invalid states), matching the spec's "clearly visible semi-transparent ghost" requirement. The range preview ring during drag also moves to depth 5 and adopts the 2 px line width for consistency with the selected-tower ring.

**HP bar colour gradient.** A new pure utility module `src/systems/visualUtils.ts` provides `hpBarColor(pct)`, which maps a health fraction to a smooth green → yellow → red transition using separate linear ramps on each half. Boss creep bars use a fixed deep-ember colour (`0xc0501e`) for instant threat recognition rather than following the gradient. Both normal and boss bars now update on every `takeDamage()` call rather than only tracking width.

**Debug decoration toggle.** `renderTerrain()` was updated to return `{ decoGfx }`, a reference to the decoration graphics layer. In dev builds, pressing `D` in GameScene calls `decoGfx.setVisible(!visible)` — toggling all trees, rocks, and grass tufts off so developers can verify that the gameplay layers (path, range rings, creeps, projectiles) are fully readable in isolation. Vite dead-code elimination strips this branch in production.

**Tests.** Nine unit tests in `src/systems/__tests__/visualClarity.test.ts` cover `hpBarColor`: pure green at full HP, yellow at half, red at zero, orange-ish at 0.25, yellow-green at 0.75, clamping above 1 and below 0, blue channel always 0, and a monotonicity check confirming the green channel only increases as HP rises. The `TerrainRenderer.test.ts` suite was updated to verify the new three-Graphics return shape and that `decoGfx` is a real object. All 748 tests pass; 0 type errors.

---

### TASK-052 — Wave Announcement Banners — Pre-Wave Intel & Warnings

Players had no advance warning of what was coming next — waves just started and you reacted. TASK-052 introduces a full announcement system so players can read the upcoming threat and adjust their strategy before the first creep spawns.

**`WaveManager.getWaveAnnouncementInfo()`** is the data layer. It inspects the next wave definition and returns a `WaveAnnouncementInfo` object containing: `waveNumber`, `waveType` (`ground | air | mixed | boss`), `traits` (inferred from creep pool composition — "Armoured", "Fast", "Swarming", "Immune to Slow", "Splits on Death", "Regenerating", "Poison Immune"), `creepCount`, `isBoss`, `bossName`, `bossAbility`, and `escortCount`. Wave type is inferred by scanning the pool against the creep-type registry; unknown keys fall back gracefully via an `AIR_KEYS` set. Boss metadata is pulled from `BOSS_DEFS` so display names like "Makwa", "Migizi", "Waabooz", and "Animikiins" are rendered correctly.

**`WaveBanner`** (`src/ui/WaveBanner.ts`) is the Phaser display layer. A 540×84 px `Container` slides in from above the HUD on a `Cubic.Out` tween (280 ms), holds for 1 800 ms, then yoyo-slides back out — all durations divided by the current speed multiplier so 2× speed means a proportionally snappier banner. Normal waves show a left-aligned "WAVE N" heading, a colour-coded type badge (earthy green for ground, sky blue for air, split half-and-half for mixed), a trait sub-line, and a right-aligned creep count. Mixed badges are drawn as two rectangles side by side rather than a single fill to achieve the split-colour look. Boss waves switch to a centred ember-red "⚠ BOSS INCOMING — NAME ⚠" heading with stroke outline, trait and escort-count sub-line, a wave-number chip in the corner, a camera shake (`cameras.main.shake(280, 0.004)`), and a four-pulse screen-edge red border. A first-air-wave callout ("NEW: AIR WAVE — Tesla & Frost only!") is shown once per run in bright blue. The banner sits at depth 200 — above HUD (100) and vignette overlays (150), below any between-wave overlay (299).

**GameScene wiring.** `WaveBanner` is instantiated in `GameScene.create()`. A `firstAirWaveShown` flag is set to `false` on init and flipped on first display. The banner fires in `startNextWave()` immediately before spawning: `getWaveAnnouncementInfo(nextWave)` is called, and if the result is non-null, `waveBanner.show()` is invoked passing the current `speedMultiplier`. Subsequent `onWaveComplete()` logic is unchanged. The banner is destroyed in `shutdown()`.

**AudioManager integration.** Three new synthesis methods were added to `AudioManager`: `playWaveWarning()` (short percussive drum roll for normal waves), `playAirWaveWarning()` (wind-swoosh via a BiquadFilter frequency sweep), and `playBossWarning()` (deep two-tone horn using two oscillators detuned apart). Each is called from `GameScene.startNextWave()` after the banner is shown, branching on `info.isBoss` and `info.waveType`. Three corresponding tests were added to `AudioManager.test.ts` verifying that each method creates oscillators and triggers the gain envelope correctly.

**Tests.** Twenty-five unit tests in `src/systems/__tests__/waveAnnouncement.test.ts` cover the full `getWaveAnnouncementInfo()` surface: null for out-of-range wave numbers, ground/air/mixed/boss type inference, Armoured/Fast/Swarming trait detection, multi-trait combinations, boss metadata (name, ability, escortCount), Makwa/Migizi/Waabooz/Animikiins special traits, graceful degradation for unknown creep keys, and AIR_KEYS fallback. All 819 tests pass; 0 type errors.

---

### TASK-051 — Air & Ground Combat System — Flying Creeps, Tower Targeting Domains

All creeps were previously ground-based and all towers hit everything — there was no reason to diversify tower composition beyond raw DPS optimisation. TASK-051 introduces a **targeting domain** system that makes tower variety strategically necessary.

**Targeting domain on `TowerDef`.** A new `targetDomain: 'ground' | 'air' | 'both'` field was added to `TowerDef` and set on every archetype: Cannon, Mortar, and Poison are `ground` (heavy shells and gas clouds hug the surface); Tesla is `air` (lightning arcs skyward — air-only specialist, damage raised from 35 → 42 to compensate); Frost and Aura are `both` (cold winds and aura fields ignore altitude). `Tower.findTarget()` now filters the candidate creep set against the tower's domain before applying priority logic, so a ground-only Cannon simply cannot see an air creep.

**Air creep domain getter.** `Creep` gains a `get domain(): 'ground' | 'air'` property that mirrors `creepType`. This single-source-of-truth getter is what `Tower.findTarget()` and the new domain-filter tests rely on — no parallel field to keep in sync.

**Air creep visuals.** Air creeps render with a distinct floating treatment: the body sprite is lifted −10 px from the container origin (`AIR_BODY_OFFSET_Y`), a semi-transparent ellipse shadow is drawn at the ground position below it, and two small translucent wing rectangles extend from either side of the body. Boss-sized air creeps use proportionally wider shadow/wing dimensions. The result reads instantly as "airborne" without requiring new sprite assets.

**Frost slow wind-resistance.** Air creeps partially resist slow effects: `applySlowFactor()` now computes `effectiveFactor = 1 - (1 - factor) * 0.5` when `creepType === 'air'`, so a 50% slow (factor 0.5) only reduces an air creep's speed by 25%. This preserves Frost's utility against air while making Tesla + Frost together the correct answer rather than Frost alone.

**HUD air-wave alert.** `HUD.showAirWaveAlert(message)` was added: a small sky-blue text strip that slides in just below the HUD bar when the next wave contains air creeps, and is hidden otherwise. `GameScene` calls this from `onWaveComplete()` by inspecting the upcoming wave's creep pool via a lightweight air-key check — players get a clear warning before spending gold between waves.

**Tower tooltip domain line.** `TowerPanel` shows a new domain line in the hover tooltip using directional symbols: `▼ Ground only`, `▲ Air only`, `◆ Air & Ground`. This is rendered in the secondary-text colour between the range line and the description, so it's visible at a glance without cluttering the panel.

**Map data `airWaypoints`.** `MapData` gained an optional `airWaypoints?: WaypointDef[]` field. When present, air creeps follow the custom air route instead of the default ground waypoints. Both existing maps omit this field, so air creeps use the standard waypoints — ensuring backwards compatibility. The field is ready for map designers to define dedicated air lanes in future maps.

**Tests.** Forty unit tests in `src/systems/__tests__/domain-filter.test.ts` exhaustively cover the domain filtering logic: ground-domain towers only acquire ground targets; air-domain towers only acquire air targets; `both`-domain towers acquire either; `findTarget()` returns null when all in-range creeps are the wrong domain; the Frost slow wind-resistance formula; air-creep `domain` getter; `targetDomain` values on all six tower definitions; and `airWaypoints` presence in `MapData`. All 831 tests pass; 0 type errors.

---

### TASK-050 — Dual Entrance Map — Multi-Spawn Path Convergence

Every map before this task had a single spawn point and a single exit — tower placement was inherently a one-corridor problem. TASK-050 breaks that assumption with **Niizh-miikana** ("Two Paths"), a 32×18 map where creeps enter from the north-west and south-west along separate lanes, converge at a shared chokepoint mid-map, then funnel into a single corridor to the east exit.

**Map data.** `game/public/data/maps/map-05.json` defines the layout with a `waypoints` field that is now an **array of paths** rather than a flat waypoint list: path A descends from row 3, turns south-east, and merges with path B at column 8 row 9; path B climbs from row 14, turns north-east, and meets path A at the same junction. From the convergence the shared lane runs straight east to column 31. The asymmetry — path A is shorter horizontally but path B has a longer southern approach — means waves arrive at the chokepoint slightly staggered, preventing a single instant-saturation moment and rewarding players who place AoE (mortar, tesla) at the junction. Starting gold is 150 (vs the usual 100) to compensate for the two-lane coverage requirement.

**WaveManager multi-spawn support.** `WaveManager` was updated to accept either a flat `Waypoint[]` (backward-compatible, single-path) or a `Waypoint[][]` (multi-path). A normalisation step in the constructor wraps single-path input into `[[...waypoints]]`, so all downstream logic works uniformly against `waypointPaths`. Ground creeps alternate between paths on every spawn — odd creeps take path A, even creeps take path B — via a `spawnPathIndex` counter that resets to zero at the start of each wave. Air creeps always fly the path-A air lane. Boss creeps always spawn on path A for predictability. `spawnOne()` selects the right waypoint array before constructing each `Creep` instance.

**MapData type extension.** `src/types/MapData.ts` gained a union `waypoints: MapWaypoint[] | MapWaypoint[][]` and a pure helper `getWaypointPaths(data: MapData): MapWaypoint[][]` that performs the normalisation in a Phaser-free context. All existing maps pass their flat array unchanged; `GameScene` now calls `getWaypointPaths()` before constructing `WaveManager`, feeding it the resolved multi-path array.

**Stage and unlock registration.** Map-05 is registered in `stageDefs.ts` under the Ashlands region as a 3-star difficulty stage (`niizh-miikana`), with a tower-affinity hint of `tesla + mortar` pointing players toward the chokepoint strategy. An unlock node in `unlockDefs.ts` gates it at 250 crystals, placing it squarely in the mid-tier unlock tier — reachable after a handful of successful runs but not trivially free. `LOCKED_STAGE_IDS` is derived from unlock nodes with `type:'stage'` effects, keeping the stage-locking mechanism consistent with tower/path locking.

**TerrainRenderer spawn markers.** `TerrainRenderer` was updated to render a spawn marker at the first waypoint of *every* path (not just path 0), so both entry points display the visual indicator on the minimap and in-game tile overlay. The existing single-path rendering path is unchanged.

**Tests.** Fifty-two unit tests in `src/systems/__tests__/dualEntranceMap.test.ts` cover: `getWaypointPaths` normalisation (flat array wrapping, multi-path pass-through, edge cases); map-05 data integrity (id, name, tile dimensions, two-path structure, convergence at col 8 row 9, shared corridor to col 31, starting gold ≥ 125); stage registration (region membership, difficulty rating, affinity hint); unlock node existence, cost range, and stage-ID linkage; WaveManager alternation (creeps on path A then B then A again); boss always on path A; air creeps always on air waypoints; and single-path maps being wholly unaffected by the multi-path logic. All 913 tests pass; 0 type errors.

---

### TASK-045 — Stage Completion Moons — Performance Rating

Every TD game does stars. Ojibwe TD does moons — *dibiki-giizis*, the night sun — fitting the Ojibwe night-sky aesthetic and standing apart visually. TASK-045 adds a 1–5 moon performance rating that is calculated at the end of every completed run, displayed on the victory screen, and persisted as a per-stage best in `SaveManager`.

**Rating logic.** `src/systems/MoonRating.ts` exposes a single pure function `calculateMoons(livesLeft, maxLives, wavesCleared, totalWaves): number`. The thresholds are: 5 moons for full health and every wave cleared; 4 moons for losing at most 20% of lives with a full clear; 3 moons for losing at most 50% of lives with a full clear; 2 moons for any full clear; and 1 moon for clearing at least 75% of waves. The module is Phaser-free, depending only on primitive numbers, so it is trivially unit-testable and portable to any future UI layer.

**Persistence.** `SaveManager` gained two new methods: `getStageMoons(stageId): number` and `setStageMoons(stageId, moons): void`. `setStageMoons` is idempotent in the "never regress" direction — it only writes when the new rating strictly exceeds the stored best. Moon data is stored under a `stageMoons` record in the save schema; the field is back-filled with an empty object for saves created before this change, so existing saves are not invalidated and no schema version bump was required.

**Victory screen.** `GameOverScene` was extended to compute and display the moon rating whenever the player wins. A horizontal row of five moon symbols appears prominently — filled moons (🌕) for earned, empty moons (🌑) for unearned — followed by a flavour-text label: "Full Moon!" for 5, "Waxing Gibbous" for 4, "Half Moon" for 3, "Crescent" for 2, and "New Moon" for 1. When the run achieves a new personal best, a "New Best!" indicator is shown alongside the moon row so players get immediate feedback on improvement.

**Main menu stage tile.** `MainMenuScene` reads `getStageMoons()` for each stage card and renders a compact moon row below the stage name. Stages that have never been completed show no moons at all — blank rather than a zero — so the absence of moons communicates "not yet attempted" rather than "failed".

**Tests.** Twenty-nine unit tests in `src/systems/__tests__/MoonRating.test.ts` cover every rating threshold, boundary conditions (exact 20% and 50% life loss, exactly 75% waves), and edge cases (zero lives, zero waves). All 890 tests pass; 0 type errors.

---

### TASK-054 — Creep & Boss Art Assets — Flying Variants, Boss Animal Portraits

Every creep used a generic tinted rectangle or a single shared sprite regardless of its type. The bosses — Makwa (Bear), Migizi (Eagle), Waabooz (Hare), and Animikiins (Thunderbird) — were visually identical except for a colour tint. This task replaced those placeholders with purpose-built sprites that give each unit a distinct visual identity rooted in the Ojibwe animal namesakes.

**Boss portraits.** Four boss sprites were added to `game/public/assets/sprites/`: `boss-makwa.png` (stocky bear silhouette from above, amber/brown), `boss-migizi.png` (spread-wing eagle, golden), `boss-waabooz.png` (compact hare with long ears, pale blue-white), and `boss-animikiins.png` (mythic thunderbird with lightning-energy motif, electric blue). A fifth sprite, `boss-waabooz-mini.png`, replaces the old generic mini-boss used for Waabooz split copies, making the baby-hare copies immediately recognisable as Waabooz offspring rather than unrelated enemies.

**Air creep variants.** The air combat system (TASK-051) introduced `domain: 'air'` creeps but all shared one `creep-flying.png`. Three distinct bird silhouettes now cover each subtype: `creep-air-basic.png` (generic bird, basic flier), `creep-air-scout.png` (sleek hawk/falcon, swift unit), and `creep-air-armored.png` (heavy raven shape, armoured air unit).

**Ground creep refresh.** The five ground-creep sprites were redrawn with naturalistic animal-inspired silhouettes — deer/chipmunk for normal, fox for fast, porcupine/turtle for armoured, ghost-spirit for immune, and salamander for regen — bringing them visually in line with the boss and air art quality.

**Technical wiring.** `BossDef` gained an optional `spriteKey` field; each boss definition now carries its own key (e.g. `'boss-makwa'`). `WaveManager.spawnBoss()` uses `bossDef.spriteKey ?? \`boss-\${bossDef.key}\`` so any future boss automatically gets a predictable fallback without code changes. `WaveManager.CREEP_SPRITE_KEYS` maps `scout` → `creep-air-scout` and `flier` → `creep-air-basic` instead of the shared `creep-flying`. `BootScene.loadAssets()` was updated to load all new keys. `Creep.ts` rendering was adjusted so air creeps using a sprite skip the procedural wing-rectangle fallback (the sprite already contains wings). All 950 tests pass; 0 type errors.

---

### TASK-053 — Audio Generation — Suno Music & Sound Design Pipeline

All game audio was procedurally synthesised — OscillatorNode beeps, chirps, and a simple A2 minor pentatonic arpeggio loop. While functional as a placeholder, the sound was robotic and generic. This task built the full infrastructure to replace procedural audio with Suno-generated music tracks and designed sound effects that honour the game's Ojibwe aesthetic.

**AudioManager file-based layer.** `AudioManager` gained a complete file-based audio layer on top of its existing procedural synthesis. `registerBuffer(key, arrayBuffer)` decodes an audio file asynchronously and stores the result; all existing play methods (`playProjectileFired`, `playCreepKilled`, `startMusic`, etc.) automatically prefer a registered buffer over procedural synthesis, falling back transparently when no file is present. A crossfade mechanism (`startMusicTrack(key, fadeMs?)`) smoothly transitions between named music tracks — menu theme, calm gameplay, intense boss music — using a per-track `GainNode` chain that lets `setMusicVolume()` continue to work correctly during fades. The gain chain is: file-music node → `_fileMusicGain` → `musicGain` → `masterGain` → destination.

**BootScene integration.** `BootScene.loadAssets()` now attempts to load all audio files (16 SFX + 5 music tracks) via Phaser's standard audio loader. A new private `_bridgeAudioToManager()` method runs in `create()` after loading completes: it iterates each key, retrieves the cached `ArrayBuffer` from Phaser's audio cache, and passes it to `AudioManager.registerBuffer()`. Files that are missing or fail to load are silently skipped — Phaser logs a warning but never crashes — so the game runs fully on procedural audio until real audio files are added.

**MainMenuScene music.** `MainMenuScene.create()` now calls `AudioManager.getInstance().startMusicTrack('music-menu')` to play the menu theme as soon as the scene starts. If no `music-menu` buffer has been registered (files not yet present), the call is a no-op and the existing procedural arpeggio continues unaffected.

**Suno prompt archive.** `game/audio/PROMPTS.md` documents production-ready Suno prompts for every planned track — menu theme, gameplay calm, gameplay intense, victory, game over — with style tags, tempo targets, loop guidance, and export settings. `game/audio/SUNO-RESEARCH.md` evaluates unofficial Suno API projects and documents the recommended manual workflow for generating and placing audio files, including volume normalisation and loop-point trimming steps.

**AudioManager test coverage.** The `AudioManager.test.ts` suite was extended to cover the new file-based layer: `registerBuffer` decode-and-store path, graceful skip when `ctx` is null, `startMusicTrack` source creation and crossfade gain ramp, stopping a track with fade-out, and the no-op behaviour when a key is not registered. Total tests: 968 passing, 0 type errors.

---

### TASK-068 — Mobile-Responsive Layout — Detect Mobile, Fix Logo Overlap, Touch-Friendly UI

On mobile browsers the HTML header and logo consumed vertical space that the Phaser canvas needs, and all interactive touch targets were too small for finger taps. This task made the game fully playable on phones and tablets without touching the desktop layout.

**MobileManager singleton.** A new `src/systems/MobileManager.ts` singleton performs mobile detection at startup via `window.innerWidth <= 768 || 'ontouchstart' in window`, sets `window.__OJIBWE_MOBILE` and adds a `'mobile'` CSS class to `document.body`. It listens to `resize` and `orientationchange` events to re-evaluate as the device rotates, and exposes a `particleScale()` helper (returns 0.5 on mobile, 1 on desktop) for throttling particle budgets. All detection is isolated in one place — every other module simply calls `MobileManager.getInstance().isMobile()`.

**HTML and CSS layout.** `index.html` adds the proper `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">` tag, and a `#rotate-prompt` overlay that CSS shows only in mobile + portrait orientation via `@media (orientation: portrait)`. `style.css` uses the `body.mobile` class to hide the game header entirely (`display: none`), switch the container to `height: 100dvh` (dynamic viewport height for iOS Safari's collapsing toolbar), and apply `env(safe-area-inset-*)` padding so content stays clear of notches and home indicators on iPhone. Desktop rules are completely unchanged — no regressions.

**Touch-friendly HUD.** `HUD.ts` exports a `getHudHeight()` function that returns 64 px on mobile and 48 px on desktop; all HUD buttons grow accordingly — speed buttons 48×44 px, the mute button 44×44 px, and the next-wave / give-up buttons all reach the minimum 44 px tap target recommended by Apple HIG and WCAG.

**Touch-friendly tower panel.** `TowerPanel.ts` computes `PANEL_HEIGHT` (88 px mobile / 72 px desktop) and `BTN_SIZE` (64 px mobile / 52 px desktop) at module level from `MobileManager`. Icon sizes increase to 34 px and font sizes scale up by roughly 20 % so labels remain readable at arm's length.

**GameScene mobile adaptations.** `GameScene.ts` imports `getHudHeight()` from `HUD.ts` and removes its previous hard-coded `HUD_HEIGHT = 48` constant. Touch placement uses a long-press gesture — a 400 ms `_startPlacementHold()` timer triggers the placement flow, and `_cancelPlacementHold()` cancels it on pointer-up or if the pointer drifts more than 20 px, preventing accidental tower drops during scrolling. Boss death particles are multiplied by `MobileManager.particleScale()`, and terrain decorations are hidden on mobile to reduce draw calls.

**MainMenuScene scaling.** `MainMenuScene.ts` gained `_isMobile`, `_regionH`, and `_stageH` class fields and a `_fs(n)` helper that applies a 1.35× font multiplier on mobile. All card heights, button heights, and font sizes route through these helpers so the menu remains readable and tappable on a 375 px wide phone in landscape.

**Test coverage.** `MobileManager.test.ts` provides 30 unit tests covering detection logic, body-class toggling, `particleScale()`, resize re-evaluation, and singleton reset. A companion `mobileCompat.test.ts` (15 tests) validates layout-contract constants: `getHudHeight()` and `getPanelHeight()` return the correct values in both mobile and desktop modes, and the minimum tap-target threshold is enforced. Total: 1 006 tests passing, 0 type errors.

---

### Browser Performance Analysis — Profiling, Bottlenecks, Optimization

With 45+ shipped features the game loop had grown organically without a systematic performance audit. TASK-063 produced a static code analysis of every hot-path module, documented in `game/docs/PERFORMANCE.md`, and implemented the two highest-impact optimisations found.

**`SpatialGrid<T>` — O(n²) → O(k) target search.** `Tower.findTarget()` previously iterated the entire active-creep set on every tower step. With 20 towers and 30 creeps this was 600 iterations per frame, or 72 000/s at 2× speed. `SpatialGrid` (cell size 80 px) divides the map into a pre-allocated flat array of cells; `GameScene.update()` rebuilds it in one pass (`clear()` + one `insert()` per creep), then each tower calls `queryRadius()` which scans only the cells whose bounding squares overlap the tower's range circle. For a Cannon (range ≈ 120 px) this is 9 cells containing ≈ 1–2 candidates — roughly a 15× reduction in comparisons. Tower.ts accepts a new optional `queryCreepsInRadius` constructor parameter; GameScene passes a closure over the grid, leaving the slow-path fallback (`getCreeps()`) intact for tests and other scenes.

**`TrailPool` — zero-GC projectile trail particles.** Each projectile emitted a trail particle every 30 ms by calling `scene.add.circle()` (allocates a `Phaser.GameObjects.Arc`) and `scene.tweens.add()` (allocates a `Tween`), both destroyed 180 ms later. At 10+ simultaneous projectiles and 2× speed this was ~40 short-lived allocations per frame, each adding GC pressure. `TrailPool` pre-allocates a fixed pool of `Arc` objects; `emit()` reuses an idle arc (`setActive`/`setVisible`), and `update()` decrements alpha manually each frame — no `Tween` objects, no create/destroy. `Projectile.emitTrailParticle()` reads the pool from `scene.data` via an optional-chaining fast path, falling back to the original tween path in scenes that don't initialise the pool.

**Background-tab throttle.** `main.ts` registers a single `visibilitychange` listener that calls `game.loop.sleep()` on tab hide and `game.loop.wake()` on tab show, stopping the requestAnimationFrame loop while the tab is hidden and eliminating all CPU/battery usage in that state. Phaser's TimeStep clamps the delta on the first wake frame so gameplay does not jump forward.

**FPS config.** `main.ts` now explicitly sets `fps: { target: 60, forceSetTimeOut: false }` in the Phaser config to make the intended frame rate and RAF preference auditable, even though both are Phaser's defaults.

**Test coverage.** `SpatialGrid.test.ts` (12 tests) covers insert, clear, single-cell query, radius spanning multiple cells, and inactive-object filtering. `TrailPool.test.ts` (16 tests) covers pool exhaustion (all slots busy), decay, reuse of expired arcs, and `destroy()` cleanup. Total: 1 004 tests passing, 0 type errors.

---

### Deep Progression — Loot Drops, Tower Gear, Commander Enhancements, Replayability Loop

With the core gameplay loop and meta-progression established, TASK-067 introduced the deepest layer of replayability yet: a full gear-loot system, commander levelling with enhancement slots, and challenge maps that reward skilled play with guaranteed rare drops.

**Gear items and the loot pipeline.** `src/data/gearDefs.ts` defines five rarity tiers — Common, Uncommon, Rare, Epic, Legendary — with weighted drop tables (60/25/10/4/1) and tower-type restrictions so a Frost Sigil can only equip on Frost towers. Each item carries typed `GearStatMods` (damage%, range%, attackSpeed%, splash%, dotDamage%, aura bonuses, and more) plus optional `GearSpecialEffect` entries (crit chance, bouncing shots, freeze pulse on kill, etc.). Items can be enhanced up to +5 levels (costs: 20/40/80/150/300 crystals, each tier scaling base stats by 5%), and rare+ items gain a rune socket whose bonus stacks additively. A `SALVAGE_VALUES` table converts unwanted gear back into shards (5 → 150 by rarity). `src/systems/GearSystem.ts` is the Phaser-free runtime that reads the equip map from `InventoryManager`, resolves every equipped item into a flat `GearBonuses` struct, and returns it to GameScene to apply on tower construction.

**InventoryManager.** `src/meta/InventoryManager.ts` is a singleton (same pattern as SaveManager) with a 50-item cap. It persists via two new SaveManager fields — `gearInventory` (serialised `GearSaveItem[]`) and `gearEquipped` (`EquipMap`) — with schema-version-free back-fill. Each tower type receives two gear slots. Core API: `addItem`, `addItems` (returns overflow), `salvageItem` (adds shards), `equipItem` (validates type restriction + slot index), `unequipItem`, `getEquipped`, `enhanceItem`, `applyRune`, and `clear` for testing. `src/scenes/InventoryScene.ts` and `src/scenes/TowerEquipScene.ts` expose these operations as navigable full-screen UIs.

**Commander enhancement slots.** `src/data/enhancementDefs.ts` defines the commander levelling curve (`xpForLevel(n) = n² × 50`, capped at level 20) and a reward schedule: enhancement slot 1 at level 2, a passive upgrade at level 5, slot 2 at level 8, signature ability at level 10, slot 3 at level 15, and mastery cosmetics at level 20. Post-run XP is awarded proportional to waves cleared, stars earned, and challenge modifier difficulty. `enhancementSlotsAtLevel()` and `isSignatureUnlocked()` are the key query helpers. SaveManager gained a `commanderXp` field (per commander) to persist progress.

**Challenge maps.** Five challenge map JSONs (`challenge-01` through `challenge-05`) sit alongside the standard maps in `public/data/maps/`. `src/data/challengeDefs.ts` defines each challenge via a `ChallengeModifier` interface: banned tower lists, `creepSpeedMult`, `creepHpMult`, `allArmored`, `allAir`, `splitOnDeath` (killed creeps spawn two mini-creeps), per-challenge `waveCount`, and `goldMult`. An `unlockThreshold` gates challenges behind cumulative crystal spend, encouraging progression before tackling hard content. `src/scenes/ChallengeSelectScene.ts` renders the five cards with lock/unlock state and difficulty indicators; `GameScene.init()` accepts a `challengeId` param and applies the modifier to wave generation and creep spawning.

**Loot drops and the post-run loop.** `GameScene` tracks a `pendingLoot: GearInstance[]` array that accumulates drops during the run — boss kills roll 1–2 items with rarity boosted one tier, milestone waves roll 1 item at standard weights, and challenges guarantee at least one Rare+ drop. `GameOverScene` was substantially extended: it renders the loot-drop panel (item cards with rarity colour, stat summary, and equip/salvage buttons), posts XP to the active commander, and calls `InventoryManager.addItems()` with overflow items auto-salvaged for shards. This creates a tight loop — finish a run, receive gear, equip it in `TowerEquipScene`, return to map selection with meaningfully stronger towers.

**Test coverage.** `src/systems/__tests__/gearSystem.test.ts` (46 tests) verifies stat accumulation, enhance scaling, rune stacking, type-restriction enforcement, and empty-inventory fast path. `src/systems/__tests__/inventoryManager.test.ts` (54 tests) covers add/overflow, salvage shard accounting, equip/unequip slot management, enhance cost gating, and persistence round-trips. Total: 1 134 tests passing, 0 type errors.

---

### Keyboard Shortcuts — Pause, Speed, Deselect, Tower Hotkeys

Desktop players previously had no keyboard controls whatsoever — every action required a mouse click. TASK-060 wired a complete shortcut layer into GameScene without disrupting the existing click-based flow.

**Core shortcuts.** Space toggles pause/unpause, saving the active speed into `_prePauseSpeed` so unpausing restores the original rate rather than always snapping to 1×. F cycles speed 1× → 2× → 1×, mirroring the HUD buttons. Escape exits placement mode if active, otherwise deselects the selected tower. S sells the currently selected tower immediately. U opens or closes the upgrade/behavior panel for the selected tower.

**Tower placement hotkeys.** Number keys 1–6 map to the six tower types in panel order (Cannon, Frost, Tesla, Mortar, Poison, Aura). Pressing a number enters placement mode for that tower if the player can afford it; pressing the same number again while already in that tower's placement mode cancels — matching the double-click cancel idiom that players already know.

**Guard logic extracted to `KeyboardShortcuts.ts`.** Rather than inlining the blocking conditions in each `keydown` handler, a small Phaser-free module (`src/systems/KeyboardShortcuts.ts`) exports `isShortcutBlocked(ctx, allowWhenPaused?)`. The `ShortcutContext` snapshot captures `gameOver`, `bossOfferOpen`, and `paused`. Space and Escape pass `allowWhenPaused: true`; all other shortcuts pass the default `false`, so they silently no-op while the game is paused or a boss-offer panel is open. Extracting the guard function makes the branching logic independently testable.

**HUD keyboard hints.** Pause and speed buttons in `HUD.ts` now render small `'Spc'` and `'F'` hints in the top-right corner of each button, drawn only on desktop (guarded by the existing `_IS_MOBILE` constant). `TowerPanel.ts` draws `'1'`–`'6'` hints in the top-right corner of each tower button the same way — again desktop-only, so the mobile layout is untouched.

**Test coverage.** `src/systems/__tests__/KeyboardShortcuts.test.ts` (13 tests) covers all guard combinations: normal gameplay allows everything, game-over and boss-offer block everything including pause-safe shortcuts, paused blocks regular shortcuts but allows pause-safe ones, and combined flags all resolve correctly. Total: 1 047 tests passing, 0 type errors.

### Frost Tower Attack Fix — Targeting, Projectile, and Visual

The frost tower had an erratic-looking attack: projectiles appeared to fly to wrong positions and the shatter effect on lethal hits was silently misfiring. A full pipeline audit (targeting → projectile creation → flight → impact → slow/shatter) traced the root cause to a two-line ordering bug in `Projectile.ts`.

**The bug.** `hitCreep()` and its AoE twin `applyAoe()` both called `takeDamage(damage)` first, then `onHit?.(creep)`. For the frost tower, `onHit` is the closure that sets `creep.shatterActive = true` before applying a slow. When the hit was lethal, `takeDamage` fired the `creep-died-poisoned` death event — which reads `shatterActive` to decide whether to explode — before `onHit` had a chance to set the flag. The result: shatter on lethal hits was never triggered, the tower felt non-responsive on kill, and the ice-bolt animation terminated without the intended impact burst. The fix is a single swap in each method: call `onHit?.(creep)` first so all status flags are set, then call `takeDamage(damage)` so the death event always sees an up-to-date state. The comment explains why: on non-lethal hits the order has no observable difference; the ordering only matters for lethal hits where the death event fires synchronously inside `takeDamage`.

**Test coverage.** `targeting.test.ts` gained 16 new regression tests in four describe blocks. The first two blocks verify STRONGEST-priority logic (picks highest HP, skips inactive creeps, returns null on empty list, is stable on ties) and the range-filtering contract (pickTarget operates only on pre-filtered candidates, Tower.findTarget() does the distance exclusion). The third block is a direct bug reproduction: one test proves that calling `onHit` before `takeDamage` gives `shatterActive = true` at death time, and a companion test proves the old order gave `false`. The fourth block pins the base slow values from `towerDefs` (factor 0.5, duration 2500ms) and asserts that Frost-A upgrades produce a strictly-descending slow factor and Frost-B upgrades produce a strictly-ascending slow duration — catching balance regressions at the data layer. Total: 1 161 tests passing, 0 type errors.

### Mobile Session Persistence — Auto-Save & Restore Game State on Tab Switch

Mobile browsers — particularly iOS Safari and Chrome Android — routinely evict backgrounded pages from memory. When a player switches away mid-run and returns even a few seconds later, the page reloads from scratch and their entire run is lost. This feature eliminates that failure mode.

**SessionManager.** A new Phaser-free singleton (`src/systems/SessionManager.ts`) owns all interaction with `sessionStorage` (key: `ojibwe-td-autosave`). It serialises an `AutoSave` snapshot — version, timestamp, mapId, stageId, commanderId, current wave, gold, lives, total kills, gold earned, every tower's grid position and upgrade tiers, active offer IDs, consumed one-time offer IDs, and the pre-computed meta-stat bonus snapshot — and deserialises it on load. Saves older than 30 minutes are discarded automatically; `sessionStorage` (not `localStorage`) is intentional so stale saves never linger across browser sessions.

**Save checkpoints.** `GameScene` writes a save at the end of each wave (clean inter-wave state with no mid-combat chaos), on `visibilitychange` when the tab goes hidden (the last-chance hook before the browser may kill the page), and on `pagehide` (iOS Safari's equivalent). Both event listeners are removed in `shutdown()` to prevent leaks. The `webglcontextlost` event on the canvas element triggers a dark overlay ("Game paused — tap to resume"); on `webglcontextrestored` the scene restarts and, if a matching auto-save exists, resumes from it automatically.

**Resume prompt.** When `GameScene.create()` finds a valid auto-save for the current stage, it shows a fullscreen overlay with "Resume from Wave X?" and YES / NO buttons at depth 500. YES triggers `_restoreFromAutoSave()`, which sets gold, lives, and wave counter, then calls `restoreFromIds()` on `OfferManager` to re-activate all persistent offers (and mark consumed one-time offers like salvage without re-granting them), then iterates the saved tower list — creating each `Tower` at its saved grid position, registering it with `UpgradeManager`, and replaying `buyUpgrade()` tier-by-tier so every stat calculation and path-lock check runs through the normal code path with no gold deducted. NO clears the save and starts fresh.

**Auto-save is cleared** on game over (victory or defeat), when the player returns to the main menu, and when a new run begins — ensuring stale state never bleeds between runs.

**OfferManager additions.** `getActiveIds()` returns the array of currently active offer IDs; `getConsumedOneTimeOfferIds()` returns consumed one-time offer IDs (e.g. `['salvage']`); `restoreFromIds(ids, consumedOfferIds?)` re-activates a saved offer list silently, bypassing the selection UI and setting the salvage-consumed flag if needed.

**Test coverage.** `SessionManager.test.ts` has 19 tests covering the full lifecycle: save/load round-trip, 30-minute expiry, version mismatch rejection, missing/corrupt data, and the singleton reset pattern (`(SessionManager as unknown as { _instance: null })._instance = null`). `GameSceneShutdown.test.ts` (7 tests) verifies that event listeners registered in `create()` are removed in `shutdown()`. Total: 1 177 tests passing, 0 type errors.

---

### TASK-061 — Fix Poison Upgrade Descriptions: Implement the Tier Progression (2026-03-02)

Plague Path C upgrades (Plague I–V) described effects that were never implemented: spread range increasing at tier II, multiple DoT stacks at tiers III and IV, and air-creep targeting at tier V. Players were spending gold and seeing none of the stated behaviour. This was a player-trust issue — upgrade text is a contract.

**What was implemented.** Three new fields were added to the upgrade schema (`spreadRadiusDelta` in `statDelta`, `spreadStackCount` and `spreadHitsAir` in `effects`) and threaded through `UpgradeManager` and `BalanceCalc` as new `TowerUpgradeStats` properties: `dotSpreadRadiusDelta`, `dotSpreadStackCount`, `dotSpreadHitsAir`. The `spreadDot()` method in `UpgradeManager` was refactored to drop the caller-supplied `radius` argument; instead it now walks the live tower list to derive the best parameters from all Poison towers that have `dotSpreadOnDeath` active — taking the maximum radius and stack count and ORing the air flag. The result: each spread event automatically reflects the highest-tier Plague upgrade present on the map.

**Tier behaviour after the fix.** Plague I spreads 1 stack within 80px to ground creeps. Plague II extends reach to 90px via `spreadRadiusDelta: 10`. Plague III applies 2 stacks per spread via `spreadStackCount: 2`. Plague IV applies 3 stacks. Plague V adds `spreadHitsAir: true`, making the spread domain-agnostic. Every description now precisely describes what the tier delivers.

**Test coverage.** `poisonSpreadUpgrades.test.ts` (19 tests, new) exercises each tier in isolation and stacked, confirms ground-only filtering pre-Plague V, verifies that the `radius` parameter was removed from `spreadDot()`, and checks that radius additions accumulate correctly. Total: 1 210 tests passing, 0 type errors.

---

### TASK-064 — Security & Code Vulnerability Audit (2026-03-02)

As the codebase grew rapidly through orchestrator pipelines, no security review had been performed. Even for a fully client-side game with no backend, there are meaningful attack surfaces: localStorage tampering (players editing saved currency or unlock flags), dependency supply chain risk, and production build configuration hygiene. This task established a security baseline and fixed the most actionable gap.

**Findings.** `npm audit` returned 0 vulnerabilities across all 236 transitive dependencies. All production and dev packages were at their latest versions. No `eval()`, `Function()`, or `innerHTML` usage was found in game code. Source maps were already disabled in the Vite production config. No secrets, API keys, or credentials were found in source or git history. All external resource loads (Google Fonts) use HTTPS.

**localStorage hardening.** The main concrete gap was `SaveManager`: loaded data was used directly with no validation. A `_sanitize()` method was added that clamps `currency` to `[0, 999999]`, filters `unlocks` to string elements only, clamps `audioMaster / audioSfx / audioMusic` to `[0, 1]`, validates `stageMoons` values to integers in `[1, 5]`, and validates `endlessRecords` to non-negative integers. In parallel, a djb2 checksum (`_computeChecksum()`) is now written alongside every save and verified on load — if the checksum is missing or mismatched, `SaveManager` logs a warning (via `lastWarning`) and continues with the sanitized values, providing casual tamper detection without blocking legitimate play.

**Build & supply chain hardening.** `vite.config.ts` was updated to set `sourcemap: false` explicitly for production builds (was previously implicit) and `build.minify: true`. A `.env*` gitignore rule was confirmed present. The ESLint `no-unused-vars` rule was extended with `varsIgnorePattern: '^_'` to match the existing `argsIgnorePattern`, preventing false positives from intentional `_` prefixed destructuring (e.g., the `_checksum: _old` pattern used in `_save()`).

**Security documentation.** `docs/SECURITY.md` was created with the full audit report: dependency inventory, CVE status, client-side risk analysis, build configuration review, code quality scan, recommended CSP headers for future web deployment, and a future-proofing section documenting requirements for leaderboards, multiplayer, and IAP if those features are ever added.

**Test coverage.** `SaveManagerSecurity.test.ts` (39 tests, new) covers the full sanitization and checksum lifecycle: clean save round-trips, tamper detection on currency / unlocks / stat fields, checksum mismatch warning, missing checksum acceptance, and invalid-type coercion. Total: 1 230 tests passing, 0 type errors.

---

### TASK-057 — Commander Portrait in Game HUD: Active Commander Display (2026-03-02)

Players were selecting a commander before each run but losing all visual connection to them the moment gameplay started. The selected commander's identity, bonuses, and ability state were completely invisible during play. This feature makes the commander a persistent, interactive presence in the HUD.

**CommanderPortrait widget.** A new `CommanderPortrait` class (`src/ui/CommanderPortrait.ts`) extends `Phaser.GameObjects.Container` to bundle all portrait concerns in one place. On desktop the portrait is 48×48px; on mobile it's 56×56px for a larger touch target. A coloured border ring is drawn via `roleBorderColour()` from `palette.ts`, matching the commander's role element (frost blue for Makwa, gold for support roles, etc.). If no `portrait-<id>` texture has been loaded, the widget falls back to the first letter of the commander's name on a dark panel background — ensuring nothing breaks when textures are absent.

**Ability state.** When a commander has an active ability, the portrait pulses with a gentle border glow (alpha 1.0→0.4→1.0 on a 1.2s sine loop) to signal readiness. After the ability fires, `markAbilityUsed()` kills the tween, draws a 55%-opacity black rounded overlay, and redraws the border in a muted neutral colour — making the "on cooldown" state immediately legible. Clicking/tapping the portrait activates the ability if it hasn't been used yet. For passive-only commanders the glow simply continues as a subtle decorative pulse.

**Tooltip.** Hovering or tapping the portrait opens a 210px-wide tooltip positioned below the portrait and clamped to screen bounds. It shows the commander's name in bold, their role and clan on a muted second line, then the aura name and description, and (if applicable) the ability name with a READY/USED indicator and its description. The tooltip is destroyed on pointerout and recreated on the next hover, keeping state fresh.

**Visual reactions.** Three contextual animations tie the portrait into the game's emotional beats: `reactBossWave()` fires a rapid 6-repeat lateral shake (±4px) when a boss wave is announced; `reactVictory()` plays a 1.25× scale bounce (3 repeats, Back ease) on run completion; `reactGameOver()` fades the portrait to 35% opacity on a 600ms Power2 curve. All tweens use the scene's tween manager and do not require manual cleanup.

**HUD integration.** `HUD.ts` gained a `showCommanderPortrait()` method that constructs the widget at a fixed top-left position (HALF + BORDER_WIDTH + 8 offset from left, vertically centred within the HUD bar). `GameScene` calls it from `create()` using the `commanderDef` resolved from the `commanderId` passed via `init()`, and wires `onActivateAbility` to the existing commander ability dispatch. Boss-wave, victory, and game-over events each call the matching `react*()` method. A `palette.ts` addition provides `textAbility` (a yellow-gold colour token) and a `roleBorderColour()` helper mapping the four commander roles to element colours.

**Guards.** Portrait click events are blocked when `commanderState.abilityUsed` is already true, preventing double-activation. The portrait is seated at depth 105 — above the HUD background (100) and text layers (101–104) but below the tower panel and tooltip overlays. No new blocking geometry is added to the playfield; the portrait sits entirely within the HUD bar.

**Test coverage.** `commanderPortrait.test.ts` (41 tests, new) covers: widget construction with and without a loaded texture, border colour derivation from role, ability-used state transitions, tooltip show/hide lifecycle, all three react methods, cleanup on destroy, and the passive-only commander path. Total: 1 290 tests passing, 0 type errors.

---

### TASK-066 — Creep Status Effect Visuals: Poison, Slow, Burn, Bleed Indicators (2026-03-02)

Status effects (poison DoT, frost slow, shatter, armour shred) were mechanically sound but visually silent — the battlefield gave players no reliable read on which creeps were affected and by how much. This task systematised every effect into a consistent, composable visual layer.

**StatusEffectVisuals module.** A new Phaser-free data file (`src/entities/StatusEffectVisuals.ts`) defines the canonical `StatusEffectVisualConfig` interface and the `EFFECT_CONFIGS` record covering all five effects: poison (green, 0x33ff55), frost (ice-blue, 0xaae4ff), burn (orange-red, 0xff6622), tesla/shock (electric yellow-green, 0xeeffaa), and armour-shred (red, 0xff4400). Separating data from rendering means the configs can be unit-tested without any Phaser mock.

**Stack-aware scaling helpers.** `poisonParticleCount(stacks)` starts at 3 and adds one particle arc per extra stack, capped at 8 — so a triple-poisoned creep visibly bristles more than a single-stack one. `poisonOverlayAlpha(stacks)` scales the green body wash from 0.22 up to a cap of 0.6. `frostOverlayAlpha(shatter)` snaps to the higher `SHATTER_OVERLAY_ALPHA` (0.52) for deep-freeze / shatter, making the near-immobile state unmistakable.

**Particle arcs on `Creep`.** The `EffectParticle` interface pools small `Phaser.GameObjects.Arc` children inside each `Creep` container. Each arc tracks a `phase` value (0→1), a `speed` derived from `particleLifeMs`, and randomised `baseX`, `riseY`, and `drift` values that are re-rolled on each reset. The per-frame `_stepParticles(delta)` method advances phase, repositions the arc on a sine-curve upward arc with lateral drift, and fades alpha from 1.0 → 0.0 as phase approaches 1. When phase reaches 1 the arc snaps back to a new random baseX and restarts — creating a continuous, low-cost stream with no allocations after the initial pool.

**Tint overlays and frost ring.** Each active effect gets a semi-transparent `Phaser.GameObjects.Rectangle` child overlaid on the creep body. Frost also spawns a `_frostRingGfx` Graphics object drawn beneath the body as an elliptical ice patch, making slow visually grounded. The `refreshStatusVisual()` method reconciles all overlays and particle pools against the current effect state: overlays are created on first activation and made invisible (not destroyed) when the effect ends, avoiding GC pressure mid-wave.

**Status icon bar.** A tiny `_iconBarGfx` Graphics object is redrawn above the HP bar whenever effects change. `activeEffectKeys()` returns the currently active effect keys in a stable display order (poison → frost → burn → tesla → armorShred), and each key is rendered as a 3px-radius dot in its canonical colour (`ICON_COLORS`). The bar only appears when at least one effect is active and sits at `ICON_BAR_OFFSET_Y = -29` (above the HP bar at −20) so nothing overlaps.

**Armour-shred flash.** When `applyDamageAmp()` is called, the armour-shred overlay flashes to 70% alpha for 150 ms before settling to the base 18% — giving the hit a punch without permanently obscuring the creep sprite. The expiry callback now calls `refreshStatusVisual()` to clean up the overlay correctly.

**Burn effect.** The new `applyBurn(durationMs)` public method on `Creep` activates the burn visual layer (orange flame arcs + warm tint overlay) for the specified duration. Re-application replaces the existing timer, extending rather than stacking the effect. This wires the existing cannon/mortar splash mechanic to a visible player signal.

**Tesla residual static.** `_teslaShockedMs` counts down 500 ms after a chain-lightning hit, keeping the electric arc particles alive as a brief residual sparkle. Once the countdown reaches zero `refreshStatusVisual()` clears the tesla layer cleanly.

**Test coverage.** `statusEffectVisuals.test.ts` (57 tests, new) validates all EFFECT_CONFIGS entries (colour ranges, alpha bounds, particle counts, icon names), the stack-scaling helpers (monotonicity, caps, boundary cases), `activeEffectKeys` order and composability, ICON_COLORS completeness, icon-bar constants, and a composability suite confirming all five simultaneous effects produce distinct, non-conflicting configs. Total: 1 306 tests passing, 0 type errors.

### TASK-085 — Challenges List Scrollable (2026-03-02)

The challenges list in `ChallengeSelectScene` previously clipped any cards that extended beyond the visible viewport, making challenges inaccessible when the list grew long. The fix replaces the static layout with a camera-scroll pattern: world bounds are set to the full content height (derived from `ALL_CHALLENGES.length × (CARD_H + CARD_GAP)`), and the Phaser main camera scrolls vertically over that content rather than the content being cropped.

**Scroll input.** Mouse-wheel events call `camera.scrollY` directly. Pointer-down captures `_dragStartY` and `_dragStartScrollY`; pointer-move during drag computes the delta and updates the camera, storing the per-frame delta as `_scrollVelocity`. On pointer-up the drag flag is cleared and the velocity is kept so momentum coasts to a stop. Each `update()` tick applies `SCROLL_FRICTION = 0.88` decay until velocity drops below `MIN_VELOCITY = 0.5 px/frame`, giving a natural flick-scroll feel on both desktop and touch.

**Pinned HUD elements.** The BACK button strip, scrollbar track/thumb, and bottom-fade gradient all use `setScrollFactor(0)` so they remain fixed to screen coordinates regardless of camera position. The scrollbar thumb height is calculated as `(viewportH / contentHeight) × trackH` and is redrawn each `update()` call proportional to `camera.scrollY / _maxScrollY`. The fade gradient is a `Graphics` object drawing `FADE_STEPS = 8` horizontal bands from transparent to `PAL.bgDark` across `FADE_HEIGHT = 60 px` at the bottom of the screen.

**Scroll reset.** `create()` now calls `this.cameras.main.setScroll(0, 0)` and zeros all scroll-state fields before rebuilding the card list, so re-entering the scene always starts at the top.

**Test coverage.** `challengesListScroll.test.ts` (42 tests, new) covers the scroll-state machine: initial state, wheel delta clamping, drag start/move/up momentum capture, friction decay convergence, `_maxScrollY` boundary clamping, thumb height proportionality, thumb Y-position tracking, and fade-gradient visibility toggling. Total: 1 389 tests passing, 0 type errors.

### TASK-087 — Codex Notification Badge: Clear on View (2026-03-02)

The Codex button on the main menu displayed a notification badge counting new entries, but opening the Codex never cleared it — the badge persisted indefinitely and became meaningless noise after the first visit.

**SaveManager additions.** A new `readCodexIds: string[]` field was added to the `SaveData` interface and wired through `defaultSaveData()`, the validation/migration layer (`_parseSaveData`), and the serialisation path. Four new public methods were added: `isCodexRead(id)` checks whether a single entry has been viewed; `markCodexRead(id)` appends the id and persists (idempotent); `markAllCodexRead(unlockedIds)` bulk-marks a set of ids; and `getUnreadCodexCount(allEntries)` replaces the old `unlockedCount − defaultCount` heuristic with a precise count of entries that are either explicitly unlocked or default-unlocked but not yet present in `readCodexIds`. Saves are backwards-compatible: missing `readCodexIds` field defaults to `[]`.

**CodexScene mark-on-view.** `showDetail()` now calls `save.markCodexRead(entry.id)` immediately when an entry is opened, then calls `refreshEntries()` to repaint the list. Entry tiles gain a visual read/unread distinction: unread entries retain the bright `#ccddcc` title with bold weight plus a small green dot (4px radius, 0x00ff44) in the top-right corner; read entries are downgraded to a quieter `#99aa99` with normal weight and no dot.

**"Mark All Read" button.** A secondary button was added to the bottom bar of CodexScene, left of the existing BACK button. Clicking it calls `save.markAllCodexRead()` with all currently accessible entry ids and triggers a `refreshEntries()` repaint — giving players a one-click way to silence the badge without reading every entry individually.

**MainMenuScene badge fix.** The badge calculation was replaced: instead of `unlockedCount − defaultCount`, it now calls `save.getUnreadCodexCount(ALL_CODEX_ENTRIES)`. When the count reaches zero the badge object is never created, so the circle and number disappear entirely until a new entry is unlocked.

**Test coverage.** `codexReadState.test.ts` (17 tests) covers `isCodexRead`, `markCodexRead` idempotency, `markAllCodexRead` bulk behaviour, `getUnreadCodexCount` across unlocked-only, default-only, and mixed scenarios, and SaveManager serialisation round-trips for the new field. Total: 1 406 tests passing, 0 type errors.

### TASK-082 — Arrow Tower: Cheap Air+Ground Tower with Damage Cap (2026-03-02)

Before this task Tesla was the only tower that could target air units, and unlocking it required meta-progression. Players who hadn't yet earned that unlock had no answer to early flying waves. The Arrow tower fills this gap as the cheapest tower in the game — designed to be spammable early but intentionally plateaued by a hard damage cap so it doesn't scale into late-game dominance.

**Tower definition.** `ARROW_DEF` was added to `src/data/towerDefs.ts` with cost 18, base damage 10, fast attack cooldown (900 ms), medium range (160 px), and `canTargetAir: true`. The definition carries a new `damageCap: 40` field on `TowerDef` — the canonical ceiling for all damage calculations on this tower. The arrow is available from the start; it is not listed in `LOCKED_TOWER_IDS`.

**Damage cap enforcement.** `Tower.fireAt()` now reads `this.def.damageCap` and clamps the computed damage value before the projectile is created: `finalDmg = Math.min(calculatedDmg, this.def.damageCap ?? Infinity)`. The clamp is applied after base-stat computation but before global multipliers such as the Iron Barrage offer and commander stat bonuses, meaning upgrades and buffs can still improve DPS indirectly (via attack speed or multi-shot) but can never push a single hit above the defined ceiling. `BalanceCalc` exports `calculateArrowDamage()` so the cap is also visible to the balance spreadsheet.

**Upgrade tree.** Three paths × five tiers were added to `src/data/upgradeDefs.ts`: Path A (Rapid Fire) reduces attack cooldown progressively, reaching a 450 ms cadence at tier 5; Path B (Pierce Shot) adds projectile penetration — at tier 3 arrows pierce a second target, and at tier 5 they pierce up to three — implemented by adding a `pierceCount` stat read by `Projectile` when it processes hits; Path C (Hunter's Edge) adds a slow-on-hit effect at tier 2, a range boost at tier 4, and a reveal-stealth flag at tier 5. All three paths respect the `damageCap`; tier damage increments in paths A and B are intentionally kept under the cap so upgrades never become wasted gold.

**Projectile visual.** Arrow projectiles are visually distinct from cannon balls: they travel faster (550 px/s vs 380), are rendered as a thin 2×8 px rotated rectangle in warm amber (`0xf5c542`) rather than the cannon's round ball, and cast no lingering explosion on impact. The existing `Projectile` class was extended with an optional `pierceCount` field; when greater than zero the projectile does not destroy itself on the first hit but decrements the counter and continues along its trajectory.

**Test coverage.** `arrowTower.test.ts` (35 tests) validates the damage cap at base stats, at each upgrade tier for all three paths, with and without global multipliers; pierce-count decrement and self-destruction on final hit; air-targeting eligibility; and the BalanceCalc helper. Total: 1 441 tests passing, 0 type errors.

### TASK-089 — Arrow Tower Assets: Icon, Projectile Sprite, Gear Icons (2026-03-02)

TASK-082 shipped the Arrow tower mechanically but left it with a placeholder coloured rectangle. This task completes the visual layer so the tower reads correctly everywhere it appears in the UI and during play.

**Tower icon.** `scripts/gen_icons.py` was extended with a ninth icon definition: `icon-arrow`, an SVG-rendered recurve bow with a nocked arrow drawn in the Ojibwe earth-tone palette — birch-brown limb (`#8b6b3d`), sinew bowstring (`#d4c8a0`), flint arrowhead (`#556666`/`#778888`), and cedar fletching (`#8b4513`). The inner grain highlight and tip-wrapping circles give depth without overcomplicating the silhouette. The 64×64 PNG is written to `converted_assets/icon-arrow.png` and symlinked into `game/public/assets/icons/` via the existing symlink. `BootScene.ts` registers it as `icon-arrow` so it loads with the rest of the tower icons at startup.

**Projectile impact effect.** `Projectile.ts` gained a new `impactArrowStick()` method: on impact the projectile draws a short 8 px arrow-stub graphic rotated along the flight angle — a warm-tan shaft line (`#a08050`) terminating in a grey-teal flint tip circle (`#778888`) — then fades it out over 200 ms via a Phaser tween before destroying the graphics object. The trail colour for in-flight arrows was registered as `0xc4a265` in the `TRAIL_COLORS` table, giving arrows a warm amber streak distinct from cannon smoke and frost shimmer.

**Gear icons (equipment UI).** `gearDefs.ts` received a new gear type `ARROW_FLETCHING` mapped to the `arrow` tower. Six gear items were added across the rarity tiers: Sinew Bowstring (common, +8% attack speed), Sharpened Flint Tips (common, +8% damage), Eagle Feather Fletching (uncommon, +12% range / +6% damage), Birch Recurve Limb (uncommon, +15% attack speed), Obsidian Broadhead (rare, +22% damage / +12% armour penetration, bleed special effect), and Windwalker's Bow (epic, +20% attack speed / +18% range / +15% damage, pierce-on-hit special effect). All names and descriptions follow the Ojibwe natural-materials theme established by other tower gear.

**Audio slot.** `BootScene` preloads `sfx-arrow` from `assets/audio/sfx/arrow-fire.mp3` alongside the other tower fire sounds, ready for the audio asset task to fill.

### TASK-090 — Audio Settings UI: Independent Music/SFX Volume & Toggle (2026-03-02)

The single mute button was the entire audio UI — no way to silence the music while keeping sound effects on, or to adjust volumes independently. This task replaces that limitation with a full per-channel audio settings panel accessible from both the in-game HUD and the main menu.

**SaveManager additions.** Two new boolean fields, `audioMusicMuted` and `audioSfxMuted`, were added to `SaveData` alongside the existing `audioMuted` master flag. `getAudioSettings()` now returns both per-channel mute states. `setAudioSettings()` accepts optional `musicMuted` and `sfxMuted` parameters (default false) for backwards-compatible saves. `_sanitize()` coerces missing fields to `false` so older save files load cleanly.

**AudioManager per-channel mute.** Private fields `_musicMuted` and `_sfxMuted` track independent mute state. `setMusicMuted(bool)` and `setSfxMuted(bool)` update the respective Web Audio gain node directly (0 or the stored volume) and call `_persist()`. The existing `setMusicVolume()` and `setSfxVolume()` methods were updated to respect their per-channel mute flag when applying gain, so adjusting a slider while the channel is muted does not briefly unmute it. On `init()` the new mute states are restored from the save before the AudioContext resumes. Three new getters — `isMusicMuted()`, `isSfxMuted()`, `isMuted()` — expose the full mute state to the UI layer.

**AudioSettingsPanel.** New file `src/ui/AudioSettingsPanel.ts` implements a Phaser-container overlay that renders two rows (Music / SFX) each with a labelled toggle button and a +/− volume step pair. A "✕ Close" button dismisses the panel. The panel uses the existing `PAL` palette constants and `_IS_MOBILE` sizing so tap targets are at least 44 px on mobile. It is created lazily on first open and toggled on repeated gear taps. `destroy()` removes the container and nulls the reference.

**HUD gear button.** `HUD.createAudioSettingsButton(onOpen)` places a ⚙ icon button immediately to the right of the existing mute button. The position adjusts for mobile (cx = 343) vs desktop (cx = 327) so it fits within the HUD strip. `GameScene.create()` calls this method after wiring the mute button and passes a closure that lazily constructs and shows/hides the panel. `GameScene.shutdown()` calls `audioSettingsPanel?.destroy()` for clean teardown.

**Main menu gear button.** `MainMenuScene.createAudioButton()` places a ⚙ icon in the bottom-right corner of the main menu canvas (padded 12 px from the edge). Tapping it lazily creates and toggles the same `AudioSettingsPanel`. `_audioPanel` is nulled at the top of `create()` so a scene restart always starts clean.

**Test coverage.** `AudioManager.test.ts` gained 26 new tests: per-channel mute toggles, gain-respecting volume adjustments while muted, master mute independence, and round-trip persistence through `_persist()` / `init()`. Total: 1 473 tests passing, 0 type errors.

**Test coverage.** `attackVisuals.test.ts` was extended with 7 new tests covering the arrow trail colour registration, `impactArrowStick` tween creation and cleanup, and in-flight rotation-tracking; `wireAssets.test.ts` confirms `icon-arrow` appears in the preload manifest; `gearSystem.test.ts` confirms the new gear type resolves to the `arrow` tower key. Total: 1 458 tests passing, 0 type errors.

### TASK-086 — Crystal Sink Expansion: More Things to Buy with Crystals (2026-03-02)

Crystals (meta-currency) accumulated with nowhere to go once players finished unlocking commanders and stat nodes. This task adds three repeatable consumable sinks so there is always a meaningful use for spare crystals, and integrates those consumables into the run start so they feel immediately impactful.

**SaveManager additions.** A `ConsumablePending` interface tracks three per-field integer counters: `rerollTokens`, `goldBoostTokens`, and `extraLifeTokens`. `CONSUMABLE_COSTS` exports the canonical crystal price for each (`50 / 100 / 150`), and `GOLD_BOOST_AMOUNT = 50` exports the gold value so it can be referenced from both save and game code without magic numbers. The `purchaseConsumable(type)` method deducts the crystal cost (validated against current balance) and increments the matching counter, capping it at 99. `getPendingConsumables()` returns a snapshot. `consumeAndClearRunConsumables()` returns the snapshot then zeroes all counters atomically, ensuring consumables fire once per run even if a crash occurs mid-session. `_sanitize()` clamps each counter to a non-negative integer ≤ 99 and handles missing or malformed data gracefully.

**MetaMenuScene two-tab layout.** The single-screen meta menu was extended with a tab bar: UNLOCKS (existing content) and SHOP (new). Active tab is highlighted with a 2 px green border; switching re-calls `scene.restart({ tab })` to keep layout logic simple. The SHOP tab renders three consumable item panels, each showing the consumable name, effect description, crystal cost, and current held count. Clicking a panel calls `purchaseConsumable()` and refreshes the scene, so the count updates immediately. Insufficient-crystal panels are rendered at reduced alpha with no pointer cursor, preventing invalid purchases without a separate error state.

**GameScene run-start integration.** At the top of `create()`, after commander bonuses are applied, `consumeAndClearRunConsumables()` is called and its return value drives three immediate effects: `goldBoostTokens × GOLD_BOOST_AMOUNT` added to starting gold, `extraLifeTokens` added to starting lives, and `rerollTokens` stored in the new `_rerollTokens` field. The reroll count is forwarded to `BetweenWaveScene` via the existing scene-data payload.

**BetweenWaveScene reroll button.** When `rerollTokens > 0`, an orange REROLL button is rendered below the offer cards. Each click re-draws three fresh offers, decrements the displayed counter, and disables the button when tokens are exhausted. The token consumption is reported back to `GameScene` via the `rerollsUsed` field of the `between-wave-offer-picked` event so the scene-scoped counter stays accurate across multiple waves.

### TASK-083 — Desktop Drag-to-Place Tower Placement (2026-03-02)

Desktop players had to use a two-click flow to place towers: click the tower button to select, then click the map tile to place. Mobile already supported the more natural drag-to-place gesture (tap-hold the tower button and drag to the map). This task brings the same drag UX to desktop while preserving the existing click-to-place flow for players who prefer it.

**TowerPanel drag detection.** On desktop, the tower button's `pointerup` handler was replaced with a full drag-detection sequence. `pointerdown` records the cursor start position and registers `pointermove` and `pointerup` listeners on the Phaser scene. `pointermove` fires `onSelect(def, isDrag=true)` as soon as the pointer has moved more than 10 px from the start (using `Math.hypot`), then cleans up the listeners. `pointerup` before that threshold is reached fires `onSelect(def, isDrag=false)`, the existing click path. The 10 px threshold is large enough to swallow normal click micro-movement but small enough to feel instant on a real drag. Mobile continues to use its pre-existing `pointerdown`-only path unchanged.

**GameScene drag state.** A new `_isDragPlacing` boolean field (reset in `init()`) tracks whether the current placement mode was entered via drag. `enterPlacementMode(def, isDrag)` sets `_isDragPlacing = isDrag && !isMobile()` so touch-screen laptops that fire both touch and mouse events cannot accidentally enter the drag path. The `pointerup` listener is now registered unconditionally (previously mobile-only). `onPointerUp` has an early-return guard for non-drag desktop placements (`!isMobile && !_isDragPlacing`), so the existing desktop click-to-place `pointerdown` handler retains full control for that flow. When `_isDragPlacing` is true and the pointer lifts over an invalid tile, placement is cancelled silently rather than retried — matching the desktop expectation that a drag released off-target means "never mind".

**Acceptance.** 30 structural and arithmetic tests in `desktopDragPlacement.test.ts` verify: drag-threshold logic for 9 coordinate pairs, `_isDragPlacing` field presence, unconditional `pointerup` registration, the early-return guard, mobile preservation (no `isDrag` on mobile path), and the `onSelect` callback signature change. Total: 1 529 tests passing, 0 type errors.

**Test coverage.** `src/systems/__tests__/crystalSinks.test.ts` adds 26 tests covering purchase success/failure, balance deduction, counter capping, consume-and-clear atomicity, sanitization of malformed saves, and full round-trip through `purchaseConsumable` → `consumeAndClearRunConsumables`. Total: 1 484 tests passing, 0 type errors.

### TASK-088 — Fix All Region/Stage Crystal Unlocks — Maps Not Purchasable (2026-03-02)

Players who had accumulated enough crystals found that none of the locked stages would actually let them spend those crystals — the purchase nodes were invisible in the Unlocks tab, and the "affordable" logic in `renderNode` silently ignored prerequisite chains, so a node with an unmet prereq would appear purchasable but then produce no result.

**Root-cause: stage nodes never rendered.** `renderUnlocksTab` filtered `UNLOCK_NODES` into `mapNodes` and `commanderNodes` but had no corresponding `stageNodes` filter. Stages with `effect.type === 'stage'` were simply never drawn. Adding `const stageNodes = UNLOCK_NODES.filter(n => n.effect.type === 'stage')` and a "Stages" section header between Maps and Commanders made all three locked stage nodes — Niizh-miikana (250 crystals), Oak Savanna Run (500 crystals), and Frozen Crossing (700 crystals) — visible for the first time.

**Root-cause: prerequisite gate missing from affordability check.** `renderNode` computed `affordable = !owned && save.getCurrency() >= node.cost`, which ignored whether the node's prereqs were satisfied. A player who had not yet bought the Wetland Crossing map unlock (unlock-map-02) would see the downstream stage nodes as clickable even though purchasing them had no effect. The fix moves `prereqsMet` before the crystal check: `affordable = !owned && prereqsMet && save.getCurrency() >= node.cost`. Nodes with unmet prereqs now render with a grey "LOCKED" badge and are not interactive.

**Scrollable container for the Unlocks tab.** Adding the Stages section made the unlock list overflow the visible canvas area on smaller viewports. All game objects in the Unlocks tab are now collected into a single Phaser `Container`. When `contentH > visibleH` a geometry mask clips the container to the safe area, a `wheel` event handler scrolls it with `Phaser.Math.Clamp`, and ▲/▼ arrow buttons provide touch-friendly scroll controls for mobile players without a mouse wheel.

**Test coverage.** `stageUnlocks.test.ts` adds 46 new tests: stage node data integrity (count, IDs, costs, labels, prereqs), prerequisite chain validation (no circular dependencies via BFS), `getStageUnlockNode` helper correctness, `LOCKED_STAGE_IDS` export membership, cross-reference between `stageDefs` and `unlockDefs` (every stage unlock node references a real stage; every stage with a stage-type `unlockId` has a matching node; `unlockCost` fields are in sync), and structural checks on `MetaMenuScene.ts` confirming the stage filter, `prereqsMet &&` guard, container wiring, scroll clamping, and LOCKED badge. Total: 1 545 tests passing, 0 type errors.

### TASK-081 — Boss Loot Timing & Post-Wave UI Sequencing (2026-03-02)

At the end of boss waves, three distinct UI panels were competing for the screen simultaneously: the boss loot/gear reward, the elder vignette dialog, and the between-wave upgrade offer. All three were triggered independently by different event paths the moment a boss wave ended, resulting in overlapping, unusable overlays. Additionally, the boss loot panel fired the instant the boss died — before escort creeps had been killed — so gear could appear mid-wave.

**PostWaveUIQueue.** A new 62-line `PostWaveUIQueue` class (Phaser-free, fully unit-tested) serialises end-of-wave panels into an ordered queue. Each entry holds a `show(onDismiss)` function. When the player dismisses a panel the entry calls `onDismiss()`, advancing to the next entry automatically. A `clear()` method discards all pending entries immediately — called on game-over to prevent stale panels surfacing after the run ends. The queue is intentionally Phaser-free so that all sequencing logic can be exercised in plain Vitest without a DOM.

**Boss loot deferral.** `boss-killed` no longer opens `BossOfferPanel` directly. Instead it stores the pending boss-loot closure and waits for `wave-complete` before enqueuing it. The `wave-complete` handler in `GameScene` now builds the full post-wave queue in priority order — (1) boss loot/gear if any, (2) elder dialog if this wave has a matching vignette, (3) between-wave upgrade offers — then calls `flush()` once to start the sequence. Non-boss waves skip step 1 and proceed straight to dialog or offers.

**BossOfferPanel wiring.** `BossOfferPanel.ts` received a dismiss callback so it can signal `onDismiss()` when the player clicks an option, completing the handshake with the queue runner.

**Test coverage.** Two new test files — `postWaveUIQueue.test.ts` (12 tests on queue mechanics: enqueue ordering, flush-from-empty, clear, re-flush after clear, mid-queue clear, chained dismiss callbacks) and `postWaveSequencing.test.ts` (29 structural tests confirming that GameScene defers boss loot until `wave-complete`, that `PostWaveUIQueue` is imported and used, that `BossOfferPanel` carries a dismiss callback, that `clear()` is called on game-over, and that the non-boss path skips the boss-loot enqueue). Total: 1 616 tests passing, 0 type errors.

### TASK-055 — Creep Walking & Movement Animations (2026-03-02)

Creeps had directional facing and a gentle Y-axis bob from earlier tasks, but they still slid across the map like chess pieces — no walking cycles, no wing flaps, no sense of living creatures in motion. This task added procedural per-frame animations to every creep type without requiring new sprite assets.

**`creepAnimDefs.ts` — the animation data layer.** A new Phaser-free module defines a `CreepAnimDef` interface capturing five parameters per creep type: `squashAmpX/Y` (±5–10% scale oscillation for squash-and-stretch), `freqMult` (phase frequency multiplier — foxes sprint faster than deer), `useBounce` (replace `sin` with `|sin|` to produce a hop/bound cadence for hares), `swayAmpX` (lateral body sway amplitude in pixels), and `wingRotAmp` (wing sub-sprite rotation amplitude in radians for air creeps). A `getCreepAnimDef()` lookup function maps sprite keys and boss keys to their definitions, strips the `-ewN` endless-wave suffix before matching, and falls back to `DEFAULT_GROUND_ANIM` or `DEFAULT_AIR_ANIM` for unknown types. Twelve distinct animation styles are named — `trot`, `sprint`, `waddle`, `float`, `slither`, `flap-basic`, `flap-scout`, `flap-heavy`, `lumber`, `strut`, `hop`, `crackle` — each tuned to the creature's character.

**`Creep.ts` integration.** The `_animDef` is loaded in the constructor before `buildVisuals()`. `buildVisuals()` now stores references to wing and air-shadow sub-sprites (`_leftWing`, `_rightWing`, `_airShadow`) for efficient per-frame access. `updateDirectionalVisual()` caches `_baseScaleX/_baseScaleY` after calling `setDisplaySize()` so the animation layer always oscillates relative to the correct base scale rather than an accumulated one. A new `_stepWalkAnim(effectiveSpeed)` method is called from `step()` on every update: it advances the bob phase proportionally to `effectiveSpeed × freqMult`, computes a sine (or `|sine|` when `useBounce` is true), applies squash-and-stretch to the body image or body rect, optionally sways the body laterally, rotates wing sub-sprites symmetrically, and pulses the air-shadow's scaleX. Returning early when `effectiveSpeed ≤ 0` means frozen creeps freeze mid-stride, and the phase advances at 2× when game speed is doubled — all without special-casing either scenario.

**Test coverage.** `creepWalkAnims.test.ts` adds 60 tests: style definitions and their amplitude bounds, `wingRotAmp` presence on all air styles, `freqMult` ordering (sprint > trot > waddle), boss animation definitions for all five boss keys, endless-suffix stripping (e.g. `creep-normal-ew12` resolves identically to `creep-normal`), fallback correctness for unmapped sprite keys, `useBounce` only set on hop/crackle styles, phase arithmetic verifying that doubled game speed doubles phase advance, and structural checks confirming `_stepWalkAnim` exists in `Creep.ts` and is called from `step()`. Total: 1 635 tests passing, 0 type errors.

### TASK-080 — Mobile Menu Layout Audit — Fix Squashed Text & Overlapping Elements (2026-03-02)

The TASK-068 mobile pass handled canvas scaling and the in-game HUD, but the five non-GameScene Phaser scenes — `BetweenWaveScene`, `CodexScene`, `CommanderSelectScene`, `GameOverScene`, and `MetaMenuScene` — had never been audited at real phone viewports. At 667×375 (phone landscape) several screens had text clipping outside card bounds, offer cards overlapping each other, stat rows stacking on top of moon ratings, and interactive buttons narrower than 44 px.

**`BetweenWaveScene` — offer card spacing and reroll button.** Card positions and heights were recalculated using `isMobile()` so that at narrow widths the three offer cards compress without overlap. The reroll button repositions below the card strip rather than beside it on mobile, keeping the tap target 44 px tall and clear of card text.

**`CommanderSelectScene` — portrait, name, and description.** Commander card height grows on mobile to accommodate the ability-description text, which was previously cut off by a fixed-height clip. The back button was repositioned to sit above the safe-area inset so it is always reachable on notched phones.

**`GameOverScene` — stats, moon rating, and loot rows.** The stats panel and moon-rating row were sharing the same Y band. A mobile layout branch introduces additional vertical padding between the wave counter, kill stats, loot items, and action buttons, ensuring each row has at least 8 px clearance and all three action buttons (RETRY, MENU, META) remain tappable at 44 px height.

**`MetaMenuScene` — unlock tab and shop tab scrollability.** The unlock tree and shop item list can now overflow on small screens; scroll arrow buttons and a wheel-event handler (already used in the Unlocks tab for stage nodes) were extended to both the shop tab's consumable list and the unlock tab's responsive-height container.

**`CodexScene` — entry list and detail text.** The codex was the most heavily reworked scene: the entry list column width adapts from 240 px (desktop) to 160 px (mobile) so the detail pane has room for body text. A minimum font size of 11 px is enforced on all lore paragraphs, and the entry list uses a geometry mask to clip smoothly rather than letting text bleed into the HUD chrome.

**All desktop layouts unchanged.** Every mobile branch is guarded by `isMobile()` so the desktop experience is unaffected.

**Test coverage.** `mobileMenuLayout.test.ts` adds 70 structural tests covering: minimum tap-target sizes for every interactive element across all five scenes, minimum font-size checks for body and header text, gap-between-element arithmetic for the five most layout-sensitive regions, confirmation that each scene's mobile code path is gated behind `isMobile()`, and absence of overlapping Y ranges for the most frequently colliding element pairs. Total: 1 746 tests passing, 0 type errors.

### TASK-058 — Tower Idle & Attack Animations — Breathing Turrets, Firing Recoil (2026-03-02)

Before this task, towers sat motionless on the map regardless of what they were doing — firing projectiles at full rate but showing no sign of internal life. The battlefield read as a static icon grid with particle effects attached. This task adds per-frame idle animations and fire-triggered attack animations to every tower archetype, making each feel like a distinct machine or natural force.

**`towerAnimDefs.ts` — the animation data layer.** A new Phaser-free module defines the `TowerAnimDef` interface capturing all animation parameters per tower type: `idleType` (one of `sweep | pulse | spark | bob | bubble | aura-idle`), frequency, amplitude fields (`sweepDeg`, `pulseScale`, `bobAmpY`, `sparkIntervalMs`, `bubbleIntervalMs`), barrel-tracking parameters (`lerpDegPerFrame`, `leanDeg`), and fire-animation parameters (`recoilScale`, `recoilMs`, `fireFlashMs`, `firePulseScale`, `kickDeg`, `kickMs`). A `getTowerAnimDef(key)` lookup covers all seven tower keys with a `DEFAULT_TOWER_ANIM` fallback. Two tier-scaling helpers, `tierIntensity(tier)` and `tierSizeScale(tier)`, map upgrade tiers to intensity multipliers (1.0 / 1.30 / 1.65) and size scales (1.00 / 1.08 / 1.16) so higher-tier towers are visually more energetic and slightly larger. A `lerpAngleDeg(from, to, maxStep)` utility handles shortest-arc angle interpolation for smooth barrel rotation.

**`Tower.ts` integration — idle animations.** Seven new private fields track animation state: `_animDef`, `_animTier`, `_idlePhase`, `_barrelAngle`, `_visualTargetX/Y`, `_sparkTimer`, `_bubbleTimer`, plus optional `_sparkGfx` (Graphics object for Tesla sparks and Poison bubbles) and `_fireAnimTween` (to cancel mid-animation on rapid re-fire). The per-frame `_stepIdleAnim(delta)` method advances `_idlePhase` and dispatches to type-specific helpers: `_stepSweepIdle` rotates the tower container by `sin(phase) × sweepDeg × intensity` for Cannon and Mortar scanning; `_stepPulseIdle` breathes the body image scale for Frost and Arrow; `_stepSparkIdle` emits random spark arcs from the coil body using Graphics line draws at scaled intervals; `_stepBobIdle` offsets the body Y position sinusoidally for Mortar; `_stepBubbleIdle` spawns rising green circle particles for Poison. The aura-idle type is a no-op because the pulse ring is already managed by `stepAuraPulse()`.

**`Tower.ts` integration — target tracking.** `_stepBarrelTracking()` runs each frame when a live target exists: it computes the angle-to-target in degrees and calls `lerpAngleDeg` clamped to `lerpDegPerFrame`, then calls `setAngle()` on the tower container. Cannon and Mortar rotate smoothly toward their current target; Tesla applies a `leanDeg` tilt instead of full rotation. When a target dies or exits range, `_stepSweepIdle` resumes control of the container angle, creating a natural return-to-idle sweep without any additional state.

**`Tower.ts` integration — fire animations.** `_playFireAnim()` is called from `tryAttack()` immediately before the projectile is created. Any in-flight `_fireAnimTween` is stopped first, so rapid fires interrupt rather than stack. Cannon and Arrow fire a recoil tween: the body image snaps to `recoilScale × tierSizeScale` and tweens back to `tierSizeScale` over `recoilMs` ms using `Phaser.Math.Easing.Cubic.Out`. Frost fires a pulse tween: the body expands to `(1 + firePulseScale) × tierSizeScale` and eases back over `fireFlashMs` ms. Tesla fires a white-flash tween: `setTint(0xffffff)` for `fireFlashMs` ms then `clearTint()`. Mortar fires a barrel-kick: `_barrelAngle` is offset by `+kickDeg` instantly, then a tween drives it back to the current tracking angle over `kickMs` ms. Poison fires a glow: the body alpha pulses to 1.0 then settles back to 0.85. The `_fireAnimTween` reference prevents animation accumulation when attack speed is very high.

**Upgrade tier updates.** `_animTier` is refreshed whenever `UpgradeManager` applies an upgrade by calling the new `Tower.notifyTierChanged(tier)` method, which recomputes the `tierIntensity` and `tierSizeScale` multipliers used in all subsequent idle frames and fire events.

**Test coverage.** `towerIdleAnims.test.ts` adds 43 tests: idle-type assertions for all seven towers, per-parameter bounds checks (sweepDeg ≥ 5°, recoilScale < 1, kickDeg > 0 for Mortar, leanDeg ≤ 5° for Tesla, pulseScale ≤ 0.15), barrel-tracking presence checks (cannon/mortar have lerpDegPerFrame > 0; frost/poison have 0), `tierIntensity` and `tierSizeScale` bracket correctness, `lerpAngleDeg` arithmetic (shortest arc, boundary clamping, zero maxStep guard), `DEFAULT_TOWER_ANIM` fallback, and structural checks confirming `_stepIdleAnim`, `_playFireAnim`, and `notifyTierChanged` exist in Tower.ts. Total: 1 789 tests passing, 0 type errors.

### TASK-062 — Colorblind Accessibility — Non-Color Indicators & Palette Options (2026-03-02)

Before this task, every critical gameplay signal relied solely on colour: the placement highlight was green or red, wave-type badges were colour-coded blobs, and tower domain indicators were pure hue. Roughly 8% of male players have red-green colour vision deficiency (deuteranopia / protanopia) and could not distinguish these cues at all.

**`colorblindPalette.ts` — a Phaser-free selector layer.** A new module centralises every colourblind-aware colour decision. It exports six constant palette values — `CB_VALID_FILL` (lake blue), `CB_INVALID_FILL` (amber orange), `CB_VALID_ACCENT`, `CB_INVALID_ACCENT`, `CB_GROUND_BADGE`, `CB_BOSS_BADGE` — that shift the standard red/green signals to a blue/orange axis. Six selector functions (`cbPlacementValidFill`, `cbPlacementInvalidFill`, `cbValidAccent`, `cbInvalidAccent`, `cbGroundBadgeFill`, `cbBossBadgeFill`) each call `SaveManager.getColorblindMode()` at render time, so the swap takes effect on the next frame without a scene restart.

**Non-colour shape indicators throughout the UI.** Tower placement now renders a checkmark icon (✓) on valid tiles and an X icon (✗) on invalid tiles via a `_placementIcon` Phaser Text object managed in `GameScene`. The icon is coloured to match the palette selector output and sized to remain readable at any zoom. Wave-type badges in `WaveBanner` and `BetweenWaveScene` now embed Unicode shape glyphs alongside their text: ground waves show a mountain symbol (▲), air waves show a wing glyph (⌂), mixed waves show both, and boss waves add a skull marker (☠) in larger text. Tower domain indicators in `TowerPanel` use arrow symbols (↓ ground-only, ↑ air-only, ↕ both) so the target-domain information is readable in greyscale. All shape choices are visible in a simulation of deuteranopia and remain distinguishable without any colour perception.

**SaveManager settings persistence.** A new boolean field `colorblindMode` is added to `SaveData` with `defaultSaveData()` returning `false`. The public API adds `getColorblindMode()` and `setColorblindMode(val)`, the latter persisting immediately via the existing `_save()` path. `_sanitize()` coerces any non-boolean to `false` to handle corrupted saves gracefully.

**`AudioSettingsPanel` toggle.** A new COLORBLIND MODE toggle row is added to the audio/settings panel (rendered below the existing audio controls). It uses the same toggle pill style as the sound toggles and calls `setColorblindMode(true/false)` on the save manager when tapped; the pill state reflects the current setting on open. This keeps all accessibility settings in one reachable panel rather than burying them in a separate menu.

**Test coverage.** `colorblindAccessibility.test.ts` adds 67 tests covering: `SaveManager` getter/setter/sanitization/persistence for `colorblindMode`; all six `colorblindPalette` selectors in both modes with exact colour values; structural source checks confirming shape glyphs are present in `WaveBanner` badge labels, `BetweenWaveScene` badge text, and `TowerPanel` domain labels; structural checks for the `_placementIcon` field and its helper methods in `GameScene`; and structural verification that the colorblind toggle row is wired in `AudioSettingsPanel`. Total: 1 926 tests passing, 0 type errors.
