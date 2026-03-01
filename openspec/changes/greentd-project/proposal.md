## Why

Mobile tower defense games are overrun with ads and dark patterns that make them effectively unplayable. There is no quality, ad-free browser-based TD game that combines deep tower evolution mechanics with roguelike run variety and persistent meta-progression — the combination that makes games like Vampire Survivors compulsively replayable.

Green TD (the Warcraft 3 map) had the right DNA — aura stacking, meaningful tower synergies, varied wave composition — but it requires WC3 to play and hasn't been accessible in years. We build a browser-native successor that preserves that design soul, adds a roguelike progression layer, and removes every friction point between player and game.

## What Changes

This is a greenfield project. The following capabilities are being introduced:

- Solo desktop browser tower defense game, playable at a URL with no install
- **6 tower archetypes**, each with BTD6-style branching upgrade paths (3 paths, pick 2 to advance past tier 3)
- **Specialization with cross-tower drawbacks** — committing deeply to one tower type creates specific mechanical conflicts with other types, forcing real composition decisions
- Permanent per-tower upgrade choices with gold-cost respec
- **Vampire Survivors-style roguelike layer** — between each wave, pick 1 of 3 global passive ability offers that compound over the run (not just stat bumps — abilities like chain lightning on kill, gold on crit, tower pulse effects)
- Wave-based run structure: 15-20 minute sessions, randomized wave composition within a difficulty envelope, increasing challenge
- **Replayability via three pillars**: randomized wave composition, random roguelike offer pool each run, multiple maps with distinct path layouts
- Run currency earned on any completion or failure, used to unlock meta-progression
- **Two meta-progression trees**: unlock tree (new tower archetypes, new upgrade path variants, new maps) and stat bonus tree (starting gold, extra lives, tower cost reduction, etc.)
- JSON-driven definitions for towers, waves, upgrade trees, and maps — new content requires no engine changes
- localStorage save system — no backend, no account required

## Tower Archetypes

Each archetype has a defined role, a natural upgrade direction, and a specific drawback when heavily specialized. Drawbacks are intentional — they create composition tension, not punishment.

| Tower | Role | Specialization Drawback |
|---|---|---|
| **Cannon** | Single target, high damage, long range | Path A (armor shred) becomes ineffective vs unarmored creeps; Path B (execute threshold) is dead value vs high-HP waves |
| **Frost** | Slow and control | Heavy freeze spec shatters frozen enemies on death — destroying active Poison DoT stacks from nearby towers |
| **Mortar** | Ground AoE splash, wave clear | Cannot hit air units; heavy splash spec creates blast radius so large it disrupts Frost slow zones |
| **Poison** | DoT stacking, attrition damage | Builds slowly, no burst; heavy spec makes creeps resistant to movement-slowing effects |
| **Tesla** | Chain/bounce, multi-target | Heavy overload spec causes chain arcs to apply a brief debuff to nearby allied towers they jump through |
| **Aura** | Passive buff to nearby towers, no direct damage | Spec into one tower type amplifies that type significantly but actively reduces effectiveness of all other tower types in range — forces composition commitment |

The Aura tower is the most strategically interesting and the most direct expression of Green TD's design: it rewards building around a theme and punishes mixing without intention.

## Replayability Design

Three layered sources of run variance:

1. **Wave randomness** — wave composition is randomized within a defined difficulty envelope per wave number. Same wave 7 won't always be the same enemy mix.
2. **Roguelike offers** — upgrade pool is large; each run presents a different subset of offers in a different order. Runs develop different "builds."
3. **Multiple maps** — distinct path layouts that favor different tower archetypes. Map selection is part of pre-run setup.

## Business Value

### Who Benefits

**The Mobile TD Refugee** *(primary)*
Plays BTD6 or Kingdom Rush on mobile but is worn down by forced ads every 2 minutes, energy systems that gate play, and paywalls on core content. They want a real game, not a Skinner box. They have 15-20 minutes during a lunch break or commute and just want to play. This player benefits immediately — no install, no account, no ads, full game from the first URL visit.

**The Nostalgic WC3 Player**
Played Green TD, Wintermaul, or similar WC3 custom maps in their teens or early twenties. That era of tower defense had genuine mechanical depth that modern mobile games don't replicate. They've tried mobile alternatives and been disappointed. This player benefits from a game that scratches the specific itch — aura synergies, meaningful upgrade choices, compositions that actually matter — without needing to boot up Battle.net.

**The Roguelike Enthusiast**
Plays Vampire Survivors, Slay the Spire, or Hades. Values the "one more run" loop, build variety, and the feeling of a run coming together. May not be a traditional TD player but is attracted to the between-wave upgrade system and meta-progression. This player benefits from a TD game that finally has the compulsive replayability of a roguelike.

**The Lunch-Break Gamer**
Needs something genuinely completable in 15-20 minutes, accessible from any browser tab, that doesn't require remembering complex state from a prior session. The run structure is built for this — start fresh, finish a run, feel satisfied. Meta-progression means even an incomplete run feels like forward progress.

### The Problem, Precisely

The issue is not that tower defense is a bad genre. The issue is that **every quality TD game is either locked behind a platform or locked behind a monetization wall**. BTD6 costs money on desktop and has creeping monetization on mobile. Kingdom Rush has a strong first game but its sequels are paywalled. Browser TD games are low-quality Flash-era relics. WC3 custom maps require a $30 game and an aging launcher.

There is no answer to: *"I want to play a good, deep tower defense game right now, in my browser, for free, with no strings."*

That is the gap this fills.

### Priority: Value First

Ordered by value delivered to the player, not technical interest:

1. **Core loop** (creeps + towers + gold + lives) — zero value without this; everything else is meaningless
2. **Tower variety and upgrades** — the primary differentiator; this is what makes it not generic
3. **Roguelike between-wave offers** — the replayability engine; transforms a "game" into a "run-based game"
4. **Meta-progression** — the retention engine; gives players a reason to return after a run ends
5. **Multiple maps** — extends replayability ceiling; each map is a new context for the same systems
6. **Endless mode** — serves the power player segment; lower priority, architecture must support it

### What Happens If We Don't Build This

The personal cost: continuing to play games designed to extract money rather than deliver enjoyment. The market cost: the gap stays unfilled. No one is building this specific combination — browser-native, no monetization friction, TD depth, roguelike loop. The closest competitors (BTD6 web, various itch.io projects) either lack depth or lack accessibility. The opportunity is real and uncontested at this quality bar.

There is also a compounding cost of delay: the longer the WC3 era recedes, the smaller the nostalgic player base. The roguelike/VS audience, however, is actively growing and actively looking for new entries in that genre.

### Success Metrics

**Engagement (is the game fun?)**
- Average session length ≥ 15 minutes (matches intended run length)
- Run completion rate ≥ 50% (game is learnable, not just punishing)
- Players who play more than 1 run in a session: target ≥ 40% (the "one more run" signal)

**Retention (does it have legs?)**
- Day-7 return rate ≥ 25% (meta-progression is working)
- Meta currency spend rate ≥ 60% (players understand and value the unlock system)
- Average runs per player across lifetime ≥ 10 (replayability is real)

**Accessibility (does the friction-free model work?)**
- Time from URL visit to first tower placed: target ≤ 90 seconds
- Bounce rate before game start ≤ 20%

**Leading indicator (before we have users)**
- Internal playtest: can a new player complete a run without reading instructions?
- Internal playtest: do runs feel meaningfully different from each other?

## Capabilities

### New Capabilities

- `game-engine`: Phaser 3 + TypeScript + Vite scaffold; scene management (Boot, MainMenu, Game, BetweenWave, GameOver, MetaMenu); game loop and rendering pipeline
- `map-path`: Tile-based maps with JSON-defined creep path(s); tower placement grid; support for multiple maps with distinct layouts
- `creep-system`: Creeps following the path with HP/armor/speed/type attributes; randomized wave composition within difficulty envelope; air and ground unit types; wave-scaling HP and speed curves
- `tower-system`: 6 archetypes (Cannon, Frost, Mortar, Poison, Tesla, Aura) with defined roles; placement, targeting modes, projectile firing, sell, respec
- `tower-upgrades`: BTD6-style 3-path branching per tower; 2-path advancement lock after tier 3; permanent choice with gold respec cost; cross-tower drawback effects applied on deep specialization
- `economy`: Gold from creep kills and wave completion bonuses; lives system; tower placement and respec costs; run currency accumulation
- `wave-manager`: JSON wave definitions with randomized composition within difficulty bands; spawning logic; between-wave pause state; endless mode (future, architecture must support it)
- `roguelike-offers`: Between-wave scene presenting 3 randomly drawn upgrade cards (pick 1); VS-style global passive abilities that stack and compound; pool includes combat abilities, economy modifiers, and tower-type synergy bonuses
- `meta-progression`: Run currency accumulation and persistence; unlock tree (tower archetypes, upgrade path variants, maps); stat bonus tree (starting gold, lives, costs); localStorage save/load; meta screen UI
- `hud`: In-game HUD (lives, gold, wave counter, run currency, speed controls); tower info panel on click; upgrade path panel with path lock visualization; sell/respec buttons

### Modified Capabilities

*(none — greenfield project)*

## Impact

- **Dependencies**: Phaser 3, TypeScript, Vite; no backend, no database
- **Assets**: Temporarily using converted PNG assets from Green TD Evo v2.06 (`/converted_assets/`); original art required before any public launch — existing assets are Blizzard IP
- **Storage**: localStorage only — all save state client-side; no cross-device sync in v1
- **Platform**: Desktop browser primary; mobile browser deferred (layout and touch input require separate design pass)
- **Future considerations**: Multiplayer (WebSockets, netcode), endless mode wave generation, original art pipeline, server-side leaderboards, mobile layout, additional maps and tower types via unlock tree
