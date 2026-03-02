---
id: TASK-067
title: Deep Progression — Loot Drops, Tower Gear, Commander Enhancements, Replayability Loop
status: done
priority: high
phase: gameplay
planning: true
---

# Deep Progression — Loot Drops, Tower Gear, Commander Enhancements, Replayability Loop

## Problem

Once a player clears wave 20 on all maps, progression flatlines. The ascension
system (TASK-034) adds difficulty modifiers but no new rewards. The meta loop is:
play → earn crystals → buy stat nodes → play slightly easier. There's no loot,
no gear, no "just one more run" dopamine hook. Players need reasons to replay
maps beyond chasing moon ratings.

## Goal

Design and implement a deep progression layer with interconnected systems:
tower gear (equippable items that modify tower behavior), commander enhancements,
optional challenge maps that drop unique loot, and a gear upgrade/crafting path.
This turns Ojibwe TD from a "beat it once" game into a "hundreds of hours" game.

## Design — Interconnected Systems

### 1. Tower Gear System

Towers can equip **gear items** that modify their stats or add new effects.
Each tower has 1-2 gear slots (unlocked via ascension or progression).

**Gear Rarity:**
| Rarity | Colour | Drop Rate | Stat Range | Special Effect |
|--------|--------|-----------|------------|----------------|
| Common | Grey | 60% | +5-10% | None |
| Uncommon | Green | 25% | +10-20% | None |
| Rare | Blue | 10% | +15-30% | 1 minor effect |
| Epic | Purple | 4% | +25-40% | 1 major effect |
| Legendary | Orange | 1% | +35-50% | 1 unique effect |

**Gear Types (one per tower archetype + universal):**
- **Barrel Mods** (Cannon): +damage, +range, armour penetration %, splash radius
- **Crystal Cores** (Frost): +slow %, freeze duration, chill aura radius
- **Coil Amplifiers** (Tesla): +chain count, chain range, overload chance
- **Shell Casings** (Mortar): +AoE radius, cluster count, impact stun duration
- **Venom Glands** (Poison): +DoT damage, stack limit, spread radius
- **Spirit Totems** (Aura): +buff radius, buff strength, dual-buff chance
- **Universal Charms**: +attack speed %, +range %, +damage % (fits any tower)

**Gear Examples:**
- *Makwa's Claw* (Legendary Cannon): +40% damage, attacks shred 50% armour for 3s
- *Migizi Feather* (Epic Tesla): +2 chain targets, chains prioritize air creeps
- *Frozen Lakebed Shard* (Rare Frost): +25% slow, frozen creeps take +15% damage
- *Thunderbird's Spark* (Legendary Universal): 5% chance any attack calls lightning
  on the target (100 bonus damage)

### 2. Loot Drop System

**How loot drops:**
- Completing any map run awards 0-2 gear items based on performance:
  - Full moon rating: guaranteed 1 drop + chance for second
  - Boss kills: each boss has a small chance to drop boss-specific loot
  - Ascension runs: higher ascension = higher rarity weight
  - Endless mode: gear drops every 10 waves survived
- Challenge maps (see below) have guaranteed drops with higher rarity

**Loot UI:**
- Post-run loot screen shows drops with rarity glow and stats
- "NEW" badge for first-time drops
- Inventory screen accessible from meta menu (grid view, filter by type/rarity)
- Equip screen: select a tower type → see gear slots → drag/assign gear

### 3. Challenge Maps (Loot Dungeons)

Special optional maps designed around specific challenges with guaranteed
loot drops. These are the "run it again" content.

**Map Ideas:**
| Map | Challenge | Guaranteed Drop |
|-----|-----------|----------------|
| **Makwa's Den** | All creeps armoured, 15 waves, no Cannon allowed | Rare+ Frost/Tesla/Poison gear |
| **Eagle's Nest** | Air-only waves, vertical map, tight build space | Rare+ Tesla/Frost gear |
| **Waabooz Warren** | Endless split creeps, every kill spawns 2 mini | Rare+ AoE gear (Mortar/Tesla) |
| **Thunderbird Spire** | 10 waves, ascending difficulty, final boss Animikiins×3 | Epic+ Universal gear |
| **Michi-gami Shore** | Dual entrance, water hazard tiles, limited build area | Legendary chance + currency bonus |

- Challenge maps unlock at specific ascension levels or crystal thresholds
- Each has a unique map layout and modifier that forces specific strategies
- Weekly rotation: one challenge map is "featured" with bonus drop rates
- First clear per week gives guaranteed rare+ drop

### 4. Commander Enhancements

Commanders gain experience and can equip **enhancement slots**:

**Commander XP:**
- Earned per run: base XP + wave bonus + boss bonus + ascension multiplier
- Each commander levels independently (encourages trying all commanders)
- Levels unlock enhancement slots and passive upgrades

**Commander Level Rewards:**
| Level | Reward |
|-------|--------|
| 2 | Enhancement slot 1 unlocked |
| 5 | Passive ability upgrade (e.g. +5% to their primary bonus) |
| 8 | Enhancement slot 2 unlocked |
| 10 | Signature ability unlocked (unique active ability per commander) |
| 15 | Enhancement slot 3 unlocked |
| 20 | Mastery title + cosmetic border for portrait |

**Enhancement Items:**
- Similar to tower gear but for commanders
- Modify commander passives, add new minor abilities, or boost tower synergies
- Examples:
  - *War Paint of Focus*: commander's tower damage bonus +10% for first 5 waves
  - *Medicine Pouch*: start each run with +1 life
  - *Eagle Eye Charm*: all towers +5% range for the first tower of each type placed
  - *Spirit Walker's Moccasins*: commander passive applies at 150% strength on
    challenge maps

### 5. Gear Upgrade / Crafting System

**Gear Enhancement:**
- Spend crystals + duplicate gear to upgrade existing items:
  - +1 through +5 enhancement levels
  - Each +level adds ~5% to the gear's stat bonuses
  - +3 adds a socket for a **rune** (minor stat gem)
  - +5 evolves the gear to the next rarity tier (Rare → Epic)
- Duplicate gear is the primary upgrade fuel (incentivizes replaying for drops)

**Rune System (stretch):**
- Small stat gems that socket into +3 gear
- Dropped from challenge maps or crafted from shards
- Types: damage, speed, range, special (element-specific)
- Simple: no complex crafting tree, just "insert rune into socket"

**Salvage:**
- Unwanted gear can be salvaged for crafting shards
- Shards combine into runes or trade for crystals
- Prevents inventory bloat — everything has value

### 6. Additional Map Ideas

Beyond challenge maps, the world should grow:

**New Regions:**
- **Gichi-gami (Great Lake)**: water-heavy maps, island build zones, bridge
  chokepoints. Creeps cross frozen sections in winter.
- **Ishkode-aki (Fire Lands)**: volcanic terrain, lava tiles that damage creeps
  AND towers if built adjacent. Risk/reward placement.
- **Giizhig (Sky)**: floating island maps, all creeps are air by default,
  towers build on cloud platforms. Tesla/Frost paradise.
- **Anamakamig (Underground)**: cave maps, limited visibility radius around
  towers (fog of war), creeps emerge from tunnels.

**Map Modifiers (mix and match):**
- Shrinking build zone (outer tiles become unbuildable each wave)
- Rising water (low tiles flood, forcing tower relocation)
- Night mode (reduced tower range, creeps harder to see)
- Earthquake (random tiles become temporarily unbuildable)

### 7. Replayability Hooks Summary

| Hook | System | Player Motivation |
|------|--------|-------------------|
| Ascension ladder | TASK-034 | "Can I beat A10?" |
| Tower gear drops | Loot system | "Need that Legendary for Cannon" |
| Challenge maps | Loot dungeons | "Weekly reset, guaranteed Epic" |
| Commander leveling | XP + enhancements | "Get Makwa to level 20" |
| Gear upgrading | Crafting | "Evolve my Rare to Epic" |
| Moon rating chase | Stage completion | "Full moon every map on A5" |
| Endless records | Wave records | "Beat my wave 47 record" |
| Collection completion | Codex | "Missing 3 Legendary items" |
| Weekly featured map | Rotation | "This week's bonus drops" |

## Acceptance Criteria

### Phase 1: Data & Core (implement first)
- [ ] `src/data/gearDefs.ts` — GearItem interface, rarity system, all gear
  definitions (at least 30 items across all tower types + universal)
- [ ] `src/meta/InventoryManager.ts` — gear inventory in SaveManager, max 50
  items, salvage, equip/unequip
- [ ] `src/systems/GearSystem.ts` — applies equipped gear stats to towers at
  runtime (modifies TowerDef values before Tower construction)
- [ ] Loot roll function: `rollLoot(ascension, moonRating, isChallengeMap)`
  returns 0-2 GearItem instances with weighted rarity

### Phase 2: UI
- [ ] Post-run loot screen (replaces or augments GameOverScene)
- [ ] Inventory grid in MetaMenuScene (new tab or sub-scene)
- [ ] Tower equip screen (accessible from tower panel during build phase or
  from meta menu)
- [ ] Gear tooltip showing stats, rarity, effects

### Phase 3: Challenge Maps
- [ ] 3-5 challenge map JSON files with unique layouts
- [ ] Challenge map select screen (separate from normal stage select)
- [ ] Per-challenge modifier system (reuse AscensionSystem pattern)
- [ ] Weekly rotation logic (seed from current week number)

### Phase 4: Commander Progression
- [ ] Commander XP tracking in SaveManager
- [ ] Level-up rewards and enhancement slot unlocking
- [ ] Enhancement item definitions and equip UI
- [ ] Signature abilities for each commander (level 10 unlock)

### Phase 5: Gear Upgrading
- [ ] Enhancement (+1 to +5) UI and logic
- [ ] Rarity evolution system
- [ ] Rune sockets (stretch)
- [ ] Salvage system

### Guards
- [ ] `npm run typecheck` clean
- [ ] `npm run test` passes
- [ ] Gear stats don't break game balance (capped multipliers, no infinite scaling)
- [ ] Inventory persists correctly across sessions (SaveManager schema migration)
- [ ] Challenge maps don't break existing wave/creep systems
- [ ] All gear effects have unit tests

## Notes

- This is a LARGE feature set — likely 5-10 individual implementation tasks
  once the design is approved. This task is the design document; implementation
  tasks should be broken out from it.
- The gear system is inspired by Diablo/Path of Exile itemization adapted for
  TD: instead of equipping a character, you equip towers and your commander.
- Challenge maps are the key replayability driver — they're the reason to log
  in weekly. Time-gated rewards (weekly reset) create habit loops.
- Gear rarity progression creates a natural difficulty → reward curve:
  normal maps drop Common/Uncommon, ascension drops Rare, challenges drop Epic,
  highest ascension challenges drop Legendary.
- The Ojibwe naming continues: gear items named after animals, natural elements,
  and Anishinaabe concepts. Legendaries named after specific spirits or legends.
- Balance concern: gear should make players ~20-30% stronger at full build, not
  200%. The fun is in build variety, not raw power creep.
- Consider seasonal events: special limited-time challenge maps with themed
  gear (Winter Solstice map with ice-themed Legendary drops, etc.)
