# Ojibwe TD — Status

> Quick-start doc for resuming work. Read this first each session.

---

## Where We Are

| Phase | Title | Status |
|-------|-------|--------|
| 1 | Project Scaffold | done |
| 2 | Walking Skeleton | done |
| 3 | Core TD Loop | done |
| 4 | Tower Archetypes (all 6) | done |
| 5 | Wave System (20 waves, scaling) | done |
| **6** | **Tower Upgrade Trees** | **next** |
| 7 | Roguelike Offer Layer | pending |
| 8 | Run Loop & Game States | pending |
| 9 | Meta-Progression | pending |
| 10 | Second Map | pending |
| 11 | Polish & Balance | pending |

**Current task file:** `tasks/backend/pending/phase-6-tower-upgrades.md`

---

## Quick Commands

```bash
# Run next pending task end-to-end (implement → review → ship)
cd /home/dmichael/projects/greentd
./orchestrator.sh

# Run a specific task file
./orchestrator.sh --task tasks/backend/pending/phase-6-tower-upgrades.md

# Resume after a Ctrl-C, terminal close, or quota interruption
./orchestrator.sh --resume

# Start the dev server
cd game && npm run dev

# Type-check only
cd game && npm run typecheck

# Run tests
cd game && npm run test
```

---

## Resuming With Claude

Just say one of these to orient quickly:

- **"Read STATUS.md and let's work on phase 6"** — dive straight into implementation
- **"Run the orchestrator on phase 6"** — hands-free agent pipeline
- **"What's left in phase 6?"** — I'll read the task file and summarize open criteria

---

## Key Architecture (phases 1-5)

```
game/src/
├── scenes/         BootScene, MainMenuScene, GameScene
├── entities/
│   ├── towers/     Tower.ts (base class + TowerDef + CANNON_DEF, etc.)
│   └── Projectile.ts
├── systems/
│   ├── WaveManager.ts     emits: creep-killed, creep-escaped, wave-complete
│   └── UpgradeManager.ts  (stub — Phase 6 will flesh this out)
├── data/           JSON defs: towers.json, waves.json, maps.json
├── ui/             HUD.ts, TowerPanel.ts (PANEL_HEIGHT = 72px)
└── meta/           SaveManager.ts (localStorage)
```

HUD height: **48px** (top) | Tower panel: **72px** (bottom)
Click filter: skip placement if `ptr.y < 48` or `ptr.y > height - 72`

---

## Context Files

| File | Purpose |
|------|---------|
| `docs/JOURNEY.md` | Full decision log — why things are the way they are |
| `docs/game-design.md` | Tower archetypes, upgrade paths, wave design |
| `docs/tech-stack.md` | Phaser 3 + TypeScript + Vite setup notes |
| `openspec/changes/greentd-project/proposal.md` | Original design doc + business value |
| `tasks/_template.md` | Format for new task files |

---

## Orchestrator Notes

`orchestrator.sh` runs 3 agents sequentially:
1. **Implement** — reads task file, writes code, typechecks
2. **Review** — diffs output, fixes bugs, writes Vitest unit tests
3. **Ship** — moves task to `done/`, updates `JOURNEY.md`, commits + pushes

On context/rate-limit hit it waits 90s and retries with `[RESUME]` semantics.
Max 8 retries per agent.

**Checkpoint / resume**: a `.orch_checkpoint` file is written at `$REPO_DIR`
after each stage completes. If the process is killed at any point, run
`./orchestrator.sh --resume` to skip already-completed stages and continue.

**Model routing**: tasks whose filename or title matches
`story|lore|vignette|narrative|commander|character|codex|region|cultural`
automatically run on **claude-opus** for richer creative output.
All other tasks run on the default **claude-sonnet** model.

To run a task manually instead of via orchestrator, just tell me the task file path and we'll work through the acceptance criteria together.
