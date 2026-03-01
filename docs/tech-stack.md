# GreenTD — Tech Stack & Architecture

The technical decisions, why each was made, and how the pieces fit together.

---

## Stack Overview

| Layer | Choice | Why |
|---|---|---|
| Game engine | **Phaser 3** | Most mature 2D browser game framework; scene management, input, sprites, tilemaps, audio all built in; large community; great docs |
| Language | **TypeScript** | Complex state across tower upgrade trees, meta-progression, run state — types catch category errors before they become bugs |
| Build tool | **Vite** | Fast dev server, hot module reload, TypeScript out of the box, trivial to configure |
| Persistence | **localStorage** | No backend needed; all save state is client-side; works offline; no account required |
| Assets | **Converted PNGs** | Extracted from Green TD Evo v2.06; already available in `/converted_assets/`; placeholder only — Blizzard IP |

---

## Why Phaser 3 (not alternatives)

**vs. PixiJS:** PixiJS is a rendering engine, not a game framework. It's faster for pure rendering but you'd build scene management, input handling, and audio yourself. For a project this scope, Phaser's batteries-included approach saves weeks.

**vs. Kaboom.js / LittleJS:** Simpler APIs but smaller communities and less mature tooling. Phaser has years of production usage behind it.

**vs. Unity WebGL / Godot:** Overkill for a 2D sprite-based game and produce large build artifacts. Browser load time matters for a "open URL and play" experience.

**vs. plain Canvas:** Total control but enormous investment in infrastructure that Phaser already provides.

---

## Project Structure

```
src/
├── scenes/
│   ├── BootScene.ts          ← preloads all assets
│   ├── MainMenuScene.ts      ← start game, access meta
│   ├── GameScene.ts          ← core game loop
│   ├── BetweenWaveScene.ts   ← roguelike offer cards
│   ├── GameOverScene.ts      ← lives = 0
│   ├── RunCompleteScene.ts   ← all waves cleared
│   └── MetaMenuScene.ts      ← meta-progression trees
├── entities/
│   ├── Creep.ts              ← path-following, HP, status effects
│   ├── Tower.ts              ← base class; placement, targeting, firing
│   ├── Projectile.ts         ← travel, hit, damage resolution
│   └── towers/
│       ├── CannonTower.ts
│       ├── FrostTower.ts
│       ├── MortarTower.ts
│       ├── PoisonTower.ts
│       ├── TeslaTower.ts
│       └── AuraTower.ts
├── systems/
│   ├── WaveManager.ts        ← spawning, wave state, difficulty scaling
│   ├── UpgradeManager.ts     ← applies upgrade effects, manages path locks
│   ├── EconomyManager.ts     ← gold, lives, run currency
│   ├── OfferManager.ts       ← roguelike offer pool, draw, apply
│   └── StatusEffectSystem.ts ← slow, freeze, DoT, debuff lifecycle
├── data/
│   ├── towers.json           ← base stats for each archetype
│   ├── upgrades.json         ← 3-path upgrade trees for all 6 towers
│   ├── waves.json            ← 20 wave templates with difficulty bands
│   ├── creeps.json           ← creep type definitions (HP, speed, reward)
│   ├── offers.json           ← 30+ roguelike offer pool definitions
│   └── maps/
│       ├── map-01.json       ← first map (winding single path)
│       └── map-02.json       ← second map (chokepoint-heavy, favors AoE)
├── ui/
│   ├── HUD.ts                ← lives, gold, wave counter, speed controls
│   ├── TowerPanel.ts         ← tower selection buttons
│   ├── TowerInfoPanel.ts     ← selected tower stats
│   ├── UpgradePanel.ts       ← 3-path upgrade UI with lock visualization
│   └── OfferCard.ts          ← between-wave offer card component
└── meta/
    ├── SaveManager.ts        ← localStorage read/write
    ├── UnlockTree.ts         ← unlock tree state + purchase logic
    └── StatBonusTree.ts      ← stat bonus tree state + purchase logic
```

---

## Data-Driven Design

All content is defined in JSON files under `src/data/`. The game engine reads these at runtime — **adding new content requires no engine code changes**.

### Map format (conceptual)
```json
{
  "id": "map-01",
  "name": "Winding Pass",
  "grid": [[0,1,0,...], ...],
  "waypoints": [{"x": 2, "y": 0}, {"x": 2, "y": 4}, ...],
  "buildableZones": [{"x": 1, "y": 1}, ...]
}
```
Grid values: `0` = buildable, `1` = path, `2` = impassable

### Wave format (conceptual)
```json
{
  "wave": 7,
  "difficultyBudget": 240,
  "eligibleCreepTypes": ["ground-fast", "ground-heavy", "air-basic"],
  "spawnInterval": 1.2
}
```
The wave manager draws from eligible types to fill the difficulty budget, randomized each run.

### Upgrade tree format (conceptual)
```json
{
  "towerId": "cannon",
  "paths": [
    {
      "id": "armor-shred",
      "tiers": [
        {"cost": 75, "effect": {"armorReduction": 0.1}},
        {"cost": 100, "effect": {"armorReduction": 0.2}},
        ...
      ]
    }
  ]
}
```

---

## State Architecture

### Run state (in-memory, reset each run)
- Current wave number
- Active roguelike offers
- Gold, lives
- All placed towers and their upgrade states
- Active status effects on creeps

### Meta state (localStorage, persists across sessions)
- Run currency balance
- Purchased unlock tree nodes
- Purchased stat bonus tree nodes

### Save format
```json
{
  "version": 1,
  "currency": 340,
  "unlocks": ["second-map", "aura-tower"],
  "statBonuses": ["extra-life-1", "starting-gold-1", "starting-gold-2"]
}
```

---

## Scene Flow

```
BootScene
    ↓ (assets loaded)
MainMenuScene ──────────────────────────────┐
    ↓ (start game)                          ↑ (menu button)
GameScene ←──────────────────┐             │
    ↓ (wave complete)         │             │
BetweenWaveScene             │     GameOverScene
    ↓ (offer selected)        │             ↑ (lives = 0)
GameScene ────────────────────┘             │
    ↓ (all 20 waves done)                   │
RunCompleteScene ───────────────────────────┘
    ↓ (go to meta)
MetaMenuScene
    ↓ (back to menu)
MainMenuScene
```

---

## Performance Considerations

A full wave can have 20-30 simultaneous creeps, each potentially affected by multiple status effects, targeted by multiple towers firing projectiles. Key concerns:

- **Sprite pooling** — reuse projectile and creep sprites rather than creating/destroying
- **Spatial indexing** — towers find creeps in range; avoid O(n²) checks with a simple grid or Phaser group filtering
- **DoT ticking** — batch DoT resolution per frame rather than per-effect-per-creep
- **Aura recalculation** — only recalculate aura buffs when towers are placed, sold, or upgraded — not every frame

Target: smooth 60fps with 40 simultaneous creeps and 20 firing towers.

---

## Asset Pipeline

**Current (development):**
- Source: `/Green_TD_Evo_v2.06_extracted/` (Blizzard IP — WC3 map files)
- Converted: `/converted_assets/` (PNG format, ready for Phaser)
- Usage: placeholder art only

**Required before public launch:**
- Original art for all tower types, creep types, projectiles, UI elements
- Original audio for all sound effects and music
- No Blizzard-owned assets in the shipped product

**Asset categories needed:**
- Tower sprites (6 base + visual state for each upgrade tier)
- Creep sprites (ground basic, ground fast, ground heavy, air basic, air fast)
- Projectile sprites (cannon ball, frost bolt, mortar shell, poison glob, lightning arc)
- Tile sprites (path, buildable, impassable)
- UI elements (HUD panels, offer cards, upgrade tree nodes)
- VFX (hit flash, death burst, slow aura, poison cloud, freeze overlay)
- Audio (tower fire, creep death, wave complete, upgrade purchase, life lost, game over)

---

## Development Environment

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

No backend. No database. No environment variables needed for development.
