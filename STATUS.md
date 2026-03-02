# Ojibwe TD — Status

> Quick-start doc for resuming work. Read this first each session.
> Last updated: March 2, 2026

---

## Project Summary

**57 tasks completed** | **31 pending** | **2 in-progress** | **106 health-check items**
**Completion rate:** 65% (feature/bugfix tasks)

---

## Currently In-Progress

| Task | Priority | Status |
|------|----------|--------|
| TASK-082: Arrow Tower — Cheap Air+Ground with Damage Cap | critical | orchestrator working |
| TASK-089: Arrow Tower Assets — Icon, Projectile, Gear Icons | critical | orchestrator working |

**Orchestrator running** — parallel mode, 2 workers, continuous loop

---

## Pending Queue (31 tasks)

### Critical
| Task | File |
|------|------|
| Arrow Tower (TASK-082) | `tasks/backend/pending/arrow-tower.md` |
| Arrow Tower Assets (TASK-089) | `tasks/frontend/pending/arrow-tower-assets.md` |

### High (8)
| Task | File |
|------|------|
| Audio Settings UI — Music/SFX Volume & Toggle | `tasks/backend/pending/audio-settings-ui.md` |
| Boss Loot Timing & Post-Wave UI Sequencing | `tasks/backend/pending/post-wave-ui-sequencing.md` |
| Crystal Sink Expansion | `tasks/backend/pending/crystal-sink-expansion.md` |
| Desktop Drag-to-Place | `tasks/backend/pending/desktop-drag-placement.md` |
| Fix All Region/Stage Crystal Unlocks | `tasks/backend/pending/niizh-miikana-map-unlock.md` |
| Mobile Menu Layout Audit | `tasks/frontend/pending/mobile-menu-layout-audit.md` |
| Creep Walking Animations | `tasks/frontend/pending/creep-walking-animations.md` |
| Tower Idle & Attack Animations | `tasks/frontend/pending/tower-idle-attack-animations.md` |

### Medium (14)
| Task | File |
|------|------|
| Colorblind Accessibility | `tasks/backend/pending/colorblind-accessibility.md` |
| Commander Idle Animations | `tasks/frontend/pending/commander-idle-animations.md` |
| Commander Portrait Icons | `tasks/frontend/pending/commander-portraits.md` |
| Elder Portraits & Dialog | `tasks/frontend/pending/elder-portraits-dialog.md` |
| Expanded Offer Pool | `tasks/frontend/pending/expanded-offer-pool.md` |
| Gear & Tower Icons for Equipment UI | `tasks/frontend/pending/gear-and-tower-icons.md` |
| Map Ambient VFX | `tasks/frontend/pending/map-ambient-vfx.md` |
| Map Environment Artifacts | `tasks/frontend/pending/map-environment-artifacts.md` |
| Menu Screen Polish | `tasks/frontend/pending/menu-screen-polish.md` |
| Meta Screen Ambiance | `tasks/frontend/pending/meta-screen-ambiance.md` |
| Mobile App Publishing Plan | `tasks/frontend/pending/mobile-app-publishing-plan.md` |
| Moon Rating Visual Fix | `tasks/frontend/pending/moon-rating-visual-fix.md` |
| Story Cutscene System | `tasks/frontend/pending/story-cutscene-system.md` |
| Creep Visual Variety | `tasks/frontend/pending/creep-visual-variety.md` |

### Low (3)
| Task | File |
|------|------|
| Ojibwe TD Logo | `tasks/frontend/pending/ojibwe-td-logo.md` |
| Tower Sell Rubble | `tasks/frontend/pending/tower-sell-rubble.md` |
| Wildlife Ambient Critters | `tasks/frontend/pending/wildlife-ambient-critters.md` |

### Unset Priority (5)
| Task | File |
|------|------|
| Ascension System | `tasks/backend/pending/ascension-system.md` |
| Balance Pass — DPS & Economy | `tasks/backend/pending/balance-pass.md` |
| Health Check Triage | `tasks/backend/pending/health-triage.md` |
| Ojibwe Tower Icons | `tasks/frontend/pending/ojibwe-tower-icons.md` |
| Seeded RNG | `tasks/backend/pending/seeded-rng.md` |

---

## Completed Tasks (57)

All phases 1–11 complete. Major shipped features include:
- Core TD loop, 6 tower archetypes, upgrade trees, targeting & behavior controls
- Roguelike offer layer (52+ offers), run loop, meta-progression
- 5 maps across 4 regions, dual entrance map, endless mode
- Commander system, story/lore, boss waves, air combat
- Deep progression (loot, gear, enhancements), challenges
- Mobile-responsive layout, session persistence, keyboard shortcuts
- Audio system (procedural + file-based), visual effects
- Security audit, performance optimization, codex notifications

---

## Quick Commands

```bash
# Parallel orchestrator (2 workers, continuous loop)
cd /home/dmichael/projects/greentd
bash parallel-orchestrator.sh -n 2

# Pause / resume / stop orchestrator
touch .orch_pause          # pause after current batch
rm .orch_pause             # resume
touch .orch_stop           # clean stop after current batch

# Dev server
cd game && npx vite --host 0.0.0.0 --port 3000

# Quality checks
cd game && npm run typecheck
cd game && npm run test
cd game && npm run check       # typecheck + test
```

---

## Automation & Crons

- **Health Check** (`scripts/health-check.sh`): daily 2 AM — scans for stubs, placeholders, unsafe casts
- **Agent Watchdog** (`scripts/agent-watchdog.sh`): every 5 min — detects/restarts stalled orchestrators

---

## Key Architecture

```
game/src/
├── scenes/         BootScene, MainMenuScene, GameScene, MetaMenuScene, etc.
├── entities/
│   ├── towers/     Tower.ts (base class + all tower defs)
│   └── Projectile.ts, Creep.ts
├── systems/
│   ├── WaveManager.ts        emits: creep-killed, creep-escaped, wave-complete
│   ├── UpgradeManager.ts     per-tower upgrade state, path lock, respec
│   ├── AudioManager.ts       dual audio: procedural + file-based, singleton
│   ├── MobileManager.ts      mobile detection singleton
│   └── SessionManager.ts     auto-save to sessionStorage
├── data/
│   ├── towerDefs.ts          TowerDef constants (Phaser-free)
│   ├── upgradeDefs.ts        3 paths × 5 tiers per tower
│   ├── targeting.ts          pickTarget(), priorities, behavior toggles
│   ├── stageDefs.ts          regions, stages, maps
│   └── offerDefs.ts          52+ roguelike offers
├── ui/             HUD, TowerPanel, UpgradePanel, BehaviorPanel
└── meta/           SaveManager, unlockDefs, statBonusDefs
```

Audio assets expected at: `public/assets/audio/{music,sfx,ambient}/`
(currently empty — Suno generation in progress)

---

## Orchestrator Notes

### Parallel Orchestrator (`parallel-orchestrator.sh`)
- Runs N tasks simultaneously in isolated git worktrees
- 3 agents per task: implement → review (Opus) → ship
- Ship phase serialised to avoid merge conflicts
- Continuous loop until queue empty
- API resilience: failed tasks reset to pending, 5-min cooldown after 3 consecutive failures

### Single Orchestrator (`orchestrator.sh`)
- Runs 1 task at a time: implement → review → ship
- Checkpoint/resume via `.orch_checkpoint`

### Model routing
Tasks matching `story|lore|vignette|narrative|commander|character|codex|region|cultural`
run on **claude-opus**. All others run on **claude-sonnet**.

---

## Context Files

| File | Purpose |
|------|---------|
| `docs/JOURNEY.md` | Full decision log |
| `docs/game-design.md` | Tower archetypes, upgrade paths, wave design |
| `docs/review-checklist.md` | Orchestrator review gate checklist |
| `NIGHTLY-REPORT-2026-03-02.md` | Latest overnight report |
| `SUNO-PROMPTS.md` | Suno audio generation prompts |
| `tasks/_template.md` | Format for new task files |
