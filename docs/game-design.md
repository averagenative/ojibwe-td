# GreenTD — Game Design Reference

All game design decisions in one place. This is the "what and why" — the technical "how" is in `tech-stack.md`.

---

## Core Concept

A browser-native tower defense game inspired by Green TD (Warcraft 3). The design preserves what made Green TD good — aura synergies, meaningful tower composition, wave variety — and adds a Vampire Survivors-style roguelike layer for replayability.

**One-line pitch:** The tower defense game that doesn't have ads, runs in your browser, and gives you "one more run" compulsion.

---

## Player Experience Goals

- A complete, satisfying run fits in **15-20 minutes**
- Runs feel **different from each other** — different builds emerge from the roguelike layer
- Losing feels fair; winning feels **earned not cheesed**
- A new player can place their first tower **within 90 seconds of opening the URL**
- Meta-progression means **even a failed run moves something forward**

---

## What a Run Looks Like

1. Open game in browser — no install, no account
2. Select a map (once second map is unlocked)
3. Start with base gold and lives (modified by meta stat bonuses)
4. Waves spawn — place towers, earn gold on kills and wave completion
5. After each wave: **pick 1 of 3 roguelike upgrade offers**
6. Survive all 20 waves → Run Complete screen
7. Lose all lives → Game Over screen
8. Either way: earn **run currency**, proceed to meta screen

---

## Tower Archetypes

Six towers at launch. Each has:
- A defined role (no two towers do the same job)
- Three upgrade paths (BTD6-style)
- A meaningful drawback when heavily specialized

| Tower | Role | Air? | Drawback at Deep Spec |
|---|---|---|---|
| **Cannon** | Single target, high damage, long range | Yes | Armor shred path dead vs unarmored; execute path dead vs high-HP waves |
| **Frost** | Slow and control | Yes | Freeze-shatter on death destroys active Poison DoT stacks nearby |
| **Mortar** | AoE ground splash, wave clear | **No** | Blast radius disrupts Frost slow zones; cannot hit air at all |
| **Poison** | DoT stacking, attrition | Yes | Heavy spec makes creeps resistant to movement-slowing effects |
| **Tesla** | Chain/bounce, multi-target | Yes | Overload arcs briefly debuff allied towers they pass through |
| **Aura** | Passive buff to nearby towers, no direct damage | — | Spec into one type buffs those towers, actively reduces all others in range |

### The Aura Tower

The Aura tower is the most strategically important. It has no direct damage and forces you to commit to a composition. Spec it into Cannon aura and your Cannons become significantly stronger — but your Frost and Poison towers in range take a penalty. It rewards building with intention, punishes mixing without thought. This is the most direct expression of Green TD's design philosophy.

---

## Upgrade System (BTD6-Style)

Each tower has **3 upgrade paths**, each with **5 tiers**.

**Rules:**
- You can freely advance any path through tier 2
- Once you advance **any path to tier 3**, one other path becomes locked forever (for that tower)
- The third path can still advance to tier 2 maximum
- Choices are **permanent** but you can **respec** (reset all upgrades on that tower) for a gold cost

**Why permanent with respec:**
Permanent choices create real decision weight — you think before you upgrade. Respec at a cost means mistakes aren't catastrophic. The gold cost of respecting is meaningful pressure, not punishment.

**Cross-tower drawbacks:**
Deep specialization in one tower creates specific mechanical effects on other tower types. These are not random — they are designed conflicts:
- Frost shatter + Poison DoT stacks don't coexist
- Tesla overload + nearby allied towers have a friction
- Aura deep spec creates a binary: all-in on one composition or accept penalties

---

## Roguelike Layer (Between-Wave Offers)

After every wave completes, the game pauses and presents **3 upgrade offer cards**. Pick 1. The wave then starts.

**Offer categories:**
- **Combat abilities** — active or passive mechanics that change how damage is dealt (e.g. chain lightning on kill, towers deal splash to nearby enemies after killing one, lifesteal at 50 kills)
- **Economy modifiers** — change the gold/cost landscape (e.g. wave completion bonus +50%, sell refund 85%, next tower costs half)
- **Tower-type synergies** — compound with tower choices made this run (e.g. Frost slow is 30% stronger on Poison-stacked creeps, Tesla chains deal +20% to slowed targets)

**Design intent:** Offers should feel like a Vampire Survivors build coming together. By wave 10 your game should feel meaningfully different from another run. No single offer should be auto-pick every time.

**Technical note:** The offer pool has 30+ offers at launch. Draws are weighted-random without repeat until the pool is exhausted. Active offers persist for the full run.

---

## Wave System

**Structure:** 20 waves per standard run. Each wave has a defined difficulty band.

**Randomization:** Wave composition is randomized within each difficulty band. Wave 7 is always approximately as hard as wave 7, but the creep mix — types, ratios — varies each run. Same wave number, different experience.

**Scaling:** Creep base HP and speed multiply by a scaling factor per wave number. Difficulty curves up continuously, not in sudden jumps.

**Creep types:**
- Ground (targetable by all towers)
- Air (Mortar cannot target; requires Cannon, Frost, Tesla, Poison)

**Between waves:** Brief pause + roguelike offer screen. No time pressure during offers.

**Endless mode:** Planned for a future update. Architecture must support wave generation beyond wave 20. Not in v1.

---

## Economy

| Source | Amount |
|---|---|
| Starting gold | Base 200 (modified by meta stat bonuses) |
| Creep kill | Varies by creep type (tougher = more gold) |
| Wave completion bonus | Flat + wave number multiplier |
| Tower sell | 70% refund of total gold spent on tower + upgrades |
| Respec cost | Fixed per tower, does not scale |

**Design intent:** Gold should always feel tight but never blocking. You should be making real decisions about what to build, not idly clicking upgrades.

---

## Meta-Progression

Persistent across sessions, stored in localStorage.

### Run Currency
Earned on every run, win or lose. Formula: waves completed × base rate, with a completion bonus multiplier for finishing all 20.

### Unlock Tree
Passive unlocks purchased with run currency:
- Additional tower archetypes (future)
- Alternative upgrade path variants (future)
- Second map and beyond
- Cosmetic options (future)

### Stat Bonus Tree
Small permanent buffs purchased with run currency:
- +50 starting gold
- +1 starting life
- -5% tower placement cost
- Respec cost reduction
- Wave completion bonus increase
- Etc.

Nodes are cumulative and stackable. Buying all nodes in the stat tree gives a meaningful but not game-breaking edge. The game should still be beatable from scratch.

---

## Replayability — Three Pillars

1. **Wave randomness** — same difficulty band, different creep composition every run
2. **Roguelike offer variance** — different build emerges each run from random offer draws
3. **Multiple maps** — distinct path layouts favor different tower archetypes; map selection is strategic

These three compound: a different map + different offer draws + different creep mix = a run that genuinely feels distinct.

---

## What We Are NOT Building (v1)

- Multiplayer
- Mobile layout
- Endless mode (architecture supports it, not implemented)
- Server-side leaderboards
- Original art (using converted WC3 assets temporarily — Blizzard IP, replace before public launch)
- Accounts or cross-device sync

---

## Target Personas

| Persona | What they want | How we deliver |
|---|---|---|
| Mobile TD Refugee | Real game, no ads | Browser URL, no monetization, full game immediate |
| Nostalgic WC3 Player | Aura synergies, composition depth | Aura tower, cross-tower drawbacks, BTD6 upgrade trees |
| Roguelike Enthusiast | "One more run" loop | Between-wave offers, meta-progression, run variance |
| Lunch-Break Gamer | 15-20 min completable session | Fixed wave count, session ends cleanly |
