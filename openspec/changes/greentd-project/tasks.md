# GreenTD Implementation Tasks

Each phase delivers working, playable software. Phases build on each other — do not skip ahead.

---

## 1. Project Scaffold

*Deliverable: Phaser 3 running in the browser with a blank scene and asset loader.*

- [x] 1.1 Initialize Vite + TypeScript project (`npm create vite`, configure tsconfig)
- [x] 1.2 Install and configure Phaser 3 as a dependency
- [x] 1.3 Create folder structure: `src/{scenes,entities,systems,data,ui,meta}`
- [x] 1.4 Create `BootScene` (preload converted PNG assets from `/converted_assets/`)
- [x] 1.5 Create `MainMenuScene` (title, Start button, placeholder layout)
- [x] 1.6 Wire scene manager: Boot → MainMenu on load complete

---

## 2. Walking Skeleton

*Deliverable: Creeps walk a defined path, lives drain when they reach the end.*

- [x] 2.1 Define map JSON schema (tile grid, waypoint array, buildable zone flags)
- [x] 2.2 Author first map JSON (single winding path, ~12 waypoints)
- [x] 2.3 Render tile-based map (path tiles vs buildable tiles, distinct colors)
- [x] 2.4 Implement `Creep` class (position, HP, speed, type, current waypoint index)
- [x] 2.5 Implement waypoint path-following (lerp between waypoints, advance on arrival)
- [x] 2.6 Render HP bar above each creep (scales with current/max HP)
- [x] 2.7 Implement lives system (decrement on creep reaching end, emit `lives-changed` event)
- [x] 2.8 Implement game over trigger (lives reach 0 → transition to placeholder GameOver screen)
- [x] 2.9 Render lives counter in HUD

---

## 3. Core TD Loop

*Deliverable: Place a tower, it shoots creeps, you earn gold, a wave ends.*

- [ ] 3.1 Implement tower placement (click buildable tile → deduct gold → place tower sprite)
- [ ] 3.2 Render tower range circle (on hover during placement, on click when placed)
- [ ] 3.3 Implement targeting system (find nearest creep in range on attack timer tick)
- [ ] 3.4 Implement `Cannon` tower (fires single-target projectile, 1s attack interval baseline)
- [ ] 3.5 Implement `Projectile` class (travels toward target position, deals damage on arrival)
- [ ] 3.6 Implement creep death (remove sprite, award kill gold, emit `creep-killed` event)
- [ ] 3.7 Implement gold system (starting gold, earn on kill, display in HUD)
- [ ] 3.8 Implement basic `WaveManager` (spawn creeps at interval from a hardcoded wave def)
- [ ] 3.9 Implement wave complete detection (all creeps dead or escaped → between-wave pause)
- [ ] 3.10 Implement tower sell (right-click → refund 70% gold, remove tower)

---

## 4. All 6 Tower Archetypes

*Deliverable: Full tower roster is placeable and functional.*

- [ ] 4.1 Implement status effect system (modifiers on creeps: slow %, DoT stacks, freeze)
- [ ] 4.2 Implement `Frost` tower (projectile applies slow modifier, stacks diminish over time)
- [ ] 4.3 Implement `Mortar` tower (fires at ground target position, AoE splash on impact, ignores air)
- [ ] 4.4 Implement AoE damage resolver (damage all creeps within splash radius)
- [ ] 4.5 Implement `Poison` tower (hit applies DoT stack; each stack ticks damage independently)
- [ ] 4.6 Implement `Tesla` tower (on fire: damages primary target + chains to N nearest creeps)
- [ ] 4.7 Implement `Aura` tower (no attack; emits passive buff aura affecting towers in range)
- [ ] 4.8 Implement aura buff system (fire rate and/or damage multiplier applied to towers in aura range)
- [ ] 4.9 Build tower selection panel in HUD (6 buttons, show name + cost, disabled if insufficient gold)

---

## 5. Wave System

*Deliverable: 20-wave run with scaling difficulty and randomized composition.*

- [ ] 5.1 Define creep type data JSON (ground/air, base HP, speed, armor, gold reward per type)
- [ ] 5.2 Define 20 wave templates in JSON (difficulty band per wave, eligible creep type pool)
- [ ] 5.3 Implement randomized wave composition (pick from eligible pool within difficulty budget)
- [ ] 5.4 Implement HP and speed scaling curve (multiply base stats by wave number factor)
- [ ] 5.5 Implement air creep type (Mortar cannot target, requires Cannon/Tesla/Frost)
- [ ] 5.6 Implement wave completion bonus gold (flat + wave number multiplier)
- [ ] 5.7 Implement speed controls (1× / 2× / pause toggle in HUD)
- [ ] 5.8 Implement wave counter display in HUD (Wave 3 / 20)
- [ ] 5.9 Calculate and store run currency on run end (formula: waves × completion multiplier)

---

## 6. Tower Upgrade Trees

*Deliverable: BTD6-style 3-path upgrade trees for all 6 towers, with path locking and respec.*

- [ ] 6.1 Define upgrade tree JSON schema (3 paths × 5 tiers, stat deltas, cost, path lock threshold)
- [ ] 6.2 Implement upgrade application engine (apply tier effects to tower instance stats)
- [ ] 6.3 Implement path advancement lock (advancing path A to tier 3 locks out path C)
- [ ] 6.4 Implement respec (reset tower upgrades, refund at configured cost, re-enable locked paths)
- [ ] 6.5 Build upgrade panel UI (3 columns, tier pips, locked overlay, buy/respec buttons)
- [ ] 6.6 Define Cannon upgrade trees (Path A: armor shred; Path B: execute threshold; Path C: range/speed)
- [ ] 6.7 Define Frost upgrade trees (Path A: slow magnitude; Path B: freeze duration; Path C: shatter on death)
- [ ] 6.8 Define Mortar upgrade trees (Path A: splash radius; Path B: raw damage; Path C: cluster submunitions)
- [ ] 6.9 Define Poison upgrade trees (Path A: DoT damage per tick; Path B: max stack count; Path C: DoT spread on death)
- [ ] 6.10 Define Tesla upgrade trees (Path A: chain count; Path B: arc damage; Path C: overload mode)
- [ ] 6.11 Define Aura upgrade trees (Path A: attack speed aura; Path B: damage aura; Path C: range aura)
- [ ] 6.12 Implement Frost shatter drawback (deep freeze path destroys Poison DoT stacks on frozen creep death)
- [ ] 6.13 Implement Tesla overload drawback (deep overload path applies brief debuff to allied towers hit by chain)
- [ ] 6.14 Implement Aura specialization drawback (deep spec on one path reduces aura bonus for non-matching tower types in range)

---

## 7. Roguelike Offer Layer

*Deliverable: Between-wave upgrade cards appear; picking builds compound run identity.*

- [ ] 7.1 Define offer pool JSON (30+ offers across: combat abilities, economy, tower-type synergies)
- [ ] 7.2 Implement offer draw system (weighted random draw, no duplicate active offers per run)
- [ ] 7.3 Build `BetweenWaveScene` (display 3 offer cards, pick 1, advance to next wave)
- [ ] 7.4 Build offer card component (icon, name, 1-line description, hover highlight, click to select)
- [ ] 7.5 Implement run offer state (track active offers; apply their effects globally during the run)
- [ ] 7.6 Implement combat ability offers (e.g. "Chain Reaction": kills trigger lightning to nearest creep; "Lifesteal": towers heal 1 life per 50 kills)
- [ ] 7.7 Implement economy modifier offers (e.g. "Gold Rush": wave bonus +50%; "Scavenger": sell refund 85%)
- [ ] 7.8 Implement tower-type synergy offers (e.g. "Venomfrost": Frost slow is 30% stronger on Poison-stacked creeps; "Static Field": Tesla chains deal +20% to slowed targets)
- [ ] 7.9 Wire BetweenWaveScene into run loop (after wave complete → offers → next wave)

---

## 8. Run Loop & Game States

*Deliverable: A complete run plays from main menu through to a win or loss screen.*

- [ ] 8.1 Build `GameOverScene` (lives hit 0; show wave reached, run currency earned, Retry / Menu)
- [ ] 8.2 Build `RunCompleteScene` (all 20 waves cleared; show stats, currency earned, Go to Meta)
- [ ] 8.3 Wire full run flow (MainMenu → Game → BetweenWave ↔ Game → GameOver or RunComplete)
- [ ] 8.4 Award run currency on exit to GameOver or RunComplete (pass to meta system)
- [ ] 8.5 Display run currency earned in both end screens
- [ ] 8.6 Add run currency accumulator to HUD (shows current-run earnings in real time)
- [ ] 8.7 Playtest full 20-wave run; verify session lands in 15-20 minute window

---

## 9. Meta-Progression

*Deliverable: Run currency persists, unlocks carry across sessions, stat bonuses apply at run start.*

- [ ] 9.1 Implement `SaveManager` (localStorage read/write for: currency balance, unlock states, stat nodes)
- [ ] 9.2 Define unlock tree data (costs and unlock effects for: locked towers, upgrade path variants, second map)
- [ ] 9.3 Define stat bonus tree data (nodes: +50 starting gold, +1 life, -5% tower cost, etc.; cumulative)
- [ ] 9.4 Build `MetaMenuScene` (two panels side by side: Unlocks | Stat Bonuses; currency balance at top)
- [ ] 9.5 Build unlock tree UI (nodes with icon, name, cost; connected by lines; locked/available/owned states)
- [ ] 9.6 Build stat bonus tree UI (grid of nodes, show cumulative effect preview before purchase)
- [ ] 9.7 Implement unlock effects at game start (hide locked towers from placement panel; hide locked upgrade paths)
- [ ] 9.8 Implement stat bonus effects at run start (read purchased nodes, apply to initial gold/lives/costs)
- [ ] 9.9 Add Meta button to MainMenu and end screens

---

## 10. Second Map

*Deliverable: Two distinct maps with meaningful strategic differences; map selection on main menu.*

- [ ] 10.1 Design second map path (longer path, multiple chokepoints, favors AoE towers over single-target)
- [ ] 10.2 Author second map JSON (waypoints, tile grid, buildable zones)
- [ ] 10.3 Build map selection UI on MainMenu (map name, short description, path thumbnail preview)
- [ ] 10.4 Wire map selection into game start (load chosen map JSON into Game scene)
- [ ] 10.5 Lock second map behind unlock tree (purchasable with run currency)
- [ ] 10.6 Add 10 additional roguelike offers to pool (ensure pool has variety at higher wave counts)

---

## 11. Polish & Balance

*Deliverable: Game feels good to play, difficulty curve is satisfying, no obvious dominant strategies.*

- [ ] 11.1 Add creep hit flash (brief white tint on damage received)
- [ ] 11.2 Add creep death effect (small particle burst or scale-out tween)
- [ ] 11.3 Add tower fire visual feedback (muzzle flash or projectile trail per tower type)
- [ ] 11.4 Add slow/freeze visual on affected creeps (blue tint for slow, ice overlay for freeze)
- [ ] 11.5 Add poison visual on affected creeps (green particle aura while DoT is active)
- [ ] 11.6 Add sound effects (tower fire, creep death, wave complete, upgrade purchased, life lost)
- [ ] 11.7 Add keyboard shortcuts (Space = pause, F = speed toggle, Esc = deselect tower)
- [ ] 11.8 Implement run stats tracking (total kills, gold earned, waves survived; shown on end screen)
- [ ] 11.9 Balance wave difficulty curve (3 playtest sessions; tune HP/speed scaling coefficients)
- [ ] 11.10 Balance tower economy (costs, sell refunds, upgrade costs; target: gold is always tight but never blocking)
- [ ] 11.11 Balance roguelike offer power (no single offer should be auto-pick every run)
- [ ] 11.12 Performance audit (profile 40+ simultaneous creeps + projectiles; optimize draw calls if needed)
- [ ] 11.13 Cross-browser smoke test (Chrome, Firefox, Safari; verify no rendering regressions)
