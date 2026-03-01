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
