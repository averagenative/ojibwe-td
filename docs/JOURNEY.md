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
